import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_ORIGINS = new Set([
  Deno.env.get("PUBLIC_SITE_URL") || "",
  "https://alperlerrentaacar.com",
  "https://www.alperlerrentaacar.com",
].map((value) => { try { return new URL(value).origin; } catch { return ""; } }).filter(Boolean));

type Json = Record<string, unknown>;
type Actor = { id: string; email: string };

function clean(value: unknown, max = 240): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function uuid(value: unknown): string { const v = clean(value, 80); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : ""; }
function allowedOrigin(value: string): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:","https:"].includes(parsed.protocol)) return parsed.origin;
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") return parsed.origin;
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch { return ""; }
}
function originState(request: Request) {
  const supplied = clean(request.headers.get("origin") || request.headers.get("x-app-origin"), 500);
  return { supplied: Boolean(supplied), allowed: allowedOrigin(supplied) };
}
function headers(request: Request): HeadersInit {
  const origin = originState(request).allowed;
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id,x-app-origin",
    "cache-control": "private, no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    vary: "Origin",
  };
}
function json(request: Request, body: unknown, status = 200): Response { return Response.json(body, { status, headers: headers(request) }); }
function serviceHeaders(): Record<string,string> { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" }; }
async function rpc<T>(name: string, body: Json): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: serviceHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = clean((payload as any)?.message || (payload as any)?.details || (payload as any)?.code, 600);
    for (const code of ["ANALYTICS_READ_PERMISSION_REQUIRED","ANALYTICS_MANAGE_PERMISSION_REQUIRED","ANALYTICS_SESSION_REQUIRED","UNKNOWN_ANALYTICS_VIEW"]) if (raw.includes(code)) throw new Error(code);
    throw new Error("ANALYTICS_RPC_FAILED");
  }
  return payload as T;
}
async function requireActor(request: Request): Promise<Actor> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, authorization }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const user = await response.json().catch(() => ({}));
  const id = uuid(user?.id), email = clean(user?.email, 180).toLowerCase();
  if (!id || !email) throw new Error("UNAUTHORIZED");
  const adminResponse = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id&limit=1`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) });
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json().catch(() => []);
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
  return { id, email };
}
async function sha256(value: string): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2,"0")).join(""); }
async function rateLimit(actor: Actor, view: string): Promise<void> {
  const limit = view === "PURGE" ? 6 : 120;
  const ok = await rpc<boolean>("consume_rate_limit", { p_key_hash: await sha256(`analytics-v186:${view}:${actor.id}`), p_scope: view === "PURGE" ? "analytics-admin-write-v186" : "analytics-admin-read-v186", p_window_seconds: 60, p_limit: limit });
  if (ok !== true) throw new Error("RATE_LIMITED");
}
async function body(request: Request): Promise<Json> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const parsed = JSON.parse(raw || "null");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
  return parsed as Json;
}
function status(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (["FORBIDDEN","ANALYTICS_READ_PERMISSION_REQUIRED","ANALYTICS_MANAGE_PERMISSION_REQUIRED"].includes(code)) return 403;
  if (code === "RATE_LIMITED") return 429;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  if (["INVALID_JSON","ANALYTICS_SESSION_REQUIRED","UNKNOWN_ANALYTICS_VIEW"].includes(code)) return 400;
  return 500;
}

Deno.serve(async (request) => {
  const origin = originState(request);
  if (origin.supplied && !origin.allowed) return json(request, { ok:false, code:"ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status:204, headers:headers(request) });
  if (request.method !== "POST") return json(request, { ok:false, code:"METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok:false, code:"SERVER_CONFIG_MISSING" }, 503);
  try {
    const actor = await requireActor(request);
    const input = await body(request);
    const view = clean(input["view"], 40).toUpperCase();
    await rateLimit(actor, view);
    const sessionId = input["sessionId"] == null ? null : uuid(input["sessionId"]);
    const result = await rpc<unknown>("service_analytics_query_v186", {
      p_actor: actor.id,
      p_view: view,
      p_days: Number(input["days"] ?? 7),
      p_limit: Number(input["limit"] ?? 100),
      p_session_id: sessionId || null,
      p_event_days: Number(input["eventDays"] ?? 180),
      p_raw_ip_days: Number(input["rawIpDays"] ?? 30),
    });
    return json(request, { ok:true, data:result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ANALYTICS_ADMIN_FAILED";
    console.error("analytics-admin-v186", code);
    return json(request, { ok:false, code }, status(code));
  }
});