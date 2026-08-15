import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Vehicle } from "../models/car.model";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { BlogPost, CarService } from "../services/car.service";
import { BranchService } from "../services/branch.service";
import {
  HomepageLayoutService,
  PublicHomepageSection,
} from "../services/homepage-layout.service";
import { SeoService } from "../services/seo.service";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent],
  styles: [`
    :host{display:block;background:#020617;color:#e2e8f0}
    .hero-shell{background-position:center;background-size:cover;background-repeat:no-repeat}
    .hero-overlay{background:linear-gradient(180deg,rgba(2,6,23,.84),rgba(2,6,23,.95))}
    .glass{background:rgba(15,23,42,.78);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    .section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:#e2e8f0}
    .campaign-grid{display:grid;grid-template-columns:1fr;gap:1rem}
    .tour-grid,.blog-grid{display:grid;grid-template-columns:1fr;gap:1rem}
    .mobile-scroll{scrollbar-width:none}
    .mobile-scroll::-webkit-scrollbar{display:none}
    @media(min-width:640px){.campaign-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tour-grid,.blog-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(min-width:1024px){
      .hero-overlay{background:linear-gradient(90deg,rgba(2,6,23,.96) 0%,rgba(2,6,23,.82) 48%,rgba(2,6,23,.58) 100%)}
      .section-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .campaign-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
      .tour-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .blog-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    }
    @media(min-width:1280px){.section-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <section
        class="hero-shell relative isolate overflow-hidden"
        [style.backgroundImage]="'url(' + heroImage() + ')'"
        aria-labelledby="home-hero-title"
      >
        <div class="hero-overlay absolute inset-0 -z-10"></div>
        <div class="mx-auto grid min-h-[620px] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:min-h-[680px] lg:grid-cols-[1.15fr_.85fr] lg:gap-12 lg:px-8 lg:py-16">
          <div class="max-w-3xl pt-4 lg:pt-0">
            <p class="inline-flex min-h-9 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-[10px] font-black uppercase tracking-[.18em] text-blue-200 sm:text-xs">
              {{ homeContent().heroTrustLine || config().tagline || 'Kiralama • Satış • Tur' }}
            </p>

            <h1 id="home-hero-title" class="mt-5 max-w-3xl font-serif text-[2.35rem] font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              {{ homeContent().heroTitle || 'Yüksekova’da Güvenilir Araç Kiralama, Satış ve Turlar' }}
            </h1>
            <p class="mt-5 max-w-2xl text-sm font-medium leading-7 text-slate-200 sm:text-base lg:text-lg">
              {{ homeContent().heroSubtitle || 'Kiralık ve satılık araçları karşılaştırın, bölgesel tur seçeneklerini tek merkezden inceleyin.' }}
            </p>

            <div class="mt-7 max-w-2xl" role="search" aria-label="Site genelinde araç ve tur ara">
              <label for="home-search" class="sr-only">Araç veya tur ara</label>
              <div class="glass flex min-h-14 items-center gap-2 rounded-2xl border border-white/15 p-1.5 shadow-2xl sm:min-h-16">
                <mat-icon class="ml-2 shrink-0 text-slate-400" aria-hidden="true">search</mat-icon>
                <input
                  id="home-search"
                  type="search"
                  inputmode="search"
                  autocomplete="off"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="performHeroSearch()"
                  placeholder="Marka, model, tur veya ilan no ara"
                  class="min-w-0 flex-1 bg-transparent px-1 text-sm font-bold text-white outline-none placeholder:text-slate-400 sm:text-base"
                />
                <button
                  type="button"
                  (click)="performHeroSearch()"
                  class="min-h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:px-6 sm:text-sm"
                >
                  {{ homeContent().heroCta || 'Ara' }}
                </button>
              </div>

              @if (searchQuery.trim().length >= 2 && heroSearchResults().length > 0) {
                <div class="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl" aria-label="Arama önerileri">
                  @for (item of heroSearchResults(); track item.id) {
                    <a
                      [routerLink]="entityRoute(item)"
                      class="flex min-h-14 items-center gap-3 border-b border-white/5 px-4 py-2 last:border-0 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
                    >
                      <img [src]="item.image || fallbackImage" [alt]="entityTitle(item)" class="h-10 w-14 rounded-lg object-cover" loading="lazy" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-black text-white">{{ entityTitle(item) }}</span>
                        <span class="text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ entityTypeLabel(item) }}</span>
                      </span>
                      <mat-icon class="text-slate-500" aria-hidden="true">chevron_right</mat-icon>
                    </a>
                  }
                </div>
              }
            </div>

            @if (homeContent().heroCtaSubtext) {
              <p class="mt-3 text-xs font-semibold text-slate-300">{{ homeContent().heroCtaSubtext }}</p>
            }

            <div class="mobile-scroll mt-7 flex snap-x gap-2 overflow-x-auto pb-1 lg:grid lg:max-w-2xl lg:grid-cols-3 lg:overflow-visible">
              <a routerLink="/fleet" class="min-w-[155px] snap-start rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:min-w-0">
                <mat-icon class="text-blue-300" aria-hidden="true">directions_car</mat-icon>
                <strong class="mt-2 block text-sm text-white">{{ homeContent().quickActionRentTitle || 'Kiralık Araçlar' }}</strong>
                <span class="mt-1 block text-[11px] leading-4 text-slate-400">{{ homeContent().quickActionRentDesc || 'Müsait filoyu inceleyin.' }}</span>
              </a>
              <a routerLink="/sales" class="min-w-[155px] snap-start rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:min-w-0">
                <mat-icon class="text-emerald-300" aria-hidden="true">sell</mat-icon>
                <strong class="mt-2 block text-sm text-white">{{ homeContent().quickActionSalesTitle || 'Satılık Araçlar' }}</strong>
                <span class="mt-1 block text-[11px] leading-4 text-slate-400">{{ homeContent().quickActionSalesDesc || 'Güncel satış ilanlarını görün.' }}</span>
              </a>
              <a routerLink="/tours" class="min-w-[155px] snap-start rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:min-w-0">
                <mat-icon class="text-amber-300" aria-hidden="true">landscape</mat-icon>
                <strong class="mt-2 block text-sm text-white">{{ homeContent().quickActionToursTitle || 'Turlar' }}</strong>
                <span class="mt-1 block text-[11px] leading-4 text-slate-400">{{ homeContent().quickActionToursDesc || 'Bölgesel rotaları keşfedin.' }}</span>
              </a>
            </div>
          </div>

          <aside class="glass rounded-[28px] border border-white/15 p-4 shadow-2xl sm:p-6 lg:sticky lg:top-28" aria-labelledby="booking-title">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Hızlı Planlama</p>
                <h2 id="booking-title" class="mt-1 text-2xl font-black text-white sm:text-3xl">{{ homeContent().bookingTitle || 'Yolculuğunuzu Planlayın' }}</h2>
              </div>
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><mat-icon aria-hidden="true">event_available</mat-icon></span>
            </div>
            <p class="mt-2 text-xs leading-5 text-slate-400">{{ bookingSubtitle() }}</p>

            <div class="mt-5 grid grid-cols-2 gap-2" aria-label="Hizmet türü">
              @for (option of bookingServices(); track option.value) {
                <button
                  type="button"
                  (click)="serviceType = option.value"
                  [class.bg-blue-600]="serviceType === option.value"
                  [class.text-white]="serviceType === option.value"
                  [class.border-blue-500]="serviceType === option.value"
                  class="min-h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-xs font-black text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {{ option.label }}
                </button>
              }
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Alış Tarihi</span>
                <input type="date" [(ngModel)]="startDate" [min]="today" class="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30" />
              </label>
              <label class="block">
                <span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">İade Tarihi</span>
                <input type="date" [(ngModel)]="endDate" [min]="startDate || today" class="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30" />
              </label>
            </div>

            <label class="mt-3 block">
              <span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Teslim Alma Noktası</span>
              <select [(ngModel)]="selectedPickupId" class="min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30">
                @if (pickupPoints().length === 0) {
                  <option value="">Aktif teslim noktası yükleniyor</option>
                }
                @for (branch of pickupPoints(); track branch.id) {
                  <option [value]="branch.id">{{ branch.name }} · {{ branch.district || branch.city }}</option>
                }
              </select>
            </label>

            <button
              type="button"
              (click)="searchAvailability()"
              class="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <mat-icon aria-hidden="true">search</mat-icon>
              {{ bookingButtonLabel() }}
            </button>
            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <span>Canlı katalog</span><span>Şeffaf fiyat</span><span>Yerel destek</span>
            </div>
          </aside>
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {
        <section class="bg-white px-4 py-16 text-center text-slate-700">
          <div class="mx-auto max-w-lg">
            <mat-icon class="animate-pulse text-blue-600" aria-hidden="true">sync</mat-icon>
            <p class="mt-2 text-sm font-bold">Güncel vitrin hazırlanıyor...</p>
          </div>
        </section>
      }

      @for (section of managedSections(); track section.sectionKey) {
        @if (section.sectionType === 'CAMPAIGN' && campaignCards(section).length > 0) {
          <section class="bg-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8 lg:py-14" [attr.aria-labelledby]="section.sectionKey + '-title'">
            <div class="mx-auto max-w-7xl">
              <div class="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">{{ homeContent().campaignBannerBadge || 'Güncel Fırsatlar' }}</p>
                  <h2 [id]="section.sectionKey + '-title'" class="mt-1 font-serif text-2xl font-black sm:text-3xl lg:text-4xl">{{ section.title }}</h2>
                  @if (homeContent().campaignBannerSubtitle) {
                    <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{{ homeContent().campaignBannerSubtitle }}</p>
                  }
                </div>
              </div>
              <div class="campaign-grid">
                @for (campaign of campaignCards(section); track campaign.id) {
                  <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <a [href]="campaignHref(campaign)" class="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600">
                      <div class="relative aspect-[16/10] overflow-hidden bg-slate-200">
                        <img [src]="campaign.coverImage || fallbackImage" [alt]="campaign.title" class="h-full w-full object-cover" loading="lazy" />
                        @if (campaign.badge || campaign.discountPercent) {
                          <span class="absolute left-3 top-3 rounded-full bg-slate-950/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">{{ campaign.badge || ('%' + campaign.discountPercent + ' avantaj') }}</span>
                        }
                      </div>
                      <div class="p-4">
                        <h3 class="line-clamp-2 text-base font-black text-slate-950">{{ campaign.title }}</h3>
                        @if (campaign.shortDescription || campaign.description) {
                          <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{{ campaign.shortDescription || campaign.description }}</p>
                        }
                        <div class="mt-4 flex items-end justify-between gap-3">
                          <div>
                            @if (campaign.oldPrice) {
                              <span class="block text-[11px] font-bold text-slate-400 line-through">{{ formatPrice(campaign.oldPrice) }}</span>
                            }
                            @if (campaign.newPrice) {
                              <strong class="text-lg font-black text-blue-700">{{ formatPrice(campaign.newPrice) }}</strong>
                            }
                          </div>
                          <span class="text-xs font-black text-blue-700">{{ campaign.ctaLabel || homeContent().campaignBannerButtonText || 'İncele' }}</span>
                        </div>
                      </div>
                    </a>
                  </article>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'VEHICLES' && sectionVehicles(section).length > 0) {
          <section class="bg-white text-slate-950" [attr.aria-labelledby]="section.sectionKey + '-title'">
            <div class="mx-auto max-w-7xl px-4 pb-5 pt-10 sm:px-6 lg:px-8 lg:pt-14">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">{{ vehicleSectionBadge(section) }}</p>
                  <h2 [id]="section.sectionKey + '-title'" class="mt-1 font-serif text-2xl font-black sm:text-3xl lg:text-4xl">{{ section.title }}</h2>
                  <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{{ vehicleSectionSubtitle(section) }}</p>
                </div>
                <a [routerLink]="vehicleSectionRoute(section)" class="hidden min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-black text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex">
                  {{ vehicleSectionViewAll(section) }} <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                </a>
              </div>
            </div>
            <div class="section-grid border-y border-slate-200">
              @for (car of sectionVehicles(section); track car.id) {
                <div class="min-w-0 bg-white">
                  <app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item>
                </div>
              }
            </div>
            <div class="px-4 py-5 text-center sm:hidden">
              <a [routerLink]="vehicleSectionRoute(section)" class="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-950 px-5 text-xs font-black text-white">{{ vehicleSectionViewAll(section) }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
            </div>
          </section>
        }

        @if (section.sectionType === 'TOURS' && sectionTours(section).length > 0) {
          <section class="bg-slate-950 px-4 py-10 sm:px-6 lg:px-8 lg:py-14" [attr.aria-labelledby]="section.sectionKey + '-title'">
            <div class="mx-auto max-w-7xl">
              <div class="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Rota & Deneyim</p>
                  <h2 [id]="section.sectionKey + '-title'" class="mt-1 font-serif text-2xl font-black text-white sm:text-3xl lg:text-4xl">{{ section.title }}</h2>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{{ homeContent().toursSubtitle || 'Bölgenin seçili rotalarını, buluşma noktalarını ve tur detaylarını inceleyin.' }}</p>
                </div>
                <a routerLink="/tours" class="hidden min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black text-amber-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:flex">{{ homeContent().toursViewAll || 'Tüm Turlar' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="tour-grid">
                @for (tour of sectionTours(section); track tour.id) {
                  <a [routerLink]="['/tour', tour.id]" class="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                    <div class="aspect-[16/10] overflow-hidden bg-slate-800"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" /></div>
                    <div class="p-4">
                      <div class="flex items-start justify-between gap-3">
                        <h3 class="text-base font-black text-white">{{ entityTitle(tour) }}</h3>
                        @if (tour.price) { <strong class="shrink-0 text-sm font-black text-amber-300">{{ formatPrice(tour.price) }}</strong> }
                      </div>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{{ tour.description || tour.location || 'Tur detaylarını inceleyin.' }}</p>
                      <span class="mt-4 inline-flex items-center gap-1 text-xs font-black text-amber-300">{{ homeContent().toursBookBtn || 'Turu İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (section.sectionType === 'BLOG' && sectionBlogs(section).length > 0) {
          <section class="bg-white px-4 py-10 text-slate-950 sm:px-6 lg:px-8 lg:py-14" [attr.aria-labelledby]="section.sectionKey + '-title'">
            <div class="mx-auto max-w-7xl">
              <div class="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">Rehber & Haberler</p>
                  <h2 [id]="section.sectionKey + '-title'" class="mt-1 font-serif text-2xl font-black sm:text-3xl lg:text-4xl">{{ section.title }}</h2>
                </div>
                <a routerLink="/blog" class="hidden min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-black text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex">Tüm Yazılar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              </div>
              <div class="blog-grid">
                @for (post of sectionBlogs(section); track post.id) {
                  <a [routerLink]="['/blog', post.id]" class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <div class="aspect-[16/9] overflow-hidden bg-slate-200"><img [src]="post.image || fallbackImage" [alt]="post.title" class="h-full w-full object-cover" loading="lazy" /></div>
                    <div class="p-4">
                      <div class="text-[10px] font-black uppercase tracking-wider text-slate-400">{{ post.readTime || 'Rehber' }}</div>
                      <h3 class="mt-1 line-clamp-2 text-base font-black">{{ post.title }}</h3>
                      <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{{ post.summary }}</p>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }
      }

      <section class="border-t border-white/10 bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 lg:py-16" aria-labelledby="partner-title">
        <div class="mx-auto grid max-w-7xl gap-6 rounded-[32px] border border-blue-400/20 bg-gradient-to-br from-blue-600/15 to-slate-900 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Araç Sahipleri İçin</p>
            <h2 id="partner-title" class="mt-2 max-w-3xl font-serif text-2xl font-black text-white sm:text-3xl lg:text-4xl">{{ homeContent().partnerTitle || 'Aracınız kazanca dönüşsün' }}</h2>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{{ homeContent().partnerSubtitle || 'Aracınızı değerlendirme veya iş ortaklığı sürecini güvenli başvuru formumuzdan başlatın.' }}</p>
          </div>
          <a routerLink="/list-your-car" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-slate-950 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            {{ homeContent().quickActionSellTitle || 'Aracımı Değerlendir' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon>
          </a>
        </div>
      </section>
    </main>
  `,
})
export class HomeComponent {
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
  readonly publicCampaigns = signal<CampaignRecord[]>([]);

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

