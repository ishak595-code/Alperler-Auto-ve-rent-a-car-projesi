import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_ORIGINS = new Set(
  [Deno.env.get("PUBLIC_SITE_URL") || ""]
    .map((value) => { try { return new URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);

type JsonObject = Record<string, unknown>;
type AdminIdentity = { id: string; email: string; role: string; permissions: Record<string, unknown> };
type CleanupJob = { id: string; storage_bucket: string; object_path: string; attempts?: number };
type CleanupSummary = { attempted: number; completed: number; pending: number };

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function uuid(value: unknown): string {
  const text = clean(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}
function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}
function allowedOriginValue(value: string): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:", "https:"].includes(parsed.protocol)) return parsed.origin;
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") return parsed.origin;
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch { return ""; }
}
function resolveOrigin(request: Request): { supplied: boolean; allowed: string } {
  const browserOrigin = clean(request.headers.get("origin"), 500);
  const appOrigin = clean(request.headers.get("x-app-origin"), 500);
  if (browserOrigin) return { supplied: true, allowed: allowedOriginValue(browserOrigin) };
  if (appOrigin) return { supplied: true, allowed: allowedOriginValue(appOrigin) };
  return { supplied: false, allowed: "" };
}
function cors(origin: string): Record<string, string> {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id,x-app-origin",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
function json(request: Request, body: unknown, status = 200, id = requestId(request)): Response {
  return Response.json(body, {
    status,
    headers: {
      ...cors(resolveOrigin(request).allowed),
      "cache-control": "private, no-store, max-age=0",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
    },
  });
}
function serviceHeaders(): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" };
}
async function rest(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: serviceHeaders(), signal: AbortSignal.timeout(10_000) });
}
async function restPatch(path: string, body: JsonObject): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(), prefer: "return=minimal" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`MEDIA_CLEANUP_STATE_${response.status}`);
}
function normalizedRpcError(payload: any, status: number, name: string): string {
  const raw = clean(payload?.message || payload?.details || payload?.code, 1200);
  for (const code of [
    "CONTENT_PERMISSION_REQUIRED","INVALID_MEDIA_OWNER","INVALID_MEDIA_PAYLOAD","INVALID_MEDIA_KIND",
    "INVALID_MEDIA_STORAGE","INVALID_STORAGE_OBJECT","INVALID_STORAGE_PREFIX","STORAGE_OBJECT_OWNERSHIP_REQUIRED",
    "INVALID_MEDIA_FIELD_VALUE","INVALID_MEDIA_ASSET_PAYLOAD","INVALID_MEDIA_ASSET_STORAGE",
    "CATALOG_MEDIA_NOT_FOUND","CATALOG_MEDIA_OWNER_MISSING","CATALOG_COVER_REQUIRES_ACTIVE_IMAGE",
    "CATALOG_LIVE_LAST_IMAGE_BLOCKED","CATALOG_LIVE_COVER_CHANGE_REQUIRES_REPLACEMENT","USE_SET_COVER_ACTION",
    "MEDIA_SOURCE_MUST_BE_HTTPS","VEHICLE_NOT_FOUND","TOUR_NOT_FOUND","BLOG_NOT_FOUND",
  ]) if (raw.includes(code)) return code;
  if (status === 401 || status === 403) return "FORBIDDEN";
  return `${name.toUpperCase()}_FAILED`;
}
async function rpc<T = unknown>(name: string, body: JsonObject): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST", headers: serviceHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(normalizedRpcError(payload, response.status, name));
  return payload as T;
}
async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization }, signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json().catch(() => ({}));
  const id = uuid(user?.id);
  const email = clean(user?.email, 180).toLowerCase();
  if (!id || !email) throw new Error("UNAUTHORIZED");
  const adminResponse = await rest(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const row = (await adminResponse.json().catch(() => []))?.[0];
  if (!row) throw new Error("FORBIDDEN");
  const permissions = row.permissions && typeof row.permissions === "object" ? row.permissions as Record<string, unknown> : {};
  const role = clean(row.role, 30).toLowerCase();
  const allowed = role === "owner" || role === "admin" || permissions["content.manage"] === true || permissions["settings.manage"] === true;
  if (!allowed) throw new Error("FORBIDDEN");
  return { id, email, role, permissions };
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function enforceRateLimit(admin: AdminIdentity, scope: string, limit: number): Promise<void> {
  const allowed = await rpc<boolean>("consume_rate_limit", {
    p_key_hash: await sha256(`${scope}:${admin.id}`), p_scope: scope, p_window_seconds: 60, p_limit: limit,
  });
  if (allowed !== true) throw new Error("RATE_LIMITED");
}
async function readBody(request: Request): Promise<JsonObject> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed as JsonObject;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") throw error;
    throw new Error("INVALID_JSON");
  }
}
async function drainMediaCleanup(limit = 20): Promise<CleanupSummary> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const response = await rest(`media_cleanup_jobs_v198?status=eq.PENDING&completed_at=is.null&select=id,storage_bucket,object_path,attempts&order=created_at.asc&limit=${safeLimit}`);
  if (!response.ok) throw new Error(`MEDIA_CLEANUP_LIST_${response.status}`);
  const jobs = await response.json().catch(() => []) as CleanupJob[];
  let completed = 0;
  let pending = 0;

  for (const job of jobs) {
    const bucket = clean(job.storage_bucket, 100);
    const objectPath = clean(job.object_path, 1200);
    const attempts = Math.max(0, Number(job.attempts || 0)) + 1;
    if (bucket !== "catalog-media" || !objectPath) {
      await restPatch(`media_cleanup_jobs_v198?id=eq.${encodeURIComponent(job.id)}`, {
        attempts, last_error: "INVALID_CLEANUP_JOB", updated_at: new Date().toISOString(),
      });
      pending++;
      continue;
    }

    try {
      const removed = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}`, {
        method: "DELETE",
        headers: serviceHeaders(),
        body: JSON.stringify({ prefixes: [objectPath] }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!removed.ok && removed.status !== 404) throw new Error(`STORAGE_DELETE_${removed.status}`);
      await restPatch(`media_cleanup_jobs_v198?id=eq.${encodeURIComponent(job.id)}`, {
        status: "COMPLETED", attempts, last_error: null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
      completed++;
    } catch (error) {
      await restPatch(`media_cleanup_jobs_v198?id=eq.${encodeURIComponent(job.id)}`, {
        status: "PENDING", attempts, last_error: clean(error instanceof Error ? error.message : "STORAGE_DELETE_FAILED", 500), updated_at: new Date().toISOString(),
      });
      pending++;
    }
  }

  return { attempted: jobs.length, completed, pending };
}
function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN" || code === "CONTENT_PERMISSION_REQUIRED" || code === "STORAGE_OBJECT_OWNERSHIP_REQUIRED") return 403;
  if (code === "RATE_LIMITED") return 429;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  if (["CATALOG_MEDIA_NOT_FOUND","VEHICLE_NOT_FOUND","TOUR_NOT_FOUND","BLOG_NOT_FOUND"].includes(code)) return 404;
  if (["CATALOG_LIVE_LAST_IMAGE_BLOCKED","CATALOG_LIVE_COVER_CHANGE_REQUIRES_REPLACEMENT"].includes(code)) return 409;
  if (code.startsWith("INVALID_") || code === "USE_SET_COVER_ACTION" || code === "MEDIA_SOURCE_MUST_BE_HTTPS" || code === "CATALOG_COVER_REQUIRES_ACTIVE_IMAGE" || code === "UNKNOWN_ACTION") return 400;
  return 500;
}

Deno.serve(async (request: Request) => {
  const id = requestId(request);
  const origin = resolveOrigin(request);
  if (origin.supplied && !origin.allowed) return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, id);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin.allowed) });
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (!["GET","POST","PATCH"].includes(request.method)) return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);

  try {
    const admin = await requireAdmin(request);
    if (request.method === "GET") {
      await enforceRateLimit(admin,"media-control-read-v185",120);
      await drainMediaCleanup(10).catch((error) => console.error("media-cleanup-background-v198", id, error));
      const url = new URL(request.url);
      const entityType = clean(url.searchParams.get("entityType"),20).toUpperCase();
      const entityId = uuid(url.searchParams.get("entityId"));
      if ((entityType && !["VEHICLE","TOUR","BLOG"].includes(entityType)) || (entityType && !entityId)) {
        return json(request,{ ok:false, code:"INVALID_MEDIA_OWNER" },400,id);
      }
      const records = await rpc<unknown[]>("service_catalog_media_list_v185", {
        p_actor: admin.id, p_entity_type: entityType || null, p_entity_id: entityId || null,
      });
      return json(request,{ ok:true, records },200,id);
    }

    await enforceRateLimit(admin,"media-control-write-v185",60);
    const input = await readBody(request);
    const action = clean(input["action"],60).toUpperCase();

    if (request.method === "POST" && action === "CREATE_CATALOG_MEDIA") {
      const entityType = clean(input["entityType"],20).toUpperCase();
      const entityId = uuid(input["entityId"]);
      const payload = input["payload"];
      if (!["VEHICLE","TOUR","BLOG"].includes(entityType) || !entityId || !payload || typeof payload !== "object" || Array.isArray(payload)) return json(request,{ok:false,code:"INVALID_MEDIA_PAYLOAD"},400,id);
      const record = await rpc<JsonObject>("service_catalog_media_create_v185",{p_actor:admin.id,p_entity_type:entityType,p_entity_id:entityId,p_payload:payload as JsonObject});
      return json(request,{ok:true,record},201,id);
    }
    if (request.method === "PATCH" && action === "UPDATE_CATALOG_MEDIA") {
      const mediaId = uuid(input["mediaId"]); const payload=input["payload"];
      if (!mediaId || !payload || typeof payload !== "object" || Array.isArray(payload)) return json(request,{ok:false,code:"INVALID_MEDIA_PAYLOAD"},400,id);
      const record = await rpc<JsonObject>("service_catalog_media_update_v185",{p_actor:admin.id,p_media_id:mediaId,p_payload:payload as JsonObject});
      return json(request,{ok:true,record},200,id);
    }
    if (request.method === "PATCH" && action === "SET_CATALOG_COVER") {
      const mediaId=uuid(input["mediaId"]); if(!mediaId)return json(request,{ok:false,code:"INVALID_MEDIA_PAYLOAD"},400,id);
      const record=await rpc<JsonObject>("service_catalog_media_set_cover_v185",{p_actor:admin.id,p_media_id:mediaId});
      return json(request,{ok:true,record},200,id);
    }
    if (request.method === "POST" && action === "REMOVE_CATALOG_MEDIA") {
      const mediaId=uuid(input["mediaId"]); if(!mediaId)return json(request,{ok:false,code:"INVALID_MEDIA_PAYLOAD"},400,id);
      const result=await rpc<JsonObject>("service_catalog_media_remove_v185",{p_actor:admin.id,p_media_id:mediaId});
      const cleanup=await drainMediaCleanup(20);
      return json(request,{ok:true,result,cleanup},200,id);
    }
    if (request.method === "POST" && action === "REGISTER_MEDIA_ASSET") {
      const payload=input["payload"];
      if(!payload||typeof payload!=="object"||Array.isArray(payload))return json(request,{ok:false,code:"INVALID_MEDIA_ASSET_PAYLOAD"},400,id);
      const record=await rpc<JsonObject>("service_register_media_asset_v185",{p_actor:admin.id,p_payload:payload as JsonObject});
      return json(request,{ok:true,record},201,id);
    }
    if (request.method === "POST" && action === "DRAIN_MEDIA_CLEANUP") {
      const cleanup=await drainMediaCleanup(Number(input["limit"]||30));
      return json(request,{ok:true,cleanup},200,id);
    }
    return json(request,{ok:false,code:"UNKNOWN_ACTION"},400,id);
  } catch (error) {
    const code=error instanceof Error?error.message:"MEDIA_CONTROL_FAILED";
    console.error("media-control-admin-v185",id,code);
    return json(request,{ok:false,code},statusFor(code),id);
  }
});