import fs from "node:fs";

const failures = [];
const mock = fs.readFileSync("src/services/mock-data.ts", "utf8");
const admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");
const service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");
const carService = fs.readFileSync("src/services/car.service.ts", "utf8");
const adminEditor = fs.readFileSync("src/services/catalog-admin-editor.service.ts", "utf8");
const catalogApi = fs.readFileSync("api/catalog.ts", "utf8");

// Rental and sale catalogue data must have a single authority: the live server.
if (/category:\s*["'](?:RENTAL|SALE)["']/.test(mock)) {
  failures.push("static rental/sale fallback inventory must not exist");
}
if (!/fallbackInventory:\s*Vehicle\[\]\s*=\s*\[\s*\]/.test(mock)) {
  failures.push("startup catalogue fallback must stay empty");
}

// Admin media authoring is file-upload only.
for (const token of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) {
  if (admin.includes(token)) failures.push(`admin still exposes ${token}`);
}
if (/async\s+addExternal\s*\(/.test(service)) {
  failures.push("CatalogMediaService still exposes addExternal()");
}

// Browser snapshots must never restore or persist vehicle catalogue truth.
if (carService.includes('localStorage.setItem("db_cars') || carService.includes('localStorage.setItem("db_saleCars')) {
  failures.push("vehicle catalogue is still persisted to browser storage");
}
if (carService.includes('this.readStorage("db_cars') || carService.includes('this.readStorage("db_saleCars')) {
  failures.push("vehicle catalogue can still restore stale browser storage");
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

console.log("Vehicle truth guard passed: rental/sale catalogue is server-authoritative, file-upload media only and stale browser/static vehicle data is blocked.");
