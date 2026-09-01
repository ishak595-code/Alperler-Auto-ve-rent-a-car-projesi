import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface FinanceTransaction {
  id:string; occurred_at:string; direction:'INCOME'|'EXPENSE'; category:string; booking_id?:string|null; vehicle_id?:string|null; tour_id?:string|null; campaign_id?:string|null; payment_method?:string|null; gross_amount:number; discount_amount:number; tax_amount:number; net_amount:number; currency:string; counterparty_name?:string|null; reference?:string|null; description?:string|null; source:string; receipt_number?:string|null; invoice_number?:string|null; status:string;
}
export interface FinanceCurrencySummary { income:number; expense:number; net:number; discount:number; }
export interface FinanceSummary {
  income:number; expense:number; net:number; discount:number; count:number;
  byCategory:Record<string,number>; byPaymentMethod:Record<string,number>; byCurrency:Record<string,FinanceCurrencySummary>;
  receivablesByCurrency:Record<string,number>; pendingReceivablesCount:number;
}
export interface FinanceMessageTemplate {
  id:string; event_key:string; audience:'CUSTOMER'; locale:'tr'|'en'|'de'|'fr'; subject_template:string; intro_template:string; next_step_template:string; is_active:boolean; updated_at:string;
}
export interface NotificationProviderState {
  configured:boolean;
  vaultConfigured:boolean;
  environmentConfigured:boolean;
  source:'vault'|'environment'|'none';
  updatedAt:string|null;
}
export interface FinanceNotificationProviders {
  resend:NotificationProviderState;
  twilio:NotificationProviderState;
}

type OfflinePaymentInput={bookingReference:string;amount:number;method:'OFFICE'|'EFT';externalReference?:string;note?:string};
type ManualFinanceInput={direction:'INCOME'|'EXPENSE';category:string;amount:number;discountAmount?:number;currency?:'TRY'|'EUR'|'USD'|'CHF';occurredAt?:string;paymentMethod?:string;counterpartyName?:string;reference?:string;description?:string;receiptNumber?:string;invoiceNumber?:string};
type StableWriteAttempt={fingerprint:string;requestId:string};

const EMPTY_SUMMARY:FinanceSummary={income:0,expense:0,net:0,discount:0,count:0,byCategory:{},byPaymentMethod:{},byCurrency:{},receivablesByCurrency:{},pendingReceivablesCount:0};
const EMPTY_PROVIDERS:FinanceNotificationProviders={
  resend:{configured:false,vaultConfigured:false,environmentConfigured:false,source:'none',updatedAt:null},
  twilio:{configured:false,vaultConfigured:false,environmentConfigured:false,source:'none',updatedAt:null},
};

@Injectable({providedIn:'root'})
export class FinanceService {
  private readonly auth=inject(AuthService);
  private readonly endpoint='/api/partner?op=finance-admin';
  private offlinePaymentAttempt:StableWriteAttempt|null=null;
  private manualFinanceAttempt:StableWriteAttempt|null=null;
  readonly transactions=signal<FinanceTransaction[]>([]);
  readonly summary=signal<FinanceSummary>({...EMPTY_SUMMARY});
  readonly messageTemplates=signal<FinanceMessageTemplate[]>([]);
  readonly notificationProviders=signal<FinanceNotificationProviders>(structuredClone(EMPTY_PROVIDERS));
  readonly loading=signal(false);

