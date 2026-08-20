import { createHmac, timingSafeEqual } from "node:crypto";
import { getPaymentConfig } from "../_lib/integration-config";

interface TransactionRow { id:string; booking_id:string; amount:number; currency:string; status:string; provider_reference:string|null; }
function ok():Response{return new Response("OK",{status:200,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});}
function error(status:number,code:string):Response{return new Response(code,{status,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store"}});}
function serviceConfig(){const url=process.env.SUPABASE_PROJECT_URL?.trim()||process.env.SUPABASE_URL?.trim()||"";const key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";return{url,key,configured:Boolean(url&&key)};}
async function db<T>(path:string,init:RequestInit={}):Promise<T>{const cfg=serviceConfig();if(!cfg.configured)throw new Error("DATABASE_NOT_CONFIGURED");const response=await fetch(`${cfg.url}/rest/v1/${path}`,{...init,headers:{apikey:cfg.key,authorization:`Bearer ${cfg.key}`,accept:"application/json",...(init.headers||{})},signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error(`DATABASE_${response.status}`);if(response.status===204)return undefined as T;return await response.json() as T;}
function hmac(value:string,key:string):string{return createHmac("sha256",key).update(value,"utf8").digest("base64");}
function same(a:string,b:string):boolean{const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}

export default { async fetch(request:Request):Promise<Response>{
  if(request.method!=="POST")return error(405,"METHOD_NOT_ALLOWED");
  const config=getPaymentConfig();if(config.provider!=="paytr"||!config.merchantKey||!config.merchantSalt)return error(503,"PAYTR_NOT_CONFIGURED");
  let form:URLSearchParams;try{form=new URLSearchParams(await request.text());}catch{return error(400,"INVALID_CALLBACK");}
  const merchantOid=(form.get("merchant_oid")||"").trim();const status=(form.get("status")||"").trim();const totalAmount=(form.get("total_amount")||"").trim();const hashValue=(form.get("hash")||"").trim();const failedReasonCode=(form.get("failed_reason_code")||"").trim();const failedReasonMsg=(form.get("failed_reason_msg")||"").trim();
  if(!merchantOid||!status||!totalAmount||!hashValue)return error(400,"INVALID_CALLBACK");
  const expected=hmac(`${merchantOid}${config.merchantSalt}${status}${totalAmount}`,config.merchantKey);if(!same(hashValue,expected))return error(400,"INVALID_HASH");
  try{
    const rows=await db<TransactionRow[]>(`payment_transactions?provider=eq.paytr&provider_reference=eq.${encodeURIComponent(merchantOid)}&select=id,booking_id,amount,currency,status,provider_reference&limit=1`);const tx=rows[0];if(!tx)return error(404,"TRANSACTION_NOT_FOUND");
    if(["PAID","FAILED","CANCELLED","REFUNDED","PARTIALLY_REFUNDED"].includes(tx.status))return ok();
    const expectedMinor=Math.round(Number(tx.amount)*100);const receivedMinor=Number(totalAmount);const amountValid=Number.isFinite(receivedMinor)&&receivedMinor===expectedMinor;const success=status==="success"&&amountValid;
    const txStatus=success?"PAID":"FAILED";const bookingStatus=success?"PAID":"FAILED";
    await db(`payment_transactions?id=eq.${encodeURIComponent(tx.id)}`,{method:"PATCH",headers:{"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:txStatus,response_snapshot:{paytrStatus:status,totalAmount:receivedMinor,amountValid,failedReasonCode:failedReasonCode||null,failedReasonMsg:failedReasonMsg.slice(0,300)||null},updated_at:new Date().toISOString()})});
    await db(`bookings?id=eq.${encodeURIComponent(tx.booking_id)}`,{method:"PATCH",headers:{"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({payment_status:bookingStatus,external_payment_reference:merchantOid,updated_at:new Date().toISOString()})});
    return ok();
  }catch(e){console.error("PayTR callback persistence failed",e);return error(500,"CALLBACK_PERSISTENCE_FAILED");}
}};
