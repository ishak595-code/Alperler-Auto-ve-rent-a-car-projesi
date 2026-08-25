import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { CustomerDocumentType, CustomerExperiencePreferences } from './customer-wallet.service';
import { SafePaymentMethod } from './customer-account.service';

export interface AdminCustomerProfileDetail {user_id:string;email?:string|null;full_name?:string|null;phone?:string|null;birth_date?:string|null;address_line?:string|null;district?:string|null;city?:string|null;country?:string|null;postal_code?:string|null;avatar_url?:string|null;status:string;created_at:string;updated_at:string;}
export interface AdminCustomerLoyaltyDetail {user_id:string;points_balance:number;lifetime_points:number;completed_rentals:number;lifetime_spend:number;tier:string;successful_referrals:number;referral_points_earned:number;}
export interface AdminCustomerConsent {user_id:string;terms_version:string;accepted_at:string;revoked_at?:string|null;accepted_via:string;}
export interface AdminCustomerDocument {id:string;user_id:string;document_type:CustomerDocumentType;original_name:string;mime_type:string;file_size:number;expiry_date?:string|null;verification_status:'PENDING'|'VERIFIED'|'REJECTED'|'EXPIRED';verified_at?:string|null;rejection_reason?:string|null;created_at:string;updated_at:string;}
export interface AdminCustomerReferral {id:string;inviter_user_id:string;invitee_user_id:string;referral_code:string;status:string;qualified_booking_id?:string|null;inviter_points_awarded:number;invitee_points_awarded:number;claimed_at:string;rewarded_at?:string|null;created_at:string;source_campaign_id?:string|null;landing_path?:string|null;instant_discount_booking_id?:string|null;instant_discount_amount?:number|null;instant_discount_used_at?:string|null;}
export interface AdminCustomerReferralReward {id:string;referral_id:string;booking_id:string;reward_type:string;inviter_points:number;invitee_points:number;rewarded_at:string;}
export interface AdminCustomerBooking {id:string;reference:string;booking_type:string;item_name:string;total_price?:number|null;amount_paid?:number|null;discount_amount?:number|null;currency:string;status:string;payment_status:string;created_at:string;}
interface AdminCustomerDetailPayload{ok?:boolean;code?:string;profile?:AdminCustomerProfileDetail|null;loyalty?:AdminCustomerLoyaltyDetail|null;preferences?:CustomerExperiencePreferences|null;consents?:AdminCustomerConsent[];documents?:AdminCustomerDocument[];referrals?:AdminCustomerReferral[];referralRewards?:AdminCustomerReferralReward[];paymentMethods?:SafePaymentMethod[];bookings?:AdminCustomerBooking[];capabilities?:{manageSettings?:boolean};}
interface MutationPayload{ok?:boolean;code?:string;message?:string;signedUrl?:string;[key:string]:unknown;}

@Injectable({providedIn:'root'})
export class CustomerAdminDetailService{
  private readonly auth=inject(AuthService);
  readonly loading=signal(false);readonly profile=signal<AdminCustomerProfileDetail|null>(null);readonly loyalty=signal<AdminCustomerLoyaltyDetail|null>(null);readonly preferences=signal<CustomerExperiencePreferences|null>(null);readonly consents=signal<AdminCustomerConsent[]>([]);readonly documents=signal<AdminCustomerDocument[]>([]);readonly referrals=signal<AdminCustomerReferral[]>([]);readonly referralRewards=signal<AdminCustomerReferralReward[]>([]);readonly paymentMethods=signal<SafePaymentMethod[]>([]);readonly bookings=signal<AdminCustomerBooking[]>([]);