  private async headers(requestId?:string):Promise<Record<string,string>>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return{authorization:`Bearer ${token}`,'content-type':'application/json','x-request-id':requestId||crypto.randomUUID()};}
  async refresh(from:string,to:string):Promise<void>{this.loading.set(true);try{const response=await fetch(`${this.endpoint}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,{headers:await this.headers(),cache:'no-store',signal:AbortSignal.timeout(25_000)});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.code||'FINANCE_READ_FAILED');this.transactions.set(Array.isArray(data.transactions)?data.transactions:[]);this.messageTemplates.set(Array.isArray(data.messageTemplates)?data.messageTemplates:[]);this.notificationProviders.set(this.normalizeProviders(data.notificationProviders));this.summary.set({...EMPTY_SUMMARY,...(data.summary||{}),byCategory:data.summary?.byCategory||{},byPaymentMethod:data.summary?.byPaymentMethod||{},byCurrency:data.summary?.byCurrency||{},receivablesByCurrency:data.summary?.receivablesByCurrency||{}});}finally{this.loading.set(false);}}
  async recordPayment(input:OfflinePaymentInput){
    const normalized={bookingReference:String(input.bookingReference||'').trim(),amount:Math.round(Number(input.amount||0)*100)/100,method:input.method,externalReference:String(input.externalReference||'').trim(),note:String(input.note||'').trim()};
    const fingerprint=JSON.stringify({bookingReference:normalized.bookingReference,amount:normalized.amount,method:normalized.method,externalReference:normalized.externalReference});
    if(!this.offlinePaymentAttempt||this.offlinePaymentAttempt.fingerprint!==fingerprint)this.offlinePaymentAttempt={fingerprint,requestId:crypto.randomUUID()};
    const attempt=this.offlinePaymentAttempt;
    const result=await this.action({action:'record_payment',...normalized},attempt.requestId);
    if(this.offlinePaymentAttempt?.requestId===attempt.requestId)this.offlinePaymentAttempt=null;
    return result;
  }
  async saveMessageTemplate(input:{id?:string;eventKey:string;locale:'tr'|'en'|'de'|'fr';subjectTemplate:string;introTemplate:string;nextStepTemplate:string;isActive:boolean}){return this.action({action:'save_message_template',...input});}
  async saveResendProvider(input:{apiKey:string;mailFrom:string;adminTo?:string}){const result=await this.action({action:'save_notification_provider',provider:'RESEND',credentials:input});this.notificationProviders.set(this.normalizeProviders(result.notificationProviders));return result;}
  async saveTwilioProvider(input:{accountSid:string;authToken:string;from?:string;messagingServiceSid?:string}){const result=await this.action({action:'save_notification_provider',provider:'TWILIO',credentials:input});this.notificationProviders.set(this.normalizeProviders(result.notificationProviders));return result;}
  async clearNotificationProvider(provider:'RESEND'|'TWILIO'){const result=await this.action({action:'clear_notification_provider',provider});this.notificationProviders.set(this.normalizeProviders(result.notificationProviders));return result;}
  async createTransaction(input:ManualFinanceInput){
    const normalized={direction:input.direction,category:String(input.category||'').trim().toUpperCase(),amount:Math.round(Number(input.amount||0)*100)/100,discountAmount:Math.round(Number(input.discountAmount||0)*100)/100,currency:input.currency||'TRY',occurredAt:String(input.occurredAt||''),paymentMethod:String(input.paymentMethod||'').trim(),counterpartyName:String(input.counterpartyName||'').trim(),reference:String(input.reference||'').trim(),description:String(input.description||'').trim(),receiptNumber:String(input.receiptNumber||'').trim(),invoiceNumber:String(input.invoiceNumber||'').trim()};
    const fingerprint=JSON.stringify({direction:normalized.direction,category:normalized.category,amount:normalized.amount,discountAmount:normalized.discountAmount,currency:normalized.currency,occurredAt:normalized.occurredAt,paymentMethod:normalized.paymentMethod,counterpartyName:normalized.counterpartyName,reference:normalized.reference,receiptNumber:normalized.receiptNumber,invoiceNumber:normalized.invoiceNumber});
    if(!this.manualFinanceAttempt||this.manualFinanceAttempt.fingerprint!==fingerprint)this.manualFinanceAttempt={fingerprint,requestId:crypto.randomUUID()};
    const attempt=this.manualFinanceAttempt;
    const result=await this.action({action:'create_transaction',...normalized},attempt.requestId);
    if(this.manualFinanceAttempt?.requestId===attempt.requestId)this.manualFinanceAttempt=null;
    return result;
  }
  async voidTransaction(id:string,reason:string){return this.action({action:'void_transaction',id,reason});}
  async downloadPdf(from:string,to:string):Promise<void>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');const response=await fetch(`/api/finance/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30_000)});if(!response.ok)throw new Error('PDF_REPORT_FAILED');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`alperler-muhasebe-${from.slice(0,10)}-${to.slice(0,10)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  private normalizeProviders(value:any):FinanceNotificationProviders{const normalize=(provider:any):NotificationProviderState=>({configured:provider?.configured===true,vaultConfigured:provider?.vaultConfigured===true,environmentConfigured:provider?.environmentConfigured===true,source:provider?.source==='vault'||provider?.source==='environment'?provider.source:'none',updatedAt:provider?.updatedAt?String(provider.updatedAt):null});return{resend:normalize(value?.resend),twilio:normalize(value?.twilio)};}
  private async action(body:Record<string,unknown>,requestId?:string){const response=await fetch(this.endpoint,{method:'POST',headers:await this.headers(requestId),body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(25_000)});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.code||'FINANCE_ACTION_FAILED');return data;}
}
