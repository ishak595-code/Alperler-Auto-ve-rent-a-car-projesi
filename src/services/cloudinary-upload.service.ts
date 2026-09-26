import { Injectable } from "@angular/core";
import { CLOUDINARY_CHUNK_BYTES, readCloudinaryCloudName } from "../utils/cloudinary-media";
import { readActiveMediaProvider } from "../utils/r2-media";

/**
 * V249 — browser → Cloudinary direct uploads with a server-issued signature.
 *
 * The file bytes never pass through Vercel (4.5 MB body limit) or Supabase
 * (egress). `/api/partner?op=cloudinary` verifies the admin JWT and returns
 * `{ cloudName, apiKey, timestamp, signature, publicId }`; the API secret stays
 * server-side. Disabled (isEnabled() === false) unless CLOUDINARY_CLOUD_NAME is
 * injected by /runtime-env.js — then callers keep the Supabase path untouched.
 */

export type CloudinaryResourceType = "image" | "video";

export interface CloudinarySignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  folder: string;
  resourceType: CloudinaryResourceType;
  uploadUrl: string;
  maxBytes: number;
  chunkBytes: number;
}

export interface CloudinaryUploadResult {
  publicId: string;
  resourceType: CloudinaryResourceType;
  version?: number;
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  cloudName: string;
}

export type CloudinarySignRequest =
  | { scope: "catalog"; entityType: "VEHICLE" | "TOUR" | "BLOG"; entityId: string; resourceType: CloudinaryResourceType; bytes: number }
  | { scope: "admin"; entityType: string; entityId: string; purpose: string; resourceType: "image"; bytes: number };

/** Thrown when Cloudinary is not usable right now → caller must fall back to Supabase Storage. */
export class CloudinaryUnavailableError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "CloudinaryUnavailableError";
  }
}

/** Thrown for a size cap rejection (free plan) → caller shows the translated friendly message. */
export class CloudinarySizeError extends Error {
  constructor(readonly kind: "image" | "video") {
    super(kind === "video" ? "CLOUDINARY_VIDEO_TOO_LARGE" : "CLOUDINARY_IMAGE_TOO_LARGE");
    this.name = "CloudinarySizeError";
  }
}

const FALLBACK_CODES = new Set([
  "CLOUDINARY_NOT_CONFIGURED",
  "ADMIN_VERIFY_UNAVAILABLE",
  "UNKNOWN_PARTNER_OPERATION",
  "NETWORK",
]);

@Injectable({ providedIn: "root" })
export class CloudinaryUploadService {
  private readonly endpoint = "/api/partner?op=cloudinary";

  /** V252: Cloudinary receives new uploads only while it is the active provider (R2 wins once configured). */
  isEnabled(): boolean {
    return readCloudinaryCloudName() !== "" && readActiveMediaProvider() === "cloudinary";
  }

  async sign(token: string, request: CloudinarySignRequest): Promise<CloudinarySignedUpload> {
    const payload = await this.call(token, { action: "SIGN_UPLOAD", ...request });
    const upload = payload["upload"] as CloudinarySignedUpload | undefined;
    if (!upload?.signature || !upload.publicId || !upload.cloudName) throw new CloudinaryUnavailableError("CLOUDINARY_SIGNATURE_INVALID");
    return upload;
  }

  /** Single request up to one chunk; larger files use Cloudinary chunked upload (X-Unique-Upload-Id + Content-Range). */
  async upload(file: Blob, signed: CloudinarySignedUpload, onProgress?: (percent: number) => void): Promise<CloudinaryUploadResult> {
    const chunkBytes = Math.max(5 * 1024 * 1024, Number(signed.chunkBytes) || CLOUDINARY_CHUNK_BYTES);
    if (file.size <= chunkBytes) {
      const result = await this.postWithRetry(signed, file, {});
      onProgress?.(100);
      return this.toResult(result, signed);
    }
    const uniqueId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let last: Record<string, unknown> = {};
    for (let start = 0; start < file.size; start += chunkBytes) {
      const end = Math.min(start + chunkBytes, file.size);
      last = await this.postWithRetry(signed, file.slice(start, end), {
        "X-Unique-Upload-Id": uniqueId,
        "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
      });
      onProgress?.(Math.min(99, Math.round((end / file.size) * 100)));
    }
    onProgress?.(100);
    return this.toResult(last, signed);
  }

