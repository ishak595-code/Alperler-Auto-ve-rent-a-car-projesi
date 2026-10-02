/**
 * V255 — serve legacy Supabase Storage catalogue media through the same-origin CDN.
 *
 * Rows uploaded before R2 (V252) still store absolute Supabase Storage URLs in
 * `vehicles.images`, `tours.cover_image`, campaign covers, etc. Rendering those
 * directly makes every visitor download every photo from Supabase, which is what
 * exhausts the free-plan egress quota. `/catalog-media/*` is a Vercel rewrite to
 * the same bucket with a 7-day CDN cache (vercel.json), so each object leaves
 * Supabase roughly once per week per edge instead of once per page view.
 *
 * Only the public `catalog-media` bucket is rewritten. Avatars, private buckets,
 * R2, Cloudinary and external URLs are untouched. Admin editors never call this,
 * so stored database values are never rewritten.
 */
import { SUPABASE_PROJECT_URL } from "../supabase.config";

const LEGACY_PUBLIC_PREFIX = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/catalog-media/`;
const CDN_PREFIX = "/catalog-media/";

/** One URL. Returns the input unchanged when it is not a legacy catalogue-media URL. */
export function cdnCatalogMediaUrl<T>(value: T): T {
  if (typeof value !== "string" || !value.startsWith(LEGACY_PUBLIC_PREFIX)) return value;
  return `${CDN_PREFIX}${value.slice(LEGACY_PUBLIC_PREFIX.length)}` as T;
}

/**
 * Raw JSON text. The prefix is plain ASCII with no characters JSON escapes, so a
 * literal replacement keeps the document valid and rewrites nested arrays too.
 */
export function cdnCatalogMediaText(text: string): string {
  return text.includes(LEGACY_PUBLIC_PREFIX) ? text.split(LEGACY_PUBLIC_PREFIX).join(CDN_PREFIX) : text;
}

/** Drop-in for `response.json()` on public, read-only catalogue responses. */
export async function readPublicCatalogJson<T>(response: Response): Promise<T> {
  return JSON.parse(cdnCatalogMediaText(await response.text())) as T;
}
