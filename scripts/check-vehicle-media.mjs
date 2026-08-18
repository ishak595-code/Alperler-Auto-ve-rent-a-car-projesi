import fs from "node:fs";

const failures = [];
const admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");
const service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");
const carService = fs.readFileSync("src/services/car.service.ts", "utf8");
const adminEditor = fs.readFileSync("src/services/catalog-admin-editor.service.ts", "utf8");
const catalogApi = fs.readFileSync("api/catalog.ts", "utf8");
const bootstrap = fs.readFileSync("index.tsx", "utf8");

// Historical static catalogue data was removed. Recreating the old source file
// would reintroduce a second catalogue authority, so fail CI immediately.
if (fs.existsSync("src/services/mock-data.ts")) {
  failures.push("legacy src/services/mock-data.ts must not be reintroduced");
}
if (carService.includes("fallbackInventory") ||
    carService.includes("fallbackBlogPosts") ||
    carService.includes("fallbackFaqs") ||
    carService.includes("mergeVehicleWithFallback")) {
  failures.push("CarService still contains a legacy catalogue fallback path");
}

// Published catalogue content must never be persisted/restored as browser truth.
for (const key of ["db_cars", "db_saleCars", "db_tours_v14", "db_blog_v12", "db_faqs_v12", "db_config_v12"]) {
  if (carService.includes(`localStorage.setItem(\"${key}`)) failures.push(`catalogue cache is still persisted: ${key}`);
  if (carService.includes(`this.readStorage(\"${key}`)) failures.push(`catalogue cache is still restored: ${key}`);
}
if (!bootstrap.includes("LEGACY_CATALOG_STORAGE_KEY") ||
    !bootstrap.includes("purgeLegacyCatalogStorage()") ||
    !bootstrap.includes("window.addEventListener('storage'")) {
  failures.push("bootstrap stale-catalogue purge guard is missing");
}

// Admin media authoring is file-upload only.
for (const token of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) {
  if (admin.includes(token)) failures.push(`admin still exposes ${token}`);
}
if (/async\s+addExternal\s*\(/.test(service)) {
  failures.push("CatalogMediaService still exposes addExternal()");
}

// Vehicle media is managed through catalog_media, not copied back from legacy record fields.
const vehicleSaveStart = adminEditor.indexOf("async saveVehicle(record: VehicleAdminRecord)");
const vehicleSaveEnd = adminEditor.indexOf("async saveTour(record: TourAdminRecord)", vehicleSaveStart);
const vehicleSave = adminEditor.slice(vehicleSaveStart, vehicleSaveEnd);
if (/images:\s*record\.images/.test(vehicleSave) || /cover_image:\s*record\.coverImage/.test(vehicleSave)) {
  failures.push("saveVehicle can still overwrite media authority");
}

// Public API must reject untrusted vehicle media and prevent stale vehicle caching.
if (!catalogApi.includes("VEHICLE_MEDIA_STORAGE_ONLY") ||
    !catalogApi.includes("trustedVehicleMediaUrl") ||
    !catalogApi.includes('case "vehicles":\n      return "no-store"')) {
  failures.push("vehicle API media/cache guard missing");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Vehicle truth guard passed: catalogue is server-authoritative, legacy static/browser sources are blocked and media authoring is upload-only.");
