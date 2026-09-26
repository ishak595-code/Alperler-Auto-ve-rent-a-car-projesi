/**
 * V249 — admin-only Cloudinary control endpoint, mounted at
 * `/api/partner?op=cloudinary` (no new Vercel function: Hobby budget is 12/12).
 *
 * Actions (POST JSON body `{ action, ... }`):
 *  - SIGN_UPLOAD   → short-lived signed-upload parameters for a server-chosen public_id.
 *  - DESTROY       → signed destroy of an unreferenced asset (upload rollback).
 *  - DRAIN_CLEANUP → processes `media_cleanup_jobs_v198` rows with storage_bucket='cloudinary'.
 *
 * Auth mirrors media-control-admin-v185: Supabase JWT → /auth/v1/user, then an
 * active `admin_users` row with role owner/admin or content.manage/settings.manage.
 */
import { corsHeaders, originDecision } from "./request-security.js";
import { SUPABASE_PROJECT_URL } from "./supabase-public.js";
import {
  CLOUDINARY_ADMIN_FOLDER,
  CLOUDINARY_CATALOG_FOLDER,
  CLOUDINARY_IMAGE_MAX_BYTES,
  CLOUDINARY_STORAGE_BUCKET,
  CLOUDINARY_VIDEO_MAX_BYTES,
  type CatalogEntityType,
  adminFolder,
  catalogFolder,
  cloudinaryConfig,
  destroyCloudinaryAsset,
  isSafePublicId,
  isUuid,
  resourceTypeFrom,
  signUpload,
} from "./cloudinary.js";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";
const MAX_BODY_BYTES = 8 * 1024;

type Json = Record<string, unknown>;

function serviceKey(): string {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceKey();
  return { apikey: key, authorization: `Bearer ${key}`, accept: "application/json", "content-type": "application/json", ...extra };
}

function reply(request: Request, body: Json, status = 200): Response {
  const decision = originDecision(request);
  return Response.json({ ...body, requestId: decision.requestId }, {
    status,
    headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "private, no-store" },
  });
}

async function requireContentAdmin(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  if (!serviceKey()) throw new Error("ADMIN_VERIFY_UNAVAILABLE");
  const userResponse = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/user`, {
    headers: { apikey: serviceKey(), authorization },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!userResponse) throw new Error("ADMIN_VERIFY_UNAVAILABLE");
  if (!userResponse.ok) throw new Error(userResponse.status >= 500 || userResponse.status === 402 ? "ADMIN_VERIFY_UNAVAILABLE" : "UNAUTHORIZED");
  const user = await userResponse.json().catch(() => ({})) as { id?: unknown };
  const id = String(user?.id || "");
  if (!isUuid(id)) throw new Error("UNAUTHORIZED");
  const adminResponse = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=role,permissions&limit=1`,
    { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) },
  ).catch(() => null);
  if (!adminResponse?.ok) throw new Error("ADMIN_VERIFY_UNAVAILABLE");
  const rows = await adminResponse.json().catch(() => []) as Array<{ role?: unknown; permissions?: unknown }>;
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("FORBIDDEN");
  const role = String(row.role || "").trim().toLowerCase();
  const permissions = row.permissions && typeof row.permissions === "object" ? row.permissions as Record<string, unknown> : {};
  const allowed = role === "owner" || role === "admin" || permissions["content.manage"] === true || permissions["settings.manage"] === true;
  if (!allowed) throw new Error("FORBIDDEN");
  return id;
}

async function readBody(request: Request): Promise<Json> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed as Json;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function isReferenced(publicId: string): Promise<boolean> {
  const encoded = encodeURIComponent(publicId);
  const [media, assets] = await Promise.all([
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?storage_bucket=eq.${CLOUDINARY_STORAGE_BUCKET}&object_path=eq.${encoded}&select=id&limit=1`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) }),
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/media_assets?bucket=eq.${CLOUDINARY_STORAGE_BUCKET}&object_path=eq.${encoded}&select=id&limit=1`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) }),
  ]);
  if (!media.ok || !assets.ok) throw new Error("REFERENCE_CHECK_UNAVAILABLE");
  const mediaRows = await media.json().catch(() => []) as unknown[];
  const assetRows = await assets.json().catch(() => []) as unknown[];
  return (Array.isArray(mediaRows) && mediaRows.length > 0) || (Array.isArray(assetRows) && assetRows.length > 0);
}

function signAction(request: Request, input: Json): Response {
  const config = cloudinaryConfig();
  const resourceType = resourceTypeFrom(input["resourceType"]);
  if (!resourceType) return reply(request, { ok: false, code: "INVALID_RESOURCE_TYPE" }, 400);
  const bytes = Number(input["bytes"] || 0);
  const cap = resourceType === "video" ? CLOUDINARY_VIDEO_MAX_BYTES : CLOUDINARY_IMAGE_MAX_BYTES;
  if (!Number.isFinite(bytes) || bytes <= 0) return reply(request, { ok: false, code: "INVALID_FILE_SIZE" }, 400);
  if (bytes > cap) return reply(request, { ok: false, code: resourceType === "video" ? "CLOUDINARY_VIDEO_TOO_LARGE" : "CLOUDINARY_IMAGE_TOO_LARGE", maxBytes: cap }, 413);

  const scope = String(input["scope"] || "").trim().toLowerCase();
  let folder = "";
  if (scope === "catalog") {
    const entityType = String(input["entityType"] || "").trim().toUpperCase();
    const entityId = String(input["entityId"] || "").trim();
    if (!["VEHICLE", "TOUR", "BLOG"].includes(entityType) || !isUuid(entityId)) return reply(request, { ok: false, code: "INVALID_MEDIA_OWNER" }, 400);
    folder = catalogFolder(entityType as CatalogEntityType, entityId);
  } else if (scope === "admin") {
    if (resourceType !== "image") return reply(request, { ok: false, code: "INVALID_RESOURCE_TYPE" }, 400);
    folder = adminFolder(input["entityType"], input["entityId"], input["purpose"]);
  } else {
    return reply(request, { ok: false, code: "INVALID_UPLOAD_SCOPE" }, 400);
  }
  if (!folder.startsWith(`${CLOUDINARY_CATALOG_FOLDER}/`) && !folder.startsWith(`${CLOUDINARY_ADMIN_FOLDER}/`)) {
    return reply(request, { ok: false, code: "INVALID_UPLOAD_SCOPE" }, 400);
  }
  return reply(request, { ok: true, upload: signUpload(config, folder, resourceType) });
}

