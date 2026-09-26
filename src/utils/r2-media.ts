/**
 * V252 Cloudflare R2 media delivery — pure, framework-free helpers (unit tested in
 * tests/unit/media-provider.test.ts).
 *
 * R2 has no on-the-fly resizing (Cloudflare Image Transformations need a zone), so every
 * upload stores a FIXED set of WebP widths as sibling objects under one key stem:
 *   <base>/<stem>/w480.webp … w1920.webp   (+ orig.<ext>, video.<ext> for videos)
 * Rows: storage_bucket='r2', object_path=<stem>, metadata.r2.publicBaseUrl=<base>.
 * <base> is R2_PUBLIC_BASE_URL (the media Worker on *.workers.dev today, a custom domain later).
 */

export const R2_STORAGE_BUCKET = "r2";
export const R2_IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
export type R2ImageWidth = (typeof R2_IMAGE_WIDTHS)[number];
export const R2_DEFAULT_IMAGE_WIDTH: R2ImageWidth = 1440;

export type MediaProvider = "r2" | "cloudinary" | "supabase";

const BASE_PATTERN = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{2,5})?(\/[A-Za-z0-9._~-]+)*$/;
const STEM_PATTERN = /^alperler\/[A-Za-z0-9_/-]{3,380}$/;
const VARIANT_URL_PATTERN = /^(https:\/\/[^?#\s]+\/alperler\/(?:catalog|branch|admin|ops)\/[A-Za-z0-9_/-]+)\/w(480|768|1080|1440|1920)\.(webp|jpg)$/;

function runtimeEnv(): Record<string, string | undefined> {
  if (typeof window === "undefined") return {};
  return (window as Window & { process?: { env?: Record<string, string | undefined> } }).process?.env || {};
}

export function normalizeR2Base(value: unknown): string {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  return BASE_PATTERN.test(trimmed) ? trimmed : "";
}

export function isSafeR2Stem(value: unknown): value is string {
  return typeof value === "string" && STEM_PATTERN.test(value) && !value.includes("..") && !value.includes("//");
}

/** R2_PUBLIC_BASE_URL injected by /runtime-env.js (only when R2 is fully configured server-side). */
export function readR2PublicBase(): string {
  return normalizeR2Base(runtimeEnv()["R2_PUBLIC_BASE_URL"]);
}

/**
 * Provider for NEW uploads, resolved server-side (MEDIA_PROVIDER + env presence) and injected
 * by /runtime-env.js. Older runtime-env builds without MEDIA_PROVIDER keep V249 behaviour:
 * Cloudinary when its cloud name is present, else Supabase Storage.
 */
export function readActiveMediaProvider(env: Record<string, string | undefined> = runtimeEnv()): MediaProvider {
  const value = String(env["MEDIA_PROVIDER"] || "").trim().toLowerCase();
  if (value === "r2" || value === "cloudinary" || value === "supabase") return value;
  return /^[A-Za-z0-9_-]{1,64}$/.test(String(env["CLOUDINARY_CLOUD_NAME"] || "").trim()) ? "cloudinary" : "supabase";
}

export function nearestR2Width(width: number): R2ImageWidth {
  const target = Number.isFinite(width) && width > 0 ? width : R2_DEFAULT_IMAGE_WIDTH;
  for (const candidate of R2_IMAGE_WIDTHS) if (candidate >= target) return candidate;
  return R2_IMAGE_WIDTHS[R2_IMAGE_WIDTHS.length - 1];
}

export function r2ImageUrl(base: string, stem: string, width: number = R2_DEFAULT_IMAGE_WIDTH, variantExt: unknown = "webp"): string {
  const root = normalizeR2Base(base);
  if (!root || !isSafeR2Stem(stem)) return "";
  return `${root}/${stem}/w${nearestR2Width(width)}.${variantExt === "jpg" ? "jpg" : "webp"}`;
}

export function r2VideoUrl(base: string, stem: string, ext: unknown = "mp4"): string {
  const root = normalizeR2Base(base);
  if (!root || !isSafeR2Stem(stem)) return "";
  const safeExt = ext === "webm" || ext === "mov" ? ext : "mp4";
  return `${root}/${stem}/video.${safeExt}`;
}

export function r2MetaOf(metadata: unknown): { publicBaseUrl: string; videoExt?: string; variantExt: "webp" | "jpg" } {
  const record = metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
  const r2 = record["r2"] && typeof record["r2"] === "object" ? record["r2"] as Record<string, unknown> : {};
  return { publicBaseUrl: normalizeR2Base(r2["publicBaseUrl"]) || readR2PublicBase(), videoExt: typeof r2["videoExt"] === "string" ? r2["videoExt"] as string : undefined, variantExt: r2["variantExt"] === "jpg" ? "jpg" : "webp" };
}

/** Delivery URL for a storage_bucket='r2' row (mirrors private.r2_delivery_url_v252). */
export function r2MediaUrl(stem: string, kind: string | null | undefined, metadata: unknown, width?: number): string {
  const meta = r2MetaOf(metadata);
  return kind === "VIDEO" ? r2VideoUrl(meta.publicBaseUrl, stem, meta.videoExt) : r2ImageUrl(meta.publicBaseUrl, stem, width, meta.variantExt);
}

/** Poster (first-frame still, generated at upload time) for an R2 video row. */
export function r2PosterUrl(stem: string, metadata: unknown, width = 1080): string {
  const meta = r2MetaOf(metadata);
  return r2ImageUrl(meta.publicBaseUrl, stem, width, meta.variantExt);
}

export function isR2VariantUrl(url: unknown): boolean {
  return typeof url === "string" && VARIANT_URL_PATTERN.test(url);
}

/** Rewrites the width of one of OUR R2 variant URLs; any other URL is returned unchanged. */
export function withR2Width(url: string, width: number): string {
  const match = typeof url === "string" ? VARIANT_URL_PATTERN.exec(url) : null;
  if (!match) return url;
  return `${match[1]}/w${nearestR2Width(width)}.${match[3]}`;
}

/** srcset for one of OUR R2 variant URLs (every width exists by contract); empty string otherwise. */
export function r2Srcset(url: string, widths: readonly number[] = R2_IMAGE_WIDTHS): string {
  if (!isR2VariantUrl(url)) return "";
  const unique = Array.from(new Set(widths.map((width) => nearestR2Width(width))));
  return unique.map((width) => `${withR2Width(url, width)} ${width}w`).join(", ");
}
