import { Injectable, inject, signal } from '@angular/core';
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
  redemption_enabled:boolean; point_value_try:number; minimum_redeem_points:number; max_redeem_percent:number;
  referral_checkout_discount_enabled:boolean; referral_checkout_discount_mode:'FIXED_AMOUNT'|'PERCENT';
  referral_rental_invitee_discount:number; referral_sale_invitee_discount:number; referral_tour_invitee_discount:number;
  allow_campaign_referral_stack:boolean; allow_campaign_loyalty_stack:boolean; allow_referral_loyalty_stack:boolean;
  tour_points_per_100_try:number; sale_points_per_1000_try:number;
  updated_at?:string;
}
interface CustomerAdminListPayload{ok?:boolean;code?:string;customers?:AdminCustomerRow[];settings?:AdminLoyaltySettings|null;capabilities?:{manageSettings?:boolean};}
interface MutationPayload{ok?:boolean;code?:string;message?:string;settings?:AdminLoyaltySettings;[key:string]:unknown;}

@Injectable({providedIn:'root'})
export class CustomerAdminService{
  private readonly auth=inject(AuthService);
  private readonly endpoint='/api/partner?op=customer-admin';
  readonly customers=signal<AdminCustomerRow[]>([]);
  readonly settings=signal<AdminLoyaltySettings|null>(null);
  readonly loading=signal(false);
  readonly canManageSettings=signal(false);

  async refresh():Promise<void>{
    const token=await this.requireToken();this.loading.set(true);
    try{
      const payload=await this.request<CustomerAdminListPayload>('GET',token);
      if(payload.ok!==true)throw new Error(payload.code||'CUSTOMER_ADMIN_LIST_FAILED');
      this.customers.set((payload.customers||[]).map(row=>this.normalizeCustomer(row)));
      this.settings.set(payload.settings?this.normalizeSettings(payload.settings):null);
      this.canManageSettings.set(Boolean(payload.capabilities?.manageSettings));
    }finally{this.loading.set(false);}
  }

  async linkBooking(reference:string,userId:string):Promise<Record<string,unknown>>{
    const token=await this.requireToken();const cleanReference=reference.trim().slice(0,100);
    if(!cleanReference||!this.validUuid(userId))throw new Error('BOOKING_LINK_FIELDS_REQUIRED');
    const payload=await this.request<MutationPayload>('PATCH',token,{action:'linkBooking',reference:cleanReference,userId});
    if(payload.ok!==true)throw new Error(payload.code||'CUSTOMER_BOOKING_LINK_FAILED');
    return payload;
  }

