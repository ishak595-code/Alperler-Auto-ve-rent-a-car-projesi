import { Component, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { CarService } from "../services/car.service";
import { Car } from "../models/car.model";
import { UiService } from "../services/ui.service";
import { SeoService } from "../services/seo.service";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { LightboxComponent } from "../components/lightbox.component";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { DragToScrollDirective } from "../directives/drag-to-scroll.directive";

@Component({
  selector: "app-home",
  standalone: true,
  host: {
    "(document:click)": "closeSearch()",
  },
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    LightboxComponent,
    VehicleListItemComponent,
    DragToScrollDirective,
  ],
  template: `
    <!-- Hero Section -->
    <div
      class="relative min-h-[calc(100dvh-72px)] md:h-[85vh] md:min-h-[600px] flex flex-col items-center justify-center overflow-hidden group py-8 md:py-0"
    >
      <!-- Background Image -->
      <div class="absolute inset-0 z-0 bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=80&w=2500&auto=format&fit=crop"
          fetchpriority="high"
          alt=""
          aria-hidden="true"
          (error)="hideBrokenImage($event)"
          class="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-transparent"
        ></div>
      </div>

      <!-- Hero Content -->
      <div
        class="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-12 md:mt-0"
      >
        <div class="animate-fade-in-up space-y-6 flex flex-col items-center">
          <h1
            class="font-serif text-[28px] sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-xl max-w-4xl mx-auto text-balance break-words leading-tight"
          >
            {{ config()?.homeContent?.heroTitle || t().hero.title }}
          </h1>

          @if (config()?.homeContent?.heroSubtitle || t().hero.subtitle) {
            <p
              class="text-sm md:text-lg text-slate-100 mt-2 max-w-2xl mx-auto font-medium drop-shadow-md leading-relaxed text-center opacity-90 text-pretty break-words"
            >
              {{ config()?.homeContent?.heroSubtitle || t().hero.subtitle }}
            </p>
          }

          <!-- Global Interactive Search -->
          @if (isSearchFocused()) {
            <div 
              (click)="isSearchFocused.set(false)"
              class="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300"
            ></div>
          }
          <div
            class="w-full max-w-4xl mx-auto mt-10 md:mt-12 relative z-[101]"
            (click)="$event.stopPropagation()"
          >
            <!-- Search Bar -->
            <div
              class="relative flex items-center bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.15)] p-2 transition-all duration-300 ring-4 sm:ring-8 ring-white/10 focus-within:ring-white/20 focus-within:bg-white focus-within:shadow-[0_30px_60px_rgba(0,0,0,0.3)] hover:ring-white/20 group"
            >
              <div
                class="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center pl-2 md:pl-4 shrink-0 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300"
              >
                <mat-icon class="text-[28px] md:text-[32px] w-[28px] h-[28px] md:w-[32px] md:h-[32px]">search</mat-icon>
              </div>
              <input
                #searchInput
                type="search"
                inputmode="search"
                autocomplete="off"
                aria-label="Araç, model veya tur ara"
                [(ngModel)]="searchQuery"
                (focus)="isSearchFocused.set(true)"
                (keyup.enter)="submitSearch()"
                placeholder="Araç, model veya tur arayın..."
                class="flex-1 min-w-0 bg-transparent border-none text-slate-800 px-2 sm:px-4 py-4 md:py-5 text-[16px] md:text-[20px] font-medium focus:ring-0 outline-none placeholder:text-slate-400 placeholder:font-light w-full cursor-text"
              />
              @if (searchQuery().length > 0) {
                <button
                  (click)="searchQuery.set(''); searchInput.focus()"
                  class="mr-1 sm:mr-2 shrink-0 flex items-center justify-center w-11 h-11 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="Aramayı Temizle"
                  aria-label="Aramayı Temizle"
                >
                  <mat-icon class="text-slate-400 hover:text-slate-700 transition-colors">close</mat-icon>
                </button>
              }
              <button
                type="button"
                (click)="submitSearch()"
                aria-label="Aramayı çalıştır"
                class="bg-slate-900 text-white font-bold text-sm md:text-base px-4 sm:px-6 md:px-8 h-12 md:h-16 rounded-2xl md:rounded-full hover:bg-slate-800 transition-colors shadow-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Bul
              </button>
            </div>

            <!-- Auto-Suggestions Dropdown -->
            @if (isSearchFocused()) {
              <div
                class="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-[100] text-left animate-fade-in-up"
              >
                <!-- Search Filters / Categories -->
                <div class="px-4 py-4 md:px-6 md:py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 overflow-x-auto no-scrollbar">
                   <p class="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-2 shrink-0 hidden sm:block">Arama Filtresi</p>
                   
                   <button 
                     (click)="searchCategory.set('all')" 
                     [class.bg-slate-900]="searchCategory() === 'all'" 
                     [class.text-white]="searchCategory() === 'all'" 
                     [class.shadow-md]="searchCategory() === 'all'" 
                     [class.bg-white]="searchCategory() !== 'all'" 
                     [class.text-slate-600]="searchCategory() !== 'all'"
                     [class.hover:bg-slate-100]="searchCategory() !== 'all'"
                     class="min-h-11 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   >
                     Tümü
                   </button>

                   <button 
                     (click)="searchCategory.set('rental')" 
                     [class.bg-slate-900]="searchCategory() === 'rental'" 
                     [class.text-white]="searchCategory() === 'rental'" 
                     [class.shadow-md]="searchCategory() === 'rental'" 
                     [class.bg-white]="searchCategory() !== 'rental'" 
                     [class.text-slate-600]="searchCategory() !== 'rental'"
                     [class.hover:bg-slate-100]="searchCategory() !== 'rental'"
                     class="min-h-11 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   >
                     <mat-icon class="mr-2 text-[18px] w-[18px] h-[18px]" [class.text-orange-500]="searchCategory() !== 'rental'">key</mat-icon> Kiralık ({{ carService.getRentalCars()().length }})
                   </button>

                   <button 
                     (click)="searchCategory.set('sale')" 
                     [class.bg-slate-900]="searchCategory() === 'sale'" 
                     [class.text-white]="searchCategory() === 'sale'" 
                     [class.shadow-md]="searchCategory() === 'sale'" 
                     [class.bg-white]="searchCategory() !== 'sale'" 
                     [class.text-slate-600]="searchCategory() !== 'sale'"
                     [class.hover:bg-slate-100]="searchCategory() !== 'sale'"
                     class="min-h-11 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   >
                     <mat-icon class="mr-2 text-[18px] w-[18px] h-[18px]" [class.text-green-500]="searchCategory() !== 'sale'">sell</mat-icon> Satılık ({{ carService.getSaleCars()().length }})
                   </button>

                   <button 
                     (click)="searchCategory.set('tour')" 
                     [class.bg-slate-900]="searchCategory() === 'tour'" 
                     [class.text-white]="searchCategory() === 'tour'" 
                     [class.shadow-md]="searchCategory() === 'tour'" 
                     [class.bg-white]="searchCategory() !== 'tour'" 
                     [class.text-slate-600]="searchCategory() !== 'tour'"
                     [class.hover:bg-slate-100]="searchCategory() !== 'tour'"
                     class="min-h-11 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center shrink-0 border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   >
                     <mat-icon class="mr-2 text-[18px] w-[18px] h-[18px]" [class.text-purple-500]="searchCategory() !== 'tour'">explore</mat-icon> Turlar ({{ tours().length }})
                   </button>
                </div>

                <div class="max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain">
                  @if (searchQuery().length > 1) {
                    @if (searchResults().length > 0) {
                      <div class="max-h-[min(60dvh,36rem)] overflow-y-auto overscroll-contain custom-scrollbar">
                        @for (group of groupedSearchResults(); track group.title) {
                          <div class="bg-slate-50 px-5 py-2 border-y border-slate-100 flex items-center gap-2">
                             @if (group.title === 'Kiralık Araçlar') { <mat-icon class="text-orange-500 text-sm">key</mat-icon> }
                             @if (group.title === 'Satılık Araçlar') { <mat-icon class="text-green-500 text-sm">sell</mat-icon> }
                             @if (group.title === 'Turlar & Geziler') { <mat-icon class="text-purple-500 text-sm">explore</mat-icon> }
                             @if (group.title === 'Haberler & Blog') { <mat-icon class="text-blue-500 text-sm">article</mat-icon> }
                             <span class="text-xs font-black text-slate-500 uppercase tracking-widest">{{ group.title }}</span>
                             <span class="ml-auto text-xs font-bold text-slate-400">{{ group.items.length }} sonuç</span>
                          </div>
                          <ul class="divide-y divide-slate-50">
                          @for (
                            result of group.items;
                            track result.id + result.type
                          ) {
                            <li>
                              <a
                                [routerLink]="result.url"
                                (click)="isSearchFocused.set(false)"
                                class="flex items-center p-3 sm:p-4 md:p-5 hover:bg-blue-50/80 transition-colors cursor-pointer group min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                              >
                                <div
                                  class="w-20 h-14 md:w-24 md:h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.1)]"
                                >
                                  <img
                                    [src]="result.image"
                                    loading="lazy"
                                    [alt]="result.title"
                                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                </div>
                                <div class="ml-3 sm:ml-4 md:ml-6 flex-1 min-w-0">
                                  <h4
                                    class="text-slate-900 font-bold text-sm sm:text-base md:text-xl group-hover:text-blue-600 transition-colors break-words line-clamp-2"
                                  >
                                    {{ result.title }}
                                  </h4>
                                  <span
                                    class="text-slate-500 text-xs md:text-sm flex items-center mt-1 font-medium"
                                  >
                                    {{ result.subtitle }}
                                  </span>
                                </div>
                                <div class="text-right ml-4 shrink-0">
                                  <span
                                    class="text-blue-600 font-extrabold text-xs sm:text-sm md:text-lg bg-blue-50 px-2 sm:px-3 md:px-4 py-2 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm whitespace-nowrap"
                                    >{{ result.price }}</span
                                  >
                                </div>
                              </a>
                            </li>
                          }
                          </ul>
                        }
                      </div>
                    <div class="bg-slate-50 p-4 text-center border-t border-slate-100">
                      <span class="text-xs text-slate-500 font-bold tracking-wider">Alperler Auto Hızlı Arama</span>
                    </div>
                  } @else {
                    <div class="px-5 py-10 sm:p-16 text-center text-slate-500">
                      <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <mat-icon class="text-slate-300 text-4xl w-10 h-10">search_off</mat-icon>
                      </div>
                      <p class="font-bold text-xl text-slate-700">Sonuç Bulunamadı</p>
                      <p class="text-sm mt-2 max-w-sm mx-auto">
                        Seçtiğiniz kategoride "{{ searchQuery() }}" ile eşleşen bir sonuç bulamadık.
                      </p>
                    </div>
                  }
                  } @else {
                    <div class="px-5 py-10 sm:p-16 text-center text-slate-500">
                      <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <mat-icon class="text-blue-500 text-4xl w-10 h-10">travel_explore</mat-icon>
                      </div>
                      <p class="font-bold text-xl text-slate-700">Aramaya Başlayın</p>
                      <p class="text-sm mt-2 max-w-sm mx-auto">
                        Araç marka, model veya gitmek istediğiniz turu yazın...
                      </p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div
            class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-2 sm:px-0 max-w-3xl mx-auto"
          >
            <!-- Hızlı İşlemler Dropdown/Modal Container -->
            <div class="relative w-full sm:w-[360px] z-[101]">
              <button
                (click)="toggleHeroMenu($event)"
                aria-haspopup="menu"
                [attr.aria-expanded]="isHeroMenuOpen()"
                class="group relative inline-flex items-center justify-between px-6 md:px-8 py-3.5 md:py-4 font-bold text-slate-900 transition-colors duration-200 bg-white border border-transparent rounded-full hover:bg-slate-50 outline-none focus:ring-4 focus:ring-slate-200 shadow-xl shadow-black/5 ring-1 ring-slate-900/5 w-full"
              >
                <span
                  class="relative text-sm md:text-base flex items-center whitespace-nowrap"
                >
                  <mat-icon class="mr-2 text-blue-600">bolt</mat-icon>
                  {{ config()?.homeContent?.quickActionLabel || 'Hızlı İşlemler' }}
                </span>
                <mat-icon
                  class="relative text-[20px] w-[20px] h-[20px] transition-transform duration-300"
                  [class.rotate-180]="isHeroMenuOpen()"
                  >keyboard_arrow_down</mat-icon>
              </button>

              @if (isHeroMenuOpen()) {
                <!-- Invisible backdrop for catching outside clicks natively -->
                <div class="fixed inset-0 z-[90]" (click)="isHeroMenuOpen.set(false)"></div>
                
                <!-- Dropdown Content -->
                <div 
                  class="absolute top-[calc(100%+0.75rem)] left-0 w-full sm:w-[400px] sm:left-1/2 sm:-translate-x-1/2 z-[100] bg-white rounded-[24px] shadow-2xl p-2.5 border border-slate-100 flex flex-col gap-1 origin-top transition-all duration-200"
                  (click)="$event.stopPropagation()"
                  role="menu"
                >
                    <button
                      (click)="scrollToBooking(); isHeroMenuOpen.set(false)"
                      class="flex items-center w-full px-4 py-3.5 text-left rounded-[16px] hover:bg-blue-50/60 transition-colors group/item focus:outline-none focus:bg-blue-50/60"
                      role="menuitem"
                    >
                      <div class="bg-blue-50 text-blue-600 rounded-[12px] p-2.5 mr-4 group-hover/item:text-blue-700 transition-colors">
                        <mat-icon class="text-[24px] w-[24px] h-[24px]">timer</mat-icon>
                      </div>
                      <div class="flex flex-col flex-1">
                        <span class="font-bold text-slate-900 text-[15px]">{{ config()?.homeContent?.quickActionRentTitle || config()?.homeContent?.heroCta || t().hero.cta }}</span>
                        <span class="text-[13px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{{ config()?.homeContent?.quickActionRentDesc || 'Hemen araç kiralayın' }}</span>
                      </div>
                      <mat-icon class="text-slate-300 group-hover/item:text-blue-600 group-hover/item:translate-x-1 transition-all">arrow_forward</mat-icon>
                    </button>
                    
                    <a
                      routerLink="/sales"
                      (click)="isHeroMenuOpen.set(false)"
                      class="flex items-center w-full px-4 py-3.5 text-left rounded-[16px] hover:bg-emerald-50/60 transition-colors group/item focus:outline-none focus:bg-emerald-50/60"
                      role="menuitem"
                    >
                      <div class="bg-emerald-50 text-emerald-600 rounded-[12px] p-2.5 mr-4 group-hover/item:text-emerald-700 transition-colors">
                        <mat-icon class="text-[24px] w-[24px] h-[24px]">directions_car</mat-icon>
                      </div>
                      <div class="flex flex-col flex-1">
                        <span class="font-bold text-slate-900 text-[15px]">{{ config()?.homeContent?.quickActionSalesTitle || '2. El Satılık Araçlar' }}</span>
                        <span class="text-[13px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{{ config()?.homeContent?.quickActionSalesDesc || 'Ekspertiz güvenceli filo' }}</span>
                      </div>
                      <mat-icon class="text-slate-300 group-hover/item:text-emerald-600 group-hover/item:translate-x-1 transition-all">chevron_right</mat-icon>
                    </a>

                    <a
                      routerLink="/list-your-car"
                      (click)="isHeroMenuOpen.set(false)"
                      class="flex items-center w-full px-4 py-3.5 text-left rounded-[16px] hover:bg-purple-50/60 transition-colors group/item focus:outline-none focus:bg-purple-50/60"
                      role="menuitem"
                    >
                      <div class="bg-purple-50 text-purple-600 rounded-[12px] p-2.5 mr-4 group-hover/item:text-purple-700 transition-colors">
                        <mat-icon class="text-[24px] w-[24px] h-[24px]">sell</mat-icon>
                      </div>
                      <div class="flex flex-col flex-1">
                        <span class="font-bold text-slate-900 text-[15px]">{{ config()?.homeContent?.quickActionSellTitle || 'Aracını Değerlendir' }}</span>
                        <span class="text-[13px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{{ config()?.homeContent?.quickActionSellDesc || 'Havuz sistemine katılın' }}</span>
                      </div>
                      <mat-icon class="text-slate-300 group-hover/item:text-purple-600 group-hover/item:translate-x-1 transition-all">chevron_right</mat-icon>
                    </a>

                    <a
                      routerLink="/tours"
                      (click)="isHeroMenuOpen.set(false)"
                      class="flex items-center w-full px-4 py-3.5 text-left rounded-[16px] hover:bg-amber-50/60 transition-colors group/item focus:outline-none focus:bg-amber-50/60"
                      role="menuitem"
                    >
                      <div class="bg-amber-50 text-amber-600 rounded-[12px] p-2.5 mr-4 group-hover/item:text-amber-700 transition-colors">
                        <mat-icon class="text-[24px] w-[24px] h-[24px]">explore</mat-icon>
                      </div>
                      <div class="flex flex-col flex-1">
                        <span class="font-bold text-slate-900 text-[15px]">{{ config()?.homeContent?.quickActionToursTitle || 'Özel Turlar' }}</span>
                        <span class="text-[13px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{{ config()?.homeContent?.quickActionToursDesc || 'VIP şoförlü geziler' }}</span>
                      </div>
                      <mat-icon class="text-slate-300 group-hover/item:text-amber-600 group-hover/item:translate-x-1 transition-all">chevron_right</mat-icon>
                    </a>
                    
                    <a
                      routerLink="/blog"
                      (click)="isHeroMenuOpen.set(false)"
                      class="flex items-center w-full px-4 py-3.5 text-left rounded-[16px] hover:bg-rose-50/60 transition-colors group/item focus:outline-none focus:bg-rose-50/60"
                      role="menuitem"
                    >
                      <div class="bg-rose-50 text-rose-600 rounded-[12px] p-2.5 mr-4 group-hover/item:text-rose-700 transition-colors">
                        <mat-icon class="text-[24px] w-[24px] h-[24px]">article</mat-icon>
                      </div>
                      <div class="flex flex-col flex-1">
                        <span class="font-bold text-slate-900 text-[15px]">Blog</span>
                        <span class="text-[13px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Güncel haberler ve rehberler</span>
                      </div>
                      <mat-icon class="text-slate-300 group-hover/item:text-rose-600 group-hover/item:translate-x-1 transition-all">chevron_right</mat-icon>
                    </a>
                </div>
              }            </div>
          </div>
          @if (config()?.homeContent?.heroCtaSubtext || t().hero.ctaSubtext) {
            <p
              class="text-white/60 text-xs md:text-sm mt-4 font-medium tracking-wide"
            >
              {{ config()?.homeContent?.heroCtaSubtext || t().hero.ctaSubtext }}
            </p>
          }
        </div>
      </div>
    </div>

    <!-- Booking Engine (Premium) -->
    <div
      id="bookingArea"
      class="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 md:-mt-32 mb-16"
    >
      <div
        class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] p-6 md:p-10 border border-white/60"
      >
        <h3
          class="text-slate-800 font-bold text-xl md:text-2xl mb-8 flex items-center border-b border-slate-200 pb-4"
        >
          <svg
            class="w-7 h-7 text-blue-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {{ config()?.homeContent?.bookingTitle || t().home.booking.title || "Yolculuğunuzu Planlayın" }}
        </h3>

        <form
          (submit)="searchCars($event)"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end"
        >
          <!-- Service Type -->
          <div class="relative">
            <label
              for="serviceTypeSelect"
              class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
              >{{ t().home.booking.type || "Hizmet Türü" }}</label
            >
            <select
              id="serviceTypeSelect"
              name="serviceType"
              [(ngModel)]="serviceType"
              aria-label="Hizmet türünü seçin"
              class="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold appearance-none cursor-pointer transition-all shadow-sm"
            >
              <option value="individual">Şoförsüz Kiralama (Bireysel)</option>
              <option value="driver">Şoförlü Transfer</option>
              <option value="wedding">Düğün / Özel Gün (Şoförlü)</option>
              <option value="minibus">VIP Tur / Minibüs (Şoförlü)</option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center pr-4 text-slate-500"
              aria-hidden="true"
            >
              <mat-icon>expand_more</mat-icon>
            </div>
          </div>

          <!-- Pickup Location -->
          <div class="relative">
            <label
              for="pickupLocationSelect"
              class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
              >{{ t().home.booking.pickup || "Alış Noktası" }}</label
            >
            <select
              id="pickupLocationSelect"
              name="location"
              [(ngModel)]="pickupLocation"
              aria-label="Alış noktasını seçin"
              class="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-5 py-4 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold appearance-none cursor-pointer transition-all shadow-sm"
            >
              <option value="merkez">Yüksekova Merkez</option>
              <option value="havalimani">Yüksekova Havalimanı</option>
              <option value="otogar">Yüksekova Otogar</option>
              <option value="hakkari-merkez">Hakkari Merkez</option>
              <option value="semdinli">Şemdinli</option>
              <option value="van-havalimani">Van Havalimanı</option>
            </select>
            <div
              class="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center pr-4 text-slate-500"
              aria-hidden="true"
            >
              <mat-icon>expand_more</mat-icon>
            </div>
          </div>

          <!-- Dates: custom labelled trigger prevents Android TalkBack from exposing an unlabeled native calendar sub-button. -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <div class="min-w-0 relative">
              <label
                id="pickupDateLabel"
                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
                >Alış</label
              >
              <input
                #pickupDateInput
                type="date"
                [(ngModel)]="pickupDate"
                name="startDate"
                tabindex="-1"
                aria-hidden="true"
                class="absolute w-px h-px opacity-0 pointer-events-none"
              />
              <button
                type="button"
                aria-labelledby="pickupDateLabel"
                [attr.aria-label]="'Alış tarihi seç. ' + dateDisplay(pickupDate, 'Tarih seçilmedi')"
                (click)="openDatePicker(pickupDateInput)"
                class="w-full min-h-14 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-3 sm:px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm flex items-center justify-between gap-2"
              >
                <span class="truncate">{{ dateDisplay(pickupDate, 'Tarih seç') }}</span>
                <mat-icon aria-hidden="true" class="shrink-0 text-slate-500">calendar_month</mat-icon>
              </button>
            </div>
            <div class="min-w-0 relative">
              <label
                id="returnDateLabel"
                class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1"
                >İade</label
              >
              <input
                #returnDateInput
                type="date"
                [(ngModel)]="returnDate"
                name="endDate"
                tabindex="-1"
                aria-hidden="true"
                class="absolute w-px h-px opacity-0 pointer-events-none"
              />
              <button
                type="button"
                aria-labelledby="returnDateLabel"
                [attr.aria-label]="'İade tarihi seç. ' + dateDisplay(returnDate, 'Tarih seçilmedi')"
                (click)="openDatePicker(returnDateInput)"
                class="w-full min-h-14 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-3 sm:px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold transition-all shadow-sm flex items-center justify-between gap-2"
              >
                <span class="truncate">{{ dateDisplay(returnDate, 'Tarih seç') }}</span>
                <mat-icon aria-hidden="true" class="shrink-0 text-slate-500">calendar_month</mat-icon>
              </button>
            </div>
          </div>

          <!-- Search Button -->
          <div class="h-full pt-6 md:pt-0">
            <button
              type="submit"
              aria-label="Araç Bul"
              class="w-full h-full min-h-[56px] bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center text-lg group"
            >
              <mat-icon
                class="mr-2 group-hover:scale-110 transition-transform"
                aria-hidden="true"
                >search</mat-icon
              >
              Ara / Bul
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Campaign Banner & Recommended Cars Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 relative z-20">
      <!-- Premium Campaign Banner -->
      <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[28px] p-6 lg:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative mb-8">
        <!-- Glow effects -->
        <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div class="relative z-10 flex-col flex gap-2 md:max-w-xl">
            @if (config()?.homeContent?.campaignBannerBadge) {
              <div class="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl self-start mb-2">
                  <mat-icon class="text-[18px] w-[18px] h-[18px]">workspace_premium</mat-icon>
                  <span class="text-sm font-bold tracking-wide uppercase">{{ config()?.homeContent?.campaignBannerBadge }}</span>
              </div>
            }
            <h3 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight" [innerHTML]="config()?.homeContent?.campaignBannerTitle || '7 Gün Kirala, Sadece 6 Gün Öde!'">
            </h3>
            <p class="text-slate-300 text-sm md:text-base">
                {{ config()?.homeContent?.campaignBannerSubtitle || 'Seçili araçlarda 1 günlük kiralama bedeli bizden hediye. Hemen rezervasyonunuzu yapın, uzun dönem kiralamanın keyfini indirimli çıkarın.' }}
            </p>
        </div>
        
        <div class="relative z-10 shrink-0 w-full md:w-auto">
            <button (click)="scrollToRecommended()" class="w-full md:w-auto inline-flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95">
                {{ config()?.homeContent?.campaignBannerButtonText || 'Kampanyalı Araçları Gör' }}
                <mat-icon class="ml-2">arrow_downward</mat-icon>
            </button>
        </div>
      </div>

      <div id="recommended-cars" class="flex items-center justify-between mb-4 px-2 scroll-mt-24">
        <h3 class="text-lg font-bold text-slate-800 flex items-center">
          <mat-icon class="text-amber-500 mr-2">star</mat-icon>
          Öne Çıkan Araçlarımız
        </h3>
      </div>
      <div class="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 snap-x snap-mandatory no-scrollbar hover:[writing-mode:horizontal-tb] scroll-smooth">
        @for (car of recommendedCars(); track car.id) {
          <a [routerLink]="['/fleet', car.id]" class="snap-start flex-shrink-0 w-[240px] md:w-[280px] bg-white border border-slate-100 rounded-2xl p-3 hover:bg-slate-50 transition-all flex flex-col gap-3 group shadow-sm hover:shadow-md">
            <div class="w-full h-[120px] md:h-[140px] rounded-xl bg-slate-100 overflow-hidden relative">
              <img [src]="car.images?.[0] || car.image" (error)="handleRecommendedImageError($event)" [alt]="car.brand + ' ' + car.model" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              @if (car.badge) {
                <span class="absolute top-2 left-2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase shadow-sm">
                  {{ car.badge }}
                </span>
              }
            </div>
            <div class="px-1">
              <h4 class="font-bold text-slate-900 truncate text-sm md:text-base group-hover:text-blue-600 transition-colors">{{car.brand}} {{car.model}}</h4>
              <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-slate-500 font-medium">{{car.year}} • {{car.transmission}}</span>
                <span class="text-sm text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded">{{car.price}} ₺</span>
              </div>
            </div>
          </a>
        }
      </div>
    </div>

    <!-- Featured Vehicles (Rental) -->
    <section class="py-16 sm:py-20 md:py-24 bg-slate-50/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="mb-20 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-6"
        >
          <div class="max-w-3xl">
            <span
              class="text-blue-600 font-bold tracking-[0.2em] uppercase text-xs block mb-4"
              >{{ config()?.homeContent?.featuredBadge || t().home.featured.badge }}</span
            >
            <h2
              class="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-tight text-balance"
            >
              {{ config()?.homeContent?.featuredTitle || t().home.featured.title }}
            </h2>
            <p class="text-slate-500 mt-4 sm:mt-6 text-base sm:text-lg md:text-xl font-light leading-relaxed text-pretty">
              {{ config()?.homeContent?.featuredSubtitle || t().home.featured.subtitle }}
            </p>
          </div>
          <!-- Desktop button moved next to title -->
          <div class="hidden md:block">
            <a
              routerLink="/fleet"
              class="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-slate-900 text-slate-900 font-bold text-sm uppercase tracking-wider rounded-full hover:bg-slate-900 hover:text-white transition-all duration-300 shadow hover:shadow-xl active:scale-95 group"
            >
              {{ config()?.homeContent?.featuredViewAll || t().home.featured.viewAll }} ({{
                carService.getCars()().length
              }})
              <svg
                class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        </div>

        <div
          class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4 mb-12 md:mb-16"
        >
          @for (car of featuredCars(); track car.id) {
            <app-vehicle-list-item [car]="car" variant="rental"></app-vehicle-list-item>
          }
        </div>

        <!-- Mobile button -->
        <div class="text-center md:hidden">
          <a
            routerLink="/fleet"
            class="inline-flex items-center justify-center px-10 py-5 bg-slate-900 text-white font-bold text-sm uppercase tracking-wider rounded-full shadow-xl active:scale-95 transition-transform group"
          >
            {{ t().home.featured.viewAll }} ({{
              carService.getCars()().length
            }})
            <svg
              class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Sales Teaser Section -->
    <section class="py-16 bg-white relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          class="mb-12 text-center md:text-left flex flex-col md:flex-row justify-between items-end gap-6"
        >
          <div class="max-w-3xl">
            <span
              class="text-blue-600 font-bold tracking-[0.2em] uppercase text-xs block mb-4"
              >{{ config()?.homeContent?.salesBadge || t().home.sales.badge }}</span
            >
            <h2
              class="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-slate-900 leading-tight text-balance"
            >
              {{ config()?.homeContent?.salesTitle || t().home.sales.title }}
            </h2>
            <p class="text-slate-500 mt-4 sm:mt-6 text-base sm:text-lg md:text-xl font-light leading-relaxed text-pretty">
              {{ config()?.homeContent?.salesDescription || t().home.sales.description }}
            </p>
          </div>
          <div class="hidden md:block">
            <a
              routerLink="/sales"
              class="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-slate-900 text-slate-900 font-bold text-sm uppercase tracking-wider rounded-full hover:bg-slate-900 hover:text-white transition-all duration-300 shadow hover:shadow-xl active:scale-95 group"
            >
              {{ config()?.homeContent?.salesViewAll || t().home.sales.viewAll }} ({{
                carService.getSaleCars()().length
              }})
              <svg
                class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </div>
        </div>

        <div
          class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4 mb-12 md:mb-16"
        >
          @for (car of featuredSaleCars(); track car.id) {
            <app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>
          }
        </div>

        <div class="text-center md:hidden">
          <a
            routerLink="/sales"
            class="inline-flex items-center justify-center px-10 py-5 bg-slate-900 text-white font-bold text-sm uppercase tracking-wider rounded-full shadow-xl active:scale-95 transition-transform group"
          >
            {{ config()?.homeContent?.salesViewAll || t().home.sales.viewAll }} ({{
              carService.getSaleCars()().length
            }})
            <svg
              class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- Partner (Rent Your Car) - CTA -->
    <section id="partnerForm" class="py-16 bg-slate-900 text-white relative overflow-hidden">
      <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="bg-slate-800/50 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="flex-1">
             <h2 class="font-serif text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
               {{ config()?.homeContent?.partnerTitle || t().home.partner.title }}
             </h2>
             <p class="text-slate-300 mb-0 text-lg md:text-xl leading-relaxed max-w-2xl font-medium">
               {{ config()?.homeContent?.partnerSubtitle || t().home.partner.subtitle }}
             </p>
          </div>
          <div class="shrink-0 flex flex-col gap-4 w-full md:w-auto">
             <a routerLink="/list-your-car" class="inline-flex justify-center items-center px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 hover:-translate-y-1 transition-all active:scale-95 group">
                {{ config()?.homeContent?.partnerFormTitle || 'Aracını Değerlendir' }}
                <mat-icon class="ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</mat-icon>
             </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Tours Section -->
    <section class="py-16 bg-white border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="flex flex-col md:flex-row md:items-end justify-between mb-12 text-center md:text-left gap-4"
        >
          <div>
            <h2 class="text-3xl font-serif font-bold text-slate-900">
              {{ config()?.homeContent?.toursTitle || t().home.tours.title }}
            </h2>
            <p class="text-slate-500 mt-2">{{ config()?.homeContent?.toursSubtitle || t().home.tours.subtitle }}</p>
          </div>
        </div>

        <div 
          appDragToScroll 
          class="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 snap-x snap-mandatory no-scrollbar hover:[writing-mode:horizontal-tb] scroll-smooth"
        >
          @for (tour of displayedTours(); track tour.id) {
            <a
              [routerLink]="['/tour', tour.id]"
              class="snap-start flex-shrink-0 w-[240px] md:w-[280px] bg-white border border-slate-100 rounded-2xl p-3 hover:bg-slate-50 transition-all flex flex-col gap-3 group shadow-sm hover:shadow-md"
            >
              <div class="w-full h-[120px] md:h-[140px] rounded-xl bg-slate-100 overflow-hidden relative">
                <img
                  [src]="tour.image"
                  [alt]="tour.title"
                  loading="lazy"
                  decoding="async"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-900 font-bold text-[10px] px-2 py-1 rounded">
                  {{ tour.duration }}
                </div>
              </div>

              <div class="flex-1 flex flex-col px-1">
                <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Tur</span>
                <h4 class="font-bold text-slate-900 leading-tight line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">{{ tour.title }}</h4>
                <p class="text-xs text-slate-500 line-clamp-2">{{ tour.description }}</p>
                <div class="mt-auto pt-3 flex items-center justify-between">
                  <span class="font-black text-slate-900 text-sm py-1 items-center">{{ tour.price }}₺</span>
                </div>
              </div>
            </a>
          }
        </div>

        <div class="text-center mt-12">
          <a
            routerLink="/tours"
            class="inline-block bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-8 py-3 rounded-full font-bold transition-all uppercase tracking-widest text-sm"
          >
            {{ config()?.homeContent?.toursViewAll || 'TÜM TURLARI İNCELE' }} ({{ tours().length }})
          </a>
        </div>
      </div>
    </section>

    <!-- Why Us? -->
    <section class="py-24 bg-slate-50 relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div class="max-w-3xl mx-auto text-center mb-16">
            <span class="text-blue-600 font-bold tracking-widest uppercase text-xs mb-3 block">Neden Biz?</span>
            <h2 class="text-4xl md:text-5xl font-serif font-black text-slate-900 mb-6 tracking-tight leading-tight">
              {{ config()?.homeContent?.whyUsTitle || t().home.whyUs.title }}
            </h2>
            <p class="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
              {{ config()?.homeContent?.whyUsSubtitle || t().home.whyUs.subtitle }}
            </p>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="bg-white p-8 rounded-[32px] box-border border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.08)] hover:-translate-y-2 transition-all duration-500 group">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <mat-icon class="text-[32px] w-[32px] h-[32px]">verified_user</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-900 mb-3">{{ config()?.homeContent?.whyUsTrustTitle || t().home.whyUs.features.trust.title }}</h3>
              <p class="text-slate-500 leading-relaxed">{{ config()?.homeContent?.whyUsTrustDesc || t().home.whyUs.features.trust.desc }}</p>
            </div>
            
            <div class="bg-white p-8 rounded-[32px] box-border border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.08)] hover:-translate-y-2 transition-all duration-500 group">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <mat-icon class="text-[32px] w-[32px] h-[32px]">support_agent</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-900 mb-3">{{ config()?.homeContent?.whyUsSupportTitle || t().home.whyUs.features.support.title }}</h3>
              <p class="text-slate-500 leading-relaxed">{{ config()?.homeContent?.whyUsSupportDesc || t().home.whyUs.features.support.desc }}</p>
            </div>
            
            <div class="bg-white p-8 rounded-[32px] box-border border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.08)] hover:-translate-y-2 transition-all duration-500 group">
              <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <mat-icon class="text-[32px] w-[32px] h-[32px]">airline_seat_recline_extra</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-900 mb-3">{{ config()?.homeContent?.whyUsComfortTitle || t().home.whyUs.features.comfort.title }}</h3>
              <p class="text-slate-500 leading-relaxed">{{ config()?.homeContent?.whyUsComfortDesc || t().home.whyUs.features.comfort.desc }}</p>
            </div>
          </div>
        </div>
      </section>

    <!-- Campaigns (Bottom) -->
    <section class="bg-blue-500 py-12">
      <div class="max-w-7xl mx-auto px-4">
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-900/10"
        >
          <div class="p-4">
            <span class="block text-4xl font-black text-slate-900 mb-1"
              >%15</span
            >
            <span
              class="text-sm font-bold uppercase tracking-wider text-slate-800 block"
              >{{ config()?.homeContent?.campaignsEarly || t().home.campaigns.early }}</span
            >
          </div>
          <div class="p-4">
            <span class="block text-4xl font-black text-slate-900 mb-1"
              >7/24</span
            >
            <span
              class="text-sm font-bold uppercase tracking-wider text-slate-800 block"
              >{{ config()?.homeContent?.campaignsRoadside || t().home.campaigns.roadside }}</span
            >
          </div>
          <div class="p-4">
            <span class="block text-4xl font-black text-slate-900 mb-1">{{
              config()?.homeContent?.campaignsFree || t().home.campaigns.free
            }}</span>
            <span
              class="text-sm font-bold uppercase tracking-wider text-slate-800 block"
              >{{ config()?.homeContent?.campaignsDelivery || t().home.campaigns.delivery }}</span
            >
          </div>
        </div>
      </div>
    </section>



    @if (isLightboxOpen()) {
      <app-lightbox
        [items]="lightboxItems()"
        [initialIndex]="lightboxIndex()"
        (close)="closeLightbox()"
      >
      </app-lightbox>
    }

  `,
})
export class HomeComponent implements OnInit {
  carService = inject(CarService);
  uiService = inject(UiService);
  seoService = inject(SeoService);
  router = inject(Router);
  rentCarFormSent = signal(false);
  favorites = signal<number[]>([]);

