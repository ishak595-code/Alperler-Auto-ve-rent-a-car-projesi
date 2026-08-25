import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";

export type BranchLifecycleStatusV171 = "ACTIVE" | "SUSPENDED" | "CLOSED" | "DRAFT";
export interface VehicleRegistryRowV171 {id:string;stock_code:string;brand:string;model:string;model_year?:number;category:string;publication_status:string;branch_id?:string;branch_name?:string;license_plate?:string;vin?:string;registration_reference?:string;created_at:string;updated_at:string;}

interface BranchOperationsPayload {
  ok?: boolean;
  code?: string;
  message?: string;
  rows?: VehicleRegistryRowV171[];
}

@Injectable({providedIn:"root"})
export class AdminBranchOperationsV171Service {
  private readonly auth=inject(AuthService);
  private readonly endpoint="/api/partner?op=branch-operations-admin";

  async setLifecycle(branchId:string,status:BranchLifecycleStatusV171,reason?:string):Promise<void>{
    await this.action({action:"SET_LIFECYCLE",branchId,status,reason:reason?.trim().slice(0,500)||null});
  }

  async searchVehicleRegistry(input:{query?:string;branchId?:string;from?:string;to?:string;limit?:number}):Promise<VehicleRegistryRowV171[]>{
    const from=input.from?new Date(`${input.from}T00:00:00`).toISOString():null;
    const to=input.to?new Date(new Date(`${input.to}T00:00:00`).getTime()+86400000).toISOString():null;
    const payload=await this.action({action:"SEARCH_VEHICLE_REGISTRY",query:input.query?.trim().slice(0,120)||null,branchId:input.branchId||null,from,to,limit:input.limit||100});
    return Array.isArray(payload.rows)?payload.rows:[];
  }

  async saveVehicleIdentifiers(vehicleId:string,input:{licensePlate?:string;vin?:string;registrationReference?:string}):Promise<void>{
    await this.action({action:"SAVE_VEHICLE_IDENTIFIERS",vehicleId,licensePlate:this.cleanPlate(input.licensePlate)||null,vin:this.cleanVin(input.vin)||null,registrationReference:input.registrationReference?.trim().slice(0,80)||null});
  }

  private async action(body:Record<string,unknown>):Promise<BranchOperationsPayload>{
    const token=await this.requiredToken();
    const response=await fetch(this.endpoint,{method:"PATCH",headers:{authorization:`Bearer ${token}`,"content-type":"application/json",accept:"application/json","x-request-id":crypto.randomUUID()},body:JSON.stringify(body),cache:"no-store"});
    const payload=await response.json().catch(()=>({})) as BranchOperationsPayload;
    if(!response.ok||payload.ok!==true)throw new Error(String(payload.code||payload.message||`BRANCH_OPERATIONS_${response.status}`));
    return payload;
  }

  private cleanPlate(value?:string):string{return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);}
  private cleanVin(value?:string):string{return String(value||"").toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"").slice(0,17);}
  private async requiredToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error("ADMIN_SESSION_REQUIRED");return token;}
}
