import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { throw new Error(`V213 invariant failed: ${message}`); };
const requireText = (source, needle, message) => { if (!source.includes(needle)) fail(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) fail(message); };
const requireOccurrences = (source, needle, minimum, message) => {
  const count = source.split(needle).length - 1;
  if (count < minimum) fail(`${message} (found ${count}, expected at least ${minimum})`);
};
const compact = (source) => source.replace(/\s+/g, '');

const home = read('src/pages/home-v71.component.ts');
const layout = read('src/services/homepage-layout.service.ts');
const layoutCompact = compact(layout);
const dynamicSection = read('src/components/dynamic-home-section.component.ts');
const admin = read('src/services/homepage-admin.service.ts');
const searchPage = read('src/pages/search.component.ts');
const searchService = read('src/services/global-search.service.ts');
const favorites = read('src/services/customer-favorites-v217.service.ts');
const favoritesCompact = compact(favorites);
const account = read('src/pages/account-shell.component.ts');
const accountFavorites = read('src/components/account-favorites-v213.component.ts');
const app = read('src/app.component.ts');
const mobileCss = read('src/mobile-target-fixes.css');
const migration = read('supabase/migrations/20260829210000_v213_prestige_discovery_personalization.sql');
const dbContract = read('supabase/tests/v213_prestige_discovery_contract.sql');
const packageJson = JSON.parse(read('package.json'));

