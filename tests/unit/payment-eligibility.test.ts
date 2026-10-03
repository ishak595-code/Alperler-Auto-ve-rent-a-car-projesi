import { test } from "node:test";
import assert from "node:assert/strict";
import { isCardPayableBooking } from "../../api/_lib/payment-eligibility.ts";

const serverPriced = { server_calculated: true };

test("server-priced rental with a positive total is card-payable", () => {
  assert.equal(isCardPayableBooking({ booking_type: "RENTAL", total_price: 6000, metadata: serverPriced }), true);
});

test("server-priced tour is card-payable, numeric strings included", () => {
  assert.equal(isCardPayableBooking({ booking_type: "TOUR", total_price: "1500.00", metadata: serverPriced }), true);
});

test("tour without the server_calculated stamp is rejected (client-priced legacy path)", () => {
  assert.equal(isCardPayableBooking({ booking_type: "TOUR", total_price: 1, metadata: {} }), false);
  assert.equal(isCardPayableBooking({ booking_type: "TOUR", total_price: 1, metadata: null }), false);
  assert.equal(isCardPayableBooking({ booking_type: "TOUR", total_price: 1, metadata: { server_calculated: "true" } }), false);
});

test("sale inquiries and appointments are never card-payable", () => {
  assert.equal(isCardPayableBooking({ booking_type: "SALE_INQUIRY", total_price: 2_290_000, metadata: serverPriced }), false);
  assert.equal(isCardPayableBooking({ booking_type: "APPOINTMENT", total_price: 500, metadata: serverPriced }), false);
});

test("zero, negative and non-numeric totals are rejected", () => {
  for (const total of [0, -10, null, undefined, "abc", Number.NaN]) {
    assert.equal(isCardPayableBooking({ booking_type: "RENTAL", total_price: total as never, metadata: serverPriced }), false);
  }
});

test("unknown booking types are rejected", () => {
  assert.equal(isCardPayableBooking({ booking_type: "", total_price: 100, metadata: serverPriced }), false);
  assert.equal(isCardPayableBooking({ booking_type: undefined, total_price: 100, metadata: serverPriced }), false);
});
