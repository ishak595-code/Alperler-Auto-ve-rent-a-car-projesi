import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { BranchPortalAuthService } from './branch-portal-auth.service';
import { BranchPortalService } from './branch-portal.service';

export interface BranchFinanceProfileV224 {
  bankName?: string | null; iban?: string | null; accountHolder?: string | null; legalName?: string | null;
  taxNumber?: string | null; taxOffice?: string | null; preferredProvider: 'PAYTR'|'IYZICO'|'NONE';
  payoutStatus: string; payoutEnabled: boolean;
}
export interface BranchFinanceTransactionV224 {
  id:string; occurred_at:string; direction:'INCOME'|'EXPENSE'; category:string; payment_method?:string|null;
  gross_amount:number; discount_amount:number; net_amount:number; currency:string; counterparty_name?:string|null;
  reference?:string|null; description?:string|null; source:string; receipt_number?:string|null; invoice_number?:string|null; status:string;
}
export interface BranchFinanceSnapshotV224 {
  branchId:string; billingModel:'SUBSCRIPTION'; subscription?:{status?:string;planCode?:string;currentPeriodEnd?:string}|null;
  financeProfile:BranchFinanceProfileV224; summary:{income:number;expense:number;outstanding:number;bookingCount:number};
  transactions:BranchFinanceTransactionV224[];
}

@Injectable({providedIn:'root'})
export class BranchFinanceV224Service {
  private readonly auth=inject(BranchPortalAuthService);
  private readonly portal=inject(BranchPortalService);
  readonly snapshot=signal<BranchFinanceSnapshotV224|null>(null);
  readonly loading=signal(false);

  async refresh(from?:string,to?:string):Promise<void>{
    const membership=this.requiredMembership(); const token=await this.requiredToken(); this.loading.set(true);
    try{
      const response=await this.rpc('service_branch_finance_snapshot_v224',{p_branch_id:membership.branchId,p_from:from||null,p_to:to||null},token);
      this.snapshot.set(this.mapSnapshot(response));
    }finally{this.loading.set(false);}
  }

  async saveProfile(input:{bankName?:string;iban?:string;accountHolder?:string;legalName?:string;taxNumber?:string;taxOffice?:string;preferredProvider:'PAYTR'|'IYZICO'|'NONE'}):Promise<void>{
    const membership=this.requiredFinanceManager(); const token=await this.requiredToken();
    await this.rpc('service_branch_save_finance_profile_v224',{
      p_branch_id:membership.branchId,p_bank_name:this.clean(input.bankName,160)||null,p_iban:this.clean(input.iban,40)||null,
      p_account_holder:this.clean(input.accountHolder,180)||null,p_legal_name:this.clean(input.legalName,220)||null,
      p_tax_number:this.clean(input.taxNumber,80)||null,p_tax_office:this.clean(input.taxOffice,160)||null,p_preferred_provider:input.preferredProvider,
    },token); await this.refresh();
  }

  async addExpense(input:{amount:number;category:string;currency?:string;occurredAt?:string;counterpartyName?:string;reference?:string;description?:string;receiptNumber?:string;invoiceNumber?:string}):Promise<void>{
    const membership=this.requiredFinanceManager(); const token=await this.requiredToken();
    await this.rpc('service_branch_add_expense_v224',{
      p_branch_id:membership.branchId,p_amount:Number(input.amount),p_category:input.category,p_currency:input.currency||'TRY',p_occurred_at:input.occurredAt||null,
      p_counterparty_name:this.clean(input.counterpartyName,200)||null,p_reference:this.clean(input.reference,160)||null,
      p_description:this.clean(input.description,1500)||null,p_receipt_number:this.clean(input.receiptNumber,120)||null,p_invoice_number:this.clean(input.invoiceNumber,120)||null,
      p_idempotency_key:crypto.randomUUID(),
    },token); await this.refresh();
  }

  async recordOfflinePayment(input:{bookingReference:string;amount:number;method:'OFFICE'|'EFT';payerName:string;payerPhone:string;externalReference?:string;note?:string}):Promise<void>{
    const membership=this.requiredFinanceManager(); const token=await this.requiredToken();
    await this.rpc('service_branch_record_offline_payment_v224',{
      p_branch_id:membership.branchId,p_booking_reference:this.clean(input.bookingReference,128),p_amount:Number(input.amount),p_method:input.method,
      p_payer_name:this.clean(input.payerName,160),p_payer_phone:this.clean(input.payerPhone,40),p_external_reference:this.clean(input.externalReference,180)||null,
      p_note:this.clean(input.note,1000)||null,p_idempotency_key:crypto.randomUUID(),
    },token); await this.refresh();
  }

  async confirmSigner(input:{bookingReference:string;matches:boolean;note?:string}):Promise<void>{
    const membership=this.requiredFinanceManager(); const token=await this.requiredToken();
    await this.rpc('service_branch_confirm_signer_v224',{p_branch_id:membership.branchId,p_booking_reference:this.clean(input.bookingReference,128),p_matches:input.matches,p_note:this.clean(input.note,500)||null},token);
  }

  private requiredMembership(){const membership=this.portal.currentMembership();if(!membership)throw new Error('BRANCH_ACCESS_DENIED');return membership;}
  private requiredFinanceManager(){const membership=this.requiredMembership();if(!['BRANCH_OWNER','BRANCH_MANAGER'].includes(membership.role))throw new Error('BRANCH_FINANCE_MANAGE_REQUIRED');return membership;}
  private async requiredToken(){const token=await this.auth.getAccessToken();if(!token)throw new Error('BRANCH_SESSION_REQUIRED');return token;}
  private async rpc(name:string,body:Record<string,unknown>,token:string):Promise<any>{const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(String(payload?.message||payload?.code||`${name.toUpperCase()}_${response.status}`));return payload;}
  private mapSnapshot(payload:any):BranchFinanceSnapshotV224{return{branchId:String(payload?.branchId||''),billingModel:'SUBSCRIPTION',subscription:payload?.subscription||null,financeProfile:{bankName:payload?.financeProfile?.bankName||null,iban:payload?.financeProfile?.iban||null,accountHolder:payload?.financeProfile?.accountHolder||null,legalName:payload?.financeProfile?.legalName||null,taxNumber:payload?.financeProfile?.taxNumber||null,taxOffice:payload?.financeProfile?.taxOffice||null,preferredProvider:['PAYTR','IYZICO','NONE'].includes(payload?.financeProfile?.preferredProvider)?payload.financeProfile.preferredProvider:'NONE',payoutStatus:String(payload?.financeProfile?.payoutStatus||'NOT_CONNECTED'),payoutEnabled:payload?.financeProfile?.payoutEnabled===true},summary:{income:Number(payload?.summary?.income||0),expense:Number(payload?.summary?.expense||0),outstanding:Number(payload?.summary?.outstanding||0),bookingCount:Number(payload?.summary?.bookingCount||0)},transactions:Array.isArray(payload?.transactions)?payload.transactions:[]};}
  private clean(value:unknown,max:number){return typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,max):'';}
}
