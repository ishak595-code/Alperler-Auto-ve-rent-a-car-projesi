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
const rentalPath = 'src/pages/rental-detail-v167.component.ts';
const salePath = 'src/pages/sale-detail-v1681.component.ts';
const tourPath = 'src/pages/tour-detail-v170.component.ts';
const blogPath = 'src/pages/blog-detail.component.ts';
const canonicalPublicMediaPath = 'src/services/public-catalog-media.service.ts';
const duplicateGalleryPath = 'src/app/components/catalog-mixed-gallery.component.ts';
const duplicateMediaPath = 'src/app/services/public-catalog-media.service.ts';

for (const path of [lightboxPath, rentalPath, salePath, tourPath, blogPath, canonicalPublicMediaPath]) {
  if (!fs.existsSync(path)) throw new Error(`Required V199 file missing: ${path}`);
}
if (fs.existsSync(duplicateGalleryPath)) throw new Error('Duplicate public gallery path must remain deleted.');
if (fs.existsSync(duplicateMediaPath)) throw new Error('Duplicate public media service path must remain deleted.');

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

for (const contract of [
  "car.videos||[]",
  "kind:'VIDEO'",
  '(touchstart)="galleryTouchStart($event)"',
  '(touchend)="galleryTouchEnd($event)"',
  '@media(max-width:1023px){.reserve>button{display:none}}',
  '@media(min-width:1024px)',
  '.mobile{display:none}',
]) must(rental, contract, `Rental detail missing mixed-media/CTA contract: ${contract}`);

for (const contract of [
  "item.videos||[]",
  "kind:'VIDEO'",
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  '<dt>Kapı</dt>',
  'item.doors',
]) must(sale, contract, `Sale detail missing public/admin media-field contract: ${contract}`);

for (const contract of [
  'item.videos||[]',
  'kind:"VIDEO" as const',
  '(touchstart)="touchStart($event)"',
  '(touchend)="touchEnd($event)"',
  'item.includedItems',
  'item.excludedItems',
  'itinerary()',
]) must(tour, contract, `Tour detail missing mixed-media/content contract: ${contract}`);

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
  'kind: CatalogMediaKind',
]) must(publicMedia, contract, `Canonical public media service missing owner-scoped contract: ${contract}`);

if (count(tour, '(click)="openReservation()"') !== 1) throw new Error('Tour detail must expose exactly one primary reservation action.');
if (count(tour, '(click)="whatsapp()"') !== 1) throw new Error('Tour detail must expose exactly one WhatsApp action.');
if (count(sale, '(click)="whatsapp()"') !== 1) throw new Error('Sale detail must expose exactly one WhatsApp action.');

console.log('V199 detail media contract: PASS');
