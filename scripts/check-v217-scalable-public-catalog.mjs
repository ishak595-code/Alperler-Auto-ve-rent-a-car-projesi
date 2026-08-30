import fs from 'node:fs';

const mustExist=[
  'src/services/scalable-public-catalog-v217.service.ts',
  'src/services/public-faq-v217.service.ts',
  'src/pages/rental-catalog-v217.component.ts',
  'src/pages/sale-catalog-v217.component.ts',
  'src/pages/tour-catalog-v217.component.ts',
  'src/pages/blog-catalog-v217.component.ts',
  'supabase/migrations/20260830124500_v217_scalable_public_catalog_views.sql',
  'supabase/migrations/20260830125500_v217_public_catalog_facets.sql',
];
for(const file of mustExist){if(!fs.existsSync(file))throw new Error(`V217_REQUIRED_FILE_MISSING:${file}`);}

const bounded=[
  'src/pages/fleet.component.ts',
  'src/pages/sales-results.component.ts',
  'src/pages/tours.component.ts',
  'src/pages/blog-list.component.ts',
  'src/services/homepage-layout.service.ts',
  'src/components/dynamic-home-section.component.ts',
  'src/pages/rental-catalog-v217.component.ts',
  'src/pages/sale-catalog-v217.component.ts',
  'src/pages/tour-catalog-v217.component.ts',
  'src/pages/blog-catalog-v217.component.ts',
  'src/services/public-content-refresh-coordinator.service.ts',
];
const forbidden=['refreshCloudCatalog(','ensureVehicleCloudInventory(','getCars()','getSaleCars()','getTours()','getBlogPosts()'];
for(const file of bounded){const text=fs.readFileSync(file,'utf8');for(const token of forbidden){if(text.includes(token))throw new Error(`V217_FULL_CATALOG_REGRESSION:${file}:${token}`);}}

const service=fs.readFileSync('src/services/scalable-public-catalog-v217.service.ts','utf8');
for(const token of ['public_vehicle_catalog_v217','public_tour_catalog_v217','public_blog_catalog_v217','public_vehicle_facets_v217','public_tour_facets_v217']){if(!service.includes(token))throw new Error(`V217_SERVICE_CONTRACT_MISSING:${token}`);}
if(!/private\s+pageSize\(v:unknown\)\{return\s+this\.limit\(Number\(v\)\|\|24,8,48\);\}/.test(service))throw new Error('V217_PAGE_SIZE_BOUND_MISSING');
if(!/private\s+pageParams\([^)]*\)\{[^}]*size\+1[^}]*page\*size/.test(service))throw new Error('V217_PAGINATION_BOUNDARY_MISSING');

const homepage=fs.readFileSync('src/services/homepage-layout.service.ts','utf8');
if(!homepage.includes('vehiclesByIdentifiers')||!homepage.includes('blogsByIdentifiers')||!homepage.includes('toursByIdentifiers'))throw new Error('V217_HOMEPAGE_TARGETED_FETCH_MISSING');

const coordinator=fs.readFileSync('src/services/public-content-refresh-coordinator.service.ts','utf8');
for(const token of ['CampaignService','key: "catalog"','key: "campaigns"','refreshCloudCatalog(']){if(coordinator.includes(token))throw new Error(`V217_GLOBAL_HYDRATION_REGRESSION:${token}`);}

const campaign=fs.readFileSync('src/services/campaign.service.ts','utf8');
for(const token of ['public_campaign_catalog_v217','PUBLIC_CAMPAIGN_LIST_LIMIT = 48','PUBLIC_CAMPAIGN_TARGET_LIMIT = 12','loadPublicForTarget(','currentRouteTarget()']){if(!campaign.includes(token))throw new Error(`V217_CAMPAIGN_BOUND_MISSING:${token}`);}
if(/fetch\(`\$\{SUPABASE_PROJECT_URL\}\/rest\/v1\/campaigns\?is_active=eq\.true/.test(campaign))throw new Error('V217_PUBLIC_CAMPAIGN_BASE_TABLE_REGRESSION');

const faqService=fs.readFileSync('src/services/public-faq-v217.service.ts','utf8');
for(const token of ['limit: String(safeLimit)','Math.min(100','method: "GET"']){if(!faqService.includes(token))throw new Error(`V217_FAQ_BOUND_MISSING:${token}`);}
for(const token of ['POST','PATCH','DELETE','saveFaq','addFaq']){if(faqService.includes(token))throw new Error(`V217_FAQ_READ_ONLY_REGRESSION:${token}`);}
const faqPage=fs.readFileSync('src/pages/faq.component.ts','utf8');
if(!faqPage.includes('PublicFaqV217Service'))throw new Error('V217_FAQ_OWNER_MISSING');
for(const token of ['CarService','addFaq(','saveFaq(']){if(faqPage.includes(token))throw new Error(`V217_FAQ_MUTATION_REGRESSION:${token}`);}
if(!faqPage.includes('openIds = signal'))throw new Error('V217_FAQ_LOCAL_UI_STATE_MISSING');

const systemHealth=fs.readFileSync('src/services/system-health.service.ts','utf8');
for(const token of ['SUPABASE_PROJECT_URL','storefrontProbes','checkPublicStorefront','/rest/v1/vehicles','/rest/v1/tours','/rest/v1/campaigns','/rest/v1/homepage_sections','/rest/v1/homepage_placements','/rest/v1/branches']){
  if(systemHealth.includes(token))throw new Error(`V217_CUSTOMER_SYNTHETIC_HEALTH_REGRESSION:${token}`);
}
for(const token of ['supabaseFunctionUrl("system-event")','unhandledrejection','RESOURCE_${resource.toUpperCase()}_FAILED']){
  if(!systemHealth.includes(token))throw new Error(`V217_CLIENT_OBSERVABILITY_MISSING:${token}`);
}

const migration=fs.readFileSync('supabase/migrations/20260830124500_v217_scalable_public_catalog_views.sql','utf8');
if((migration.match(/security_invoker = true/g)||[]).length<5)throw new Error('V217_SECURITY_INVOKER_VIEWS_MISSING');

console.log('V217 scalable public catalog contract passed with bounded runtime ownership, targeted campaigns, read-only FAQ and client-safe observability.');
