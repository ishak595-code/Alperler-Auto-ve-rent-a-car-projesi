import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";

export type BranchPartnerStatus = "NEW"|"REVIEWING"|"CONTACTED"|"DUE_DILIGENCE"|"APPROVED"|"REJECTED"|"CLOSED";
export type BranchPartnerServiceType = "RENTAL"|"SALES"|"TOUR_TRANSFER";
export type BranchPartnerOfficeStatus = "OWN"|"RENT"|"PLAN"|"NONE";
export type BranchPartnerListingModel = "OWN_FLEET"|"REGIONAL_NETWORK"|"BOTH";
export type BranchPartnerBudgetRange = "DISCUSS"|"UNDER_100K"|"100K_250K"|"250K_500K"|"500K_PLUS";
export type BranchPartnerBusinessType = "SOLE_PROPRIETORSHIP"|"LIMITED"|"JOINT_STOCK"|"COOPERATIVE"|"OTHER";

export interface BranchPartnerSubmission {
  fullName:string;
  phone:string;
  email:string;
  provinceCode:string;
  districtCode:string;
  city:string;
  district:string;
  operatingArea?:string;
  currentBusiness:string;
  businessType:BranchPartnerBusinessType;
  taxOffice:string;
  taxNumber:string;
  tradeRegistryNo?:string;
  mersisNo?:string;
  businessAddress:string;
  businessWebsite?:string;
  experienceYears:number;
  officeStatus:BranchPartnerOfficeStatus;
  currentFleetSize:number;
  plannedFleetSize:number;
  services:BranchPartnerServiceType[];
  listingModel:BranchPartnerListingModel;
  budgetRange:BranchPartnerBudgetRange;
  notes?:string;
  accuracyAccepted:boolean;
  privacyAccepted:boolean;
  dueDiligenceAccepted:boolean;
  website?:string;
}

export interface ProvisionedBranchSummary {
  branchId:string;
  code:string;
  slug:string;
  name:string;
  alreadyProvisioned?:boolean;
  ownerAccess?:{email?:string;membershipLinked?:boolean;inviteSent?:boolean;verificationRequired?:boolean;identityState?:string};
}

export interface BranchPartnerAdminRecord {
  id:string;
  reference:string;
  fullName:string;
  phone:string;
  email?:string;
  provinceCode?:string;
  districtCode?:string;
  city:string;
  district:string;
  operatingArea?:string;
  currentBusiness?:string;
  businessType?:BranchPartnerBusinessType;
  taxOffice?:string;
  taxNumber?:string;
  tradeRegistryNo?:string;
  mersisNo?:string;
  businessAddress?:string;
  businessWebsite?:string;
  accuracyAcceptedAt?:Date;
  privacyAcceptedAt?:Date;
  dueDiligenceConsentAt?:Date;
  experienceYears:number;
  officeStatus:BranchPartnerOfficeStatus;
  currentFleetSize:number;
  plannedFleetSize:number;
  services:BranchPartnerServiceType[];
  listingModel:BranchPartnerListingModel;
  budgetRange:BranchPartnerBudgetRange;
  notes?:string;
  status:BranchPartnerStatus;
  internalNotes?:string;
  provisionedBranchId?:string;
  approvedAt?:Date;
  provisionedAt?:Date;
  createdAt:Date;
}

interface GatewayResponse {
  ok:boolean;
  code?:string;
  message?:string;
  reference?:string;
  status?:BranchPartnerStatus;
  requests?:Record<string,unknown>[];
  request?:Record<string,unknown>;
  branch?:ProvisionedBranchSummary;
}

@Injectable({providedIn:"root"})
export class BranchPartnerService {
  private readonly auth=inject(AuthService);
  private readonly endpoint="/api/partner?op=branch-partner";
  private readonly submissionStorageKey="alperler_branch_partner_submission_key";
  private submissionKey=this.loadSubmissionKey();
  private readonly _records=signal<BranchPartnerAdminRecord[]>([]);
  private readonly _loading=signal(false);
  private readonly _error=signal<string|null>(null);

  readonly records=this._records.asReadonly();
  readonly loading=this._loading.asReadonly();
  readonly error=this._error.asReadonly();

  async submit(input:BranchPartnerSubmission):Promise<{reference:string}>{
    this._error.set(null);
    const payload=await this.callPublic({...input,idempotencyKey:this.submissionKey});
    if(!payload.ok||!payload.reference)throw new Error(payload.code||payload.message||"BRANCH_PARTNER_CREATE_FAILED");
    const reference=payload.reference;
    this.resetSubmissionKey();
    return{reference};
  }

  async refreshAdmin():Promise<void>{
    this._loading.set(true);
    this._error.set(null);
    try{
      const token=await this.requiredToken();
      const response=await fetch(this.endpoint,{method:"GET",headers:this.headers(token),cache:"no-store"});
      const payload=await response.json().catch(()=>({})) as GatewayResponse;
      if(!response.ok||!payload.ok||!Array.isArray(payload.requests))throw new Error(payload.code||"BRANCH_PARTNER_LIST_FAILED");
      this._records.set(payload.requests.map(row=>this.fromRow(row)));
    }catch(error){
      this._error.set(error instanceof Error?error.message:"BRANCH_PARTNER_LIST_FAILED");
      throw error;
    }finally{this._loading.set(false);}
  }

