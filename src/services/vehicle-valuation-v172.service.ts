import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";
import { PartnerRequestService, PartnerSubmissionInput, PartnerStatus } from "./partner-request.service";

export type ValuationFuelV172="GASOLINE"|"DIESEL"|"HYBRID"|"ELECTRIC"|"LPG"|"OTHER";
export type ValuationTransmissionV172="AUTOMATIC"|"MANUAL"|"SEMI_AUTOMATIC"|"OTHER";
export type OwnershipStatusV172="OWNER"|"AUTHORIZED_SELLER"|"COMPANY_VEHICLE"|"OTHER";
export type OfferModelV172="PURCHASE"|"MONTHLY_GUARANTEE"|"REVENUE_SHARE"|"DECLINE";
export type ValuationStatusV172="DRAFT"|"FINAL";

export interface VehicleValuationSubmissionV172 extends Omit<PartnerSubmissionInput,"modelYear"|"km">{
  modelYear?:number;
  km?:number;
  fuelType?:ValuationFuelV172;
  transmission?:ValuationTransmissionV172;
  bodyType?:string;
  exteriorColor?:string;
  provinceCode?:string;
  districtCode?:string;
  preferredBranchId?:string;
  ownershipStatus?:OwnershipStatusV172;
  damageDeclaration?:string;
  expertReportAvailable:boolean;
  termsAccepted:boolean;
  privacyAccepted:boolean;
  licensePlate?:string;
  vin?:string;
  registrationReference?:string;
  ownershipConfirmed:boolean;
}
export interface ValuationSnapshotV172{
  id:string;reference:string;intent:"SELL"|"RENT";customerName:string;customerPhone:string;customerEmail?:string;carBrand:string;carModel:string;modelYear?:number;km?:number;askingPrice?:number;withDriver:boolean;description?:string;status:PartnerStatus;internalNotes?:string;mediaPaths:any[];createdAt:Date;
  fuelType?:string;transmission?:string;bodyType?:string;exteriorColor?:string;provinceCode?:string;districtCode?:string;preferredBranchId?:string;ownershipStatus?:string;damageDeclaration?:string;expertReportAvailable:boolean;assignedTo?:string;nextActionAt?:Date;lastContactAt?:Date;
  identity?:{licensePlate?:string;vin?:string;registrationReference?:string;ownershipConfirmed:boolean;updatedAt?:Date}|null;
  valuation?:{id:string;version:number;valuationStatus:string;conditionGrade?:string;marketLow?:number;marketHigh?:number;offerModel?:OfferModelV172;offerAmount?:number;revenueSharePercent?:number;currency:string;inspectionRequired:boolean;rationale?:string;validUntil?:Date;createdAt?:Date;finalizedAt?:Date}|null;
  appointment?:{id:string;branchId?:string;startsAt:Date;timezone:string;appointmentType:string;status:string;notes?:string}|null;
}
interface GatewayResponse{ok:boolean;code?:string;requests?:any[];request?:any;result?:any;action?:string}

@Injectable({providedIn:"root"})
export class VehicleValuationV172Service{
  private readonly partner=inject(PartnerRequestService);private readonly auth=inject(AuthService);
  readonly records=signal<ValuationSnapshotV172[]>([]);readonly loading=signal(false);readonly error=signal("");
  readonly uploadProgress=this.partner.uploadProgress;

  async submit(input:VehicleValuationSubmissionV172){
    const modelYear=input.modelYear,km=input.km;
    const maxYear=new Date().getFullYear()+1;
    if(typeof modelYear!=="number"||!Number.isInteger(modelYear)||modelYear<1950||modelYear>maxYear)throw new Error("INVALID_MODEL_YEAR");
    if(typeof km!=="number"||!Number.isFinite(km)||km<0||km>5_000_000)throw new Error("INVALID_MILEAGE");
    const submission:PartnerSubmissionInput={...input,modelYear,km};
    return this.partner.submit(submission);
  }
  resetSubmissionKey(){this.partner.resetSubmissionKey();}

  async refreshAdmin(){this.loading.set(true);this.error.set("");try{const payload=await this.adminCall("GET");if(!payload.ok||!Array.isArray(payload.requests))throw new Error(payload.code||"VALUATION_LIST_FAILED");this.records.set(payload.requests.map(row=>this.fromApi(row)));}catch(error){this.error.set(error instanceof Error?error.message:"Değerleme kayıtları okunamadı.");throw error;}finally{this.loading.set(false);}}
  async updateStatus(reference:string,status:Exclude<PartnerStatus,"UPLOADING">,internalNotes=""){return this.patch({reference,action:"status",status,internalNotes});}
  async saveIdentity(reference:string,input:{licensePlate?:string;vin?:string;registrationReference?:string;ownershipConfirmed:boolean}){return this.patch({reference,action:"identity",...input});}
  async saveValuation(reference:string,input:{valuationStatus:ValuationStatusV172;conditionGrade?:string;marketLow?:number|null;marketHigh?:number|null;offerModel?:OfferModelV172;offerAmount?:number|null;revenueSharePercent?:number|null;currency?:string;inspectionRequired:boolean;rationale?:string;validUntil?:string|null}){return this.patch({reference,action:"valuation",...input});}
  async scheduleAppointment(reference:string,input:{branchId?:string;startsAt:string;timezone:string;appointmentType:string;notes?:string}){return this.patch({reference,action:"appointment",...input});}
  async assign(reference:string,input:{assignedTo?:string;nextActionAt?:string}){return this.patch({reference,action:"assign",...input});}

