import { Injectable, inject } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AnalyticsIdentityService } from "./analytics-identity.service";
import { currentAnalyticsSessionId } from "./analytics-link.util";
import { CommercialOfferContextService } from "./commercial-offer-context.service";
import { CustomerAuthService } from "./customer-auth.service";

export interface TourBookingV170Input {
  itemId: string;
  image?: string;
  startDate: string;
  personCount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  notes?: string;
}

export interface TourBookingV170Result {
  id: string;
  status: string;
  date: string;
  personCount: number;
  totalPrice: number;
  campaignDiscountAmount: number;
  referralDiscountAmount: number;
  loyaltyDiscountAmount: number;
  loyaltyPointsRedeemed: number;
}

@Injectable({ providedIn: "root" })
export class TourBookingV170Service {
  private readonly customerAuth = inject(CustomerAuthService);
  private readonly commercialOffer = inject(CommercialOfferContextService);
  private readonly analyticsIdentity = inject(AnalyticsIdentityService);

  async create(input: TourBookingV170Input): Promise<TourBookingV170Result> {
    const itemId = String(input.itemId || "").trim();
    if (!itemId) throw new Error("INVALID_TOUR:Tur kimliği eksik.");
    const customerEmail = String(input.customerEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new Error("INVALID_EMAIL:Web rezervasyonu için geçerli e-posta adresi zorunludur.");
    }
    const token = await this.customerAuth.getAccessToken().catch(() => null);
    const idempotencyKey = crypto.randomUUID();
    const campaignId = this.commercialOffer.campaignIdForItem(itemId);
    const loyaltyPointsToRedeem = this.commercialOffer.loyaltyPointsForCheckout();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/tour-booking-v170`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "content-type": "application/json",
        "x-request-id": crypto.randomUUID(),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        type: "TOUR",
        itemId,
        image: input.image,
        startDate: input.startDate,
        personCount: input.personCount,
        customerName: input.customerName,
        customerEmail,
        customerPhone: input.customerPhone,
        notes: input.notes,
        campaignId,
        loyaltyPointsToRedeem,
        idempotencyKey,
        analyticsSessionId: currentAnalyticsSessionId(),
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as {
      ok?: boolean;
      booking?: TourBookingV170Result;
      code?: string;
      message?: string;
    };
    if (!response.ok || payload.ok !== true || !payload.booking) {
      throw new Error(`${payload.code || "TOUR_BOOKING_FAILED"}:${payload.message || "Rezervasyon talebi kaydedilemedi."}`);
    }
    this.commercialOffer.clearAfterBooking(itemId);
    void this.analyticsIdentity.link({
      entityType: "BOOKING",
      reference: payload.booking.id,
      phone: input.customerPhone,
      email: customerEmail,
    });
    return payload.booking;
  }
}
