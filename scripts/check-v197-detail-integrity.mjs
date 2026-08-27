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
if (!detail.includes('&select=*&limit=1')) fail('detail queries must be single-record queries');
if (detail.includes('catalog.loadVehicles(true)')) fail('vehicle detail must not download the whole vehicle catalogue');
if (detail.includes('loadToursDirect()')) fail('detail service must not retain the old whole-tour loader');
if (!detail.includes('row["rental_price_hourly"] ?? metadata["hourlyPrice"]')) fail('hourly price must prefer the authoritative vehicle column');
if (!detail.includes('row["hourly_rental_enabled"] != null')) fail('hourly rental enabled state must prefer the authoritative vehicle column');
if (!detail.includes('row["minimum_rental_hours"] ?? metadata["minimumRentalHours"]')) fail('minimum rental hours must prefer the authoritative vehicle column');
if (!detail.includes('row["hourly_mileage_limit"] ?? metadata["hourlyMileageLimit"]')) fail('hourly mileage limit must prefer the authoritative vehicle column');

const media = read('src/services/public-catalog-media.service.ts');
if (!media.includes('loadForVehicle(vehicleId: string)')) fail('catalog media owner query missing for vehicles');
if (!media.includes('loadForTour(tourId: string)')) fail('catalog media owner query missing for tours');

const tours = read('src/services/tour-public-data-v170.service.ts');
if (tours.includes('const rows = await this.list();')) fail('tour detail must not hydrate via the full tour list');
if (!tours.includes('limit=1')) fail('tour detail must query one published tour');
if (!tours.includes('loadForTour(')) fail('tour detail must hydrate only its own media');

const blog = read('src/pages/blog-detail.component.ts');
if (blog.includes('getBlogPosts()')) fail('blog detail must not depend on global catalogue hydration');
if (!blog.includes('detailData.loadBlog(id)')) fail('blog detail must load its own route record');
if (!blog.includes('@else if (loading())')) fail('blog detail must distinguish loading from real not-found');

const migration = read('supabase/migrations/20260827194000_v197_campaign_target_route_integrity.sql');
if (!migration.includes('new.cta_url := null')) fail('targeted campaign CTA normalization missing');
if (!migration.includes('campaigns_target_reference_v197_ck')) fail('targeted campaign reference constraint missing');
if (!migration.includes('campaigns_target_route_v197')) fail('campaign target route trigger missing');

const worker = read('public/service-worker.js');
const release = worker.match(/const RELEASE = 'v([0-9]+)[^']*'/);
if (!release || Number(release[1]) < 197) fail('PWA cache generation must be V197 or newer for this runtime release');
if (!worker.includes('request.mode === \'navigate\'')) fail('PWA navigation must remain network-authoritative');

if (!process.exitCode) {
  console.log('V197 detail integrity OK: single-record detail hydration, owner media, authoritative hourly rental fields, direct blog load, canonical campaign targets and fresh PWA generation are enforced.');
}
