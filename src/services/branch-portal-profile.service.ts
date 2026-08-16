import { Injectable, inject } from "@angular/core";
import { BranchPortalAuthService } from "./branch-portal-auth.service";
import { BranchPortalService } from "./branch-portal.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export interface BranchPublicProfileDraft {
  addressLabel: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  territoryLabel?: string;
  publicDescription?: string;
  workingHours?: Array<{ label: string; value: string }>;
}

@Injectable({ providedIn: "root" })
export class BranchPortalProfileService {
  private readonly auth = inject(BranchPortalAuthService);
  private readonly portal = inject(BranchPortalService);

  async save(input: BranchPublicProfileDraft): Promise<void> {
    const membership = this.portal.currentMembership();
    if (!membership) throw new Error("BRANCH_ACCESS_DENIED");
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("BRANCH_SESSION_REQUIRED");
    const payload = {
      address_line: this.clean(input.addressLabel, 240) || null,
      phone: this.clean(input.phone, 40) || null,
      whatsapp: this.clean(input.whatsapp, 40) || null,
      email: this.clean(input.email, 160).toLowerCase() || null,
      territory_label: this.clean(input.territoryLabel, 240) || null,
      public_description: this.clean(input.publicDescription, 4000) || null,
      opening_hours: (input.workingHours || []).slice(0, 14).map((row) => ({ label: this.clean(row.label, 80), value: this.clean(row.value, 120) })).filter((row) => row.label && row.value),
      updated_at: new Date().toISOString(),
    };
    if (!payload.address_line || !payload.phone) throw new Error("BRANCH_ADDRESS_PHONE_REQUIRED");
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/branches?id=eq.${encodeURIComponent(membership.branchId)}&select=id`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("BRANCH_PROFILE_SAVE_FAILED");
    await this.portal.loadMemberships();
  }

  private clean(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }
}
