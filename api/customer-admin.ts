import { corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";

const DEFAULT_SUPABASE_URL="https://hrztrgjvgdnaurejnsgs.supabase.co";
const METHODS="GET,POST,PATCH,OPTIONS";
const MAX_BODY_BYTES=64_000;

function projectUrl(){return(process.env.SUPABASE_PROJECT_URL||DEFAULT_SUPABASE_URL).replace(/\/$/,"");}
function json(request:Request,body:unknown,status=200){const decision=originDecision(request);return Response.json(body,{status,headers:{...corsHeaders(decision,METHODS),"cache-control":"no-store","content-type":"application/json; charset=utf-8"}});}

export default{
  async fetch(request:Request):Promise<Response>{
    const guarded=guardOrigin(request,METHODS);if(guarded)return guarded;
    const method=request.method.toUpperCase();
    if(!["GET","POST","PATCH"].includes(method))return json(request,{ok:false,code:"METHOD_NOT_ALLOWED"},405);
    const authorization=request.headers.get("authorization")||"";
    if(!/^Bearer\s+\S+/i.test(authorization))return json(request,{ok:false,code:"UNAUTHORIZED"},401);
    if(Number(request.headers.get("content-length")||0)>MAX_BODY_BYTES)return json(request,{ok:false,code:"PAYLOAD_TOO_LARGE"},413);

    const decision=originDecision(request);
    const incoming=new URL(request.url);
    const upstreamUrl=new URL(`${projectUrl()}/functions/v1/customer-admin-gateway-v173`);
    const userId=incoming.searchParams.get("userId");
    const limit=incoming.searchParams.get("limit");
    if(userId)upstreamUrl.searchParams.set("userId",userId.slice(0,80));
    if(limit)upstreamUrl.searchParams.set("limit",limit.slice(0,10));

    try{
      const upstream=await fetch(upstreamUrl,{method,headers:{authorization,"content-type":"application/json","x-request-id":decision.requestId,"user-agent":request.headers.get("user-agent")||"alperler-web"},body:method==="GET"?undefined:await request.text(),signal:AbortSignal.timeout(15_000)});
      const body=await upstream.text();
      return new Response(body,{status:upstream.status,headers:{...corsHeaders(decision,METHODS),"cache-control":"no-store","content-type":upstream.headers.get("content-type")||"application/json; charset=utf-8","x-upstream-request-id":upstream.headers.get("x-request-id")||decision.requestId}});
    }catch(error){
      console.error("Customer admin gateway unavailable",decision.requestId,error);
      return json(request,{ok:false,code:"CUSTOMER_ADMIN_GATEWAY_UNAVAILABLE",message:"Müşteri yönetim servisine şu anda ulaşılamıyor.",requestId:decision.requestId},503);
    }
  }
};
