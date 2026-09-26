#!/usr/bin/env node
// V253 guard: egress + upload abuse protections stay in place.
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const failures = [];
const must = (ok, message) => { if (!ok) failures.push(message); };

const upload = read("api/_lib/media-upload.ts");
const guard = read("api/_lib/media-upload-guard.ts");
const migration = read("supabase/migrations/20260926143000_v253_media_upload_guard.sql");
const worker = read("workers/media/src/index.ts");
const policy = read("workers/media/src/policy.ts");
const toml = read("workers/media/wrangler.toml");
const realtime = read("src/services/public-content-realtime.service.ts");
const catalog = read("api/catalog.ts");
const branches = read("api/branches.ts");
const network = read("api/branch-network.ts");
const migrate = read("scripts/migrate-media.mjs");

must(/reserveUpload\(/.test(upload) && upload.indexOf("reserveUpload(") < upload.indexOf("return reply(request, { ok: true, ...signed })"), "SIGN_UPLOAD must reserve quota before releasing upload URLs");
must(/MEDIA_GUARD_UNAVAILABLE/.test(guard) && /status: 503/.test(guard), "upload guard must fail closed");
must(/10_000_000_000/.test(guard), "storage limit must be capped at the 10 GB free tier");
must(/media_upload_reserve_v253/.test(migration) && /from public, anon, authenticated/.test(migration) && /to service_role/.test(migration), "guard RPCs must be service_role only");
must(/pg_advisory_xact_lock/.test(migration), "reservations must be serialised per user");
must(/MEDIA_RATE_LIMITER/.test(toml) && /\[\[ratelimits\]\]/.test(toml), "media Worker needs the rate-limit binding");
must(/ALLOWED_REFERER_HOSTS/.test(toml), "media Worker needs the hotlink allow-list");
must(/refererAllowed\(/.test(worker) && /rangeAcceptable\(/.test(worker) && /MEDIA_RATE_LIMITER/.test(worker), "media Worker must enforce referer, range and rate limits");
must(/if \(!referer[^)]*\) return true/.test(policy), "requests without a Referer (social previews, apps) must stay allowed");
must(!/(MEDIA|env\.\w+)\.(put|delete|createMultipartUpload)\(/.test(worker) && /405/.test(worker), "media Worker must stay read-only (no R2 writes, 405 for other methods)");
must(/REALTIME_PATH_PREFIXES/.test(realtime) && /realtimeAllowed\(\)/.test(realtime), "public pages must not open realtime sockets");
must(/PUBLIC_VEHICLE_COLUMNS/.test(catalog) && /PUBLIC_TOUR_COLUMNS/.test(catalog) && /PUBLIC_BRANCH_COLUMNS/.test(branches) && /BRANCH_COLUMNS/.test(network), "public API reads must select explicit columns");
must(!/is_active=eq\.true&public_status=eq\.ACTIVE&select=\*/.test(branches), "public branch directory must not select=*");
must(/--owners=/.test(migrate) && /\["tour"\]|'tour'|"tour"/.test(migrate), "media migration must default to tours only");

if (failures.length) {
  console.error(`V253 abuse guard failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("V253 abuse guards OK");
