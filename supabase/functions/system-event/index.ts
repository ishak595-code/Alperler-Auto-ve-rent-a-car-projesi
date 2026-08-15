import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY = 12_000;

function json(body: unknown, status = 200, origin = "") {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "POST, OPTIONS";
    headers["access-control-allow-headers"] = "content-type";
    headers["vary"] = "Origin";
  }
  return Response.json(body, { status, headers });
}

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") || "";
  if (!origin) return "";
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1") return "";
    if (
      host === "alperrentacar.online" ||
      host === "www.alperrentacar.online" ||
      host.endsWith(".vercel.app") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) return origin;
  } catch {
    return "";
  }
  return "";
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sanitizeMessage(value: unknown): string {
  return clean(value, 500)
    .replace(/[A-F0-9]{8}-[A-F0-9]{4}-[1-5][A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}/gi, "[id]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]");
}

function sanitizeRoute(value: unknown): string {
  const route = clean(value, 300).split("?")[0].split("#")[0];
  return route.replace(/[A-F0-9]{8}-[A-F0-9-]{27,}/gi, "/[id]");
}

function safeDetails(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const allowed = ["online", "httpStatus", "method", "component", "attempt", "chunk", "browser", "platform"];
  for (const key of allowed) {
    const item = input[key];
    if (typeof item === "boolean" || typeof item === "number") out[key] = item;
    if (typeof item === "string") out[key] = clean(item, 80);
  }
  return out;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rpc(name: string, body: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

Deno.serve(async (request) => {
  const origin = allowedOrigin(request);
  if (request.method === "OPTIONS") return origin ? json({ ok: true }, 204, origin) : json({ ok: false }, 403);
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405, origin);
  if (!origin && request.headers.get("origin")) return json({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503, origin);

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, origin);

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400, origin);
  }

  const source = clean(input["source"], 80) || "client";
  const code = clean(input["code"], 120) || "UNKNOWN_ERROR";
  const message = sanitizeMessage(input["message"]) || "Unknown system error";
  const route = sanitizeRoute(input["route"]);
  const severityRaw = clean(input["severity"], 16).toUpperCase();
  const severity = ["INFO", "WARN", "ERROR", "CRITICAL"].includes(severityRaw) ? severityRaw : "ERROR";
  const autoRecovered = input["autoRecovered"] === true;
  const recoveryAction = clean(input["recoveryAction"], 200) || null;
  const releaseSha = clean(input["releaseSha"], 80) || null;
  const clientFamily = clean(input["clientFamily"], 80) || null;
  const details = safeDetails(input["details"]);

  const ip = clean(request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown", 100);
  const keyHash = await sha256(`system-event:${ip}`);
  const rateResponse = await rpc("consume_rate_limit", {
    p_key_hash: keyHash,
    p_scope: "system_event_public",
    p_window_seconds: 60,
    p_limit: 30,
  });
  if (!rateResponse.ok) return json({ ok: false, code: "RATE_LIMIT_CHECK_FAILED" }, 503, origin);
  const allowed = await rateResponse.json().catch(() => false);
  if (allowed !== true) return json({ ok: false, code: "RATE_LIMITED" }, 429, origin);

  const fingerprint = await sha256(`${source}|${code}|${route}|${message}`);
  const recordResponse = await rpc("record_system_event", {
    p_severity: severity,
    p_source: source,
    p_code: code,
    p_message: message,
    p_route: route || null,
    p_fingerprint: fingerprint,
    p_auto_recovered: autoRecovered,
    p_recovery_action: recoveryAction,
    p_release_sha: releaseSha,
    p_client_family: clientFamily,
    p_details: details,
  });

  if (!recordResponse.ok) {
    console.error("system-event record failed", recordResponse.status, (await recordResponse.text()).slice(0, 300));
    return json({ ok: false, code: "EVENT_SAVE_FAILED" }, 500, origin);
  }

  return json({ ok: true }, 202, origin);
});
