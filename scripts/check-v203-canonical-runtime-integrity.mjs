import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const compact = (source) => source.replace(/\s+/g, '');
const requireFile = (file) => { if (!fs.existsSync(file)) throw new Error(`V203 required file missing: ${file}`); };
const requireMissing = (file) => { if (fs.existsSync(file)) throw new Error(`V203 legacy duplicate must remain deleted: ${file}`); };
const must = (source, token, message) => { if (!source.includes(token)) throw new Error(message || `V203 contract missing: ${token}`); };
const mustNot = (source, token, message) => { if (source.includes(token)) throw new Error(message || `V203 forbidden contract: ${token}`); };

const canonical = [
  'src/app.routes.ts',
  'src/pages/catalog-detail-shells.component.ts',
  'src/pages/car-detail.component.ts',
  'src/pages/sale-car-detail.component.ts',
  'src/pages/tour-detail.component.ts',
  'src/pages/blog-detail.component.ts',
  'src/pages/fleet.component.ts',
  'src/pages/rental-catalog-v217.component.ts',
  'src/pages/sales-results.component.ts',
  'src/pages/sale-catalog-v217.component.ts',
  'src/pages/tours.component.ts',
  'src/pages/tour-catalog-v217.component.ts',
  'src/pages/blog-list.component.ts',
  'src/pages/blog-catalog-v217.component.ts',
  'src/services/scalable-public-catalog-v217.service.ts',
  'src/pages/list-your-car.component.ts',
  'src/pages/branch-partner-v171.component.ts',
  'src/pages/account-shell.component.ts',
  'src/pages/account-dashboard-v150.component.ts',
  'src/pages/admin/admin-catalog-workspace.component.ts',
  'src/pages/admin/admin-content-hub.component.ts',
  'src/pages/home-v71.component.ts',
  'src/components/dynamic-home-section.component.ts',
  'src/services/homepage-layout.service.ts',
  'src/premium-responsive.css',
  'docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md',
];
canonical.forEach(requireFile);

const removedLegacy = [
  'src/pages/account-dashboard.component.ts',
  'src/pages/rental-detail-v167.component.ts',
  'src/pages/sale-detail-v168.component.ts',
  'src/pages/sale-detail-v1681.component.ts',
  'src/pages/tour-detail-v169.component.ts',
  'src/pages/tour-detail-v170.component.ts',
  'src/pages/admin/admin-catalog-editor.component.ts',
  'src/pages/admin/admin-sale-integrity-v1681.component.ts',
  'src/pages/admin/admin-tour-studio-v170.component.ts',
  'src/pages/list-your-car-v2.component.ts',
  'src/pages/tour-showcase-v169.component.ts',
  'src/pages/sales-results.component.html',
  'src/pages/branch-partner.component.ts',
  'src/pages/branch-partner-v164.component.ts',
  'src/pages/rental-results.component.ts',
  'src/pages/tour-results.component.ts',
];
removedLegacy.forEach(requireMissing);

// A workflow may mention a deleted file only to assert that it stays deleted.
const workflowDir = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name));
const isAbsenceAssertion = (line, legacy) => {
  if (!line.includes(legacy)) return false;
  const trimmed = line.trim();
  return /^test\s+!\s+-f\s+/.test(trimmed) || /^!\s*test\s+-f\s+/.test(trimmed);
};
for (const name of workflowFiles) {
  const lines = read(path.join(workflowDir, name)).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const legacy of removedLegacy) {
      if (line.includes(legacy) && !isAbsenceAssertion(line, legacy)) {
        throw new Error(`Workflow ${name}:${index + 1} still positively depends on removed legacy file: ${legacy}`);
      }
    }
  });
}

