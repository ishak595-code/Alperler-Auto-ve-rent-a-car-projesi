import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => { try { return new globalThis.URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);
const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function uuid(value: unknown): string { const v = clean(value, 64); return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v) ? v : ""; }
function normalizePhone(value: unknown): string { return clean(value, 80).replace(/\D/g, "").replace(/^90(?=5\d{9}$)/, "").replace(/^0(?=5\d{9}$)/, ""); }
function normalizeEmail(value: unknown): string { return clean(value, 180).toLowerCase(); }
function originFor(request: Request): string {
  const raw = request.headers.get("origin") || "";
  if (!raw) return "null";
  try {
    const parsed = new globalThis.URL(raw);
    const origin = parsed.origin;
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const preview = parsed.protocol === "https:" && parsed.hostname.endsWith(".vercel.app");
    if (ALLOWED_ORIGINS.has(origin) || local || preview) return origin;
  } catch { /* reject */ }
  return "null";
}
function headers(request: Request): HeadersInit { return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": originFor(request), "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin", "x-content-type-options":"nosniff" }; }
function json(request: Request, body: unknown, status=200): Response { return Response.json(body,{status,headers:headers(request)}); }
async function digest(value: string): Promise<string> { const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(raw)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function rate(key: string): Promise<boolean> { const { data, error } = await supabase.rpc("consume_rate_limit", { p_key_hash:key, p_scope:"analytics_identity_link", p_window_seconds:3600, p_limit:30 }); if(error) throw error; return Boolean(data); }

Deno.serve(async (request: Request) => {
  const origin = originFor(request);
  if (request.headers.get("origin") && origin === "null") return json(request,{ok:false,code:"ORIGIN_NOT_ALLOWED"},403);
  if(request.method === "OPTIONS") return new Response(null,{status:204,headers:headers(request)});
  if(request.method !== "POST") return json(request,{ok:false,code:"METHOD_NOT_ALLOWED"},405);
  if(!URL || !SERVICE_KEY) return json(request,{ok:false,code:"SERVER_CONFIG_MISSING"},503);
  if(Number(request.headers.get("content-length")||0)>6000) return json(request,{ok:false,code:"PAYLOAD_TOO_LARGE"},413);
  try {
    const body = await request.json().catch(()=>null) as Record<string,unknown>|null;
    const sessionId = uuid(body?.sessionId), type = clean(body?.entityType,40), reference = clean(body?.reference,120);
    const proofPhone = normalizePhone(body?.phone), proofEmail = normalizeEmail(body?.email);
    if(!sessionId || !reference || !["BOOKING","CONTACT","PARTNER_REQUEST","SUBSCRIBER"].includes(type)) return json(request,{ok:false,code:"INVALID_LINK"},400);
    if(!proofPhone && !proofEmail) return json(request,{ok:false,code:"PROOF_REQUIRED"},400);

    const ip = clean(request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "",100);
    const ua = clean(request.headers.get("user-agent"),1000);
    const networkHash = await digest(`${ip}|${ua}`);
    if(!(await rate(await digest(`${networkHash}|${sessionId}`)))) return json(request,{ok:false,code:"RATE_LIMITED"},429);

    const { data: session, error: sessionError } = await supabase.from("visitor_sessions").select("id,network_hash,consented_at").eq("id",sessionId).maybeSingle();
    if(sessionError || !session?.id || !session.consented_at || session.network_hash !== networkHash) return json(request,{ok:false,code:"SESSION_MISMATCH"},403);

    let entityId = "", storedPhone = "", storedEmail = "";
    if(type === "BOOKING") {
      const { data } = await supabase.from("bookings").select("id,customer_phone,customer_email").eq("reference",reference).is("deleted_at",null).maybeSingle();
      entityId = data?.id || ""; storedPhone = normalizePhone(data?.customer_phone); storedEmail = normalizeEmail(data?.customer_email);
    } else if(type === "CONTACT") {
      const { data } = await supabase.from("contact_messages").select("id,phone,email").eq("reference",reference).maybeSingle();
      entityId = data?.id || ""; storedPhone = normalizePhone(data?.phone); storedEmail = normalizeEmail(data?.email);
    } else if(type === "PARTNER_REQUEST") {
      const { data } = await supabase.from("partner_requests").select("id,customer_phone,customer_email").eq("reference",reference).maybeSingle();
      entityId = data?.id || ""; storedPhone = normalizePhone(data?.customer_phone); storedEmail = normalizeEmail(data?.customer_email);
    } else {
      const { data } = await supabase.from("subscribers").select("id,email").eq("email",proofEmail).maybeSingle();
      entityId = data?.id || ""; storedEmail = normalizeEmail(data?.email);
    }
    if(!entityId) return json(request,{ok:false,code:"ENTITY_NOT_FOUND"},404);
    const proofMatches = (proofPhone && storedPhone && proofPhone === storedPhone) || (proofEmail && storedEmail && proofEmail === storedEmail);
    if(!proofMatches) return json(request,{ok:false,code:"PROOF_MISMATCH"},403);

    const { error } = await supabase.rpc("link_visitor_identity", { p_session_id:sessionId, p_entity_type:type, p_entity_id:entityId, p_reference:reference });
    if(error) { console.error("analytics link rpc",error); return json(request,{ok:false,code:"LINK_FAILED"},500); }
    return json(request,{ok:true,linked:true});
  } catch(error) {
    console.error("analytics-link failed",error);
    return json(request,{ok:false,code:"ANALYTICS_LINK_FAILED"},500);
  }
});
