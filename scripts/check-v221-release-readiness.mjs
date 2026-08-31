import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const must = (source, token, message) => { if (!source.includes(token)) failures.push(message || `Missing: ${token}`); };
const reject = (source, token, message) => { if (source.includes(token)) failures.push(message || `Forbidden: ${token}`); };
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => { const full = path.join(dir, entry.name); return entry.isDirectory() ? walk(full) : [full]; });

const navigation = read('src/services/navigation-config.service.ts');
const dockDefaults = navigation.split('const DEFAULT_MENU')[0];
for (const token of ["['fleet', 'Kiralık', 'key', '/fleet']","['sales', 'Satılık', 'directions_car', '/sales']","['search', 'Ara', 'search', '/search']","['campaigns', 'Fırsatlar', 'local_offer', '/campaigns']","['account', 'Profil', 'account_circle', '/account']"]) must(dockDefaults, token, `Canonical customer dock missing ${token}`);
reject(dockDefaults, "['appointment', 'Randevu'", 'Randevu must remain outside the five-item bottom dock.');
const dockMigration = read('supabase/migrations/20260831180700_v221_mobile_dock_profile_canonical.sql');
must(dockMigration, "item_key not in ('fleet','sales','search','campaigns','account')", 'Dock migration must archive every non-canonical bottom action.');

const shell = read('src/services/default-site-config.ts');
for (const token of ['phone: ""','email: ""','address: ""','whatsapp: ""','rentalExtras: []','rentalRoutePricing: []','team: []','kvkkText: ""','privacyText: ""','cookiesText: ""','termsText: ""','distanceSellingText: ""','cancellationText: ""','insuranceText: ""','Customer-facing business data, pricing, contact details, legal copy']) must(shell, token, `Embedded site shell must stay non-operational: ${token}`);
for (const token of ['rentalFuelPricePerLiter:','rentalAverageConsumptionPer100Km:','seoTitle:','heroTitle:','campaignEarlyBooking:','whyUsTitle:','salesTitle:','partnerTitle:']) reject(shell, token, `Operational content must be database-owned, not embedded: ${token}`);
const catalog = read('src/services/catalog.service.ts');
must(catalog, 'site_config?key=eq.site_settings&is_public=eq.true', 'Public site configuration must come from Supabase site_config.');
const refresh = read('src/services/public-content-refresh-coordinator.service.ts');
must(refresh, "this.realtime.watch(['site_config']", 'Site configuration must stay realtime-refreshable from the database.');

const paymentSettings = read('src/services/payment-settings.service.ts');
const paymentService = read('src/services/payment.service.ts');
const paymentModel = read('src/models/payment.model.ts');
const paymentAdmin = read('src/pages/admin/admin-payment-settings.component.ts');
const paymentDialog = read('src/components/iyzico-buyer-details-dialog.component.ts');
const paymentEdge = read('supabase/functions/admin-core-gateway-v178/index.ts');
const paymentMigration = read('supabase/migrations/20260831194000_v221_dual_payment_providers.sql');
const paymentApi = read('api/payments.ts');
const integration = read('api/_lib/integration-config.ts');
const publicOrigin = read('api/_lib/public-origin.ts');

for (const source of [paymentSettings,paymentService,paymentModel,paymentAdmin,paymentEdge,paymentMigration,paymentApi,integration]) reject(source,'GENERIC_HOSTED','Retired generic hosted provider must not return.');
for (const token of ["'PAYTR' | 'IYZICO' | 'NONE'",'PAYTR_CARD_REQUIRES_TRY','CARD_PROVIDER_REQUIRED']) must(`${paymentSettings}\n${paymentEdge}\n${paymentMigration}`,token,`Dual payment provider invariant missing ${token}`);
for (const token of ['<option value="PAYTR">PayTR</option>','<option value="IYZICO">iyzico</option>','<option value="NONE">Online kart kapalı</option>']) must(paymentAdmin,token,`Admin provider option missing ${token}`);
must(paymentAdmin,"form.provider==='PAYTR'&&form.cardEnabled",'PayTR currency lock must remain scoped to PayTR.');
for (const token of ['PAYTR_MERCHANT_ID','PAYTR_MERCHANT_KEY','PAYTR_MERCHANT_SALT','IYZICO_API_KEY','IYZICO_SECRET_KEY','IYZICO_SANDBOX_API_KEY','IYZICO_SANDBOX_SECRET_KEY']) must(integration,token,`Server payment secret contract missing ${token}`);
for (const token of ['createPaytr(','createIyzico(','iyzicoCallback(','paytrCallback(','providerStatus()','IYZWSv2','IYZICO_RESULT_SIGNATURE_INVALID','payment_transactions?provider=eq.iyzico']) must(paymentApi,token,`Payment gateway implementation missing ${token}`);
for (const token of ['MatDialog','IyzicoBuyerDetailsDialogComponent','status.provider === \'iyzico\'']) must(paymentService,token,`iyzico customer preflight missing ${token}`);
for (const token of ['Kimlik / pasaport numarası','Fatura adresi','Uygulamanın ödeme işlem geçmişine kimlik veya açık adres kopyası yazılmaz']) must(paymentDialog,token,`iyzico privacy/accessibility contract missing ${token}`);
reject(paymentApi,'identityNumber:', 'Sensitive iyzico identity data must not be copied into transaction snapshots as a named snapshot field.');
for (const token of ['APP_PUBLIC_ORIGIN','PUBLIC_APP_URL','SITE_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_URL']) must(publicOrigin,token,`Portable public-origin source missing ${token}`);
for (const token of ['allowedOrigins','safeReturnUrl','/api/payments?op=iyzico-callback']) must(paymentApi,token,`Portable payment callback/origin contract missing ${token}`);

for (const file of walk('src').filter((file) => /\.(?:ts|html|css)$/.test(file))) {
  const source = read(file);
  for (const secret of ['PAYTR_MERCHANT_KEY','PAYTR_MERCHANT_SALT','IYZICO_SECRET_KEY','IYZICO_SANDBOX_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']) if (source.includes(secret)) failures.push(`${file} must not reference server-only secret ${secret}`);
}

const deviceConfig = read('playwright.v205.config.ts');
for (const token of ['android-phone','iphone-webkit','android-landscape-phone','ipad-mini-webkit','android-tablet','desktop-chromium']) must(deviceConfig,token,`Release device matrix missing ${token}`);
const deviceSpec = read('tests/v205/responsive-prestige.spec.ts');
for (const token of ['noHorizontalOverflow','core public routes stay overflow-free across the full device matrix','dock-auto-hidden','aria-hidden','inert','a[href="/account"]','a[href="/appointment"]']) must(deviceSpec,token,`Release browser regression missing ${token}`);

if (failures.length) { console.error('V221 release readiness: FAIL'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log('V221 release readiness: PASS');
