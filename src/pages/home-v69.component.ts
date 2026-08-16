import { CommonModule } from "@angular/common";
import { Component, DestroyRef, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Vehicle } from "../models/car.model";
import { BranchService } from "../services/branch.service";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { BlogPost, CarService } from "../services/car.service";
import { HomepageLayoutService, PublicHomepageSection } from "../services/homepage-layout.service";
import { SeoService } from "../services/seo.service";

@Component({
  selector: "app-home-v69",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent],
  styles: [`
    :host{display:block;background:#030817;color:#e8eef8}
    *{box-sizing:border-box}
    .hero{position:relative;isolation:isolate;overflow:hidden;background:#061022 center/cover no-repeat;perspective:1200px}
    .hero::before{content:"";position:absolute;inset:0;z-index:-3;background:linear-gradient(180deg,rgba(2,6,23,.82),rgba(2,6,23,.97))}
    .hero::after{content:"";position:absolute;inset:-12%;z-index:-2;pointer-events:none;background:radial-gradient(circle at 84% 16%,rgba(37,99,235,.3),transparent 31%),radial-gradient(circle at 11% 82%,rgba(14,116,144,.15),transparent 30%);animation:ambientShift 12s ease-in-out infinite alternate}
    .orb{position:absolute;z-index:-1;border-radius:999px;filter:blur(12px);opacity:.22;pointer-events:none;transform-style:preserve-3d}
    .orb-a{right:-65px;top:82px;width:180px;height:180px;background:rgba(37,99,235,.46);animation:floatA 9s ease-in-out infinite}
    .orb-b{left:-80px;bottom:18px;width:150px;height:150px;background:rgba(14,116,144,.34);animation:floatB 11s ease-in-out infinite}
    .hero-inner{width:min(100% - 1.35rem,80rem);margin:auto;padding:.95rem 0 1.15rem;display:grid;gap:.8rem}
    .hero-copy-block{min-width:0}
    .eyebrow{display:inline-flex;align-items:center;min-height:28px;width:max-content;max-width:100%;border:1px solid rgba(147,197,253,.24);border-radius:999px;background:rgba(15,23,42,.48);padding:.34rem .68rem;font-size:.61rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#bfdbfe;backdrop-filter:blur(12px)}
    .hero h1{margin:.62rem 0 0;max-width:840px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.95rem,8.5vw,2.8rem);line-height:1;letter-spacing:-.03em;color:#fff;text-wrap:balance}
    .hero-copy{margin:.58rem 0 0;max-width:700px;font-size:.86rem;line-height:1.55;color:#d5deeb}
    .desktop-search{display:none;margin-top:1rem;max-width:650px}
    .search-shell{display:flex;align-items:center;gap:.5rem;min-height:54px;border:1px solid rgba(255,255,255,.15);border-radius:16px;background:rgba(3,8,23,.64);padding:.35rem;backdrop-filter:blur(14px);box-shadow:0 18px 42px rgba(2,6,23,.26)}
    .search-shell input{min-width:0;flex:1;border:0;background:transparent;padding:.7rem .3rem;color:#fff;font:700 .88rem/1.2 inherit;outline:none}.search-shell input::placeholder{color:#94a3b8}.search-shell button{min-height:43px;border:0;border-radius:12px;background:#2563eb;padding:0 1rem;color:#fff;font-weight:900;cursor:pointer}
    .planner{position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:22px;background:linear-gradient(155deg,rgba(9,19,38,.97),rgba(7,15,30,.93));padding:.88rem;box-shadow:0 24px 56px rgba(2,6,23,.32),inset 0 1px 0 rgba(255,255,255,.055);backdrop-filter:blur(18px);transform-style:preserve-3d}
    .planner::before{content:"";position:absolute;right:-35%;top:-45%;width:78%;aspect-ratio:1;border-radius:999px;background:radial-gradient(circle,rgba(37,99,235,.16),transparent 65%);pointer-events:none}
    .planner-head{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem}.planner-kicker{margin:0;color:#93c5fd;font-size:.59rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.planner h2{margin:.2rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.48rem;line-height:1.05;color:#fff}.planner-copy{margin:.36rem 0 0;color:#9caabd;font-size:.72rem;line-height:1.45}.planner-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 40px;border-radius:14px;background:rgba(37,99,235,.15);color:#93c5fd}
    .field-grid{position:relative;display:grid;grid-template-columns:1fr;gap:.58rem;margin-top:.78rem}.field{display:block;min-width:0}.field-label{display:block;margin:0 0 .3rem;color:#aab6c8;font-size:.62rem;font-weight:900;letter-spacing:.065em;text-transform:uppercase}.control,.date-button{width:100%;min-height:46px;border:1px solid rgba(148,163,184,.18);border-radius:13px;background:#050b18;padding:0 .78rem;color:#fff;font:780 .8rem/1.2 inherit;outline:none}.control:focus,.date-button:focus-visible{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.16)}select.control{appearance:auto}.date-row{display:grid;grid-template-columns:1fr 1fr;gap:.58rem}.date-button{display:flex;align-items:center;justify-content:space-between;gap:.45rem;text-align:left;cursor:pointer}.date-button span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.date-button mat-icon{width:19px;height:19px;font-size:19px;flex:0 0 19px;color:#93c5fd}.date-proxy{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
    .planner-action{display:flex;width:100%;min-height:48px;margin-top:.72rem;align-items:center;justify-content:center;gap:.45rem;border:0;border-radius:13px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:.82rem;font-weight:900;cursor:pointer;box-shadow:0 13px 28px rgba(37,99,235,.19);transition:transform .18s ease,box-shadow .18s ease}.planner-action:active{transform:translateY(1px)}.planner-action:focus-visible{outline:3px solid rgba(147,197,253,.82);outline-offset:2px}.planner-note{margin:.5rem 0 0;color:#7f8ca0;font-size:.64rem;line-height:1.4}
    .section{position:relative;padding:2rem 0}.section.light{background:#f8fafc;color:#0f172a}.section.dark{background:#050b18;color:#f8fafc}.section.soft{background:#eef3f9;color:#0f172a}.section-inner{width:min(100% - 1.35rem,80rem);margin:auto}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:.9rem}.section-kicker{margin:0;color:#2563eb;font-size:.61rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.dark .section-kicker,.campaigns .section-kicker{color:#93c5fd}.section h2{margin:.24rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.55rem,6.5vw,2.55rem);line-height:1.04;text-wrap:balance}.section-desc{margin:.42rem 0 0;max-width:760px;color:#64748b;font-size:.79rem;line-height:1.55}.dark .section-desc,.campaigns .section-desc{color:#a5b1c4}.view-all{display:none;min-height:42px;align-items:center;gap:.2rem;border-radius:11px;padding:0 .7rem;color:inherit;font-size:.74rem;font-weight:900;text-decoration:none}.view-all:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
    .showcase-strip,.tour-strip,.campaign-strip,.blog-strip{display:flex;gap:.78rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:.15rem .05rem .8rem;scrollbar-width:none;overscroll-behavior-inline:contain}.showcase-strip::-webkit-scrollbar,.tour-strip::-webkit-scrollbar,.campaign-strip::-webkit-scrollbar,.blog-strip::-webkit-scrollbar{display:none}.showcase-card{flex:0 0 min(82vw,326px);scroll-snap-align:start;min-width:0;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.09);transition:transform .2s ease,box-shadow .2s ease}.showcase-card:active{transform:scale(.99)}
    .tour-card,.blog-card{position:relative;flex:0 0 min(82vw,338px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:21px;background:#0d1728;color:#fff;text-decoration:none;box-shadow:0 18px 38px rgba(0,0,0,.18);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}.blog-card{border-color:#dbe3ee;background:#fff;color:#0f172a;box-shadow:0 12px 28px rgba(15,23,42,.08)}.tour-card:active,.blog-card:active{transform:scale(.987)}.tour-card:focus-visible,.blog-card:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.card-image{aspect-ratio:16/10;overflow:hidden;background:#111827}.card-image img{width:100%;height:100%;object-fit:cover;transition:transform .36s ease}.card-body{padding:.92rem}.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem}.card-title{margin:0;font-size:.96rem;line-height:1.28;font-weight:900}.card-price{flex:0 0 auto;color:#fbbf24;font-size:.8rem;font-weight:900}.card-desc{margin:.5rem 0 0;color:#a8b4c7;font-size:.73rem;line-height:1.5}.blog-card .card-desc{color:#64748b}.link-cue{display:inline-flex;margin-top:.72rem;align-items:center;gap:.18rem;color:#fbbf24;font-size:.71rem;font-weight:900}.blog-card .link-cue{color:#2563eb}
    .campaigns{overflow:hidden;background:linear-gradient(145deg,#071124,#0b1529 55%,#111827);color:#fff}.campaigns::before{content:"";position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(circle at 8% 18%,rgba(37,99,235,.2),transparent 30%),radial-gradient(circle at 90% 82%,rgba(245,158,11,.1),transparent 30%);animation:ambientShift 15s ease-in-out infinite alternate}.campaign-card{position:relative;flex:0 0 min(87vw,352px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:21px;background:#fff;color:#0f172a;text-decoration:none;box-shadow:0 20px 44px rgba(2,6,23,.25);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;transform-style:preserve-3d}.campaign-card:active{transform:scale(.986)}.campaign-card:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.campaign-media{position:relative;aspect-ratio:16/8.8;overflow:hidden;background:#172033}.campaign-media img{width:100%;height:100%;object-fit:cover;transition:transform .38s ease}.campaign-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.63),transparent 58%)}.campaign-badge{position:absolute;z-index:2;left:.68rem;top:.68rem;max-width:calc(100% - 1.36rem);border-radius:999px;background:rgba(2,6,23,.9);padding:.34rem .58rem;color:#f8fafc;font-size:.56rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.campaign-time{position:absolute;z-index:2;left:.68rem;bottom:.62rem;border-radius:999px;background:#fff;padding:.32rem .55rem;color:#0f172a;font-size:.58rem;font-weight:900}.campaign-body{padding:.92rem}.campaign-title{margin:0;font-size:1rem;line-height:1.25;font-weight:950}.campaign-copy{margin:.48rem 0 0;color:#536176;font-size:.74rem;line-height:1.5}.campaign-bottom{display:flex;margin-top:.78rem;align-items:end;justify-content:space-between;gap:.68rem}.old-price{display:block;color:#94a3b8;font-size:.64rem;font-weight:760;text-decoration:line-through}.new-price{display:block;margin-top:.03rem;color:#0f172a;font-size:1rem;font-weight:950}.campaign-cta{display:inline-flex;min-height:39px;align-items:center;gap:.18rem;border-radius:11px;background:#0f172a;padding:0 .66rem;color:#fff;font-size:.67rem;font-weight:900;white-space:nowrap}
    .partner{background:#050b18;padding:2rem 0;color:#fff}.partner-card{width:min(100% - 1.35rem,80rem);margin:auto;border:1px solid rgba(96,165,250,.17);border-radius:24px;background:linear-gradient(145deg,rgba(37,99,235,.11),rgba(15,23,42,.88));padding:1.2rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.partner-card p:first-child{margin:0;color:#93c5fd;font-size:.61rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.partner-card h2{margin:.38rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.68rem;line-height:1.07}.partner-copy{margin:.58rem 0 0;color:#b3bfd0;font-size:.79rem;line-height:1.55}.partner-link{display:flex;min-height:48px;margin-top:.85rem;align-items:center;justify-content:center;gap:.4rem;border-radius:13px;background:#fff;color:#0f172a;font-size:.8rem;font-weight:900;text-decoration:none;transition:transform .18s ease}.partner-link:active{transform:translateY(1px)}.partner-link:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
    .loading{padding:2.5rem 1rem;text-align:center;background:#f8fafc;color:#475569;font-weight:800}
    @keyframes ambientShift{from{transform:translate3d(-1.5%,0,0) scale(1)}to{transform:translate3d(1.5%,-1%,0) scale(1.035)}}
    @keyframes floatA{0%,100%{transform:translate3d(0,0,35px)}50%{transform:translate3d(-18px,14px,70px)}}
    @keyframes floatB{0%,100%{transform:translate3d(0,0,20px)}50%{transform:translate3d(22px,-12px,55px)}}
    @media(min-width:640px){.field-grid{grid-template-columns:1fr 1fr}.field.service,.field.pickup{grid-column:1/-1}.date-row{grid-column:1/-1}.partner-card{padding:1.65rem}}
    @media(min-width:768px){.hero-inner{width:min(100% - 2.5rem,80rem);padding:2.2rem 0 2rem;gap:1.3rem}.hero h1{font-size:clamp(2.8rem,6vw,4rem)}.hero-copy{font-size:1rem;line-height:1.65}.desktop-search{display:block}.planner{padding:1.1rem}.section-inner,.partner-card{width:min(100% - 2.5rem,80rem)}.view-all{display:inline-flex}.showcase-strip,.tour-strip,.campaign-strip,.blog-strip{display:grid;overflow:visible;scroll-snap-type:none}.showcase-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.tour-strip,.campaign-strip,.blog-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.showcase-card,.tour-card,.campaign-card,.blog-card{width:auto;max-width:none;flex:auto}.section{padding:2.8rem 0}}
    @media(min-width:1024px){.hero::before{background:linear-gradient(90deg,rgba(2,6,23,.97) 0%,rgba(2,6,23,.81) 55%,rgba(2,6,23,.62) 100%)}.hero-inner{grid-template-columns:minmax(0,1.08fr) minmax(370px,.72fr);align-items:center;gap:2.2rem;padding:3.4rem 0}.hero h1{font-size:clamp(3.6rem,5.2vw,4.9rem)}.planner{padding:1.2rem}.showcase-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.tour-strip,.campaign-strip,.blog-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.section{padding:3.25rem 0}.partner-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1.8rem;padding:1.85rem}.partner-link{min-width:220px;margin-top:0}}
    @media(min-width:1280px){.showcase-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(hover:hover) and (pointer:fine){.showcase-card:hover,.tour-card:hover,.campaign-card:hover,.blog-card:hover{transform:translateY(-5px) rotateX(.45deg);box-shadow:0 28px 58px rgba(2,6,23,.24)}.tour-card:hover{border-color:rgba(251,191,36,.35)}.campaign-card:hover{border-color:rgba(96,165,250,.5)}.tour-card:hover img,.campaign-card:hover img,.blog-card:hover img{transform:scale(1.045)}.partner-link:hover{transform:translateY(-2px)}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
  template: `
    <main>
      <section class="hero" [style.backgroundImage]="'url(' + heroImage() + ')'" aria-labelledby="home-v69-title">
        <span class="orb orb-a" aria-hidden="true"></span>
        <span class="orb orb-b" aria-hidden="true"></span>
        <div class="hero-inner">
          <div class="hero-copy-block">
            <p class="eyebrow">{{ heroEyebrow() }}</p>
            <h1 id="home-v69-title">{{ homeContent().heroTitle || 'Aracınızı seçin. Rotanızı belirleyin. Yola güvenle çıkın.' }}</h1>
            <p class="hero-copy">{{ homeContent().heroSubtitle || 'Kiralama, satış ve bölgesel tur seçeneklerini tek yerde karşılaştırın. Tarihinize ve ihtiyacınıza uyan seçeneği doğrudan bulun.' }}</p>

            <div class="desktop-search" role="search" aria-label="Araç, tur veya ilan ara">
              <div class="search-shell">
                <mat-icon aria-hidden="true">search</mat-icon>
                <input id="desktop-home-search-v69" type="search" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" autocomplete="off" placeholder="Marka, model, tur veya ilan no ara" aria-label="Marka, model, tur veya ilan numarası ara" />
                <button type="button" (click)="performSearch()" aria-label="Aramayı başlat">Ara</button>
              </div>
            </div>
          </div>

          <aside class="planner" aria-labelledby="planner-v69-title">
            <div class="planner-head">
              <div>
                <p class="planner-kicker">Hızlı Planlama</p>
                <h2 id="planner-v69-title">{{ homeContent().bookingTitle || 'Yolculuğunuzu Planlayın' }}</h2>
                <p class="planner-copy">Hizmeti, teslim noktasını ve tarihleri seçin. Uygun seçeneklere doğrudan geçin.</p>
              </div>
              <span class="planner-icon" aria-hidden="true"><mat-icon>event_available</mat-icon></span>
            </div>

            <div class="field-grid">
              <label class="field service" for="booking-service-v69">
                <span class="field-label">Hizmet Türü</span>
                <select id="booking-service-v69" name="booking-service-v69" class="control" [(ngModel)]="serviceType" aria-label="Hizmet türünü seçin">
                  @for (option of bookingServices(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>

              <label class="field pickup" for="booking-pickup-v69">
                <span class="field-label">Teslim Alma Noktası</span>
                <select id="booking-pickup-v69" name="booking-pickup-v69" class="control" [(ngModel)]="selectedPickupId" aria-label="Teslim alma noktasını seçin">
                  <option value="">Teslim alma noktası seçin</option>
                  @if (pickupPoints().length === 0) {
                    <option value="" disabled>Aktif teslim noktaları yükleniyor</option>
                  }
                  @for (branch of pickupPoints(); track branch.id) {
                    <option [value]="branch.id">{{ branch.name }} · {{ branch.district || branch.city }}</option>
                  }
                </select>
              </label>

              <div class="date-row">
                <div class="field">
                  <span class="field-label" id="start-date-label-v69">Alış Tarihi</span>
                  <button type="button" class="date-button" (click)="openDatePicker(startDateProxy)" [attr.aria-label]="startDateAria()" aria-haspopup="dialog">
                    <span>{{ startDate ? formatDisplayDate(startDate) : 'Tarih seçin' }}</span>
                    <mat-icon aria-hidden="true">calendar_month</mat-icon>
                  </button>
                  <input #startDateProxy class="date-proxy" type="date" [min]="today" [value]="startDate" (change)="onDateChanged('start', startDateProxy.value)" tabindex="-1" aria-hidden="true" data-a11y-proxy="true" />
                </div>

                <div class="field">
                  <span class="field-label" id="end-date-label-v69">İade Tarihi</span>
                  <button type="button" class="date-button" (click)="openDatePicker(endDateProxy)" [attr.aria-label]="endDateAria()" aria-haspopup="dialog">
                    <span>{{ endDate ? formatDisplayDate(endDate) : 'Tarih seçin' }}</span>
                    <mat-icon aria-hidden="true">calendar_month</mat-icon>
                  </button>
                  <input #endDateProxy class="date-proxy" type="date" [min]="startDate || today" [value]="endDate" (change)="onDateChanged('end', endDateProxy.value)" tabindex="-1" aria-hidden="true" data-a11y-proxy="true" />
                </div>
              </div>
            </div>

            <button type="button" class="planner-action" (click)="searchAvailability()" aria-label="Seçimlere göre uygun araç veya tur seçeneklerini göster">
              <span>{{ bookingButtonLabel() }}</span>
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
            </button>
            <p class="planner-note">Müsaitlik, fiyat ve hizmet kapsamı seçtiğiniz tarihlere göre doğrulanır.</p>
          </aside>
        </div>
      </section>

      @if (campaignSection(); as section) {
        @if (campaignCards(section).length > 0) {
          <section class="section campaigns" [attr.aria-labelledby]="section.sectionKey + '-v69-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Seçili Fırsatlar</p>
                  <h2 [id]="section.sectionKey + '-v69-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().campaignBannerSubtitle || 'İhtiyacınıza uyan avantajı seçin. Gerçek fiyat farkını, kalan süreyi ve hizmet kapsamını tek bakışta görün.' }}</p>
                </div>
                <a class="view-all" routerLink="/campaigns">Tüm Fırsatlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>

              <div class="campaign-strip" aria-label="Aktif fırsatlar">
                @for (campaign of campaignCards(section); track campaign.id) {
                  <a class="campaign-card" [href]="campaignHref(campaign)" [attr.aria-label]="campaign.title + '. ' + (campaign.ctaLabel || 'Fırsatı incele')">
                    <div class="campaign-media">
                      <img [src]="campaign.coverImage || fallbackImage" [alt]="campaign.title" loading="lazy" />
                      @if (campaign.badge || campaign.discountPercent) {<span class="campaign-badge">{{ campaign.badge || ('%' + campaign.discountPercent + ' avantaj') }}</span>}
                      @if (campaign.endsAt) {<span class="campaign-time">{{ countdown(campaign.endsAt) }}</span>}
                    </div>
                    <div class="campaign-body">
                      <h3 class="campaign-title">{{ campaign.title }}</h3>
                      <p class="campaign-copy">{{ campaign.shortDescription || campaign.description || 'Koşulları, fiyat farkını ve size sağlayacağı avantajı inceleyin.' }}</p>
                      <div class="campaign-bottom">
                        <div>
                          @if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old-price">{{ formatPrice(campaign.oldPrice) }}</span>}
                          @if (campaign.newPrice != null) {<strong class="new-price">{{ formatPrice(campaign.newPrice) }}</strong>}
                        </div>
                        <span class="campaign-cta">{{ campaign.ctaLabel || 'Fırsatı İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                      </div>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }
      }

      @if (homepageLayout.loading() && managedSections().length === 0) {
        <div class="loading" role="status" aria-live="polite">Vitrin yükleniyor...</div>
      }

      @for (section of contentSections(); track section.sectionKey) {
        @if (section.sectionType === 'VEHICLES' && sectionVehicles(section).length > 0) {
          <section class="section light" [attr.aria-labelledby]="section.sectionKey + '-v69-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ vehicleSectionBadge(section) }}</p>
                  <h2 [id]="section.sectionKey + '-v69-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ vehicleSectionSubtitle(section) }}</p>
                </div>
                <a class="view-all" [routerLink]="vehicleSectionRoute(section)">{{ vehicleSectionViewAll(section) }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="showcase-strip" [attr.aria-label]="section.title + ' vitrini'">
                @for (car of sectionVehicles(section); track stableVehicleKey(car)) {
                  <div class="showcase-card">
                    <app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'TOURS' && sectionTours(section).length > 0) {
          <section class="section dark" [attr.aria-labelledby]="section.sectionKey + '-v69-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Rota & Deneyim</p>
                  <h2 [id]="section.sectionKey + '-v69-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().toursSubtitle || 'Bölgedeki rotaları, buluşma noktalarını ve tur kapsamını karşılaştırın.' }}</p>
                </div>
                <a class="view-all" routerLink="/tours">Tüm Turlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="tour-strip" aria-label="Tur vitrini">
                @for (tour of sectionTours(section); track stableVehicleKey(tour)) {
                  <a class="tour-card" [routerLink]="['/tour', tour.id]" [attr.aria-label]="entityTitle(tour) + ' turunu aç'">
                    <div class="card-image"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" loading="lazy" /></div>
                    <div class="card-body">
                      <div class="card-top"><h3 class="card-title">{{ entityTitle(tour) }}</h3>@if (tour.price) {<strong class="card-price">{{ formatPrice(tour.price) }}</strong>}</div>
                      <p class="card-desc">{{ tour.description || tour.location || 'Tur ayrıntılarını ve rota kapsamını inceleyin.' }}</p>
                      <span class="link-cue">Turu Aç <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>

          <section class="partner" aria-labelledby="partner-v69-title">
            <div class="partner-card">
              <div>
                <p>Araç Sahipleri İçin</p>
                <h2 id="partner-v69-title">Aracınızı Değerlendirin</h2>
                <p class="partner-copy">Aracınız için değerlendirme, kiralama iş birliği veya satış sürecini tek başvuruyla başlatın. Uygun model birlikte belirlenir.</p>
              </div>
              <a routerLink="/list-your-car" class="partner-link" aria-label="Aracımı değerlendirme başvurusunu aç">
                Aracımı Değerlendir <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              </a>
            </div>
          </section>
        }

        @if (section.sectionType === 'BLOG' && sectionBlogs(section).length > 0) {
          <section class="section soft" [attr.aria-labelledby]="section.sectionKey + '-v69-title'">
            <div class="section-inner">
              <div class="section-head">
                <div><p class="section-kicker">Rehber</p><h2 [id]="section.sectionKey + '-v69-title'">{{ section.title }}</h2></div>
                <a class="view-all" routerLink="/blog">Tüm Yazılar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="blog-strip">
                @for (post of sectionBlogs(section); track post.cloudId || post.id) {
                  <a class="blog-card" [routerLink]="['/blog', post.id]">
                    <div class="card-image"><img [src]="post.image || fallbackImage" [alt]="post.title" loading="lazy" /></div>
                    <div class="card-body"><h3 class="card-title">{{ post.title }}</h3><p class="card-desc">{{ post.summary }}</p><span class="link-cue">Yazıyı Oku <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                  </a>
                }
              </div>
            </div>
          </section>
        }
      }
    </main>
  `,
})
export class HomeV69Component {
  private readonly destroyRef = inject(DestroyRef);
  readonly carService = inject(CarService);
  readonly homepageLayout = inject(HomepageLayoutService);
  private readonly campaignService = inject(CampaignService);
  private readonly branchService = inject(BranchService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly fallbackImage = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop";
  private readonly fallbackHero = "https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=82&w=2200&auto=format&fit=crop";

  readonly config = this.carService.getConfig();
  readonly homeContent = computed(() => this.config().homeContent || {});
  readonly rentalCars = this.carService.getCars();
  readonly saleCars = this.carService.getSaleCars();
  readonly tours = this.carService.getTours();
  readonly blogPosts = this.carService.getBlogPosts();
  readonly pickupPoints = this.branchService.pickupPoints;
  readonly publicCampaigns = this.campaignService.publicCampaigns;
  readonly now = signal(Date.now());

  searchQuery = "";
  startDate = "";
  endDate = "";
  serviceType: "individual" | "driver" | "wedding" | "tour" = "individual";
  selectedPickupId = "";
  readonly today = this.toDateInput(new Date());

  readonly heroImage = computed(() => {
    const home = this.homeContent() as Record<string, unknown>;
    const candidate = String(home["heroImage"] || this.config().seoOgImage || "").trim();
    return /^https:\/\//i.test(candidate) ? candidate : this.fallbackHero;
  });

  readonly heroEyebrow = computed(() => {
    const configured = String(this.homeContent().heroTrustLine || "").trim();
    if (configured && !/^premium\b/i.test(configured)) return configured;
    return "Kiralama • Satış • Tur";
  });

  readonly bookingServices = computed(() => [
    { value: "individual" as const, label: "Şoförsüz Araç Kiralama" },
    { value: "driver" as const, label: "Şoförlü Transfer" },
    { value: "wedding" as const, label: "Düğün / Özel Gün" },
    { value: "tour" as const, label: "Özel Tur" },
  ]);

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: "campaigns", title: "Planınızı Avantaja Çeviren Fırsatlar", sectionType: "CAMPAIGN", isEnabled: true, sortOrder: 5, maxItems: 3, settings: {} },
    { sectionKey: "rental_featured", title: "Kiralık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 10, maxItems: 6, settings: { category: "RENTAL" } },
    { sectionKey: "sale_featured", title: "Satılık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 20, maxItems: 6, settings: { category: "SALE" } },
    { sectionKey: "tour_featured", title: "Öne Çıkan Turlar", sectionType: "TOURS", isEnabled: true, sortOrder: 30, maxItems: 6, settings: {} },
    { sectionKey: "blog_featured", title: "Son Yazılar", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length) return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.error()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

  readonly campaignSection = computed(() => this.managedSections().find((section) => section.sectionType === "CAMPAIGN") || null);
  readonly contentSections = computed(() => this.managedSections().filter((section) => section.sectionType !== "CAMPAIGN"));

  constructor() {
    void this.homepageLayout.load();
    void this.branchService.refresh();
    void this.campaignService.loadPublic().catch(() => undefined);

    if (typeof window !== "undefined") {
      const timer = window.setInterval(() => this.now.set(Date.now()), 60_000);
      this.destroyRef.onDestroy(() => window.clearInterval(timer));
    }

    effect(() => {
      const config = this.config();
      this.seo.updateSeoTags({
        title: config.seoTitle || `${config.companyName} | Araç Kiralama, Satış ve Turlar`,
        description: config.seoDescription || this.homeContent().heroSubtitle || config.companyName,
        keywords: config.seoKeywords,
        image: config.seoOgImage || config.logoUrl || this.fallbackHero,
      });
    });
  }

  performSearch(): void {
    const query = this.searchQuery.trim();
    void this.router.navigate(["/search"], { queryParams: query ? { q: query } : undefined });
  }

  openDatePicker(input: HTMLInputElement): void {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    try {
      if (picker.showPicker) picker.showPicker();
      else {
        input.focus();
        input.click();
      }
    } catch {
      input.focus();
      input.click();
    }
  }

  onDateChanged(kind: "start" | "end", value: string): void {
    if (kind === "start") {
      this.startDate = value;
      if (this.endDate && value && this.endDate < value) this.endDate = value;
      return;
    }
    this.endDate = value;
  }

  startDateAria(): string {
    return this.startDate
      ? `Alış tarihi ${this.formatAccessibleDate(this.startDate)}. Değiştirmek için açın.`
      : "Alış tarihini seçin";
  }

  endDateAria(): string {
    return this.endDate
      ? `İade tarihi ${this.formatAccessibleDate(this.endDate)}. Değiştirmek için açın.`
      : "İade tarihini seçin";
  }

  formatDisplayDate(value: string): string {
    const date = this.parseLocalDate(value);
    if (!date) return "Tarih seçin";
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(date);
  }

  private formatAccessibleDate(value: string): string {
    const date = this.parseLocalDate(value);
    if (!date) return "seçilmedi";
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }

  searchAvailability(): void {
    let start = this.startDate || this.today;
    let end = this.endDate || start;
    if (end < start) end = start;
    this.startDate = start;
    this.endDate = end;

    const pickup = this.selectedPickupId || undefined;
    if (this.serviceType === "tour") {
      void this.router.navigate(["/tours"], { queryParams: { start, pickup } });
      return;
    }

    void this.router.navigate(["/fleet"], {
      queryParams: {
        start,
        end,
        pickup,
        driver: this.serviceType === "driver" || this.serviceType === "wedding" ? "true" : undefined,
        occasion: this.serviceType === "wedding" ? "wedding" : undefined,
      },
    });
  }

  bookingButtonLabel(): string {
    return this.serviceType === "tour" ? "Uygun Turları Göster" : "Uygun Araçları Göster";
  }

  sectionVehicles(section: PublicHomepageSection): Vehicle[] {
    const source = String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? this.saleCars() : this.rentalCars();
    const ids = this.placementIds(section, "VEHICLE");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = this.vehicleIndex(source);
    const matched = ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item));
    return matched.slice(0, section.maxItems);
  }

  sectionTours(section: PublicHomepageSection): Vehicle[] {
    const source = this.tours();
    const ids = this.placementIds(section, "TOUR");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = this.vehicleIndex(source);
    const matched = ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item));
    return matched.slice(0, section.maxItems);
  }

  sectionBlogs(section: PublicHomepageSection): BlogPost[] {
    const source = this.blogPosts();
    const ids = this.placementIds(section, "BLOG");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = new Map<string, BlogPost>();
    for (const item of source) {
      byId.set(String(item.id), item);
      if (item.cloudId) byId.set(String(item.cloudId), item);
    }
    return ids.map((id) => byId.get(id)).filter((item): item is BlogPost => Boolean(item)).slice(0, section.maxItems);
  }

  campaignCards(section: PublicHomepageSection): CampaignRecord[] {
    const source = this.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = this.placementIds(section, "CAMPAIGN");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = new Map(source.map((item) => [String(item.id), item]));
    return ids.map((id) => byId.get(id)).filter((item): item is CampaignRecord => Boolean(item)).slice(0, section.maxItems);
  }

  stableVehicleKey(item: Vehicle): string { return String(item.cloudId || item.id); }

  vehicleSectionRoute(section: PublicHomepageSection): string {
    return String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? "/sales" : "/fleet";
  }

  vehicleSectionBadge(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales" ? "Satış Galerisi" : "Kiralama Filosu";
  }

  vehicleSectionSubtitle(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales"
      ? this.homeContent().salesDescription || "Satıştaki araçları, teknik bilgileri ve ilan detaylarını karşılaştırın."
      : this.homeContent().featuredSubtitle || "Müsait kiralık araçları, fiyatları ve temel özellikleri karşılaştırın.";
  }

  vehicleSectionViewAll(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales" ? "Tüm Satılık Araçlar" : "Tüm Kiralık Araçlar";
  }

  entityTitle(item: Vehicle): string {
    return item.title || [item.brand, item.model, item.year].filter(Boolean).join(" ") || `İlan ${item.id}`;
  }

  campaignHref(campaign: CampaignRecord): string {
    const cta = (campaign.ctaUrl || "").trim();
    if (cta && (/^https:\/\//i.test(cta) || cta.startsWith("/"))) return cta;
    if (campaign.targetType === "TOUR" && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`;
    if (campaign.targetType === "VEHICLE" && campaign.targetId) {
      const vehicle = [...this.rentalCars(), ...this.saleCars()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId) || String(item.id) === String(campaign.targetId));
      return vehicle?.category === "SALE" ? `/sales/${encodeURIComponent(vehicle.id)}` : `/fleet/${encodeURIComponent(vehicle?.id || campaign.targetId)}`;
    }
    return "/campaigns";
  }

  countdown(endsAt: string): string {
    const end = new Date(endsAt).getTime();
    const remaining = end - this.now();
    if (!Number.isFinite(end) || remaining <= 0) return "Süre doldu";
    const totalMinutes = Math.floor(remaining / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    if (days > 0) return `${days} gün ${hours} saat kaldı`;
    if (hours > 0) return `${hours} saat kaldı`;
    return `${Math.max(1, totalMinutes)} dk kaldı`;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  }

  private placementIds(section: PublicHomepageSection, type: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN"): string[] | null {
    if (this.homepageLayout.error()) return null;
    return this.homepageLayout.placementsFor(section.sectionKey)
      .filter((item) => item.entityType === type)
      .map((item) => item.entityId);
  }

  private vehicleIndex(source: Vehicle[]): Map<string, Vehicle> {
    const map = new Map<string, Vehicle>();
    for (const item of source) {
      map.set(String(item.id), item);
      if (item.cloudId) map.set(String(item.cloudId), item);
      if (item.cloudStockCode) map.set(String(item.cloudStockCode), item);
    }
    return map;
  }

  private isLiveCampaign(item: CampaignRecord): boolean {
    if (!item.isActive || item.publicationStatus !== "PUBLISHED") return false;
    const now = this.now();
    const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return (!item.startsAt || Number.isFinite(start) && start <= now) && (!item.endsAt || Number.isFinite(end) && end > now);
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateInput(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
