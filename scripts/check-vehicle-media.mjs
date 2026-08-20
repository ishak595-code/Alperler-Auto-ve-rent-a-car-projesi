import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");
const admin = read("src/pages/admin/admin-catalog-editor.component.ts");
const mediaService = read("src/services/catalog-media.service.ts");
const publicMedia = read("src/services/public-catalog-media.service.ts");
const carService = read("src/services/car.service.ts");
const catalogService = read("src/services/catalog.service.ts");
const detailData = read("src/services/public-detail-data.service.ts");
const rentalDetail = read("src/pages/car-detail.component.ts");
const saleDetail = read("src/pages/sale-car-detail.component.ts");
const tourDetail = read("src/pages/tour-detail.component.ts");
const checkout = read("src/pages/booking-checkout.component.ts");
const dynamicHome = read("src/components/dynamic-home-section.component.ts");
const campaigns = read("src/pages/campaigns.component.ts");
const adminEditor = read("src/services/catalog-admin-editor.service.ts");
const catalogApi = read("api/catalog.ts");
const bootstrap = read("index.tsx");
const vercel = read("vercel.json");
const campaignMigration = "supabase/migrations/20260819221500_sync_targeted_campaign_cover_from_catalog.sql";
const campaignProofMigration = "supabase/migrations/20260820021500_v128_campaign_social_proof.sql";

if (fs.existsSync("src/services/mock-data.ts")) failures.push("legacy mock catalogue must not be reintroduced");
if (["fallbackInventory","fallbackBlogPosts","fallbackFaqs","mergeVehicleWithFallback"].some((token) => carService.includes(token))) failures.push("CarService contains a legacy catalogue fallback path");
for (const key of ["db_cars","db_saleCars","db_tours_v14","db_blog_v12","db_faqs_v12","db_config_v12"]) {
  if (carService.includes(`localStorage.setItem(\"${key}`) || carService.includes(`this.readStorage(\"${key}`)) failures.push(`legacy catalogue storage remains: ${key}`);
}
if (!bootstrap.includes("LEGACY_CATALOG_STORAGE_KEY") || !bootstrap.includes("purgeLegacyCatalogStorage()")) failures.push("stale catalogue purge guard is missing");

for (const token of ["normalizeVehicleRecord",'row["fuel_type"]','row["transmission"]','row["seats"]','row["availability_status"]','row["cover_image"]','row["rental_price_daily"]']) {
  if (!catalogService.includes(token)) failures.push(`vehicle canonicalizer missing: ${token}`);
}
if (!catalogService.includes("records.map((record) => this.normalizeVehicleRecord(record))")) failures.push("vehicle API results can bypass canonicalizer");

for (const [name, source, token] of [
  ["rental", rentalDetail, 'detailData.load("RENTAL"'],
  ["sale", saleDetail, 'detailData.load("SALE"'],
  ["tour", tourDetail, 'detailData.load("TOUR"'],
]) {
  if (!source.includes(token)) failures.push(`${name} detail is not database-authoritative`);
}
if (rentalDetail.includes("getAllVehicles()") || saleDetail.includes("getSaleCar(") || tourDetail.includes("getTours()().find")) failures.push("a detail page can still resolve from stale shared catalogue state");
if (!rentalDetail.includes("Tüm Özellikler ve Açıklama") || !rentalDetail.includes("detailsOpen")) failures.push("rental detail compact accordion is missing");
if (rentalDetail.includes("Tarih, nereden alınacağı, iade noktası")) failures.push("rental detail reintroduced the redundant reservation instruction paragraph");
for (const token of ["İLAN BİLGİLERİ", "AÇIKLAMA", "KONUM", "app-expertise-graphic", "activeTab"]) {
  if (!saleDetail.includes(token)) failures.push(`sale listing identity is missing: ${token}`);
}

for (const token of ["checkoutStep", "Şoför Tercihi", "Nereden alınacak?", "Nereye iade edilecek?", "Sonraki Adım"]) {
  if (!checkout.includes(token)) failures.push(`focused rental checkout is missing: ${token}`);
}
if (!checkout.includes('checkoutStep() === 1') || !checkout.includes('checkoutStep() === 2')) failures.push("rental checkout steps are not mutually exclusive views");

