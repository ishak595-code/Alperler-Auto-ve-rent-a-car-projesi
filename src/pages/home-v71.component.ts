import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { DynamicHomeSectionComponent } from "../components/dynamic-home-section.component";
import { RentalDuration } from "../models/booking.model";
import { BranchService } from "../services/branch.service";
import { CarService } from "../services/car.service";
import { HomepageLayoutService } from "../services/homepage-layout.service";
import { SeoService } from "../services/seo.service";
import { UiService } from "../services/ui.service";

interface PickupChoice { key:string; branchId:string; label:string; }
type PlannerService = "individual" | "driver" | "wedding" | "tour";
type PlannerFieldKey = "service" | "pickup" | "duration" | "date";
interface PlannerServiceChoice { value: PlannerService; label: string; enabled: boolean; sortOrder: number; }
interface PlannerDurationChoice { value: RentalDuration; label: string; enabled: boolean; sortOrder: number; }

@Component({
  selector: "app-home-v71",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DynamicHomeSectionComponent, AccessibleNativeDateComponent],
  template: `
    <main class="home-root">
      <section class="hero" [style.backgroundImage]="heroImage() ? 'url(' + heroImage() + ')' : 'none'" aria-labelledby="home-title">
        <div class="hero-shade" aria-hidden="true"></div>
        <div class="hero-stage" [class.planner-disabled]="!plannerEnabled()">
          <div class="hero-copy-block">
            <p class="eyebrow">{{ t().homePage.trustLine }}</p>
            <h1 id="home-title">{{ t().homePage.title }}</h1>
            <p class="hero-copy">{{ t().homePage.subtitle }}</p>
            <div class="desktop-search" role="search" [attr.aria-label]="t().homePage.searchAria"><label class="sr-only" for="home-search-v80">{{ t().homePage.searchAria }}</label><div class="search-shell"><mat-icon aria-hidden="true">search</mat-icon><input id="home-search-v80" type="search" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" autocomplete="off" [attr.aria-label]="t().homePage.searchAria" [placeholder]="t().homePage.searchPlaceholder" /><button type="button" (click)="performSearch()" [attr.aria-label]="t().homePage.searchStartAria">{{ t().homePage.searchButton }}</button></div></div>
            <div class="trust-row" [attr.aria-label]="t().homePage.trustAria"><span><mat-icon aria-hidden="true">verified</mat-icon>{{ t().homePage.trustPrice }}</span><span><mat-icon aria-hidden="true">support_agent</mat-icon>{{ t().homePage.trustSupport }}</span><span><mat-icon aria-hidden="true">fact_check</mat-icon>{{ t().homePage.trustVerified }}</span></div>
          </div>

          @if (plannerEnabled()) {
          <aside class="planner" [class.planner-compact]="plannerVariant() === 'compact'" aria-labelledby="planner-title">
            <div class="planner-head"><div><p class="planner-kicker">{{ t().homePage.plannerKicker }}</p><h2 id="planner-title">{{ t().homePage.bookingTitle }}</h2><p>{{ t().homePage.bookingSubtitle }}</p></div><span class="planner-icon" aria-hidden="true"><mat-icon>event_available</mat-icon></span></div>

            <div class="field-grid">
              @for (field of plannerFieldOrder(); track field) {
                @switch (field) {
                  @case ('service') {
                    <label class="field"><span>{{ t().homePage.serviceLabel }}</span><select [(ngModel)]="serviceType" name="homeService" (ngModelChange)="onServiceChanged()" [attr.aria-label]="t().homePage.serviceLabel">@for (option of plannerServiceOptions(); track option.value) {<option [value]="option.value">{{ option.label }}</option>}</select></label>
                  }
                  @case ('pickup') {
                    @if (serviceType !== 'tour') {
                      <label class="field"><span>{{ t().homePage.pickupLabel }}</span><select [(ngModel)]="selectedPickupKey" name="homePickup" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.pickupAria"><option value="">{{ t().homePage.pickupPlaceholder }}</option>@for (choice of pickupChoices(); track choice.key) { <option [value]="choice.key">{{ choice.label }}</option> }</select></label>
                    }
                  }
                  @case ('duration') {
                    @if (serviceType !== 'tour') {
                      <label class="field"><span>{{ t().homePage.durationLabel }}</span><select [(ngModel)]="rentalDuration" name="homeDuration" (ngModelChange)="onDurationChanged()" [attr.aria-label]="t().homePage.durationAria">@for (option of plannerDurationOptions(); track option.value) {<option [value]="option.value">{{ option.label }}</option>}</select></label>
                    }
                  }
                  @case ('date') {
                    @if (serviceType === 'tour') {
                      <div class="date-grid single-date"><app-accessible-native-date [label]="t().homePage.tourDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /></div>
                    } @else if (rentalDuration === 'hourly') {
                      <div class="date-grid single-date"><app-accessible-native-date [label]="t().homePage.hourlyDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /></div>
                      <div class="time-grid"><label class="field"><span>{{ t().homePage.startTimeLabel }}</span><input type="time" [(ngModel)]="startTime" name="homeStartTime" step="900" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.startTimeAria" /></label><label class="field"><span>{{ t().homePage.endTimeLabel }}</span><input type="time" [(ngModel)]="endTime" name="homeEndTime" step="900" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.endTimeAria" /></label></div>
                    } @else {
                      <div class="date-grid"><app-accessible-native-date [label]="t().homePage.startDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /><app-accessible-native-date [label]="t().homePage.endDateLabel" [value]="endDate" [min]="startDate || today" (valueChange)="onEndDateChanged($event)" /></div>
                    }
                  }
                }
              }
            </div>

            @if (plannerError) { <p class="planner-error" role="alert">{{ plannerError }}</p> }
            @if (plannerSummary()) { <p class="planner-summary" aria-live="polite">{{ plannerSummary() }}</p> }
            <button type="button" class="planner-action" (click)="searchAvailability()" [attr.aria-label]="bookingButtonLabel()"><span>{{ bookingButtonLabel() }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
            <p class="planner-note">{{ t().homePage.plannerNote }}</p>
          </aside>
          }
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {<div class="loading" role="status"><mat-icon aria-hidden="true">sync</mat-icon><span>{{ t().homePage.loading }}</span></div>}
      @for (section of managedSections(); track section.sectionKey) {
        <app-dynamic-home-section [section]="section"></app-dynamic-home-section>
      }
    </main>
  `,
  styles: [`:host, .page, .hero{overflow-x:clip;overflow-wrap:anywhere;}
    .home-root,.home-root *{box-sizing:border-box}
    .hero{position:relative;isolation:isolate;overflow:hidden;background:var(--alper-bg,#06080D) center/cover no-repeat;color:var(--alper-text,#F8F6F1)}
    .hero-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,color-mix(in srgb,var(--alper-bg,#020617) 97%,transparent),color-mix(in srgb,var(--alper-bg,#020617) 88%,transparent) 52%,color-mix(in srgb,var(--alper-bg,#020617) 67%,transparent)),radial-gradient(circle at 85% 12%,color-mix(in srgb,var(--alper-blue,#9E1B24) 28%,transparent),transparent 32%)}
    .hero-stage{width:min(100% - 1.25rem,var(--site-content-max,80rem));margin:auto;padding:1.45rem 0 1.75rem;display:grid;gap:1.2rem}
    .hero-stage>*{min-width:0}
    .hero-copy-block{min-width:0}
    .eyebrow,.planner-kicker{margin:0;color:var(--alper-gold,#D4AF37);font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;line-height:1.35;overflow-wrap:anywhere}
    .hero h1{max-width:850px;margin:.7rem 0 0;font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-size:clamp(2.05rem,8.5vw,3.2rem);font-weight:600;line-height:1.08;letter-spacing:-.02em;overflow-wrap:anywhere}
    .hero-copy{max-width:720px;margin:.8rem 0 0;color:color-mix(in srgb,var(--alper-text,#F8F6F1) 78%,var(--alper-muted,#B8B4AA));font-size:clamp(.98rem,2.8vw,1.08rem);line-height:1.65;overflow-wrap:anywhere}
    .desktop-search{display:none;max-width:650px;margin-top:1.2rem}
    .search-shell{display:flex;min-width:0;align-items:center;gap:.5rem;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 70%,transparent);border-radius:var(--site-radius,16px);background:color-mix(in srgb,var(--alper-surface,#0D1118) 88%,transparent);padding:.45rem;box-shadow:var(--alper-shadow,0 18px 50px rgba(0,0,0,.24))}
    .search-shell mat-icon{color:var(--alper-muted,#B8B4AA)}
    .search-shell input{min-width:0;max-width:100%;flex:1;border:0;background:transparent;padding:.72rem .15rem;color:var(--alper-text,#F8F6F1);font-size:1rem;outline:none}
    .search-shell button{min-height:44px;flex:none;border:0;border-radius:12px;background:linear-gradient(135deg,var(--alper-blue,#9E1B24),#7A0D15);padding:0 1.15rem;color:#fff;font-size:.95rem;font-weight:700;letter-spacing:.01em}
    .search-shell button:focus-visible{outline:3px solid var(--alper-blue-light,#E15A62);outline-offset:2px}
    .trust-row{display:flex;min-width:0;flex-wrap:wrap;gap:.55rem;margin-top:1.05rem}
    .trust-row span{display:inline-flex;min-width:0;max-width:100%;align-items:center;gap:.4rem;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--alper-elevated,#171D26) 55%,transparent);padding:.5rem .8rem;color:color-mix(in srgb,var(--alper-text,#F8F6F1) 86%,var(--alper-muted));font-size:.8125rem;font-weight:650;line-height:1.35;overflow-wrap:anywhere}
    .trust-row mat-icon{width:16px;height:16px;flex:none;font-size:16px;color:var(--alper-gold,#D4AF37)}
    .planner{width:100%;min-width:0;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 80%,var(--alper-gold,#D4AF37) 20%);border-radius:calc(var(--site-radius,18px) + 4px);background:linear-gradient(180deg,color-mix(in srgb,var(--alper-card,#11161E) 92%,var(--alper-elevated,#171D26)),var(--alper-surface,#0D1118));padding:1.2rem;box-shadow:var(--alper-shadow,0 24px 54px rgba(2,6,23,.36));isolation:isolate;backdrop-filter:blur(8px)}
    .planner-head{display:flex;min-width:0;justify-content:space-between;gap:.85rem;align-items:flex-start}
    .planner-head>div{min-width:0;flex:1}
    .planner h2{margin:.35rem 0 0;font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-size:clamp(1.45rem,4.5vw,1.85rem);font-weight:600;line-height:1.18;letter-spacing:-.015em;overflow-wrap:anywhere;color:var(--alper-text,#F8F6F1)}
    .planner-head p:not(.planner-kicker){margin:.5rem 0 0;color:var(--alper-muted,#B8B4AA);font-size:.95rem;line-height:1.55;overflow-wrap:anywhere}
    .planner-icon{display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--alper-gold,#D4AF37) 18%,transparent);color:var(--alper-gold,#D4AF37);border:1px solid color-mix(in srgb,var(--alper-gold,#D4AF37) 28%,transparent)}
    .field-grid{display:grid;min-width:0;gap:.8rem;margin-top:1.1rem}
    .field{display:flex;min-width:0;max-width:100%;flex-direction:column;gap:.4rem}
    .field>span{min-width:0;color:var(--alper-subtle,#81858A);font-size:.72rem;font-weight:750;letter-spacing:.06em;text-transform:uppercase;line-height:1.3;overflow-wrap:anywhere}
    .field select,.field input{width:100%;min-width:0;max-width:100%;min-height:48px;border:1px solid var(--alper-border,#303846);border-radius:12px;background:var(--alper-elevated,#171D26);padding:0 .9rem;color:var(--alper-text,#F8F6F1);font-size:1rem;font-weight:600;outline:none;text-overflow:ellipsis}
    .field select:focus,.field input:focus{border-color:var(--alper-gold,#D4AF37);box-shadow:var(--alper-focus-ring,0 0 0 3px color-mix(in srgb,var(--alper-gold,#D4AF37) 22%,transparent))}
    .date-grid,.time-grid{display:grid;min-width:0;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.7rem}
    .date-grid>*,.time-grid>*{min-width:0}
    .date-grid.single-date{grid-template-columns:minmax(0,1fr)}
    .planner-summary{margin:.75rem 0 0;border-radius:12px;background:color-mix(in srgb,var(--alper-gold,#D4AF37) 10%,transparent);border:1px solid color-mix(in srgb,var(--alper-gold,#D4AF37) 22%,transparent);padding:.75rem .85rem;color:var(--alper-text,#F8F6F1);font-size:.875rem;font-weight:650;line-height:1.45;overflow-wrap:anywhere}
    .planner-error{margin:.75rem 0 0;border-radius:12px;background:color-mix(in srgb,var(--alper-blue,#9E1B24) 14%,transparent);border:1px solid color-mix(in srgb,var(--alper-blue-light,#E15A62) 35%,transparent);padding:.75rem .85rem;color:var(--alper-blue-light,#E15A62);font-size:.875rem;font-weight:700;line-height:1.45;overflow-wrap:anywhere}
    .planner-action{display:flex;width:100%;min-width:0;min-height:52px;margin-top:1rem;align-items:center;justify-content:center;gap:.5rem;border:0;border-radius:14px;background:linear-gradient(135deg,var(--alper-blue,#9E1B24),#7A0D15);padding:.8rem 1.1rem;color:#fff;font-size:1.02rem;font-weight:750;line-height:1.25;letter-spacing:.01em;box-shadow:0 16px 34px color-mix(in srgb,var(--alper-blue,#9E1B24) 28%,transparent);transition:transform .15s ease,box-shadow .15s ease}
    .planner-action:hover{box-shadow:var(--alper-shadow-hover,0 22px 58px rgba(0,0,0,.3))}
    .planner-action span{min-width:0;overflow-wrap:anywhere}
    .planner-action:focus-visible{outline:3px solid var(--alper-blue-light,#E15A62);outline-offset:3px}
    .planner-note{margin:.6rem 0 0;color:var(--alper-subtle,#81858A);font-size:.8125rem;line-height:1.55;overflow-wrap:anywhere}
    .loading{display:flex;min-height:110px;align-items:center;justify-content:center;gap:.45rem;background:var(--alper-surface,#fff);color:var(--alper-muted,#475569);font-size:.92rem;font-weight:700}
    .loading mat-icon{color:var(--alper-blue,#9E1B24)}
    @media(min-width:768px){
      .home-root{padding-bottom:0}
      .hero-stage{padding:3.6rem 0 4.1rem;gap:1.45rem}
      .desktop-search{display:block}
      .hero h1{font-size:clamp(3.25rem,6vw,4.9rem)}
      .hero-copy{font-size:1.08rem}
      .planner{padding:1.35rem}
      .planner h2{font-size:clamp(1.6rem,2.4vw,1.95rem)}
      .planner-head p:not(.planner-kicker){font-size:1.02rem}
      .field-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
      .date-grid,.time-grid{grid-column:1/-1}
      .date-grid.single-date{grid-column:auto}
      .trust-row span{font-size:.875rem}
    }
    @media(min-width:1024px){
      .hero-stage{grid-template-columns:minmax(0,1.12fr) minmax(400px,.88fr);align-items:center;gap:3.2rem;padding:5rem 0 5.6rem}
      .planner{padding:1.5rem 1.55rem}
      .planner h2{font-size:2rem}
      .field-grid{grid-template-columns:minmax(0,1fr)}
      .date-grid,.time-grid{grid-column:auto}
      .hero h1{font-size:clamp(3.6rem,5.2vw,5.4rem)}
    }
    @media(max-width:430px){
      .date-grid,.time-grid{grid-template-columns:minmax(0,1fr)}
      .hero-stage{width:min(100% - 1rem,80rem);padding-top:1.1rem}
      .planner{padding:1.05rem;border-radius:18px}
      .hero h1{font-size:clamp(1.98rem,9vw,2.4rem);line-height:1.1}
      .planner h2{font-size:clamp(1.38rem,6.5vw,1.58rem)}
      .planner-icon{width:46px;height:46px}
      .trust-row span{border-radius:14px}
    }
    .planner.planner-compact{padding:1rem}
    .planner.planner-compact .field-grid{gap:.65rem}
    @media(min-width:1024px){
      .hero-stage.planner-disabled{grid-template-columns:1fr}
      .hero-stage.planner-disabled .hero-copy-block{max-width:850px}
    }
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
})
export class HomeV71Component {
  readonly carService=inject(CarService);readonly homepageLayout=inject(HomepageLayoutService);private readonly branchService=inject(BranchService);private readonly router=inject(Router);private readonly seo=inject(SeoService);private readonly ui=inject(UiService);readonly t=this.ui.translations;
  readonly config=this.carService.getConfig();readonly homeContent=computed(()=>this.config().homeContent||{});readonly branches=this.branchService.branches;
  searchQuery="";startDate="";endDate="";startTime="09:00";endTime="10:00";rentalDuration:RentalDuration="daily";serviceType:PlannerService="individual";selectedPickupKey="";plannerError="";readonly today=this.toDateInput(new Date());
  readonly plannerEnabled=computed(()=>this.homeContent().plannerEnabled!==false);
  readonly plannerVariant=computed<"classic"|"compact">(()=>this.homeContent().plannerVariant==="compact"?"compact":"classic");
  readonly plannerFieldOrder=computed<PlannerFieldKey[]>(()=>{const defaults:PlannerFieldKey[]=["service","pickup","duration","date"];const raw=Array.isArray(this.homeContent().plannerFieldOrder)?this.homeContent().plannerFieldOrder!:[];const result:PlannerFieldKey[]=[];for(const value of raw){if(defaults.includes(value as PlannerFieldKey)&&!result.includes(value as PlannerFieldKey))result.push(value as PlannerFieldKey);}for(const value of defaults)if(!result.includes(value))result.push(value);return result;});
  readonly plannerServiceOptions=computed<PlannerServiceChoice[]>(()=>{const home=this.homeContent();const hp=this.t().homePage;const defaults:PlannerServiceChoice[]=[{value:"individual",label:hp.serviceIndividual,enabled:true,sortOrder:0},{value:"driver",label:hp.serviceDriver,enabled:true,sortOrder:1},{value:"wedding",label:hp.serviceWedding,enabled:true,sortOrder:2},{value:"tour",label:hp.serviceTour,enabled:true,sortOrder:3}];const raw=Array.isArray(home.plannerServiceOptions)?home.plannerServiceOptions:[];const lang=this.ui.currentLang();const mapped=defaults.map((item,index)=>{const custom=raw.find((row)=>row?.value===item.value);// Admin-edited labels stay TR-live; other langs prefer pack (already merged with admin TR fallback in UiService).
const adminLabel=String(custom?.label||"").trim();const label=lang==="TR"?(adminLabel||item.label):item.label;return{...item,label:label||item.label,enabled:custom?.enabled!==false,sortOrder:Number.isFinite(Number(custom?.sortOrder))?Number(custom?.sortOrder):index};}).filter((item)=>item.enabled).sort((a,b)=>a.sortOrder-b.sortOrder);return mapped.length?mapped:defaults;});
  readonly plannerDurationOptions=computed<PlannerDurationChoice[]>(()=>{const hp=this.t().homePage;const defaults:PlannerDurationChoice[]=[{value:"hourly",label:hp.durationHourly,enabled:true,sortOrder:0},{value:"daily",label:hp.durationDaily,enabled:true,sortOrder:1},{value:"weekly",label:hp.durationWeekly,enabled:true,sortOrder:2},{value:"monthly",label:hp.durationMonthly,enabled:true,sortOrder:3},{value:"longterm",label:hp.durationLongterm,enabled:true,sortOrder:4}];const raw=Array.isArray(this.homeContent().plannerDurationOptions)?this.homeContent().plannerDurationOptions!:[];const lang=this.ui.currentLang();const mapped=defaults.map((item,index)=>{const custom=raw.find((row)=>row?.value===item.value);const adminLabel=String(custom?.label||"").trim();const label=lang==="TR"?(adminLabel||item.label):item.label;return{...item,label:label||item.label,enabled:custom?.enabled!==false,sortOrder:Number.isFinite(Number(custom?.sortOrder))?Number(custom?.sortOrder):index};}).filter((item)=>item.enabled).sort((a,b)=>a.sortOrder-b.sortOrder);return mapped.length?mapped:defaults;});
  readonly heroImage=computed(()=>{const home=this.homeContent() as Record<string,unknown>;const candidate=String(home["heroImage"]||"").trim();return/^https:\/\//i.test(candidate)?candidate:"";});
  readonly pickupChoices=computed<PickupChoice[]>(()=>{const choices:PickupChoice[]=[];for(const branch of this.branches().filter((item)=>item.isPickupPoint)){const raw=branch.serviceRules?.["pickupLocations"];const locations=Array.isArray(raw)?raw.map((item)=>String(item||"").trim()).filter(Boolean).slice(0,16):[];if(locations.length)locations.forEach((label,index)=>choices.push({key:`${branch.id}:${index}`,branchId:String(branch.cloudId||branch.id),label}));else choices.push({key:`${branch.id}:main`,branchId:String(branch.cloudId||branch.id),label:`${branch.name} · ${branch.district||branch.city}`});}return choices.filter((item,index,list)=>list.findIndex((other)=>other.key===item.key)===index);});
  readonly managedSections=computed(()=>[...this.homepageLayout.sections()].filter((section)=>section.isEnabled).sort((a,b)=>a.sortOrder-b.sortOrder));
  constructor(){effect(()=>{const cfg=this.config();this.seo.updateSeoTags({title:cfg.seoTitle||`${cfg.companyName} | ${this.t().homePage.seoTitleSuffix}`,description:cfg.seoDescription||this.t().homePage.subtitle||cfg.companyName,keywords:cfg.seoKeywords,image:cfg.seoOgImage||cfg.logoUrl});});effect(()=>{const services=this.plannerServiceOptions();if(!services.some((item)=>item.value===this.serviceType))this.serviceType=services[0]?.value||"individual";const durations=this.plannerDurationOptions();if(!durations.some((item)=>item.value===this.rentalDuration))this.rentalDuration=durations[0]?.value||"daily";});}
  performSearch():void{const q=this.searchQuery.trim();void this.router.navigate(["/search"],{queryParams:q?{q}:undefined});}
  onServiceChanged():void{this.clearPlannerError();if(this.serviceType==="tour"){this.endDate="";this.selectedPickupKey="";}else if(this.rentalDuration==="hourly"&&this.startDate)this.endDate=this.startDate;}
  onDurationChanged():void{this.clearPlannerError();if(this.rentalDuration==="hourly"){this.endDate=this.startDate;}else if(this.endDate===this.startDate)this.endDate="";}
  onStartDateChanged(value:string):void{this.startDate=value;if(this.serviceType!=="tour"&&this.rentalDuration==="hourly")this.endDate=value;else if(this.endDate&&value&&this.endDate<=value)this.endDate="";this.clearPlannerError();}
  onEndDateChanged(value:string):void{this.endDate=value;this.clearPlannerError();}
  clearPlannerError():void{this.plannerError="";}
  searchAvailability():void{this.clearPlannerError();if(!this.startDate){this.plannerError=this.serviceType==="tour"?this.t().homePage.errorTourDate:this.t().homePage.errorStartDate;return;}if(this.serviceType==="tour"){void this.router.navigate(["/tours"],{queryParams:{start:this.startDate}});return;}if(this.rentalDuration==="hourly"){const start=this.minutes(this.startTime),end=this.minutes(this.endTime);if(start===null||end===null||end<=start){this.plannerError=this.t().homePage.errorTimeOrder;return;}if(Math.ceil((end-start)/60)>23){this.plannerError=this.t().homePage.errorHourlyLimit;return;}}else{if(!this.endDate){this.plannerError=this.t().homePage.errorEndDate;return;}if(this.endDate<=this.startDate){this.plannerError=this.t().homePage.errorDateOrder;return;}}
    const pickup=this.pickupChoices().find((item)=>item.key===this.selectedPickupKey);if(!pickup){this.plannerError=this.t().homePage.errorPickup;return;}const driverMode=this.serviceType==="individual"?"without":"with";void this.router.navigate(["/fleet"],{queryParams:{duration:this.rentalDuration,start:this.startDate,end:this.rentalDuration==="hourly"?this.startDate:this.endDate,startTime:this.rentalDuration==="hourly"?this.startTime:undefined,endTime:this.rentalDuration==="hourly"?this.endTime:undefined,pickup:pickup.branchId,pickupLocation:pickup.label,driverMode,availableOnly:"true",occasion:this.serviceType==="wedding"?"wedding":undefined}});}
  plannerSummary():string{if(!this.startDate)return"";const hp=this.t().homePage;const pickup=this.pickupChoices().find((item)=>item.key===this.selectedPickupKey);const dates=this.serviceType==="tour"?this.formatShortDate(this.startDate):this.rentalDuration==="hourly"?`${this.formatShortDate(this.startDate)} · ${this.startTime}-${this.endTime}`:`${this.formatShortDate(this.startDate)} - ${this.endDate?this.formatShortDate(this.endDate):"?"}`;const mode=this.serviceType==="individual"?hp.summarySelf:this.serviceType==="driver"?hp.summaryDriver:this.serviceType==="wedding"?hp.summaryWedding:hp.summaryTour;const duration=this.serviceType==="tour"?"":(this.plannerDurationOptions().find((item)=>item.value===this.rentalDuration)?.label||this.rentalDuration);return[dates,duration,mode,pickup?.label].filter(Boolean).join(" · ");}
  bookingButtonLabel():string{const hp=this.t().homePage;if(this.serviceType==="tour")return hp.buttonTour;if(this.rentalDuration==="hourly")return hp.buttonHourly;if(this.serviceType==="driver")return hp.buttonDriver;if(this.serviceType==="wedding")return hp.buttonWedding;return hp.buttonRental;}
  private minutes(value:string):number|null{const match=/^(\d{2}):(\d{2})$/.exec(value||"");if(!match)return null;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<=23&&m>=0&&m<=59?h*60+m:null;}
  private parseLocalDate(value:string):Date|null{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||"");if(!match)return null;const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));return Number.isNaN(date.getTime())?null:date;}
  private formatShortDate(value:string):string{const date=this.parseLocalDate(value);const loc=({TR:"tr-TR",EN:"en-GB",DE:"de-DE",FR:"fr-FR",ES:"es-ES",RU:"ru-RU",ZH:"zh-CN",AR:"ar",KU:"ku"} as Record<string,string>)[this.ui.currentLang()]||"tr-TR";return date?new Intl.DateTimeFormat(loc,{day:"2-digit",month:"short"}).format(date):value;}
  private toDateInput(date:Date):string{const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);return local.toISOString().slice(0,10);}
}