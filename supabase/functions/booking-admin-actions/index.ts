import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => { try { return new URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);
const MAX_BODY_BYTES = 16_384;

function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0,max) : ""; }
function requestId(request: Request): string { const supplied=clean(request.headers.get("x-request-id"),80); return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied)?supplied:crypto.randomUUID(); }
function originFor(request: Request): string|null {
  const raw=clean(request.headers.get("origin"),240); if(!raw)return null;
  try { const origin=new URL(raw).origin; const parsed=new URL(origin); if((parsed.hostname==="localhost"||parsed.hostname==="127.0.0.1")&&["http:","https:"].includes(parsed.protocol))return origin; return ALLOWED_ORIGINS.has(origin)?origin:""; } catch { return ""; }
}
function cors(origin:string|null):Record<string,string>{return{...(origin?{"access-control-allow-origin":origin}:{}),"access-control-allow-headers":"authorization, content-type, x-request-id","access-control-allow-methods":"GET,POST,OPTIONS","access-control-max-age":"600","vary":"Origin"};}
function json(request:Request,body:unknown,status=200,id=requestId(request)):Response{const origin=originFor(request);return new Response(JSON.stringify(body),{status,headers:{...cors(origin||null),"content-type":"application/json; charset=utf-8","cache-control":"private, no-store, max-age=0","x-request-id":id,"x-content-type-options":"nosniff"}});}
function serviceHeaders(extra:Record<string,string>={}):Record<string,string>{return{apikey:SERVICE_KEY,authorization:`Bearer ${SERVICE_KEY}`,"content-type":"application/json",...extra};}
async function db(path:string,init:RequestInit={}):Promise<Response>{return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{...serviceHeaders(),...(init.headers||{})},signal:init.signal||AbortSignal.timeout(10_000)});}

interface AdminIdentity{id:string;email:string;role:string;}
async function requireAdmin(request:Request):Promise<AdminIdentity>{
  const authorization=request.headers.get("authorization")||""; if(!/^Bearer\s+\S+/i.test(authorization))throw new Error("UNAUTHORIZED");
  const userResponse=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,authorization},signal:AbortSignal.timeout(8_000)}); if(!userResponse.ok)throw new Error("UNAUTHORIZED");
  const user=await userResponse.json(); const id=clean(user?.id,80); const email=clean(user?.email,160).toLowerCase(); if(!/^[0-9a-f-]{36}$/i.test(id)||!email)throw new Error("UNAUTHORIZED");
  const adminResponse=await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`); if(!adminResponse.ok)throw new Error("ADMIN_LOOKUP_FAILED");
  const rows=await adminResponse.json(); const role=String(rows?.[0]?.role||""); const permissions=rows?.[0]?.permissions&&typeof rows[0].permissions==="object"?rows[0].permissions:{};
  const canOperate=["owner","admin","support"].includes(role)||permissions?.["operations.manage"]===true;
  if(!rows?.[0]?.user_id||!canOperate)throw new Error("FORBIDDEN");
  return{id,email,role};
}

async function serviceRpc<T=any>(name:string,body:Record<string,unknown>):Promise<T>{
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:serviceHeaders(),body:JSON.stringify(body),signal:AbortSignal.timeout(12_000)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const raw=`${payload?.message||""} ${payload?.details||""} ${payload?.code||""}`;
    if(raw.includes("VEHICLE_UNAVAILABLE")||raw.includes("23P01"))throw new Error("VEHICLE_UNAVAILABLE");
    if(raw.includes("ALTERNATIVE_NO_LONGER_AVAILABLE"))throw new Error("ALTERNATIVE_NO_LONGER_AVAILABLE");
    if(raw.includes("BOOKING_NOT_FOUND"))throw new Error("BOOKING_NOT_FOUND");
    if(raw.includes("ALTERNATIVE_NOT_FOUND"))throw new Error("ALTERNATIVE_NOT_FOUND");
    if(raw.includes("BOOKING_NOT_PENDING"))throw new Error("BOOKING_NOT_PENDING");
    if(raw.includes("FORBIDDEN")||response.status===401||response.status===403)throw new Error("FORBIDDEN");
    throw new Error(`${name.toUpperCase()}_FAILED`);
  }
  return payload as T;
}

async function sha256(value:string):Promise<string>{
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte)=>byte.toString(16).padStart(2,"0")).join("");
}
async function enforceRateLimit(admin:AdminIdentity,method:string):Promise<void>{
  const mutation=method==="POST";
  const scope=mutation?"booking_admin_mutation_v180":"booking_admin_read_v180";
  const key=await sha256(`${scope}:${admin.id}`);
  const allowed=await serviceRpc<boolean>("consume_rate_limit",{
    p_key_hash:key,
    p_scope:scope,
    p_window_seconds:60,
    p_limit:mutation?40:120,
  });
  if(allowed!==true)throw new Error("RATE_LIMITED");
}

async function bookingByReference(reference:string):Promise<any|null>{const response=await db(`bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=*&limit=1`);if(!response.ok)throw new Error("BOOKING_READ_FAILED");const rows=await response.json();return Array.isArray(rows)?rows[0]||null:null;}
async function notify(bookingId:string,event:string):Promise<any>{
  try{const response=await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`,{method:"POST",headers:{authorization:`Bearer ${SERVICE_KEY}`,"content-type":"application/json"},body:JSON.stringify({bookingId,event}),signal:AbortSignal.timeout(15_000)});if(!response.ok)throw new Error("NOTIFY_FAILED");return await response.json();}catch{return{ok:false,event,bookingId,email:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"},sms:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"},adminEmail:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"}};}
}

