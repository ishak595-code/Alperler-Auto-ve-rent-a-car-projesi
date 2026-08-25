import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const BUCKET="customer-documents";
const supabase=createClient(URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

type AdminContext={id:string;email:string;role:string;permissions:Record<string,unknown>;canManageSettings:boolean};

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8"}});}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):"";}
function uuid(value:unknown){const v=clean(value,80);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:"";}
function serviceHeaders(extra:Record<string,string>={}){return{apikey:SERVICE_KEY,authorization:`Bearer ${SERVICE_KEY}`,"content-type":"application/json",...extra};}
async function db(path:string,init:RequestInit={}){return fetch(`${URL}/rest/v1/${path}`,{...init,headers:{...serviceHeaders(),...(init.headers||{})},signal:init.signal||AbortSignal.timeout(12_000)});}
async function rpc<T=any>(name:string,body:Record<string,unknown>):Promise<T>{const response=await db(`rpc/${name}`,{method:"POST",body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(String(payload?.message||payload?.code||`${name.toUpperCase()}_${response.status}`));return payload as T;}

async function requireAdmin(request:Request):Promise<AdminContext>{
  const authorization=request.headers.get("authorization")||"";
  if(!/^Bearer\s+\S+/i.test(authorization))throw new Error("UNAUTHORIZED");
  const userResponse=await fetch(`${URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,authorization},signal:AbortSignal.timeout(8_000)});
  if(!userResponse.ok)throw new Error("UNAUTHORIZED");
  const user=await userResponse.json();const id=uuid(user?.id);if(!id)throw new Error("UNAUTHORIZED");
  const adminResponse=await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if(!adminResponse.ok)throw new Error("ADMIN_LOOKUP_FAILED");
  const rows=await adminResponse.json();const admin=Array.isArray(rows)?rows[0]:null;if(!admin)throw new Error("FORBIDDEN");
  const role=clean(admin.role,40).toLowerCase();const permissions=(admin.permissions&&typeof admin.permissions==="object"?admin.permissions:{}) as Record<string,unknown>;
  const canManageSettings=role==="owner"||role==="admin"||permissions["settings.manage"]===true;
  return{id,email:clean(user?.email,160),role,permissions,canManageSettings};
}

function statusFor(code:string){if(code==="UNAUTHORIZED")return 401;if(code==="FORBIDDEN"||code==="ADMIN_OPERATIONS_REQUIRED"||code==="SETTINGS_PERMISSION_REQUIRED")return 403;if(code.includes("NOT_FOUND"))return 404;if(code.includes("INVALID")||code.includes("REQUIRED")||code.includes("OUT_OF_RANGE"))return 400;return 500;}

async function listOrDetail(request:Request,admin:AdminContext){
  const url=new URL(request.url);const userId=uuid(url.searchParams.get("userId"));
  if(url.searchParams.has("userId")&&!userId)return json({ok:false,code:"INVALID_CUSTOMER_ID"},400);
  if(userId){const result=await rpc("service_customer_admin_detail_v173",{p_actor:admin.id,p_user_id:userId});return json({...result,capabilities:{manageSettings:admin.canManageSettings}});}
  const rawLimit=Number(url.searchParams.get("limit")||1000);const limit=Number.isInteger(rawLimit)?Math.max(1,Math.min(rawLimit,2000)):1000;
  const result=await rpc("service_customer_admin_list_v173",{p_actor:admin.id,p_limit:limit});return json({...result,capabilities:{manageSettings:admin.canManageSettings}});
}

async function signDocument(admin:AdminContext,input:any){
  const documentId=uuid(input?.documentId);if(!documentId)return json({ok:false,code:"INVALID_DOCUMENT_ID"},400);
  const meta=await rpc<any>("service_customer_document_path_v173",{p_actor:admin.id,p_document_id:documentId});
  const path=clean(meta?.storage_path,1000);if(!path)return json({ok:false,code:"DOCUMENT_PATH_MISSING"},409);
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,120,{download:false});
  if(error||!data?.signedUrl)throw new Error("DOCUMENT_SIGN_FAILED");
  await db("audit_logs",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.id,actor_email:admin.email,action:"CUSTOMER_DOCUMENT_SIGNED_V173",entity_type:"customer_document",entity_id:documentId,event_meta:{customer_user_id:meta?.user_id||null,expires_in_seconds:120,gateway:"customer-admin-v173"}})}).catch(()=>undefined);
  return json({ok:true,documentId,signedUrl:data.signedUrl,expiresIn:120});
}

async function mutate(request:Request,admin:AdminContext){
  if(Number(request.headers.get("content-length")||0)>64_000)return json({ok:false,code:"PAYLOAD_TOO_LARGE"},413);
  let input:any;try{input=await request.json();}catch{return json({ok:false,code:"INVALID_JSON"},400);}
  const action=clean(input?.action,60);
  if(action==="signDocument")return signDocument(admin,input);
  if(action==="status"){
    const userId=uuid(input?.userId),status=clean(input?.status,20).toUpperCase();if(!userId)return json({ok:false,code:"INVALID_CUSTOMER_ID"},400);
    const result=await rpc("service_set_customer_status_v173",{p_actor:admin.id,p_user_id:userId,p_status:status});return json(result);
  }
  if(action==="linkBooking"){
    const userId=uuid(input?.userId),reference=clean(input?.reference,100);if(!userId||!reference)return json({ok:false,code:"BOOKING_LINK_FIELDS_REQUIRED"},400);
    const result=await rpc("service_link_booking_customer_v173",{p_actor:admin.id,p_booking_reference:reference,p_customer_user_id:userId});return json(result);
  }
  if(action==="reviewDocument"){
    const documentId=uuid(input?.documentId),status=clean(input?.status,20).toUpperCase(),reason=clean(input?.reason,500)||null;if(!documentId)return json({ok:false,code:"INVALID_DOCUMENT_ID"},400);
    const result=await rpc("service_review_customer_document_v173",{p_actor:admin.id,p_document_id:documentId,p_status:status,p_reason:reason});return json(result);
  }
  if(action==="saveSettings"){
    if(!admin.canManageSettings)return json({ok:false,code:"SETTINGS_PERMISSION_REQUIRED"},403);
    const settings=input?.settings;if(!settings||typeof settings!=="object"||Array.isArray(settings))return json({ok:false,code:"LOYALTY_SETTINGS_REQUIRED"},400);
    const result=await rpc("service_save_loyalty_settings_v173",{p_actor:admin.id,p_settings:settings});return json(result);
  }
  return json({ok:false,code:"INVALID_ACTION"},400);
}

Deno.serve(async request=>{
  if(!URL||!SERVICE_KEY)return json({ok:false,code:"SERVER_CONFIG_MISSING"},503);
  const method=request.method.toUpperCase();if(method==="OPTIONS")return new Response(null,{status:204});
  if(!["GET","POST","PATCH"].includes(method))return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  try{
    const admin=await requireAdmin(request);
    if(method==="GET")return await listOrDetail(request,admin);
    return await mutate(request,admin);
  }catch(error){const code=error instanceof Error?error.message:"CUSTOMER_ADMIN_GATEWAY_FAILED";console.error("customer-admin-gateway-v173",code);return json({ok:false,code},statusFor(code));}
});
