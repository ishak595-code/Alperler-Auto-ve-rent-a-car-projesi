import { computed, inject, Injectable, signal } from "@angular/core";
import { Branch } from "../models/branch.model";
import { AuthService } from "./auth.service";
import { CarService } from "./car.service";

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
  private readonly publicRemoteBranches = signal<Branch[]>([]);
  private readonly publicRemoteAvailable = signal(false);
  private readonly adminRemoteBranches = signal<Branch[]>([]);
  private readonly adminLoaded = signal(false);
  private readonly syncError = signal<string | null>(null);
  private readonly refreshMs = 5 * 60 * 1000;

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
      .filter((branch) => branch.isActive)
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
    setInterval(() => void this.refreshPublic(false), this.refreshMs);
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
      const records = await this.fetchBranches("/api/branches");
      this.publicRemoteBranches.set(records);
      this.publicRemoteAvailable.set(records.length > 0);
      this.syncError.set(null);
    } catch (error) {
      console.info("Branch source unavailable; verified fallback remains active.", error);
      this.publicRemoteAvailable.set(false);
      if (showError) this.syncError.set("Şube veri kaynağına şu anda ulaşılamıyor.");
    }
  }

  private async fetchBranches(url: string, accessToken?: string): Promise<Branch[]> {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as BranchApiResponse;
    if (!response.ok || !payload.ok || !Array.isArray(payload.branches)) {
      throw new Error(payload.code || "BRANCH_SOURCE_UNAVAILABLE");
    }
    return payload.branches.map((branch) => this.normalize(branch)).filter((branch) => this.isUsable(branch));
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
