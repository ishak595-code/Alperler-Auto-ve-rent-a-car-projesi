import { Injectable } from "@angular/core";
import { Branch } from "../models/branch.model";
import { Vehicle } from "../models/car.model";
import { BranchMediaV171Service, BranchMediaV171 } from "./branch-media-v171.service";
import { BranchService } from "./branch.service";

export interface BranchDetailV171Payload {
  branch: Branch;
  vehicles: Vehicle[];
  tours: Vehicle[];
  counts: { rentals:number;sales:number;tours:number };
  standards: { centralPricing:boolean;listingApproval:boolean;customerGuarantee:boolean };
  media: BranchMediaV171[];
}
interface DetailResponse { ok?:boolean;branch?:Branch;vehicles?:Vehicle[];tours?:Vehicle[];counts?:{rentals:number;sales:number;tours:number};standards?:{centralPricing:boolean;listingApproval:boolean;customerGuarantee:boolean};code?:string }

@Injectable({providedIn:"root"})
export class BranchPublicV171Service {
  constructor(
    private readonly media:BranchMediaV171Service,
    private readonly branchService:BranchService,
  ){}

  async list():Promise<Branch[]>{
    await this.branchService.refresh();
    return this.branchService.branches();
  }

  async detail(slug:string):Promise<BranchDetailV171Payload>{
    const clean=slug.trim().toLowerCase();if(!/^[a-z0-9-]{2,140}$/.test(clean))throw new Error("INVALID_BRANCH_SLUG");
    const response=await fetch(`/api/branch-network?slug=${encodeURIComponent(clean)}`,{headers:{accept:"application/json"},cache:"no-store"});
    const payload=await response.json().catch(()=>({})) as DetailResponse;
    if(!response.ok||payload.ok!==true||!payload.branch)throw new Error(String(payload.code||"BRANCH_LOAD_FAILED"));
    const branch=payload.branch;const cloudId=String(branch.cloudId||"");
    const media=cloudId?await this.media.load(cloudId,false).catch(()=>[]):[];
    const vehicles=Array.isArray(payload.vehicles)?payload.vehicles:[];const tours=Array.isArray(payload.tours)?payload.tours:[];
    return{branch,vehicles,tours,media,counts:payload.counts||{rentals:vehicles.filter(v=>v.category==="RENTAL").length,sales:vehicles.filter(v=>v.category==="SALE").length,tours:tours.length},standards:payload.standards||{centralPricing:branch.centralPricingRequired!==false,listingApproval:branch.listingRequiresApproval!==false,customerGuarantee:branch.customerGuaranteeEnabled!==false}};
  }
}