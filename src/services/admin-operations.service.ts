import { Injectable, inject } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
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
  private readonly endpoint='/api/partner?op=admin-core&view=operations';
  private readonly selfRpcEndpoint=`${SUPABASE_PROJECT_URL}/rest/v1/rpc/service_admin_operations_snapshot_self_v243`;

  async load():Promise<AdminOperationsSnapshot>{
    const token=await this.requireToken();
    const primary=await this.tryCanonical(token);
    if(primary?.response.ok&&primary.payload.ok===true)return this.normalize(primary.payload);

    // V244: the Super Admin overview must not become blind because one hosting
    // transport is unavailable. The fallback is intentionally limited to the
    // no-argument V243 self RPC. It derives the actor from auth.uid() and then
    // delegates to the existing V178 authorization function, so the browser
    // cannot choose another admin/user identity or bypass the database guard.
    const fallback=await this.trySelfRpc(token);
    if(fallback.response.status===401||fallback.payload.code==='UNAUTHORIZED'){
      await this.auth.logout();
      throw new Error('ADMIN_SESSION_REQUIRED');
    }
    if(!fallback.response.ok||fallback.payload.ok!==true){
      const primaryCode=primary?.payload.code||primary?.payload.message||'';
      throw new Error(fallback.payload.code||fallback.payload.message||primaryCode||`ADMIN_OPERATIONS_${fallback.response.status}`);
    }
    return this.normalize(fallback.payload);
  }

  private async tryCanonical(token:string):Promise<{response:Response;payload:AdminOperationsPayload}|null>{
    for(let attempt=0;attempt<2;attempt+=1){
      try{
        const response=await this.fetchWithTimeout(this.endpoint,{
          method:'GET',
          headers:{authorization:`Bearer ${token}`,accept:'application/json','x-request-id':this.requestId()},
          cache:'no-store',
        },12_000);
        const payload=await this.payload(response);
        if(response.ok&&payload.ok===true)return{response,payload};
        if(response.status===429)return{response,payload};
        if(!this.isTransportFallbackCandidate(response,payload))return{response,payload};
        if(attempt===0)await this.delay(180);
        else return{response,payload};
      }catch{
        if(attempt===0)await this.delay(180);
      }
    }
    return null;
  }

  private async trySelfRpc(token:string):Promise<{response:Response;payload:AdminOperationsPayload}>{
    const response=await this.fetchWithTimeout(this.selfRpcEndpoint,{
      method:'POST',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        authorization:`Bearer ${token}`,
        'content-type':'application/json',
        accept:'application/json',
        'x-request-id':this.requestId(),
      },
      body:'{}',
      cache:'no-store',
    },12_000);
    return{response,payload:await this.payload(response)};
  }

  private isTransportFallbackCandidate(response:Response,payload:AdminOperationsPayload):boolean{
    if([401,403,404,500,502,503,504].includes(response.status))return true;
    if(response.ok&&payload.ok!==true&&!payload.code)return true;
    return false;
  }

  private async fetchWithTimeout(input:RequestInfo|URL,init:RequestInit,timeoutMs:number):Promise<Response>{
    const controller=new AbortController();
    const timer=globalThis.setTimeout(()=>controller.abort(),timeoutMs);
    try{return await fetch(input,{...init,signal:controller.signal});}
    finally{globalThis.clearTimeout(timer);}
  }

  private requestId():string{
    const cryptoApi=globalThis.crypto;
    if(cryptoApi&&typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID();
    if(cryptoApi&&typeof cryptoApi.getRandomValues==='function'){
      const bytes=new Uint8Array(16);cryptoApi.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
      const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
      return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    return`web-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  }

  private delay(ms:number):Promise<void>{return new Promise(resolve=>globalThis.setTimeout(resolve,ms));}
  private async payload(response:Response):Promise<AdminOperationsPayload>{return await response.json().catch(()=>({})) as AdminOperationsPayload;}
  private normalize(payload:AdminOperationsPayload):AdminOperationsSnapshot{return{
    bookings:Number(payload.bookings||0),pendingBookings:Number(payload.pendingBookings||0),todayBookings:Number(payload.todayBookings||0),todayStarts:Number(payload.todayStarts||0),todayEnds:Number(payload.todayEnds||0),officePaymentsDue:Number(payload.officePaymentsDue||0),eftPaymentsDue:Number(payload.eftPaymentsDue||0),appointments:Number(payload.appointments||0),saleInquiries:Number(payload.saleInquiries||0),tourBookings:Number(payload.tourBookings||0),openMessages:Number(payload.openMessages||0),openPartnerRequests:Number(payload.openPartnerRequests||0),activeSubscribers:Number(payload.activeSubscribers||0),activeStaff:Number(payload.activeStaff||0),failedNotifications:Number(payload.failedNotifications||0),revenue:Number(payload.revenue||0),
    upcoming:Array.isArray(payload.upcoming)?payload.upcoming.map(row=>({id:String(row.id||''),reference:String(row.reference||''),bookingType:String(row.bookingType||''),itemName:String(row.itemName||''),customerName:String(row.customerName||''),startAt:String(row.startAt||''),endAt:row.endAt?String(row.endAt):null,status:String(row.status||''),paymentMethod:String(row.paymentMethod||''),paymentStatus:String(row.paymentStatus||''),amountDue:Number(row.amountDue||0),currency:String(row.currency||'TRY')})):[],
    recentAudit:Array.isArray(payload.recentAudit)?payload.recentAudit.map(row=>({id:Number(row.id||0),action:String(row.action||''),entityType:String(row.entityType||''),entityId:String(row.entityId||''),actorEmail:row.actorEmail||null,createdAt:String(row.createdAt||'')})):[],
  };}
  private async requireToken():Promise<string>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
}
