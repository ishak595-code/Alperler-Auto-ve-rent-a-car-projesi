/**
 * V252 — provider-agnostic media upload control, mounted at `/api/partner?op=media-upload`
 * (no new Vercel function: the Hobby budget is 12/12).
 *
 * The active provider comes from resolveMediaProvider() (MEDIA_PROVIDER + env presence):
 *   r2         → SIGN_UPLOAD returns presigned PUT URLs for a server-chosen key stem
 *   cloudinary → SIGN_UPLOAD returns Cloudinary signed-upload params (same as op=cloudinary)
 *   supabase   → 503 MEDIA_PROVIDER_NOT_CONFIGURED; the browser keeps Supabase Storage.
 *
 * Actions (POST JSON `{ action, ... }`):
 *   CONFIG         public: { provider, publicBaseUrl?, cloudName? } (no secrets)
 *   SIGN_UPLOAD    scope catalog | admin | branch | ops (see targetFrom)
 *   DESTROY        rollback of an unreferenced, just-uploaded stem / public_id
 *   DRAIN_CLEANUP  processes media_cleanup_jobs_v198 for r2 and cloudinary (admins)
 *
 * Who may sign: content admins (every scope), ops admins (inspection photos), and branch
 * managers for their own branch / branch-origin listings, checked by the V252 RPC
 * public.can_upload_media_v252 with the caller's JWT (same rule as catalog_media RLS).
 */
import { randomUUID } from "node:crypto";
import { corsHeaders, originDecision } from "./request-security.js";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-public.js";
import {
  CLOUDINARY_IMAGE_MAX_BYTES,
  CLOUDINARY_VIDEO_MAX_BYTES,
  adminFolder,
  branchFolder,
  catalogFolder,
  cloudinaryConfig,
  destroyCloudinaryAsset,
  isSafePublicId,
  opsFolder,
  resourceTypeFrom,
  signUpload,
  type CatalogEntityType,
} from "./cloudinary.js";
import { drainCloudinaryCleanup } from "./cloudinary-admin.js";
import { R2_IMAGE_WIDTHS, R2_PRESIGN_TTL_SECONDS, R2_STORAGE_BUCKET, checkR2File, deleteStem, isSafeStem, measureBucket, presignPut, r2Config, type R2FileRequest } from "./r2.js";
import { reservationBytes, reserveUpload } from "./media-upload-guard.js";
import { resolveMediaProvider, type MediaProvider } from "./media-provider.js";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";
const MAX_BODY_BYTES = 16 * 1024;
const MAX_FILES_PER_STEM = 10;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_PATTERN = new RegExp(`^${UUID}$`, "i");

type Json = Record<string, unknown>;

export type UploadAuthz =
  | { kind: "content" }
  | { kind: "ops" }
  | { kind: "owner"; branchId?: string; vehicleId?: string; tourId?: string };

export interface UploadTarget {
  scope: "catalog" | "admin" | "branch" | "ops";
  folder: string;
  allowVideo: boolean;
  authz: UploadAuthz;
}

export interface Actor { userId: string; token: string; content: boolean; ops: boolean }

class HttpError extends Error {
  constructor(readonly code: string, readonly status: number, readonly extra: Json = {}) { super(code); }
}

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

