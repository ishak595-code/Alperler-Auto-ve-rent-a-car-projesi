import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function corsHeaders(): Record<string, string> {
  // This endpoint is a public, rate-limited availability read. It cannot mutate
  // inventory or expose customer data, so it remains portable across future
  // domains and hosting providers without a hard-coded origin.
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, x-client-ip, x-request-id",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-max-age": "600",
    "vary": "Origin",
  };
}

function json(body: unknown, status: number, id: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": id,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
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

function wallClock(value: unknown): string {
  const raw = clean(value, 32);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (!match) throw new Error("INVALID_RENTAL_DATES");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    throw new Error("INVALID_RENTAL_DATES");
  }
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error("INVALID_RENTAL_DATES");
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${String(second).padStart(2, "0")}`;
}

Deno.serve(async (request) => {
  const id = requestId(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders(), "x-request-id": id } });
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: id }, 405, id);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING", requestId: id }, 503, id);
  if (Number(request.headers.get("content-length") || 0) > 16_384) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: id }, 413, id);

  let input: Record<string, unknown>;
  try {
    input = await request.json() as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", requestId: id }, 400, id);
  }

  try {
    const vehicleIdentifier = clean(input["vehicleId"], 128);
    if (!vehicleIdentifier) throw new Error("INVALID_RENTAL_VEHICLE");
    const startLocal = wallClock(input["startLocal"] ?? input["startAt"] ?? input["startDate"]);
    const endLocal = wallClock(input["endLocal"] ?? input["endAt"] ?? input["endDate"]);
    if (endLocal <= startLocal) throw new Error("INVALID_RENTAL_DATES");

    const ip = clean(request.headers.get("x-client-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown", 100);
    const userAgent = clean(request.headers.get("user-agent"), 240);
    const clientHash = await sha256(`${ip}|${userAgent}`);
    if (
      !(await consumeRateLimit(clientHash, "rental_availability_minute", 60, 30)) ||
      !(await consumeRateLimit(clientHash, "rental_availability_hour", 3600, 240))
    ) {
      return json({ ok: false, code: "RATE_LIMITED", message: "Çok fazla uygunluk isteği gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.", requestId: id }, 429, id);
    }

    const response = await rest("rpc/evaluate_rental_request", {
      method: "POST",
      headers: { "x-request-id": id },
      body: JSON.stringify({
        p_vehicle_identifier: vehicleIdentifier,
        p_start_local: startLocal,
        p_end_local: endLocal,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; details?: string };
      const raw = `${payload.message || ""} ${payload.details || ""}`;
      const code = raw.includes("INVALID_RENTAL_VEHICLE") ? "INVALID_RENTAL_VEHICLE"
        : raw.includes("INVALID_BRANCH_TIMEZONE") ? "INVALID_BRANCH_TIMEZONE"
        : raw.includes("INVALID_RENTAL_DATES") ? "INVALID_RENTAL_DATES"
        : "AVAILABILITY_CHECK_FAILED";
      const status = code.startsWith("INVALID_") ? 400 : 503;
      return json({ ok: false, code, message: code === "INVALID_RENTAL_VEHICLE" ? "Seçtiğiniz araç rezervasyona açık değil." : code === "INVALID_RENTAL_DATES" ? "Teslim alma ve iade tarihlerini kontrol edin." : "Araç uygunluğu şu anda doğrulanamadı.", requestId: id }, status, id);
    }

    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!result?.["vehicleId"] || !result?.["startAt"] || !result?.["endAt"]) throw new Error("AVAILABILITY_RESPONSE_INVALID");
    const available = result["available"] === true;
    return json({
      ok: true,
      available,
      vehicleId: result["vehicleId"],
      startAt: result["startAt"],
      endAt: result["endAt"],
      branchTimezone: result["branchTimezone"] || "Europe/Istanbul",
      alternatives: Array.isArray(result["alternatives"]) ? result["alternatives"] : [],
      message: available ? "Araç bu zaman aralığında onaylı başka bir rezervasyonla çakışmıyor." : "Bu araç bu zaman aralığında onaylı başka bir rezervasyon nedeniyle dolu.",
      requestId: id,
    }, 200, id);
  } catch (error) {
    console.error("rental-availability failed", id, error);
    const code = error instanceof Error ? error.message : "AVAILABILITY_CHECK_FAILED";
    const status = code.startsWith("INVALID_") ? 400 : 503;
    return json({ ok: false, code, message: status === 400 ? "Kiralama bilgilerini kontrol edin." : "Araç uygunluğu şu anda doğrulanamadı.", requestId: id }, status, id);
  }
});
