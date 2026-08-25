import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ALLOWED_ORIGINS=new Set((Deno.env.get("APP_ALLOWED_ORIGINS")||"").split(",").map(v=>v.trim()).filter(Boolean).map(v=>{try{return new URL(v).origin;}catch{return"";}}).filter(Boolean));
function clean(value:unknown,max:number):string{return typeof value==="string"?value.trim().slice(0,max):"";}
function requestId(request:Request):string{const value=clean(request.headers.get("x-request-id"),80);return/^[A-Za-z0-9._:-]{8,80}$/.test(value)?value:crypto.randomUUID();}
function origin(request:Request):string|null{const raw=clean(request.headers.get("origin"),240);if(!raw)return null;try{return new URL(raw).origin;}catch{return"";}}
function isAllowedAdminOrigin(value:string|null):boolean{if(!value)return true;try{const parsed=new URL(value);if((parsed.hostname==="localhost"||parsed.hostname==="127.0.0.1")&&["http:","https:"].includes(parsed.protocol))return true;}catch{return false;}return ALLOWED_ORIGINS.has(value);}
function cors(originValue:string|null,publicPost:boolean):Record<string,string>{return{"access-control-allow-origin":publicPost?"*":originValue||"null","access-control-allow-headers":"authorization, content-type, x-idempotency-key, x-request-id","access-control-allow-methods":"GET,POST,PATCH,DELETE,OPTIONS","access-control-max-age":"600","vary":"Origin"};}
function json(request:Request,body:unknown,status:number,publicPost:boolean,id=requestId(request)):Response{const o=origin(request);return new Response(JSON.stringify(body),{status,headers:{...cors(o,publicPost),"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-request-id":id,"x-content-type-options":"nosniff"}});}

Deno.serve(async(request)=>{
  const id=requestId(request);const method=request.method.toUpperCase();const o=origin(request);const requestedMethod=clean(request.headers.get("access-control-request-method"),10).toUpperCase();const publicPost=method==="POST"||(method==="OPTIONS"&&requestedMethod==="POST");
  if(method==="OPTIONS"){
    if(!publicPost&&!isAllowedAdminOrigin(o))return json(request,{ok:false,code:"ORIGIN_NOT_ALLOWED",requestId:id},403,false,id);
    return new Response(null,{status:204,headers:{...cors(o,publicPost),"x-request-id":id}});
  }
  if(!["GET","POST","PATCH","DELETE"].includes(method))return json(request,{ok:false,code:"METHOD_NOT_ALLOWED",requestId:id},405,publicPost,id);
  if(method!=="POST"&&!isAllowedAdminOrigin(o))return json(request,{ok:false,code:"ORIGIN_NOT_ALLOWED",requestId:id},403,false,id);
  if(!SUPABASE_URL||!SERVICE_KEY)return json(request,{ok:false,code:"SERVER_CONFIG_MISSING",requestId:id},503,publicPost,id);
  if(Number(request.headers.get("content-length")||0)>64_000)return json(request,{ok:false,code:"PAYLOAD_TOO_LARGE",requestId:id},413,publicPost,id);

  const headers:Record<string,string>={"content-type":"application/json","x-request-id":id,"x-client-ip":clean(request.headers.get("x-forwarded-for")?.split(",")[0]||request.headers.get("cf-connecting-ip")||"unknown",100),"user-agent":clean(request.headers.get("user-agent"),300)||"alperler-browser"};
  const authorization=request.headers.get("authorization");if(authorization)headers.authorization=authorization;const idempotency=request.headers.get("x-idempotency-key");if(idempotency)headers["x-idempotency-key"]=idempotency.slice(0,120);
  try{
    const upstream=await fetch(`${SUPABASE_URL}/functions/v1/booking-gateway`,{method,headers,body:method==="GET"?undefined:await request.text(),signal:AbortSignal.timeout(20_000)});
    return new Response(await upstream.text(),{status:upstream.status,headers:{...cors(o,publicPost),"content-type":upstream.headers.get("content-type")||"application/json; charset=utf-8","cache-control":"no-store","x-request-id":upstream.headers.get("x-request-id")||id,"x-content-type-options":"nosniff"}});
  }catch(error){console.error("booking-browser-gateway unavailable",id,error);return json(request,{ok:false,code:"BOOKING_GATEWAY_UNAVAILABLE",message:"Rezervasyon servisine şu anda ulaşılamıyor.",requestId:id},503,publicPost,id);}
});
