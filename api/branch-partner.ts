import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";
import { SUPABASE_PROJECT_URL } from "./_lib/supabase-public";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";
const MAX_BODY_BYTES = 32 * 1024;

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization") || "";
  return /^Bearer\s+\S+/i.test(value) ? value : null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, ALLOWED_METHODS);
    if (guarded) return guarded;

    const decision = originDecision(request);
    const method = request.method.toUpperCase();
    if (!["GET", "POST", "PATCH"].includes(method)) {
      return Response.json(
        { ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId },
        {
          status: 405,
          headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" },
        },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return Response.json(
        { ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId },
        {
          status: 413,
          headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" },
        },
      );
    }

    const authorization = bearer(request);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
      "x-request-id": decision.requestId,
      "user-agent": request.headers.get("user-agent") || "alperler-web",
    };
    if (authorization) headers.authorization = authorization;

    let body: string | undefined;
    if (method !== "GET") {
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
        return Response.json(
          { ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId },
          {
            status: 413,
            headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" },
          },
        );
      }
    }

    try {
      const upstream = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/branch-partner-gateway`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(25_000),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: {
          ...corsHeaders(decision, ALLOWED_METHODS),
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-upstream-request-id": upstream.headers.get("x-request-id") || decision.requestId,
        },
      });
    } catch (error) {
      console.error("Branch partner gateway unavailable", decision.requestId, error);
      return Response.json(
        {
          ok: false,
          code: "BRANCH_PARTNER_GATEWAY_UNAVAILABLE",
          message: "İş ortaklığı servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin.",
          requestId: decision.requestId,
        },
        {
          status: 503,
          headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" },
        },
      );
    }
  },
};
