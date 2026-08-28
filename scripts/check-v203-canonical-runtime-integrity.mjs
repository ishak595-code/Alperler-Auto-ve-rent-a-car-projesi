import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireFile = (path) => { if (!fs.existsSync(path)) throw new Error(`V203 required file missing: ${path}`); };
const requireMissing = (path) => { if (fs.existsSync(path)) throw new Error(`V203 legacy duplicate must remain deleted: ${path}`); };
const must = (source, token, message) => { if (!source.includes(token)) throw new Error(message || `V203 contract missing: ${token}`); };
const mustNot = (source, token, message) => { if (source.includes(token)) throw new Error(message || `V203 forbidden contract: ${token}`); };

const canonical = [
  'src/pages/catalog-detail-shells.component.ts',
  'src/pages/car-detail.component.ts',
  'src/pages/sale-car-detail.component.ts',
  'src/pages/tour-detail.component.ts',
  'src/pages/blog-detail.component.ts',
  'src/pages/admin/admin-catalog-workspace.component.ts',
  'src/pages/admin/admin-content-hub.component.ts',
  'src/pages/home-v71.component.ts',
  'src/components/dynamic-home-section.component.ts',
  'src/services/homepage-layout.service.ts',
  'src/premium-responsive.css',
  'docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md',
];
canonical.forEach(requireFile);

[
  'src/pages/rental-detail-v167.component.ts',
  'src/pages/sale-detail-v168.component.ts',
  'src/pages/sale-detail-v1681.component.ts',
  'src/pages/tour-detail-v169.component.ts',
  'src/pages/tour-detail-v170.component.ts',
  'src/pages/admin/admin-catalog-editor.component.ts',
  'src/pages/admin/admin-sale-integrity-v1681.component.ts',
  'src/pages/admin/admin-tour-studio-v170.component.ts',
].forEach(requireMissing);

const shell = read('src/pages/catalog-detail-shells.component.ts');
for (const token of ['CarDetailComponent','SaleCarDetailComponent','TourDetailComponent']) must(shell, token);
for (const token of ['RentalDetailV167Component','SaleDetailV1681Component','TourDetailV170Component']) mustNot(shell, token, `Historical renderer returned to public shell: ${token}`);

const sale = read('src/pages/sale-car-detail.component.ts');
for (const token of ['İLAN BİLGİLERİ','readonly listingRows = computed<ListingRow[]>','label: "Yıl"','label: "Kilometre"','label: "Yakıt"','label: "Vites"','label: "Kasa Tipi"','class="bottom-actions"','callPhone()','launchExternal','class="truth-list"']) must(sale, token, `Sale canonical contract missing: ${token}`);
for (const token of ['class="summary"','summaryMeta(','class="core-facts"']) mustNot(sale, token, 'Sale hero must not duplicate canonical listing facts.');
const saleActionBlock = sale.match(/<nav class="bottom-actions"[\s\S]*?<\/nav>/)?.[0] || '';
if ((saleActionBlock.match(/<button\b/g) || []).length !== 3) throw new Error('Sale bottom bar must contain exactly three persistent buttons.');
for (const token of ['Telefonla ara','Satış talebi gönder','WhatsApp ile bilgi al']) must(saleActionBlock, token);
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
for (const token of ['HomepageLayoutService','DynamicHomeSectionComponent','homepageLayout.sections()']) must(home, token);
for (const token of ['this.cars.getSaleCars()','this.cars.getCars()','this.cars.getTours()','this.cars.getBlogPosts()','this.campaignsService.publicCampaigns()','this.layout.placementsFor']) must(section, token);
for (const token of ['homepage_sections?is_enabled=eq.true','homepage_placements?is_active=eq.true','PublicContentRealtimeService','cache: \'no-store\'']) must(layout, token);

console.log('V203 canonical runtime/repository integrity: PASS');