  hideBrokenImage(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  handleRecommendedImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }

  openDatePicker(input: HTMLInputElement) {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else {
      input.focus();
      input.click();
    }
  }

  dateDisplay(value: string, fallback: string): string {
    if (!value) return fallback;
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;
    return `${day}.${month}.${year}`;
  }

  scrollToRecommended() {
    const el = document.getElementById('recommended-cars');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  ngOnInit() {
    // Add structured data for the organization when homepage loads
    const config = this.carService.getConfig()();
    this.seoService.updateJsonLd({
      "@context": "https://schema.org",
      "@type": "RentalCarReservation",
      "name": config.companyName,
      "url": "https://alperrentacar.online/",
      "logo": config.logoUrl,
      "description": "Yüksekova'da araç kiralama, 2. el galeri ve turlar.",
      "telephone": config.phone,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Yüksekova",
        "addressRegion": "Hakkari",
        "addressCountry": "TR"
      }
    });
  }
  windowOrigin = typeof window !== "undefined" ? window.location.origin : "";

  // Global Search Signals
  searchQuery = signal("");
  searchCategory = signal<"all" | "rental" | "sale" | "tour">("all");
  isSearchFocused = signal(false);
  isHeroMenuOpen = signal(false);

  toggleHeroMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isHeroMenuOpen.update(v => !v);
  }

  searchResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    if (!query || query.length < 2) return [];

    const results: any[] = [];
    const cat = this.searchCategory();

    // Search Rental Cars
    if (cat === "all" || cat === "rental") {
      this.carService
        .getCars()()
        .forEach((car) => {
          const text =
            `${car.brand} ${car.model} ${car.category} ${car.badge || ""} kiralık rent`.toLowerCase();
          if (text.includes(query)) {
            results.push({
              type: "rental",
              title: `${car.brand} ${car.model}`,
              subtitle: "Kiralık Araç",
              image: car.image,
              price: `${car.price} ₺/gün`,
              id: car.id,
              url: `/fleet/${car.id}`,
            });
          }
        });
    }

    // Search Sale Cars
    if (cat === "all" || cat === "sale") {
      this.carService
        .getSaleCars()()
        .forEach((car) => {
          const text =
            `${car.brand} ${car.model} ${car.category} ${car.badge || ""} satılık oto araba 2.el`.toLowerCase();
          if (text.includes(query)) {
            results.push({
              type: "sale",
              title: `${car.brand} ${car.model}`,
              subtitle: "Satılık Araç",
              image: car.image,
              price: `${car.price} ₺`,
              id: car.id,
              url: `/sales/${car.id}`,
            });
          }
        });
    }

    // Search Tours
    if (cat === "all" || cat === "tour") {
      this.carService
        .getTours()()
        .forEach((tour) => {
          const text =
            `${tour.title} ${tour.description} ${tour.duration} tur gezi hakkari yüksekova doğa`.toLowerCase();
          if (text.includes(query)) {
            results.push({
              type: "tour",
              title: tour.title,
              subtitle: "Tur & Gezi",
              image: tour.image,
              price: `${tour.price} ₺`,
              id: tour.id,
              url: `/tour/${tour.id}`,
            });
          }
        });
    }

    // Search Blogs
    if (cat === "all") {
      this.carService
        .getBlogPosts()()
        .forEach((post) => {
          const text = `${post.title} ${post.summary} blog haber referans`.toLowerCase();
          if (text.includes(query)) {
            results.push({
              type: "blog",
              title: post.title,
              subtitle: "Blog Yazısı",
              image: post.image,
              price: "Tümü",
              id: post.id,
              url: `/blog/${post.id}`,
            });
          }
        });
    }

    return results.slice(0, 5); // Limit to top 5 results for clean UI
  });

  groupedSearchResults = computed(() => {
    const results = this.searchResults();
    if (results.length === 0) return [];
    
    const groups: { [key: string]: { title: string, items: any[] } } = {
      rental: { title: 'Kiralık Araçlar', items: [] },
      sale: { title: 'Satılık Araçlar', items: [] },
      tour: { title: 'Turlar & Geziler', items: [] },
      blog: { title: 'Haberler & Blog', items: [] },
    };

    results.forEach(res => {
      if (groups[res.type]) groups[res.type].items.push(res);
    });

    return Object.values(groups).filter(g => g.items.length > 0);
  });

  submitSearch() {
    const firstResult = this.searchResults()[0];
    if (!firstResult?.url) {
      this.isSearchFocused.set(true);
      return;
    }

    this.isSearchFocused.set(false);
    this.router.navigateByUrl(firstResult.url);
  }

  closeSearch() {
    this.isSearchFocused.set(false);
  }

  t = this.uiService.translations;
  config = this.carService.getConfig();

  // Lightbox Signals
  isLightboxOpen = signal(false);
  lightboxItems = signal<any[]>([]);
  lightboxIndex = signal(0);

  // Signals
  tours = this.carService.getTours();
  displayedTours = computed(() => {
    return this.tours().slice(0, 4);
  });
  featuredCars = computed(() => {
    const cars = this.carService
      .getCars()()
      .filter((c) => c.isAvailable !== false);
    return cars
      .sort((a, b) => {
        // Prioritize FIRSAT badge
        if (a.badge === "FIRSAT" && b.badge !== "FIRSAT") return -1;
        if (b.badge === "FIRSAT" && a.badge !== "FIRSAT") return 1;
        // Then prioritize discount rate
        const aDiscount = a.discountRate || 0;
        const bDiscount = b.discountRate || 0;
        if (aDiscount !== bDiscount) return bDiscount - aDiscount;
        // Then price ascending
        return a.price - b.price;
      })
      .slice(0, 4);
  });

  featuredSaleCars = computed(() => {
    const cars = this.carService
      .getSaleCars()()
      .filter((c) => c.availability !== "Satıldı");
    return cars
      .sort((a, b) => {
        // Prioritize FIRSAT badge
        if (a.badge === "FIRSAT" && b.badge !== "FIRSAT") return -1;
        if (b.badge === "FIRSAT" && a.badge !== "FIRSAT") return 1;
        // Then prioritize price drops
        if (a.isPriceDropped && !b.isPriceDropped) return -1;
        if (b.isPriceDropped && !a.isPriceDropped) return 1;
        // Then price ascending
        return a.price - b.price;
      })
      .slice(0, 4);
  });

  recommendedCars = computed(() => {
    return this.carService.getCars()().filter(c => c.badge).sort(() => Math.random() - 0.5).slice(0, 8);
  });

  shareCar(car: any, event: Event, type: "rental" | "sale") {
    event.stopPropagation();
    const path = type === "rental" ? "/fleet/" : "/sales/";
    const url = `${this.windowOrigin}${path}${car.id}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${car.brand} ${car.model} - Alperler Auto`,
          text: `${car.brand} ${car.model} aracını inceleyin!`,
          url: url,
        })
        .catch(console.error);
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert("Bağlantı kopyalandı!");
      });
    }
  }

  // Booking Engine Signals
  bookingStep = signal(1);
  pickupLocation = "merkez";
  pickupDate = "";
  returnDate = "";
  serviceType = "individual"; // Dropdown value
  rentalDuration = "daily";

  setBookingStep(step: number) {
    this.bookingStep.set(step);
  }

  nextBookingStep() {
    if (this.bookingStep() < 4) {
      this.bookingStep.update((v) => v + 1);
    }
  }

  prevBookingStep() {
    if (this.bookingStep() > 1) {
      this.bookingStep.update((v) => v - 1);
    }
  }

  searchCars(event: Event) {
    event.preventDefault();
    let filterType = undefined;
    if (this.serviceType === "wedding") filterType = "luxury";
    if (this.serviceType === "minibus") filterType = "minibus";

    this.router.navigate(["/fleet"], {
      queryParams: {
        location: this.pickupLocation,
        start: this.pickupDate,
        end: this.returnDate,
        driver:
          this.serviceType === "driver" || this.serviceType === "wedding"
            ? "true"
            : "false",
        filter: filterType,
      },
    });
  }

  goToFleet(type: string) {
    this.router.navigate(["/fleet"], { queryParams: { filter: type } });
  }

  goToDetail(id: number, type: "fleet" | "sales", event: Event) {
    event.stopPropagation();
    this.router.navigate([`/${type}`, id]);
  }

  rentCar(car: Car, event: Event) {
    event.stopPropagation();
    const request = {
      type: "RENTAL" as const,
      item: car,
      itemName: `${car.brand} ${car.model}`,
      image: car.image,
      basePrice: car.price,
      startDate: "",
      endDate: "",
      withDriver: false,
    };
    this.carService.setBookingRequest(request);
    this.router.navigate(["/contact"]);
  }

  buyCar(car: Car, event: Event) {
    event.stopPropagation();
    const request = {
      type: "SALE_INQUIRY" as const,
      item: car,
      itemName: `${car.brand} ${car.model}`,
      image: car.image,
      basePrice: car.price,
    };
    this.carService.setBookingRequest(request);
    this.router.navigate(["/contact"]);
  }

  bookTour(tour: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.carService.setBookingRequest({
      type: "TOUR",
      itemName: tour.title,
      item: tour,
      image: tour.image,
      basePrice: tour.price,
    });
    this.router.navigate(["/contact"]);
  }

  submitRentCarForm(form: any) {
    if (form.valid) {
      const { name, phone, email, carBrand, modelYear, km, description } =
        form.value;
      this.carService.addPartnerRequest({
        name,
        phone,
        email,
        carBrand,
        modelYear: parseInt(modelYear),
        km: parseInt(km),
        description,
      });
      this.rentCarFormSent.set(true);
      form.resetForm();
    }
  }

  scrollToBooking() {
    document
      .getElementById("bookingArea")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  toggleFavorite(carId: number, event: Event) {
    event.stopPropagation();
    this.carService.toggleFavorite(carId);
  }

  isFavorite(carId: number): boolean {
    return this.carService.isFavorite(carId);
  }

  openLightbox(images: string[], index: number) {
    this.lightboxItems.set(images.map((url) => ({ type: "image", url })));
    this.lightboxIndex.set(index);
    this.isLightboxOpen.set(true);
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
  }
}
