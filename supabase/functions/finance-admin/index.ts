import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};

type Admin = { id:string; email:string; role:string; permissions:Record<string,unknown> };
function json(body:unknown,status=200){return Response.json(body,{status,headers:{...CORS,'cache-control':'no-store'}});}
function clean(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):'';}
function headers(extra:Record<string,string>={}){return{apikey:SERVICE,authorization:`Bearer ${SERVICE}`,'content-type':'application/json',...extra};}
async function db(path:string,init:RequestInit={}){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{...headers(),...(init.headers||{})}});}

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
  const privileged=['owner','admin'].includes(String(row.role));
  const allowed=privileged || permissions['finance.manage']===true || (!manage && permissions['finance.read']===true);
  if(!allowed) throw new Error('FORBIDDEN');
  return{id,email,role:String(row.role),permissions};
}
function amount(v:unknown,max=100_000_000){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>max)throw new Error('INVALID_AMOUNT');return Math.round(n*100)/100;}
function iso(v:unknown){const raw=clean(v,64);if(!raw)return new Date().toISOString();const d=new Date(raw);if(Number.isNaN(d.getTime()))throw new Error('INVALID_DATE');return d.toISOString();}

async function listFinance(request:Request){
  await requireFinance(request,false);
  const url=new URL(request.url); const from=clean(url.searchParams.get('from'),40); const to=clean(url.searchParams.get('to'),40);
  const filters=[from?`occurred_at=gte.${encodeURIComponent(iso(from))}`:'',to?`occurred_at=lt.${encodeURIComponent(iso(to))}`:''].filter(Boolean).join('&');
  const res=await db(`finance_transactions?status=neq.VOID&select=*&order=occurred_at.desc&limit=5000${filters?'&'+filters:''}`);
  if(!res.ok) throw new Error(`FINANCE_READ_${res.status}`); const rows=await res.json();
  let income=0,expense=0,discount=0; const byCategory:Record<string,number>={};
  for(const row of Array.isArray(rows)?rows:[]){const value=Number(row.net_amount||0);if(row.direction==='INCOME')income+=value;else expense+=value;discount+=Number(row.discount_amount||0);const k=`${row.direction}:${row.category}`;byCategory[k]=(byCategory[k]||0)+value;}
  return json({ok:true,transactions:rows,summary:{income,expense,net:income-expense,discount,count:Array.isArray(rows)?rows.length:0,byCategory}});
}

async function recordPayment(body:any,admin:Admin){
  const reference=clean(body?.bookingReference,128); if(!reference)throw new Error('BOOKING_REFERENCE_REQUIRED');
  const method=clean(body?.method,20).toUpperCase(); if(!['OFFICE','EFT'].includes(method))throw new Error('INVALID_PAYMENT_METHOD');
  const paid=amount(body?.amount); const bookingRes=await db(`bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=id,reference,total_price,amount_paid,currency,payment_status,customer_name,item_name&limit=1`);
  if(!bookingRes.ok)throw new Error('BOOKING_READ_FAILED'); const bookings=await bookingRes.json(); const booking=bookings?.[0];if(!booking)throw new Error('BOOKING_NOT_FOUND');
  const due=Math.max(0,Number(booking.total_price||0)-Number(booking.amount_paid||0)); if(due>0&&paid>due+0.01)throw new Error('PAYMENT_EXCEEDS_OUTSTANDING');
  const external=clean(body?.externalReference,180)||`${method}-${crypto.randomUUID()}`;
  const txRes=await db('payment_transactions?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({booking_id:booking.id,provider:method.toLowerCase(),provider_reference:external,idempotency_key:`admin:${external}`,amount:paid,currency:booking.currency||'TRY',status:'PAID',request_snapshot:{recordedBy:admin.email,method,note:clean(body?.note,1000)},response_snapshot:{source:'ADMIN_CONFIRMED'}})});
  if(!txRes.ok){const detail=await txRes.text();console.error('office payment insert failed',txRes.status,detail.slice(0,400));throw new Error('PAYMENT_RECORD_FAILED');}
  const tx=(await txRes.json())?.[0]; return json({ok:true,payment:tx},201);
}

async function createTransaction(body:any,admin:Admin){
  const direction=clean(body?.direction,10).toUpperCase(); if(!['INCOME','EXPENSE'].includes(direction))throw new Error('INVALID_DIRECTION');
  const allowed=['RENTAL','VEHICLE_SALE','TOUR','DEPOSIT','SERVICE','REFUND','MAINTENANCE','FUEL','CLEANING','INSURANCE','TAX','ADVERTISING','SALARY','OFFICE','OTHER'];
  const category=clean(body?.category,40).toUpperCase();if(!allowed.includes(category))throw new Error('INVALID_CATEGORY'); const gross=amount(body?.amount); const discount=Math.max(0,Number(body?.discountAmount||0));
  const row={occurred_at:iso(body?.occurredAt),direction,category,payment_method:clean(body?.paymentMethod,30)||null,gross_amount:gross,discount_amount:discount,net_amount:Math.max(0,gross-discount),currency:clean(body?.currency,10)||'TRY',counterparty_name:clean(body?.counterpartyName,200)||null,reference:clean(body?.reference,160)||null,description:clean(body?.description,1500)||null,source:'MANUAL',receipt_number:clean(body?.receiptNumber,120)||null,invoice_number:clean(body?.invoiceNumber,120)||null,status:'POSTED',created_by:admin.id,metadata:{recordedBy:admin.email}};
  const res=await db('finance_transactions?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});if(!res.ok)throw new Error('FINANCE_INSERT_FAILED');return json({ok:true,transaction:(await res.json())?.[0]},201);
}

Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS}); if(!SUPABASE_URL||!SERVICE)return json({ok:false,code:'SERVER_CONFIG_MISSING'},503);
  try{
    if(request.method==='GET')return await listFinance(request); if(request.method!=='POST')return json({ok:false,code:'METHOD_NOT_ALLOWED'},405);
    const admin=await requireFinance(request,true); let body:any;try{body=await request.json();}catch{return json({ok:false,code:'INVALID_JSON'},400);} const action=clean(body?.action,40);
    if(action==='record_payment')return await recordPayment(body,admin); if(action==='create_transaction')return await createTransaction(body,admin);
    if(action==='void_transaction'){const id=clean(body?.id,80);if(!id)return json({ok:false,code:'ID_REQUIRED'},400);const res=await db(`finance_transactions?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'VOID',metadata:{voidedBy:admin.email,voidReason:clean(body?.reason,500)}})});if(!res.ok)throw new Error('VOID_FAILED');return json({ok:true});}
    return json({ok:false,code:'UNKNOWN_ACTION'},400);
  }catch(error){const code=error instanceof Error?error.message:'FINANCE_FAILED';const status=code==='UNAUTHORIZED'?401:code==='FORBIDDEN'?403:code.startsWith('INVALID_')||code.endsWith('_REQUIRED')||code==='PAYMENT_EXCEEDS_OUTSTANDING'?400:500;console.error('finance-admin',code);return json({ok:false,code},status);}
});
