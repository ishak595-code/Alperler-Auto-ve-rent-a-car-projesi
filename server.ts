import "dotenv/config";
import express, { Request as ExpressRequest, Response as ExpressResponse } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bookingsApi from "./api/bookings";
import rentalAvailabilityApi from "./api/rental-availability";
import adminBookingActionsApi from "./api/admin-booking-actions";
import branchesApi from "./api/branches";
import catalogApi from "./api/catalog";
import contactApi from "./api/contact";
import paymentsApi from "./api/payments";
import partnerApi from "./api/partner";
import branchNetworkApi from "./api/branch-network";
import financeReportApi from "./api/finance/report";
import sendEmailApi from "./api/send-email";
import robotsApi from "./api/robots";
import sitemapApi from "./api/sitemap";
import socialPreviewApi from "./api/social-preview";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const app=express();
const port=Number(process.env.PORT||3000);
const distPath=path.join(__dirname,"dist");
const indexPath=path.join(distPath,"index.html");
const CSP="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'sha256-ZHJXTbs9LqPCQknLOayELWOOEZpWqW3sRQ35i6HZuTc='; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; frame-src 'self' https:; manifest-src 'self'; worker-src 'self' blob:; upgrade-insecure-requests";
const supabaseProjectUrl=String(process.env.SUPABASE_PROJECT_URL||"").trim().replace(/\/$/,"");

app.disable("x-powered-by");
app.set("trust proxy",true);
app.use((req,res,next)=>{
  res.setHeader("Strict-Transport-Security","max-age=31536000");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("X-Permitted-Cross-Domain-Policies","none");
  res.setHeader("X-DNS-Prefetch-Control","off");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy","same-origin-allow-popups");
  res.setHeader("Origin-Agent-Cluster","?1");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), serial=(), bluetooth=()");
  res.setHeader("Content-Security-Policy",CSP);
  if(/^\/(?:admin|branch-portal|track-car|booking-checkout)(?:\/|$)/.test(req.path)){
    res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive, nosnippet");
    res.setHeader("Cache-Control","no-store");
  }else if(req.path.startsWith("/api/")){
    res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");
    res.setHeader("Cache-Control","no-store");
  }
  next();
});
app.get("/health",(_req,res)=>{res.setHeader("Cache-Control","no-store");res.status(200).json({ok:true,runtime:"node",service:"alperler-web"});});

type WebHandler={fetch(request:Request):Promise<Response>};
type RouteTarget={handler:WebHandler;query?:Record<string,string>};
const directApiHandlers=new Map<string,WebHandler>([
  ["/api/bookings",bookingsApi],
  ["/api/rental-availability",rentalAvailabilityApi],
  ["/api/admin-booking-actions",adminBookingActionsApi],
  ["/api/branches",branchesApi],
  ["/api/catalog",catalogApi],
  ["/api/contact",contactApi],
  ["/api/payments",paymentsApi],
  ["/api/partner",partnerApi],
  ["/api/branch-network",branchNetworkApi],
  ["/api/finance/report",financeReportApi],
  ["/api/send-email",sendEmailApi],
]);
const aliasTargets=new Map<string,RouteTarget>([
  ["/api/contact-admin",{handler:contactApi,query:{mode:"admin"}}],
  ["/api/partner-requests",{handler:partnerApi,query:{op:"requests"}}],
  ["/api/partner-media",{handler:partnerApi,query:{op:"media"}}],
  ["/api/partner-upload-resume",{handler:partnerApi,query:{op:"resume"}}],
  ["/api/payments/create-session",{handler:paymentsApi,query:{op:"create-session"}}],
  ["/api/payments/paytr-callback",{handler:paymentsApi,query:{op:"paytr-callback"}}],
  ["/api/integrations/status",{handler:bookingsApi,query:{mode:"integration-status"}}],
]);
app.use("/api",express.raw({type:"*/*",limit:"2mb"}));

function requestOrigin(req:ExpressRequest):string{
  const forwardedProto=String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim();
  const forwardedHost=String(req.headers["x-forwarded-host"]||"").split(",")[0].trim();
  const protocol=forwardedProto||req.protocol||"http";
  const host=forwardedHost||req.get("host")||`localhost:${port}`;
  return `${protocol}://${host}`;
}
function webRequest(req:ExpressRequest,queryPatch?:Record<string,string>):Request{
  const target=new URL(`${requestOrigin(req)}${req.originalUrl}`);
  for(const [key,value] of Object.entries(queryPatch||{}))target.searchParams.set(key,value);
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers)){
    if(value===undefined)continue;
    if(Array.isArray(value))for(const item of value)headers.append(key,item);else headers.set(key,String(value));
  }
  const method=req.method.toUpperCase();
  const buffer=method==="GET"||method==="HEAD"?null:(Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body||""));
  const body=buffer&&buffer.length?new Uint8Array(buffer):undefined;
  return new Request(target,{method,headers,body,redirect:"manual"});
}
async function sendWebResponse(upstream:Response,res:ExpressResponse):Promise<void>{
  upstream.headers.forEach((value,key)=>res.setHeader(key,value));
  res.status(upstream.status);
  res.send(Buffer.from(await upstream.arrayBuffer()));
}

