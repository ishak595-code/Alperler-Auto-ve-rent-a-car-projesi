import { Injectable, inject } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAccountService, CustomerProfile } from './customer-account.service';
import { CustomerAuthService } from './customer-auth.service';

export interface CustomerProfileDraftV241 {
  full_name:string;
  phone:string;
  birth_date:string;
  address_line:string;
  district:string;
  city:string;
  postal_code:string;
  preferred_locale:string;
  marketing_consent:boolean;
}

@Injectable({providedIn:'root'})
export class CustomerProfileV241Service {
  private readonly auth=inject(CustomerAuthService);
  private readonly account=inject(CustomerAccountService);
  private readonly profileSelect='user_id,email,full_name,phone,birth_date,address_line,district,city,country,postal_code,avatar_url,preferred_locale,preferred_branch_id,marketing_consent,status';

  async loadProfile():Promise<CustomerProfile>{
    const token=await this.requireToken();
    await this.rpc('ensure_customer_profile',{},token);
    const userId=this.requireUserId();
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_profiles?user_id=eq.${encodeURIComponent(userId)}&select=${this.profileSelect}&limit=1`,{headers:this.headers(token),cache:'no-store'});
    if(!response.ok)throw new Error(await this.responseError(response,'PROFILE_LOAD_FAILED'));
    const rows=await response.json() as CustomerProfile[];
    if(!rows[0])throw new Error('PROFILE_NOT_FOUND');
    return rows[0];
  }

  async updateProfile(draft:CustomerProfileDraftV241):Promise<CustomerProfile>{
    const token=await this.requireToken();
    const body={
      full_name:this.text(draft.full_name,160),
      phone:this.text(draft.phone,40),
      birth_date:draft.birth_date||null,
      address_line:this.text(draft.address_line,240),
      district:this.text(draft.district,100),
      city:this.text(draft.city,100),
      country:'TR',
      postal_code:this.text(draft.postal_code,30),
      preferred_locale:this.text(draft.preferred_locale,10)||'tr',
      marketing_consent:Boolean(draft.marketing_consent),
      updated_at:new Date().toISOString(),
    };
    const updated=await this.patchProfile(body,token);
    await this.account.refresh().catch(()=>undefined);
    return updated;
  }

  async uploadAvatar(file:File):Promise<CustomerProfile>{
    const extension=this.extension(file);
    if(file.size<=0||file.size>2*1024*1024)throw new Error('AVATAR_SIZE_INVALID');
    const token=await this.requireToken();
    const userId=this.requireUserId();
    const previous=(await this.loadProfile()).avatar_url||'';
    const nonce=typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const objectPath=`${userId}/avatar-${Date.now()}-${nonce}.${extension}`;
    const encoded=this.encodedPath(objectPath);
    const upload=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/customer-avatars/${encoded}`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        authorization:`Bearer ${token}`,
        'content-type':file.type,
        'cache-control':'31536000',
        'x-upsert':'false',
      },
      body:file,
    });
    if(!upload.ok)throw new Error(await this.responseError(upload,`AVATAR_UPLOAD_${upload.status}`));

    const publicUrl=`${SUPABASE_PROJECT_URL}/storage/v1/object/public/customer-avatars/${encoded}`;
    let updated:CustomerProfile;
    try{
      updated=await this.patchProfile({avatar_url:publicUrl,updated_at:new Date().toISOString()},token);
    }catch(error){
      await this.deletePath(objectPath,token).catch(()=>undefined);
      throw error;
    }
    if(previous&&this.objectPath(previous)!==objectPath)await this.deleteOwnedUrl(previous,token).catch(()=>undefined);
    await this.account.refresh().catch(()=>undefined);
    return updated;
  }

  async removeAvatar():Promise<CustomerProfile>{
    const token=await this.requireToken();
    const current=await this.loadProfile();
    const updated=await this.patchProfile({avatar_url:null,updated_at:new Date().toISOString()},token);
    if(current.avatar_url)await this.deleteOwnedUrl(current.avatar_url,token).catch(()=>undefined);
    await this.account.refresh().catch(()=>undefined);
    return updated;
  }

  private async patchProfile(body:Record<string,unknown>,token:string):Promise<CustomerProfile>{
    const userId=this.requireUserId();
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_profiles?user_id=eq.${encodeURIComponent(userId)}&select=${this.profileSelect}`,{
      method:'PATCH',headers:this.headers(token,{Prefer:'return=representation'}),body:JSON.stringify(body),cache:'no-store',
    });
    if(!response.ok)throw new Error(await this.responseError(response,`PROFILE_UPDATE_${response.status}`));
    const rows=await response.json() as CustomerProfile[];
    if(!rows[0])throw new Error('PROFILE_UPDATE_EMPTY');
    return rows[0];
  }

  private async deleteOwnedUrl(url:string,token:string):Promise<void>{
    const path=this.objectPath(url);const userId=this.requireUserId();
    if(!path||!path.startsWith(`${userId}/`))return;
    await this.deletePath(path,token);
  }

  private async deletePath(path:string,token:string):Promise<void>{
    const response=await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/customer-avatars`,{
      method:'DELETE',headers:this.headers(token),body:JSON.stringify({prefixes:[path]}),
    });
    if(!response.ok&&response.status!==404)throw new Error(`AVATAR_DELETE_${response.status}`);
  }

  private objectPath(url:string):string|null{
    const marker='/storage/v1/object/public/customer-avatars/';const index=url.indexOf(marker);
    if(index<0)return null;return decodeURIComponent(url.slice(index+marker.length).split('?')[0]);
  }
  private encodedPath(path:string):string{return path.split('/').map(part=>encodeURIComponent(part)).join('/');}
  private extension(file:File):string{
    const map:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    const extension=map[file.type];if(!extension)throw new Error('AVATAR_TYPE_INVALID');return extension;
  }
  private requireUserId():string{const id=this.auth.user()?.id||'';if(!id)throw new Error('CUSTOMER_SESSION_REQUIRED');return id;}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('CUSTOMER_SESSION_REQUIRED');return token;}
  private headers(token:string,extra:Record<string,string>={}):Record<string,string>{return{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json',...extra};}
  private async rpc(name:string,body:unknown,token:string):Promise<void>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});if(!response.ok)throw new Error(await this.responseError(response,`${name.toUpperCase()}_FAILED`));}
  private async responseError(response:Response,fallback:string):Promise<string>{const payload=await response.json().catch(()=>({})) as {message?:string;error?:string;code?:string};return String(payload.message||payload.error||payload.code||fallback);}
  private text(value:unknown,max:number):string|null{return typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;}
}
