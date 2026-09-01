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
  navigation: "src/services/navigation-config.service.ts",
  rentalList: "src/pages/rental-catalog-v217.component.ts",
  rentalCard: "src/components/rental-vehicle-card-v167.component.ts",
  homeVehicleCard: "src/components/vehicle-list-item.component.ts",
  rentalDetail: "src/pages/car-detail.component.ts",
  saleList: "src/pages/sale-catalog-v217.component.ts",
  saleCard: "src/components/sale-vehicle-card-v168.component.ts",
  saleDetail: "src/pages/sale-car-detail.component.ts",
  tourList: "src/pages/tour-catalog-v217.component.ts",
  tourDetail: "src/pages/tour-detail.component.ts",
  blogList: "src/pages/blog-catalog-v217.component.ts",
  blogDetail: "src/pages/blog-detail.component.ts",
  bookingCheckout: "src/pages/booking-checkout.component.ts",
};

for (const file of Object.values(paths)) {
  if (!fs.existsSync(file)) fail(`Required V207 customer runtime file is missing: ${file}`);
}
const sources = Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, read(file)]));

requireText(sources.dock, 'class="customer-command-dock"', "Mobile dock must remain a native nav landmark.");
requireText(sources.dock, '[routerLink]="item.route"', "Mobile dock destinations must remain native router links.");
requireText(sources.dock, '[attr.aria-current]="isCurrent(item.route) ? \'page\' : null"', "Current mobile dock destination must expose aria-current=page.");
requireText(sources.dock, "track item.id", "Mobile dock items must preserve stable DOM identity.");
requireText(sources.dock, '[attr.aria-label]="item.label"', "Mobile dock items must preserve stable accessible names.");
for (const token of [
  "[attr.aria-hidden]=\"autoHidden() ? 'true' : null\"",
  "[attr.inert]=\"autoHidden() ? '' : null\"",
  'visibility:hidden',
  'releaseDockFocus()',
  'isPhoneDockViewport()',
  'window.matchMedia',
]) requireText(sources.dock, token, `TalkBack-safe auto-hide contract missing: ${token}`);
for (const token of ['dock-hidden','onWindowScroll','HostListener','backdrop-filter:blur','-webkit-backdrop-filter:blur']) {
  rejectText(sources.dock, token, `Mobile dock must not regain obsolete or scroll-heavy behavior: ${token}`);
}

requireText(sources.dock, 'return item.itemKey === "search";', "Mobile dock primary action must stay Search.");
rejectText(sources.dock, 'item.itemKey === "appointment"', "Appointment must not take primary mobile dock ownership from Search.");
const defaultDock = sources.navigation.match(/const DEFAULT_DOCK:[\s\S]*?\]\.map/)?.[0] || "";
if (!defaultDock) fail("Default mobile dock configuration could not be resolved.");
for (const token of [
  "['fleet', 'Kiralık', 'key', '/fleet']",
  "['sales', 'Satılık', 'directions_car', '/sales']",
  "['search', 'Ara', 'search', '/search']",
  "['campaigns', 'Fırsatlar', 'local_offer', '/campaigns']",
  "['account', 'Profil', 'account_circle', '/account']",
]) requireText(defaultDock, token, `Canonical mobile dock destination missing: ${token}`);
rejectText(defaultDock, "['appointment', 'Randevu', 'event_available', '/appointment']", "Appointment must not replace Profile in the mobile dock.");

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

for (const [name, source] of [['rental',sources.rentalList],['sale',sources.saleList],['tour',sources.tourList],['blog',sources.blogList]]) {
  requireText(source, 'ScalablePublicCatalogV217Service', `${name} catalogue must keep the scalable server-owned source.`);
  requireText(source, 'pageSize:24', `${name} catalogue must keep bounded 24-item pages.`);
  requireText(source, 'async loadMore()', `${name} catalogue must retain incremental loading.`);
  for (const forbidden of ['CarService','getCars()','getSaleCars()','getTours()','getBlogPosts()','refreshCloudCatalog(','ensureVehicleCloudInventory(']) {
    rejectText(source, forbidden, `${name} catalogue must not restore full-catalog hydration: ${forbidden}`);
  }
  rejectText(source, 'e instanceof Error?e.message', `${name} catalogue must not expose raw backend Error.message values.`);
  rejectText(source, 'e instanceof Error ? e.message', `${name} catalogue must not expose raw backend Error.message values.`);
}

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

const publicSurfaceFiles = [...walk("src/pages"), ...walk("src/components")]
  .filter((file) => !file.startsWith(`src${path.sep}pages${path.sep}admin${path.sep}`))
  .filter((file) => !file.includes(`${path.sep}admin-`));
for (const file of publicSurfaceFiles) {
  const source = read(file);
  for (const phrase of forbiddenCustomerPhrases) {
    if (source.includes(phrase)) fail(`${file} exposes internal/system copy: ${phrase}`);
  }
}

for (const file of publicSurfaceFiles) {
  if (file === paths.bookingCheckout) continue;
  const source = read(file);
  if (source.includes("Rezervasyon Özeti")) fail(`${file} duplicates the booking-owned reservation review.`);
  if (source.includes("Kiralama Özeti")) fail(`${file} duplicates a rental summary outside booking checkout.`);
}

rejectText(sources.rentalDetail, "{{loadError()}}", "Rental detail must not print a raw backend error to customers.");
rejectText(sources.rentalDetail, "{{ loadError() }}", "Rental detail must not print a raw backend error to customers.");
rejectText(sources.saleDetail, "{{ loadError() }}", "Sale detail must not print a raw backend error to customers.");
rejectText(sources.tourDetail, "{{ loadError() }}", "Tour detail must not print a raw backend error to customers.");
rejectText(sources.blogDetail, "{{error()}}", "Blog detail must not print a raw backend error to customers.");
rejectText(sources.blogDetail, "{{ error() }}", "Blog detail must not print a raw backend error to customers.");

requireText(sources.rentalList, "ALPERLER KİRALAMA", "Rental catalogue must keep the customer-facing rental hero.");
requireText(sources.saleList, "ALPERLER İKİNCİ EL", "Sale catalogue must keep the second-hand customer hero.");
requireText(sources.tourList, "Doğa, kültür ve özel rotalar arasından size uygun deneyimi seçin.", "Tour catalogue must keep customer-oriented discovery copy.");
requireText(sources.tourList, "filtersOpen=signal(false)", "Tour filters must stay closed until the customer opens them.");
requireText(sources.blogList, "ALPERLER YOL REHBERİ", "Blog catalogue must keep editorial customer language.");
requireText(sources.blogList, "Daha iyi bir yolculuk için doğru bilgiler", "Blog catalogue must keep a useful editorial introduction.");
requireText(sources.saleDetail, "Performans ve Tüketim Bilgilerini Gör", "Sale detail must frame specifications as customer-useful performance information.");
requireText(sources.rentalDetail, "Performans ve Tüketim", "Rental detail must frame specifications as customer-useful performance information.");

if (failures.length) {
  console.error("V207 customer experience integrity: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V207 customer experience integrity: PASS (${publicSurfaceFiles.length} customer and partner files scanned)`);
