import { createHmac } from "node:crypto";
import { getPaymentConfig, isAllowedRequestOrigin } from "../_lib/integration-config";

interface CreateSessionBody {
  bookingReference?: unknown;
  amount?: unknown;
  currency?: unknown;
  method?: unknown;
  customer?: { name?: unknown; email?: unknown; phone?: unknown; };
  returnUrl?: unknown;
  cancelUrl?: unknown;
  description?: unknown;
  metadata?: unknown;
}
interface BookingRow {
  id: string; reference: string; item_name: string; customer_name: string; customer_email: string | null;
  customer_phone: string; total_price: number | null; currency: string; payment_method: string; payment_status: string;
  pickup_location: string | null;
}
interface PaymentSettingsRow {
  provider: string; card_enabled: boolean; deposit_mode: string; deposit_value: number; currency: string; test_mode: boolean;
}

function json(body: unknown, status = 200): Response { return Response.json(body,{status,headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8"}}); }
function text(value: unknown, max: number): string | null { if(typeof value!=="string")return null;const v=value.trim();return v&&v.length<=max?v:null; }
function safeReturnUrl(value: unknown, allowedOrigins: string[]): string | null { const raw=text(value,2048);if(!raw)return null;try{const url=new URL(raw);return url.protocol==="https:"&&allowedOrigins.includes(url.origin)?url.toString():null;}catch{return null;} }
function serviceConfig(){const url=process.env.SUPABASE_PROJECT_URL?.trim()||process.env.SUPABASE_URL?.trim()||"";const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";return{url,key,configured:Boolean(url&&key)};}
async function supabase<T>(path:string,init:RequestInit={}):Promise<T>{const cfg=serviceConfig();if(!cfg.configured)throw new Error("PAYMENT_DATABASE_NOT_CONFIGURED");const response=await fetch(`${cfg.url}/rest/v1/${path}`,{...init,headers:{apikey:cfg.key,authorization:`Bearer ${cfg.key}`,accept:"application/json",...(init.headers||{})},signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error(`PAYMENT_DATABASE_${response.status}`);if(response.status===204)return undefined as T;return await response.json() as T;}
function clientIp(request:Request):string{return(request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||"127.0.0.1").split(",")[0].trim().slice(0,64);}
function base64(value:string):string{return Buffer.from(value,"utf8").toString("base64");}
function hmacBase64(value:string,key:string):string{return createHmac("sha256",key).update(value,"utf8").digest("base64");}
function merchantOid(bookingId:string):string{return bookingId.replace(/[^A-Za-z0-9]/g,"").slice(0,64);}
function calculateCharge(total:number,settings:PaymentSettingsRow):number{if(!Number.isFinite(total)||total<=0)throw new Error("INVALID_BOOKING_TOTAL");const mode=String(settings.deposit_mode||"NONE");const value=Number(settings.deposit_value||0);if(mode==="PERCENT"&&value>0)return Math.max(1,Math.round(total*Math.min(100,value)/100*100)/100);if(mode==="FIXED"&&value>0)return Math.max(1,Math.min(total,Math.round(value*100)/100));return Math.round(total*100)/100;}
async function booking(reference:string):Promise<BookingRow>{const rows=await supabase<BookingRow[]>(`bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=id,reference,item_name,customer_name,customer_email,customer_phone,total_price,currency,payment_method,payment_status,pickup_location&limit=1`);if(!rows[0])throw new Error("BOOKING_NOT_FOUND");return rows[0];}
async function paymentSettings():Promise<PaymentSettingsRow>{const rows=await supabase<PaymentSettingsRow[]>("payment_settings?config_key=eq.main&select=provider,card_enabled,deposit_mode,deposit_value,currency,test_mode&limit=1");return rows[0]||{provider:"NONE",card_enabled:false,deposit_mode:"NONE",deposit_value:0,currency:"TRY",test_mode:true};}
async function recordTransaction(input:{bookingId:string;provider:string;providerReference:string;amount:number;currency:string;requestSnapshot:Record<string,unknown>;responseSnapshot?:Record<string,unknown>}):Promise<void>{await supabase("payment_transactions?on_conflict=idempotency_key",{method:"POST",headers:{"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({booking_id:input.bookingId,provider:input.provider,provider_reference:input.providerReference,idempotency_key:`${input.provider}:${input.providerReference}`,amount:input.amount,currency:input.currency,status:"PENDING",request_snapshot:input.requestSnapshot,response_snapshot:input.responseSnapshot||{}})});}

async function createPaytr(request:Request,body:CreateSessionBody,bookingRow:BookingRow,settings:PaymentSettingsRow,returnUrl:string,cancelUrl:string){
  const config=getPaymentConfig();if(!config.merchantId||!config.merchantKey||!config.merchantSalt)throw new Error("PAYTR_NOT_CONFIGURED");
  const email=bookingRow.customer_email||text(body.customer?.email,160);if(!email||!email.includes("@"))throw new Error("PAYMENT_EMAIL_REQUIRED");
  const amount=calculateCharge(Number(bookingRow.total_price),settings);const paymentAmount=Math.round(amount*100);const oid=merchantOid(bookingRow.id);if(!oid)throw new Error("INVALID_MERCHANT_OID");
  const basket=base64(JSON.stringify([[bookingRow.item_name,amount.toFixed(2),1]]));const noInstallment="0";const maxInstallment="0";const currency=(bookingRow.currency||settings.currency||"TRY").toUpperCase();if(currency!=="TRY")throw new Error("PAYTR_TRY_REQUIRED");const testMode=(settings.test_mode||config.testMode)?"1":"0";const ip=clientIp(request);
  const hashString=`${config.merchantId}${ip}${oid}${email}${paymentAmount}${basket}${noInstallment}${maxInstallment}${currency}${testMode}`;const paytrToken=hmacBase64(`${hashString}${config.merchantSalt}`,config.merchantKey);
  const form=new URLSearchParams({merchant_id:config.merchantId,user_ip:ip,merchant_oid:oid,email,payment_amount:String(paymentAmount),paytr_token:paytrToken,user_basket:basket,debug_on:testMode,no_installment:noInstallment,max_installment:maxInstallment,user_name:bookingRow.customer_name,user_address:bookingRow.pickup_location||"Yüksekova, Hakkari",user_phone:bookingRow.customer_phone,merchant_ok_url:returnUrl,merchant_fail_url:cancelUrl,timeout_limit:"30",currency,test_mode:testMode,lang:"tr"});
  const upstream=await fetch("https://www.paytr.com/odeme/api/get-token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form,signal:AbortSignal.timeout(12000)});const result=await upstream.json().catch(()=>({})) as Record<string,unknown>;if(!upstream.ok||result.status!=="success"||typeof result.token!=="string")throw new Error(`PAYTR_TOKEN_${String(result.reason||upstream.status)}`);
  await recordTransaction({bookingId:bookingRow.id,provider:"paytr",providerReference:oid,amount,currency,requestSnapshot:{bookingReference:bookingRow.reference,depositMode:settings.deposit_mode,depositValue:settings.deposit_value,testMode:testMode==="1"},responseSnapshot:{tokenIssued:true}});
  return json({ok:true,status:"ready",provider:"paytr",checkoutUrl:`https://www.paytr.com/odeme/guvenli/${encodeURIComponent(result.token)}`,externalReference:oid});
}

async function createGeneric(body:CreateSessionBody,bookingRow:BookingRow,settings:PaymentSettingsRow,returnUrl:string,cancelUrl:string){
  const config=getPaymentConfig();if(!config.createSessionUrl||!config.secretKey)throw new Error("GENERIC_PAYMENT_NOT_CONFIGURED");const amount=calculateCharge(Number(bookingRow.total_price),settings);const payload={version:2,bookingReference:bookingRow.reference,amount,currency:bookingRow.currency,method:"CARD",customer:{name:bookingRow.customer_name,email:bookingRow.customer_email||text(body.customer?.email,160),phone:bookingRow.customer_phone},returnUrl,cancelUrl,description:bookingRow.item_name,merchantId:config.merchantId||undefined};const upstream=await fetch(config.createSessionUrl,{method:"POST",headers:{authorization:`Bearer ${config.secretKey}`,"content-type":"application/json","x-alperler-contract-version":"2",...(config.merchantId?{"x-merchant-id":config.merchantId}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});if(!upstream.ok)throw new Error(`GENERIC_PAYMENT_${upstream.status}`);const result=await upstream.json() as Record<string,unknown>;const checkoutUrl=typeof result.checkoutUrl==="string"?result.checkoutUrl:typeof result.url==="string"?result.url:null;if(!checkoutUrl||!checkoutUrl.startsWith("https://"))throw new Error("INVALID_GATEWAY_RESPONSE");const externalReference=typeof result.externalReference==="string"?result.externalReference:typeof result.reference==="string"?result.reference:crypto.randomUUID();await recordTransaction({bookingId:bookingRow.id,provider:"generic_hosted",providerReference:externalReference,amount,currency:bookingRow.currency,requestSnapshot:{bookingReference:bookingRow.reference},responseSnapshot:{checkoutUrlIssued:true}});return json({ok:true,status:"ready",provider:"generic_hosted",checkoutUrl,externalReference});
}

export default { async fetch(request:Request):Promise<Response>{
  if(request.method!=="POST")return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);if(!isAllowedRequestOrigin(request))return json({ok:false,code:"ORIGIN_NOT_ALLOWED"},403);
  const config=getPaymentConfig();if(!config.cardEnabled||!config.configured)return json({ok:false,status:"not_configured",provider:config.provider,code:"PAYMENT_PROVIDER_NOT_CONFIGURED",message:"Online kart ödeme altyapısı henüz aktif değil. Havale/EFT veya teslimde ödeme seçebilirsiniz."},503);
  let body:CreateSessionBody;try{body=await request.json() as CreateSessionBody;}catch{return json({ok:false,code:"INVALID_JSON"},400);}const reference=text(body.bookingReference,128);const returnUrl=safeReturnUrl(body.returnUrl,config.allowedOrigins);const cancelUrl=safeReturnUrl(body.cancelUrl,config.allowedOrigins);if(!reference||body.method!=="CARD"||!returnUrl||!cancelUrl)return json({ok:false,code:"INVALID_PAYMENT_REQUEST"},400);
  try{const [bookingRow,settings]=await Promise.all([booking(reference),paymentSettings()]);if(!settings.card_enabled||settings.provider==="NONE")return json({ok:false,status:"not_configured",provider:config.provider,code:"CARD_DISABLED_BY_ADMIN"},409);if(bookingRow.payment_status==="PAID")return json({ok:false,status:"rejected",provider:config.provider,code:"BOOKING_ALREADY_PAID"},409);if(settings.provider==="PAYTR"&&config.provider!=="paytr")return json({ok:false,status:"not_configured",provider:config.provider,code:"PAYMENT_PROVIDER_MISMATCH"},503);if(settings.provider==="GENERIC_HOSTED"&&config.provider!=="generic_hosted")return json({ok:false,status:"not_configured",provider:config.provider,code:"PAYMENT_PROVIDER_MISMATCH"},503);return config.provider==="paytr"?await createPaytr(request,body,bookingRow,settings,returnUrl,cancelUrl):await createGeneric(body,bookingRow,settings,returnUrl,cancelUrl);}catch(error){console.error("Payment session failed",error);const code=error instanceof Error?error.message:"PAYMENT_GATEWAY_UNAVAILABLE";return json({ok:false,status:code==="BOOKING_NOT_FOUND"?"rejected":"error",provider:config.provider,code,message:"Ödeme oturumu başlatılamadı. Rezervasyon kaydınız korunuyor."},code==="BOOKING_NOT_FOUND"?404:502);}
}};
