import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

export type FavoriteEntityTypeV217 = 'VEHICLE' | 'TOUR' | 'BLOG';
export type FavoriteFilterV217 = FavoriteEntityTypeV217 | 'ALL';
export interface FavoriteRefV217 { entityType:FavoriteEntityTypeV217; entityId:string; metadata:Record<string,unknown>; createdAt:string; }
export interface FavoritePageV217 { refs:FavoriteRefV217[]; page:number; pageSize:number; hasMore:boolean; }

@Injectable({providedIn:'root'})
export class CustomerFavoritesV217Service {
  private readonly auth=inject(CustomerAuthService);
  private readonly storageKey='alperler_customer_favorites_v217';
  private readonly legacyVehicleKey='db_favoriteCars';
  private readonly state=signal(new Set<string>());
  private syncAttempted=false;

  isFavorite(type:FavoriteEntityTypeV217,id:string):boolean{return this.state().has(this.key(type,id))||this.localRefs().some(ref=>ref.entityType===type&&ref.entityId===this.cleanId(id));}

  async hydrateVisible(type:FavoriteEntityTypeV217,ids:string[]):Promise<void>{
    const clean=this.ids(ids);if(!clean.length)return;
    await this.auth.waitUntilReady();
    const token=await this.auth.getAccessToken();const userId=this.auth.user()?.id||'';
    if(!token||!userId){this.publishLocal();return;}
    await this.syncGuestFavorites(token,userId);
    const params=new URLSearchParams({select:'entity_type,entity_id',user_id:`eq.${userId}`,entity_type:`eq.${type}`,entity_id:`in.(${clean.map(v=>this.quote(v)).join(',')})`});
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?${params}`,{headers:this.headers(token)});
    if(!response.ok)return;
    const rows=await response.json() as Array<{entity_type?:string;entity_id?:string}>;const next=new Set(this.state());
    for(const id of clean)next.delete(this.key(type,id));
    for(const row of rows){const rowType=this.type(row.entity_type);const rowId=this.cleanId(row.entity_id);if(rowType&&rowId)next.add(this.key(rowType,rowId));}
    this.state.set(next);
  }

  async listPage(filter:FavoriteFilterV217='ALL',page=0,pageSize=24):Promise<FavoritePageV217>{
    const safePage=Math.max(0,Math.floor(page));const safeSize=Math.max(1,Math.min(48,Math.floor(pageSize)));await this.auth.waitUntilReady();
    const token=await this.auth.getAccessToken();const userId=this.auth.user()?.id||'';
    if(!token||!userId){const refs=this.localRefs().filter(ref=>filter==='ALL'||ref.entityType===filter);const start=safePage*safeSize;return{refs:refs.slice(start,start+safeSize),page:safePage,pageSize:safeSize,hasMore:start+safeSize<refs.length};}
    await this.syncGuestFavorites(token,userId);
    const params=new URLSearchParams({select:'entity_type,entity_id,metadata,created_at',user_id:`eq.${userId}`,order:'created_at.desc',limit:String(safeSize+1),offset:String(safePage*safeSize)});
    params.set('entity_type',filter==='ALL'?'in.(VEHICLE,TOUR,BLOG)':`eq.${filter}`);
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?${params}`,{headers:this.headers(token)});
    if(!response.ok)throw new Error(`FAVORITES_READ_${response.status}`);
    const rows=await response.json() as Array<Record<string,unknown>>;const refs=rows.slice(0,safeSize).map(row=>this.row(row)).filter((v):v is FavoriteRefV217=>!!v);this.publish(refs);
    return{refs,page:safePage,pageSize:safeSize,hasMore:rows.length>safeSize};
  }

  async toggle(type:FavoriteEntityTypeV217,id:string,metadata:Record<string,unknown>={}):Promise<boolean>{
    const entityId=this.cleanId(id);if(!entityId)throw new Error('FAVORITE_ID_REQUIRED');const active=this.isFavorite(type,entityId);if(active){await this.remove(type,entityId);return false;}await this.add(type,entityId,metadata);return true;
  }

  async add(type:FavoriteEntityTypeV217,id:string,metadata:Record<string,unknown>={}):Promise<void>{
    const entityId=this.cleanId(id);if(!entityId)return;await this.auth.waitUntilReady();const token=await this.auth.getAccessToken();const userId=this.auth.user()?.id||'';
    if(!token||!userId){this.writeLocal(type,entityId,metadata,true);return;}
    await this.syncGuestFavorites(token,userId);
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?on_conflict=user_id,entity_type,entity_id`,{method:'POST',headers:{...this.headers(token),'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:userId,entity_type:type,entity_id:entityId,metadata:this.safeMetadata(metadata)})});
    if(!response.ok)throw new Error(`FAVORITE_SAVE_${response.status}`);const next=new Set(this.state());next.add(this.key(type,entityId));this.state.set(next);
  }

  async remove(type:FavoriteEntityTypeV217,id:string):Promise<void>{
    const entityId=this.cleanId(id);if(!entityId)return;await this.auth.waitUntilReady();const token=await this.auth.getAccessToken();const userId=this.auth.user()?.id||'';
    if(!token||!userId){this.writeLocal(type,entityId,{},false);return;}
    const params=new URLSearchParams({user_id:`eq.${userId}`,entity_type:`eq.${type}`,entity_id:`eq.${entityId}`});const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?${params}`,{method:'DELETE',headers:this.headers(token)});if(!response.ok)throw new Error(`FAVORITE_DELETE_${response.status}`);const next=new Set(this.state());next.delete(this.key(type,entityId));this.state.set(next);
  }

  private async syncGuestFavorites(token:string,userId:string):Promise<void>{
    if(this.syncAttempted)return;this.syncAttempted=true;const refs=this.localRefs();if(!refs.length)return;
    const payload=refs.map(ref=>({user_id:userId,entity_type:ref.entityType,entity_id:ref.entityId,metadata:this.safeMetadata(ref.metadata)}));
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?on_conflict=user_id,entity_type,entity_id`,{method:'POST',headers:{...this.headers(token),'content-type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)}).catch(()=>null);
    if(response?.ok){if(typeof localStorage!=='undefined'){localStorage.removeItem(this.storageKey);localStorage.removeItem(this.legacyVehicleKey);}this.publish(refs);}
  }
  private localRefs():FavoriteRefV217[]{if(typeof localStorage==='undefined')return[];const refs:FavoriteRefV217[]=[];try{const raw=JSON.parse(localStorage.getItem(this.storageKey)||'[]');if(Array.isArray(raw))for(const value of raw){const row=this.row(value);if(row)refs.push(row);}}catch{/* Ignore malformed local favorites. */}try{const legacy=JSON.parse(localStorage.getItem(this.legacyVehicleKey)||'[]');if(Array.isArray(legacy))for(const value of legacy){const id=this.cleanId(value);if(id&&!refs.some(ref=>ref.entityType==='VEHICLE'&&ref.entityId===id))refs.push({entityType:'VEHICLE',entityId:id,metadata:{source:'legacy_vehicle_favorite'},createdAt:new Date(0).toISOString()});}}catch{/* Ignore malformed legacy favorites. */}return refs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  private writeLocal(type:FavoriteEntityTypeV217,id:string,metadata:Record<string,unknown>,active:boolean):void{if(typeof localStorage==='undefined')return;let refs=this.localRefs().filter(ref=>!(ref.entityType===type&&ref.entityId===id));if(active)refs=[{entityType:type,entityId:id,metadata:this.safeMetadata(metadata),createdAt:new Date().toISOString()},...refs];localStorage.setItem(this.storageKey,JSON.stringify(refs.slice(0,5000)));const next=new Set(this.state());active?next.add(this.key(type,id)):next.delete(this.key(type,id));this.state.set(next);}
  private publish(refs:FavoriteRefV217[]):void{const next=new Set(this.state());for(const ref of refs)next.add(this.key(ref.entityType,ref.entityId));this.state.set(next);}private publishLocal():void{this.publish(this.localRefs());}
  private row(value:unknown):FavoriteRefV217|null{if(!value||typeof value!=='object')return null;const row=value as Record<string,unknown>;const type=this.type(row['entityType']??row['entity_type']);const entityId=this.cleanId(row['entityId']??row['entity_id']);if(!type||!entityId)return null;const metadata=row['metadata']&&typeof row['metadata']==='object'&&!Array.isArray(row['metadata'])?row['metadata'] as Record<string,unknown>:{};return{entityType:type,entityId,metadata,createdAt:String(row['createdAt']??row['created_at']??new Date().toISOString())};}
  private type(value:unknown):FavoriteEntityTypeV217|null{const v=String(value||'').toUpperCase();return v==='VEHICLE'||v==='TOUR'||v==='BLOG'?v:null;}private cleanId(value:unknown):string{return String(value??'').trim().slice(0,160);}private ids(values:string[]):string[]{return[...new Set(values.map(v=>this.cleanId(v)).filter(Boolean))].slice(0,80);}private quote(value:string):string{return`"${value.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;}
  private key(type:FavoriteEntityTypeV217,id:string):string{return`${type}:${this.cleanId(id)}`;}private safeMetadata(value:Record<string,unknown>):Record<string,unknown>{const out:Record<string,unknown>={};for(const [k,v] of Object.entries(value).slice(0,16)){if(typeof v==='string')out[k.slice(0,60)]=v.slice(0,300);else if(typeof v==='number'||typeof v==='boolean'||v===null)out[k.slice(0,60)]=v;}return out;}
  private headers(token:string):Record<string,string>{return{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,accept:'application/json'};}
}
