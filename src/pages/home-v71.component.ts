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
    <main class="home-root" [class.home-shell-degraded]="homepageLayout.error() || (!homepageLayout.loading() && managedSections().length === 0)">
      <section class="hero" [style.backgroundImage]="heroImage() ? 'url(' + heroImage() + ')' : 'none'" aria-labelledby="home-title">
        <div class="hero-shade" aria-hidden="true"></div>
        <div class="hero-stage" [class.planner-disabled]="!plannerEnabled()">
          <div class="hero-copy-block">
            <p class="eyebrow">@for (part of eyebrowParts(); track $index) {<span class="eyebrow-part">{{ part }}</span>&ngsp;}</p>
            <h1 id="home-title">{{ t().homePage.title }}</h1>
            <p class="hero-copy">{{ t().homePage.subtitle }}</p>
            <div class="desktop-search" role="search" [attr.aria-label]="t().homePage.searchAria"><label class="sr-only" for="home-search-v80">{{ t().homePage.searchAria }}</label><div class="search-shell"><mat-icon aria-hidden="true">search</mat-icon><input id="home-search-v80" type="search" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" autocomplete="off" [attr.aria-label]="t().homePage.searchAria" [placeholder]="t().homePage.searchPlaceholder" /><button type="button" (click)="performSearch()" [attr.aria-label]="t().homePage.searchStartAria">{{ t().homePage.searchButton }}</button></div></div>
            <div class="trust-row" [attr.aria-label]="t().homePage.trustAria"><span><mat-icon aria-hidden="true">verified</mat-icon>{{ t().homePage.trustPrice }}</span><span><mat-icon aria-hidden="true">support_agent</mat-icon>{{ t().homePage.trustSupport }}</span><span><mat-icon aria-hidden="true">fact_check</mat-icon>{{ t().homePage.trustVerified }}</span></div>
          </div>

          @if (plannerEnabled()) {
          <!-- V253 stable planner: every interaction keeps the card's geometry. Service/duration
               switches never add or remove rows; the three date modes share one grid cell so the
               block is always as tall as its tallest mode; summary/error live in reserved slots. -->
          <aside class="planner" [class.planner-compact]="plannerVariant() === 'compact'" [attr.data-when-mode]="whenMode()" aria-labelledby="planner-title">
            <div class="planner-head"><div><p class="planner-kicker">{{ t().homePage.plannerKicker }}</p><h2 id="planner-title">{{ t().homePage.bookingTitle }}</h2><p>{{ t().homePage.bookingSubtitle }}</p></div><span class="planner-icon" aria-hidden="true"><mat-icon>event_available</mat-icon></span></div>

            <div class="field-grid">
              @for (field of plannerFieldOrder(); track field) {
                @switch (field) {
                  @case ('service') {
                    <label class="field field-service"><span class="field-label">{{ t().homePage.serviceLabel }}</span><select [(ngModel)]="serviceType" name="homeService" (ngModelChange)="onServiceChanged()" [attr.aria-label]="t().homePage.serviceLabel">@for (option of plannerServiceOptions(); track option.value) {<option [value]="option.value">{{ option.label }}</option>}</select></label>
                  }
                  @case ('pickup') {
                    @if (serviceType !== 'tour') {
                      <label class="field field-pickup"><span class="field-label">{{ t().homePage.pickupLabel }}</span><select [(ngModel)]="selectedPickupKey" name="homePickup" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.pickupAria"><option value="">{{ pickupChoices().length ? t().homePage.pickupPlaceholder : t().homePage.pickupAny }}</option>@for (choice of pickupChoices(); track choice.key) { <option [value]="choice.key">{{ choice.label }}</option> }</select></label>
                    } @else {
                      <div class="field field-pickup"><span class="field-label">{{ t().homePage.pickupLabel }}</span><p class="field-static"><mat-icon aria-hidden="true">tour</mat-icon><span>{{ t().homePage.tourIncluded }}</span></p></div>
                    }
                  }
                  @case ('duration') {
                    @if (serviceType !== 'tour') {
                      <label class="field field-duration"><span class="field-label">{{ t().homePage.durationLabel }}</span><select [(ngModel)]="rentalDuration" name="homeDuration" (ngModelChange)="onDurationChanged()" [attr.aria-label]="t().homePage.durationAria">@for (option of plannerDurationOptions(); track option.value) {<option [value]="option.value">{{ option.label }}</option>}</select></label>
                    } @else {
                      <div class="field field-duration"><span class="field-label">{{ t().homePage.durationLabel }}</span><p class="field-static"><mat-icon aria-hidden="true">schedule</mat-icon><span>{{ t().homePage.tourIncluded }}</span></p></div>
                    }
                  }
                  @case ('date') {
                    <div class="when-stack">
                      <div class="when-variant when-range" [class.is-active]="whenMode() === 'range'" [attr.aria-hidden]="whenMode() === 'range' ? null : 'true'" [attr.inert]="whenMode() === 'range' ? null : ''">
                        <div class="date-grid"><app-accessible-native-date [label]="t().homePage.startDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /><app-accessible-native-date [label]="t().homePage.endDateLabel" [value]="endDate" [min]="startDate || today" (valueChange)="onEndDateChanged($event)" /></div>
                        <p class="planner-summary" [class.is-hint]="!plannerSummary()" [attr.aria-live]="whenMode() === 'range' ? 'polite' : null">{{ plannerSummary() || t().homePage.summaryHint }}</p>
                      </div>
                      <div class="when-variant when-hourly" [class.is-active]="whenMode() === 'hourly'" [attr.aria-hidden]="whenMode() === 'hourly' ? null : 'true'" [attr.inert]="whenMode() === 'hourly' ? null : ''">
                        <div class="date-grid single-date"><app-accessible-native-date [label]="t().homePage.hourlyDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /></div>
                        <div class="time-grid"><label class="field"><span class="field-label">{{ t().homePage.startTimeLabel }}</span><input type="time" [(ngModel)]="startTime" name="homeStartTime" step="900" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.startTimeAria" /></label><label class="field"><span class="field-label">{{ t().homePage.endTimeLabel }}</span><input type="time" [(ngModel)]="endTime" name="homeEndTime" step="900" (ngModelChange)="clearPlannerError()" [attr.aria-label]="t().homePage.endTimeAria" /></label></div>
                      </div>
                      <div class="when-variant when-tour" [class.is-active]="whenMode() === 'tour'" [attr.aria-hidden]="whenMode() === 'tour' ? null : 'true'" [attr.inert]="whenMode() === 'tour' ? null : ''">
                        <div class="date-grid single-date"><app-accessible-native-date [label]="t().homePage.tourDateLabel" [value]="startDate" [min]="today" (valueChange)="onStartDateChanged($event)" /></div>
                        <p class="planner-summary" [class.is-hint]="!plannerSummary()" [attr.aria-live]="whenMode() === 'tour' ? 'polite' : null">{{ plannerSummary() || t().homePage.summaryHint }}</p>
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <button type="button" class="planner-action" (click)="searchAvailability()" [attr.aria-label]="bookingButtonLabel()"><span class="action-labels" aria-hidden="true">@for (label of bookingButtonLabels(); track $index) {<span [class.is-active]="label === bookingButtonLabel()">{{ label }}</span>}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
            <div class="planner-feedback">
              @if (plannerError) { <p class="planner-error" role="alert">{{ plannerError }}</p> } @else { <p class="planner-note">{{ t().homePage.plannerNote }}</p> }
            </div>
          </aside>
          }
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {<div class="loading" role="status"><mat-icon aria-hidden="true">sync</mat-icon><span>{{ t().homePage.loading }}</span></div>}
      <!-- v248: sections (DB -> last-good snapshot -> built-in defaults) own their degraded state; the
           page-level alert only appears if there is truly nothing to render. -->
      @if (homepageLayout.error() && !homepageLayout.loading() && managedSections().length === 0) {
        <section class="home-shell-error" role="alert" aria-live="polite">
          <mat-icon aria-hidden="true">cloud_off</mat-icon>
          <div>
            <h2>{{ homeShellErrorTitle() }}</h2>
            <p>{{ homepageLayout.error() }}</p>
            <button type="button" (click)="retryHomeShell()">{{ homeShellRetryLabel() }}</button>
          </div>
        </section>
      }
      @for (section of managedSections(); track section.sectionKey) {
        <app-dynamic-home-section [section]="section"></app-dynamic-home-section>
      }
      @if (!homepageLayout.loading() && managedSections().length === 0 && !homepageLayout.error()) {
        <section class="home-shell-empty" role="status">
          <mat-icon aria-hidden="true">inventory_2</mat-icon>
          <div>
            <h2>{{ homeShellEmptyTitle() }}</h2>
            <p>{{ homeShellEmptyBody() }}</p>
            <button type="button" (click)="retryHomeShell()">{{ homeShellRetryLabel() }}</button>
          </div>
        </section>
      }
    </main>
  `,
  styles: [`.home-shell-error,.home-shell-empty{width:min(100% - 1.5rem,80rem);margin:1.25rem auto;display:flex;gap:1rem;align-items:flex-start;border:1px solid rgba(251,191,36,.35);border-radius:18px;background:#fffbeb;padding:1.1rem 1.2rem;color:#92400e}.home-shell-empty{border-color:#cbd5e1;background:#f8fafc;color:#334155}.home-shell-error h2,.home-shell-empty h2{margin:0 0 .35rem;font-size:1.15rem}.home-shell-error p,.home-shell-empty p{margin:0;line-height:1.55}.home-shell-error button,.home-shell-empty button{margin-top:.8rem;min-height:42px;border:0;border-radius:11px;background:#ea580c;padding:0 1rem;color:#fff;font-weight:850;cursor:pointer}.home-shell-empty button{background:#0f172a}
:host, .page, .hero{overflow-x:clip;overflow-wrap:anywhere;}
    .home-root{min-height:calc(100dvh + 280px)}
    .home-root,.home-root *{box-sizing:border-box}
    .hero{position:relative;isolation:isolate;overflow:hidden;background:var(--alper-bg,#06080D) center/cover no-repeat;color:var(--alper-text,#F8F6F1)}
    .hero-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,color-mix(in srgb,var(--alper-bg,#020617) 97%,transparent),color-mix(in srgb,var(--alper-bg,#020617) 88%,transparent) 52%,color-mix(in srgb,var(--alper-bg,#020617) 67%,transparent)),radial-gradient(circle at 85% 12%,color-mix(in srgb,var(--alper-blue,#9E1B24) 28%,transparent),transparent 32%)}
    /* V253 canonical hero type + control scale. One fluid clamp() per role, from 320px phones to
       2560px desktops, so no breakpoint jumps and no global override is needed. Casing system:
       eyebrow/kicker = uppercase + tracking (lang-aware via <html lang>), headings/labels/body =
       sentence case as authored, buttons = authored case at one shared height scale. */
    .hero-stage{--hero-gutter:clamp(.875rem,3.4vw,1.25rem);--hero-eyebrow:clamp(.75rem,.7rem + .22vw,.875rem);--hero-h1:clamp(2rem,1.4rem + 3.05vw,4.75rem);--hero-sub:clamp(1rem,.94rem + .3vw,1.1875rem);--planner-h2:clamp(1.375rem,1.2rem + .62vw,1.875rem);--control-h:clamp(3rem,2.85rem + .5vw,3.375rem);--action-h:clamp(3.25rem,3.1rem + .5vw,3.625rem);--field-label:clamp(.8125rem,.78rem + .12vw,.875rem);width:min(100% - 2 * var(--hero-gutter),var(--site-content-max,80rem));margin:auto;padding:clamp(1rem,.6rem + 2.4vw,3.6rem) 0 clamp(1.25rem,.8rem + 2.6vw,4.1rem);display:grid;gap:clamp(.9rem,.7rem + 1vw,1.45rem)}
    .hero-stage>*{min-width:0}
    .hero-copy-block{min-width:0}
    .eyebrow,.planner-kicker{margin:0;color:var(--alper-gold,#D4AF37);font-size:var(--hero-eyebrow);font-weight:800;letter-spacing:.14em;text-transform:uppercase;line-height:1.4;overflow-wrap:anywhere}
    .planner-kicker{font-size:.75rem}
    .hero h1{max-width:18ch;margin:clamp(.5rem,.4rem + .4vw,.8rem) 0 0;font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-size:var(--hero-h1);font-weight:600;line-height:1.08;letter-spacing:-.018em;overflow-wrap:break-word;hyphens:manual;text-wrap:balance}
    .hero-copy{max-width:40rem;margin:clamp(.6rem,.5rem + .4vw,.9rem) 0 0;color:color-mix(in srgb,var(--alper-text,#F8F6F1) 80%,var(--alper-muted,#B8B4AA));font-size:var(--hero-sub);line-height:1.6;overflow-wrap:break-word;text-wrap:pretty}
    .desktop-search{display:none;max-width:650px;margin-top:clamp(1rem,.8rem + .6vw,1.4rem)}
    .search-shell{display:flex;min-width:0;align-items:center;gap:.5rem;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 70%,transparent);border-radius:var(--site-radius,16px);background:color-mix(in srgb,var(--alper-surface,#0D1118) 88%,transparent);padding:.375rem .375rem .375rem .85rem;box-shadow:var(--alper-shadow,0 18px 50px rgba(0,0,0,.24))}
    .search-shell mat-icon{flex:none;color:var(--alper-muted,#B8B4AA)}
    .search-shell input{min-width:0;max-width:100%;min-height:var(--control-h);flex:1;border:0;background:transparent;padding:0 .15rem;color:var(--alper-text,#F8F6F1);font-size:1rem;outline:none}
    .search-shell button{min-height:var(--control-h);flex:none;border:0;border-radius:12px;background:linear-gradient(135deg,var(--alper-blue,#9E1B24),#7A0D15);padding:0 1.35rem;color:#fff;font-size:1rem;font-weight:700;letter-spacing:.01em}
    .search-shell button:focus-visible{outline:3px solid var(--alper-blue-light,#E15A62);outline-offset:2px}
    .trust-row{display:flex;min-width:0;flex-wrap:wrap;gap:.55rem;margin-top:clamp(.9rem,.8rem + .4vw,1.2rem)}
    .trust-row span{display:inline-flex;min-width:0;max-width:100%;min-height:2.5rem;align-items:center;gap:.45rem;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--alper-elevated,#171D26) 55%,transparent);padding:.45rem .9rem;color:color-mix(in srgb,var(--alper-text,#F8F6F1) 86%,var(--alper-muted));font-size:clamp(.8125rem,.79rem + .1vw,.875rem);font-weight:650;line-height:1.3;overflow-wrap:break-word}
    .trust-row mat-icon{width:18px;height:18px;flex:none;font-size:18px;color:var(--alper-gold,#D4AF37)}
    .planner{width:100%;min-width:0;border:1px solid color-mix(in srgb,var(--alper-border,#303846) 80%,var(--alper-gold,#D4AF37) 20%);border-radius:calc(var(--site-radius,18px) + 4px);background:linear-gradient(180deg,color-mix(in srgb,var(--alper-card,#11161E) 92%,var(--alper-elevated,#171D26)),var(--alper-surface,#0D1118));padding:clamp(1.05rem,.85rem + 1vw,1.6rem);box-shadow:var(--alper-shadow,0 24px 54px rgba(2,6,23,.36));isolation:isolate;backdrop-filter:blur(8px);overflow-anchor:none}
    /* Icon sits beside kicker+title only; the explanation uses the full card width (no 5-line squeeze at 320px). */
    .planner-head{display:grid;min-width:0;grid-template-columns:minmax(0,1fr) auto;column-gap:.85rem;align-items:start}
    .planner-head>div{display:contents}
    .planner-head .planner-kicker,.planner-head h2{grid-column:1}
    .planner-head p:not(.planner-kicker){grid-column:1/-1}
    .planner-icon{grid-column:2;grid-row:1/span 2;align-self:center}
    .eyebrow-part{white-space:nowrap}
    .eyebrow-part:not(:last-child)::after{content:"\\00a0\\00b7";content:"\\00a0\\00b7" / ""}
    .planner h2{margin:.35rem 0 0;font-family:"Playfair Display",Georgia,"Times New Roman",serif;font-size:var(--planner-h2);font-weight:600;line-height:1.18;letter-spacing:-.012em;overflow-wrap:break-word;color:var(--alper-text,#F8F6F1)}
    .planner-head p:not(.planner-kicker){margin:.45rem 0 0;color:var(--alper-muted,#B8B4AA);font-size:clamp(.9375rem,.9rem + .15vw,1rem);line-height:1.5;overflow-wrap:break-word}
    .planner-icon{display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:14px;background:color-mix(in srgb,var(--alper-gold,#D4AF37) 18%,transparent);color:var(--alper-gold,#D4AF37);border:1px solid color-mix(in srgb,var(--alper-gold,#D4AF37) 28%,transparent)}
    /* Fields: sentence-case labels in a readable size (no uppercase questions), one control
       height for selects, inputs and date buttons, and controls aligned to the row bottom so
       labels that wrap in one language never push a neighbour down. */
    .field-grid{display:grid;min-width:0;grid-template-columns:minmax(0,1fr);align-items:end;gap:.85rem;margin-top:clamp(1rem,.9rem + .5vw,1.3rem)}
    .field{display:flex;min-width:0;max-width:100%;flex-direction:column;gap:.4rem}
    .field-label,.field>span{min-width:0;color:color-mix(in srgb,var(--alper-muted,#B8B4AA) 88%,#fff);font-size:var(--field-label);font-weight:700;letter-spacing:.005em;text-transform:none;line-height:1.3;overflow-wrap:break-word}
    .field select,.field input{width:100%;min-width:0;max-width:100%;height:var(--control-h);min-height:var(--control-h);border:1px solid var(--alper-border,#303846);border-radius:12px;background:var(--alper-elevated,#171D26);padding:0 .95rem;color:var(--alper-text,#F8F6F1);font-size:1rem;font-weight:600;outline:none;text-overflow:ellipsis;white-space:nowrap}
    .field select:focus,.field input:focus{border-color:var(--alper-gold,#D4AF37);box-shadow:var(--alper-focus-ring,0 0 0 3px color-mix(in srgb,var(--alper-gold,#D4AF37) 22%,transparent))}
    .field-static{display:flex;height:var(--control-h);min-width:0;align-items:center;gap:.55rem;margin:0;border:1px dashed color-mix(in srgb,var(--alper-gold,#D4AF37) 32%,var(--alper-border,#303846));border-radius:12px;background:color-mix(in srgb,var(--alper-elevated,#171D26) 60%,transparent);padding:0 .95rem;color:var(--alper-muted,#B8B4AA);font-size:.9375rem;font-weight:600;line-height:1.25}
    .field-static mat-icon{width:20px;height:20px;flex:none;font-size:20px;color:var(--alper-gold,#D4AF37)}
    .field-static span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .when-stack{display:grid;min-width:0;grid-template-areas:"when";grid-column:1/-1}
    .when-variant{grid-area:when;display:flex;min-width:0;flex-direction:column;gap:.75rem;visibility:hidden}
    .when-variant.is-active{visibility:visible}
    .when-variant app-accessible-native-date{--date-label-size:var(--field-label);--date-label-weight:700;--date-label-transform:none;--date-label-spacing:.005em;--date-label:color-mix(in srgb,var(--alper-muted,#B8B4AA) 88%,#fff);--date-surface-h:var(--control-h);--date-surface-pad:.3rem .8rem .3rem .95rem;--date-bg:rgba(5,7,11,.86);--date-border:rgba(212,175,55,.19);--date-icon:var(--alper-gold,#D4AF37)}
    .date-grid,.time-grid{display:grid;min-width:0;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:end;gap:.7rem}
    .date-grid>*,.time-grid>*{min-width:0}
    .date-grid.single-date{grid-template-columns:minmax(0,1fr)}
    .planner-summary{display:-webkit-box;flex:1 0 auto;min-height:calc(3 * 1.45em + 1.5rem);max-height:calc(3 * 1.45em + 1.5rem);margin:0;overflow:hidden;border-radius:12px;background:color-mix(in srgb,var(--alper-gold,#D4AF37) 10%,transparent);border:1px solid color-mix(in srgb,var(--alper-gold,#D4AF37) 22%,transparent);padding:.75rem .9rem;color:var(--alper-text,#F8F6F1);font-size:.9375rem;font-weight:650;line-height:1.45;overflow-wrap:break-word;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3}
    .planner-summary.is-hint{background:transparent;border-style:dashed;border-color:color-mix(in srgb,var(--alper-border,#303846) 90%,transparent);color:var(--alper-muted,#B8B4AA);font-weight:550}
    .planner-action{display:flex;width:100%;min-width:0;min-height:var(--action-h);margin-top:1.1rem;align-items:center;justify-content:center;gap:.5rem;border:0;border-radius:14px;background:linear-gradient(135deg,var(--alper-blue,#9E1B24),#7A0D15);padding:.7rem 1.1rem;color:#fff;font-size:clamp(1rem,.97rem + .12vw,1.0625rem);font-weight:750;line-height:1.25;letter-spacing:.01em;box-shadow:0 16px 34px color-mix(in srgb,var(--alper-blue,#9E1B24) 28%,transparent);transition:box-shadow .15s ease,filter .15s ease}
    .planner-action:hover{box-shadow:var(--alper-shadow-hover,0 22px 58px rgba(0,0,0,.3));filter:brightness(1.06)}
    /* Every mode's label is stacked in one cell, so the button is always as tall as its longest label (in any language) and switching service/duration never resizes it. */
    .action-labels{display:grid;min-width:0;grid-template-areas:"label";text-align:center}
    .action-labels>span{grid-area:label;min-width:0;overflow-wrap:break-word;visibility:hidden}
    .action-labels>span.is-active{visibility:visible}
    .planner-action mat-icon{flex:none}
    .planner-action:focus-visible{outline:3px solid var(--alper-blue-light,#E15A62);outline-offset:3px}
    /* Reserved two-line feedback slot under the action: the reassurance note by default, the
       validation error (role=alert) in the same box, so validating never moves anything. */
    .planner-feedback{display:flex;min-height:calc(2 * 1.45 * .875rem + .9rem);margin-top:.6rem;align-items:flex-start}
    .planner-error,.planner-note{display:-webkit-box;width:100%;margin:0;overflow:hidden;font-size:.875rem;line-height:1.45;overflow-wrap:break-word;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2}
    .planner-note{padding:.45rem .1rem;color:var(--alper-muted,#B8B4AA)}
    .planner-error{border-radius:10px;background:color-mix(in srgb,var(--alper-blue,#9E1B24) 16%,transparent);border:1px solid color-mix(in srgb,var(--alper-blue-light,#E15A62) 40%,transparent);padding:.4rem .7rem;color:#FFB4B8;font-weight:700}
    .loading{display:flex;min-height:110px;align-items:center;justify-content:center;gap:.45rem;background:var(--alper-surface,#fff);color:var(--alper-muted,#475569);font-size:.92rem;font-weight:700}
    .loading mat-icon{color:var(--alper-blue,#9E1B24)}
    /* Phones: pickup and return dates get the full width so "Datum wählen", "Seleccionar fecha"
       and formatted dates are never cut off in a cramped half-column. */
    @media(max-width:439px){
      .date-grid:not(.single-date){grid-template-columns:minmax(0,1fr)}
    }
    @media(max-width:359px){
      .planner-icon{width:44px;height:44px}
    }
    @media(min-width:640px){
      .field-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
      .field-service{grid-column:1/-1}
      .planner-summary{min-height:calc(2 * 1.45em + 1.5rem);max-height:calc(2 * 1.45em + 1.5rem);-webkit-line-clamp:2;line-clamp:2}
    }
    @media(min-width:768px){
      .home-root{padding-bottom:0}
      .hero-stage{--hero-gutter:clamp(1.25rem,3vw,2.5rem)}
      .desktop-search{display:block}
    }
    @media(min-width:1024px){
      .hero-stage{--hero-gutter:clamp(1.5rem,3.2vw,3rem);grid-template-columns:minmax(0,1.12fr) minmax(min(420px,100%),.88fr);align-items:center;gap:clamp(2rem,3.4vw,3.2rem);padding:clamp(4rem,2rem + 3vw,6rem) 0 clamp(4.5rem,2.4rem + 3.2vw,6.6rem)}
    }
    .planner.planner-compact{padding:clamp(.95rem,.8rem + .8vw,1.3rem)}
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
    const choices=this.pickupChoices();const pickup=choices.find((item)=>item.key===this.selectedPickupKey);// V253: while branches cannot be read (quota/offline) the pickup point is decided later with the team instead of blocking the fastest path to the fleet.
    if(!pickup&&choices.length){this.plannerError=this.t().homePage.errorPickup;return;}const driverMode=this.serviceType==="individual"?"without":"with";void this.router.navigate(["/fleet"],{queryParams:{duration:this.rentalDuration,start:this.startDate,end:this.rentalDuration==="hourly"?this.startDate:this.endDate,startTime:this.rentalDuration==="hourly"?this.startTime:undefined,endTime:this.rentalDuration==="hourly"?this.endTime:undefined,pickup:pickup?.branchId,pickupLocation:pickup?.label,driverMode,availableOnly:"true",occasion:this.serviceType==="wedding"?"wedding":undefined}});}
  plannerSummary():string{if(!this.startDate)return"";const hp=this.t().homePage;const pickup=this.pickupChoices().find((item)=>item.key===this.selectedPickupKey);const dates=this.serviceType==="tour"?this.formatShortDate(this.startDate):this.rentalDuration==="hourly"?`${this.formatShortDate(this.startDate)} · ${this.startTime}-${this.endTime}`:`${this.formatShortDate(this.startDate)} - ${this.endDate?this.formatShortDate(this.endDate):"?"}`;const mode=this.serviceType==="individual"?hp.summarySelf:this.serviceType==="driver"?hp.summaryDriver:this.serviceType==="wedding"?hp.summaryWedding:hp.summaryTour;const duration=this.serviceType==="tour"?"":(this.plannerDurationOptions().find((item)=>item.value===this.rentalDuration)?.label||this.rentalDuration);return[dates,duration,mode,pickup?.label].filter(Boolean).join(" · ");}
  /** Which date block is active; all three are rendered in one grid cell so switching never resizes the card. */
  whenMode():"range"|"hourly"|"tour"{return this.serviceType==="tour"?"tour":this.rentalDuration==="hourly"?"hourly":"range";}
  /** Eyebrow segments: separators stay glued to the preceding word so a wrap never starts a line with "·". */
  eyebrowParts():string[]{return String(this.t().homePage.trustLine||"").split(/\s*[·•|]\s*/).map((part)=>part.trim()).filter(Boolean);}
  /** All possible action labels (deduplicated) for the stacked, fixed-height button. */
  bookingButtonLabels():string[]{const hp=this.t().homePage;return Array.from(new Set([hp.buttonRental,hp.buttonHourly,hp.buttonDriver,hp.buttonWedding,hp.buttonTour].map((item)=>String(item||""))));}
  bookingButtonLabel():string{const hp=this.t().homePage;if(this.serviceType==="tour")return hp.buttonTour;if(this.rentalDuration==="hourly")return hp.buttonHourly;if(this.serviceType==="driver")return hp.buttonDriver;if(this.serviceType==="wedding")return hp.buttonWedding;return hp.buttonRental;}
  homeShellErrorTitle():string{
    const pack=(this.t() as any)?.homePage||{};
    return String(pack.shellErrorTitle||'İçerik şu an yüklenemedi').trim();
  }
  homeShellEmptyTitle():string{
    const pack=(this.t() as any)?.homePage||{};
    return String(pack.shellEmptyTitle||'Gösterilecek bölüm yok').trim();
  }
  homeShellEmptyBody():string{
    const pack=(this.t() as any)?.homePage||{};
    return String(pack.shellEmptyBody||'Ana sayfa bölümleri şu an boş. Lütfen biraz sonra tekrar deneyin.').trim();
  }
  homeShellRetryLabel():string{
    const pack=(this.t() as any)?.homePage||{};
    return String(pack.retry||pack.shellRetry||'Tekrar Dene').trim();
  }
  retryHomeShell():void{ void this.homepageLayout.refreshPublicState(); }
  private minutes(value:string):number|null{const match=/^(\d{2}):(\d{2})$/.exec(value||"");if(!match)return null;const h=Number(match[1]),m=Number(match[2]);return h>=0&&h<=23&&m>=0&&m<=59?h*60+m:null;}
  private parseLocalDate(value:string):Date|null{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||"");if(!match)return null;const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));return Number.isNaN(date.getTime())?null:date;}
  private formatShortDate(value:string):string{const date=this.parseLocalDate(value);const loc=({TR:"tr-TR",EN:"en-GB",DE:"de-DE",FR:"fr-FR",ES:"es-ES",RU:"ru-RU",ZH:"zh-CN",AR:"ar",KU:"ku"} as Record<string,string>)[this.ui.currentLang()]||"tr-TR";return date?new Intl.DateTimeFormat(loc,{day:"2-digit",month:"short"}).format(date):value;}
  private toDateInput(date:Date):string{const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);return local.toISOString().slice(0,10);}
}