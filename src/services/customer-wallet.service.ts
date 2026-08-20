import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

export type CustomerDocumentType = 'IDENTITY_FRONT'|'IDENTITY_BACK'|'DRIVING_LICENSE_FRONT'|'DRIVING_LICENSE_BACK'|'PASSPORT'|'ADDRESS_DOCUMENT'|'OTHER';

export interface CustomerVaultTerms { version:string; title:string; body:string; is_active:boolean; published_at:string; }
export interface CustomerVaultConsent { user_id:string; terms_version:string; accepted_at:string; revoked_at?:string|null; accepted_via:string; }
export interface CustomerDocument {
  id:string; user_id:string; document_type:CustomerDocumentType; storage_path:string; original_name:string; mime_type:string; file_size:number;
  expiry_date?:string|null; verification_status:'PENDING'|'VERIFIED'|'REJECTED'|'EXPIRED'; verified_at?:string|null; rejection_reason?:string|null; created_at:string; updated_at:string;
}
export interface CustomerExperiencePreferences {
  user_id:string; monthly_spend_target?:number|null; preferred_currency:'TRY'|'EUR'|'USD'|'CHF'; spend_alert_enabled:boolean;
  spend_alert_threshold_percent:number; document_expiry_reminder_days:number; quick_checkout_enabled:boolean; preferred_payment_method_id?:string|null;
}
export interface SpendingCurrencySummary {
  currency:string; monthSpend:number; yearSpend:number; lifetimeSpend:number; discountSavings:number; rentalSpend:number; vehiclePurchaseSpend:number; tourSpend:number; completedTransactions:number;
}

@Injectable({providedIn:'root'})
export class CustomerWalletService{
  private readonly auth=inject(CustomerAuthService);
  readonly loading=signal(false);
  readonly terms=signal<CustomerVaultTerms|null>(null);
  readonly consent=signal<CustomerVaultConsent|null>(null);
  readonly documents=signal<CustomerDocument[]>([]);
  readonly preferences=signal<CustomerExperiencePreferences|null>(null);
  readonly spending=signal<SpendingCurrencySummary[]>([]);

  async refresh():Promise<void>{
    const token=await this.requireToken();this.loading.set(true);
    try{
      const [terms,consents,docs,prefs,spending]=await Promise.all([
        this.rows<CustomerVaultTerms>('customer_vault_terms?is_active=eq.true&select=version,title,body,is_active,published_at&limit=1',token),
        this.rows<CustomerVaultConsent>('customer_vault_consents?revoked_at=is.null&select=user_id,terms_version,accepted_at,revoked_at,accepted_via&order=accepted_at.desc&limit=1',token),
        this.rows<CustomerDocument>('customer_documents?select=id,user_id,document_type,storage_path,original_name,mime_type,file_size,expiry_date,verification_status,verified_at,rejection_reason,created_at,updated_at&order=created_at.desc',token),
        this.rows<CustomerExperiencePreferences>('customer_experience_preferences?select=*&limit=1',token),
        this.rpc<SpendingCurrencySummary[]>('customer_spending_summary',{},token),
      ]);
      this.terms.set(terms[0]||null);this.consent.set(consents[0]||null);this.documents.set(docs);this.spending.set(Array.isArray(spending)?spending:[]);
      if(prefs[0])this.preferences.set(this.normalizePreferences(prefs[0]));
      else await this.savePreferences({preferred_currency:'TRY',spend_alert_enabled:false,spend_alert_threshold_percent:80,document_expiry_reminder_days:30,quick_checkout_enabled:true});
    }finally{this.loading.set(false);}
  }

  hasActiveConsent():boolean{return Boolean(this.terms()&&this.consent()&&this.terms()?.version===this.consent()?.terms_version&&!this.consent()?.revoked_at);}

  async acceptTerms():Promise<void>{const token=await this.requireToken();await this.rpc('accept_customer_vault_terms',{},token);await this.refresh();}
  async revokeTerms():Promise<void>{const token=await this.requireToken();await this.rpc('revoke_customer_vault_terms',{},token);await this.refresh();}

