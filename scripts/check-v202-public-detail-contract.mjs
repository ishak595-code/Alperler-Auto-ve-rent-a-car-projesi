import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const sale = read('src/pages/sale-car-detail.component.ts');
const rental = read('src/pages/car-detail.component.ts');
const tour = read('src/pages/tour-detail.component.ts');
const blog = read('src/pages/blog-list.component.ts');
const detail = read('src/services/public-detail-data.service.ts');
const catalog = read('src/services/catalog.service.ts');
const worker = read('public/service-worker.js');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};
const rejectText = (source, value, message) => {
  if (source.includes(value)) throw new Error(message || `Forbidden legacy contract found: ${value}`);
};

// Sale detail: the existing information table is the canonical customer surface.
for (const label of ['Seri / Model', 'Yıl', 'Kilometre', 'Yakıt', 'Vites', 'Kasa Tipi', 'Renk', 'Koltuk', 'Kapı', 'Çekiş', 'Motor Gücü', 'Motor Hacmi']) {
  requireText(sale, `label: "${label}"`, `Sale listing row missing: ${label}`);
}
requireText(sale, 'readonly listingRows = computed<ListingRow[]>', 'Sale facts must be rendered from one canonical listingRows contract.');
requireText(sale, '(click)="callPhone()"', 'Sale phone action must be a persistent button action.');
requireText(sale, '<span>Satış Talebi</span>', 'Sale inquiry CTA missing.');
requireText(sale, '<span>WhatsApp</span>', 'Sale WhatsApp CTA missing.');
rejectText(sale, 'class="core-facts"', 'Duplicate top sale fact cards must not return.');
rejectText(sale, '[href]="phoneHref()"', 'Sale phone action must not regress to the disappearing anchor implementation.');

// Direct detail mapper must keep every visible vehicle fact authoritative from DB first.
for (const column of ['model_year', 'mileage_km', 'fuel_type', 'transmission', 'body_type', 'color', 'seats', 'doors']) {
  requireText(detail, `"${column}"`, `Public detail select/mapping lost ${column}.`);
}
for (const mapping of ['year: row["model_year"]', 'km: row["mileage_km"]', 'fuel: row["fuel_type"]', 'transmission: row["transmission"]', 'type: row["body_type"]', 'color: row["color"]', 'seats: row["seats"]', 'doors: row["doors"]']) {
  requireText(detail, mapping, `Public detail mapper missing ${mapping}.`);
}

// Catalogue cards and detail screens must share the same canonical DB vocabulary.
for (const mapping of ['year: row["model_year"]', 'km: row["mileage_km"]', 'fuel: row["fuel_type"]', 'type: row["body_type"]']) {
  requireText(catalog, mapping, `Catalogue list mapper missing ${mapping}.`);
}

// Previously fixed public regressions remain locked.
requireText(blog, 'loadBlogList()', 'Blog list must load the published DB list through the direct public detail service.');
requireText(rental, 'campaignProofLabel', 'Rental campaign social proof must remain wired.');
requireText(tour, 'fixed-actions', 'Tour must retain one canonical fixed action bar.');
rejectText(tour, 'Hazır olduğunuzda', 'Duplicate legacy tour reservation card must not return.');

// Force old static PWA bundles out after this public contract release.
requireText(worker, "const RELEASE = 'v202-public-detail-contract';", 'PWA cache release was not rotated for V202.');

console.log('V202 public detail contract: OK');