  readonly bookingSubtitle = computed(() =>
    this.homeContent().heroCtaSubtext || "Tarih, hizmet ve aktif teslim noktasına göre uygun seçeneklere geçin.",
  );

  readonly bookingServices = computed(() => [
    { value: "individual" as const, label: this.homeContent().quickActionRentTitle || "Araç Kiralama" },
    { value: "driver" as const, label: "Şoförlü Transfer" },
    { value: "wedding" as const, label: "Düğün / Özel Gün" },
    { value: "tour" as const, label: this.homeContent().quickActionToursTitle || "Özel Turlar" },
  ]);

  readonly heroSearchResults = computed(() => {
    const query = this.searchQuery.trim().toLocaleLowerCase("tr-TR");
    if (query.length < 2) return [] as Vehicle[];
    return [...this.rentalCars(), ...this.saleCars(), ...this.tours()]
      .filter((item) => [item.id, item.brand, item.model, item.title, item.location]
        .filter((value) => value != null)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(query))
      .slice(0, 5);
  });

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: "campaigns", title: "Kampanyalı Araçlar & Özel Fırsatlar", sectionType: "CAMPAIGN", isEnabled: true, sortOrder: 5, maxItems: 4, settings: {} },
    { sectionKey: "rental_featured", title: "Kiralık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 20, maxItems: 6, settings: { category: "RENTAL" } },
    { sectionKey: "sale_featured", title: "Satılık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 30, maxItems: 6, settings: { category: "SALE" } },
    { sectionKey: "tour_featured", title: "Öne Çıkan Turlar", sectionType: "TOURS", isEnabled: true, sortOrder: 40, maxItems: 6, settings: {} },
    { sectionKey: "blog_featured", title: "Son Yazılar", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length > 0) return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.error()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

  constructor() {
    void this.homepageLayout.load();
    void this.branchService.refresh();
    void this.campaignService.loadPublic()
      .then((items) => this.publicCampaigns.set(items.filter((item) => this.isLiveCampaign(item))))
      .catch(() => this.publicCampaigns.set([]));

    effect(() => {
      const config = this.config();
      this.seo.updateSeoTags({
        title: config.seoTitle || `${config.companyName} | Araç Kiralama, Satış ve Turlar`,
        description: config.seoDescription || this.homeContent().heroSubtitle || config.tagline || config.companyName,
        keywords: config.seoKeywords,
        image: config.seoOgImage || config.logoUrl || this.fallbackHero,
      });
      this.seo.updateJsonLd({
        "@context": "https://schema.org",
        "@type": "AutomotiveBusiness",
        name: config.companyName,
        url: "https://alperrentacar.online/",
        telephone: config.phone,
        email: config.email,
        address: config.address,
        description: config.seoDescription || this.homeContent().heroSubtitle || config.tagline,
      });
    });
  }

  performHeroSearch(): void {
    const query = this.searchQuery.trim();
    const first = this.heroSearchResults()[0];
    if (first) {
      void this.router.navigate(this.entityRoute(first));
      return;
    }
    void this.router.navigate(["/fleet"], { queryParams: query ? { search: query } : undefined });
  }

  searchAvailability(): void {
    let start = this.startDate || this.today;
    let end = this.endDate || start;
    if (end < start) end = start;
    this.startDate = start;
    this.endDate = end;

    const pickup = this.selectedPickupId || this.pickupPoints()[0]?.id || "";
    if (this.serviceType === "tour") {
      void this.router.navigate(["/tours"]);
      return;
    }

    void this.router.navigate(["/fleet"], {
      queryParams: {
        start,
        end,
        pickup: pickup || undefined,
        driver: this.serviceType === "driver" || this.serviceType === "wedding" ? "true" : undefined,
        occasion: this.serviceType === "wedding" ? "wedding" : undefined,
      },
    });
  }

  bookingButtonLabel(): string {
    if (this.serviceType === "tour") return this.homeContent().toursViewAll || "Turları Göster";
    return this.homeContent().heroCta || "Uygun Araçları Göster";
  }

  sectionVehicles(section: PublicHomepageSection): Vehicle[] {
    const source = String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? this.saleCars() : this.rentalCars();
    const ids = this.placementIds(section, "VEHICLE");
    if (ids === null) return source.slice(0, section.maxItems);
    const byId = new Map(source.map((item) => [String(item.id), item]));
    return ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  sectionTours(section: PublicHomepageSection): Vehicle[] {
    const source = this.tours();
    const ids = this.placementIds(section, "TOUR");
    if (ids === null) return source.slice(0, section.maxItems);
    const byId = new Map(source.map((item) => [String(item.id), item]));
    return ids.map((id) => byId.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  sectionBlogs(section: PublicHomepageSection): BlogPost[] {
    const source = this.blogPosts();
    const ids = this.placementIds(section, "BLOG");
    if (ids === null) return source.slice(0, section.maxItems);
    const byId = new Map<string, BlogPost>();
    source.forEach((item) => {
      byId.set(String(item.id), item);
      if (item.cloudId) byId.set(String(item.cloudId), item);
    });
    return ids.map((id) => byId.get(id)).filter((item): item is BlogPost => Boolean(item)).slice(0, section.maxItems);
  }

  campaignCards(section: PublicHomepageSection): CampaignRecord[] {
    const source = this.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = this.placementIds(section, "CAMPAIGN");
    if (ids === null) return source.slice(0, section.maxItems);
    const byId = new Map(source.map((item) => [String(item.id), item]));
    return ids.map((id) => byId.get(id)).filter((item): item is CampaignRecord => Boolean(item)).slice(0, section.maxItems);
  }

  vehicleSectionRoute(section: PublicHomepageSection): string {
    return String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? "/sales" : "/fleet";
  }

  vehicleSectionBadge(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales"
      ? this.homeContent().salesBadge || "Satış Galerisi"
      : this.homeContent().featuredBadge || "Kiralama Filosu";
  }

  vehicleSectionSubtitle(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales"
      ? this.homeContent().salesDescription || "Güncel satış araçlarını ve detaylarını karşılaştırın."
      : this.homeContent().featuredSubtitle || "Güncel kiralık filoyu, fiyatları ve araç detaylarını inceleyin.";
  }

  vehicleSectionViewAll(section: PublicHomepageSection): string {
    return this.vehicleSectionRoute(section) === "/sales"
      ? this.homeContent().salesViewAll || "Tüm Satılık Araçlar"
      : this.homeContent().featuredViewAll || "Tüm Kiralık Araçlar";
  }

  entityRoute(item: Vehicle): any[] {
    if (item.category === "SALE") return ["/sales", item.id];
    if (item.category === "TOUR") return ["/tour", item.id];
    return ["/fleet", item.id];
  }

  entityTitle(item: Vehicle): string {
    return item.title || [item.brand, item.model, item.year].filter(Boolean).join(" ") || `İlan ${item.id}`;
  }

  entityTypeLabel(item: Vehicle): string {
    if (item.category === "SALE") return "Satılık araç";
    if (item.category === "TOUR") return "Tur";
    return "Kiralık araç";
  }

  campaignHref(campaign: CampaignRecord): string {
    const cta = (campaign.ctaUrl || "").trim();
    if (cta && (/^https:\/\//i.test(cta) || cta.startsWith("/"))) return cta;
    if (campaign.targetType === "TOUR" && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`;
    if (campaign.targetType === "VEHICLE" && campaign.targetId) {
      const vehicle = [...this.rentalCars(), ...this.saleCars()].find((item) => String(item.id) === String(campaign.targetId));
      return vehicle?.category === "SALE" ? `/sales/${encodeURIComponent(campaign.targetId)}` : `/fleet/${encodeURIComponent(campaign.targetId)}`;
    }
    return "/fleet";
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
