import fs from 'node:fs';

const fail = (message) => {
  console.error(`V197_DETAIL_INTEGRITY_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, 'utf8');

const detail = read('src/services/public-detail-data.service.ts');
if (!detail.includes('loadForVehicle(ownerId)')) fail('vehicle detail must hydrate media for the selected vehicle only');
if (!detail.includes('loadForTour(ownerId)')) fail('tour detail must hydrate media for the selected tour only');
if (!detail.includes('async loadBlog(routeId: string)')) fail('blog detail must have direct route hydration');
if (!detail.includes('select=${this.vehicleSelect}&limit=1') || !detail.includes('select=${this.tourSelect}&limit=1') || !detail.includes('select=${this.blogSelect}&limit=1')) fail('detail queries must be single-record queries with explicit public projections');
if (detail.includes('select=*&limit=1')) fail('detail queries must never expose all table columns');
if (!detail.includes('private readonly vehicleSelect') || !detail.includes('private readonly tourSelect') || !detail.includes('private readonly blogSelect')) fail('customer-safe detail projections are missing');
if (detail.includes('catalog.loadVehicles(true)')) fail('vehicle detail must not download the whole vehicle catalogue');
if (detail.includes('loadToursDirect()')) fail('detail service must not retain the old whole-tour loader');
if (!detail.includes('row["rental_price_hourly"] ?? metadata["hourlyPrice"]')) fail('hourly price must prefer the authoritative vehicle column');
if (!detail.includes('row["hourly_rental_enabled"] != null')) fail('hourly rental enabled state must prefer the authoritative vehicle column');
if (!detail.includes('row["minimum_rental_hours"] ?? metadata["minimumRentalHours"]')) fail('minimum rental hours must prefer the authoritative vehicle column');
if (!detail.includes('row["hourly_mileage_limit"] ?? metadata["hourlyMileageLimit"]')) fail('hourly mileage limit must prefer the authoritative vehicle column');
if (!detail.includes('doors: row["doors"] ?? metadata["doors"]')) fail('canonical vehicle mapping must retain admin-entered door count');

const canonicalRentalPath = 'src/pages/car-detail.component.ts';
const removedRentalPath = 'src/pages/rental-detail-v167.component.ts';
if (!fs.existsSync(canonicalRentalPath)) fail('canonical rental detail runtime is missing');
if (fs.existsSync(removedRentalPath)) fail('deleted V167 rental detail renderer must not return');
const rental = read(canonicalRentalPath);
if (!rental.includes('<dt>Kapı</dt>') || !rental.includes('car.doors')) fail('canonical rental detail must surface the admin-entered door count');
if (!rental.includes('car.luggage')) fail('rental detail must surface admin luggage capacity');
if (!rental.includes('detailedFeatures') || !rental.includes('features = computed')) fail('rental detail must merge flat and categorized admin features');
if (!rental.includes('car.cylinderCount') || !rental.includes('car.cityFuelConsumption') || !rental.includes('car.highwayFuelConsumption')) fail('rental performance facts must retain extended admin-entered specs');
if (!rental.includes('Performans ve Tüketim')) fail('rental technical facts must use customer-facing language');
if (rental.includes('Rezervasyon Özeti') || rental.includes('Kiralama Özeti') || rental.includes('class="reservation-panel"')) fail('booking-owned rental summary must not be duplicated in canonical rental detail');
if (rental.includes('{{loadError()}}') || rental.includes('{{ loadError() }}')) fail('canonical rental detail must never expose raw backend errors to customers');

const media = read('src/services/public-catalog-media.service.ts');
if (!media.includes('loadForVehicle(vehicleId: string)')) fail('catalog media owner query missing for vehicles');
if (!media.includes('loadForTour(tourId: string)')) fail('catalog media owner query missing for tours');

// V208: the active V170 showcase keeps its compatibility service, but public tour
// database ownership is canonicalized in CarService -> CatalogService. Tour detail
// remains owned by PublicDetailDataService above, where single-record projection and
// owner-scoped media are already enforced.
const tours = read('src/services/tour-public-data-v170.service.ts');
if (!tours.includes('inject(CarService)')) fail('V170 tour showcase adapter must delegate to canonical CarService');
if (!tours.includes('refreshCloudCatalog(true)') || !tours.includes('getTours()')) fail('V170 tour showcase adapter must consume canonical tour catalogue state');
for (const forbidden of ['SUPABASE_PROJECT_URL', 'SUPABASE_PUBLISHABLE_KEY', 'fetch(']) {
  if (tours.includes(forbidden)) fail(`V170 tour showcase adapter must not own a parallel database source: ${forbidden}`);
}

const blog = read('src/pages/blog-detail.component.ts');
if (blog.includes('getBlogPosts()')) fail('blog detail must not depend on global catalogue hydration');
if (!blog.includes('detailData.loadBlog(id)')) fail('blog detail must load its own route record');
if (!blog.includes('@else if(loading())') || !blog.includes('readonly loading = signal(true)') || !blog.includes('this.loading.set(true)') || !blog.includes('this.loading.set(false)') || !blog.includes('role="alert"')) fail('blog detail must distinguish loading from real not-found independent of template spacing');

const campaignMigration = read('supabase/migrations/20260827194000_v197_campaign_target_route_integrity.sql');
if (!campaignMigration.includes('new.cta_url := null')) fail('targeted campaign CTA normalization missing');
if (!campaignMigration.includes('campaigns_target_reference_v197_ck')) fail('targeted campaign reference constraint missing');
if (!campaignMigration.includes('campaigns_target_route_v197')) fail('campaign target route trigger missing');

const hourlyMigration = read('supabase/migrations/20260827203000_v1971_vehicle_hourly_canonical_sync.sql');
if (!hourlyMigration.includes('vehicles_hourly_canonical_v1971')) fail('hourly rental metadata/canonical sync trigger missing');
if (!hourlyMigration.includes('vehicles_hourly_enabled_integrity_v1971_ck')) fail('hourly rental DB integrity constraint missing');
if (!hourlyMigration.includes("meta -> 'hourlyPrice'")) fail('admin hourly price changes are not synchronized to the canonical column');
if (!hourlyMigration.includes("meta -> 'minimumRentalHours'")) fail('admin minimum-hour changes are not synchronized to the canonical column');

const hourlyCleanup = read('supabase/migrations/20260827204500_v1972_remove_legacy_hourly_sync.sql');
if (!hourlyCleanup.includes('drop trigger if exists vehicles_sync_hourly_fields')) fail('legacy duplicate hourly trigger cleanup missing');
if (!hourlyCleanup.includes('drop function if exists public.sync_vehicle_hourly_fields()')) fail('legacy public hourly trigger function cleanup missing');

const worker = read('public/service-worker.js');
const release = worker.match(/const RELEASE = 'v([0-9]+)[^']*'/);
if (!release || Number(release[1]) < 197) fail('PWA cache generation must be V197 or newer for this runtime release');
if (!worker.includes('request.mode === \'navigate\'')) fail('PWA navigation must remain network-authoritative');

if (!process.exitCode) {
  console.log('V197 detail integrity OK: safe single-record projections, canonical rental/tour ownership, complete customer facts, owner media, one hourly sync, direct blog load, campaign targets and fresh PWA generation are enforced.');
}
