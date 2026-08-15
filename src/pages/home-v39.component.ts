import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { VehicleListItemComponent } from '../components/vehicle-list-item.component';
import { Vehicle } from '../models/car.model';
import { CampaignRecord, CampaignService } from '../services/campaign.service';
import { CarService } from '../services/car.service';
import { HomepageLayoutService, PublicHomepageSection } from '../services/homepage-layout.service';
import { SeoService } from '../services/seo.service';

interface SearchResult {
  title: string;
  subtitle: string;
  image?: string;
  url: string;
}

@Component({
  selector: 'app-home-v39',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent],
  template: `
    <main class="bg-white text-slate-900">
      <section class="relative isolate overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=82&w=2200&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          fetchpriority="high"
          class="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
        />
        <div class="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(2,6,23,.98),rgba(15,23,42,.76)_55%,rgba(15,23,42,.55))]"></div>

        <div class="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          <div class="max-w-3xl">
            <span class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[.18em] backdrop-blur">
              <mat-icon aria-hidden="true" class="!h-4 !w-4 !text-[16px] text-blue-300">verified</mat-icon>
              Araç, satış ve tur tek merkezde
            </span>
            <h1 class="mt-6 font-serif text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">{{ heroTitle() }}</h1>
            <p class="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">{{ heroSubtitle() }}</p>

            <div class="relative mt-8 max-w-3xl">
              <div class="flex min-h-16 items-center rounded-2xl bg-white p-2 text-slate-900 shadow-2xl sm:rounded-full">
                <mat-icon aria-hidden="true" class="ml-2 shrink-0 text-slate-400">search</mat-icon>
                <input
                  type="search"
                  [(ngModel)]="searchQuery"
                  (focus)="searchOpen.set(true)"
                  (keyup.enter)="submitSearch()"
                  aria-label="Araç, tur veya blog ara"
                  placeholder="Araç, model veya tur ara..."
                  class="min-w-0 flex-1 bg-transparent px-3 py-3 font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
                />
                <button type="button" (click)="submitSearch()" class="min-h-12 shrink-0 rounded-xl bg-slate-950 px-6 font-black text-white sm:rounded-full">Bul</button>
              </div>

              @if (searchOpen() && searchQuery().trim().length >= 2) {
                <div class="absolute inset-x-0 top-full z-40 mt-3 max-h-[55dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-2 text-left text-slate-900 shadow-2xl">
                  @for (result of searchResults(); track result.url) {
                    <a [routerLink]="result.url" (click)="searchOpen.set(false)" class="flex min-h-16 items-center gap-3 rounded-2xl p-2 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                      <div class="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        @if (result.image) { <img [src]="result.image" [alt]="result.title" class="h-full w-full object-cover" loading="lazy" /> }
                      </div>
                      <div class="min-w-0"><strong class="block truncate text-sm">{{ result.title }}</strong><small class="text-slate-500">{{ result.subtitle }}</small></div>
                    </a>
                  } @empty {
                    <div class="p-7 text-center text-sm font-bold text-slate-500">Eşleşen sonuç bulunamadı.</div>
                  }
                </div>
              }
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <a routerLink="/fleet" class="hero-link bg-blue-600 hover:bg-blue-500"><mat-icon aria-hidden="true">key</mat-icon>Kiralık Araçlar</a>
              <a routerLink="/sales" class="hero-link border border-white/25 bg-white/10 hover:bg-white/20"><mat-icon aria-hidden="true">sell</mat-icon>Satılık Araçlar</a>
              <a routerLink="/tours" class="hero-link border border-white/25 bg-white/10 hover:bg-white/20"><mat-icon aria-hidden="true">explore</mat-icon>Turlar</a>
            </div>
          </div>

          <section class="rounded-[2rem] border border-white/20 bg-white/95 p-5 text-slate-900 shadow-2xl backdrop-blur-xl sm:p-7" aria-labelledby="booking-title">
            <div class="flex items-start gap-3">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><mat-icon aria-hidden="true">calendar_month</mat-icon></div>
              <div><h2 id="booking-title" class="text-xl font-black">Yolculuğunuzu Planlayın</h2><p class="mt-1 text-sm text-slate-500">Tarih, hizmet ve alış noktasına göre uygun filoya geçin.</p></div>
            </div>
            <form (submit)="searchCars($event)" class="mt-6 space-y-4">
              <label class="field-label">Hizmet Türü
                <select [(ngModel)]="serviceType" name="serviceType" class="field-control">
                  <option value="individual">Şoförsüz Kiralama</option>
                  <option value="driver">Şoförlü Transfer</option>
                  <option value="wedding">Düğün / Özel Gün</option>
                  <option value="minibus">VIP Tur / Minibüs</option>
                </select>
              </label>
              <label class="field-label">Alış Noktası
                <select [(ngModel)]="pickupLocation" name="pickupLocation" class="field-control">
                  <option value="merkez">Yüksekova Merkez</option>
                  <option value="havalimani">Yüksekova Havalimanı</option>
                  <option value="otogar">Yüksekova Otogar</option>
                  <option value="hakkari-merkez">Hakkari Merkez</option>
                  <option value="semdinli">Şemdinli</option>
                  <option value="van-havalimani">Van Havalimanı</option>
                </select>
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="field-label">Alış Tarihi<input type="date" [(ngModel)]="pickupDate" name="pickupDate" [min]="today" class="field-control" /></label>
                <label class="field-label">İade Tarihi<input type="date" [(ngModel)]="returnDate" name="returnDate" [min]="pickupDate || today" class="field-control" /></label>
              </div>
              <button type="submit" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 font-black text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <mat-icon aria-hidden="true">search</mat-icon>Uygun Araçları Bul
              </button>
            </form>
          </section>
        </div>
      </section>

      @if (!layout.loaded()) {
        <section class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" aria-live="polite">
          <div class="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center font-bold text-slate-500">Vitrin hazırlanıyor…</div>
        </section>
      } @else {
        @for (section of managedSections(); track section.sectionKey) {
          @switch (section.sectionType) {
            @case ('VEHICLES') {
              <section class="py-16 sm:py-20" [class.bg-slate-50]="vehicleCategory(section)==='RENTAL'">
                <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div class="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <span class="section-kicker">{{ vehicleCategory(section)==='RENTAL' ? 'Kiralama Filosu' : 'Satış Galerisi' }}</span>
                      <h2 class="section-title">{{ section.title }}</h2>
                      <p class="section-copy">{{ vehicleCategory(section)==='RENTAL' ? 'Müsait kiralık araçları karşılaştırın ve detay sayfasından rezervasyona geçin.' : 'Satıştaki araçları teknik detayları ve ilan bilgileriyle inceleyin.' }}</p>
                    </div>
                    <a [routerLink]="vehicleCategory(section)==='RENTAL' ? '/fleet' : '/sales'" class="all-link">Tümünü Gör <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
                  </div>
                  <div class="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    @for (car of vehiclesFor(section); track car.id) {
                      <app-vehicle-list-item [car]="car" [variant]="vehicleCategory(section)==='RENTAL' ? 'rental' : 'sale'"></app-vehicle-list-item>
                    } @empty {
                      <div class="empty-card sm:col-span-2 lg:col-span-3">Bu vitrin bölümünde gösterilecek aktif ilan yok.</div>
                    }
                  </div>
                </div>
              </section>
            }
            @case ('CAMPAIGN') {
              <section class="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20" aria-labelledby="campaigns-heading">
                <div class="pointer-events-none absolute inset-0" aria-hidden="true">
                  <div class="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl"></div>
                  <div class="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl"></div>
                </div>
                <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div class="mx-auto max-w-3xl text-center">
                    <span class="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.18em] text-amber-300"><mat-icon aria-hidden="true" class="!h-4 !w-4 !text-[16px]">bolt</mat-icon>Alperler Auto ayrıcalıkları</span>
                    <h2 id="campaigns-heading" class="mt-4 font-serif text-3xl font-black sm:text-4xl lg:text-5xl">{{ section.title }}</h2>
                    <p class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">Kiralama, satış, özel gün ve tur fırsatlarını tek premium vitrinde karşılaştırın. Yönetim panelinde öne aldığınız kampanyalar burada seçtiğiniz sırayla yayınlanır.</p>
                  </div>
                  <div class="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    @for (campaign of campaignsFor(section); track campaign.id) {
                      <article class="group flex min-h-[500px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 focus-within:ring-2 focus-within:ring-amber-300">
                        <div class="relative aspect-[16/10] overflow-hidden bg-slate-900">
                          @if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaignImageAlt(campaign)" class="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" referrerpolicy="no-referrer" /> }
                          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                          <div class="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                            <span class="rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-lg">{{ campaign.badge || 'FIRSAT' }}</span>
                            @if (campaign.discountPercent != null) { <span class="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black text-white shadow-lg">%{{ campaign.discountPercent }} avantaj</span> }
                          </div>
                        </div>
                        <div class="flex flex-1 flex-col p-5">
                          <div class="min-h-10 text-[10px] font-bold leading-5 text-slate-400">
                            <span>{{ campaignMediaLabel(campaign) }}</span>
                            @if (campaignMediaCredit(campaign)) {
                              <span aria-hidden="true"> · </span>
                              @if (campaignMediaSource(campaign)) {
                                <a [href]="campaignMediaSource(campaign)" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-600 underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">{{ campaignMediaCredit(campaign) }}</a>
                              } @else { <span>{{ campaignMediaCredit(campaign) }}</span> }
                            }
                          </div>
                          <h3 class="mt-3 text-xl font-black leading-tight">{{ campaign.title }}</h3>
                          <p class="mt-3 line-clamp-4 text-sm leading-6 text-slate-300">{{ campaign.shortDescription || campaign.description }}</p>

                          @if (campaign.newPrice != null || campaign.oldPrice != null) {
                            <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                              <span class="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Fırsat fiyatı</span>
                              <div class="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
                                @if (campaign.newPrice != null) { <strong class="text-2xl font-black text-white">{{ formatCampaignPrice(campaign.newPrice) }}</strong> }
                                @if (campaign.oldPrice != null && campaign.oldPrice !== campaign.newPrice) { <span class="pb-1 text-xs font-bold text-slate-500 line-through">{{ formatCampaignPrice(campaign.oldPrice) }}</span> }
                              </div>
                            </div>
                          }

                          <a [href]="campaignHref(campaign)" class="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 pt-0 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/30">{{ campaign.ctaLabel || 'Fırsatı İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
                        </div>
                      </article>
                    } @empty { <div class="empty-dark md:col-span-2 xl:col-span-4">Şu anda aktif kampanya bulunmuyor.</div> }
                  </div>
                </div>
              </section>
            }
            @case ('TOURS') {
              <section class="bg-white py-16 sm:py-20">
                <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><span class="section-kicker text-violet-600">Keşfet</span><h2 class="section-title">{{ section.title }}</h2></div><a routerLink="/tours" class="all-link">Tüm Turlar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
                  <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    @for (tour of toursFor(section); track tour.id) {
                      <a [routerLink]="['/tour', tour.id]" class="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                        <div class="relative aspect-[16/10] overflow-hidden bg-slate-100">
                          @if (tour.image) { <img [src]="tour.image" [alt]="tour.title || 'Tur'" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> }
                        </div>
                        <div class="p-5"><h3 class="text-lg font-black">{{ tour.title }}</h3><p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{{ tour.description }}</p><div class="mt-4 flex items-center justify-between"><span class="text-xs font-bold text-slate-500">{{ tour.location || 'Hakkari' }}</span><strong class="text-lg text-violet-700">{{ tour.price | number:'1.0-0' }} ₺</strong></div></div>
                      </a>
                    } @empty { <div class="empty-card sm:col-span-2 xl:col-span-3">Bu bölümde aktif tur bulunmuyor.</div> }
                  </div>
                </div>
              </section>
            }
            @case ('BLOG') {
              <section class="bg-slate-50 py-16 sm:py-20">
                <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <div class="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><span class="section-kicker">Rehber & Haber</span><h2 class="section-title">{{ section.title }}</h2></div><a routerLink="/blog" class="all-link">Tüm Yazılar <mat-icon aria-hidden="true">arrow_forward</mat-icon></a></div>
                  <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    @for (post of blogsFor(section); track post.id) {
                      <a [routerLink]="['/blog', post.id]" class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                        <div class="aspect-[16/9] overflow-hidden bg-slate-100">@if (post.image) { <img [src]="post.image" [alt]="post.title" class="h-full w-full object-cover" loading="lazy" /> }</div>
                        <div class="p-5"><small class="font-black uppercase tracking-wider text-blue-600">{{ post.category || 'Blog' }}</small><h3 class="mt-2 text-lg font-black">{{ post.title }}</h3><p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{{ post.summary }}</p></div>
                      </a>
                    } @empty { <div class="empty-card md:col-span-2 xl:col-span-3">Bu bölümde aktif yazı bulunmuyor.</div> }
                  </div>
                </div>
              </section>
            }
          }
        }
      }

      <section class="bg-slate-900 py-16 text-white">
        <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-6 md:flex-row lg:px-8">
          <div class="max-w-3xl text-center md:text-left"><span class="text-xs font-black uppercase tracking-[.18em] text-blue-400">Araç Sahipleri</span><h2 class="mt-3 font-serif text-3xl font-black sm:text-4xl">Aracınız kazanca dönüşsün</h2><p class="mt-3 text-slate-300">Aracınızı değerlendirme başvurusu ile filoya veya satış kanalına taşıyın.</p></div>
          <a routerLink="/list-your-car" class="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-7 font-black text-white">Aracını Değerlendir <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .hero-link { display:inline-flex; min-height:3rem; align-items:center; gap:.5rem; border-radius:9999px; padding:.65rem 1.25rem; font-weight:900; color:white; }
    .field-label { display:flex; flex-direction:column; gap:.4rem; font-size:.72rem; font-weight:900; color:rgb(71 85 105); text-transform:uppercase; letter-spacing:.05em; }
    .field-control { min-height:3.25rem; width:100%; border:1px solid rgb(226 232 240); border-radius:1rem; background:rgb(248 250 252); padding:.7rem .9rem; color:rgb(15 23 42); font-size:.9rem; font-weight:800; outline:none; }
    .field-control:focus { border-color:rgb(37 99 235); box-shadow:0 0 0 3px rgb(37 99 235 / .15); }
    .section-kicker { font-size:.72rem; font-weight:900; text-transform:uppercase; letter-spacing:.18em; color:rgb(37 99 235); }
    .section-title { margin-top:.5rem; font-family:serif; font-size:2rem; line-height:1.1; font-weight:900; color:rgb(15 23 42); }
    .section-copy { margin-top:.5rem; max-width:42rem; font-size:.9rem; line-height:1.6; color:rgb(100 116 139); }
    .all-link { display:inline-flex; min-height:3rem; align-items:center; justify-content:center; gap:.4rem; border:2px solid rgb(15 23 42); border-radius:9999px; padding:.6rem 1.2rem; font-size:.82rem; font-weight:900; }
    .empty-card { border:1px dashed rgb(203 213 225); border-radius:1.5rem; padding:2.5rem; text-align:center; font-size:.85rem; font-weight:800; color:rgb(100 116 139); }
    .empty-dark { border:1px solid rgb(255 255 255 / .1); border-radius:1.5rem; background:rgb(255 255 255 / .05); padding:2rem; font-weight:800; color:rgb(203 213 225); }
    @media (min-width:640px){.section-title{font-size:2.5rem}}
  `],
})
export class HomeV39Component implements OnInit {
  readonly carService = inject(CarService);
  readonly layout = inject(HomepageLayoutService);
  private readonly campaignService = inject(CampaignService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  readonly campaigns = signal<CampaignRecord[]>([]);
  readonly searchQuery = signal('');
  readonly searchOpen = signal(false);
  readonly today = new Date().toISOString().slice(0, 10);
  serviceType = 'individual';
  pickupLocation = 'merkez';
  pickupDate = '';
  returnDate = '';

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: 'campaigns', title: 'Kaçırılmayacak Fırsatlar', sectionType: 'CAMPAIGN', isEnabled: true, sortOrder: 5, maxItems: 4, settings: { layout: 'premium_campaign_cards', showCountdown: true, showDiscount: true } },
    { sectionKey: 'rental_featured', title: 'Kiralık Araçlar', sectionType: 'VEHICLES', isEnabled: true, sortOrder: 20, maxItems: 6, settings: { category: 'RENTAL' } },
    { sectionKey: 'sale_featured', title: 'Satılık Araçlar', sectionType: 'VEHICLES', isEnabled: true, sortOrder: 30, maxItems: 6, settings: { category: 'SALE' } },
    { sectionKey: 'tour_featured', title: 'Öne Çıkan Turlar', sectionType: 'TOURS', isEnabled: true, sortOrder: 40, maxItems: 6, settings: {} },
    { sectionKey: 'blog_featured', title: 'Son Yazılar', sectionType: 'BLOG', isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    if (!this.layout.loaded()) return [];
    const sections = this.layout.sections();
    if (sections.length) return [...sections].filter((row) => row.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    return this.layout.error() ? this.fallbackSections : [];
  });

