/**
 * V249 Cloudinary media hosting — server-only helpers.
 *
 * Env-gated: when CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * are not all set, `cloudinaryConfig().configured` is false and every caller must
 * keep the existing Supabase Storage path. The API secret never leaves the server;
 * only the cloud name, API key (public by Cloudinary design), timestamp and
 * signature are returned to an authenticated admin browser.
 */
import { createHash, randomUUID } from "node:crypto";

export const CLOUDINARY_STORAGE_BUCKET = "cloudinary";
export const CLOUDINARY_ROOT_FOLDER = "alperler";
export const CLOUDINARY_CATALOG_FOLDER = `${CLOUDINARY_ROOT_FOLDER}/catalog`;
export const CLOUDINARY_ADMIN_FOLDER = `${CLOUDINARY_ROOT_FOLDER}/admin`;
/** Cloudinary Free plan caps (per asset). */
export const CLOUDINARY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CLOUDINARY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
/** Chunk size for upload_large style chunked uploads (Cloudinary minimum is 5 MB). */
export const CLOUDINARY_CHUNK_BYTES = 6 * 1024 * 1024;

export type CloudinaryResourceType = "image" | "video";

export interface CloudinaryConfig {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

const CLOUD_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_\-/]{3,400}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function env(name: string): string {
  return String(process.env[name] || "").trim();
}

export function cloudinaryConfig(): CloudinaryConfig {
  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  const configured = CLOUD_NAME_PATTERN.test(cloudName) && apiKey.length > 0 && apiSecret.length > 0;
  return { configured, cloudName: configured ? cloudName : "", apiKey: configured ? apiKey : "", apiSecret: configured ? apiSecret : "" };
}

export function isValidCloudName(value: unknown): value is string {
  return typeof value === "string" && CLOUD_NAME_PATTERN.test(value);
}

export function isSafePublicId(value: unknown, requiredPrefix = `${CLOUDINARY_ROOT_FOLDER}/`): value is string {
  if (typeof value !== "string") return false;
  if (!PUBLIC_ID_PATTERN.test(value)) return false;
  if (value.includes("..") || value.includes("//") || value.startsWith("/") || value.endsWith("/")) return false;
  return value.startsWith(requiredPrefix);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function resourceTypeFrom(value: unknown): CloudinaryResourceType | null {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "image" || normalized === "video" ? normalized : null;
}

/**
 * Cloudinary signature: every signed parameter (except file, cloud_name,
 * resource_type, api_key) sorted by key, joined as k=v&k2=v2, then the API
 * secret appended and SHA-256 hashed (hex). Cloudinary accepts SHA-1 or SHA-256 digests; SHA-256 is used to avoid a weak hash.
 */
export function signCloudinaryParams(params: Record<string, string | number | boolean | undefined | null>, apiSecret: string): string {
  const serialized = Object.keys(params)
    .filter((key) => !["file", "cloud_name", "resource_type", "api_key", "signature"].includes(key))
    .filter((key) => params[key] !== undefined && params[key] !== null && String(params[key]) !== "")
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
  return createHash("sha256").update(`${serialized}${apiSecret}`).digest("hex");
}

function segment(value: unknown, fallback: string): string {
  const cleaned = String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

export type CatalogEntityType = "VEHICLE" | "TOUR" | "BLOG";

/** alperler/catalog/<vehicle|tour|blog>/<entityUuid> — mirrors the Supabase object prefix rule. */
export function catalogFolder(entityType: CatalogEntityType, entityId: string): string {
  return `${CLOUDINARY_CATALOG_FOLDER}/${entityType.toLowerCase()}/${entityId.toLowerCase()}`;
}

/** alperler/admin/<entityType>/<entityId>/<purpose> — mirrors the Supabase `admin/` prefix rule. */
export function adminFolder(entityType: unknown, entityId: unknown, purpose: unknown): string {
  return `${CLOUDINARY_ADMIN_FOLDER}/${segment(entityType, "content")}/${segment(entityId, "draft")}/${segment(purpose, "image")}`;
}

/** alperler/branch/<branchUuid>[/<sub>] — branch profile / hero media and branch drafts. */
export function branchFolder(branchId: string, sub = ""): string {
  const base = `${CLOUDINARY_ROOT_FOLDER}/branch/${branchId.toLowerCase()}`;
  return sub ? `${base}/${segment(sub, "media")}` : base;
}

/** alperler/ops/inspection/<vehicle> — fleet delivery / return inspection photos. */
export function opsFolder(vehicleId: unknown): string {
  return `${CLOUDINARY_ROOT_FOLDER}/ops/inspection/${segment(vehicleId, "vehicle")}`;
}

export function newPublicId(folder: string, nonce: string = randomUUID()): string {
  return `${folder}/${nonce.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64)}`;
}

export interface SignedUpload {
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

export function signUpload(config: CloudinaryConfig, folder: string, resourceType: CloudinaryResourceType, nowSeconds = Math.floor(Date.now() / 1000), nonce?: string): SignedUpload {
  const publicId = newPublicId(folder, nonce);
  const signature = signCloudinaryParams({ public_id: publicId, timestamp: nowSeconds }, config.apiSecret);
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp: nowSeconds,
    signature,
    publicId,
    folder,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/upload`,
    maxBytes: resourceType === "video" ? CLOUDINARY_VIDEO_MAX_BYTES : CLOUDINARY_IMAGE_MAX_BYTES,
    chunkBytes: CLOUDINARY_CHUNK_BYTES,
  };
}

export interface DestroyResult {
  ok: boolean;
  result: string;
  status: number;
}

/** Signed destroy through the Cloudinary Upload API (server-side only). */
export async function destroyCloudinaryAsset(config: CloudinaryConfig, publicId: string, resourceType: CloudinaryResourceType): Promise<DestroyResult> {
  if (!config.configured) throw new Error("CLOUDINARY_NOT_CONFIGURED");
  if (!isSafePublicId(publicId)) throw new Error("INVALID_CLOUDINARY_PUBLIC_ID");
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { invalidate: "true", public_id: publicId, timestamp };
  const signature = signCloudinaryParams(signed, config.apiSecret);
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(signed).map(([k, v]) => [k, String(v)])), api_key: config.apiKey, signature });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as { result?: string };
  const result = String(payload?.result || "");
  // "not found" is a successful idempotent outcome for cleanup purposes.
  return { ok: response.ok && (result === "ok" || result === "not found"), result: result || `HTTP_${response.status}`, status: response.status };
}
