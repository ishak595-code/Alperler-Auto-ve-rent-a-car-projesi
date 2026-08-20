import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { AuthService } from './auth.service';
import { CustomerDocument, CustomerExperiencePreferences } from './customer-wallet.service';
import { SafePaymentMethod } from './customer-account.service';

export interface AdminCustomerProfileDetail {user_id:string;email?:string|null;full_name?:string|null;phone?:string|null;birth_date?:string|null;address_line?:string|null;district?:string|null;city?:string|null;country?:string|null;postal_code?:string|null;avatar_url?:string|null;status:string;created_at:string;updated_at:string;}
export interface AdminCustomerLoyaltyDetail {user_id:string;points_balance:number;lifetime_points:number;completed_rentals:number;lifetime_spend:number;tier:string;successful_referrals:number;referral_points_earned:number;}
export interface AdminCustomerConsent {user_id:string;terms_version:string;accepted_at:string;revoked_at?:string|null;accepted_via:string;}
export interface AdminCustomerReferral {id:string;inviter_user_id:string;invitee_user_id:string;referral_code:string;status:string;qualified_booking_id?:string|null;inviter_points_awarded:number;invitee_points_awarded:number;claimed_at:string;rewarded_at?:string|null;created_at:string;}
export interface AdminCustomerReferralReward {id:string;referral_id:string;booking_id:string;reward_type:string;inviter_points:number;invitee_points:number;rewarded_at:string;}
export interface AdminCustomerBooking {id:string;reference:string;booking_type:string;item_name:string;total_price?:number|null;amount_paid?:number|null;discount_amount?:number|null;currency:string;status:string;payment_status:string;created_at:string;}

@Injectable({providedIn:'root'})
export class CustomerAdminDetailService{
  private readonly auth=inject(AuthService);
  readonly loading=signal(false);readonly profile=signal<AdminCustomerProfileDetail|null>(null);readonly loyalty=signal<AdminCustomerLoyaltyDetail|null>(null);readonly preferences=signal<CustomerExperiencePreferences|null>(null);readonly consents=signal<AdminCustomerConsent[]>([]);readonly documents=signal<CustomerDocument[]>([]);readonly referrals=signal<AdminCustomerReferral[]>([]);readonly referralRewards=signal<AdminCustomerReferralReward[]>([]);readonly paymentMethods=signal<SafePaymentMethod[]>([]);readonly bookings=signal<AdminCustomerBooking[]>([]);

