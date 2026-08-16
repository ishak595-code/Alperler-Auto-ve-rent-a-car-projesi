import { CommonModule } from "@angular/common";
import { Component, DestroyRef, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Branch } from "../models/branch.model";
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
    .hero::before{content:"";position:absolute;inset:0;z-index:-3;background:linear-gradient(180deg,rgba(2,6,23,.84),rgba(2,6,23,.97))}
    .hero::after{content:"";position:absolute;inset:-12%;z-index:-2;pointer-events:none;background:radial-gradient(circle at 84% 14%,rgba(37,99,235,.3),transparent 30%),radial-gradient(circle at 10% 82%,rgba(14,116,144,.15),transparent 30%);animation:ambientShift 12s ease-in-out infinite alternate}
    .orb{position:absolute;z-index:-1;border-radius:999px;filter:blur(12px);opacity:.2;pointer-events:none}.orb-a{right:-70px;top:74px;width:180px;height:180px;background:rgba(37,99,235,.48);animation:floatA 9s ease-in-out infinite}.orb-b{left:-82px;bottom:18px;width:150px;height:150px;background:rgba(14,116,144,.35);animation:floatB 11s ease-in-out infinite}
    .hero-inner{width:min(100% - 1.15rem,80rem);margin:auto;padding:.55rem 0 .78rem;display:grid;gap:.62rem}.hero-copy-block{min-width:0}
    .eyebrow{display:inline-flex;align-items:center;min-height:26px;width:max-content;max-width:100%;border:1px solid rgba(147,197,253,.22);border-radius:999px;background:rgba(15,23,42,.48);padding:.3rem .62rem;color:#bfdbfe;font-size:.57rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;backdrop-filter:blur(12px)}
    .hero h1{margin:.48rem 0 0;max-width:850px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.72rem,7.7vw,2.55rem);line-height:1.01;letter-spacing:-.03em;color:#fff;text-wrap:balance}.hero-copy{margin:.46rem 0 0;max-width:700px;color:#d5deeb;font-size:.79rem;line-height:1.5}
    .desktop-search{display:none;margin-top:.85rem;max-width:650px}.search-shell{display:flex;align-items:center;gap:.45rem;min-height:52px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(3,8,23,.64);padding:.33rem;backdrop-filter:blur(14px);box-shadow:0 18px 42px rgba(2,6,23,.25)}.search-shell input{min-width:0;flex:1;border:0;background:transparent;padding:.68rem .25rem;color:#fff;font:700 .86rem/1.2 inherit;outline:none}.search-shell input::placeholder{color:#94a3b8}.search-shell button{min-height:42px;border:0;border-radius:11px;background:#2563eb;padding:0 .95rem;color:#fff;font-weight:900;cursor:pointer}
    .planner{position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:20px;background:linear-gradient(155deg,rgba(9,19,38,.97),rgba(7,15,30,.93));padding:.78rem;box-shadow:0 22px 50px rgba(2,6,23,.32),inset 0 1px 0 rgba(255,255,255,.055);backdrop-filter:blur(18px)}.planner::before{content:"";position:absolute;right:-36%;top:-48%;width:80%;aspect-ratio:1;border-radius:999px;background:radial-gradient(circle,rgba(37,99,235,.15),transparent 65%);pointer-events:none}
    .planner-head{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:.72rem}.planner-kicker{margin:0;color:#93c5fd;font-size:.55rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.planner h2{margin:.16rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.34rem;line-height:1.04;color:#fff}.planner-copy{margin:.28rem 0 0;color:#a3b0c2;font-size:.68rem;line-height:1.4}.planner-icon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;border-radius:13px;background:rgba(37,99,235,.15);color:#93c5fd}
    .field-grid{position:relative;display:grid;grid-template-columns:1fr;gap:.48rem;margin-top:.65rem}.field{display:block;min-width:0}.field-label{display:block;margin:0 0 .25rem;color:#aab6c8;font-size:.57rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.control,.date-button{width:100%;min-height:44px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:#050b18;padding:0 .7rem;color:#fff;font:780 .77rem/1.2 inherit;outline:none}.control:focus,.date-button:focus-visible{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.16)}select.control{appearance:auto}.date-row{display:grid;grid-template-columns:1fr 1fr;gap:.48rem}.date-button{display:flex;align-items:center;justify-content:space-between;gap:.4rem;text-align:left;cursor:pointer}.date-button span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.date-button mat-icon{width:18px;height:18px;font-size:18px;flex:0 0 18px;color:#93c5fd}.date-proxy{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
    .planner-action{display:flex;width:100%;min-height:47px;margin-top:.62rem;align-items:center;justify-content:center;gap:.4rem;border:0;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:.8rem;font-weight:950;cursor:pointer;box-shadow:0 12px 26px rgba(37,99,235,.2);transition:transform .18s ease,box-shadow .18s ease}.planner-action:active{transform:translateY(1px)}.planner-action:focus-visible{outline:3px solid rgba(147,197,253,.82);outline-offset:2px}.planner-note{margin:.42rem 0 0;color:#91a0b5;font-size:.61rem;line-height:1.4}
    .section{position:relative;padding:1.9rem 0}.section.light{background:#f8fafc;color:#0f172a}.section.dark{background:#050b18;color:#f8fafc}.section.soft{background:#eef3f9;color:#0f172a}.section-inner{width:min(100% - 1.2rem,80rem);margin:auto}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:.82rem}.section-kicker{margin:0;color:#2563eb;font-size:.58rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.dark .section-kicker,.campaigns .section-kicker,.branches-section .section-kicker{color:#93c5fd}.brand-name{color:inherit}.section h2{margin:.2rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.48rem,6.2vw,2.45rem);line-height:1.04;text-wrap:balance}.section-desc{margin:.38rem 0 0;max-width:760px;color:#64748b;font-size:.76rem;line-height:1.52}.dark .section-desc,.campaigns .section-desc,.branches-section .section-desc{color:#a5b1c4}.view-all{display:none;min-height:40px;align-items:center;gap:.18rem;border-radius:11px;padding:0 .7rem;color:inherit;font-size:.72rem;font-weight:900;text-decoration:none}.view-all:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
    .showcase-strip,.tour-strip,.campaign-strip,.blog-strip,.branch-strip{display:flex;gap:.72rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:.12rem .04rem .72rem;scrollbar-width:none;overscroll-behavior-inline:contain}.showcase-strip::-webkit-scrollbar,.tour-strip::-webkit-scrollbar,.campaign-strip::-webkit-scrollbar,.blog-strip::-webkit-scrollbar,.branch-strip::-webkit-scrollbar{display:none}.showcase-card{flex:0 0 min(81vw,322px);scroll-snap-align:start;min-width:0;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.09);transition:transform .2s ease,box-shadow .2s ease}.showcase-card:active{transform:scale(.99)}
    .tour-card,.blog-card,.branch-card{position:relative;flex:0 0 min(82vw,338px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:#0d1728;color:#fff;text-decoration:none;box-shadow:0 18px 38px rgba(0,0,0,.18);transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}.blog-card{border-color:#dbe3ee;background:#fff;color:#0f172a;box-shadow:0 12px 28px rgba(15,23,42,.08)}.tour-card:active,.blog-card:active,.branch-card:active{transform:scale(.987)}.tour-card:focus-visible,.blog-card:focus-visible,.branch-card:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.card-image{aspect-ratio:16/10;overflow:hidden;background:#111827}.card-image img{width:100%;height:100%;object-fit:cover;transition:transform .36s ease}.card-body{padding:.9rem}.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.65rem}.card-title{margin:0;font-size:.94rem;line-height:1.28;font-weight:900}.card-price{flex:0 0 auto;color:#fbbf24;font-size:.78rem;font-weight:900}.card-desc{margin:.46rem 0 0;color:#a8b4c7;font-size:.71rem;line-height:1.48}.blog-card .card-desc{color:#64748b}.link-cue{display:inline-flex;margin-top:.68rem;align-items:center;gap:.16rem;color:#fbbf24;font-size:.69rem;font-weight:900}.blog-card .link-cue{color:#2563eb}
    .campaigns{overflow:hidden;background:linear-gradient(145deg,#071124,#0b1529 55%,#111827);color:#fff}.campaigns::before{content:"";position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(circle at 8% 18%,rgba(37,99,235,.2),transparent 30%),radial-gradient(circle at 90% 82%,rgba(245,158,11,.1),transparent 30%);animation:ambientShift 15s ease-in-out infinite alternate}.campaign-card{position:relative;flex:0 0 min(86vw,350px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:#fff;color:#0f172a;text-decoration:none;box-shadow:0 20px 44px rgba(2,6,23,.25);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;transform-style:preserve-3d}.campaign-card:active{transform:scale(.986)}.campaign-card:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.campaign-media{position:relative;aspect-ratio:16/8.5;overflow:hidden;background:#172033}.campaign-media img{width:100%;height:100%;object-fit:cover;transition:transform .38s ease}.campaign-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.65),transparent 58%)}.campaign-badge{position:absolute;z-index:2;left:.66rem;top:.66rem;max-width:calc(100% - 1.32rem);border-radius:999px;background:rgba(2,6,23,.9);padding:.32rem .55rem;color:#f8fafc;font-size:.55rem;font-weight:900;letter-spacing:.035em;text-transform:uppercase}.campaign-time{position:absolute;z-index:2;left:.66rem;bottom:.58rem;border-radius:999px;background:#fff;padding:.3rem .52rem;color:#0f172a;font-size:.57rem;font-weight:900}.campaign-body{padding:.88rem}.campaign-title{margin:0;font-size:.98rem;line-height:1.24;font-weight:950}.campaign-copy{margin:.43rem 0 0;color:#536176;font-size:.72rem;line-height:1.48}.campaign-bottom{display:flex;margin-top:.72rem;align-items:end;justify-content:space-between;gap:.62rem}.old-price{display:block;color:#94a3b8;font-size:.62rem;font-weight:760;text-decoration:line-through}.new-price{display:block;margin-top:.03rem;color:#0f172a;font-size:.98rem;font-weight:950}.campaign-cta{display:inline-flex;min-height:38px;align-items:center;gap:.16rem;border-radius:10px;background:#0f172a;padding:0 .62rem;color:#fff;font-size:.65rem;font-weight:900;white-space:nowrap}
    .branches-section{overflow:hidden;background:linear-gradient(150deg,#071124,#050b18);color:#fff}.branch-card{padding:1rem;min-height:190px}.branch-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:13px;background:rgba(37,99,235,.15);color:#93c5fd}.branch-card h3{margin:.78rem 0 0;font-size:1rem;font-weight:950}.branch-address{margin:.42rem 0 0;color:#a8b4c7;font-size:.73rem;line-height:1.48}.branch-meta{display:flex;flex-wrap:wrap;gap:.38rem;margin-top:.68rem}.branch-meta span{border:1px solid rgba(148,163,184,.15);border-radius:999px;background:rgba(15,23,42,.55);padding:.28rem .48rem;color:#c6d1df;font-size:.58rem;font-weight:850}.branch-link{display:inline-flex;margin-top:.8rem;align-items:center;gap:.2rem;color:#93c5fd;font-size:.69rem;font-weight:900}
    .partner{background:#050b18;padding:1.9rem 0;color:#fff}.partner-card{width:min(100% - 1.2rem,80rem);margin:auto;border:1px solid rgba(96,165,250,.17);border-radius:23px;background:linear-gradient(145deg,rgba(37,99,235,.11),rgba(15,23,42,.88));padding:1.15rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.partner-card .section-kicker{color:#93c5fd}.partner-card h2{margin:.35rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.62rem;line-height:1.07}.partner-copy{margin:.52rem 0 0;color:#b3bfd0;font-size:.76rem;line-height:1.52}.partner-link{display:flex;min-height:47px;margin-top:.8rem;align-items:center;justify-content:center;gap:.36rem;border-radius:12px;background:#fff;color:#0f172a;font-size:.78rem;font-weight:900;text-decoration:none;transition:transform .18s ease}.partner-link:active{transform:translateY(1px)}.partner-link:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
    .loading{padding:2.3rem 1rem;text-align:center;background:#f8fafc;color:#475569;font-weight:800}
    @keyframes ambientShift{from{transform:translate3d(-1.5%,0,0) scale(1)}to{transform:translate3d(1.5%,-1%,0) scale(1.035)}}@keyframes floatA{0%,100%{transform:translate3d(0,0,35px)}50%{transform:translate3d(-8px,9px,55px)}}@keyframes floatB{0%,100%{transform:translate3d(0,0,28px)}50%{transform:translate3d(9px,-7px,45px)}}
    @media(min-width:640px){.field-grid{grid-template-columns:1fr 1fr}.field.service,.field.pickup{grid-column:1/-1}.partner-card{padding:1.55rem}}
    @media(min-width:768px){.desktop-search{display:block}.view-all{display:inline-flex}.showcase-strip,.tour-strip,.campaign-strip,.blog-strip,.branch-strip{display:grid;overflow:visible;scroll-snap-type:none}.showcase-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.tour-strip,.campaign-strip,.blog-strip,.branch-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.showcase-card,.tour-card,.campaign-card,.blog-card,.branch-card{width:auto;max-width:none;flex:auto}.hero-inner{padding:1.6rem 0}.partner{padding:2.2rem 0}}
    @media(min-width:1024px){.hero::before{background:linear-gradient(90deg,rgba(2,6,23,.97) 0%,rgba(2,6,23,.8) 55%,rgba(2,6,23,.62) 100%)}.hero-inner{grid-template-columns:minmax(0,1.05fr) minmax(360px,.72fr);align-items:center;gap:2.2rem;padding:3.3rem 0}.hero h1{font-size:clamp(3rem,5vw,4.65rem)}.planner{padding:1.1rem}.showcase-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.tour-strip,.campaign-strip,.blog-strip,.branch-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.section{padding:3rem 0}.partner-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2rem;padding:1.8rem}.partner-link{min-width:230px;margin-top:0}}
    @media(min-width:1280px){.showcase-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(hover:hover) and (pointer:fine){.tour-card:hover,.campaign-card:hover,.blog-card:hover,.branch-card:hover,.showcase-card:hover{transform:translateY(-5px);box-shadow:0 28px 58px rgba(2,6,23,.24)}.tour-card:hover img,.campaign-card:hover img,.blog-card:hover img{transform:scale(1.045)}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
  template: `
    <main>
      <section class="hero" [style.backgroundImage]="'url(' + heroImage() + ')'" aria-labelledby="home-v69-title">
        <span class="orb orb-a" aria-hidden="true"></span>
        <span class="orb orb-b" aria-hidden="true"></span>
        <div class="hero-inner">
          <div class="hero-copy-block">
            <p class="eyebrow">{{ brandName() }} · Yüksekova</p>
            <h1 id="home-v69-title">{{ homeContent().heroTitle || 'Aracınızı seçin. Rotanızı belirleyin. Yola güvenle çıkın.' }}</h1>
            <p class="hero-copy">{{ homeContent().heroSubtitle || 'Kiralama, satış ve bölgesel tur seçeneklerini tek yerde karşılaştırın. Tarihinize uyan seçeneği hızlıca bulun.' }}</p>

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
                <p class="planner-kicker">{{ brandName() }} · Hızlı Planlama</p>
                <h2 id="planner-v69-title">{{ homeContent().bookingTitle || '5 Dakikada Planını Netleştir' }}</h2>
                <p class="planner-copy">Hizmeti, teslim noktasını ve tarihini seç. Uzun formlarla uğraşmadan önce uygun seçenekleri gör.</p>
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
                  <span class="field-label">Alış Tarihi</span>
                  <button type="button" class="date-button" (click)="openDatePicker(startDateProxy)" [attr.aria-label]="startDateAria()" aria-haspopup="dialog">
                    <span>{{ startDate ? formatDisplayDate(startDate) : 'Tarih seçin' }}</span>
                    <mat-icon aria-hidden="true">calendar_month</mat-icon>
                  </button>
                  <input #startDateProxy class="date-proxy" type="date" [min]="today" [value]="startDate" (change)="onDateChanged('start', startDateProxy.value)" tabindex="-1" aria-hidden="true" data-a11y-proxy="true" />
                </div>

                <div class="field">
                  <span class="field-label">İade Tarihi</span>
                  <button type="button" class="date-button" (click)="openDatePicker(endDateProxy)" [attr.aria-label]="endDateAria()" aria-haspopup="dialog">
                    <span>{{ endDate ? formatDisplayDate(endDate) : 'Tarih seçin' }}</span>
                    <mat-icon aria-hidden="true">calendar_month</mat-icon>
                  </button>
                  <input #endDateProxy class="date-proxy" type="date" [min]="startDate || today" [value]="endDate" (change)="onDateChanged('end', endDateProxy.value)" tabindex="-1" aria-hidden="true" data-a11y-proxy="true" />
                </div>
              </div>
            </div>

            <button type="button" class="planner-action" (click)="searchAvailability()" [attr.aria-label]="bookingButtonAria()">
              <span>{{ bookingButtonLabel() }}</span>
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
            </button>
            <p class="planner-note">Önce uygunluğu görün. Gerekli ayrıntıları seçiminizden sonra tamamlarsınız.</p>
          </aside>
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {
        <div class="loading" role="status" aria-live="polite">Alperler Auto vitrini yükleniyor...</div>
      }

      @for (section of managedSections(); track section.sectionKey) {
        @if (section.sectionType === 'CAMPAIGN' && campaignCards(section).length > 0) {
          <section class="section campaigns" [attr.aria-labelledby]="section.sectionKey + '-v70-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker"><span class="brand-name">{{ brandName() }}</span> · Seçili Fırsatlar</p>
                  <h2 [id]="section.sectionKey + '-v70-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().campaignBannerSubtitle || 'Ne kazanacağınızı ilk bakışta görün. Tarihinizi seçin ve size uyan fırsatı planınıza ekleyin.' }}</p>
                </div>
                <a class="view-all" routerLink="/campaigns">Tüm Kampanyalar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>

              <div class="campaign-strip" aria-label="Alperler Auto aktif kampanyaları">
                @for (campaign of campaignCards(section); track campaign.id) {
                  <a class="campaign-card" [href]="campaignHref(campaign)" [attr.aria-label]="campaign.title + '. ' + (campaign.ctaLabel || 'Kampanyayı incele')">
                    <div class="campaign-media">
                      <img [src]="campaign.coverImage || fallbackImage" [alt]="campaign.title" loading="lazy" />
                      @if (campaign.badge || campaign.discountPercent) {<span class="campaign-badge">{{ campaign.badge || ('%' + campaign.discountPercent + ' avantaj') }}</span>}
                      @if (campaign.endsAt) {<span class="campaign-time">{{ countdown(campaign.endsAt) }}</span>}
                    </div>
                    <div class="campaign-body">
                      <h3 class="campaign-title">{{ campaign.title }}</h3>
                      <p class="campaign-copy">{{ campaign.shortDescription || campaign.description || 'Fiyat farkını, tarih uygunluğunu ve kapsamı tek ekranda görün.' }}</p>
                      <div class="campaign-bottom">
                        <div>
                          @if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old-price">{{ formatPrice(campaign.oldPrice) }}</span>}
                          @if (campaign.newPrice != null) {<strong class="new-price">{{ formatPrice(campaign.newPrice) }}</strong>}
                        </div>
                        <span class="campaign-cta">{{ campaign.ctaLabel || 'Kampanyayı İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                      </div>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'VEHICLES' && sectionVehicles(section).length > 0) {
          <section class="section light" [attr.aria-labelledby]="section.sectionKey + '-v70-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ brandName() }} · {{ vehicleSectionBadge(section) }}</p>
                  <h2 [id]="section.sectionKey + '-v70-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ vehicleSectionSubtitle(section) }}</p>
                </div>
                <a class="view-all" [routerLink]="vehicleSectionRoute(section)">{{ vehicleSectionViewAll(section) }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="showcase-strip" [attr.aria-label]="brandName() + ' ' + section.title + ' vitrini'">
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
          <section class="section dark" [attr.aria-labelledby]="section.sectionKey + '-v70-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ brandName() }} · Rota & Deneyim</p>
                  <h2 [id]="section.sectionKey + '-v70-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().toursSubtitle || 'Rotayı, buluşma noktasını ve tur kapsamını karşılaştırın. Size uyan tarihi seçin.' }}</p>
                </div>
                <a class="view-all" routerLink="/tours">Tüm Turlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="tour-strip" aria-label="Alperler Auto tur vitrini">
                @for (tour of sectionTours(section); track stableVehicleKey(tour)) {
                  <a class="tour-card" [routerLink]="['/tour', tour.id]" [attr.aria-label]="entityTitle(tour) + ' turunu aç'">
                    <div class="card-image"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" loading="lazy" /></div>
                    <div class="card-body">
                      <div class="card-top"><h3 class="card-title">{{ entityTitle(tour) }}</h3>@if (tour.price) {<strong class="card-price">{{ formatPrice(tour.price) }}</strong>}</div>
                      <p class="card-desc">{{ tour.description || tour.location || 'Tur ayrıntılarını ve rota kapsamını inceleyin.' }}</p>
                      <span class="link-cue">Turu İncele <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'CUSTOM' && section.sectionKey === 'branches' && branchCards(section).length > 0) {
          <section class="section branches-section" aria-labelledby="branches-v70-title">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ brandName() }} · Yerel Hizmet Noktaları</p>
                  <h2 id="branches-v70-title">{{ section.title || 'Şubelerimiz' }}</h2>
                  <p class="section-desc">Teslim alma, iade, satış görüşmesi ve tur buluşma noktalarını tek ekranda görün.</p>
                </div>
                <a class="view-all" routerLink="/branches">Tüm Şubeler <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="branch-strip" aria-label="Alperler Auto şubeleri">
                @for (branch of branchCards(section); track branch.id) {
                  <a class="branch-card" routerLink="/branches" [attr.aria-label]="branch.name + ' şube bilgilerini aç'">
                    <span class="branch-icon" aria-hidden="true"><mat-icon>location_on</mat-icon></span>
                    <h3>{{ branch.name }}</h3>
                    <p class="branch-address">{{ branch.addressLabel }}</p>
                    <div class="branch-meta" aria-hidden="true">
                      @if (branch.isPickupPoint) {<span>Teslim Alma</span>}
                      @if (branch.isReturnPoint) {<span>İade</span>}
                      @if (branchServiceSummary(branch)) {<span>{{ branchServiceSummary(branch) }}</span>}
                    </div>
                    <span class="branch-link">Şube Bilgilerini Aç <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'CUSTOM' && section.sectionKey === 'partner') {
          <section class="partner" aria-labelledby="partner-v70-title">
            <div class="partner-card">
              <div>
                <p class="section-kicker">{{ brandName() }} · Araç Sahipleri İçin</p>
                <h2 id="partner-v70-title">Aracınızı Değerlendirin</h2>
                <p class="partner-copy">Aracınızın satış, kiralama iş birliği veya değerleme seçeneğini tek başvuruyla öğrenin. Önce bilgileri gönderin, uygun modeli birlikte netleştirelim.</p>
              </div>
              <a routerLink="/list-your-car" class="partner-link" aria-label="Aracımı değerlendirme başvurusunu aç">
                Aracımı Değerlendir <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              </a>
            </div>
          </section>
        }

        @if (section.sectionType === 'BLOG' && sectionBlogs(section).length > 0) {
          <section class="section soft" [attr.aria-labelledby]="section.sectionKey + '-v70-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ brandName() }} · Rehber</p>
                  <h2 [id]="section.sectionKey + '-v70-title'">{{ section.title }}</h2>
                </div>
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
  readonly brandName = computed(() => this.config().companyName?.trim() || "Alperler Auto");
  readonly homeContent = computed(() => this.config().homeContent || {});
  readonly rentalCars = this.carService.getCars();
  readonly saleCars = this.carService.getSaleCars();
  readonly tours = this.carService.getTours();
  readonly blogPosts = this.carService.getBlogPosts();
  readonly pickupPoints = this.branchService.pickupPoints;
  readonly branches = this.branchService.branches;
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
    { sectionKey: "branches", title: "Şubelerimiz", sectionType: "CUSTOM", isEnabled: true, sortOrder: 35, maxItems: 3, settings: {} },
    { sectionKey: "partner", title: "Aracınızı Değerlendirin", sectionType: "CUSTOM", isEnabled: true, sortOrder: 40, maxItems: 1, settings: {} },
    { sectionKey: "blog_featured", title: "Son Yazılar", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length) return [...sections].filter((section) => section.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.error()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

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
      else { input.focus(); input.click(); }
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
    return this.startDate ? `Alış tarihi ${this.formatAccessibleDate(this.startDate)}. Değiştirmek için açın.` : "Alış tarihini seçin";
  }

  endDateAria(): string {
    return this.endDate ? `İade tarihi ${this.formatAccessibleDate(this.endDate)}. Değiştirmek için açın.` : "İade tarihini seçin";
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
    if (this.serviceType === "tour") return "Uygun Turu Hemen Bul";
    if (this.serviceType === "driver") return "Şoförlü Aracı Hemen Bul";
    if (this.serviceType === "wedding") return "Özel Gün Aracını Hemen Bul";
    return "Uygun Aracı Hemen Bul";
  }

  bookingButtonAria(): string {
    return `${this.bookingButtonLabel()}. Seçtiğiniz tarih ve teslim noktasına göre sonuçları aç`;
  }

  sectionVehicles(section: PublicHomepageSection): Vehicle[] {
    const source = String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? this.saleCars() : this.rentalCars();
    const ids = this.placementIds(section, "VEHICLE");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = this.vehicleIndex(source);
    return ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  sectionTours(section: PublicHomepageSection): Vehicle[] {
    const source = this.tours();
    const ids = this.placementIds(section, "TOUR");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = this.vehicleIndex(source);
    return ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
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

  branchCards(section: PublicHomepageSection): Branch[] {
    return this.branches().slice(0, Math.max(1, section.maxItems || 3));
  }

  branchServiceSummary(branch: Branch): string {
    const labels: Record<string, string> = {
      RENTAL: "Kiralama",
      SALES: "Satış",
      TOUR: "Tur",
      TRANSFER: "Transfer",
      PICKUP: "Teslim",
      RETURN: "İade",
    };
    return (branch.services || []).slice(0, 3).map((service) => labels[String(service)] || String(service)).join(" · ");
  }

  stableVehicleKey(item: Vehicle): string { return String(item.cloudId || item.id); }

  vehicleSectionRoute(section: PublicHomepageSection): string {
    return String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? "/sales" : "/fleet";
  }

  vehicleSectionBadge(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales" ? "Satılık Araçlar" : "Kiralık Araçlar";
  }

  vehicleSectionSubtitle(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales"
      ? this.homeContent().salesDescription || "İlanları, teknik bilgileri ve fiyatları karşılaştırın. Beğendiğiniz aracı doğrudan açın."
      : this.homeContent().featuredSubtitle || "Müsait araçları ve günlük fiyatları karşılaştırın. Tarihinize uyan aracı hızlıca seçin.";
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
