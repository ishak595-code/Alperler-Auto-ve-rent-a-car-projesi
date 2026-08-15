import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";
import { PublicContentRealtimeService } from "./public-content-realtime.service";

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
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _campaigns = signal<CampaignRecord[]>([]);
  private readonly _publicCampaigns = signal<CampaignRecord[]>([]);
  private publicRefreshTimer?: number;

  readonly campaigns = this._campaigns.asReadonly();
  readonly publicCampaigns = this._publicCampaigns.asReadonly();
  readonly realtimeState = this.realtime.state;

  constructor() {
    const unwatch = this.realtime.watch(["campaigns"], () => this.queuePublicRefresh());
    this.destroyRef.onDestroy(unwatch);

    if (typeof window !== "undefined") {
      const timer = window.setInterval(() => this.queuePublicRefresh(0), 60_000);
      const onVisibility = () => {
        if (document.visibilityState === "visible") this.queuePublicRefresh(0);
      };
      document.addEventListener("visibilitychange", onVisibility);
      this.destroyRef.onDestroy(() => {
        window.clearInterval(timer);
        if (this.publicRefreshTimer !== undefined) window.clearTimeout(this.publicRefreshTimer);
        document.removeEventListener("visibilitychange", onVisibility);
      });
    }
  }

  async loadPublic(): Promise<CampaignRecord[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?is_active=eq.true&publication_status=eq.PUBLISHED&select=*&order=sort_order.asc,created_at.desc&fresh=${Date.now()}`, {
      headers: { ...this.publicHeaders(), "cache-control": "no-cache" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_PUBLIC_${response.status}`);
    const records = ((await response.json()) as any[]).map((row) => this.fromRow(row));
    this._publicCampaigns.set(records);
    return records;
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
    const existing = input.id ? this._campaigns().find((row) => row.id === input.id) : undefined;
    const body = {
      title: input.title.trim(),
      slug: (input.slug || existing?.slug || this.slugify(input.title)).trim(),
      short_description: input.shortDescription?.trim() || null,
      description: input.description?.trim() || null,
      badge: input.badge?.trim() || null,
      campaign_type: input.campaignType,
      cover_image: input.coverImage?.trim() || null,
      old_price: input.oldPrice ?? null,
      new_price: input.newPrice ?? null,
      discount_percent: input.discountPercent ?? null,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      cta_label: input.ctaLabel.trim() || "Fırsatı İncele",
      cta_url: input.ctaUrl?.trim() || null,
      whatsapp_message: input.whatsappMessage?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      publication_status: input.publicationStatus,
      is_active: input.isActive !== false,
      sort_order: input.sortOrder ?? existing?.sortOrder ?? this._campaigns().length + 1,
      metadata: input.metadata ?? existing?.metadata ?? {},
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
    await this.syncHomepageCampaigns(token);
    await this.loadPublic();
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
    await this.syncHomepageCampaigns(token);
    await this.loadPublic();
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
    await this.syncHomepageCampaigns(token);
    await this.loadPublic();
  }

  private queuePublicRefresh(delay = 120): void {
    if (typeof window === "undefined") {
      void this.loadPublic().catch(() => undefined);
      return;
    }
    if (this.publicRefreshTimer !== undefined) window.clearTimeout(this.publicRefreshTimer);
    this.publicRefreshTimer = window.setTimeout(() => {
      this.publicRefreshTimer = undefined;
      void this.loadPublic().catch((error) => console.info("Campaign realtime refresh deferred.", error));
    }, delay);
  }

  private async syncHomepageCampaigns(token: string): Promise<void> {
    const ordered = [...this._campaigns()]
      .filter((item) => item.isActive && item.publicationStatus === "PUBLISHED")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const clearPlacements = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/homepage_placements?section_key=eq.campaigns&entity_type=eq.CAMPAIGN`, {
      method: "DELETE",
      headers: this.authHeaders(token),
    });
    if (!clearPlacements.ok) throw new Error(`CAMPAIGN_PLACEMENTS_CLEAR_${clearPlacements.status}`);

    if (ordered.length) {
      const placementResponse = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/homepage_placements`, {
        method: "POST",
        headers: { ...this.authHeaders(token), Prefer: "return=minimal" },
        body: JSON.stringify(ordered.map((item, index) => ({
          section_key: "campaigns",
          entity_type: "CAMPAIGN",
          entity_id: item.id,
          label: item.badge || item.title,
          sort_order: index + 1,
          is_active: true,
          starts_at: item.startsAt || null,
          ends_at: item.endsAt || null,
          metadata: { managedBy: "admin_campaigns" },
        }))),
      });
      if (!placementResponse.ok) throw new Error(`CAMPAIGN_PLACEMENTS_SAVE_${placementResponse.status}`);
    }

    const sectionResponse = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/homepage_sections?section_key=eq.campaigns`, {
      method: "PATCH",
      headers: this.authHeaders(token),
      body: JSON.stringify({ is_enabled: true, max_items: 3, updated_at: new Date().toISOString() }),
    });
    if (!sectionResponse.ok) throw new Error(`CAMPAIGN_SECTION_SAVE_${sectionResponse.status}`);

    await this.syncHomepageBanner(token, ordered[0]);
  }

  private async syncHomepageBanner(token: string, primary?: CampaignRecord): Promise<void> {
    const currentResponse = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/site_config?key=eq.site_settings&select=value&limit=1`, {
      headers: this.authHeaders(token),
    });
    if (!currentResponse.ok) throw new Error(`SITE_CONFIG_CAMPAIGN_READ_${currentResponse.status}`);
    const currentRows = (await currentResponse.json()) as Array<{ value?: Record<string, unknown> }>;
    const current = currentRows[0]?.value && typeof currentRows[0].value === "object" ? currentRows[0].value : {};
    const currentHome = current["homeContent"] && typeof current["homeContent"] === "object" ? current["homeContent"] as Record<string, unknown> : {};
    const value = {
      ...current,
      homeContent: {
        ...currentHome,
        campaignBannerBadge: "Seçilmiş Fırsatlar",
        campaignBannerTitle: "Avantajı Şimdi Yakalayın",
        campaignBannerSubtitle: "Gerçek indirimleri, özel gün paketlerini ve Cilo tur fırsatlarını tek bakışta karşılaştırın. Süresi dolmadan size uygun fırsatı seçin.",
        campaignBannerButtonText: primary?.ctaLabel || "Fırsatı İncele",
        campaignBannerImage: primary?.coverImage || "",
        campaignBannerUrl: primary?.ctaUrl || "",
        campaignBannerWhatsappMessage: primary?.whatsappMessage || "",
        campaignId: primary?.id || "",
      },
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/site_config?on_conflict=key`, {
      method: "POST",
      headers: { ...this.authHeaders(token), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: "site_settings", value, is_public: true, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`SITE_CONFIG_CAMPAIGN_SAVE_${response.status}`);
  }

  private fromRow(row: any): CampaignRecord {
    return {
      id: String(row.id),
      title: String(row.title || ""),
      slug: String(row.slug || ""),
      shortDescription: row.short_description || undefined,
      description: row.description || undefined,
      badge: row.badge || undefined,
      campaignType: row.campaign_type || "CUSTOM",
      coverImage: row.cover_image || undefined,
      oldPrice: row.old_price == null ? undefined : Number(row.old_price),
      newPrice: row.new_price == null ? undefined : Number(row.new_price),
      discountPercent: row.discount_percent == null ? undefined : Number(row.discount_percent),
      targetType: row.target_type || undefined,
      targetId: row.target_id || undefined,
      ctaLabel: String(row.cta_label || "Fırsatı İncele"),
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
    return { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" };
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