  /** Server-side signed destroy of an asset that no DB row references (upload rollback). */
  async destroy(token: string, publicId: string, resourceType: CloudinaryResourceType): Promise<void> {
    await this.call(token, { action: "DESTROY", publicId, resourceType });
  }

  /** Processes queued Cloudinary cleanup jobs (created by the DB delete triggers). Best effort. */
  async drainCleanup(token: string, limit = 10): Promise<{ attempted: number; completed: number; pending: number }> {
    const payload = await this.call(token, { action: "DRAIN_CLEANUP", limit });
    const cleanup = (payload["cleanup"] || {}) as Record<string, unknown>;
    return { attempted: Number(cleanup["attempted"] || 0), completed: Number(cleanup["completed"] || 0), pending: Number(cleanup["pending"] || 0) };
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
          "x-request-id": typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `cld-${Date.now()}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new CloudinaryUnavailableError("NETWORK");
    }
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const code = String(payload["code"] || "");
    if (response.ok && payload["ok"] === true) return payload;
    if (code === "CLOUDINARY_IMAGE_TOO_LARGE") throw new CloudinarySizeError("image");
    if (code === "CLOUDINARY_VIDEO_TOO_LARGE") throw new CloudinarySizeError("video");
    if (FALLBACK_CODES.has(code) || response.status === 404 || (response.status >= 500 && !code)) throw new CloudinaryUnavailableError(code || `HTTP_${response.status}`);
    throw new Error(code || `CLOUDINARY_${response.status}`);
  }

  private async postWithRetry(signed: CloudinarySignedUpload, blob: Blob, headers: Record<string, string>): Promise<Record<string, unknown>> {
    let lastError: unknown;
    for (const delay of [0, 1500, 4000, 8000]) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const form = new FormData();
        form.append("file", blob);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId);
        form.append("signature", signed.signature);
        const response = await fetch(signed.uploadUrl, { method: "POST", headers, body: form });
        const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (response.ok) return payload;
        const message = String((payload["error"] as { message?: unknown } | undefined)?.message || "");
        if (/file size too large|too large/i.test(message)) throw new CloudinarySizeError(signed.resourceType === "video" ? "video" : "image");
        if (![408, 409, 420, 429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`CLOUDINARY_UPLOAD_${response.status}${message ? `: ${message.slice(0, 160)}` : ""}`);
        }
        lastError = new Error(`CLOUDINARY_UPLOAD_${response.status}`);
      } catch (error) {
        if (error instanceof CloudinarySizeError) throw error;
        if (error instanceof Error && /^CLOUDINARY_UPLOAD_4\d\d/.test(error.message) && !/^CLOUDINARY_UPLOAD_(408|409|420|429)/.test(error.message)) throw error;
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("CLOUDINARY_UPLOAD_FAILED");
  }

  private toResult(payload: Record<string, unknown>, signed: CloudinarySignedUpload): CloudinaryUploadResult {
    const publicId = String(payload["public_id"] || "");
    if (publicId !== signed.publicId) throw new Error("CLOUDINARY_UPLOAD_INCOMPLETE");
    const number = (key: string) => (Number.isFinite(Number(payload[key])) ? Number(payload[key]) : undefined);
    return {
      publicId,
      resourceType: payload["resource_type"] === "video" ? "video" : signed.resourceType,
      version: number("version"),
      bytes: number("bytes"),
      format: typeof payload["format"] === "string" ? payload["format"] as string : undefined,
      width: number("width"),
      height: number("height"),
      duration: number("duration"),
      cloudName: signed.cloudName,
    };
  }
}
