import { Injectable, inject } from '@angular/core';
import { SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from '../supabase.config';
import { AuthService } from './auth.service';

export interface AdminUpcomingBooking {
  id:string; reference:string; bookingType:string; itemName:string; customerName:string;
  startAt:string; endAt:string|null; status:string; paymentMethod:string; paymentStatus:string;
  amountDue:number; currency:string;
}
export interface AdminOperationsSnapshot {
  bookings:number;
  pendingBookings:number;
  todayBookings:number;
  todayStarts:number;
  todayEnds:number;
  officePaymentsDue:number;
  eftPaymentsDue:number;
  appointments:number;
  saleInquiries:number;
  tourBookings:number;
  openMessages:number;
  openPartnerRequests:number;
  activeSubscribers:number;
  activeStaff:number;
  failedNotifications:number;
  revenue:number;
  upcoming:AdminUpcomingBooking[];
  recentAudit:Array<{ id:number; action:string; entityType:string; entityId:string; actorEmail:string|null; createdAt:string }>;
}

interface AdminOperationsPayload extends Partial<AdminOperationsSnapshot> {
  ok?:boolean;
  code?:string;
  message?:string;
}

@Injectable({ providedIn:'root' })
export class AdminOperationsService {
  private readonly auth=inject(AuthService);
  private readonly proxyEndpoint='/api/partner?op=admin-core&view=operations';
  private readonly directEndpoint=`${supabaseFunctionUrl('admin-core-gateway-v178')}?view=operations`;

  async load():Promise<AdminOperationsSnapshot>{
    const token=await this.requireToken();
    let response:Response|null=null;
    let payload:AdminOperationsPayload={};
    try{
      response=await this.fetchProxy(token);
      payload=await this.payload(response);
    }catch{
      response=null;
    }

    if(!response||(!response.ok&&![401,403].includes(response.status))||response.ok&&payload.ok!==true){
      try{
        const direct=await this.fetchDirect(token);
        const directPayload=await this.payload(direct);
        if(direct.ok&&directPayload.ok===true){response=direct;payload=directPayload;}
        else if(!response||!response.ok){response=direct;payload=directPayload;}
      }catch{
        // Preserve the proxy failure below so the UI can report one stable error.
      }
    }

    if(!response||!response.ok||payload.ok!==true)throw new Error(payload.code||payload.message||`ADMIN_OPERATIONS_${response?.status||0}`);
    return this.normalize(payload);
  }

  private fetchProxy(token:string):Promise<Response>{
    return fetch(this.proxyEndpoint,{method:'GET',headers:{authorization:`Bearer ${token}`,accept:'application/json','x-request-id':crypto.randomUUID()},cache:'no-store',signal:AbortSignal.timeout(20_000)});
  }

  private fetchDirect(token:string):Promise<Response>{
    return fetch(this.directEndpoint,{method:'GET',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,accept:'application/json','x-request-id':crypto.randomUUID()},cache:'no-store',signal:AbortSignal.timeout(20_000)});
  }

  private async payload(response:Response):Promise<AdminOperationsPayload>{return await response.json().catch(()=>({})) as AdminOperationsPayload;}
  private normalize(payload:AdminOperationsPayload):AdminOperationsSnapshot{return{
    bookings:Number(payload.bookings||0),pendingBookings:Number(payload.pendingBookings||0),todayBookings:Number(payload.todayBookings||0),todayStarts:Number(payload.todayStarts||0),todayEnds:Number(payload.todayEnds||0),officePaymentsDue:Number(payload.officePaymentsDue||0),eftPaymentsDue:Number(payload.eftPaymentsDue||0),appointments:Number(payload.appointments||0),saleInquiries:Number(payload.saleInquiries||0),tourBookings:Number(payload.tourBookings||0),openMessages:Number(payload.openMessages||0),openPartnerRequests:Number(payload.openPartnerRequests||0),activeSubscribers:Number(payload.activeSubscribers||0),activeStaff:Number(payload.activeStaff||0),failedNotifications:Number(payload.failedNotifications||0),revenue:Number(payload.revenue||0),
    upcoming:Array.isArray(payload.upcoming)?payload.upcoming.map(row=>({id:String(row.id||''),reference:String(row.reference||''),bookingType:String(row.bookingType||''),itemName:String(row.itemName||''),customerName:String(row.customerName||''),startAt:String(row.startAt||''),endAt:row.endAt?String(row.endAt):null,status:String(row.status||''),paymentMethod:String(row.paymentMethod||''),paymentStatus:String(row.paymentStatus||''),amountDue:Number(row.amountDue||0),currency:String(row.currency||'TRY')})):[],
    recentAudit:Array.isArray(payload.recentAudit)?payload.recentAudit.map(row=>({id:Number(row.id||0),action:String(row.action||''),entityType:String(row.entityType||''),entityId:String(row.entityId||''),actorEmail:row.actorEmail||null,createdAt:String(row.createdAt||'')})):[],
  };}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
}