// Desktop search remains the existing Hero owner. Do not duplicate it.
const heroSearchIds = home.match(/id=\"home-search-v80\"/g) || [];
if (heroSearchIds.length !== 1) fail(`expected exactly one canonical Hero search input, found ${heroSearchIds.length}`);
requireText(home, 'this.router.navigate(["/search"],{queryParams:q?{q}:undefined})', 'Hero search must hand off q to /search');

// V217 keeps V213 discovery semantics but moves execution to one bounded indexed server-side RPC.
requireText(searchPage, 'GlobalSearchService', 'search page must use GlobalSearchService');
requireText(searchPage, "params.get('q')", 'search page must hydrate the Hero q query parameter');
requireText(searchPage, 'this.search.searchPage(', 'search page must use bounded server-side search pages');
requireText(searchPage, 'async loadMore()', 'search page must retain explicit incremental loading');
forbidText(searchPage, 'CarService', 'search page must not regain vehicle-only or full-catalog ownership');
for (const kind of ['RENTAL','SALE','TOUR','CAMPAIGN','BLOG','BRANCH','FAQ','SECTION','PAGE']) {
  requireText(searchService, `'${kind}'`, `global search must include ${kind}`);
}
requireText(searchService, 'public_global_search_v217', 'global search must use the indexed V217 RPC');
requireText(searchService, 'p_limit: requestSize', 'global search must enforce a bounded page size');
requireText(searchService, 'p_offset:', 'global search must use server-side pagination');
requireText(searchService, 'const requestSize = pageSize + 1', 'global search must use one-row lookahead for hasMore');
requireText(searchService, 'safeInternalRoute', 'global search must reject unsafe result routes');
for (const forbidden of ['CarService', 'ensureVehicleCloudInventory(', 'refreshCloudCatalog(', 'getCars()', 'getSaleCars()', 'getTours()', 'getBlogPosts()']) {
  forbidText(searchService, forbidden, `global search must not restore full-catalog hydration: ${forbidden}`);
}

// PLACEMENT sections remain manual truth, but V217 resolves only their selected identifiers.
requireText(layoutCompact, "typeHomepageSelectionMode='PLACEMENT'|'LATEST';", 'homepage selection modes must remain explicit');
requireText(layoutCompact, "if(mode==='PLACEMENT')", 'manual homepage sections must remain placement-driven');
for (const token of ['vehiclesByIdentifiers(', 'toursByIdentifiers(', 'blogsByIdentifiers(', 'campaignsByIdentifiers(']) {
  requireText(layout, token, `manual homepage sections must resolve selected identifiers only: ${token}`);
}
requireText(layout, 'validPlacementIds', 'stale manual placements must be excluded from the effective placement set');
requireText(layoutCompact, 'constvalidPlacements=rawPlacements.filter', 'only resolved placements may remain public');
requireText(layoutCompact, 'selectionModeFor(key:string):HomepageSelectionMode', 'renderer must retain explicit selection-mode ownership');
for (const token of [
  'this.catalog.listVehicles({category,page:0,pageSize:limit',
  'this.catalog.listTours({page:0,pageSize:limit',
  'this.catalog.listBlogs({page:0,pageSize:limit',
  'this.catalog.latestCampaigns(limit)',
]) {
  requireText(layoutCompact, token, `LATEST homepage sections must stay bounded: ${token}`);
}
for (const token of ['vehiclesFor(this.section.sectionKey)', 'toursFor(this.section.sectionKey)', 'blogsFor(this.section.sectionKey)', 'campaignsFor(this.section.sectionKey)']) {
  requireText(dynamicSection, token, `renderer must consume the bounded homepage owner: ${token}`);
}
for (const forbidden of ['getCars()', 'getSaleCars()', 'getTours()', 'getBlogPosts()', 'publicCampaigns()']) {
  forbidText(dynamicSection, forbidden, `dynamic homepage must not restore a full-catalog source: ${forbidden}`);
}
requireText(admin, "settings.selectionMode='PLACEMENT'", 'new content showcases must default to manual placement mode');
requireText(admin, 'reconcileManualCounts', 'admin showcase count must reconcile from active placements');

// Mobile hierarchy moves the existing planner up but does not create another search surface.
requireText(mobileCss, 'app-home-v71 .planner', 'mobile hierarchy must explicitly position Quick Planning');
requireText(mobileCss, 'order: 1', 'Quick Planning must precede secondary trust badges on mobile');
requireText(mobileCss, 'app-home-v71 .trust-row', 'mobile hierarchy must retain trust badges after the planner');
forbidText(mobileCss, 'home-search-v80', 'mobile finishing CSS must not create or own a second Hero search input');

// V215 retires the custom customer consent popup. It must not reappear over the persistent mobile command dock.
if (fs.existsSync('src/components/analytics-consent.component.ts')) fail('retired custom analytics consent component must not return');
forbidText(app, 'AnalyticsConsentComponent', 'root shell must not import the retired custom consent popup');
forbidText(app, '<app-analytics-consent', 'root shell must not mount the retired custom consent popup');

// V217 unifies V213 favorites across vehicles, tours and blog while preserving guest migration and strict RLS ownership.
requireText(favoritesCompact, "'VEHICLE'|'TOUR'|'BLOG'", 'favorites must remain unified across all customer content domains');
requireText(favorites, 'customer_favorites', 'favorites must persist to customer_favorites');
requireOccurrences(favoritesCompact, 'user_id:`eq.${userId}`', 3, 'favorites visible reads, paged reads and deletes must include explicit owner filters');
requireOccurrences(favoritesCompact, 'entity_type:`eq.${type}`', 2, 'favorites targeted reads and deletes must include entity-type filters');
requireText(favoritesCompact, 'entity_id:`eq.${entityId}`', 'favorites deletes must include the exact entity-id filter');
requireText(favorites, 'Authorization: `Bearer ${token}`', 'favorites requests must use the signed-in customer bearer token');
requireText(favorites, "private readonly legacyVehicleKey = 'db_favoriteCars'", 'legacy guest vehicle favorites must be migrated by the canonical owner');
requireText(favorites, 'resolution=ignore-duplicates', 'guest migration must not require UPDATE RLS');
requireText(favorites, "String(this.auth.user()?.id || '') !== userId", 'favorites must reject stale responses after an auth-context change');
forbidText(favorites.toLowerCase(), 'service_role', 'favorites browser code must never use service_role');
forbidText(favorites, 'resolution=merge-duplicates', 'favorites must not regain UPDATE-dependent upserts');
requireText(account, 'app-account-favorites-v213', 'customer profile must render the unified favorites section');
requireText(accountFavorites, 'CustomerFavoritesV217Service', 'account favorites must use the unified favorites owner');
requireText(accountFavorites, 'ScalablePublicCatalogV217Service', 'account favorites must resolve only referenced entities');
requireText(accountFavorites, "listPage('ALL',0,6)", 'account preview must stay bounded to the latest six favorites');
for (const forbidden of ['CarService','getCars()','getSaleCars()','getTours()','getBlogPosts()']) {
  forbidText(accountFavorites, forbidden, `account favorites must not hydrate a full catalog: ${forbidden}`);
}

// Database contract: manual showcases, mobile search and least-privilege account favorites.
requireText(migration, "section_type in ('VEHICLES', 'TOURS', 'BLOG', 'CAMPAIGN')", 'migration must canonicalize all content showcase types');
requireText(migration, "'MOBILE_MENU', 'search', 'Ara', 'search', '/search'", 'migration must expose global search in the mobile hamburger menu only');
requireText(migration, 'alter table public.customer_favorites enable row level security', 'customer_favorites RLS must be enabled');
requireText(migration, 'revoke all privileges on table public.customer_favorites from public, anon, authenticated', 'favorites table must start from explicit privilege denial');
requireText(migration, 'grant select, insert, delete on table public.customer_favorites to authenticated', 'authenticated favorites privileges must be minimal');
forbidText(migration.toLowerCase(), 'security definer', 'V213 migration must not add SECURITY DEFINER');
requireText(dbContract, "has_table_privilege('anon', 'public.customer_favorites'", 'database contract must test anon denial');
requireText(dbContract, 'non_manual_content_count', 'database contract must test placement-driven homepage content');
requireText(dbContract, 'mobile_search_count', 'database contract must test the mobile search entry');

if (packageJson.scripts?.['prestige-discovery:v213'] !== 'node scripts/check-v213-prestige-discovery-personalization.mjs') {
  fail('package.json must expose prestige-discovery:v213');
}
if (!String(packageJson.scripts?.['verify:handoff'] || '').includes('prestige-discovery:v213')) {
  fail('verify:handoff must include the V213 permanent invariant');
}

console.log('V213 prestige discovery + V217 bounded personalization invariant: PASS');
