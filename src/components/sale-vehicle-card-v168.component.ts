import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Car } from '../models/car.model';
import { TurkishCurrencyPipe } from '../pipes/turkish-currency.pipe';

@Component({
  selector:'app-sale-vehicle-card-v168',standalone:true,imports:[CommonModule,RouterLink,TurkishCurrencyPipe],host:{class:'block h-full min-w-0'},
  template:`
    <a [routerLink]="['/sales',car.id]" [attr.aria-label]="ariaLabel" class="card">
      <article>
        <div class="media"><img [src]="cover" (error)="imageError($event)" [alt]="title" loading="lazy" decoding="async"/><div class="shade"></div>@if(car.cloudStockCode){<span class="stock">ARAÇ NO {{car.cloudStockCode}}</span>}<span class="status" [class.sold]="isSold">{{statusLabel}}</span>@if(car.badge){<span class="badge">{{car.badge}}</span>}</div>
        <div class="body"><h2>{{title}}</h2><div class="facts" aria-label="Araç özellikleri">@if(car.year){<span>{{car.year}}</span>}@if(car.km!=null){<span>{{car.km|number}} km</span>}@if(car.fuel){<span>{{car.fuel}}</span>}@if(car.transmission){<span>{{car.transmission}}</span>}@if(car.type){<span>{{car.type}}</span>}@if(car.color){<span>{{car.color}}</span>}</div>
          <div class="trust">@if(warrantyLabel){<span>✓ {{warrantyLabel}}</span>}@if(damageLabel){<span [class.attention]="!damageFree">{{damageFree?'✓':'•'}} {{damageLabel}}</span>}<span class="tramer" [class.verified]="tramerVerified">{{tramerLabel}}</span></div>
          <div class="location"><div><strong>{{branchLabel||'Şube bilgisi için aracı inceleyin'}}</strong><span>{{car.location||'Konum bilgisi için aracı inceleyin'}}</span></div><b>{{car.price|turkishCurrency}}</b></div>
          <div class="cta"><span>{{isSold?'Aracı incele':'Araç ve ekspertiz bilgilerini incele'}}</span><span aria-hidden="true">→</span></div>
        </div>
      </article>
    </a>
  `,
  styles:[`
    :host{display:block;height:100%}.card{display:block;height:100%;overflow:hidden;border:1px solid #26354d;border-radius:18px;background:#0c1526;color:#f8fafc;text-decoration:none;box-shadow:0 12px 30px rgba(0,0,0,.2);transition:transform .2s,border-color .2s,box-shadow .2s}.card:hover{transform:translateY(-3px);border-color:#c6a15b;box-shadow:0 18px 38px rgba(0,0,0,.28)}.card:focus-visible{outline:3px solid #c6a15b;outline-offset:3px}.card article{display:flex;height:100%;flex-direction:column}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#111827}.media img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.72),transparent 55%)}.stock,.status,.badge{position:absolute;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:950;letter-spacing:.05em}.stock{left:8px;top:8px;background:rgba(2,6,23,.9);color:#cbd5e1}.status{right:8px;top:8px;background:#dcfce7;color:#166534}.status.sold{background:#fee2e2;color:#991b1b}.badge{left:8px;bottom:8px;background:#fbbf24;color:#451a03}.body{display:flex;flex:1;flex-direction:column;padding:12px}.body h2{margin:0;font-size:16px;line-height:1.25}.facts{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.facts span{border:1px solid #26354d;border-radius:7px;background:#101c30;padding:5px 7px;color:#b8c5d6;font-size:9px;font-weight:800}.trust{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.trust span{color:#86efac;font-size:9px;font-weight:850}.trust span.attention{color:#fcd34d}.trust span.tramer{border:1px solid #854d0e;border-radius:999px;background:#261b08;padding:3px 6px;color:#fcd34d}.trust span.tramer.verified{border-color:#065f46;background:#052e24;color:#a7f3d0}.location{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-top:auto;border-top:1px solid #26354d;padding-top:11px}.location div{min-width:0}.location strong,.location span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.location strong{color:#dbeafe;font-size:9px}.location span{max-width:160px;margin-top:3px;color:#8190a6;font-size:9px}.location b{flex:none;color:#f8fafc;font-size:16px}.cta{display:flex;align-items:center;justify-content:space-between;margin-top:8px;color:#e7c777;font-size:9px;font-weight:950;text-transform:uppercase}.card:hover .cta span:last-child{transform:translateX(2px)}@media(prefers-reduced-motion:reduce){.card{transition:none}}
  `]
})
export class SaleVehicleCardV168Component{
  @Input({required:true})car!:Car;@Input()branchLabel='';
  get cover():string{return this.car.image||this.car.images?.[0]||'/vehicle-placeholder.svg';}
  get title():string{return this.car.title?.trim()||[this.car.year,this.car.brand,this.car.series,this.car.model].filter(Boolean).join(' ')||'Satılık araç';}
  get isSold():boolean{return this.car.availability==='Satıldı'||this.car.isAvailable===false;}
  get statusLabel():string{return this.isSold?'SATILDI':this.car.availability||'SATIŞTA';}
  get damageFree():boolean{const t=String(this.car.damageStatus||'').toLocaleLowerCase('tr-TR');return this.car.isDamageFree===true||/hasarsız|hatasız|boyasız|değişensiz/.test(t)&&!/lokal|boyalı|değişen|hasar/.test(t);}
  get damageLabel():string{return String(this.car.damageStatus||'').trim();}
  get warrantyLabel():string{return String(this.car.warranty||'').trim()||(this.car.hasWarranty?'Garanti bilgisi mevcut':'');}
  get tramerVerified():boolean{return this.car.tramerStatus==='VERIFIED_CLEAN'||this.car.tramerStatus==='VERIFIED_RECORD';}
  get tramerLabel():string{const s=this.car.tramerStatus||'UNKNOWN';if(s==='UNKNOWN')return'Tramer bilgisi paylaşılmamış';if(s==='DECLARED_CLEAN')return'Tramer beyanı: kayıt yok';if(s==='VERIFIED_CLEAN')return'Tramer doğrulandı: kayıt yok';const amount=Number(this.car.tramerAmount||0);const money=amount>0?new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(amount):'tutar paylaşılmamış';return`${s==='VERIFIED_RECORD'?'Tramer doğrulandı':'Tramer beyanı'}: ${money}`;}
  get ariaLabel():string{return`${this.title}, ${this.car.cloudStockCode?`araç no ${this.car.cloudStockCode}, `:''}${this.car.km??'kilometre bilgisi paylaşılmamış'} kilometre, fiyat ${this.car.price} Türk lirası, ${this.tramerLabel}, ${this.statusLabel}. Aracı incele`;}
  imageError(event:Event):void{const img=event.target as HTMLImageElement;img.onerror=null;img.src='/vehicle-placeholder.svg';}
}
