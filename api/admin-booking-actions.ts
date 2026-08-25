import { corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";
import { SUPABASE_PROJECT_URL } from "./_lib/supabase-public";

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, "GET,POST,OPTIONS");
    if (guarded) return guarded;
    const decision = originDecision(request);
    const method = request.method.toUpperCase();
    if (!["GET","POST"].includes(method)) {
      return Response.json({ ok:false, code:"METHOD_NOT_ALLOWED", requestId:decision.requestId }, { status:405, headers:{...corsHeaders(decision,"GET,POST,OPTIONS"),"cache-control":"no-store"} });
    }
    const authorization = request.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+/i.test(authorization)) {
      return Response.json({ ok:false, code:"UNAUTHORIZED", requestId:decision.requestId }, { status:401, headers:{...corsHeaders(decision,"GET,POST,OPTIONS"),"cache-control":"no-store"} });
    }
    if (Number(request.headers.get("content-length") || 0) > 16_384) {
      return Response.json({ ok:false, code:"PAYLOAD_TOO_LARGE", requestId:decision.requestId }, { status:413, headers:{...corsHeaders(decision,"GET,POST,OPTIONS"),"cache-control":"no-store"} });
    }

    try {
      const upstream = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/booking-admin-actions`, {
        method,
        headers:{ authorization, "content-type":"application/json", "x-request-id":decision.requestId },
        body:method === "GET" ? undefined : await request.text(),
        signal:AbortSignal.timeout(15_000),
      });
      return new Response(await upstream.text(), {
        status:upstream.status,
        headers:{...corsHeaders(decision,"GET,POST,OPTIONS"),"content-type":upstream.headers.get("content-type") || "application/json; charset=utf-8","cache-control":"no-store","x-upstream-request-id":upstream.headers.get("x-request-id") || decision.requestId},
      });
    } catch (error) {
      console.error("Admin booking actions unavailable", decision.requestId, error);
      return Response.json({ok:false,code:"ADMIN_BOOKING_ACTIONS_UNAVAILABLE",message:"Yönetim işlemi servisine ulaşılamıyor.",requestId:decision.requestId},{status:503,headers:{...corsHeaders(decision,"GET,POST,OPTIONS"),"cache-control":"no-store"}});
    }
  },
};
