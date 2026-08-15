import { Injectable, inject, signal } from "@angular/core";
import {
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
} from "../supabase.config";
import { AuthService } from "./auth.service";

export type CatalogMediaKind = "IMAGE" | "VIDEO";
export type CatalogEntityType = "VEHICLE" | "TOUR" | "BLOG";

export interface CatalogMediaPolicy {
  maxFileBytes: number;
  maxItemsPerEntity: number;
  maxBatchFiles: number;
  acceptedMimeTypes: string[];
  preserveOriginalQuality: boolean;
  resumableThresholdBytes: number;
  tusChunkBytes: number;
}

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

export interface ExternalMediaInput {
  entityType: CatalogEntityType;
  entityId: string;
  kind: CatalogMediaKind;
  url: string;
  posterUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  license?: string;
  attribution?: string;
  altText: string;
  isCover?: boolean;
  sortOrder?: number;
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

interface SiteConfigRow {
  value?: Partial<CatalogMediaPolicy> | null;
}

const DEFAULT_POLICY: CatalogMediaPolicy = {
  maxFileBytes: 50 * 1024 * 1024,
  maxItemsPerEntity: 30,
  maxBatchFiles: 20,
  acceptedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "video/mp4",
    "video/webm",
  ],
  preserveOriginalQuality: true,
  resumableThresholdBytes: 6 * 1024 * 1024,
  tusChunkBytes: 6 * 1024 * 1024,
};

