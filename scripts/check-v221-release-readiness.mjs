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
for (const token of ['key: "config"','run: () => this.carService.refreshSiteConfig(true)','window.addEventListener("online"','document.addEventListener("visibilitychange"','refreshNow("online")','refreshNow("visible")']) must(refresh, token, `Database-backed site configuration refresh ownership missing ${token}`);

const appRoutes = read('src/app.routes.ts');
const adminLayout = read('src/pages/admin/admin-layout.component.ts');
const adminFinance = read('src/pages/admin/admin-finance.component.ts');
const paymentSettings = read('src/services/payment-settings.service.ts');
const paymentService = read('src/services/payment.service.ts');
const paymentModel = read('src/models/payment.model.ts');
const paymentAdmin = read('src/pages/admin/admin-payment-settings.component.ts');
const paymentVaultAdmin = read('src/services/payment-provider-secrets.service.ts');
const paymentDialog = read('src/components/iyzico-buyer-details-dialog.component.ts');
const paymentEdge = read('supabase/functions/admin-core-gateway-v178/index.ts');
const paymentMigration = read('supabase/migrations/20260831194000_v221_dual_payment_providers.sql');
const paymentVaultMigration = read('supabase/migrations/20260831203000_v221_payment_provider_vault_credentials.sql');
const paymentApi = read('api/payments.ts');
const credentialResolver = read('api/_lib/payment-provider-credentials.ts');
const integration = read('api/_lib/integration-config.ts');
const publicOrigin = read('api/_lib/public-origin.ts');
const paymentDocs = read('docs/payment-provider-setup.md');
const envExample = read('.env.example');

