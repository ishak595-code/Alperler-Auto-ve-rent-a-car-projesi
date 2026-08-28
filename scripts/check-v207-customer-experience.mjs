import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const failures = [];
const fail = (message) => failures.push(message);
const requireText = (source, needle, message) => { if (!source.includes(needle)) fail(message); };
const rejectText = (source, needle, message) => { if (source.includes(needle)) fail(message); };
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.(?:ts|html)$/i.test(entry.name) ? [full] : [];
});

const paths = {
  dock: "src/components/customer-mobile-dock.component.ts",
  rentalList: "src/pages/rental-showcase-v167.component.ts",
  rentalCard: "src/components/rental-vehicle-card-v167.component.ts",
  homeVehicleCard: "src/components/vehicle-list-item.component.ts",
  rentalDetail: "src/pages/car-detail.component.ts",
  saleList: "src/pages/sales-showcase-v168.component.ts",
  saleCard: "src/components/sale-vehicle-card-v168.component.ts",
  saleDetail: "src/pages/sale-car-detail.component.ts",
  tourList: "src/pages/tour-showcase-v170.component.ts",
  tourDetail: "src/pages/tour-detail.component.ts",
  blogList: "src/pages/blog-list.component.ts",
  blogDetail: "src/pages/blog-detail.component.ts",
  bookingCheckout: "src/pages/booking-checkout.component.ts",
};

for (const file of Object.values(paths)) {
  if (!fs.existsSync(file)) fail(`Required V207 customer runtime file is missing: ${file}`);
}

const sources = Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, read(file)]));

// TalkBack contract: the persistent customer dock stays in the accessibility tree.
requireText(sources.dock, '<nav class="customer-command-dock"', "Mobile dock must remain a native nav landmark.");
requireText(sources.dock, '[routerLink]="item.route"', "Mobile dock destinations must remain native router links.");
requireText(sources.dock, '[attr.aria-current]="isCurrent(item.route) ? \'page\' : null"', "Current mobile dock destination must expose aria-current=page.");
requireText(sources.dock, "track item.id", "Mobile dock items must preserve stable DOM identity.");
requireText(sources.dock, '[attr.aria-label]="item.label"', "Mobile dock items must preserve stable accessible names.");
rejectText(sources.dock, '[attr.aria-hidden]', "Mobile dock must not be removed from the accessibility tree by state changes.");
rejectText(sources.dock, '[attr.inert]', "Mobile dock must not become inert because of scroll state.");
rejectText(sources.dock, "dock-hidden", "Scroll-driven mobile dock hiding must not return.");
rejectText(sources.dock, "onWindowScroll", "Scroll-driven mobile dock hiding must not return.");
rejectText(sources.dock, "HostListener", "Mobile dock must not use a scroll listener to hide itself.");

// Booking checkout owns the complete reservation review. Cards and details must never duplicate it.
requireText(sources.bookingCheckout, "Rezervasyonu kontrol edin", "Booking checkout must keep the customer-facing reservation review heading.");
requireText(sources.bookingCheckout, '<dl class="review">', "Booking checkout must remain the single canonical owner of the reservation review data.");
for (const token of ["<dt>Araç</dt>", "<dt>Zaman</dt>", "<dt>Şoför</dt>", "<dt>Teslim</dt>", "<dt>İade</dt>", "<dt>Toplam</dt>"]) {
  requireText(sources.bookingCheckout, token, `Booking checkout reservation review is incomplete: ${token}`);
}
rejectText(sources.rentalDetail, "Rezervasyon Özeti", "Rental detail must not duplicate the booking reservation review.");
rejectText(sources.rentalDetail, "Kiralama Özeti", "Rental detail must not contain a duplicate rental summary block.");
rejectText(sources.rentalDetail, 'class="reservation-panel"', "Rental detail must not restore the duplicate reservation panel.");
requireText(sources.homeVehicleCard, "@if(variant==='sale' && cardDescription)", "Homepage rental cards must not render the descriptive summary reserved for sale cards.");
requireText(sources.rentalCard, "Aracı İncele", "Rental cards must use a direct customer CTA.");
requireText(sources.rentalDetail, "<dt>Kapı</dt>", "Rental detail must surface the canonical door count when available.");
requireText(sources.rentalDetail, "car.doors", "Rental detail door count must come from the canonical vehicle record.");
requireText(sources.rentalDetail, "car.luggage", "Rental detail must retain luggage capacity from the canonical vehicle record.");

