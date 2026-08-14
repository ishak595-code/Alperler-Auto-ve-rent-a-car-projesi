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
    if (request.method !== "POST") {
      return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(`${SUPABASE_URL}/functions/v1/contact-gateway`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-ip": clientIp(request),
          "user-agent": request.headers.get("user-agent") || "alperler-web",
        },
        body: await request.text(),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      console.error("Supabase contact gateway unavailable", error);
      return Response.json(
        {
          ok: false,
          code: "CONTACT_GATEWAY_UNAVAILABLE",
          message: "Mesaj servisine şu anda ulaşılamıyor.",
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
