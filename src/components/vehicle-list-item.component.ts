import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Params, RouterLink } from "@angular/router";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

@Component({
  selector:"app-vehicle-list-item",standalone:true,imports:[CommonModule,RouterLink,TurkishCurrencyPipe],host:{class:"block h-full w-full min-w-0"},
  template:`
    <a [routerLink]="detailRoute" [queryParams]="queryParams||undefined" [attr.aria-label]="detailAriaLabel" class="group block h-full min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-[#24314A] bg-[#0D1628] p-3 text-[#F8FAFC] shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#C6A15B] hover:bg-[#101A2E] hover:shadow-2xl active:translate-y-0 active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]">
      <article class="flex h-full min-w-0 flex-col">
        <div class="relative h-[148px] w-full overflow-hidden rounded-xl bg-[#101A2E] sm:h-[168px]">
          <img [src]="car.images?.[0]||car.image||'/vehicle-placeholder.svg'" (error)="handleImageError($event)" [alt]="displayTitle" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050A18]/65 via-transparent to-transparent" aria-hidden="true"></div>
          @if(car.badge){<span class="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide shadow-lg" [ngClass]="badgeTone(car.badge)">{{car.badge}}</span>}
          @if(car.isCampaign||car.discountRate){<span class="absolute bottom-2 left-2 rounded-full bg-[#EABF35] px-2.5 py-1 text-[9px] font-black uppercase text-[#111827] shadow-lg">@if(car.discountRate){%{{car.discountRate}} İNDİRİM}@else{FIRSAT}</span>}
          <span class="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#0B1224]/95 text-[#C6A15B] shadow-lg transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
        </div>

        <div class="flex flex-1 flex-col px-1 pt-3">
          <h3 class="min-w-0 text-base font-black leading-tight text-[#F8FAFC] transition-colors group-hover:text-[#E7C777]">{{displayTitle}}</h3>
          <div class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-[#94A3B8] sm:text-xs" aria-label="Araç özellikleri">
            @if(car.year){<span class="rounded-md border border-[#24314A] bg-[#101A2E] px-2 py-1">{{car.year}}</span>}
            @if(car.transmission){<span class="rounded-md border border-[#24314A] bg-[#101A2E] px-2 py-1">{{car.transmission}}</span>}
            @if(car.fuel){<span class="rounded-md border border-[#24314A] bg-[#101A2E] px-2 py-1">{{car.fuel}}</span>}
            @if(variant==='sale'&&car.km!=null){<span class="rounded-md border border-[#24314A] bg-[#101A2E] px-2 py-1">{{car.km|number}} km</span>}
            @if(variant==='rental'&&car.seats){<span class="rounded-md border border-[#24314A] bg-[#101A2E] px-2 py-1">{{car.seats}} kişi</span>}
            @if(variant==='rental'&&car.hourlyRentalEnabled){<span class="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-amber-200">Saatlik kiralanabilir</span>}
          </div>

          @if(variant==='sale' && cardDescription){<p class="mt-3 line-clamp-2 text-[11px] leading-5 text-[#94A3B8] sm:text-xs">{{cardDescription}}</p>}

          <div class="mt-auto flex min-w-0 items-end justify-between gap-2 border-t border-[#24314A] pt-3">
            <div class="min-w-0">
              <span class="block truncate text-[11px] font-semibold text-[#94A3B8]">{{locationLabel}}</span>
              <span class="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#E7C777]">{{variant==='sale'?'Aracı İncele':'Aracı İncele'}}<span aria-hidden="true">→</span></span>
            </div>
            <span class="shrink-0 text-right text-sm font-black text-[#F8FAFC] sm:text-base">{{displayPrice|turkishCurrency}}@if(variant==='rental'){<span class="ml-0.5 block text-[9px] font-semibold text-[#94A3B8]">{{hourlyContext?'/ saat':'/ gün'}}</span>}</span>
          </div>
        </div>
      </article>
    </a>
  `
})
export class VehicleListItemComponent {
  @Input({required:true})car!:Car;
  @Input()variant:"rental"|"sale"="rental";
  @Input()queryParams:Params|null=null;

  get detailRoute():(string|number)[]{return[this.variant==="rental"?"/fleet":"/sales",this.car.id];}
  get hourlyContext():boolean{return this.variant==="rental"&&this.queryParams?.["duration"]==="hourly"&&this.car.hourlyRentalEnabled===true&&Number(this.car.hourlyPrice||0)>0;}
  get displayPrice():number{return this.hourlyContext?Number(this.car.hourlyPrice||0):Number(this.car.price||0);}
  get displayTitle():string{const fallback=[this.car.year,this.car.brand,this.car.model,this.car.series].filter(Boolean).join(" ");return this.car.title?.trim()||fallback||"Araç";}
  get locationLabel():string{return String(this.car.location||this.car.branchDistrict||this.car.branchCity||"").trim()||"Konum için aracı inceleyin";}
  get cardDescription():string{const description=String(this.car.description||"").trim().replace(/\s+/g," ");if(description)return description.length>160?`${description.slice(0,157).trimEnd()}...`:description;return this.variant==="sale"?"Kilometre, ekspertiz, hasar geçmişi ve satış koşullarını araç detayında inceleyin.":"";}
  get detailAriaLabel():string{const type=this.variant==="rental"?"kiralık araç":"satılık araç";const details=[this.car.year,this.variant==="sale"&&this.car.km!=null?`${this.car.km} kilometre`:null,this.car.transmission,this.car.fuel,this.locationLabel].filter(Boolean).join(", ");const unit=this.variant==="rental"?(this.hourlyContext?" saatlik":" günlük"):"";return`${this.displayTitle}, ${type}${details?`, ${details}`:""}, fiyat ${this.displayPrice} Türk lirası${unit}. Aracı incele`;}
  badgeTone(label:string):string{const normalized=String(label||"").toLocaleUpperCase("tr-TR");if(/FIRSAT|İNDİRİM|INDIRIM|KAMPANYA|AVANTAJ/.test(normalized))return"bg-[#EABF35] text-[#111827]";if(/YENİ|YENI|POPÜLER|POPULAR/.test(normalized))return"bg-[#2563EB] text-white";return"border border-[#334155] bg-[#101A2E]/95 text-[#CBD5E1]";}
  handleImageError(event:Event):void{const image=event.target as HTMLImageElement;image.onerror=null;image.src="/vehicle-placeholder.svg";}
}