const forbiddenCustomerPhrases = [
  "CANLI KİRALIK ARAÇ ENVANTERİ",
  "CANLI SATILIK ARAÇ ENVANTERİ",
  "CANLI VERİDEN FİLTRE",
  "DİNAMİK FİLTRELER",
  "CANLI KATALOG",
  "Canlı tur vitrini",
  "canlı yönetim verisinden gelir",
  "Yönetim panelinden yayınlanan içerikler burada otomatik görünür",
  "Konum bilgisi yönetimden bekleniyor",
  "Araç konumu ilan kaydından gösteriliyor",
  "Güncel talep okunuyor",
  "Talep metriği",
  "Canlı talep bilgisi",
  "Araç medyası yüklenemedi",
  "Tur medyası henüz eklenmedi",
];

// Scan every customer/partner page and component so implementation language cannot leak through an unlisted surface.
const publicSurfaceFiles = [...walk("src/pages"), ...walk("src/components")]
  .filter((file) => !file.startsWith(`src${path.sep}pages${path.sep}admin${path.sep}`))
  .filter((file) => !file.includes(`${path.sep}admin-`));
for (const file of publicSurfaceFiles) {
  const source = read(file);
  for (const phrase of forbiddenCustomerPhrases) {
    if (source.includes(phrase)) fail(`${file} exposes internal/system copy: ${phrase}`);
  }
}

// Explicit summary labels are forbidden outside the canonical booking review.
for (const file of publicSurfaceFiles) {
  if (file === paths.bookingCheckout) continue;
  const source = read(file);
  if (source.includes("Rezervasyon Özeti")) fail(`${file} duplicates the booking-owned reservation review.`);
  if (source.includes("Kiralama Özeti")) fail(`${file} duplicates a rental summary outside booking checkout.`);
}

// Raw backend/service errors stay internal. Customer states use stable human language.
rejectText(sources.rentalDetail, "{{loadError()}}", "Rental detail must not print a raw backend error to customers.");
rejectText(sources.rentalDetail, "{{ loadError() }}", "Rental detail must not print a raw backend error to customers.");
rejectText(sources.saleDetail, "{{ loadError() }}", "Sale detail must not print a raw backend error to customers.");
rejectText(sources.tourDetail, "{{ loadError() }}", "Tour detail must not print a raw backend error to customers.");
rejectText(sources.blogDetail, "{{error()}}", "Blog detail must not print a raw backend error to customers.");
rejectText(sources.blogDetail, "{{ error() }}", "Blog detail must not print a raw backend error to customers.");
rejectText(sources.blogList, "{{error()}}", "Blog list must not print a raw backend error to customers.");
rejectText(sources.blogList, "{{ error() }}", "Blog list must not print a raw backend error to customers.");

// Canonical customer language markers.
requireText(sources.rentalList, "ALPERLER KİRALAMA", "Rental list must keep the customer-facing rental hero.");
requireText(sources.saleList, "ALPERLER İKİNCİ EL", "Sale list must keep the second-hand customer hero.");
requireText(sources.tourList, "Sana uygun rotalar", "Tour list must keep customer-oriented discovery copy.");
requireText(sources.blogList, "Alperler Yol Rehberi", "Blog list must keep editorial customer language.");
requireText(sources.saleDetail, "Performans ve Tüketim Bilgilerini Gör", "Sale detail must frame specifications as customer-useful performance information.");
requireText(sources.rentalDetail, "Performans ve Tüketim", "Rental detail must frame specifications as customer-useful performance information.");

if (failures.length) {
  console.error("V207 customer experience integrity: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V207 customer experience integrity: PASS (${publicSurfaceFiles.length} customer and partner files scanned)`);
