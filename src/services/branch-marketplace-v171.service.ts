import { Injectable } from "@angular/core";

export type BranchMarketplaceKind="ALL"|"RENTAL"|"SALE"|"TOUR";
export interface MarketplaceBranch {id:string;slug?:string;name:string;operatorName:string;operatorRelationship:string;platformDisclaimer:string;city:string;district:string;provinceCode:string;districtCode:string;address?:string;phone?:string;whatsapp?:string;email?:string;heroImage?:string;customerGuaranteeEnabled:boolean;}
export interface MarketplaceRecord {id:string|number;cloudId:string;category:BranchMarketplaceKind;brand?:string;model?:string;title?:string;year?:number;price:number;currency:string;image?:string;images?:string[];description?:string;operatorName:string;city:string;district:string;provinceCode:string;districtCode:string;platformRole:string;branch:MarketplaceBranch;}
export interface BranchMarketplaceResponse {ok:boolean;code?:string;province:string;district:string;kind:BranchMarketplaceKind;branches:MarketplaceBranch[];records:MarketplaceRecord[];counts:{branches:number;rentals:number;sales:number;tours:number};}

@Injectable({providedIn:"root"})
export class BranchMarketplaceV171Service {
  async search(province:string,district:string,kind:BranchMarketplaceKind):Promise<BranchMarketplaceResponse>{
    const params=new URLSearchParams();if(province)params.set("province",province);if(district)params.set("district",district);params.set("kind",kind);
    const response=await fetch(`/api/branch-marketplace?${params.toString()}`,{headers:{accept:"application/json"},cache:"no-store"});
    const payload=await response.json().catch(()=>({})) as Partial<BranchMarketplaceResponse>;
    if(!response.ok||payload.ok!==true||!Array.isArray(payload.records)||!Array.isArray(payload.branches))throw new Error(String(payload.code||"BRANCH_MARKETPLACE_UNAVAILABLE"));
    return payload as BranchMarketplaceResponse;
  }
}
