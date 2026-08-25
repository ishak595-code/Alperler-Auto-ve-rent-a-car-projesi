import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

type AdminContext={id:string;email:string;role:string;permissions:Record<string,unknown>;canContent:boolean;canSettings:boolean};

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8"}});}
function clean(value:unknown,max:number){return typeof value==="string"?value.trim().slice(0,max):"";}
function uuid(value:unknown){const v=clean(value,80);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:"";}
function headers(){return{apikey:SERVICE_KEY,authorization:`Bearer ${SERVICE_KEY}`,"content-type":"application/json"};}
async function db(path:string,init:RequestInit={}){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{...headers(),...(init.headers||{})},signal:init.signal||AbortSignal.timeout(15_000)});}
async function rpc<T=any>(name:string,body:Record<string,unknown>):Promise<T>{const response=await db(`rpc/${name}`,{method:"POST",body:JSON.stringify(body)});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(String(payload?.message||payload?.code||`${name.toUpperCase()}_${response.status}`));return payload as T;}

async function requireAdmin(request:Request):Promise<AdminContext>{
  const authorization=request.headers.get("authorization")||"";
  if(!/^Bearer\s+\S+/i.test(authorization))throw new Error("UNAUTHORIZED");
  const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,authorization},signal:AbortSignal.timeout(8_000)});
  if(!userResponse.ok)throw new Error("UNAUTHORIZED");
  const user=await userResponse.json();const id=uuid(user?.id);if(!id)throw new Error("UNAUTHORIZED");
  const adminResponse=await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if(!adminResponse.ok)throw new Error("ADMIN_LOOKUP_FAILED");
  const rows=await adminResponse.json();const admin=Array.isArray(rows)?rows[0]:null;if(!admin)throw new Error("FORBIDDEN");
  const role=clean(admin.role,40).toLowerCase();const permissions=(admin.permissions&&typeof admin.permissions==="object"?admin.permissions:{}) as Record<string,unknown>;
  const canSettings=role==="owner"||role==="admin"||permissions["settings.manage"]===true;
  const canContent=canSettings||permissions["content.manage"]===true;
  return{id,email:clean(user?.email,160),role,permissions,canContent,canSettings};
}
function statusFor(code:string){if(code==="UNAUTHORIZED")return 401;if(code==="FORBIDDEN"||code.includes("PERMISSION_REQUIRED"))return 403;if(code.includes("NOT_FOUND"))return 404;if(code.includes("INVALID")||code.includes("REQUIRED"))return 400;return 500;}
function object(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;}
function array(value:unknown){return Array.isArray(value)?value:null;}

async function mutate(admin:AdminContext,input:any){
  const action=clean(input?.action,80);
  if(action==="saveFooter"){
    if(!admin.canSettings)return json({ok:false,code:"SETTINGS_PERMISSION_REQUIRED"},403);
    const settings=object(input?.settings),links=array(input?.links);if(!settings||!links)return json({ok:false,code:"FOOTER_BUNDLE_REQUIRED"},400);
    return json(await rpc("service_save_footer_bundle_v174",{p_actor:admin.id,p_settings:settings,p_links:links}));
  }
  if(!admin.canContent)return json({ok:false,code:"CONTENT_PERMISSION_REQUIRED"},403);
  if(action==="upsertSection"){
    const section=object(input?.section);if(!section)return json({ok:false,code:"HOMEPAGE_SECTION_REQUIRED"},400);
    return json(await rpc("service_upsert_homepage_section_v174",{p_actor:admin.id,p_section:section}));
  }
  if(action==="deleteSection"){
    const sectionKey=clean(input?.sectionKey,80);if(!sectionKey)return json({ok:false,code:"HOMEPAGE_SECTION_REQUIRED"},400);
    return json(await rpc("service_delete_homepage_section_v174",{p_actor:admin.id,p_section_key:sectionKey}));
  }
  if(action==="reorderSections"){
    const keys=array(input?.keys);if(!keys)return json({ok:false,code:"HOMEPAGE_ORDER_REQUIRED"},400);
    return json(await rpc("service_reorder_homepage_sections_v174",{p_actor:admin.id,p_keys:keys}));
  }
  if(action==="upsertPlacement"){
    const placement=object(input?.placement);if(!placement)return json({ok:false,code:"HOMEPAGE_PLACEMENT_REQUIRED"},400);
    return json(await rpc("service_upsert_homepage_placement_v174",{p_actor:admin.id,p_placement:placement}));
  }
  if(action==="deletePlacement"){
    const id=uuid(input?.id);if(!id)return json({ok:false,code:"HOMEPAGE_PLACEMENT_ID_INVALID"},400);
    return json(await rpc("service_delete_homepage_placement_v174",{p_actor:admin.id,p_id:id}));
  }
  if(action==="reorderPlacements"){
    const ids=array(input?.ids);if(!ids)return json({ok:false,code:"HOMEPAGE_PLACEMENT_ORDER_REQUIRED"},400);
    return json(await rpc("service_reorder_homepage_placements_v174",{p_actor:admin.id,p_ids:ids}));
  }
  return json({ok:false,code:"INVALID_ACTION"},400);
}

Deno.serve(async request=>{
  if(!SUPABASE_URL||!SERVICE_KEY)return json({ok:false,code:"SERVER_CONFIG_MISSING"},503);
  const method=request.method.toUpperCase();if(method==="OPTIONS")return new Response(null,{status:204});
  if(!["GET","POST","PATCH"].includes(method))return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  try{
    const admin=await requireAdmin(request);
    if(method==="GET"){
      if(!admin.canContent&&!admin.canSettings)return json({ok:false,code:"SITE_CONTENT_PERMISSION_REQUIRED"},403);
      const snapshot=await rpc("service_site_content_snapshot_v174",{p_actor:admin.id});
      return json({...snapshot,capabilities:{content:admin.canContent,settings:admin.canSettings}});
    }
    if(Number(request.headers.get("content-length")||0)>262_144)return json({ok:false,code:"PAYLOAD_TOO_LARGE"},413);
    let input:any;try{input=await request.json();}catch{return json({ok:false,code:"INVALID_JSON"},400);}
    return await mutate(admin,input);
  }catch(error){const code=error instanceof Error?error.message:"SITE_CONTENT_GATEWAY_FAILED";console.error("site-content-admin-gateway-v174",code);return json({ok:false,code},statusFor(code));}
});
