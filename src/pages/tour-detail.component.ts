import { Component, inject, OnInit, signal, computed, effect } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { CarService } from "../services/car.service";
import { Tour } from "../models/car.model";
import { UiService } from "../services/ui.service";
import { MatIconModule } from "@angular/material/icon";
import { SeoService } from "../services/seo.service";
import { VehicleCardComponent } from "../components/vehicle-card.component";
import { TourMediaGalleryComponent } from "../components/tour-media-gallery.component";

@Component({
  selector: "app-tour-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, VehicleCardComponent, TourMediaGalleryComponent, ReactiveFormsModule],
  template: `
    @if (tour()) {
      <div class="min-h-screen bg-white animate-fade-in flex flex-col pb-24 lg:pb-0 relative">
        <div class="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm z-50">
          <button (click)="goBack()" class="flex items-center text-slate-900 hover:text-blue-600 font-bold transition-colors text-lg">
            <mat-icon class="mr-2">arrow_back</mat-icon>
            Geri Dön
          </button>
        </div>

        <div class="flex-grow pb-24">
          <div class="relative h-[40vh] sm:h-[50vh] min-h-[300px] w-full">
            <img [src]="tour()!.image" [alt]="tour()!.title" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
            <div class="absolute bottom-6 left-6 sm:left-12 right-6">
              <span class="bg-blue-500 text-slate-900 font-bold text-xs px-3 py-1 rounded-full shadow-lg mb-4 inline-block">{{ tour()!.duration }}</span>
              <h2 class="text-3xl sm:text-5xl font-serif font-bold text-white leading-tight">{{ tour()!.title }}</h2>
            </div>
          </div>

          <app-tour-media-gallery [tour]="tour()!"></app-tour-media-gallery>

          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-12">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div class="lg:col-span-2 space-y-10">
                <section>
                  <h3 class="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                    <mat-icon class="text-blue-500 mr-2">explore</mat-icon>
                    Tur Hakkında Özel Detaylar
                  </h3>
                  <p class="text-slate-600 leading-relaxed text-lg bg-slate-50 p-6 rounded-2xl border-l-4 border-blue-500 shadow-sm">{{ tour()!.description }}</p>
                </section>

                <section>
                  <h3 class="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                    <mat-icon class="text-blue-500 mr-2">star</mat-icon>
                    Neler Yaşayacaksınız?
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    @for (highlight of tour()!.highlights; track highlight) {
                      <div class="flex items-start bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                        <mat-icon class="text-blue-500 mr-3 flex-shrink-0 mt-0.5">check_circle</mat-icon>
                        <span class="text-slate-700 font-bold tracking-wide">{{ highlight }}</span>
                      </div>
                    }
                  </div>
                </section>

                @if (tour()!.mapIframeUrl) {
                  <section class="mt-12">
                    <h3 class="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                      <mat-icon class="text-blue-500 mr-2">map</mat-icon>
                      Tur Rotası & Konum
                    </h3>
                    <div class="w-full h-[250px] md:h-[300px] rounded-3xl overflow-hidden shadow-lg border border-slate-200">
                      <iframe [src]="safeMapUrl()" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                  </section>
                }

                <section class="mt-12">
                  <details class="group bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden cursor-pointer">
                    <summary class="text-xl font-bold text-slate-900 p-6 sm:p-8 flex items-center justify-between select-none">
                      <div class="flex items-center">
                        <mat-icon class="text-blue-500 mr-3">info</mat-icon>
                        İptal, İade ve Kurallar
                      </div>
                      <mat-icon class="text-slate-400 group-open:rotate-180 transition-transform duration-300">expand_more</mat-icon>
                    </summary>
                    <div class="px-6 sm:px-8 pb-6 sm:pb-8 text-slate-600 space-y-4 text-sm leading-relaxed border-t border-slate-200 pt-6 mt-2">
                      <p><strong class="text-slate-800">Ücretsiz İptal:</strong> Tur saatinden 48 saat öncesine kadar yapılan iptallerde %100 kesintisiz ücret iadesi.</p>
                      <p><strong class="text-slate-800">Geç İptal:</strong> Tura 24-48 saat kala yapılan iptallerde %50 kesinti uygulanarak iade yapılır.</p>
                      <p><strong class="text-slate-800">Son Gün:</strong> Tur gününe 24 saatten az bir süre kala yapılan iptallerde maalesef ücret iadesi yapılamamaktadır.</p>
                      <p><strong class="text-slate-800">Hava Muhalefeti:</strong> Olumsuz hava koşulları veya mücbir sebepler nedeniyle iptal edilen turlarda ücretsiz tarih değişikliği veya tam iade imkanı sunulur.</p>
                      <p><strong class="text-slate-800">Seyahat Sigortası:</strong> İsteğe bağlı kapsamlı seyahat ve sağlık sigortası ekibimiz tarafından sizin adınıza yapılabilir.</p>
                    </div>
                  </details>
                </section>
              </div>

              <div class="lg:col-span-1">
                <div class="bg-white rounded-t-2xl sm:rounded-3xl p-4 sm:p-8 border-t sm:border border-slate-200 fixed bottom-0 left-0 right-0 sm:relative sm:top-24 sm:sticky shadow-[0_-10px_40px_rgba(0,0,0,0.15)] sm:shadow-xl z-40">
                  <div class="mb-3 sm:mb-8 flex sm:block items-center justify-between gap-4">
                    <div class="shrink-0 flex flex-col justify-center">
                      <div class="text-3xl sm:text-5xl font-black text-slate-900 drop-shadow-sm flex items-baseline gap-1">
                        <span>{{ tour()!.price }}₺</span>
                        <span class="text-sm font-bold text-slate-500 uppercase tracking-wide">/ Kişi</span>
                      </div>
                    </div>

                    <div class="flex sm:hidden flex-1 justify-end items-center gap-3">
                      <a [href]="'https://wa.me/905379594851?text=' + tour()!.title + ' turunuz hakkında bilgi almak istiyorum.'" target="_blank" class="bg-[#25D366] text-white w-12 h-12 rounded-xl hover:bg-[#1ebe57] transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0" aria-label="WhatsApp'tan Sor">
                        <mat-icon class="text-[24px]">chat</mat-icon>
                      </a>
                      <button (click)="openReservationModal()" class="bg-slate-900 text-white px-2 h-12 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md active:scale-95 flex-1 max-w-[180px] text-center flex items-center justify-center uppercase tracking-wide">Rezervasyon Yap</button>
                    </div>
                  </div>

                  <div class="hidden sm:block space-y-4 mb-8">
                    <div class="flex items-center text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <mat-icon class="text-blue-500 mr-3">verified</mat-icon>
                      <span class="font-bold">Özel VIP Rehberli Tur</span>
                    </div>
                    <div class="flex items-center text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <mat-icon class="text-emerald-500 mr-3">shield</mat-icon>
                      <span class="font-bold">Seyahat Sigortası Dahil</span>
                    </div>
                  </div>

                  <div class="hidden sm:block space-y-3">
                    <button (click)="openReservationModal()" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-600 hover:text-white transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95 flex items-center justify-center transform">
                      <mat-icon class="mr-2">book_online</mat-icon>
                      Rezervasyon Yap
                    </button>
                    <a [href]="'https://wa.me/905379594851?text=' + tour()!.title + ' turunuz hakkında bilgi almak istiyorum.'" target="_blank" class="w-full bg-[#25D366] text-white py-4 rounded-2xl font-bold text-lg hover:bg-[#1ebe57] transition-all shadow-lg active:scale-95 flex items-center justify-center" aria-label="WhatsApp'tan Sor">
                      <mat-icon class="mr-2 text-[24px]">chat</mat-icon>
                      WhatsApp'tan Sor
                    </a>
                  </div>
                </div>
              </div>
            </div>

            @if (recommendedCars().length > 0) {
              <div class="mt-20 border-t border-slate-100 pt-16">
                <div class="flex justify-between items-end mb-8">
                  <div>
                    <h3 class="text-2xl font-bold text-slate-900">Bu Tura Uygun Araçlar</h3>
                    <p class="text-slate-500 mt-2">Kendi aracınızla özgürce keşfetmek isterseniz size özel lüks kiralık araç listemiz.</p>
                  </div>
                  <button (click)="router.navigate(['/fleet'])" class="hidden sm:flex text-blue-600 font-bold hover:text-blue-800 transition-colors items-center text-sm">
                    Tüm Araçları Gör
                    <mat-icon class="ml-1 w-4 h-4 text-[16px]">arrow_forward</mat-icon>
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  @for (car of recommendedCars(); track car.id) {
                    <div class="h-full">
                      <app-vehicle-card [car]="car"></app-vehicle-card>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        @if (isReservationModalOpen()) {
          <div class="fixed inset-0 z-[999] bg-white flex flex-col animate-fade-in pb-16 lg:pb-0 overflow-y-auto">
            <div class="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm z-50">
              <button (click)="closeReservationModal()" [disabled]="isSubmittingReservation()" class="flex items-center text-slate-600 hover:text-slate-900 font-bold transition-colors disabled:opacity-50">
                <mat-icon class="mr-1">close</mat-icon>
                Kapat
              </button>
              <div class="font-bold text-slate-900 truncate px-4 flex-1 text-center font-serif text-xl">{{ reservationStep() === 1 ? 'Tur Rezervasyonu' : 'Rezervasyon Kaydı' }}</div>
              <div class="w-16"></div>
            </div>

            <div class="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
              @if (reservationStep() === 1) {
                <div class="bg-slate-50 p-6 rounded-3xl mb-8 flex items-center gap-4">
                  <img [src]="tour()!.image" [alt]="tour()!.title" class="w-20 h-20 object-cover rounded-xl shadow-sm" referrerpolicy="no-referrer">
                  <div>
                    <h3 class="font-bold text-xl text-slate-900">{{ tour()!.title }}</h3>
                    <p class="text-slate-500">{{ tour()!.duration }} - VIP Tur</p>
                  </div>
                </div>

                <div class="bg-white border text-center p-6 rounded-3xl mb-8 flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] border-slate-100">
                  <label class="font-bold text-slate-700 mb-4 block text-lg">Kaç Kişi Gideceksiniz?</label>
                  <div class="flex items-center gap-6 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <button (click)="decreasePerson()" aria-label="Kişi Sayısını Azalt" type="button" [disabled]="isSubmittingReservation()" class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-700 active:scale-95 border border-slate-100 disabled:opacity-50">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="font-black text-3xl w-12 text-center text-slate-900">{{ personCount() }}</span>
                    <button (click)="increasePerson()" aria-label="Kişi Sayısını Artır" type="button" [disabled]="isSubmittingReservation()" class="w-12 h-12 rounded-xl bg-slate-900 shadow-sm flex items-center justify-center text-white active:scale-95 hover:bg-blue-600 transition-colors disabled:opacity-50">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                  <div class="mt-6 flex flex-col items-center">
                    <span class="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Toplam Tutar</span>
                    <span class="text-4xl font-black text-blue-600">{{ tour()!.price * personCount() }}₺</span>
                  </div>
                </div>

                <form [formGroup]="reservationForm" (ngSubmit)="proceedToPayment()" class="space-y-6">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label for="tour_first_name" class="block text-sm font-bold text-slate-700 mb-2">Adınız</label>
                      <input id="tour_first_name" type="text" autocomplete="given-name" formControlName="firstName" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400" placeholder="Adınız">
                    </div>
                    <div>
                      <label for="tour_last_name" class="block text-sm font-bold text-slate-700 mb-2">Soyadınız</label>
                      <input id="tour_last_name" type="text" autocomplete="family-name" formControlName="lastName" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400" placeholder="Soyadınız">
                    </div>
                    <div>
                      <label for="tour_phone" class="block text-sm font-bold text-slate-700 mb-2">Telefon Numaranız</label>
                      <input id="tour_phone" type="tel" inputmode="tel" autocomplete="tel" formControlName="phone" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400" placeholder="05XX XXX XX XX">
                    </div>
                    <div>
                      <label for="tour_email" class="block text-sm font-bold text-slate-700 mb-2">E-posta Adresiniz</label>
                      <input id="tour_email" type="email" inputmode="email" autocomplete="email" formControlName="email" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400" placeholder="ornek@email.com">
                    </div>
                  </div>
                  <div>
                    <label for="tour_notes" class="block text-sm font-bold text-slate-700 mb-2">Ek Notlar (İsteğe Bağlı)</label>
                    <textarea id="tour_notes" formControlName="notes" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder-slate-400 resize-none" placeholder="Bize iletmek istediğiniz özel bir durum var mı?"></textarea>
                  </div>

                  @if (reservationSubmitError()) {
                    <div role="alert" aria-live="assertive" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                      {{ reservationSubmitError() }}
                    </div>
                  }

                  <div class="pt-6 border-t border-slate-100 flex justify-end">
                    <button type="submit" [disabled]="reservationForm.invalid || isSubmittingReservation()" class="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 w-full sm:w-auto flex items-center justify-center">
                      @if (isSubmittingReservation()) {
                        <mat-icon class="mr-2 animate-spin">progress_activity</mat-icon>
                        Rezervasyon Kaydediliyor
                      } @else {
                        Rezervasyonu Oluştur
                        <mat-icon class="ml-2">arrow_forward</mat-icon>
                      }
                    </button>
                  </div>
                </form>
              }

              @if (reservationStep() === 2) {
                <div class="text-center py-12 flex flex-col items-center">
                  <div class="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <mat-icon class="text-emerald-500 text-[48px] w-[48px] h-[48px]">check_circle</mat-icon>
                  </div>
                  <h2 class="text-3xl font-serif font-bold text-slate-900 mb-4">Rezervasyon Talebiniz Kaydedildi</h2>
                  <p class="text-lg text-slate-600 mb-8 max-w-md mx-auto">
                    Talebiniz sistemimize kalıcı olarak kaydedildi. Kesin tur onayı, ödeme gereksinimi ve buluşma detayları kayıtlı e-posta veya telefon bilgileriniz üzerinden ayrıca bildirilecektir.
                  </p>
                  <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left w-full max-w-sm mb-10 shadow-sm">
                    <div class="flex justify-between mb-3 text-sm">
                      <span class="text-slate-500 font-medium">Tur:</span>
                      <span class="font-bold text-slate-900 text-right">{{ tour()!.title }}</span>
                    </div>
                    <div class="flex justify-between mb-3 text-sm">
                      <span class="text-slate-500 font-medium">Kişi:</span>
                      <span class="font-bold text-slate-900">{{ personCount() }} Kişi</span>
                    </div>
                    <div class="flex justify-between text-sm border-t border-slate-200 pt-3 mt-3">
                      <span class="text-slate-500 font-bold">Toplam:</span>
                      <span class="font-black text-blue-600">{{ tour()!.price * personCount() }}₺</span>
                    </div>
                  </div>
                  <button (click)="finishReservation()" class="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-95 shadow-md">Ana Sayfaya Dön</button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="min-h-screen flex items-center justify-center bg-slate-50">
        <div class="text-center">
          <mat-icon class="text-6xl text-slate-300 mb-4">error_outline</mat-icon>
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Tur Bulunamadı</h2>
          <p class="text-slate-500 mb-6">Aradığınız tur mevcut değil veya kaldırılmış olabilir.</p>
          <button (click)="goBack()" class="bg-blue-500 text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-slate-900 hover:text-white transition-colors">Geri Dön</button>
        </div>
      </div>
    }
  `,
})
export class TourDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  location = inject(Location);
  carService = inject(CarService);
  uiService = inject(UiService);
  seoService = inject(SeoService);
  sanitizer = inject(DomSanitizer);
  fb = inject(FormBuilder);

  tour = signal<Tour | null>(null);
  recommendedCars = signal<any[]>([]);
  personCount = signal<number>(1);
  isReservationModalOpen = signal(false);
  reservationStep = signal(1);
  isSubmittingReservation = signal(false);
  reservationSubmitError = signal<string | null>(null);

  reservationForm = this.fb.group({
    firstName: ["", Validators.required],
    lastName: ["", Validators.required],
    phone: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    notes: [""],
  });

  safeMapUrl = computed<SafeResourceUrl | null>(() => {
    const t = this.tour();
    if (t && t.mapIframeUrl) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(t.mapIframeUrl);
    }
    return null;
  });

  private routeId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.routeId();
      if (id) {
        const foundTour = this.carService.getTours()().find((t) => t.id == id);
        if (foundTour) {
          this.tour.set(foundTour);
          const allCars = this.carService.getAllVehicles()();
          let suggestions = allCars.filter(
            (c) => c.category === "RENTAL" && (c.type === "SUV" || c.type === "Pickup"),
          );

          if (suggestions.length < 4) {
            const others = allCars.filter(
              (c) => c.category === "RENTAL" && !suggestions.includes(c),
            );
            suggestions.push(...others.slice(0, 4 - suggestions.length));
          }
          this.recommendedCars.set(suggestions.slice(0, 4));

          const config = this.carService.getConfig()();
          this.seoService.updateSeoTags({
            title: `${foundTour.title || ""} - Vip Tur | ${config.companyName}`,
            description: `Alperler Auto güvencesiyle ${foundTour.title || ""} turu. Lüks sınıf araçlar ve deneyimli şoförlerle konforlu bir yolculuk deneyimi.`,
            keywords: `vip tur, ${(foundTour.title || "").toLowerCase()}, hakkari vip transfer, yüksekova şoförlü araç kiralama, turistik geziler`,
            image: foundTour.image || config.logoUrl,
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

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  openReservationModal() {
    this.isReservationModalOpen.set(true);
    this.reservationStep.set(1);
    this.reservationSubmitError.set(null);
    this.isSubmittingReservation.set(false);
    this.reservationForm.reset();
  }

  closeReservationModal() {
    if (this.isSubmittingReservation()) return;
    this.isReservationModalOpen.set(false);
  }

  async proceedToPayment(): Promise<void> {
    if (this.reservationForm.invalid || this.isSubmittingReservation()) {
      this.reservationForm.markAllAsTouched();
      return;
    }

    const val = this.reservationForm.getRawValue();
    const t = this.tour();
    if (!t) {
      this.reservationSubmitError.set("Tur bilgisi yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.");
      return;
    }

    this.isSubmittingReservation.set(true);
    this.reservationSubmitError.set(null);
    const now = new Date().toISOString();
    const tourReq: any = {
      type: "TOUR",
      item: t,
      itemName: t.title,
      image: t.image,
      customerName: `${val.firstName || ""} ${val.lastName || ""}`.trim(),
      customerPhone: val.phone || "",
      customerEmail: val.email || "",
      startDate: now,
      endDate: now,
      personCount: this.personCount(),
      notes: `Tur Rezervasyonu: ${t.title} | Kişi Sayısı: ${this.personCount()}${val.notes ? ` | Not: ${val.notes}` : ""}`,
      status: "PENDING",
      basePrice: t.price || 0,
      totalPrice: (t.price || 0) * this.personCount(),
    };

    try {
      await this.carService.addReservation(tourReq);
      this.reservationStep.set(2);
    } catch (error) {
      console.error("Tour reservation could not be persisted.", error);
      this.reservationSubmitError.set(
        "Rezervasyon kaydı oluşturulamadı. Hiçbir ödeme adımına geçilmedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.",
      );
    } finally {
      this.isSubmittingReservation.set(false);
    }
  }

  finishReservation() {
    this.closeReservationModal();
    this.router.navigate(["/"]);
  }

  increasePerson() {
    if (this.personCount() < 20 && !this.isSubmittingReservation()) {
      this.personCount.update((count) => count + 1);
    }
  }

  decreasePerson() {
    if (this.personCount() > 1 && !this.isSubmittingReservation()) {
      this.personCount.update((count) => count - 1);
    }
  }
}
