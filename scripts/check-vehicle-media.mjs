import fs from "node:fs";
const mock = fs.readFileSync("src/services/mock-data.ts", "utf8");
const admin = fs.readFileSync("src/pages/admin/admin-catalog-editor.component.ts", "utf8");
const service = fs.readFileSync("src/services/catalog-media.service.ts", "utf8");
const ids = [1001,1002,1003,1004,1005,1006,1007,2001,2002,2003,2004];
const failures = [];
for (const id of ids) {
  const start = mock.indexOf(`id: ${id},`); const end = mock.indexOf("\n  },", start); const block = mock.slice(start, end > start ? end : mock.length);
  if (start < 0) failures.push(`fallback vehicle ${id} missing`);
  if (/wikimedia|unsplash|commons\./i.test(block)) failures.push(`fallback vehicle ${id} still uses third-party media`);
  if (!block.includes("hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/vehicle/")) failures.push(`fallback vehicle ${id} is not file-backed by Alperler Storage`);
}
for (const token of ["externalUrl", "addExternalMedia", "Kaynaklı Medyayı Ekle", "Dış görsel", "Dış video"]) if (admin.includes(token)) failures.push(`admin still exposes ${token}`);
if (/async\s+addExternal\s*\(/.test(service)) failures.push("CatalogMediaService still exposes addExternal()");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Vehicle media guard passed: 11 rental/sale fallback records are Alperler Storage backed and URL authoring is disabled.");
