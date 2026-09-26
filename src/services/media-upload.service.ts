import { Injectable, inject } from "@angular/core";
import { CloudinarySizeError, CloudinaryUploadService, type CloudinarySignedUpload } from "./cloudinary-upload.service";
import { cloudinaryImageUrl, cloudinaryVideoPosterUrl, cloudinaryVideoUrl } from "../utils/cloudinary-media";
import { R2_IMAGE_WIDTHS, r2ImageUrl, r2VideoUrl, readActiveMediaProvider, type MediaProvider } from "../utils/r2-media";
import { generateImageVariants, generateVideoPosterVariants, type MediaVariantFile } from "../utils/image-variants";

/**
 * V252 — ONE upload entry point for every public-media path (admin catalog, admin site/
 * homepage/campaign images, branch profile + listing media, branch vehicle drafts, fleet
 * inspection photos). The provider is resolved server-side (MEDIA_PROVIDER + env) and
 * injected via /runtime-env.js:
 *   r2         → browser generates the fixed width set, PUTs to presigned R2 URLs
 *   cloudinary → signed direct upload (V249 flow)
 *   supabase   → isEnabled() === false; callers keep their Supabase Storage code path.
 * MediaProviderUnavailableError always means "fall back to Supabase Storage".
 */

export type MediaUploadTarget =
  | { scope: "catalog"; entityType: "VEHICLE" | "TOUR" | "BLOG"; entityId: string }
  | { scope: "admin"; entityType: string; entityId: string; purpose: string }
  | { scope: "branch"; branchId: string; purpose?: "vehicle-draft" }
  | { scope: "ops"; vehicleId: string };

export interface ProviderUploadResult {
  provider: "r2" | "cloudinary";
  /** Value for catalog_media.storage_bucket / media_assets.bucket. */
  bucket: "r2" | "cloudinary";
  /** Value for object_path: R2 key stem or Cloudinary public_id. */
  objectPath: string;
  kind: "IMAGE" | "VIDEO";
  /** Default delivery URL (image: 1440 w variant; video: playable file). */
  url: string;
  posterUrl: string | null;
  bytes: number;
  metadata: Record<string, unknown>;
}

export class MediaProviderUnavailableError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "MediaProviderUnavailableError";
  }
}

export class MediaUploadSizeError extends Error {
  constructor(readonly kind: "image" | "video", readonly maxBytes?: number) {
    super(kind === "video" ? "MEDIA_VIDEO_TOO_LARGE" : "MEDIA_IMAGE_TOO_LARGE");
    this.name = "MediaUploadSizeError";
  }
}

const FALLBACK_CODES = new Set([
  "MEDIA_PROVIDER_NOT_CONFIGURED",
  "MEDIA_PROVIDER_MIGRATION_PENDING",
  "CLOUDINARY_NOT_CONFIGURED",
  "R2_NOT_CONFIGURED",
  "ADMIN_VERIFY_UNAVAILABLE",
  "UNKNOWN_PARTNER_OPERATION",
  "MEDIA_VARIANT_UNSUPPORTED",
  "NETWORK",
]);

interface R2SignResponse {
  stem: string;
  publicBaseUrl: string;
  variantExt?: "webp" | "jpg";
  puts: Array<{ name: string; url: string; contentType: string; bytes: number; publicUrl: string }>;
}

@Injectable({ providedIn: "root" })
export class MediaUploadService {
  private readonly cloudinary = inject(CloudinaryUploadService);
  private readonly endpoint = "/api/partner?op=media-upload";

  activeProvider(): MediaProvider {
    return readActiveMediaProvider();
  }

  isEnabled(): boolean {
    return this.activeProvider() !== "supabase";
  }

