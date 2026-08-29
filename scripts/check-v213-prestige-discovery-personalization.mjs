import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { throw new Error(`V213 invariant failed: ${message}`); };
const requireText = (source, needle, message) => { if (!source.includes(needle)) fail(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) fail(message); };

const home = read('src/pages/home-v71.component.ts');
const layout = read('src/services/homepage-layout.service.ts');
const admin = read('src/services/homepage-admin.service.ts');
const searchPage = read('src/pages/search.component.ts');
const searchService = read('src/services/global-search.service.ts');
const favorites = read('src/services/customer-favorites-sync.service.ts');
const account = read('src/pages/account-shell.component.ts');
const accountFavorites = read('src/components/account-favorites-v213.component.ts');
const mainLayout = read('src/components/main-layout.component.ts');
const mobileCss = read('src/mobile-target-fixes.css');
const migration = read('supabase/migrations/20260829210000_v213_prestige_discovery_personalization.sql');
const dbContract = read('supabase/tests/v213_prestige_discovery_contract.sql');
const packageJson = JSON.parse(read('package.json'));

// Desktop search remains the existing Hero owner. Do not duplicate it.
const heroSearchIds = home.match(/id=\"home-search-v80\"/g) || [];
if (heroSearchIds.length !== 1) fail(`expected exactly one canonical Hero search input, found ${heroSearchIds.length}`);
requireText(home, 'this.router.navigate(["/search"],{queryParams:q?{q}:undefined})', 'Hero search must hand off q to /search');

// Global search owns public discovery, rather than a vehicle-only page implementation.
requireText(searchPage, 'GlobalSearchService', 'search page must use GlobalSearchService');
requireText(searchPage, "params.get('q')", 'search page must hydrate the Hero q query parameter');
forbidText(searchPage, 'CarService', 'search page must not regain vehicle-only data ownership');
for (const kind of ['RENTAL','SALE','TOUR','CAMPAIGN','BLOG','BRANCH','FAQ','SECTION','PAGE']) {
  requireText(searchService, `'${kind}'`, `global search must include ${kind}`);
}
requireText(searchService, 'this.cars.ensureVehicleCloudInventory()', 'global search must refresh canonical vehicle/tour/blog/FAQ data');
requireText(searchService, 'this.branches.refresh()', 'global search must refresh canonical branch data');
requireText(searchService, 'this.homepage.load()', 'global search must include live homepage sections');

// PLACEMENT sections are manual truth: selection count is the effective count and zero selections collapse.
requireText(layout, "type HomepageSelectionMode = 'PLACEMENT' | 'LATEST'", 'homepage selection modes must remain explicit');
requireText(layout, "maxItems: placementDriven ? Math.max(1, manualCount) : storedLimit", 'manual homepage count must derive from valid placements');
requireText(layout, 'if (row.placementDriven && row.manualCount === 0) return false', 'empty manual showcase must collapse instead of auto-filling');
requireText(layout, 'entityTypeMatchesSection', 'manual placements must be bound to their section domain');
requireText(layout, "category === 'SALE' ? this.cars.getSaleCars()() : this.cars.getCars()()", 'rental/sale manual placements must use category-specific sources');
requireText(admin, "settings.selectionMode='PLACEMENT'", 'new content showcases must default to manual placement mode');
requireText(admin, 'reconcileManualCounts', 'admin showcase count must reconcile from placements');

// Mobile hierarchy moves the existing planner up but does not create another search surface.
requireText(mobileCss, 'app-home-v71 .planner', 'mobile hierarchy must explicitly position Quick Planning');
requireText(mobileCss, 'order: 1', 'Quick Planning must precede secondary trust badges on mobile');
requireText(mobileCss, 'app-home-v71 .trust-row', 'mobile hierarchy must retain trust badges after the planner');
forbidText(mobileCss, 'home-search-v80', 'mobile finishing CSS must not create or own a second Hero search input');

// Favorites retain guest device behavior while authenticated state is synchronized through RLS.
requireText(favorites, 'customer_favorites', 'favorites sync must persist to customer_favorites');
requireText(favorites, 'user_id=eq.', 'favorites reads/deletes must include explicit owner filters');
requireText(favorites, 'authorization: `Bearer ${token}`', 'favorites sync must use the signed-in customer bearer token');
forbidText(favorites.toLowerCase(), 'service_role', 'favorites browser sync must never use service_role');
requireText(mainLayout, 'CustomerFavoritesSyncService', 'customer shell must start favorites synchronization');
requireText(account, 'app-account-favorites-v213', 'customer profile must render the unified favorites section');
requireText(accountFavorites, 'this.cars.getCars()', 'profile favorites must include rentals');
requireText(accountFavorites, 'this.cars.getSaleCars()', 'profile favorites must include sale vehicles');

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

console.log('V213 prestige discovery + personalization invariant: PASS');
