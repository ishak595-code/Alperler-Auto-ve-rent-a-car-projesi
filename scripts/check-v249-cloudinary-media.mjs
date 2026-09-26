#!/usr/bin/env node
/**
 * V249 Cloudinary media hosting contract (static, no network).
 * Env-gated, secret server-side only, fixed delivery widths, Supabase fallback intact.
 */
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const must = (ok, message) => { if (!ok) failures.push(message); };

const lib = read("api/_lib/cloudinary.ts");
const admin = read("api/_lib/cloudinary-admin.ts");
const partner = read("api/partner.ts");
const util = read("src/utils/cloudinary-media.ts");
const uploader = read("src/services/cloudinary-upload.service.ts");
const catalog = read("src/services/catalog-media.service.ts");
const adminMedia = read("src/services/admin-media.service.ts");
const publicMedia = read("src/services/public-catalog-media.service.ts");
const runtimeEnv = read("scripts/write-runtime-env.mjs");
const server = read("server.ts");
const vercel = JSON.parse(read("vercel.json"));
const headersFile = read("public/_headers");
const migrationPath = "supabase/migrations/20260926110000_v249_cloudinary_media_hosting.sql";

// 1. Env gate + secret stays server-side.
for (const name of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) must(lib.includes(`env("${name}")`), `server config must read ${name}`);
must(/configured\s*=\s*CLOUD_NAME_PATTERN\.test\(cloudName\)\s*&&\s*apiKey\.length\s*>\s*0\s*&&\s*apiSecret\.length\s*>\s*0/.test(lib), "Cloudinary must require all three env variables");
must(admin.includes('if (!cloudinaryConfig().configured) return reply(request, { ok: false, code: "CLOUDINARY_NOT_CONFIGURED" }, 503);'), "endpoint must short-circuit to CLOUDINARY_NOT_CONFIGURED when env is missing");
must(admin.includes("await requireContentAdmin(request);"), "endpoint must verify the Supabase JWT + admin role");
must(admin.includes("admin_users?user_id=eq.") && admin.includes('permissions["content.manage"]'), "admin verification must mirror media-control-admin-v185");
must(partner.includes('if (operation === "cloudinary") return cloudinaryAdmin(request);'), "/api/partner?op=cloudinary route missing");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
for (const file of walk("src").filter((f) => /\.(ts|html|js)$/.test(f))) {
  const source = read(file);
  if (/CLOUDINARY_API_SECRET|CLOUDINARY_API_KEY|api_secret/.test(source)) failures.push(`browser source must never reference the Cloudinary key/secret: ${file}`);
}
must(runtimeEnv.includes("env.CLOUDINARY_CLOUD_NAME") && !/CLOUDINARY_API_(KEY|SECRET)/.test(runtimeEnv), "runtime-env.js may expose only CLOUDINARY_CLOUD_NAME");
must(server.includes("env.CLOUDINARY_CLOUD_NAME") && !/CLOUDINARY_API_(KEY|SECRET)/.test(server), "portable runtime-env may expose only CLOUDINARY_CLOUD_NAME");

// 2. Uploads go browser → Cloudinary directly (chunked), with Supabase fallback.
must(uploader.includes("X-Unique-Upload-Id") && uploader.includes("Content-Range"), "chunked Cloudinary upload headers missing");
must(uploader.includes("readCloudinaryCloudName() !== \"\""), "frontend must stay disabled without CLOUDINARY_CLOUD_NAME");
must(catalog.includes("prepareCatalogImage") && catalog.includes("catalogUploadSizeRejection"), "existing WebP compression / Supabase caps must remain");
must(catalog.includes("CloudinaryUnavailableError") && catalog.includes("CLOUDINARY_DB_MIGRATION_PENDING"), "catalog upload must fall back to Supabase when Cloudinary/migration is unavailable");
must(catalog.includes("storage_bucket: CLOUDINARY_STORAGE_BUCKET") && catalog.includes("object_path: uploaded.publicId"), "Cloudinary rows must be stored as storage_bucket=cloudinary + object_path=public_id");
must(adminMedia.includes("CloudinaryUnavailableError") && adminMedia.includes("REGISTER_MEDIA_ASSET"), "admin media Cloudinary path/fallback missing");
must(lib.includes("CLOUDINARY_IMAGE_MAX_BYTES = 10 * 1024 * 1024") && lib.includes("CLOUDINARY_VIDEO_MAX_BYTES = 100 * 1024 * 1024"), "server free-plan caps missing");

