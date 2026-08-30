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
  discountMethod: "FIXED_AMOUNT" | "PERCENT" | "FIXED_PRICE";
  discountValue: number;
  discountScope: "UNIT" | "ORDER";
  visibilityMode: "CAMPAIGN_ONLY" | "EVERYWHERE";
  minimumOrderAmount: number;
  minimumRentalDays?: number;
  minimumRentalHours?: number;
  maxRedemptions?: number;
  perCustomerLimit: number;
  allowReferralDiscount: boolean;
  allowLoyaltyRedemption: boolean;
  priority: number;
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

export interface CampaignProof {
  campaignId: string;
  pageViewsTotal: number;
  uniqueViewersTotal: number;
  recentViewers24h: number;
  activeViewers15m: number;
  lastViewedAt?: string;
}

type PublicCampaignScope =
  | { kind: "list"; limit: number }
  | { kind: "target"; targetType: "VEHICLE" | "TOUR"; targetIds: string[]; campaignId?: string };

const ADMIN_CAMPAIGN_SELECT = [
  "id", "title", "slug", "short_description", "description", "badge", "campaign_type", "cover_image", "old_price", "new_price",
  "discount_percent", "target_type", "target_id", "cta_label", "cta_url", "whatsapp_message", "starts_at", "ends_at",
  "publication_status", "is_active", "sort_order", "metadata", "created_at", "updated_at", "discount_method", "discount_value",
  "discount_scope", "visibility_mode", "minimum_order_amount", "minimum_rental_days", "minimum_rental_hours", "max_redemptions",
  "per_customer_limit", "allow_referral_discount", "allow_loyalty_redemption", "priority", "required_extra_ids",
].join(",");

const PUBLIC_CAMPAIGN_VIEW_SELECT = [
  "id", "title", "slug", "short_description", "description", "badge", "campaign_type", "cover_image", "old_price", "new_price",
  "discount_percent", "target_type", "target_id", "cta_label", "cta_url", "whatsapp_message", "starts_at", "ends_at",
  "publication_status", "is_active", "sort_order", "metadata", "discount_method", "discount_value", "discount_scope", "visibility_mode",
  "minimum_order_amount", "minimum_rental_days", "minimum_rental_hours", "max_redemptions", "per_customer_limit",
  "allow_referral_discount", "allow_loyalty_redemption", "priority",
].join(",");

const PUBLIC_CAMPAIGN_LIST_LIMIT = 48;
const PUBLIC_CAMPAIGN_TARGET_LIMIT = 12;

@Injectable({ providedIn: "root" })
export class CampaignService {
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly _campaigns = signal<CampaignRecord[]>([]);
  private readonly _publicCampaigns = signal<CampaignRecord[]>([]);
  private readonly _proofByCampaign = signal<Record<string, CampaignProof>>({});
  private readonly _clock = signal(Date.now());
  private publicRefreshTimer?: number;
  private readonly publicLoads = new Map<string, Promise<CampaignRecord[]>>();
  private publicScope?: PublicCampaignScope;
  private publicScopeKey = "";
  private socialProofInFlight?: Promise<Record<string, CampaignProof>>;
  private socialProofLastLoadedAt = 0;

  readonly campaigns = this._campaigns.asReadonly();
  readonly publicCampaigns = this._publicCampaigns.asReadonly();
  readonly proofByCampaign = this._proofByCampaign.asReadonly();
  readonly clock = this._clock.asReadonly();
  readonly realtimeState = this.realtime.state;

  constructor() {
    const unwatch = this.realtime.watch(["campaigns"], () => this.queuePublicRefresh());
    this.destroyRef.onDestroy(unwatch);
    if (typeof window !== "undefined") {
      this.destroyRef.onDestroy(() => {
        if (this.publicRefreshTimer !== undefined) window.clearTimeout(this.publicRefreshTimer);
      });
    }
  }

  loadPublic(limit = PUBLIC_CAMPAIGN_LIST_LIMIT): Promise<CampaignRecord[]> {
    const safeLimit = this.integer(limit, 1, PUBLIC_CAMPAIGN_LIST_LIMIT, PUBLIC_CAMPAIGN_LIST_LIMIT);
    const scope: PublicCampaignScope = { kind: "list", limit: safeLimit };
    const params = new URLSearchParams({
      select: PUBLIC_CAMPAIGN_VIEW_SELECT,
      order: "sort_order.asc,priority.asc,id.asc",
      limit: String(safeLimit),
    });
    return this.loadPublicScope(scope, params);
  }