for (const source of [paymentSettings,paymentService,paymentModel,paymentAdmin,paymentEdge,paymentMigration,paymentVaultMigration,paymentApi,credentialResolver,integration]) reject(source,'GENERIC_HOSTED','Retired generic hosted provider must not return.');
for (const token of ["'PAYTR' | 'IYZICO' | 'NONE'",'PAYTR_CARD_REQUIRES_TRY','CARD_PROVIDER_REQUIRED']) must(`${paymentSettings}\n${paymentEdge}\n${paymentMigration}`,token,`Dual payment provider invariant missing ${token}`);
for (const token of ["path: 'payments'","adminAreaGuard('finance')",'AdminPaymentSettingsComponent']) must(appRoutes,token,`Admin payment route missing ${token}`);
for (const token of ["routerLink=\"/admin/payments\"",'Ödeme ve Depozito','Şube Abonelikleri']) must(adminFinance,token,`Finance hub payment discoverability missing ${token}`);
for (const token of ["'/admin/payments'","'/admin/branch-subscriptions'",'ödeme sağlayıcıları','depozito']) must(adminLayout,token,`Finance module ownership missing ${token}`);
for (const token of ['provider-status','assertCardProviderReady','sandboxConfigured','liveConfigured','paytr?.configured','PayTR anahtarlarını önce Ödeme ve Depozito','iyzico Sandbox anahtarlarını önce Ödeme ve Depozito','iyzico Canlı anahtarlarını önce Ödeme ve Depozito']) must(paymentSettings,token,`Provider readiness save guard missing ${token}`);
for (const token of ['<option value="PAYTR">PayTR</option>','<option value="IYZICO">iyzico</option>','<option value="NONE">Online kart kapalı</option>','PayTR Güvenli Bağlantı','iyzico Sandbox Bağlantısı','iyzico Canlı Bağlantısı','iyzico Fraud Bildirim / IFN URL','iyzicoFraudNotificationUrl()','autocomplete="new-password"','deployment gerekmez','Acil kart durdurma kilidi']) must(paymentAdmin,token,`Admin no-code provider setup missing ${token}`);
must(paymentAdmin,"form.provider==='PAYTR'&&form.cardEnabled",'PayTR currency lock must remain scoped to PayTR.');
for (const token of ['payment-provider-secrets','SAVE_PAYMENT_PROVIDER_SECRETS','CLEAR_PAYMENT_PROVIDER_SECRETS','service_payment_provider_secret_status_v221','service_set_payment_provider_secrets_v221','service_clear_payment_provider_secrets_v221']) must(`${paymentVaultAdmin}\n${paymentEdge}`,token,`Admin encrypted secret bridge missing ${token}`);
for (const token of ['vault.create_secret','vault.update_secret','vault.decrypted_secrets','service_payment_provider_credentials_v221','revoke all on function public.service_payment_provider_credentials_v221(text,boolean) from public, anon, authenticated','grant execute on function public.service_payment_provider_credentials_v221(text,boolean) to service_role','secret_values_logged',"'payment_provider_secret'"]) must(paymentVaultMigration,token,`Payment Vault boundary missing ${token}`);
for (const token of ['resolvePaytrCredentials','resolveIyzicoCredentials','service_payment_provider_credentials_v221','SUPABASE_SERVICE_ROLE_KEY']) must(credentialResolver,token,`Server Vault credential resolver missing ${token}`);
for (const token of ['PAYTR_MERCHANT_ID','PAYTR_MERCHANT_KEY','PAYTR_MERCHANT_SALT','IYZICO_API_KEY','IYZICO_SECRET_KEY','IYZICO_SANDBOX_API_KEY','IYZICO_SANDBOX_SECRET_KEY','PAYMENT_CARD_KILL_SWITCH','cardEnabled: !asBoolean(process.env.PAYMENT_CARD_KILL_SWITCH, false)']) must(integration,token,`Server payment environment/failsafe contract missing ${token}`);
reject(integration,'PAYMENT_CARD_ENABLED','Card activation must not require a deployment-time enable variable.');
for (const token of ['PAYMENT_CARD_KILL_SWITCH=false','Emergency-only server kill switch','Normal card activation is controlled from Admin']) must(envExample,token,`Environment template missing no-code payment activation contract ${token}`);
reject(envExample,'PAYMENT_CARD_ENABLED','Environment template must not require a legacy payment activation switch.');
for (const token of ['createPaytr(','createIyzico(','iyzicoCallback(','iyzicoFraudNotification(','paytrCallback(','providerStatus()','IYZWSv2','IYZICO_RESULT_SIGNATURE_INVALID','IYZICO_FRAUD_RESULT_SIGNATURE_INVALID','payment_transactions?provider=eq.iyzico','payment_amount','total_amount','fraudStatus===0','"AUTHORIZED"','rejectedAfterReview','"REFUNDED"','/payment/detail','iyzico-fraud-notification']) must(paymentApi,token,`Payment gateway implementation missing ${token}`);
for (const token of ['MatDialog','IyzicoBuyerDetailsDialogComponent','status.provider === \'iyzico\'']) must(paymentService,token,`iyzico customer preflight missing ${token}`);
for (const token of ['Kimlik / pasaport numarası','Fatura adresi','Uygulamanın ödeme işlem geçmişine kimlik veya açık adres kopyası yazılmaz']) must(paymentDialog,token,`iyzico privacy/accessibility contract missing ${token}`);
const snapshots = paymentApi.match(/requestSnapshot:\{[^}]*\}/g) || [];
for (const snapshot of snapshots) for (const sensitive of ['identityNumber','billingAddress','zipCode']) reject(snapshot,sensitive,`Sensitive iyzico field must not be persisted in transaction request snapshot: ${sensitive}`);
for (const token of ['APP_PUBLIC_ORIGIN','PUBLIC_APP_URL','SITE_URL','VERCEL_PROJECT_PRODUCTION_URL','VERCEL_URL']) must(publicOrigin,token,`Portable public-origin source missing ${token}`);
for (const token of ['allowedOrigins','safeReturnUrl','/api/payments?op=iyzico-callback']) must(paymentApi,token,`Portable payment callback/origin contract missing ${token}`);
for (const token of ['Admin > Muhasebe & Tahsilat > Ödeme ve Depozito','/admin/payments','https://YOUR_DOMAIN/api/payments?op=paytr-callback','https://YOUR_DOMAIN/api/payments?op=iyzico-callback','https://YOUR_DOMAIN/api/payments?op=iyzico-fraud-notification','Supabase Vault','payment_amount','fraudStatus=0','PAYMENT_CARD_KILL_SWITCH=false','does not require a code change or deployment','does not require a deployment or a developer','What remains outside the Admin panel']) must(paymentDocs,token,`Payment operator guide missing ${token}`);
reject(paymentDocs,'/api/payments/paytr-callback','Operator guide must not publish the retired PayTR callback path.');
reject(paymentDocs,'PAYMENT_CARD_ENABLED','Operator guide must not require the retired deployment-time card activation switch.');

for (const file of walk('src').filter((file) => /\.(?:ts|html|css)$/.test(file))) {
  const source = read(file);
  for (const secret of ['PAYTR_MERCHANT_KEY','PAYTR_MERCHANT_SALT','IYZICO_SECRET_KEY','IYZICO_SANDBOX_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']) if (source.includes(secret)) failures.push(`${file} must not reference server-only environment secret ${secret}`);
  if (source.includes('service_payment_provider_credentials_v221')) failures.push(`${file} must not read decrypted Vault credentials from browser code.`);
}

const deviceConfig = read('playwright.v205.config.ts');
for (const token of ['android-phone','iphone-webkit','android-landscape-phone','ipad-mini-webkit','android-tablet','desktop-chromium']) must(deviceConfig,token,`Release device matrix missing ${token}`);
const deviceSpec = read('tests/v205/responsive-prestige.spec.ts');
for (const token of ['noHorizontalOverflow','core public routes stay overflow-free across the full device matrix','dock-auto-hidden','aria-hidden','inert','a[href="/account"]','a[href="/appointment"]']) must(deviceSpec,token,`Release browser regression missing ${token}`);

if (failures.length) { console.error('V221 release readiness: FAIL'); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log('V221 release readiness: PASS');
