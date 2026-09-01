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
    const address=this.clean(input.addressLabel,240),phone=this.clean(input.phone,40),email=this.clean(input.email,160).toLowerCase();
    if(address.length<5||phone.replace(/\D/g,"").length<10)throw new Error("BRANCH_ADDRESS_PHONE_REQUIRED");
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("INVALID_BRANCH_EMAIL");
    const socialKeys:[keyof BranchPublicProfileDraft,string][]=[['instagramUrl','instagram'],['facebookUrl','facebook'],['tiktokUrl','tiktok'],['youtubeUrl','youtube'],['xUrl','x']];
    for(const[key]of socialKeys){const value=this.clean(input[key],500);if(value&&!/^https:\/\/\S+$/i.test(value))throw new Error("SOCIAL_URL_MUST_BE_HTTPS");}
    const hours=(input.workingHours||[]).slice(0,14).map(row=>({label:this.clean(row.label,80),value:this.clean(row.value,120)})).filter(row=>row.label&&row.value);
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/service_update_branch_profile_v225`,{
      method:"POST",
      headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,"content-type":"application/json"},
      body:JSON.stringify({
        p_branch_id:membership.branchId,p_address:address,p_phone:phone,p_whatsapp:this.clean(input.whatsapp,40)||null,
        p_email:email||null,p_territory_label:this.clean(input.territoryLabel,240)||null,
        p_public_description:this.clean(input.publicDescription,4000)||null,p_working_hours:hours,
        p_instagram_url:this.clean(input.instagramUrl,500)||null,p_facebook_url:this.clean(input.facebookUrl,500)||null,
        p_tiktok_url:this.clean(input.tiktokUrl,500)||null,p_youtube_url:this.clean(input.youtubeUrl,500)||null,p_x_url:this.clean(input.xUrl,500)||null,
      }),
    });
    const payload=await response.json().catch(()=>({})) as{ok?:boolean;message?:string;code?:string};
    if(!response.ok)throw new Error(payload.code||payload.message||"BRANCH_PROFILE_SAVE_FAILED");
    await this.portal.loadMemberships();
  }

  private clean(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }
}
