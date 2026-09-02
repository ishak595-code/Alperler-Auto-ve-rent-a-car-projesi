import { existsSync, readFileSync } from 'node:fs';

const accountShell = readFileSync('src/pages/account-shell.component.ts', 'utf8');
const profileSettings = readFileSync('src/components/account-profile-settings-v225.component.ts', 'utf8');
const accountService = readFileSync('src/services/customer-account.service.ts', 'utf8');
const accountDashboard = readFileSync('src/pages/account-dashboard-v150.component.ts', 'utf8');
const walletService = readFileSync('src/services/customer-wallet.service.ts', 'utf8');
const legal = readFileSync('src/pages/legal.component.ts', 'utf8');
const dateControl = readFileSync('src/components/accessible-native-date.component.ts', 'utf8');
const runtimeStability = readFileSync('src/runtime-stability.css', 'utf8');
const mainLayout = readFileSync('src/components/main-layout.component.ts', 'utf8');
const footer = readFileSync('src/components/customer-footer-v70.component.ts', 'utf8');
const app = readFileSync('src/app.component.ts', 'utf8');
const routes = readFileSync('src/app.routes.ts', 'utf8');
const dynamicHome = readFileSync('src/components/dynamic-home-section.component.ts', 'utf8');
const toursWrapper = readFileSync('src/pages/tours.component.ts', 'utf8');
const tourCatalog = readFileSync('src/pages/tour-catalog-v217.component.ts', 'utf8');
const publicCatalog = readFileSync('src/services/scalable-public-catalog-v217.service.ts', 'utf8');
const homepageLayout = readFileSync('src/services/homepage-layout.service.ts', 'utf8');
const adminCatalog = readFileSync('src/pages/admin/admin-catalog-workspace.component.ts', 'utf8');
const feedback = readFileSync('src/components/feedback.component.ts', 'utf8');
const newsletter = readFileSync('src/services/newsletter.service.ts', 'utf8');
const partner = readFileSync('api/partner.ts', 'utf8');
const dockPolicy = readFileSync('src/services/mobile-dock-route-policy.ts', 'utf8');
const footerCutover = readFileSync('supabase/migrations/20260902014500_v226_customer_footer_admin_link_retire.sql', 'utf8').toLowerCase();
const avatarUpsertPolicy = readFileSync('supabase/migrations/20260902110004_v226_customer_avatar_upsert_select_policy.sql', 'utf8').toLowerCase();
const campaignCtaGuard = readFileSync('supabase/migrations/20260902110216_v226_campaign_cta_internal_route_guard.sql', 'utf8').toLowerCase();

function requireText(source, token, message) { if (!source.includes(token)) throw new Error(message); }
function forbidText(source, token, message) { if (source.includes(token)) throw new Error(message); }
function count(source, token) { return source.split(token).length - 1; }

forbidText(accountShell, 'ALPERLER HESABIM', 'Account shell must not duplicate the dashboard identity header.');
requireText(accountShell, '@switch (section())', 'Account shell must render exactly one account section through an exclusive switch.');
if (count(accountShell, '<app-account-profile-settings-v225>') !== 1) throw new Error('Account shell must own exactly one profile-settings render path.');
if (count(profileSettings, '<app-account-security-v223') !== 1) throw new Error('Profile settings must own exactly one account security render path.');
requireText(profileSettings, 'readonly securityOpen=signal(false)', 'Account security must start closed.');
requireText(profileSettings, '(click)="toggleSecurity()"', 'Profile settings must expose one explicit security toggle.');
requireText(profileSettings, '@if(securityOpen())', 'Account security must only render after explicit user action.');
requireText(profileSettings, "'Güvenlik Ayarlarını Aç'", 'Profile settings must expose the canonical security launcher label.');

requireText(accountService, 'readonly partialRefresh=signal(false)', 'Account service must expose partial refresh state.');
requireText(accountService, 'Promise.allSettled', 'Optional account data must not fail the core profile surface.');
requireText(accountService, "this.getRows<CustomerProfile>", 'Customer profile remains a required core account read.');
requireText(accountService, "this.getRows<CustomerBooking>", 'Customer booking history remains a required core account read.');
requireText(accountService, "'x-upsert':'true'", 'Avatar replacement must use the canonical Storage upsert path.');
requireText(avatarUpsertPolicy, 'create policy customer_avatar_select_own', 'Avatar upsert must retain owner SELECT visibility.');
requireText(avatarUpsertPolicy, "bucket_id = 'customer-avatars'", 'Avatar SELECT policy must remain scoped to the customer avatar bucket.');
requireText(avatarUpsertPolicy, 'owner_id = (select auth.uid())::text', 'Avatar SELECT policy must remain scoped to the authenticated owner.');
forbidText(accountDashboard.toLocaleLowerCase('tr-TR'), 'bağlantınızı kontrol', 'Account errors must not misdiagnose every server failure as a customer connection problem.');
requireText(accountDashboard, 'this.account.partialRefresh()', 'Dashboard must surface degraded optional-data refresh truthfully.');

