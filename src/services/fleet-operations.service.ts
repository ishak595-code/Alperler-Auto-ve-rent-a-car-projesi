import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type FleetOperationalStatus = 'READY'|'RESERVED'|'RENTED'|'CLEANING'|'MAINTENANCE'|'INSPECTION_HOLD'|'OUT_OF_SERVICE';
export type FleetCleanliness = 'UNKNOWN'|'CLEAN'|'NEEDS_CLEANING'|'DEEP_CLEANING';
export type FleetGpsStatus = 'NOT_CONFIGURED'|'CONNECTED'|'OFFLINE'|'ERROR';
export type InspectionType = 'PRE_RENTAL'|'HANDOVER'|'RETURN'|'ROUTINE';

export interface FleetVehicle {
  id:string; stockCode:string; brand:string; model:string; modelYear?:number; image?:string; availabilityStatus:string; mileageKm?:number;
}
export interface FleetOperationProfile {
  vehicleId:string; operationalStatus:FleetOperationalStatus; odometerKm:number|null; fuelPercent:number|null; cleanlinessStatus:FleetCleanliness;
  lastInspectionAt:string|null; lastServiceAt:string|null; nextServiceAt:string|null; nextServiceKm:number|null;
  insuranceExpiresAt:string|null; periodicInspectionExpiresAt:string|null; damageNotes:string; internalNotes:string;
  gpsProvider:string; gpsDeviceId:string; gpsStatus:FleetGpsStatus; gpsLastSyncAt:string|null; lastKnownLatitude:number|null; lastKnownLongitude:number|null;
}
export interface FleetInspectionInput {
  vehicleId:string; bookingId?:string|null; inspectionType:InspectionType; odometerKm?:number|null; fuelPercent?:number|null;
  cleanlinessStatus?:Exclude<FleetCleanliness,'UNKNOWN'>|null; exteriorStatus?:'OK'|'DAMAGE_NOTED'|'REQUIRES_SERVICE'|null;
  interiorStatus?:'OK'|'DAMAGE_NOTED'|'REQUIRES_CLEANING'|null; damageNotes?:string;
}

@Injectable({providedIn:'root'})
export class FleetOperationsService {
  private readonly auth=inject(AuthService);
  private readonly operationSelect='vehicle_id,operational_status,odometer_km,fuel_percent,cleanliness_status,last_inspection_at,last_service_at,next_service_at,next_service_km,insurance_expires_at,periodic_inspection_expires_at,damage_notes,internal_notes,gps_provider,gps_device_id,gps_status,gps_last_sync_at,last_known_latitude,last_known_longitude';
  private readonly _vehicles=signal<FleetVehicle[]>([]);
  private readonly _profiles=signal<Record<string,FleetOperationProfile>>({});
  private readonly _loading=signal(false);
  readonly vehicles=this._vehicles.asReadonly(); readonly profiles=this._profiles.asReadonly(); readonly loading=this._loading.asReadonly();

  async refresh():Promise<void>{
    this._loading.set(true);
    try{
      const token=await this.requiredToken();
      const [vehicleRows,profileRows]=await Promise.all([
        this.rest<any[]>('GET','vehicles?category=eq.RENTAL&select=id,stock_code,brand,model,model_year,cover_image,availability_status,mileage_km&order=brand.asc,model.asc',undefined,token),
        this.rest<any[]>('GET',`vehicle_operations?select=${this.operationSelect}&order=updated_at.desc`,undefined,token),
      ]);
      this._vehicles.set(vehicleRows.map((row)=>({id:String(row.id),stockCode:String(row.stock_code||''),brand:String(row.brand||''),model:String(row.model||''),modelYear:row.model_year==null?undefined:Number(row.model_year),image:row.cover_image||undefined,availabilityStatus:String(row.availability_status||'AVAILABLE'),mileageKm:row.mileage_km==null?undefined:Number(row.mileage_km)})));
      const profiles:Record<string,FleetOperationProfile>={}; for(const row of profileRows){const p=this.fromRow(row);profiles[p.vehicleId]=p;} this._profiles.set(profiles);
    }finally{this._loading.set(false);}
  }

  profileFor(vehicle:FleetVehicle):FleetOperationProfile{
    return this._profiles()[vehicle.id]||{vehicleId:vehicle.id,operationalStatus:'READY',odometerKm:vehicle.mileageKm??null,fuelPercent:null,cleanlinessStatus:'UNKNOWN',lastInspectionAt:null,lastServiceAt:null,nextServiceAt:null,nextServiceKm:null,insuranceExpiresAt:null,periodicInspectionExpiresAt:null,damageNotes:'',internalNotes:'',gpsProvider:'',gpsDeviceId:'',gpsStatus:'NOT_CONFIGURED',gpsLastSyncAt:null,lastKnownLatitude:null,lastKnownLongitude:null};
  }

