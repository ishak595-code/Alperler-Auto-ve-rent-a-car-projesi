import { DestroyRef, computed, inject, Injectable, signal } from "@angular/core";
import { Branch } from "../models/branch.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";
import { PublicContentRealtimeService } from "./public-content-realtime.service";

interface BranchApiResponse {
  ok: boolean;
  branches?: Branch[];
  branch?: Branch;
  code?: string;
}

@Injectable({ providedIn: "root" })
export class BranchService {
  private readonly authService = inject(AuthService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly publicRemoteBranches = signal<Branch[]>([]);
  private readonly adminRemoteBranches = signal<Branch[]>([]);
  private readonly adminLoaded = signal(false);
  private readonly syncError = signal<string | null>(null);
  private realtimeRefreshTimer?: number;

  readonly branches = computed(() =>
    this.publicRemoteBranches()
      .filter((branch) => branch.isActive && branch.publicStatus === "ACTIVE")
      .slice()
      .sort((a, b) => a.priority - b.priority || (a.operatorName || a.name).localeCompare(b.operatorName || b.name, "tr")),
  );
  readonly managedBranches = computed(() =>
    (this.adminLoaded() ? this.adminRemoteBranches() : [])
      .slice()
      .sort((a, b) => a.priority - b.priority || (a.operatorName || a.name).localeCompare(b.operatorName || b.name, "tr")),
  );
  readonly pickupPoints = computed(() => this.branches().filter((branch) => branch.isPickupPoint));
  readonly returnPoints = computed(() => this.branches().filter((branch) => branch.isReturnPoint));
  readonly cloudSyncError = this.syncError.asReadonly();

  constructor() {
    void this.refreshPublic();
    const unwatch = this.realtime.watch(["branches"], () => this.queueRealtimeRefresh());
    this.destroyRef.onDestroy(unwatch);
    if (typeof window !== "undefined") {
      this.destroyRef.onDestroy(() => {
        if (this.realtimeRefreshTimer !== undefined) window.clearTimeout(this.realtimeRefreshTimer);
      });
    }
  }

  async refresh(): Promise<void> {
    await this.refreshPublic(false);
  }

  getById(id: string): Branch | undefined {
    return this.branches().find((branch) => branch.id === id || branch.cloudId === id)
      || this.managedBranches().find((branch) => branch.id === id || branch.cloudId === id);
  }

  async save(branch: Branch): Promise<void> {
    const normalized = this.normalize(branch);
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) throw new Error("Yönetici oturumu gerekli.");
    const response = await fetch("/api/branches", {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const payload = (await response.json().catch(() => ({}))) as BranchApiResponse;
    if (!response.ok || !payload.ok) throw new Error(payload.code || "Şube kaydedilemedi.");
    await Promise.allSettled([this.refreshAdmin(), this.refreshPublic(false)]);
  }

  async remove(id: string): Promise<void> {
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error("Geçersiz şube kimliği.");
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) throw new Error("Yönetici oturumu gerekli.");
    const response = await fetch("/api/branches", {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json().catch(() => ({}))) as BranchApiResponse;
    if (!response.ok || !payload.ok) throw new Error(payload.code || "Şube pasife alınamadı.");
    await Promise.allSettled([this.refreshAdmin(), this.refreshPublic(false)]);
  }

  async refreshAdmin(): Promise<void> {
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) throw new Error("Yönetici oturumu gerekli.");
    try {
      const records = await this.fetchBranches("/api/branches?includeInactive=1", accessToken);
      this.adminRemoteBranches.set(records);
      this.adminLoaded.set(true);
      this.syncError.set(null);
    } catch (error) {
      this.adminLoaded.set(true);
      this.syncError.set("Şube veri kaynağına şu anda ulaşılamıyor.");
      throw error;
    }
  }

  async refreshPublic(showError = true): Promise<void> {
    try {
      const records = await this.fetchBranches(`/api/branches?fresh=${Date.now()}`);
      this.usePublicRecords(records);
      return;
    } catch (apiError) {
      console.info("Branch API unavailable; trying direct public Supabase read.", apiError);
    }
    try {
      const records = await this.fetchPublicDirect();
      this.usePublicRecords(records);
    } catch (directError) {
      console.info("Verified public branch sources unavailable; failing closed.", directError);
      this.publicRemoteBranches.set([]);
      if (showError) this.syncError.set("Şube veri kaynağına şu anda ulaşılamıyor.");
    }
  }

  private usePublicRecords(records: Branch[]): void {
    this.publicRemoteBranches.set(records);
    this.syncError.set(null);
  }

  private queueRealtimeRefresh(delay = 120): void {
    if (typeof window === "undefined") {
      void this.refreshPublic(false);
      return;
    }
    if (this.realtimeRefreshTimer !== undefined) window.clearTimeout(this.realtimeRefreshTimer);
    this.realtimeRefreshTimer = window.setTimeout(() => {
      this.realtimeRefreshTimer = undefined;
      void this.refreshPublic(false);
    }, delay);
  }

  private async fetchBranches(url: string, accessToken?: string): Promise<Branch[]> {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        "cache-control": "no-cache",
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as BranchApiResponse;
    if (!response.ok || !payload.ok || !Array.isArray(payload.branches)) {
      throw new Error(payload.code || "BRANCH_SOURCE_UNAVAILABLE");
    }
    return payload.branches.map((branch) => this.normalize(branch)).filter((branch) => this.isUsable(branch));
  }

  private async fetchPublicDirect(): Promise<Branch[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/branches?is_active=eq.true&public_status=eq.ACTIVE&select=*&order=sort_order.asc,name.asc`, {
      cache: "no-store",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`BRANCH_DIRECT_${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("BRANCH_DIRECT_INVALID");
    return rows
      .map((row) => this.fromPublicRow(row))
      .map((branch) => this.normalize(branch))
      .filter((branch) => this.isUsable(branch));
  }

  private fromPublicRow(raw: unknown): Branch {
    const row = raw && typeof raw === "object" ? raw as Record<string, any> : {};
    return {
      id: String(row["code"] || row["id"] || "").trim().toLowerCase(),
      cloudId: row["id"] ? String(row["id"]) : undefined,
      slug: row["slug"] || undefined,
      name: String(row["name"] || ""),
      operatorName: row["operator_display_name"] || row["name"] || undefined,
      operatorLegalName: row["operator_legal_name"] || undefined,
      operatorRelationship: row["operator_relationship"] || undefined,
      operatorVerified: row["network_type"] === "OWNED" || Boolean(row["operator_identity_verified_at"]),
      platformDisclaimer: row["platform_disclaimer"] || undefined,
      provinceCode: row["province_code"] || undefined,
      districtCode: row["district_code"] || undefined,
      city: String(row["city"] || ""),
      district: String(row["district"] || ""),
      country: String(row["country"] || "Türkiye"),
      addressLabel: String(row["address_line"] || ""),
      phone: String(row["phone"] || ""),
      whatsapp: row["whatsapp"] || undefined,
      email: row["email"] || undefined,
      timezone: String(row["timezone"] || "Europe/Istanbul"),
      latitude: row["latitude"] === null || row["latitude"] === undefined ? undefined : Number(row["latitude"]),
      longitude: row["longitude"] === null || row["longitude"] === undefined ? undefined : Number(row["longitude"]),
      mapUrl: row["map_url"] || undefined,
      workingHours: Array.isArray(row["opening_hours"]) ? row["opening_hours"] : [],
      services: Array.isArray(row["services"]) ? row["services"] : [],
      isActive: Boolean(row["is_active"]),
      isPickupPoint: Boolean(row["is_pickup_point"]),
      isReturnPoint: Boolean(row["is_return_point"]),
      priority: Number(row["sort_order"] || 0),
      networkType: row["network_type"] || "OWNED",
      publicStatus: row["public_status"] || "ACTIVE",
      territoryLabel: row["territory_label"] || undefined,
      publicDescription: row["public_description"] || undefined,
      heroImage: row["hero_image"] || undefined,
      customerGuaranteeEnabled: row["customer_guarantee_enabled"] !== false,
      centralPricingRequired: row["central_pricing_required"] !== false,
      listingRequiresApproval: row["listing_requires_approval"] !== false,
      brandProfile: row["brand_profile"] && typeof row["brand_profile"] === "object" ? row["brand_profile"] : {},
      serviceRules: row["service_rules"] && typeof row["service_rules"] === "object" ? row["service_rules"] : {},
      lifecycleReason: row["lifecycle_reason"] || undefined,
      statusChangedAt: row["status_changed_at"] || undefined,
      statusChangedBy: row["status_changed_by"] || undefined,
      suspendedAt: row["suspended_at"] || undefined,
      closedAt: row["closed_at"] || undefined,
      reopenedAt: row["reopened_at"] || undefined,
      createdAt: row["created_at"] || undefined,
      updatedAt: row["updated_at"] || undefined,
    };
  }

  private normalize(branch: Branch): Branch {
    const id = branch.id.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error("Şube kimliği geçerli değil.");
    const name = branch.name.trim().slice(0, 120);
    const city = branch.city.trim().slice(0, 80);
    const district = branch.district.trim().slice(0, 80);
    const country = String(branch.country || "Türkiye").trim().slice(0, 80);
    const addressLabel = branch.addressLabel.trim().slice(0, 240);
    const phone = branch.phone.trim().slice(0, 40);
    const timezone = String(branch.timezone || "Europe/Istanbul").trim().slice(0, 80);
    if (!name || !city || !district || !country || !addressLabel || !phone) {
      throw new Error("Şube adı, şehir, ilçe, ülke, adres ve telefon zorunludur.");
    }
    if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone)) throw new Error("Şube saat dilimi geçerli değil.");
    return {
      ...branch,
      id,
      name,
      city,
      district,
      country,
      addressLabel,
      phone,
      timezone,
      operatorName: branch.operatorName?.trim().slice(0, 160) || undefined,
      operatorLegalName: branch.operatorLegalName?.trim().slice(0, 200) || undefined,
      provinceCode: branch.provinceCode?.trim().slice(0, 16) || undefined,
      districtCode: branch.districtCode?.trim().slice(0, 32) || undefined,
      whatsapp: branch.whatsapp?.trim().slice(0, 40) || undefined,
      email: branch.email?.trim().toLowerCase().slice(0, 160) || undefined,
      mapUrl: branch.mapUrl?.trim().slice(0, 2048) || undefined,
      workingHours: (branch.workingHours || []).slice(0, 14).map((row) => ({
        label: row.label.trim().slice(0, 80),
        value: row.value.trim().slice(0, 120),
      })),
      services: Array.from(new Set(branch.services || [])).slice(0, 6),
      priority: Math.max(0, Math.min(9999, Math.round(branch.priority || 0))),
      isActive: Boolean(branch.isActive),
      isPickupPoint: Boolean(branch.isPickupPoint),
      isReturnPoint: Boolean(branch.isReturnPoint),
    };
  }

  private isUsable(value: Partial<Branch>): value is Branch {
    return Boolean(
      value.id
      && value.name
      && value.city
      && value.district
      && value.country
      && value.addressLabel
      && value.phone
      && value.timezone
      && Array.isArray(value.services)
      && Array.isArray(value.workingHours)
      && typeof value.isActive === "boolean"
      && typeof value.isPickupPoint === "boolean"
      && typeof value.isReturnPoint === "boolean"
      && typeof value.priority === "number",
    );
  }
}
