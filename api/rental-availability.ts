import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";
import { SUPABASE_PROJECT_URL } from "./_lib/supabase-public";

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, "POST,OPTIONS");
    if (guarded) return guarded;
    const decision = originDecision(request);
    if (request.method.toUpperCase() !== "POST") {
      return Response.json(
        { ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId },
        { status: 405, headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" } },
      );
    }
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      return Response.json(
        { ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId },
        { status: 413, headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" } },
      );
    }

    const authorization = request.headers.get("authorization");
    const idempotencyKey = (request.headers.get("x-idempotency-key") || "").trim().slice(0, 120);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-client-ip": clientIp(request),
      "x-request-id": decision.requestId,
      "user-agent": request.headers.get("user-agent") || "alperler-web",
    };
    if (authorization) headers.authorization = authorization;
    if (idempotencyKey) headers["x-idempotency-key"] = idempotencyKey;

    let upstream: Response;
    try {
      upstream = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/rental-availability`, {
        method: "POST",
        headers,
        body: await request.text(),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      console.error("Rental availability gateway unavailable", decision.requestId, error);
      return Response.json(
        {
          ok: false,
          code: "AVAILABILITY_SERVICE_UNAVAILABLE",
          message: "Araç uygunluğu şu anda doğrulanamadı. Lütfen tekrar deneyin.",
          requestId: decision.requestId,
        },
        {
          status: 503,
          headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" },
        },
      );
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        ...corsHeaders(decision, "POST,OPTIONS"),
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-upstream-request-id": upstream.headers.get("x-request-id") || decision.requestId,
      },
    });
  },
};
