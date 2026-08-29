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
const consent = source(files.consent);
const app = source(files.app);
const legal = source(files.legal);

const requiredAnalytics = [
  "marketing: 'unknown'",
  'marketingConsent = this._marketingConsent.asReadonly()',
  'choiceRequired = computed',
  'savePreferences(analyticsEnabled: boolean, marketingEnabled: boolean)',
  'acceptAllOptional()',
  "if (stored === 'accepted') return { version: 2, analytics: 'accepted', marketing: 'unknown' }",
  'this.routerSubscription?.unsubscribe()',
];
for (const marker of requiredAnalytics) if (!analytics.includes(marker)) failures.push(`ANALYTICS_CONSENT_MARKER ${marker}`);

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

for (const marker of [
  'analytics.choiceRequired()',
  'analytics.savePreferences(true, false)',
  'analytics.acceptAllOptional()',
  'analytics.savePreferences(this.analyticsOn(), this.marketingOn())',
  'Pazarlama',
]) if (!consent.includes(marker)) failures.push(`CONSENT_UI_MARKER ${marker}`);

for (const marker of [
  "import { AnalyticsConsentComponent } from './components/analytics-consent.component'",
  '<app-analytics-consent></app-analytics-consent>',
  '@if (showCustomerChrome())',
]) if (!app.includes(marker)) failures.push(`ROOT_CONSENT_MARKER ${marker}`);

for (const marker of ['marketingConsentLabel()', 'Gizlilik tercihlerini yeniden seç', 'Pazarlama:']) {
  if (!legal.includes(marker)) failures.push(`LEGAL_CONSENT_MARKER ${marker}`);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const handoff = String(packageJson.scripts?.['verify:handoff'] || '');
if (!String(packageJson.scripts?.['privacy-consent:v212'] || '').includes('check-v212-third-party-tracking-consent.mjs')) {
  failures.push('PACKAGE_MISSING_V212_SCRIPT');
}
if (!handoff.includes('privacy-consent:v212')) failures.push('HANDOFF_MISSING_V212_CONSENT_GUARD');

if (failures.length) {
  console.error(`V212 third-party tracking consent: FAIL (${failures.length})`);
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V212 third-party tracking consent: PASS');
