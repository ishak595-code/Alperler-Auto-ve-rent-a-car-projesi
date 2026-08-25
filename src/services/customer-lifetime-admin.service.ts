import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerLifetimeSummary } from './customer-account.service';
import { AuthService } from './auth.service';

@Injectable({providedIn:'root'})
export class CustomerLifetimeAdminService{
  private readonly auth=inject(AuthService);
  readonly loading=signal(false);
  readonly summary=signal<CustomerLifetimeSummary|null>(null);
  readonly error=signal('');

  async load(userId:string):Promise<void>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId))throw new Error('INVALID_CUSTOMER_ID');
    const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');
    this.loading.set(true);this.error.set('');
    try{
      const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/customer_lifetime_summary`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({p_user_id:userId})});
      if(!response.ok){const payload=await response.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(payload.message||payload.code||`CUSTOMER_LIFETIME_${response.status}`);}
      this.summary.set(await response.json() as CustomerLifetimeSummary);
    }catch(error){this.summary.set(null);this.error.set(error instanceof Error?error.message:'CUSTOMER_LIFETIME_FAILED');throw error;}finally{this.loading.set(false);}
  }
}
