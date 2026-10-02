#!/usr/bin/env node
/**
 * V255 contract guard.
 *
 * 1. Booking totals are server-authoritative on every create path. A booking total
 *    feeds card payment sessions directly, so the request body must never set it.
 * 2. Card sessions open only for server-priced RENTAL/TOUR bookings.
 * 3. Public read loaders serve legacy Supabase catalogue media through the
 *    same-origin CDN rewrite instead of hitting Supabase Storage per page view.
 */
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const gateway = read("supabase/functions/booking-gateway/index.ts");
for (const forbidden of ["body?.totalPrice", "body?.basePrice", "body?.currency"]) {
  assert(!gateway.includes(forbidden), `booking-gateway must not read ${forbidden} from the request`);
}
for (const required of [
  "catalogCurrency(vehicle.currency)",
  "catalogCurrency(tour.currency)",
  "tour.price_per_person",
  "TOUR_CAPACITY_EXCEEDED",
  "server_calculated: true",
]) {
  assert(gateway.includes(required), `booking-gateway missing server pricing marker: ${required}`);
}

const legacyGateway = read("supabase/functions/booking-gateway-v166/index.ts");
assert(!legacyGateway.includes("Number(body?.totalPrice"), "booking-gateway-v166 must not price from the request body");
assert(!legacyGateway.includes("Number(body?.basePrice"), "booking-gateway-v166 must not price from the request body");

const payments = read("api/payments.ts");
assert(payments.includes('from "./_lib/payment-eligibility.js"'), "payments must import the card eligibility guard");
assert(payments.includes("if(!isCardPayableBooking(bookingRow))"), "card sessions must be gated by isCardPayableBooking");
assert(payments.includes("booking_type") && payments.includes(",metadata&limit=1"), "payment booking lookup must select booking_type and metadata");

const eligibility = read("api/_lib/payment-eligibility.ts");
assert(eligibility.includes('["RENTAL", "TOUR"]'), "only RENTAL and TOUR bookings may be card-payable");
assert(eligibility.includes('meta["server_calculated"] !== true'), "card eligibility must require the server_calculated stamp");

const loaders = [
  "src/services/scalable-public-catalog-v217.service.ts",
  "src/services/campaign.service.ts",
  "src/services/homepage-layout.service.ts",
  "src/services/branch.service.ts",
  "src/services/branch-marketplace-v171.service.ts",
  "src/services/public-detail-data.service.ts",
];
for (const path of loaders) {
  assert(read(path).includes("readPublicCatalogJson"), `${path} must read public catalogue JSON through readPublicCatalogJson`);
}
const vercel = JSON.parse(read("vercel.json"));
assert(
  (vercel.rewrites || []).some((rule) => rule.source === "/catalog-media/:path*"),
  "the /catalog-media CDN rewrite must remain configured",
);
const adminSources = fs.readdirSync("src/pages/admin").map((name) => read(`src/pages/admin/${name}`)).join("\n");
assert(!adminSources.includes("readPublicCatalogJson"), "admin editors must never rewrite stored media URLs");

if (failures.length) {
  console.error("V255 server pricing and media contract: FAIL");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`V255 server pricing and media contract: PASS (${loaders.length} public loaders, 2 booking gateways, card eligibility gate).`);
