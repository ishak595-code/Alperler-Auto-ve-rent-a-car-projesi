import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message || `Missing contract: ${needle}`);
};
const mustNot = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message || `Forbidden contract: ${needle}`);
};

const lightboxPath = 'src/components/detail-media-lightbox.component.ts';
const rentalPath = 'src/pages/car-detail.component.ts';
const salePath = 'src/pages/sale-car-detail.component.ts';
const tourPath = 'src/pages/tour-detail.component.ts';
const blogPath = 'src/pages/blog-detail.component.ts';
const canonicalPublicMediaPath = 'src/services/public-catalog-media.service.ts';
const dynamicHomePath = 'src/components/dynamic-home-section.component.ts';
const mobileDockPath = 'src/components/customer-mobile-dock.component.ts';
const mobileDockPolicyPath = 'src/services/mobile-dock-route-policy.ts';
const removedDetailPaths = [
  'src/pages/rental-detail-v167.component.ts',
  'src/pages/sale-detail-v168.component.ts',
  'src/pages/sale-detail-v1681.component.ts',
  'src/pages/tour-detail-v169.component.ts',
  'src/pages/tour-detail-v170.component.ts',
];
const duplicatePaths = [
  'src/components/catalog-mixed-gallery.component.ts',
  'src/app/components/catalog-mixed-gallery.component.ts',
  'src/app/services/public-catalog-media.service.ts',
];

for (const path of [lightboxPath, rentalPath, salePath, tourPath, blogPath, canonicalPublicMediaPath, dynamicHomePath, mobileDockPath, mobileDockPolicyPath]) {
  if (!fs.existsSync(path)) throw new Error(`Required V199 canonical file missing: ${path}`);
}
for (const path of [...removedDetailPaths, ...duplicatePaths]) {
  if (fs.existsSync(path)) throw new Error(`Duplicate/legacy public media owner must remain deleted: ${path}`);
}

const lightbox = read(lightboxPath);
for (const contract of [
  'role="dialog"',
  'aria-modal="true"',
  "event.key === 'Escape'",
  "event.key === 'ArrowLeft'",
  "event.key === 'ArrowRight'",
  'touchStart(event: TouchEvent)',
  'touchEnd(event: TouchEvent)',
  'trapTab(event: KeyboardEvent)',
  'inertBackground()',
  'child.inert = true',
  "document.body.style.overflow = 'hidden'",
  'this.invoker?.focus()',
  "media.kind === 'IMAGE'",
  '<video',
]) must(lightbox, contract, `Shared detail lightbox missing accessibility/media contract: ${contract}`);
mustNot(lightbox, 'autoplay', 'Detail media lightbox must never autoplay customer video.');

const rental = read(rentalPath);
const sale = read(salePath);
const tour = read(tourPath);
const blog = read(blogPath);

for (const [name, source] of [['rental', rental], ['sale', sale], ['tour', tour], ['blog', blog]]) {
  must(source, 'app-detail-media-lightbox', `${name} detail must use the canonical lightbox.`);
  mustNot(source, 'autoplay', `${name} detail must not autoplay media.`);
}

for (const [name, source] of [['rental', rental], ['sale', sale], ['tour', tour]]) {
  for (const contract of [
    'DetailMediaItem',
    'mediaItems()',
    '<video',
    'controls playsinline preload="metadata"',
    '(touchstart)="touchStart($event)"',
    '(touchend)="touchEnd($event)"',
    'openLightbox()',
  ]) must(source, contract, `${name} canonical detail missing mixed-media contract: ${contract}`);
}

for (const contract of [
  'class="fixed-actions"',
  '(click)="whatsapp()"',
  '(click)="reserve(car)"',
  'detailData.load("RENTAL"',
]) must(rental, contract, `Rental detail missing canonical media/CTA contract: ${contract}`);

