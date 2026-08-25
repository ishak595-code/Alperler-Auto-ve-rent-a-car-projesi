import { getAppUrl, getPaymentConfig } from "./_lib/integration-config";
import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";

const DEFAULT_SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

interface SupabaseHealth {
  ok?: boolean;
  database?: { provider?: string; configured?: boolean; serverVerified?: boolean };
  auth?: { provider?: string; configured?: boolean };
  email?: { provider?: string; configured?: boolean };
  sms?: { provider?: string; configured?: boolean };
  notifications?: { workerConfigured?: boolean };
}

function projectUrl(): string {
  return (process.env.SUPABASE_PROJECT_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
}

function proxyHeaders(request: Request, requestId: string): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-client-ip": clientIp(request),
    "x-request-id": requestId,
    "user-agent": request.headers.get("user-agent") || "alperler-web",
  };
  const authorization = request.headers.get("authorization");
  if (authorization) headers.authorization = authorization;
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey.slice(0, 120);
  return headers;
}

function proxiedResponse(request: Request, upstream: Response, methods: string, requestId: string): Promise<Response> {
  const decision = originDecision(request);
  return upstream.text().then((body) => new Response(body, {
    status: upstream.status,
    headers: {
      ...corsHeaders(decision, methods),
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-upstream-request-id": upstream.headers.get("x-request-id") || requestId,
    },
  }));
}

async function getSupabaseHealth(): Promise<SupabaseHealth> {
  try {
    const response = await fetch(`${projectUrl()}/functions/v1/integration-status`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return {};
    return await response.json() as SupabaseHealth;
  } catch {
    return {};
  }
}

async function integrationStatus(request: Request): Promise<Response> {
  const decision = originDecision(request);
  const payment = getPaymentConfig();
  const supabase = await getSupabaseHealth();
  const environment = process.env.VERCEL_ENV;
  return Response.json(
    {
      environment: environment === "development" || environment === "preview" || environment === "production" ? environment : "unknown",
      appUrl: getAppUrl(),
      payment: {
        provider: payment.provider,
        configured: payment.configured,
        cardEnabled: payment.cardEnabled,
        eftEnabled: payment.eftEnabled,
        officeEnabled: payment.officeEnabled,
      },
      email: { provider: supabase.email?.provider || "none", configured: Boolean(supabase.email?.configured) },
      sms: { provider: supabase.sms?.provider || "none", configured: Boolean(supabase.sms?.configured) },
      database: { provider: "supabase", configured: Boolean(supabase.database?.configured), serverVerified: Boolean(supabase.database?.serverVerified) },
      auth: { provider: "supabase", configured: Boolean(supabase.auth?.configured) },
      notifications: { workerConfigured: Boolean(supabase.notifications?.workerConfigured) },
      requestId: decision.requestId,
    },
    { headers: { ...corsHeaders(decision, "GET,OPTIONS"), "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } },
  );
}

async function rentalAvailability(request: Request): Promise<Response> {
  const decision = originDecision(request);
  if (request.method !== "POST") {
    return Response.json(
      { ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId },
      { status: 405, headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" } },
    );
  }
  if (Number(request.headers.get("content-length") || 0) > 16_384) {
    return Response.json(
      { ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId },
      { status: 413, headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${projectUrl()}/functions/v1/rental-availability`, {
      method: "POST",
      headers: proxyHeaders(request, decision.requestId),
      body: await request.text(),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    console.error("Rental availability gateway unavailable", decision.requestId, error);
    return Response.json(
      {
        ok: false,
        code: "AVAILABILITY_SERVICE_UNAVAILABLE",
        message: "Araç uygunluğu şu anda doğrulanamadı. Lütfen tekrar deneyin.",
        requestId: decision.requestId,
      },
      { status: 503, headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" } },
    );
  }
  return proxiedResponse(request, upstream, "POST,OPTIONS", decision.requestId);
}

async function bookingGateway(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  const decision = originDecision(request);
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    return Response.json(
      { ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId },
      { status: 405, headers: { ...corsHeaders(decision, "GET,POST,PATCH,DELETE,OPTIONS"), "cache-control": "no-store" } },
    );
  }
  if (Number(request.headers.get("content-length") || 0) > 64_000) {
    return Response.json(
      { ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId },
      { status: 413, headers: { ...corsHeaders(decision, "GET,POST,PATCH,DELETE,OPTIONS"), "cache-control": "no-store" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${projectUrl()}/functions/v1/booking-gateway`, {
      method,
      headers: proxyHeaders(request, decision.requestId),
      body: method === "GET" ? undefined : await request.text(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("Supabase booking gateway unavailable", decision.requestId, error);
    return Response.json(
      {
        ok: false,
        code: "BOOKING_GATEWAY_UNAVAILABLE",
        message: "Rezervasyon servisine şu anda ulaşılamıyor.",
        requestId: decision.requestId,
      },
      { status: 503, headers: { ...corsHeaders(decision, "GET,POST,PATCH,DELETE,OPTIONS"), "cache-control": "no-store" } },
    );
  }
  return proxiedResponse(request, upstream, "GET,POST,PATCH,DELETE,OPTIONS", decision.requestId);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, "GET,POST,PATCH,DELETE,OPTIONS");
    if (guarded) return guarded;

    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "integration-status") {
      if (request.method !== "GET") {
        const decision = originDecision(request);
        return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId }, { status: 405, headers: corsHeaders(decision, "GET,OPTIONS") });
      }
      return integrationStatus(request);
    }
    if (mode === "rental-availability") return rentalAvailability(request);
    return bookingGateway(request);
  },
};
