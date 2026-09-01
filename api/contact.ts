import { isAllowedRequestOrigin } from "./_lib/integration-config";
import { getMailerConfig, sendConfiguredMail } from "./_lib/mailer";

const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

type EmailRequestBody = { to?:unknown; subject?:unknown; text?:unknown; html?:unknown };
type RateBucket = { count:number; resetAt:number };
const emailBuckets=new Map<string,RateBucket>();
const EMAIL_WINDOW_MS=10*60*1000;
const EMAIL_MAX_REQUESTS=10;

function responseJson(body:unknown,status=200):Response{return Response.json(body,{status,headers:{"cache-control":"no-store","content-type":"application/json; charset=utf-8"}});}
function clientIp(request: Request): string {return(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||request.headers.get("x-real-ip")?.trim()||"unknown").slice(0,100);}
function emailRateLimited(request:Request):boolean{const now=Date.now(),key=clientIp(request);const current=emailBuckets.get(key);if(!current||current.resetAt<=now){emailBuckets.set(key,{count:1,resetAt:now+EMAIL_WINDOW_MS});return false;}current.count+=1;return current.count>EMAIL_MAX_REQUESTS;}
function cleanText(value:unknown,maxLength:number):string|null{if(typeof value!=="string")return null;const normalized=value.trim();return normalized&&normalized.length<=maxLength?normalized:null;}
function cleanEmail(value:unknown):string|null{const normalized=cleanText(value,160)?.toLowerCase()||null;return normalized&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)?normalized:null;}

async function publicContact(request: Request): Promise<Response> {
  if(request.method!=="POST")return responseJson({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  try{
    const upstream=await fetch(`${SUPABASE_URL}/functions/v1/contact-gateway`,{method:"POST",headers:{"content-type":"application/json","x-client-ip":clientIp(request),"user-agent":request.headers.get("user-agent")||"alperler-web"},body:await request.text(),signal:AbortSignal.timeout(20_000)});
    return new Response(await upstream.text(),{status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")||"application/json; charset=utf-8","cache-control":"no-store"}});
  }catch(error){console.error("Supabase contact gateway unavailable",error);return responseJson({ok:false,code:"CONTACT_GATEWAY_UNAVAILABLE",message:"Mesaj servisine şu anda ulaşılamıyor."},503);}
}

async function adminContact(request: Request): Promise<Response> {
  const method=request.method.toUpperCase();
  if(!["GET","PATCH"].includes(method))return responseJson({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  const authorization=request.headers.get("authorization");
  if(!authorization?.startsWith("Bearer "))return responseJson({ok:false,code:"UNAUTHORIZED"},401);
  try{
    const upstream=await fetch(`${SUPABASE_URL}/functions/v1/contact-admin`,{method,headers:{authorization,"content-type":"application/json"},body:method==="GET"?undefined:await request.text(),signal:AbortSignal.timeout(12_000)});
    return new Response(await upstream.text(),{status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")||"application/json; charset=utf-8","cache-control":"private, no-store"}});
  }catch(error){console.error("Contact admin gateway unavailable",error);return responseJson({ok:false,code:"CONTACT_ADMIN_UNAVAILABLE"},503);}
}

async function legacyEmail(request:Request):Promise<Response>{
  if(request.method!=="POST")return responseJson({success:false,code:"METHOD_NOT_ALLOWED"},405);
  if(!isAllowedRequestOrigin(request))return responseJson({success:false,code:"ORIGIN_NOT_ALLOWED"},403);
  if(emailRateLimited(request))return responseJson({success:false,code:"RATE_LIMITED"},429);
  const config=getMailerConfig();
  if(!config.configured)return responseJson({success:false,code:"EMAIL_NOT_CONFIGURED",message:"E-posta sağlayıcısı henüz yapılandırılmamış."},503);
  let body:EmailRequestBody;try{body=await request.json() as EmailRequestBody;}catch{return responseJson({success:false,code:"INVALID_JSON"},400);}
  const requestedRecipient=body.to===undefined?null:cleanEmail(body.to);const to=requestedRecipient||config.adminTo;const subject=cleanText(body.subject,180);const bodyText=cleanText(body.text,20_000);const html=typeof body.html==="string"&&body.html.length<=50_000?body.html:undefined;
  if(!to||!subject||!bodyText||(body.to!==undefined&&!requestedRecipient))return responseJson({success:false,code:"INVALID_EMAIL_REQUEST"},400);
  if(!config.allowedRecipients.has(to))return responseJson({success:false,code:"RECIPIENT_NOT_ALLOWED",message:"Tarayıcıdan doğrudan e-posta gönderimi yalnızca yapılandırılmış işletme adreslerine açıktır."},403);
  try{const result=await sendConfiguredMail({to,subject,text:bodyText,html});return responseJson({success:true,messageId:result.messageId});}
  catch(error){console.error("Transactional email delivery failed.",error);return responseJson({success:false,code:"EMAIL_DELIVERY_FAILED",message:"E-posta sağlayıcısı gönderimi tamamlayamadı."},502);}
}

export default{async fetch(request:Request):Promise<Response>{const mode=new URL(request.url).searchParams.get("mode");if(mode==="admin")return adminContact(request);if(mode==="email")return legacyEmail(request);return publicContact(request);}};