for (const contract of [
  'class="bottom-actions"',
  '(click)="callPhone()"',
  '(click)="inquire(item)"',
  '(click)="whatsapp()"',
  'readonly listingRows = computed<ListingRow[]>',
  'detailData.load("SALE"',
]) must(sale, contract, `Sale detail missing canonical media/CTA contract: ${contract}`);

for (const contract of [
  'class="action-bar"',
  '(click)="openReservation()"',
  '(click)="whatsapp()"',
  'item.includedItems',
  'item.excludedItems',
  'itineraryRows()',
  'detailData.load("TOUR"',
]) must(tour, contract, `Tour detail missing canonical media/content contract: ${contract}`);

for (const contract of [
  '[items]="article.media"',
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'fullscreenOpen',
  'authorName',
]) must(blog, contract, `Blog detail missing mixed-media/article contract: ${contract}`);

const publicMedia = read(canonicalPublicMediaPath);
for (const contract of [
  'loadForVehicle(vehicleId: string)',
  'loadForTour(tourId: string)',
  'loadForBlog(blogPostId: string)',
  'kind: PublicCatalogMediaKind',
]) must(publicMedia, contract, `Canonical public media service missing owner-scoped contract: ${contract}`);
mustNot(publicMedia, 'from "./catalog-media.service"', 'Public media reads must never import the authenticated admin media service.');
mustNot(publicMedia, "from './catalog-media.service'", 'Public media reads must never import the authenticated admin media service.');

// Homepage campaign media and routing must be semantic, not tied to whitespace or loop-variable names.
const dynamicHome = read(dynamicHomePath);
const compactHome = dynamicHome.replace(/\s+/g, '');
if (!compactHome.includes("section.sectionType==='CAMPAIGN'")) throw new Error('Homepage campaign section ownership is missing.');
const campaignClickMatches = [...dynamicHome.matchAll(/\(click\)="openCampaign\(([A-Za-z_$][\w$]*)\)"/g)];
if (campaignClickMatches.length !== 1) throw new Error(`Homepage campaign card must expose exactly one campaign action surface, found ${campaignClickMatches.length}.`);
must(dynamicHome, 'resolveCampaignTarget(item.targetType,item.targetId,item.ctaUrl)', 'Homepage campaign route must resolve through the canonical target resolver.');
must(dynamicHome, 'campaign=${encodeURIComponent(item.id)}', 'Homepage campaign navigation must preserve campaign attribution.');

const mobileDock = read(mobileDockPath);
for (const contract of [
  'shouldRenderMobileDock(rawUrl)',
  'this.hidden.set(shouldHide)',
  'setMobileDockRouteHidden(shouldHide)',
]) must(mobileDock, contract, `Global mobile dock must delegate visibility to the canonical route policy: ${contract}`);

const mobileDockPolicy = read(mobileDockPolicyPath);
must(mobileDockPolicy, "return cleanCustomerPath(rawUrl) === '/';", 'V225 mobile dock must render only on the homepage.');
for (const forbidden of [
  '/^\\/fleet\\/[^/]+$/',
  '/^\\/sales\\/[^/]+$/',
  '/^\\/tour\\/[^/]+$/',
  "'/booking-checkout'",
  "'/admin'",
  "'/branch-portal'",
]) mustNot(mobileDockPolicy, forbidden, `Historical route-by-route dock suppression must not return: ${forbidden}`);

if ((tour.match(/\(click\)="openReservation\(\)"/g) || []).length !== 1) throw new Error('Tour detail must expose exactly one primary reservation action.');
if ((tour.match(/\(click\)="whatsapp\(\)"/g) || []).length !== 1) throw new Error('Tour detail must expose exactly one WhatsApp action.');
if ((sale.match(/\(click\)="whatsapp\(\)"/g) || []).length !== 1) throw new Error('Sale detail must expose exactly one WhatsApp action.');
if ((sale.match(/\(click\)="callPhone\(\)"/g) || []).length !== 1) throw new Error('Sale detail must expose exactly one call action.');

console.log('V199/V225 canonical detail media, CTA and home-only dock contract: PASS');
