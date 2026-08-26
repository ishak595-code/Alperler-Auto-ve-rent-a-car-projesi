import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY_BYTES = 128 * 1024;
const ALLOWED_ORIGINS = new Set(
  [
    Deno.env.get("PUBLIC_SITE_URL") || "",
    "https://alperlerrentaacar.com",
    "https://www.alperlerrentaacar.com",
  ]
    .map((value) => { try { return new URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);

type JsonObject = Record<string, unknown>;
type AdminIdentity = { id: string; email: string; role: string; permissions: Record<string, unknown> };

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
  } catch {
    return "";
  }
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
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
  };
}

async function rest(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: serviceHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
}

function normalizedRpcError(payload: any, status: number, name: string): string {
  const raw = clean(payload?.message || payload?.details || payload?.code, 1000);
  for (const prefix of ["VEHICLE_PUBLICATION_BLOCKED:", "TOUR_PUBLICATION_BLOCKED:"]) {
    const at = raw.indexOf(prefix);
    if (at >= 0) return raw.slice(at).split(/\s/)[0].slice(0, 300);
  }
  for (const code of [
    "CONTENT_PERMISSION_REQUIRED",
    "INVALID_MEDIA_SUMMARY_REQUEST",
    "INVALID_VEHICLE_CATEGORY",
    "INVALID_PUBLICATION_STATUS",
    "INVALID_RECORD_ORIGIN",
    "INVALID_DATA_QUALITY_STATUS",
    "INVALID_CATALOG_PAYLOAD",
    "INVALID_CATALOG_FIELD_VALUE",
    "VEHICLE_NOT_FOUND",
    "TOUR_NOT_FOUND",
  ]) if (raw.includes(code)) return code;
  if (status === 401 || status === 403) return "FORBIDDEN";
  return `${name.toUpperCase()}_FAILED`;
}

async function rpc<T = unknown>(name: string, body: JsonObject): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(normalizedRpcError(payload, response.status, name));
  return payload as T;
}

async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
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
  if (!(role === "owner" || role === "admin" || role === "editor" || permissions["content.manage"] === true)) throw new Error("FORBIDDEN");
  return { id, email, role, permissions };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(admin: AdminIdentity, scope: string, limit: number): Promise<void> {
  const allowed = await rpc<boolean>("consume_rate_limit", {
    p_key_hash: await sha256(`${scope}:${admin.id}`),
    p_scope: scope,
    p_window_seconds: 60,
    p_limit: limit,
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

function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN" || code === "CONTENT_PERMISSION_REQUIRED") return 403;
  if (code === "RATE_LIMITED") return 429;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  if (code === "VEHICLE_NOT_FOUND" || code === "TOUR_NOT_FOUND") return 404;
  if (code.startsWith("VEHICLE_PUBLICATION_BLOCKED:") || code.startsWith("TOUR_PUBLICATION_BLOCKED:")) return 409;
  if (code.startsWith("INVALID_") || code === "UNKNOWN_ACTION" || code === "UNKNOWN_VIEW") return 400;
  return 500;
}

Deno.serve(async (request: Request) => {
  const id = requestId(request);
  const origin = resolveOrigin(request);
  if (origin.supplied && !origin.allowed) return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, id);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin.allowed) });
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (!["GET", "POST", "PATCH"].includes(request.method)) return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);

  try {
    const admin = await requireAdmin(request);
    if (request.method === "GET") {
      await enforceRateLimit(admin, "catalog-admin-read-v184", 120);
      const url = new URL(request.url);
      const view = clean(url.searchParams.get("view"), 40).toLowerCase() || "snapshot";
      if (view === "snapshot") {
        const data = await rpc<JsonObject>("service_catalog_admin_snapshot_v184", { p_actor: admin.id });
        return json(request, { ok: true, data }, 200, id);
      }
      if (view === "media-summary") {
        const kind = clean(url.searchParams.get("kind"), 20).toUpperCase();
        const entityId = uuid(url.searchParams.get("id"));
        if (!["VEHICLE", "TOUR"].includes(kind) || !entityId) return json(request, { ok: false, code: "INVALID_MEDIA_SUMMARY_REQUEST" }, 400, id);
        const data = await rpc<JsonObject>("service_catalog_media_summary_v184", { p_actor: admin.id, p_kind: kind, p_id: entityId });
        return json(request, { ok: true, data }, 200, id);
      }
      return json(request, { ok: false, code: "UNKNOWN_VIEW" }, 400, id);
    }

    await enforceRateLimit(admin, "catalog-admin-write-v184", 30);
    const input = await readBody(request);
    const action = clean(input["action"], 50).toUpperCase();

    if (request.method === "POST" && action === "CREATE_VEHICLE") {
      const category = clean(input["category"], 20).toUpperCase();
      if (!["RENTAL", "SALE"].includes(category)) return json(request, { ok: false, code: "INVALID_VEHICLE_CATEGORY" }, 400, id);
      const record = await rpc<JsonObject>("service_create_catalog_vehicle_v184", { p_actor: admin.id, p_category: category });
      return json(request, { ok: true, record }, 201, id);
    }
    if (request.method === "POST" && action === "CREATE_TOUR") {
      const record = await rpc<JsonObject>("service_create_catalog_tour_v184", { p_actor: admin.id });
      return json(request, { ok: true, record }, 201, id);
    }
    if (request.method === "PATCH" && action === "SAVE_VEHICLE") {
      const entityId = uuid(input["id"]);
      const payload = input["payload"];
      if (!entityId || !payload || typeof payload !== "object" || Array.isArray(payload)) return json(request, { ok: false, code: "INVALID_CATALOG_PAYLOAD" }, 400, id);
      const record = await rpc<JsonObject>("service_save_catalog_vehicle_v184", { p_actor: admin.id, p_id: entityId, p_payload: payload as JsonObject });
      return json(request, { ok: true, record }, 200, id);
    }
    if (request.method === "PATCH" && action === "SAVE_TOUR") {
      const entityId = uuid(input["id"]);
      const payload = input["payload"];
      if (!entityId || !payload || typeof payload !== "object" || Array.isArray(payload)) return json(request, { ok: false, code: "INVALID_CATALOG_PAYLOAD" }, 400, id);
      const record = await rpc<JsonObject>("service_save_catalog_tour_v184", { p_actor: admin.id, p_id: entityId, p_payload: payload as JsonObject });
      return json(request, { ok: true, record }, 200, id);
    }

    return json(request, { ok: false, code: "UNKNOWN_ACTION" }, 400, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "CATALOG_ADMIN_FAILED";
    console.error("catalog-admin-gateway-v184", id, code);
    return json(request, { ok: false, code }, statusFor(code), id);
  }
});