app.all(/^\/api\/.*/,async(req,res,next)=>{
  const pathName=req.path.replace(/\/$/,"");
  const target=aliasTargets.get(pathName)||(()=>{const handler=directApiHandlers.get(pathName);return handler?{handler}:undefined;})();
  if(!target){next();return;}
  try{await sendWebResponse(await target.handler.fetch(webRequest(req,target.query)),res);}catch(error){console.error("Portable API adapter failed",pathName,error);res.setHeader("Cache-Control","no-store");res.status(503).json({ok:false,code:"API_ADAPTER_UNAVAILABLE"});}
});

async function serveWebHandler(req:ExpressRequest,res:ExpressResponse,handler:WebHandler,query?:Record<string,string>):Promise<void>{
  try{await sendWebResponse(await handler.fetch(webRequest(req,query)),res);}catch(error){console.error("Portable dynamic route failed",req.path,error);res.status(503).send("Service unavailable");}
}
app.all("/robots.txt",(req,res)=>void serveWebHandler(req,res,robotsApi));
app.all("/sitemap.xml",(req,res)=>void serveWebHandler(req,res,sitemapApi));

app.get(/^\/catalog-media\/.+/, (req,res)=>{
  if(!supabaseProjectUrl){res.setHeader("Cache-Control","no-store");res.status(503).send("Catalog media storage is not configured.");return;}
  const relative=req.path.slice("/catalog-media/".length);
  if(!relative||relative.split("/").some(segment=>segment==="..")){res.status(400).send("Invalid catalog media path.");return;}
  const encoded=relative.split("/").map(segment=>encodeURIComponent(decodeURIComponent(segment))).join("/");
  res.setHeader("Cache-Control","public, max-age=86400, stale-while-revalidate=604800");
  res.redirect(302,`${supabaseProjectUrl}/storage/v1/object/public/catalog-media/${encoded}`);
});

const aiCrawlerPattern=/(GPTBot|OAI-SearchBot|ChatGPT-User|OAI-AdsBot|ClaudeBot|Claude-SearchBot|Claude-User|Google-Extended|CCBot|PerplexityBot|Perplexity-User|Applebot-Extended|Bytespider|Amazonbot|meta-externalagent|meta-externalfetcher|cohere-ai)/i;
app.get(/.*/,async(req,res,next)=>{
  if(!aiCrawlerPattern.test(String(req.headers["user-agent"]||""))){next();return;}
  await serveWebHandler(req,res,robotsApi,{block:"ai"});
});

const crawlerPattern=/(facebookexternalhit|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot)/i;
app.get(["/","/fleet/:id","/sales/:id","/tour/:id","/blog/:id","/branches/:id"],async(req,res,next)=>{
  if(!crawlerPattern.test(String(req.headers["user-agent"]||""))){next();return;}
  const pathName=req.path;
  let kind="home";
  if(pathName.startsWith("/fleet/"))kind="fleet";else if(pathName.startsWith("/sales/"))kind="sales";else if(pathName.startsWith("/tour/"))kind="tour";else if(pathName.startsWith("/blog/"))kind="blog";else if(pathName.startsWith("/branches/"))kind="branch";
  await serveWebHandler(req,res,socialPreviewApi,{kind,...(req.params["id"]?{id:String(req.params["id"])}:{})});
});

app.use(express.static(distPath,{index:false,setHeaders:(res,filePath)=>{
  if(filePath.endsWith(".js")||filePath.endsWith(".mjs"))res.setHeader("Content-Type","application/javascript; charset=utf-8");
  if(filePath.endsWith("runtime-env.js"))res.setHeader("Cache-Control","no-cache, no-store, max-age=0, must-revalidate");
  if(filePath.endsWith("manifest.json")){res.setHeader("Content-Type","application/manifest+json; charset=utf-8");res.setHeader("Cache-Control","no-cache, max-age=0, must-revalidate");}
  if(filePath.endsWith("offline.html")){res.setHeader("Cache-Control","no-cache, max-age=0, must-revalidate");res.setHeader("X-Robots-Tag","noindex, nofollow, noarchive");}
  if(filePath.endsWith("service-worker.js")){
    res.setHeader("Cache-Control","no-cache, no-store, max-age=0, must-revalidate");
    res.setHeader("Service-Worker-Allowed","/");
  }
}}));
app.get(/.*/,(_req,res)=>{if(!fs.existsSync(indexPath)){res.status(404).send("Application not built.");return;}res.setHeader("Cache-Control","no-store, max-age=0, must-revalidate");res.sendFile(indexPath);});
app.listen(port,"0.0.0.0",()=>console.log(`Alperler Auto web runtime is listening on port ${port}`));
