import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { DetailMediaItem, DetailMediaLightboxComponent } from "../components/detail-media-lightbox.component";
import { RentalDuration } from "../models/booking.model";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CampaignProof, CampaignRecord, CampaignService } from "../services/campaign.service";
import { CarService } from "../services/car.service";
import { CommercialOfferContextService } from "../services/commercial-offer-context.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";
import { UiService } from "../services/ui.service";

type DriverMode = "with" | "without" | "";

@Component({
  selector: "app-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, DetailMediaLightboxComponent, TurkishCurrencyPipe],
  template: `
    <main class="detail-page">
      @if (vehicle(); as car) {
        <header class="detail-header">
          <div class="header-inner">
            <div class="header-left">
              <button type="button" class="icon-button" (click)="goBack()" [attr.aria-label]="t().carDetail.backAria"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
              <div class="header-copy"><span>{{ t().carDetail.badge }}</span><h1>{{car.brand}} {{car.model}}</h1></div>
            </div>
            <div class="header-actions">
              <button type="button" class="icon-button" (click)="share(car)" [attr.aria-label]="t().carDetail.shareAria"><mat-icon aria-hidden="true">share</mat-icon></button>
              <button type="button" class="icon-button" (click)="toggleFav(car.id)" [attr.aria-label]="isFav(car.id)?t().carDetail.removeFavAria:t().carDetail.addFavAria"><mat-icon aria-hidden="true" [class.favorite-active]="isFav(car.id)">{{isFav(car.id)?'favorite':'favorite_border'}}</mat-icon></button>
            </div>
          </div>
        </header>

        <section class="gallery" [attr.aria-label]="galleryAria(car)" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
          @if(activeMedia();as media){
            <div class="gallery-frame">
              @if(media.kind==='IMAGE'){
                <button type="button" class="media-open" (click)="openLightbox()" [attr.aria-label]="fullscreenAria(car)"><img [src]="media.url" [alt]="media.title||car.brand+' '+car.model" loading="eager" decoding="async" (error)="mediaFailed(media.url)" /></button>
              }@else{
                <video [src]="media.url" [poster]="media.posterUrl||car.image||''" controls playsinline preload="metadata" [attr.aria-label]="media.title||videoTitle(car)" (error)="mediaFailed(media.url)"></video>
                <button type="button" class="video-expand" (click)="openLightbox()" [attr.aria-label]="t().carDetail.videoFullscreenAria"><mat-icon aria-hidden="true">fullscreen</mat-icon></button>
              }
              <div class="gallery-toolbar"><span>{{currentSlide()+1}} / {{mediaItems().length}}</span>@if(mediaItems().length>1){<div><button type="button" (click)="previousMedia()" [attr.aria-label]="t().carDetail.prevMediaAria"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextMedia()" [attr.aria-label]="t().carDetail.nextMediaAria"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div>
            </div>
          }@else{
            <div class="gallery-empty"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>{{ t().carDetail.mediaEmpty }}</strong></div>
          }
        </section>

        @if(activeCampaign();as offer){
          <section class="campaign-strip" [attr.aria-label]="t().carDetail.campaignStripAria">
            <div class="campaign-copy">
              <div class="campaign-badges"><span class="campaign-kicker">{{ campaignBadge(offer) }}</span>@if(discountLabel(offer)){<span class="discount-badge">{{discountLabel(offer)}}</span>}</div>
              <h2>{{offer.title}}</h2>
              @if(offer.shortDescription||offer.description){<p>{{offer.shortDescription||offer.description}}</p>}
              @if(campaignBenefits(offer).length){<ul>@for(benefit of campaignBenefits(offer);track benefit){<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{benefit}}</li>}</ul>}
            </div>
            <div class="campaign-value">
              <span class="proof" [class.hot]="campaignProof(offer).activeViewers15m>0||campaignProof(offer).recentViewers24h>1"><span class="live-dot" aria-hidden="true"></span><mat-icon aria-hidden="true">visibility</mat-icon>{{campaignProofLabel(offer)}}</span>
              @if(offer.endsAt){<span><mat-icon aria-hidden="true">schedule</mat-icon>{{campaignCountdown(offer.endsAt)}}</span>}
              @if(offer.oldPrice&&offer.newPrice&&offer.oldPrice>offer.newPrice){<div class="price-offer"><small>{{offer.oldPrice|turkishCurrency}}</small><strong>{{offer.newPrice|turkishCurrency}}</strong><em>{{campaignPriceSuffix(offer)}}</em></div>}@else if(offer.discountPercent){<strong>{{ campaignAdvantage(offer.discountPercent) }}</strong>}
            </div>
          </section>
        }

        <div class="detail-layout">
          <section class="panel summary-panel" aria-labelledby="rental-vehicle-title">
            <div class="summary-head">
              <div><p class="stock-code">{{ stockLabel(car) }}</p><h2 id="rental-vehicle-title">{{car.brand}} @if(car.series){<span>{{car.series}}</span>} {{car.model}}</h2><p class="summary-meta">{{summaryMeta(car)}}</p></div>
              <div class="price-pair"><div class="price-block"><span>{{ t().carDetail.dailyRental }}</span><strong>{{dailyDisplayPrice(car)|turkishCurrency}}</strong></div>@if(car.hourlyRentalEnabled&&car.hourlyPrice){<div class="price-block hourly"><span>{{ t().carDetail.hourlyRental }}</span><strong>{{hourlyDisplayPrice(car)|turkishCurrency}}</strong></div>}</div>
            </div>
            <dl class="facts" [attr.aria-label]="t().carDetail.factsAria">
              @if(car.year){<div><dt>{{ t().carDetail.modelYear }}</dt><dd>{{car.year}}</dd></div>}
              <div><dt>{{ t().carDetail.transmission }}</dt><dd>{{display(car.transmission)}}</dd></div>
              <div><dt>{{ t().carDetail.fuel }}</dt><dd>{{display(car.fuel)}}</dd></div>
              <div><dt>{{ t().carDetail.seats }}</dt><dd>{{car.seats?peopleLabel(car.seats):t().carDetail.notSpecified}}</dd></div>
              @if(car.doors){<div><dt>{{ t().carDetail.doors }}</dt><dd>{{car.doors}}</dd></div>}
              <div><dt>Kasa</dt><dd>{{display(car.type)}}</dd></div>
              <div><dt>{{ t().carDetail.availability }}</dt><dd [class.available]="selectedPeriodAvailable()" [class.unavailable]="!selectedPeriodAvailable()">{{selectedPeriodAvailable()?t().carDetail.available:t().carDetail.busyPeriod}}</dd></div>
            </dl>
            @if(presetStartDate){<div class="plan-summary"><mat-icon aria-hidden="true">event_available</mat-icon><div><strong>{{formattedPresetDates()}}</strong><span>{{durationLabel()}} · {{presetDriverMode==='with'?t().carDetail.withDriverShort:presetDriverMode==='without'?t().carDetail.withoutDriverShort:driverOptionLabel(car.driverOption)}}@if(presetPickupLocation){ · {{presetPickupLocation}}}</span></div></div>}
          </section>

          <section class="panel all-details-panel" aria-labelledby="all-details-title">
            <button type="button" class="all-details-toggle" (click)="detailsOpen.update(v=>!v)" [attr.aria-expanded]="detailsOpen()" aria-controls="rental-all-details"><span><small>{{ t().carDetail.aboutToggleSmall }}</small><strong id="all-details-title">{{ t().carDetail.aboutToggleTitle }}</strong></span><mat-icon aria-hidden="true">{{detailsOpen()?'expand_less':'expand_more'}}</mat-icon></button>
            @if(detailsOpen()){
              <div id="rental-all-details" class="all-details-content">
                <section class="details-group"><h3>{{ t().carDetail.rentalTerms }}</h3><dl class="detail-list"><div><dt>{{ t().carDetail.location }}</dt><dd>{{display(car.location)}}</dd></div><div><dt>{{ t().carDetail.driverOption }}</dt><dd>{{driverOptionLabel(car.driverOption)}}</dd></div>@if(car.dailyMileageLimit){<div><dt>{{ t().carDetail.dailyMileage }}</dt><dd>{{car.dailyMileageLimit}} km</dd></div>}@if(car.hourlyRentalEnabled){<div><dt>{{ t().carDetail.hourlyRental }}</dt><dd>{{ t().carDetail.minHours.replace("{n}", "" + (car.minimumRentalHours||1)) }}</dd></div>}@if(car.hourlyMileageLimit){<div><dt>{{ t().carDetail.hourlyMileage }}</dt><dd>{{car.hourlyMileageLimit}} km</dd></div>}@if(car.deposit!==undefined){<div><dt>{{ t().carDetail.deposit }}</dt><dd>{{car.deposit|turkishCurrency}}</dd></div>}@if(car.minAge){<div><dt>{{ t().carDetail.minAge }}</dt><dd>{{car.minAge}}</dd></div>}@if(car.minLicenseYears){<div><dt>{{ t().carDetail.minLicense }}</dt><dd>{{ t().carDetail.minLicenseYears.replace("{n}", "" + car.minLicenseYears) }}</dd></div>}@if(car.luggage){<div><dt>{{ t().carDetail.luggage }}</dt><dd>{{car.luggage}}</dd></div>}@if(car.group){<div><dt>{{ t().carDetail.vehicleClass }}</dt><dd>{{car.group}}</dd></div>}</dl></section>
                @if(features().length){<section class="details-group"><h3>{{ t().carDetail.comfort }}</h3><ul class="feature-list">@for(feature of features();track feature){<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{feature}}</span></li>}</ul></section>}
                @if(technicalRows().length){<section class="details-group"><h3>{{ t().carDetail.performance }}</h3><dl class="tech-grid">@for(row of technicalRows();track row.label){<div><dt>{{row.label}}</dt><dd>{{row.value}}</dd></div>}</dl></section>}
                @if(car.description){<section class="details-group"><h3>{{ t().carDetail.aboutVehicle }}</h3><p class="description">{{car.description}}</p></section>}
              </div>
            }
          </section>
        </div>

        <nav class="fixed-actions" [attr.aria-label]="t().carDetail.actionsAria">
          @if(phoneHref()){<a class="phone" [href]="phoneHref()" [attr.aria-label]="t().carDetail.callAria"><span class="phone-symbol" aria-hidden="true">☎</span><span>{{ t().carDetail.call }}</span></a>}@else{<button type="button" class="phone" disabled [attr.aria-label]="t().carDetail.callUnavailableAria"><span class="phone-symbol" aria-hidden="true">☎</span><span>{{ t().carDetail.call }}</span></button>}
          <button type="button" class="whatsapp" (click)="whatsapp()" [attr.aria-label]="t().carDetail.whatsappAria"><mat-icon aria-hidden="true">chat</mat-icon><span>{{ t().carDetail.whatsapp }}</span></button>
          <button type="button" class="reserve" (click)="reserve(car)" [disabled]="!selectedPeriodAvailable()||(presetDuration==='hourly'&&!car.hourlyRentalEnabled)"><mat-icon aria-hidden="true">event_available</mat-icon><span>{{ t().carDetail.reserve }}</span></button>
        </nav>
        <app-detail-media-lightbox [open]="lightboxOpen()" [items]="mediaItems()" [index]="currentSlide()" [title]="t().carDetail.galleryTitle.replace('{brand}', car.brand||'').replace('{model}', car.model||'' )" (closed)="lightboxOpen.set(false)" (indexChange)="currentSlide.set($event)" />
      } @else if(loading()){
        <section class="state-panel" role="status"><div class="spinner"></div><strong>{{ t().carDetail.loading }}</strong></section>
      } @else {
        <section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>{{ t().carDetail.errorTitle }}</strong><span>{{ t().carDetail.errorHint }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#050914;color:#f8fafc}.detail-page{min-height:100dvh;padding-bottom:94px;background:radial-gradient(circle at 85% 0,color-mix(in srgb,var(--alper-blue,#b91c1c) 12%,transparent),transparent 30%),#050914;font-family:Inter,system-ui,sans-serif}.detail-header{position:sticky;top:0;z-index:70;border-bottom:1px solid #1e293b;background:rgba(7,16,32,.97);backdrop-filter:blur(14px)}.header-inner{width:min(100% - 24px,1180px);min-height:70px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.header-copy{min-width:0}.header-copy span{display:block;color:var(--alper-gold,#c6a15b);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.1em}.header-copy h1{margin:3px 0 0;max-width:62vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:19px}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:1px solid #243149;border-radius:14px;background:#0d1729;color:#fff}.icon-button:focus-visible,.gallery-toolbar button:focus-visible,.video-expand:focus-visible,.media-open:focus-visible,.all-details-toggle:focus-visible{outline:3px solid var(--alper-gold,#c6a15b);outline-offset:2px}.favorite-active{color:#fb7185}.gallery{background:#020617}.gallery-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden}.media-open,.media-open img,.gallery-frame>video{display:block;width:100%;height:100%}.media-open{border:0;background:#020617;padding:0}.media-open img,.gallery-frame>video{object-fit:cover}.video-expand{position:absolute;z-index:4;top:12px;right:12px;display:grid;width:44px;height:44px;place-items:center;border:1px solid #334155;border-radius:13px;background:rgba(2,6,23,.82);color:#fff}.gallery-toolbar{position:absolute;left:14px;right:14px;bottom:13px;display:flex;align-items:center;justify-content:space-between}.gallery-toolbar>span{border-radius:999px;background:rgba(0,0,0,.74);padding:7px 11px;font-size:11px;font-weight:900}.gallery-toolbar>div{display:flex;gap:7px}.gallery-toolbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.74);color:#fff}.gallery-empty{min-height:320px;display:grid;place-content:center;gap:8px;text-align:center;color:#94a3b8}.campaign-strip{width:min(100% - 24px,1180px);margin:14px auto 0;display:grid;gap:14px;border:1px solid rgba(251,191,36,.4);border-radius:20px;background:radial-gradient(circle at 95% 0,rgba(251,191,36,.16),transparent 38%),linear-gradient(135deg,#451a03,#7c2d12 55%,#111827);padding:17px;box-shadow:0 14px 34px rgba(0,0,0,.2)}.campaign-badges{display:flex;gap:7px;flex-wrap:wrap}.campaign-kicker,.discount-badge{display:inline-flex;min-height:26px;align-items:center;border-radius:999px;padding:0 9px;font-size:9px;font-weight:950}.campaign-kicker{background:#fbbf24;color:#451a03}.discount-badge{background:#fff;color:#7f1d1d}.campaign-strip h2{margin:8px 0 0;font:900 23px Georgia,serif}.campaign-strip p{margin:6px 0 0;color:#ffedd5;line-height:1.6}.campaign-copy ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px}.campaign-copy li{display:flex;gap:6px;color:#fff7ed;font-size:11px}.campaign-copy li mat-icon{width:17px;height:17px;font-size:17px;color:#fcd34d}.campaign-value{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.campaign-value>span{display:flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(15,23,42,.42);padding:7px 10px;font-size:10px;font-weight:900}.campaign-value .proof.hot{background:rgba(124,45,18,.66)}.live-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.13)}.campaign-value mat-icon{width:16px;height:16px;font-size:16px;color:#fcd34d}.price-offer{border-radius:13px;background:rgba(2,6,23,.5);padding:10px 12px}.price-offer small,.price-offer strong,.price-offer em{display:block}.price-offer small{color:#fdba74;text-decoration:line-through}.price-offer strong{font-size:22px}.price-offer em{margin-top:2px;color:#fde68a;font-size:9px;font-style:normal}.detail-layout{width:min(100% - 24px,1180px);margin:auto;padding:18px 0 24px;display:grid;gap:14px}.panel{border:1px solid #253149;border-radius:20px;background:linear-gradient(180deg,#0b1424,#0a111e);padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.18)}.summary-head{display:grid;gap:16px}.stock-code{margin:0;color:var(--alper-gold,#c6a15b);font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}.summary-head h2{margin:5px 0 0;font:900 clamp(29px,7vw,45px)/1.08 Georgia,serif}.summary-head h2 span{color:#94a3b8}.summary-meta{margin:8px 0 0;color:#cbd5e1}.price-pair{display:flex;flex-wrap:wrap;gap:12px}.price-block span{color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.price-block strong{display:block;margin-top:4px;color:#f8fafc;font-size:29px}.price-block.hourly strong{color:#fcd34d}.facts{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:18px 0 0}.facts>div{border:1px solid #27344f;border-radius:13px;background:#050b18;padding:12px}.facts dt{color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.facts dd{margin:6px 0 0;font-size:13px;font-weight:900}.available{color:#86efac}.unavailable{color:#fda4af}.plan-summary{display:flex;gap:9px;margin-top:12px;border:1px solid #233453;border-radius:13px;background:#071020;padding:12px}.plan-summary mat-icon{color:var(--alper-gold,#c6a15b)}.plan-summary strong,.plan-summary span{display:block}.plan-summary span{margin-top:3px;color:#94a3b8;font-size:11px}.all-details-panel{padding:0;overflow:hidden}.all-details-toggle{display:flex;width:100%;min-height:76px;align-items:center;justify-content:space-between;border:0;background:transparent;padding:16px 18px;color:#fff;text-align:left}.all-details-toggle span{display:grid;gap:3px}.all-details-toggle small{color:var(--alper-gold,#c6a15b);font-size:9px;font-weight:950;letter-spacing:.12em}.all-details-toggle strong{font-size:18px}.all-details-content{border-top:1px solid #1e293b;padding:0 18px 18px}.details-group{padding-top:16px}.details-group+.details-group{margin-top:16px;border-top:1px solid #1e293b}.details-group h3{margin:0 0 10px;font-size:17px}.detail-list{margin:0}.detail-list>div{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #1e293b;padding:11px 0}.detail-list>div:first-child{border-top:0}.detail-list dt{color:#94a3b8}.detail-list dd{margin:0;text-align:right;font-weight:850}.feature-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.feature-list li{display:flex;gap:8px;border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.feature-list mat-icon{color:#34d399}.tech-grid{display:grid;gap:8px;margin:0}.tech-grid>div{border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.tech-grid dt{color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.tech-grid dd{margin:4px 0 0;font-weight:900}.description{white-space:pre-line;color:#cbd5e1;line-height:1.75}.fixed-actions{position:fixed;z-index:90;left:0;right:0;bottom:0;display:grid;grid-template-columns:.72fr 1fr 1.22fr;gap:8px;border-top:1px solid #334155;background:rgba(5,9,20,.98);padding:9px 10px calc(9px + env(safe-area-inset-bottom));backdrop-filter:blur(16px)}.fixed-actions a,.fixed-actions button{display:flex;min-width:0;min-height:56px;align-items:center;justify-content:center;gap:6px;border:0;border-radius:13px;color:#fff;text-decoration:none;font-weight:950;font-size:13px}.fixed-actions a:focus-visible,.fixed-actions button:focus-visible{outline:3px solid var(--alper-gold,#c6a15b);outline-offset:2px}.fixed-actions .phone{background:#0f766e}.phone-symbol{font-size:22px;line-height:1}.fixed-actions .whatsapp{background:#059669}.fixed-actions .reserve{background:var(--alper-blue,#b91c1c)}.fixed-actions button:disabled{opacity:.48}.state-panel{min-height:68vh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state-panel button{min-height:46px;border:0;border-radius:10px;background:var(--alper-blue,#b91c1c);color:#fff;padding:0 18px;font-weight:900}.spinner{width:40px;height:40px;margin:auto;border:4px solid #334155;border-top-color:var(--alper-gold,#c6a15b);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.gallery-frame{aspect-ratio:16/9}.campaign-strip{grid-template-columns:1fr auto;align-items:start}.campaign-value{justify-content:flex-end}.summary-head{grid-template-columns:1fr auto;align-items:end}.price-pair{text-align:right;justify-content:flex-end}.tech-grid,.feature-list{grid-template-columns:1fr 1fr}.facts{grid-template-columns:repeat(3,1fr)}}@media(min-width:1024px){.gallery-frame{aspect-ratio:21/9}.detail-layout{max-width:980px}.fixed-actions{left:50%;right:auto;width:min(760px,calc(100% - 28px));transform:translateX(-50%);border:1px solid #334155;border-bottom:0;border-radius:16px 16px 0 0}}@media(max-width:410px){.fixed-actions{grid-template-columns:64px 1fr 1.15fr}.fixed-actions .phone span:last-child{display:none}.fixed-actions a,.fixed-actions button{font-size:12px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition:none!important}}
  `],
})
export class CarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly campaigns = inject(CampaignService);
  private readonly commercialOffer = inject(CommercialOfferContextService);
  readonly carService = inject(CarService);
  private readonly seo = inject(SeoService);
  private readonly ui = inject(UiService);
  readonly t = this.ui.translations;
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  private readonly campaignId = this.route.snapshot.queryParamMap.get("campaign") || "";
  private touchX = 0;

  readonly presetDuration: RentalDuration = this.parseDuration(this.route.snapshot.queryParamMap.get("duration"));
  readonly presetStartDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("start"));
  readonly presetEndDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("end"));
  readonly presetStartTime = this.validQueryTime(this.route.snapshot.queryParamMap.get("startTime")) || "09:00";
  readonly presetEndTime = this.validQueryTime(this.route.snapshot.queryParamMap.get("endTime")) || "10:00";
  readonly presetPickupLocation = (this.route.snapshot.queryParamMap.get("pickupLocation") || "").slice(0, 240);
  readonly presetDriverMode: DriverMode = this.parseDriverMode(this.route.snapshot.queryParamMap.get("driverMode"));
  readonly vehicle = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly lightboxOpen = signal(false);
  readonly detailsOpen = signal(false);
  readonly failedMedia = signal<string[]>([]);

  readonly activeCampaign = computed<CampaignRecord | null>(() => {
    const car = this.vehicle();
    if (!car) return null;
    const aliases = new Set([String(car.cloudId || ""), String(car.id || ""), this.routeId].filter(Boolean));
    const matches = this.campaigns.publicCampaigns().filter((item) => item.isActive && item.publicationStatus === "PUBLISHED" && item.targetType === "VEHICLE" && aliases.has(String(item.targetId || "")));
    if (this.campaignId) return matches.find((item) => item.id === this.campaignId) || null;
    return matches[0] || null;
  });

  readonly selectedPeriodAvailable = computed(() => {
    const car = this.vehicle();
    if (!car || car.isAvailable === false) return false;
    if (this.presetDuration === "hourly" && (!car.hourlyRentalEnabled || Number(car.hourlyPrice || 0) <= 0)) return false;
    const start = this.selectedStart(), end = this.selectedEnd();
    if (!start || !end) return true;
    if (end <= start) return false;
    return !(car.bookedDates || []).some((block) => { const bs = new Date(block.start), be = new Date(block.end); return !Number.isNaN(bs.getTime()) && !Number.isNaN(be.getTime()) && start < be && end > bs; });
  });

  readonly mediaItems = computed<DetailMediaItem[]>(() => {
    const car = this.vehicle(); if (!car) return [];
    const failed = new Set(this.failedMedia()), seen = new Set<string>(); const rows: DetailMediaItem[] = [];
    for (const url of this.detailData.mediaUrls(car)) if (url && !failed.has(url) && !seen.has(url)) { seen.add(url); rows.push({kind:"IMAGE",url,title:`${car.brand || ""} ${car.model || ""}`.trim() || this.t().carDetail.mediaTitle}); }
    for (const video of car.videos || []) { const url = this.detailData.mediaUrl(video.url); if (url && !failed.has(url) && !seen.has(url)) { seen.add(url); rows.push({kind:"VIDEO",url,posterUrl:this.detailData.mediaUrl(video.posterUrl),title:video.title || this.videoTitle(car)}); } }
    return rows.slice(0, 40);
  });
  readonly activeMedia = computed(() => this.mediaItems()[Math.min(this.currentSlide(), Math.max(0, this.mediaItems().length - 1))] || null);
  readonly features = computed(() => { const car=this.vehicle(); if(!car)return[]; const detailed=car.detailedFeatures?[...(car.detailedFeatures.interior||[]),...(car.detailedFeatures.exterior||[]),...(car.detailedFeatures.multimedia||[]),...(car.detailedFeatures.safety||[])]:[]; return [...new Set([...(car.features||[]),...detailed].map(v=>String(v||"").trim()).filter(Boolean))]; });
  readonly technicalRows = computed(() => {
    const car=this.vehicle(); if(!car)return[] as {label:string;value:string}[]; const specs=car.technicalSpecs;
    const rows:Array<[string,unknown]>=[[this.t().saleDetail.specMaxSpeed,specs?.maxSpeed||car.maxSpeed],[this.t().saleDetail.specAccel,specs?.acceleration||car.acceleration],[this.t().saleDetail.specEngineVolume,specs?.engineVolume||car.engineVolume],[this.t().saleDetail.specEnginePower,specs?.enginePower||car.enginePower],[this.t().saleDetail.specTorque,specs?.torque||car.torque],[this.t().saleDetail.specDrivetrain,specs?.drivetrain||car.drivetrain],[this.t().saleDetail.specCylinders,specs?.cylinders||(car.cylinderCount?String(this.t().saleDetail.cylindersUnit||"").replace("{n}", String(car.cylinderCount)):"")],[this.t().saleDetail.specCityFuel,specs?.cityFuel||car.cityFuelConsumption],[this.t().saleDetail.specHighwayFuel,specs?.highwayFuel||car.highwayFuelConsumption],[this.t().saleDetail.specCombinedFuel,specs?.combinedFuel||car.fuelConsumption],[this.t().saleDetail.specTank,specs?.tankCapacity||car.fuelTankCapacity],[this.t().saleDetail.specTrunk,specs?.trunkCapacity||car.trunkVolume],[this.t().saleDetail.specWheels,specs?.wheels||car.wheelSize],[this.t().saleDetail.specDimensions,specs?.dimensions||[car.length,car.width,car.height].filter(Boolean).join(" × ")],[this.t().saleDetail.specWeight,specs?.weight||car.weight]];
    return rows.filter(([,v])=>String(v??"").trim()&&String(v)!=="-").map(([label,value])=>({label,value:String(value)}));
  });

  async ngOnInit(): Promise<void> {
    await Promise.allSettled([this.reload(), this.campaigns.refreshPublicState(true)]);
    const verified = this.activeCampaign(); if (verified) this.commercialOffer.activateCampaign(verified);
  }

  async reload(): Promise<void> {
    this.loading.set(true); this.loadError.set("");
    try {
      const car=await this.detailData.load("RENTAL",this.routeId) as Car;
      this.vehicle.set(car); this.failedMedia.set([]); this.currentSlide.set(0);
      const config=this.carService.getConfig()();
      const brand = String(car.brand || this.t().carDetail.seoBrandFallback || "").trim();
      const model = String(car.model || "").trim();
      this.seo.updateSeoTags({
        title: String(this.t().carDetail.seoTitle || "")
          .replace("{brand}", brand)
          .replace("{model}", model)
          .replace("{company}", String(config.companyName || ""))
          .replace(/\s+/g, " ")
          .trim(),
        description: String(this.t().carDetail.seoDescription || "")
          .replace("{brand}", brand)
          .replace("{model}", model)
          .replace(/\s+/g, " ")
          .trim(),
        image: car.image || config.seoOgImage,
      });
    } catch{this.vehicle.set(null);this.loadError.set("RENTAL_DETAIL_UNAVAILABLE");}
    finally{this.loading.set(false);}
  }

  display(value:unknown):string{return this.detailData.display(value);}
  summaryMeta(car:Car):string{return[car.year,car.type,car.location].filter(Boolean).join(" · ")||this.t().carDetail.summaryFallback;}
  campaignProof(offer:CampaignRecord):CampaignProof{return this.campaigns.proofByCampaign()[offer.id]||{campaignId:offer.id,pageViewsTotal:0,uniqueViewersTotal:0,recentViewers24h:0,activeViewers15m:0};}
  campaignProofLabel(offer:CampaignRecord):string{const proof=this.campaignProof(offer);const C=this.t().carDetail;if(proof.activeViewers15m>0)return C.proofViewers15m.replace("{n}", String(proof.activeViewers15m));if(proof.recentViewers24h>0)return C.proofViewers24h.replace("{n}", String(proof.recentViewers24h));if(proof.uniqueViewersTotal>0)return C.proofViewersTotal.replace("{n}", String(proof.uniqueViewersTotal));if(proof.pageViewsTotal>0)return C.proofViews.replace("{n}", String(proof.pageViewsTotal));return C.proofNew;}
  campaignBenefits(offer:CampaignRecord):string[]{const value=offer.metadata?.["benefits"];return Array.isArray(value)?value.map(v=>String(v||"").trim()).filter(Boolean).slice(0,5):[];}
  campaignPriceSuffix(offer:CampaignRecord):string{return String(offer.metadata?.["priceSuffix"]||offer.metadata?.["priceLabel"]||this.t().carDetail.campaignPrice);}
  discountLabel(offer:CampaignRecord):string{const fmt=(n:number)=>String(this.t().catalogCampaign?.advantagePct||"%{n} AVANTAJ").replace("{n}", String(n));if(offer.discountPercent)return fmt(offer.discountPercent);if(offer.oldPrice&&offer.newPrice&&offer.oldPrice>offer.newPrice)return fmt(Math.round((offer.oldPrice-offer.newPrice)/offer.oldPrice*100));return"";}
  campaignBadge(offer:CampaignRecord):string{return this.ui.listingBadgeLabel(offer.badge) || this.t().vehicleListItem.deal;}
  campaignAdvantage(n:number):string{return String(this.t().catalogCampaign?.advantagePct||"%{n} AVANTAJ").replace("{n}", String(n));}
  campaignCountdown(value:string):string{const remaining=new Date(value).getTime()-Date.now();if(!Number.isFinite(remaining)||remaining<=0)return this.t().carDetail.countdownEnded;const hours=Math.floor(remaining/3_600_000),days=Math.floor(hours/24);const C=this.t().carDetail;return days>1?C.countdownDays.replace("{n}", String(days)):days===1?C.countdownDay:C.countdownHours.replace("{n}", String(Math.max(1,hours)));}
  dailyDisplayPrice(car:Car):number{return this.unitCampaignPrice(Number(car.price||0),"daily");}
  hourlyDisplayPrice(car:Car):number{return this.unitCampaignPrice(Number(car.hourlyPrice||0),"hourly");}
  selectedUnitPrice(car:Car):number{return this.presetDuration==="hourly"?this.hourlyDisplayPrice(car):this.dailyDisplayPrice(car);}
  phoneHref():string{const phone=String(this.carService.getConfig()().phone||"").replace(/[^+\d]/g,"");return phone?`tel:${phone}`:"";}
  private unitCampaignPrice(base:number,mode:"daily"|"hourly"):number{const offer=this.activeCampaign();if(!offer||offer.discountScope!=="UNIT")return base;if(mode==="hourly"&&offer.minimumRentalDays)return base;if(mode==="daily"&&offer.minimumRentalHours)return base;if(offer.newPrice!=null&&Number.isFinite(Number(offer.newPrice)))return Math.max(0,Number(offer.newPrice));if(offer.discountMethod==="FIXED_PRICE")return Math.max(0,Number(offer.discountValue||base));if(offer.discountMethod==="PERCENT")return Math.max(0,base-base*Number(offer.discountValue||0)/100);if(offer.discountMethod==="FIXED_AMOUNT")return Math.max(0,base-Number(offer.discountValue||0));return base;}
  durationLabel():string{const d=this.t().carDetail;return this.presetDuration==="hourly"?d.hourly:this.presetDuration==="weekly"?d.weekly:this.presetDuration==="monthly"?d.monthly:this.presetDuration==="longterm"?d.longterm:d.daily;}
  formattedPresetDates():string{const format=(v:string)=>{const d=this.parseDate(v);return d?new Intl.DateTimeFormat("tr-TR",{day:"2-digit",month:"long",year:"numeric"}).format(d):v;};return this.presetDuration==="hourly"?`${format(this.presetStartDate)} · ${this.presetStartTime}-${this.presetEndTime}`:`${format(this.presetStartDate)} - ${format(this.presetEndDate)}`;}
  previousMedia():void{const l=this.mediaItems().length;if(l>1)this.currentSlide.update(i=>(i-1+l)%l);}
  nextMedia():void{const l=this.mediaItems().length;if(l>1)this.currentSlide.update(i=>(i+1)%l);}
  mediaFailed(url:string):void{this.failedMedia.update(items=>items.includes(url)?items:[...items,url]);this.currentSlide.set(0);}
  openLightbox():void{if(this.activeMedia())this.lightboxOpen.set(true);}
  touchStart(event:TouchEvent):void{this.touchX=event.changedTouches[0]?.clientX||0;}
  touchEnd(event:TouchEvent):void{const end=event.changedTouches[0]?.clientX||0;if(Math.abs(end-this.touchX)<45)return;end<this.touchX?this.nextMedia():this.previousMedia();}
  reserve(car:Car):void{if(!this.selectedPeriodAvailable())return;const withDriver=this.resolveDriverPreference(car);let startDate:string|undefined,endDate:string|undefined,days:number|undefined,totalPrice=this.selectedUnitPrice(car);if(this.presetDuration==="hourly"){const start=this.selectedStart(),end=this.selectedEnd();if(start&&end){const hours=Math.max(1,Math.min(23,Math.ceil((end.getTime()-start.getTime())/3_600_000)));startDate=start.toISOString();endDate=end.toISOString();totalPrice=this.hourlyDisplayPrice(car)*hours;}}else{const count=this.rentalDays(this.presetStartDate,this.presetEndDate);if(count>0){days=count;startDate=this.presetStartDate;endDate=this.presetEndDate;totalPrice=this.dailyDisplayPrice(car)*count;}}this.carService.setBookingRequest({type:"RENTAL",item:car,itemName:`${car.brand||""} ${car.model||""}`.trim(),image:car.image||car.images?.[0],basePrice:this.selectedUnitPrice(car),totalPrice,startDate,endDate,days,rentalDuration:this.presetDuration,withDriver,pickupLocation:this.presetPickupLocation||undefined});const campaign=this.activeCampaign()?.id||this.campaignId;void this.router.navigate(["/contact"],{queryParams:{...(campaign?{campaign}:{})}});}
  toggleFav(id:string|number):void{this.carService.toggleFavorite(id);} isFav(id:string|number):boolean{return this.carService.isFavorite(id);}
  async share(car:Car):Promise<void>{const config=this.carService.getConfig()();const title=String(this.t().carDetail.shareTitle||"").replace("{brand}",String(car.brand||"")).replace("{model}",String(car.model||"")).replace("{company}",String(config.companyName||"")).replace(/\s+/g," ").trim();const payload={title,text:this.t().carDetail.shareText,url:window.location.href};try{if(navigator.share)await navigator.share(payload);else await navigator.clipboard?.writeText(window.location.href);}catch{/* kullanıcı paylaşımı iptal etti */}}
  whatsapp():void{
    const car=this.vehicle();
    if(!car)return;
    const config=this.carService.getConfig()();
    const phone=String(config.whatsapp||config.phone||"").replace(/\D/g,"");
    if(!phone)return;
    const message=String(this.t().carDetail.whatsappPrefill||"")
      .replace("{brand}",String(car.brand||""))
      .replace("{model}",String(car.model||""))
      .replace("{url}",window.location.href)
      .replace(/\s+/g," ")
      .trim();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  }
  driverOptionLabel(option:Car["driverOption"]):string{return option==="WITH_DRIVER"?this.t().carDetail.withDriver:option==="WITHOUT_DRIVER"?this.t().carDetail.withoutDriver:this.t().carDetail.driverBoth;}galleryAria(car:Car){return String(this.t().carDetail.galleryAria||'').replace('{brand}',String(car.brand||'')).replace('{model}',String(car.model||''));}fullscreenAria(car:Car){return String(this.t().carDetail.fullscreenAria||'').replace('{brand}',String(car.brand||'')).replace('{model}',String(car.model||''));}stockLabel(car:Car){return String(this.t().carDetail.stockNo||'').replace('{id}', String(car.cloudStockCode||car.id));}peopleLabel(n:number){return String(this.t().carDetail.people||'').replace('{n}', String(n));}videoTitle(car:Car){const raw=String(this.t().carDetail.videoTitle||'').replace('{brand}',String(car.brand||'')).replace('{model}',String(car.model||'')).replace(/\s+/g,' ').trim();return raw||this.t().carDetail.mediaTitle;}
  goBack():void{if(window.history.length>1)this.location.back();else void this.router.navigate(["/fleet"]);}
  private resolveDriverPreference(car:Car):boolean{if(car.driverOption==="WITH_DRIVER")return true;if(car.driverOption==="WITHOUT_DRIVER")return false;if(this.presetDriverMode==="with")return true;return false;}
  private selectedStart():Date|null{if(!this.presetStartDate)return null;if(this.presetDuration==="hourly")return new Date(`${this.presetStartDate}T${this.presetStartTime}:00`);return this.parseDate(this.presetStartDate);}
  private selectedEnd():Date|null{if(!this.presetEndDate&&!this.presetStartDate)return null;if(this.presetDuration==="hourly")return new Date(`${this.presetStartDate}T${this.presetEndTime}:00`);return this.parseDate(this.presetEndDate);}
  private rentalDays(start:string,end:string):number{const a=this.parseDate(start),b=this.parseDate(end);if(!a||!b||b<=a)return 0;return Math.max(1,Math.round((b.getTime()-a.getTime())/86_400_000));}
  private parseDuration(value:string|null):RentalDuration{return value==="hourly"||value==="weekly"||value==="monthly"||value==="longterm"?value:"daily";}
  private parseDriverMode(value:string|null):DriverMode{return value==="with"||value==="without"?value:"";}
  private validQueryDate(value:string|null):string{return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:"";}
  private validQueryTime(value:string|null):string{return value&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?value:"";}
  private parseDate(value:string):Date|null{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||"");if(!match)return null;const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));return Number.isNaN(date.getTime())?null:date;}
}
