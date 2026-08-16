import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject } from "@angular/core";
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
  selector: "app-home-v68",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent],
  styles: [`
    :host{display:block;background:#030817;color:#e8eef8}
    *{box-sizing:border-box}
    .hero{position:relative;isolation:isolate;overflow:hidden;background:#061022 center/cover no-repeat}
    .hero::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(2,6,23,.82),rgba(2,6,23,.97))}
    .hero::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 88% 16%,rgba(37,99,235,.28),transparent 33%),radial-gradient(circle at 8% 78%,rgba(14,116,144,.13),transparent 32%)}
    .hero-inner{width:min(100% - 2rem,80rem);margin:auto;padding:2.2rem 0 2rem;display:grid;gap:1.25rem}
    .eyebrow{display:inline-flex;align-items:center;min-height:32px;width:max-content;max-width:100%;border:1px solid rgba(147,197,253,.28);border-radius:999px;background:rgba(15,23,42,.55);padding:.42rem .8rem;font-size:.67rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase;color:#bfdbfe}
    .hero h1{margin:1rem 0 0;max-width:850px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.1rem,10vw,3.25rem);line-height:.99;letter-spacing:-.025em;color:#fff}
    .hero-copy{margin:.9rem 0 0;max-width:700px;font-size:.98rem;line-height:1.7;color:#d5deeb}
    .desktop-search{display:none;margin-top:1.25rem;max-width:660px}
    .search-shell{display:flex;align-items:center;gap:.55rem;min-height:56px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(3,8,23,.65);padding:.4rem;backdrop-filter:blur(14px);box-shadow:0 18px 45px rgba(2,6,23,.3)}
    .search-shell input{min-width:0;flex:1;border:0;background:transparent;padding:.7rem .35rem;color:#fff;font:700 .9rem/1.2 inherit;outline:none}.search-shell input::placeholder{color:#94a3b8}.search-shell button{min-height:44px;border:0;border-radius:12px;background:#2563eb;padding:0 1.15rem;color:#fff;font-weight:850;cursor:pointer}
    .planner{border:1px solid rgba(148,163,184,.24);border-radius:24px;background:linear-gradient(160deg,rgba(9,19,38,.96),rgba(8,17,34,.9));padding:1rem;box-shadow:0 28px 70px rgba(2,6,23,.36),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(18px)}
    .planner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.planner-kicker{margin:0;color:#93c5fd;font-size:.64rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.planner h2{margin:.3rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.7rem;line-height:1.05;color:#fff}.planner-copy{margin:.5rem 0 0;color:#a8b4c7;font-size:.78rem;line-height:1.55}.planner-icon{display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:15px;background:rgba(37,99,235,.16);color:#93c5fd}
    .field-grid{display:grid;grid-template-columns:1fr;gap:.72rem;margin-top:1rem}.field{display:block}.field-label{display:block;margin:0 0 .38rem;color:#aab6c8;font-size:.67rem;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.control{width:100%;min-height:50px;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:#050b18;padding:0 .9rem;color:#fff;font:750 .86rem/1.2 inherit;outline:none;color-scheme:dark}.control:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.18)}select.control{appearance:auto}.planner-action{display:flex;width:100%;min-height:51px;margin-top:.85rem;align-items:center;justify-content:center;gap:.5rem;border:0;border-radius:14px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 14px 30px rgba(37,99,235,.2)}.planner-action:focus-visible{outline:3px solid rgba(147,197,253,.85);outline-offset:2px}.planner-note{margin:.65rem 0 0;color:#8390a4;font-size:.7rem;line-height:1.45}
    .section{padding:2.3rem 0}.section.light{background:#f8fafc;color:#0f172a}.section.dark{background:#050b18;color:#f8fafc}.section.soft{background:#eef3f9;color:#0f172a}.section-inner{width:min(100% - 2rem,80rem);margin:auto}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-kicker{margin:0;color:#2563eb;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.dark .section-kicker{color:#93c5fd}.section h2{margin:.28rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.65rem,7vw,2.7rem);line-height:1.04}.section-desc{margin:.5rem 0 0;max-width:720px;color:#64748b;font-size:.84rem;line-height:1.6}.dark .section-desc{color:#9eabc0}.view-all{display:none;min-height:42px;align-items:center;gap:.25rem;border-radius:12px;padding:0 .8rem;color:inherit;font-size:.78rem;font-weight:850;text-decoration:none}.view-all:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
    .showcase-strip,.tour-strip,.campaign-strip{display:flex;gap:.85rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:.2rem .1rem .9rem;scrollbar-width:none}.showcase-strip::-webkit-scrollbar,.tour-strip::-webkit-scrollbar,.campaign-strip::-webkit-scrollbar{display:none}.showcase-card{flex:0 0 min(82vw,330px);scroll-snap-align:start;min-width:0;border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.09)}
    .tour-card{position:relative;flex:0 0 min(82vw,340px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:#0d1728;color:#fff;text-decoration:none;box-shadow:0 18px 38px rgba(0,0,0,.18);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}.tour-card:active{transform:scale(.985)}.tour-card:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.tour-image{aspect-ratio:16/10;overflow:hidden;background:#111827}.tour-image img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}.tour-body{padding:1rem}.tour-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem}.tour-title{margin:0;font-size:1rem;line-height:1.3;font-weight:900}.tour-price{flex:0 0 auto;color:#fbbf24;font-size:.82rem;font-weight:900}.tour-desc{margin:.55rem 0 0;color:#a8b4c7;font-size:.76rem;line-height:1.55}.link-cue{display:inline-flex;margin-top:.85rem;align-items:center;gap:.25rem;color:#fbbf24;font-size:.75rem;font-weight:900}
    .campaigns{position:relative;overflow:hidden;background:linear-gradient(145deg,#071124,#0b1529 55%,#101827);color:#fff}.campaigns::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 8% 12%,rgba(37,99,235,.18),transparent 34%),radial-gradient(circle at 92% 86%,rgba(245,158,11,.11),transparent 32%)}.campaign-card{position:relative;flex:0 0 min(86vw,350px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:#fff;color:#0f172a;text-decoration:none;box-shadow:0 20px 45px rgba(2,6,23,.28);transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}.campaign-card:active{transform:scale(.985)}.campaign-card:focus-visible{outline:3px solid #fbbf24;outline-offset:3px}.campaign-media{position:relative;aspect-ratio:16/9;overflow:hidden;background:#172033}.campaign-media img{width:100%;height:100%;object-fit:cover;transition:transform .38s ease}.campaign-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.6),transparent 58%)}.campaign-badge{position:absolute;z-index:2;left:.75rem;top:.75rem;max-width:calc(100% - 1.5rem);border-radius:999px;background:rgba(2,6,23,.9);padding:.38rem .65rem;color:#f8fafc;font-size:.6rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.campaign-time{position:absolute;z-index:2;left:.75rem;bottom:.7rem;border-radius:999px;background:#fff;padding:.34rem .6rem;color:#0f172a;font-size:.62rem;font-weight:900}.campaign-body{padding:1rem}.campaign-title{margin:0;font-size:1.03rem;line-height:1.27;font-weight:950}.campaign-copy{margin:.55rem 0 0;color:#536176;font-size:.77rem;line-height:1.55}.campaign-bottom{display:flex;margin-top:.9rem;align-items:end;justify-content:space-between;gap:.75rem}.old-price{display:block;color:#94a3b8;font-size:.67rem;font-weight:750;text-decoration:line-through}.new-price{display:block;margin-top:.05rem;color:#0f172a;font-size:1.05rem;font-weight:950}.campaign-cta{display:inline-flex;min-height:40px;align-items:center;gap:.2rem;border-radius:12px;background:#0f172a;padding:0 .72rem;color:#fff;font-size:.7rem;font-weight:900;white-space:nowrap}
    .partner{background:#050b18;padding:2.5rem 0 7rem;color:#fff}.partner-card{width:min(100% - 2rem,80rem);margin:auto;border:1px solid rgba(96,165,250,.18);border-radius:26px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(15,23,42,.85));padding:1.35rem}.partner-card p:first-child{margin:0;color:#93c5fd;font-size:.65rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.partner-card h2{margin:.45rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.8rem;line-height:1.08}.partner-copy{margin:.7rem 0 0;color:#b3bfd0;font-size:.84rem;line-height:1.6}.partner-link{display:flex;min-height:50px;margin-top:1rem;align-items:center;justify-content:center;gap:.45rem;border-radius:14px;background:#fff;color:#0f172a;font-weight:900;text-decoration:none}.partner-link:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
    .loading{padding:3rem 1rem;text-align:center;background:#f8fafc;color:#475569;font-weight:800}
    @media(min-width:640px){.field-grid{grid-template-columns:1fr 1fr}.field.service,.field.pickup{grid-column:1/-1}.partner-card{padding:1.8rem}}
    @media(min-width:768px){.desktop-search{display:block}.view-all{display:inline-flex}.showcase-strip,.tour-strip,.campaign-strip{display:grid;overflow:visible;scroll-snap-type:none}.showcase-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.tour-strip,.campaign-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.showcase-card,.tour-card,.campaign-card{width:auto;max-width:none;flex:auto}.partner{padding-bottom:3rem}}
    @media(min-width:1024px){.hero::before{background:linear-gradient(90deg,rgba(2,6,23,.97) 0%,rgba(2,6,23,.8) 55%,rgba(2,6,23,.62) 100%)}.hero-inner{grid-template-columns:minmax(0,1.08fr) minmax(360px,.72fr);align-items:center;gap:2.5rem;padding:4.5rem 0}.hero h1{font-size:clamp(3.4rem,5.5vw,5.1rem)}.planner{padding:1.25rem}.showcase-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.tour-strip,.campaign-strip{grid-template-columns:repeat(3,minmax(0,1fr))}.section{padding:3.5rem 0}.partner-card{display:grid;grid-template-columns:1fr auto;align-items:center;gap:2rem;padding:2rem}.partner-link{min-width:230px;margin-top:0}}
    @media(min-width:1280px){.showcase-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(hover:hover) and (pointer:fine){.tour-card:hover,.campaign-card:hover{transform:translateY(-5px);box-shadow:0 28px 58px rgba(2,6,23,.32)}.tour-card:hover{border-color:rgba(251,191,36,.38)}.campaign-card:hover{border-color:rgba(96,165,250,.5)}.tour-card:hover img,.campaign-card:hover img{transform:scale(1.045)}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
  template: `
    <main>
      <section class="hero" [style.backgroundImage]="'url(' + heroImage() + ')'" aria-labelledby="home-v68-title">
        <div class="hero-inner">
          <div>
            <p class="eyebrow">{{ heroEyebrow() }}</p>
            <h1 id="home-v68-title">{{ homeContent().heroTitle || 'Aracınızı seçin. Rotanızı belirleyin. Yola güvenle çıkın.' }}</h1>
            <p class="hero-copy">{{ homeContent().heroSubtitle || 'Kiralama, satış ve bölgesel tur seçeneklerini tek yerde karşılaştırın. Tarihinize ve ihtiyacınıza uyan seçeneği doğrudan bulun.' }}</p>

            <div class="desktop-search" role="search" aria-label="Araç ve tur arama">
              <label for="home-v68-search" class="sr-only">İlan numarası, marka, model veya tur ara</label>
              <div class="search-shell">
                <mat-icon aria-hidden="true">search</mat-icon>
                <input id="home-v68-search" type="search" inputmode="search" autocomplete="off" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" placeholder="İlan no, marka, model veya tur ara" aria-label="İlan numarası, marka, model veya tur ara" />
                <button type="button" (click)="performSearch()">Ara</button>
              </div>
            </div>
          </div>

          <aside class="planner" aria-labelledby="planner-title">
            <div class="planner-head">
              <div>
                <p class="planner-kicker">Hızlı Planlama</p>
                <h2 id="planner-title">{{ homeContent().bookingTitle || 'Yolculuğunuzu Planlayın' }}</h2>
                <p class="planner-copy">Hizmeti, tarihi ve teslim noktasını seçin. Uygun seçeneklere tek adımda geçin.</p>
              </div>
              <span class="planner-icon"><mat-icon aria-hidden="true">event_available</mat-icon></span>
            </div>

            <div class="field-grid">
              <label class="field service" for="booking-service">
                <span class="field-label">Hizmet Türü</span>
                <select id="booking-service" name="booking-service" class="control" [(ngModel)]="serviceType" aria-label="Hizmet türünü seçin">
                  @for (option of bookingServices(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>

              <label class="field" for="booking-start-date">
                <span class="field-label">Alış Tarihi</span>
                <input id="booking-start-date" name="booking-start-date" class="control" type="date" [(ngModel)]="startDate" [min]="today" aria-label="Alış tarihini seçin" />
              </label>

              <label class="field" for="booking-end-date">
                <span class="field-label">İade Tarihi</span>
                <input id="booking-end-date" name="booking-end-date" class="control" type="date" [(ngModel)]="endDate" [min]="startDate || today" aria-label="İade tarihini seçin" />
              </label>

              <label class="field pickup" for="booking-pickup">
                <span class="field-label">Teslim Alma Noktası</span>
                <select id="booking-pickup" name="booking-pickup" class="control" [(ngModel)]="selectedPickupId" aria-label="Aracı veya tur hizmetini alacağınız noktayı seçin">
                  <option value="">Teslim alma noktası seçin</option>
                  @if (pickupPoints().length === 0) {
                    <option value="" disabled>Aktif teslim noktaları yükleniyor</option>
                  }
                  @for (branch of pickupPoints(); track branch.id) {
                    <option [value]="branch.id">{{ branch.name }} · {{ branch.district || branch.city }}</option>
                  }
                </select>
              </label>
            </div>

            <button type="button" class="planner-action" (click)="searchAvailability()" aria-label="Seçimlere göre uygun seçenekleri göster">
              <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              {{ bookingButtonLabel() }}
            </button>
            <p class="planner-note">Müsaitlik ve hizmet kapsamı talep sırasında doğrulanır.</p>
          </aside>
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {
        <div class="loading" role="status" aria-live="polite">Vitrin yükleniyor...</div>
      }

      @for (section of managedSections(); track section.sectionKey) {
        @if (section.sectionType === 'VEHICLES' && sectionVehicles(section).length > 0) {
          <section class="section light" [attr.aria-labelledby]="section.sectionKey + '-v68-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">{{ vehicleSectionBadge(section) }}</p>
                  <h2 [id]="section.sectionKey + '-v68-title'">{{ section.title }}</h2>
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
          <section class="section dark" [attr.aria-labelledby]="section.sectionKey + '-v68-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Rota & Deneyim</p>
                  <h2 [id]="section.sectionKey + '-v68-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().toursSubtitle || 'Bölgedeki rotaları, buluşma noktalarını ve tur kapsamını karşılaştırın.' }}</p>
                </div>
                <a class="view-all" routerLink="/tours">Tüm Turlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="tour-strip" aria-label="Tur vitrini">
                @for (tour of sectionTours(section); track stableVehicleKey(tour)) {
                  <a class="tour-card" [routerLink]="['/tour', tour.id]" [attr.aria-label]="entityTitle(tour) + ' turunu incele'">
                    <div class="tour-image"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" loading="lazy" /></div>
                    <div class="tour-body">
                      <div class="tour-top"><h3 class="tour-title">{{ entityTitle(tour) }}</h3>@if (tour.price) {<strong class="tour-price">{{ formatPrice(tour.price) }}</strong>}</div>
                      <p class="tour-desc">{{ tour.description || tour.location || 'Tur ayrıntılarını ve rota kapsamını inceleyin.' }}</p>
                      <span class="link-cue">Detayları Gör <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'CAMPAIGN' && campaignCards(section).length > 0) {
          <section class="section campaigns" [attr.aria-labelledby]="section.sectionKey + '-v68-title'">
            <div class="section-inner">
              <div class="section-head">
                <div>
                  <p class="section-kicker">Fırsatlar</p>
                  <h2 [id]="section.sectionKey + '-v68-title'">{{ section.title }}</h2>
                  <p class="section-desc">{{ homeContent().campaignBannerSubtitle || 'Size gerçekten avantaj sağlayan kiralama, özel gün ve tur seçeneklerini süre ve fiyat bilgileriyle karşılaştırın.' }}</p>
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
                      <p class="campaign-copy">{{ campaign.shortDescription || campaign.description || 'Koşulları ve avantajı görmek için fırsatı inceleyin.' }}</p>
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

        @if (section.sectionType === 'BLOG' && sectionBlogs(section).length > 0) {
          <section class="section soft" [attr.aria-labelledby]="section.sectionKey + '-v68-title'">
            <div class="section-inner">
              <div class="section-head">
                <div><p class="section-kicker">Rehber</p><h2 [id]="section.sectionKey + '-v68-title'">{{ section.title }}</h2></div>
                <a class="view-all" routerLink="/blog">Tüm Yazılar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="tour-strip">
                @for (post of sectionBlogs(section); track post.cloudId || post.id) {
                  <a class="tour-card" [routerLink]="['/blog', post.id]">
                    <div class="tour-image"><img [src]="post.image || fallbackImage" [alt]="post.title" loading="lazy" /></div>
                    <div class="tour-body"><h3 class="tour-title">{{ post.title }}</h3><p class="tour-desc">{{ post.summary }}</p><span class="link-cue">Yazıyı Oku <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                  </a>
                }
              </div>
            </div>
          </section>
        }
      }

      <section class="partner" aria-labelledby="partner-v68-title">
        <div class="partner-card">
          <div><p>Araç Sahipleri İçin</p><h2 id="partner-v68-title">{{ homeContent().partnerTitle || 'Aracınız kazanca dönüşsün' }}</h2><p class="partner-copy">{{ homeContent().partnerSubtitle || 'Aracınız için değerlendirme veya iş ortaklığı başvurusu oluşturun. Ekibimiz süreci sizinle netleştirsin.' }}</p></div>
          <a class="partner-link" routerLink="/list-your-car">Aracımı Değerlendir <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
        </div>
      </section>
    </main>
  `,
})
export class HomeV68Component {
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

  searchQuery = "";
  startDate = "";
  endDate = "";
  serviceType: "individual" | "driver" | "wedding" | "tour" = "individual";
  selectedPickupId = "";
  readonly today = this.toDateInput(new Date());

  readonly heroImage = computed(() => {
    const candidate = (this.config().seoOgImage || "").trim();
    return /^https:\/\//i.test(candidate) ? candidate : this.fallbackHero;
  });

  readonly heroEyebrow = computed(() => {
    const configured = String(this.homeContent().heroTrustLine || "").trim();
    if (configured && !/premium/i.test(configured)) return configured;
    return "Kiralama • Satış • Tur";
  });

  readonly bookingServices = computed(() => [
    { value: "individual" as const, label: "Şoförsüz Araç Kiralama" },
    { value: "driver" as const, label: "Şoförlü Transfer" },
    { value: "wedding" as const, label: "Düğün / Özel Gün" },
    { value: "tour" as const, label: "Özel Tur" },
  ]);

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: "rental_featured", title: "Kiralık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 10, maxItems: 6, settings: { category: "RENTAL" } },
    { sectionKey: "sale_featured", title: "Satılık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 20, maxItems: 6, settings: { category: "SALE" } },
    { sectionKey: "tour_featured", title: "Öne Çıkan Turlar", sectionType: "TOURS", isEnabled: true, sortOrder: 30, maxItems: 6, settings: {} },
    { sectionKey: "campaigns", title: "Size Uyan Fırsatı Seçin", sectionType: "CAMPAIGN", isEnabled: true, sortOrder: 40, maxItems: 3, settings: {} },
    { sectionKey: "blog_featured", title: "Son Yazılar", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length) return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.error()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

  constructor() {
    void this.homepageLayout.load();
    void this.branchService.refresh();
    void this.campaignService.loadPublic().catch(() => undefined);

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
    return (matched.length ? matched : source).slice(0, section.maxItems);
  }

  sectionTours(section: PublicHomepageSection): Vehicle[] {
    const source = this.tours();
    const ids = this.placementIds(section, "TOUR");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = this.vehicleIndex(source);
    const matched = ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item));
    return (matched.length ? matched : source).slice(0, section.maxItems);
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
    const matched = ids.map((id) => byId.get(id)).filter((item): item is BlogPost => Boolean(item));
    return (matched.length ? matched : source).slice(0, section.maxItems);
  }

  campaignCards(section: PublicHomepageSection): CampaignRecord[] {
    const source = this.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = this.placementIds(section, "CAMPAIGN");
    if (ids === null) return source.slice(0, section.maxItems);
    if (ids.length === 0) return [];
    const byId = new Map(source.map((item) => [String(item.id), item]));
    const matched = ids.map((id) => byId.get(id)).filter((item): item is CampaignRecord => Boolean(item));
    return (matched.length ? matched : source).slice(0, section.maxItems);
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
      const vehicle = [...this.rentalCars(), ...this.saleCars()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId));
      return vehicle?.category === "SALE" ? `/sales/${encodeURIComponent(vehicle.id)}` : `/fleet/${encodeURIComponent(vehicle?.id || campaign.targetId)}`;
    }
    return "/campaigns";
  }

  countdown(value: string): string {
    const remaining = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return "Süre doldu";
    const totalHours = Math.floor(remaining / 3_600_000);
    const days = Math.floor(totalHours / 24);
    return days > 0 ? `${days} gün kaldı` : `${Math.max(1, totalHours)} saat kaldı`;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  }

  private vehicleIndex(source: Vehicle[]): Map<string, Vehicle> {
    const index = new Map<string, Vehicle>();
    for (const item of source) {
      index.set(String(item.id), item);
      if (item.cloudId) index.set(String(item.cloudId), item);
      if (item.cloudStockCode) index.set(String(item.cloudStockCode), item);
    }
    return index;
  }

  private placementIds(section: PublicHomepageSection, type: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN"): string[] | null {
    if (this.homepageLayout.error()) return null;
    return this.homepageLayout.placementsFor(section.sectionKey).filter((item) => item.entityType === type).map((item) => item.entityId);
  }

  private isLiveCampaign(item: CampaignRecord): boolean {
    if (!item.isActive || item.publicationStatus !== "PUBLISHED") return false;
    const now = Date.now();
    const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return (!item.startsAt || Number.isFinite(start) && start <= now) && (!item.endsAt || Number.isFinite(end) && end > now);
  }

  private toDateInput(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }
}
