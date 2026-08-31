import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const must = (source, token, message) => { if (!source.includes(token)) throw new Error(message || `V204 contract missing: ${token}`); };
const mustNot = (source, token, message) => { if (source.includes(token)) throw new Error(message || `V204 forbidden contract: ${token}`); };
const requireFile = (file) => { if (!fs.existsSync(file)) throw new Error(`V204 required file missing: ${file}`); };

const required = [
  'src/services/mobile-dock-route-policy.ts',
  'src/components/customer-mobile-dock.component.ts',
  'src/components/main-layout.component.ts',
  'src/pages/car-detail.component.ts',
  'src/pages/sale-car-detail.component.ts',
  'src/pages/tour-detail.component.ts',
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
for (const token of ['shouldRenderMobileDock','isDockItemCurrent',"return cleanCustomerPath(rawUrl) === '/'"]) must(policy, token);
for (const forbidden of ['MOBILE_DOCK_SUPPRESSED_EXACT','MOBILE_DOCK_SUPPRESSED_PREFIXES','MOBILE_DOCK_DETAIL_ROUTES']) {
  mustNot(policy, forbidden, `Mobile dock must use a home-only allowlist instead of fragile route suppression: ${forbidden}`);
}

const dock = read('src/components/customer-mobile-dock.component.ts');
for (const token of [
  'shouldRenderMobileDock',
  'isDockItemCurrent',
  'aria-current',
  'NavigationEnd',
  'setMobileDockRouteHidden',
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
for (const token of ['HostListener','backdrop-filter:blur','-webkit-backdrop-filter:blur','RouterLinkActive']) {
  mustNot(dock, token, `Obsolete or scroll-heavy mobile dock behavior returned: ${token}`);
}

const layout = read('src/components/main-layout.component.ts');
for (const token of [
  'isHomePage() && navigation.mobileDockAutoHidden() && getWhatsappNumber()',
  'class="whatsapp-fab"',
  '[href]="getWhatsappHref()"',
  'animation:whatsapp-fab-enter .16s ease .18s both',
]) must(layout, token, `Homepage WhatsApp handoff contract missing: ${token}`);
for (const forbidden of ['showWhatsapp=signal', 'setTimeout(()=>this.showWhatsapp', 'dock-offset']) {
  mustNot(layout, forbidden, `Homepage WhatsApp must not overlap the dock or use timer-driven visibility: ${forbidden}`);
}

const mobileFixes = read('src/mobile-target-fixes.css');
must(mobileFixes, 'app-home-v71 > main', 'Homepage must reserve dock safe area.');
for (const forbidden of [
  'app-fleet app-rental-catalog-v217 > main',
  'app-fleet app-favorites-v217 > main',
  'app-sales-results app-sale-catalog-v217 > main',
  'app-tours app-tour-catalog-v217 > main',
  'app-blog-list app-blog-catalog-v217 > main',
  'app-campaigns > main',
  'app-search > main',
  'app-account-shell app-account-dashboard-v150 > main',
]) mustNot(mobileFixes, forbidden, `Non-home route must not reserve space for a dock that cannot render: ${forbidden}`);

const rentalDetail = read('src/pages/car-detail.component.ts');
const saleDetail = read('src/pages/sale-car-detail.component.ts');
const tourDetail = read('src/pages/tour-detail.component.ts');
for (const [name, source, owner] of [
  ['rental', rentalDetail, 'class="fixed-actions"'],
  ['sale', saleDetail, 'class="bottom-actions"'],
  ['tour', tourDetail, 'class="action-bar"'],
]) {
  must(source, owner, `${name} detail fixed action owner must remain intact.`);
  must(source, 'class="whatsapp"', `${name} detail WhatsApp action must remain intact.`);
  must(source, '(click)="whatsapp()"', `${name} detail WhatsApp handler must remain intact.`);
}

const runtimeTest = read('tests/v204/mobile-dock.spec.ts');
for (const token of [
  'a.whatsapp-fab',
  'toHaveCount(0)',
  'window.scrollTo',
  'window.scrollBy',
  'aria-hidden',
  'inert',
  'getByRole("navigation"',
  'dock-auto-hidden',
  '"/fleet"',
  '"/sales"',
  '"/campaigns"',
  '"/tours"',
  '"/blog"',
]) must(runtimeTest, token, `Android home dock/WhatsApp regression missing behavior: ${token}`);
const runtimeConfig = read('playwright.v204.config.ts');
for (const token of ['SM-S928B','isMobile: true','hasTouch: true','width: 412','height: 915']) must(runtimeConfig, token, `Android runtime profile missing contract: ${token}`);

const responsive = read('src/premium-responsive.css');
for (const token of ['V204 canonical mobile home conversion geometry','app-home-v71 .hero-stage','app-home-v71 .trust-row','app-home-v71 .planner','app-home-v71 .field-grid','app-account-dashboard-v150']) must(responsive, token);

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
