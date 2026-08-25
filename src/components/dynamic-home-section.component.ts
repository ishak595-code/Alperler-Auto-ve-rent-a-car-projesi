import { CommonModule } from "@angular/common";
import { Component, DestroyRef, Input, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "./vehicle-list-item.component";
import { PublicHomepageSection, HomepageLayoutService } from "../services/homepage-layout.service";
import { CarService, BlogPost } from "../services/car.service";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { BranchService } from "../services/branch.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { Vehicle } from "../models/car.model";
import { Branch } from "../models/branch.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

interface CampaignProof {
  campaignId: string;
  pageViewsTotal: number;
  uniqueViewersTotal: number;
  recentViewers24h: number;
  activeViewers15m: number;
  lastViewedAt?: string;
}

@Component({
  selector: "app-dynamic-home-section",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, VehicleListItemComponent],
  template: `
    @if (shouldRender()) {
      <section class="home-section" [ngClass]="sectionClasses()" [ngStyle]="sectionStyles()" [attr.aria-labelledby]="section.sectionKey + '-title'">
        <div class="section-inner">
          @if (renderer() === 'PARTNER') {
            <div class="partner-card"><div class="partner-copy">@if (profileImage()) {<img class="section-profile" [src]="profileImage()" [alt]="section.title + ' profil görseli'" />}<p class="section-kicker">{{ badge('Araç Sahipleri') }}</p><h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2><p>{{ description('Aracınızı satış veya kiralama filosu için değerlendirmeye gönderin; ekibimiz uygun yolu birlikte netleştirsin.') }}</p></div><a class="primary-cta" [routerLink]="internalCta('/list-your-car')">{{ ctaLabel('Aracımı Değerlendir') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
          } @else if (renderer() === 'PROMO') {
            <div class="promo-card">@if (coverImage()) {<div class="promo-media"><img [src]="coverImage()" [alt]="section.title" /></div>}<div class="promo-copy">@if (profileImage()) {<img class="section-profile" [src]="profileImage()" [alt]="section.title + ' profil görseli'" />}<p class="section-kicker">{{ badge(copy('promoFallbackBadge','Alperler Auto')) }}</p><h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2><p>{{ description(copy('promoFallbackDescription','Detayları keşfedin.')) }}</p>@if (ctaLabel('') && internalCta('')) {<a class="primary-cta" [routerLink]="internalCta('')">{{ ctaLabel('') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>}</div></div>
          } @else {
            <header class="section-head"><div>@if (profileImage()) {<img class="section-profile" [src]="profileImage()" [alt]="section.title + ' profil görseli'" />}<p class="section-kicker">{{ badge(defaultBadge()) }}</p><h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2>@if (description(defaultDescription())) {<p class="section-desc">{{ description(defaultDescription()) }}</p>}</div>@if (viewAllUrl()) {<a class="view-all" [routerLink]="viewAllUrl()">{{ viewAllLabel() }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>}</header>

            @if (section.sectionType === 'VEHICLES') {
              <div class="content-rail" [class.grid-layout]="isGrid()">@for (car of vehicles(); track stableVehicleKey(car)) {<div class="vehicle-shell"><app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item></div>}</div>
            }

            @if (section.sectionType === 'CAMPAIGN') {
              <div class="content-rail campaign-rail" [class.grid-layout]="isGrid()">
                @for (campaign of campaigns(); track campaign.id) {
                  <article class="campaign-card">
                    <button type="button" class="campaign-button" (click)="openCampaign(campaign)" [attr.aria-label]="campaignAriaLabel(campaign)">
                      <div class="campaign-media">
                        @if (campaignImage(campaign)) {<img [src]="campaignImage(campaign)" [alt]="campaign.title" loading="lazy" />} @else {<span class="campaign-placeholder"><mat-icon aria-hidden="true">local_offer</mat-icon></span>}
                        <div class="campaign-topline"><span class="campaign-label">{{ copy('campaignLabel','KAMPANYA') }}</span>@if (campaign.discountPercent) {<span class="discount-label">%{{ campaign.discountPercent }} {{ copy('campaignDiscountSuffix','İNDİRİM') }}</span>} @else if (campaign.badge) {<span class="discount-label">{{ campaign.badge }}</span>}</div>
                        @if (campaign.endsAt) {<span class="campaign-time" [class.urgent]="campaignUrgent(campaign.endsAt)"><mat-icon aria-hidden="true">schedule</mat-icon>{{ campaignCountdown(campaign.endsAt) }}</span>}
                      </div>
                      <div class="campaign-body">
                        <div class="social-proof" [class.hot]="campaignProof(campaign).activeViewers15m > 0 || campaignProof(campaign).recentViewers24h > 1"><span class="live-dot" aria-hidden="true"></span><mat-icon aria-hidden="true">visibility</mat-icon><strong>{{ campaignProofLabel(campaign) }}</strong></div>
                        <p class="campaign-hook">{{ campaignHook(campaign) }}</p>
                        <h3>{{ campaign.title }}</h3>
                        <p class="campaign-copy">{{ campaign.shortDescription || campaign.description || copy('campaignFallbackDescription','Kampanyanın avantajını ve ilgili araç ya da tur detayını inceleyin.') }}</p>
                        <div class="campaign-price-row"><div>@if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old-price">{{ formatPrice(campaign.oldPrice) }}</span>}@if (campaign.newPrice != null) {<strong>{{ formatPrice(campaign.newPrice) }}</strong>}</div>@if (campaignSavings(campaign) > 0) {<span class="saving">{{ formatPrice(campaignSavings(campaign)) }} {{ copy('campaignSavingSuffix','kazanç') }}</span>} @else if (campaign.discountPercent) {<span class="saving">%{{ campaign.discountPercent }} {{ copy('campaignAdvantageSuffix','avantaj') }}</span>}</div>
                        <span class="campaign-cta"><span>{{ campaign.ctaLabel || copy('campaignCtaLabel','Kampanyayı İncele') }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                      </div>
                    </button>
                  </article>
                }
              </div>
            }

            @if (section.sectionType === 'TOURS') {
              <div class="content-rail" [class.grid-layout]="isGrid()">@for (tour of tours(); track stableVehicleKey(tour)) {<a class="image-card" [routerLink]="['/tour', tour.id]"><div class="media">@if (tour.image) {<img [src]="mediaUrl(tour.image)" [alt]="entityTitle(tour)" loading="lazy" />} @else {<span class="media-placeholder"><mat-icon aria-hidden="true">landscape</mat-icon></span>}</div><div class="card-body"><div class="title-row"><h3>{{ entityTitle(tour) }}</h3>@if (tour.price) {<strong>{{ formatPrice(tour.price) }}</strong>}</div><p>{{ tour.description || tour.location || copy('tourFallbackDescription','Rotayı ve deneyim ayrıntılarını keşfedin.') }}</p><span class="text-link">{{ copy('tourCardCtaLabel','Turu Keşfet') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div></a>}</div>
            }

            @if (renderer() === 'BRANCHES') {
              <div class="content-rail" [class.grid-layout]="isGrid()">@for (branch of branches(); track branch.id) {<a class="branch-card" [routerLink]="branch.slug ? ['/branches', branch.slug] : ['/branches']"><span class="branch-icon"><mat-icon aria-hidden="true">storefront</mat-icon></span><p class="micro">{{ branch.networkType === 'FRANCHISE' ? copy('branchFranchiseLabel','Yetkili Bayi') : copy('branchLocationLabel','Alperler Auto Noktası') }}</p><h3>{{ branch.name }}</h3><p>{{ branch.publicDescription || ((branch.district || branch.city) + ' ' + copy('branchFallbackDescriptionSuffix','bölgesindeki araç ve hizmet seçeneklerini inceleyin.')) }}</p><div class="branch-meta"><span>{{ branch.city }} / {{ branch.district }}</span>@if (branch.isPickupPoint) {<span>{{ copy('branchPickupLabel','Teslim alma') }}</span>}@if (branch.isReturnPoint) {<span>{{ copy('branchReturnLabel','İade') }}</span>}</div><strong>{{ copy('branchCardCtaLabel','Şubeyi Keşfet') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong></a>}</div>@if (boolSetting('showPartnerCta',true)) {<a class="partner-inline" [routerLink]="internalSettingRoute('partnerRoute','/branch-partner')"><span><mat-icon aria-hidden="true">add_business</mat-icon><b>{{ copy('partnerCtaTitle','Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?') }}</b></span><strong>{{ copy('partnerCtaLabel','Bayilik Başvurusu') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong></a>}
            }

            @if (section.sectionType === 'BLOG') {
              <div class="content-rail" [class.grid-layout]="isGrid()">@for (post of blogs(); track post.cloudId || post.id) {<a class="image-card" [routerLink]="['/blog', post.id]"><div class="media">@if (post.image) {<img [src]="post.image" [alt]="post.title" loading="lazy" />} @else {<span class="media-placeholder"><mat-icon aria-hidden="true">article</mat-icon></span>}</div><div class="card-body"><h3>{{ post.title }}</h3><p>{{ post.summary }}</p><span class="text-link">{{ copy('blogCardCtaLabel','Yazıyı Oku') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div></a>}</div>
            }

            @if (viewAllUrl()) {<a class="mobile-view-all" [routerLink]="viewAllUrl()">{{ viewAllLabel() }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>}
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block}.home-section{padding:2rem 0;background:#fff;color:#0f172a;background-position:center;background-size:cover}.section-inner{width:min(100% - 20px,80rem);margin:auto}.width-standard .section-inner{max-width:68rem}.width-wide .section-inner{max-width:80rem}.width-full .section-inner{width:100%;max-width:none;padding-inline:clamp(.7rem,3vw,2rem)}.theme-soft{background:#f4f7fb}.theme-dark{background:#050b18;color:#fff}.theme-brand{background:linear-gradient(145deg,#071124,#0b2347);color:#fff}.theme-ocean{background:linear-gradient(145deg,#062a4e,#0b5b83);color:#fff}.theme-emerald{background:linear-gradient(145deg,#052e2b,#0f766e);color:#fff}.theme-sunset{background:linear-gradient(145deg,#7c2d12,#ea580c);color:#fff}.theme-violet{background:linear-gradient(145deg,#3b0764,#7c3aed);color:#fff}.theme-sand{background:#f6f0e4;color:#3f3528}.theme-graphite{background:linear-gradient(145deg,#111827,#374151);color:#fff}.theme-dark .section-desc,.theme-brand .section-desc,.theme-ocean .section-desc,.theme-emerald .section-desc,.theme-sunset .section-desc,.theme-violet .section-desc,.theme-graphite .section-desc{color:#d2dbea}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-profile{width:48px;height:48px;margin-bottom:.55rem;border-radius:14px;object-fit:cover;border:1px solid rgba(148,163,184,.3)}.section-kicker,.micro{margin:0;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.home-section h2{margin:.25rem 0 0;font:900 clamp(26px,6vw,42px)/1.05 Georgia,serif}.section-desc{margin:.45rem 0 0;max-width:760px;color:#64748b;font-size:12px;line-height:1.6}.view-all{display:none;align-items:center;gap:3px;color:#1d4ed8;font-size:12px;font-weight:900;text-decoration:none}.content-rail{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 12px;scrollbar-width:none}.content-rail::-webkit-scrollbar{display:none}.vehicle-shell,.image-card,.branch-card,.campaign-card{flex:0 0 min(78vw,310px);min-width:0;scroll-snap-align:start}.vehicle-shell,.image-card{overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;color:#0f172a;box-shadow:0 12px 30px rgba(15,23,42,.08)}.image-card{display:block;text-decoration:none}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#e2e8f0}.media img{width:100%;height:100%;object-fit:cover}.media-placeholder{display:grid;width:100%;height:100%;place-items:center;background:linear-gradient(145deg,#e2e8f0,#cbd5e1);color:#475569}.card-body{padding:14px}.card-body h3{margin:4px 0 0;font-size:16px}.card-body>p{color:#64748b;font-size:12px;line-height:1.5}.title-row{display:flex;align-items:end;justify-content:space-between;gap:8px}.text-link{display:flex;align-items:center;gap:3px;margin-top:10px;color:#1d4ed8;font-size:11px;font-weight:900}.campaign-card{overflow:hidden;border:1px solid rgba(245,158,11,.24);border-radius:22px;background:#fff;color:#0f172a;box-shadow:0 18px 44px rgba(15,23,42,.13)}.campaign-button{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer}.campaign-button:focus-visible,.primary-cta:focus-visible,.view-all:focus-visible,.mobile-view-all:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.campaign-media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#111827}.campaign-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(15,23,42,.62),transparent 62%);pointer-events:none}.campaign-media img{width:100%;height:100%;object-fit:cover}.campaign-placeholder{display:grid;width:100%;height:100%;place-items:center;background:linear-gradient(145deg,#1e293b,#0f172a);color:#fbbf24}.campaign-placeholder mat-icon{width:44px;height:44px;font-size:44px}.campaign-topline{position:absolute;z-index:3;left:10px;right:10px;top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}.campaign-label,.discount-label{border-radius:999px;padding:6px 9px;font-size:9px;font-weight:950;letter-spacing:.08em;box-shadow:0 6px 16px rgba(0,0,0,.16)}.campaign-label{background:#fbbf24;color:#451a03}.discount-label{max-width:58%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#991b1b;color:#fff}.campaign-time{position:absolute;z-index:3;left:10px;bottom:10px;display:flex;align-items:center;gap:4px;border-radius:999px;background:#fff;padding:6px 9px;color:#0f172a;font-size:10px;font-weight:950}.campaign-time.urgent{background:#dc2626;color:#fff}.campaign-time mat-icon{width:14px;height:14px;font-size:14px}.campaign-body{padding:14px}.social-proof{display:flex;min-height:32px;align-items:center;gap:5px;border-radius:10px;background:#f1f5f9;padding:0 9px;color:#475569;font-size:10px}.social-proof.hot{background:#fff7ed;color:#9a3412}.social-proof mat-icon{width:15px;height:15px;font-size:15px}.social-proof strong{font-weight:900}.live-dot{width:7px;height:7px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.12)}.social-proof.hot .live-dot{background:#ea580c;box-shadow:0 0 0 4px rgba(234,88,12,.12)}.campaign-hook{margin:10px 0 0;color:#b45309;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.campaign-body h3{margin:5px 0 0;font-size:17px;line-height:1.28}.campaign-copy{display:-webkit-box;overflow:hidden;margin:7px 0 0;color:#64748b;font-size:12px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.campaign-price-row{display:flex;align-items:end;justify-content:space-between;gap:8px;margin-top:11px}.campaign-price-row strong{font-size:19px}.old-price{display:block;color:#94a3b8;font-size:10px;text-decoration:line-through}.saving{border-radius:999px;background:#ecfdf5;padding:6px 8px;color:#047857;font-size:10px;font-weight:950}.campaign-cta{display:flex;min-height:44px;margin-top:11px;align-items:center;justify-content:space-between;border-radius:12px;background:#0f172a;padding:0 12px;color:#fff;font-size:11px;font-weight:950}.campaign-cta mat-icon{width:17px;height:17px;font-size:17px}.branch-card{display:block;border:1px solid #dce5ef;border-radius:20px;background:#fff;padding:16px;color:#0f172a;text-decoration:none}.branch-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:#eff6ff;color:#2563eb}.branch-card h3{margin:10px 0 5px}.branch-card>p:not(.micro){color:#64748b;font-size:12px;line-height:1.5}.branch-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.branch-meta span{border-radius:999px;background:#f1f5f9;padding:5px 7px;color:#475569;font-size:10px;font-weight:850}.branch-card strong{display:flex;align-items:center;gap:3px;margin-top:11px;color:#1d4ed8;font-size:11px}.partner-inline{display:flex;flex-direction:column;gap:7px;margin-top:11px;border:1px solid #bfdbfe;border-radius:17px;background:#eff6ff;padding:14px;color:#1e3a8a;text-decoration:none}.partner-inline span,.partner-inline strong{display:flex;align-items:center;gap:6px}.partner-card,.promo-card{display:grid;gap:16px;border:1px solid rgba(148,163,184,.18);border-radius:24px;background:rgba(255,255,255,.94);padding:20px;color:#0f172a}.partner-copy>p:not(.section-kicker),.promo-copy>p:not(.section-kicker){max-width:700px;color:#64748b;font-size:13px;line-height:1.6}.primary-cta,.mobile-view-all{display:flex;min-height:46px;width:max-content;align-items:center;justify-content:center;gap:4px;border-radius:12px;background:#2563eb;padding:0 16px;color:#fff;font-size:12px;font-weight:950;text-decoration:none}.mobile-view-all{margin:5px auto 0;background:#0f172a}.promo-media{overflow:hidden;border-radius:18px;aspect-ratio:16/8}.promo-media img{width:100%;height:100%;object-fit:cover}.grid-layout{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));overflow:visible;scroll-snap-type:none}.grid-layout>*{width:auto!important;min-width:0;flex:none}.hide-mobile,.hide-tablet,.hide-desktop{display:initial}@media(max-width:767px){.hide-mobile{display:none!important}}@media(min-width:768px) and (max-width:1023px){.hide-tablet{display:none!important}}@media(min-width:720px){.view-all{display:flex}.mobile-view-all{display:none}.content-rail.grid-layout{grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}.partner-card{grid-template-columns:1fr auto;align-items:center}.promo-card{grid-template-columns:minmax(240px,.8fr) 1.2fr;align-items:center}}@media(min-width:1024px){.hide-desktop{display:none!important}.home-section{padding:3rem 0}.partner-inline{flex-direction:row;align-items:center;justify-content:space-between}.campaign-card,.image-card,.branch-card,.vehicle-shell{transition:transform .2s ease,box-shadow .2s ease}.campaign-card:hover,.image-card:hover,.branch-card:hover,.vehicle-shell:hover{transform:translateY(-4px);box-shadow:0 22px 48px rgba(15,23,42,.15)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `],
})
export class DynamicHomeSectionComponent {
  @Input({ required: true }) section!: PublicHomepageSection;
  private readonly cars = inject(CarService);
  private readonly campaignsService = inject(CampaignService);
  private readonly branchesService = inject(BranchService);
  private readonly layout = inject(HomepageLayoutService);
  private readonly router = inject(Router);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = signal(Date.now());
  private readonly proofByCampaign = signal<Record<string, CampaignProof>>({});

