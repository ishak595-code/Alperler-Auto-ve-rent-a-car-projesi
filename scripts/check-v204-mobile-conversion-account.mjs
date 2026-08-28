import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const must = (source, token, message) => { if (!source.includes(token)) throw new Error(message || `V204 contract missing: ${token}`); };
const mustNot = (source, token, message) => { if (source.includes(token)) throw new Error(message || `V204 forbidden contract: ${token}`); };
const requireFile = (file) => { if (!fs.existsSync(file)) throw new Error(`V204 required file missing: ${file}`); };

const required = [
  'src/services/mobile-dock-route-policy.ts',
  'src/components/customer-mobile-dock.component.ts',
  'src/pages/home-v71.component.ts',
  'src/components/dynamic-home-section.component.ts',
  'src/pages/campaigns.component.ts',
  'src/pages/account-dashboard-v150.component.ts',
  'src/pages/admin/admin-homepage.component.ts',
  'src/pages/admin/admin-campaigns-v167.component.ts',
  'src/premium-responsive.css',
  'supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql',
  'supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql',
];
required.forEach(requireFile);

const policy = read('src/services/mobile-dock-route-policy.ts');
for (const token of ['shouldRenderMobileDock','isDockItemCurrent',"'/booking-checkout'",'/^\\/fleet\\/[^/]+$/','/^\\/sales\\/[^/]+$/','/^\\/tour\\/[^/]+$/']) must(policy, token);

const dock = read('src/components/customer-mobile-dock.component.ts');
for (const token of ['shouldRenderMobileDock','isDockItemCurrent','aria-current','onDockClick','window.scrollTo','navigation.mobileDockAutoHideEnabled()']) must(dock, token);
mustNot(dock, 'const shouldHide = path !== "/"', 'Mobile dock must not disappear on every non-home route.');
mustNot(dock, 'RouterLinkActive', 'Dock active state must use one canonical route policy.');

const responsive = read('src/premium-responsive.css');
for (const token of ['V204 canonical mobile home conversion geometry','app-home-v71 .hero-stage','app-home-v71 .trust-row','app-home-v71 .planner','app-home-v71 .field-grid','app-account-dashboard-v150']) must(responsive, token);
mustNot(responsive, 'app-list-your-car-v2', 'Deleted V2 valuation selector returned to canonical responsive CSS.');

const account = read('src/pages/account-dashboard-v150.component.ts');
for (const token of ['profileOpen','profileForm','saveProfile()','routerLink="/account/wallet"','bookingFilter','filteredBookings','expandedBooking','toggleBooking','selectFilter','Cüzdan ve Belgeler','Profil Ayarları']) must(account, token);

const proofMigration = read('supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql');
for (const token of ["ve.event_type = 'page_view'","'[?&]campaign=' || c.id::text || '(&|$)'",'count(distinct ve.visitor_id)','active_viewers_15m']) must(proofMigration, token);
mustNot(proofMigration, 've.path = c.cta_url', 'Campaign proof must not depend on nullable CTA URL.');

const defaultsMigration = read('supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql');
for (const token of ['mobile_dock_auto_hide = false',"when 'fleet' then 'Kiralık'","when 'sales' then 'Satılık'",'["service","duration","date","pickup"]','plannerVariant',"when 'campaigns'",'Kaçırmadan İncele']) must(defaultsMigration, token);

const campaigns = read('src/pages/campaigns.component.ts');
const homeSections = read('src/components/dynamic-home-section.component.ts');
for (const token of ['proofLabel','countdown','activeViewers15m','recentViewers24h','campaign=']) must(campaigns, token);
for (const token of ['campaignProofLabel','campaignCountdown','publicCampaigns()','campaign=']) must(homeSections, token);

const campaignAdmin = read('src/pages/admin/admin-campaigns-v167.component.ts');
for (const token of ['startsAt','endsAt','maxRedemptions','perCustomerLimit','remove(c)','saveAs','targetType','targetId']) must(campaignAdmin, token);
const homepageAdmin = read('src/pages/admin/admin-homepage.component.ts');
for (const token of ['saveTopArea','plannerFieldOrder','plannerVariant','saveSection','deleteSection','moveSection']) must(homepageAdmin, token);

console.log('V204 mobile conversion/account integrity: PASS');
