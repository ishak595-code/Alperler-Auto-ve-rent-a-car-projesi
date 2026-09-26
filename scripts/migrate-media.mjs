#!/usr/bin/env node
/**
 * V252 one-time media migration: Supabase Storage → the ACTIVE media provider
 * (Cloudflare R2 preferred, Cloudinary otherwise). Supersedes migrate-media-to-cloudinary.mjs,
 * which now forwards here with --provider=cloudinary.
 *
 * ⚠️  RUN ONLY AFTER THE SUPABASE QUOTA RESETS (the project answers HTTP 402 until ~2026-10-18)
 *     and after the provider's DB migration is applied (V249 for Cloudinary, V252 for R2).
 *     Every source file is downloaded once from Supabase Storage (one-time egress ≈ bucket size,
 *     ~45 MB today), so large runs can be split with --limit.
 *
 * Coverage (everything that can hold a Supabase Storage URL or object path):
 *   1. catalog_media rows in 'catalog-media' — vehicles, tours, blog AND branch rows
 *      → storage_bucket='r2'|'cloudinary', object_path=<key stem>, metadata.<provider>, poster_url.
 *      DB triggers re-project vehicles/tours images+cover and branches.hero_image.
 *   2. media_assets rows in 'catalog-media' (site/homepage/campaign admin uploads)
 *      → bucket + object_path + metadata.publicUrl.
 *   3. URL references rewritten in place: campaigns.cover_image, homepage_sections.settings,
 *      site_config.value, branches.hero_image, blog_posts.cover_image, vehicle_inspections.photo_paths,
 *      vehicles/tours images+cover_image (legacy non-projected values). Absolute
 *      …/storage/v1/object/public/<bucket>/<path> URLs and relative /catalog-media/<path> paths.
 *      Objects referenced only by URL (no row) are migrated as standalone admin assets.
 *   Private buckets (customer-documents, partner-uploads) and customer avatars are NOT touched.
 *
 * R2 layout per object (same as browser uploads): <stem>/w480.webp … w1920.webp (+ orig.<ext>,
 * or video.<ext> with poster variants). Needs `sharp` for resizing: npm i --no-save sharp
 * (and ffmpeg on PATH for video posters when a row has no poster_url; otherwise a neutral poster).
 *
 * Usage:
 *   node scripts/migrate-media.mjs                                   # dry-run (default): full plan, no writes
 *   node scripts/migrate-media.mjs --apply --limit=25                # migrate a batch (rows per phase)
 *   node scripts/migrate-media.mjs --apply --delete-source           # also delete unreferenced Supabase copies
 *   node scripts/migrate-media.mjs --rollback=media-migration-<ts>.json --apply
 *
 * Flags:
 *   --apply                 write changes (default: dry-run, read-only)
 *   --delete-source         after verification delete Supabase copies no longer referenced (irreversible)
 *   --provider=r2|cloudinary  override the provider resolved from env (MEDIA_PROVIDER + env presence)
 *   --only=catalog,assets,urls  run selected phases (default all)
 *   --limit=N               max rows per phase (default 50)
 *   --sleep-ms=N            pause between uploads (default 200)
 *   --report=path.json      report file (default media-migration-<timestamp>.json)
 *   --rollback=file.json    revert rows/URLs from a report (entries whose source was NOT deleted)
 *
 * Env: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY, plus the target provider's variables:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 *   or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveMediaProviderFromEnv } from "./media-provider-env.mjs";
import { awsEncode, signR2Request } from "./r2-sigv4.mjs";

const WIDTHS = [480, 768, 1080, 1440, 1920];
const SOURCE_BUCKETS = ["catalog-media", "vehicle-media", "tour-media"];

function argValue(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const APPLY = hasFlag("apply");
const DELETE_SOURCE = hasFlag("delete-source");
const LIMIT = Math.max(1, Number(argValue("limit", "50")) || 50);
const SLEEP_MS = Math.max(0, Number(argValue("sleep-ms", "200")) || 0);
const ONLY = new Set(String(argValue("only", "catalog,assets,urls")).split(",").map((v) => v.trim()).filter(Boolean));
const ROLLBACK = String(argValue("rollback", "") || "");
const REPORT = String(argValue("report", `media-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));

const PROJECT_URL = String(process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL || "https://hrztrgjvgdnaurejnsgs.supabase.co").replace(/\/$/, "");
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const STORAGE_PUBLIC = `${PROJECT_URL}/storage/v1/object/public/`;
const resolved = resolveMediaProviderFromEnv(process.env);
const PROVIDER = String(argValue("provider", resolved.provider)).toLowerCase();

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!SERVICE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is required.");
if (!["r2", "cloudinary"].includes(PROVIDER)) fail(`No target provider configured (resolved "${resolved.provider}"). Set the R2_* (preferred) or CLOUDINARY_* variables, or pass --provider.`);
if (DELETE_SOURCE && !APPLY) fail("--delete-source requires --apply.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const encodePath = (value) => String(value).split("/").map(encodeURIComponent).join("/");
const noDash = (id) => String(id).toLowerCase().replace(/-/g, "");
function segment(value, fallback) {
  const cleaned = String(value || "").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return cleaned || fallback;
}

// ---- Supabase (service role) -------------------------------------------------------------
function serviceHeaders(extra = {}) {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, accept: "application/json", "content-type": "application/json", ...extra };
}
async function supabase(pathname, init = {}) {
  const response = await fetch(`${PROJECT_URL}${pathname}`, { ...init, headers: serviceHeaders(init.headers || {}), signal: AbortSignal.timeout(60_000) });
  if (response.status === 402) fail("Supabase answered 402 (quota / payment required). Wait for the quota reset (~2026-10-18) and re-run.");
  return response;
}
async function selectAll(table, query) {
  const response = await supabase(`/rest/v1/${table}?${query}`);
  if (!response.ok) fail(`Could not read ${table} (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`);
  return response.json();
}
async function patch(table, filter, body) {
  const response = await supabase(`/rest/v1/${table}?${filter}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`DB_UPDATE_${table}_${response.status}: ${(await response.text()).slice(0, 300)}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`DB_UPDATE_${table}_NO_ROW (changed concurrently?)`);
  return rows[0];
}
async function download(bucket, objectPath) {
  const response = await fetch(`${STORAGE_PUBLIC}${bucket}/${encodePath(objectPath)}`, { signal: AbortSignal.timeout(300_000) });
  if (response.status === 402) fail("Supabase Storage answered 402 — wait for the quota reset.");
  if (!response.ok) throw new Error(`SOURCE_DOWNLOAD_${response.status}`);
  return { bytes: Buffer.from(await response.arrayBuffer()), contentType: String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() };
}
async function downloadUrl(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`POSTER_DOWNLOAD_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// ---- Targets -------------------------------------------------------------------------------
const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm" };
function typeFromPath(objectPath) {
  const ext = String(objectPath).split(".").pop().toLowerCase();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", mov: "video/mp4" }[ext] || "";
}

function r2Target() {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim().toLowerCase();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = String(process.env.R2_BUCKET || "").trim();
  const base = String(process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!/^[a-f0-9]{32}$/.test(accountId) || !accessKeyId || !secretAccessKey || !bucket || !/^https:\/\//.test(base)) {
    fail("R2 target needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL.");
  }
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  let sharpModule = null;
  async function sharp() {
    if (!sharpModule) {
      try { sharpModule = (await import("sharp")).default; } catch { fail("R2 migration needs sharp for the fixed WebP widths: run `npm i --no-save sharp` and retry."); }
    }
    return sharpModule;
  }
  async function put(key, bytes, contentType) {
    const url = new URL(`${endpoint}/${bucket}/${awsEncode(key, true)}`);
    const headers = signR2Request({ method: "PUT", url, accessKeyId, secretAccessKey, payloadHash: sha(bytes), extraHeaders: { "content-type": contentType } });
    const response = await fetch(url, { method: "PUT", headers, body: bytes, signal: AbortSignal.timeout(300_000) });
    if (!response.ok) throw new Error(`R2_PUT_${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  async function head(key) {
    const url = new URL(`${endpoint}/${bucket}/${awsEncode(key, true)}`);
    const response = await fetch(url, { method: "HEAD", headers: signR2Request({ method: "HEAD", url, accessKeyId, secretAccessKey }), signal: AbortSignal.timeout(30_000) });
    return response.ok && Number(response.headers.get("content-length") || 0) > 0;
  }
  async function variants(stem, imageBytes) {
    const s = await sharp();
    const meta = await s(imageBytes).rotate().metadata();
    const width = Number(meta.width || 0);
    const height = Number(meta.height || 0);
    for (const w of WIDTHS) {
      const out = await s(imageBytes).rotate().resize({ width: Math.max(1, Math.min(w, width || w)), withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      await put(`${stem}/w${w}.webp`, out, "image/webp");
    }
    return { width, height };
  }
  async function posterBytes(videoBytes, posterUrl) {
    if (posterUrl) {
      try { return await downloadUrl(posterUrl); } catch (error) { console.warn(`   ! poster download failed (${error.message}); extracting a frame`); }
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-poster-"));
    try {
      const input = path.join(dir, "in.bin");
      const output = path.join(dir, "poster.jpg");
      fs.writeFileSync(input, videoBytes);
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", "1", "-i", input, "-frames:v", "1", "-q:v", "3", output], { timeout: 120_000 });
      return fs.readFileSync(output);
    } catch {
      console.warn("   ! ffmpeg frame extraction unavailable — neutral poster used");
      const s = await sharp();
      return s({ create: { width: 1920, height: 1080, channels: 3, background: "#0f172a" } }).jpeg().toBuffer();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return {
    name: "r2",
    bucket: "r2",
    plannedUrl: (stem, kind, ext = "mp4") => kind === "VIDEO" ? `${base}/${stem}/video.${ext}` : `${base}/${stem}/w1440.webp`,
    async upload(stem, source, kind, { posterUrl } = {}) {
      const contentType = source.contentType && EXT_BY_TYPE[source.contentType] ? source.contentType : source.fallbackType;
      const ext = EXT_BY_TYPE[contentType];
      if (!ext) throw new Error(`UNSUPPORTED_SOURCE_TYPE_${contentType || "unknown"}`);
      let size;
      if (kind === "VIDEO") {
        await put(`${stem}/video.${ext}`, source.bytes, contentType);
        size = await variants(stem, await posterBytes(source.bytes, posterUrl));
      } else {
        size = await variants(stem, source.bytes);
        await put(`${stem}/orig.${ext}`, source.bytes, contentType);
      }
      const names = [...WIDTHS.map((w) => `w${w}.webp`), kind === "VIDEO" ? `video.${ext}` : `orig.${ext}`];
      for (const name of names) if (!(await head(`${stem}/${name}`))) throw new Error(`R2_VERIFY_FAILED_${name}`);
      return {
        url: kind === "VIDEO" ? `${base}/${stem}/video.${ext}` : `${base}/${stem}/w1440.webp`,
        posterUrl: kind === "VIDEO" ? `${base}/${stem}/w1440.webp` : null,
        metadata: { storageProvider: "r2", r2: { publicBaseUrl: base, widths: WIDTHS, variantExt: "webp", origExt: kind === "VIDEO" ? null : ext, videoExt: kind === "VIDEO" ? ext : null, width: size.width, height: size.height, bytes: source.bytes.length } },
      };
    },
  };
}

function cloudinaryTarget() {
  const cloud = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cloud) || !apiKey || !apiSecret) fail("Cloudinary target needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
  const sign = (params) => sha(`${Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&")}${apiSecret}`);
  const deliveryUrl = (publicId, kind) => kind === "VIDEO"
    ? `https://res.cloudinary.com/${cloud}/video/upload/q_auto,vc_auto/${publicId}.mp4`
    : `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_1440/${publicId}`;
  return {
    name: "cloudinary",
    bucket: "cloudinary",
    plannedUrl: (stem, kind) => deliveryUrl(stem, kind),
    async upload(stem, source, kind) {
      const resourceType = kind === "VIDEO" ? "video" : "image";
      const timestamp = Math.floor(Date.now() / 1000);
      const form = new FormData();
      form.append("file", new Blob([source.bytes], { type: source.contentType || source.fallbackType }));
      form.append("overwrite", "true");
      form.append("public_id", stem);
      form.append("timestamp", String(timestamp));
      form.append("api_key", apiKey);
      form.append("signature", sign({ overwrite: "true", public_id: stem, timestamp }));
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(300_000) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.public_id !== stem) throw new Error(`CLOUDINARY_UPLOAD_${response.status}: ${payload?.error?.message || ""}`.slice(0, 300));
      return {
        url: deliveryUrl(stem, kind),
        posterUrl: kind === "VIDEO" ? `https://res.cloudinary.com/${cloud}/video/upload/so_0,f_auto,q_auto,w_1080/${stem}.jpg` : null,
        metadata: { storageProvider: "cloudinary", cloudinary: { cloudName: cloud, resourceType, version: payload.version ?? null, format: payload.format ?? null, bytes: payload.bytes ?? null, width: payload.width ?? null, height: payload.height ?? null, duration: payload.duration ?? null } },
      };
    },
  };
}

const target = PROVIDER === "r2" ? r2Target() : cloudinaryTarget();

// ---- Plan helpers --------------------------------------------------------------------------
function ownerStem(row) {
  if (row.vehicle_id) return `alperler/catalog/vehicle/${String(row.vehicle_id).toLowerCase()}`;
  if (row.tour_id) return `alperler/catalog/tour/${String(row.tour_id).toLowerCase()}`;
  if (row.blog_post_id) return `alperler/catalog/blog/${String(row.blog_post_id).toLowerCase()}`;
  if (row.branch_id) return `alperler/branch/${String(row.branch_id).toLowerCase()}`;
  return "";
}

const URL_PATTERN = new RegExp(`(?:${PROJECT_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/storage/v1/object/public/(${SOURCE_BUCKETS.join("|")})/|(?<![A-Za-z0-9])/(catalog-media)/)([^"'\\s?#)]+)`, "g");

/** Every (bucket, path) referenced by a string/JSON value. */
function referencesIn(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  const found = [];
  for (const match of text.matchAll(URL_PATTERN)) found.push({ bucket: match[1] || match[2], objectPath: decodeURIComponent(match[3]), raw: match[0] });
  return found;
}
function replaceIn(value, mapping) {
  const swap = (text) => text.replace(URL_PATTERN, (raw, b1, b2, p) => mapping.get(`${b1 || b2}/${decodeURIComponent(p)}`) || raw);
  if (typeof value === "string") return swap(value);
  return JSON.parse(swap(JSON.stringify(value ?? null)));
}

