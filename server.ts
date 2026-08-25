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

const __filename=fileURLToPath(import.meta.url);const __dirname=path.dirname(__filename);const app=express();const port=Number(process.env.PORT||3000);const distPath=path.join(__dirname,"dist");const indexPath=path.join(distPath,"index.html");
app.disable("x-powered-by");
app.set("trust proxy",true);

app.use((_req,res,next)=>{res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Frame-Options","DENY");res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=(self)");next();});
app.get("/health",(_req,res)=>{res.setHeader("Cache-Control","no-store");res.status(200).json({ok:true,runtime:"node",service:"alperler-web"});});

// The same Web Request handlers used by serverless hosts are mounted here too.
// This keeps core BFF behavior portable to a normal Node container/VPS/PaaS.
const apiHandlers=new Map<string,{fetch(request:Request):Promise<Response>}>([
  ["/api/bookings",bookingsApi],
  ["/api/rental-availability",rentalAvailabilityApi],
  ["/api/admin-booking-actions",adminBookingActionsApi],
  ["/api/branches",branchesApi],
  ["/api/catalog",catalogApi],
  ["/api/contact",contactApi],
  ["/api/payments",paymentsApi],
  ["/api/partner",partnerApi],
  ["/api/branch-network",branchNetworkApi],
]);
app.use("/api",express.raw({type:"*/*",limit:"2mb"}));

function webRequest(req:ExpressRequest):Request{
  const forwardedProto=String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim();
  const forwardedHost=String(req.headers["x-forwarded-host"]||"").split(",")[0].trim();
  const protocol=forwardedProto||req.protocol||"http";const host=forwardedHost||req.get("host")||`localhost:${port}`;
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value===undefined)continue;if(Array.isArray(value))for(const item of value)headers.append(key,item);else headers.set(key,String(value));}
  const method=req.method.toUpperCase();const body=method==="GET"||method==="HEAD"?undefined:(Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body||""));
  return new Request(`${protocol}://${host}${req.originalUrl}`,{method,headers,body:body&&body.length?body:undefined,redirect:"manual"});
}
async function sendWebResponse(upstream:Response,res:ExpressResponse):Promise<void>{upstream.headers.forEach((value,key)=>res.setHeader(key,value));res.status(upstream.status);const bytes=Buffer.from(await upstream.arrayBuffer());res.send(bytes);}

app.all(/^\/api\/.*/,async(req,res,next)=>{
  const pathName=req.path.replace(/\/$/,"");const handler=apiHandlers.get(pathName);if(!handler){next();return;}
  try{await sendWebResponse(await handler.fetch(webRequest(req)),res);}catch(error){console.error("Portable API adapter failed",pathName,error);res.setHeader("Cache-Control","no-store");res.status(503).json({ok:false,code:"API_ADAPTER_UNAVAILABLE"});}
});

app.use(express.static(distPath,{index:false,setHeaders:(res,filePath)=>{if(filePath.endsWith(".js")||filePath.endsWith(".mjs"))res.setHeader("Content-Type","application/javascript; charset=utf-8");}}));
app.get(/.*/,(_req,res)=>{if(!fs.existsSync(indexPath)){res.status(404).send("Application not built.");return;}res.setHeader("Cache-Control","no-store, max-age=0, must-revalidate");res.sendFile(indexPath);});
app.listen(port,"0.0.0.0",()=>console.log(`Alperler Auto web runtime is listening on port ${port}`));
