import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, needle, message) => {
  if (!source.includes(needle)) throw new Error(message || `Missing V200 contract: ${needle}`);
};
const mustNot = (source, needle, message) => {
  if (source.includes(needle)) throw new Error(message || `Forbidden V200 contract: ${needle}`);
};

const canonicalAdminPath = 'src/pages/admin/admin-campaigns-v167.component.ts';
const staleAdminPath = 'src/pages/admin/admin-campaigns.component.ts';
const mediaPath = 'src/services/admin-media.service.ts';
const bookingGatewayPath = 'supabase/functions/booking-gateway-v166/index.ts';
const paymentsPath = 'api/payments.ts';
const pricingMigrationPath = 'supabase/migrations/20260827211410_v2003_campaign_draft_price_flexibility.sql';
const gcMigrationPath = 'supabase/migrations/20260827210236_v2001_campaign_media_binding_gc.sql';
const routePath = 'src/pages/admin/admin-content-hub.component.ts';

for (const path of [canonicalAdminPath, mediaPath, bookingGatewayPath, paymentsPath, pricingMigrationPath, gcMigrationPath, routePath]) {
  if (!fs.existsSync(path)) throw new Error(`Required V200 file missing: ${path}`);
}
if (fs.existsSync(staleAdminPath)) throw new Error('Stale alternate campaign admin must remain deleted.');

const admin = read(canonicalAdminPath);
for (const contract of [
  "this.persist(previousStatus, false, true, previousStep)",
  "pricingReferenceError(): string",
  "pricingVersion: 'V200'",
  "targets(): CampaignTargetOption[]",
  "status === 'PUBLISHED' ? true",
  "Yüklenen ama kampanya kaydına bağlanamayan dosyalar",
]) must(admin, contract, `Canonical campaign admin missing contract: ${contract}`);
mustNot(admin, "await this.saveAs('DRAFT',false)", 'Campaign cover upload must never force an existing campaign back to DRAFT.');

const media = read(mediaPath);
for (const contract of [
  'tusThreshold = 6 * 1024 * 1024',
  'tusChunkSize = 6 * 1024 * 1024',
  '/storage/v1/upload/resumable',
  '.storage.supabase.co',
  "'x-upsert': 'false'",
  "bindingState: String(entityType || '').toUpperCase() === 'CAMPAIGN'",
  'crypto.randomUUID()',
]) must(media, contract, `Admin media upload missing resilient contract: ${contract}`);

const gateway = read(bookingGatewayPath);
for (const contract of [
  'rpc/reserve_booking_commercial_offer',
  'p_booking_id:saved.id',
  'p_campaign_id:requestedCampaign||null',
  'p_requested_loyalty_points:requestedLoyaltyPoints',
  'p_normal_subtotal:normalSubtotal',
  'p_quantity:quantity',
  'p_extras_total:extrasTotal',
  'p_route_fuel_total:route.fuel',
  'method:"DELETE"',
  'bookings?id=eq.${encodeURIComponent(saved.id)}&select=*',
]) must(gateway, contract, `Booking campaign pricing contract missing: ${contract}`);

const payments = read(paymentsPath);
for (const contract of [
  'total_price: number | null',
  'const amount = calculateCharge(Number(bookingRow.total_price), settings);',
  'const paymentAmount = Math.round(amount * 100);',
  'amount, currency: bookingRow.currency',
]) must(payments, contract, `Payment gateway must charge authoritative booking total: ${contract}`);
mustNot(payments, 'calculateCharge(Number(body.amount)', 'Client supplied amount must never determine payment charge.');

const pricingMigration = read(pricingMigrationPath);
for (const contract of [
  'campaigns_display_price_matches_authoritative_v2003',
  "publication_status not in ('PUBLISHED','SCHEDULED')",
  "discount_method = 'FIXED_PRICE'",
  "discount_method = 'FIXED_AMOUNT' and discount_scope = 'ORDER'",
  "discount_method = 'PERCENT'",
  'validate constraint campaigns_display_price_matches_authoritative_v2003',
]) must(pricingMigration.toLowerCase(), contract.toLowerCase(), `Campaign display/charge truth constraint missing: ${contract}`);

const gcMigration = read(gcMigrationPath);
for (const contract of [
  "'bindingState', 'BOUND'",
  'purge_unbound_campaign_media_v200',
  "'v200_campaign_media_gc'",
  "'*/10 * * * *'",
  "interval '30 minutes'",
  'drop function if exists public.service_rollback_campaign_media_asset_v200',
]) must(gcMigration, contract, `Campaign media lifecycle contract missing: ${contract}`);

const route = read(routePath);
for (const contract of [
  'AdminCampaignsV167Component',
  'Ortak galeri kullanılmaz',
]) must(route, contract, `Campaign admin ownership route missing: ${contract}`);

console.log('V200 campaign price/media/payment integrity: PASS');