  private async patch(body:Record<string,unknown>){const payload=await this.adminCall("PATCH",body);if(!payload.ok)throw new Error(payload.code||"VALUATION_ACTION_FAILED");await this.refreshAdmin();return payload;}
  private async adminCall(method:"GET"|"PATCH",body?:unknown):Promise<GatewayResponse>{const token=await this.auth.getAccessToken();if(!token)throw new Error("ADMIN_SESSION_REQUIRED");const response=await fetch("/api/partner-requests",{method,headers:{authorization:`Bearer ${token}`,"content-type":"application/json",accept:"application/json"},body:method==="GET"?undefined:JSON.stringify(body),cache:"no-store"});const payload=await response.json().catch(()=>({})) as GatewayResponse;if(!response.ok)throw new Error(payload.code||`VALUATION_GATEWAY_${response.status}`);return payload;}
  private fromApi(row:any):ValuationSnapshotV172{const identity=row?.v172_identity||null,valuation=row?.v172_valuation||null,appointment=row?.v172_appointment||null;return{id:String(row?.id||""),reference:String(row?.reference||""),intent:row?.intent==="RENT"?"RENT":"SELL",customerName:String(row?.customer_name||""),customerPhone:String(row?.customer_phone||""),customerEmail:row?.customer_email||undefined,carBrand:String(row?.vehicle_brand||""),carModel:String(row?.vehicle_model||""),modelYear:row?.model_year==null?undefined:Number(row.model_year),km:row?.mileage_km==null?undefined:Number(row.mileage_km),askingPrice:row?.asking_price==null?undefined:Number(row.asking_price),withDriver:Boolean(row?.with_driver),description:row?.description||undefined,status:String(row?.status||"NEW") as PartnerStatus,internalNotes:row?.internal_notes||undefined,mediaPaths:Array.isArray(row?.media_paths)?row.media_paths:[],createdAt:new Date(row?.created_at||Date.now()),fuelType:row?.fuel_type||undefined,transmission:row?.transmission||undefined,bodyType:row?.body_type||undefined,exteriorColor:row?.exterior_color||undefined,provinceCode:row?.province_code||undefined,districtCode:row?.district_code||undefined,preferredBranchId:row?.preferred_branch_id||undefined,ownershipStatus:row?.ownership_status||undefined,damageDeclaration:row?.damage_declaration||undefined,expertReportAvailable:Boolean(row?.expert_report_available),assignedTo:row?.assigned_to||undefined,nextActionAt:row?.next_action_at?new Date(row.next_action_at):undefined,lastContactAt:row?.last_contact_at?new Date(row.last_contact_at):undefined,identity:identity?{licensePlate:identity.license_plate||undefined,vin:identity.vin||undefined,registrationReference:identity.registration_reference||undefined,ownershipConfirmed:Boolean(identity.ownership_confirmed),updatedAt:identity.updated_at?new Date(identity.updated_at):undefined}:null,valuation:valuation?{id:String(valuation.id||""),version:Number(valuation.version||0),valuationStatus:String(valuation.valuation_status||""),conditionGrade:valuation.condition_grade||undefined,marketLow:valuation.market_low==null?undefined:Number(valuation.market_low),marketHigh:valuation.market_high==null?undefined:Number(valuation.market_high),offerModel:valuation.offer_model||undefined,offerAmount:valuation.offer_amount==null?undefined:Number(valuation.offer_amount),revenueSharePercent:valuation.revenue_share_percent==null?undefined:Number(valuation.revenue_share_percent),currency:String(valuation.currency||"TRY"),inspectionRequired:valuation.inspection_required!==false,rationale:valuation.rationale||undefined,validUntil:valuation.valid_until?new Date(valuation.valid_until):undefined,createdAt:valuation.created_at?new Date(valuation.created_at):undefined,finalizedAt:valuation.finalized_at?new Date(valuation.finalized_at):undefined}:null,appointment:appointment?{id:String(appointment.id||""),branchId:appointment.branch_id||undefined,startsAt:new Date(appointment.starts_at),timezone:String(appointment.timezone||"Europe/Istanbul"),appointmentType:String(appointment.appointment_type||"INSPECTION"),status:String(appointment.status||"SCHEDULED"),notes:appointment.notes||undefined}:null};}
}
