import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGINS = new Set([
  Deno.env.get("PUBLIC_SITE_URL") || "",
  "https://alperlerrentaacar.com",
  "https://www.alperlerrentaacar.com",
].map((value) => { try { return new URL(value).origin; } catch { return ""; } }).filter(Boolean));

type Actor = { id: string };
function clean(value: unknown, max = 240): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function uuid(value: unknown): string { const v = clean(value,80); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : ""; }
function allowedOrigin(value: string): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:","https:"].includes(parsed.protocol)) return parsed.origin;
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") return parsed.origin;
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch { return ""; }
}
function originState(request: Request) { const supplied = clean(request.headers.get("origin") || request.headers.get("x-app-origin"),500); return { supplied:Boolean(supplied), allowed:allowedOrigin(supplied) }; }
function headers(request: Request): HeadersInit { const origin=originState(request).allowed; return { ...(origin?{"access-control-allow-origin":origin}:{}), "access-control-allow-methods":"GET,OPTIONS", "access-control-allow-headers":"authorization,content-type,x-request-id,x-app-origin", "cache-control":"private, no-store, max-age=0", "content-type":"application/json; charset=utf-8", "x-content-type-options":"nosniff", vary:"Origin" }; }
function json(request: Request, body: unknown, status=200): Response { return Response.json(body,{status,headers:headers(request)}); }
function serviceHeaders(): Record<string,string> { return { apikey:SERVICE_KEY, authorization:`Bearer ${SERVICE_KEY}`, "content-type":"application/json" }; }
async function rpc<T>(name:string, body:Record<string,unknown>):Promise<T>{ const response=await fetch(`${URL}/rest/v1/rpc/${name}`,{method:"POST",headers:serviceHeaders(),body:JSON.stringify(body),signal:AbortSignal.timeout(12_000)}); const payload=await response.json().catch(()=>({})); if(!response.ok){const raw=clean((payload as any)?.message||(payload as any)?.details,500); if(raw.includes("OPERATIONS_PERMISSION_REQUIRED")) throw new Error("OPERATIONS_PERMISSION_REQUIRED"); throw new Error("NEWSLETTER_SNAPSHOT_FAILED");} return payload as T; }
async function actor(request:Request):Promise<Actor>{ const authorization=request.headers.get("authorization")||""; if(!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED"); const userResponse=await fetch(`${URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,authorization},signal:AbortSignal.timeout(8_000)}); if(!userResponse.ok) throw new Error("UNAUTHORIZED"); const user=await userResponse.json().catch(()=>({})); const id=uuid(user?.id); if(!id) throw new Error("UNAUTHORIZED"); return {id}; }
async function sha256(value:string):Promise<string>{const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(digest)].map((b)=>b.toString(16).padStart(2,"0")).join("");}
async function rateLimit(a:Actor):Promise<void>{const ok=await rpc<boolean>("consume_rate_limit",{p_key_hash:await sha256(`newsletter-read-v186:${a.id}`),p_scope:"newsletter-admin-read-v186",p_window_seconds:60,p_limit:120});if(ok!==true)throw new Error("RATE_LIMITED");}
function status(code:string):number{if(code==="UNAUTHORIZED")return 401;if(code==="OPERATIONS_PERMISSION_REQUIRED")return 403;if(code==="RATE_LIMITED")return 429;if(code==="INVALID_VIEW")return 400;return 500;}

Deno.serve(async(request)=>{
  const origin=originState(request); if(origin.supplied&&!origin.allowed)return json(request,{ok:false,code:"ORIGIN_NOT_ALLOWED"},403);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:headers(request)});
  if(request.method!=="GET")return json(request,{ok:false,code:"METHOD_NOT_ALLOWED"},405);
  if(!URL||!SERVICE_KEY)return json(request,{ok:false,code:"SERVER_CONFIG_MISSING"},503);
  try{
    const a=await actor(request); await rateLimit(a);
    const url=new URL(request.url), view=clean(url.searchParams.get("view"),30).toUpperCase();
    if(!["SUBSCRIBERS","CAMPAIGNS"].includes(view))throw new Error("INVALID_VIEW");
    const limit=Math.max(1,Math.min(Number(url.searchParams.get("limit")||500),2000));
    const data=await rpc<unknown[]>("service_newsletter_admin_snapshot_v186",{p_actor:a.id,p_view:view,p_limit:limit});
    return json(request,{ok:true,data});
  }catch(error){const code=error instanceof Error?error.message:"NEWSLETTER_ADMIN_READ_FAILED";console.error("newsletter-admin-read-v186",code);return json(request,{ok:false,code},status(code));}
});