async function serviceRpc(name: string, args: Json): Promise<unknown> {
  const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`, {
    method: "POST", headers: serviceHeaders(), body: JSON.stringify(args), signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`RPC_${response.status}`);
  return response.json();
}

async function readBody(request: Request): Promise<Json> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError("PAYLOAD_TOO_LARGE", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new HttpError("PAYLOAD_TOO_LARGE", 413);
  try {
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("x");
    return parsed as Json;
  } catch {
    throw new HttpError("INVALID_JSON", 400);
  }
}

const uuidOrEmpty = (value: unknown): string => {
  const text = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(text) ? text : "";
};

/** Pure: request body → folder + authorization requirement. Exported for unit tests. */
export function targetFrom(input: Json): UploadTarget {
  const scope = String(input["scope"] || "").trim().toLowerCase();
  if (scope === "catalog") {
    const entityType = String(input["entityType"] || "").trim().toUpperCase();
    const entityId = uuidOrEmpty(input["entityId"]);
    if (!["VEHICLE", "TOUR", "BLOG"].includes(entityType) || !entityId) throw new HttpError("INVALID_MEDIA_OWNER", 400);
    const authz: UploadAuthz = entityType === "VEHICLE" ? { kind: "owner", vehicleId: entityId }
      : entityType === "TOUR" ? { kind: "owner", tourId: entityId } : { kind: "content" };
    return { scope, folder: catalogFolder(entityType as CatalogEntityType, entityId), allowVideo: true, authz };
  }
  if (scope === "admin") {
    return { scope, folder: adminFolder(input["entityType"], input["entityId"], input["purpose"]), allowVideo: false, authz: { kind: "content" } };
  }
  if (scope === "branch") {
    const branchId = uuidOrEmpty(input["branchId"]);
    if (!branchId) throw new HttpError("INVALID_MEDIA_OWNER", 400);
    const draft = String(input["purpose"] || "").trim().toLowerCase() === "vehicle-draft";
    return { scope, folder: branchFolder(branchId, draft ? "vehicle-draft" : ""), allowVideo: !draft, authz: { kind: "owner", branchId } };
  }
  if (scope === "ops") {
    return { scope, folder: opsFolder(input["vehicleId"]), allowVideo: false, authz: { kind: "ops" } };
  }
  throw new HttpError("INVALID_UPLOAD_SCOPE", 400);
}

/** Pure: an existing stem/public_id → the authorization that created it (for rollback deletes). */
export function authzForKey(key: string): UploadAuthz | null {
  let match = new RegExp(`^alperler/catalog/(vehicle|tour|blog)/(${UUID})/[A-Za-z0-9_-]{8,64}$`, "i").exec(key);
  if (match) {
    const id = match[2].toLowerCase();
    return match[1] === "vehicle" ? { kind: "owner", vehicleId: id } : match[1] === "tour" ? { kind: "owner", tourId: id } : { kind: "content" };
  }
  match = new RegExp(`^alperler/branch/(${UUID})(/vehicle-draft)?/[A-Za-z0-9_-]{8,64}$`, "i").exec(key);
  if (match) return { kind: "owner", branchId: match[1].toLowerCase() };
  if (/^alperler\/admin\/[a-z0-9_-]+\/[a-z0-9_-]+\/[a-z0-9_-]+\/[A-Za-z0-9_-]{8,64}$/.test(key)) return { kind: "content" };
  if (/^alperler\/ops\/inspection\/[a-z0-9_-]+\/[A-Za-z0-9_-]{8,64}$/.test(key)) return { kind: "ops" };
  return null;
}

async function verifyActor(request: Request): Promise<Actor> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new HttpError("UNAUTHORIZED", 401);
  if (!serviceKey()) throw new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503);
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  const userResponse = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/user`, {
    headers: { apikey: serviceKey(), authorization },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!userResponse) throw new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503);
  if (!userResponse.ok) {
    throw userResponse.status >= 500 || userResponse.status === 402 ? new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503) : new HttpError("UNAUTHORIZED", 401);
  }
  const user = await userResponse.json().catch(() => ({})) as { id?: unknown };
  const userId = String(user?.id || "");
  if (!UUID_PATTERN.test(userId)) throw new HttpError("UNAUTHORIZED", 401);
  const adminResponse = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=role,permissions&limit=1`,
    { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) },
  ).catch(() => null);
  if (!adminResponse?.ok) throw new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503);
  const rows = await adminResponse.json().catch(() => []) as Array<{ role?: unknown; permissions?: unknown }>;
  const row = Array.isArray(rows) ? rows[0] : null;
  const role = String(row?.role || "").trim().toLowerCase();
  const permissions = row?.permissions && typeof row.permissions === "object" ? row.permissions as Record<string, unknown> : {};
  const content = !!row && (role === "owner" || role === "admin" || permissions["content.manage"] === true || permissions["settings.manage"] === true);
  const ops = content || (!!row && (role === "operations" || role === "ops" || permissions["fleet.manage"] === true || permissions["operations.manage"] === true || permissions["bookings.manage"] === true));
  return { userId, token, content, ops };
}

async function branchMayUpload(actor: Actor, authz: Extract<UploadAuthz, { kind: "owner" }>): Promise<boolean> {
  const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/can_upload_media_v252`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${actor.token}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ p_branch_id: authz.branchId || null, p_vehicle_id: authz.vehicleId || null, p_tour_id: authz.tourId || null }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!response) throw new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503);
  // 404 → V252 migration not applied yet: branch uploads stay on Supabase Storage.
  if (response.status === 404) throw new HttpError("MEDIA_PROVIDER_MIGRATION_PENDING", 503);
  if (response.status === 402 || response.status >= 500) throw new HttpError("ADMIN_VERIFY_UNAVAILABLE", 503);
  if (!response.ok) return false;
  return (await response.json().catch(() => false)) === true;
}