const report = { createdAt: new Date().toISOString(), provider: PROVIDER, apply: APPLY, deleteSource: DELETE_SOURCE, entries: [] };
const mapping = new Map(); // "bucket/path" → new URL
const migratedSources = new Map(); // "bucket/path" → { bucket, objectPath }
let failures = 0;

async function migrateObject(label, stem, bucket, objectPath, kind, options = {}) {
  const planned = target.plannedUrl(stem, kind, String(objectPath).split(".").pop());
  console.log(` • ${label}: ${bucket}/${objectPath} → ${target.bucket}:${stem}`);
  if (!APPLY) return { url: planned, posterUrl: null, metadata: null, planned: true };
  const source = await download(bucket, objectPath);
  source.fallbackType = typeFromPath(objectPath);
  const result = await target.upload(stem, source, kind, options);
  if (SLEEP_MS) await sleep(SLEEP_MS);
  return result;
}

// ---- Phase 1: catalog_media ----------------------------------------------------------------
async function phaseCatalog() {
  const rows = await selectAll("catalog_media", `storage_bucket=eq.catalog-media&object_path=not.is.null&external_url=is.null&select=id,vehicle_id,tour_id,blog_post_id,branch_id,kind,object_path,poster_url,metadata&order=created_at.asc&limit=${LIMIT}`);
  console.log(`\n[1] catalog_media rows on Supabase Storage: ${rows.length} (limit ${LIMIT})`);
  for (const row of rows) {
    const owner = ownerStem(row);
    const entry = { type: "row", table: "catalog_media", id: row.id, source: { bucket: "catalog-media", objectPath: row.object_path }, status: "PLANNED" };
    report.entries.push(entry);
    if (!owner) { entry.status = "SKIPPED_NO_OWNER"; continue; }
    const stem = `${owner}/${noDash(row.id)}`;
    try {
      const posterIsStorage = !row.poster_url || referencesIn(row.poster_url).length > 0;
      const result = await migrateObject(`${row.kind} ${row.id}`, stem, "catalog-media", row.object_path, row.kind, { posterUrl: row.poster_url && posterIsStorage ? row.poster_url : null });
      entry.stem = stem;
      entry.url = result.url;
      mapping.set(`catalog-media/${row.object_path}`, row.kind === "VIDEO" ? (result.posterUrl || result.url) : result.url);
      if (!APPLY) continue;
      entry.before = { storage_bucket: "catalog-media", object_path: row.object_path, metadata: row.metadata, poster_url: row.poster_url };
      const metadata = { ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}), ...result.metadata, migratedFrom: { bucket: "catalog-media", path: row.object_path, migratedAt: new Date().toISOString(), tool: "migrate-media.mjs" } };
      const body = { storage_bucket: target.bucket, object_path: stem, metadata };
      if (row.kind === "VIDEO" && posterIsStorage && result.posterUrl) body.poster_url = result.posterUrl;
      const updated = await patch("catalog_media", `id=eq.${encodeURIComponent(row.id)}&storage_bucket=eq.catalog-media`, body);
      if (updated.storage_bucket !== target.bucket || updated.object_path !== stem) throw new Error("DB_VERIFY_FAILED");
      entry.status = "MIGRATED";
      migratedSources.set(`catalog-media/${row.object_path}`, entry.source);
      console.log("   ✔ migrated");
    } catch (error) {
      entry.status = "FAILED";
      entry.error = error instanceof Error ? error.message : String(error);
      failures++;
      console.log(`   ✖ ${entry.error}`);
    }
  }
}

