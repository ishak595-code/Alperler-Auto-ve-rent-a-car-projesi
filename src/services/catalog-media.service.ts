import { Injectable, inject, signal } from "@angular/core";
import {
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
} from "../supabase.config";
import { AuthService } from "./auth.service";

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

type MediaPatch = Partial<Pick<
  CatalogMediaItem,
  "altText" | "sortOrder" | "isCover" | "isActive" | "posterUrl" |
  "attribution" | "sourceUrl" | "sourceName" | "license" | "metadata"
>>;

@Injectable({ providedIn: "root" })
export class CatalogMediaService {
  private readonly auth = inject(AuthService);
  private readonly bucket = "catalog-media";
  private readonly tusThreshold = 6 * 1024 * 1024;
  private readonly tusChunkSize = 6 * 1024 * 1024;
  readonly maxUploadBytes = 50 * 1024 * 1024;
  private readonly _uploadProgress = signal(0);
  readonly uploadProgress = this._uploadProgress.asReadonly();

  async load(entityType: CatalogEntityType, entityId: string): Promise<CatalogMediaItem[]> {
    const column = this.ownerColumn(entityType);
    const adminToken = await this.auth.getAccessToken().catch(() => null);
    const activeFilter = adminToken ? "" : "&is_active=eq.true";
    const url = `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?${column}=eq.${encodeURIComponent(entityId)}${activeFilter}&select=*&order=sort_order.asc,created_at.asc`;
    const response = await fetch(url, { headers: adminToken ? this.authHeaders(adminToken) : this.publicHeaders() });
    if (!response.ok) throw new Error(`CATALOG_MEDIA_LOAD_${response.status}`);
    return ((await response.json()) as CatalogMediaRow[]).map((row) => this.fromRow(row));
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
    this.validateFile(file);
    const token = await this.requiredToken();
    const kind: CatalogMediaKind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
    if (options.isCover && kind !== "IMAGE") throw new Error("CATALOG_COVER_REQUIRES_IMAGE");
    const extension = this.extension(file);
    const objectPath = `${entityType.toLowerCase()}/${entityId}/${crypto.randomUUID()}.${extension}`;
    this._uploadProgress.set(0);
    try {
      if (file.size >= this.tusThreshold) {
        await this.uploadTus(file, objectPath, token);
      } else {
        await this.uploadStandard(file, objectPath, token);
        this._uploadProgress.set(100);
      }

      const row = {
        ...this.ownerPayload(entityType, entityId),
        kind,
        storage_bucket: this.bucket,
        object_path: objectPath,
        external_url: null,
        poster_url: options.posterUrl || null,
        source_url: null,
        source_name: "Alperler Auto yönetim paneli",
        license: "BUSINESS_OWNED",
        attribution: "Alperler Auto",
        alt_text: (options.altText || file.name).trim().slice(0, 300),
        sort_order: options.sortOrder ?? 0,
        is_cover: false,
        is_active: true,
        metadata: {
          originalName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          verificationScope: "ACTUAL_ASSET",
          sourceVerified: true,
          provenanceComplete: true,
          reviewStatus: "VERIFIED",
          verifiedAt: new Date().toISOString().slice(0, 10),
        },
      };
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?select=*`, {
        method: "POST",
        headers: { ...this.authHeaders(token), Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      if (!response.ok) {
        await this.deleteStorageObject(objectPath, token).catch(() => undefined);
        throw new Error(`CATALOG_MEDIA_ROW_CREATE_${response.status}`);
      }
      const created = this.fromRow(((await response.json()) as CatalogMediaRow[])[0]);
      if (options.isCover) {
        await this.setCoverRpc(created.id, token);
        return { ...created, isCover: true };
      }
      return created;
    } finally {
      if (this._uploadProgress() < 100) this._uploadProgress.set(0);
    }
  }

  async addExternal(input: ExternalMediaInput): Promise<CatalogMediaItem> {
    const token = await this.requiredToken();
    if (input.isCover && input.kind !== "IMAGE") throw new Error("CATALOG_COVER_REQUIRES_IMAGE");
    const mediaUrl = this.requireHttpsUrl(input.url, "MEDIA_URL_INVALID");
    const rawSourceUrl = input.sourceUrl?.trim() || "";
    const rawSourceName = input.sourceName?.trim() || "";
    const rawLicense = input.license?.trim() || "";
    const rawAttribution = input.attribution?.trim() || "";
    const rawAltText = input.altText.trim();
    const provenanceComplete = Boolean(rawSourceUrl && rawSourceName && rawLicense && rawAttribution && rawAltText);
    const sourceUrl = rawSourceUrl ? this.requireHttpsUrl(rawSourceUrl, "MEDIA_SOURCE_MUST_BE_HTTPS") : mediaUrl;
    const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
    const sourceName = rawSourceName || sourceHost;
    const license = rawLicense || "REVIEW_REQUIRED";
    const attribution = rawAttribution || sourceName;
    const altText = (rawAltText || `${sourceName} katalog medyası`).slice(0, 300);

    if (await this.externalDuplicateExists(input.entityType, input.entityId, mediaUrl, token)) {
      throw new Error("MEDIA_ALREADY_EXISTS");
    }

    const requestedVerified = input.metadata?.["sourceVerified"] === true;
    const verified = provenanceComplete && requestedVerified;
    const active = provenanceComplete;
    const row = {
      ...this.ownerPayload(input.entityType, input.entityId),
      kind: input.kind,
      storage_bucket: null,
      object_path: null,
      external_url: mediaUrl,
      poster_url: input.posterUrl || null,
      source_url: sourceUrl,
      source_name: sourceName,
      license,
      attribution,
      alt_text: altText,
      sort_order: input.sortOrder ?? 0,
      is_cover: false,
      is_active: active,
      metadata: {
        ...(input.metadata || {}),
        provenanceComplete,
        sourceVerified: verified,
        reviewStatus: provenanceComplete ? (verified ? "VERIFIED" : "SOURCE_COMPLETE") : "REVIEW_REQUIRED",
        verificationScope: input.metadata?.["verificationScope"] || "REFERENCE",
      },
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?select=*`, {
      method: "POST",
      headers: { ...this.authHeaders(token), Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!response.ok) throw new Error(`EXTERNAL_MEDIA_CREATE_${response.status}`);
    const created = this.fromRow(((await response.json()) as CatalogMediaRow[])[0]);
    if (active && input.isCover) {
      await this.setCoverRpc(created.id, token);
      return { ...created, isCover: true };
    }
    return created;
  }

  async update(item: CatalogMediaItem, patch: MediaPatch): Promise<CatalogMediaItem> {
    const token = await this.requiredToken();
    await this.assertSafeUpdate(item, patch, token);
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
    if (patch.isCover === false) body["is_cover"] = false;

    let updated = item;
    if (Object.keys(body).length) {
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?id=eq.${encodeURIComponent(item.id)}&select=*`,
        {
          method: "PATCH",
          headers: { ...this.authHeaders(token), Prefer: "return=representation" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error(`CATALOG_MEDIA_UPDATE_${response.status}`);
      updated = this.fromRow(((await response.json()) as CatalogMediaRow[])[0]);
    }
    if (patch.isCover === true) {
      await this.setCoverRpc(item.id, token);
      updated = { ...updated, isCover: true, isActive: true };
    }
    return updated;
  }

  async remove(item: CatalogMediaItem): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/remove_catalog_media_safe`, {
      method: "POST",
      headers: this.authHeaders(token),
      body: JSON.stringify({ p_media_id: item.id }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const raw = String(payload?.message || `CATALOG_MEDIA_SAFE_DELETE_${response.status}`);
      if (raw.includes("CATALOG_LIVE_LAST_IMAGE_BLOCKED")) {
        throw new Error("Canlı ilanın son aktif görseli silinemez. Önce yeni bir görsel ekleyin.");
      }
      throw new Error(raw);
    }
    if (item.storageBucket === this.bucket && item.objectPath) {
      await this.deleteStorageObject(item.objectPath, token).catch((error) => {
        console.warn("Catalog media database row removed but storage cleanup failed", error);
      });
    }
  }

  private async assertSafeUpdate(item: CatalogMediaItem, patch: MediaPatch, token: string): Promise<void> {
    if (patch.isCover === true && (patch.isActive === false || item.kind !== "IMAGE")) {
      throw new Error("Kapak yalnız aktif bir görsel olabilir.");
    }
    const removesCover = item.isCover && (patch.isCover === false || patch.isActive === false);
    const deactivatesImage = item.kind === "IMAGE" && item.isActive && patch.isActive === false;
    if (!removesCover && !deactivatesImage) return;
    if (!(await this.isLiveOwner(item, token))) return;
    if (removesCover) {
      throw new Error("Canlı ilanın kapağı doğrudan kapatılamaz. Önce başka bir görseli kapak yapın veya mevcut kapağı silerek otomatik yedek kapak atamasını kullanın.");
    }
    const remaining = await this.otherActiveImageCount(item, token);
    if (remaining < 1) throw new Error("Canlı ilanın son aktif görseli kapatılamaz. Önce yeni bir görsel ekleyin.");
  }

  private async setCoverRpc(mediaId: string, token: string): Promise<void> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/set_catalog_media_cover`, {
      method: "POST",
      headers: this.authHeaders(token),
      body: JSON.stringify({ p_media_id: mediaId }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(String(payload?.message || `CATALOG_COVER_SET_${response.status}`));
    }
  }

  private async isLiveOwner(item: CatalogMediaItem, token: string): Promise<boolean> {
    if (item.vehicleId) {
      const rows = await this.getRows(`vehicles?id=eq.${encodeURIComponent(item.vehicleId)}&select=publication_status,is_active&limit=1`, token);
      return rows[0]?.publication_status && ["PUBLISHED", "SCHEDULED"].includes(String(rows[0].publication_status)) && rows[0]?.is_active === true;
    }
    if (item.tourId) {
      const rows = await this.getRows(`tours?id=eq.${encodeURIComponent(item.tourId)}&select=publication_status,is_active&limit=1`, token);
      return rows[0]?.publication_status && ["PUBLISHED", "SCHEDULED"].includes(String(rows[0].publication_status)) && rows[0]?.is_active === true;
    }
    if (item.blogPostId) {
      const rows = await this.getRows(`blog_posts?id=eq.${encodeURIComponent(item.blogPostId)}&select=status&limit=1`, token);
      return String(rows[0]?.status || "") === "PUBLISHED";
    }
    return false;
  }

  private async otherActiveImageCount(item: CatalogMediaItem, token: string): Promise<number> {
    const entity = this.entityFromItem(item);
    const column = this.ownerColumn(entity.type);
    const rows = await this.getRows(
      `catalog_media?${column}=eq.${encodeURIComponent(entity.id)}&id=neq.${encodeURIComponent(item.id)}&kind=eq.IMAGE&is_active=eq.true&select=id`,
      token,
    );
    return rows.length;
  }

  private async getRows(path: string, token: string): Promise<any[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, { headers: this.authHeaders(token) });
    if (!response.ok) throw new Error(`CATALOG_MEDIA_INTEGRITY_READ_${response.status}`);
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  }

  private requireHttpsUrl(value: string, code: string): string {
    const trimmed = value.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") throw new Error(code);
      return parsed.toString();
    } catch {
      throw new Error(code);
    }
  }

  private async externalDuplicateExists(entityType: CatalogEntityType, entityId: string, mediaUrl: string, token: string): Promise<boolean> {
    const column = this.ownerColumn(entityType);
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?${column}=eq.${encodeURIComponent(entityId)}&external_url=eq.${encodeURIComponent(mediaUrl)}&select=id&limit=1`,
      { headers: this.authHeaders(token) },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_DUPLICATE_CHECK_${response.status}`);
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
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
          "cache-control": "3600",
          "x-upsert": "false",
        },
        body: file,
      },
    );
    if (!response.ok) throw new Error(`CATALOG_MEDIA_UPLOAD_${response.status}`);
  }

  private async uploadTus(file: File, objectPath: string, token: string): Promise<void> {
    const metadata = [
      ["bucketName", this.bucket],
      ["objectName", objectPath],
      ["contentType", file.type],
      ["cacheControl", "3600"],
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
    if (!create.ok) throw new Error(`CATALOG_TUS_CREATE_${create.status}`);
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

  private async deleteStorageObject(objectPath: string, token: string): Promise<void> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: { ...this.authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [objectPath] }),
    });
    if (!response.ok) throw new Error(`CATALOG_STORAGE_DELETE_${response.status}`);
  }

  private validateFile(file: File): void {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4", "video/webm"]);
    if (!allowed.has(file.type)) throw new Error("CATALOG_MEDIA_TYPE_NOT_ALLOWED");
    if (file.size < 1 || file.size > this.maxUploadBytes) throw new Error("CATALOG_MEDIA_SIZE_NOT_ALLOWED");
  }

  private extension(file: File): string {
    const byType: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm",
    };
    return byType[file.type] || "bin";
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
    const url = row.external_url || (row.storage_bucket && row.object_path
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
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
