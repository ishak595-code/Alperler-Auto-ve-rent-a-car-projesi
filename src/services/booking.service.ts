import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  BookingAlternativeOffer,
  BookingNotificationEvent,
  BookingRecord,
  BookingStatus,
  CreateBookingInput,
  NotificationDeliveryReport,
  PaymentStatus,
} from "../models/booking.model";
import { AuthService } from "./auth.service";
import { CustomerAuthService } from "./customer-auth.service";
import { CommercialOfferContextService } from "./commercial-offer-context.service";
import { currentAnalyticsSessionId } from "./analytics-link.util";
import { AnalyticsIdentityService } from "./analytics-identity.service";
import { AdminGatewayTransportService, isAdminGatewayFailure } from "./admin-gateway-transport.service";

interface ApprovalImpact { bookingId?:string; reference?:string; conflictCount:number; alternativeOfferCount:number; }
interface BookingApiResponse { ok:boolean; booking?:ApiBooking; bookings?:ApiBooking[]; notification?:NotificationDeliveryReport; code?:string; message?:string; }
interface AdminActionResponse { ok:boolean; approval?:ApprovalImpact; notification?:NotificationDeliveryReport; offers?:Array<BookingAlternativeOffer & {bookingReference?:string}>; offer?:Record<string,unknown>; code?:string; message?:string; }
interface ApiBooking extends Omit<BookingRecord,"createdAt"|"updatedAt"> { createdAt:string; updatedAt:string; }

@Injectable({providedIn:"root"})
export class BookingService {
  private readonly http=inject(HttpClient);
  private readonly authService=inject(AuthService);
  private readonly customerAuth=inject(CustomerAuthService);
  private readonly commercialOffer=inject(CommercialOfferContextService);
  private readonly analyticsIdentity=inject(AnalyticsIdentityService);
  private readonly transport=inject(AdminGatewayTransportService);
  private readonly bookings=signal<BookingRecord[]>([]);
  private readonly adminError=signal<string|null>(null);
  private readonly adminLoaded=signal(false);
  private readonly approvalImpact=signal<ApprovalImpact|null>(null);
  private adminRefreshTimer:ReturnType<typeof setInterval>|null=null;

  readonly records=this.bookings.asReadonly();
  readonly lastAdminError=this.adminError.asReadonly();
  readonly isAdminLoaded=this.adminLoaded.asReadonly();
  readonly lastApprovalImpact=this.approvalImpact.asReadonly();

  async create(input:CreateBookingInput):Promise<BookingRecord>{
    const normalized=this.normalizeInput(input);const idempotencyKey=crypto.randomUUID();
    if(normalized.type==="RENTAL"){normalized.startDate=this.wallClockValue(normalized.startDate||"");normalized.endDate=this.wallClockValue(normalized.endDate||"");}
    const response=await this.request<BookingApiResponse>("POST",{...normalized,idempotencyKey,analyticsSessionId:currentAnalyticsSessionId()});
    if(!response.ok||!response.booking)throw new Error(`${response.code||"BOOKING_CREATE_FAILED"}:${response.message||"Talep kaydedilemedi."}`);
    const record=this.fromApi(response.booking);if(response.notification)record.notification=response.notification;this.upsertLocal(record);
    this.commercialOffer.clearAfterBooking(normalized.itemId);
    void this.analyticsIdentity.link({entityType:"BOOKING",reference:record.id,phone:normalized.customerPhone,email:normalized.customerEmail});return record;
  }

  startAdminListener():void{if(this.adminRefreshTimer)return;this.adminError.set(null);this.adminLoaded.set(false);void this.refreshAdminRecords();this.adminRefreshTimer=setInterval(()=>void this.refreshAdminRecords(false),30_000);}
  stopAdminListener():void{if(this.adminRefreshTimer)clearInterval(this.adminRefreshTimer);this.adminRefreshTimer=null;}

