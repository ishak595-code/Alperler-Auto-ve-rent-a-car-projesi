import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { BranchPlanV171, BranchSubscriptionV171Service } from "../services/branch-subscription-v171.service";

@Component({selector:"app-branch-plans-v171",standalone:true,imports:[CommonModule,MatIconModule,RouterLink],template:`
<main class="min-h-screen bg-slate-950 pb-20 text-white">
  <section class="border-b border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
    <div class="mx-auto max-w-6xl px-4 py-16 text-center md:px-8 md:py-24">
      <p class="text-xs font-black uppercase tracking-[.2em] text-blue-300">Alperler Auto Şube Ağı</p>
      <h1 class="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">Sadece bir ilan sayfası değil, işletmenizin dijital satış ve rezervasyon altyapısı.</h1>
      <p class="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300">Kendi web sitesi, rezervasyon sistemi veya güçlü dijital vitrini olmayan yerel işletmeler için doğrulanmış şube profili, il ve ilçe bazlı bulunabilirlik, merkezi yayın altyapısı, bakım, güvenlik ve kampanya araçlarını tek yerde topluyoruz.</p>
      <div class="mx-auto mt-8 grid max-w-4xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4"><div class="value"><mat-icon aria-hidden="true">verified</mat-icon><strong>Doğrulanmış kimlik</strong><span>Müşteri kiminle işlem yaptığını açıkça görür.</span></div><div class="value"><mat-icon aria-hidden="true">location_on</mat-icon><strong>Yerel bulunabilirlik</strong><span>İl ve ilçe seçildiğinde bölgenizdeki ilanlar görünür.</span></div><div class="value"><mat-icon aria-hidden="true">campaign</mat-icon><strong>Merkezi büyüme araçları</strong><span>Uygun paketlerde kampanya ve trafik yönlendirme altyapısı.</span></div><div class="value"><mat-icon aria-hidden="true">security</mat-icon><strong>Bakım ve güvenlik</strong><span>Teknik altyapı ve yayın kalite kontrolü merkezden yürütülür.</span></div></div>
    </div>
  </section>

  <section class="mx-auto max-w-6xl px-4 py-12 md:px-8">
    @if(error()){<p role="alert" class="rounded-2xl bg-rose-500/10 p-4 text-rose-100">{{error()}}</p>}
    <div class="grid gap-5 lg:grid-cols-3">
      @for(plan of plans();track plan.id){<article [class.ring-2]="plan.code==='PRO'" [class.ring-blue-500]="plan.code==='PRO'" class="relative flex flex-col rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">@if(plan.code==='PRO'){<span class="absolute -top-3 left-6 rounded-full bg-blue-500 px-3 py-1 text-xs font-black">ÖNERİLEN</span>}<p class="text-xs font-black uppercase tracking-[.16em] text-blue-300">{{plan.code}}</p><h2 class="mt-2 text-2xl font-black">{{plan.name}}</h2><p class="mt-3 min-h-16 text-sm leading-6 text-slate-400">{{plan.short_description}}</p><div class="mt-6"><strong class="text-4xl font-black">{{plan.monthly_fee|number:'1.0-0'}} ₺</strong><span class="ml-2 text-sm text-slate-400">/ {{plan.billing_interval==='YEARLY'?'yıl':'ay'}}</span></div><p class="mt-3 text-sm font-bold text-blue-200">{{headline(plan)}}</p><ul class="mt-5 flex-1 space-y-3">@for(item of benefits(plan);track item){<li class="flex gap-2 text-sm leading-6 text-slate-300"><mat-icon class="mt-0.5 text-emerald-400" aria-hidden="true">check_circle</mat-icon><span>{{item}}</span></li>}</ul><a routerLink="/branch-partner" [queryParams]="{plan:plan.code}" class="mt-7 grid min-h-12 place-items-center rounded-xl bg-white font-black text-slate-950 no-underline">Bu Paketle Başvur</a></article>}
    </div>

    <div class="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8"><h2 class="text-2xl font-black">Abonelik ücreti neyin karşılığı?</h2><p class="mt-3 max-w-4xl text-sm leading-7 text-slate-300">Şube yalnız “sitede görünmek” için ödeme yapmaz. Ücret, seçilen pakete göre doğrulanmış işletme profili, il/ilçe arama altyapısı, araç ve tur yayın sistemi, merkezi kalite onayı, teknik bakım, güvenlik, rezervasyon altyapısı, kampanya araçları ve trafik yönlendirme kapasitesini finanse eder. Böylece işletme ayrı bir yazılım ekibi kurmadan dijital kanala çıkabilir.</p><p class="mt-3 text-xs leading-5 text-slate-500">Paket özellikleri ve ücretleri Super Admin tarafından dinamik olarak değiştirilebilir. Reklam veya trafik desteği belirli bir satış/adet sonucu garantisi anlamına gelmez.</p></div>
  </section>
</main>`,styles:[`:host{display:block}.value{display:flex;min-height:140px;flex-direction:column;gap:.45rem;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:rgba(255,255,255,.05);padding:1rem}.value mat-icon{color:#60a5fa}.value strong{font-weight:900}.value span{color:#94a3b8;font-size:.75rem;line-height:1.5}`]})
export class BranchPlansV171Component implements OnInit{private readonly service=inject(BranchSubscriptionV171Service);readonly plans=signal<BranchPlanV171[]>([]);readonly error=signal("");ngOnInit():void{void this.load();}private async load(){try{this.plans.set(await this.service.plans());}catch{this.error.set("Abonelik paketleri şu anda yüklenemiyor.");}}headline(plan:BranchPlanV171):string{return String(plan.sales_copy?.headline||"");}benefits(plan:BranchPlanV171):string[]{return Array.isArray(plan.sales_copy?.benefits)?plan.sales_copy.benefits.map(String):[];}}
