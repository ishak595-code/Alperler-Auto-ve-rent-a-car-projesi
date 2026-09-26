import fs from "node:fs";
const fail=[];const read=(p)=>fs.readFileSync(p,"utf8");
const catalog=read("src/services/catalog-media.service.ts");
const optimize=read("src/services/catalog-image-optimize.util.ts");
const admin=read("src/services/admin-media.service.ts");
const branchListing=read("src/services/branch-listing-media-v171.service.ts");
const branchMedia=read("src/services/branch-media-v171.service.ts");
const branchPortal=read("src/services/branch-portal.service.ts");
const branchPortalUi=read("src/pages/branch-portal.component.ts");
const catalogApi=read("api/catalog.ts");
const vercel=JSON.parse(read("vercel.json"));
const must=(ok,msg)=>{if(!ok)fail.push(msg)};

must(optimize.includes("export async function prepareCatalogImage"),"catalog image optimizer missing");
must(optimize.includes("CATALOG_IMAGE_MAX_LONG_EDGE = 1920"),"catalog long-edge target missing");
must(optimize.includes("CATALOG_IMAGE_TARGET_BYTES = 250_000"),"catalog byte target missing");
must(optimize.includes("CATALOG_IMAGE_INPUT_MAX_BYTES = 10 * 1024 * 1024"),"catalog image input cap missing");
must(optimize.includes("CATALOG_VIDEO_MAX_BYTES = 20 * 1024 * 1024"),"catalog video size cap missing");
must(optimize.includes("CATALOG_STORAGE_BUCKET_MAX_BYTES = 200 * 1024 * 1024"),"storage bucket ceiling constant missing");

must(catalog.includes("readonly maxUploadBytes = CATALOG_STORAGE_BUCKET_MAX_BYTES"),"canonical catalog limit must stay tied to the V246 storage bucket ceiling (200 MB)");
must(catalog.includes("prepareCatalogImage"),"catalog upload must compress images before storage");
must(catalog.includes("catalogUploadSizeRejection"),"catalog upload must enforce image/video input caps");
must(catalog.includes("\"video/mp4\"")||catalog.includes("video/"),"canonical catalog video support changed");
must(catalog.includes("\"cache-control\": \"31536000\"")&&catalog.includes("[\"cacheControl\", \"31536000\"]"),"canonical catalog long cache missing");

must(admin.includes("prepareCatalogImage"),"admin media upload must compress catalog images");
must(admin.includes("\"cache-control\": \"31536000\"")||admin.includes("'cache-control': '31536000'"),"admin media long cache missing");

must(branchListing.includes("50*1024*1024"),"branch listing 50 MB media limit changed");
must(branchListing.includes("prepareCatalogImage"),"branch listing must compress catalog images");
must(branchListing.includes("tusThreshold=6*1024*1024")&&branchListing.includes("uploadTus(file,path,token)")||branchListing.includes("uploadTus(uploadFile,path,token)"),"branch listing large-media TUS path missing");
must(branchListing.includes("browserCacheSeconds=\"31536000\""),"branch listing long cache missing");

must(branchMedia.includes("maxUploadBytes=50*1024*1024"),"branch studio 50 MB media limit changed");
must(branchMedia.includes("prepareCatalogImage"),"branch studio must compress catalog images");
must(branchMedia.includes("[\"cacheControl\",\"31536000\"]"),"branch studio long cache missing");

must(branchPortal.includes("file.size > 10 * 1024 * 1024"),"legacy branch vehicle image 10 MB limit changed");
must(branchPortal.includes("\"cacheControl\", \"31536000\"")&&branchPortal.includes("uploadVehicleImageTus"),"legacy branch image reliable upload/cache hardening missing");
must(branchPortalUi.includes(".slice(0, 30)"),"branch vehicle 30-photo gallery limit changed");

must(catalogApi.includes('case "vehicles"')&&catalogApi.includes("public, max-age=0, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400"),"vehicles catalog short CDN cache (+ bounded SWR and stale-if-error) missing");
must(!/case\s+[\"']vehicles[\"']\s*:\s*return\s+[\"']no-store[\"']/.test(catalogApi),"vehicles catalog must not stay no-store");

must(fs.existsSync("scripts/reprocess-catalog-media.mjs"),"catalog media reprocess script missing");

const route=(vercel.headers||[]).find((h)=>h.source==="/catalog-media/:path*");
const headers=new Map((route?.headers||[]).map((h)=>[h.key,h.value]));
must(headers.get("Cache-Control")==="public, max-age=86400, stale-while-revalidate=604800","bounded browser cache policy missing");
must(headers.get("CDN-Cache-Control")==="public, max-age=604800","bounded Vercel CDN cache missing");
must(headers.get("x-vercel-enable-rewrite-caching")==="1","external rewrite caching is not explicitly enabled");

if(fail.length){console.error(fail.join("\n"));process.exit(1)}
console.log("V236 egress guard passed: catalog uploads compress to WebP/JPEG (~1920 long edge, ~150–300 KB); video input capped ~20 MB; storage bucket ceiling remains 200 MB; vehicles API uses short CDN cache like tours; Storage keeps immutable object caching; reprocess script present.");
