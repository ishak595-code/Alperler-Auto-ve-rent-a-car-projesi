import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-request-id',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

type Admin = { id:string; email:string; role:string; permissions:Record<string,unknown> };
type CurrencySummary = { income:number; expense:number; net:number; discount:number };
function json(body:unknown,status=200){return Response.json(body,{status,headers:{...CORS,'cache-control':'no-store','content-type':'application/json; charset=utf-8'}});}
function clean(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):'';}
function headers(extra:Record<string,string>={}){return{apikey:SERVICE,authorization:`Bearer ${SERVICE}`,'content-type':'application/json',...extra};}
async function db(path:string,init:RequestInit={}){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{...headers(),...(init.headers||{})},signal:init.signal||AbortSignal.timeout(15_000)});}
async function rpc(name:string,body:Record<string,unknown>){const response=await db(`rpc/${name}`,{method:'POST',body:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok){const code=clean(payload?.message||payload?.code,180)||`${name.toUpperCase()}_${response.status}`;throw new Error(code);}return payload;}

async function requireFinance(request:Request,manage=false):Promise<Admin>{
  const auth=request.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+/i.test(auth)) throw new Error('UNAUTHORIZED');
  const userRes=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE,authorization:auth},signal:AbortSignal.timeout(8000)});
  if(!userRes.ok) throw new Error('UNAUTHORIZED');
  const user=await userRes.json(); const id=clean(user?.id,80); const email=clean(user?.email,180).toLowerCase();
  const adminRes=await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,email,role,permissions&limit=1`);
  if(!adminRes.ok) throw new Error('ADMIN_LOOKUP_FAILED');
  const rows=await adminRes.json(); const row=Array.isArray(rows)?rows[0]:null; if(!row) throw new Error('FORBIDDEN');
  const permissions=row.permissions&&typeof row.permissions==='object'?row.permissions:{};
  const privileged=['owner','admin'].includes(String(row.role).toLowerCase());
  const allowed=privileged || permissions['finance.manage']===true || (!manage && permissions['finance.read']===true);
  if(!allowed) throw new Error('FORBIDDEN');
  return{id,email,role:String(row.role),permissions};
}
function amount(v:unknown,max=100_000_000){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>max)throw new Error('INVALID_AMOUNT');return Math.round(n*100)/100;}
function nonNegative(v:unknown,max=100_000_000){const n=Number(v||0);if(!Number.isFinite(n)||n<0||n>max)throw new Error('INVALID_AMOUNT');return Math.round(n*100)/100;}
function iso(v:unknown){const raw=clean(v,64);if(!raw)return new Date().toISOString();const d=new Date(raw);if(Number.isNaN(d.getTime()))throw new Error('INVALID_DATE');return d.toISOString();}
function currency(v:unknown){const value=(clean(v,10)||'TRY').toUpperCase();if(!['TRY','EUR','USD','CHF'].includes(value))throw new Error('INVALID_CURRENCY');return value;}
function objectValue(v:unknown):Record<string,unknown>{return v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}

function environmentNotificationStatus(){
  const emailProvider=clean(Deno.env.get('EMAIL_PROVIDER'),30).toLowerCase();
  const resendConfigured=emailProvider==='resend'&&Boolean(clean(Deno.env.get('RESEND_API_KEY'),500))&&Boolean(clean(Deno.env.get('MAIL_FROM'),240));
  const smsProvider=clean(Deno.env.get('SMS_PROVIDER'),30).toLowerCase();
  const twilioConfigured=smsProvider==='twilio'&&Boolean(clean(Deno.env.get('TWILIO_ACCOUNT_SID'),200))&&Boolean(clean(Deno.env.get('TWILIO_AUTH_TOKEN'),300))&&Boolean(clean(Deno.env.get('TWILIO_FROM'),60)||clean(Deno.env.get('TWILIO_MESSAGING_SERVICE_SID'),200));
  return{resendConfigured,twilioConfigured};
}
function notificationStatus(vaultStatus:any){
  const env=environmentNotificationStatus();
  const resendVault=vaultStatus?.resend?.configured===true,twilioVault=vaultStatus?.twilio?.configured===true;
  return{
    resend:{configured:resendVault||env.resendConfigured,vaultConfigured:resendVault,environmentConfigured:env.resendConfigured,source:resendVault?'vault':env.resendConfigured?'environment':'none',updatedAt:vaultStatus?.resend?.updatedAt||null},
    twilio:{configured:twilioVault||env.twilioConfigured,vaultConfigured:twilioVault,environmentConfigured:env.twilioConfigured,source:twilioVault?'vault':env.twilioConfigured?'environment':'none',updatedAt:vaultStatus?.twilio?.updatedAt||null},
  };
}

async function listFinance(request:Request){
  const admin=await requireFinance(request,false);
  const url=new URL(request.url); const from=clean(url.searchParams.get('from'),40); const to=clean(url.searchParams.get('to'),40);
  const filters=[from?`occurred_at=gte.${encodeURIComponent(iso(from))}`:'',to?`occurred_at=lt.${encodeURIComponent(iso(to))}`:''].filter(Boolean).join('&');
  const [financeRes,bookingRes,templateRes,vaultStatus]=await Promise.all([
    db(`finance_transactions?status=neq.VOID&select=*&order=occurred_at.desc&limit=5000${filters?'&'+filters:''}`),
    db('bookings?deleted_at=is.null&select=id,reference,status,total_price,amount_paid,currency,payment_method,payment_status&limit=5000'),
    db('notification_templates?audience=eq.CUSTOMER&select=id,event_key,audience,locale,subject_template,intro_template,next_step_template,is_active,updated_at&order=locale.asc,event_key.asc'),
    rpc('service_notification_provider_secret_status_v2213',{p_actor:admin.id}).catch(()=>({resend:{configured:false},twilio:{configured:false}})),
  ]);
  if(!financeRes.ok)throw new Error(`FINANCE_READ_${financeRes.status}`);if(!bookingRes.ok)throw new Error(`RECEIVABLES_READ_${bookingRes.status}`);if(!templateRes.ok)throw new Error(`NOTIFICATION_TEMPLATE_READ_${templateRes.status}`);
  const rows=await financeRes.json();const bookings=await bookingRes.json();const templates=await templateRes.json();
  const byCurrency:Record<string,CurrencySummary>={};const byCategory:Record<string,number>={};const byPaymentMethod:Record<string,number>={};
  for(const row of Array.isArray(rows)?rows:[]){const cur=String(row.currency||'TRY').toUpperCase();const bucket=byCurrency[cur]||(byCurrency[cur]={income:0,expense:0,net:0,discount:0});const value=Number(row.net_amount||0);if(row.direction==='INCOME')bucket.income+=value;else bucket.expense+=value;bucket.discount+=Number(row.discount_amount||0);bucket.net=bucket.income-bucket.expense;const categoryKey=`${cur}:${row.direction}:${row.category}`;byCategory[categoryKey]=(byCategory[categoryKey]||0)+value;const methodKey=`${cur}:${row.payment_method||row.source||'OTHER'}`;byPaymentMethod[methodKey]=(byPaymentMethod[methodKey]||0)+value;}
  const receivablesByCurrency:Record<string,number>={};let pendingReceivablesCount=0;
  for(const booking of Array.isArray(bookings)?bookings:[]){if(['REJECTED','CANCELLED'].includes(String(booking.status)))continue;const due=Math.max(0,Number(booking.total_price||0)-Number(booking.amount_paid||0));if(due<=0.009)continue;const cur=String(booking.currency||'TRY').toUpperCase();receivablesByCurrency[cur]=(receivablesByCurrency[cur]||0)+due;pendingReceivablesCount+=1;}
  const legacy=byCurrency.TRY||{income:0,expense:0,net:0,discount:0};
  return json({ok:true,transactions:rows,messageTemplates:Array.isArray(templates)?templates:[],notificationProviders:notificationStatus(vaultStatus),summary:{...legacy,count:Array.isArray(rows)?rows.length:0,byCategory,byPaymentMethod,byCurrency,receivablesByCurrency,pendingReceivablesCount}});
}

async function sendPaymentNotification(bookingId:string,payment:any,method:string){
  if(!bookingId||!payment?.id)return{ok:false,code:'NOTIFICATION_SKIPPED'};
  try{const response=await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`,{method:'POST',headers:{authorization:`Bearer ${SERVICE}`,'content-type':'application/json'},body:JSON.stringify({bookingId,event:'payment_received',deliveryKey:`payment_received:${payment.id}`,paymentMethod:method,paymentAmount:Number(payment.amount||0),paymentTransactionId:payment.id}),signal:AbortSignal.timeout(15_000)});return await response.json().catch(()=>({ok:false,code:`NOTIFICATION_${response.status}`}));}catch{return{ok:false,code:'NOTIFICATION_DISPATCH_FAILED'};}
}
async function recordPayment(request:Request,body:any,admin:Admin){
  const reference=clean(body?.bookingReference,128);if(!reference)throw new Error('BOOKING_REFERENCE_REQUIRED');
  const method=clean(body?.method,20).toUpperCase();if(!['OFFICE','EFT'].includes(method))throw new Error('INVALID_PAYMENT_METHOD');
  const paid=amount(body?.amount);const supplied=clean(request.headers.get('x-request-id'),80);const idempotencyKey=/^[A-Za-z0-9._:-]{8,80}$/.test(supplied)?supplied:crypto.randomUUID();
  const result=await rpc('service_record_offline_payment_v221',{p_actor:admin.id,p_booking_reference:reference,p_amount:paid,p_method:method,p_external_reference:clean(body?.externalReference,180)||null,p_note:clean(body?.note,1000)||null,p_idempotency_key:idempotencyKey});
  const payment=(result as any)?.payment;const bookingId=clean((result as any)?.booking?.id,80);const notification=await sendPaymentNotification(bookingId,payment,method);
  return json({...result,notification},(result as any)?.duplicate?200:201);
}
async function saveTemplate(body:any,admin:Admin){
  const id=clean(body?.id,80)||null;const eventKey=clean(body?.eventKey,60).toLowerCase();const locale=clean(body?.locale,10).toLowerCase();
  const result=await rpc('service_save_notification_template_v221',{p_actor:admin.id,p_id:id,p_event_key:eventKey,p_locale:locale,p_subject:clean(body?.subjectTemplate,240),p_intro:clean(body?.introTemplate,3000),p_next_step:clean(body?.nextStepTemplate,3000),p_is_active:body?.isActive!==false});
  return json(result);
}
async function saveNotificationProvider(body:any,admin:Admin){
  const provider=clean(body?.provider,20).toUpperCase();if(!['RESEND','TWILIO'].includes(provider))throw new Error('INVALID_NOTIFICATION_PROVIDER');
  const result=await rpc('service_set_notification_provider_secrets_v2213',{p_actor:admin.id,p_provider:provider,p_payload:objectValue(body?.credentials)});
  return json({ok:true,notificationProviders:notificationStatus(result)});
}
async function clearNotificationProvider(body:any,admin:Admin){
  const provider=clean(body?.provider,20).toUpperCase();if(!['RESEND','TWILIO'].includes(provider))throw new Error('INVALID_NOTIFICATION_PROVIDER');
  const result=await rpc('service_clear_notification_provider_secrets_v2213',{p_actor:admin.id,p_provider:provider});
  return json({ok:true,notificationProviders:notificationStatus(result)});
}