// ---- Phase 2: media_assets -----------------------------------------------------------------
async function phaseAssets() {
  const rows = await selectAll("media_assets", `bucket=eq.catalog-media&select=id,bucket,object_path,media_type,entity_type,entity_id,metadata&order=created_at.asc&limit=${LIMIT}`);
  console.log(`\n[2] media_assets rows on Supabase Storage: ${rows.length} (limit ${LIMIT})`);
  for (const row of rows) {
    const entry = { type: "row", table: "media_assets", id: row.id, source: { bucket: "catalog-media", objectPath: row.object_path }, status: "PLANNED" };
    report.entries.push(entry);
    const purpose = row.metadata && typeof row.metadata === "object" ? row.metadata.purpose : "";
    const stem = `alperler/admin/${segment(row.entity_type, "content")}/${segment(row.entity_id, "draft")}/${segment(purpose, "image")}/${noDash(row.id)}`;
    try {
      const result = await migrateObject(`asset ${row.id}`, stem, "catalog-media", row.object_path, "IMAGE");
      entry.stem = stem;
      entry.url = result.url;
      mapping.set(`catalog-media/${row.object_path}`, result.url);
      if (!APPLY) continue;
      entry.before = { bucket: "catalog-media", object_path: row.object_path, metadata: row.metadata };
      const metadata = { ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}), ...result.metadata, publicUrl: result.url, migratedFrom: { bucket: "catalog-media", path: row.object_path, migratedAt: new Date().toISOString(), tool: "migrate-media.mjs" } };
      await patch("media_assets", `id=eq.${encodeURIComponent(row.id)}&bucket=eq.catalog-media`, { bucket: target.bucket, object_path: stem, metadata });
      entry.status = "MIGRATED";
      migratedSources.set(`catalog-media/${row.object_path}`, entry.source);
      console.log("   ✔ migrated");
    } catch (error) {
      entry.status = "FAILED";
      entry.error = error instanceof Error ? error.message : String(error);
      failures++;
      console.log(`   ✖ ${entry.error}`);
    }
  }
}

