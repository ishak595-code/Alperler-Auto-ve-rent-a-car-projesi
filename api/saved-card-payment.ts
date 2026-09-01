import { createHmac, timingSafeEqual } from 'node:crypto';
import { getPaymentConfig, isAllowedRequestOrigin } from './_lib/integration-config';
import { resolveIyzicoCredentials } from './_lib/payment-provider-credentials';

type Json = Record<string, unknown>;
type AuthUser = { id:string; email?:string|null; email_confirmed_at?:string|null };
type BookingRow = { id:string; reference:string; item_name:string; customer_name:string; customer_email:string|null; customer_phone:string; total_price:number|null; currency:string; payment_method:string; payment_status:string; customer_user_id:string|null; pickup_location:string|null };
type PaymentSettingsRow = { provider:string; card_enabled:boolean; deposit_mode:string; deposit_value:number; currency:string; test_mode:boolean };
type SavedMethodToken = { provider?:unknown; providerEnvironment?:unknown; environment?:unknown; providerCustomerRef?:unknown; providerPaymentMethodRef?:unknown };
type Body = {
  bookingReference?:unknown;
  paymentMethodId?:unknown;
  amount?:unknown;
  currency?:unknown;
  method?:unknown;
  customer?:{ name?:unknown; email?:unknown; phone?:unknown; identityNumber?:unknown; billingAddress?:unknown; city?:unknown; country?:unknown; zipCode?:unknown };
  description?:unknown;
  metadata?:unknown;
};

