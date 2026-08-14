const DEFAULT_SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

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

export default {
  async fetch(request: Request): Promise<Response> {
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
  },
};