requireText(legal, 'selectedDocument=computed', 'Legal content must react to asynchronously hydrated live configuration.');
requireText(legal, 'const cfg=this.config()', 'Legal content must read the live config signal inside the computed projection.');
forbidText(legal, 'setContent(', 'Legal content must not use a one-shot route/config snapshot.');
for (const type of ['rental','hourly-rental','sales','tour','partner','branch','commercial-communication','kvkk','privacy','cookies','terms','distance-selling','cancellation','insurance']) requireText(legal, `${type}:`.includes('-') ? `"${type}"` : `${type}:`, `Legal customer route contract is missing: ${type}`);

requireText(routes, "path: 'tours'", 'Public tour catalog route must remain registered.');
requireText(routes, "path: 'tour/:id'", 'Public tour detail route must remain registered.');
requireText(toursWrapper, 'TourCatalogV217Component', 'Tours route wrapper must own the canonical V217 bounded catalog.');
requireText(toursWrapper, '<app-tour-catalog-v217 />', 'Tours route wrapper must render only the canonical V217 catalog.');
forbidText(toursWrapper, 'TourShowcaseV170Component', 'Tours route must never restore the obsolete V170 showcase.');
for (const legacyPath of ['src/pages/tour-showcase-v170.component.ts', 'src/services/tour-public-data-v170.service.ts']) if (existsSync(legacyPath)) throw new Error(`Obsolete tour listing layer must stay deleted: ${legacyPath}`);
requireText(dynamicHome, "section.sectionType==='TOURS'", 'Homepage must retain the dynamic tour section renderer.');
requireText(dynamicHome, 'class="rail"', 'Homepage tour and vehicle selections must retain the horizontal rail layout contract.');
requireText(dynamicHome, "this.layout.toursFor(this.section.sectionKey)", 'Homepage tours must be resolved from the live homepage layout service.');
for (const token of ['tour.duration','tour.locationName','tour.capacity','Kişi başı','tourIncluded(tour)','Tura dahil','Rotayı ve Ayrıntıları Keşfet']) requireText(dynamicHome, token, `Homepage tour cards must expose the factual decision signal: ${token}`);
requireText(homepageLayout, "section.sectionType === 'TOURS'", 'Homepage layout must hydrate tour sections dynamically.');
requireText(homepageLayout, 'this.catalog.listTours', 'Homepage tour hydration must delegate to the scalable public catalog.');
requireText(publicCatalog, 'public_tour_catalog_v217', 'Customer tours must be read from the Supabase public tour catalog.');
for (const token of ['price_per_person','duration','capacity','location_name','included_items']) requireText(publicCatalog, token, `Public tour catalog must retain decision field: ${token}`);
for (const token of ['tour.duration','tour.locationName','tour.capacity','Kişi başı']) requireText(tourCatalog, token, `Tour cards must expose the factual decision signal: ${token}`);
for (const token of ['Fiyata dahil','tour.includedItems.join','tour.includedItems=splitLines','[(ngModel)]="tour.pricePerPerson"','[(ngModel)]="tour.duration"','[(ngModel)]="tour.capacity"','[(ngModel)]="tour.locationName"']) requireText(adminCatalog, token, `Admin tour workspace must retain customer decision-field ownership: ${token}`);
requireText(tourCatalog, '{{items().length}} tur gösteriliyor', 'Paginated tour catalog must describe the loaded result count truthfully.');
forbidText(tourCatalog, '{{items().length}} tur bulundu', 'Paginated tour catalog must not present a loaded-page count as the total number of matches.');
forbidText(tourCatalog, '4.9', 'Tour catalog must not manufacture a fixed rating.');
forbidText(tourCatalog.toLocaleLowerCase('tr-TR'), '12 değerlendirme', 'Tour catalog must not manufacture fixed review counts.');
forbidText(dynamicHome, '4.9', 'Homepage tour cards must not manufacture a fixed rating.');
forbidText(dynamicHome.toLocaleLowerCase('tr-TR'), '12 değerlendirme', 'Homepage tour cards must not manufacture fixed review counts.');