  async uploadDocument(file:File,type:CustomerDocumentType,expiryDate?:string|null):Promise<void>{
    if(!this.hasActiveConsent())throw new Error('VAULT_CONSENT_REQUIRED');
    const mimeExtension=new Map<string,string>([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['application/pdf','pdf']]);
    const extension=mimeExtension.get(file.type);if(!extension)throw new Error('DOCUMENT_TYPE_INVALID');
    if(file.size<=0||file.size>10*1024*1024)throw new Error('DOCUMENT_SIZE_INVALID');
    const token=await this.requireToken();const userId=this.auth.user()?.id||'';if(!userId)throw new Error('CUSTOMER_SESSION_REQUIRED');
    const path=`${userId}/${crypto.randomUUID()}.${extension}`;
    const encoded=path.split('/').map(encodeURIComponent).join('/');
    const upload=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/customer-documents/${encoded}`,{
      method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':file.type,'x-upsert':'false'},body:file,
    });
    if(!upload.ok)throw new Error(`DOCUMENT_UPLOAD_${upload.status}`);
    const metadata={user_id:userId,document_type:type,storage_path:path,original_name:this.cleanFileName(file.name),mime_type:file.type,file_size:file.size,expiry_date:expiryDate||null};
    const insert=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_documents`,{method:'POST',headers:this.headers(token,{Prefer:'return=minimal'}),body:JSON.stringify(metadata)});
    if(!insert.ok){await this.deleteStorageObject(path,token).catch(()=>undefined);throw new Error(`DOCUMENT_METADATA_${insert.status}`);}
    await this.refresh();
  }

  async openDocument(doc:CustomerDocument):Promise<void>{
    const token=await this.requireToken();const encoded=doc.storage_path.split('/').map(encodeURIComponent).join('/');
    const response=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/sign/customer-documents/${encoded}`,{method:'POST',headers:this.headers(token),body:JSON.stringify({expiresIn:120})});
    if(!response.ok)throw new Error('DOCUMENT_SIGN_FAILED');
    const data=await response.json() as {signedURL?:string;signedUrl?:string};const signed=data.signedURL||data.signedUrl||'';if(!signed)throw new Error('DOCUMENT_SIGN_FAILED');
    const url=signed.startsWith('http')?signed:`${SUPABASE_PROJECT_URL}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;
    window.open(url,'_blank','noopener,noreferrer');
  }

  async deleteDocument(doc:CustomerDocument):Promise<void>{
    const token=await this.requireToken();await this.deleteStorageObject(doc.storage_path,token);
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_documents?id=eq.${encodeURIComponent(doc.id)}`,{method:'DELETE',headers:this.headers(token,{Prefer:'return=minimal'})});
    if(!response.ok)throw new Error('DOCUMENT_DELETE_FAILED');
    this.documents.update(rows=>rows.filter(row=>row.id!==doc.id));
  }

  async savePreferences(patch:Partial<CustomerExperiencePreferences>):Promise<void>{
    const token=await this.requireToken();const userId=this.auth.user()?.id||'';if(!userId)throw new Error('CUSTOMER_SESSION_REQUIRED');
    const current=this.preferences();
    const body:CustomerExperiencePreferences={
      user_id:userId,
      monthly_spend_target:patch.monthly_spend_target===undefined?(current?.monthly_spend_target??null):this.moneyOrNull(patch.monthly_spend_target),
      preferred_currency:(patch.preferred_currency||current?.preferred_currency||'TRY') as CustomerExperiencePreferences['preferred_currency'],
      spend_alert_enabled:patch.spend_alert_enabled??current?.spend_alert_enabled??false,
      spend_alert_threshold_percent:this.integer(patch.spend_alert_threshold_percent??current?.spend_alert_threshold_percent??80,50,100),
      document_expiry_reminder_days:this.integer(patch.document_expiry_reminder_days??current?.document_expiry_reminder_days??30,1,365),
      quick_checkout_enabled:patch.quick_checkout_enabled??current?.quick_checkout_enabled??true,
      preferred_payment_method_id:patch.preferred_payment_method_id===undefined?(current?.preferred_payment_method_id??null):patch.preferred_payment_method_id,
    };
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_experience_preferences?on_conflict=user_id`,{
      method:'POST',headers:this.headers(token,{Prefer:'resolution=merge-duplicates,return=representation'}),body:JSON.stringify(body),
    });
    if(!response.ok)throw new Error('PREFERENCES_SAVE_FAILED');
    const rows=await response.json() as CustomerExperiencePreferences[];this.preferences.set(this.normalizePreferences(rows[0]||body));
  }

  async setDefaultPaymentMethod(id:string):Promise<void>{const token=await this.requireToken();await this.rpc('set_default_customer_payment_method',{p_method_id:id},token);}
  async removePaymentMethod(id:string):Promise<void>{const token=await this.requireToken();await this.rpc('remove_customer_payment_method',{p_method_id:id},token);}

  currentCurrencySummary():SpendingCurrencySummary|null{
    const currency=this.preferences()?.preferred_currency||'TRY';return this.spending().find(row=>row.currency===currency)||null;
  }

  private async deleteStorageObject(path:string,token:string):Promise<void>{const encoded=path.split('/').map(encodeURIComponent).join('/');const response=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/customer-documents/${encoded}`,{method:'DELETE',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`}});if(!response.ok&&response.status!==404)throw new Error('DOCUMENT_STORAGE_DELETE_FAILED');}
  private normalizePreferences(row:CustomerExperiencePreferences):CustomerExperiencePreferences{return{...row,monthly_spend_target:row.monthly_spend_target===null||row.monthly_spend_target===undefined?null:Number(row.monthly_spend_target),spend_alert_threshold_percent:Number(row.spend_alert_threshold_percent||80),document_expiry_reminder_days:Number(row.document_expiry_reminder_days||30)};}
  private moneyOrNull(value:unknown):number|null{if(value===null||value===''||value===undefined)return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>1000000000)throw new Error('SPEND_TARGET_INVALID');return Math.round(n*100)/100;}
  private integer(value:unknown,min:number,max:number):number{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error('PREFERENCE_INVALID');return n;}
  private cleanFileName(value:string):string{return value.replace(/[\u0000-\u001f]/g,'').trim().slice(0,180)||'belge';}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('CUSTOMER_SESSION_REQUIRED');return token;}
  private headers(token:string,extra:Record<string,string>={}):Record<string,string>{return{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json',...extra};}
  private async rows<T>(path:string,token:string):Promise<T[]>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{headers:this.headers(token)});if(!response.ok)throw new Error(`CUSTOMER_WALLET_READ_${response.status}`);return await response.json() as T[];}
  private async rpc<T=unknown>(name:string,body:unknown,token:string):Promise<T>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});if(!response.ok){const data=await response.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(data.message||data.code||`${name.toUpperCase()}_FAILED`);}return await response.json().catch(()=>null) as T;}
}
