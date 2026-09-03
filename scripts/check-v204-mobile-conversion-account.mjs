import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const must = (source, token, message) => { if (!source.includes(token)) throw new Error(message || `V204 contract missing: ${token}`); };
const mustNot = (source, token, message) => { if (source.includes(token)) throw new Error(message || `V204 forbidden contract: ${token}`); };
const requireFile = (file) => { if (!fs.existsSync(file)) throw new Error(`V204 required file missing: ${file}`); };

const required = [
  'src/services/mobile-dock-route-policy.ts',
  'src/services/navigation-config.service.ts',
  'src/components/customer-mobile-dock.component.ts',
  'src/pages/home-v71.component.ts',
  'src/components/dynamic-home-section.component.ts',
  'src/pages/campaigns.component.ts',
  'src/pages/account-dashboard-v150.component.ts',
  'src/pages/account-shell.component.ts',
  'src/components/account-profile-settings-v225.component.ts',
  'src/components/account-referral-v238.component.ts',
  'src/pages/admin/admin-homepage.component.ts',
  'src/pages/admin/admin-campaigns-v167.component.ts',
  'src/premium-responsive.css',
  'src/mobile-target-fixes.css',
  'supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql',
  'supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql',
  'supabase/migrations/20260831150041_v220_mobile_dock_canonical.sql',
  'supabase/migrations/20260831161135_v221_mobile_dock_profile_canonical.sql',
  'playwright.v204.config.ts',
  'tests/v204/mobile-dock.spec.ts',
];
required.forEach(requireFile);

const policy = read('src/services/mobile-dock-route-policy.ts');
for (const token of ['shouldRenderMobileDock','isDockItemCurrent','cleanCustomerPath(rawUrl) === \'/\'']) must(policy, token, `Homepage-only dock policy missing: ${token}`);
for (const forbidden of ['MOBILE_DOCK_SUPPRESSED_EXACT','MOBILE_DOCK_SUPPRESSED_PREFIXES','MOBILE_DOCK_DETAIL_ROUTES']) mustNot(policy, forbidden, `Dock policy must not maintain a growing internal-route exception list: ${forbidden}`);

const navigation = read('src/services/navigation-config.service.ts');
const dockDefaults = navigation.split('const DEFAULT_MENU')[0];
for (const token of [
  "['fleet', 'Kiralık', 'key', '/fleet']",
  "['sales', 'Satılık', 'directions_car', '/sales']",
  "['search', 'Ara', 'search', '/search']",
  "['campaigns', 'Fırsatlar', 'local_offer', '/campaigns']",
  "['account', 'Profil', 'account_circle', '/account']",
]) must(dockDefaults, token, `Latest canonical dock fallback missing: ${token}`);
mustNot(dockDefaults, "['appointment', 'Randevu'", 'Appointment must not replace Profile in the canonical bottom dock fallback.');

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
  'onDockClick','NavigationStart','Scroll as RouterScroll','navigationScrollSettling','beginRouteNavigation()',
  'finishRouteNavigationAfterScroll()','event.preventDefault();','window.scrollTo','dock-hidden','HostListener',
  'backdrop-filter:blur','-webkit-backdrop-filter:blur','RouterLinkActive',
]) mustNot(dock, token, `Obsolete, inaccessible or scroll-heavy mobile dock behavior returned: ${token}`);

const responsive = read('src/premium-responsive.css');
for (const token of ['V204 canonical mobile home conversion geometry','app-home-v71 .hero-stage','app-home-v71 .trust-row','app-home-v71 .planner','app-home-v71 .field-grid','app-account-dashboard-v150']) must(responsive, token);
mustNot(responsive, 'app-list-your-car-v2', 'Deleted V2 valuation selector returned to canonical responsive CSS.');

const mobileFixes = read('src/mobile-target-fixes.css');
must(mobileFixes, 'app-home-v71 > main', 'Homepage must keep mobile dock-safe bottom space.');
for (const forbidden of [
  'app-fleet app-rental-catalog-v217 > main','app-fleet app-favorites-v217 > main','app-sales-results app-sale-catalog-v217 > main',
  'app-tours app-tour-catalog-v217 > main','app-blog-list app-blog-catalog-v217 > main','app-campaigns > main','app-search > main',
  'app-account-shell app-account-dashboard-v150 > main','app-account-wallet > main','app-customer-footer-v70 .customer-footer',
]) mustNot(mobileFixes, forbidden, `Internal customer route must not reserve homepage dock spacing: ${forbidden}`);
for (const token of [
  'app-rental-catalog-v217 .summary > span',
  'app-sale-catalog-v217 .summary > span',
  'app-tour-catalog-v217 .summary > span',
  'display: none !important',
]) must(mobileFixes, token, `Public technical catalogue copy must stay out of the rendered customer surface: ${token}`);
mustNot(mobileFixes, 'app-home-v39', 'Deleted V39 homepage selector must not remain in the active CSS chain.');
mustNot(mobileFixes, 'app-home section[aria-labelledby="campaigns-title"]', 'Deleted V62 homepage campaign selector must not remain in the active CSS chain.');

