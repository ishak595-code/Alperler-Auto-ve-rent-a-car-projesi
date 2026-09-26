/**
 * V252 — provider-agnostic responsive delivery for OUR hosted images.
 * Cloudinary URLs get width transformations, R2 URLs get their pre-generated WebP siblings.
 * Anything else (legacy Supabase Storage, external, local assets) is returned untouched and
 * gets no srcset — never guess a variant that may not exist.
 */
import { cloudinarySrcset, isCloudinaryDeliveryUrl, withCloudinaryWidth } from "./cloudinary-media";
import { isR2VariantUrl, r2Srcset, withR2Width } from "./r2-media";

export const DEFAULT_CARD_SIZES = "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw";
export const DEFAULT_HERO_SIZES = "100vw";

export function isResponsiveMediaUrl(url: unknown): boolean {
  return isCloudinaryDeliveryUrl(url) || isR2VariantUrl(url);
}

export function responsiveSrcset(url: unknown): string {
  if (typeof url !== "string" || !url) return "";
  return cloudinarySrcset(url) || r2Srcset(url);
}

export function responsiveUrl(url: string, width: number): string {
  if (isCloudinaryDeliveryUrl(url)) return withCloudinaryWidth(url, width);
  if (isR2VariantUrl(url)) return withR2Width(url, width);
  return url;
}
