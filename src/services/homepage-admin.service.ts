import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { CarService } from './car.service';

export type HomepageSectionType = 'VEHICLES' | 'TOURS' | 'BLOG' | 'CAMPAIGN' | 'CUSTOM';
export type HomepageEntityType = 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN';
export type HomepageTheme = 'light' | 'soft' | 'dark' | 'brand' | 'ocean' | 'emerald' | 'sunset' | 'violet' | 'sand' | 'graphite';

export interface HomepageSectionSettings {
  category?: 'RENTAL' | 'SALE';
  renderer?: 'BRANCHES' | 'PARTNER' | 'PROMO' | 'PREFOOTER';
  badge?: string; description?: string; profileImage?: string; backgroundImage?: string; coverImage?: string; backgroundColor?: string;
  theme?: HomepageTheme; layout?: 'rail' | 'grid' | 'wide'; width?: 'standard' | 'wide' | 'full';
  viewAllLabel?: string; viewAllUrl?: string; ctaLabel?: string; ctaUrl?: string; secondaryCtaLabel?: string; secondaryCtaUrl?: string;
  partnerCtaTitle?: string; partnerCtaLabel?: string; partnerRoute?: string; showPartnerCta?: boolean; trustItems?: string[];
  promoFallbackBadge?: string; promoFallbackDescription?: string;
  campaignLabel?: string; campaignDiscountSuffix?: string; campaignFallbackDescription?: string; campaignCtaLabel?: string;
  campaignSavingSuffix?: string; campaignAdvantageSuffix?: string; campaignLimitedLabel?: string; campaignExpiredLabel?: string;
  campaignDaysRemainingSuffix?: string; campaignOneDayRemainingLabel?: string; campaignHoursRemainingSuffix?: string;
  campaignProofActiveSuffix?: string; campaignProofRecentSuffix?: string; campaignProofUniqueSuffix?: string; campaignViewsSuffix?: string; campaignNewLabel?: string;
  tourFallbackDescription?: string; tourCardCtaLabel?: string;
  branchFranchiseLabel?: string; branchLocationLabel?: string; branchFallbackDescriptionSuffix?: string;
  branchPickupLabel?: string; branchReturnLabel?: string; branchCardCtaLabel?: string;
  blogCardCtaLabel?: string;
  selectionMode?: 'PLACEMENT' | 'LATEST';
  [key: string]: unknown;
}
export interface HomepageSectionRecord { sectionKey:string; title:string; sectionType:HomepageSectionType; isEnabled:boolean; sortOrder:number; maxItems:number; settings:HomepageSectionSettings; }
export interface HomepagePlacementRecord { id:string; sectionKey:string; entityType:HomepageEntityType; entityId:string; label?:string; sortOrder:number; isActive:boolean; startsAt?:string; endsAt?:string; metadata:Record<string,unknown>; }
interface SnapshotPayload { ok?:boolean; code?:string; homepageSections?:any[]; homepagePlacements?:any[]; capabilities?:{content?:boolean;settings?:boolean}; }
interface MutationPayload { ok?:boolean; code?:string; section?:any; placement?:any; [key:string]:unknown; }

@Injectable({ providedIn: 'root' })
export class HomepageAdminService {
  private readonly auth=inject(AuthService);private readonly cars=inject(CarService);private readonly endpoint='/api/partner?op=site-content-admin';
  private readonly _sections=signal<HomepageSectionRecord[]>([]);private readonly _placements=signal<HomepagePlacementRecord[]>([]);private readonly _loading=signal(false);
  readonly sections=this._sections.asReadonly();readonly placements=this._placements.asReadonly();readonly loading=this._loading.asReadonly();

  async refresh():Promise<void>{
    this._loading.set(true);
    try{
      const token=await this.requiredToken();
      const [payload]=await Promise.all([
        this.request<SnapshotPayload>('GET',token),
        this.cars.refreshSiteConfig(true),
      ]);
      if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_ADMIN_LOAD_FAILED');
      const placements=(payload.homepagePlacements||[]).map(row=>this.placementFromRow(row));
      const sections=(payload.homepageSections||[]).map(row=>this.sectionFromRow(row));
      this._placements.set(placements);
      this._sections.set(this.reconcileManualCounts(sections,placements));
    }finally{this._loading.set(false);}
  }