// ---- Phase 3: URL references ---------------------------------------------------------------
const URL_COLUMNS = [
  { table: "campaigns", key: "id", columns: ["cover_image"] },
  { table: "homepage_sections", key: "id", columns: ["settings"] },
  { table: "site_config", key: "key", columns: ["value"] },
  { table: "branches", key: "id", columns: ["hero_image"] },
  { table: "blog_posts", key: "id", columns: ["cover_image"] },
  { table: "vehicle_inspections", key: "id", columns: ["photo_paths"] },
  { table: "vehicles", key: "id", columns: ["images", "cover_image"] },
  { table: "tours", key: "id", columns: ["images", "cover_image"] },
];

async function scanReferences() {
  const hits = [];
  for (const spec of URL_COLUMNS) {
    const rows = await selectAll(spec.table, `select=${spec.key},${spec.columns.join(",")}&limit=5000`);
    for (const row of rows) for (const column of spec.columns) {
      const refs = referencesIn(row[column]);
      if (refs.length) hits.push({ ...spec, keyValue: row[spec.key], column, value: row[column], refs });
    }
  }
  return hits;
}

async function phaseUrls() {
  const hits = await scanReferences();
  console.log(`\n[3] columns still holding Supabase Storage URLs: ${hits.length}`);
  // Objects referenced only by URL (no catalog_media/media_assets row) → standalone admin assets.
  for (const hit of hits) for (const ref of hit.refs) {
    const key = `${ref.bucket}/${ref.objectPath}`;
    if (mapping.has(key)) continue;
    const owned = await selectAll("catalog_media", `storage_bucket=eq.${encodeURIComponent(ref.bucket)}&object_path=eq.${encodeURIComponent(ref.objectPath)}&select=id&limit=1`);
    if (owned.length) { console.log(` - ${key}: owned by catalog_media ${owned[0].id} (migrate phase 1 first / raise --limit)`); continue; }
    const type = typeFromPath(ref.objectPath);
    if (!type.startsWith("image/")) { console.log(` - ${key}: not an image, left in place`); continue; }
    const stem = `alperler/admin/legacy/${segment(hit.table, "table")}/${segment(hit.column, "column")}/${sha(key).slice(0, 32)}`;
    const entry = { type: "object", table: hit.table, source: { bucket: ref.bucket, objectPath: ref.objectPath }, stem, status: "PLANNED" };
    report.entries.push(entry);
    try {
      const result = await migrateObject(`url-only ${hit.table}.${hit.column}`, stem, ref.bucket, ref.objectPath, "IMAGE");
      mapping.set(key, result.url);
      entry.url = result.url;
      if (APPLY) { entry.status = "MIGRATED"; migratedSources.set(key, entry.source); }
    } catch (error) {
      entry.status = "FAILED";
      entry.error = error instanceof Error ? error.message : String(error);
      failures++;
      console.log(`   ✖ ${entry.error}`);
    }
  }
  for (const hit of hits) {
    const next = replaceIn(hit.value, mapping);
    if (JSON.stringify(next) === JSON.stringify(hit.value)) continue;
    const entry = { type: "url", table: hit.table, key: hit.key, keyValue: hit.keyValue, column: hit.column, before: hit.value, after: next, sources: hit.refs.map((r) => ({ bucket: r.bucket, objectPath: r.objectPath })), status: "PLANNED" };
    report.entries.push(entry);
    console.log(` • ${hit.table}.${hit.column} [${hit.keyValue}]: ${hit.refs.length} URL(s) → ${target.bucket}`);
    if (!APPLY) continue;
    try {
      await patch(hit.table, `${hit.key}=eq.${encodeURIComponent(hit.keyValue)}`, { [hit.column]: next });
      entry.status = "REWRITTEN";
    } catch (error) {
      entry.status = "FAILED";
      entry.error = error instanceof Error ? error.message : String(error);
      failures++;
      console.log(`   ✖ ${entry.error}`);
    }
  }
}

