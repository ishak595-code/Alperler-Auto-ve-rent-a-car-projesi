const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

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
    if (!["GET", "POST", "PATCH"].includes(method)) {
      return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
      "user-agent": request.headers.get("user-agent") || "alperler-web",
    };
    const authorization = request.headers.get("authorization");
    if (authorization) headers.authorization = authorization;

    try {
      const upstream = await fetch(`${SUPABASE_URL}/functions/v1/partner-request-gateway`, {
        method,
        headers,
        body: method === "GET" ? undefined : await request.text(),
        signal: AbortSignal.timeout(25_000),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      console.error("Partner request gateway unavailable", error);
      return Response.json(
        { ok: false, code: "PARTNER_GATEWAY_UNAVAILABLE", message: "Araç değerlendirme servisine şu anda ulaşılamıyor." },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
  },
};
