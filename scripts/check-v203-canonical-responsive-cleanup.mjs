import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message || `Missing V203 contract: ${token}`);
};
const mustNot = (source, token, message) => {
  if (source.includes(token)) throw new Error(message || `Forbidden V203 contract: ${token}`);
};
const mustExist = (path) => {
  if (!fs.existsSync(path)) throw new Error(`Required canonical file missing: ${path}`);
};
const mustNotExist = (path) => {
  if (fs.existsSync(path)) throw new Error(`Obsolete duplicate must stay deleted: ${path}`);
};

const canonical = [
  'src/pages/car-detail.component.ts',
  'src/pages/sale-car-detail.component.ts',
  'src/pages/tour-detail.component.ts',
  'src/pages/catalog-detail-shells.component.ts',
  'src/pages/rental-showcase-v167.component.ts',
  'src/pages/sales-showcase-v168.component.ts',
  'src/pages/tour-showcase-v170.component.ts',
  'src/pages/admin/admin-catalog-workspace.component.ts',
  'src/pages/admin/admin-content-hub.component.ts',
  'src/premium-responsive.css',
  'public/service-worker.js',
  'scripts/check-home-runtime-v192.mjs',
];
canonical.forEach(mustExist);

const obsolete = [
  'src/pages/rental-detail-v167.component.ts',
  'src/pages/sale-detail-v168.component.ts',
  'src/pages/sale-detail-v1681.component.ts',
  'src/pages/tour-detail-v169.component.ts',
  'src/pages/tour-detail-v170.component.ts',
  'src/pages/rental-results.component.ts',
  'src/pages/tour-results.component.ts',
  'src/pages/tour-showcase-v169.component.ts',
  'src/pages/sales-results.component.html',
  'src/pages/admin/admin-catalog-editor.component.ts',
  'src/pages/admin/admin-sale-integrity-v168.component.ts',
  'src/pages/admin/admin-sale-integrity-v1681.component.ts',
  'src/pages/admin/admin-tour-integrity-v169.component.ts',
  'src/pages/admin/admin-tour-studio-v170.component.ts',
];
obsolete.forEach(mustNotExist);

const routes = read('src/app.routes.ts');
const shells = read('src/pages/catalog-detail-shells.component.ts');
const rental = read('src/pages/car-detail.component.ts');
const sale = read('src/pages/sale-car-detail.component.ts');
const tour = read('src/pages/tour-detail.component.ts');
const fleet = read('src/pages/fleet.component.ts');
const sales = read('src/pages/sales-results.component.ts');
const tours = read('src/pages/tours.component.ts');
const adminHub = read('src/pages/admin/admin-content-hub.component.ts');
const adminWorkspace = read('src/pages/admin/admin-catalog-workspace.component.ts');
const responsive = read('src/premium-responsive.css');
const angular = read('angular.json');
const sw = read('public/service-worker.js');

for (const token of ['CarDetailComponent', 'SaleCarDetailComponent', 'TourDetailComponent']) {
  must(shells, token, `Catalog detail shell lost canonical renderer ${token}`);
}
for (const forbidden of ['RentalDetailV167Component', 'SaleDetailV168Component', 'SaleDetailV1681Component', 'TourDetailV169Component', 'TourDetailV170Component']) {
  mustNot(shells, forbidden, `Catalog detail shell must never restore historical renderer ${forbidden}`);
  mustNot(routes, forbidden, `Routes must never restore historical renderer ${forbidden}`);
}

must(fleet, 'RentalShowcaseV167Component', 'Rental list must keep the current V167 showcase');
must(sales, 'SalesShowcaseV168Component', 'Sale list must keep the current V168 showcase');
must(tours, 'TourShowcaseV170Component', 'Tour list must keep the current V170 showcase');

for (const token of [
  'readonly listingRows = computed<ListingRow[]>',
  '{ label: "Yıl"',
  '{ label: "Kilometre"',
  '{ label: "Yakıt"',
  '{ label: "Vites"',
  '{ label: "Kasa Tipi"',
  'class="bottom-actions"',
  '(click)="callPhone()"',
  '(click)="inquire(item)"',
  '(click)="whatsapp()"',
  'window.open(href, "_blank", "noopener,noreferrer")',
]) must(sale, token, `Sale canonical detail missing contract: ${token}`);
for (const forbidden of [
  'class="summary"',
  'summaryMeta()',
  'window.location.href = href',
  '2022 · 25.000 km',
]) mustNot(sale, forbidden, `Sale detail regained duplicate/static summary behavior: ${forbidden}`);

for (const token of ['class="fixed-actions"', 'activeCampaign', 'campaignProofLabel']) {
  must(rental, token, `Rental canonical detail missing contract: ${token}`);
}
for (const token of ['readonly reservationOpen = signal(false)', 'class="action-bar"', 'TourDemandV170Service', 'TourBookingV170Service']) {
  must(tour, token, `Tour canonical detail missing contract: ${token}`);
}

for (const token of [
  ':is(app-car-detail .fixed-actions,app-sale-car-detail .bottom-actions)',
  'gap:0!important',
  '@media (max-width:767px)',
  '@media (max-width:374px)',
  '@media (min-width:768px)',
  '@media (min-width:1200px)',
]) must(responsive, token, `Responsive segmented action contract missing: ${token}`);
must(angular, '"src/premium-responsive.css"', 'Premium responsive layer must remain in the Angular build');
must(sw, "const RELEASE = 'v203-responsive-canonical-cleanup';", 'PWA cache release must match V203 canonical UI');

for (const token of ['AdminCatalogWorkspaceComponent', 'mode="RENTAL"', 'mode="SALE"', 'mode="TOUR"']) {
  must(adminHub, token, `Admin content hub lost canonical workspace ownership: ${token}`);
}
for (const token of ['Fotoğraf & Video', 'saveVehicleAs', 'saveTourAs', 'saleTruthError']) {
  must(adminWorkspace, token, `Canonical admin workspace missing capability: ${token}`);
}
for (const forbidden of ['AdminCatalogEditorComponent', 'AdminSaleIntegrityV1681Component', 'AdminTourStudioV170Component']) {
  mustNot(adminHub, forbidden, `Legacy admin writer returned to active hub: ${forbidden}`);
}

console.log('V203 canonical responsive cleanup: PASS');
