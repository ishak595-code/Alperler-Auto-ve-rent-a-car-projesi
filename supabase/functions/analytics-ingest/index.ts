import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const EVENT_TYPES = new Set(["session_start","page_view","click","rage_click","scroll_depth","form_start","form_submit","form_abandon","js_error","unhandled_rejection","session_end"]);
const ALLOWED_META = new Set(["href","section","component","statusCode","durationMs","reason","routeFrom","routeTo","networkState","pointerType"]);

type JsonObject = Record<string, unknown>;
interface SanitizedEvent {
  id: string;
  type: string;
  path: string;
  pageTitle: string;
  event: JsonObject;
}

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
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`RPC_${name}_${response.status}:${detail.slice(0, 240)}`);
  }
  return await response.json() as T;
}

function originFor(request: Request): string {
  const origin = request.headers.get("origin") || "";
  if (!origin) return "*";
  try {
    const parsed = new globalThis.URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === "https:" || host === "localhost" || host === "127.0.0.1") return origin;
  } catch { /* reject */ }
  return "null";
}

function cors(request: Request): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": originFor(request),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(request) });
}
function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function uuid(value: unknown): string {
  const v = clean(value, 64);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : "";
}
function safeNumber(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null;
}
function redactText(value: unknown, max: number): string {
  const text = clean(value, max);
  if (!text) return "";
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?90|0)?\s*5\d{2}(?:[\s.-]*\d{3}){2,3}/g, "[phone]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[payment-data]");
}
async function digest(value: string): Promise<string> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(raw)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function rate(hash: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  return Boolean(await rpc<boolean>("consume_rate_limit", {
    p_key_hash: hash,
    p_scope: scope,
    p_window_seconds: seconds,
    p_limit: limit,
  }));
}
function sanitizeMetadata(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as JsonObject;
  const out: JsonObject = {};
  for (const [key, raw] of Object.entries(source)) {
    if (!ALLOWED_META.has(key)) continue;
    if (typeof raw === "string") out[key] = redactText(raw, 300);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
    else if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}
function sanitizeEvent(raw: unknown): SanitizedEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as JsonObject;
  const type = clean(row["type"], 40);
  const id = uuid(row["id"]);
  if (!id || !EVENT_TYPES.has(type)) return null;
  const eventCandidate = row["event"];
  const eventRaw: JsonObject = eventCandidate && typeof eventCandidate === "object" && !Array.isArray(eventCandidate)
    ? eventCandidate as JsonObject
    : {};
  return {
    id,
    type,
    path: clean(row["path"], 500) || "/",
    pageTitle: redactText(row["pageTitle"], 300),
    event: {
      elementKey: clean(eventRaw["elementKey"], 200),
      elementLabel: redactText(eventRaw["elementLabel"], 180),
      elementRole: clean(eventRaw["elementRole"], 80),
      scrollDepth: safeNumber(eventRaw["scrollDepth"], 0, 100),
      funnelName: clean(eventRaw["funnelName"], 120),
      funnelStep: clean(eventRaw["funnelStep"], 120),
      errorMessage: redactText(eventRaw["errorMessage"], 900),
      metadata: sanitizeMetadata(eventRaw["metadata"]),
    },
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 32_000) return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

  try {
    const parsed = await request.json().catch(() => null) as unknown;
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : null;
    if (!body || body["analyticsConsent"] !== true) return json(request, { ok: false, code: "ANALYTICS_CONSENT_REQUIRED" }, 403);

    const sessionId = uuid(body["sessionId"]);
    const visitorId = uuid(body["visitorId"]);
    if (!sessionId || !visitorId) return json(request, { ok: false, code: "INVALID_SESSION" }, 400);

    const sourceEvents = Array.isArray(body["events"]) ? body["events"] as unknown[] : [];
    if (sourceEvents.length < 1 || sourceEvents.length > 25) return json(request, { ok: false, code: "INVALID_BATCH" }, 400);
    const events: SanitizedEvent[] = [];
    for (const sourceEvent of sourceEvents) {
      const event = sanitizeEvent(sourceEvent);
      if (!event) return json(request, { ok: false, code: "INVALID_EVENT" }, 400);
      events.push(event);
    }

    const ip = clean(
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      "",
      100,
    );
    const ua = clean(request.headers.get("user-agent"), 1000);
    const networkHash = await digest(`${ip}|${ua}`);
    if (!(await rate(networkHash, "analytics_network", 60, 120))) return json(request, { ok: false, code: "RATE_LIMITED" }, 429);

    const contextCandidate = body["context"];
    const contextRaw: JsonObject = contextCandidate && typeof contextCandidate === "object" && !Array.isArray(contextCandidate)
      ? contextCandidate as JsonObject
      : {};
    const deviceTypeRaw = clean(contextRaw["deviceType"], 20);
    const context: JsonObject = {
      analyticsConsent: true,
      consentVersion: clean(contextRaw["consentVersion"], 40) || "kvkk-v1",
      landingPath: clean(contextRaw["landingPath"], 500) || "/",
      referrer: clean(contextRaw["referrer"], 1000),
      utmSource: clean(contextRaw["utmSource"], 200),
      utmMedium: clean(contextRaw["utmMedium"], 200),
      utmCampaign: clean(contextRaw["utmCampaign"], 200),
      locale: clean(contextRaw["locale"], 40),
      timezone: clean(contextRaw["timezone"], 100),
      deviceType: ["mobile", "tablet", "desktop"].includes(deviceTypeRaw) ? deviceTypeRaw : "unknown",
      deviceModel: clean(contextRaw["deviceModel"], 120),
      osName: clean(contextRaw["osName"], 80),
      osVersion: clean(contextRaw["osVersion"], 80),
      browserName: clean(contextRaw["browserName"], 80),
      browserVersion: clean(contextRaw["browserVersion"], 80),
      screenWidth: safeNumber(contextRaw["screenWidth"], 0, 20000),
      screenHeight: safeNumber(contextRaw["screenHeight"], 0, 20000),
      viewportWidth: safeNumber(contextRaw["viewportWidth"], 0, 20000),
      viewportHeight: safeNumber(contextRaw["viewportHeight"], 0, 20000),
      dnt: contextRaw["dnt"] === true,
    };
    const geo: JsonObject = {
      country: clean(request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country"), 8),
      region: clean(request.headers.get("cf-region") || request.headers.get("x-vercel-ip-country-region"), 80),
      city: clean(request.headers.get("cf-ipcity") || request.headers.get("x-vercel-ip-city"), 160),
      postalCode: clean(request.headers.get("cf-postal-code") || request.headers.get("x-vercel-ip-postal-code"), 40),
      latitude: clean(request.headers.get("cf-iplatitude") || request.headers.get("x-vercel-ip-latitude"), 30),
      longitude: clean(request.headers.get("cf-iplongitude") || request.headers.get("x-vercel-ip-longitude"), 30),
      timezone: clean(request.headers.get("cf-timezone") || request.headers.get("x-vercel-ip-timezone"), 100),
    };
    const requestHeaders: JsonObject = {
      userAgent: ua,
      acceptLanguage: clean(request.headers.get("accept-language"), 300),
      host: clean(request.headers.get("host"), 255),
      forwardedProto: clean(request.headers.get("x-forwarded-proto"), 20),
      vercelId: clean(request.headers.get("x-vercel-id"), 200),
    };

    const accepted = await rpc<number>("ingest_analytics_batch", {
      p_session_id: sessionId,
      p_visitor_id: visitorId,
      p_network_hash: networkHash,
      p_ip_address: ip || null,
      p_geo: geo,
      p_headers: requestHeaders,
      p_context: context,
      p_events: events,
    });
    return json(request, { ok: true, accepted: Number(accepted || 0) }, 202);
  } catch (error) {
    console.error("analytics-ingest failed", error);
    return json(request, { ok: false, code: "ANALYTICS_FAILED" }, 500);
  }
});
