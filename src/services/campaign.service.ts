import { Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export type CampaignIntent = "WEDDING" | "RENTAL" | "SALE" | "TOUR" | "GENERAL";

export interface CampaignRecord {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  badge?: string;
  campaignType: "DISCOUNT" | "PRICE" | "BUNDLE" | "SEASONAL" | "CUSTOM";
  coverImage?: string;
  oldPrice?: number;
  newPrice?: number;
  discountPercent?: number;
  targetType?: "VEHICLE" | "TOUR" | "GENERAL";
  targetId?: string;
  ctaLabel: string;
  ctaUrl?: string;
  whatsappMessage?: string;
  startsAt?: string;
  endsAt?: string;
  publicationStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

@Injectable({ providedIn: "root" })
export class CampaignService {
  private readonly auth = inject(AuthService);
  private readonly _campaigns = signal<CampaignRecord[]>([]);
  readonly campaigns = this._campaigns.asReadonly();

  async loadPublic(at = new Date()): Promise<CampaignRecord[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?is_active=eq.true&publication_status=eq.PUBLISHED&select=*&order=sort_order.asc,created_at.desc`, {
      headers: this.publicHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_PUBLIC_${response.status}`);
    const now = at.getTime();
    return ((await response.json()) as any[])
      .map((row) => this.fromRow(row))
      .filter((campaign) => this.isLive(campaign, now))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  isLive(campaign: CampaignRecord, at: number | Date = Date.now()): boolean {
    const now = at instanceof Date ? at.getTime() : at;
    if (!campaign.isActive || campaign.publicationStatus !== "PUBLISHED") return false;
    const start = campaign.startsAt ? Date.parse(campaign.startsAt) : Number.NEGATIVE_INFINITY;
    const end = campaign.endsAt ? Date.parse(campaign.endsAt) : Number.POSITIVE_INFINITY;
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return start <= now && end > now;
  }

  intentOf(campaign: CampaignRecord): CampaignIntent {
    const value = String(campaign.metadata?.["intent"] || "").toUpperCase();
    if (value === "WEDDING" || value === "RENTAL" || value === "SALE" || value === "TOUR") return value;
    if (campaign.targetType === "TOUR") return "TOUR";
    return "GENERAL";
  }

  remainingMs(campaign: CampaignRecord, at = Date.now()): number | null {
    if (!campaign.endsAt) return null;
    const end = Date.parse(campaign.endsAt);
    if (Number.isNaN(end)) return null;
    return Math.max(0, end - at);
  }

  hasRealDiscount(campaign: Pick<CampaignRecord, "oldPrice" | "newPrice">): boolean {
    return typeof campaign.oldPrice === "number" && typeof campaign.newPrice === "number" && campaign.oldPrice > campaign.newPrice && campaign.newPrice >= 0;
  }

  discountPercentOf(campaign: Pick<CampaignRecord, "oldPrice" | "newPrice">): number | undefined {
    if (!this.hasRealDiscount(campaign)) return undefined;
    return Math.max(1, Math.min(99, Math.round(((campaign.oldPrice! - campaign.newPrice!) / campaign.oldPrice!) * 100)));
  }

  savingsAmountOf(campaign: Pick<CampaignRecord, "oldPrice" | "newPrice">): number | undefined {
    if (!this.hasRealDiscount(campaign)) return undefined;
    return Math.max(0, campaign.oldPrice! - campaign.newPrice!);
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?select=*&order=sort_order.asc,created_at.desc`, {
      headers: this.authHeaders(token),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_ADMIN_${response.status}`);
    this._campaigns.set(((await response.json()) as any[]).map((row) => this.fromRow(row)));
  }

  async save(input: Partial<CampaignRecord> & Pick<CampaignRecord, "title" | "campaignType" | "ctaLabel" | "publicationStatus">): Promise<CampaignRecord> {
    const token = await this.requiredToken();
    const startMs = input.startsAt ? Date.parse(input.startsAt) : Number.NaN;
    const endMs = input.endsAt ? Date.parse(input.endsAt) : Number.NaN;
    if (input.startsAt && Number.isNaN(startMs)) throw new Error("Geçerli bir kampanya başlangıç tarihi girin.");
    if (input.endsAt && Number.isNaN(endMs)) throw new Error("Geçerli bir kampanya bitiş tarihi girin.");
    if (input.startsAt && input.endsAt && endMs <= startMs) throw new Error("Kampanya bitiş tarihi başlangıç tarihinden sonra olmalıdır.");

    const oldPrice = input.oldPrice == null ? undefined : Number(input.oldPrice);
    const newPrice = input.newPrice == null ? undefined : Number(input.newPrice);
    if (oldPrice != null && (!Number.isFinite(oldPrice) || oldPrice < 0)) throw new Error("Eski fiyat geçerli bir tutar olmalıdır.");
    if (newPrice != null && (!Number.isFinite(newPrice) || newPrice < 0)) throw new Error("Kampanya fiyatı geçerli bir tutar olmalıdır.");
    const computedDiscount = this.discountPercentOf({ oldPrice, newPrice });

    const body = {
      title: input.title.trim(),
      slug: (input.slug || this.slugify(input.title)).trim(),
      short_description: input.shortDescription?.trim() || null,
      description: input.description?.trim() || null,
      badge: input.badge?.trim() || null,
      campaign_type: input.campaignType,
      cover_image: input.coverImage?.trim() || null,
      old_price: oldPrice ?? null,
      new_price: newPrice ?? null,
      discount_percent: computedDiscount ?? null,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      cta_label: input.ctaLabel.trim() || "Detayları Gör",
      cta_url: input.ctaUrl?.trim() || null,
      whatsapp_message: input.whatsappMessage?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      publication_status: input.publicationStatus,
      is_active: input.isActive !== false,
      sort_order: input.sortOrder ?? 0,
      metadata: input.metadata || {},
      updated_at: new Date().toISOString(),
    };
    const isUpdate = Boolean(input.id);
    const url = isUpdate
      ? `${SUPABASE_PROJECT_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(input.id!)}&select=*`
      : `${SUPABASE_PROJECT_URL}/rest/v1/campaigns?select=*`;
    const response = await fetch(url, {
      method: isUpdate ? "PATCH" : "POST",
      headers: { ...this.authHeaders(token), Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(String(payload?.message || payload?.code || `CAMPAIGN_SAVE_${response.status}`));
    }
    const saved = this.fromRow(((await response.json()) as any[])[0]);
    await this.refreshAdmin();
    await this.syncHomepageBanner(token);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this.authHeaders(token),
    });
    if (!response.ok) throw new Error(`CAMPAIGN_DELETE_${response.status}`);
    await this.refreshAdmin();
    await this.syncHomepageBanner(token);
  }

  async reorder(ids: string[]): Promise<void> {
    const token = await this.requiredToken();
    await Promise.all(ids.map((id, index) => fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: this.authHeaders(token),
      body: JSON.stringify({ sort_order: index + 1, updated_at: new Date().toISOString() }),
    }).then((response) => {
      if (!response.ok) throw new Error(`CAMPAIGN_REORDER_${response.status}`);
    })));
    await this.refreshAdmin();
    await this.syncHomepageBanner(token);
  }

  private async syncHomepageBanner(token: string): Promise<void> {
    const primary = [...this._campaigns()]
      .filter((item) => this.isLive(item))
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];

    const currentResponse = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/site_config?key=eq.site_settings&select=value&limit=1`, {
      headers: this.authHeaders(token),
      cache: "no-store",
    });
    if (!currentResponse.ok) throw new Error(`SITE_CONFIG_CAMPAIGN_READ_${currentResponse.status}`);
    const currentRows = (await currentResponse.json()) as Array<{ value?: Record<string, unknown> }>;
    const current = currentRows[0]?.value && typeof currentRows[0].value === "object" ? currentRows[0].value : {};
    const currentHome = current["homeContent"] && typeof current["homeContent"] === "object" ? current["homeContent"] as Record<string, unknown> : {};
    const realDiscount = primary ? this.discountPercentOf(primary) : undefined;

    const banner = primary ? {
      campaignBannerBadge: primary.badge || (realDiscount != null ? `%${realDiscount} İNDİRİM` : "KAMPANYA"),
      campaignBannerTitle: primary.title,
      campaignBannerSubtitle: primary.shortDescription || primary.description || "",
      campaignBannerButtonText: primary.ctaLabel || "Kampanyayı İncele",
      campaignBannerImage: primary.coverImage || "",
      campaignBannerUrl: primary.ctaUrl || "",
      campaignBannerWhatsappMessage: primary.whatsappMessage || "",
      campaignId: primary.id,
    } : {
      campaignBannerBadge: "",
      campaignBannerTitle: "",
      campaignBannerSubtitle: "",
      campaignBannerButtonText: "",
      campaignBannerImage: "",
      campaignBannerUrl: "",
      campaignBannerWhatsappMessage: "",
      campaignId: null,
    };

    const value = { ...current, homeContent: { ...currentHome, ...banner } };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/site_config?on_conflict=key`, {
      method: "POST",
      headers: { ...this.authHeaders(token), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: "site_settings", value, is_public: true, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`SITE_CONFIG_CAMPAIGN_SAVE_${response.status}`);
  }

  private fromRow(row: any): CampaignRecord {
    const oldPrice = row.old_price == null ? undefined : Number(row.old_price);
    const newPrice = row.new_price == null ? undefined : Number(row.new_price);
    const computedDiscount = this.discountPercentOf({ oldPrice, newPrice });
    return {
      id: String(row.id),
      title: String(row.title || ""),
      slug: String(row.slug || ""),
      shortDescription: row.short_description || undefined,
      description: row.description || undefined,
      badge: row.badge || undefined,
      campaignType: row.campaign_type || "CUSTOM",
      coverImage: row.cover_image || undefined,
      oldPrice,
      newPrice,
      discountPercent: computedDiscount,
      targetType: row.target_type || undefined,
      targetId: row.target_id || undefined,
      ctaLabel: String(row.cta_label || "Detayları Gör"),
      ctaUrl: row.cta_url || undefined,
      whatsappMessage: row.whatsapp_message || undefined,
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      publicationStatus: row.publication_status || "DRAFT",
      isActive: row.is_active !== false,
      sortOrder: Number(row.sort_order || 0),
      metadata: row.metadata || {},
    };
  }

  private slugify(value: string): string {
    return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100) || `kampanya-${Date.now()}`;
  }

  private publicHeaders(): Record<string,string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` };
  }

  private authHeaders(token: string): Record<string,string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
