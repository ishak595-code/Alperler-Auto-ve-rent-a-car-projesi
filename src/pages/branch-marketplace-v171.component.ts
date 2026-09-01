import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { GeoDirectoryService } from "../services/geo-directory.service";
import { BranchMarketplaceKind, BranchMarketplaceV171Service, MarketplaceRecord } from "../services/branch-marketplace-v171.service";

@Component({selector:"app-branch-marketplace-v171",standalone:true,imports:[CommonModule,FormsModule,MatIconModule,RouterLink],template:`
<main class="min-h-screen bg-slate-950 text-white pb-20">
  <section class="border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
    <div class="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
      <p class="text-xs font-black uppercase tracking-[.18em] text-blue-300">Türkiye Geneli Alperler Şube Ağı</p>
      <h1 class="mt-3 max-w-4xl text-4xl font-black leading-tight md:text-6xl">İlinizi ve ilçenizi seçin, bölgenizdeki araçları ve turları keşfedin.</h1>
      <p class="mt-5 max-w-3xl text-base leading-7 text-slate-300">Konumunuza göre kiralık ve satılık araçları, turları ve hizmet veren şubeleri karşılaştırın. Her sonuçta hizmeti sunan işletme ve bölge bilgilerini açıkça görebilirsiniz.</p>
      <div class="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:grid-cols-[1fr_1fr_.7fr_auto]">
        <label class="grid gap-2"><span class="text-xs font-black uppercase tracking-wider text-slate-300">İl</span><select [(ngModel)]="provinceCode" (ngModelChange)="provinceChanged($event)" class="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-white" aria-label="İl seçin"><option value="">Tüm iller</option>@for(p of geo.provinces();track p.code){<option [value]="p.code">{{p.name}}</option>}</select></label>
        <label class="grid gap-2"><span class="text-xs font-black uppercase tracking-wider text-slate-300">İlçe</span><select [(ngModel)]="districtCode" [disabled]="!provinceCode" class="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-white" aria-label="İlçe seçin"><option value="">Tüm ilçeler</option>@for(d of districts();track d.code){<option [value]="d.code">{{d.name}}</option>}</select></label>
        <label class="grid gap-2"><span class="text-xs font-black uppercase tracking-wider text-slate-300">Ne arıyorsunuz?</span><select [(ngModel)]="kind" class="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-white" aria-label="İlan türü"><option value="ALL">Tümü</option><option value="RENTAL">Kiralık</option><option value="SALE">Satılık</option><option value="TOUR">Tur</option></select></label>
        <button type="button" (click)="search()" [disabled]="loading()||geo.loading()" class="self-end min-h-12 rounded-xl bg-blue-500 px-6 font-black text-white disabled:opacity-50">{{loading()?'Aranıyor…':'Sonuçları Getir'}}</button>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-7xl px-4 py-8 md:px-8">
    @if(error()){<div role="alert" class="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{{error()}}</div>}
    @if(result()){
      <div class="mb-6 grid gap-3 sm:grid-cols-4"><div class="metric"><strong>{{result()!.counts.branches}}</strong><span>Şube</span></div><div class="metric"><strong>{{result()!.counts.rentals}}</strong><span>Kiralık</span></div><div class="metric"><strong>{{result()!.counts.sales}}</strong><span>Satılık</span></div><div class="metric"><strong>{{result()!.counts.tours}}</strong><span>Tur</span></div></div>
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        @for(item of result()!.records;track item.cloudId){<article class="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"><div class="aspect-[16/9] bg-slate-800">@if(item.image){<img [src]="item.image" [alt]="title(item)" class="h-full w-full object-cover"/>}@else{<div class="grid h-full place-items-center text-slate-500"><mat-icon aria-hidden="true">directions_car</mat-icon></div>}</div><div class="p-5"><div class="flex items-start justify-between gap-3"><div><span class="rounded-full bg-blue-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">{{kindLabel(item.category)}}</span><h2 class="mt-2 text-xl font-black">{{title(item)}}</h2></div><strong class="text-lg">{{item.price|number:'1.0-0'}} ₺</strong></div><div class="mt-4 rounded-2xl bg-white/5 p-4"><div class="flex items-center gap-2 text-sm font-black"><mat-icon aria-hidden="true">storefront</mat-icon>{{item.operatorName}}</div><p class="mt-1 text-xs text-slate-400">{{item.city}} / {{item.district}}</p><p class="mt-3 text-xs leading-5 text-slate-400">{{item.branch.platformDisclaimer}}</p></div><div class="mt-4 grid grid-cols-2 gap-2"><a [routerLink]="detailLink(item)" class="grid min-h-11 place-items-center rounded-xl bg-blue-500 font-black text-white no-underline">Detay</a><a [routerLink]="['/branches',item.branch.slug]" class="grid min-h-11 place-items-center rounded-xl border border-white/15 font-black text-white no-underline">Şubeyi Gör</a></div></div></article>}
        @empty{<div class="col-span-full rounded-3xl border-2 border-dashed border-white/15 p-12 text-center"><mat-icon class="text-slate-500" aria-hidden="true">travel_explore</mat-icon><h2 class="mt-3 text-xl font-black">Bu konumda henüz seçenek yok</h2><p class="mt-2 text-sm text-slate-400">Farklı bir ilçe seçebilir veya tüm ili arayabilirsiniz.</p></div>}
      </div>
    }
  </section>
</main>`,styles:[`:host{display:block}.metric{display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.04);padding:1rem}.metric strong{font-size:1.5rem}.metric span{margin-top:.2rem;color:#94a3b8;font-size:.75rem;font-weight:800}`]})
export class BranchMarketplaceV171Component implements OnInit{
  readonly geo=inject(GeoDirectoryService);private readonly marketplace=inject(BranchMarketplaceV171Service);provinceCode="";districtCode="";kind:BranchMarketplaceKind="ALL";readonly loading=signal(false);readonly error=signal("");readonly result=signal<Awaited<ReturnType<BranchMarketplaceV171Service["search"]>>|null>(null);readonly districts=computed(()=>this.geo.districtsFor(this.provinceCode));
  ngOnInit():void{void this.geo.ensureLoaded().then(()=>this.search()).catch(()=>this.error.set("Konum seçenekleri şu anda hazırlanamadı."));}
  provinceChanged(value:string):void{this.provinceCode=value;this.districtCode="";}
  async search():Promise<void>{if(this.loading())return;this.loading.set(true);this.error.set("");try{this.result.set(await this.marketplace.search(this.provinceCode,this.districtCode,this.kind));}catch{this.error.set("Arama şu anda tamamlanamadı. Lütfen tekrar deneyin.");}finally{this.loading.set(false);}}
  title(item:MarketplaceRecord):string{return item.category==="TOUR"?String(item.title||"Tur"):`${item.brand||""} ${item.model||""}`.trim()||"Araç";}
  kindLabel(kind:BranchMarketplaceKind):string{return kind==="RENTAL"?"Kiralık":kind==="SALE"?"Satılık":kind==="TOUR"?"Tur":"İlan";}
  detailLink(item:MarketplaceRecord):unknown[]{return item.category==="SALE"?["/sales",item.id]:item.category==="TOUR"?["/tour",item.id]:["/fleet",item.id];}
}