async function destroyAction(request: Request, input: Json): Promise<Response> {
  const config = cloudinaryConfig();
  const publicId = String(input["publicId"] || "").trim();
  const resourceType = resourceTypeFrom(input["resourceType"]) || "image";
  if (!isSafePublicId(publicId)) return reply(request, { ok: false, code: "INVALID_CLOUDINARY_PUBLIC_ID" }, 400);
  if (await isReferenced(publicId)) return reply(request, { ok: false, code: "CLOUDINARY_ASSET_STILL_REFERENCED" }, 409);
  const result = await destroyCloudinaryAsset(config, publicId, resourceType);
  return reply(request, { ok: result.ok, result: result.result }, result.ok ? 200 : 502);
}

interface CleanupJob { id: string; object_path: string; resource_type?: string | null; attempts?: number | null }

async function patchJob(id: string, body: Json): Promise<void> {
  await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/media_cleanup_jobs_v198?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: serviceHeaders({ prefer: "return=minimal" }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

async function drainAction(request: Request, input: Json): Promise<Response> {
  const config = cloudinaryConfig();
  const limit = Math.max(1, Math.min(25, Math.trunc(Number(input["limit"] || 10)) || 10));
  const listing = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/media_cleanup_jobs_v198?storage_bucket=eq.${CLOUDINARY_STORAGE_BUCKET}&status=eq.PENDING&completed_at=is.null&select=id,object_path,resource_type,attempts&order=created_at.asc&limit=${limit}`,
    { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) },
  );
  // 400 → V249 migration (resource_type column / bucket constraint) not applied yet: nothing to drain.
  if (listing.status === 400) return reply(request, { ok: true, code: "CLOUDINARY_CLEANUP_MIGRATION_PENDING", cleanup: { attempted: 0, completed: 0, pending: 0 } });
  if (!listing.ok) return reply(request, { ok: false, code: "CLOUDINARY_CLEANUP_LIST_FAILED" }, 503);
  const jobs = await listing.json().catch(() => []) as CleanupJob[];
  let completed = 0;
  let pending = 0;
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const attempts = Math.max(0, Number(job.attempts || 0)) + 1;
    const now = new Date().toISOString();
    try {
      if (!isSafePublicId(job.object_path)) throw new Error("INVALID_CLOUDINARY_PUBLIC_ID");
      if (await isReferenced(job.object_path)) {
        // Re-used by a live row (e.g. restored) — never delete; close the job.
        await patchJob(job.id, { status: "COMPLETED", attempts, last_error: "STILL_REFERENCED_SKIPPED", completed_at: now, updated_at: now });
        completed++;
        continue;
      }
      const result = await destroyCloudinaryAsset(config, job.object_path, resourceTypeFrom(job.resource_type) || "image");
      if (!result.ok) throw new Error(`CLOUDINARY_DESTROY_${result.result}`.slice(0, 200));
      await patchJob(job.id, { status: "COMPLETED", attempts, last_error: null, completed_at: now, updated_at: now });
      completed++;
    } catch (error) {
      await patchJob(job.id, { status: "PENDING", attempts, last_error: (error instanceof Error ? error.message : "CLOUDINARY_DESTROY_FAILED").slice(0, 500), updated_at: now }).catch(() => undefined);
      pending++;
    }
  }
  return reply(request, { ok: true, cleanup: { attempted: Array.isArray(jobs) ? jobs.length : 0, completed, pending } });
}

function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  if (code === "INVALID_JSON") return 400;
  if (code === "ADMIN_VERIFY_UNAVAILABLE" || code === "REFERENCE_CHECK_UNAVAILABLE" || code === "CLOUDINARY_NOT_CONFIGURED") return 503;
  return 500;
}

export async function cloudinaryAdmin(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return reply(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  // Env gate first: without all three variables the site keeps the Supabase path.
  if (!cloudinaryConfig().configured) return reply(request, { ok: false, code: "CLOUDINARY_NOT_CONFIGURED" }, 503);
  try {
    await requireContentAdmin(request);
    const input = await readBody(request);
    const action = String(input["action"] || "").trim().toUpperCase();
    if (action === "SIGN_UPLOAD") return signAction(request, input);
    if (action === "DESTROY") return await destroyAction(request, input);
    if (action === "DRAIN_CLEANUP") return await drainAction(request, input);
    return reply(request, { ok: false, code: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLOUDINARY_ADMIN_FAILED";
    if (statusFor(code) === 500) console.error("cloudinary-admin-v249", code);
    return reply(request, { ok: false, code }, statusFor(code));
  }
}
