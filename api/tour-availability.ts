import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";

const DEFAULT_SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

function projectUrl(): string {
  return (process.env.SUPABASE_PROJECT_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
}

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, "POST,OPTIONS");
    if (guarded) return guarded;
    const decision = originDecision(request);
    if (request.method !== "POST") {
      return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId }, {
        status: 405,
        headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" },
      });
    }
    if (Number(request.headers.get("content-length") || 0) > 8_192) {
      return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId }, {
        status: 413,
        headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" },
      });
    }

    let body: string;
    try {
      body = await request.text();
    } catch {
      return Response.json({ ok: false, code: "INVALID_REQUEST", requestId: decision.requestId }, {
        status: 400,
        headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" },
      });
    }

    try {
      const upstream = await fetch(`${projectUrl()}/functions/v1/tour-availability-v169`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-ip": clientIp(request),
          "x-request-id": decision.requestId,
          "user-agent": request.headers.get("user-agent") || "alperler-web",
        },
        body,
        signal: AbortSignal.timeout(12_000),
      });
      const payload = await upstream.text();
      return new Response(payload, {
        status: upstream.status,
        headers: {
          ...corsHeaders(decision, "POST,OPTIONS"),
          "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-upstream-request-id": upstream.headers.get("x-request-id") || decision.requestId,
        },
      });
    } catch (error) {
      console.error("Tour availability gateway unavailable", decision.requestId, error);
      return Response.json({ ok: false, code: "TOUR_AVAILABILITY_UNAVAILABLE", message: "Tur kontenjanı şu anda doğrulanamadı.", requestId: decision.requestId }, {
        status: 503,
        headers: { ...corsHeaders(decision, "POST,OPTIONS"), "cache-control": "no-store" },
      });
    }
  },
};