  async update(reference:string,status:BranchPartnerStatus,internalNotes=""):Promise<void>{
    const token=await this.requiredToken();
    const response=await fetch(this.endpoint,{method:"PATCH",headers:this.headers(token),body:JSON.stringify({reference,status,internalNotes})});
    const payload=await response.json().catch(()=>({})) as GatewayResponse;
    if(!response.ok||!payload.ok||!payload.request)throw new Error(payload.code||"BRANCH_PARTNER_UPDATE_FAILED");
    const updated=this.fromRow(payload.request);
    this._records.update(items=>items.map(item=>item.reference===reference?updated:item));
  }

  async provision(reference:string,branchName?:string):Promise<ProvisionedBranchSummary>{
    const token=await this.requiredToken();
    const response=await fetch(this.endpoint,{method:"PATCH",headers:this.headers(token),body:JSON.stringify({action:"PROVISION",reference,branchName:branchName?.trim()||undefined})});
    const payload=await response.json().catch(()=>({})) as GatewayResponse;
    if(!response.ok||!payload.ok||!payload.branch)throw new Error(payload.code||"BRANCH_PROVISION_FAILED");
    if(payload.request){
      const updated=this.fromRow(payload.request);
      this._records.update(items=>items.map(item=>item.reference===reference?updated:item));
    }else await this.refreshAdmin();
    return payload.branch;
  }

  private async callPublic(body:unknown):Promise<GatewayResponse>{
    const response=await fetch(this.endpoint,{method:"POST",headers:this.headers(),body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({})) as GatewayResponse;
    if(!response.ok)throw new Error(payload.code||payload.message||`BRANCH_PARTNER_${response.status}`);
    return payload;
  }

  private headers(token?:string):Record<string,string>{
    return{"content-type":"application/json","x-request-id":crypto.randomUUID(),...(token?{authorization:`Bearer ${token}`}:{})};
  }

  private async requiredToken():Promise<string>{
    const token=await this.auth.getAccessToken();
    if(!token)throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }

  private fromRow(row:Record<string,unknown>):BranchPartnerAdminRecord{
    const services=Array.isArray(row["services"])?row["services"].map(String):[];
    const date=(value:unknown)=>value?new Date(String(value)):undefined;
    return{
      id:String(row["id"]||""),
      reference:String(row["reference"]||""),
      fullName:String(row["full_name"]||""),
      phone:String(row["phone"]||""),
      email:row["email"]?String(row["email"]):undefined,
      provinceCode:row["province_code"]?String(row["province_code"]):undefined,
      districtCode:row["district_code"]?String(row["district_code"]):undefined,
      city:String(row["city"]||""),
      district:String(row["district"]||""),
      operatingArea:row["operating_area"]?String(row["operating_area"]):undefined,
      currentBusiness:row["current_business"]?String(row["current_business"]):undefined,
      businessType:row["business_type"]?String(row["business_type"]) as BranchPartnerBusinessType:undefined,
      taxOffice:row["tax_office"]?String(row["tax_office"]):undefined,
      taxNumber:row["tax_number"]?String(row["tax_number"]):undefined,
      tradeRegistryNo:row["trade_registry_no"]?String(row["trade_registry_no"]):undefined,
      mersisNo:row["mersis_no"]?String(row["mersis_no"]):undefined,
      businessAddress:row["business_address"]?String(row["business_address"]):undefined,
      businessWebsite:row["business_website"]?String(row["business_website"]):undefined,
      accuracyAcceptedAt:date(row["accuracy_accepted_at"]),
      privacyAcceptedAt:date(row["privacy_accepted_at"]),
      dueDiligenceConsentAt:date(row["due_diligence_consent_at"]),
      experienceYears:Number(row["experience_years"]||0),
      officeStatus:String(row["office_status"]||"PLAN") as BranchPartnerOfficeStatus,
      currentFleetSize:Number(row["current_fleet_size"]||0),
      plannedFleetSize:Number(row["planned_fleet_size"]||1),
      services:services as BranchPartnerServiceType[],
      listingModel:String(row["listing_model"]||"OWN_FLEET") as BranchPartnerListingModel,
      budgetRange:String(row["budget_range"]||"DISCUSS") as BranchPartnerBudgetRange,
      notes:row["notes"]?String(row["notes"]):undefined,
      status:String(row["status"]||"NEW") as BranchPartnerStatus,
      internalNotes:row["internal_notes"]?String(row["internal_notes"]):undefined,
      provisionedBranchId:row["provisioned_branch_id"]?String(row["provisioned_branch_id"]):undefined,
      approvedAt:date(row["approved_at"]),
      provisionedAt:date(row["provisioned_at"]),
      createdAt:new Date(String(row["created_at"]||new Date().toISOString())),
    };
  }

  private loadSubmissionKey():string{
    if(typeof sessionStorage!=="undefined"){
      const existing=sessionStorage.getItem(this.submissionStorageKey);
      if(existing)return existing;
      const created=crypto.randomUUID();
      sessionStorage.setItem(this.submissionStorageKey,created);
      return created;
    }
    return crypto.randomUUID();
  }

  private resetSubmissionKey():void{
    this.submissionKey=crypto.randomUUID();
    if(typeof sessionStorage!=="undefined")sessionStorage.setItem(this.submissionStorageKey,this.submissionKey);
  }
}