  /**
   * Uploads an already validated/compressed file. `displayWidth` picks the default URL width
   * for single-URL contexts (logos, OG images); srcset helpers derive the rest.
   */
  async upload(
    target: MediaUploadTarget,
    file: File,
    kind: "IMAGE" | "VIDEO",
    token: string,
    options: { onProgress?: (percent: number) => void; displayWidth?: number } = {},
  ): Promise<ProviderUploadResult> {
    const provider = this.activeProvider();
    if (provider === "r2") return this.uploadR2(target, file, kind, token, options);
    if (provider === "cloudinary") return this.uploadCloudinary(target, file, kind, token, options);
    throw new MediaProviderUnavailableError("MEDIA_PROVIDER_NOT_CONFIGURED");
  }

  /** Rollback of a just-uploaded, not-yet-referenced asset (server re-checks references). */
  async rollback(token: string, result: Pick<ProviderUploadResult, "provider" | "objectPath" | "kind">): Promise<void> {
    await this.call(token, {
      action: "DESTROY",
      provider: result.provider,
      ...(result.provider === "r2" ? { stem: result.objectPath } : { publicId: result.objectPath, resourceType: result.kind === "VIDEO" ? "video" : "image" }),
    }).catch(() => undefined);
  }

  /** Drains queued R2 / Cloudinary deletions (DB delete triggers enqueue them). Best effort. */
  async drainCleanup(token: string, limit = 10): Promise<{ attempted: number; completed: number; pending: number }> {
    const payload = await this.call(token, { action: "DRAIN_CLEANUP", limit });
    const cleanup = (payload["cleanup"] || {}) as Record<string, unknown>;
    return { attempted: Number(cleanup["attempted"] || 0), completed: Number(cleanup["completed"] || 0), pending: Number(cleanup["pending"] || 0) };
  }

  private async uploadR2(
    target: MediaUploadTarget,
    file: File,
    kind: "IMAGE" | "VIDEO",
    token: string,
    options: { onProgress?: (percent: number) => void; displayWidth?: number },
  ): Promise<ProviderUploadResult> {
    let set;
    try {
      set = kind === "VIDEO" ? await generateVideoPosterVariants(file) : await generateImageVariants(file);
    } catch (error) {
      throw new MediaProviderUnavailableError(error instanceof Error && error.message === "MEDIA_VARIANT_UNSUPPORTED" ? "MEDIA_VARIANT_UNSUPPORTED" : "MEDIA_VARIANT_FAILED");
    }
    const files: MediaVariantFile[] = [...set.files];
    const type = String(file.type || "").toLowerCase();
    const origExt = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[type];
    const videoExt = ({ "video/mp4": "mp4", "video/webm": "webm" } as Record<string, string>)[type];
    if (kind === "IMAGE" && origExt) files.push({ name: `orig.${origExt}`, blob: file, contentType: type });
    if (kind === "VIDEO") {
      if (!videoExt) throw new Error("MEDIA_VIDEO_TYPE_UNSUPPORTED");
      files.push({ name: `video.${videoExt}`, blob: file, contentType: type });
    }
    const payload = await this.call(token, {
      action: "SIGN_UPLOAD",
      ...target,
      kind,
      files: files.map((item) => ({ name: item.name, contentType: item.contentType, bytes: item.blob.size })),
    });
    const signed = payload as unknown as R2SignResponse;
    if (!signed.stem || !Array.isArray(signed.puts) || signed.puts.length !== files.length) throw new MediaProviderUnavailableError("R2_SIGNATURE_INVALID");
    const total = files.reduce((sum, item) => sum + item.blob.size, 0) || 1;
    let done = 0;
    options.onProgress?.(0);
    for (const put of signed.puts) {
      const item = files.find((candidate) => candidate.name === put.name);
      if (!item) throw new Error("R2_SIGNATURE_MISMATCH");
      await this.putWithRetry(put.url, item);
      done += item.blob.size;
      options.onProgress?.(Math.min(99, Math.round((done / total) * 100)));
    }
    options.onProgress?.(100);
    const variantExt = signed.variantExt || set.variantExt;
    const imageUrl = r2ImageUrl(signed.publicBaseUrl, signed.stem, options.displayWidth || 1440, variantExt);
    return {
      provider: "r2",
      bucket: "r2",
      objectPath: signed.stem,
      kind,
      url: kind === "VIDEO" ? r2VideoUrl(signed.publicBaseUrl, signed.stem, videoExt) : imageUrl,
      posterUrl: kind === "VIDEO" ? r2ImageUrl(signed.publicBaseUrl, signed.stem, 1440, variantExt) : null,
      bytes: file.size,
      metadata: {
        storageProvider: "r2",
        r2: {
          publicBaseUrl: signed.publicBaseUrl,
          widths: [...R2_IMAGE_WIDTHS],
          variantExt,
          origExt: kind === "IMAGE" ? origExt || null : null,
          videoExt: kind === "VIDEO" ? videoExt : null,
          width: set.width,
          height: set.height,
          bytes: total,
        },
      },
    };
  }

