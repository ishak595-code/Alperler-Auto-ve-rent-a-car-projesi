import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V163.2 invariant failed: ${message}`); };
const all = (source, needles, label) => { for (const needle of needles) assert(source.includes(needle), `${label} missing ${needle}`); };

const checkout = read('src/pages/booking-checkout.component.ts');
all(checkout, [
  'interface LocationChoice { key: string; label: string; branchId?: string; }',
  'pickupBranchId:this.isRental()?this.selectedPickupBranchId():undefined',
  'dropoffBranchId:this.isRental()?this.selectedDropoffBranchId():undefined',
  'selectedPickupBranchId()',
  'selectedDropoffBranchId()',
  'Talebinizi yine de gönderebilirsiniz',
  'role="radiogroup"',
  'role="radio"',
  '[attr.aria-checked]',
], 'checkout');

const planStart = checkout.indexOf('continueFromPlan():void');
const contactStart = checkout.indexOf('continueFromContact():void', planStart);
const plan = checkout.slice(planStart, contactStart);
assert(planStart >= 0 && contactStart > planStart, 'checkout planning method must exist');
assert(!plan.includes('if(!this.selectedPeriodAvailable())'), 'client-side bookedDates may advise but must never block a PENDING request');

const submitStart = checkout.indexOf('async submit():Promise<void>');
const submitEnd = checkout.indexOf('goBack():void', submitStart);
const submit = checkout.slice(submitStart, submitEnd);
assert(submitStart >= 0 && submitEnd > submitStart, 'checkout submit method must exist');
assert(!submit.includes('if(!this.selectedPeriodAvailable())'), 'submit must not reject a customer request from stale client availability data');

const model = read('src/models/booking.model.ts');
all(model, ['pickupBranchId?: string;', 'dropoffBranchId?: string;'], 'booking model');

const bookingService = read('src/services/booking.service.ts');
all(bookingService, [
  'pickupBranchId:this.optionalUuid(input.pickupBranchId)',
  'dropoffBranchId:this.optionalUuid(input.dropoffBranchId)',
  'wallClockValue',
  '/api/bookings',
], 'booking service');
assert(!bookingService.includes('reserveRentalHold'), 'PENDING customer request must not reserve inventory');
assert(!bookingService.includes('/functions/v1/booking-gateway'), 'browser booking writes must remain behind same-origin BFF');

const gateway = read('supabase/functions/booking-gateway/index.ts');
all(gateway, [
  'rpc/evaluate_rental_request_v2',
  'p_pickup_branch_id: pickupBranchId || null',
  'operationalBranch(pickupBranchInput, "pickup")',
  'operationalBranch(dropoffBranchInput, "dropoff")',
  'dropoff_branch_id: dropoffBranchId',
  'branch_timezone: String(evaluation.branchTimezone',
  'CONFLICT_AT_REQUEST',
  'Customer submissions are requests, not inventory reservations',
  'DIRECT_BROWSER_ACCESS_DENIED',
], 'booking gateway');
assert(!gateway.includes('admin_users?email=eq.'), 'admin authorization must remain UUID-bound');

const migration = read('supabase/migrations/20260825114500_v1632_pickup_branch_timezone_contract.sql');
all(migration, [
  'public.evaluate_rental_request_v2',
  'p_pickup_branch_id uuid default null',
  "b.public_status = 'ACTIVE'",
  'b.is_pickup_point = true',
  'INVALID_PICKUP_BRANCH',
  'p_start_local at time zone v_timezone',
  'private.rental_has_approved_overlap',
  "to service_role",
], 'V163.2 database contract');
assert(!migration.includes('booking_holds'), 'V163.2 must not reintroduce checkout holds');

const availability = read('supabase/functions/rental-availability/index.ts');
all(availability, [
  'DIRECT_BROWSER_ACCESS_DENIED',
  'rpc/evaluate_rental_request_v2',
  'p_pickup_branch_id: pickupBranchId || null',
  'advisoryOnly: true',
], 'availability edge');
assert(!availability.includes('reserve_rental_hold'), 'availability edge must remain read-only');

const adminReservations = read('src/pages/admin/admin-reservations.component.ts');
all(adminReservations, [
  "updateStatus(res.id, 'APPROVED'",
  'bookingService.offerAlternative',
  'impact.conflictCount>0',
  "res.status === 'PENDING'",
], 'admin reservations');

const adminBranches = read('src/pages/admin/admin-branches.component.ts');
all(adminBranches, ['Saat Dilimi', 'draft.timezone', 'Europe/Istanbul'], 'admin branch timezone controls');

const technical = read('src/data/technical-specs.data.ts');
all(technical, ["fetch('/api/catalog?resource=vehicles'", 'technicalSpecs'], 'dynamic technical specs');
assert(!technical.includes('CAR_SPECS_DB'), 'static make/model technical spec database must stay removed');

const requestBoundary = read('api/_lib/request-security.ts');
all(requestBoundary, ['originDecision', 'guardOrigin', 'x-request-id', 'access-control-allow-origin'], 'BFF request boundary');

console.log('V163.2 reservation, branch-timezone, admin and dynamic-data integration invariants are satisfied.');
