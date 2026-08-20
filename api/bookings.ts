import { getAppUrl, getPaymentConfig } from "./_lib/integration-config";

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

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 100);
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

async function integrationStatus(): Promise<Response> {
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
    },
    { headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } },
  );
}

async function bookingGateway(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!["GET", "POST", "PATCH", "DELETE"].includes(method)) {
    return Response.json(
      { ok: false, code: "METHOD_NOT_ALLOWED" },
      { status: 405, headers: { "cache-control": "no-store" } },
    );
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-client-ip": clientIp(request),
    "user-agent": request.headers.get("user-agent") || "alperler-web",
  };
  const authorization = request.headers.get("authorization");
  if (authorization) headers.authorization = authorization;
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey.slice(0, 120);

  const body = method === "GET" ? undefined : await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${projectUrl()}/functions/v1/booking-gateway`, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("Supabase booking gateway unavailable", error);
    return Response.json(
      {
        ok: false,
        code: "BOOKING_GATEWAY_UNAVAILABLE",
        message: "Rezervasyon servisine şu anda ulaşılamıyor.",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "integration-status") {
      if (request.method !== "GET") return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
      return integrationStatus();
    }
    return bookingGateway(request);
  },
};
