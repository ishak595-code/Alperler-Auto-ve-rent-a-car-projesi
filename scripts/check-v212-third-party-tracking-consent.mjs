import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const files = {
  analytics: 'src/services/visitor-analytics.service.ts',
  seo: 'src/services/seo.service.ts',
  consent: 'src/components/analytics-consent.component.ts',
  app: 'src/app.component.ts',
  legal: 'src/pages/legal.component.ts',
};

function source(path) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`MISSING ${path}`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

const analytics = source(files.analytics);
const seo = source(files.seo);
const app = source(files.app);
const legal = source(files.legal);

if (existsSync(join(root, files.consent))) {
  failures.push('CUSTOMER_CONSENT_BANNER_MUST_BE_REMOVED');
}

const requiredAnalytics = [
  "marketing: 'unknown'",
  'marketingConsent = this._marketingConsent.asReadonly()',
  'savePreferences(analyticsEnabled: boolean, marketingEnabled: boolean)',
  "if (stored.analytics === 'accepted') this.startTracking()",
  "if (this._consent() !== 'accepted' || !this.sessionId || !this.visitorId || !this.isTrackingPath()) return",
  'this.routerSubscription?.unsubscribe()',
];
for (const marker of requiredAnalytics) if (!analytics.includes(marker)) failures.push(`ANALYTICS_EXPLICIT_OPT_IN_MARKER ${marker}`);

const requiredSeo = [
  "import { VisitorAnalyticsService } from './visitor-analytics.service'",
  "const analyticsId = analyticsAllowed ? configuredAnalyticsId : ''",
  "const adsId = marketingAllowed ? configuredAdsId : ''",
  "const pixelId = marketingAllowed ? configuredPixelId : ''",
  "gtag('consent', 'default'",
  "trackingWindow.gtag?.('consent', 'update'",
  "trackingWindow.fbq?.('consent', 'revoke')",
  "this.clearFirstPartyTrackingCookies(['_ga', '_gid'])",
  "this.clearFirstPartyTrackingCookies(['_gcl_', '_fbp', '_fbc'])",
];
for (const marker of requiredSeo) if (!seo.includes(marker)) failures.push(`SEO_TRACKING_CONSENT_MARKER ${marker}`);

if (seo.includes('const googleIds = Array.from(new Set([configuredAnalyticsId, configuredAdsId]')) {
  failures.push('SEO_UNGATED_GOOGLE_IDS');
}
if (/if\s*\(pixelId\)/.test(seo) && !seo.includes("const pixelId = marketingAllowed ? configuredPixelId : ''")) {
  failures.push('META_PIXEL_NOT_MARKETING_GATED');
}

for (const forbidden of [
  "import { AnalyticsConsentComponent } from './components/analytics-consent.component'",
  '<app-analytics-consent',
  'analytics.choiceRequired()',
]) if (app.includes(forbidden)) failures.push(`ROOT_CUSTOM_CONSENT_UI_FORBIDDEN ${forbidden}`);

for (const forbidden of [
  'analytics.resetChoice()',
  'analyticsConsentLabel()',
  'marketingConsentLabel()',
  'Gizlilik tercihlerini yeniden seç',
]) if (legal.includes(forbidden)) failures.push(`LEGAL_INLINE_CONSENT_UI_FORBIDDEN ${forbidden}`);

for (const marker of [
  'KVKK Aydınlatma Metni',
  'Gizlilik Politikası',
  'Çerez Politikası',
]) if (!legal.includes(marker)) failures.push(`LEGAL_DOCUMENT_MUST_REMAIN_ACCESSIBLE ${marker}`);

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const handoff = String(packageJson.scripts?.['verify:handoff'] || '');
if (!String(packageJson.scripts?.['privacy-consent:v212'] || '').includes('check-v212-third-party-tracking-consent.mjs')) {
  failures.push('PACKAGE_MISSING_V212_SCRIPT');
}
if (!handoff.includes('privacy-consent:v212')) failures.push('HANDOFF_MISSING_V212_CONSENT_GUARD');

if (failures.length) {
  console.error(`V212 third-party tracking privacy boundary: FAIL (${failures.length})`);
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V212 third-party tracking privacy boundary: PASS. No custom customer consent banner, legal documents remain accessible, and optional tracking stays explicitly gated.');
