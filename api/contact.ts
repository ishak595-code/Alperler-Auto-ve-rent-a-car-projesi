const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 100);
}

async function publicContact(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/contact-gateway`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-client-ip": clientIp(request),
        "user-agent": request.headers.get("user-agent") || "alperler-web",
      },
      body: await request.text(),
      signal: AbortSignal.timeout(20_000),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Supabase contact gateway unavailable", error);
    return Response.json(
      { ok: false, code: "CONTACT_GATEWAY_UNAVAILABLE", message: "Mesaj servisine şu anda ulaşılamıyor." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

async function adminContact(request: Request): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!["GET", "PATCH"].includes(method)) {
    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
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
}

export default {
  async fetch(request: Request): Promise<Response> {
    const mode = new URL(request.url).searchParams.get("mode");
    return mode === "admin" ? adminContact(request) : publicContact(request);
  },
};