const scriptDir = 'scripts';
const scriptFiles = fs.readdirSync(scriptDir).filter((name) => /\.(?:mjs|cjs|js)$/i.test(name));
const positiveScriptDependency = (line, legacy) => {
  if (!line.includes(legacy)) return false;
  return [/\bread\s*\(/,/readFileSync\s*\(/,/\bimport\s+/,/\bfrom\s+['"]/,/\brequire\s*\(/].some((pattern) => pattern.test(line));
};
for (const name of scriptFiles) {
  const lines = read(path.join(scriptDir, name)).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const legacy of removedLegacy) {
      if (positiveScriptDependency(line, legacy)) {
        throw new Error(`Integrity script ${name}:${index + 1} still reads/imports removed legacy file: ${legacy}`);
      }
    }
  });
}

const routes = read('src/app.routes.ts');
for (const token of [
  "./pages/catalog-detail-shells.component",
  "./pages/branch-partner-v171.component",
  "./pages/list-your-car.component",
  "./pages/fleet.component",
  "./pages/sales-results.component",
  "./pages/tours.component",
]) must(routes, token, `Canonical route missing: ${token}`);
for (const token of ['branch-partner-v164.component','rental-results.component','tour-results.component','list-your-car-v2.component','tour-showcase-v169.component']) mustNot(routes, token, `Legacy route returned: ${token}`);

// Route shells must delegate to the bounded V217 owners and must not revive historical showcase owners.
const fleet = read('src/pages/fleet.component.ts');
const rentalCatalog = read('src/pages/rental-catalog-v217.component.ts');
const saleResults = read('src/pages/sales-results.component.ts');
const saleCatalog = read('src/pages/sale-catalog-v217.component.ts');
const tours = read('src/pages/tours.component.ts');
const tourCatalog = read('src/pages/tour-catalog-v217.component.ts');
const blogList = read('src/pages/blog-list.component.ts');
const blogCatalog = read('src/pages/blog-catalog-v217.component.ts');
const scalableCatalog = read('src/services/scalable-public-catalog-v217.service.ts');
const valuation = read('src/pages/list-your-car.component.ts');
const accountShell = read('src/pages/account-shell.component.ts');
for (const token of ['RentalCatalogV217Component','<app-rental-catalog-v217 />']) must(fleet, token);
for (const token of ['SaleCatalogV217Component','<app-sale-catalog-v217 />']) must(saleResults, token);
for (const token of ['TourCatalogV217Component','<app-tour-catalog-v217 />']) must(tours, token);
for (const token of ['BlogCatalogV217Component','<app-blog-catalog-v217 />']) must(blogList, token);
for (const [name, source] of [['rental',rentalCatalog],['sale',saleCatalog],['tour',tourCatalog],['blog',blogCatalog]]) {
  must(source, 'ScalablePublicCatalogV217Service', `${name} route owner must use the scalable catalogue service.`);
  for (const forbidden of ['getCars()','getSaleCars()','getTours()','getBlogPosts()','refreshCloudCatalog(','ensureVehicleCloudInventory(']) mustNot(source, forbidden, `${name} route owner must remain bounded: ${forbidden}`);
}
must(rentalCatalog, 'pageSize:24', 'Rental catalogue must keep bounded 24-item pages.');
must(saleCatalog, 'pageSize:24', 'Sale catalogue must keep bounded 24-item pages.');
must(tourCatalog, 'pageSize:24', 'Tour catalogue must keep bounded 24-item pages.');
must(blogCatalog, 'pageSize:24', 'Blog catalogue must keep bounded 24-item pages.');
for (const view of ['public_vehicle_catalog_v217','public_tour_catalog_v217','public_blog_catalog_v217']) must(scalableCatalog, view, `Scalable catalogue is missing ${view}.`);
for (const token of ['ListYourCarV172Component','<app-list-your-car-v172 />']) must(valuation, token);
for (const token of ['AccountDashboardV150Component','<app-account-dashboard-v150>']) must(accountShell, token);

const shell = read('src/pages/catalog-detail-shells.component.ts');
for (const token of ['CarDetailComponent','SaleCarDetailComponent','TourDetailComponent']) must(shell, token);
for (const token of ['RentalDetailV167Component','SaleDetailV1681Component','TourDetailV170Component']) mustNot(shell, token, `Historical renderer returned to public shell: ${token}`);

const sale = read('src/pages/sale-car-detail.component.ts');
for (const token of ['İLAN BİLGİLERİ','readonly listingRows = computed<ListingRow[]>','label: "Yıl"','label: "Kilometre"','label: "Yakıt"','label: "Vites"','label: "Kasa Tipi"','class="bottom-actions"','callPhone()','launchExternal','class="truth-list"']) must(sale, token, `Sale canonical contract missing: ${token}`);
for (const token of ['class="summary"','summaryMeta(','class="core-facts"']) mustNot(sale, token, 'Sale hero must not duplicate canonical listing facts.');
const saleActionBlock = sale.match(/<nav class="bottom-actions"[\s\S]*?<\/nav>/)?.[0] || '';
if ((saleActionBlock.match(/<button\b/g) || []).length !== 3) throw new Error('Sale bottom bar must contain exactly three persistent buttons.');
for (const token of ['Telefonla ara','Araç için bilgi talebi gönder','WhatsApp ile bilgi al']) must(saleActionBlock, token);
if (/\[disabled\].*(phone|whatsapp)|(phone|whatsapp).*\[disabled\]/i.test(saleActionBlock)) throw new Error('Phone/WhatsApp actions must not disappear through native disabled state.');

const rental = read('src/pages/car-detail.component.ts');
for (const token of ['fixed-actions','campaignProofLabel','detailsOpen','detailData.load("RENTAL"','dailyMileageLimit','hourlyMileageLimit']) must(rental, token);
if (/mobile-actions|primary-action|whatsapp-action/.test(rental)) throw new Error('Rental detail must have one canonical fixed CTA owner.');

const tour = read('src/pages/tour-detail.component.ts');
for (const token of ['action-bar','reservationOpen = signal(false)','TourDemandV170Service','TourBookingV170Service','mapHref','1_000_000_000','DetailMediaLightboxComponent']) must(tour, token);
const mapPosition = tour.indexOf('class="panel map-panel"');
const overlayPosition = tour.indexOf('class="reservation-overlay"');
if (mapPosition < 0 || overlayPosition < 0 || mapPosition > overlayPosition) throw new Error('Tour map must remain normal content before reservation overlay.');

const responsive = read('src/premium-responsive.css');
for (const token of ['V203 canonical detail action system','app-car-detail .fixed-actions','app-sale-car-detail .bottom-actions','app-tour-detail .action-bar','gap:0!important','env(safe-area-inset-bottom)','@media (min-width:720px)','@media (min-width:1180px)']) must(responsive, token, `Responsive canonical contract missing: ${token}`);

const adminHub = read('src/pages/admin/admin-content-hub.component.ts');
const adminWorkspace = read('src/pages/admin/admin-catalog-workspace.component.ts');
for (const token of ['AdminCatalogWorkspaceComponent','mode="SALE"','mode="TOUR"','mode="RENTAL"']) must(adminHub, token);
for (const token of ['Fotoğraf & Video','hourlyMileageLimit','tramerSourceUrl','damageExpertise','tour.itinerary','tour.includedItems','tour.excludedItems','tour.meetingPoint']) must(adminWorkspace, token);

const home = read('src/pages/home-v71.component.ts');
const section = read('src/components/dynamic-home-section.component.ts');
const layout = read('src/services/homepage-layout.service.ts');
const layoutCompact = compact(layout);
for (const token of ['HomepageLayoutService','DynamicHomeSectionComponent','homepageLayout.sections()']) must(home, token);
for (const token of ['vehiclesFor(this.section.sectionKey)','toursFor(this.section.sectionKey)','blogsFor(this.section.sectionKey)','campaignsFor(this.section.sectionKey)']) must(section, token, `Dynamic homepage must consume bounded layout state: ${token}`);
for (const forbidden of ['this.cars.getSaleCars()','this.cars.getCars()','this.cars.getTours()','this.cars.getBlogPosts()','this.campaignsService.publicCampaigns()']) mustNot(section, forbidden, `Dynamic homepage must not restore full-catalog hydration: ${forbidden}`);
for (const token of ['homepage_sections?is_enabled=eq.true','homepage_placements?is_active=eq.true','PublicContentRealtimeService','cache:\'no-store\'','vehiclesByIdentifiers(','toursByIdentifiers(','blogsByIdentifiers(','campaignsByIdentifiers(']) must(layoutCompact, compact(token), `Homepage bounded ownership contract missing: ${token}`);

console.log('V203 canonical runtime/repository integrity: PASS');