  readonly searchResults = computed<SearchResult[]>(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('tr-TR');
    if (query.length < 2) return [];
    const results: SearchResult[] = [];
    for (const car of this.carService.getCars()()) {
      if (`${car.brand || ''} ${car.model || ''} ${car.series || ''}`.toLocaleLowerCase('tr-TR').includes(query)) {
        results.push({ title: `${car.brand || ''} ${car.model || ''}`.trim(), subtitle: 'Kiralık Araç', image: car.image, url: `/fleet/${car.id}` });
      }
    }
    for (const car of this.carService.getSaleCars()()) {
      if (`${car.brand || ''} ${car.model || ''} ${car.series || ''}`.toLocaleLowerCase('tr-TR').includes(query)) {
        results.push({ title: `${car.brand || ''} ${car.model || ''}`.trim(), subtitle: 'Satılık Araç', image: car.image, url: `/sales/${car.id}` });
      }
    }
    for (const tour of this.carService.getTours()()) {
      if (`${tour.title || ''} ${tour.description || ''} ${tour.location || ''}`.toLocaleLowerCase('tr-TR').includes(query)) {
        results.push({ title: tour.title || 'Tur', subtitle: 'Tur & Gezi', image: tour.image, url: `/tour/${tour.id}` });
      }
    }
    return results.slice(0, 8);
  });

  ngOnInit(): void {
    void Promise.allSettled([
      this.layout.load(),
      this.campaignService.loadPublic().then((rows) => this.campaigns.set(rows)),
    ]);
    const cfg = this.carService.getConfig()();
    this.seo.updateJsonLd({
      '@context': 'https://schema.org',
      '@type': 'AutoRental',
      name: cfg.companyName,
      url: 'https://alperrentacar.online/',
      telephone: cfg.phone,
      address: { '@type': 'PostalAddress', addressLocality: 'Yüksekova', addressRegion: 'Hakkari', addressCountry: 'TR' },
    });
  }

  heroTitle(): string {
    return this.carService.getConfig()().homeContent?.heroTitle || 'Yüksekova’da Güvenilir Araç Kiralama, Satış ve Turlar';
  }

  heroSubtitle(): string {
    return this.carService.getConfig()().homeContent?.heroSubtitle || 'Kiralık ve satılık araçları karşılaştırın, Hakkari ve çevresindeki rotaları keşfedin.';
  }

  vehicleCategory(section: PublicHomepageSection): 'RENTAL' | 'SALE' {
    return String(section.settings?.['category'] || '').toUpperCase() === 'SALE' || section.sectionKey === 'sale_featured' ? 'SALE' : 'RENTAL';
  }

  vehiclesFor(section: PublicHomepageSection): Vehicle[] {
    const category = this.vehicleCategory(section);
    const pool: Vehicle[] = category === 'SALE' ? this.carService.getSaleCars()() : this.carService.getCars()();
    const placements = this.layout.placementsFor(section.sectionKey).filter((row) => row.entityType === 'VEHICLE');
    if (!placements.length) return pool.slice(0, section.maxItems);
    const byCloudId = new Map<string, Vehicle>();
    for (const item of pool) if (item.cloudId) byCloudId.set(item.cloudId, item);
    return placements.map((row) => byCloudId.get(row.entityId)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  toursFor(section: PublicHomepageSection): Vehicle[] {
    const pool: Vehicle[] = this.carService.getTours()();
    const placements = this.layout.placementsFor(section.sectionKey).filter((row) => row.entityType === 'TOUR');
    if (!placements.length) return pool.slice(0, section.maxItems);
    const byCloudId = new Map<string, Vehicle>();
    for (const item of pool) if (item.cloudId) byCloudId.set(item.cloudId, item);
    return placements.map((row) => byCloudId.get(row.entityId)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  blogsFor(section: PublicHomepageSection): any[] {
    const pool = this.carService.getBlogPosts()() as any[];
    const placements = this.layout.placementsFor(section.sectionKey).filter((row) => row.entityType === 'BLOG');
    if (!placements.length) return pool.slice(0, section.maxItems);
    const byCloudId = new Map<string, any>();
    for (const item of pool) if (item?.cloudId) byCloudId.set(String(item.cloudId), item);
    return placements.map((row) => byCloudId.get(row.entityId)).filter(Boolean).slice(0, section.maxItems);
  }

  campaignsFor(section: PublicHomepageSection): CampaignRecord[] {
    const pool = this.campaigns();
    const placements = this.layout.placementsFor(section.sectionKey).filter((row) => row.entityType === 'CAMPAIGN');
    if (!placements.length) return pool.slice(0, section.maxItems);
    const byId = new Map(pool.map((item) => [item.id, item]));
    return placements.map((row) => byId.get(row.entityId)).filter((item): item is CampaignRecord => Boolean(item)).slice(0, section.maxItems);
  }

  campaignHref(campaign: CampaignRecord): string {
    if (campaign.ctaUrl) return campaign.ctaUrl;
    if (campaign.targetType === 'TOUR' && campaign.targetId) {
      const tour = this.carService.getTours()().find((item: Vehicle) => item.cloudId === campaign.targetId);
      if (tour) return `/tour/${tour.id}`;
    }
    if (campaign.targetType === 'VEHICLE' && campaign.targetId) {
      const cars: Vehicle[] = [...this.carService.getCars()(), ...this.carService.getSaleCars()()];
      const car = cars.find((item: Vehicle) => item.cloudId === campaign.targetId);
      if (car) return car.category === 'SALE' ? `/sales/${car.id}` : `/fleet/${car.id}`;
    }
    return '/contact';
  }

  campaignMediaLabel(campaign: CampaignRecord): string {
    return campaign.metadata?.['representativeImage'] === true ? 'Temsili model görseli' : 'Doğrulanmış rota/model görseli';
  }

  campaignMediaCredit(campaign: CampaignRecord): string {
    const attribution = typeof campaign.metadata?.['imageAttribution'] === 'string' ? String(campaign.metadata['imageAttribution']) : '';
    const license = typeof campaign.metadata?.['imageLicense'] === 'string' ? String(campaign.metadata['imageLicense']) : '';
    return [attribution, license].filter(Boolean).join(' · ');
  }

  campaignMediaSource(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.['imageSourceUrl'] === 'string' ? String(campaign.metadata['imageSourceUrl']) : '';
  }

  campaignImageAlt(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.['imageAlt'] === 'string' && String(campaign.metadata['imageAlt']).trim()
      ? String(campaign.metadata['imageAlt'])
      : campaign.title;
  }

  formatCampaignPrice(value: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
  }

  submitSearch(): void {
    const first = this.searchResults()[0];
    if (!first) { this.searchOpen.set(true); return; }
    this.searchOpen.set(false);
    void this.router.navigateByUrl(first.url);
  }

  searchCars(event: Event): void {
    event.preventDefault();
    if (this.pickupDate && this.returnDate && this.returnDate < this.pickupDate) {
      this.returnDate = this.pickupDate;
    }
    let filter: string | undefined;
    if (this.serviceType === 'wedding') filter = 'luxury';
    if (this.serviceType === 'minibus') filter = 'minibus';
    void this.router.navigate(['/fleet'], {
      queryParams: {
        location: this.pickupLocation,
        start: this.pickupDate || undefined,
        end: this.returnDate || undefined,
        driver: this.serviceType === 'driver' || this.serviceType === 'wedding' ? 'true' : 'false',
        filter,
      },
    });
  }
}