  loadPublicForTarget(
    targetType: "VEHICLE" | "TOUR",
    targetIds: Array<string | number | null | undefined>,
    campaignId?: string | null,
  ): Promise<CampaignRecord[]> {
    const ids = [...new Set(targetIds.map((value) => String(value ?? "").trim().toLowerCase()).filter((value) => this.uuid.test(value)))].slice(0, 8);
    const cleanCampaignId = String(campaignId || "").trim().toLowerCase();
    const validCampaignId = this.uuid.test(cleanCampaignId) ? cleanCampaignId : undefined;
    if (!ids.length && !validCampaignId) {
      this.publicScope = { kind: "target", targetType, targetIds: [] };
      this.publicScopeKey = `target:${targetType}:empty`;
      this._publicCampaigns.set([]);
      return Promise.resolve([]);
    }

    const scope: PublicCampaignScope = { kind: "target", targetType, targetIds: ids, campaignId: validCampaignId };
    const params = new URLSearchParams({
      select: PUBLIC_CAMPAIGN_VIEW_SELECT,
      target_type: `eq.${targetType}`,
      order: "sort_order.asc,priority.asc,id.asc",
      limit: String(PUBLIC_CAMPAIGN_TARGET_LIMIT),
    });
    if (validCampaignId && ids.length) params.set("or", `(id.eq.${validCampaignId},target_id.in.(${ids.join(",")}))`);
    else if (validCampaignId) params.set("id", `eq.${validCampaignId}`);
    else params.set("target_id", `in.(${ids.join(",")})`);
    return this.loadPublicScope(scope, params);
  }

