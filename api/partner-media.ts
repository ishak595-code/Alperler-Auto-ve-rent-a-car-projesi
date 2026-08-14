const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
    }
    try {
      const upstream = await fetch(`${SUPABASE_URL}/functions/v1/partner-media`, {
        method: "POST",
        headers: { authorization, "content-type": "application/json" },
        body: await request.text(),
        signal: AbortSignal.timeout(12_000),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "private, no-store",
        },
      });
    } catch (error) {
      console.error("Partner media gateway unavailable", error);
      return Response.json({ ok: false, code: "PARTNER_MEDIA_UNAVAILABLE" }, { status: 503 });
    }
  },
};