if (dynamicHome.includes('[href]="campaignHref(campaign)"') || dynamicHome.includes("campaignHref(campaign")) failures.push("homepage campaign can still use raw href navigation");
if (!dynamicHome.includes('(click)="openCampaign(campaign)"') || !dynamicHome.includes("resolveCampaignTarget")) failures.push("homepage campaign does not use internal target resolution");
if (!campaigns.includes("resolveCampaignTarget") || !campaigns.includes("navigateByUrl")) failures.push("campaign listing does not use internal target routing");
for (const source of [dynamicHome, campaigns]) {
  if (!source.includes("countdown") && !source.includes("Countdown")) failures.push("campaign UI lacks real deadline countdown");
  if (!source.includes("campaign_social_proof")) failures.push("campaign UI is not connected to aggregate real analytics social proof");
}
if (!dynamicHome.includes("KAMPANYA") || !dynamicHome.includes("campaignProofLabel")) failures.push("homepage campaign card lacks explicit campaign identity or proof label");
if (!campaigns.includes("proofLabel")) failures.push("campaign listing lacks real interest proof label");
if (!fs.existsSync(campaignProofMigration)) failures.push("campaign social proof migration missing");
if (!detailData.includes("targetType === \"VEHICLE\"") || !detailData.includes("targetType === \"TOUR\"") || !detailData.includes("cta.startsWith(\"/\")")) failures.push("campaign target resolver is incomplete");
if (!detailData.includes("loadToursDirect") || !detailData.includes("cache: \"no-store\"")) failures.push("tour detail does not perform direct no-cache DB read");

for (const token of ["externalUrl","addExternalMedia","Kaynaklı Medyayı Ekle","Dış görsel","Dış video"]) if (admin.includes(token)) failures.push(`admin still exposes ${token}`);
if (/async\s+addExternal\s*\(/.test(mediaService)) failures.push("CatalogMediaService still exposes addExternal()");
const vehicleSaveStart = adminEditor.indexOf("async saveVehicle(record: VehicleAdminRecord)");
const vehicleSaveEnd = adminEditor.indexOf("async saveTour(record: TourAdminRecord)", vehicleSaveStart);
const vehicleSave = adminEditor.slice(vehicleSaveStart, vehicleSaveEnd);
if (/images:\s*record\.images/.test(vehicleSave) || /cover_image\s*:/.test(vehicleSave)) failures.push("vehicle fact save can overwrite media authority");

const apiVehicleStart = catalogApi.indexOf("function normalizeVehicle(");
const apiVehicleEnd = catalogApi.indexOf("function normalizeTour(", apiVehicleStart);
const apiVehicle = catalogApi.slice(apiVehicleStart, apiVehicleEnd);
if (/metadata:\s*\{\s*\.\.\.input/.test(apiVehicle)) failures.push("catalog API copies whole UI vehicle into metadata");
if (/\bimages\s*,/.test(apiVehicle) || /cover_image\s*:/.test(apiVehicle)) failures.push("vehicle facts endpoint can overwrite media columns");
if (!/case\s+["']vehicles["']\s*:\s*return\s+["']no-store["']/.test(catalogApi)) failures.push("vehicle API cache guard missing");

if (!publicMedia.includes('return `/catalog-media/${encodedPath}`')) failures.push("catalog media is not same-origin");
if (!vercel.includes('"source": "/catalog-media/:path*"') || !vercel.includes('supabase.co/storage/v1/object/public/catalog-media/:path*')) failures.push("catalog-media rewrite missing");
if (publicMedia.includes("/vehicle-media/") || vercel.includes("/vehicle-media/")) failures.push("obsolete vehicle-media proxy remains");
if (!fs.existsSync(campaignMigration)) failures.push("campaign cover synchronization migration missing");

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Unified catalogue guard passed: sale keeps its dedicated listing UX; rental remains compact; campaign proof comes from real aggregate analytics; app routing and Storage remain canonical.");
