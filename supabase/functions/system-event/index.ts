import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PUBLISHABLE_KEY = Deno.env.get("PUBLIC_SUPABASE_PUBLISHABLE_KEY") || "sb_publishable_Xecd7WNvJrZe1VymygJmMA_ceiMCleW";
const CLIENT_MARKER = "alperler-web-v1";
const ALLOWED_SEVERITIES = new Set(["INFO", "WARN", "ERROR", "CRITICAL"]);
const ALLOWED_DETAILS = new Set([
  "component", "online", "chunk", "failedResources", "emptyResources",
  "status", "provider", "state", "method", "networkState",
]);

type JsonObject = Record<string, unknown>;

function serviceHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
  };
}

async function rpc<T>(name: string, body: JsonObject): Promise<T> {
  const response = await fetch(`${URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`RPC_${name}_${response.status}:${detail.slice(0, 200)}`);
  }
  return await response.json() as T;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function redact(value: unknown, max: number): string {
  const text = clean(value, max);
  if (!text) return "";
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[payment-data]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[token]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
    .replace(/([?&](?:token|key|secret|password|email|phone)=)[^&#\s]*/gi, "$1[redacted]");
}

function safeRoute(value: unknown): string | null {
  const route = clean(value, 400).split("?")[0].split("#")[0];
  return route.startsWith("/") && !route.startsWith("//") ? route : null;
}

function safeDetails(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: JsonObject = {};
  for (const [key, raw] of Object.entries(value as JsonObject)) {
    if (!ALLOWED_DETAILS.has(key)) continue;
    if (typeof raw === "string") out[key] = redact(raw, 500);
    else if (typeof raw === "boolean") out[key] = raw;
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }
  return out;
}

async function digest(value: string): Promise<string> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(raw)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rateAllowed(request: Request): Promise<boolean> {
  const ip = clean(
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown",
    100,
  );
  const userAgent = clean(request.headers.get("user-agent"), 600);
  const keyHash = await digest(`${SERVICE_KEY.slice(0, 32)}|${ip}|${userAgent}`);
  return Boolean(await rpc<boolean>("consume_rate_limit", {
    p_key_hash: keyHash,
    p_scope: "system_event_network",
    p_window_seconds: 60,
    p_limit: 30,
  }));
}

function originFor(request: Request): string {
  const origin = request.headers.get("origin") || "";
  if (!origin) return "*";
  try {
    const parsed = new globalThis.URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "https:" || host === "localhost" || host === "127.0.0.1") return origin;
  } catch { /* invalid origin */ }
  return "null";
}

function cors(request: Request): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": originFor(request),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, apikey, x-alperler-client",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: cors(request) });
}

function authorizedClient(request: Request): boolean {
  return request.headers.get("apikey") === PUBLISHABLE_KEY && request.headers.get("x-alperler-client") === CLIENT_MARKER;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (!authorizedClient(request)) return json(request, { ok: false, code: "CLIENT_NOT_ALLOWED" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 16_000) return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

  try {
    if (!(await rateAllowed(request))) return json(request, { ok: false, code: "RATE_LIMITED" }, 429);

    const parsed = await request.json().catch(() => null) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(request, { ok: false, code: "INVALID_BODY" }, 400);
    const body = parsed as JsonObject;

    const severity = clean(body["severity"], 16).toUpperCase();
    const source = clean(body["source"], 80);
    const code = clean(body["code"], 120).toUpperCase();
    const message = redact(body["message"], 700);
    const route = safeRoute(body["route"]);
    const recoveryAction = redact(body["recoveryAction"], 120) || null;
    const releaseSha = clean(body["releaseSha"], 120) || null;
    const clientFamily = redact(body["clientFamily"], 120) || null;

    if (!ALLOWED_SEVERITIES.has(severity)) return json(request, { ok: false, code: "INVALID_SEVERITY" }, 400);
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(source)) return json(request, { ok: false, code: "INVALID_SOURCE" }, 400);
    if (!/^[A-Z0-9_.:-]{1,120}$/.test(code)) return json(request, { ok: false, code: "INVALID_CODE" }, 400);
    if (!message) return json(request, { ok: false, code: "INVALID_MESSAGE" }, 400);

    const id = await rpc<number>("ingest_system_event", {
      p_severity: severity,
      p_source: source,
      p_code: code,
      p_message: message,
      p_route: route,
      p_auto_recovered: body["autoRecovered"] === true,
      p_recovery_action: recoveryAction,
      p_release_sha: releaseSha,
      p_client_family: clientFamily,
      p_details: safeDetails(body["details"]),
    });

    return json(request, { ok: true, id: Number(id) }, 202);
  } catch (error) {
    console.error("system-event failed", error);
    return json(request, { ok: false, code: "SYSTEM_EVENT_FAILED" }, 500);
  }
});