const runtimeTest = read('tests/v204/mobile-dock.spec.ts');
for (const token of [
  'mobile dock belongs only to home',
  '"/fleet"','"/sales"','"/search"','"/campaigns"','"/account"','"/account/wallet"',
  'window.scrollTo','window.scrollBy','aria-hidden','inert','dock-auto-hidden','not.toBeFocused()',
]) must(runtimeTest, token, `Android dock accessibility/home-only regression missing behavior: ${token}`);
must(runtimeTest, "await expect(dock.locator('a[href=\"/account\"]')).toHaveAttribute(\"aria-label\", \"Profil\");", 'Runtime regression must prove that Profil remains the fifth homepage dock action.');
must(runtimeTest, "await expect(dock.locator('a[href=\"/appointment\"]')).toHaveCount(0);", 'Runtime regression must prove that Randevu does not replace Profil in the homepage dock.');
must(runtimeTest, 'await expect(dock).toHaveCount(0);', 'Runtime regression must prove inner routes do not render the dock.');
const runtimeConfig = read('playwright.v204.config.ts');
for (const token of ['SM-S928B','isMobile: true','hasTouch: true','width: 412','height: 915']) must(runtimeConfig, token, `Android runtime profile missing contract: ${token}`);

const account = read('src/pages/account-dashboard-v150.component.ts');
for (const token of ['bookingFilter','filteredBookings','expandedBooking','toggleBooking','selectFilter','Profil Ayarları','queryParams]="{section:\'profile\'}"','routerLink="/appointment"','<app-account-referral-v238 />']) must(account, token);
for (const forbidden of ['profileOpen','profileForm','saveProfile()','[(ngModel)]="profileForm','routerLink="/account/wallet"','Cüzdan ve Belgeler','<small>HESABIM</small><strong>Cüzdan</strong>']) mustNot(account, forbidden, `Dashboard must not regain duplicate account/profile ownership: ${forbidden}`);
const accountShell = read('src/pages/account-shell.component.ts');
must(accountShell, 'routerLink="/account/wallet"', 'Account shell must own the canonical wallet route.');
const walletLabels = (accountShell.match(/Cüzdan ve Belgeler/g) || []).length;
if (walletLabels !== 1) throw new Error(`Account shell must expose exactly one canonical Cüzdan ve Belgeler entry, found ${walletLabels}.`);
const referral = read('src/components/account-referral-v238.component.ts');
for (const token of ['ARKADAŞINI DAVET ET','Davet Linkini Kopyala','Paylaş']) must(referral, token, `Profile landing referral experience missing: ${token}`);
const profileSettings = read('src/components/account-profile-settings-v225.component.ts');
for (const token of ['(ngSubmit)="save()"','account.updateProfile','securityOpen','Güvenlik Ayarlarını Aç','account-security-v223']) must(profileSettings, token, `Canonical profile settings ownership missing: ${token}`);
mustNot(profileSettings, 'referral-card', 'Referral ownership must remain on the Profile landing page, not duplicated in Profile Settings.');

const proofMigration = read('supabase/migrations/20260828114500_v204_campaign_social_proof_attribution.sql');
for (const token of ["ve.event_type = 'page_view'","'[?&]campaign=' || c.id::text || '(&|$)'",'count(distinct ve.visitor_id)','active_viewers_15m']) must(proofMigration, token);
mustNot(proofMigration, 've.path = c.cta_url', 'Campaign proof must not depend on nullable CTA URL.');

const defaultsMigration = read('supabase/migrations/20260828115000_v204_mobile_home_conversion_defaults.sql');
for (const token of ["when 'fleet' then 'Kiralık'","when 'sales' then 'Satılık'",'["service","duration","date","pickup"]','plannerVariant',"when 'campaigns'",'Kaçırmadan İncele']) must(defaultsMigration, token);

const dockMigration = read('supabase/migrations/20260831161135_v221_mobile_dock_profile_canonical.sql');
for (const token of [
  "'fleet'::text,'Kiralık'::text","'sales','Satılık'","'search','Ara'","'campaigns','Fırsatlar'","'account','Profil'",
  "item_key not in ('fleet','sales','search','campaigns','account')",
]) must(dockMigration, token, `Canonical dock data contract missing: ${token}`);
mustNot(dockMigration, "'appointment','Randevu'", 'Canonical dock data must not reactivate Randevu as a dock item.');

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
