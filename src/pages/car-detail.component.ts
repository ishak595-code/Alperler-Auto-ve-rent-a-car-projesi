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
import { FormsModule } from "@angular/forms";
import { register } from "swiper/element/bundle";
import { Car } from "../models/car.model";
import { getTechnicalSpecs } from "../data/technical-specs.data";
import { Meta, Title } from "@angular/platform-browser";

import { SeoService } from "../services/seo.service";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

// Register Swiper custom elements
register();

@Component({
  selector: "app-car-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    FormsModule,
    TurkishCurrencyPipe,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="min-h-screen bg-white pb-24 lg:pb-0 font-sans text-[#212121]">
      @if (car()) {
        <!-- 1. Header -->
        <div
          class="sticky top-0 left-0 right-0 z-[60] bg-[#005c8d] text-white flex items-center justify-between px-4 h-14 shadow-md pointer-events-auto"
        >
          <div class="flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-1 hover:bg-white/10 rounded-full transition-colors"
              [attr.aria-label]="t().buttons.back"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold tracking-tight line-clamp-1">
              {{ car()!.brand }} {{ car()!.model }}
            </h1>
          </div>

          <div class="flex items-center gap-2">
            @if (car()?.badge || car()?.isPopular) {
              <div
                class="hidden sm:flex items-center gap-1 bg-red-600 px-3 py-1 text-white rounded-full border border-red-500 shadow-sm"
              >
                <mat-icon class="text-[14px] w-[14px] h-[14px]"
                  >local_fire_department</mat-icon
                >
                <span class="text-[10px] font-bold uppercase tracking-wider">{{
                  car()?.badge || "FIRSAT"
                }}</span>
              </div>
            }
            <div
              class="flex items-center gap-1 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
            >
              <div class="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
              <span class="text-xs font-medium"
                >{{ viewersCount() }} kişi inceliyor</span
              >
            </div>
          </div>

          <div class="flex items-center gap-2 pointer-events-auto">
            <button
              (click)="shareCar(car())"
              class="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
              aria-label="Paylaş"
            >
              <mat-icon class="drop-shadow-lg">share</mat-icon>
            </button>
            <button
              (click)="toggleFav(car()?.id)"
              class="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
              [attr.aria-label]="
                isFav(car()?.id)
                  ? t().common.removeFromFav
                  : t().common.addToFav
              "
            >
              <mat-icon
                class="drop-shadow-lg"
                [class.text-red-500]="isFav(car()?.id)"
              >
                {{ isFav(car()?.id) ? "favorite" : "favorite_border" }}
              </mat-icon>
            </button>
          </div>
        </div>

        <!-- 2. Media Area (Full Screen Gallery) -->
        <div
          class="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] bg-black overflow-hidden"
        >
          <swiper-container
            #swiper
            class="w-full h-full"
            pagination="false"
            navigation="true"
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
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                />
              </swiper-slide>
            }
          </swiper-container>

          <!-- Page Indicator (Bottom Left) -->
          <div
            class="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded text-[12px] font-bold"
          >
            {{ currentSlide() + 1 }} / {{ allImages().length }}
          </div>

          <!-- Badges Overlay -->
          <div
            class="absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end"
          >
            @if (car()?.badge) {
              <span
                class="bg-blue-500 text-slate-900 px-3 py-1 rounded font-black uppercase tracking-widest text-[10px] shadow-lg"
              >
                {{ car()?.badge }}
              </span>
            }
            <span
              class="bg-blue-600 text-white px-3 py-1 rounded font-black uppercase tracking-widest text-[10px] shadow-lg"
            >
              KİRALIK
            </span>
          </div>
        </div>

        <!-- Main Content -->
        <div class="max-w-4xl mx-auto px-4 py-6 space-y-8">
          <!-- 3. Araç Bilgileri (Specs List) -->
          <section class="space-y-4">
            <div
              class="flex justify-between items-end border-b border-slate-100 pb-4"
            >
              <h1 class="text-xl font-bold text-[#212121]">
                {{ car()?.brand }} {{ car()?.model }}
                <span class="block text-sm font-normal text-[#757575] mt-1">{{
                  car()?.type
                }}</span>
              </h1>
              <div class="text-right">
                <div class="text-2xl font-black text-blue-600">
                  {{ car()?.price | turkishCurrency }}
                </div>
                <div
                  class="text-[10px] font-bold text-[#757575] uppercase tracking-widest"
                >
                  GÜNLÜK
                </div>
              </div>
            </div>

            <div class="space-y-0.5">
              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Araç No</span>
                <span class="font-bold text-red-600">{{ car()?.id }}</span>
              </div>
              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Yıl</span>
                <span class="text-[#212121]">{{ car()?.year }}</span>
              </div>
              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Vites Tipi</span>
                <span class="text-[#212121]">{{ car()?.transmission }}</span>
              </div>
              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Yakıt Tipi</span>
                <span class="text-[#212121]">{{ car()?.fuel }}</span>
              </div>
              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Koltuk Sayısı</span>
                <span class="text-[#212121]">{{ car()?.seats || "5" }}</span>
              </div>

              @if (car()?.minLicenseYears) {
                <div
                  class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
                >
                  <span class="text-[#757575]">Min. Ehliyet</span>
                  <span class="text-[#212121]"
                    >{{ car()?.minLicenseYears }} Yıl</span
                  >
                </div>
              }

              @if (car()?.deposit) {
                <div
                  class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
                >
                  <span class="text-[#757575]">Depozito</span>
                  <span class="text-[#212121]">{{
                    car()?.deposit | turkishCurrency
                  }}</span>
                </div>
              }

              @if (car()?.dailyMileageLimit) {
                <div
                  class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
                >
                  <span class="text-[#757575]">Günlük KM</span>
                  <span class="text-[#212121]"
                    >{{ car()?.dailyMileageLimit }} km</span
                  >
                </div>
              }

              <div
                class="flex justify-between py-2.5 border-b border-slate-50 text-sm"
              >
                <span class="text-[#757575]">Durum</span>
                <span>
                  <span
                    [class]="
                      car()?.isAvailable !== false
                        ? 'text-green-600 bg-green-100'
                        : 'text-red-600 bg-red-100'
                    "
                    class="px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase"
                  >
                    {{
                      car()?.isAvailable !== false
                        ? car()?.category === "RENTAL"
                          ? "Müsait"
                          : "Satışta"
                        : car()?.category === "RENTAL"
                          ? "Dolu"
                          : "Satıldı"
                    }}
                  </span>
                </span>
              </div>
            </div>
          </section>

          <!-- 4. Kiralama Hesaplayıcı -->
          <section class="bg-slate-50 rounded-2xl p-6 space-y-4">
            <h2
              class="text-lg font-bold text-[#212121] border-l-4 border-blue-500 pl-3"
            >
              Kiralama Hesapla
            </h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label
                  for="pickupDate"
                  class="text-[10px] font-bold text-[#757575] uppercase"
                  >Alış Tarihi</label
                >
                <input
                  type="date"
                  id="pickupDate"
                  aria-label="Araç alış tarihini seçin"
                  title="Alış Tarihi"
                  [(ngModel)]="startDate"
                  class="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div class="space-y-1">
                <label
                  for="returnDate"
                  class="text-[10px] font-bold text-[#757575] uppercase"
                  >Dönüş Tarihi</label
                >
                <input
                  type="date"
                  id="returnDate"
                  aria-label="Araç dönüş tarihini seçin"
                  title="Dönüş Tarihi"
                  [(ngModel)]="endDate"
                  class="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            @if (car()?.bookedDates?.length) {
              <div class="mt-4 border border-red-100 bg-red-50 p-3 rounded-xl">
                <div class="text-[10px] font-bold text-red-600 uppercase mb-2">
                  Dolu (Rezerve) Tarihler
                </div>
                <ul class="text-xs text-red-800 space-y-1">
                  @for (date of car()?.bookedDates; track date) {
                    <li>
                      • {{ date.start | date: "dd.MM.yyyy" }} -
                      {{ date.end | date: "dd.MM.yyyy" }}
                    </li>
                  }
                </ul>
              </div>
            }

            @if (
              car()?.category === "RENTAL" &&
              car()?.driverOption &&
              car()?.driverOption !== "WITHOUT_DRIVER"
            ) {
              <div
                class="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl mt-3"
              >
                <input
                  type="checkbox"
                  id="withDriverCheck"
                  [(ngModel)]="wantsDriver"
                  aria-label="Şoförlü kiralama istiyorum"
                  [disabled]="car()?.driverOption === 'WITH_DRIVER'"
                  class="w-5 h-5 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  for="withDriverCheck"
                  class="text-sm font-bold text-slate-700 flex-1"
                  >Şoförlü Kiralama
                  <span class="text-blue-600 ml-1"
                    >(+1500 TL / Gün)</span
                  ></label
                >
              </div>
            }

            <div aria-live="polite" aria-atomic="true">
              @if (totalPrice() > 0) {
                <div
                  class="bg-white rounded-xl p-4 border border-slate-200 flex justify-between items-center animate-in zoom-in duration-300"
                >
                  <div>
                    <div
                      class="text-[10px] font-bold text-[#757575] uppercase"
                      aria-hidden="true"
                    >
                      Toplam Tutar ({{ totalDays() }} Gün)
                    </div>
                    <div class="text-xl font-black text-blue-600">
                      <span class="sr-only"
                        >{{ totalDays() }} gün için seçilen tarih aralığında
                        toplam hesaplanan kiralama tutarı</span
                      >
                      {{ totalPrice() | turkishCurrency }}
                    </div>
                  </div>
                  <mat-icon class="text-emerald-500" aria-hidden="true"
                    >check_circle</mat-icon
                  >
                </div>
              }
            </div>
          </section>

          <!-- 5. Özellikler & Açıklama -->
          <section class="space-y-4">
            <div class="space-y-3">
              <div class="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  (click)="toggleSection('desc')"
                  class="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span class="font-bold text-sm">Açıklama</span>
                  <mat-icon
                    [class.rotate-180]="activeSection() === 'desc'"
                    class="transition-transform"
                    >expand_more</mat-icon
                  >
                </button>
                @if (activeSection() === "desc") {
                  <div
                    class="p-4 text-sm text-[#212121] leading-relaxed whitespace-pre-line animate-in slide-in-from-top-2 duration-300"
                  >
                    {{
                      car()?.description ||
                        "Bu araç için detaylı açıklama bulunmamaktadır."
                    }}
                  </div>
                }
              </div>

              <div class="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  (click)="toggleSection('features')"
                  class="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span class="font-bold text-sm">Araç Özellikleri</span>
                  <mat-icon
                    [class.rotate-180]="activeSection() === 'features'"
                    class="transition-transform"
                    >expand_more</mat-icon
                  >
                </button>
                @if (activeSection() === "features") {
                  <div class="p-4 animate-in slide-in-from-top-2 duration-300">
                    <div class="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
                      @for (f of car()?.features; track f) {
                        <div
                          class="flex items-center gap-2 text-xs text-[#212121]"
                        >
                          <mat-icon
                            class="text-green-500 text-sm"
                            style="width:16px;height:16px;font-size:16px;"
                            >check</mat-icon
                          >
                          {{ f }}
                        </div>
                      }
                    </div>
                    @if (techSpecs()) {
                      <div class="mt-4 border-t border-slate-100 pt-4">
                        <button
                          (click)="isTechSpecsOpen.update(v => !v)"
                          [attr.aria-expanded]="isTechSpecsOpen()"
                          aria-controls="tech-specs-content-rent"
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
                            id="tech-specs-content-rent"
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
                  </div>
                }
              </div>
            </div>
          </section>
        </div>

        <!-- 6. Sabit Alt Bar (Sticky Bottom Bar) -->
        <div
          class="fixed bottom-0 left-0 right-0 z-[70] bg-white/95 backdrop-blur-xl border-t border-slate-100 p-3 lg:px-8 flex items-center gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] pb-safe"
        >
          <a
            [href]="'tel:' + carService.getConfig()().phone?.replace(' ', '')"
            class="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-600/20"
          >
            <mat-icon class="text-sm">call</mat-icon>
            <span class="text-xs uppercase tracking-wider">Hemen Ara</span>
          </a>
          <button
            (click)="whatsappInquiry()"
            class="flex-1 bg-[#25D366] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-500/20"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.656.832 5.12 2.28 7.184L.52 24l4.928-1.728A11.95 11.95 0 0012.031 24c6.648 0 12.031-5.383 12.031-12.031C24.062 5.383 18.679 0 12.031 0zm6.544 17.296c-.28.784-1.584 1.456-2.208 1.528-.584.064-1.344.16-3.84-1.04-3.04-1.464-4.992-4.576-5.144-4.784-.144-.2-1.224-1.632-1.224-3.112 0-1.48.768-2.208 1.04-2.504.28-.296.608-.368.808-.368.2 0 .4 0 .576.008.192.008.448-.072.688.512.248.608.848 2.072.92 2.232.072.16.12.352.024.544-.096.192-.144.312-.288.48-.144.168-.304.368-.432.496-.144.144-.296.304-.128.584.168.28 .752 1.232 1.616 1.984 1.112.968 2.048 1.272 2.328 1.416.28.144.448.12.616-.072.168-.192.728-.848.928-1.144.2-.296.4-.248.664-.152.264.096 1.68.792 1.968.936.288.144.48.216.552.336.072.12.072.704-.208 1.488z"
              />
            </svg>
            <span class="text-xs uppercase tracking-wider">WhatsApp</span>
          </button>
          <button
            (click)="rentCar(car())"
            class="flex-1 bg-[#212121] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-black/20"
          >
            <mat-icon class="text-sm">calendar_month</mat-icon>
            <span class="text-xs uppercase tracking-wider">Rezerve Et</span>
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
                (click)="closeLightbox()"
                aria-label="Kapat"
                class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
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
                      class="max-w-full max-h-full object-contain cursor-zoom-out"
                      referrerpolicy="no-referrer"
                      (click)="closeLightbox()"
                    />
                  </swiper-slide>
                }
              </swiper-container>
            </div>

            <div class="p-6 bg-black/40 backdrop-blur-md text-white z-10">
              <h3 class="text-xl font-bold mb-1">
                {{ car()?.brand }} {{ car()?.model }}
              </h3>
              <p class="text-white/60 text-sm">
                {{ car()?.year }} • {{ car()?.fuel }} •
                {{ car()?.transmission }}
              </p>
            </div>
          </div>
        }


      } @else {
        <div
          class="flex items-center justify-center h-screen w-full bg-slate-50"
        >
          <div class="flex flex-col items-center gap-4">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"
            ></div>
            <p class="text-sm text-slate-500 font-medium animate-pulse">
              Araç bilgileri yükleniyor...
            </p>
          </div>
        </div>
      }
    </div>
  `,
})
export class CarDetailComponent implements OnInit, OnDestroy {
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
  viewersCount = signal(Math.floor(Math.random() * 15) + 5);
  isTechSpecsOpen = signal(false);
  activeImageIndex = signal(0);
  activeSection = signal<string | null>(null);
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
    
    // Provide a generic fallback so the button always appears for all cars
    if (!specs) {
      return {
        maxSpeed: 'Belirtilmemiş',
        acceleration: 'Belirtilmemiş',
        cityFuel: 'Belirtilmemiş',
        highwayFuel: 'Belirtilmemiş',
        combinedFuel: 'Belirtilmemiş',
        tankCapacity: 'Belirtilmemiş',
        trunkCapacity: 'Belirtilmemiş',
        wheels: 'Orijinal Standart Özelik',
        dimensions: 'Belirtilmemiş',
        cylinders: '-',
        engineVolume: c.engineVolume || 'Belirtilmemiş',
        enginePower: c.enginePower || 'Belirtilmemiş',
        torque: 'Belirtilmemiş',
        weight: 'Belirtilmemiş',
        drivetrain: c.drivetrain || 'Belirtilmemiş'
      };
    }
    
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

  startDate = signal("");
  endDate = signal("");
  wantsDriver = signal(false);

  totalDays = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    if (!start || !end) return 0;

    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = d2.getTime() - d1.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  });

  totalPrice = computed(() => {
    const days = this.totalDays();
    const car = this.car();
    if (!car || days <= 0) return 0;

    let dailyPrice = car.price;
    if (car.driverOption === "WITH_DRIVER" || this.wantsDriver()) {
      dailyPrice += 1500;
    }

    return days * dailyPrice;
  });

  similarCars = computed(() => {
    const currentCar = this.car();
    if (!currentCar) return [];

    return this.carService
      .getCars()()
      .filter(
        (c) =>
          c.id !== currentCar.id &&
          (c.brand === currentCar.brand ||
            Math.abs(c.price - currentCar.price) < 500),
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
        const found = this.carService.getCar(id);
        if (found) {
          this.car.set(found);
          const config = this.carService.getConfig()();
          const pageTitle = `${found.brand} ${found.model} ile Kusursuz Sürüş Deneyimi 🚘 | ${config.companyName}`;

          this.seoService.updateSeoTags({
            title: pageTitle,
            description: `Hayalinizdeki ${found.brand} ${found.model} ${found.year} sizi bekliyor! Ayrıcalıklı kiralama deneyimi, şeffaf fiyatlar ve 7/24 destek ile hemen yola çıkın.`,
            keywords: `${found.brand} kiralama, ${found.model} kiralık donanım, lüks araç kiralama Yüksekova, Hakkari rent a car fırsatları, sorunsuz araç kiralama`,
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
            "description": `Kiralık ${found.brand} ${found.model} ${found.year}`,
            "brand": {
              "@type": "Brand",
              "name": found.brand
            },
            "offers": {
              "@type": "Offer",
              "url": `https://alperrentacar.online/fleet/${found.id}`,
              "priceCurrency": "TRY",
              "price": `${found.price}`,
              "itemCondition": "https://schema.org/UsedCondition",
              "availability": "https://schema.org/InStock",
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

  ngOnDestroy() {
    // Service reset defaults automatically on navigation end,
    // but we can optionally call this.seoService.setDefaults() here too if we want instant change before navigation completes.
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/fleet"]);
    }
  }

  toggleSection(section: string) {
    this.activeSection.update((current) =>
      current === section ? null : section,
    );
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

  rentCar(car: Car | null) {
    if (!car) return;

    this.carService.setBookingRequest({
      type: "RENTAL",
      item: car,
      itemName: `${car.brand} ${car.model}`,
      image: car.image,
      basePrice: car.price,
      startDate: this.startDate(),
      endDate: this.endDate(),
      rentalDuration: "daily",
      withDriver: car.driverOption === "WITH_DRIVER" || this.wantsDriver(),
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
