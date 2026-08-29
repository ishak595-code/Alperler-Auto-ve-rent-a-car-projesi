import fs from 'node:fs';

const fail = (message) => {
  console.error(`V210_PRESTIGE_CONVERSION_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, 'utf8');

const layout = read('src/services/homepage-layout.service.ts');
const catalog = read('src/services/catalog.service.ts');
const dock = read('src/components/customer-mobile-dock.component.ts');
const app = read('src/app.component.ts');
const adminHomepage = read('src/pages/admin/admin-homepage.component.ts');
const adminNavigation = read('src/pages/admin/admin-navigation.component.ts');
const migration = read('supabase/migrations/20260829083507_v210_prestige_conversion.sql');
const pkg = JSON.parse(read('package.json'));

if (!catalog.includes('order=published_at.desc')) fail('canonical blog source is not newest-first');
if (!layout.includes("selectionMode") || !layout.includes("selectionMode === 'LATEST'") || !layout.includes('return [];')) {
  fail('homepage layout does not protect automatic LATEST sections from stale manual placements');
}
if (!migration.includes("'selectionMode', 'LATEST'") || !/max_items\s*=\s*3/i.test(migration)) fail('blog_featured is not migrated to automatic latest-three mode');

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

if (!process.exitCode) console.log('V210 prestige conversion contract passed: newest-three blog selection, canonical primary mobile booking action, and database-managed closing CTA are enforced.');