  async load(userId:string):Promise<void>{
    if(!/^[0-9a-f-]{36}$/i.test(userId))throw new Error('INVALID_CUSTOMER_ID');const token=await this.requireToken();this.loading.set(true);
    try{
      const [profiles,loyalty,prefs,consents,docs,invited,received,payments,bookings]=await Promise.all([
        this.rows<AdminCustomerProfileDetail>(`customer_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,token),
        this.rows<AdminCustomerLoyaltyDetail>(`customer_loyalty_accounts?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,token),
        this.rows<CustomerExperiencePreferences>(`customer_experience_preferences?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,token),
        this.rows<AdminCustomerConsent>(`customer_vault_consents?user_id=eq.${encodeURIComponent(userId)}&select=user_id,terms_version,accepted_at,revoked_at,accepted_via&order=accepted_at.desc`,token),
        this.rows<CustomerDocument>(`customer_documents?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,document_type,storage_path,original_name,mime_type,file_size,expiry_date,verification_status,verified_at,rejection_reason,created_at,updated_at&order=created_at.desc`,token),
        this.rows<AdminCustomerReferral>(`customer_referrals?inviter_user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=500`,token),
        this.rows<AdminCustomerReferral>(`customer_referrals?invitee_user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=10`,token),
        this.rows<SafePaymentMethod>(`customer_payment_methods?user_id=eq.${encodeURIComponent(userId)}&select=id,provider,brand,last4,expiry_month,expiry_year,label,is_default,status&order=is_default.desc,created_at.desc`,token),
        this.rows<AdminCustomerBooking>(`bookings?customer_user_id=eq.${encodeURIComponent(userId)}&deleted_at=is.null&select=id,reference,booking_type,item_name,total_price,amount_paid,discount_amount,currency,status,payment_status,created_at&order=created_at.desc&limit=500`,token),
      ]);
      const refs=[...invited,...received];const ids=[...new Set(refs.map(row=>row.id))];let rewards:AdminCustomerReferralReward[]=[];
      if(ids.length){const inFilter=ids.join(',');rewards=await this.rows<AdminCustomerReferralReward>(`customer_referral_rewards?referral_id=in.(${inFilter})&select=*&order=rewarded_at.desc&limit=1000`,token);}
      this.profile.set(profiles[0]||null);this.loyalty.set(loyalty[0]||null);this.preferences.set(prefs[0]?this.normalizePrefs(prefs[0]):null);this.consents.set(consents);this.documents.set(docs);this.referrals.set(refs);this.referralRewards.set(rewards);this.paymentMethods.set(payments);this.bookings.set(bookings.map(row=>({...row,total_price:row.total_price===null||row.total_price===undefined?null:Number(row.total_price),amount_paid:row.amount_paid===null||row.amount_paid===undefined?null:Number(row.amount_paid),discount_amount:row.discount_amount===null||row.discount_amount===undefined?null:Number(row.discount_amount)})));
    }finally{this.loading.set(false);}
  }

  async documentUrl(doc:CustomerDocument):Promise<string>{const token=await this.requireToken();const encoded=doc.storage_path.split('/').map(encodeURIComponent).join('/');const response=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/sign/customer-documents/${encoded}`,{method:'POST',headers:this.headers(token),body:JSON.stringify({expiresIn:120})});if(!response.ok)throw new Error('DOCUMENT_SIGN_FAILED');const data=await response.json() as {signedURL?:string;signedUrl?:string};const signed=data.signedURL||data.signedUrl||'';if(!signed)throw new Error('DOCUMENT_SIGN_FAILED');return signed.startsWith('http')?signed:`${SUPABASE_PROJECT_URL}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;}
  async reviewDocument(id:string,status:'PENDING'|'VERIFIED'|'REJECTED'|'EXPIRED',reason?:string):Promise<void>{const token=await this.requireToken();await this.rpc('admin_review_customer_document',{p_document_id:id,p_status:status,p_reason:reason||null},token);const current=this.profile()?.user_id;if(current)await this.load(current);}

  spendByCurrency():Array<{currency:string;spent:number;saved:number;transactions:number}>{const map=new Map<string,{currency:string;spent:number;saved:number;transactions:number}>();for(const row of this.bookings().filter(x=>x.status==='COMPLETED')){const current=map.get(row.currency)||{currency:row.currency,spent:0,saved:0,transactions:0};current.spent+=Number(row.amount_paid&&row.amount_paid>0?row.amount_paid:row.total_price||0);current.saved+=Number(row.discount_amount||0);current.transactions+=1;map.set(row.currency,current);}return[...map.values()].sort((a,b)=>b.spent-a.spent);}

  private normalizePrefs(row:CustomerExperiencePreferences):CustomerExperiencePreferences{return{...row,monthly_spend_target:row.monthly_spend_target===null||row.monthly_spend_target===undefined?null:Number(row.monthly_spend_target),spend_alert_threshold_percent:Number(row.spend_alert_threshold_percent||80),document_expiry_reminder_days:Number(row.document_expiry_reminder_days||30)};}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private headers(token:string,extra:Record<string,string>={}):Record<string,string>{return{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json',...extra};}
  private async rows<T>(path:string,token:string):Promise<T[]>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{headers:this.headers(token)});if(!response.ok)throw new Error(`CUSTOMER_ADMIN_DETAIL_${response.status}`);return await response.json() as T[];}
  private async rpc<T=unknown>(name:string,body:unknown,token:string):Promise<T>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});if(!response.ok){const data=await response.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(data.message||data.code||`${name.toUpperCase()}_FAILED`);}return await response.json().catch(()=>null) as T;}
}
