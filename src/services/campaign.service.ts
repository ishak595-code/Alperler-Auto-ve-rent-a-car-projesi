import { Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

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

  async loadPublic(): Promise<CampaignRecord[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?is_active=eq.true&publication_status=eq.PUBLISHED&select=*&order=sort_order.asc,created_at.desc`, {
      headers: this.publicHeaders(),
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_PUBLIC_${response.status}`);
    return ((await response.json()) as any[]).map((row) => this.fromRow(row));
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?select=*&order=sort_order.asc,created_at.desc`, {
      headers: this.authHeaders(token),
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_ADMIN_${response.status}`);
    this._campaigns.set(((await response.json()) as any[]).map((row) => this.fromRow(row)));
  }

  async save(input: Partial<CampaignRecord> & Pick<CampaignRecord, "title" | "campaignType" | "ctaLabel" | "publicationStatus">): Promise<CampaignRecord> {
    const token = await this.requiredToken();
    const body = {
      title: input.title.trim(),
      slug: (input.slug || this.slugify(input.title)).trim(),
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