@Injectable({ providedIn: "root" })
export class CatalogMediaService {
  private readonly auth = inject(AuthService);
  private readonly bucket = "catalog-media";
  private readonly projectRef = new URL(SUPABASE_PROJECT_URL).hostname.split(".")[0];
  private readonly resumableEndpoint = `https://${this.projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  private readonly _uploadProgress = signal(0);
  private readonly _policy = signal<CatalogMediaPolicy>({ ...DEFAULT_POLICY });

  readonly uploadProgress = this._uploadProgress.asReadonly();
  readonly policy = this._policy.asReadonly();

  async refreshPolicy(): Promise<CatalogMediaPolicy> {
    try {
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/site_config?key=eq.catalog_media_policy&select=value&limit=1`,
        { headers: this.publicHeaders() },
      );
      if (!response.ok) return this._policy();
      const rows = (await response.json()) as SiteConfigRow[];
      const value = rows[0]?.value || {};
      const accepted = Array.isArray(value.acceptedMimeTypes)
        ? value.acceptedMimeTypes.filter((entry): entry is string => typeof entry === "string")
        : DEFAULT_POLICY.acceptedMimeTypes;
      const next: CatalogMediaPolicy = {
        maxFileBytes: this.safePositiveInt(value.maxFileBytes, DEFAULT_POLICY.maxFileBytes),
        maxItemsPerEntity: this.safePositiveInt(value.maxItemsPerEntity, DEFAULT_POLICY.maxItemsPerEntity),
        maxBatchFiles: this.safePositiveInt(value.maxBatchFiles, DEFAULT_POLICY.maxBatchFiles),
        acceptedMimeTypes: accepted.length ? accepted : DEFAULT_POLICY.acceptedMimeTypes,
        preserveOriginalQuality: value.preserveOriginalQuality !== false,
        resumableThresholdBytes: this.safePositiveInt(value.resumableThresholdBytes, DEFAULT_POLICY.resumableThresholdBytes),
        tusChunkBytes: this.safePositiveInt(value.tusChunkBytes, DEFAULT_POLICY.tusChunkBytes),
      };
      this._policy.set(next);
      return next;
    } catch {
      return this._policy();
    }
  }

  validateSelection(file: File): string | null {
    const policy = this._policy();
    if (!policy.acceptedMimeTypes.includes(file.type)) return "CATALOG_MEDIA_TYPE_NOT_ALLOWED";
    if (file.size < 1 || file.size > policy.maxFileBytes) return "CATALOG_MEDIA_SIZE_NOT_ALLOWED";
    return null;
  }

  async load(entityType: CatalogEntityType, entityId: string): Promise<CatalogMediaItem[]> {
    const column = this.ownerColumn(entityType);
    const url = `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?${column}=eq.${encodeURIComponent(entityId)}&is_active=eq.true&select=*&order=sort_order.asc,created_at.asc`;
    const response = await fetch(url, { headers: this.publicHeaders() });
    if (!response.ok) throw new Error(`CATALOG_MEDIA_LOAD_${response.status}`);
    const rows = (await response.json()) as CatalogMediaRow[];
    return rows.map((row) => this.fromRow(row));
  }

  async loadAllAdmin(): Promise<CatalogMediaItem[]> {
    const token = await this.requiredToken();
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?select=*&order=created_at.desc`,
      { headers: this.authHeaders(token) },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_ADMIN_LOAD_${response.status}`);
    return ((await response.json()) as CatalogMediaRow[]).map((row) => this.fromRow(row));
  }

  async upload(
    entityType: CatalogEntityType,
    entityId: string,
    file: File,
    options: { altText?: string; isCover?: boolean; sortOrder?: number; posterUrl?: string } = {},
  ): Promise<CatalogMediaItem> {
    await this.refreshPolicy();
    this.validateFile(file);
    const token = await this.requiredToken();
    const kind: CatalogMediaKind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
    const extension = this.extension(file);
    const objectPath = `${entityType.toLowerCase()}/${entityId}/${crypto.randomUUID()}.${extension}`;
    const technicalMetadata = await this.readTechnicalMetadata(file);
    this._uploadProgress.set(0);
    try {
      if (file.size >= this._policy().resumableThresholdBytes) {
        await this.uploadTus(file, objectPath, token);
      } else {
        await this.uploadStandard(file, objectPath, token);
        this._uploadProgress.set(100);
      }

      if (options.isCover) await this.clearExistingCover(entityType, entityId, token);
      const owner = this.ownerPayload(entityType, entityId);
      const row = {
        ...owner,
        kind,
        storage_bucket: this.bucket,
        object_path: objectPath,
        external_url: null,
        poster_url: options.posterUrl || null,
        source_name: "Alperler Auto yönetim paneli",
        license: "BUSINESS_OWNED",
        attribution: "Alperler Auto",
        alt_text: (options.altText || file.name).trim().slice(0, 300),
        sort_order: options.sortOrder ?? 0,
        is_cover: Boolean(options.isCover),
        is_active: true,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          lastModified: file.lastModified,
          originalQualityPreserved: true,
          ...technicalMetadata,
        },
      };
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?select=*`,
        {
          method: "POST",
          headers: { ...this.authHeaders(token), Prefer: "return=representation" },
          body: JSON.stringify(row),
        },
      );
      if (!response.ok) {
        await this.deleteStorageObject(objectPath, token).catch(() => undefined);
        throw new Error(`CATALOG_MEDIA_ROW_CREATE_${response.status}`);
      }
      const rows = (await response.json()) as CatalogMediaRow[];
      return this.fromRow(rows[0]);
    } finally {
      if (this._uploadProgress() < 100) this._uploadProgress.set(0);
    }
  }

  async addExternal(input: ExternalMediaInput): Promise<CatalogMediaItem> {
    const token = await this.requiredToken();
    const parsed = new URL(input.url);
    if (parsed.protocol !== "https:") throw new Error("MEDIA_URL_MUST_BE_HTTPS");
    if (input.isCover) await this.clearExistingCover(input.entityType, input.entityId, token);
    const row = {
      ...this.ownerPayload(input.entityType, input.entityId),
      kind: input.kind,
      storage_bucket: null,
      object_path: null,
      external_url: input.url,
      poster_url: input.posterUrl || null,
      source_url: input.sourceUrl || null,
      source_name: input.sourceName || null,
      license: input.license || null,
      attribution: input.attribution || null,
      alt_text: input.altText.trim().slice(0, 300),
      sort_order: input.sortOrder ?? 0,
      is_cover: Boolean(input.isCover),
      is_active: true,
      metadata: input.metadata || {},
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?select=*`, {
      method: "POST",
      headers: { ...this.authHeaders(token), Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!response.ok) throw new Error(`EXTERNAL_MEDIA_CREATE_${response.status}`);
    return this.fromRow(((await response.json()) as CatalogMediaRow[])[0]);
  }

  async update(item: CatalogMediaItem, patch: Partial<Pick<CatalogMediaItem, "altText" | "sortOrder" | "isCover" | "isActive" | "posterUrl" | "attribution">>): Promise<CatalogMediaItem> {
    const token = await this.requiredToken();
    if (patch.isCover) {
      const entity = this.entityFromItem(item);
      await this.clearExistingCover(entity.type, entity.id, token, item.id);
    }
    const body: Record<string, unknown> = {};
    if (patch.altText !== undefined) body["alt_text"] = patch.altText.trim().slice(0, 300);
    if (patch.sortOrder !== undefined) body["sort_order"] = patch.sortOrder;
    if (patch.isCover !== undefined) body["is_cover"] = patch.isCover;
    if (patch.isActive !== undefined) body["is_active"] = patch.isActive;
    if (patch.posterUrl !== undefined) body["poster_url"] = patch.posterUrl || null;
    if (patch.attribution !== undefined) body["attribution"] = patch.attribution || null;
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?id=eq.${encodeURIComponent(item.id)}&select=*`,
      {
        method: "PATCH",
        headers: { ...this.authHeaders(token), Prefer: "return=representation" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_UPDATE_${response.status}`);
    return this.fromRow(((await response.json()) as CatalogMediaRow[])[0]);
  }

  async remove(item: CatalogMediaItem): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?id=eq.${encodeURIComponent(item.id)}`,
      { method: "DELETE", headers: this.authHeaders(token) },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_DELETE_${response.status}`);
    if (item.storageBucket === this.bucket && item.objectPath) {
      await this.deleteStorageObject(item.objectPath, token).catch((error) => {
        console.warn("Catalog media row deleted but storage cleanup failed", error);
      });
    }
  }

  private async uploadStandard(file: File, objectPath: string, token: string): Promise<void> {
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
          "content-type": file.type,
          "cache-control": "31536000",
          "x-upsert": "false",
        },
        body: file,
      },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_UPLOAD_${response.status}`);
  }

  private async uploadTus(file: File, objectPath: string, token: string): Promise<void> {
    const policy = this._policy();
    const metadata = [
      ["bucketName", this.bucket],
      ["objectName", objectPath],
      ["contentType", file.type],
      ["cacheControl", "31536000"],
    ]
      .map(([key, value]) => `${key} ${btoa(unescape(encodeURIComponent(value)))}`)
      .join(",");
    const create = await fetch(this.resumableEndpoint, {
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
    if (!create.ok) throw new Error(`CATALOG_TUS_CREATE_${create.status}`);
    const location = create.headers.get("location");
    if (!location) throw new Error("CATALOG_TUS_LOCATION_MISSING");
    const uploadUrl = new URL(location, this.resumableEndpoint).toString();
    let offset = Number(create.headers.get("upload-offset") || 0);
    while (offset < file.size) {
      const end = Math.min(offset + policy.tusChunkBytes, file.size);
      const chunk = file.slice(offset, end, file.type);
      let response: Response | null = null;
      let lastError: unknown;
      for (const delay of [0, 1500, 4000, 8000, 15000]) {
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
          if (![409, 412, 429, 500, 502, 503, 504].includes(response.status)) {
            throw new Error(`CATALOG_TUS_PATCH_${response.status}`);
          }
        } catch (error) {
          lastError = error;
          response = null;
        }
      }
      if (!response?.ok) throw lastError instanceof Error ? lastError : new Error("CATALOG_TUS_UPLOAD_FAILED");
      const nextOffset = Number(response.headers.get("upload-offset"));
      offset = Number.isFinite(nextOffset) && nextOffset > offset ? nextOffset : end;
      this._uploadProgress.set(Math.min(99, Math.round((offset / file.size) * 100)));
    }
    this._uploadProgress.set(100);
  }

  private async clearExistingCover(entityType: CatalogEntityType, entityId: string, token: string, exceptId?: string): Promise<void> {
    const column = this.ownerColumn(entityType);
    let url = `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?${column}=eq.${encodeURIComponent(entityId)}&is_cover=eq.true`;
    if (exceptId) url += `&id=neq.${encodeURIComponent(exceptId)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: this.authHeaders(token),
      body: JSON.stringify({ is_cover: false }),
    });
    if (!response.ok) throw new Error(`CATALOG_COVER_CLEAR_${response.status}`);
  }

  private async deleteStorageObject(objectPath: string, token: string): Promise<void> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: { ...this.authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    if (!response.ok) throw new Error(`CATALOG_STORAGE_DELETE_${response.status}`);
  }

  private validateFile(file: File): void {
    const error = this.validateSelection(file);
    if (error) throw new Error(error);
  }

  private extension(file: File): string {
    const byType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "video/mp4": "mp4",
      "video/webm": "webm",
    };
    return byType[file.type] || "bin";
  }

  private async readTechnicalMetadata(file: File): Promise<Record<string, unknown>> {
    if (typeof document === "undefined") return {};
    const objectUrl = URL.createObjectURL(file);
    try {
      if (file.type.startsWith("image/")) {
        return await new Promise<Record<string, unknown>>((resolve) => {
          const image = new Image();
          image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => resolve({});
          image.src = objectUrl;
        });
      }
      if (file.type.startsWith("video/")) {
        return await new Promise<Record<string, unknown>>((resolve) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration * 100) / 100 : undefined,
          });
          video.onerror = () => resolve({});
          video.src = objectUrl;
        });
      }
      return {};
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  private ownerColumn(type: CatalogEntityType): string {
    return type === "VEHICLE" ? "vehicle_id" : type === "TOUR" ? "tour_id" : "blog_post_id";
  }

  private ownerPayload(type: CatalogEntityType, id: string): Record<string, string> {
    return { [this.ownerColumn(type)]: id };
  }

  private entityFromItem(item: CatalogMediaItem): { type: CatalogEntityType; id: string } {
    if (item.vehicleId) return { type: "VEHICLE", id: item.vehicleId };
    if (item.tourId) return { type: "TOUR", id: item.tourId };
    if (item.blogPostId) return { type: "BLOG", id: item.blogPostId };
    throw new Error("CATALOG_MEDIA_OWNER_MISSING");
  }

  private fromRow(row: CatalogMediaRow): CatalogMediaItem {
    const url = row.external_url ||
      (row.storage_bucket && row.object_path
        ? `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodeURIComponent(row.storage_bucket)}/${row.object_path.split("/").map(encodeURIComponent).join("/")}`
        : "");
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
      isCover: Boolean(row.is_cover),
      isActive: row.is_active !== false,
      storageBucket: row.storage_bucket || undefined,
      objectPath: row.object_path || undefined,
      metadata: row.metadata || {},
    };
  }

  private publicHeaders(): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` };
  }

  private authHeaders(token: string): Record<string, string> {
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }

  private safePositiveInt(value: unknown, fallback: number): number {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
  }
}
