import { Injectable, Injector, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";
import { AdminGatewayTransportService, isAdminGatewayFailure } from "./admin-gateway-transport.service";
import { describeStorageError, mediaExtension, mediaRejectionReason, resolveMediaType } from "./media-file.util";
import {
  CATALOG_STORAGE_BUCKET_MAX_BYTES,
  catalogUploadSizeRejection,
  prepareCatalogImage,
} from "./catalog-image-optimize.util";
import {
  MediaProviderUnavailableError,
  MediaUploadService,
  MediaUploadSizeError,
  type ProviderUploadResult,
} from "./media-upload.service";
import { UiService } from "./ui.service";
import {
  CLOUDINARY_IMAGE_MAX_BYTES,
  CLOUDINARY_STORAGE_BUCKET,
  CLOUDINARY_VIDEO_MAX_BYTES,
  cloudNameForRow,
  cloudinaryMediaUrl,
  cloudinarySizeViolation,
} from "../utils/cloudinary-media";
import { R2_STORAGE_BUCKET, r2MediaUrl, type MediaProvider } from "../utils/r2-media";

type MediaUploadTextKey = "imageTooLarge" | "videoTooLarge" | "uploadFailed" | "signatureFailed";
const MEDIA_UPLOAD_TEXT_TR: Record<MediaUploadTextKey, string> = {
  imageTooLarge: "Fotoğraf en fazla {max} MB olabilir. Lütfen daha küçük bir fotoğraf seçin.",
  videoTooLarge: "Video en fazla {max} MB olabilir. Lütfen daha kısa veya sıkıştırılmış bir video seçin.",
  uploadFailed: "Medya bulut depolamaya yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.",
  signatureFailed: "Yükleme izni alınamadı. Oturumunuzu yenileyip tekrar deneyin.",
};

type CatalogUploadOptions = { altText?: string; isCover?: boolean; sortOrder?: number; posterUrl?: string };

export type CatalogMediaKind = "IMAGE" | "VIDEO";
export type CatalogEntityType = "VEHICLE" | "TOUR" | "BLOG";

export interface CatalogMediaItem {
  id: string;
  vehicleId?: string;
  tourId?: string;
  blogPostId?: string;
  kind: CatalogMediaKind;
  url: string;
  posterUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  license?: string;
  attribution?: string;
  altText: string;
  sortOrder: number;
  isCover: boolean;
  isActive: boolean;
  storageBucket?: string;
  objectPath?: string;
  metadata?: Record<string, unknown>;
}

interface CatalogMediaRow {
  id: string;
  vehicle_id?: string | null;
  tour_id?: string | null;
  blog_post_id?: string | null;
  kind: CatalogMediaKind;
  storage_bucket?: string | null;
  object_path?: string | null;
  external_url?: string | null;
  poster_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  license?: string | null;
  attribution?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
  is_active?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

type MediaPatch = Partial<Pick<
  CatalogMediaItem,
  "altText" | "sortOrder" | "isCover" | "isActive" | "posterUrl" |
  "attribution" | "sourceUrl" | "sourceName" | "license" | "metadata"
>>;

interface MediaControlResponse {
  ok?: boolean;
  code?: string;
  records?: CatalogMediaRow[];
  record?: CatalogMediaRow;
  result?: { removed?: boolean; storageBucket?: string | null; objectPath?: string | null };
  cleanup?: { attempted?: number; completed?: number; pending?: number };
}

@Injectable({ providedIn: "root" })
export class CatalogMediaService {
  private readonly auth = inject(AuthService);
  private readonly transport = inject(AdminGatewayTransportService);
  private readonly media = inject(MediaUploadService);
  private readonly injector = inject(Injector);
  private readonly bucket = "catalog-media";
  /** Kaynak-gerçeği: Supabase Edge Function. BFF yalnızca taşıma hatasında yedek. */
  private readonly edgeFunction = "media-control-admin-v185";
  private readonly endpoint = "/api/partner?op=media-control-admin";
  private readonly tusThreshold = 6 * 1024 * 1024;
  private readonly tusChunkSize = 6 * 1024 * 1024;
  /** Depolama kovası tavanı (V246). Görseller yüklemeden önce WebP/JPEG sıkıştırılır; video giriş tavanı ~20 MB. */
  readonly maxUploadBytes = CATALOG_STORAGE_BUCKET_MAX_BYTES;
  private readonly _uploadProgress = signal(0);
  readonly uploadProgress = this._uploadProgress.asReadonly();

  async load(entityType: CatalogEntityType, entityId: string): Promise<CatalogMediaItem[]> {
    const payload = await this.gateway("GET", undefined, { entityType, entityId });
    return (payload.records || []).map((row) => this.fromRow(row));
  }

  async loadAllAdmin(): Promise<CatalogMediaItem[]> {
    const payload = await this.gateway("GET");
    return (payload.records || []).map((row) => this.fromRow(row));
  }

  async upload(
    entityType: CatalogEntityType,
    entityId: string,
    file: File,
    options: CatalogUploadOptions = {},
  ): Promise<CatalogMediaItem> {
    // V252: the active media provider (R2 → Cloudinary → Supabase, resolved server-side and
    // injected via /runtime-env.js). Supabase Storage below stays the fallback path.
    const provider = this.media.activeProvider();
    this.validateFile(file, provider);
    const token = await this.requiredToken();
    let mediaType = resolveMediaType(file);
    const kind: CatalogMediaKind = mediaType.startsWith("video/") ? "VIDEO" : "IMAGE";
    if (options.isCover && kind !== "IMAGE") throw new Error("Kapak yalnız fotoğraf olabilir.");
    const uploadFile = kind === "IMAGE" ? await prepareCatalogImage(file) : file;
    mediaType = resolveMediaType(uploadFile);
    if (provider !== "supabase") {
      try {
        return await this.uploadToProvider(entityType, entityId, file, uploadFile, kind, mediaType, token, options);
      } catch (error) {
        if (!(error instanceof MediaProviderUnavailableError)) throw error;
        console.warn(`[CatalogMedia] ${provider} unavailable, falling back to Supabase Storage:`, error.code);
        this.validateFile(file, "supabase");
      }
    }
    const extension = mediaExtension(mediaType, uploadFile);
    const objectPath = `${entityType.toLowerCase()}/${entityId}/${crypto.randomUUID()}.${extension}`;
    this._uploadProgress.set(0);
    try {
      if (uploadFile.size >= this.tusThreshold) await this.uploadTus(uploadFile, objectPath, token, mediaType);
      else {
        await this.uploadStandard(uploadFile, objectPath, token, mediaType);
        this._uploadProgress.set(100);
      }

      let created: CatalogMediaItem;
      try {
        const response = await this.gateway("POST", {
          action: "CREATE_CATALOG_MEDIA",
          entityType,
          entityId,
          payload: {
            kind,
            storage_bucket: this.bucket,
            object_path: objectPath,
            poster_url: options.posterUrl || null,
            source_name: "Alperler Auto yönetim paneli",
            license: "BUSINESS_OWNED",
            attribution: "Alperler Auto",
            alt_text: (options.altText || file.name).trim().slice(0, 300),
            sort_order: options.sortOrder ?? 0,
            metadata: {
              originalName: file.name.slice(0, 180),
              mimeType: mediaType,
              fileSize: uploadFile.size,
              originalFileSize: file.size,
              optimized: kind === "IMAGE" && uploadFile !== file,
              verificationScope: "ACTUAL_ASSET",
              sourceVerified: true,
              provenanceComplete: true,
              reviewStatus: "VERIFIED",
              verifiedAt: new Date().toISOString().slice(0, 10),
            },
          },
        });
        if (!response.record) throw new Error("CATALOG_MEDIA_CREATE_FAILED");
        created = this.fromRow(response.record);
      } catch (error) {
        try {
          await this.gateway("POST", { action: "QUEUE_STORAGE_CLEANUP", entityType, entityId, objectPath });
        } catch {
          await this.deleteStorageObjectWithRetry(objectPath, token).catch(() => undefined);
        }
        throw error;
      }

      if (options.isCover) {
        const response = await this.gateway("PATCH", { action: "SET_CATALOG_COVER", mediaId: created.id });
        if (!response.record) throw new Error("CATALOG_COVER_SET_FAILED");
        created = this.fromRow(response.record);
      }
      return created;
    } finally {
      if (this._uploadProgress() < 100) this._uploadProgress.set(0);
    }
  }

  async update(item: CatalogMediaItem, patch: MediaPatch): Promise<CatalogMediaItem> {
    if (patch.isCover === true && (patch.isActive === false || item.kind !== "IMAGE")) {
      throw new Error("Kapak yalnız aktif bir görsel olabilir.");
    }
    const body: Record<string, unknown> = {};
    if (patch.altText !== undefined) body["alt_text"] = patch.altText.trim().slice(0, 300);
    if (patch.sortOrder !== undefined) body["sort_order"] = patch.sortOrder;
    if (patch.isActive !== undefined) body["is_active"] = patch.isActive;
    if (patch.posterUrl !== undefined) body["poster_url"] = patch.posterUrl || null;
    if (patch.attribution !== undefined) body["attribution"] = patch.attribution?.trim() || null;
    if (patch.sourceName !== undefined) body["source_name"] = patch.sourceName?.trim() || null;
    if (patch.license !== undefined) body["license"] = patch.license?.trim() || null;
    if (patch.sourceUrl !== undefined) body["source_url"] = patch.sourceUrl ? this.requireHttpsUrl(patch.sourceUrl, "MEDIA_SOURCE_MUST_BE_HTTPS") : null;
    if (patch.metadata !== undefined) body["metadata"] = patch.metadata || {};
    if (patch.isCover === false || (item.isCover && patch.isActive === false && patch.isCover === undefined)) body["is_cover"] = false;

    let updated = item;
    if (Object.keys(body).length) {
      const response = await this.gateway("PATCH", { action: "UPDATE_CATALOG_MEDIA", mediaId: item.id, payload: body });
      if (!response.record) throw new Error("CATALOG_MEDIA_UPDATE_FAILED");
      updated = this.fromRow(response.record);
    }
    if (patch.isCover === true) {
      const response = await this.gateway("PATCH", { action: "SET_CATALOG_COVER", mediaId: item.id });
      if (!response.record) throw new Error("CATALOG_COVER_SET_FAILED");
      updated = this.fromRow(response.record);
    }
    return updated;
  }

  async remove(item: CatalogMediaItem): Promise<void> {
    await this.gateway("POST", { action: "REMOVE_CATALOG_MEDIA", mediaId: item.id });
    // The DB delete trigger queues an R2 / Cloudinary cleanup job; drain it server-side.
    if (item.storageBucket === CLOUDINARY_STORAGE_BUCKET || item.storageBucket === R2_STORAGE_BUCKET) await this.drainProviderCleanup();
  }

  private async drainProviderCleanup(): Promise<void> {
    try {
      const token = await this.requiredToken();
      await this.media.drainCleanup(token, 10);
    } catch (error) {
      console.warn("[CatalogMedia] media cleanup deferred:", error instanceof Error ? error.message : error);
    }
  }

  private async uploadToProvider(
    entityType: CatalogEntityType,
    entityId: string,
    originalFile: File,
    uploadFile: File,
    kind: CatalogMediaKind,
    mediaType: string,
    token: string,
    options: CatalogUploadOptions,
  ): Promise<CatalogMediaItem> {
    if (this.media.activeProvider() === "cloudinary") {
      const violation = cloudinarySizeViolation(uploadFile.size, mediaType);
      if (violation) throw new Error(this.sizeMessage(violation));
    }
    this._uploadProgress.set(0);
    try {
      let uploaded: ProviderUploadResult;
      try {
        uploaded = await this.media.upload({ scope: "catalog", entityType, entityId }, uploadFile, kind, token, {
          onProgress: (percent) => this._uploadProgress.set(percent),
        });
      } catch (error) {
        if (error instanceof MediaUploadSizeError) throw new Error(this.sizeMessage(error.kind));
        if (error instanceof MediaProviderUnavailableError) throw error;
        const code = error instanceof Error ? error.message : "UPLOAD";
        throw new Error(`${this.uiText(/^(FORBIDDEN|UNAUTHORIZED)$/.test(code) ? "signatureFailed" : "uploadFailed")} (${code})`);
      }

      let created: CatalogMediaItem;
      try {
        const response = await this.gateway("POST", {
          action: "CREATE_CATALOG_MEDIA",
          entityType,
          entityId,
          payload: {
            kind,
            storage_bucket: uploaded.bucket,
            object_path: uploaded.objectPath,
            poster_url: options.posterUrl || uploaded.posterUrl,
            source_name: "Alperler Auto yönetim paneli",
            license: "BUSINESS_OWNED",
            attribution: "Alperler Auto",
            alt_text: (options.altText || originalFile.name).trim().slice(0, 300),
            sort_order: options.sortOrder ?? 0,
            metadata: {
              originalName: originalFile.name.slice(0, 180),
              mimeType: mediaType,
              fileSize: uploadFile.size,
              originalFileSize: originalFile.size,
              optimized: kind === "IMAGE" && uploadFile !== originalFile,
              verificationScope: "ACTUAL_ASSET",
              sourceVerified: true,
              provenanceComplete: true,
              reviewStatus: "VERIFIED",
              verifiedAt: new Date().toISOString().slice(0, 10),
              ...uploaded.metadata,
            },
          },
        });
        if (!response.record) throw new Error("CATALOG_MEDIA_CREATE_FAILED");
        created = this.fromRow(response.record);
      } catch (error) {
        // No DB row references the asset → safe server-side delete (rollback).
        await this.media.rollback(token, uploaded);
        // Provider migration (V249 cloudinary / V252 r2) not applied yet → the DB rejects the
        // bucket; fall back to Supabase Storage.
        if (error instanceof Error && error.message === "INVALID_MEDIA_STORAGE") {
          throw new MediaProviderUnavailableError("MEDIA_PROVIDER_DB_MIGRATION_PENDING");
        }
        throw error;
      }

      if (options.isCover) {
        const response = await this.gateway("PATCH", { action: "SET_CATALOG_COVER", mediaId: created.id });
        if (!response.record) throw new Error("CATALOG_COVER_SET_FAILED");
        created = this.fromRow(response.record);
      }
      this._uploadProgress.set(100);
      return created;
    } finally {
      if (this._uploadProgress() < 100) this._uploadProgress.set(0);
    }
  }

  private uiText(key: MediaUploadTextKey, max?: number): string {
    let template = MEDIA_UPLOAD_TEXT_TR[key];
    try {
      const translations = this.injector.get(UiService).translations() as { mediaUpload?: Partial<Record<MediaUploadTextKey, string>> };
      template = String(translations?.mediaUpload?.[key] || template);
    } catch {
      // UiService unavailable (tests/SSR) → Turkish default.
    }
    return template.replace("{max}", max === undefined ? "" : String(max));
  }

  private sizeMessage(kind: "image" | "video"): string {
    return kind === "video"
      ? this.uiText("videoTooLarge", Math.round(CLOUDINARY_VIDEO_MAX_BYTES / (1024 * 1024)))
      : this.uiText("imageTooLarge", Math.round(CLOUDINARY_IMAGE_MAX_BYTES / (1024 * 1024)));
  }

  async removeAll(entityType: CatalogEntityType, entityId: string): Promise<void> {
    const items = await this.load(entityType, entityId);
    for (const item of items) await this.remove(item);
    const remaining = await this.load(entityType, entityId);
    if (remaining.length) throw new Error("CATALOG_MEDIA_OWNER_CLEANUP_INCOMPLETE");
  }

  private async gateway(
    method: "GET" | "POST" | "PATCH",
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<MediaControlResponse> {
    try {
      return await this.transport.gateway<MediaControlResponse & Record<string, unknown>>({
        edgeFunction: this.edgeFunction,
        bffUrl: this.endpoint,
        method,
        query,
        body,
        timeoutMs: 30_000,
      });
    } catch (error) {
      if (!isAdminGatewayFailure(error)) throw error;
      if (error.transport || error.status >= 500) throw this.transport.humanize(error, "Medya");
      throw new Error(this.mediaError(error.code));
    }
  }

  private mediaError(code: string): string {
    const map: Record<string, string> = {
      CATALOG_LIVE_LAST_IMAGE_BLOCKED: "Canlı ilanın son aktif görseli silinemez veya kapatılamaz. Önce yeni bir görsel ekleyin.",
      CATALOG_LIVE_COVER_CHANGE_REQUIRES_REPLACEMENT: "Canlı ilanın kapağı doğrudan kapatılamaz. Önce başka bir görseli kapak yapın.",
      CATALOG_COVER_REQUIRES_ACTIVE_IMAGE: "Kapak yalnız aktif bir görsel olabilir.",
      STORAGE_OBJECT_OWNERSHIP_REQUIRED: "Yüklenen dosyanın güvenli sahiplik doğrulaması yapılamadı.",
      MEDIA_SOURCE_MUST_BE_HTTPS: "Medya kaynak bağlantısı HTTPS olmalıdır.",
      CONTENT_PERMISSION_REQUIRED: "Bu medya işlemi için içerik yönetim yetkisi gerekli.",
    };
    return map[code] || code;
  }

  private requireHttpsUrl(value: string, code: string): string {
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") throw new Error(code);
      return parsed.toString();
    } catch { throw new Error(code); }
  }

  private async uploadStandard(file: File, objectPath: string, token: string, mediaType: string): Promise<void> {
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
          "content-type": mediaType,
          "cache-control": "31536000",
          "x-upsert": "false",
        },
        body: file,
      },
    );
    if (!response.ok) throw new Error(describeStorageError(response.status, await response.json().catch(() => ({})), "Medya depolamaya yüklenemedi"));
  }

  private async uploadTus(file: File, objectPath: string, token: string, mediaType: string): Promise<void> {
    const metadata = [
      ["bucketName", this.bucket], ["objectName", objectPath], ["contentType", mediaType], ["cacheControl", "31536000"],
    ].map(([key, value]) => `${key} ${btoa(unescape(encodeURIComponent(value)))}`).join(",");
    const create = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/upload/resumable`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(file.size),
        "Upload-Metadata": metadata,
        "x-upsert": "false",
      },
    });
    if (!create.ok) throw new Error(describeStorageError(create.status, await create.json().catch(() => ({})), "Büyük dosya yüklemesi başlatılamadı"));
    const location = create.headers.get("location");
    if (!location) throw new Error("CATALOG_TUS_LOCATION_MISSING");
    const uploadUrl = new URL(location, SUPABASE_PROJECT_URL).toString();
    let offset = Number(create.headers.get("upload-offset") || 0);
    while (offset < file.size) {
      const end = Math.min(offset + this.tusChunkSize, file.size);
      const chunk = file.slice(offset, end, file.type);
      let response: Response | null = null;
      let lastError: unknown;
      for (const delay of [0, 1500, 4000, 8000]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          response = await fetch(uploadUrl, {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY,
              authorization: `Bearer ${token}`,
              "Tus-Resumable": "1.0.0",
              "Upload-Offset": String(offset),
              "Content-Type": "application/offset+octet-stream",
            },
            body: chunk,
          });
          if (response.ok) break;
          if (![409, 412, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`CATALOG_TUS_PATCH_${response.status}`);
        } catch (error) { lastError = error; response = null; }
      }
      if (!response?.ok) throw lastError instanceof Error ? lastError : new Error("CATALOG_TUS_UPLOAD_FAILED");
      const nextOffset = Number(response.headers.get("upload-offset"));
      offset = Number.isFinite(nextOffset) && nextOffset > offset ? nextOffset : end;
      this._uploadProgress.set(Math.min(99, Math.round((offset / file.size) * 100)));
    }
    this._uploadProgress.set(100);
  }

  private async deleteStorageObjectWithRetry(objectPath: string, token: string): Promise<void> {
    let lastError: unknown;
    for (const delay of [0, 400, 1200, 3000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await this.deleteStorageObject(objectPath, token);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("CATALOG_STORAGE_DELETE_FAILED");
  }

  private async deleteStorageObject(objectPath: string, token: string): Promise<void> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: { ...this.authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    if (!response.ok) throw new Error(`CATALOG_STORAGE_DELETE_${response.status}`);
  }

  private validateFile(file: File, provider: MediaProvider = "supabase"): void {
    const reason = mediaRejectionReason(file, { video: true });
    if (reason) throw new Error(reason);
    if (provider === "cloudinary") {
      // Cloudinary free plan: 10 MB/image, 100 MB/video (friendly, translated message).
      const violation = cloudinarySizeViolation(file.size, resolveMediaType(file));
      if (violation) throw new Error(this.sizeMessage(violation));
      return;
    }
    const sizeReason = catalogUploadSizeRejection(file, resolveMediaType(file));
    if (sizeReason) throw new Error(sizeReason);
    if (file.size > this.maxUploadBytes) throw new Error("Dosya depolama tavanı olan 200 MB sınırını aşıyor.");
  }

  private fromRow(row: CatalogMediaRow): CatalogMediaItem {
    const url = row.external_url || (row.storage_bucket === CLOUDINARY_STORAGE_BUCKET && row.object_path
      ? cloudinaryMediaUrl(cloudNameForRow(row.metadata), row.object_path, row.kind)
      : row.storage_bucket === R2_STORAGE_BUCKET && row.object_path
      ? r2MediaUrl(row.object_path, row.kind, row.metadata)
      : row.storage_bucket && row.object_path
      ? `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodeURIComponent(row.storage_bucket)}/${row.object_path.split("/").map(encodeURIComponent).join("/")}` : "");
    return {
      id: row.id,
      vehicleId: row.vehicle_id || undefined,
      tourId: row.tour_id || undefined,
      blogPostId: row.blog_post_id || undefined,
      kind: row.kind,
      url,
      posterUrl: row.poster_url || undefined,
      sourceUrl: row.source_url || undefined,
      sourceName: row.source_name || undefined,
      license: row.license || undefined,
      attribution: row.attribution || undefined,
      altText: row.alt_text || "",
      sortOrder: Number(row.sort_order || 0),
      isCover: row.is_cover === true,
      isActive: row.is_active !== false,
      storageBucket: row.storage_bucket || undefined,
      objectPath: row.object_path || undefined,
      metadata: row.metadata || {},
    };
  }

  private authHeaders(token: string): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
