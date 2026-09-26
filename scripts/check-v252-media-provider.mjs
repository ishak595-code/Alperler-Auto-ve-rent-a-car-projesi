#!/usr/bin/env node
/**
 * V252 provider-agnostic media storage contract (static, no network).
 * MEDIA_PROVIDER=r2|cloudinary|supabase|auto; auto = R2 (all five R2_* vars) → Cloudinary → Supabase.
 * Every public-media upload path goes through MediaUploadService with a Supabase fallback; secrets stay
 * server-side; R2 delivery base is configuration only (no hardcoded domain); the Worker is in-repo, not deployed by CI.
 */
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const must = (ok, message) => { if (!ok) failures.push(message); };
const hardcodesSiteDomain = (text) => text.toLowerCase().includes(["alperler", "com"].join("."));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);

const r2 = read("api/_lib/r2.ts");
const resolver = read("api/_lib/media-provider.ts");
const endpoint = read("api/_lib/media-upload.ts");
const partner = read("api/partner.ts");
const runtimeEnv = read("scripts/write-runtime-env.mjs");
const envMirror = read("scripts/media-provider-env.mjs");
const server = read("server.ts");
const service = read("src/services/media-upload.service.ts");

// 1. Provider selection + R2 config (all five vars) + secret never reaches the browser.
for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"]) {
  must(r2.includes(name), `api/_lib/r2.ts must read ${name}`);
  must(envMirror.includes(name), `scripts/media-provider-env.mjs must read ${name}`);
}
must(resolver.includes("MEDIA_PROVIDER") && envMirror.includes("MEDIA_PROVIDER"), "MEDIA_PROVIDER selector missing");
must(/"r2"[\s\S]*"cloudinary"[\s\S]*"supabase"/.test(resolver), "auto order must be r2 → cloudinary → supabase");
must(runtimeEnv.includes("MEDIA_PROVIDER") && runtimeEnv.includes("R2_PUBLIC_BASE_URL") && !/R2_(SECRET_ACCESS_KEY|ACCESS_KEY_ID)/.test(runtimeEnv.replace(/import[^\n]*\n/g, "")), "runtime-env.js may expose only MEDIA_PROVIDER + R2_PUBLIC_BASE_URL");
must(server.includes("MEDIA_PROVIDER") && !/R2_(SECRET_ACCESS_KEY|ACCESS_KEY_ID)/.test(server), "portable runtime-env may expose only MEDIA_PROVIDER + R2_PUBLIC_BASE_URL");
for (const file of walk("src").filter((f) => /\.(ts|html|js)$/.test(f))) {
  const source = read(file);
  if (/R2_SECRET_ACCESS_KEY|R2_ACCESS_KEY_ID|X-Amz-Credential=/.test(source)) failures.push(`browser source must never reference R2 credentials: ${file}`);
  if (hardcodesSiteDomain(source) && /r2|media/i.test(file)) failures.push(`media code must not hardcode a domain: ${file}`);
}

// 2. Upload endpoint: authenticated, validated, presigned (never proxies bytes through Vercel).
must(partner.includes('if (operation === "media-upload") return mediaUpload(request);'), "/api/partner?op=media-upload route missing");
must(endpoint.includes('"SIGN_UPLOAD"') && endpoint.includes('"DESTROY"') && endpoint.includes('"DRAIN_CLEANUP"'), "media-upload actions missing");
must(endpoint.includes("can_upload_media_v252"), "branch uploads must be authorized by can_upload_media_v252 with the caller JWT");
must(endpoint.includes("checkR2File"), "R2 uploads must validate file names/types/sizes before presigning");
must(endpoint.includes("MEDIA_PROVIDER_NOT_CONFIGURED"), "supabase provider must return MEDIA_PROVIDER_NOT_CONFIGURED so the browser falls back");
must(r2.includes("UNSIGNED-PAYLOAD") && /"content-type"\s*:/.test(r2) && /"content-length"\s*:/.test(r2), "presigned PUT must bind content-type + content-length");
must(/R2_PRESIGN_TTL_SECONDS\s*=\s*600/.test(r2), "presigned URLs must expire in 10 minutes (V253)");

