import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`V163 invariant failed: ${message}`);
};
const includesAll = (content, needles, label) => {
  for (const needle of needles) assert(content.includes(needle), `${label} is missing ${needle}`);
};

const migration = read('supabase/migrations/20260825054500_v163_production_security_data_integrity.sql');
includesAll(migration, [
  'add column if not exists timezone text',
  'private.is_valid_timezone',
  'create table if not exists public.booking_holds',
  'booking_holds_no_active_overlap',
  'pg_advisory_xact_lock',
  'public.reserve_rental_hold',
  "status in ('ACTIVE','CONVERTED','EXPIRED','RELEASED')",
  'bookings_hold_guard_before_insert',
  'bookings_hold_convert_after_insert',
  'admin_users_sync_auth_identity',
  'customer_documents_mime_type_v163_chk',
  'customer_documents_file_size_v163_chk',
  'add column if not exists request_id text',
], 'database migration');

const pathFix = read('supabase/migrations/20260825054600_v163_customer_document_path_constraint_fix.sql');
assert(pathFix.includes("/[0-9a-fA-F-]{36}\\.(jpg|png|webp|pdf)$"), 'document path regex must match a literal extension separator');

const booking = read('src/services/booking.service.ts');
includesAll(booking, [
  'reserveRentalHold',
  '/api/rental-availability',
  'idempotencyKey',
  'branchTimezone',
  'hold.startAt',
  'hold.endAt',
], 'booking client');

const adminAccess = read('src/services/admin-access.service.ts');
assert(adminAccess.includes('admin_users?user_id=eq.'), 'admin authorization must be UUID-bound');
assert(!adminAccess.includes('admin_users?email=eq.'), 'admin authorization must not use mutable email lookup');
assert(adminAccess.includes('return "support"'), 'unknown admin roles must fail closed');

const wallet = read('src/services/customer-wallet.service.ts');
includesAll(wallet, [
  'detectFileSignature',
  'DOCUMENT_SIGNATURE_INVALID',
  '0xff,0xd8,0xff',
  '0x89,0x50,0x4e,0x47',
  "return'application/pdf'",
  "return'image/webp'",
], 'customer document vault');

const requestSecurity = read('api/_lib/request-security.ts');
includesAll(requestSecurity, [
  'originDecision',
  'requestId',
  'guardOrigin',
  'access-control-allow-origin',
  'vary',
], 'request security boundary');

const bookingApi = read('api/bookings.ts');
includesAll(bookingApi, [
  'guardOrigin',
  'x-request-id',
  'x-upstream-request-id',
  'clientIp(request)',
], 'booking BFF');

const availabilityApi = read('api/rental-availability.ts');
includesAll(availabilityApi, [
  'guardOrigin',
  'x-request-id',
  '/functions/v1/rental-availability',
], 'rental availability BFF');

const availabilityEdge = read('supabase/functions/rental-availability/index.ts');
includesAll(availabilityEdge, [
  'DIRECT_BROWSER_ACCESS_DENIED',
  'p_start_local',
  'p_end_local',
  'rpc/reserve_rental_hold',
  'branchTimezone',
  'rental_hold_minute',
], 'rental availability edge function');

const branchModel = read('src/models/branch.model.ts');
const branchService = read('src/services/branch.service.ts');
const branchApi = read('api/branches.ts');
assert(branchModel.includes('timezone?: string'), 'branch model must expose timezone');
assert(branchService.includes('Europe/Istanbul'), 'branch service must provide a safe local timezone default');
assert(branchApi.includes('timezone:'), 'branch API must persist timezone');

const vercel = JSON.parse(read('vercel.json'));
const globalHeaders = vercel.headers?.find((rule) => rule.source === '/(.*)')?.headers || [];
const csp = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value || '';
includesAll(csp, [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
], 'content security policy');

console.log('V163 production security and data-integrity invariants are satisfied.');
