import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL } from '../supabase.config';

export interface FinanceTransaction {
  id:string; occurred_at:string; direction:'INCOME'|'EXPENSE'; category:string; booking_id?:string|null; vehicle_id?:string|null; tour_id?:string|null; campaign_id?:string|null; payment_method?:string|null; gross_amount:number; discount_amount:number; tax_amount:number; net_amount:number; currency:string; counterparty_name?:string|null; reference?:string|null; description?:string|null; source:string; receipt_number?:string|null; invoice_number?:string|null; status:string;
}
export interface FinanceSummary { income:number; expense:number; net:number; discount:number; count:number; byCategory:Record<string,number>; }

@Injectable({providedIn:'root'})
export class FinanceService {
  private readonly auth=inject(AuthService);
  readonly transactions=signal<FinanceTransaction[]>([]);
  readonly summary=signal<FinanceSummary>({income:0,expense:0,net:0,discount:0,count:0,byCategory:{}});
  readonly loading=signal(false);

  private async headers():Promise<Record<string,string>>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return{authorization:`Bearer ${token}`,'content-type':'application/json'};}
  async refresh(from:string,to:string):Promise<void>{this.loading.set(true);try{const response=await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/finance-admin?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,{headers:await this.headers()});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.code||'FINANCE_READ_FAILED');this.transactions.set(Array.isArray(data.transactions)?data.transactions:[]);this.summary.set(data.summary||{income:0,expense:0,net:0,discount:0,count:0,byCategory:{}});}finally{this.loading.set(false);}}
  async recordPayment(input:{bookingReference:string;amount:number;method:'OFFICE'|'EFT';externalReference?:string;note?:string}){return this.action({action:'record_payment',...input});}
  async createTransaction(input:{direction:'INCOME'|'EXPENSE';category:string;amount:number;discountAmount?:number;currency?:string;occurredAt?:string;paymentMethod?:string;counterpartyName?:string;reference?:string;description?:string;receiptNumber?:string;invoiceNumber?:string}){return this.action({action:'create_transaction',...input});}
  async voidTransaction(id:string,reason:string){return this.action({action:'void_transaction',id,reason});}
  async downloadPdf(from:string,to:string):Promise<void>{const token=await this.auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');const response=await fetch(`/api/finance/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,{headers:{authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('PDF_REPORT_FAILED');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`alperler-muhasebe-${from.slice(0,10)}-${to.slice(0,10)}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  private async action(body:Record<string,unknown>){const response=await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/finance-admin`,{method:'POST',headers:await this.headers(),body:JSON.stringify(body)});const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.code||'FINANCE_ACTION_FAILED');return data;}
}
