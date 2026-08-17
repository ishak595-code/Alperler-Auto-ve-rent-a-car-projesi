import { DestroyRef, computed, inject, Injectable, signal } from "@angular/core";
import { Branch } from "../models/branch.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";
import { CarService } from "./car.service";
import { PublicContentRealtimeService } from "./public-content-realtime.service";

interface BranchApiResponse {
  ok: boolean;
  branches?: Branch[];
  branch?: Branch;
  code?: string;
}

@Injectable({ providedIn: "root" })
export class BranchService {
  private readonly carService = inject(CarService);
  private readonly authService = inject(AuthService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly publicRemoteBranches = signal<Branch[]>([]);
  private readonly publicRemoteAvailable = signal(false);
  private readonly adminRemoteBranches = signal<Branch[]>([]);
  private readonly adminLoaded = signal(false);
  private readonly syncError = signal<string | null>(null);
  private readonly refreshMs = 5 * 60 * 1000;
  private realtimeRefreshTimer?: number;

  private readonly fallbackBranches = computed<Branch[]>(() => {
    const config = this.carService.getConfig()();
    return [{
      id: "yuksekova-merkez",
      name: "Yüksekova Merkez",
      city: "Hakkari",
      district: "Yüksekova",
      addressLabel: config.address || "Hakkari / Yüksekova Merkez",
      phone: config.phone,
      whatsapp: config.whatsapp,
      email: config.email,
      workingHours: [{ label: "Çalışma saatleri", value: "Randevu ve operasyon durumuna göre" }],
      services: ["RENTAL", "SALES", "TOUR", "TRANSFER", "PICKUP", "RETURN"],
      isActive: true,
      isPickupPoint: true,
      isReturnPoint: true,
      priority: 1,
    }];
  });

  readonly branches = computed(() =>
    (this.publicRemoteAvailable() ? this.publicRemoteBranches() : this.fallbackBranches())
      .filter((branch) => branch.isActive && branch.publicStatus !== "DRAFT" && branch.publicStatus !== "SUSPENDED" && branch.publicStatus !== "CLOSED")
      .slice()
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "tr")),
  );
  readonly managedBranches = computed(() =>
    (this.adminLoaded() ? this.adminRemoteBranches() : [])
      .slice()
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "tr")),
  );
  readonly pickupPoints = computed(() => this.branches().filter((branch) => branch.isPickupPoint));
  readonly returnPoints = computed(() => this.branches().filter((branch) => branch.isReturnPoint));
  readonly cloudSyncError = this.syncError.asReadonly();

  constructor() {
    void this.refreshPublic();

    const unwatch = this.realtime.watch(["branches"], () => this.queueRealtimeRefresh());
    this.destroyRef.onDestroy(unwatch);

    if (typeof window !== "undefined") {
      const fallbackTimer = window.setInterval(() => void this.refreshPublic(false), this.refreshMs);
      const onVisibility = () => {
        if (document.visibilityState === "visible") this.queueRealtimeRefresh(0);
      };
      document.addEventListener("visibilitychange", onVisibility);
      this.destroyRef.onDestroy(() => {
        window.clearInterval(fallbackTimer);
        if (this.realtimeRefreshTimer !== undefined) window.clearTimeout(this.realtimeRefreshTimer);
        document.removeEventListener("visibilitychange", onVisibility);
      });
    }
  }

  async refresh(): Promise<void> {
    await this.refreshPublic(false);
  }

  getById(id: string): Branch | undefined {
    return this.branches().find((branch) => branch.id === id) || this.managedBranches().find((branch) => branch.id === id);
  }

  async save(branch: Branch): Promise<void> {
    const normalized = this.normalize(branch);
    const accessToken = await this.authService.getAccessToken();
    if (!accessToken) throw new Error("Yönetici oturumu gerekli.");

    const response = await fetch("/api/branches", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
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
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
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
      console.info("Direct public branch source unavailable; verified local fallback remains active.", directError);
      this.publicRemoteAvailable.set(false);
      if (showError) this.syncError.set("Şube veri kaynağına şu anda ulaşılamıyor.");
    }
  }

  private usePublicRecords(records: Branch[]): void {
    this.publicRemoteBranches.set(records);
    this.publicRemoteAvailable.set(records.length > 0);
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
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/branches?is_active=eq.true&public_status=eq.ACTIVE&select=*&order=sort_order.asc,name.asc`,
      {
        cache: "no-store",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          accept: "application/json",
          "cache-control": "no-cache",
        },
      },
    );
    if (!response.ok) throw new Error(`BRANCH_DIRECT_${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("BRANCH_DIRECT_INVALID");
    return rows.map((row) => this.fromPublicRow(row)).map((branch) => this.normalize(branch)).filter((branch) => this.isUsable(branch));
  }

  private fromPublicRow(raw: unknown): Branch {
    const row = raw && typeof raw === "object" ? raw as Record<string, any> : {};
    return {
      id: String(row["code"] || row["id"] || "").trim().toLowerCase(),
      cloudId: row["id"] ? String(row["id"]) : undefined,
      slug: row["slug"] || undefined,
      name: String(row["name"] || ""),
      city: String(row["city"] || ""),
      district: String(row["district"] || ""),
      addressLabel: String(row["address_line"] || ""),
      phone: String(row["phone"] || ""),
      whatsapp: row["whatsapp"] || undefined,
      email: row["email"] || undefined,
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
    };
  }

  private normalize(branch: Branch): Branch {
    const id = branch.id.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error("Şube kimliği geçerli değil.");
    const name = branch.name.trim().slice(0, 120);
    const city = branch.city.trim().slice(0, 80);
    const district = branch.district.trim().slice(0, 80);
    const addressLabel = branch.addressLabel.trim().slice(0, 240);
    const phone = branch.phone.trim().slice(0, 40);
    if (!name || !city || !district || !addressLabel || !phone) throw new Error("Şube adı, şehir, ilçe, adres ve telefon zorunludur.");

    return {
      ...branch,
      id,
      name,
      city,
      district,
      addressLabel,
      phone,
      whatsapp: branch.whatsapp?.trim().slice(0, 40) || undefined,
      email: branch.email?.trim().toLowerCase().slice(0, 160) || undefined,
      mapUrl: branch.mapUrl?.trim().slice(0, 2048) || undefined,
      workingHours: (branch.workingHours || []).slice(0, 14).map((row) => ({ label: row.label.trim().slice(0, 80), value: row.value.trim().slice(0, 120) })),
      services: Array.from(new Set(branch.services || [])).slice(0, 6),
      priority: Math.max(0, Math.min(9999, Math.round(branch.priority || 0))),
      isActive: Boolean(branch.isActive),
      isPickupPoint: Boolean(branch.isPickupPoint),
      isReturnPoint: Boolean(branch.isReturnPoint),
    };
  }

  private isUsable(value: Partial<Branch>): value is Branch {
    return Boolean(
      value.id && value.name && value.city && value.district && value.addressLabel && value.phone &&
      Array.isArray(value.services) && Array.isArray(value.workingHours) &&
      typeof value.isActive === "boolean" && typeof value.isPickupPoint === "boolean" &&
      typeof value.isReturnPoint === "boolean" && typeof value.priority === "number",
    );
  }
}