// 3. Delivery URLs: fixed widths only.
must(util.includes("CLOUDINARY_IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920]"), "fixed width set changed");
must(util.includes("/image/upload/f_auto,q_auto,w_${nearestCloudinaryWidth(width)}/"), "image delivery transformation missing");
must(util.includes("/video/upload/q_auto,vc_auto/"), "video delivery transformation missing");
must(publicMedia.includes('storageBucket === "catalog-media" && objectPath') && publicMedia.includes("/catalog-media/${encodedPath}"), "existing Supabase catalog-media resolution must stay unchanged");
must(publicMedia.includes("storageBucket === CLOUDINARY_STORAGE_BUCKET"), "public media must resolve Cloudinary rows");

// 4. Migration (written, not applied).
must(fs.existsSync(migrationPath), `${migrationPath} missing`);
if (fs.existsSync(migrationPath)) {
  const sql = read(migrationPath);
  must(sql.includes("check (storage_bucket in ('catalog-media','cloudinary'))"), "cleanup bucket constraint must allow cloudinary");
  must(sql.includes("private.enqueue_cloudinary_cleanup_v249"), "cloudinary cleanup enqueue missing");
  must(sql.includes("f_auto,q_auto,w_1440") && sql.includes("q_auto,vc_auto"), "DB projection must use the fixed Cloudinary transformations");
  must(sql.includes("private.catalog_media_public_url(p_storage_bucket, p_object_path, p_external_url)"), "existing Supabase URL behaviour must be delegated, not rewritten");
  must(!/grant[^;]*to\s+(anon|authenticated)/i.test(sql), "migration must not grant anything to anon/authenticated");
}
must(fs.existsSync("scripts/migrate-media-to-cloudinary.mjs"), "one-time migration script missing");
if (fs.existsSync("scripts/migrate-media-to-cloudinary.mjs")) {
  const script = read("scripts/migrate-media-to-cloudinary.mjs");
  must(script.includes('const APPLY = hasFlag("apply");') && script.includes('hasFlag("delete-source")'), "migration script must be dry-run by default with --apply/--delete-source");
}

// 5. CSP allows Cloudinary for img/media/connect (explicitly or via https:).
function allows(csp, directive, host) {
  const match = csp.match(new RegExp(`${directive}\\s+([^;]+)`));
  if (!match) return false;
  const sources = match[1].trim().split(/\s+/);
  return sources.includes("https:") || sources.includes(`https://${host}`) || sources.includes(host);
}
const vercelCsp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy")?.value || "";
const serverCsp = (server.match(/const CSP="([^"]+)"/) || [])[1] || "";
const staticCsp = (headersFile.match(/Content-Security-Policy: ([^\n]+)/) || [])[1] || "";
for (const [label, csp] of [["vercel.json", vercelCsp], ["server.ts", serverCsp], ["public/_headers", staticCsp]]) {
  must(allows(csp, "img-src", "res.cloudinary.com"), `${label} CSP img-src must allow res.cloudinary.com`);
  must(allows(csp, "media-src", "res.cloudinary.com"), `${label} CSP media-src must allow res.cloudinary.com`);
  must(allows(csp, "connect-src", "api.cloudinary.com"), `${label} CSP connect-src must allow api.cloudinary.com`);
}

// 6. i18n for every supported language.
const tr = read("src/services/ui.service.ts");
must(/mediaUpload: \{\s*imageTooLarge:/.test(tr), "TR mediaUpload keys missing");
for (const code of ["en", "de", "fr", "es", "ru", "ku", "zh", "ar"]) {
  const pack = read(`src/i18n/${code}.ts`);
  for (const key of ["imageTooLarge", "videoTooLarge", "uploadFailed", "signatureFailed"]) must(new RegExp(`mediaUpload: \\{[\\s\\S]*?${key}:`).test(pack), `${code} mediaUpload.${key} missing`);
}

if (failures.length) {
  console.error(`V249 Cloudinary media contract failed:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("V249 Cloudinary media contract passed: env-gated (3 vars), secret server-side, signed direct uploads (chunked video), fixed widths 480–1920, Supabase fallback + resolution intact, migration written (not applied), CSP permits Cloudinary, i18n for 9 languages.");
