/**
 * V249 Cloudinary media delivery — pure, framework-free helpers (unit tested in
 * tests/unit/cloudinary-media.test.ts).
 *
 * Rows hosted on Cloudinary are stored as storage_bucket='cloudinary' and
 * object_path=<public_id>. Delivery URLs use a SMALL FIXED width set so the free
 * plan's transformation quota is never burned by per-pixel variants.
 */

export const CLOUDINARY_STORAGE_BUCKET = "cloudinary";
export const CLOUDINARY_IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
export type CloudinaryImageWidth = (typeof CLOUDINARY_IMAGE_WIDTHS)[number];
/** Default display width for a single-URL context (matches the DB projection in the V249 migration). */
export const CLOUDINARY_DEFAULT_IMAGE_WIDTH: CloudinaryImageWidth = 1440;
/** Free plan caps. */
export const CLOUDINARY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CLOUDINARY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const CLOUDINARY_CHUNK_BYTES = 6 * 1024 * 1024;

const CLOUD_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DELIVERY_IMAGE_PATTERN = /^https:\/\/res\.cloudinary\.com\/([A-Za-z0-9_-]{1,64})\/image\/upload\/f_auto,q_auto,w_(\d{2,4})\/(.+)$/;

export function isValidCloudName(value: unknown): value is string {
  return typeof value === "string" && CLOUD_NAME_PATTERN.test(value);
}

/** Cloud name injected by /runtime-env.js (CLOUDINARY_CLOUD_NAME). Empty → Cloudinary disabled. */
export function readCloudinaryCloudName(): string {
  if (typeof window === "undefined") return "";
  const env = (window as Window & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = String(env?.["CLOUDINARY_CLOUD_NAME"] || "").trim();
  return isValidCloudName(value) ? value : "";
}

export function nearestCloudinaryWidth(width: number): CloudinaryImageWidth {
  const target = Number.isFinite(width) && width > 0 ? width : CLOUDINARY_DEFAULT_IMAGE_WIDTH;
  for (const candidate of CLOUDINARY_IMAGE_WIDTHS) if (candidate >= target) return candidate;
  return CLOUDINARY_IMAGE_WIDTHS[CLOUDINARY_IMAGE_WIDTHS.length - 1];
}

export function encodePublicId(publicId: string): string {
  return String(publicId || "")
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function cloudinaryImageUrl(cloudName: string, publicId: string, width: number = CLOUDINARY_DEFAULT_IMAGE_WIDTH): string {
  if (!isValidCloudName(cloudName) || !publicId) return "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${nearestCloudinaryWidth(width)}/${encodePublicId(publicId)}`;
}

export function cloudinaryVideoUrl(cloudName: string, publicId: string): string {
  if (!isValidCloudName(cloudName) || !publicId) return "";
  // `.mp4` pins a universally playable container; vc_auto picks the best codec.
  return `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,vc_auto/${encodePublicId(publicId)}.mp4`;
}

/** First-frame poster for a Cloudinary video (fixed width set). */
export function cloudinaryVideoPosterUrl(cloudName: string, publicId: string, width: number = 1080): string {
  if (!isValidCloudName(cloudName) || !publicId) return "";
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,f_auto,q_auto,w_${nearestCloudinaryWidth(width)}/${encodePublicId(publicId)}.jpg`;
}

export function cloudinaryMediaUrl(cloudName: string, publicId: string, kind: "IMAGE" | "VIDEO" | string | null | undefined, width?: number): string {
  return kind === "VIDEO" ? cloudinaryVideoUrl(cloudName, publicId) : cloudinaryImageUrl(cloudName, publicId, width);
}

export function isCloudinaryDeliveryUrl(url: unknown): boolean {
  return typeof url === "string" && DELIVERY_IMAGE_PATTERN.test(url);
}

/** Rewrites the width of one of OUR Cloudinary image URLs; any other URL is returned unchanged. */
export function withCloudinaryWidth(url: string, width: number): string {
  const match = typeof url === "string" ? DELIVERY_IMAGE_PATTERN.exec(url) : null;
  if (!match) return url;
  return `https://res.cloudinary.com/${match[1]}/image/upload/f_auto,q_auto,w_${nearestCloudinaryWidth(width)}/${match[3]}`;
}

/** srcset for one of OUR Cloudinary image URLs (fixed widths); empty string otherwise. */
export function cloudinarySrcset(url: string, widths: readonly number[] = CLOUDINARY_IMAGE_WIDTHS): string {
  if (!isCloudinaryDeliveryUrl(url)) return "";
  const unique = Array.from(new Set(widths.map((width) => nearestCloudinaryWidth(width))));
  return unique.map((width) => `${withCloudinaryWidth(url, width)} ${width}w`).join(", ");
}

/** Cloud name stored on the row (metadata.cloudinary.cloudName) or the runtime one. */
export function cloudNameForRow(metadata: unknown, runtimeCloudName = readCloudinaryCloudName()): string {
  const record = metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
  const cloudinary = record["cloudinary"] && typeof record["cloudinary"] === "object" ? record["cloudinary"] as Record<string, unknown> : {};
  const stored = cloudinary["cloudName"];
  return isValidCloudName(stored) ? stored : runtimeCloudName;
}

/** Friendly size validation for the Cloudinary free plan; empty string when allowed. */
export function cloudinarySizeViolation(sizeBytes: number, mediaType: string): "" | "image" | "video" {
  if (mediaType.startsWith("video/")) return sizeBytes > CLOUDINARY_VIDEO_MAX_BYTES ? "video" : "";
  if (mediaType.startsWith("image/")) return sizeBytes > CLOUDINARY_IMAGE_MAX_BYTES ? "image" : "";
  return "";
}