async function authorize(actor: Actor, authz: UploadAuthz): Promise<void> {
  if (actor.content) return;
  if (authz.kind === "ops" && actor.ops) return;
  if (authz.kind === "owner" && await branchMayUpload(actor, authz)) return;
  throw new HttpError("FORBIDDEN", 403);
}

function signR2(target: UploadTarget, input: Json): Json {
  const config = r2Config();
  const files = Array.isArray(input["files"]) ? input["files"] as R2FileRequest[] : [];
  if (!files.length || files.length > MAX_FILES_PER_STEM) throw new HttpError("INVALID_MEDIA_FILES", 400);
  const names = new Set<string>();
  for (const file of files) {
    const check = checkR2File(file, target.allowVideo);
    if (!check.ok) throw new HttpError(check.code, check.code.endsWith("TOO_LARGE") ? 413 : 400, check.maxBytes ? { maxBytes: check.maxBytes } : {});
    if (names.has(file.name)) throw new HttpError("INVALID_MEDIA_FILES", 400);
    names.add(file.name);
  }
  // Every stem carries the full fixed width set (one format: WebP, or JPEG where the browser
  // cannot encode WebP) so srcset never points at a missing object.
  const variantExt = names.has("w1440.webp") ? "webp" : "jpg";
  for (const width of R2_IMAGE_WIDTHS) if (!names.has(`w${width}.${variantExt}`)) throw new HttpError("R2_VARIANTS_INCOMPLETE", 400);
  const mixed = [...names].some((name) => /^w\d+\.(webp|jpg)$/.test(name) && !name.endsWith(`.${variantExt}`));
  if (mixed) throw new HttpError("R2_VARIANTS_INCOMPLETE", 400);
  const stem = `${target.folder}/${randomUUID().replace(/-/g, "")}`;
  const now = new Date();
  const puts = files.map((file) => presignPut(config, stem, { name: file.name, contentType: String(file.contentType).toLowerCase(), bytes: Number(file.bytes) }, now));
  return { provider: "r2", bucket: R2_STORAGE_BUCKET, stem, publicBaseUrl: config.publicBaseUrl, widths: [...R2_IMAGE_WIDTHS], variantExt, expiresIn: R2_PRESIGN_TTL_SECONDS, puts };
}

function signCloudinary(target: UploadTarget, input: Json): Json {
  const resourceType = resourceTypeFrom(input["resourceType"]);
  if (!resourceType || (resourceType === "video" && !target.allowVideo)) throw new HttpError("INVALID_RESOURCE_TYPE", 400);
  const bytes = Number(input["bytes"] || 0);
  const cap = resourceType === "video" ? CLOUDINARY_VIDEO_MAX_BYTES : CLOUDINARY_IMAGE_MAX_BYTES;
  if (!Number.isFinite(bytes) || bytes <= 0) throw new HttpError("INVALID_FILE_SIZE", 400);
  if (bytes > cap) throw new HttpError(resourceType === "video" ? "CLOUDINARY_VIDEO_TOO_LARGE" : "CLOUDINARY_IMAGE_TOO_LARGE", 413, { maxBytes: cap });
  return { provider: "cloudinary", bucket: "cloudinary", upload: signUpload(cloudinaryConfig(), target.folder, resourceType) };
}

