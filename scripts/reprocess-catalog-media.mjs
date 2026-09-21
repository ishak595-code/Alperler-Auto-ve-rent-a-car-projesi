#!/usr/bin/env node
/**
 * Reprocess oversized catalog-media images (egress hygiene).
 *
 * Lists objects in the `catalog-media` bucket over ~400 KB, recompresses to
 * WebP (JPEG fallback) with long edge ≤ 1920 and target ~150–300 KB, then
 * re-uploads preferably in-place (same object path → stable public URL).
 * If the path extension must change, updates catalog_media + vehicle/tour
 * cover_image/images URL fields.
 *
 * Requirements:
 *   - Node 20+
 *   - env: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - optional: npm i -D sharp   (required for compression; script refuses without it)
 *
 * Usage:
 *   # Dry-run (default): list candidates only
 *   node scripts/reprocess-catalog-media.mjs
 *
 *   # Apply in batches (low egress): process up to N files
 *   node scripts/reprocess-catalog-media.mjs --apply --limit=10
 *
 *   # Skip files already ≤ threshold
 *   node scripts/reprocess-catalog-media.mjs --apply --min-bytes=400000
 *
 * Flags:
 *   --apply              Write changes (default is dry-run)
 *   --limit=N            Max files to process this run (default 20)
 *   --min-bytes=N        Only candidates larger than N (default 400000)
 *   --prefix=path/       Optional storage prefix filter
 *   --sleep-ms=N         Pause between uploads (default 250)
 */

import "dotenv/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const BUCKET = "catalog-media";
const MAX_LONG_EDGE = 1920;
const TARGET_BYTES = 250_000;
const DEFAULT_MIN_BYTES = 400_000;
const DEFAULT_LIMIT = 20;
const IMAGE_EXTS = new Set(["jpg", "jpeg", "jfif", "png", "webp", "avif", "bmp", "gif"]);

function argValue(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const APPLY = hasFlag("apply");
const LIMIT = Math.max(1, Number(argValue("limit", String(DEFAULT_LIMIT))) || DEFAULT_LIMIT);
const MIN_BYTES = Math.max(1, Number(argValue("min-bytes", String(DEFAULT_MIN_BYTES))) || DEFAULT_MIN_BYTES);
const PREFIX = String(argValue("prefix", "") || "");
const SLEEP_MS = Math.max(0, Number(argValue("sleep-ms", "250")) || 250);

const PROJECT_URL = String(process.env.SUPABASE_PROJECT_URL || "").replace(/\/$/, "");
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

if (!PROJECT_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE_KEY (service role / admin).");
  process.exit(1);
}

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("Install sharp first: npm i -D sharp");
  process.exit(1);
}

const authHeaders = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extensionOf(path) {
  const base = path.split("/").pop() || "";
  const ext = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
  return ext;
}

function isImagePath(path) {
  return IMAGE_EXTS.has(extensionOf(path));
}