  async createSection(input:{title:string;sectionType:HomepageSectionType;maxItems?:number;settings?:HomepageSectionSettings}):Promise<HomepageSectionRecord>{
    const token=await this.requiredToken();const sectionKey=this.createSectionKey(input.title);const nextSort=this._sections().reduce((max,item)=>Math.max(max,item.sortOrder),0)+10;
    const settings:HomepageSectionSettings={...(input.settings||{})};if(this.supportsPlacements(input.sectionType)&&!settings.selectionMode)settings.selectionMode='PLACEMENT';
    const isManual=this.supportsPlacements(input.sectionType)&&String(settings.selectionMode||'PLACEMENT').toUpperCase()!=='LATEST';
    const section:HomepageSectionRecord={sectionKey,title:input.title.trim(),sectionType:input.sectionType,isEnabled:true,sortOrder:nextSort,maxItems:isManual?this.defaultMaxItems(input.sectionType):this.normalizeMaxItems(input.maxItems??this.defaultMaxItems(input.sectionType)),settings};
    const payload=await this.request<MutationPayload>('PATCH',token,{action:'upsertSection',section});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_SECTION_CREATE_FAILED');await this.refresh();return this._sections().find(item=>item.sectionKey===sectionKey)||section;
  }
  async updateSection(section:HomepageSectionRecord):Promise<void>{const token=await this.requiredToken();const activeCount=this._placements().filter(item=>item.sectionKey===section.sectionKey&&item.isActive).length;const maxItems=this.isManual(section)?(activeCount>0?activeCount:this.normalizeMaxItems(section.maxItems||this.defaultMaxItems(section.sectionType))):this.normalizeMaxItems(section.maxItems);const payload=await this.request<MutationPayload>('PATCH',token,{action:'upsertSection',section:{...section,title:section.title.trim(),maxItems,settings:section.settings||{}}});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_SECTION_UPDATE_FAILED');await this.refresh();}
  async deleteSection(sectionKey:string):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'deleteSection',sectionKey});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_SECTION_DELETE_FAILED');await this.refresh();}
  async reorderSections(orderedKeys:string[]):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'reorderSections',keys:orderedKeys});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_SECTION_ORDER_FAILED');await this.refresh();}
  async addPlacement(input:Omit<HomepagePlacementRecord,'id'>):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'upsertPlacement',placement:input});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_PLACEMENT_CREATE_FAILED');await this.refresh();}
  async updatePlacement(placement:HomepagePlacementRecord):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'upsertPlacement',placement});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_PLACEMENT_UPDATE_FAILED');await this.refresh();}
  async removePlacement(id:string):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'deletePlacement',id});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_PLACEMENT_DELETE_FAILED');await this.refresh();}
  async reorderPlacements(orderedIds:string[]):Promise<void>{const token=await this.requiredToken();const payload=await this.request<MutationPayload>('PATCH',token,{action:'reorderPlacements',ids:orderedIds});if(payload.ok!==true)throw new Error(payload.code||'HOMEPAGE_PLACEMENT_ORDER_FAILED');await this.refresh();}

  private reconcileManualCounts(sections:HomepageSectionRecord[],placements:HomepagePlacementRecord[]):HomepageSectionRecord[]{const counts=new Map<string,number>();for(const placement of placements){if(!placement.isActive)continue;counts.set(placement.sectionKey,(counts.get(placement.sectionKey)||0)+1);}return sections.map(section=>{if(!this.isManual(section))return section;const activeCount=counts.get(section.sectionKey)||0;return{...section,maxItems:activeCount>0?activeCount:this.normalizeMaxItems(section.maxItems||this.defaultMaxItems(section.sectionType))};});}
  private isManual(section:HomepageSectionRecord):boolean{return this.supportsPlacements(section.sectionType)&&String(section.settings?.selectionMode||'PLACEMENT').toUpperCase()!=='LATEST';}
  private supportsPlacements(type:HomepageSectionType):boolean{return type==='VEHICLES'||type==='TOURS'||type==='BLOG'||type==='CAMPAIGN';}
  private defaultMaxItems(type:HomepageSectionType):number{return type==='CAMPAIGN'?3:(type==='VEHICLES'||type==='TOURS'||type==='BLOG'?5:1);}
  private sectionFromRow(row:any):HomepageSectionRecord{const sectionType=(row.section_type||row.sectionType) as HomepageSectionType;return{sectionKey:String(row.section_key||row.sectionKey||''),title:String(row.title||''),sectionType,isEnabled:(row.is_enabled??row.isEnabled)!==false,sortOrder:Number(row.sort_order??row.sortOrder??0),maxItems:this.normalizeMaxItems(Number(row.max_items??row.maxItems??this.defaultMaxItems(sectionType))),settings:row.settings&&typeof row.settings==='object'?row.settings:{}};}
  private placementFromRow(row:any):HomepagePlacementRecord{return{id:String(row.id||''),sectionKey:String(row.section_key||row.sectionKey||''),entityType:(row.entity_type||row.entityType) as HomepageEntityType,entityId:String(row.entity_id||row.entityId||''),label:row.label||undefined,sortOrder:Number(row.sort_order??row.sortOrder??0),isActive:(row.is_active??row.isActive)!==false,startsAt:row.starts_at||row.startsAt||undefined,endsAt:row.ends_at||row.endsAt||undefined,metadata:row.metadata&&typeof row.metadata==='object'?row.metadata:{}};}
  private createSectionKey(title:string):string{const base=title.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48)||'bolum';return`${base}_${Date.now().toString(36)}`;}
  private normalizeMaxItems(value:number):number{const numeric=Math.floor(Number(value));return Number.isFinite(numeric)&&numeric>=1?Math.min(numeric,50):1;}
  private async requiredToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private async request<T>(method:'GET'|'PATCH',token:string,body?:unknown):Promise<T>{const response=await fetch(this.endpoint,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',accept:'application/json','x-request-id':crypto.randomUUID()},body:method==='GET'?undefined:JSON.stringify(body),cache:'no-store'});const payload=await response.json().catch(()=>({})) as T&{code?:string;message?:string};if(!response.ok)throw new Error(String(payload.code||payload.message||`SITE_CONTENT_ADMIN_${response.status}`));return payload;}
}