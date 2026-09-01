import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const sale = read('src/pages/sale-car-detail.component.ts');
const rental = read('src/pages/car-detail.component.ts');
const tour = read('src/pages/tour-detail.component.ts');
const blogShell = read('src/pages/blog-list.component.ts');
const blogCatalog = read('src/pages/blog-catalog-v217.component.ts');
const scalableCatalog = read('src/services/scalable-public-catalog-v217.service.ts');
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
requireText(sale, '(click)="inquire(item)"', 'Sale inquiry CTA must keep the canonical inquiry action.');
requireText(sale, 'aria-label="Satış talebi gönder"', 'Sale inquiry CTA must keep the current customer-facing accessible name.');
requireText(sale, '<span>Satış Talebi Gönder</span>', 'Sale inquiry CTA must state the action clearly.');
requireText(sale, '<span>WhatsApp</span>', 'Sale WhatsApp CTA missing.');
rejectText(sale, '<span>Bilgi Al</span>', 'Old generic sale CTA wording must not return.');
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

// V217 keeps the public blog route bounded instead of hydrating the complete published table.
requireText(blogShell, 'BlogCatalogV217Component', 'Blog route must delegate to the bounded V217 catalogue owner.');
requireText(blogCatalog, 'ScalablePublicCatalogV217Service', 'Blog list must use the scalable public catalogue service.');
requireText(blogCatalog, 'this.data.listBlogs({page:this.page,pageSize:24', 'Blog list must request explicit 24-item server pages.');
requireText(blogCatalog, 'async loadMore()', 'Blog list must retain explicit incremental loading.');
requireText(blogCatalog, "hydrateVisible('BLOG'", 'Blog favorites must hydrate only visible identifiers.');
requireText(scalableCatalog, 'public_blog_catalog_v217', 'Blog catalogue must be backed by the V217 public view.');
for (const forbidden of ['loadBlogList()', 'getBlogPosts()', 'refreshCloudCatalog(', 'ensureVehicleCloudInventory(']) {
  rejectText(blogCatalog, forbidden, `Blog list must not restore full-catalog hydration: ${forbidden}`);
}

// Previously fixed public regressions remain locked.
requireText(rental, 'campaignProofLabel', 'Rental campaign social proof must remain wired.');
requireText(tour, 'class="action-bar"', 'Tour must retain one canonical fixed action bar.');
requireText(tour, '<span>WhatsApp’tan Sor</span>', 'Tour WhatsApp action missing.');
requireText(tour, '<span>Bu Turu Rezerve Et</span>', 'Tour reservation action missing.');
rejectText(tour, 'Hazır olduğunuzda', 'Duplicate legacy tour reservation card must not return.');

// Force old static PWA bundles out after this public contract release.
requireText(worker, "const RELEASE = 'v202-public-detail-contract';", 'PWA cache release was not rotated for V202.');

console.log('V202/V225 public detail contract: OK');
