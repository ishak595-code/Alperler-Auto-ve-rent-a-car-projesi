import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { Car } from '../models/car.model';
import { TurkishCurrencyPipe } from '../pipes/turkish-currency.pipe';
import { CampaignRecord } from '../services/campaign.service';
import { RentalCampaignPricingService } from '../services/rental-campaign-pricing.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-rental-vehicle-card-v167',
  standalone: true,
  imports: [CommonModule, RouterLink, TurkishCurrencyPipe],
  host: { class: 'block h-full min-w-0' },
  template: `
    <a [routerLink]="['/fleet',car.id]" [queryParams]="detailParams()" [attr.aria-label]="ariaLabel()" class="card">
      <article>
        <div class="media">
          <img [src]="imageUrl()" [alt]="title()" loading="lazy" decoding="async" (error)="imageFailed($event)" />
          <div class="media-shade" aria-hidden="true"></div>
          <span class="stock">{{ stockLabel() }}</span>
          <span class="availability" [class.closed]="!available">{{ available ? t().rentalCard.available : t().rentalCard.busy }}</span>
          @if (campaign && campaign.visibilityMode === 'EVERYWHERE') {
            <span class="campaign">{{ campaign.badge || t().rentalCard.deal }}</span>
          }
        </div>

        <div class="body">
          <div class="title-row"><div><p>{{ car.type || t().rentalCard.rentalVehicle }}</p><h2>{{ title() }}</h2></div>@if(car.year){<strong>{{car.year}}</strong>}</div>
          <div class="chips" [attr.aria-label]="t().rentalCard.featuresAria">
            @if(car.transmission){<span>{{car.transmission}}</span>}
            @if(car.fuel){<span>{{car.fuel}}</span>}
            @if(car.seats){<span>{{ seatsLabel() }}</span>}
            @if(car.driverOption){<span>{{driverLabel()}}</span>}
          </div>

          <div class="place"><span>{{ locationLabel() }}</span>@if(branchLabel){<small>{{branchLabel}}</small>}</div>

          @if (campaignQuote(); as offer) {
            @if (offer.eligible && offer.discount > 0) {
              <div class="offer"><span>{{campaign?.title}}</span><strong>{{offer.finalTotal|turkishCurrency}}</strong><small>{{ offerTotalAdv(offer.quantity, (offer.discount | turkishCurrency)) }}</small></div>
            } @else if (campaign && campaign.visibilityMode === 'EVERYWHERE') {
              <div class="offer conditions"><span>{{campaign.title}}</span><small>{{pricing.conditionLabel(campaign,pricing.contextFromParams(queryParams))}}</small></div>
            }
          }

          <div class="footer">
            <div><small>{{ hourlyContext() ? t().rentalCard.hourly : t().rentalCard.daily }}</small><strong>{{ canonicalPrice() | turkishCurrency }}</strong></div>
            <span>{{ t().rentalCard.inspect }} <b aria-hidden="true">→</b></span>
          </div>
        </div>
      </article>
    </a>
  `,
  styles: [`
    :host{display:block;height:100%}.card{display:block;height:100%;overflow:hidden;border:1px solid #26344c;border-radius:20px;background:#0b1424;color:#f8fafc;text-decoration:none;box-shadow:0 14px 34px rgba(2,6,23,.18);transition:.18s ease}.card:hover{transform:translateY(-2px);border-color:var(--alper-gold,#c6a15b);box-shadow:0 20px 46px rgba(2,6,23,.25)}.card:focus-visible{outline:3px solid var(--alper-gold,#c6a15b);outline-offset:3px}article{display:flex;height:100%;flex-direction:column}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#111827}.media img{width:100%;height:100%;object-fit:cover}.media-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.7),transparent 55%)}.stock,.availability,.campaign{position:absolute;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:950;letter-spacing:.04em}.stock{left:9px;top:9px;background:rgba(2,6,23,.86);color:#dbeafe}.availability{right:9px;top:9px;background:#065f46;color:#d1fae5}.availability.closed{background:#7f1d1d;color:#fee2e2}.campaign{left:9px;bottom:9px;background:#fbbf24;color:#451a03;max-width:calc(100% - 18px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.body{display:flex;flex:1;flex-direction:column;padding:13px}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.title-row p{margin:0;color:var(--alper-blue-light);font-size:9px;font-weight:950;text-transform:uppercase}.title-row h2{margin:3px 0 0;font-size:17px;line-height:1.2}.title-row>strong{flex:none;border-radius:8px;background:#162236;padding:5px 7px;color:#cbd5e1;font-size:11px}.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.chips span{border:1px solid #2a3952;border-radius:7px;background:#111d31;padding:5px 7px;color:#cbd5e1;font-size:10px;font-weight:800}.place{margin-top:10px;border-top:1px solid #223047;padding-top:9px}.place span,.place small{display:block}.place span{font-size:11px;font-weight:850}.place small{margin-top:2px;color:#7f90a7;font-size:9px}.offer{margin-top:10px;border:1px solid rgba(251,191,36,.3);border-radius:11px;background:rgba(120,53,15,.22);padding:9px}.offer span,.offer strong,.offer small{display:block}.offer span{color:#fde68a;font-size:9px;font-weight:900}.offer strong{margin-top:3px;color:#fef3c7;font-size:17px}.offer small{margin-top:2px;color:#fdba74;font-size:9px}.offer.conditions{background:#172033}.footer{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:auto;padding-top:12px}.footer small,.footer strong{display:block}.footer small{color:#7f90a7;font-size:9px}.footer strong{margin-top:2px;font-size:18px}.footer>span{color:var(--alper-blue-light);font-size:10px;font-weight:950;text-align:right}@media(max-width:430px){.body{padding:11px}.title-row h2{font-size:16px}}
  `],
})
export class RentalVehicleCardV167Component {
  readonly pricing=inject(RentalCampaignPricingService);
  private readonly ui=inject(UiService);
  readonly t=this.ui.translations;
  @Input({required:true}) car!:Car;
  @Input() queryParams:Params={};
  @Input() branchLabel='';
  @Input() campaign:CampaignRecord|null=null;
  @Input() available=true;