function publicUrl(objectPath) {
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

async function listAllImages() {
  const out = [];
  const queue = [PREFIX.replace(/\/$/, "")];
  const seen = new Set();

  while (queue.length) {
    const prefix = queue.shift();
    const key = prefix || "";
    if (seen.has(key)) continue;
    seen.add(key);

    let offset = 0;
    for (;;) {
      const body = {
        prefix: prefix ? `${prefix}/` : "",
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      };
      // Storage list API uses POST on /object/list/{bucket}
      const response = await fetch(`${PROJECT_URL}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`LIST_${response.status}: ${await response.text()}`);
      }
      const rows = await response.json();
      if (!Array.isArray(rows) || !rows.length) break;

      for (const row of rows) {
        const name = String(row.name || "");
        if (!name || name === ".emptyFolderPlaceholder") continue;
        const fullPath = prefix ? `${prefix}/${name}` : name;
        // Folder marker: id null and no metadata typically
        const isFolder = row.id == null && (row.metadata == null || row.metadata === undefined);
        if (isFolder) {
          queue.push(fullPath);
          continue;
        }
        const size = Number(row.metadata?.size ?? row.metadata?.contentLength ?? 0);
        if (!isImagePath(fullPath)) continue;
        if (size < MIN_BYTES) continue;
        out.push({ path: fullPath, size, updatedAt: row.updated_at || row.created_at || null });
      }

      if (rows.length < 100) break;
      offset += rows.length;
    }
  }

  out.sort((a, b) => b.size - a.size);
  return out;
}

async function downloadObject(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    headers: authHeaders,
  });
  if (!response.ok) throw new Error(`DOWNLOAD_${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}

async function compress(buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const longEdge = Math.max(width, height);
  const resize = longEdge > MAX_LONG_EDGE
    ? (width >= height ? { width: MAX_LONG_EDGE } : { height: MAX_LONG_EDGE })
    : null;

  const qualities = [82, 74, 66, 58, 50];
  let best = null;
  for (const quality of qualities) {
    let pipeline = sharp(buffer, { failOn: "none" }).rotate();
    if (resize) pipeline = pipeline.resize({ ...resize, fit: "inside", withoutEnlargement: true });
    const out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    best = { buffer: out, contentType: "image/webp", ext: "webp" };
    if (out.length <= TARGET_BYTES) break;
  }

  if (!best || best.buffer.length > TARGET_BYTES * 1.4) {
    for (const quality of qualities) {
      let pipeline = sharp(buffer, { failOn: "none" }).rotate();
      if (resize) pipeline = pipeline.resize({ ...resize, fit: "inside", withoutEnlargement: true });
      const out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      if (!best || out.length < best.buffer.length) {
        best = { buffer: out, contentType: "image/jpeg", ext: "jpg" };
      }
      if (out.length <= TARGET_BYTES) break;
    }
  }

  return best;
}

async function upsertObject(path, buffer, contentType) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "content-type": contentType,
      "cache-control": "31536000",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!response.ok) throw new Error(`UPSERT_${response.status}: ${await response.text()}`);
}

async function deleteObject(path) {
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`DELETE_${response.status}`);
  }
}

async function rest(path, init = {}) {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`REST_${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function rewriteUrl(oldUrl, oldPath, newPath) {
  if (!oldUrl || typeof oldUrl !== "string") return oldUrl;
  if (oldUrl.includes(oldPath)) return oldUrl.split(oldPath).join(newPath);
  // Also handle encoded paths
  const encOld = oldPath.split("/").map(encodeURIComponent).join("/");
  const encNew = newPath.split("/").map(encodeURIComponent).join("/");
  if (oldUrl.includes(encOld)) return oldUrl.split(encOld).join(encNew);
  return oldUrl;
}

async function updateDbUrls(oldPath, newPath) {
  if (oldPath === newPath) return { catalogMedia: 0, vehicles: 0, tours: 0 };

  const oldPublic = publicUrl(oldPath);
  const newPublic = publicUrl(newPath);

  // catalog_media rows pointing at this object
  const mediaRows = await rest(
    `catalog_media?or=(object_path.eq.${encodeURIComponent(oldPath)},external_url.eq.${encodeURIComponent(oldPublic)},poster_url.eq.${encodeURIComponent(oldPublic)})&select=id,object_path,external_url,poster_url`,
  ) || [];

  let catalogMedia = 0;
  for (const row of mediaRows) {
    const patch = {};
    if (row.object_path === oldPath) patch.object_path = newPath;
    if (row.external_url) patch.external_url = rewriteUrl(row.external_url, oldPath, newPath);
    if (row.poster_url) patch.poster_url = rewriteUrl(row.poster_url, oldPath, newPath);
    if (!Object.keys(patch).length) continue;
    await rest(`catalog_media?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    catalogMedia += 1;
  }

  // vehicles.cover_image / images[]
  const vehicles = await rest(
    `vehicles?or=(cover_image.ilike.*${encodeURIComponent(oldPath)}*,images.cs.{"${oldPublic}"})&select=id,cover_image,images`,
  ).catch(() => []) || [];

  // Fallback broader scan if filter is unreliable with arrays
  let vehicleHits = vehicles;
  if (!vehicleHits.length) {
    const all = await rest(`vehicles?select=id,cover_image,images&limit=500`) || [];
    vehicleHits = all.filter((v) => {
      const cover = String(v.cover_image || "");
      const images = Array.isArray(v.images) ? v.images : [];
      return cover.includes(oldPath) || images.some((u) => String(u).includes(oldPath));
    });
  }

  let vehicleCount = 0;
  for (const v of vehicleHits) {
    const cover = v.cover_image ? rewriteUrl(v.cover_image, oldPath, newPath) : v.cover_image;
    const images = Array.isArray(v.images)
      ? v.images.map((u) => rewriteUrl(String(u), oldPath, newPath))
      : v.images;
    const changed = cover !== v.cover_image || JSON.stringify(images) !== JSON.stringify(v.images);
    if (!changed) continue;
    await rest(`vehicles?id=eq.${encodeURIComponent(v.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ cover_image: cover, images }),
    });
    vehicleCount += 1;
  }

  const tours = await rest(`tours?select=id,cover_image,images&limit=500`).catch(() => []) || [];
  let tourCount = 0;
  for (const t of tours) {
    const cover = t.cover_image ? rewriteUrl(t.cover_image, oldPath, newPath) : t.cover_image;
    const images = Array.isArray(t.images)
      ? t.images.map((u) => rewriteUrl(String(u), oldPath, newPath))
      : t.images;
    const changed = cover !== t.cover_image || JSON.stringify(images) !== JSON.stringify(t.images);
    if (!changed) continue;
    await rest(`tours?id=eq.${encodeURIComponent(t.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ cover_image: cover, images }),
    });
    tourCount += 1;
  }

  return { catalogMedia, vehicles: vehicleCount, tours: tourCount, oldPublic, newPublic };
}