  async updateStatus(id:string,status:BookingStatus):Promise<NotificationDeliveryReport>{
    const existing=this.bookings().find((record)=>record.id===id);if(existing?.status===status)return this.duplicateReport(id,this.eventForStatus(status));this.approvalImpact.set(null);
    if(status==="APPROVED"){
      const response=await this.adminAction("POST",{action:"approve",bookingReference:id});
      if(!response.ok)throw new Error(`${response.code||"BOOKING_STATUS_UPDATE_FAILED"}:${response.message||"Rezervasyon onaylanamadı."}`);
      if(response.approval)this.approvalImpact.set(response.approval);await this.refreshAdminRecords(false);
      return response.notification||this.duplicateReport(id,"booking_approved");
    }
    const response=await this.request<BookingApiResponse>("PATCH",{id,operation:"status",status,requestId:crypto.randomUUID()});
    if(!response.ok||!response.booking)throw new Error(`${response.code||"BOOKING_STATUS_UPDATE_FAILED"}:${response.message||"Durum güncellenemedi."}`);
    const record=this.fromApi(response.booking);if(response.notification)record.notification=response.notification;this.upsertLocal(record);
    if(status==="PENDING"||status==="CANCELLED"||status==="REJECTED")await this.refreshAdminRecords(false).catch(()=>undefined);
    return response.notification||this.duplicateReport(id,this.eventForStatus(status));
  }

  async offerAlternative(bookingId:string,offerId:string):Promise<void>{
    const response=await this.adminAction("POST",{action:"offer_alternative",bookingReference:bookingId,offerId,requestId:crypto.randomUUID()});
    if(!response.ok)throw new Error(`${response.code||"ALTERNATIVE_OFFER_FAILED"}:${response.message||"Alternatif kaydedilemedi."}`);await this.refreshAdminRecords(false);
  }

  async updatePayment(input:{id:string;paymentStatus:PaymentStatus;externalPaymentReference?:string}):Promise<void>{const response=await this.request<BookingApiResponse>("PATCH",{id:input.id,operation:"payment",paymentStatus:input.paymentStatus,externalPaymentReference:input.externalPaymentReference?.trim().slice(0,200)||""});if(!response.ok||!response.booking)throw new Error(response.code||"BOOKING_PAYMENT_UPDATE_FAILED");this.upsertLocal(this.fromApi(response.booking));}
  async delete(id:string):Promise<void>{const response=await this.request<BookingApiResponse>("DELETE",{id});if(!response.ok)throw new Error(response.code||"BOOKING_DELETE_FAILED");this.bookings.update((records)=>records.filter((record)=>record.id!==id));}

