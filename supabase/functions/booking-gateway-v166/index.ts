import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type RentalDuration = "hourly" | "daily" | "weekly" | "monthly" | "longterm";
type CustomerIdentity = { id: string; email: string | null };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function required(value: unknown, field: string, max: number): string {
  const result = clean(value, max);
  if (!result) throw new Error(`INVALID_${field.toUpperCase()}`);
  return result;
}
function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function money(value: number): number { return Math.round(value * 100) / 100; }
function integerValue(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error("INVALID_INTEGER");
  return parsed;
}
function emailValue(value: unknown): string | null {
  const email = clean(value, 160).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
  return email;
}
function dateValue(value: unknown): string | null {
  const raw = clean(value, 64);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  return date.toISOString();
}
function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}
function json(body: unknown, status = 200, id?: string): Response {
  return Response.json(body, { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...(id ? { "x-request-id": id } : {}) } });
}
function serviceHeaders(extra: Record<string,string> = {}): Record<string,string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) }, signal: init.signal || AbortSignal.timeout(12_000) });
}
async function firstRow(path: string): Promise<any | null> {
  const response = await db(path);
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2,"0")).join("");
}
async function consumeRateLimit(keyHash: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", { method: "POST", body: JSON.stringify({ p_key_hash: keyHash, p_scope: scope, p_window_seconds: seconds, p_limit: limit }) });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}

async function runtimeAllowsBookings(): Promise<boolean> {
  const row = await firstRow("site_config?key=eq.runtime_controls&select=value&limit=1");
  const value = row?.value && typeof row.value === "object" ? row.value : {};
  return value.maintenanceMode !== true && value.readOnlyMode !== true && value.allowBookings !== false;
}
async function siteSettings(): Promise<any> {
  const row = await firstRow("site_config?key=eq.site_settings&select=value&limit=1");
  return row?.value && typeof row.value === "object" ? row.value : {};
}

async function optionalCustomer(request: Request): Promise<CustomerIdentity | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, authorization }, signal: AbortSignal.timeout(8_000) });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const id = clean(user?.id,80);
  const email = emailValue(user?.email);
  if (!uuid(id) || !user?.email_confirmed_at) return null;

  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_customer_profile`, { method:"POST", headers:{ apikey:SERVICE_KEY, authorization, "content-type":"application/json" }, body:"{}", signal:AbortSignal.timeout(8_000) });
  if (!profileResponse.ok) return null;
  const status = await firstRow(`customer_profiles?user_id=eq.${encodeURIComponent(id)}&select=status&limit=1`);
  if (String(status?.status || "ACTIVE") !== "ACTIVE") throw new Error("CUSTOMER_ACCOUNT_BLOCKED");
  return { id, email };
}

async function getVehicle(identifier: string, category: "RENTAL"|"SALE"): Promise<any> {
  const select = "id,stock_code,category,brand,model,price,currency,rental_price_daily,rental_price_hourly,hourly_rental_enabled,minimum_rental_hours,branch_id,availability_status,publication_status,metadata";
  const lookup = uuid(identifier)
    ? `vehicles?id=eq.${encodeURIComponent(identifier)}&category=eq.${category}&is_active=eq.true&select=${select}&limit=1`
    : `vehicles?stock_code=eq.${encodeURIComponent(identifier)}&category=eq.${category}&is_active=eq.true&select=${select}&limit=1`;
  const row = await firstRow(lookup);
  const blocked = category === "RENTAL" ? ["MAINTENANCE","SOLD","UNAVAILABLE"] : ["SOLD","ARCHIVED","UNAVAILABLE"];
  if (!row || row.publication_status !== "PUBLISHED" || blocked.includes(String(row.availability_status||""))) {
    throw new Error(category === "RENTAL" ? "INVALID_RENTAL_VEHICLE" : "INVALID_SALE_VEHICLE");
  }
  return row;
}
async function getTour(identifier: string): Promise<any> {
  const select = "id,seo_slug,title,price_per_person,currency,capacity,publication_status,is_active";
  const lookup = uuid(identifier)
    ? `tours?id=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`
    : `tours?seo_slug=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`;
  const row = await firstRow(lookup);
  if (!row || row.publication_status !== "PUBLISHED") throw new Error("INVALID_TOUR");
  return row;
}

function rentalDuration(value: unknown): RentalDuration {
  const normalized = clean(value,20);
  return normalized === "hourly" || normalized === "weekly" || normalized === "monthly" || normalized === "longterm" ? normalized : "daily";
}
function rentalWallClock(value: unknown): string {
  const raw = clean(value,64);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
  if (!match) throw new Error("INVALID_RENTAL_DATES");
  const hh=match[4]||"00", mm=match[5]||"00", ss=match[6]||"00";
  const probe=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]),Number(hh),Number(mm),Number(ss)));
  if (probe.getUTCFullYear()!==Number(match[1]) || probe.getUTCMonth()!==Number(match[2])-1 || probe.getUTCDate()!==Number(match[3]) || Number(hh)>23 || Number(mm)>59 || Number(ss)>59) throw new Error("INVALID_RENTAL_DATES");
  return `${match[1]}-${match[2]}-${match[3]}T${hh}:${mm}:${ss}`;
}
async function evaluateRental(identifier:string,startValue:unknown,endValue:unknown,pickupBranchId?:string|null):Promise<any>{
  const response=await db("rpc/evaluate_rental_request_v2",{method:"POST",body:JSON.stringify({p_vehicle_identifier:identifier,p_start_local:rentalWallClock(startValue),p_end_local:rentalWallClock(endValue),p_pickup_branch_id:pickupBranchId||null})});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.startAt||!payload?.endAt){const raw=String(payload?.message||payload?.details||"");if(raw.includes("INVALID_BRANCH_TIMEZONE"))throw new Error("INVALID_BRANCH_TIMEZONE");if(raw.includes("INVALID_PICKUP_BRANCH"))throw new Error("INVALID_PICKUP_BRANCH");if(raw.includes("INVALID_RENTAL_VEHICLE"))throw new Error("INVALID_RENTAL_VEHICLE");throw new Error("INVALID_RENTAL_DATES");}
  return payload;
}
async function operationalBranch(branchId:string,kind:"pickup"|"dropoff"):Promise<void>{
  if(!uuid(branchId))throw new Error(kind==="pickup"?"INVALID_PICKUP_BRANCH":"INVALID_DROPOFF_BRANCH");
  const flag=kind==="pickup"?"is_pickup_point":"is_return_point";
  const row=await firstRow(`branches?id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&public_status=eq.ACTIVE&${flag}=eq.true&select=id&limit=1`);
  if(!row?.id)throw new Error(kind==="pickup"?"INVALID_PICKUP_BRANCH":"INVALID_DROPOFF_BRANCH");
}
function localDay(value:string,timezone:string):number{
  const instant=new Date(value);if(Number.isNaN(instant.getTime()))throw new Error("INVALID_RENTAL_DATES");
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const valueOf=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(p=>p.type===type)?.value||0);
  return Math.floor(Date.UTC(valueOf("year"),valueOf("month")-1,valueOf("day"))/86_400_000);
}
function rentalDays(start:string,end:string,timezone:string):number{
  const a=new Date(start).getTime(),b=new Date(end).getTime();if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw new Error("INVALID_RENTAL_DATES");
  const days=localDay(end,timezone)-localDay(start,timezone);if(days<1||days>3650)throw new Error("INVALID_RENTAL_DATES");return days;
}
function rentalHours(start:string,end:string,minimum:number):number{
  const a=new Date(start).getTime(),b=new Date(end).getTime();if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw new Error("INVALID_HOURLY_RENTAL");
  const raw=(b-a)/3_600_000,hours=Math.ceil(raw);if(raw<=0||hours<minimum||hours>23)throw new Error("INVALID_HOURLY_RENTAL");return hours;
}
function driverOption(vehicle:any):"WITH_DRIVER"|"WITHOUT_DRIVER"|"BOTH"{
  const value=String(vehicle?.metadata?.driverOption||"BOTH");return value==="WITH_DRIVER"||value==="WITHOUT_DRIVER"?value:"BOTH";
}
function selectedExtraIds(body:any,withDriver:boolean):string[]{
  const raw:unknown[]=Array.isArray(body?.selectedExtraIds)?body.selectedExtraIds:[];
  const set=new Set(raw.map(v=>clean(v,64)).filter(v=>/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v)));
  if(withDriver)set.add("driver");else set.delete("driver");return [...set].slice(0,30);
}
function normalizeLocation(value:string):string{return value.replace(/\s+/g," ").trim().toLocaleLowerCase("tr-TR");}
function routeFuel(settings:any,pickup:string,dropoff:string):{distance:number;fuel:number}{
  const from=normalizeLocation(pickup),to=normalizeLocation(dropoff);if(!from||!to||from===to)return{distance:0,fuel:0};
  const routes=Array.isArray(settings.rentalRoutePricing)?settings.rentalRoutePricing:[];
  const route=routes.find((row:any)=>row&&row.enabled!==false&&Number(row.distanceKm||0)>0&&((normalizeLocation(String(row.from||""))===from&&normalizeLocation(String(row.to||""))===to)||(normalizeLocation(String(row.from||""))===to&&normalizeLocation(String(row.to||""))===from)));
  if(!route)return{distance:0,fuel:0};const distance=Math.max(0,Number(route.distanceKm||0)),fuelPrice=Math.max(0,Number(settings.rentalFuelPricePerLiter??85)),consumption=Math.max(0,Number(settings.rentalAverageConsumptionPer100Km??8.5));return{distance,fuel:Math.round(distance*consumption/100*fuelPrice)};
}
function extraCost(extra:any,duration:RentalDuration,units:number):number{
  const flat=Math.max(0,Number(extra?.flatPrice||0));if(duration==="hourly"){const raw=extra?.pricePerHour,has=raw!==undefined&&raw!==null&&raw!==""&&Number.isFinite(Number(raw)),rate=has?Math.max(0,Number(raw)):Math.max(0,Number(extra?.pricePerDay||0))/8;return money(rate*units+flat);}return money(Math.max(0,Number(extra?.pricePerDay||0))*units+flat);
}

async function rentalPricing(body:any,vehicle:any,start:string,end:string,timezone:string):Promise<{normalSubtotal:number;quantity:number;unitPrice:number;days:number|null;hours:number|null;duration:RentalDuration;extrasTotal:number;route:{distance:number;fuel:number};requested:string[]}>{
  const withDriver=Boolean(body?.withDriver),option=driverOption(vehicle);if(withDriver&&option==="WITHOUT_DRIVER")throw new Error("DRIVER_OPTION_NOT_ALLOWED");if(!withDriver&&option==="WITH_DRIVER")throw new Error("DRIVER_OPTION_NOT_ALLOWED");
  const duration=rentalDuration(body?.rentalDuration),settings=await siteSettings(),extras=Array.isArray(settings.rentalExtras)?settings.rentalExtras:[],requested=selectedExtraIds(body,withDriver),valid=extras.filter((extra:any)=>extra&&extra.enabled!==false&&requested.includes(String(extra.id||"")));
  if(withDriver&&!valid.some((extra:any)=>extra.id==="driver"))throw new Error("DRIVER_OPTION_NOT_ALLOWED");
  const pickup=clean(body?.pickupLocation,240),dropoff=clean(body?.dropoffLocation,240)||pickup,route=routeFuel(settings,pickup,dropoff);
  if(duration==="hourly"){
    if(vehicle.hourly_rental_enabled!==true||Number(vehicle.rental_price_hourly||0)<=0)throw new Error("HOURLY_RENTAL_NOT_ALLOWED");
    const hours=rentalHours(start,end,Math.max(1,Math.min(23,Number(vehicle.minimum_rental_hours||1)))),unitPrice=Math.max(0,Number(vehicle.rental_price_hourly||0)),normalSubtotal=money(unitPrice*hours),extrasTotal=money(valid.reduce((sum:number,extra:any)=>sum+extraCost(extra,"hourly",hours),0));
    return{normalSubtotal,quantity:hours,unitPrice,days:null,hours,duration,extrasTotal,route,requested:valid.map((extra:any)=>String(extra.id))};
  }
  const days=rentalDays(start,end,timezone),unitPrice=Math.max(0,Number(vehicle.rental_price_daily??vehicle.price??0)),normalSubtotal=money(unitPrice*days),extrasTotal=money(valid.reduce((sum:number,extra:any)=>sum+extraCost(extra,duration,days),0));
  return{normalSubtotal,quantity:days,unitPrice,days,hours:null,duration,extrasTotal,route,requested:valid.map((extra:any)=>String(extra.id))};
}

function toApi(row:any){const metadata=row.metadata&&typeof row.metadata==="object"?row.metadata:{};return{id:row.reference,type:row.booking_type,itemId:row.vehicle_id||row.tour_id||row.legacy_item_id||undefined,itemName:row.item_name,image:row.image||undefined,customerName:row.customer_name,customerEmail:row.customer_email||undefined,customerPhone:row.customer_phone,basePrice:row.base_price===null?undefined:Number(row.base_price),totalPrice:row.total_price===null?undefined:Number(row.total_price),currency:row.currency,personCount:row.person_count??undefined,startDate:row.start_at||undefined,endDate:row.end_at||undefined,days:row.days??undefined,rentalHours:row.rental_hours??undefined,withDriver:Boolean(row.with_driver),pickupBranchId:row.pickup_branch_id||undefined,dropoffBranchId:row.dropoff_branch_id||undefined,pickupLocation:row.pickup_location||undefined,dropoffLocation:row.dropoff_location||undefined,rentalDuration:row.rental_duration||undefined,selectedExtraIds:Array.isArray(metadata.selected_extra_ids)?metadata.selected_extra_ids:undefined,campaignId:row.campaign_id||undefined,normalPriceAmount:Number(row.normal_price_amount||0),campaignDiscountAmount:Number(row.campaign_discount_amount||0),referralDiscountAmount:Number(row.referral_discount_amount||0),loyaltyDiscountAmount:Number(row.loyalty_discount_amount||0),loyaltyPointsRedeemed:Number(row.loyalty_points_redeemed||0),pricingSnapshot:row.pricing_snapshot||{},notes:row.notes||undefined,paymentMethod:row.payment_method,paymentStatus:row.payment_status,externalPaymentReference:row.external_payment_reference||undefined,source:["WEB","ADMIN","PHONE"].includes(row.source)?row.source:"WEB",status:row.status,createdAt:row.created_at,updatedAt:row.updated_at};}
async function notify(internalId:string){try{const response=await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`,{method:"POST",headers:{authorization:`Bearer ${SERVICE_KEY}`,"content-type":"application/json"},body:JSON.stringify({bookingId:internalId,event:"booking_created"}),signal:AbortSignal.timeout(15_000)});if(!response.ok)throw new Error("NOTIFY_FAILED");return await response.json();}catch{return{ok:false,event:"booking_created",bookingId:internalId,email:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"},sms:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"},adminEmail:{state:"failed",reason:"NOTIFICATION_DISPATCH_FAILED"}};}}

