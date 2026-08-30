import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const files = {
  routes: 'src/app.routes.ts',
  hub: 'src/pages/admin/admin-content-hub.component.ts',
  catalogAdmin: 'src/services/catalog-admin-editor.service.ts',
  campaign: 'src/services/campaign.service.ts',
  homepageAdmin: 'src/services/homepage-admin.service.ts',
  homepageRuntime: 'src/services/homepage-layout.service.ts',
  dynamicHome: 'src/components/dynamic-home-section.component.ts',
  detailData: 'src/services/public-detail-data.service.ts',
  tourUi: 'src/pages/tour-detail.component.ts',
};

function source(path) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`MISSING ${path}`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

const routes = source(files.routes);
const hub = source(files.hub);
const catalogAdmin = source(files.catalogAdmin);
const campaign = source(files.campaign);
const homepageAdmin = source(files.homepageAdmin);
const homepageRuntime = source(files.homepageRuntime);
const dynamicHome = source(files.dynamicHome);
const detailData = source(files.detailData);
const tourUi = source(files.tourUi);

for (const marker of [
  "path: 'fleet'", "path: 'fleet/:id'", "path: 'sales'", "path: 'sales/:id'",
  "path: 'tours'", "path: 'tour/:id'", "path: 'campaigns'", "path: 'blog'", "path: 'blog/:id'",
  "path: 'cars'", "path: 'homepage'",
]) if (!routes.includes(marker)) failures.push(`ROUTE_MISSING ${marker}`);

for (const marker of [
  'AdminCatalogWorkspaceComponent', 'AdminCampaignsV167Component', 'AdminBlogComponent',
]) if (!hub.includes(marker)) failures.push(`ADMIN_HUB_MISSING ${marker}`);

for (const marker of [
  '/api/partner?op=catalog-admin', 'CREATE_VEHICLE', 'CREATE_TOUR', 'SAVE_VEHICLE', 'SAVE_TOUR',
]) if (!catalogAdmin.includes(marker)) failures.push(`CATALOG_ADMIN_FLOW_MISSING ${marker}`);

for (const forbidden of [
  'syncHomepageCampaigns(',
  'syncHomepageBanner(',
  '/rest/v1/homepage_placements',
  '/rest/v1/homepage_sections',
  '/rest/v1/site_config?key=eq.site_settings',
]) if (campaign.includes(forbidden)) failures.push(`CAMPAIGN_CROSSES_HOMEPAGE_OWNER ${forbidden}`);

for (const marker of [
  '/api/partner?op=site-content-admin',
  "selectionMode?: 'PLACEMENT' | 'LATEST'",
  "settings.selectionMode='PLACEMENT'",
  'addPlacement(', 'updatePlacement(', 'removePlacement(', 'reorderPlacements(',
]) if (!homepageAdmin.includes(marker)) failures.push(`HOMEPAGE_ADMIN_OWNER_MISSING ${marker}`);

for (const marker of [
  'homepage_sections', 'homepage_placements', 'selectionModeFor(', 'placementsFor(',
]) if (!homepageRuntime.includes(marker)) failures.push(`HOMEPAGE_RUNTIME_FLOW_MISSING ${marker}`);

for (const marker of [
  'orderedEntities(', 'selectionModeFor(this.section.sectionKey)==="LATEST"',
  'this.cars.getSaleCars()', 'this.cars.getCars()', 'this.cars.getTours()', 'this.campaignsService.publicCampaigns()',
]) if (!dynamicHome.includes(marker)) failures.push(`DYNAMIC_HOME_FLOW_MISSING ${marker}`);

for (const marker of [
  'meetingPoint: row["meeting_point"]',
  'locationName: row["location_name"]',
  'latitude: this.numberOrUndefined(row["latitude"])',
  'longitude: this.numberOrUndefined(row["longitude"])',
  'mapUrl: row["map_url"]',
]) if (!detailData.includes(marker)) failures.push(`TOUR_MAP_DATA_FLOW_MISSING ${marker}`);

for (const marker of ['mapHref(item)', 'Haritada aç']) {
  if (!tourUi.includes(marker)) failures.push(`TOUR_MAP_UI_MISSING ${marker}`);
}

const migration = join(root, 'supabase', 'migrations', '20260830093925_v215_vehicle_seo_slug_guard.sql');
if (!existsSync(migration)) failures.push('V215_VEHICLE_SLUG_MIGRATION_MISSING');
else {
  const sql = readFileSync(migration, 'utf8').toLowerCase();
  for (const marker of ['seo_slug', 'before insert or update', 'public.vehicles', 'unique']) {
    if (!sql.includes(marker)) failures.push(`V215_VEHICLE_SLUG_MIGRATION_MARKER ${marker}`);
  }
  if (sql.indexOf('create trigger vehicles_seo_slug_guard_v215') > sql.indexOf('update public.vehicles')) failures.push('V215_SLUG_TRIGGER_MUST_PRECEDE_BACKFILL');
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (!String(packageJson.scripts?.['content-flow:v215'] || '').includes('check-v215-content-flow-integrity.mjs')) failures.push('PACKAGE_MISSING_V215_CONTENT_FLOW');
if (!String(packageJson.scripts?.['verify:handoff'] || '').includes('content-flow:v215')) failures.push('HANDOFF_MISSING_V215_CONTENT_FLOW');

if (failures.length) {
  const unique = [...new Set(failures)].sort();
  console.error(`V215 content flow integrity: FAIL (${unique.length})`);
  for (const failure of unique) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V215 content flow integrity: PASS');
