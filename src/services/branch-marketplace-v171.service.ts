import { Injectable } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export type BranchMarketplaceKind="ALL"|"RENTAL"|"SALE"|"TOUR";
export interface MarketplaceBranch {id:string;slug?:string;name:string;operatorName:string;operatorRelationship:string;platformDisclaimer:string;city:string;district:string;provinceCode:string;districtCode:string;address?:string;phone?:string;whatsapp?:string;email?:string;heroImage?:string;customerGuaranteeEnabled:boolean;verified:boolean;}
export interface MarketplaceRecord {id:string|number;cloudId:string;category:BranchMarketplaceKind;brand?:string;model?:string;title?:string;year?:number;price:number;currency:string;image?:string;images?:string[];description?:string;operatorName:string;city:string;district:string;provinceCode:string;districtCode:string;platformRole:string;branch:MarketplaceBranch;}
export interface BranchMarketplaceResponse {ok:boolean;code?:string;province:string;district:string;kind:BranchMarketplaceKind;branches:MarketplaceBranch[];records:MarketplaceRecord[];counts:{branches:number;rentals:number;sales:number;tours:number};}

type RawBranch={id:string;slug?:string|null;name:string;operator_display_name?:string|null;operator_relationship?:string|null;platform_disclaimer?:string|null;city?:string|null;district?:string|null;province_code?:string|null;district_code?:string|null;address_line?:string|null;phone?:string|null;whatsapp?:string|null;email?:string|null;hero_image?:string|null;customer_guarantee_enabled?:boolean|null;operator_identity_verified_at?:string|null;network_type?:string|null;};
type CatalogPayload={ok?:boolean;code?:string;records?:Array<Record<string,unknown>>};

@Injectable({providedIn:"root"})
export class BranchMarketplaceV171Service {
  private readonly branchHeaders={apikey:SUPABASE_PUBLISHABLE_KEY,accept:"application/json"};

  async search(province:string,district:string,kind:BranchMarketplaceKind):Promise<BranchMarketplaceResponse>{
    const provinceCode=String(province||"").trim().toUpperCase();
    const districtCode=String(district||"").trim().toUpperCase();
    if(provinceCode&&!/^TUR\d{3}$/.test(provinceCode))throw new Error("INVALID_PROVINCE");
    if(districtCode&&!/^TUR\d{6}$/.test(districtCode))throw new Error("INVALID_DISTRICT");
    if(districtCode&&!provinceCode)throw new Error("PROVINCE_REQUIRED_FOR_DISTRICT");

    const filters=["is_active=eq.true","public_status=eq.ACTIVE"];
    if(provinceCode)filters.push(`province_code=eq.${encodeURIComponent(provinceCode)}`);
    if(districtCode)filters.push(`district_code=eq.${encodeURIComponent(districtCode)}`);
    const branchUrl=`${SUPABASE_PROJECT_URL}/rest/v1/branches?${filters.join("&")}&select=id,slug,name,operator_display_name,operator_relationship,platform_disclaimer,city,district,province_code,district_code,address_line,phone,whatsapp,email,hero_image,customer_guarantee_enabled,operator_identity_verified_at,network_type&order=sort_order.asc,name.asc`;
    const branchResponse=await fetch(branchUrl,{headers:this.branchHeaders,cache:"no-store",signal:AbortSignal.timeout(10_000)});
    if(!branchResponse.ok)throw new Error("BRANCH_SOURCE_UNAVAILABLE");
    const raw=await branchResponse.json() as RawBranch[];
    const branches=(Array.isArray(raw)?raw:[]).map(row=>this.mapBranch(row));
    if(!branches.length)return{ok:true,province:provinceCode,district:districtCode,kind,branches:[],records:[],counts:{branches:0,rentals:0,sales:0,tours:0}};

    const byId=new Map(branches.map(branch=>[branch.id,branch]));
    const records:MarketplaceRecord[]=[];
    let rentals=0,sales=0,tours=0;
    const tasks:Promise<void>[]=[];
    if(kind==="ALL"||kind==="RENTAL"||kind==="SALE")tasks.push(this.catalog("vehicles").then(items=>{for(const row of items){const branch=byId.get(String(row["branchId"]||""));if(!branch)continue;const category=String(row["category"]||"")==="SALE"?"SALE":"RENTAL";if(kind!=="ALL"&&category!==kind)continue;records.push(this.vehicle(row,branch,category));if(category==="SALE")sales+=1;else rentals+=1;}}));
    if(kind==="ALL"||kind==="TOUR")tasks.push(this.catalog("tours").then(items=>{for(const row of items){const branch=byId.get(String(row["branchId"]||""));if(!branch)continue;records.push(this.tour(row,branch));tours+=1;}}));
    await Promise.all(tasks);
    records.sort((a,b)=>Number(Boolean((b as any).isFeatured))-Number(Boolean((a as any).isFeatured)));
    return{ok:true,province:provinceCode,district:districtCode,kind,branches,records,counts:{branches:branches.length,rentals,sales,tours}};
  }