async function isReferenced(bucket: string, key: string): Promise<boolean> {
  const encoded = encodeURIComponent(key);
  const [media, assets] = await Promise.all([
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/catalog_media?storage_bucket=eq.${bucket}&object_path=eq.${encoded}&select=id&limit=1`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) }),
    fetch(`${SUPABASE_PROJECT_URL}/rest/v1/media_assets?bucket=eq.${bucket}&object_path=eq.${encoded}&select=id&limit=1`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) }),
  ]);
  if (!media.ok || !assets.ok) throw new HttpError("REFERENCE_CHECK_UNAVAILABLE", 503);
  const mediaRows = await media.json().catch(() => []) as unknown[];
  const assetRows = await assets.json().catch(() => []) as unknown[];
  return (Array.isArray(mediaRows) && mediaRows.length > 0) || (Array.isArray(assetRows) && assetRows.length > 0);
}

async function destroy(actor: Actor, input: Json): Promise<Json> {
  const provider = String(input["provider"] || "").trim().toLowerCase();
  const key = String(input["stem"] || input["publicId"] || "").trim();
  const authz = authzForKey(key);
  if (!authz) throw new HttpError("INVALID_MEDIA_KEY", 400);
  await authorize(actor, authz);
  if (provider === "r2") {
    const config = r2Config();
    if (!config.configured) throw new HttpError("R2_NOT_CONFIGURED", 503);
    if (!isSafeStem(key)) throw new HttpError("INVALID_MEDIA_KEY", 400);
    if (await isReferenced(R2_STORAGE_BUCKET, key)) throw new HttpError("MEDIA_STILL_REFERENCED", 409);
    const result = await deleteStem(config, key);
    if (!result.ok) throw new HttpError("R2_DELETE_FAILED", 502, { status: result.status });
    return { deleted: result.deleted };
  }
  if (provider === "cloudinary") {
    const config = cloudinaryConfig();
    if (!config.configured) throw new HttpError("CLOUDINARY_NOT_CONFIGURED", 503);
    if (!isSafePublicId(key)) throw new HttpError("INVALID_MEDIA_KEY", 400);
    if (await isReferenced("cloudinary", key)) throw new HttpError("MEDIA_STILL_REFERENCED", 409);
    const result = await destroyCloudinaryAsset(config, key, resourceTypeFrom(input["resourceType"]) || "image");
    if (!result.ok) throw new HttpError("CLOUDINARY_DESTROY_FAILED", 502, { result: result.result });
    return { deleted: 1 };
  }
  throw new HttpError("INVALID_MEDIA_PROVIDER", 400);
}

interface CleanupJob { id: string; object_path: string; attempts?: number | null }

async function patchJob(id: string, body: Json): Promise<void> {
  await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/media_cleanup_jobs_v198?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: serviceHeaders({ prefer: "return=minimal" }), body: JSON.stringify(body), signal: AbortSignal.timeout(8_000),
  });
}

async function drainR2(limit: number): Promise<{ code?: string; cleanup: { attempted: number; completed: number; pending: number } }> {
  const config = r2Config();
  const empty = { attempted: 0, completed: 0, pending: 0 };
  if (!config.configured) return { code: "R2_NOT_CONFIGURED", cleanup: empty };
  const listing = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/media_cleanup_jobs_v198?storage_bucket=eq.r2&status=eq.PENDING&completed_at=is.null&select=id,object_path,attempts&order=created_at.asc&limit=${limit}`,
    { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) },
  ).catch(() => null);
  if (!listing?.ok) return { code: "R2_CLEANUP_LIST_FAILED", cleanup: empty };
  const jobs = await listing.json().catch(() => []) as CleanupJob[];
  let completed = 0;
  let pending = 0;
  for (const job of Array.isArray(jobs) ? jobs : []) {
    const attempts = Math.max(0, Number(job.attempts || 0)) + 1;
    const now = new Date().toISOString();
    try {
      if (!isSafeStem(job.object_path)) throw new Error("INVALID_R2_KEY");
      if (await isReferenced(R2_STORAGE_BUCKET, job.object_path)) {
        await patchJob(job.id, { status: "COMPLETED", attempts, last_error: "STILL_REFERENCED_SKIPPED", completed_at: now, updated_at: now });
        completed++;
        continue;
      }
      const result = await deleteStem(config, job.object_path);
      if (!result.ok) throw new Error(`R2_DELETE_${result.status}`);
      await patchJob(job.id, { status: "COMPLETED", attempts, last_error: null, completed_at: now, updated_at: now });
      completed++;
    } catch (error) {
      await patchJob(job.id, { status: "PENDING", attempts, last_error: (error instanceof Error ? error.message : "R2_DELETE_FAILED").slice(0, 500), updated_at: now }).catch(() => undefined);
      pending++;
    }
  }
  return { cleanup: { attempted: Array.isArray(jobs) ? jobs.length : 0, completed, pending } };
}

