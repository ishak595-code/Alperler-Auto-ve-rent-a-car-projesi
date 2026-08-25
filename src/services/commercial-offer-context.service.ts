import { Injectable } from "@angular/core";
import { CampaignRecord } from "./campaign.service";

interface CommercialOfferIntent {
  campaignId?: string;
  targetType?: "VEHICLE" | "TOUR";
  targetId?: string;
  endsAt?: string;
  loyaltyPointsToRedeem?: number;
  storedAt: number;
}

@Injectable({ providedIn: "root" })
export class CommercialOfferContextService {
  private readonly storageKey = "alperler_commercial_offer_v166";
  private readonly fallbackTtlMs = 2 * 60 * 60 * 1000;

  activateCampaign(campaign: CampaignRecord): void {
    if (!campaign.id || !campaign.targetId || (campaign.targetType !== "VEHICLE" && campaign.targetType !== "TOUR")) {
      this.clearCampaign();
      return;
    }
    const current = this.read();
    this.write({
      ...current,
      campaignId: campaign.id,
      targetType: campaign.targetType,
      targetId: campaign.targetId,
      endsAt: campaign.endsAt,
      storedAt: Date.now(),
    });
  }

  setLoyaltyPoints(points: number): void {
    const value = Number.isInteger(points) ? Math.max(0, Math.min(100_000_000, points)) : 0;
    const current = this.read();
    this.write({ ...current, loyaltyPointsToRedeem: value, storedAt: Date.now() });
  }

  campaignIdForItem(itemId: string | number | undefined): string | undefined {
    const intent = this.validIntent();
    const candidate = String(itemId ?? "").trim().toLowerCase();
    if (!intent?.campaignId || !intent.targetId || !candidate) return undefined;
    if (intent.targetId.toLowerCase() !== candidate) return undefined;
    return intent.campaignId;
  }

  loyaltyPointsForCheckout(): number | undefined {
    const value = this.validIntent()?.loyaltyPointsToRedeem;
    return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
  }

  clearAfterBooking(itemId?: string | number): void {
    const intent = this.read();
    if (!intent) return;
    const candidate = String(itemId ?? "").trim().toLowerCase();
    const targetMatches = !intent.targetId || !candidate || intent.targetId.toLowerCase() === candidate;
    this.write({
      ...(targetMatches ? {} : intent),
      loyaltyPointsToRedeem: undefined,
      storedAt: Date.now(),
    });
    if (targetMatches) this.clear();
  }

  clearCampaign(): void {
    const current = this.read();
    if (!current) return;
    const { loyaltyPointsToRedeem } = current;
    if (loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
      this.write({ loyaltyPointsToRedeem, storedAt: Date.now() });
    } else {
      this.clear();
    }
  }

  clear(): void {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(this.storageKey);
  }

  private validIntent(): CommercialOfferIntent | null {
    const value = this.read();
    if (!value) return null;
    const now = Date.now();
    const absoluteExpiry = value.endsAt ? new Date(value.endsAt).getTime() : value.storedAt + this.fallbackTtlMs;
    if (!Number.isFinite(absoluteExpiry) || absoluteExpiry <= now || now - value.storedAt > this.fallbackTtlMs) {
      this.clear();
      return null;
    }
    return value;
  }

  private read(): CommercialOfferIntent | null {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as Partial<CommercialOfferIntent>;
      if (!Number.isFinite(Number(value.storedAt))) return null;
      return {
        campaignId: typeof value.campaignId === "string" ? value.campaignId : undefined,
        targetType: value.targetType === "VEHICLE" || value.targetType === "TOUR" ? value.targetType : undefined,
        targetId: typeof value.targetId === "string" ? value.targetId : undefined,
        endsAt: typeof value.endsAt === "string" ? value.endsAt : undefined,
        loyaltyPointsToRedeem: Number.isInteger(value.loyaltyPointsToRedeem) ? Number(value.loyaltyPointsToRedeem) : undefined,
        storedAt: Number(value.storedAt),
      };
    } catch {
      this.clear();
      return null;
    }
  }

  private write(value: CommercialOfferIntent): void {
    if (typeof sessionStorage === "undefined") return;
    const hasValue = Boolean(value.campaignId || (value.loyaltyPointsToRedeem && value.loyaltyPointsToRedeem > 0));
    if (!hasValue) {
      this.clear();
      return;
    }
    sessionStorage.setItem(this.storageKey, JSON.stringify(value));
  }
}
