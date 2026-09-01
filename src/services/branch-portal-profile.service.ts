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
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  xUrl?: string;
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
    const address = this.clean(input.addressLabel, 500);
    const phone = this.clean(input.phone, 40);
    if (!address || !phone) throw new Error("BRANCH_ADDRESS_PHONE_REQUIRED");

    const workingHours = Object.fromEntries(
      (input.workingHours || []).slice(0, 14)
        .map((row) => [this.clean(row.label, 80), this.clean(row.value, 120)] as const)
        .filter(([label, value]) => Boolean(label && value)),
    );

    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/service_update_branch_profile_v224`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_branch_id: membership.branchId,
        p_address: address,
        p_phone: phone,
        p_whatsapp: this.clean(input.whatsapp, 40) || null,
        p_email: this.clean(input.email, 160).toLowerCase() || null,
        p_territory_label: this.clean(input.territoryLabel, 180) || null,
        p_public_description: this.clean(input.publicDescription, 2000) || null,
        p_working_hours: workingHours,
        p_instagram_url: this.url(input.instagramUrl),
        p_facebook_url: this.url(input.facebookUrl),
        p_tiktok_url: this.url(input.tiktokUrl),
        p_youtube_url: this.url(input.youtubeUrl),
        p_x_url: this.url(input.xUrl),
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new Error(String(payload.message || payload.code || "BRANCH_PROFILE_SAVE_FAILED"));
    }
    await this.portal.loadMemberships();
  }

  private clean(value: unknown, max: number): string {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
  }

  private url(value: unknown): string | null {
    const url = this.clean(value, 500);
    if (!url) return null;
    if (!/^https:\/\/[^\s]+$/i.test(url)) throw new Error("SOCIAL_URL_MUST_BE_HTTPS");
    return url;
  }
}
