import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PRODUCTION_ORIGINS = new Set([
  "https://alperrentacar.online",
  "https://www.alperrentacar.online",
]);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function allowedOrigin(request: Request): string | null {
  const origin = clean(request.headers.get("origin"), 240);
  if (!origin) return null;
  if (PRODUCTION_ORIGINS.has(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:", "https:"].includes(parsed.protocol)) {
      return parsed.origin;
    }
  } catch {
    return "";
  }
  return "";
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-headers": "authorization, content-type, x-client-ip, x-idempotency-key, x-request-id",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-max-age": "600",
    "vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200, id = requestId(request)): Response {
  const origin = allowedOrigin(request);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin || null),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": id,
      "x-content-type-options": "nosniff",
    },
  });
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(10_000),
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(keyHash: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const response = await rest("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_key_hash: keyHash,
      p_scope: scope,
      p_window_seconds: seconds,
      p_limit: limit,
    }),
  });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}

async function optionalCustomerId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json().catch(() => ({}));
  const id = clean(user?.id, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

function parseDate(value: unknown): string {
  const raw = clean(value, 64);
  if (!raw) throw new Error("INVALID_RENTAL_DATES");
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_RENTAL_DATES");
  return date.toISOString();
}

Deno.serve(async (request) => {
  const id = requestId(request);
  const origin = allowedOrigin(request);
  if (request.headers.get("origin") && origin === "") {
    return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, id);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), "x-request-id": id } });
  }
  if (request.method !== "POST") return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (Number(request.headers.get("content-length") || 0) > 16_384) {
    return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, id);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return json(request, { ok: false, code: "INVALID_JSON" }, 400, id);
  }

  try {
    const vehicleIdentifier = clean(input["vehicleId"], 128);
    const idempotencyKey = clean(input["idempotencyKey"] || request.headers.get("x-idempotency-key"), 120);
    if (!vehicleIdentifier) throw new Error("INVALID_RENTAL_VEHICLE");
    if (idempotencyKey.length < 8) throw new Error("INVALID_IDEMPOTENCY_KEY");
    const startAt = parseDate(input["startAt"] ?? input["startDate"]);
    const endAt = parseDate(input["endAt"] ?? input["endDate"]);
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) throw new Error("INVALID_RENTAL_DATES");

    const ip = clean(
      request.headers.get("x-client-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      100,
    );
    const userAgent = clean(request.headers.get("user-agent"), 240);
    const clientHash = await sha256(`${ip}|${userAgent}`);
    if (
      !(await consumeRateLimit(clientHash, "rental_hold_minute", 60, 12)) ||
      !(await consumeRateLimit(clientHash, "rental_hold_hour", 3600, 80))
    ) {
      return json(request, {
        ok: false,
        code: "RATE_LIMITED",
        message: "Çok fazla uygunluk isteği gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.",
      }, 429, id);
    }

    const customerUserId = await optionalCustomerId(request);
    const response = await rest("rpc/reserve_rental_hold", {
      method: "POST",
      headers: { "x-request-id": id },
      body: JSON.stringify({
        p_vehicle_identifier: vehicleIdentifier,
        p_start_at: startAt,
        p_end_at: endAt,
        p_idempotency_key: idempotencyKey,
        p_customer_user_id: customerUserId,
        p_client_hash: clientHash,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; details?: string };
      const raw = `${payload.message || ""} ${payload.details || ""}`;
      const code = raw.includes("VEHICLE_TEMPORARILY_HELD")
        ? "VEHICLE_TEMPORARILY_HELD"
        : raw.includes("VEHICLE_UNAVAILABLE")
        ? "VEHICLE_UNAVAILABLE"
        : raw.includes("INVALID_RENTAL_VEHICLE")
        ? "INVALID_RENTAL_VEHICLE"
        : raw.includes("INVALID_RENTAL_DATES")
        ? "INVALID_RENTAL_DATES"
        : raw.includes("HOLD_IDEMPOTENCY_CONFLICT") || raw.includes("HOLD_ALREADY_CONVERTED")
        ? "HOLD_IDEMPOTENCY_CONFLICT"
        : "AVAILABILITY_CHECK_FAILED";
      const status = code === "VEHICLE_UNAVAILABLE" || code === "VEHICLE_TEMPORARILY_HELD" || code === "HOLD_IDEMPOTENCY_CONFLICT" ? 409 : code.startsWith("INVALID_") ? 400 : 503;
      const message = code === "VEHICLE_TEMPORARILY_HELD"
        ? "Bu araç seçilen zaman aralığı için başka bir müşterinin ödeme veya rezervasyon adımında. Birkaç dakika sonra tekrar deneyin."
        : code === "VEHICLE_UNAVAILABLE"
        ? "Bu araç seçilen zaman aralığında müsait değil."
        : code === "INVALID_RENTAL_DATES"
        ? "Teslim alma ve iade tarihlerini kontrol edin."
        : code === "INVALID_RENTAL_VEHICLE"
        ? "Seçtiğiniz araç rezervasyona açık değil."
        : "Araç uygunluğu şu anda doğrulanamadı.";
      return json(request, { ok: false, code, message }, status, id);
    }

    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.hold_id || !row?.expires_at) throw new Error("HOLD_RESPONSE_INVALID");

    return json(request, {
      ok: true,
      available: true,
      hold: {
        id: row.hold_id,
        vehicleId: row.vehicle_id,
        expiresAt: row.expires_at,
        branchTimezone: row.branch_timezone || "Europe/Istanbul",
      },
      requestId: id,
    }, 201, id);
  } catch (error) {
    console.error("rental-availability failed", id, error);
    const code = error instanceof Error ? error.message : "AVAILABILITY_CHECK_FAILED";
    const status = code.startsWith("INVALID_") ? 400 : 503;
    return json(request, { ok: false, code, message: status === 400 ? "Kiralama bilgilerini kontrol edin." : "Araç uygunluğu şu anda doğrulanamadı." }, status, id);
  }
});
