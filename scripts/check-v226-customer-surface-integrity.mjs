import { readFileSync } from 'node:fs';

const accountShell = readFileSync('src/pages/account-shell.component.ts', 'utf8');
const profileSettings = readFileSync('src/components/account-profile-settings-v225.component.ts', 'utf8');
const accountService = readFileSync('src/services/customer-account.service.ts', 'utf8');
const accountDashboard = readFileSync('src/pages/account-dashboard-v150.component.ts', 'utf8');
const legal = readFileSync('src/pages/legal.component.ts', 'utf8');
const dateControl = readFileSync('src/components/accessible-native-date.component.ts', 'utf8');
const mainLayout = readFileSync('src/components/main-layout.component.ts', 'utf8');
const footer = readFileSync('src/components/customer-footer-v70.component.ts', 'utf8');
const app = readFileSync('src/app.component.ts', 'utf8');
const feedback = readFileSync('src/components/feedback.component.ts', 'utf8');
const newsletter = readFileSync('src/services/newsletter.service.ts', 'utf8');
const partner = readFileSync('api/partner.ts', 'utf8');
const dockPolicy = readFileSync('src/services/mobile-dock-route-policy.ts', 'utf8');
const footerCutover = readFileSync('supabase/migrations/20260902014500_v226_customer_footer_admin_link_retire.sql', 'utf8').toLowerCase();

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}
function forbidText(source, token, message) {
  if (source.includes(token)) throw new Error(message);
}
function count(source, token) {
  return source.split(token).length - 1;
}

forbidText(accountShell, 'ALPERLER HESABIM', 'Account shell must not duplicate the dashboard identity header.');
requireText(accountShell, '@switch (section())', 'Account shell must render exactly one account section through an exclusive switch.');
if (count(accountShell, '<app-account-profile-settings-v225>') !== 1) throw new Error('Account shell must own exactly one profile-settings render path.');
if (count(profileSettings, '<app-account-security-v223') !== 1) throw new Error('Profile settings must render account security exactly once.');
forbidText(profileSettings, 'security-launch', 'Profile settings must not duplicate the security launcher owned by the security component.');

requireText(accountService, 'readonly partialRefresh=signal(false)', 'Account service must expose partial refresh state.');
requireText(accountService, 'Promise.allSettled', 'Optional account data must not fail the core profile surface.');
requireText(accountService, "this.getRows<CustomerProfile>", 'Customer profile remains a required core account read.');
requireText(accountService, "this.getRows<CustomerBooking>", 'Customer booking history remains a required core account read.');
forbidText(accountDashboard.toLocaleLowerCase('tr-TR'), 'bağlantınızı kontrol', 'Account errors must not misdiagnose every server failure as a customer connection problem.');
requireText(accountDashboard, 'this.account.partialRefresh()', 'Dashboard must surface degraded optional-data refresh truthfully.');

requireText(legal, 'selectedDocument=computed', 'Legal content must react to asynchronously hydrated live configuration.');
requireText(legal, 'const cfg=this.config()', 'Legal content must read the live config signal inside the computed projection.');
forbidText(legal, 'setContent(', 'Legal content must not use a one-shot route/config snapshot.');
for (const type of ['rental','hourly-rental','sales','tour','partner','branch','commercial-communication','kvkk','privacy','cookies','terms','distance-selling','cancellation','insurance']) {
  requireText(legal, `${type}:`.includes('-') ? `"${type}"` : `${type}:`, `Legal customer route contract is missing: ${type}`);
}

forbidText(dateControl, 'transform:translateY(1px)', 'Date controls must not move geometry on pointer press.');
requireText(dateControl, 'focus({ preventScroll: true })', 'Calendar focus restoration must not scroll/jump the mobile planner.');
requireText(dateControl, 'touch-action:manipulation', 'Calendar touch controls must use stable mobile tap handling.');
requireText(dateControl, 'overscroll-behavior:contain', 'Calendar dialog must contain mobile overscroll.');

requireText(dockPolicy, "return cleanCustomerPath(rawUrl) === '/';", 'Customer mobile dock must remain home-only through the canonical path normalizer.');
requireText(footer, "if(link.actionType==='ADMIN')return false", 'Public footer must never render administrative links.');
requireText(footer, "if(link.actionType==='EXTERNAL')return this.safeExternalUrl(link.externalUrl)!=='#'", 'Public footer must suppress invalid external links instead of rendering dead anchors.');
forbidText(app, 'a[href="/admin/login"]', 'Administrative links must not be hidden by global CSS.');
requireText(footerCutover, "action_type = 'admin'", 'Production data migration must retire public footer admin actions.');
requireText(footerCutover, 'set is_enabled = false', 'Footer admin cutover must disable the live configuration row.');

requireText(mainLayout, '@defer (when uiService.isFeedbackOpen(); prefetch on idle)', 'Feedback panel must load immediately from the user interaction signal, not wait indefinitely for browser idle.');
requireText(feedback, 'fetch("/api/contact"', 'Feedback must use the canonical contact gateway.');
requireText(feedback, 'idempotencyKey: this.submissionKey', 'Feedback submissions must remain idempotent.');
requireText(newsletter, "fetch('/api/partner?op=newsletter-public'", 'Newsletter signup must use the canonical public newsletter gateway.');
requireText(newsletter, 'op=newsletter-admin-read', 'Newsletter admin listing must use the authenticated admin read gateway.');
requireText(newsletter, "fetch('/api/partner?op=newsletter-admin'", 'Newsletter campaign actions must use the authenticated admin gateway.');
for (const edge of ['newsletter-gateway','newsletter-admin','newsletter-admin-read-v186']) {
  requireText(partner, `edgeFunction: "${edge}"`, `Partner API must route newsletter traffic to ${edge}.`);
}

console.log('V226 customer surface integrity contract passed.');
