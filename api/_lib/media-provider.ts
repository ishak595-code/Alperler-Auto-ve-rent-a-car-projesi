/**
 * V252 — which media store receives NEW uploads.
 *
 *   MEDIA_PROVIDER = r2 | cloudinary | supabase | auto (default)
 *   auto → r2 when all R2_* vars are valid, else cloudinary when all CLOUDINARY_* vars are
 *          valid, else supabase (Storage). An explicit provider whose env is incomplete
 *          degrades along the same chain, so a half-configured deploy never breaks uploads.
 *
 * Mirrored (no TS import) by scripts/write-runtime-env.mjs; tests/unit/media-provider.test.ts
 * checks both agree. Existing rows keep resolving through their own storage_bucket.
 */
import { r2ConfigFrom } from "./r2.js";

export type MediaProvider = "r2" | "cloudinary" | "supabase";

export function cloudinaryConfiguredIn(env: Record<string, string | undefined>): boolean {
  const cloudName = String(env["CLOUDINARY_CLOUD_NAME"] || "").trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(cloudName)
    && String(env["CLOUDINARY_API_KEY"] || "").trim().length > 0
    && String(env["CLOUDINARY_API_SECRET"] || "").trim().length > 0;
}

export function resolveMediaProvider(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): MediaProvider {
  const requested = String(env["MEDIA_PROVIDER"] || "auto").trim().toLowerCase();
  const r2 = r2ConfigFrom(env).configured;
  const cloudinary = cloudinaryConfiguredIn(env);
  if (requested === "supabase") return "supabase";
  if (requested === "r2" && r2) return "r2";
  if (requested === "cloudinary" && cloudinary) return "cloudinary";
  return r2 ? "r2" : cloudinary ? "cloudinary" : "supabase";
}
