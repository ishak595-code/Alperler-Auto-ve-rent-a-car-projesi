import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message || `Missing contract: ${needle}`);
};
const mustNot = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message || `Forbidden contract: ${needle}`);
};
const count = (source, needle) => source.split(needle).length - 1;

const lightboxPath = 'src/components/detail-media-lightbox.component.ts';
const rentalPath = 'src/pages/car-detail.component.ts';
const salePath = 'src/pages/sale-car-detail.component.ts';
const tourPath = 'src/pages/tour-detail.component.ts';
const shellPath = 'src/pages/catalog-detail-shells.component.ts';
const blogPath = 'src/pages/blog-detail.component.ts';
const canonicalPublicMediaPath = 'src/services/public-catalog-media.service.ts';
const dynamicHomePath = 'src/components/dynamic-home-section.component.ts';
const mobileDockPath = 'src/components/customer-mobile-dock.component.ts';
const duplicatePaths = [
  'src/components/catalog-mixed-gallery.component.ts',
  'src/app/components/catalog-mixed-gallery.component.ts',
  'src/app/services/public-catalog-media.service.ts',
  'src/pages/rental-detail-v167.component.ts',
  'src/pages/sale-detail-v168.component.ts',
  'src/pages/sale-detail-v1681.component.ts',
  'src/pages/tour-detail-v169.component.ts',
  'src/pages/tour-detail-v170.component.ts',
];

for (const path of [lightboxPath, rentalPath, salePath, tourPath, shellPath, blogPath, canonicalPublicMediaPath, dynamicHomePath, mobileDockPath]) {
  if (!fs.existsSync(path)) throw new Error(`Required canonical detail file missing: ${path}`);
}
for (const path of duplicatePaths) {
  if (fs.existsSync(path)) throw new Error(`Duplicate/legacy public detail-media path must remain deleted: ${path}`);
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
const shell = read(shellPath);
const blog = read(blogPath);

for (const [name, source] of [['rental', rental], ['sale', sale], ['tour', tour], ['blog', blog]]) {
  must(source, 'app-detail-media-lightbox', `${name} detail must use the canonical lightbox.`);
  mustNot(source, 'autoplay', `${name} detail must not autoplay media.`);
}

for (const contract of [
  'mediaItems()',
  "media.kind==='IMAGE'",
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'fixed-actions',
  'detailData.load("RENTAL"',
]) must(rental, contract, `Rental detail missing canonical mixed-media/CTA contract: ${contract}`);

for (const contract of [
  'mediaItems()',
  "media.kind === 'IMAGE'",
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'damageExpertise',
  'bottom-actions',
]) must(sale, contract, `Sale detail missing canonical public/admin media-field contract: ${contract}`);

for (const contract of [
  'mediaItems()',
  "media.kind === 'IMAGE'",
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'item.includedItems',
  'item.excludedItems',
  'itinerary()',
  'action-bar',
]) must(tour, contract, `Tour detail missing canonical mixed-media/content contract: ${contract}`);

for (const contract of [
  '[items]="article.media"',
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'fullscreenOpen',
  'authorName',
]) must(blog, contract, `Blog detail missing mixed-media/article contract: ${contract}`);

for (const contract of ['CarDetailComponent', 'SaleCarDetailComponent', 'TourDetailComponent']) {
  must(shell, contract, `Public detail shell missing canonical owner: ${contract}`);
}
for (const forbidden of ['RentalDetailV167Component', 'SaleDetailV168Component', 'SaleDetailV1681Component', 'TourDetailV169Component', 'TourDetailV170Component']) {
  mustNot(shell, forbidden, `Historical detail owner must never return to public routing: ${forbidden}`);
}

const publicMedia = read(canonicalPublicMediaPath);
for (const contract of [
  'loadForVehicle(vehicleId: string)',
  'loadForTour(tourId: string)',
  'loadForBlog(blogPostId: string)',
  'kind: PublicCatalogMediaKind',
]) must(publicMedia, contract, `Canonical public media service missing owner-scoped contract: ${contract}`);
mustNot(publicMedia, 'from "./catalog-media.service"', 'Public media reads must never import the authenticated admin media service.');
mustNot(publicMedia, 'from \'./catalog-media.service\'', 'Public media reads must never import the authenticated admin media service.');

const dynamicHome = read(dynamicHomePath);
for (const contract of [
  "section.sectionType === 'CAMPAIGN'",
  '(click)="openCampaign(campaign)"',
  'resolveCampaignTarget(item.targetType,item.targetId,item.ctaUrl)',
]) must(dynamicHome, contract, `Homepage campaign routing contract missing: ${contract}`);
if (count(dynamicHome, '(click)="openCampaign(campaign)"') !== 1) throw new Error('Homepage campaign card must expose exactly one campaign action surface.');

const mobileDock = read(mobileDockPath);
for (const contract of [
  'const shouldHide = path !== "/"',
  'this.hidden.set(shouldHide)',
  'setMobileDockRouteHidden(shouldHide)',
]) must(mobileDock, contract, `Global mobile dock must stay hidden away from the homepage, including all detail routes: ${contract}`);

if (count(tour, '(click)="openReservation()"') !== 1) throw new Error('Tour detail must expose exactly one primary reservation action.');
if (count(tour, '(click)="whatsapp()"') !== 1) throw new Error('Tour detail must expose exactly one WhatsApp action.');
if (count(sale, '(click)="whatsapp()"') !== 1) throw new Error('Sale detail must expose exactly one WhatsApp action.');
if (count(sale, '(click)="inquire(item)"') !== 1) throw new Error('Sale detail must expose exactly one sales inquiry action.');
if (count(rental, '(click)="whatsapp()"') !== 1) throw new Error('Rental detail must expose exactly one WhatsApp action.');
if (count(rental, '(click)="reserve(car)"') !== 1) throw new Error('Rental detail must expose exactly one reservation action.');

console.log('V199 canonical detail media and CTA ownership contract: PASS');