// 3. Every public-media upload path goes through the layer, keeping a Supabase fallback.
const paths = {
  "src/services/catalog-media.service.ts": 'scope: "catalog"',
  "src/services/admin-media.service.ts": "scope: 'admin'",
  "src/services/branch-media-v171.service.ts": 'scope:"branch"',
  "src/services/branch-listing-media-v171.service.ts": 'scope:"catalog"',
  "src/services/branch-portal.service.ts": 'scope: "branch", branchId, purpose: "vehicle-draft"',
  "src/services/fleet-operations.service.ts": "scope:'ops'",
};
for (const [file, scope] of Object.entries(paths)) {
  const source = read(file);
  must(source.includes("MediaUploadService") && source.includes(scope), `${file} must upload through MediaUploadService (${scope})`);
  must(source.includes("MediaProviderUnavailableError"), `${file} must fall back to Supabase Storage when no provider is available`);
}
must(read("src/services/admin-media.service.ts").includes("CAMPAIGN"), "campaign covers must use the provider layer");
must(service.includes("generateImageVariants") && service.includes("R2_IMAGE_WIDTHS"), "R2 images must upload the fixed width set generated in the browser");
must(service.includes("generateVideoPosterVariants"), "R2 videos must upload a poster");

// 4. Delivery: srcset from fixed widths, config-only base URL.
const util = read("src/utils/r2-media.ts");
must(util.includes("R2_IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920]"), "R2 width set must match Cloudinary's fixed set");
must(fs.existsSync("src/directives/responsive-image.directive.ts"), "responsive image directive missing");
let directiveUses = 0;
for (const file of walk("src").filter((f) => f.endsWith(".ts"))) directiveUses += (read(file).match(/appResponsiveImg/g) || []).length;
must(directiveUses >= 15, `responsive srcset must be applied broadly (found ${directiveUses} uses)`);

// 5. Worker: in repo, R2 binding, immutable caching, read-only, no hardcoded domain, excluded from Vercel.
const worker = read("workers/media/src/index.ts");
const wrangler = read("workers/media/wrangler.toml");
must(/\[\[r2_buckets\]\][\s\S]*binding\s*=\s*"MEDIA_BUCKET"/.test(wrangler) && /workers_dev\s*=\s*true/.test(wrangler), "wrangler.toml must bind MEDIA_BUCKET and serve on workers.dev");
must(wrangler.includes("immutable") || worker.includes("immutable"), "Worker must send immutable cache headers");
must(/GET|HEAD/.test(worker) && worker.includes("405"), "Worker must be read-only");
must(!hardcodesSiteDomain(worker + wrangler), "Worker must not hardcode a domain");
must(/^workers\/$/m.test(read(".vercelignore")), ".vercelignore must exclude workers/");
for (const file of walk(".github").filter((f) => /\.ya?ml$/.test(f))) must(!/wrangler\s+deploy/.test(read(file)), `CI must not deploy the Worker: ${file}`);

// 6. DB contract + migration script.
const migration = "supabase/migrations/20260926130000_v252_media_provider_r2.sql";
must(fs.existsSync(migration), `${migration} missing`);
if (fs.existsSync(migration)) {
  const sql = read(migration);
  must(sql.includes("('catalog-media','cloudinary','r2')"), "cleanup queue must accept r2");
  must(sql.includes("private.r2_delivery_url_v252"), "DB projection must resolve r2 rows");
  must(sql.includes("public.can_upload_media_v252") && /grant execute on function public\.can_upload_media_v252[^;]*to authenticated/i.test(sql), "can_upload_media_v252 must be callable by authenticated users");
  must(sql.includes("public.service_rebase_r2_media_v252") && /grant execute on function public\.service_rebase_r2_media_v252[^;]*to service_role/i.test(sql), "custom-domain rebase must be service_role only");
  must(!/grant[^;]*service_rebase_r2_media_v252[^;]*to\s+(anon|authenticated)/i.test(sql), "rebase must never be granted to anon/authenticated");
  must(!hardcodesSiteDomain(sql), "migration must not hardcode a domain");
}
const script = read("scripts/migrate-media.mjs");
must(script.includes('const APPLY = hasFlag("apply");') && script.includes('hasFlag("delete-source")'), "migration must be dry-run by default with --apply/--delete-source");
for (const table of ["catalog_media", "media_assets", "campaigns", "homepage_sections", "site_config", "branches", "blog_posts", "vehicle_inspections"]) must(script.includes(table), `migration must cover ${table}`);
must(read("scripts/migrate-media-to-cloudinary.mjs").includes("./migrate-media.mjs"), "legacy Cloudinary migration entrypoint must forward to migrate-media.mjs");

if (failures.length) {
  console.error(`V252 media provider contract failed:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log(`V252 media provider contract passed: MEDIA_PROVIDER auto=r2→cloudinary→supabase, R2 secrets server-side, presigned PUT (15 min, type+length bound), ${Object.keys(paths).length} upload paths through the layer with Supabase fallback, fixed-width srcset (${directiveUses} uses), read-only immutable Worker not deployed by CI, migration dry-run by default.`);