function json(body:unknown,status=200):Response{return Response.json(body,{status,headers:{'cache-control':'private, no-store, max-age=0','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});}
function text(value:unknown,max:number):string|null{if(typeof value!=='string')return null;const clean=value.trim();return clean&&clean.length<=max?clean:null;}
function uuid(value:unknown):string|null{const clean=text(value,80);return clean&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)?clean:null;}
function serviceConfig(){const url=process.env.SUPABASE_PROJECT_URL?.trim()||process.env.SUPABASE_URL?.trim()||'';const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||'';return{url,key,configured:Boolean(url&&key)};}
async function db<T>(path:string,init:RequestInit={}):Promise<T>{const cfg=serviceConfig();if(!cfg.configured)throw new Error('PAYMENT_DATABASE_NOT_CONFIGURED');const response=await fetch(`${cfg.url}/rest/v1/${path}`,{...init,headers:{apikey:cfg.key,authorization:`Bearer ${cfg.key}`,accept:'application/json',...(init.headers||{})},cache:'no-store',signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error(`PAYMENT_DATABASE_${response.status}`);if(response.status===204)return undefined as T;return await response.json() as T;}
async function authenticatedUser(request:Request):Promise<AuthUser>{const authorization=request.headers.get('authorization')||'';if(!/^Bearer\s+\S+/i.test(authorization))throw new Error('UNAUTHORIZED');const cfg=serviceConfig();if(!cfg.configured)throw new Error('PAYMENT_DATABASE_NOT_CONFIGURED');const response=await fetch(`${cfg.url}/auth/v1/user`,{headers:{apikey:cfg.key,authorization},cache:'no-store',signal:AbortSignal.timeout(8000)});const user=await response.json().catch(()=>({})) as AuthUser;if(!response.ok||!user.id||!user.email_confirmed_at)throw new Error('UNAUTHORIZED');return user;}
function hmacHex(value:string,key:string):string{return createHmac('sha256',key).update(value,'utf8').digest('hex');}
function base64(value:string):string{return Buffer.from(value,'utf8').toString('base64');}
function sameHash(a:string,b:string):boolean{const aa=Buffer.from(a.toLowerCase());const bb=Buffer.from(b.toLowerCase());return aa.length===bb.length&&timingSafeEqual(aa,bb);}
function iyzicoSignatureValue(field:string,value:unknown):string{const raw=String(value??'');if((field==='price'||field==='paidPrice')&&/^-?\d+(?:\.\d+)?$/.test(raw)){const[int,decimal='']=raw.split('.');const trimmed=decimal.replace(/0+$/,'');return trimmed?`${int}.${trimmed}`:int;}return raw;}
function verifyIyzicoSignature(result:Json,secretKey:string):boolean{const signature=text(result.signature,256);if(!signature)return false;const fields=['paymentId','currency','basketId','conversationId','paidPrice','price'];const expected=hmacHex(fields.map(field=>iyzicoSignatureValue(field,result[field])).join(':'),secretKey);return sameHash(expected,signature);}
function iyzicoAuthorization(path:string,body:string,apiKey:string,secretKey:string):{authorization:string;randomKey:string}{const randomKey=`${Date.now()}${crypto.randomUUID().replace(/-/g,'').slice(0,12)}`;const signature=hmacHex(`${randomKey}${path}${body}`,secretKey);return{authorization:`IYZWSv2 ${base64(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`)}`,randomKey};}
async function iyzicoPost(path:string,payload:Json,testMode:boolean):Promise<{result:Json;secretKey:string}>{const credentials=await resolveIyzicoCredentials(testMode);if(!credentials.configured||!credentials.apiKey||!credentials.secretKey)throw new Error(testMode?'IYZICO_SANDBOX_NOT_CONFIGURED':'IYZICO_LIVE_NOT_CONFIGURED');const body=JSON.stringify(payload);const auth=iyzicoAuthorization(path,body,credentials.apiKey,credentials.secretKey);const response=await fetch(`${credentials.baseUrl}${path}`,{method:'POST',headers:{authorization:auth.authorization,'x-iyzi-rnd':auth.randomKey,'content-type':'application/json'},body,cache:'no-store',signal:AbortSignal.timeout(15000)});const result=await response.json().catch(()=>({})) as Json;if(!response.ok)throw new Error(`IYZICO_HTTP_${response.status}`);return{result,secretKey:credentials.secretKey};}
function calculateCharge(total:number,settings:PaymentSettingsRow):number{if(!Number.isFinite(total)||total<=0)throw new Error('INVALID_BOOKING_TOTAL');const mode=String(settings.deposit_mode||'NONE');const value=Number(settings.deposit_value||0);if(mode==='PERCENT'&&value>0)return Math.max(1,Math.round(total*Math.min(100,value)/100*100)/100);if(mode==='FIXED'&&value>0)return Math.max(1,Math.min(total,Math.round(value*100)/100));return Math.round(total*100)/100;}
function splitName(full:string):{name:string;surname:string}{const parts=full.trim().split(/\s+/).filter(Boolean);if(parts.length<2)throw new Error('PAYMENT_SURNAME_REQUIRED');return{name:parts.slice(0,-1).join(' ').slice(0,80),surname:parts.at(-1)!.slice(0,80)};}
async function booking(reference:string):Promise<BookingRow>{const rows=await db<BookingRow[]>(`bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=id,reference,item_name,customer_name,customer_email,customer_phone,total_price,currency,payment_method,payment_status,customer_user_id,pickup_location&limit=1`);if(!rows[0])throw new Error('BOOKING_NOT_FOUND');return rows[0];}
async function paymentSettings():Promise<PaymentSettingsRow>{const rows=await db<PaymentSettingsRow[]>('payment_settings?config_key=eq.main&select=provider,card_enabled,deposit_mode,deposit_value,currency,test_mode&limit=1');return rows[0]||{provider:'NONE',card_enabled:false,deposit_mode:'NONE',deposit_value:0,currency:'TRY',test_mode:true};}
async function savedMethodToken(userId:string,methodId:string):Promise<SavedMethodToken|null>{return await db<SavedMethodToken|null>('rpc/service_customer_payment_method_token_v225',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p_user_id:userId,p_method_id:methodId})});}
async function recordResult(input:{booking:BookingRow;providerReference:string;amount:number;currency:string;status:'PAID'|'AUTHORIZED';paymentMethodId:string;result:Json;signatureValid:boolean}):Promise<void>{const responseSnapshot={paymentStatus:input.result.paymentStatus||null,paymentId:input.result.paymentId||null,paidPrice:Number(input.result.paidPrice),currency:input.result.currency||null,fraudStatus:Number(input.result.fraudStatus),signatureValid:input.signatureValid};await db('payment_transactions?on_conflict=idempotency_key',{method:'POST',headers:{'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({booking_id:input.booking.id,provider:'iyzico',provider_reference:input.providerReference,idempotency_key:`iyzico:saved:${input.providerReference}`,amount:input.amount,currency:input.currency,status:input.status,request_snapshot:{bookingReference:input.booking.reference,paymentMethodId:input.paymentMethodId,storedCard:true},response_snapshot:responseSnapshot})});await db(`bookings?id=eq.${encodeURIComponent(input.booking.id)}`,{method:'PATCH',headers:{'content-type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({payment_status:input.status==='PAID'?'PAID':'PENDING',external_payment_reference:input.providerReference,updated_at:new Date().toISOString()})});}

async function charge(request:Request):Promise<Response>{
  if(request.method!=='POST')return json({ok:false,code:'METHOD_NOT_ALLOWED'},405);
  if(!isAllowedRequestOrigin(request))return json({ok:false,code:'ORIGIN_NOT_ALLOWED'},403);
  if(Number(request.headers.get('content-length')||0)>16_384)return json({ok:false,code:'PAYLOAD_TOO_LARGE'},413);
  let body:Body;try{body=await request.json() as Body;}catch{return json({ok:false,code:'INVALID_JSON'},400);}
  const reference=text(body.bookingReference,128);const methodId=uuid(body.paymentMethodId);
  if(!reference||!methodId||body.method!=='CARD')return json({ok:false,code:'INVALID_SAVED_CARD_PAYMENT_REQUEST'},400);
  try{
    const user=await authenticatedUser(request);
    const [bookingRow,settings]=await Promise.all([booking(reference),paymentSettings()]);
    const globalConfig=getPaymentConfig();
    if(!globalConfig.cardEnabled||!settings.card_enabled)return json({ok:false,status:'not_configured',provider:'iyzico',code:'CARD_DISABLED_BY_ADMIN'},409);
    if(String(settings.provider||'').toUpperCase()!=='IYZICO')return json({ok:false,status:'rejected',provider:settings.provider==='PAYTR'?'paytr':'none',code:'SAVED_CARD_PROVIDER_MISMATCH',message:'Kayıtlı kartla ödeme yalnız iyzico aktif ödeme sağlayıcısıyken kullanılabilir.'},409);
    if(bookingRow.customer_user_id!==user.id)return json({ok:false,status:'rejected',provider:'iyzico',code:'BOOKING_ACCESS_DENIED'},403);
    if(bookingRow.payment_status==='PAID')return json({ok:false,status:'rejected',provider:'iyzico',code:'BOOKING_ALREADY_PAID'},409);
    if(bookingRow.payment_method!=='CARD')return json({ok:false,status:'rejected',provider:'iyzico',code:'BOOKING_CARD_PAYMENT_NOT_SELECTED'},409);

    const token=await savedMethodToken(user.id,methodId);
    if(!token)return json({ok:false,status:'rejected',provider:'iyzico',code:'PAYMENT_METHOD_NOT_FOUND'},404);
    const provider=String(token.provider||'');const environment=String(token.providerEnvironment||token.environment||'');const expectedEnvironment=settings.test_mode?'sandbox':'live';
    const cardUserKey=text(token.providerCustomerRef,500);const cardToken=text(token.providerPaymentMethodRef,500);
    if(provider!=='IYZICO'||environment!==expectedEnvironment||!cardUserKey||!cardToken)return json({ok:false,status:'rejected',provider:'iyzico',code:'PAYMENT_METHOD_ENVIRONMENT_MISMATCH'},409);

    const amount=calculateCharge(Number(bookingRow.total_price),settings);const currency=(settings.currency||bookingRow.currency||'TRY').toUpperCase();if(!['TRY','EUR','USD','CHF'].includes(currency))throw new Error('IYZICO_CURRENCY_UNSUPPORTED');
    const email=bookingRow.customer_email||text(body.customer?.email,100);const phone=bookingRow.customer_phone||text(body.customer?.phone,40);const identityNumber=text(body.customer?.identityNumber,50);const billingAddress=text(body.customer?.billingAddress,500);const city=text(body.customer?.city,100);const country=text(body.customer?.country,100);const zipCode=text(body.customer?.zipCode,20)||'00000';
    if(!email||!email.includes('@'))throw new Error('PAYMENT_EMAIL_REQUIRED');if(!phone)throw new Error('PAYMENT_PHONE_REQUIRED');if(!identityNumber||identityNumber.length<5)throw new Error('IYZICO_IDENTITY_REQUIRED');if(!billingAddress||billingAddress.length<5||!city||!country)throw new Error('IYZICO_BILLING_ADDRESS_REQUIRED');
    const names=splitName(bookingRow.customer_name||String(body.customer?.name||''));const conversationId=`saved-${bookingRow.id}-${crypto.randomUUID().slice(0,8)}`;
    const payload:Json={locale:'tr',conversationId,price:amount,paidPrice:amount,installment:1,paymentChannel:'WEB',currency,basketId:bookingRow.reference,paymentGroup:'PRODUCT',paymentCard:{cardUserKey,cardToken},buyer:{id:user.id,name:names.name,surname:names.surname,identityNumber,email,gsmNumber:phone,registrationAddress:billingAddress,city,country,zipCode,ip:(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'127.0.0.1').split(',')[0].trim().slice(0,64)},billingAddress:{address:billingAddress,zipCode,contactName:bookingRow.customer_name,city,country},basketItems:[{id:bookingRow.id,price:amount,name:bookingRow.item_name,category1:'Araç Kiralama',itemType:'VIRTUAL'}]};
    const {result,secretKey}=await iyzicoPost('/payment/auth',payload,settings.test_mode);
    if(result.status!=='success'||result.paymentStatus!=='SUCCESS'){return json({ok:false,status:'rejected',provider:'iyzico',code:String(result.errorCode||'IYZICO_PAYMENT_REJECTED'),message:String(result.errorMessage||'Kart ödemesi onaylanmadı. Başka bir kart veya ödeme yöntemi deneyin.').slice(0,220)},402);}
    const signatureValid=verifyIyzicoSignature(result,secretKey);if(!signatureValid)throw new Error('IYZICO_PAYMENT_SIGNATURE_INVALID');
    const receivedAmount=Number(result.paidPrice);const amountValid=Number.isFinite(receivedAmount)&&Math.round(receivedAmount*100)===Math.round(amount*100);const currencyValid=String(result.currency||'').toUpperCase()===currency;if(!amountValid||!currencyValid)throw new Error('IYZICO_PAYMENT_AMOUNT_MISMATCH');
    const fraudStatus=Number(result.fraudStatus);const providerReference=text(result.paymentId,160);if(!providerReference)throw new Error('IYZICO_PAYMENT_ID_MISSING');
    if(fraudStatus===1||fraudStatus===2){await recordResult({booking:bookingRow,providerReference,amount,currency,status:'PAID',paymentMethodId:methodId,result,signatureValid});return json({ok:true,status:'paid',provider:'iyzico',externalReference:providerReference,message:'Kart ödemeniz başarıyla alındı.'});}
    if(fraudStatus===0){await recordResult({booking:bookingRow,providerReference,amount,currency,status:'AUTHORIZED',paymentMethodId:methodId,result,signatureValid});return json({ok:true,status:'ready',provider:'iyzico',externalReference:providerReference,message:'Kart ödemeniz güvenlik incelemesinde. Rezervasyon kaydınız korunuyor.'});}
    return json({ok:false,status:'rejected',provider:'iyzico',code:'IYZICO_FRAUD_REJECTED',message:'Kart ödemesi güvenlik kontrolünden geçmedi. Başka bir kart veya ödeme yöntemi deneyin.'},402);
  }catch(error){const code=error instanceof Error?error.message:'SAVED_CARD_PAYMENT_FAILED';console.error('saved-card-payment',code);const status=code==='UNAUTHORIZED'?401:code==='BOOKING_NOT_FOUND'?404:code.includes('NOT_CONFIGURED')?503:code.startsWith('INVALID_')?400:502;return json({ok:false,status:'error',provider:'iyzico',code,message:'Kayıtlı kart ödemesi başlatılamadı. Rezervasyon kaydınız korunuyor.'},status);}
}

export default{async fetch(request:Request):Promise<Response>{return charge(request);}};