function targetPath(oldPath, ext) {
  const current = extensionOf(oldPath);
  if (current === ext) return oldPath;
  // Prefer in-place: keep original path + content-type (stable URL). Only change
  // extension when re-encoding would leave a misleading type AND we will update DB.
  // Default strategy: keep same path for stable URL (content-type header carries MIME).
  return oldPath;
}

async function main() {
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    bucket: BUCKET,
    minBytes: MIN_BYTES,
    limit: LIMIT,
    prefix: PREFIX || "(root)",
    project: PROJECT_URL,
  }, null, 2));

  const candidates = await listAllImages();
  console.log(`Candidates over ${MIN_BYTES} bytes: ${candidates.length}`);
  const batch = candidates.slice(0, LIMIT);

  let saved = 0;
  let processed = 0;
  for (const item of batch) {
    const kb = Math.round(item.size / 1024);
    if (!APPLY) {
      console.log(`  [dry] ${item.path} (${kb} KB)`);
      continue;
    }

    process.stdout.write(`  [apply] ${item.path} (${kb} KB) … `);
    try {
      const { buffer } = await downloadObject(item.path);
      const compressed = await compress(buffer);
      if (!compressed) {
        console.log("skip (encode failed)");
        continue;
      }
      if (compressed.buffer.length >= item.size * 0.95) {
        console.log(`skip (no gain: ${Math.round(compressed.buffer.length / 1024)} KB)`);
        continue;
      }

      const newPath = targetPath(item.path, compressed.ext);
      await upsertObject(newPath, compressed.buffer, compressed.contentType);

      let db = { catalogMedia: 0, vehicles: 0, tours: 0 };
      if (newPath !== item.path) {
        db = await updateDbUrls(item.path, newPath);
        await deleteObject(item.path).catch(() => undefined);
      }

      const newKb = Math.round(compressed.buffer.length / 1024);
      const delta = kb - newKb;
      saved += Math.max(0, item.size - compressed.buffer.length);
      processed += 1;
      console.log(`→ ${newKb} KB (-${delta} KB) type=${compressed.contentType} db=${JSON.stringify(db)}`);
    } catch (error) {
      console.log(`ERROR ${error instanceof Error ? error.message : error}`);
    }

    if (SLEEP_MS) await sleep(SLEEP_MS);
  }

  console.log(JSON.stringify({
    listed: candidates.length,
    considered: batch.length,
    processed,
    bytesSavedApprox: saved,
    mode: APPLY ? "apply" : "dry-run",
  }, null, 2));

  if (!APPLY) {
    console.log("\nDry-run complete. Re-run with --apply --limit=10 to process a small batch.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
