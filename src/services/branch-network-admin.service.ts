import { Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export interface BranchNetworkWorkspace {
  branch: Record<string, any>;
  checklist: Record<string, any>[];
  pricing: Record<string, any>[];
  members: Record<string, any>[];
  policies: Record<string, any>[];
  acceptances: Record<string, any>[];
  vehicles: Record<string, any>[];
  tours: Record<string, any>[];
}

@Injectable({ providedIn: "root" })
export class BranchNetworkAdminService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/branch-network-admin`;
  private readonly _workspace = signal<BranchNetworkWorkspace | null>(null);
  private readonly _loading = signal(false);

  readonly workspace = this._workspace.asReadonly();
  readonly loading = this._loading.asReadonly();

  async load(branchId: string): Promise<BranchNetworkWorkspace> {
    this._loading.set(true);
    try {
      const token = await this.requiredToken();
      const response = await fetch(`${this.endpoint}?branchId=${encodeURIComponent(branchId)}`, {
        headers: this.headers(token),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || !payload?.workspace) throw new Error(payload?.code || "BRANCH_NETWORK_LOAD_FAILED");
      this._workspace.set(payload.workspace as BranchNetworkWorkspace);
      return payload.workspace as BranchNetworkWorkspace;
    } finally {
      this._loading.set(false);
    }
  }

  async inviteMember(branchId: string, email: string, role: "BRANCH_OWNER" | "BRANCH_MANAGER" | "BRANCH_EDITOR"): Promise<{ invited: boolean }> {
    const payload = await this.action({ action: "INVITE_MEMBER", branchId, email, role });
    await this.load(branchId);
    return { invited: payload?.invited === true };
  }

  async setChecklist(branchId: string, checklistKey: string, completed: boolean, notes = ""): Promise<void> {
    await this.action({ action: "SET_CHECKLIST", branchId, checklistKey, completed, notes });
    await this.load(branchId);
  }

  async setPricing(branchId: string, category: "RENTAL" | "SALE" | "TOUR", values: { vehicleClass?: string; minPrice?: number | null; maxPrice?: number | null; recommendedPrice?: number | null; enforceMin?: boolean; enforceMax?: boolean }): Promise<void> {
    await this.action({ action: "SET_PRICING", branchId, category, ...values });
    await this.load(branchId);
  }

  async activate(branchId: string): Promise<void> {
    await this.action({ action: "ACTIVATE", branchId });
    await this.load(branchId);
  }

  async suspend(branchId: string): Promise<void> {
    await this.action({ action: "SUSPEND", branchId });
    await this.load(branchId);
  }

  async moderateVehicle(branchId: string, vehicleId: string, decision: "APPROVE" | "REJECT" | "SUSPEND", reason = ""): Promise<void> {
    await this.action({ action: "MODERATE_VEHICLE", branchId, vehicleId, decision, reason });
    await this.load(branchId);
  }

  async moderateTour(branchId: string, tourId: string, decision: "APPROVE" | "REJECT" | "SUSPEND", reason = ""): Promise<void> {
    await this.action({ action: "MODERATE_TOUR", branchId, tourId, decision, reason });
    await this.load(branchId);
  }

  private async action(body: Record<string, unknown>): Promise<any> {
    const token = await this.requiredToken();
    const response = await fetch(this.endpoint, {
      method: "PATCH",
      headers: this.headers(token),
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(payload?.code || "BRANCH_NETWORK_ACTION_FAILED");
    return payload;
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
