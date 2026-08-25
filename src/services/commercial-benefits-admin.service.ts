import { Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export interface CommercialBenefitsSettings {
  enabled: boolean;
  pointsPerRentalDay: number;
  minimumPointsPerRental: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
  redemptionEnabled: boolean;
  pointValueTry: number;
  minimumRedeemPoints: number;
  maxRedeemPercent: number;
  referralCheckoutDiscountEnabled: boolean;
  referralCheckoutDiscountMode: "FIXED_AMOUNT" | "PERCENT";
  referralRentalInviteeDiscount: number;
  referralSaleInviteeDiscount: number;
  referralTourInviteeDiscount: number;
  allowCampaignReferralStack: boolean;
  allowCampaignLoyaltyStack: boolean;
  allowReferralLoyaltyStack: boolean;
  referralRentalInviterPoints: number;
  referralRentalInviteePoints: number;
  referralSaleInviterPoints: number;
  referralSaleInviteePoints: number;
  referralTourInviterPoints: number;
  referralTourInviteePoints: number;
  tourPointsPer100Try: number;
  salePointsPer1000Try: number;
}

@Injectable({ providedIn: "root" })
export class CommercialBenefitsAdminService {
  private readonly auth = inject(AuthService);
  private readonly _settings = signal<CommercialBenefitsSettings | null>(null);
  readonly settings = this._settings.asReadonly();

  async refresh(): Promise<CommercialBenefitsSettings> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/loyalty_program_settings?id=eq.true&select=*&limit=1`, {
      headers: this.headers(token),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`COMMERCIAL_SETTINGS_READ_${response.status}`);
    const rows = await response.json() as any[];
    if (!rows[0]) throw new Error("COMMERCIAL_SETTINGS_NOT_FOUND");
    const value = this.fromRow(rows[0]);
    this._settings.set(value);
    return value;
  }

  async save(input: CommercialBenefitsSettings): Promise<CommercialBenefitsSettings> {
    const token = await this.requiredToken();
    const body = {
      enabled: Boolean(input.enabled),
      points_per_rental_day: this.integer(input.pointsPerRentalDay, 1, 100000),
      minimum_points_per_rental: this.integer(input.minimumPointsPerRental, 0, 1000000),
      silver_threshold: this.integer(input.silverThreshold, 0, 100000000),
      gold_threshold: this.integer(input.goldThreshold, input.silverThreshold, 100000000),
      platinum_threshold: this.integer(input.platinumThreshold, input.goldThreshold, 100000000),
      redemption_enabled: Boolean(input.redemptionEnabled),
      point_value_try: this.amount(input.pointValueTry, 0, 1000, 4),
      minimum_redeem_points: this.integer(input.minimumRedeemPoints, 0, 100000000),
      max_redeem_percent: this.amount(input.maxRedeemPercent, 0, 100, 2),
      referral_checkout_discount_enabled: Boolean(input.referralCheckoutDiscountEnabled),
      referral_checkout_discount_mode: input.referralCheckoutDiscountMode === "PERCENT" ? "PERCENT" : "FIXED_AMOUNT",
      referral_rental_invitee_discount: this.amount(input.referralRentalInviteeDiscount, 0, 50000000),
      referral_sale_invitee_discount: this.amount(input.referralSaleInviteeDiscount, 0, 50000000),
      referral_tour_invitee_discount: this.amount(input.referralTourInviteeDiscount, 0, 50000000),
      allow_campaign_referral_stack: Boolean(input.allowCampaignReferralStack),
      allow_campaign_loyalty_stack: Boolean(input.allowCampaignLoyaltyStack),
      allow_referral_loyalty_stack: Boolean(input.allowReferralLoyaltyStack),
      referral_rental_inviter_points: this.integer(input.referralRentalInviterPoints, 0, 1000000),
      referral_rental_invitee_points: this.integer(input.referralRentalInviteePoints, 0, 1000000),
      referral_sale_inviter_points: this.integer(input.referralSaleInviterPoints, 0, 1000000),
      referral_sale_invitee_points: this.integer(input.referralSaleInviteePoints, 0, 1000000),
      referral_tour_inviter_points: this.integer(input.referralTourInviterPoints, 0, 1000000),
      referral_tour_invitee_points: this.integer(input.referralTourInviteePoints, 0, 1000000),
      tour_points_per_100_try: this.integer(input.tourPointsPer100Try, 0, 100000),
      sale_points_per_1000_try: this.integer(input.salePointsPer1000Try, 0, 100000),
      updated_at: new Date().toISOString(),
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/loyalty_program_settings?id=eq.true&select=*`, {
      method: "PATCH",
      headers: { ...this.headers(token), Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(String(payload?.message || payload?.code || `COMMERCIAL_SETTINGS_SAVE_${response.status}`));
    }
    const rows = await response.json() as any[];
    const saved = this.fromRow(rows[0]);
    this._settings.set(saved);
    return saved;
  }

  private fromRow(row: any): CommercialBenefitsSettings {
    return {
      enabled: row.enabled !== false,
      pointsPerRentalDay: Number(row.points_per_rental_day || 100),
      minimumPointsPerRental: Number(row.minimum_points_per_rental || 0),
      silverThreshold: Number(row.silver_threshold || 1000),
      goldThreshold: Number(row.gold_threshold || 3000),
      platinumThreshold: Number(row.platinum_threshold || 7000),
      redemptionEnabled: row.redemption_enabled !== false,
      pointValueTry: Number(row.point_value_try ?? 0.1),
      minimumRedeemPoints: Number(row.minimum_redeem_points || 100),
      maxRedeemPercent: Number(row.max_redeem_percent ?? 20),
      referralCheckoutDiscountEnabled: row.referral_checkout_discount_enabled !== false,
      referralCheckoutDiscountMode: row.referral_checkout_discount_mode === "PERCENT" ? "PERCENT" : "FIXED_AMOUNT",
      referralRentalInviteeDiscount: Number(row.referral_rental_invitee_discount || 0),
      referralSaleInviteeDiscount: Number(row.referral_sale_invitee_discount || 0),
      referralTourInviteeDiscount: Number(row.referral_tour_invitee_discount || 0),
      allowCampaignReferralStack: row.allow_campaign_referral_stack !== false,
      allowCampaignLoyaltyStack: row.allow_campaign_loyalty_stack !== false,
      allowReferralLoyaltyStack: row.allow_referral_loyalty_stack === true,
      referralRentalInviterPoints: Number(row.referral_rental_inviter_points || 0),
      referralRentalInviteePoints: Number(row.referral_rental_invitee_points || 0),
      referralSaleInviterPoints: Number(row.referral_sale_inviter_points || 0),
      referralSaleInviteePoints: Number(row.referral_sale_invitee_points || 0),
      referralTourInviterPoints: Number(row.referral_tour_inviter_points || 0),
      referralTourInviteePoints: Number(row.referral_tour_invitee_points || 0),
      tourPointsPer100Try: Number(row.tour_points_per_100_try || 0),
      salePointsPer1000Try: Number(row.sale_points_per_1000_try || 0),
    };
  }

  private amount(value: number, min: number, max: number, decimals = 2): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error("COMMERCIAL_AMOUNT_INVALID");
    const factor = 10 ** decimals;
    return Math.round(parsed * factor) / factor;
  }

  private integer(value: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error("COMMERCIAL_INTEGER_INVALID");
    return parsed;
  }

  private headers(token: string): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
