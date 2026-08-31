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
  'src/mobile-target-fixes.css',
  'supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql',
  'supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql',
  'playwright.v204.config.ts',
  'tests/v204/mobile-dock.spec.ts',
];
required.forEach(requireFile);

const policy = read('src/services/mobile-dock-route-policy.ts');
for (const token of ['shouldRenderMobileDock','isDockItemCurrent',"'/booking-checkout'",'/^\\/fleet\\/[^/]+$/','/^\\/sales\\/[^/]+$/','/^\\/tour\\/[^/]+$/']) must(policy, token);
mustNot(policy, 'path !== "/"', 'Dock route policy must never hide every non-home customer route.');

const dock = read('src/components/customer-mobile-dock.component.ts');
for (const token of [
  'shouldRenderMobileDock',
  'isDockItemCurrent',
  'aria-current',
  'NavigationEnd',
  'updateVisibility',
  'setMobileDockRouteHidden',
  'this.setAutoHidden(false)',
  '[routerLink]="item.route"',
  '[attr.aria-label]="item.label"',
  'track item.id',
  'navigation.mobileDockAutoHideEnabled()',
  'window.requestAnimationFrame',
  'Math.abs(delta) < 12',
  'dock-auto-hidden',
  'this.setAutoHidden(delta > 0 && currentY > 120)',
  '[attr.aria-hidden]="autoHidden() ? \'true\' : null"',
  '[attr.inert]="autoHidden() ? \'\' : null"',
  'visibility:hidden',
  'releaseDockFocus()',
  'isPhoneDockViewport()',
  'window.matchMedia',
]) must(dock, token);
for (const token of [
  'onDockClick',
  'NavigationStart',
  'Scroll as RouterScroll',
  'navigationScrollSettling',
  'beginRouteNavigation()',
  'finishRouteNavigationAfterScroll()',
  'event.preventDefault();',
  'window.scrollTo',
  'dock-hidden',
  'HostListener',
  'backdrop-filter:blur',
  '-webkit-backdrop-filter:blur',
]) mustNot(dock, token, `Obsolete, inaccessible or scroll-heavy mobile dock behavior returned: ${token}`);
mustNot(dock, 'const shouldHide = path !== "/"', 'Mobile dock must not disappear on every non-home route.');
mustNot(dock, 'RouterLinkActive', 'Dock active state must use one canonical route policy.');

const responsive = read('src/premium-responsive.css');
for (const token of ['V204 canonical mobile home conversion geometry','app-home-v71 .hero-stage','app-home-v71 .trust-row','app-home-v71 .planner','app-home-v71 .field-grid','app-account-dashboard-v150']) must(responsive, token);
mustNot(responsive, 'app-list-your-car-v2', 'Deleted V2 valuation selector returned to canonical responsive CSS.');

const mobileFixes = read('src/mobile-target-fixes.css');
for (const token of ['app-home-v71 > main','app-fleet app-rental-catalog-v217 > main','app-fleet app-favorites-v217 > main','app-sales-results app-sale-catalog-v217 > main','app-tours app-tour-catalog-v217 > main','app-blog-list app-blog-catalog-v217 > main','app-campaigns > main','app-search > main','app-account-shell app-account-dashboard-v150 > main','app-customer-footer-v70 .customer-footer']) must(mobileFixes, token, `Canonical mobile dock safe-area owner missing: ${token}`);
for (const token of ['app-fleet app-rental-showcase-v167 > main','app-sales-results app-sales-showcase-v168 > main','app-tours app-tour-showcase-v170 > main']) mustNot(mobileFixes, token, `Retired full-catalog safe-area selector remains active: ${token}`);
mustNot(mobileFixes, 'app-home-v39', 'Deleted V39 homepage selector must not remain in the active CSS chain.');
mustNot(mobileFixes, 'app-home section[aria-labelledby="campaigns-title"]', 'Deleted V62 homepage campaign selector must not remain in the active CSS chain.');

const runtimeTest = read('tests/v204/mobile-dock.spec.ts');
for (const token of ['"/fleet"', '"/sales"', '"/search"', '"/campaigns"', '"/account"', 'window.scrollTo', 'window.scrollBy', 'page.goBack()', 'aria-hidden', 'inert', 'aria-current', 'dock-auto-hidden', 'not.toBeFocused()']) must(runtimeTest, token, `Android dock accessibility/auto-hide regression missing behavior: ${token}`);
must(runtimeTest, "await expect(dock.locator('a[href=\"/appointment\"]')).toHaveCount(0);", 'Runtime regression must explicitly prove that Randevu is absent from the customer dock.');
const runtimeConfig = read('playwright.v204.config.ts');
for (const token of ['SM-S928B','isMobile: true','hasTouch: true','width: 412','height: 915']) must(runtimeConfig, token, `Android runtime profile missing contract: ${token}`);

const account = read('src/pages/account-dashboard-v150.component.ts');
for (const token of ['profileOpen','profileForm','saveProfile()','routerLink="/account/wallet"','bookingFilter','filteredBookings','expandedBooking','toggleBooking','selectFilter','Cüzdan ve Belgeler','Profil Ayarları']) must(account, token);

const proofMigration = read('supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql');
for (const token of ["ve.event_type = 'page_view'","'[?&]campaign=' || c.id::text || '(&|$)'",'count(distinct ve.visitor_id)','active_viewers_15m']) must(proofMigration, token);
mustNot(proofMigration, 've.path = c.cta_url', 'Campaign proof must not depend on nullable CTA URL.');

const defaultsMigration = read('supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql');
for (const token of ["when 'fleet' then 'Kiralık'","when 'sales' then 'Satılık'",'["service","duration","date","pickup"]','plannerVariant',"when 'campaigns'",'Kaçırmadan İncele']) must(defaultsMigration, token);

const campaigns = read('src/pages/campaigns.component.ts');
const homeSections = read('src/components/dynamic-home-section.component.ts');
for (const token of ['proofLabel','countdown','activeViewers15m','recentViewers24h','campaign=']) must(campaigns, token);
for (const token of ['campaignProofLabel','campaignCountdown','this.layout.campaignsFor','this.campaignsService.proofByCampaign','campaign=']) must(homeSections, token);
mustNot(homeSections, 'publicCampaigns()', 'Homepage campaign renderer must not restore full campaign hydration.');

const campaignAdmin = read('src/pages/admin/admin-campaigns-v167.component.ts');
for (const token of ['startsAt','endsAt','maxRedemptions','perCustomerLimit','remove(c)','saveAs','targetType','targetId']) must(campaignAdmin, token);
const homepageAdmin = read('src/pages/admin/admin-homepage.component.ts');
for (const token of ['saveTopArea','plannerFieldOrder','plannerVariant','saveSection','deleteSection','moveSection']) must(homepageAdmin, token);

console.log('V204 mobile conversion/account integrity: PASS');
