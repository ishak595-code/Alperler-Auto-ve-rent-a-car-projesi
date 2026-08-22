import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { AuthService } from './auth.service';

export type AdminCustomerStatus='ACTIVE'|'BLOCKED'|'DELETED';
export interface AdminCustomerRow {
  user_id:string; email?:string|null; full_name?:string|null; phone?:string|null; city?:string|null; avatar_url?:string|null; preferred_branch_id?:string|null; status:AdminCustomerStatus;
  points_balance:number; lifetime_points:number; completed_rentals:number; lifetime_spend:number; tier:string; successful_referrals:number; referral_points_earned:number;
}
export interface AdminLoyaltySettings {
  enabled:boolean; points_per_rental_day:number; minimum_points_per_rental:number; silver_threshold:number; gold_threshold:number; platinum_threshold:number;
  referral_inviter_points:number; referral_invitee_points:number;
  referral_rental_inviter_points:number; referral_rental_invitee_points:number;
  referral_sale_inviter_points:number; referral_sale_invitee_points:number;
  referral_tour_inviter_points:number; referral_tour_invitee_points:number;
  referral_milestone_3_points:number; referral_milestone_5_points:number; referral_milestone_10_points:number;
  benefits:Record<string,string[]>;
}

@Injectable({providedIn:'root'})
export class CustomerAdminService{
  private readonly auth=inject(AuthService);
  readonly customers=signal<AdminCustomerRow[]>([]);
  readonly settings=signal<AdminLoyaltySettings|null>(null);
  readonly loading=signal(false);

  async refresh():Promise<void>{
    const token=await this.requireToken();this.loading.set(true);
    try{
      const [profiles,loyalty,settings]=await Promise.all([
        this.rows<any>('customer_profiles?select=user_id,email,full_name,phone,city,avatar_url,preferred_branch_id,status&order=created_at.desc&limit=1000',token),
        this.rows<any>('customer_loyalty_accounts?select=user_id,points_balance,lifetime_points,completed_rentals,lifetime_spend,tier,successful_referrals,referral_points_earned&limit=1000',token),
        this.rows<AdminLoyaltySettings>('loyalty_program_settings?select=enabled,points_per_rental_day,minimum_points_per_rental,silver_threshold,gold_threshold,platinum_threshold,referral_inviter_points,referral_invitee_points,referral_rental_inviter_points,referral_rental_invitee_points,referral_sale_inviter_points,referral_sale_invitee_points,referral_tour_inviter_points,referral_tour_invitee_points,referral_milestone_3_points,referral_milestone_5_points,referral_milestone_10_points,benefits&limit=1',token),
      ]);
      const loyaltyByUser=new Map(loyalty.map((x:any)=>[x.user_id,x]));
      this.customers.set(profiles.map((p:any)=>{const l=loyaltyByUser.get(p.user_id)||{};return{
        ...p,status:(['ACTIVE','BLOCKED','DELETED'].includes(String(p.status))?p.status:'ACTIVE') as AdminCustomerStatus,
        points_balance:Number(l.points_balance||0),lifetime_points:Number(l.lifetime_points||0),completed_rentals:Number(l.completed_rentals||0),lifetime_spend:Number(l.lifetime_spend||0),tier:String(l.tier||'MEMBER'),
        successful_referrals:Number(l.successful_referrals||0),referral_points_earned:Number(l.referral_points_earned||0),
      };}));
      this.settings.set(settings[0]||null);
    }finally{this.loading.set(false);}
  }

  async linkBooking(reference:string,userId:string):Promise<Record<string,unknown>>{
    const token=await this.requireToken();
    return await this.rpc('admin_link_booking_customer',{p_booking_reference:reference.trim(),p_customer_user_id:userId},token) as Record<string,unknown>;
  }

  async setCustomerStatus(userId:string,status:AdminCustomerStatus):Promise<void>{
    const token=await this.requireToken();
    await this.rpc('admin_set_customer_status',{p_user_id:userId,p_status:status},token);
    this.customers.update(rows=>rows.map(row=>row.user_id===userId?{...row,status}:row));
  }

  async saveSettings(settings:AdminLoyaltySettings):Promise<void>{
    const referralValues=[
      settings.referral_rental_inviter_points,settings.referral_rental_invitee_points,
      settings.referral_sale_inviter_points,settings.referral_sale_invitee_points,
      settings.referral_tour_inviter_points,settings.referral_tour_invitee_points,
      settings.referral_milestone_3_points,settings.referral_milestone_5_points,settings.referral_milestone_10_points,
    ];
    if(settings.points_per_rental_day<1||settings.minimum_points_per_rental<0||settings.silver_threshold<0||settings.gold_threshold<settings.silver_threshold||settings.platinum_threshold<settings.gold_threshold||referralValues.some(value=>!Number.isFinite(value)||value<0||value>1000000))throw new Error('LOYALTY_THRESHOLDS_INVALID');
    const token=await this.requireToken();
    const payload={
      enabled:settings.enabled,
      points_per_rental_day:settings.points_per_rental_day,
      minimum_points_per_rental:settings.minimum_points_per_rental,
      silver_threshold:settings.silver_threshold,
      gold_threshold:settings.gold_threshold,
      platinum_threshold:settings.platinum_threshold,
      referral_rental_inviter_points:settings.referral_rental_inviter_points,
      referral_rental_invitee_points:settings.referral_rental_invitee_points,
      referral_sale_inviter_points:settings.referral_sale_inviter_points,
      referral_sale_invitee_points:settings.referral_sale_invitee_points,
      referral_tour_inviter_points:settings.referral_tour_inviter_points,
      referral_tour_invitee_points:settings.referral_tour_invitee_points,
      referral_milestone_3_points:settings.referral_milestone_3_points,
      referral_milestone_5_points:settings.referral_milestone_5_points,
      referral_milestone_10_points:settings.referral_milestone_10_points,
      benefits:settings.benefits,
      updated_at:new Date().toISOString(),
    };
    const r=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/loyalty_program_settings?id=eq.true`,{method:'PATCH',headers:this.headers(token,{Prefer:'return=representation'}),body:JSON.stringify(payload)});
    if(!r.ok)throw new Error('LOYALTY_SETTINGS_SAVE_FAILED');
    const rows=await r.json() as AdminLoyaltySettings[];this.settings.set(rows[0]||settings);
  }

  private async requireToken(){const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private headers(token:string,extra:Record<string,string>={}){return{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json',...extra};}
  private async rows<T>(path:string,token:string):Promise<T[]>{const r=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{headers:this.headers(token)});if(!r.ok)throw new Error(`CUSTOMER_ADMIN_READ_${r.status}`);return await r.json() as T[];}
  private async rpc(name:string,body:unknown,token:string):Promise<unknown>{const r=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(d?.message||d?.code||`${name.toUpperCase()}_FAILED`));return d;}
}