  async save(profile:FleetOperationProfile):Promise<void>{
    const token=await this.requiredToken(); const body={vehicle_id:profile.vehicleId,operational_status:profile.operationalStatus,odometer_km:this.numberOrNull(profile.odometerKm),fuel_percent:this.rangeOrNull(profile.fuelPercent,0,100),cleanliness_status:profile.cleanlinessStatus,last_inspection_at:profile.lastInspectionAt||null,last_service_at:profile.lastServiceAt||null,next_service_at:profile.nextServiceAt||null,next_service_km:this.numberOrNull(profile.nextServiceKm),insurance_expires_at:profile.insuranceExpiresAt||null,periodic_inspection_expires_at:profile.periodicInspectionExpiresAt||null,damage_notes:this.clean(profile.damageNotes,5000)||null,internal_notes:this.clean(profile.internalNotes,5000)||null,gps_provider:this.clean(profile.gpsProvider,120)||null,gps_device_id:this.clean(profile.gpsDeviceId,180)||null,gps_status:profile.gpsDeviceId?profile.gpsStatus:'NOT_CONFIGURED',updated_at:new Date().toISOString()};
    await this.rest('POST','vehicle_operations?on_conflict=vehicle_id',body,token,'resolution=merge-duplicates'); await this.refresh();
  }

  async addInspection(input:FleetInspectionInput):Promise<void>{
    const token=await this.requiredToken(); const body={vehicle_id:input.vehicleId,booking_id:input.bookingId||null,inspection_type:input.inspectionType,odometer_km:this.numberOrNull(input.odometerKm),fuel_percent:this.rangeOrNull(input.fuelPercent,0,100),cleanliness_status:input.cleanlinessStatus||null,exterior_status:input.exteriorStatus||null,interior_status:input.interiorStatus||null,damage_notes:this.clean(input.damageNotes||'',5000)||null,checklist:{source:'ADMIN_FLEET_OPERATIONS'}};
    await this.rest('POST','vehicle_inspections',body,token);
    const profile=this.profileFor(this._vehicles().find((v)=>v.id===input.vehicleId)!); profile.odometerKm=body.odometer_km??profile.odometerKm; profile.fuelPercent=body.fuel_percent??profile.fuelPercent; if(body.cleanliness_status)profile.cleanlinessStatus=body.cleanliness_status as FleetCleanliness; profile.lastInspectionAt=new Date().toISOString(); if(body.damage_notes)profile.damageNotes=body.damage_notes; await this.save(profile);
  }

  private fromRow(row:any):FleetOperationProfile{return{vehicleId:String(row.vehicle_id),operationalStatus:row.operational_status as FleetOperationalStatus,odometerKm:row.odometer_km==null?null:Number(row.odometer_km),fuelPercent:row.fuel_percent==null?null:Number(row.fuel_percent),cleanlinessStatus:row.cleanliness_status as FleetCleanliness,lastInspectionAt:row.last_inspection_at||null,lastServiceAt:row.last_service_at||null,nextServiceAt:row.next_service_at||null,nextServiceKm:row.next_service_km==null?null:Number(row.next_service_km),insuranceExpiresAt:row.insurance_expires_at||null,periodicInspectionExpiresAt:row.periodic_inspection_expires_at||null,damageNotes:String(row.damage_notes||''),internalNotes:String(row.internal_notes||''),gpsProvider:String(row.gps_provider||''),gpsDeviceId:String(row.gps_device_id||''),gpsStatus:row.gps_status as FleetGpsStatus,gpsLastSyncAt:row.gps_last_sync_at||null,lastKnownLatitude:row.last_known_latitude==null?null:Number(row.last_known_latitude),lastKnownLongitude:row.last_known_longitude==null?null:Number(row.last_known_longitude)};}
  private async requiredToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private clean(value:string,max:number):string{return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
  private numberOrNull(value:number|null|undefined):number|null{const n=Number(value);return value==null||!Number.isFinite(n)||n<0?null:Math.round(n);}
  private rangeOrNull(value:number|null|undefined,min:number,max:number):number|null{const n=Number(value);return value==null||!Number.isFinite(n)||n<min||n>max?null:Math.round(n);}
  private async rest<T=unknown>(method:'GET'|'POST'|'PATCH',path:string,body:unknown,token:string,prefer?:string):Promise<T>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{method,headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,accept:'application/json',...(method==='GET'?{}:{'content-type':'application/json'}),...(prefer?{Prefer:prefer}:{})},body:method==='GET'?undefined:JSON.stringify(body),cache:'no-store'});if(!response.ok){const payload=await response.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(payload.message||payload.code||`FLEET_OPERATIONS_${response.status}`);}if(response.status===204)return undefined as T;const text=await response.text();return(text?JSON.parse(text):undefined) as T;}
}