// ---- Delete source ---------------------------------------------------------------------------
async function deleteSources() {
  const remaining = await scanReferences();
  const stillReferenced = new Set(remaining.flatMap((hit) => hit.refs.map((r) => `${r.bucket}/${r.objectPath}`)));
  console.log(`\n[4] delete-source candidates: ${migratedSources.size}`);
  for (const [key, source] of migratedSources) {
    const [media, assets] = await Promise.all([
      selectAll("catalog_media", `storage_bucket=eq.${encodeURIComponent(source.bucket)}&object_path=eq.${encodeURIComponent(source.objectPath)}&select=id&limit=1`),
      selectAll("media_assets", `bucket=eq.${encodeURIComponent(source.bucket)}&object_path=eq.${encodeURIComponent(source.objectPath)}&select=id&limit=1`),
    ]);
    const entries = report.entries.filter((e) => e.source && `${e.source.bucket}/${e.source.objectPath}` === key);
    if (media.length || assets.length || stillReferenced.has(key)) {
      entries.forEach((e) => { e.sourceDeleteSkipped = "STILL_REFERENCED"; });
      console.log(` - keep ${key} (still referenced)`);
      continue;
    }
    const response = await supabase(`/storage/v1/object/${encodeURIComponent(source.bucket)}`, { method: "DELETE", body: JSON.stringify({ prefixes: [source.objectPath] }) });
    if (!response.ok && response.status !== 404) { console.log(` ✖ delete ${key}: HTTP ${response.status}`); continue; }
    entries.forEach((e) => { e.sourceDeleted = true; });
    console.log(` ✔ deleted ${key}`);
  }
}