requireText(dateControl, 'focus({ preventScroll: true })', 'Calendar focus restoration must not scroll/jump the mobile planner.');
forbidText(dateControl, 'transform:translateY(1px)', 'Date controls must not move geometry on pointer press.');
requireText(dateControl, 'touch-action:manipulation', 'Calendar touch controls must use stable mobile tap handling.');
requireText(dateControl, 'overscroll-behavior:contain', 'Calendar dialog must contain mobile overscroll.');
requireText(runtimeStability, 'app-home-v71 .planner .field-grid', 'Quick planner must reserve feedback geometry before validation messages appear.');
requireText(runtimeStability, 'padding-bottom: 2.75rem', 'Quick planner feedback space must stay reserved.');
requireText(runtimeStability, 'app-home-v71 .planner .planner-error + .planner-summary', 'Planner must suppress a duplicate summary while an error owns the feedback slot.');
requireText(runtimeStability, '-webkit-tap-highlight-color: transparent', 'Planner mobile controls must not add browser tap highlight jitter.');

requireText(walletService, "window.open('about:blank','_blank')", 'Document preview must synchronously reserve a browser tab from the user gesture.');
requireText(walletService, 'preview.location.replace(url)', 'Signed document preview must navigate the reserved tab after signing.');
requireText(walletService, 'if(preview&&!preview.closed)preview.close()', 'Failed document signing must close the reserved blank tab.');

requireText(dockPolicy, "return cleanCustomerPath(rawUrl) === '/';", 'Customer mobile dock must remain home-only through the canonical path normalizer.');
requireText(footer, "if(link.actionType==='ADMIN')return false", 'Public footer must never render administrative links.');
requireText(footer, "if(link.actionType==='EXTERNAL')return this.safeExternalUrl(link.externalUrl)!=='#'", 'Public footer must suppress invalid external links instead of rendering dead anchors.');
forbidText(app, 'a[href="/admin/login"]', 'Administrative links must not be hidden by global CSS.');
requireText(footerCutover, "action_type = 'admin'", 'Production data migration must retire public footer admin actions.');
requireText(footerCutover, 'set is_enabled = false', 'Footer admin cutover must disable the live configuration row.');

requireText(campaignCtaGuard, 'campaigns_cta_internal_route_v226_check', 'Campaign customer CTA guard must remain installed.');
requireText(campaignCtaGuard, "cta_url !~ '^//'", 'Campaign CTA guard must reject protocol-relative targets.');
requireText(campaignCtaGuard, "cta_url !~ '^/admin'", 'Campaign CTA guard must reject administrative targets.');
requireText(campaignCtaGuard, "cta_url !~ '^/branch-portal'", 'Campaign CTA guard must reject branch portal targets.');

requireText(mainLayout, '<app-feedback></app-feedback>', 'Feedback overlay must be mounted synchronously so the first click cannot race a lazy chunk.');
forbidText(mainLayout, '@defer (when uiService.isFeedbackOpen()', 'Feedback overlay must not be deferred on the same signal that opens it.');
for (const token of ['height:100dvh','overscroll-behavior:contain','body.style.overflow = "hidden"','@HostListener("document:keydown.escape")','animation:none!important']) requireText(feedback, token, `Feedback overlay stability contract is missing: ${token}`);
requireText(feedback, 'fetch("/api/contact"', 'Feedback must use the canonical contact gateway.');
requireText(feedback, 'idempotencyKey:this.submissionKey', 'Feedback submissions must remain idempotent.');
requireText(newsletter, "fetch('/api/partner?op=newsletter-public'", 'Newsletter signup must use the canonical public newsletter gateway.');
requireText(newsletter, 'op=newsletter-admin-read', 'Newsletter admin listing must use the authenticated admin read gateway.');
requireText(newsletter, "fetch('/api/partner?op=newsletter-admin'", 'Newsletter campaign actions must use the authenticated admin gateway.');
for (const edge of ['newsletter-gateway','newsletter-admin','newsletter-admin-read-v186']) requireText(partner, `edgeFunction: "${edge}"`, `Partner API must route newsletter traffic to ${edge}.`);

console.log('V226 customer surface integrity contract passed.');
