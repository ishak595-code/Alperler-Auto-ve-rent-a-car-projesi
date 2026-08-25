import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";
import { SUPABASE_PROJECT_URL } from "./_lib/supabase-public";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";

async function proxy(
  request: Request,
  options: {
    edgeFunction: string;
    allowedMethods: string[];
    timeout: number;
    requireAuth?: boolean;
    maxBodyBytes?: number;
    unavailableCode: string;
    unavailableMessage?: string;
    publicCache?: string;
    forwardQuery?: string[];
  },
): Promise<Response> {
  const decision = originDecision(request);
  const method = request.method.toUpperCase();
  if (!options.allowedMethods.includes(method)) {
    return Response.json(
      { ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId },
      { status: 405, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } },
    );
  }

  const authorization = request.headers.get("authorization");
  if (options.requireAuth && !authorization?.startsWith("Bearer ")) {
    return Response.json(
      { ok: false, code: "UNAUTHORIZED", requestId: decision.requestId },
      { status: 401, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } },
    );
  }

  let body: string | undefined;
  if (method !== "GET") {
    const declared = Number(request.headers.get("content-length") || 0);
    if (options.maxBodyBytes && declared > options.maxBodyBytes) {
      return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId }, { status: 413, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
    }
    body = await request.text();
    if (options.maxBodyBytes && new TextEncoder().encode(body).byteLength > options.maxBodyBytes) {
      return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId }, { status: 413, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
    }
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-client-ip": clientIp(request),
    "x-request-id": decision.requestId,
    "x-app-origin": new URL(request.url).origin,
    "user-agent": request.headers.get("user-agent") || "alperler-web",
  };
  if (authorization) headers.authorization = authorization;

  const upstreamUrl=new URL(`${SUPABASE_PROJECT_URL}/functions/v1/${options.edgeFunction}`);
  if(options.forwardQuery?.length){const source=new URL(request.url);for(const key of options.forwardQuery){const value=source.searchParams.get(key);if(value)upstreamUrl.searchParams.set(key,value.slice(0,120));}}

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(options.timeout),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        ...corsHeaders(decision, ALLOWED_METHODS),
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": options.requireAuth ? "private, no-store" : (options.publicCache || "no-store"),
        "x-upstream-request-id": upstream.headers.get("x-request-id") || decision.requestId,
      },
    });
  } catch (error) {
    console.error(`${options.edgeFunction} unavailable`, decision.requestId, error);
    return Response.json(
      { ok: false, code: options.unavailableCode, ...(options.unavailableMessage ? { message: options.unavailableMessage } : {}), requestId: decision.requestId },
      { status: 503, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } },
    );
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, ALLOWED_METHODS);
    if (guarded) return guarded;
    const operation = new URL(request.url).searchParams.get("op") || "requests";

    if (operation === "geo-directory") {
      return proxy(request, {
        edgeFunction: "geo-directory",
        allowedMethods: ["GET"],
        timeout: 35_000,
        unavailableCode: "GEO_DIRECTORY_UNAVAILABLE",
        unavailableMessage: "Türkiye il ve ilçe dizinine şu anda ulaşılamıyor.",
        publicCache: "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
      });
    }
    if (operation === "branch-access-claim") {
      return proxy(request, {
        edgeFunction: "branch-access-v165",
        allowedMethods: ["POST"],
        timeout: 15_000,
        requireAuth: true,
        maxBodyBytes: 1024,
        unavailableCode: "BRANCH_ACCESS_UNAVAILABLE",
        unavailableMessage: "Şube erişim doğrulama servisine şu anda ulaşılamıyor.",
      });
    }
    if (operation === "media") {
      return proxy(request, { edgeFunction: "partner-media", allowedMethods: ["POST"], timeout: 12_000, requireAuth: true, unavailableCode: "PARTNER_MEDIA_UNAVAILABLE" });
    }
    if (operation === "resume") {
      return proxy(request, { edgeFunction: "partner-upload-resume", allowedMethods: ["POST"], timeout: 20_000, unavailableCode: "PARTNER_RESUME_UNAVAILABLE", unavailableMessage: "Dosya yükleme devam servisine şu anda ulaşılamıyor." });
    }
    if (operation === "branch-partner") {
      return proxy(request, {
        edgeFunction: "branch-partner-v164",
        allowedMethods: ["GET", "POST", "PATCH"],
        timeout: 25_000,
        maxBodyBytes: 32 * 1024,
        unavailableCode: "BRANCH_PARTNER_GATEWAY_UNAVAILABLE",
        unavailableMessage: "İş ortaklığı servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.",
      });
    }
    if (operation === "customer-admin") {
      return proxy(request, {
        edgeFunction: "customer-admin-gateway-v173",
        allowedMethods: ["GET", "POST", "PATCH"],
        timeout: 20_000,
        requireAuth: true,
        maxBodyBytes: 64 * 1024,
        unavailableCode: "CUSTOMER_ADMIN_GATEWAY_UNAVAILABLE",
        unavailableMessage: "Müşteri yönetim servisine şu anda ulaşılamıyor.",
        forwardQuery: ["userId", "limit"],
      });
    }
    if (operation === "requests") {
      return proxy(request, { edgeFunction: "partner-request-gateway-v172", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, maxBodyBytes: 64 * 1024, unavailableCode: "PARTNER_GATEWAY_UNAVAILABLE", unavailableMessage: "Araç değerlendirme servisine şu anda ulaşılamıyor." });
    }
    const decision = originDecision(request);
    return Response.json({ ok: false, code: "UNKNOWN_PARTNER_OPERATION", requestId: decision.requestId }, { status: 404, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  },
};