  title():string{return String(this.car.title||[this.car.brand,this.car.model,this.car.series].filter(Boolean).join(' ')||this.t().rentalCard.rentalVehicle).trim();}
  stockLabel():string{const code=this.car.cloudStockCode||String(this.car.id);return String(this.t().rentalCard.stock||'').replace('{code}', String(code));}
  locationLabel():string{return String(this.car.location||this.car.branchDistrict||this.car.branchCity||'').trim()||this.t().rentalCard.locationFallback;}
  canonicalPrice():number{return this.hourlyContext()?Number(this.car.hourlyPrice||0):Number(this.car.price||0);}
  hourlyContext():boolean{return this.queryParams?.['duration']==='hourly'&&this.car.hourlyRentalEnabled===true&&Number(this.car.hourlyPrice||0)>0;}
  campaignQuote(){return this.pricing.quote(this.car,this.campaign,this.pricing.contextFromParams(this.queryParams));}
  detailParams():Params{return{...this.queryParams,...(this.campaign?{campaign:this.campaign.id}:{})};}
  contextUnit():string{return this.hourlyContext()?this.t().rentalCard.hourUnit:this.t().rentalCard.dayUnit;}seatsLabel():string{return String(this.t().rentalCard.seats||'').replace('{n}', String(this.car.seats||''));}
  driverLabel():string{const r=this.t().rentalCard;return this.car.driverOption==='WITH_DRIVER'?r.withDriver:this.car.driverOption==='WITHOUT_DRIVER'?r.withoutDriver:r.bothDrivers;}
  imageUrl():string{return this.car.images?.[0]||this.car.image||'/vehicle-placeholder.svg';}
  ariaLabel():string{
    const r=this.t().rentalCard;
    const avail=this.available?r.ariaAvailable:r.ariaBusy;
    const model=this.car.year?String(r.ariaModel||'').replace('{year}', String(this.car.year)):'';
    const priceKey=this.hourlyContext()?'ariaPriceHourly':'ariaPriceDaily';
    const price=String(r[priceKey]||'').replace('{price}', String(this.canonicalPrice()));
    const details=[this.title(),avail,model,this.car.transmission||'',this.car.fuel||'',this.locationLabel(),price].filter(Boolean);
    return `${details.join(', ')}. ${r.ariaInspect}`;
  }
  imageFailed(event:Event):void{const image=event.target as HTMLImageElement;image.onerror=null;image.src='/vehicle-placeholder.svg';}
}