  private async catalog(resource:"vehicles"|"tours"):Promise<Array<Record<string,unknown>>>{
    const response=await fetch(`/api/catalog?resource=${resource}`,{headers:{accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(15_000)});
    const payload=await response.json().catch(()=>({})) as CatalogPayload;
    if(!response.ok||payload.ok!==true||!Array.isArray(payload.records))throw new Error(String(payload.code||"CATALOG_SOURCE_UNAVAILABLE"));
    return payload.records;
  }
  private mapBranch(row:RawBranch):MarketplaceBranch{return{id:String(row.id),slug:row.slug||undefined,name:String(row.name||""),operatorName:String(row.operator_display_name||row.name||""),operatorRelationship:String(row.operator_relationship||"INDEPENDENT_PARTNER"),platformDisclaimer:String(row.platform_disclaimer||"İlan ve araç operasyonu belirtilen şube veya işletme tarafından yürütülür. Alperler Auto platform ve rezervasyon altyapısı sağlar. Tüketicinin kanuni hakları saklıdır."),city:String(row.city||""),district:String(row.district||""),provinceCode:String(row.province_code||""),districtCode:String(row.district_code||""),address:row.address_line||undefined,phone:row.phone||undefined,whatsapp:row.whatsapp||undefined,email:row.email||undefined,heroImage:row.hero_image||undefined,customerGuaranteeEnabled:row.customer_guarantee_enabled!==false,verified:row.network_type==="OWNED"||Boolean(row.operator_identity_verified_at)};}
  private vehicle(row:Record<string,unknown>,branch:MarketplaceBranch,category:"RENTAL"|"SALE"):MarketplaceRecord{return{id:(row["id"] as string|number)||String(row["cloudId"]||""),cloudId:String(row["cloudId"]||""),category,brand:String(row["brand"]||""),model:String(row["model"]||""),year:row["year"]==null?undefined:Number(row["year"]),price:Number(row["price"]||0),currency:String(row["currency"]||"TRY"),image:row["image"]?String(row["image"]):undefined,images:Array.isArray(row["images"])?row["images"].map(String):[],description:row["description"]?String(row["description"]):undefined,operatorName:branch.operatorName,city:branch.city,district:branch.district,provinceCode:branch.provinceCode,districtCode:branch.districtCode,platformRole:"MARKETPLACE_AND_RESERVATION_INFRASTRUCTURE",branch};}
  private tour(row:Record<string,unknown>,branch:MarketplaceBranch):MarketplaceRecord{return{id:(row["id"] as string|number)||String(row["cloudId"]||""),cloudId:String(row["cloudId"]||""),category:"TOUR",title:String(row["title"]||""),price:Number(row["price"]||0),currency:String(row["currency"]||"TRY"),image:row["image"]?String(row["image"]):undefined,images:Array.isArray(row["images"])?row["images"].map(String):[],description:row["description"]?String(row["description"]):undefined,operatorName:branch.operatorName,city:branch.city,district:branch.district,provinceCode:branch.provinceCode,districtCode:branch.districtCode,platformRole:"MARKETPLACE_AND_RESERVATION_INFRASTRUCTURE",branch};}
}
