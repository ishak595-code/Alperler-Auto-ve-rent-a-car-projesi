import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
} from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { MatIconModule } from "@angular/material/icon";
import { register } from "swiper/element/bundle";
import { Car } from "../models/car.model";
import { ExpertiseGraphicComponent } from "../components/expertise-graphic.component";
import { getTechnicalSpecs } from "../data/technical-specs.data";
import { Meta, Title } from "@angular/platform-browser";
import { SeoService } from "../services/seo.service";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

// Register Swiper custom elements
register();

@Component({
  selector: "app-sale-car-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    ExpertiseGraphicComponent,
    TurkishCurrencyPipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div
      class="min-h-screen bg-[#f4f4f4] pb-24 lg:pb-0 font-sans text-[#212121]"
    >
      @if (car()) {
        <!-- 1. Blue Header -->
        <header
          class="sticky top-0 z-[60] bg-[#005c8d] text-white flex items-center justify-between px-4 h-14 shadow-md"
        >
          <div class="flex items-center gap-3">
            <button
              (click)="goBack()"
              aria-label="Geri Dön"
              class="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold tracking-tight">İlan Detayı</h1>
          </div>

          <div class="flex items-center gap-4">
            <button
              (click)="shareCar(car())"
              aria-label="Paylaş"
              class="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <mat-icon>share</mat-icon>
            </button>
            <button
              (click)="toggleFav(car()?.id)"
              aria-label="Favorilere Ekle/Çıkar"
              class="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <mat-icon [class.text-blue-400]="isFav(car()?.id)">
                {{ isFav(car()?.id) ? "star" : "star_border" }}
              </mat-icon>
            </button>
          </div>
        </header>

        <!-- 2. Media Area -->
        <div
          class="relative w-full aspect-square md:aspect-[16/9] bg-[#f8f9fa] overflow-hidden border-b border-slate-200"
        >
          @if (car()?.badge) {
            <div class="absolute left-4 top-4 z-40 rounded-md bg-slate-950/85 px-3 py-1.5 text-xs font-bold tracking-wider text-white shadow-lg backdrop-blur">
              {{ car()?.badge }}
            </div>
          }

          <swiper-container
            #swiper
            class="w-full h-full"
            pagination="false"
            navigation="false"
            space-between="0"
            loop="true"
            (slidechange)="onSlideChange($event)"
          >
            @for (img of allImages(); track $index) {
              <swiper-slide
                class="w-full h-full cursor-zoom-in"
                (click)="openLightbox($index)"
              >
                <img
                  [src]="img"
                  [alt]="car()?.brand + ' ' + car()?.model"
                  class="w-full h-full object-contain"
                  referrerpolicy="no-referrer"
                />
              </swiper-slide>
            }
          </swiper-container>

          <!-- Page Indicator -->
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur-md text-white px-3 py-0.5 rounded-full text-[11px] font-medium"
          >
            {{ currentSlide() + 1 }} / {{ allImages().length }}
          </div>

        </div>

        <!-- 3. Title & Price & Basic Info -->
        <div
          class="bg-white px-4 py-6 shadow-sm border-b border-slate-200 relative z-20"
        >
          <h2 class="text-2xl font-black text-slate-900 leading-tight mb-2">
            {{ car()?.brand }}
            <span class="font-normal text-slate-600">{{ car()?.series }}</span>
            {{ car()?.model }}
          </h2>

          <div class="text-[28px] font-black text-[#d32f2f] tracking-tight">
            {{ car()?.price | turkishCurrency }}
          </div>
        </div>

        <!-- Tab Navigation (Full width style like screenshot) -->
        <div class="flex w-full bg-white shadow-sm sticky top-14 z-50">
          <button
            (click)="activeTab.set('info')"
            [class.bg-[#005c8d]]="activeTab() === 'info'"
            [class.text-white]="activeTab() === 'info'"
            [class.bg-white]="activeTab() !== 'info'"
            [class.text-slate-900]="activeTab() !== 'info'"
            class="flex-1 py-4 text-xs font-bold whitespace-nowrap transition-colors flex flex-col items-center justify-center gap-1 border-b-2"
            [class.border-[#005c8d]]="activeTab() === 'info'"
            [class.border-slate-200]="activeTab() !== 'info'"
          >
            <mat-icon class="text-[20px]">list_alt</mat-icon> İLAN BİLGİLERİ
          </button>
          <button
            (click)="activeTab.set('desc')"
            [class.bg-[#005c8d]]="activeTab() === 'desc'"
            [class.text-white]="activeTab() === 'desc'"
            [class.bg-white]="activeTab() !== 'desc'"
            [class.text-slate-900]="activeTab() !== 'desc'"
            class="flex-1 py-4 text-xs font-bold whitespace-nowrap transition-colors flex flex-col items-center justify-center gap-1 border-b-2 border-l border-r border-slate-200"
            [class.border-b-[#005c8d]]="activeTab() === 'desc'"
            [class.border-b-slate-200]="activeTab() !== 'desc'"
          >
            <mat-icon class="text-[20px]">description</mat-icon> AÇIKLAMA
          </button>
          <button
            (click)="activeTab.set('loc')"
            [class.bg-[#005c8d]]="activeTab() === 'loc'"
            [class.text-white]="activeTab() === 'loc'"
            [class.bg-white]="activeTab() !== 'loc'"
            [class.text-slate-900]="activeTab() !== 'loc'"
            class="flex-1 py-4 text-xs font-bold whitespace-nowrap transition-colors flex flex-col items-center justify-center gap-1 border-b-2"
            [class.border-[#005c8d]]="activeTab() === 'loc'"
            [class.border-slate-200]="activeTab() !== 'loc'"
          >
            <mat-icon class="text-[20px]">location_on</mat-icon> KONUM
          </button>
        </div>

        <!-- Main Content Area -->
        <div class="bg-white w-full min-h-[400px]">
          <!-- Content: Info -->
          @if (activeTab() === "info") {
            <div class="animate-in fade-in duration-300 pb-8">
              <div class="divide-y divide-slate-100">
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">İlan No</span>
                  <span class="font-bold text-[#d32f2f]">{{ car()?.id }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">İlan Tarihi</span>
                  <span class="font-medium text-slate-900">{{
                    listingDate(car())
                  }}</span>
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Marka</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.brand
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Seri / Model</span>
                  <span class="font-medium text-slate-900"
                    >{{ car()?.series || "-" }} {{ car()?.model }}</span
                  >
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Yıl</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.year
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Kilometre</span>
                  <span class="font-medium text-slate-900"
                    >{{ car()?.km | number }} km</span
                  >
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Yakıt Seçeneği</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.fuel
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Vites Tipi</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.transmission
                  }}</span>
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Kasa Tipi</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.type || "-"
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Motor Gücü</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.enginePower || "-"
                  }}</span>
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Motor Hacmi</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.engineVolume || "-"
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Çekiş</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.drivetrain || "-"
                  }}</span>
                </div>
                <div class="flex justify-between px-4 py-3.5 text-[14px]">
                  <span class="text-slate-500">Renk</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.color || "-"
                  }}</span>
                </div>
                <div
                  class="flex justify-between px-4 py-3.5 text-[14px] bg-slate-50"
                >
                  <span class="text-slate-500">Garanti</span>
                  <span class="font-medium text-slate-900">{{
                    car()?.warranty || "Belirtilmedi"
                  }}</span>
                </div>
              </div>

              @if (techSpecs()) {
                <div class="px-4 pb-6 bg-white border-t border-slate-100 pt-6">
                  <button
                    (click)="isTechSpecsOpen.update(v => !v)"
                    [attr.aria-expanded]="isTechSpecsOpen()"
                    aria-controls="tech-specs-content"
                    class="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-between px-6 shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0 group"
                  >
                    <div class="flex items-center gap-3">
                      <div class="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                        <mat-icon class="text-[20px] w-[20px] h-[20px]">settings_suggest</mat-icon>
                      </div>
                      <span class="sr-only">Teknik özellikleri</span> 
                      {{ isTechSpecsOpen() ? 'Teknik Özellikleri Gizle' : 'Tüm Teknik Özellikleri İncele' }}
                    </div>
                    <mat-icon
                      class="text-[20px] w-[20px] h-[20px] transition-transform duration-300"
                      [class.rotate-90]="isTechSpecsOpen()"
                    >
                      chevron_right
                    </mat-icon>
                  </button>
                  
                  @if (isTechSpecsOpen()) {
                    <div
                      id="tech-specs-content"
                      class="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300"
                    >
                      @if (techSpecs(); as specs) {
                        <!-- Performans -->
                        <div>
                          <h4
                            class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2"
                          >
                            <mat-icon class="text-[16px] w-[16px] h-[16px]">speed</mat-icon>
                            Performans
                          </h4>
                          <div class="bg-white rounded-xl p-4 space-y-3 shadow-sm border border-slate-100">
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Maks. Hız</span>
                              <span class="font-bold text-slate-800">{{ specs.maxSpeed }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">0-100 km/s</span>
                              <span class="font-bold text-slate-800">{{ specs.acceleration }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Motor & Güç -->
                        <div>
                          <h4
                            class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2"
                          >
                            <mat-icon class="text-[16px] w-[16px] h-[16px]">engineering</mat-icon>
                            Motor & Drivetrain
                          </h4>
                          <div class="bg-white rounded-xl p-4 space-y-3 shadow-sm border border-slate-100">
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Motor Hacmi</span>
                              <span class="font-bold text-slate-800">{{ specs.engineVolume }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Motor Gücü</span>
                              <span class="font-bold text-slate-800">{{ specs.enginePower }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Tork</span>
                              <span class="font-bold text-slate-800">{{ specs.torque }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Çekiş</span>
                              <span class="font-bold text-slate-800">{{ specs.drivetrain }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Silindir</span>
                              <span class="font-bold text-slate-800">{{ specs.cylinders }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Yakıt & Kapasite -->
                        <div>
                          <h4
                            class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2"
                          >
                            <mat-icon class="text-[16px] w-[16px] h-[16px]">local_gas_station</mat-icon>
                            Tüketim & Boyutlar
                          </h4>
                          <div class="bg-white rounded-xl p-4 space-y-3 shadow-sm border border-slate-100">
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Şehir İçi</span>
                              <span class="font-bold text-slate-800">{{ specs.cityFuel }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Uzun Yol</span>
                              <span class="font-bold text-slate-800">{{ specs.highwayFuel }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Ortalama</span>
                              <span class="font-bold text-slate-800">{{ specs.combinedFuel }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Depo</span>
                              <span class="font-bold text-slate-800">{{ specs.tankCapacity }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Bagaj</span>
                              <span class="font-bold text-slate-800">{{ specs.trunkCapacity }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Boyutlar</span>
                              <span class="font-bold text-slate-800">{{ specs.dimensions }}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                              <span class="text-slate-500 font-medium">Ağırlık</span>
                              <span class="font-bold text-slate-800">{{ specs.weight }}</span>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Expertise Section -->
              <div class="px-4 py-6 border-t-[8px] border-slate-100 mt-2">
                <h3
                  class="text-[16px] font-bold text-slate-800 mb-6 flex items-center gap-2"
                >
                  <mat-icon class="text-[24px] text-blue-600"
                    >verified</mat-icon
                  >
                  Ekspertiz ve Tramer Durumu
                </h3>

                <div
                  class="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100"
                >
                  <span
                    class="font-bold text-slate-600 uppercase tracking-wide text-xs"
                    >Hasar Özeti</span
                  >
                  <span class="font-bold text-slate-900">{{
                    car()?.damageStatus ||
                      (car()?.isDamageFree
                        ? "Hatasız & Boyasız"
                        : "Belirtilmedi")
                  }}</span>
                </div>

                <div class="mb-6">
                  <app-expertise-graphic
                    [data]="car()?.damageExpertise"
                  ></app-expertise-graphic>
                </div>
                <div
                  class="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-slate-700 leading-relaxed shadow-sm"
                >
                  <strong class="text-slate-900 flex items-center gap-2 mb-1"
                    ><mat-icon class="text-[18px]">info</mat-icon> Tramer
                    Bilgisi:</strong
                  >
                  {{ car()?.tramer || "Tramer kaydı bulunmamaktadır." }}
                </div>
              </div>
            </div>
          }

          <!-- Content: Description -->
          @if (activeTab() === "desc") {
            <div class="animate-in fade-in duration-300 p-4 pb-8">
              <div
                class="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-[15px]"
              >
                {{
                  car()?.description ||
                    "Bu ilan için tanımlanmış bir açıklama bulunmuyor."
                }}
              </div>
            </div>
          }

          <!-- Content: Konum -->
          @if (activeTab() === "loc") {
            <div class="animate-in fade-in duration-300 p-4 pb-8">
              <div
                class="aspect-[16/9] md:aspect-[21/9] bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 mb-4"
              >
                <mat-icon class="text-4xl mb-2">map</mat-icon>
                <span class="text-sm font-medium">{{ car()?.location || carService.getConfig()().address || 'Konum bilgisi mevcut değil' }}</span>
              </div>
              <div
                class="p-4 bg-white shadow-sm rounded-xl border border-slate-100 flex items-start gap-4"
              >
                <div
                  class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0"
                >
                  <mat-icon class="text-blue-600 text-2xl">storefront</mat-icon>
                </div>
                <div>
                  <div class="font-bold text-[16px] text-slate-900">
                    {{ carService.getConfig()().companyName }}
                  </div>
                  <div class="text-[14px] text-slate-600 mt-1 leading-snug">
                    {{ carService.getConfig()().address }}
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- 6. Bottom Action Bar -->
        <div
          class="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-slate-200 p-2 flex items-center gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        >
          <a
            [href]="'tel:' + carService.getConfig()().phone"
            class="flex-1 bg-[#005c8d] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <mat-icon>call</mat-icon>
            <span class="text-sm">Ara</span>
          </a>
          <button
            type="button"
            (click)="inquireCar(car())"
            aria-label="Satış Talebi Gönder"
            class="flex-1 bg-[#005c8d] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <mat-icon>request_quote</mat-icon>
            <span class="text-sm">Satış Talebi Gönder</span>
          </button>

          <!-- Floating WhatsApp/Action Button (Green) -->
          <button
            type="button"
            (click)="whatsappInquiry()"
            aria-label="WhatsApp ile İletişime Geç"
            class="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-90 transition-all border-4 border-white"
          >
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.656.832 5.12 2.28 7.184L.52 24l4.928-1.728A11.95 11.95 0 0012.031 24c6.648 0 12.031-5.383 12.031-12.031C24.062 5.383 18.679 0 12.031 0zm6.544 17.296c-.28.784-1.584 1.456-2.208 1.528-.584.064-1.344.16-3.84-1.04-3.04-1.464-4.992-4.576-5.144-4.784-.144-.2-1.224-1.632-1.224-3.112 0-1.48.768-2.208 1.04-2.504.28-.296.608-.368.808-.368.2 0 .4 0 .576.008.192.008.448-.072.688.512.248.608.848 2.072.92 2.232.072.16.12.352.024.544-.096.192-.144.312-.288.48-.144.168-.304.368-.432.496-.144.144-.296.304-.128.584.168.28 .752 1.232 1.616 1.984 1.112.968 2.048 1.272 2.328 1.416.28.144.448.12.616-.072.168-.192.728-.848.928-1.144.2-.296.4-.248.664-.152.264.096 1.68.792 1.968.936.288.144.48.216.552.336.072.12.072.704-.208 1.488z"
              />
            </svg>
          </button>
        </div>

        <!-- Lightbox -->
        @if (isLightboxOpen()) {
          <div
            class="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300"
            (click)="closeLightbox()"
          >
            <div
              class="flex justify-between items-center p-4 text-white z-10"
              (click)="$event.stopPropagation()"
            >
              <span class="font-bold tracking-widest text-sm"
                >{{ activeImageIndex() + 1 }} / {{ allImages().length }}</span
              >
              <button
                type="button"
                (click)="closeLightbox()"
                aria-label="Kapat"
                class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div
              class="flex-1 relative w-full h-full pb-8"
              (click)="$event.stopPropagation()"
            >
              <swiper-container
                class="w-full h-full"
                [initialSlide]="activeImageIndex()"
                pagination="false"
                navigation="true"
                space-between="20"
                (slidechange)="onLightboxSlideChange($event)"
              >
                @for (img of allImages(); track $index) {
                  <swiper-slide
                    class="w-full h-full flex items-center justify-center p-4"
                  >
                    <img
                      [src]="img"
                      [alt]="(car()?.brand || '') + ' ' + (car()?.model || '') + ' galeri görseli ' + ($index + 1)"
                      class="max-w-full max-h-full object-contain cursor-zoom-out"
                      referrerpolicy="no-referrer"
                      (click)="closeLightbox()"
                    />
                  </swiper-slide>
                }
              </swiper-container>
            </div>
          </div>
        }


      } @else {
        <div
          class="flex items-center justify-center h-screen w-full bg-[#f4f4f4]"
        >
          <div class="flex flex-col items-center gap-4">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005c8d]"
            ></div>
            <p class="text-sm text-slate-500 font-medium animate-pulse">
              İlan bilgileri yükleniyor...
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class SaleCarDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  carService = inject(CarService);
  uiService = inject(UiService);
  meta = inject(Meta);
  title = inject(Title);
  seoService = inject(SeoService);

  car = signal<Car | null>(null);
  isScrolled = signal(false);
  isLightboxOpen = signal(false);
  isTechSpecsOpen = signal(false);
  activeImageIndex = signal(0);
  activeTab = signal<"info" | "desc" | "loc">("info");
  currentSlide = signal(0);

  allImages = computed(() => {
    const c = this.car();
    if (!c) return [];
    const imgs = [];
    if (c.image) imgs.push(c.image);
    if (c.images && c.images.length > 0) imgs.push(...c.images);
    if (c.gallery && c.gallery.length > 0) imgs.push(...c.gallery);
    return [...new Set(imgs)].filter(Boolean);
  });

  techSpecs = computed(() => {
    const c = this.car();
    if (!c) return null;
    let modelKey = c.model;
    if (c.series) {
      modelKey = `${c.series} ${c.model}`.trim();
    }
    const specs = (
      getTechnicalSpecs(c.brand || "", modelKey || "") ||
      getTechnicalSpecs(c.brand || "", c.model || "")
    );
    
    // The panel is shown only when this exact model has a verified specification record.
    return specs;
  });

  openLightbox(index: number) {
    this.activeImageIndex.set(index);
    this.isLightboxOpen.set(true);
    document.body.style.overflow = "hidden";
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
    document.body.style.overflow = "auto";
  }

  t = this.uiService.translations;
  isFav = (id: string | number | undefined) =>
    id ? this.carService.isFavorite(id) : false;

  similarCars = computed(() => {
    const currentCar = this.car();
    if (!currentCar) return [];

    return this.carService
      .getSaleCars()()
      .filter(
        (c) =>
          c.id !== currentCar.id &&
          (c.brand === currentCar.brand ||
            Math.abs(c.price - currentCar.price) < 100000),
      )
      .slice(0, 3);
  });

  @HostListener("window:scroll", [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 100);
  }

  private routeId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.routeId();
      if (id) {
        const found = this.carService.getSaleCar(id);
        if (found) {
          this.car.set(found);
          const config = this.carService.getConfig()();
          const pageTitle = `${found.title || found.brand + " " + found.model} | ${config.companyName}`;

          this.seoService.updateSeoTags({
            title: pageTitle,
            description: `${found.year || ""} ${found.brand} ${found.model} satılık araç ilanı. Kayıtlı fiyat, kilometre, donanım ve araç bilgilerini inceleyin.`,
            keywords: `${found.brand} ${found.model}, satılık araç, Yüksekova araç ilanı, Hakkari otomobil`,
            image:
              found.image ||
              (found.images && found.images.length > 0
                ? found.images[0]
                : config.logoUrl),
          });
          
          this.seoService.updateJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": `${found.brand} ${found.model}`,
            "image": found.image,
            "description": `Satılık ${found.brand} ${found.model} ${found.year}`,
            "brand": {
              "@type": "Brand",
              "name": found.brand
            },
            "offers": {
              "@type": "Offer",
              "url": window.location.href,
              "priceCurrency": "TRY",
              "price": `${found.price}`,
              "itemCondition": "https://schema.org/UsedCondition",
              "availability": found.availability === "Satıldı" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": config.companyName
              }
            }
          });
        }
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params["id"];
      if (id) {
        this.routeId.set(id);
      }
    });
  }

  ngOnDestroy() {}

  listingDate(car: Car | null): string {
    const value = car?.createdAt || car?.updatedAt;
    if (!value) return "Tarih bilgisi yok";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Tarih bilgisi yok"
      : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/sales"]);
    }
  }

  onSlideChange(event: any) {
    this.currentSlide.set(event.detail[0].realIndex);
  }

  onLightboxSlideChange(event: any) {
    this.activeImageIndex.set(event.detail[0].activeIndex);
  }

  toggleFav(id: string | number | undefined) {
    if (id) {
      this.carService.toggleFavorite(id);
    }
  }

  shareCar(car: Car | null) {
    if (!car) return;
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: `${car.brand} ${car.model} - Alperler Auto`,
          text: `${car.brand} ${car.model} aracını inceleyin!`,
          url: url,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert(this.t().common.linkCopied);
      });
    }
  }

  inquireCar(car: Car | null) {
    if (!car) return;

    this.carService.setBookingRequest({
      type: "SALE_INQUIRY",
      item: car,
      itemName: `${car.brand} ${car.model}`,
      image: car.image,
      basePrice: car.price,
    });
    this.router.navigate(["/contact"]);
  }

  whatsappInquiry() {
    const c = this.car();
    if (!c) return;

    const msg = this.t()
      .car.whatsappMsg.replace("{brand}", c.brand)
      .replace("{model}", c.model)
      .replace("{year}", c.year?.toString() || "")
      .replace("{url}", window.location.href);

    // Temizlenmiş (boşluksuz/formatsız) numarayı kullan
    const phone =
      this.carService.getConfig()().whatsapp ||
      this.carService.getConfig()().phone;
    const cleanPhone = phone?.replace(/\D/g, "") || "";
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  }
}
