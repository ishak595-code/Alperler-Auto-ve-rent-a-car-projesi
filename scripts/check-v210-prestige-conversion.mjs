import fs from 'node:fs';

const fail = (message) => {
  console.error(`V210_PRESTIGE_CONVERSION_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, 'utf8');
const readOptional = (path) => fs.existsSync(path) ? read(path) : '';

const layout = read('src/services/homepage-layout.service.ts');
const catalog = read('src/services/catalog.service.ts');
const dock = read('src/components/customer-mobile-dock.component.ts');
const app = read('src/app.component.ts');
const adminHomepage = read('src/pages/admin/admin-homepage.component.ts');
const adminNavigation = read('src/pages/admin/admin-navigation.component.ts');
const migration = read('supabase/migrations/20260829083507_v210_prestige_conversion.sql');
const v213Migration = readOptional('supabase/migrations/20260829210000_v213_prestige_discovery_personalization.sql');
const pkg = JSON.parse(read('package.json'));
const compactLayout = layout.replace(/\s+/g, '');

if (!catalog.includes('order=published_at.desc')) fail('canonical historical blog source is not newest-first');
if (!layout.includes('selectionMode') || !compactLayout.includes("mode==='LATEST'")) {
  fail('homepage layout does not preserve explicit LATEST mode semantics');
}
// V217 supersedes the old in-memory LATEST branch with bounded server-owned catalogue reads.
for (const token of [
  "this.catalog.listVehicles({category,page:0,pageSize:limit",
  "this.catalog.listTours({page:0,pageSize:limit",
  "this.catalog.listBlogs({page:0,pageSize:limit",
  'this.catalog.latestCampaigns(limit)',
]) {
  if (!compactLayout.includes(token.replace(/\s+/g, ''))) fail(`LATEST mode is not bounded by the scalable catalogue owner: ${token}`);
}
for (const forbidden of ['this.cars.getCars()', 'this.cars.getSaleCars()', 'this.cars.getTours()', 'this.cars.getBlogPosts()']) {
  if (layout.includes(forbidden)) fail(`homepage layout must not restore full-catalog hydration: ${forbidden}`);
}

// V210 historically established blog_featured as automatic newest-three. V213 intentionally
// supersedes the active business rule by making content showcases admin-curated PLACEMENT sections.
// Preserve the historical V210 migration invariant, and require any V213 supersession to be explicit.
if (!migration.includes("'selectionMode', 'LATEST'") || !/max_items\s*=\s*3/i.test(migration)) {
  fail('historical V210 blog_featured newest-three migration contract is missing');
}
if (v213Migration) {
  if (!v213Migration.includes("section_type in ('VEHICLES', 'TOURS', 'BLOG', 'CAMPAIGN')") || !v213Migration.includes("'{selectionMode}', '\"PLACEMENT\"'::jsonb")) {
    fail('V213 supersession must explicitly migrate active content showcases to PLACEMENT mode');
  }
}

if (!app.includes('<app-customer-mobile-dock')) fail('canonical customer mobile dock is not mounted in AppComponent');
if (!dock.includes('[class.dock-primary]="isPrimary(item)"')) fail('mobile dock has no database-aware primary action style');
if (!dock.includes('item.itemKey === "appointment"') || !dock.includes('item.metadata?.["primary"] === true')) fail('appointment/primary metadata cannot select the dock conversion action');
if (!migration.includes("item_key = 'appointment'") || !migration.includes("route = '/appointment'") || !migration.includes("'{\"primary\":true}'::jsonb")) fail('production dock migration does not establish the primary appointment action');
if (/INSERT\s+INTO\s+public\.navigation_settings/i.test(migration)) fail('V210 must not create a parallel navigation settings owner');

for (const capability of ['coverImage', 'backgroundImage', 'ctaLabel', 'ctaUrl']) {
  if (!adminHomepage.includes(capability)) fail(`homepage admin cannot manage closing CTA capability: ${capability}`);
}
if (!adminNavigation.includes('NavigationConfigService') || !adminNavigation.includes('saveItem(item)')) fail('mobile dock remains outside canonical admin navigation management');
if (!migration.includes("'closing_cta'") || !migration.includes("'renderer', 'PROMO'") || !migration.includes("'width', 'full'") || !migration.includes("'ctaUrl', '/appointment'")) fail('closing conversion CTA is not a canonical database-backed PROMO section');
if (!migration.includes('/storage/v1/object/public/catalog-media/')) fail('closing CTA does not use an owned public catalog-media asset');

if (pkg.scripts?.['prestige-conversion:v210'] !== 'node scripts/check-v210-prestige-conversion.mjs') fail('package script prestige-conversion:v210 is missing');
if (!String(pkg.scripts?.['verify:handoff'] || '').includes('prestige-conversion:v210')) fail('V210 contract is not wired into verify:handoff');

if (!process.exitCode) console.log('V210 prestige conversion contract passed: historical newest-three migration remains auditable, V217 preserves bounded LATEST semantics, and V213 may supersede active showcase selection through an explicit PLACEMENT migration.');