  private wallClockValue(value:string):string{const raw=value.trim();const dateOnly=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);if(dateOnly)return`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00`;const local=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);if(local)return`${local[1]}-${local[2]}-${local[3]}T${local[4]}:${local[5]}:${local[6]||"00"}`;const date=new Date(raw);if(Number.isNaN(date.getTime()))throw new Error("INVALID_RENTAL_DATES:Kiralama tarihi geçerli değil.");const pad=(part:number)=>String(part).padStart(2,"0");return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;}

  /**
   * Yönetici rezervasyon listesi. Sıra: aynı-origin BFF (/api/bookings → booking-gateway)
   * → doğrudan veritabanı (PostgREST, RLS: private.can_manage_operations()).
   * booking-gateway tarayıcı origin'ini reddettiği için Edge doğrudan çağrılmaz.
   * Yetki hataları (401/403) yedeğe düşmez; kullanıcıya hangi katmanın neden
   * yanıt vermediği Türkçe olarak söylenir.
   */
  private async refreshAdminRecords(showLoading=true):Promise<void>{
    if(showLoading)this.adminLoaded.set(false);
    try{
      const records=await this.loadAdminBookings();
      try{const alternatives=await this.adminAction("GET");const byReference=new Map<string,BookingAlternativeOffer[]>();for(const offer of alternatives.offers||[]){const reference=String((offer as BookingAlternativeOffer&{bookingReference?:string}).bookingReference||"");if(!reference)continue;const cleanOffer={...offer} as BookingAlternativeOffer&{bookingReference?:string};delete cleanOffer.bookingReference;const list=byReference.get(reference)||[];list.push(cleanOffer);byReference.set(reference,list);}for(const record of records)record.alternatives=(byReference.get(record.id)||[]).sort((a,b)=>a.rank-b.rank||b.score-a.score);}catch(error){console.info("Alternative offers unavailable; reservation list remains usable.",error);}
      this.bookings.set(records.sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime()));
      this.adminError.set(null);
    }catch(error){
      console.error("Booking data source is unavailable.",error);
      this.adminError.set(this.adminListErrorMessage(error));
      throw error;
    }finally{this.adminLoaded.set(true);}
  }

  private async loadAdminBookings():Promise<BookingRecord[]>{
    let primary:unknown;
    try{
      const response=await this.transport.bff<BookingApiResponse&Record<string,unknown>>("/api/bookings",{method:"GET",timeoutMs:20_000});
      if(!Array.isArray(response.bookings))throw new Error(String(response.code||"BOOKING_LIST_FAILED"));
      return response.bookings.map((record)=>this.fromApi(record));
    }catch(error){primary=error;}
    if(isAdminGatewayFailure(primary)&&!primary.transport&&primary.status!==500)throw primary;
    try{
      const rows=await this.transport.rest<Record<string,unknown>[]>("bookings?deleted_at=is.null&select=id,reference,booking_type,vehicle_id,tour_id,legacy_item_id,item_name,image,customer_name,customer_email,customer_phone,base_price,total_price,currency,person_count,start_at,end_at,days,rental_hours,with_driver,pickup_branch_id,dropoff_branch_id,pickup_location,dropoff_location,rental_duration,metadata,campaign_id,notes,payment_method,payment_status,external_payment_reference,source,status,created_at,updated_at&order=created_at.desc&limit=500");
      console.warn("Rezervasyon listesi doğrudan veritabanından okundu (site API yanıt vermedi).",primary);
      return (Array.isArray(rows)?rows:[]).map((row)=>this.fromApi(this.bookingRowToApi(row)));
    }catch(restError){
      throw new Error(`${this.transport.describe(primary,"Rezervasyon listesi")} · ${this.transport.describe(restError,"Veritabanı")}`);
    }
  }

  /** booking-gateway toApi() ile birebir aynı eşleme; veritabanı satırını API şekline çevirir. */
  private bookingRowToApi(row:Record<string,any>):ApiBooking{
    const metadata=row["metadata"]&&typeof row["metadata"]==="object"?row["metadata"] as Record<string,unknown>:{};
    const num=(value:unknown)=>value===null||value===undefined?undefined:Number(value);
    return{
      id:String(row["reference"]||row["id"]),type:row["booking_type"],itemId:row["vehicle_id"]||row["tour_id"]||row["legacy_item_id"]||undefined,itemName:row["item_name"],image:row["image"]||undefined,
      customerName:row["customer_name"],customerEmail:row["customer_email"]||undefined,customerPhone:row["customer_phone"],
      basePrice:num(row["base_price"]),totalPrice:num(row["total_price"]),currency:row["currency"],personCount:row["person_count"]??undefined,
      startDate:row["start_at"]||undefined,endDate:row["end_at"]||undefined,days:row["days"]??undefined,rentalHours:row["rental_hours"]??undefined,withDriver:Boolean(row["with_driver"]),
      pickupBranchId:row["pickup_branch_id"]||undefined,dropoffBranchId:row["dropoff_branch_id"]||undefined,pickupLocation:row["pickup_location"]||undefined,dropoffLocation:row["dropoff_location"]||undefined,
      rentalDuration:row["rental_duration"]||undefined,selectedExtraIds:Array.isArray(metadata["selected_extra_ids"])?metadata["selected_extra_ids"] as string[]:undefined,
      campaignId:row["campaign_id"]||undefined,notes:row["notes"]||undefined,paymentMethod:row["payment_method"],paymentStatus:row["payment_status"],externalPaymentReference:row["external_payment_reference"]||undefined,
      source:["WEB","ADMIN","PHONE"].includes(row["source"])?row["source"]:"WEB",status:row["status"],createdAt:String(row["created_at"]||""),updatedAt:String(row["updated_at"]||""),
    } as ApiBooking;
  }

  private adminListErrorMessage(error:unknown):string{
    if(error instanceof Error&&error.message==="ADMIN_SESSION_REQUIRED")return"Yönetici oturumu bulunamadı. Çıkış yapıp yeniden giriş yapın.";
    if(isAdminGatewayFailure(error))return this.transport.describe(error,"Rezervasyon listesi");
    return error instanceof Error&&error.message?error.message:"Rezervasyon veri kaynağına ulaşılamadı. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.";
  }

  private async adminAction(method:"GET"|"POST",body?:unknown):Promise<AdminActionResponse>{const token=await this.authService.getAccessToken();if(!token)throw new Error("ADMIN_SESSION_REQUIRED");const headers={Authorization:`Bearer ${token}`,"content-type":"application/json","x-request-id":crypto.randomUUID()};try{return method==="GET"?await firstValueFrom(this.http.get<AdminActionResponse>("/api/admin-booking-actions",{headers})):await firstValueFrom(this.http.post<AdminActionResponse>("/api/admin-booking-actions",body,{headers}));}catch(error){throw this.normalizeRequestError(error);}}

  private async request<T>(method:"GET"|"POST"|"PATCH"|"DELETE",body?:unknown):Promise<T>{const token=method==="POST"?await this.customerAuth.getAccessToken().catch(()=>null):await this.authService.getAccessToken();if(method!=="POST"&&!token)throw new Error("ADMIN_SESSION_REQUIRED");const headers=token?{Authorization:`Bearer ${token}`} : undefined;try{if(method==="POST")return await firstValueFrom(this.http.post<T>("/api/bookings",body,headers?{headers}:{}));if(method==="GET")return await firstValueFrom(this.http.get<T>("/api/bookings",{headers:headers!}));return await firstValueFrom(this.http.request<T>(method,"/api/bookings",{body,headers:headers!}));}catch(error){throw this.normalizeRequestError(error);}}
  private normalizeRequestError(error:unknown):Error{if(error instanceof Error&&error.message==="ADMIN_SESSION_REQUIRED")return error;if(error instanceof HttpErrorResponse&&error.error&&typeof error.error==="object"){const payload=error.error as{code?:unknown;message?:unknown};return new Error(`${String(payload.code||"BOOKING_BACKEND_UNAVAILABLE")}:${String(payload.message||payload.code||"Rezervasyon servisine ulaşılamıyor.")}`);}return error instanceof Error?error:new Error("BOOKING_BACKEND_UNAVAILABLE");}

  private fromApi(record:ApiBooking):BookingRecord{return{...record,createdAt:this.asDate(record.createdAt),updatedAt:this.asDate(record.updatedAt)};}
  private normalizeInput(input:CreateBookingInput):CreateBookingInput{
    const itemName=this.requiredText(input.itemName,"itemName",240),customerName=this.requiredText(input.customerName,"customerName",160),customerPhone=this.requiredText(input.customerPhone,"customerPhone",40),customerEmail=input.customerEmail?.trim().toLowerCase().slice(0,160)||"";
    if(customerEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))throw new Error("Geçerli bir e-posta adresi girilmelidir.");
    const itemId=input.itemId===undefined?undefined:String(input.itemId).trim().slice(0,128);
    const campaignIntent=input.campaignId||this.commercialOffer.campaignIdForItem(itemId);
    const loyaltyIntent=input.loyaltyPointsToRedeem??this.commercialOffer.loyaltyPointsForCheckout();
    const paymentMethod=input.paymentMethod??"NONE",defaultPaymentStatus:PaymentStatus=paymentMethod==="NONE"?"NOT_REQUIRED":"PENDING",selectedExtraIds=Array.isArray(input.selectedExtraIds)?Array.from(new Set(input.selectedExtraIds.map((id)=>String(id||"").trim()).filter((id)=>/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id)))).slice(0,30):undefined,rentalDuration=input.rentalDuration;
    if(rentalDuration&&!["hourly","daily","weekly","monthly","longterm"].includes(rentalDuration))throw new Error("Kiralama türü geçerli değil.");
    return{...input,itemId,itemName,image:input.image?.trim().slice(0,2048),customerName,customerPhone,customerEmail:customerEmail||undefined,basePrice:this.optionalAmount(input.basePrice),totalPrice:this.optionalAmount(input.totalPrice),currency:input.currency??"TRY",personCount:this.optionalInteger(input.personCount,1,100),startDate:input.startDate?.slice(0,64),endDate:input.endDate?.slice(0,64),days:input.rentalHours?undefined:this.optionalInteger(input.days,1,3650),rentalHours:this.optionalInteger(input.rentalHours,1,23),pickupBranchId:this.optionalUuid(input.pickupBranchId),dropoffBranchId:this.optionalUuid(input.dropoffBranchId),pickupLocation:input.pickupLocation?.trim().slice(0,240),dropoffLocation:input.dropoffLocation?.trim().slice(0,240),rentalDuration,selectedExtraIds,campaignId:this.optionalUuid(campaignIntent),loyaltyPointsToRedeem:this.optionalInteger(loyaltyIntent,0,100_000_000),notes:input.notes?.trim().slice(0,4000),paymentMethod,paymentStatus:input.paymentStatus??defaultPaymentStatus,externalPaymentReference:undefined,source:"WEB"};
  }
  private eventForStatus(status:BookingStatus):BookingNotificationEvent{switch(status){case"APPROVED":return"booking_approved";case"REJECTED":return"booking_rejected";case"COMPLETED":return"booking_completed";case"CANCELLED":return"booking_cancelled";default:return"booking_pending";}}
  private duplicateReport(bookingId:string,event:BookingNotificationEvent):NotificationDeliveryReport{const channel={state:"skipped" as const,reason:"STATUS_UNCHANGED"};return{ok:true,event,bookingId,alreadyProcessed:true,email:channel,sms:channel,adminEmail:channel};}
  private upsertLocal(record:BookingRecord):void{this.bookings.update((records)=>[record,...records.filter((current)=>current.id!==record.id)]);}
  private asDate(value:unknown,fallback=new Date(0)):Date{if(value instanceof Date)return value;if(typeof value==="string"||typeof value==="number"){const date=new Date(value);if(!Number.isNaN(date.getTime()))return date;}return fallback;}
  private optionalUuid(value:string|undefined):string|undefined{const clean=String(value||"").trim();if(!clean)return undefined;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean))throw new Error("Kimlik alanı geçerli değil.");return clean;}
  private optionalAmount(value:number|undefined):number|undefined{if(value===undefined)return undefined;if(!Number.isFinite(value)||value<0||value>50_000_000)throw new Error("Tutar alanı geçerli değil.");return Math.round(value*100)/100;}
  private optionalInteger(value:number|undefined,min:number,max:number):number|undefined{if(value===undefined)return undefined;if(!Number.isInteger(value)||value<min||value>max)throw new Error("Sayısal alan geçerli değil.");return value;}
  private requiredText(value:string|undefined,field:string,max:number):string{const result=value?.trim().slice(0,max)||"";if(!result)throw new Error(`${field} alanı zorunludur.`);return result;}
}