  private async uploadCloudinary(
    target: MediaUploadTarget,
    file: File,
    kind: "IMAGE" | "VIDEO",
    token: string,
    options: { onProgress?: (percent: number) => void; displayWidth?: number },
  ): Promise<ProviderUploadResult> {
    const resourceType = kind === "VIDEO" ? "video" : "image";
    const payload = await this.call(token, { action: "SIGN_UPLOAD", ...target, resourceType, bytes: file.size });
    const signed = payload["upload"] as CloudinarySignedUpload | undefined;
    if (!signed?.signature || !signed.publicId || !signed.cloudName) throw new MediaProviderUnavailableError("CLOUDINARY_SIGNATURE_INVALID");
    let uploaded;
    try {
      uploaded = await this.cloudinary.upload(file, signed, options.onProgress);
    } catch (error) {
      if (error instanceof CloudinarySizeError) throw new MediaUploadSizeError(error.kind);
      throw error;
    }
    return {
      provider: "cloudinary",
      bucket: "cloudinary",
      objectPath: uploaded.publicId,
      kind,
      url: kind === "VIDEO" ? cloudinaryVideoUrl(uploaded.cloudName, uploaded.publicId) : cloudinaryImageUrl(uploaded.cloudName, uploaded.publicId, options.displayWidth || 1440),
      posterUrl: kind === "VIDEO" ? cloudinaryVideoPosterUrl(uploaded.cloudName, uploaded.publicId) : null,
      bytes: uploaded.bytes ?? file.size,
      metadata: {
        storageProvider: "cloudinary",
        cloudinary: {
          cloudName: uploaded.cloudName,
          resourceType: uploaded.resourceType,
          version: uploaded.version ?? null,
          format: uploaded.format ?? null,
          bytes: uploaded.bytes ?? file.size,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          duration: uploaded.duration ?? null,
        },
      },
    };
  }

  private async putWithRetry(url: string, item: MediaVariantFile): Promise<void> {
    let lastError: unknown;
    for (const delay of [0, 1200, 3500, 8000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const response = await fetch(url, { method: "PUT", headers: { "content-type": item.contentType }, body: item.blob });
        if (response.ok) return;
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`R2_UPLOAD_${response.status}`);
        lastError = new Error(`R2_UPLOAD_${response.status}`);
      } catch (error) {
        if (error instanceof Error && /^R2_UPLOAD_4\d\d$/.test(error.message) && !/^R2_UPLOAD_(408|429)$/.test(error.message)) throw error;
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("R2_UPLOAD_FAILED");
  }

  private async call(token: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          accept: "application/json",
          "x-request-id": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `media-${Date.now()}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new MediaProviderUnavailableError("NETWORK");
    }
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const code = String(payload["code"] || "");
    if (response.ok && payload["ok"] === true) return payload;
    if (/VIDEO_TOO_LARGE$/.test(code)) throw new MediaUploadSizeError("video", Number(payload["maxBytes"]) || undefined);
    if (/IMAGE_TOO_LARGE$/.test(code)) throw new MediaUploadSizeError("image", Number(payload["maxBytes"]) || undefined);
    if (FALLBACK_CODES.has(code) || response.status === 404 || (response.status >= 500 && !code)) throw new MediaProviderUnavailableError(code || `HTTP_${response.status}`);
    throw new Error(code || `MEDIA_UPLOAD_${response.status}`);
  }
}