async function listOffers():Promise<any[]>{
  const offersResponse=await db("booking_alternative_offers?status=in.(OPEN,OFFERED,ACCEPTED)&select=*&order=booking_id.asc,rank.asc&limit=2000"); if(!offersResponse.ok)throw new Error("ALTERNATIVE_LIST_FAILED");
  const offers=await offersResponse.json(); if(!Array.isArray(offers)||!offers.length)return[];
  const vehicleIds=[...new Set(offers.map((offer:any)=>String(offer.alternative_vehicle_id||"")).filter(Boolean))];
  const bookingIds=[...new Set(offers.map((offer:any)=>String(offer.booking_id||"")).filter(Boolean))];
  const quote=(value:string)=>`\"${value.replace(/\"/g,"")}\"`;
  const vehiclesResponse=vehicleIds.length?await db(`vehicles?id=in.(${vehicleIds.map(quote).join(",")})&select=id,stock_code,brand,model,cover_image,branch_id,rental_price_daily,rental_price_hourly,body_type,seats`):null;
  const bookingsResponse=bookingIds.length?await db(`bookings?id=in.(${bookingIds.map(quote).join(",")})&select=id,reference`):null;
  const vehicles=vehiclesResponse?.ok?await vehiclesResponse.json():[]; const bookings=bookingsResponse?.ok?await bookingsResponse.json():[];
  const vehicleById=new Map((Array.isArray(vehicles)?vehicles:[]).map((vehicle:any)=>[String(vehicle.id),vehicle]));
  const referenceById=new Map((Array.isArray(bookings)?bookings:[]).map((booking:any)=>[String(booking.id),String(booking.reference||"")]));
  return offers.map((offer:any)=>{const vehicle:any=vehicleById.get(String(offer.alternative_vehicle_id))||{};return{id:offer.id,bookingId:offer.booking_id,bookingReference:referenceById.get(String(offer.booking_id))||undefined,approvedBookingId:offer.approved_booking_id||undefined,status:offer.status,rank:Number(offer.rank||0),score:Number(offer.score||0),reason:offer.reason||undefined,offeredAt:offer.offered_at||undefined,vehicleId:offer.alternative_vehicle_id,stockCode:vehicle.stock_code||undefined,brand:vehicle.brand||"Alternatif",model:vehicle.model||"Araç",coverImage:vehicle.cover_image||undefined,branchId:vehicle.branch_id||undefined,dailyPrice:vehicle.rental_price_daily===null||vehicle.rental_price_daily===undefined?undefined:Number(vehicle.rental_price_daily),hourlyPrice:vehicle.rental_price_hourly===null||vehicle.rental_price_hourly===undefined?undefined:Number(vehicle.rental_price_hourly),bodyType:vehicle.body_type||undefined,seats:vehicle.seats===null||vehicle.seats===undefined?undefined:Number(vehicle.seats)};});
}

