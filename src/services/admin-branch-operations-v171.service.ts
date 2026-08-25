import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export type BranchLifecycleStatusV171 = "ACTIVE" | "SUSPENDED" | "CLOSED" | "DRAFT";

export interface VehicleRegistryRowV171 {
  id:string;
  stock_code:string;
  brand:string;
  model:string;
  model_year?:number;
  category:string;
  publication_status:string;
  branch_id?:string;
  branch_name?:string;
  license_plate?:string;
  vin?:string;
  registration_reference?:string;
  created_at:string;
  updated_at:string;
}

@Injectable({providedIn:"root"})
export class AdminBranchOperationsV171Service {
  private readonly auth=inject(AuthService);

  async setLifecycle(branchId:string,status:BranchLifecycleStatusV171,reason?:string):Promise<void>{
    const token=await this.requiredToken();
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/admin_set_branch_lifecycle_v1718`,{
      method:"POST",headers:this.headers(token),body:JSON.stringify({p_branch_id:branchId,p_status:status,p_reason:reason?.trim()||null})
    });
    if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(String(payload?.message||payload?.code||`BRANCH_LIFECYCLE_${response.status}`));}
  }

  async searchVehicleRegistry(input:{query?:string;branchId?:string;from?:string;to?:string;limit?:number}):Promise<VehicleRegistryRowV171[]>{
    const token=await this.requiredToken();
    const from=input.from?new Date(`${input.from}T00:00:00`).toISOString():null;
    const to=input.to?new Date(new Date(`${input.to}T00:00:00`).getTime()+86400000).toISOString():null;
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/admin_search_vehicle_registry_v1718`,{
      method:"POST",headers:this.headers(token),body:JSON.stringify({p_query:input.query?.trim()||null,p_branch_id:input.branchId||null,p_from:from,p_to:to,p_limit:input.limit||100})
    });
    if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(String(payload?.message||payload?.code||`VEHICLE_REGISTRY_${response.status}`));}
    const rows=await response.json().catch(()=>[]);
    return Array.isArray(rows)?rows as VehicleRegistryRowV171[]:[];
  }

  async saveVehicleIdentifiers(vehicleId:string,input:{licensePlate?:string;vin?:string;registrationReference?:string}):Promise<void>{
    const token=await this.requiredToken();
    const body={
      license_plate:this.cleanPlate(input.licensePlate)||null,
      vin:this.cleanVin(input.vin)||null,
      registration_reference:input.registrationReference?.trim().slice(0,80)||null,
      updated_at:new Date().toISOString(),
    };
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}`,{
      method:"PATCH",headers:{...this.headers(token),Prefer:"return=minimal"},body:JSON.stringify(body)
    });
    if(!response.ok){const payload=await response.json().catch(()=>({}));throw new Error(String(payload?.message||payload?.code||`VEHICLE_IDENTIFIER_SAVE_${response.status}`));}
  }

  private cleanPlate(value?:string):string{return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);}
  private cleanVin(value?:string):string{return String(value||"").toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"").slice(0,17);}
  private async requiredToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error("ADMIN_SESSION_REQUIRED");return token;}
  private headers(token:string):Record<string,string>{return{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,"content-type":"application/json",accept:"application/json"};}
}
