#!/usr/bin/env node
/**
 * V249 one-time migration: Supabase Storage (catalog-media) → Cloudinary.
 *
 * ⚠️  RUN ONLY AFTER THE SUPABASE QUOTA RESETS (project currently answers HTTP 402 until
 *     ~2026-10-18) AND AFTER supabase/migrations/20260926110000_v249_cloudinary_media_hosting.sql
 *     HAS BEEN APPLIED. Cloudinary fetches every source file once from Supabase Storage
 *     (one-time egress ≈ total bucket size), so run in batches with --limit.
 *
 * What it does (per catalog_media row with storage_bucket='catalog-media'):
 *   1. Upload to Cloudinary by remote URL (signed, server-side; secret never leaves this shell)
 *      as public_id alperler/catalog/<vehicle|tour|blog>/<ownerId>/<rowId> (idempotent, overwrite).
 *   2. Verify the asset through the Cloudinary Admin API (exists, bytes > 0, same resource type).
 *   3. Update the row → storage_bucket='cloudinary', object_path=<public_id>,
 *      metadata.cloudinary={cloudName,resourceType,version,...}, metadata.migratedFrom={bucket,path}.
 *      DB triggers re-project vehicles/tours images & cover with Cloudinary URLs.
 *   4. Re-read the row to verify, and (only with --delete-source) delete the Supabase copy when no
 *      other catalog_media/media_assets row still references that object path.
 *   Branch hero media (branch_id rows) are skipped: the branch hero trigger is Storage-only.
 *
 * Usage:
 *   node scripts/migrate-media-to-cloudinary.mjs                    # dry-run (default), lists plan
 *   node scripts/migrate-media-to-cloudinary.mjs --apply --limit=25 # migrate a batch
 *   node scripts/migrate-media-to-cloudinary.mjs --apply --delete-source --limit=25
 *   node scripts/migrate-media-to-cloudinary.mjs --rollback=cloudinary-migration-<ts>.json --apply
 *
 * Flags:
 *   --apply              Write changes (default: dry-run, read-only)
 *   --delete-source      After verification, delete the Supabase Storage copy (irreversible)
 *   --limit=N            Max rows this run (default 50)
 *   --kind=IMAGE|VIDEO   Only one media kind
 *   --owner=vehicle|tour|blog
 *   --sleep-ms=N         Pause between rows (default 300)
 *   --report=path.json   Report file (default cloudinary-migration-<timestamp>.json)
 *   --rollback=file.json Revert migrated rows from a report (only rows whose source was NOT deleted)
 *
 * Env: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import "dotenv/config";
import { createHash } from "node:crypto";
import fs from "node:fs";

const SOURCE_BUCKET = "catalog-media";
const TARGET_BUCKET = "cloudinary";
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

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
const KIND = String(argValue("kind", "") || "").toUpperCase();
const OWNER = String(argValue("owner", "") || "").toLowerCase();
const SLEEP_MS = Math.max(0, Number(argValue("sleep-ms", "300")) || 300);
const ROLLBACK = String(argValue("rollback", "") || "");
const REPORT = String(argValue("report", `cloudinary-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));

const PROJECT_URL = String(process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL || "https://hrztrgjvgdnaurejnsgs.supabase.co").replace(/\/$/, "");
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const CLOUD = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const API_KEY = String(process.env.CLOUDINARY_API_KEY || "").trim();
const API_SECRET = String(process.env.CLOUDINARY_API_SECRET || "").trim();

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!SERVICE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY is required.");
if (!/^[A-Za-z0-9_-]{1,64}$/.test(CLOUD) || !API_KEY || !API_SECRET) fail("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required.");
if (KIND && !["IMAGE", "VIDEO"].includes(KIND)) fail("--kind must be IMAGE or VIDEO.");
if (OWNER && !["vehicle", "tour", "blog"].includes(OWNER)) fail("--owner must be vehicle, tour or blog.");
if (DELETE_SOURCE && !APPLY) fail("--delete-source requires --apply.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function serviceHeaders(extra = {}) {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, accept: "application/json", "content-type": "application/json", ...extra };
}

async function supabase(path, init = {}) {
  const response = await fetch(`${PROJECT_URL}${path}`, { ...init, headers: serviceHeaders(init.headers || {}), signal: AbortSignal.timeout(30_000) });
  if (response.status === 402) fail("Supabase answered 402 (quota / payment required). Wait for the quota reset (~2026-10-18) and re-run.");
  return response;
}

function sign(params) {
  const serialized = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]) !== "").sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha256").update(`${serialized}${API_SECRET}`).digest("hex");
}

function encodePath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function ownerOf(row) {
  if (row.vehicle_id) return { type: "vehicle", id: row.vehicle_id };
  if (row.tour_id) return { type: "tour", id: row.tour_id };
  if (row.blog_post_id) return { type: "blog", id: row.blog_post_id };
  return null;
}

function publicIdFor(row) {
  const owner = ownerOf(row);
  return owner ? `alperler/catalog/${owner.type}/${String(owner.id).toLowerCase()}/${String(row.id).toLowerCase()}` : "";
}

function resourceTypeFor(row) {
  return row.kind === "VIDEO" ? "video" : "image";
}

function deliveryUrl(publicId, resourceType) {
  return resourceType === "video"
    ? `https://res.cloudinary.com/${CLOUD}/video/upload/q_auto,vc_auto/${publicId}.mp4`
    : `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto,w_1440/${publicId}`;
}

async function assertMigrationApplied() {
  const response = await supabase("/rest/v1/media_cleanup_jobs_v198?select=resource_type&limit=1");
  if (!response.ok) fail(`V249 DB migration is not applied (media_cleanup_jobs_v198.resource_type missing, HTTP ${response.status}). Apply supabase/migrations/20260926110000_v249_cloudinary_media_hosting.sql first.`);
}

async function listRows() {
  const filters = [`storage_bucket=eq.${SOURCE_BUCKET}`, "object_path=not.is.null", "external_url=is.null", "branch_id=is.null"];
  if (KIND) filters.push(`kind=eq.${KIND}`);
  if (OWNER) filters.push(`${OWNER === "blog" ? "blog_post" : OWNER}_id=not.is.null`);
  const select = "id,vehicle_id,tour_id,blog_post_id,branch_id,kind,storage_bucket,object_path,metadata,is_active";
  const response = await supabase(`/rest/v1/catalog_media?${filters.join("&")}&select=${select}&order=created_at.asc&limit=${LIMIT}`);
  if (!response.ok) fail(`Could not list catalog_media (HTTP ${response.status}): ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

async function uploadRemote(row, publicId, resourceType) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { overwrite: "true", public_id: publicId, timestamp };
  const form = new URLSearchParams({
    file: `${PROJECT_URL}/storage/v1/object/public/${SOURCE_BUCKET}/${encodePath(row.object_path)}`,
    overwrite: "true",
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: API_KEY,
    signature: sign(signed),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`CLOUDINARY_UPLOAD_${response.status}: ${payload?.error?.message || ""}`.slice(0, 300));
  if (payload.public_id !== publicId) throw new Error("CLOUDINARY_PUBLIC_ID_MISMATCH");
  return payload;
}

async function verifyCloudinary(publicId, resourceType) {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/${resourceType}/upload/${encodePath(publicId)}`, {
    headers: { authorization: `Basic ${auth}` },
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.public_id !== publicId || !(Number(payload.bytes) > 0)) throw new Error(`CLOUDINARY_VERIFY_FAILED_${response.status}`);
  return payload;
}

async function updateRow(row, publicId, uploaded) {
  const metadata = {
    ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
    storageProvider: TARGET_BUCKET,
    cloudinary: {
      cloudName: CLOUD,
      resourceType: uploaded.resource_type === "video" ? "video" : "image",
      version: uploaded.version ?? null,
      format: uploaded.format ?? null,
      bytes: uploaded.bytes ?? null,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      duration: uploaded.duration ?? null,
    },
    migratedFrom: { bucket: SOURCE_BUCKET, path: row.object_path, migratedAt: new Date().toISOString(), tool: "migrate-media-to-cloudinary.mjs" },
  };
  const response = await supabase(`/rest/v1/catalog_media?id=eq.${encodeURIComponent(row.id)}&storage_bucket=eq.${SOURCE_BUCKET}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ storage_bucket: TARGET_BUCKET, object_path: publicId, metadata }),
  });
  if (!response.ok) throw new Error(`DB_UPDATE_${response.status}: ${(await response.text()).slice(0, 300)}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("DB_UPDATE_NO_ROW (row changed concurrently?)");
}

async function verifyRow(rowId, publicId) {
  const response = await supabase(`/rest/v1/catalog_media?id=eq.${encodeURIComponent(rowId)}&select=storage_bucket,object_path`);
  const rows = response.ok ? await response.json() : [];
  if (rows?.[0]?.storage_bucket !== TARGET_BUCKET || rows?.[0]?.object_path !== publicId) throw new Error("DB_VERIFY_FAILED");
}

async function sourceStillReferenced(objectPath) {
  const encoded = encodeURIComponent(objectPath);
  const [media, assets] = await Promise.all([
    supabase(`/rest/v1/catalog_media?storage_bucket=eq.${SOURCE_BUCKET}&object_path=eq.${encoded}&select=id&limit=1`),
    supabase(`/rest/v1/media_assets?bucket=eq.${SOURCE_BUCKET}&object_path=eq.${encoded}&select=id&limit=1`),
  ]);
  if (!media.ok || !assets.ok) return true;
  return (await media.json()).length > 0 || (await assets.json()).length > 0;
}

async function deleteSource(objectPath) {
  const response = await supabase(`/storage/v1/object/${SOURCE_BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: [objectPath] }) });
  if (!response.ok && response.status !== 404) throw new Error(`SOURCE_DELETE_${response.status}`);
}

async function rollback(file) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SAFE_PATH = /^[^\u0000-\u001f\u007f]{1,1024}$/;
  const entries = (report.entries || [])
    .filter((e) => e.status === "MIGRATED" && !e.sourceDeleted)
    .filter((e) => {
      const ok = UUID.test(String(e.rowId || "")) && SAFE_PATH.test(String(e.sourcePath || "")) && !String(e.sourcePath).includes("..");
      if (!ok) console.warn(` ! skipping malformed report entry ${JSON.stringify(e.rowId)}`);
      return ok;
    });
  console.log(`Rollback candidates: ${entries.length}${APPLY ? "" : " (dry-run)"}`);
  for (const entry of entries) {
    console.log(` ↺ ${entry.rowId} ${entry.publicId} → ${SOURCE_BUCKET}/${entry.sourcePath}`);
    if (!APPLY) continue;
    const current = await supabase(`/rest/v1/catalog_media?id=eq.${encodeURIComponent(entry.rowId)}&select=metadata`);
    const rows = current.ok ? await current.json() : [];
    const metadata = { ...(rows?.[0]?.metadata || {}) };
    delete metadata.cloudinary;
    delete metadata.migratedFrom;
    delete metadata.storageProvider;
    const response = await supabase(`/rest/v1/catalog_media?id=eq.${encodeURIComponent(entry.rowId)}&storage_bucket=eq.${TARGET_BUCKET}`, {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ storage_bucket: SOURCE_BUCKET, object_path: entry.sourcePath, metadata }),
    });
    console.log(response.ok ? "   ok" : `   failed HTTP ${response.status}`);
  }
}

async function main() {
  if (ROLLBACK) return rollback(ROLLBACK);
  await assertMigrationApplied();
  const rows = await listRows();
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}${DELETE_SOURCE ? " + DELETE-SOURCE" : ""} · candidates: ${rows.length} (limit ${LIMIT}) · cloud: ${CLOUD}`);
  const entries = [];
  let migrated = 0;
  let failed = 0;
  for (const row of rows) {
    const publicId = publicIdFor(row);
    const resourceType = resourceTypeFor(row);
    const entry = { rowId: row.id, kind: row.kind, sourcePath: row.object_path, publicId, resourceType, url: publicId ? deliveryUrl(publicId, resourceType) : "", status: "PLANNED", sourceDeleted: false };
    entries.push(entry);
    if (!publicId) {
      entry.status = "SKIPPED_NO_OWNER";
      console.log(` - skip ${row.id}: no vehicle/tour/blog owner`);
      continue;
    }
    console.log(` • ${row.kind} ${SOURCE_BUCKET}/${row.object_path} → ${publicId}`);
    if (!APPLY) continue;
    try {
      const uploaded = await uploadRemote(row, publicId, resourceType);
      if (resourceType === "video" && Number(uploaded.bytes) > VIDEO_MAX_BYTES) throw new Error("VIDEO_OVER_FREE_PLAN_CAP");
      await verifyCloudinary(publicId, resourceType);
      await updateRow(row, publicId, uploaded);
      await verifyRow(row.id, publicId);
      entry.status = "MIGRATED";
      migrated++;
      if (DELETE_SOURCE) {
        if (await sourceStillReferenced(row.object_path)) {
          entry.sourceDeleteSkipped = "STILL_REFERENCED";
        } else {
          await deleteSource(row.object_path);
          entry.sourceDeleted = true;
        }
      }
      console.log(`   ✔ migrated${entry.sourceDeleted ? " + source deleted" : ""}`);
    } catch (error) {
      entry.status = "FAILED";
      entry.error = error instanceof Error ? error.message : String(error);
      failed++;
      console.log(`   ✖ ${entry.error}`);
    }
    if (SLEEP_MS) await sleep(SLEEP_MS);
  }
  if (APPLY) {
    fs.writeFileSync(REPORT, JSON.stringify({ createdAt: new Date().toISOString(), cloud: CLOUD, deleteSource: DELETE_SOURCE, entries }, null, 2));
    console.log(`Report: ${REPORT}`);
  }
  console.log(`Done. migrated=${migrated} failed=${failed} planned=${rows.length}${APPLY ? "" : " (dry-run: nothing was changed)"}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
