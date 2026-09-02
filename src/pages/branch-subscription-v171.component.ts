import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  BranchInvoiceV171,
  BranchListingUsageV237,
  BranchSubscriptionV171,
  BranchSubscriptionV171Service,
} from "../services/branch-subscription-v171.service";

@Component({
  selector:"app-branch-subscription-v171",
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
<main class="min-h-screen bg-slate-100 pb-20 text-slate-900">
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 md:px-8">
      <div><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Şube Portalı</p><h1 class="text-lg font-black">Abonelik ve Faturalar</h1></div>
      <a routerLink="/branch-portal" class="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white no-underline">Portala Dön</a>
    </div>
  </header>

  <section class="mx-auto max-w-6xl px-4 py-8 md:px-8">
    @if(message()){
      <p role="status" [class.bg-emerald-50]="messageType()==='ok'" [class.text-emerald-800]="messageType()==='ok'" [class.bg-amber-50]="messageType()==='info'" [class.text-amber-800]="messageType()==='info'" class="mb-4 rounded-2xl p-4 font-bold">{{message()}}</p>
    }
    @if(error()){<p role="alert" class="rounded-2xl bg-rose-50 p-4 font-bold text-rose-800">{{error()}}</p>}
    @if(usageError()){<p role="alert" class="mb-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">İlan kullanım sayacı şu anda doğrulanamadı. Abonelik ve faturalar etkilenmedi.</p>}

    <div class="grid gap-5 lg:grid-cols-2">
      @for(item of subscriptions();track item.id){
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-wider text-blue-600">{{item.branch?.operator_display_name||item.branch?.name}}</p>
              <h2 class="mt-1 text-2xl font-black">{{item.plan?.name||'Şube Paketi'}}</h2>
              <p class="mt-1 text-sm text-slate-500">{{item.branch?.city}} / {{item.branch?.district}}</p>
            </div>
            <span [class]="statusClass(item.status)" class="rounded-full px-3 py-1 text-xs font-black">{{statusLabel(item.status)}}</span>
          </div>

          <div class="mt-6 rounded-2xl bg-slate-50 p-5">
            <strong class="text-3xl font-black">{{effectivePrice(item)|number:'1.0-0'}} ₺</strong><span class="ml-2 text-sm text-slate-500">/ ay</span>
            @if(item.is_complimentary){<p class="mt-2 text-sm font-black text-emerald-700">Super Admin tarafından ücretsiz kullanım tanımlandı.</p>}
          </div>

          <p class="mt-4 text-sm leading-6 text-slate-600">{{item.plan?.short_description}}</p>

          @if(usageFor(item.branch_id);as usage){
            <section class="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4" aria-label="Aktif ilan hakkı kullanımı">
              <div class="flex flex-wrap items-end justify-between gap-2">
                <div><p class="text-[10px] font-black uppercase tracking-wider text-blue-700">Aktif İlan Hakkı</p><strong class="mt-1 block text-2xl font-black text-blue-950">{{usage.published_count}} / {{usage.listing_limit}}</strong></div>
                <div class="text-right"><span class="text-xs text-blue-700">Kalan yayın hakkı</span><strong class="block text-xl font-black text-blue-950">{{usage.remaining_slots}}</strong></div>
              </div>
              <div class="mt-4 h-2 overflow-hidden rounded-full bg-blue-100" aria-hidden="true"><div class="h-full rounded-full bg-blue-600" [style.width.%]="usagePercent(usage)"></div></div>
              <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div class="rounded-xl bg-white p-3"><span class="block text-slate-500">Taslak</span><strong class="mt-1 block text-base">{{usage.draft_count}}</strong></div>
                <div class="rounded-xl bg-white p-3"><span class="block text-slate-500">İncelemede</span><strong class="mt-1 block text-base">{{usage.pending_review_count}}</strong></div>
                <div class="rounded-xl bg-white p-3"><span class="block text-slate-500">Reddedilen</span><strong class="mt-1 block text-base">{{usage.rejected_count}}</strong></div>
              </div>
              @if(usage.quota_reached){
                <p role="status" class="mt-4 rounded-xl bg-rose-100 p-3 text-xs font-bold leading-5 text-rose-900">Aktif ilan hakkınız dolu. Yeni taslak hazırlayabilirsiniz ancak yeni bir araç veya tur yayına alınmadan önce mevcut aktif ilanlardan biri yayından çıkarılmalı veya paket limiti yükseltilmelidir.</p>
              }@else{
                <p class="mt-4 text-xs font-semibold leading-5 text-blue-900">Paket kotasını yalnız yayındaki araç ve turlar tüketir. Taslak ve merkez incelemesindeki ilanlar aktif ilan hakkından düşmez.</p>
              }
            </section>
          }

          <div class="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-xl border border-slate-200 p-3"><span class="text-slate-500">Dönem sonu</span><strong class="mt-1 block">{{item.current_period_end?(item.current_period_end|date:'dd.MM.yyyy'):'Süresiz'}}</strong></div>
            <div class="rounded-xl border border-slate-200 p-3"><span class="text-slate-500">Otomatik yenileme</span><strong class="mt-1 block">{{item.auto_renew?'Açık':'Kapalı'}}</strong></div>
          </div>
        </article>
      }
    </div>

    <div class="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 p-5"><h2 class="text-xl font-black">Faturalar</h2><p class="text-sm text-slate-500">Şubenize ait abonelik faturaları ve ödeme durumu. Açık faturalar güvenli PayTR ödeme ekranına yönlendirilir; kart bilgisi Alperler Auto veritabanında tutulmaz.</p></div>
      <div class="overflow-x-auto"><table class="min-w-[820px] w-full text-left text-sm"><thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th class="p-3">Fatura</th><th class="p-3">Tutar</th><th class="p-3">Durum</th><th class="p-3">Son ödeme</th><th class="p-3">Ödeme</th><th class="p-3">İşlem</th></tr></thead><tbody>@for(invoice of invoices();track invoice.id){<tr class="border-t border-slate-100"><td class="p-3 font-black">{{invoice.invoice_number}}</td><td class="p-3">{{invoice.amount|number:'1.0-0'}} {{invoice.currency}}</td><td class="p-3">{{invoice.status}}</td><td class="p-3">{{invoice.due_at|date:'dd.MM.yyyy'}}</td><td class="p-3">{{invoice.paid_at?(invoice.paid_at|date:'dd.MM.yyyy HH:mm'):'Bekliyor'}}</td><td class="p-3">@if(payable(invoice)){<button type="button" (click)="pay(invoice)" [disabled]="payingInvoiceId()===invoice.id" class="min-h-10 rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-50">{{payingInvoiceId()===invoice.id?'Hazırlanıyor…':'Güvenli Öde'}}</button>}@else if(invoice.status==='PAID'){<span class="font-black text-emerald-700">Ödendi</span>}@else{<span class="text-slate-400">İşlem yok</span>}</td></tr>}@empty{<tr><td colspan="6" class="p-8 text-center text-slate-500">Henüz fatura oluşturulmadı.</td></tr>}</tbody></table></div>
    </div>
  </section>
</main>`,
})
export class BranchSubscriptionV171Component implements OnInit {
  private readonly service=inject(BranchSubscriptionV171Service);
  readonly subscriptions=signal<BranchSubscriptionV171[]>([]);
  readonly invoices=signal<BranchInvoiceV171[]>([]);
  readonly usage=signal<BranchListingUsageV237[]>([]);
  readonly error=signal("");
  readonly usageError=signal(false);
  readonly message=signal("");
  readonly messageType=signal<"ok"|"info">("info");
  readonly payingInvoiceId=signal("");

  ngOnInit():void{
    const payment=typeof location!=="undefined"?new URLSearchParams(location.search).get("payment"):null;
    if(payment==="success"){
      this.message.set("Ödeme dönüşü alındı. PayTR bildirimi doğrulandıktan sonra fatura otomatik güncellenecektir.");
      this.messageType.set("ok");
    }else if(payment==="cancelled"){
      this.message.set("Ödeme tamamlanmadı. Faturanız korunuyor ve yeniden deneyebilirsiniz.");
      this.messageType.set("info");
    }
    void this.load();
  }

  private async load():Promise<void>{
    try{
      const [subscriptions,invoices]=await Promise.all([this.service.mySubscriptions(),this.service.myInvoices()]);
      this.subscriptions.set(subscriptions);
      this.invoices.set(invoices);
      try{this.usage.set(await this.service.myListingUsage());}
      catch{this.usageError.set(true);}
    }catch(error){
      this.error.set(error instanceof Error?error.message:"Abonelik bilgileri yüklenemedi.");
    }
  }

  usageFor(branchId:string):BranchListingUsageV237|undefined{return this.usage().find(row=>row.branch_id===branchId);}
  usagePercent(row:BranchListingUsageV237):number{return row.listing_limit>0?Math.min(100,Math.max(0,(row.published_count/row.listing_limit)*100)):100;}
  effectivePrice(item:BranchSubscriptionV171):number{if(item.is_complimentary)return 0;return item.price_override==null?Number(item.plan?.monthly_fee||0):Number(item.price_override||0);}
  payable(invoice:BranchInvoiceV171):boolean{return ["OPEN","OVERDUE"].includes(invoice.status)&&Number(invoice.amount)>0;}

  async pay(invoice:BranchInvoiceV171):Promise<void>{
    if(!this.payable(invoice)||this.payingInvoiceId())return;
    this.payingInvoiceId.set(invoice.id);
    this.error.set("");
    try{const url=await this.service.checkoutInvoice(invoice.id);window.location.assign(url);}
    catch(error){this.error.set(error instanceof Error?error.message:"Ödeme oturumu başlatılamadı.");this.payingInvoiceId.set("");}
  }

  statusLabel(status:string):string{return({TRIALING:"Deneme",ACTIVE:"Aktif",PAST_DUE:"Ödeme gecikmiş",PAUSED:"Duraklatılmış",CANCELED:"İptal",EXEMPT:"Muaf"} as Record<string,string>)[status]||status;}
  statusClass(status:string):string{return status==="ACTIVE"||status==="TRIALING"||status==="EXEMPT"?"bg-emerald-100 text-emerald-800":status==="PAST_DUE"?"bg-amber-100 text-amber-800":"bg-slate-200 text-slate-700";}
}