// ---- Rollback ------------------------------------------------------------------------------
async function rollback(file) {
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  const deleted = new Set((saved.entries || []).filter((e) => e.sourceDeleted && e.source).map((e) => `${e.source.bucket}/${e.source.objectPath}`));
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allowedTables = new Set(URL_COLUMNS.map((c) => c.table));
  const entries = (saved.entries || []).slice().reverse();
  console.log(`Rollback from ${file}${APPLY ? "" : " (dry-run)"}`);
  for (const entry of entries) {
    if (entry.type === "url" && entry.status === "REWRITTEN") {
      const spec = URL_COLUMNS.find((c) => c.table === entry.table && c.columns.includes(entry.column) && c.key === entry.key);
      if (!spec || !allowedTables.has(entry.table)) continue;
      if ((entry.sources || []).some((s) => deleted.has(`${s.bucket}/${s.objectPath}`))) { console.log(` - ${entry.table}.${entry.column} [${entry.keyValue}]: source deleted, cannot restore`); continue; }
      console.log(` ↺ ${entry.table}.${entry.column} [${entry.keyValue}]`);
      if (APPLY) await patch(entry.table, `${entry.key}=eq.${encodeURIComponent(entry.keyValue)}`, { [entry.column]: entry.before }).catch((e) => console.log(`   ✖ ${e.message}`));
    }
    if (entry.type === "row" && entry.status === "MIGRATED" && entry.before && UUID.test(String(entry.id))) {
      if (entry.sourceDeleted) { console.log(` - ${entry.table} ${entry.id}: source deleted, cannot restore`); continue; }
      console.log(` ↺ ${entry.table} ${entry.id} → catalog-media/${entry.source.objectPath}`);
      if (!APPLY) continue;
      const bucketColumn = entry.table === "catalog_media" ? "storage_bucket" : "bucket";
      await patch(entry.table, `id=eq.${encodeURIComponent(entry.id)}&${bucketColumn}=eq.${encodeURIComponent(saved.provider)}`, entry.before).catch((e) => console.log(`   ✖ ${e.message}`));
    }
  }
}

async function main() {
  if (ROLLBACK) return rollback(ROLLBACK);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}${DELETE_SOURCE ? " + DELETE-SOURCE" : ""} · target: ${PROVIDER} · phases: ${[...ONLY].join(",")}`);
  if (ONLY.has("catalog")) await phaseCatalog();
  if (ONLY.has("assets")) await phaseAssets();
  if (ONLY.has("urls")) await phaseUrls();
  if (APPLY && DELETE_SOURCE) await deleteSources();
  if (APPLY) {
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(`\nReport (keep it for --rollback): ${REPORT}`);
  }
  const count = (status) => report.entries.filter((e) => e.status === status).length;
  console.log(`\nDone. migrated=${count("MIGRATED")} rewritten=${count("REWRITTEN")} failed=${failures} planned=${count("PLANNED")}${APPLY ? "" : " (dry-run: nothing was changed)"}`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