export function mediaConfigPayload(provider: MediaProvider = resolveMediaProvider()): Json {
  if (provider === "r2") return { provider, publicBaseUrl: r2Config().publicBaseUrl, widths: [...R2_IMAGE_WIDTHS] };
  if (provider === "cloudinary") return { provider, cloudName: cloudinaryConfig().cloudName };
  return { provider };
}

export async function mediaUpload(request: Request): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return reply(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const input = await readBody(request);
    const action = String(input["action"] || "").trim().toUpperCase();
    const provider = resolveMediaProvider();
    if (action === "CONFIG") return reply(request, { ok: true, ...mediaConfigPayload(provider) });
    const actor = await verifyActor(request);
    if (action === "SIGN_UPLOAD") {
      if (provider === "supabase") throw new HttpError("MEDIA_PROVIDER_NOT_CONFIGURED", 503);
      const target = targetFrom(input);
      await authorize(actor, target.authz);
      // Validate + sign locally first (free), then reserve quota; nothing is released unless the guard allows it.
      const signed = provider === "r2" ? signR2(target, input) : signCloudinary(target, input);
      const decision = await reserveUpload({ userId: actor.userId, provider, ...reservationBytes(provider, input) }, {
        rpc: serviceRpc,
        measureR2: provider === "r2" ? () => measureBucket(r2Config()) : undefined,
      });
      if (!decision.ok) throw new HttpError(decision.code, decision.status, decision.retryAfterSeconds ? { retryAfterSeconds: decision.retryAfterSeconds } : {});
      return reply(request, { ok: true, ...signed });
    }
    if (action === "DESTROY") return reply(request, { ok: true, ...(await destroy(actor, input)) });
    if (action === "DRAIN_CLEANUP") {
      if (!actor.content && !actor.ops) throw new HttpError("FORBIDDEN", 403);
      const limit = Math.max(1, Math.min(25, Math.trunc(Number(input["limit"] || 10)) || 10));
      const r2 = r2Config().configured ? await drainR2(limit) : null;
      const cloudinary = cloudinaryConfig().configured ? await drainCloudinaryCleanup(limit) : null;
      const sum = (key: "attempted" | "completed" | "pending") => (r2?.cleanup[key] || 0) + (cloudinary?.cleanup[key] || 0);
      return reply(request, { ok: true, cleanup: { attempted: sum("attempted"), completed: sum("completed"), pending: sum("pending") }, r2: r2?.code || null, cloudinary: cloudinary?.code || null });
    }
    return reply(request, { ok: false, code: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    if (error instanceof HttpError) return reply(request, { ok: false, code: error.code, ...error.extra }, error.status);
    const code = error instanceof Error ? error.message : "MEDIA_UPLOAD_FAILED";
    console.error("media-upload-v252", code);
    return reply(request, { ok: false, code: "MEDIA_UPLOAD_FAILED" }, 500);
  }
}
