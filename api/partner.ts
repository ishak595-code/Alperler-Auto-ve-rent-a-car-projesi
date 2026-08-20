const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 100);
}

async function proxy(
  request: Request,
  options: {
    edgeFunction: string;
    allowedMethods: string[];
    timeout: number;
    requireAuth?: boolean;
    unavailableCode: string;
    unavailableMessage?: string;
  },
): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!options.allowedMethods.includes(method)) {
    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const authorization = request.headers.get("authorization");
  if (options.requireAuth && !authorization?.startsWith("Bearer ")) {
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-client-ip": clientIp(request),
    "user-agent": request.headers.get("user-agent") || "alperler-web",
  };
  if (authorization) headers.authorization = authorization;

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/${options.edgeFunction}`, {
      method,
      headers,
      body: method === "GET" ? undefined : await request.text(),
      signal: AbortSignal.timeout(options.timeout),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": options.requireAuth ? "private, no-store" : "no-store",
      },
    });
  } catch (error) {
    console.error(`${options.edgeFunction} unavailable`, error);
    return Response.json(
      {
        ok: false,
        code: options.unavailableCode,
        ...(options.unavailableMessage ? { message: options.unavailableMessage } : {}),
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const operation = new URL(request.url).searchParams.get("op") || "requests";
    if (operation === "media") {
      return proxy(request, {
        edgeFunction: "partner-media",
        allowedMethods: ["POST"],
        timeout: 12_000,
        requireAuth: true,
        unavailableCode: "PARTNER_MEDIA_UNAVAILABLE",
      });
    }
    if (operation === "resume") {
      return proxy(request, {
        edgeFunction: "partner-upload-resume",
        allowedMethods: ["POST"],
        timeout: 20_000,
        unavailableCode: "PARTNER_RESUME_UNAVAILABLE",
        unavailableMessage: "Dosya yükleme devam servisine şu anda ulaşılamıyor.",
      });
    }
    if (operation === "requests") {
      return proxy(request, {
        edgeFunction: "partner-request-gateway",
        allowedMethods: ["GET", "POST", "PATCH"],
        timeout: 25_000,
        unavailableCode: "PARTNER_GATEWAY_UNAVAILABLE",
        unavailableMessage: "Araç değerlendirme servisine şu anda ulaşılamıyor.",
      });
    }
    return Response.json({ ok: false, code: "UNKNOWN_PARTNER_OPERATION" }, { status: 404 });
  },
};
