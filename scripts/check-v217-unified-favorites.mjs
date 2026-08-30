import fs from 'node:fs';
const required=['src/services/customer-favorites-v217.service.ts','src/pages/favorites-v217.component.ts','src/components/account-favorites-v213.component.ts','src/pages/tour-catalog-v217.component.ts','src/pages/blog-catalog-v217.component.ts'];
for(const file of required){if(!fs.existsSync(file))throw new Error(`V217_FAVORITES_FILE_MISSING:${file}`);}
const service=fs.readFileSync('src/services/customer-favorites-v217.service.ts','utf8');for(const token of ["'VEHICLE' | 'TOUR' | 'BLOG'",'customer_favorites','listPage(','hydrateVisible(','on_conflict=user_id,entity_type,entity_id','resolution=ignore-duplicates','db_favoriteCars'])if(!service.includes(token))throw new Error(`V217_FAVORITES_SERVICE_CONTRACT_MISSING:${token}`);
if(service.includes('resolution=merge-duplicates'))throw new Error('V217_FAVORITES_MUST_NOT_REQUIRE_UPDATE_RLS');
if(!service.includes('Math.min(48'))throw new Error('V217_FAVORITES_PAGE_BOUND_MISSING');
const page=fs.readFileSync('src/pages/favorites-v217.component.ts','utf8');for(const token of ["label:'Araçlar'","label:'Turlar'","label:'Blog'",'vehiclesByIdentifiers','toursByIdentifiers','blogsByIdentifiers','Daha Fazla Favori Göster'])if(!page.includes(token))throw new Error(`V217_FAVORITES_PAGE_CONTRACT_MISSING:${token}`);
const account=fs.readFileSync('src/components/account-favorites-v213.component.ts','utf8');for(const forbidden of ['CarService','getCars()','getSaleCars()','getTours()','getBlogPosts()'])if(account.includes(forbidden))throw new Error(`V217_ACCOUNT_FAVORITES_FULL_CATALOG_REGRESSION:${forbidden}`);
for(const [file,type] of [['src/pages/tour-catalog-v217.component.ts','TOUR'],['src/pages/blog-catalog-v217.component.ts','BLOG']]){const text=fs.readFileSync(file,'utf8');for(const token of [`toggle('${type}'`,`hydrateVisible('${type}'`,'aria-pressed'])if(!text.includes(token))throw new Error(`V217_${type}_FAVORITE_UI_MISSING:${token}`);}
const fleet=fs.readFileSync('src/pages/fleet.component.ts','utf8');if(!fleet.includes('FavoritesV217Component')||!fleet.includes('favs'))throw new Error('V217_UNIFIED_FAVORITES_ROUTE_MISSING');
console.log('V217 unified favorites contract passed.');