async function createTransaction(body:any,admin:Admin){
  const direction=clean(body?.direction,10).toUpperCase();if(!['INCOME','EXPENSE'].includes(direction))throw new Error('INVALID_DIRECTION');
  const allowed=['RENTAL','VEHICLE_SALE','TOUR','DEPOSIT','SERVICE','REFUND','MAINTENANCE','FUEL','CLEANING','INSURANCE','TAX','ADVERTISING','SALARY','OFFICE','OTHER'];
  const category=clean(body?.category,40).toUpperCase();if(!allowed.includes(category))throw new Error('INVALID_CATEGORY');const gross=amount(body?.amount);const discount=nonNegative(body?.discountAmount);if(discount>gross)throw new Error('INVALID_DISCOUNT');
  const row={occurred_at:iso(body?.occurredAt),direction,category,payment_method:clean(body?.paymentMethod,30)||null,gross_amount:gross,discount_amount:discount,tax_amount:0,net_amount:Math.max(0,gross-discount),currency:currency(body?.currency),counterparty_name:clean(body?.counterpartyName,200)||null,reference:clean(body?.reference,160)||null,description:clean(body?.description,1500)||null,source:'MANUAL',receipt_number:clean(body?.receiptNumber,120)||null,invoice_number:clean(body?.invoiceNumber,120)||null,status:'POSTED',created_by:admin.id,metadata:{recordedBy:admin.email}};
  const res=await db('finance_transactions?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});if(!res.ok)throw new Error('FINANCE_INSERT_FAILED');return json({ok:true,transaction:(await res.json())?.[0]},201);
}
async function voidTransaction(body:any,admin:Admin){
  const id=clean(body?.id,80);if(!id)throw new Error('ID_REQUIRED');
  const current=await db(`finance_transactions?id=eq.${encodeURIComponent(id)}&select=id,status,source,payment_transaction_id,metadata&limit=1`);if(!current.ok)throw new Error('FINANCE_READ_FAILED');
  const rows=await current.json();const row=rows?.[0];if(!row)throw new Error('FINANCE_TRANSACTION_NOT_FOUND');if(row.status==='VOID')return json({ok:true,duplicate:true});
  if(row.payment_transaction_id)throw new Error('PAYMENT_LEDGER_REVERSAL_REQUIRED');
  if(String(row.source||'').toUpperCase()!=='MANUAL')throw new Error('AUTOMATIC_LEDGER_VOID_FORBIDDEN');
  const reason=clean(body?.reason,500);if(reason.length<3)throw new Error('VOID_REASON_REQUIRED');
  const metadata=row.metadata&&typeof row.metadata==='object'?row.metadata:{};
  const res=await db(`finance_transactions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'VOID',metadata:{...metadata,voidedBy:admin.email,voidedAt:new Date().toISOString(),voidReason:reason}})});if(!res.ok)throw new Error('VOID_FAILED');return json({ok:true});
}

function statusFor(code:string){if(code==='UNAUTHORIZED')return 401;if(code==='FORBIDDEN'||code==='FINANCE_ADMIN_REQUIRED')return 403;if(code.includes('NOT_FOUND'))return 404;if(code.includes('ALREADY_SETTLED')||code.includes('IDEMPOTENCY_CONFLICT')||code==='PAYMENT_LEDGER_REVERSAL_REQUIRED'||code==='AUTOMATIC_LEDGER_VOID_FORBIDDEN')return 409;if(code.startsWith('INVALID_')||code.endsWith('_REQUIRED')||code.includes('_INCOMPLETE')||code==='PAYMENT_EXCEEDS_OUTSTANDING'||code==='BOOKING_NOT_PAYABLE'||code==='BOOKING_TOTAL_REQUIRED')return 400;return 500;}
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});if(!SUPABASE_URL||!SERVICE)return json({ok:false,code:'SERVER_CONFIG_MISSING'},503);
  try{
    if(request.method==='GET')return await listFinance(request);if(request.method!=='POST')return json({ok:false,code:'METHOD_NOT_ALLOWED'},405);
    const admin=await requireFinance(request,true);let body:any;try{body=await request.json();}catch{return json({ok:false,code:'INVALID_JSON'},400);}const action=clean(body?.action,50);
    if(action==='record_payment')return await recordPayment(request,body,admin);
    if(action==='save_message_template')return await saveTemplate(body,admin);
    if(action==='save_notification_provider')return await saveNotificationProvider(body,admin);
    if(action==='clear_notification_provider')return await clearNotificationProvider(body,admin);
    if(action==='create_transaction')return await createTransaction(body,admin);
    if(action==='void_transaction')return await voidTransaction(body,admin);
    return json({ok:false,code:'UNKNOWN_ACTION'},400);
  }catch(error){const code=error instanceof Error?error.message:'FINANCE_FAILED';console.error('finance-admin',code);return json({ok:false,code},statusFor(code));}
});
