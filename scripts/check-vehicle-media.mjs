import fs from "node:fs";

const failures = [];
const admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");
const service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");
const publicMedia = fs.readFileSync("src/services/public-catalog-media.service.ts", "utf8");
const carService = fs.readFileSync("src/services/car.service.ts", "utf8");
const catalogService = fs.readFileSync("src/services/catalog.service.ts", "utf8");
const carDetail = fs.readFileSync("src/pages/car-detail.component.ts", "utf8");
const adminEditor = fs.readFileSync("src/services/catalog-admin-editor.service.ts", "utf8");
const catalogApi = fs.readFileSync("api/catalog.ts", "utf8");
const bootstrap = fs.readFileSync("index.tsx", "utf8");
const vercel = fs.readFileSync("vercel.json", "utf8");
const campaignMigration = "supabase/migrations/20260819221500_sync_targeted_campaign_cover_from_catalog.sql";

if (fs.existsSync("src/services/mock-data.ts")) {
  failures.push("legacy src/services/mock-data.ts must not be reintroduced");
}
if (carService.includes("fallbackInventory") ||
    carService.includes("fallbackBlogPosts") ||
    carService.includes("fallbackFaqs") ||
    carService.includes("mergeVehicleWithFallback")) {
  failures.push("CarService still contains a legacy catalogue fallback path");
}

for (const key of ["db_cars", "db_saleCars", "db_tours_v14", "db_blog_v12", "db_faqs_v12", "db_config_v12"]) {
  if (carService.includes(`localStorage.setItem(\"${key}`)) failures.push(`catalogue cache is still persisted: ${key}`);
  if (carService.includes(`this.readStorage(\"${key}`)) failures.push(`catalogue cache is still restored: ${key}`);
}
if (!bootstrap.includes("LEGACY_CATALOG_STORAGE_KEY") ||
    !bootstrap.includes("purgeLegacyCatalogStorage()") ||
    !bootstrap.includes("window.addEventListener('storage'")) {
  failures.push("bootstrap stale-catalogue purge guard is missing");
}

for (const token of [
  "normalizeVehicleRecord",
  'row["fuel_type"]',
  'row["transmission"]',
  'row["seats"]',
  'row["availability_status"]',
  'row["cover_image"]',
  'row["rental_price_daily"]',
]) {
  if (!catalogService.includes(token)) failures.push(`database vehicle canonicalizer missing token: ${token}`);
}
if (!catalogService.includes("records.map((record) => this.normalizeVehicleRecord(record))")) {
  failures.push("vehicle API results can bypass the database canonicalizer");
}

if (!carDetail.includes("this.catalog.loadVehicles(true)")) {
  failures.push("rental detail does not perform its own fresh database-backed vehicle read");
}
if (!carDetail.includes('transmission: car.transmission || "Belirtilmedi"') ||
    !carDetail.includes('fuel: car.fuel || "Belirtilmedi"')) {
  failures.push("rental detail canonical fact normalization is missing");
}

for (const token of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) {
  if (admin.includes(token)) failures.push(`admin still exposes ${token}`);
}
if (/async\s+addExternal\s*\(/.test(service)) {
  failures.push("CatalogMediaService still exposes addExternal()");
}

const vehicleSaveStart = adminEditor.indexOf("async saveVehicle(record: VehicleAdminRecord)");
const vehicleSaveEnd = adminEditor.indexOf("async saveTour(record: TourAdminRecord)", vehicleSaveStart);
const vehicleSave = adminEditor.slice(vehicleSaveStart, vehicleSaveEnd);
if (/images:\s*record\.images/.test(vehicleSave) || /cover_image:\s*record\.coverImage/.test(vehicleSave)) {
  failures.push("saveVehicle can still overwrite media authority");
}

const apiVehicleStart = catalogApi.indexOf("function normalizeVehicle(");
const apiVehicleEnd = catalogApi.indexOf("function normalizeTour(", apiVehicleStart);
const apiVehicle = catalogApi.slice(apiVehicleStart, apiVehicleEnd);
if (!catalogApi.includes("sanitizedMetadata") || !catalogApi.includes("VEHICLE_METADATA_EXCLUDED")) {
  failures.push("catalog API does not sanitize duplicate canonical metadata");
}
if (/metadata:\s*\{\s*\.\.\.input/.test(apiVehicle)) {
  failures.push("vehicle API still copies the whole UI record into metadata");
}
if (/\bimages\s*,/.test(apiVehicle) || /cover_image\s*:/.test(apiVehicle)) {
  failures.push("vehicle facts endpoint can still overwrite media projection columns");
}
if (catalogApi.includes("LEGACY-${") || catalogApi.includes("legacy-${")) {
  failures.push("new catalogue records can still generate legacy identifiers");
}
if (!catalogApi.includes('case "vehicles":\n      return "no-store"')) {
  failures.push("vehicle API cache guard missing");
}

if (!publicMedia.includes('return `/catalog-media/${encodedPath}`')) {
  failures.push("catalog media does not resolve through the stable same-origin Storage path");
}
if (!vercel.includes('"source": "/catalog-media/:path*"') ||
    !vercel.includes('supabase.co/storage/v1/object/public/catalog-media/:path*')) {
  failures.push("same-origin catalog-media external rewrite is missing");
}
if (publicMedia.includes("/vehicle-media/") || vercel.includes("/vehicle-media/")) {
  failures.push("obsolete Vercel vehicle-media function/proxy layer is still present");
}

if (!fs.existsSync(campaignMigration)) {
  failures.push("targeted campaign cover synchronization migration is missing");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Vehicle truth guard passed: Supabase DB is authoritative, rental detail refreshes directly from DB, media is upload-only Storage data behind a stable same-origin rewrite, and targeted campaign covers follow canonical catalog media.");