  constructor() {
    void this.loadCampaignProof();
    if (typeof window !== "undefined") {
      const timer = window.setInterval(() => { this.clock.set(Date.now()); void this.loadCampaignProof(); }, 60_000);
      this.destroyRef.onDestroy(() => window.clearInterval(timer));
    }
  }

  shouldRender(): boolean { if (!this.section?.isEnabled) return false; if (this.renderer() === "PARTNER" || this.renderer() === "PROMO") return true; if (this.renderer() === "BRANCHES") return this.branches().length > 0; if (this.section.sectionType === "VEHICLES") return this.vehicles().length > 0; if (this.section.sectionType === "TOURS") return this.tours().length > 0; if (this.section.sectionType === "BLOG") return this.blogs().length > 0; if (this.section.sectionType === "CAMPAIGN") return this.campaigns().length > 0; return false; }
  renderer(): "DEFAULT" | "BRANCHES" | "PARTNER" | "PROMO" { const configured = String(this.setting("renderer", "")).toUpperCase(); if (["BRANCHES","PARTNER","PROMO"].includes(configured)) return configured as "BRANCHES"|"PARTNER"|"PROMO"; if (this.section.sectionKey === "branches") return "BRANCHES"; if (this.section.sectionKey === "partner") return "PARTNER"; return this.section.sectionType === "CUSTOM" ? "PROMO" : "DEFAULT"; }
  vehicles(): Vehicle[] { const source = this.vehicleRoute() === "/sales" ? this.cars.getSaleCars()() : this.cars.getCars()(); return this.orderedEntities(source, "VEHICLE", (item) => [String(item.id), String(item.cloudId || ""), String(item.cloudStockCode || "")]); }
  tours(): Vehicle[] { return this.orderedEntities(this.cars.getTours()(), "TOUR", (item) => [String(item.id), String(item.cloudId || "")]); }
  blogs(): BlogPost[] { return this.orderedEntities(this.cars.getBlogPosts()(), "BLOG", (item) => [String(item.id), String(item.cloudId || "")]); }
  campaigns(): CampaignRecord[] { const source = this.campaignsService.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a,b) => a.sortOrder-b.sortOrder); return this.orderedEntities(source, "CAMPAIGN", (item) => [String(item.id)]); }
  branches(): Branch[] { return this.branchesService.branches().filter((item) => item.isActive && !/\bdemo\b/i.test(item.name)).slice(0,this.limit()); }

  badge(fallback=""): string { return String(this.setting("badge", fallback) || fallback); }
  description(fallback=""): string { return String(this.setting("description", fallback) || fallback); }
  ctaLabel(fallback=""): string { return String(this.setting("ctaLabel", fallback) || fallback); }
  copy(key:string,fallback=""): string { return String(this.setting(key,fallback) || fallback); }
  profileImage(): string { return this.safeImage(String(this.setting("profileImage", "") || "")); }
  coverImage(): string { return this.safeImage(String(this.setting("coverImage", "") || "")); }
  isGrid(): boolean { return String(this.setting("layout", "rail")).toLowerCase() === "grid"; }
  internalCta(fallback=""): string { const configured = String(this.setting("ctaUrl", fallback) || fallback).trim(); return configured.startsWith("/") ? configured : fallback.startsWith("/") ? fallback : ""; }
  internalSettingRoute(key:string,fallback=""): string { const configured=String(this.setting(key,fallback)||fallback).trim(); return configured.startsWith("/")?configured:(fallback.startsWith("/")?fallback:""); }
  mediaUrl(value?: string): string { return this.detailData.mediaUrl(value); }

  sectionClasses(): string[] { const theme = String(this.setting("theme","light")).toLowerCase(); const width = String(this.setting("width","wide")).toLowerCase(); const themes=["light","soft","dark","brand","ocean","emerald","sunset","violet","sand","graphite"]; const widths=["standard","wide","full"]; const classes=[`theme-${themes.includes(theme)?theme:"light"}`,`width-${widths.includes(width)?width:"wide"}`]; if(!this.boolSetting("showOnMobile",true)) classes.push("hide-mobile"); if(!this.boolSetting("showOnTablet",true)) classes.push("hide-tablet"); if(!this.boolSetting("showOnDesktop",true)) classes.push("hide-desktop"); return classes; }
  sectionStyles(): Record<string,string> { const styles:Record<string,string>={}; const color=String(this.setting("backgroundColor","")||"").trim(); if(/^#[0-9a-f]{3,8}$/i.test(color)) styles["background-color"]=color; const image=this.safeImage(String(this.setting("backgroundImage","")||"")); if(image) styles["background-image"]=`linear-gradient(rgba(2,6,23,.12),rgba(2,6,23,.12)),url("${image.replace(/"/g,"")}")`; return styles; }
  defaultBadge(): string { if(this.section.sectionType==="VEHICLES") return this.vehicleRoute()==="/sales"?"Seçili İkinci El Araçlar":"Seçili Kiralık Araçlar"; if(this.section.sectionType==="CAMPAIGN") return "Güncel Kampanyalar"; if(this.section.sectionType==="TOURS") return "Yerel Rotalar"; if(this.section.sectionType==="BLOG") return "Rehber & İpuçları"; if(this.renderer()==="BRANCHES") return "Hizmet Ağı"; return "Alperler Auto"; }
  defaultDescription(): string { if(this.section.sectionType==="VEHICLES") return this.vehicleRoute()==="/sales"?"Öne çıkan ikinci el araçları karşılaştırın ve ilan ayrıntılarını inceleyin.":"Planınıza uyan öne çıkan kiralık araçları karşılaştırın."; if(this.section.sectionType==="CAMPAIGN") return "Gerçek bitiş tarihi, gerçek fiyat avantajı ve canlı ilgi verileriyle fırsatları inceleyin."; if(this.section.sectionType==="TOURS") return "Yerel rotaları ve tur ayrıntılarını keşfedin."; if(this.section.sectionType==="BLOG") return "Yola çıkmadan önce seçili rehber ve ipuçlarına göz atın."; if(this.renderer()==="BRANCHES") return "Şubeleri, bayileri ve hizmet noktalarını keşfedin."; return ""; }
  viewAllLabel(): string { const configured=String(this.setting("viewAllLabel","")||"").trim(); if(configured) return configured; if(this.section.sectionType==="VEHICLES") return this.vehicleRoute()==="/sales"?"Tüm Satılık Araçlar":"Tüm Kiralık Araçlar"; if(this.section.sectionType==="TOURS") return "Tüm Turlar"; if(this.section.sectionType==="CAMPAIGN") return "Tüm Kampanyalar"; if(this.section.sectionType==="BLOG") return "Tüm Yazılar"; if(this.renderer()==="BRANCHES") return "Tüm Noktalar"; return "Tümünü Gör"; }
  viewAllUrl(): string { const configured=String(this.setting("viewAllUrl","")||"").trim(); if(configured.startsWith("/")) return configured; if(this.section.sectionType==="VEHICLES") return this.vehicleRoute(); if(this.section.sectionType==="TOURS") return "/tours"; if(this.section.sectionType==="CAMPAIGN") return "/campaigns"; if(this.section.sectionType==="BLOG") return "/blog"; if(this.renderer()==="BRANCHES") return "/branches"; return ""; }
  vehicleRoute(): "/fleet"|"/sales" { return String(this.setting("category","RENTAL")).toUpperCase()==="SALE"?"/sales":"/fleet"; }
  stableVehicleKey(item:Vehicle): string { return String(item.cloudId||item.id); }
  entityTitle(item:Vehicle): string { return item.title||[item.brand,item.model,item.year].filter(Boolean).join(" ")||`İlan ${item.id}`; }
  formatPrice(value:number): string { return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(value); }
  campaignSavings(item:CampaignRecord): number { return item.oldPrice!=null&&item.newPrice!=null?Math.max(0,item.oldPrice-item.newPrice):0; }
  campaignHook(item:CampaignRecord): string { const saving=this.campaignSavings(item); if(saving>0) return `${this.formatPrice(saving)} ${this.copy("campaignSavingSuffix","kazanç")}`; if(item.discountPercent) return `%${item.discountPercent} ${this.copy("campaignAdvantageSuffix","avantaj")}`; return this.copy("campaignLimitedLabel","Sınırlı süreli fırsat"); }
  campaignImage(item:CampaignRecord): string { return this.detailData.mediaUrl(item.coverImage); }
  campaignCountdown(value:string): string { const remaining=new Date(value).getTime()-this.clock(); if(!Number.isFinite(remaining)||remaining<=0) return this.copy("campaignExpiredLabel","Süre doldu"); const hours=Math.floor(remaining/3_600_000); const days=Math.floor(hours/24); if(days>1) return `${days} ${this.copy("campaignDaysRemainingSuffix","gün kaldı")}`; if(days===1) return this.copy("campaignOneDayRemainingLabel","1 gün kaldı"); return `${Math.max(1,hours)} ${this.copy("campaignHoursRemainingSuffix","saat kaldı")}`; }
  campaignUrgent(value:string): boolean { const remaining=new Date(value).getTime()-this.clock(); return Number.isFinite(remaining)&&remaining>0&&remaining<=48*3_600_000; }
  campaignProof(item: CampaignRecord): CampaignProof { return this.proofByCampaign()[item.id] || { campaignId: item.id, pageViewsTotal: 0, uniqueViewersTotal: 0, recentViewers24h: 0, activeViewers15m: 0 }; }
  campaignProofLabel(item: CampaignRecord): string { const proof=this.campaignProof(item); const views=`${proof.pageViewsTotal} ${this.copy("campaignViewsSuffix","görüntülenme")}`; if(proof.activeViewers15m>0) return `${proof.activeViewers15m} ${this.copy("campaignProofActiveSuffix","kişi son 15 dk'da inceledi")}`; if(proof.recentViewers24h>0) return `${proof.recentViewers24h} ${this.copy("campaignProofRecentSuffix","kişi son 24 saatte inceledi")} · ${views}`; if(proof.uniqueViewersTotal>0) return `${proof.uniqueViewersTotal} ${this.copy("campaignProofUniqueSuffix","kişi inceledi")} · ${views}`; if(proof.pageViewsTotal>0) return views; return this.copy("campaignNewLabel","Yeni kampanya"); }
  campaignAriaLabel(item:CampaignRecord): string { return `${item.title}. ${this.campaignProofLabel(item)}. ${item.endsAt?this.campaignCountdown(item.endsAt)+". ":""}${item.ctaLabel||this.copy("campaignCtaLabel","Kampanyayı incele")}`; }
  async openCampaign(item:CampaignRecord): Promise<void> { const route=await this.detailData.resolveCampaignTarget(item.targetType,item.targetId,item.ctaUrl); const separator=route.includes("?")?"&":"?"; await this.router.navigateByUrl(`${route}${separator}campaign=${encodeURIComponent(item.id)}`); }

  private async loadCampaignProof(): Promise<void> {
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/campaign_social_proof`, { method: "POST", cache: "no-store", headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" }, body: "{}" });
      if (!response.ok) return;
      const rows = await response.json() as Array<Record<string, unknown>>;
      const map: Record<string, CampaignProof> = {};
      for (const row of rows) {
        const campaignId = String(row["campaign_id"] || "");
        if (!campaignId) continue;
        map[campaignId] = { campaignId, pageViewsTotal: Number(row["page_views_total"] || 0), uniqueViewersTotal: Number(row["unique_viewers_total"] || 0), recentViewers24h: Number(row["recent_viewers_24h"] || 0), activeViewers15m: Number(row["active_viewers_15m"] || 0), lastViewedAt: row["last_viewed_at"] ? String(row["last_viewed_at"]) : undefined };
      }
      this.proofByCampaign.set(map);
    } catch { /* analytics social proof is optional */ }
  }
  private orderedEntities<T>(source:T[], entityType:"VEHICLE"|"TOUR"|"BLOG"|"CAMPAIGN", keys:(item:T)=>string[]):T[] { const ids=this.layout.placementsFor(this.section.sectionKey).filter((p)=>p.entityType===entityType).map((p)=>p.entityId); if(!ids.length) return source.slice(0,this.limit()); const map=new Map<string,T>(); source.forEach((item)=>keys(item).filter(Boolean).forEach((key)=>map.set(key,item))); const ordered=ids.map((id)=>map.get(id)).filter((item):item is T=>Boolean(item)); return (ordered.length?ordered:source).slice(0,this.limit()); }
  private limit():number { const value=Math.floor(Number(this.section.maxItems||1)); return Number.isFinite(value)&&value>=1?value:1; }
  private setting(key:string,fallback:unknown):unknown { const settings=this.section.settings&&typeof this.section.settings==="object"?this.section.settings:{}; return Object.prototype.hasOwnProperty.call(settings,key)?settings[key]:fallback; }
  boolSetting(key:string,fallback:boolean):boolean { const value=this.setting(key,fallback); return typeof value==="boolean"?value:fallback; }
  private safeImage(value:string):string { const trimmed=value.trim(); return /^https:\/\//i.test(trimmed)||trimmed.startsWith("/")||/^data:image\//i.test(trimmed)?this.detailData.mediaUrl(trimmed):""; }
  private isLiveCampaign(item:CampaignRecord):boolean { if(!item.isActive||item.publicationStatus!=="PUBLISHED") return false; const now=this.clock(); const start=item.startsAt?new Date(item.startsAt).getTime():Number.NEGATIVE_INFINITY; const end=item.endsAt?new Date(item.endsAt).getTime():Number.POSITIVE_INFINITY; return (!item.startsAt||(Number.isFinite(start)&&start<=now))&&(!item.endsAt||(Number.isFinite(end)&&end>now)); }
}
