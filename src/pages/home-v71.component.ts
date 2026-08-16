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
  selector: "app-home-v71",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent],
  template: `
    <main class="home-root">
      <section class="hero" [style.backgroundImage]="'url(' + heroImage() + ')'" aria-labelledby="home-v71-title">
        <div class="hero-inner">
          <div class="hero-copy-block">
            <p class="eyebrow">{{ brandName() }} · Kiralama · Satış · Tur</p>
            <h1 id="home-v71-title">{{ homeContent().heroTitle || 'Aracınızı seçin. Tarihinizi belirleyin. Yola güvenle çıkın.' }}</h1>
            <p class="hero-copy">{{ homeContent().heroSubtitle || 'Kiralık ve satılık araçları, bölgesel turları ve gerçek kampanyaları tek yerde karşılaştırın.' }}</p>
            <div class="desktop-search" role="search">
              <label class="sr-only" for="home-search-v71">Araç, tur veya ilan ara</label>
              <div class="search-shell"><mat-icon aria-hidden="true">search</mat-icon><input id="home-search-v71" type="search" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" autocomplete="off" placeholder="Marka, model, tur veya ilan no" /><button type="button" (click)="performSearch()">Ara</button></div>
            </div>
          </div>

          <aside class="planner" aria-labelledby="planner-v71-title">
            <div class="planner-head">
              <div><p class="planner-kicker">Hızlı Planlama</p><h2 id="planner-v71-title">{{ homeContent().bookingTitle || 'Tarihini Seç, Sana Uyan Aracı Gör' }}</h2><p class="planner-copy">{{ homeContent().bookingSubtitle || 'Hizmet, teslim noktası ve tarih. Gereksiz form yok; önce uygun seçenekleri görün.' }}</p></div>
              <span class="planner-icon" aria-hidden="true"><mat-icon>event_available</mat-icon></span>
            </div>

            <div class="field-grid">
              <label class="field"><span>Hizmet</span><select [(ngModel)]="serviceType" name="homeService"><option value="individual">Şoförsüz Araç Kiralama</option><option value="driver">Şoförlü Transfer</option><option value="wedding">Düğün / Özel Gün</option><option value="tour">Özel Tur</option></select></label>
              <label class="field"><span>Teslim noktası</span><select [(ngModel)]="selectedPickupId" name="homePickup"><option value="">Teslim noktası seçin</option>@for (branch of pickupPoints(); track branch.id) {<option [value]="branch.id">{{ branch.name }} · {{ branch.district || branch.city }}</option>}</select></label>
              <div class="date-grid">
                <label class="field"><span>{{ serviceType === 'tour' ? 'Tur tarihi' : 'Alış tarihi' }}</span><input type="date" [(ngModel)]="startDate" name="homeStartDate" [min]="today" (ngModelChange)="onStartDateChanged($event)" /></label>
                @if (serviceType !== 'tour') {<label class="field"><span>İade tarihi</span><input type="date" [(ngModel)]="endDate" name="homeEndDate" [min]="startDate || today" /></label>}
              </div>
            </div>

            @if (plannerError()) { <p class="planner-error" role="alert">{{ plannerError() }}</p> }
            <button type="button" class="planner-action" (click)="searchAvailability()"><span>{{ bookingButtonLabel() }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
            @if (plannerSummary()) { <p class="planner-summary" aria-live="polite">{{ plannerSummary() }}</p> }
          </aside>
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) { <div class="loading" role="status">Vitrin hazırlanıyor...</div> }

      @for (section of managedSections(); track section.sectionKey) {
        @if (section.sectionType === 'CAMPAIGN' && campaignCards(section).length > 0) {
          <section class="section campaigns" [attr.aria-labelledby]="section.sectionKey + '-v71-title'">
            <div class="section-inner">
              <div class="section-head"><div><p class="section-kicker">{{ brandName() }} · Seçili Fırsatlar</p><h2 [id]="section.sectionKey + '-v71-title'">{{ section.title }}</h2><p class="section-desc">{{ homeContent().campaignBannerSubtitle || 'Fiyat farkını, pakete dahil olanları ve geçerlilik süresini aynı kartta görün.' }}</p></div><a class="view-all" routerLink="/campaigns">Tüm Kampanyalar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
              <div class="campaign-strip">
                @for (campaign of campaignCards(section); track campaign.id) {
                  <article class="campaign-card">
                    <a class="campaign-media" [href]="campaignHref(campaign)" [attr.aria-label]="campaign.title + ' kampanyasını aç'"><img [src]="campaign.coverImage || fallbackImage" [alt]="campaign.title" loading="lazy" />@if (campaign.badge || campaign.discountPercent) {<span class="campaign-badge">{{ campaign.badge || ('%' + campaign.discountPercent + ' avantaj') }}</span>}@if (campaign.endsAt) {<span class="campaign-time">{{ countdown(campaign.endsAt) }}</span>}</a>
                    <div class="campaign-body">
                      <p class="campaign-intent">{{ campaignIntentLabel(campaign) }}</p>
                      <h3>{{ campaign.title }}</h3>
                      <p class="campaign-copy">{{ campaign.shortDescription || campaign.description || 'Kampanya koşullarını ve size sağlayacağı avantajı inceleyin.' }}</p>
                      @if (campaignBenefits(campaign).length) {<ul class="benefit-list">@for (benefit of campaignBenefits(campaign); track benefit) {<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ benefit }}</span></li>}</ul>}
                      @if (campaignActionPrompt(campaign)) {<p class="action-prompt">{{ campaignActionPrompt(campaign) }}</p>}
                      <div class="campaign-price-row"><div>@if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old-price">{{ formatPrice(campaign.oldPrice) }}</span>}@if (campaign.newPrice != null) {<strong class="new-price">{{ formatPrice(campaign.newPrice) }}</strong>}</div>@if (campaignSavings(campaign) > 0) {<div class="saving"><span>Kazanç</span><strong>{{ formatPrice(campaignSavings(campaign)) }}</strong></div>}</div>
                      @if (campaignCondition(campaign)) {<p class="condition">{{ campaignCondition(campaign) }}</p>}
                      <a class="campaign-cta" [href]="campaignHref(campaign)">{{ campaign.ctaLabel || 'Kampanyayı İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
                    </div>
                  </article>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'VEHICLES' && sectionVehicles(section).length > 0) {
          <section class="section light" [attr.aria-labelledby]="section.sectionKey + '-v71-title'">
            <div class="section-inner"><div class="section-head"><div><p class="section-kicker">{{ brandName() }} · {{ vehicleSectionBadge(section) }}</p><h2 [id]="section.sectionKey + '-v71-title'">{{ section.title }}</h2><p class="section-desc">{{ vehicleSectionSubtitle(section) }}</p></div><a class="view-all" [routerLink]="vehicleSectionRoute(section)">{{ vehicleSectionViewAll(section) }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
              <div class="showcase-strip">@for (car of sectionVehicles(section); track stableVehicleKey(car)) {<div class="showcase-card"><app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item></div>}</div>
            </div>
          </section>
        }

        @if (section.sectionType === 'TOURS' && sectionTours(section).length > 0) {
          <section class="section dark" [attr.aria-labelledby]="section.sectionKey + '-v71-title'">
            <div class="section-inner"><div class="section-head"><div><p class="section-kicker">{{ brandName() }} · Rota & Deneyim</p><h2 [id]="section.sectionKey + '-v71-title'">{{ section.title }}</h2><p class="section-desc">{{ homeContent().toursSubtitle || 'Rotayı, buluşma noktasını ve tur kapsamını karşılaştırın.' }}</p></div><a class="view-all" routerLink="/tours">Tüm Turlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
              <div class="tour-strip">@for (tour of sectionTours(section); track stableVehicleKey(tour)) {<a class="tour-card" [routerLink]="['/tour', tour.id]"><div class="card-image"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" loading="lazy" /></div><div class="card-body"><div class="card-top"><h3>{{ entityTitle(tour) }}</h3>@if (tour.price) {<strong>{{ formatPrice(tour.price) }}</strong>}</div><p>{{ tour.description || tour.location || 'Tur ayrıntılarını inceleyin.' }}</p><span>Turu İncele <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div></a>}</div>
            </div>
          </section>
        }

        @if (section.sectionType === 'CUSTOM' && section.sectionKey === 'branches') {
          <section class="section branches-section" aria-labelledby="branches-v71-title">
            <div class="section-inner">
              <div class="section-head"><div><p class="section-kicker">{{ brandName() }} · Hizmet Ağı</p><h2 id="branches-v71-title">{{ section.title || 'Şubelerimiz ve İş Ortaklığı' }}</h2><p class="section-desc">Mevcut hizmet noktalarını görün. Kendi bölgenizde Alperler Auto iş ortağı olmak istiyorsanız aynı altyapıya başvurun.</p></div><a class="view-all" routerLink="/branches">Tüm Şubeler <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
              <div class="branch-strip">
                @for (branch of branchCards(section); track branch.id) {<a class="branch-card" routerLink="/branches"><span class="branch-icon" aria-hidden="true"><mat-icon>storefront</mat-icon></span><p class="branch-label">Aktif Hizmet Noktası</p><h3>{{ branch.name }}</h3><p>{{ branch.addressLabel }}</p><div class="branch-meta">@if (branch.isPickupPoint) {<span>Teslim Alma</span>}@if (branch.isReturnPoint) {<span>İade</span>}@if (branchServiceSummary(branch)) {<span>{{ branchServiceSummary(branch) }}</span>}</div><strong class="branch-link">Şube Bilgileri <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong></a>}
                <a class="branch-card partner-card" routerLink="/branch-partner"><span class="branch-icon" aria-hidden="true"><mat-icon>add_business</mat-icon></span><p class="branch-label">Yeni Bölge / Yeni Şube</p><h3>Kendi Bölgenizde Alperler Auto ile Çalışın</h3><p>Kendi araçlarınızı veya bölgenizdeki uygun araçları kiralık ve satılık olarak yayınlayabileceğiniz iş ortaklığı modeline başvurun.</p><div class="branch-meta"><span>Merkezi İlan Altyapısı</span><span>Müşteri Talepleri</span><span>Şube Görünürlüğü</span></div><strong class="branch-link">Şube Başvurusu Yap <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong></a>
              </div>
              <p class="branch-disclaimer">Başvuru otomatik bayilik hakkı vermez. Bölge, operasyon ve marka uygunluğu kontrolünden sonra sözleşme ile aktive edilir.</p>
            </div>
          </section>
        }

        @if (section.sectionType === 'CUSTOM' && section.sectionKey === 'partner') {
          <section class="vehicle-partner" aria-labelledby="vehicle-partner-v71-title"><div class="vehicle-partner-card"><div><p class="section-kicker">{{ brandName() }} · Araç Sahipleri</p><h2 id="vehicle-partner-v71-title">Aracınızı Değerlendirin</h2><p>Aracınızı satmak veya filoya kiralamak istiyorsanız bilgileri gönderin. Önce değerlendirme yapılır, sonra uygun model birlikte netleştirilir.</p></div><a routerLink="/list-your-car">Aracımı Değerlendir <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div></section>
        }

        @if (section.sectionType === 'BLOG' && sectionBlogs(section).length > 0) {
          <section class="section soft" [attr.aria-labelledby]="section.sectionKey + '-v71-title'"><div class="section-inner"><div class="section-head"><div><p class="section-kicker">{{ brandName() }} · Rehber</p><h2 [id]="section.sectionKey + '-v71-title'">{{ section.title }}</h2></div><a class="view-all" routerLink="/blog">Tüm Yazılar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div><div class="blog-strip">@for (post of sectionBlogs(section); track post.cloudId || post.id) {<a class="blog-card" [routerLink]="['/blog', post.id]"><div class="card-image"><img [src]="post.image || fallbackImage" [alt]="post.title" loading="lazy" /></div><div class="card-body"><h3>{{ post.title }}</h3><p>{{ post.summary }}</p><span>Yazıyı Oku <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div></a>}</div></div></section>
        }
      }
    </main>
  `,
  styles: [`
    :host{display:block}.home-root{background:#030817;color:#e8eef8}.hero{position:relative;overflow:hidden;background:#061022 center/cover no-repeat}.hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,23,.82),rgba(2,6,23,.96))}.hero-inner{position:relative;width:min(100% - 1.15rem,80rem);margin:auto;padding:.8rem 0 1rem;display:grid;gap:.7rem}.eyebrow,.planner-kicker,.section-kicker,.campaign-intent,.branch-label{margin:0;color:#93c5fd;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1{margin:.52rem 0 0;max-width:820px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.8rem,8vw,2.65rem);line-height:1.02;color:#fff}.hero-copy{margin:.5rem 0 0;max-width:680px;color:#d3dbe8;font-size:.82rem;line-height:1.55}.desktop-search{display:none;margin-top:.9rem;max-width:650px}.search-shell{display:flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(3,8,23,.72);padding:.34rem}.search-shell input{min-width:0;flex:1;border:0;background:transparent;padding:.65rem .2rem;color:#fff;outline:none}.search-shell button{min-height:42px;border:0;border-radius:11px;background:#2563eb;padding:0 1rem;color:#fff;font-weight:900}
    .planner{border:1px solid rgba(148,163,184,.22);border-radius:20px;background:rgba(7,15,30,.95);padding:.82rem;box-shadow:0 22px 48px rgba(2,6,23,.34)}.planner-head{display:flex;justify-content:space-between;gap:.7rem}.planner h2{margin:.16rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.38rem;color:#fff}.planner-copy{margin:.3rem 0 0;color:#a8b4c7;font-size:.68rem;line-height:1.45}.planner-icon{display:grid;width:38px;height:38px;place-items:center;border-radius:12px;background:rgba(37,99,235,.16);color:#93c5fd}.field-grid{display:grid;gap:.5rem;margin-top:.7rem}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}.field{display:flex;min-width:0;flex-direction:column;gap:.25rem}.field span{color:#aeb9c9;font-size:.58rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.field select,.field input{width:100%;min-height:44px;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:#050b18;padding:0 .7rem;color:#fff;outline:none}.field select:focus,.field input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.14)}.planner-action{display:flex;width:100%;min-height:48px;margin-top:.62rem;align-items:center;justify-content:center;gap:.35rem;border:0;border-radius:12px;background:#2563eb;color:#fff;font-size:.8rem;font-weight:950}.planner-error{margin:.55rem 0 0;border-radius:10px;background:rgba(244,63,94,.12);padding:.55rem .65rem;color:#fecdd3;font-size:.68rem;font-weight:800}.planner-summary{margin:.45rem 0 0;color:#94a3b8;font-size:.63rem;line-height:1.4}
    .loading{padding:2rem;text-align:center;background:#f8fafc;color:#475569;font-weight:800}.section{padding:2rem 0}.section-inner{width:min(100% - 1.2rem,80rem);margin:auto}.light{background:#f8fafc;color:#0f172a}.dark{background:#050b18;color:#fff}.soft{background:#eef3f9;color:#0f172a}.campaigns,.branches-section{background:linear-gradient(145deg,#071124,#0b1529);color:#fff}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:.85rem}.section h2{margin:.22rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.5rem,6.2vw,2.5rem);line-height:1.05}.section-desc{margin:.4rem 0 0;max-width:760px;color:#64748b;font-size:.76rem;line-height:1.55}.dark .section-desc,.campaigns .section-desc,.branches-section .section-desc{color:#a8b4c7}.view-all{display:none;align-items:center;gap:.15rem;color:inherit;font-size:.72rem;font-weight:900;text-decoration:none}.showcase-strip,.tour-strip,.campaign-strip,.blog-strip,.branch-strip{display:flex;gap:.72rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:.12rem .03rem .75rem;scrollbar-width:none}.showcase-strip::-webkit-scrollbar,.tour-strip::-webkit-scrollbar,.campaign-strip::-webkit-scrollbar,.blog-strip::-webkit-scrollbar,.branch-strip::-webkit-scrollbar{display:none}.showcase-card{flex:0 0 min(81vw,322px);scroll-snap-align:start;overflow:hidden;border-radius:20px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.09)}
    .campaign-card{flex:0 0 min(87vw,360px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#fff;color:#0f172a;box-shadow:0 20px 44px rgba(2,6,23,.25)}.campaign-media{position:relative;display:block;aspect-ratio:16/8.6;overflow:hidden;background:#172033}.campaign-media img{width:100%;height:100%;object-fit:cover}.campaign-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.62),transparent 58%)}.campaign-badge,.campaign-time{position:absolute;z-index:2;border-radius:999px;font-size:.56rem;font-weight:900}.campaign-badge{left:.65rem;top:.65rem;max-width:72%;background:#0f172a;padding:.34rem .55rem;color:#fff}.campaign-time{left:.65rem;bottom:.6rem;background:#fff;padding:.3rem .5rem;color:#0f172a}.campaign-body{padding:1rem}.campaign-body h3{margin:.25rem 0 0;font-size:1rem;line-height:1.25}.campaign-copy{margin:.45rem 0 0;color:#536176;font-size:.73rem;line-height:1.5}.benefit-list{display:grid;gap:.42rem;margin:.7rem 0 0;padding:0;list-style:none}.benefit-list li{display:flex;gap:.4rem;align-items:flex-start;color:#334155;font-size:.69rem;font-weight:800}.benefit-list mat-icon{width:16px;height:16px;font-size:16px;color:#059669}.action-prompt{margin:.72rem 0 0;border-radius:11px;background:#eff6ff;padding:.62rem;color:#1e40af;font-size:.7rem;font-weight:900;line-height:1.45}.campaign-price-row{display:flex;align-items:end;justify-content:space-between;gap:.6rem;margin-top:.75rem}.old-price{display:block;color:#94a3b8;font-size:.62rem;text-decoration:line-through}.new-price{font-size:1.05rem}.saving{display:flex;flex-direction:column;align-items:flex-end;border-radius:10px;background:#ecfdf5;padding:.4rem .55rem;color:#047857;font-size:.62rem}.saving strong{font-size:.75rem}.condition{margin:.6rem 0 0;color:#64748b;font-size:.62rem;line-height:1.45}.campaign-cta{display:flex;min-height:44px;margin-top:.75rem;align-items:center;justify-content:center;gap:.2rem;border-radius:12px;background:#0f172a;color:#fff;font-size:.72rem;font-weight:900;text-decoration:none}
    .tour-card,.blog-card{flex:0 0 min(82vw,338px);scroll-snap-align:start;overflow:hidden;border-radius:20px;text-decoration:none}.tour-card{border:1px solid rgba(255,255,255,.1);background:#0d1728;color:#fff}.blog-card{border:1px solid #dbe3ee;background:#fff;color:#0f172a}.card-image{aspect-ratio:16/10;background:#111827}.card-image img{width:100%;height:100%;object-fit:cover}.card-body{padding:.9rem}.card-top{display:flex;justify-content:space-between;gap:.6rem}.card-body h3{margin:0;font-size:.94rem}.card-top strong{color:#fbbf24;font-size:.78rem}.card-body p{margin:.45rem 0 0;color:#a8b4c7;font-size:.71rem;line-height:1.48}.blog-card .card-body p{color:#64748b}.card-body span{display:inline-flex;align-items:center;margin-top:.65rem;color:#93c5fd;font-size:.69rem;font-weight:900}.blog-card .card-body span{color:#2563eb}
    .branch-card{flex:0 0 min(84vw,350px);scroll-snap-align:start;display:flex;min-height:260px;flex-direction:column;border:1px solid rgba(148,163,184,.14);border-radius:22px;background:#0d1728;padding:1rem;color:#fff;text-decoration:none}.partner-card{background:linear-gradient(145deg,#172554,#0f172a);border-color:rgba(96,165,250,.3)}.branch-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:rgba(37,99,235,.16);color:#93c5fd}.branch-label{margin:.75rem 0 0;color:#93c5fd}.branch-card h3{margin:.25rem 0 0;font-size:1.02rem}.branch-card>p:not(.branch-label){margin:.45rem 0 0;color:#a8b4c7;font-size:.72rem;line-height:1.5}.branch-meta{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.7rem}.branch-meta span{border:1px solid rgba(148,163,184,.14);border-radius:999px;padding:.28rem .46rem;color:#cbd5e1;font-size:.56rem;font-weight:800}.branch-link{display:flex;align-items:center;gap:.15rem;margin-top:auto;padding-top:.85rem;color:#93c5fd;font-size:.7rem}.branch-disclaimer{margin:.35rem 0 0;color:#94a3b8;font-size:.62rem;line-height:1.5}
    .vehicle-partner{background:#050b18;padding:2rem 0}.vehicle-partner-card{width:min(100% - 1.2rem,80rem);margin:auto;display:grid;gap:1rem;border:1px solid rgba(96,165,250,.18);border-radius:22px;background:rgba(15,23,42,.86);padding:1.15rem}.vehicle-partner h2{margin:.3rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.7rem;color:#fff}.vehicle-partner p:not(.section-kicker){margin:.45rem 0 0;color:#a8b4c7;font-size:.76rem;line-height:1.55}.vehicle-partner a{display:flex;min-height:48px;align-items:center;justify-content:center;gap:.2rem;border-radius:12px;background:#fff;color:#0f172a;font-size:.8rem;font-weight:900;text-decoration:none}
    @media(min-width:768px){.hero-inner{padding:1.35rem 0 1.6rem}.field-grid{grid-template-columns:1fr 1fr}.date-grid{grid-column:1/-1}.view-all{display:inline-flex}.vehicle-partner-card{grid-template-columns:1fr auto;align-items:center}.vehicle-partner a{padding:0 1.2rem}.campaign-card{flex-basis:350px}.branch-card{flex-basis:350px}}
    @media(min-width:1024px){.hero-inner{grid-template-columns:minmax(0,1.08fr) minmax(360px,.72fr);align-items:center;gap:1.3rem;padding:2rem 0}.desktop-search{display:block}.planner{padding:1rem}.section{padding:2.8rem 0}.showcase-strip,.tour-strip,.campaign-strip,.blog-strip,.branch-strip{overflow-x:visible;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.showcase-card,.tour-card,.campaign-card,.blog-card,.branch-card{min-width:0;flex:auto}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `],
})
export class HomeV71Component {
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
  readonly plannerError = signal("");

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

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: "campaigns", title: "Gerçek Avantajı Gör, Kararını Kolaylaştır", sectionType: "CAMPAIGN", isEnabled: true, sortOrder: 5, maxItems: 3, settings: {} },
    { sectionKey: "rental_featured", title: "Kiralık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 10, maxItems: 6, settings: { category: "RENTAL" } },
    { sectionKey: "sale_featured", title: "Satılık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 20, maxItems: 6, settings: { category: "SALE" } },
    { sectionKey: "tour_featured", title: "Öne Çıkan Turlar", sectionType: "TOURS", isEnabled: true, sortOrder: 30, maxItems: 6, settings: {} },
    { sectionKey: "branches", title: "Şubelerimiz ve İş Ortaklığı", sectionType: "CUSTOM", isEnabled: true, sortOrder: 35, maxItems: 3, settings: { showPartnerCta: true } },
    { sectionKey: "partner", title: "Aracınızı Değerlendirin", sectionType: "CUSTOM", isEnabled: true, sortOrder: 40, maxItems: 1, settings: {} },
    { sectionKey: "blog_featured", title: "Son Yazılar", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length) return [...sections].filter((section) => section.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.loaded()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

  readonly plannerSummary = computed(() => {
    if (!this.startDate) return "";
    const start = this.formatShortDate(this.startDate);
    const end = this.serviceType === "tour" || !this.endDate ? "" : ` - ${this.formatShortDate(this.endDate)}`;
    const branch = this.pickupPoints().find((item) => item.id === this.selectedPickupId);
    return `${start}${end}${branch ? ` · ${branch.name}` : ""}`;
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
      const points = this.pickupPoints();
      if (!this.selectedPickupId && points.length === 1) this.selectedPickupId = points[0].id;
    });
    effect(() => {
      const config = this.config();
      this.seo.updateSeoTags({ title: config.seoTitle || `${config.companyName} | Araç Kiralama, Satış ve Turlar`, description: config.seoDescription || this.homeContent().heroSubtitle || config.companyName, keywords: config.seoKeywords, image: config.seoOgImage || config.logoUrl || this.fallbackHero });
    });
  }

  performSearch(): void { const q = this.searchQuery.trim(); void this.router.navigate(["/search"], { queryParams: q ? { q } : undefined }); }
  onStartDateChanged(value: string): void { if (this.endDate && value && this.endDate < value) this.endDate = ""; this.plannerError.set(""); }

  searchAvailability(): void {
    this.plannerError.set("");
    if (!this.startDate) { this.plannerError.set(this.serviceType === "tour" ? "Önce tur tarihini seçin." : "Önce alış tarihini seçin."); return; }
    if (this.serviceType !== "tour" && !this.endDate) { this.plannerError.set("İade tarihini de seçin."); return; }
    if (this.serviceType !== "tour" && this.endDate < this.startDate) { this.plannerError.set("İade tarihi alış tarihinden önce olamaz."); return; }
    const pickup = this.selectedPickupId || undefined;
    if (this.serviceType === "tour") { void this.router.navigate(["/tours"], { queryParams: { start: this.startDate, pickup } }); return; }
    void this.router.navigate(["/fleet"], { queryParams: { start: this.startDate, end: this.endDate, pickup, driver: this.serviceType === "driver" || this.serviceType === "wedding" ? "true" : undefined, occasion: this.serviceType === "wedding" ? "wedding" : undefined } });
  }

  bookingButtonLabel(): string { if (this.serviceType === "tour") return "Bu Tarihe Uyan Turları Göster"; if (this.serviceType === "driver") return "Şoförlü Araçları Göster"; if (this.serviceType === "wedding") return "Özel Gün Araçlarını Göster"; return "Tarihime Uyan Araçları Göster"; }

  sectionVehicles(section: PublicHomepageSection): Vehicle[] { const source = this.vehicleSectionRoute(section) === "/sales" ? this.saleCars() : this.rentalCars(); const ids = this.placementIds(section, "VEHICLE"); if (!ids?.length) return source.slice(0, section.maxItems); const map = this.vehicleIndex(source); return ids.map((id) => map.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems); }
  sectionTours(section: PublicHomepageSection): Vehicle[] { const source = this.tours(); const ids = this.placementIds(section, "TOUR"); if (!ids?.length) return source.slice(0, section.maxItems); const map = this.vehicleIndex(source); return ids.map((id) => map.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems); }
  sectionBlogs(section: PublicHomepageSection): BlogPost[] { const source = this.blogPosts(); const ids = this.placementIds(section, "BLOG"); if (!ids?.length) return source.slice(0, section.maxItems); const map = new Map<string,BlogPost>(); source.forEach((item) => { map.set(String(item.id), item); if (item.cloudId) map.set(String(item.cloudId), item); }); return ids.map((id) => map.get(id)).filter((item): item is BlogPost => Boolean(item)).slice(0, section.maxItems); }
  campaignCards(section: PublicHomepageSection): CampaignRecord[] { const source = this.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a,b) => a.sortOrder - b.sortOrder); const ids = this.placementIds(section, "CAMPAIGN"); if (!ids?.length) return source.slice(0, section.maxItems); const map = new Map(source.map((item) => [String(item.id), item])); return ids.map((id) => map.get(id)).filter((item): item is CampaignRecord => Boolean(item)).slice(0, section.maxItems); }
  branchCards(section: PublicHomepageSection): Branch[] { return this.branches().slice(0, Math.max(1, section.maxItems || 3)); }

  campaignBenefits(campaign: CampaignRecord): string[] { const raw = campaign.metadata?.["benefits"]; return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0,3) : []; }
  campaignActionPrompt(campaign: CampaignRecord): string { return typeof campaign.metadata?.["actionPrompt"] === "string" ? String(campaign.metadata["actionPrompt"]) : ""; }
  campaignCondition(campaign: CampaignRecord): string { return typeof campaign.metadata?.["conditionLine"] === "string" ? String(campaign.metadata["conditionLine"]) : typeof campaign.metadata?.["offerTerms"] === "string" ? String(campaign.metadata["offerTerms"]) : ""; }
  campaignSavings(campaign: CampaignRecord): number { return campaign.oldPrice != null && campaign.newPrice != null ? Math.max(0, campaign.oldPrice - campaign.newPrice) : 0; }
  campaignIntentLabel(campaign: CampaignRecord): string { const intent = String(campaign.metadata?.["intent"] || campaign.targetType || ""); if (intent === "RENTAL") return "Kiralama Fırsatı"; if (intent === "WEDDING") return "Özel Gün Paketi"; if (intent === "TOUR") return "Tur Fırsatı"; return "Seçili Fırsat"; }

  campaignHref(campaign: CampaignRecord): string { const cta = (campaign.ctaUrl || "").trim(); if (cta && (/^https:\/\//i.test(cta) || cta.startsWith("/"))) return cta; if (campaign.targetType === "TOUR" && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`; if (campaign.targetType === "VEHICLE" && campaign.targetId) { const vehicle = [...this.rentalCars(), ...this.saleCars()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId) || String(item.id) === String(campaign.targetId)); return vehicle?.category === "SALE" ? `/sales/${encodeURIComponent(vehicle.id)}` : `/fleet/${encodeURIComponent(vehicle?.id || campaign.targetId)}`; } return "/campaigns"; }
  countdown(value: string): string { const end = new Date(value).getTime(); const remaining = end - this.now(); if (!Number.isFinite(end) || remaining <= 0) return "Süre doldu"; const minutes = Math.floor(remaining / 60000); const days = Math.floor(minutes / 1440); const hours = Math.floor((minutes % 1440) / 60); return days > 0 ? `${days} gün ${hours} saat` : hours > 0 ? `${hours} saat kaldı` : `${Math.max(1,minutes)} dk kaldı`; }
  formatPrice(value: number): string { return new Intl.NumberFormat("tr-TR", { style:"currency", currency:"TRY", maximumFractionDigits:0 }).format(value); }
  stableVehicleKey(item: Vehicle): string { return String(item.cloudId || item.id); }
  entityTitle(item: Vehicle): string { return item.title || [item.brand,item.model,item.year].filter(Boolean).join(" ") || `İlan ${item.id}`; }
  vehicleSectionRoute(section: PublicHomepageSection): string { return String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? "/sales" : "/fleet"; }
  vehicleSectionBadge(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? "Satılık Araçlar" : "Kiralık Araçlar"; }
  vehicleSectionSubtitle(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? this.homeContent().salesDescription || "İlanları, teknik bilgileri ve fiyatları karşılaştırın." : this.homeContent().featuredSubtitle || "Müsait araçları, günlük fiyatları ve temel özellikleri karşılaştırın."; }
  vehicleSectionViewAll(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? "Tüm Satılık Araçlar" : "Tüm Kiralık Araçlar"; }
  branchServiceSummary(branch: Branch): string { const labels: Record<string,string> = { RENTAL:"Kiralama", SALES:"Satış", TOUR:"Tur", TRANSFER:"Transfer", PICKUP:"Teslim", RETURN:"İade" }; return (branch.services || []).slice(0,3).map((service) => labels[String(service)] || String(service)).join(" · "); }

  private placementIds(section: PublicHomepageSection, type: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN"): string[] | null { if (!this.homepageLayout.loaded() || this.homepageLayout.error()) return null; const values = this.homepageLayout.placementsFor(section.sectionKey).filter((item) => item.entityType === type).map((item) => item.entityId); return values.length ? values : null; }
  private vehicleIndex(source: Vehicle[]): Map<string,Vehicle> { const map = new Map<string,Vehicle>(); for (const item of source) { map.set(String(item.id),item); if (item.cloudId) map.set(String(item.cloudId),item); if (item.cloudStockCode) map.set(String(item.cloudStockCode),item); } return map; }
  private isLiveCampaign(item: CampaignRecord): boolean { if (!item.isActive || item.publicationStatus !== "PUBLISHED") return false; const now = this.now(); const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY; const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY; return (!item.startsAt || Number.isFinite(start) && start <= now) && (!item.endsAt || Number.isFinite(end) && end > now); }
  private parseLocalDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return null; const date = new Date(Number(match[1]),Number(match[2])-1,Number(match[3])); return Number.isNaN(date.getTime()) ? null : date; }
  private formatShortDate(value: string): string { const date = this.parseLocalDate(value); return date ? new Intl.DateTimeFormat("tr-TR",{ day:"numeric", month:"short" }).format(date) : value; }
  private toDateInput(date: Date): string { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0,10); }
}
