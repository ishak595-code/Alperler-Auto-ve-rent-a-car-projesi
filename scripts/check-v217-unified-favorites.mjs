import fs from 'node:fs';

const required = [
  'src/services/customer-favorites-v217.service.ts',
  'src/services/car.service.ts',
  'src/pages/favorites-v217.component.ts',
  'src/components/account-favorites-v213.component.ts',
  'src/pages/tour-catalog-v217.component.ts',
  'src/pages/blog-catalog-v217.component.ts',
  'src/components/main-layout.component.ts',
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`V217_FAVORITES_FILE_MISSING:${file}`);
}
if (fs.existsSync('src/services/customer-favorites-sync.service.ts')) {
  throw new Error('V217_LEGACY_FAVORITES_SYNC_OWNER_MUST_NOT_EXIST');
}

const service = fs.readFileSync('src/services/customer-favorites-v217.service.ts', 'utf8');
for (const token of [
  "'VEHICLE' | 'TOUR' | 'BLOG'",
  'customer_favorites',
  'listPage(',
  'hydrateVisible(',
  'contextKey()',
  'favoriteCount(',
  'on_conflict=user_id,entity_type,entity_id',
  'resolution=ignore-duplicates',
  'db_favoriteCars',
  'localStorage.removeItem(this.legacyVehicleKey)',
  'this.state.set(new Set())',
  'this.syncGuestFavorites(token, userId)',
]) {
  if (!service.includes(token)) throw new Error(`V217_FAVORITES_SERVICE_CONTRACT_MISSING:${token}`);
}
if (service.includes('resolution=merge-duplicates')) throw new Error('V217_FAVORITES_MUST_NOT_REQUIRE_UPDATE_RLS');
if (!service.includes('Math.min(48')) throw new Error('V217_FAVORITES_PAGE_BOUND_MISSING');

const car = fs.readFileSync('src/services/car.service.ts', 'utf8');
for (const token of [
  'CustomerFavoritesV217Service',
  'this.customerFavorites.toggle("VEHICLE"',
  'this.customerFavorites.hydrateVisible("VEHICLE"',
  'this.customerFavorites.isFavorite("VEHICLE"',
  'getFavoriteCount = computed(() => this.customerFavorites.favoriteCount("VEHICLE"))',
]) {
  if (!car.includes(token)) throw new Error(`V217_VEHICLE_FAVORITE_ADAPTER_MISSING:${token}`);
}
for (const forbidden of ['_favoriteCars', 'db_favoriteCars', 'installDevicePreferencePersistence(', 'loadDevicePreferences(']) {
  if (car.includes(forbidden)) throw new Error(`V217_CAR_SERVICE_PARALLEL_FAVORITE_OWNER:${forbidden}`);
}

const mainLayout = fs.readFileSync('src/components/main-layout.component.ts', 'utf8');
for (const forbidden of ['CustomerFavoritesSyncService', 'customer-favorites-sync.service']) {
  if (mainLayout.includes(forbidden)) throw new Error(`V217_MAIN_LAYOUT_LEGACY_FAVORITES_SYNC:${forbidden}`);
}

const page = fs.readFileSync('src/pages/favorites-v217.component.ts', 'utf8');
for (const token of [
  "label:'Araçlar'",
  "label:'Turlar'",
  "label:'Blog'",
  'vehiclesByIdentifiers',
  'toursByIdentifiers',
  'blogsByIdentifiers',
  'Daha Fazla Favori Göster',
]) {
  if (!page.includes(token)) throw new Error(`V217_FAVORITES_PAGE_CONTRACT_MISSING:${token}`);
}

const account = fs.readFileSync('src/components/account-favorites-v213.component.ts', 'utf8');
for (const forbidden of ['CarService', 'getCars()', 'getSaleCars()', 'getTours()', 'getBlogPosts()']) {
  if (account.includes(forbidden)) throw new Error(`V217_ACCOUNT_FAVORITES_FULL_CATALOG_REGRESSION:${forbidden}`);
}

for (const [file, type] of [
  ['src/pages/tour-catalog-v217.component.ts', 'TOUR'],
  ['src/pages/blog-catalog-v217.component.ts', 'BLOG'],
]) {
  const text = fs.readFileSync(file, 'utf8');
  for (const token of [`toggle('${type}'`, `hydrateVisible('${type}'`, 'aria-pressed']) {
    if (!text.includes(token)) throw new Error(`V217_${type}_FAVORITE_UI_MISSING:${token}`);
  }
}

const fleet = fs.readFileSync('src/pages/fleet.component.ts', 'utf8');
if (!fleet.includes('FavoritesV217Component') || !fleet.includes('favs')) {
  throw new Error('V217_UNIFIED_FAVORITES_ROUTE_MISSING');
}

console.log('V217 unified favorites contract passed: one canonical account-aware owner covers vehicle, tour and blog favorites, including navbar count compatibility, with bounded hydration and legacy migration only.');
