import { Injectable, inject, signal } from '@angular/core';
import { BranchPortalAuthService } from './branch-portal-auth.service';
import { BranchPortalService } from './branch-portal.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type BranchFinanceTransaction={id:string;occurred_at:string;direction:'INCOME'|'EXPENSE';category:string;payment_method:string|null;gross_amount:number;discount_amount:number;net_amount:number;currency:string;counterparty_name:string|null;reference:string|null;description:string|null;source:string;receipt_number:string|null;invoice_number:string|null;status:string};
export type BranchFinanceBooking={reference:string;itemName:string;customerName:string;customerPhone:string;totalPrice:number;amountPaid:number;currency:string;paymentMethod:string;paymentStatus:string;status:string;startAt:string|null;payerMatchStatus:string;signerMatchStatus:string};
export type BranchFinanceProfile={bankName:string|null;iban:string|null;accountHolder:string|null;legalName:string|null;taxNumber:string|null;taxOffice:string|null;preferredProvider:'PAYTR'|'IYZICO'|'NONE';payoutStatus:string;payoutEnabled:boolean};
export type BranchFinanceSnapshot={ok:boolean;branchId:string;billingModel:'SUBSCRIPTION';subscription:{status:string;planId:string;currentPeriodEnd:string|null}|null;financeProfile:BranchFinanceProfile;summary:{income:number;expense:number;outstanding:number;bookingCount:number};transactions:BranchFinanceTransaction[];bookings:BranchFinanceBooking[]};

@Injectable({providedIn:'root'})
export class BranchFinanceV225Service{
  private readonly auth=inject(BranchPortalAuthService);private readonly portal=inject(BranchPortalService);
  private readonly state=signal<BranchFinanceSnapshot|null>(null);private readonly busy=signal(false);private readonly error=signal<string|null>(null);
  readonly snapshot=this.state.asReadonly();readonly loading=this.busy.asReadonly();readonly lastError=this.error.asReadonly();

  async refresh(from?:string,to?:string):Promise<BranchFinanceSnapshot>{this.busy.set(true);this.error.set(null);try{const membership=await this.membership();const payload=await this.rpc<BranchFinanceSnapshot>('service_branch_finance_snapshot_v225',{p_branch_id:membership.branchId,p_from:from||null,p_to:to||null});this.state.set(payload);return payload;}catch(error){const message=this.message(error);this.error.set(message);throw error;}finally{this.busy.set(false);}}

  async saveProfile(input:{bankName?:string;iban?:string;accountHolder?:string;legalName?:string;taxNumber?:string;taxOffice?:string;preferredProvider?:'PAYTR'|'IYZICO'|'NONE'}):Promise<void>{const membership=await this.membership();await this.rpc('service_branch_save_finance_profile_v225',{p_branch_id:membership.branchId,p_bank_name:this.clean(input.bankName,160),p_iban:this.clean(input.iban,40),p_account_holder:this.clean(input.accountHolder,180),p_legal_name:this.clean(input.legalName,220),p_tax_number:this.clean(input.taxNumber,80),p_tax_office:this.clean(input.taxOffice,160),p_preferred_provider:input.preferredProvider||'NONE'});await this.refresh();}

  async addExpense(input:{amount:number;category:string;currency:string;occurredAt?:string;counterpartyName?:string;reference?:string;description?:string;receiptNumber?:string;invoiceNumber?:string}):Promise<void>{const membership=await this.membership();if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('INVALID_AMOUNT');await this.rpc('service_branch_add_expense_v225',{p_branch_id:membership.branchId,p_amount:input.amount,p_category:this.clean(input.category,40),p_currency:this.clean(input.currency,10)||'TRY',p_occurred_at:input.occurredAt||null,p_counterparty_name:this.clean(input.counterpartyName,200)||null,p_reference:this.clean(input.reference,160)||null,p_description:this.clean(input.description,1500)||null,p_receipt_number:this.clean(input.receiptNumber,120)||null,p_invoice_number:this.clean(input.invoiceNumber,120)||null,p_idempotency_key:crypto.randomUUID()});await this.refresh();}

  async voidExpense(id:string,reason:string):Promise<void>{const membership=await this.membership();await this.rpc('service_branch_void_expense_v225',{p_branch_id:membership.branchId,p_transaction_id:id,p_reason:this.clean(reason,500)});await this.refresh();}

  async recordOfflinePayment(input:{bookingReference:string;amount:number;method:'OFFICE'|'EFT';payerName:string;payerPhone:string;externalReference?:string;note?:string}):Promise<void>{const membership=await this.membership();if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('INVALID_AMOUNT');await this.rpc('service_branch_record_offline_payment_v225',{p_branch_id:membership.branchId,p_booking_reference:this.clean(input.bookingReference,128),p_amount:input.amount,p_method:input.method,p_payer_name:this.clean(input.payerName,160),p_payer_phone:this.clean(input.payerPhone,40),p_external_reference:this.clean(input.externalReference,200)||null,p_note:this.clean(input.note,1000)||null,p_idempotency_key:crypto.randomUUID()});await this.refresh();}

  async confirmSigner(bookingReference:string,matches:boolean,note=''):Promise<void>{const membership=await this.membership();await this.rpc('service_branch_confirm_signer_v225',{p_branch_id:membership.branchId,p_booking_reference:this.clean(bookingReference,128),p_matches:matches,p_note:this.clean(note,500)||null});await this.refresh();}

  clear():void{this.state.set(null);this.error.set(null);}

  private async membership(){let membership=this.portal.currentMembership();if(!membership){await this.portal.loadMemberships();membership=this.portal.currentMembership();}if(!membership)throw new Error('BRANCH_ACCESS_DENIED');return membership;}
  private async rpc<T=unknown>(name:string,body:Record<string,unknown>):Promise<T>{const token=await this.auth.getAccessToken();if(!token)throw new Error('BRANCH_SESSION_REQUIRED');const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)});const payload=await response.json().catch(()=>({}));if(!response.ok){const raw=String(payload?.message||payload?.code||payload?.details||`BRANCH_FINANCE_${response.status}`);throw new Error(raw);}return payload as T;}
  private clean(value:unknown,max:number):string{return typeof value==='string'?value.trim().slice(0,max):'';}
  private message(error:unknown):string{const raw=error instanceof Error?error.message:'';if(raw.includes('BRANCH_FINANCE_READ_REQUIRED')||raw.includes('BRANCH_FINANCE_MANAGE_REQUIRED'))return'Bu şubenin finans bilgileri için yetkiniz bulunmuyor.';if(raw.includes('SUBSCRIPTION'))return'Finans işlemleri için şube aboneliği aktif olmalıdır.';return'Şube finans verileri şu anda alınamadı.';}
}