  async load(userId:string):Promise<void>{
    if(!this.validUuid(userId))throw new Error('INVALID_CUSTOMER_ID');const token=await this.requireToken();this.loading.set(true);
    try{
      const payload=await this.request<AdminCustomerDetailPayload>('GET',token,undefined,userId);
      if(payload.ok!==true)throw new Error(payload.code||'CUSTOMER_ADMIN_DETAIL_FAILED');
      this.profile.set(payload.profile||null);
      this.loyalty.set(payload.loyalty?{...payload.loyalty,points_balance:Number(payload.loyalty.points_balance||0),lifetime_points:Number(payload.loyalty.lifetime_points||0),completed_rentals:Number(payload.loyalty.completed_rentals||0),lifetime_spend:Number(payload.loyalty.lifetime_spend||0),successful_referrals:Number(payload.loyalty.successful_referrals||0),referral_points_earned:Number(payload.loyalty.referral_points_earned||0)}:null);
      this.preferences.set(payload.preferences?this.normalizePrefs(payload.preferences):null);
      this.consents.set(payload.consents||[]);this.documents.set(payload.documents||[]);
      this.referrals.set((payload.referrals||[]).map(row=>({...row,inviter_points_awarded:Number(row.inviter_points_awarded||0),invitee_points_awarded:Number(row.invitee_points_awarded||0),instant_discount_amount:row.instant_discount_amount==null?null:Number(row.instant_discount_amount)})));
      this.referralRewards.set((payload.referralRewards||[]).map(row=>({...row,inviter_points:Number(row.inviter_points||0),invitee_points:Number(row.invitee_points||0)})));
      this.paymentMethods.set(payload.paymentMethods||[]);
      this.bookings.set((payload.bookings||[]).map(row=>({...row,total_price:row.total_price==null?null:Number(row.total_price),amount_paid:row.amount_paid==null?null:Number(row.amount_paid),discount_amount:row.discount_amount==null?null:Number(row.discount_amount)})));
    }finally{this.loading.set(false);}
  }

  async documentUrl(doc:AdminCustomerDocument):Promise<string>{
    const token=await this.requireToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'signDocument',documentId:doc.id});
    if(payload.ok!==true||typeof payload.signedUrl!=='string'||!payload.signedUrl)throw new Error(payload.code||'DOCUMENT_SIGN_FAILED');
    return payload.signedUrl;
  }
  async reviewDocument(id:string,status:'PENDING'|'VERIFIED'|'REJECTED'|'EXPIRED',reason?:string):Promise<void>{
    if(!this.validUuid(id))throw new Error('INVALID_DOCUMENT_ID');const token=await this.requireToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'reviewDocument',documentId:id,status,reason:reason?.trim().slice(0,500)||null});if(payload.ok!==true)throw new Error(payload.code||'DOCUMENT_REVIEW_FAILED');const current=this.profile()?.user_id;if(current)await this.load(current);
  }

  spendByCurrency():Array<{currency:string;spent:number;saved:number;transactions:number}>{const map=new Map<string,{currency:string;spent:number;saved:number;transactions:number}>();for(const row of this.bookings().filter(x=>x.status==='COMPLETED')){const current=map.get(row.currency)||{currency:row.currency,spent:0,saved:0,transactions:0};current.spent+=Number(row.amount_paid&&row.amount_paid>0?row.amount_paid:row.total_price||0);current.saved+=Number(row.discount_amount||0);current.transactions+=1;map.set(row.currency,current);}return[...map.values()].sort((a,b)=>b.spent-a.spent);}

  private normalizePrefs(row:CustomerExperiencePreferences):CustomerExperiencePreferences{return{...row,monthly_spend_target:row.monthly_spend_target==null?null:Number(row.monthly_spend_target),spend_alert_threshold_percent:Number(row.spend_alert_threshold_percent||80),document_expiry_reminder_days:Number(row.document_expiry_reminder_days||30)};}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private validUuid(value:string){return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
  private async request<T>(method:'GET'|'PATCH',token:string,body?:unknown,userId?:string):Promise<T>{const path=userId?`/api/customer-admin?userId=${encodeURIComponent(userId)}`:'/api/customer-admin';const response=await fetch(path,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json','x-request-id':crypto.randomUUID()},body:method==='GET'?undefined:JSON.stringify(body),cache:'no-store'});const payload=await response.json().catch(()=>({})) as T&{code?:string;message?:string};if(!response.ok)throw new Error(String(payload.code||payload.message||`CUSTOMER_ADMIN_DETAIL_${response.status}`));return payload;}
}