Deno.serve(async(request)=>{
  const id=requestId(request);const origin=originFor(request);
  if(request.headers.get("origin")&&origin==="")return json(request,{ok:false,code:"ORIGIN_NOT_ALLOWED",requestId:id},403,id);
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{...cors(origin),"x-request-id":id}});
  if(!SUPABASE_URL||!SERVICE_KEY)return json(request,{ok:false,code:"SERVER_CONFIG_MISSING",requestId:id},503,id);
  if(!["GET","POST"].includes(request.method))return json(request,{ok:false,code:"METHOD_NOT_ALLOWED",requestId:id},405,id);
  try{
    const admin=await requireAdmin(request);
    await enforceRateLimit(admin,request.method);
    if(request.method==="GET")return json(request,{ok:true,offers:await listOffers(),requestId:id},200,id);

    const declaredLength=Number(request.headers.get("content-length")||0);if(declaredLength>MAX_BODY_BYTES)return json(request,{ok:false,code:"PAYLOAD_TOO_LARGE",requestId:id},413,id);
    const rawBody=await request.text();if(new TextEncoder().encode(rawBody).byteLength>MAX_BODY_BYTES)return json(request,{ok:false,code:"PAYLOAD_TOO_LARGE",requestId:id},413,id);
    const body=JSON.parse(rawBody||"null") as Record<string,unknown>|null;if(!body||typeof body!=="object"||Array.isArray(body))return json(request,{ok:false,code:"INVALID_JSON",requestId:id},400,id);
    const action=clean(body["action"],40);

    if(action==="approve"){
      const reference=clean(body["bookingReference"],80);if(!reference)throw new Error("BOOKING_NOT_FOUND");const booking=await bookingByReference(reference);if(!booking?.id)throw new Error("BOOKING_NOT_FOUND");
      const approval=await serviceRpc(admin?"service_approve_booking_v180":"service_approve_booking_v180",{p_actor:admin.id,p_booking_id:booking.id,p_request_id:id});
      const saved=await bookingByReference(reference);const notification=await notify(booking.id,"booking_approved");
      return json(request,{ok:true,approval,bookingReference:reference,status:saved?.status||"APPROVED",notification,requestId:id},200,id);
    }
    if(action==="offer_alternative"){
      const offerId=clean(body["offerId"],80);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(offerId))throw new Error("ALTERNATIVE_NOT_FOUND");
      const offer=await serviceRpc("service_offer_booking_alternative_v180",{p_actor:admin.id,p_offer_id:offerId,p_request_id:id});
      return json(request,{ok:true,event:"BOOKING_ALTERNATIVE_OFFERED",offer,requestId:id},200,id);
    }
    return json(request,{ok:false,code:"INVALID_ACTION",requestId:id},400,id);
  }catch(error){
    const code=error instanceof SyntaxError?"INVALID_JSON":error instanceof Error?error.message:"ADMIN_BOOKING_ACTION_FAILED";
    const status=code==="UNAUTHORIZED"?401:code==="FORBIDDEN"?403:code==="RATE_LIMITED"?429:code==="BOOKING_NOT_FOUND"||code==="ALTERNATIVE_NOT_FOUND"?404:code==="VEHICLE_UNAVAILABLE"||code==="ALTERNATIVE_NO_LONGER_AVAILABLE"?409:code==="BOOKING_NOT_PENDING"||code.startsWith("INVALID_")?400:500;
    const message=code==="VEHICLE_UNAVAILABLE"?"Bu araç için aynı zaman aralığında başka bir onaylı rezervasyon bulunuyor.":code==="ALTERNATIVE_NO_LONGER_AVAILABLE"?"Bu alternatif araç artık seçilen zamanda müsait değil.":code==="RATE_LIMITED"?"Çok fazla yönetim isteği gönderildi. Kısa süre sonra tekrar deneyin.":code==="FORBIDDEN"?"Bu işlem için operasyon yetkiniz bulunmuyor.":"Yönetim işlemi tamamlanamadı.";
    return json(request,{ok:false,code,message,requestId:id},status,id);
  }
});