  async setCustomerStatus(userId:string,status:AdminCustomerStatus):Promise<void>{
    if(!this.validUuid(userId)||!(['ACTIVE','BLOCKED','DELETED'] as string[]).includes(status))throw new Error('INVALID_CUSTOMER_STATUS');
    const token=await this.requireToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'status',userId,status});
    if(payload.ok!==true)throw new Error(payload.code||'CUSTOMER_STATUS_UPDATE_FAILED');
    this.customers.update(rows=>rows.map(row=>row.user_id===userId?{...row,status}:row));
  }

  async saveSettings(settings:AdminLoyaltySettings):Promise<void>{
    if(!this.canManageSettings())throw new Error('SETTINGS_PERMISSION_REQUIRED');
    this.validateSettings(settings);
    const token=await this.requireToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'saveSettings',settings:this.settingsPayload(settings)});
    if(payload.ok!==true)throw new Error(payload.code||'LOYALTY_SETTINGS_SAVE_FAILED');
    this.settings.set(payload.settings?this.normalizeSettings(payload.settings):settings);
  }

  private validateSettings(settings:AdminLoyaltySettings){
    const referralPoints=[settings.referral_rental_inviter_points,settings.referral_rental_invitee_points,settings.referral_sale_inviter_points,settings.referral_sale_invitee_points,settings.referral_tour_inviter_points,settings.referral_tour_invitee_points,settings.referral_milestone_3_points,settings.referral_milestone_5_points,settings.referral_milestone_10_points];
    const discounts=[settings.referral_rental_invitee_discount,settings.referral_sale_invitee_discount,settings.referral_tour_invitee_discount];
    if(!Number.isFinite(settings.points_per_rental_day)||settings.points_per_rental_day<1||settings.points_per_rental_day>100000||settings.minimum_points_per_rental<0||settings.minimum_points_per_rental>1000000||settings.silver_threshold<0||settings.gold_threshold<settings.silver_threshold||settings.platinum_threshold<settings.gold_threshold||referralPoints.some(value=>!Number.isFinite(value)||value<0||value>1000000)||!Number.isFinite(settings.point_value_try)||settings.point_value_try<0||settings.point_value_try>1000||!Number.isFinite(settings.minimum_redeem_points)||settings.minimum_redeem_points<0||settings.minimum_redeem_points>100000000||!Number.isFinite(settings.max_redeem_percent)||settings.max_redeem_percent<0||settings.max_redeem_percent>100||discounts.some(value=>!Number.isFinite(value)||value<0)||!['FIXED_AMOUNT','PERCENT'].includes(settings.referral_checkout_discount_mode)||settings.tour_points_per_100_try<0||settings.tour_points_per_100_try>100000||settings.sale_points_per_1000_try<0||settings.sale_points_per_1000_try>100000)throw new Error('LOYALTY_THRESHOLDS_INVALID');
  }
  private settingsPayload(settings:AdminLoyaltySettings){return{
    enabled:settings.enabled,points_per_rental_day:settings.points_per_rental_day,minimum_points_per_rental:settings.minimum_points_per_rental,silver_threshold:settings.silver_threshold,gold_threshold:settings.gold_threshold,platinum_threshold:settings.platinum_threshold,
    referral_rental_inviter_points:settings.referral_rental_inviter_points,referral_rental_invitee_points:settings.referral_rental_invitee_points,referral_sale_inviter_points:settings.referral_sale_inviter_points,referral_sale_invitee_points:settings.referral_sale_invitee_points,referral_tour_inviter_points:settings.referral_tour_inviter_points,referral_tour_invitee_points:settings.referral_tour_invitee_points,referral_milestone_3_points:settings.referral_milestone_3_points,referral_milestone_5_points:settings.referral_milestone_5_points,referral_milestone_10_points:settings.referral_milestone_10_points,benefits:settings.benefits,
    redemption_enabled:settings.redemption_enabled,point_value_try:settings.point_value_try,minimum_redeem_points:settings.minimum_redeem_points,max_redeem_percent:settings.max_redeem_percent,
    referral_checkout_discount_enabled:settings.referral_checkout_discount_enabled,referral_checkout_discount_mode:settings.referral_checkout_discount_mode,referral_rental_invitee_discount:settings.referral_rental_invitee_discount,referral_sale_invitee_discount:settings.referral_sale_invitee_discount,referral_tour_invitee_discount:settings.referral_tour_invitee_discount,
    allow_campaign_referral_stack:settings.allow_campaign_referral_stack,allow_campaign_loyalty_stack:settings.allow_campaign_loyalty_stack,allow_referral_loyalty_stack:settings.allow_referral_loyalty_stack,tour_points_per_100_try:settings.tour_points_per_100_try,sale_points_per_1000_try:settings.sale_points_per_1000_try,
  };}
  private normalizeCustomer(row:AdminCustomerRow):AdminCustomerRow{return{...row,status:(['ACTIVE','BLOCKED','DELETED'].includes(String(row.status))?row.status:'ACTIVE') as AdminCustomerStatus,points_balance:Number(row.points_balance||0),lifetime_points:Number(row.lifetime_points||0),completed_rentals:Number(row.completed_rentals||0),lifetime_spend:Number(row.lifetime_spend||0),tier:String(row.tier||'MEMBER'),successful_referrals:Number(row.successful_referrals||0),referral_points_earned:Number(row.referral_points_earned||0)};}
  private normalizeSettings(row:AdminLoyaltySettings):AdminLoyaltySettings{return{...row,points_per_rental_day:Number(row.points_per_rental_day||0),minimum_points_per_rental:Number(row.minimum_points_per_rental||0),silver_threshold:Number(row.silver_threshold||0),gold_threshold:Number(row.gold_threshold||0),platinum_threshold:Number(row.platinum_threshold||0),referral_inviter_points:Number(row.referral_inviter_points||0),referral_invitee_points:Number(row.referral_invitee_points||0),referral_rental_inviter_points:Number(row.referral_rental_inviter_points||0),referral_rental_invitee_points:Number(row.referral_rental_invitee_points||0),referral_sale_inviter_points:Number(row.referral_sale_inviter_points||0),referral_sale_invitee_points:Number(row.referral_sale_invitee_points||0),referral_tour_inviter_points:Number(row.referral_tour_inviter_points||0),referral_tour_invitee_points:Number(row.referral_tour_invitee_points||0),referral_milestone_3_points:Number(row.referral_milestone_3_points||0),referral_milestone_5_points:Number(row.referral_milestone_5_points||0),referral_milestone_10_points:Number(row.referral_milestone_10_points||0),benefits:row.benefits||{},redemption_enabled:row.redemption_enabled!==false,point_value_try:Number(row.point_value_try||0),minimum_redeem_points:Number(row.minimum_redeem_points||0),max_redeem_percent:Number(row.max_redeem_percent||0),referral_checkout_discount_enabled:row.referral_checkout_discount_enabled!==false,referral_checkout_discount_mode:row.referral_checkout_discount_mode==='PERCENT'?'PERCENT':'FIXED_AMOUNT',referral_rental_invitee_discount:Number(row.referral_rental_invitee_discount||0),referral_sale_invitee_discount:Number(row.referral_sale_invitee_discount||0),referral_tour_invitee_discount:Number(row.referral_tour_invitee_discount||0),allow_campaign_referral_stack:Boolean(row.allow_campaign_referral_stack),allow_campaign_loyalty_stack:Boolean(row.allow_campaign_loyalty_stack),allow_referral_loyalty_stack:Boolean(row.allow_referral_loyalty_stack),tour_points_per_100_try:Number(row.tour_points_per_100_try||0),sale_points_per_1000_try:Number(row.sale_points_per_1000_try||0)};}
  private async requireToken(){const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private validUuid(value:string){return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
  private async request<T>(method:'GET'|'POST'|'PATCH',token:string,body?:unknown):Promise<T>{const response=await fetch(this.endpoint,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json','x-request-id':crypto.randomUUID()},body:method==='GET'?undefined:JSON.stringify(body),cache:'no-store'});const payload=await response.json().catch(()=>({})) as T&{code?:string;message?:string};if(!response.ok)throw new Error(String(payload.code||payload.message||`CUSTOMER_ADMIN_${response.status}`));return payload;}
}