  async refreshPublicState(forceProof = false): Promise<void> {
    const routeScope = this.currentRouteTarget();
    if (routeScope) {
      const [campaigns] = await Promise.allSettled([
        this.loadPublicForTarget(routeScope.targetType, [routeScope.targetId], routeScope.campaignId),
        this.refreshSocialProof(forceProof),
      ]);
      if (campaigns.status === "rejected") throw campaigns.reason;
      return;
    }
    if (!this.publicScope) {
      await Promise.allSettled([this.refreshSocialProof(forceProof)]);
      return;
    }
    await this.refreshCurrentPublicScope(forceProof);
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/campaigns?select=${ADMIN_CAMPAIGN_SELECT}&order=sort_order.asc,created_at.desc`, {
      headers: this.authHeaders(token),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`CAMPAIGNS_ADMIN_${response.status}`);
    this._campaigns.set(((await response.json()) as any[]).map((row) => this.fromRow(row)));
  }

  async save(input: Partial<CampaignRecord> & Pick<CampaignRecord, "title" | "campaignType" | "ctaLabel" | "publicationStatus">): Promise<CampaignRecord> {
    const token = await this.requiredToken();
    const existing = input.id ? this._campaigns().find((row) => row.id === input.id) : undefined;
    const discountMethod = input.discountMethod ?? existing?.discountMethod ?? "FIXED_AMOUNT";
    const discountValue = this.nonNegative(input.discountValue ?? existing?.discountValue ?? 0, discountMethod === "PERCENT" ? 100 : 50_000_000);
    const isActive = input.publicationStatus === "ARCHIVED"
      ? false
      : input.publicationStatus === "PUBLISHED" || input.publicationStatus === "SCHEDULED"
        ? true
        : input.isActive !== false;
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
      discount_percent: discountMethod === "PERCENT" ? discountValue : (input.discountPercent ?? null),
      discount_method: discountMethod,
      discount_value: discountValue,
      discount_scope: input.discountScope ?? existing?.discountScope ?? "UNIT",
      visibility_mode: input.visibilityMode ?? existing?.visibilityMode ?? "CAMPAIGN_ONLY",
      minimum_order_amount: this.nonNegative(input.minimumOrderAmount ?? existing?.minimumOrderAmount ?? 0, 50_000_000),
      minimum_rental_days: this.optionalInteger(input.minimumRentalDays ?? existing?.minimumRentalDays, 1, 3650),
      minimum_rental_hours: this.optionalInteger(input.minimumRentalHours ?? existing?.minimumRentalHours, 1, 23),
      max_redemptions: this.optionalInteger(input.maxRedemptions ?? existing?.maxRedemptions, 1, 100_000_000),
      per_customer_limit: this.optionalInteger(input.perCustomerLimit ?? existing?.perCustomerLimit ?? 1, 1, 1000) ?? 1,
      allow_referral_discount: input.allowReferralDiscount ?? existing?.allowReferralDiscount ?? true,
      allow_loyalty_redemption: input.allowLoyaltyRedemption ?? existing?.allowLoyaltyRedemption ?? true,
      priority: this.optionalInteger(input.priority ?? existing?.priority ?? 100, 0, 1_000_000) ?? 100,
      target_type: input.targetType || null,
      target_id: input.targetId || null,
      cta_label: input.ctaLabel.trim() || "Fırsatı İncele",
      cta_url: input.ctaUrl?.trim() || null,
      whatsapp_message: input.whatsappMessage?.trim() || null,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      publication_status: input.publicationStatus,
      is_active: isActive,
      sort_order: input.sortOrder ?? existing?.sortOrder ?? this._campaigns().length + 1,
      metadata: input.metadata ?? existing?.metadata ?? {},
      updated_at: new Date().toISOString(),
    };
    const isUpdate = Boolean(input.id);
    const url = isUpdate
      ? `${SUPABASE_PROJECT_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(input.id!)}&select=${ADMIN_CAMPAIGN_SELECT}`
      : `${SUPABASE_PROJECT_URL}/rest/v1/campaigns?select=${ADMIN_CAMPAIGN_SELECT}`;
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
    if (this.publicScope) await this.refreshCurrentPublicScope(false);
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
    if (this.publicScope) await this.refreshCurrentPublicScope(false);
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
    if (this.publicScope) await this.refreshCurrentPublicScope(false);
  }

  async refreshSocialProof(force = false): Promise<Record<string, CampaignProof>> {
    const now = Date.now();
    if (!force && this.socialProofLastLoadedAt > 0 && now - this.socialProofLastLoadedAt < 45_000) return this._proofByCampaign();
    if (this.socialProofInFlight) return this.socialProofInFlight;
    const request = (async (): Promise<Record<string, CampaignProof>> => {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
      const timeout = controller && typeof window !== "undefined" ? window.setTimeout(() => controller.abort(), 8_000) : undefined;
      try {
        const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/campaign_social_proof`, {
          method: "POST",
          cache: "no-store",
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
          body: "{}",
          signal: controller?.signal,
        });
        if (!response.ok) return this._proofByCampaign();
        const rows = await response.json() as Array<Record<string, unknown>>;
        const map: Record<string, CampaignProof> = {};
        for (const row of rows) {
          const campaignId = String(row["campaign_id"] || "");
          if (!campaignId) continue;
          map[campaignId] = {
            campaignId,
            pageViewsTotal: Number(row["page_views_total"] || 0),
            uniqueViewersTotal: Number(row["unique_viewers_total"] || 0),
            recentViewers24h: Number(row["recent_viewers_24h"] || 0),
            activeViewers15m: Number(row["active_viewers_15m"] || 0),
            lastViewedAt: row["last_viewed_at"] ? String(row["last_viewed_at"]) : undefined,
          };
        }
        this._proofByCampaign.set(map);
        this.socialProofLastLoadedAt = Date.now();
        return map;
      } catch {
        return this._proofByCampaign();
      } finally {
        if (timeout !== undefined) window.clearTimeout(timeout);
      }
    })();
    this.socialProofInFlight = request;
    try {
      return await request;
    } finally {
      if (this.socialProofInFlight === request) this.socialProofInFlight = undefined;
    }
  }

  private loadPublicScope(scope: PublicCampaignScope, params: URLSearchParams): Promise<CampaignRecord[]> {
    const key = scope.kind === "list"
      ? `list:${scope.limit}`
      : `target:${scope.targetType}:${scope.targetIds.join(",")}:${scope.campaignId || ""}`;
    this.publicScope = scope;
    this.publicScopeKey = key;
    const active = this.publicLoads.get(key);
    if (active) return active;

    const request = (async () => {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/public_campaign_catalog_v217?${params.toString()}`, {
        headers: { ...this.publicHeaders(), "cache-control": "no-cache" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`CAMPAIGNS_PUBLIC_V217_${response.status}`);
      const records = ((await response.json()) as any[]).map((row) => this.fromRow(row));
      if (this.publicScopeKey === key) this._publicCampaigns.set(records);
      this._clock.set(Date.now());
      return records;
    })();
    this.publicLoads.set(key, request);
    return request.finally(() => {
      if (this.publicLoads.get(key) === request) this.publicLoads.delete(key);
    });
  }

  private async refreshCurrentPublicScope(forceProof: boolean): Promise<void> {
    const scope = this.publicScope;
    if (!scope) return;
    const content = scope.kind === "list"
      ? this.loadPublic(scope.limit)
      : this.loadPublicForTarget(scope.targetType, scope.targetIds, scope.campaignId);
    const [campaigns] = await Promise.allSettled([content, this.refreshSocialProof(forceProof)]);
    if (campaigns.status === "rejected") throw campaigns.reason;
  }

  private currentRouteTarget(): { targetType: "VEHICLE" | "TOUR"; targetId: string; campaignId?: string } | null {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname.replace(/\/+$/, "");
    const match = /^\/(fleet|sales|tour)\/([^/]+)$/i.exec(path);
    if (!match) return null;
    let targetId = "";
    try {
      targetId = decodeURIComponent(match[2]).trim().toLowerCase();
    } catch {
      return null;
    }
    if (!this.uuid.test(targetId)) return null;
    const campaignValue = new URLSearchParams(window.location.search).get("campaign") || "";
    const campaignId = this.uuid.test(campaignValue) ? campaignValue.toLowerCase() : undefined;
    return { targetType: match[1].toLowerCase() === "tour" ? "TOUR" : "VEHICLE", targetId, campaignId };
  }

  private queuePublicRefresh(delay = 120): void {
    if (!this.publicScope) return;
    if (typeof window === "undefined") {
      void this.refreshCurrentPublicScope(false).catch(() => undefined);
      return;
    }
    if (this.publicRefreshTimer !== undefined) window.clearTimeout(this.publicRefreshTimer);
    this.publicRefreshTimer = window.setTimeout(() => {
      this.publicRefreshTimer = undefined;
      void this.refreshCurrentPublicScope(false).catch((error) => console.info("Campaign realtime refresh deferred.", error));
    }, delay);
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
      discountMethod: row.discount_method || (row.new_price != null ? "FIXED_PRICE" : row.discount_percent != null ? "PERCENT" : "FIXED_AMOUNT"),
      discountValue: Number(row.discount_value ?? row.new_price ?? row.discount_percent ?? 0),
      discountScope: row.discount_scope || "UNIT",
      visibilityMode: row.visibility_mode || "CAMPAIGN_ONLY",
      minimumOrderAmount: Number(row.minimum_order_amount || 0),
      minimumRentalDays: row.minimum_rental_days == null ? undefined : Number(row.minimum_rental_days),
      minimumRentalHours: row.minimum_rental_hours == null ? undefined : Number(row.minimum_rental_hours),
      maxRedemptions: row.max_redemptions == null ? undefined : Number(row.max_redemptions),
      perCustomerLimit: Number(row.per_customer_limit || 1),
      allowReferralDiscount: row.allow_referral_discount !== false,
      allowLoyaltyRedemption: row.allow_loyalty_redemption !== false,
      priority: Number(row.priority ?? 100),
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
    return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || `kampanya-${Date.now()}`;
  }

  private nonNegative(value: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) throw new Error("CAMPAIGN_VALUE_INVALID");
    return Math.round(parsed * 100) / 100;
  }

  private optionalInteger(value: number | undefined, min: number, max: number): number | null {
    if (value === undefined || value === null || value === ("" as unknown as number)) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error("CAMPAIGN_LIMIT_INVALID");
    return parsed;
  }

  private integer(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  }

  private publicHeaders(): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" };
  }

  private authHeaders(token: string): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
