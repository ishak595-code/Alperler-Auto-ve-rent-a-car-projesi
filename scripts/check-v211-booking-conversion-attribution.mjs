import fs from 'node:fs';

const fail = (message) => {
  console.error(`V211_BOOKING_CONVERSION_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, 'utf8');

const analytics = read('src/services/visitor-analytics.service.ts');
const appointment = read('src/pages/appointment.component.ts');
const dock = read('src/components/customer-mobile-dock.component.ts');
const dynamicHome = read('src/components/dynamic-home-section.component.ts');
const ingest = read('supabase/functions/analytics-ingest/index.ts');
const adminAnalytics = read('src/pages/admin/admin-analytics.component.ts');
const adminAnalyticsService = read('src/services/admin-analytics.service.ts');
const pkg = JSON.parse(read('package.json'));

if (!analytics.includes("const BOOKING_FUNNEL = 'booking_conversion'")) fail('booking funnel canonical name is missing');
for (const marker of ['entry_mobile_dock', 'entry_home_closing_cta', 'entry_other_appointment_link']) {
  if (!analytics.includes(marker)) fail(`booking entry attribution is missing: ${marker}`);
}
if (!analytics.includes("element.closest('[data-dock-item=\"appointment\"]')")) fail('mobile appointment dock attribution does not use the canonical dock marker');
if (!analytics.includes("element.closest('[aria-labelledby=\"closing_cta-title\"]')")) fail('closing CTA attribution does not bind to the canonical homepage section');
if (!analytics.includes("...(bookingEntry ? { funnelName: BOOKING_FUNNEL, funnelStep: bookingEntry.step } : {})")) fail('booking attribution is not attached to the original click event');
if (analytics.includes("this.trackFunnel(BOOKING_FUNNEL")) fail('booking entry attribution must not emit a second synthetic click event');

if (!dock.includes('[attr.data-dock-item]="item.itemKey"')) fail('canonical mobile dock no longer exposes stable item attribution');
if (!/\[attr\.aria-labelledby\]\s*=\s*["']section\.sectionKey\s*\+\s*["']-title["']["']/.test(dynamicHome)) fail('homepage sections no longer expose stable section ownership for attribution');

if (!appointment.includes('data-analytics-form="booking_conversion"')) fail('appointment form is not attached to the booking conversion funnel');
if (!appointment.includes('inject(VisitorAnalyticsService)')) fail('appointment success cannot reach the canonical analytics owner');
if (!appointment.includes('this.analytics.trackFormSuccess("booking_conversion")')) fail('successful BookingService completion is not recorded as funnel success');
const createIndex = appointment.indexOf('await this.bookingService.create(');
const successIndex = appointment.indexOf('this.analytics.trackFormSuccess("booking_conversion")');
if (createIndex < 0 || successIndex < createIndex) fail('funnel success is recorded before the booking write succeeds');

for (const field of ['funnelName', 'funnelStep']) {
  if (!ingest.includes(`${field}: clean(eventRaw[\"${field}\"]`)) fail(`analytics ingest does not sanitize ${field}`);
}
if (!ingest.includes('"section"')) fail('analytics ingest metadata allowlist does not preserve CTA section attribution');
if (!adminAnalytics.includes('Form Hunileri') || !adminAnalytics.includes('funnels()')) fail('admin analytics does not expose funnel reporting');
if (!adminAnalyticsService.includes("view: 'FUNNELS'")) fail('admin analytics service cannot query funnel aggregation');

if (pkg.scripts?.['booking-conversion:v211'] !== 'node scripts/check-v211-booking-conversion-attribution.mjs') fail('package script booking-conversion:v211 is missing');
if (!String(pkg.scripts?.['verify:handoff'] || '').includes('booking-conversion:v211')) fail('V211 contract is not wired into verify:handoff');

if (!process.exitCode) console.log('V211 booking conversion attribution passed: canonical entry clicks, appointment form lifecycle, successful booking completion, secure ingest, and admin funnel reporting are connected without duplicate click events.');
