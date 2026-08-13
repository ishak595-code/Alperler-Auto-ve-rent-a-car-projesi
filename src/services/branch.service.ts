import { computed, effect, inject, Injectable, signal } from "@angular/core";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { Branch } from "../models/branch.model";
import { CarService } from "./car.service";

@Injectable({ providedIn: "root" })
export class BranchService {
  private readonly carService = inject(CarService);
  private readonly cloudBranches = signal<Branch[]>([]);
  private readonly cloudAvailable = signal(false);
  private readonly syncError = signal<string | null>(null);

  private readonly fallbackBranches = computed<Branch[]>(() => {
    const config = this.carService.getConfig()();
    return [
      {
        id: "yuksekova-merkez",
        name: "Yüksekova Merkez",
        city: "Hakkari",
        district: "Yüksekova",
        addressLabel: config.address || "Hakkari / Yüksekova Merkez",
        phone: config.phone,
        whatsapp: config.whatsapp,
        email: config.email,
        workingHours: [
          { label: "Çalışma saatleri", value: "Randevu ve operasyon durumuna göre" },
        ],
        services: ["RENTAL", "SALES", "TOUR", "TRANSFER", "PICKUP", "RETURN"],
        isActive: true,
        isPickupPoint: true,
        isReturnPoint: true,
        priority: 1,
      },
    ];
  });

  readonly branches = computed(() =>
    (this.cloudAvailable() ? this.cloudBranches() : this.fallbackBranches())
      .filter((branch) => branch.isActive)
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "tr")),
  );
  readonly pickupPoints = computed(() => this.branches().filter((branch) => branch.isPickupPoint));
  readonly returnPoints = computed(() => this.branches().filter((branch) => branch.isReturnPoint));
  readonly cloudSyncError = this.syncError.asReadonly();

  constructor() {
    this.startPublicSync();
    effect(() => {
      void this.branches();
    });
  }

  getById(id: string): Branch | undefined {
    return this.branches().find((branch) => branch.id === id);
  }

  async save(branch: Branch): Promise<void> {
    const normalized = this.normalize(branch);
    await setDoc(doc(db, "branches", normalized.id), {
      ...normalized,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) {
      throw new Error("Geçersiz şube kimliği.");
    }
    await deleteDoc(doc(db, "branches", id));
  }

  private startPublicSync(): void {
    onSnapshot(
      collection(db, "branches"),
      (snapshot) => {
        if (snapshot.empty) {
          this.cloudBranches.set([]);
          this.cloudAvailable.set(false);
          return;
        }

        const records = snapshot.docs
          .map((snapshotDoc) => ({
            ...(snapshotDoc.data() as Omit<Branch, "id">),
            id: snapshotDoc.id,
          }))
          .filter((branch): branch is Branch => this.isUsable(branch));

        if (records.length > 0) {
          this.cloudBranches.set(records);
          this.cloudAvailable.set(true);
          this.syncError.set(null);
        } else {
          this.cloudBranches.set([]);
          this.cloudAvailable.set(false);
        }
      },
      (error) => {
        console.info("Cloud branch collection is not available yet; verified fallback remains active.", error);
        this.cloudAvailable.set(false);
        this.syncError.set("Şube bulut kaynağı henüz aktif değil.");
      },
    );
  }

  private normalize(branch: Branch): Branch {
    const id = branch.id.trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) throw new Error("Şube kimliği geçerli değil.");

    const name = branch.name.trim().slice(0, 120);
    const city = branch.city.trim().slice(0, 80);
    const district = branch.district.trim().slice(0, 80);
    const addressLabel = branch.addressLabel.trim().slice(0, 240);
    const phone = branch.phone.trim().slice(0, 40);
    if (!name || !city || !district || !addressLabel || !phone) {
      throw new Error("Şube adı, şehir, ilçe, adres ve telefon zorunludur.");
    }

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
      value.id &&
        value.name &&
        value.city &&
        value.district &&
        value.addressLabel &&
        value.phone &&
        Array.isArray(value.services) &&
        Array.isArray(value.workingHours) &&
        typeof value.isActive === "boolean" &&
        typeof value.isPickupPoint === "boolean" &&
        typeof value.isReturnPoint === "boolean" &&
        typeof value.priority === "number",
    );
  }
}