async function cleanupBooking(id:string):Promise<void>{await db(`bookings?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"}).catch(()=>undefined);}

async function createBooking(request:Request,id:string):Promise<Response>{
  if(Number(request.headers.get("content-length")||0)>32_768)return json({ok:false,code:"PAYLOAD_TOO_LARGE",requestId:id},413,id);
  let body:any;try{body=await request.json();}catch{return json({ok:false,code:"INVALID_JSON",requestId:id},400,id);}if(clean(body?.website,200))return json({ok:true,accepted:true},202,id);
  try{
    if(!(await runtimeAllowsBookings()))throw new Error("BOOKINGS_DISABLED");
    const type=required(body?.type,"type",30);if(!["RENTAL","TOUR","SALE_INQUIRY","APPOINTMENT"].includes(type))throw new Error("INVALID_TYPE");
    const itemName=required(body?.itemName,"itemName",240),customerName=required(body?.customerName,"customerName",160),customerPhone=required(body?.customerPhone,"customerPhone",40);if(!/[0-9]/.test(customerPhone)||customerPhone.replace(/\D/g,"").length<7)throw new Error("INVALID_PHONE");
    const customer=await optionalCustomer(request),enteredEmail=emailValue(body?.customerEmail),customerEmail=customer?.email||enteredEmail;
    const idempotencyKey=clean(body?.idempotencyKey||request.headers.get("x-idempotency-key"),120)||crypto.randomUUID();
    const ip=clean(request.headers.get("x-client-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]||"unknown",100),networkHash=await sha256(`${ip}|${clean(request.headers.get("user-agent"),300)}`),contactHash=await sha256(`${customerPhone}|${customerEmail||""}`);
    if(!(await consumeRateLimit(networkHash,"booking_network_minute",60,8))||!(await consumeRateLimit(networkHash,"booking_network_hour",3600,40))||!(await consumeRateLimit(contactHash,"booking_contact_hour",3600,12)))return json({ok:false,code:"RATE_LIMITED",message:"Çok fazla istek gönderildi.",requestId:id},429,id);
    const duplicate=await firstRow(`bookings?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);if(duplicate)return json({ok:true,booking:toApi(duplicate),duplicate:true,requestId:id},200,id);

    const itemId=clean(body?.itemId===undefined?"":String(body.itemId),128),currency=clean(body?.currency,10)||"TRY";if(currency!=="TRY")throw new Error("UNSUPPORTED_COMMERCIAL_CURRENCY");
    const paymentMethod=clean(body?.paymentMethod,20)||"NONE";if(!["NONE","CARD","EFT","OFFICE"].includes(paymentMethod))throw new Error("INVALID_PAYMENT_METHOD");const paymentStatus=paymentMethod==="NONE"?"NOT_REQUIRED":"PENDING";
    const requestedCampaign=clean(body?.campaignId,80);if(requestedCampaign&&!uuid(requestedCampaign))throw new Error("INVALID_CAMPAIGN_ID");
    const requestedLoyaltyPoints=integerValue(body?.loyaltyPointsToRedeem,0,100_000_000)??0;

    let vehicleId:string|null=null,tourId:string|null=null,startAt=type==="RENTAL"?null:dateValue(body?.startDate),endAt=type==="RENTAL"?null:dateValue(body?.endDate),days:number|null=integerValue(body?.days,1,3650),hours:number|null=integerValue(body?.rentalHours,1,23),duration=clean(body?.rentalDuration,40)||null,pickupBranchId:string|null=null,dropoffBranchId:string|null=null;
    let normalSubtotal=0,quantity=1,canonicalUnitPrice=0,extrasTotal=0,route={distance:0,fuel:0},metadata:any={};
    const pickupInput=clean(body?.pickupBranchId,80),dropoffInput=clean(body?.dropoffBranchId,80);

    if(type==="RENTAL"){
      if(!itemId)throw new Error("INVALID_RENTAL_VEHICLE");const vehicle=await getVehicle(itemId,"RENTAL");vehicleId=String(vehicle.id);if(pickupInput)await operationalBranch(pickupInput,"pickup");if(dropoffInput)await operationalBranch(dropoffInput,"dropoff");
      const evaluation=await evaluateRental(itemId,body?.startDate,body?.endDate,pickupInput||null);startAt=String(evaluation.startAt);endAt=String(evaluation.endAt);pickupBranchId=uuid(String(evaluation.pickupBranchId||""))?String(evaluation.pickupBranchId):null;dropoffBranchId=dropoffInput||pickupBranchId;
      const calc=await rentalPricing(body,vehicle,startAt!,endAt!,String(evaluation.branchTimezone||"Europe/Istanbul"));normalSubtotal=calc.normalSubtotal;quantity=calc.quantity;canonicalUnitPrice=calc.unitPrice;days=calc.days;hours=calc.hours;duration=calc.duration;extrasTotal=calc.extrasTotal;route=calc.route;
      metadata={pickup_branch_id:pickupBranchId,dropoff_branch_id:dropoffBranchId,branch_timezone:String(evaluation.branchTimezone||"Europe/Istanbul"),selected_extra_ids:calc.requested,price_breakdown:{rental_duration:calc.duration,canonical_unit_price:calc.unitPrice,days:calc.days,rental_hours:calc.hours,normal_subtotal:calc.normalSubtotal,extras_total:calc.extrasTotal,route_distance_km:calc.route.distance,route_fuel_total:calc.route.fuel},server_calculated:true,resolved_vehicle_id:vehicleId,availability:{status:evaluation.available===true?"AVAILABLE_AT_REQUEST":"CONFLICT_AT_REQUEST",alternativeCount:Array.isArray(evaluation.alternatives)?evaluation.alternatives.length:0,checkedAt:new Date().toISOString()}};
    }else if(type==="SALE_INQUIRY"){
      if(!itemId)throw new Error("INVALID_SALE_VEHICLE");const vehicle=await getVehicle(itemId,"SALE");vehicleId=String(vehicle.id);canonicalUnitPrice=Math.max(0,Number(vehicle.price||0));normalSubtotal=canonicalUnitPrice;quantity=1;metadata={server_calculated:true,resolved_vehicle_id:vehicleId,price_breakdown:{canonical_unit_price:canonicalUnitPrice,normal_subtotal:normalSubtotal}};
    }else if(type==="TOUR"){
      if(!itemId)throw new Error("INVALID_TOUR");const tour=await getTour(itemId);tourId=String(tour.id);const persons=integerValue(body?.personCount,1,100)??1;if(tour.capacity&&persons>Number(tour.capacity))throw new Error("TOUR_CAPACITY_EXCEEDED");canonicalUnitPrice=Math.max(0,Number(tour.price_per_person||0));quantity=persons;normalSubtotal=money(canonicalUnitPrice*persons);metadata={server_calculated:true,resolved_tour_id:tourId,price_breakdown:{canonical_unit_price:canonicalUnitPrice,person_count:persons,normal_subtotal:normalSubtotal}};
    }else{
      canonicalUnitPrice=Math.max(0,Number(body?.basePrice||0));normalSubtotal=Math.max(0,Number(body?.totalPrice??body?.basePrice??0));
    }

    const row={idempotency_key:idempotencyKey,booking_type:type,vehicle_id:vehicleId,tour_id:tourId,legacy_item_id:null,item_name:itemName,image:clean(body?.image,2048)||null,customer_name:customerName,customer_email:customerEmail,customer_phone:customerPhone,customer_user_id:customer?.id||null,customer_linked_at:customer?new Date().toISOString():null,start_at:startAt,end_at:endAt,pickup_branch_id:pickupBranchId,dropoff_branch_id:dropoffBranchId,pickup_location:clean(body?.pickupLocation,240)||null,dropoff_location:clean(body?.dropoffLocation,240)||null,person_count:type==="TOUR"?quantity:integerValue(body?.personCount,1,100),with_driver:Boolean(body?.withDriver),base_price:canonicalUnitPrice,total_price:money(normalSubtotal+extrasTotal+route.fuel),currency,days,rental_hours:hours,rental_duration:duration,payment_method:paymentMethod,payment_status:paymentStatus,status:"PENDING",source:"WEB",notes:clean(body?.notes,4000)||null,customer_locale:clean(body?.customerLocale||body?.locale,10)||"tr",campaign_id:null,discount_amount:0,normal_price_amount:normalSubtotal,campaign_discount_amount:0,referral_discount_amount:0,loyalty_discount_amount:0,loyalty_points_redeemed:0,pricing_snapshot:{},metadata};
    const insert=await db("bookings?select=*",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)});if(!insert.ok){const detail=(await insert.text()).slice(0,600);console.error("V166 booking insert",id,insert.status,detail);throw new Error("BOOKING_CREATE_FAILED");}
    const saved=(await insert.json())[0];

    if(["RENTAL","SALE_INQUIRY","TOUR"].includes(type)){
      const reserve=await db("rpc/reserve_booking_commercial_offer",{method:"POST",body:JSON.stringify({p_booking_id:saved.id,p_campaign_id:requestedCampaign||null,p_requested_loyalty_points:requestedLoyaltyPoints,p_normal_subtotal:normalSubtotal,p_quantity:quantity,p_extras_total:extrasTotal,p_route_fuel_total:route.fuel})});
      const reservePayload=await reserve.json().catch(()=>({}));
      if(!reserve.ok){const detail=clean(reservePayload?.message||reservePayload?.details,300)||`COMMERCIAL_OFFER_${reserve.status}`;await cleanupBooking(saved.id);throw new Error(detail);}
    }

    const finalRow=await firstRow(`bookings?id=eq.${encodeURIComponent(saved.id)}&select=*&limit=1`);if(!finalRow){await cleanupBooking(saved.id);throw new Error("BOOKING_FINAL_READ_FAILED");}
    const notification=await notify(saved.id);return json({ok:true,booking:toApi(finalRow),notification,requestId:id},201,id);
  }catch(error){
    const code=error instanceof Error?error.message:"INVALID_BOOKING";
    const conflict=["CAMPAIGN_LIMIT_REACHED","CAMPAIGN_CUSTOMER_LIMIT_REACHED","REFERRAL_DISCOUNT_ALREADY_USED","LOYALTY_BALANCE_CHANGED"].some(v=>code.includes(v));
    const forbidden=code==="CUSTOMER_ACCOUNT_BLOCKED";
    const unavailable=code==="BOOKINGS_DISABLED";
    const bad=code.startsWith("INVALID_")||code.includes("CAMPAIGN_NOT_ACTIVE")||code.includes("CAMPAIGN_TARGET_MISMATCH")||code.includes("CAMPAIGN_MINIMUM_")||code==="DRIVER_OPTION_NOT_ALLOWED"||code==="HOURLY_RENTAL_NOT_ALLOWED"||code==="UNSUPPORTED_COMMERCIAL_CURRENCY"||code==="TOUR_CAPACITY_EXCEEDED";
    const status=conflict?409:forbidden?403:unavailable?503:bad?400:500;
    const message=code.includes("CAMPAIGN_NOT_ACTIVE")?"Bu kampanya artık aktif değil.":code.includes("CAMPAIGN_TARGET_MISMATCH")?"Kampanya bu ürün için geçerli değil.":code.includes("CAMPAIGN_LIMIT_REACHED")?"Bu kampanyanın kullanım hakkı doldu.":code.includes("CAMPAIGN_CUSTOMER_LIMIT_REACHED")?"Bu kampanyadan kullanım limitinize ulaştınız.":code.includes("CAMPAIGN_MINIMUM_")?"Kampanya koşulları seçtiğiniz plan için sağlanmıyor.":code==="LOYALTY_BALANCE_CHANGED"?"Sadakat puanı bakiyesi değişti. Lütfen tekrar deneyin.":code==="REFERRAL_DISCOUNT_ALREADY_USED"?"Arkadaş daveti indirimi daha önce kullanılmış.":code==="TOUR_CAPACITY_EXCEEDED"?"Seçilen kişi sayısı tur kapasitesini aşıyor.":code==="INVALID_RENTAL_VEHICLE"?"Kiralık araç bulunamadı veya rezervasyona açık değil.":code==="INVALID_SALE_VEHICLE"?"Satılık araç bulunamadı veya satış talebine açık değil.":code==="INVALID_TOUR"?"Tur bulunamadı veya rezervasyona açık değil.":code==="BOOKINGS_DISABLED"?"Yeni rezervasyon işlemleri geçici olarak kapalı.":bad?"Talep veya kampanya bilgilerini kontrol edin.":"Talep şu anda kaydedilemedi.";
    console.error("booking-gateway-v166",id,code);return json({ok:false,code,message,requestId:id},status,id);
  }
}

Deno.serve(async(request)=>{
  const id=requestId(request);
  if(request.headers.get("origin"))return json({ok:false,code:"DIRECT_BROWSER_ACCESS_DENIED",requestId:id},403,id);
  if(request.method==="OPTIONS")return json({ok:false,code:"DIRECT_BROWSER_ACCESS_DENIED",requestId:id},403,id);
  if(!SUPABASE_URL||!SERVICE_KEY)return json({ok:false,code:"SERVER_CONFIG_MISSING",requestId:id},503,id);
  if(request.method!=="POST")return json({ok:false,code:"METHOD_NOT_ALLOWED",requestId:id},405,id);
  return createBooking(request,id);
});
