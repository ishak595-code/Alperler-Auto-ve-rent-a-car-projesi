import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function json(body: unknown, status = 200, requestId?: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}
function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return probe.getUTCFullYear() === Number(match[1]) && probe.getUTCMonth() === Number(match[2]) - 1 && probe.getUTCDate() === Number(match[3]);
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function rpc(name: string, body: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
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

Deno.serve(async (request: Request) => {
  const requestId = clean(request.headers.get("x-request-id"), 80) || crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "cache-control": "no-store", "x-request-id": requestId } });
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId }, 405, requestId);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVICE_NOT_CONFIGURED", requestId }, 503, requestId);
  if (Number(request.headers.get("content-length") || 0) > 8_192) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId }, 413, requestId);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON", requestId }, 400, requestId);
  }

  const identifier = clean(payload["tourId"] ?? payload["identifier"], 128);
  const date = clean(payload["date"], 10);
  if (!identifier || !/^[A-Za-z0-9-]{1,128}$/.test(identifier)) return json({ ok: false, code: "INVALID_TOUR_IDENTIFIER", requestId }, 400, requestId);
  if (!validDate(date)) return json({ ok: false, code: "INVALID_TOUR_DATE", requestId }, 400, requestId);

  try {
    const networkKey = await sha256(`${clean(request.headers.get("x-client-ip"), 100) || "unknown"}|${clean(request.headers.get("user-agent"), 240)}`);
    const allowedResponse = await rpc("consume_rate_limit", { p_key_hash: networkKey, p_scope: "tour_availability_v169", p_window_seconds: 60, p_limit: 30 });
    if (!allowedResponse.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
    if (!(await allowedResponse.json())) return json({ ok: false, code: "RATE_LIMITED", message: "Çok fazla uygunluk sorgusu gönderildi.", requestId }, 429, requestId);

    const response = await rpc("tour_availability_v169", { p_tour_identifier: identifier, p_tour_date: date });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = JSON.stringify(body || {}).slice(0, 500);
      const notFound = detail.includes("TOUR_NOT_FOUND");
      console.error("tour-availability-v169", requestId, response.status, detail);
      return json({ ok: false, code: notFound ? "TOUR_NOT_FOUND" : "TOUR_AVAILABILITY_FAILED", requestId }, notFound ? 404 : 400, requestId);
    }
    return json({ ok: true, ...(body && typeof body === "object" ? body : {}), requestId }, 200, requestId);
  } catch (error) {
    console.error("tour-availability-v169 unavailable", requestId, error);
    return json({ ok: false, code: "TOUR_AVAILABILITY_UNAVAILABLE", message: "Tur kontenjanı şu anda doğrulanamadı.", requestId }, 503, requestId);
  }
});
