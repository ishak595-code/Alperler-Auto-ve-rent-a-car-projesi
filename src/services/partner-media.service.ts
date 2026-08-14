import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";

export interface PartnerMediaItem {
  path: string;
  originalName: string;
  type: string;
  size: number;
  signedUrl: string;
  expiresIn: number;
}

@Injectable({ providedIn: "root" })
export class PartnerMediaService {
  private readonly auth = inject(AuthService);

  async getSignedMedia(reference: string): Promise<PartnerMediaItem[]> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch("/api/partner-media", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reference }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      media?: PartnerMediaItem[];
    };
    if (!response.ok || !payload.ok) throw new Error(payload.code || "PARTNER_MEDIA_FAILED");
    return Array.isArray(payload.media) ? payload.media.filter((item) => item.signedUrl) : [];
  }
}
