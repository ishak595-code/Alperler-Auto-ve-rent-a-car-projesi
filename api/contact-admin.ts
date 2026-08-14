const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

export default {
  async fetch(request: Request): Promise<Response> {
    const method = request.method.toUpperCase();
    if (!["GET", "PATCH"].includes(method)) return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
    try {
      const upstream = await fetch(`${SUPABASE_URL}/functions/v1/contact-admin`, {
        method,
        headers: { authorization, "content-type": "application/json" },
        body: method === "GET" ? undefined : await request.text(),
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
      console.error("Contact admin gateway unavailable", error);
      return Response.json({ ok: false, code: "CONTACT_ADMIN_UNAVAILABLE" }, { status: 503 });
    }
  },
};
