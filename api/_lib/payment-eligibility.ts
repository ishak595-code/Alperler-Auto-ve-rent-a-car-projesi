/**
 * V255 card-payment eligibility.
 *
 * A card session charges `bookings.total_price` directly, so only bookings whose
 * total was computed on the server may open one. Rental and tour gateways stamp
 * `metadata.server_calculated = true`; sale inquiries and appointments are never
 * card-payable. This guard holds even if an older Edge Function revision that
 * still trusted client prices is deployed.
 */
export interface PayableBookingShape {
  booking_type: string | null | undefined;
  total_price: number | string | null | undefined;
  metadata: Record<string, unknown> | null | undefined;
}

export const CARD_PAYABLE_BOOKING_TYPES = ["RENTAL", "TOUR"] as const;

export function isCardPayableBooking(row: PayableBookingShape): boolean {
  if (!CARD_PAYABLE_BOOKING_TYPES.includes(String(row.booking_type || "") as (typeof CARD_PAYABLE_BOOKING_TYPES)[number])) {
    return false;
  }
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (meta["server_calculated"] !== true) return false;
  const total = Number(row.total_price);
  return Number.isFinite(total) && total > 0;
}
