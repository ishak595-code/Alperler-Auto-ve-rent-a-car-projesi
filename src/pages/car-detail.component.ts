import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { register } from "swiper/element/bundle";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { SeoService } from "../services/seo.service";
import { getTechnicalSpecs } from "../data/technical-specs.data";

register();

interface GalleryMedia {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  title?: string;
}

@Component({
  selector: "app-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, TurkishCurrencyPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <main class="min-h-screen bg-slate-50 pb-28 text-slate-950 lg:pb-8">
      @if (car(); as vehicle) {
        <header class="sticky top-[72px] z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur md:top-[96px]">
          <div class="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
            <div class="flex min-w-0 items-center gap-2">
              <button type="button" (click)="goBack()" aria-label="Geri" class="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
              <div class="min-w-0"><p class="truncate text-xs font-bold uppercase tracking-wider text-blue-300">Kiralık Araç</p><h1 class="truncate text-base font-black sm:text-lg">{{ vehicle.brand }} {{ vehicle.model }}</h1></div>
            </div>
            <div class="flex shrink-0 gap-1">
              <button type="button" (click)="shareCar(vehicle)" aria-label="Paylaş" class="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">share</mat-icon></button>
              <button type="button" (click)="toggleFav(vehicle.id)" [attr.aria-label]="isFav(vehicle.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'" class="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true" [class.text-red-400]="isFav(vehicle.id)">{{ isFav(vehicle.id) ? 'favorite' : 'favorite_border' }}</mat-icon></button>
            </div>
          </div>
        </header>

        <section class="bg-black" aria-label="Araç görselleri ve videoları">
          <div class="relative mx-auto max-w-6xl overflow-hidden bg-black">
            @if (media().length) {
              <swiper-container #gallerySwiper class="block aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]" pagination="false" navigation="false" loop="false" (slidechange)="onSlideChange($event)">
                @for (item of media(); track item.type + ':' + item.url) {
                  <swiper-slide class="h-full w-full">
                    @if (item.type === 'image') {
                      <img [src]="item.url" [alt]="vehicle.brand + ' ' + vehicle.model + ' araç görseli'" class="h-full w-full object-cover" referrerpolicy="no-referrer" />
                    } @else {
                      <video class="h-full w-full bg-black object-contain" controls playsinline preload="metadata" [poster]="item.posterUrl || ''" [attr.aria-label]="item.title || (vehicle.brand + ' ' + vehicle.model + ' araç videosu')"><source [src]="item.url" /></video>
                    }
                  </swiper-slide>
                }
              </swiper-container>
              <div class="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2">
                <div class="rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white backdrop-blur">{{ currentSlide() + 1 }} / {{ media().length }}</div>
                @if (media().length > 1) {
                  <div class="pointer-events-auto flex gap-2">
                    <button type="button" (click)="previousMedia()" aria-label="Önceki görsel" class="grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">chevron_left</mat-icon></button>
                    <button type="button" (click)="nextMedia()" aria-label="Sonraki görsel" class="grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">chevron_right</mat-icon></button>
                  </div>
                }
              </div>
            } @else {
              <div class="grid aspect-[4/3] place-items-center bg-slate-900 text-slate-400 sm:aspect-[16/9]"><div class="text-center"><mat-icon aria-hidden="true" class="!h-12 !w-12 !text-[48px]">directions_car</mat-icon><p class="mt-2 text-sm font-bold">Araç görseli hazırlanıyor</p></div></div>
            }
          </div>
        </section>

        <div class="mx-auto grid max-w-6xl gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div class="space-y-5">
            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="vehicle-summary-title">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><p class="text-xs font-black uppercase tracking-wider text-blue-600">Araç No {{ vehicle.id }}</p><h2 id="vehicle-summary-title" class="mt-1 font-serif text-3xl font-black tracking-tight">{{ vehicle.brand }} {{ vehicle.model }}</h2><p class="mt-1 text-sm text-slate-500">{{ [vehicle.year, vehicle.type, vehicle.location].filter(Boolean).join(' · ') }}</p></div>
                <div class="sm:text-right"><strong class="block text-3xl font-black text-blue-700">{{ vehicle.price | turkishCurrency }}</strong><span class="text-xs font-bold uppercase text-slate-500">Günlük kiralama</span></div>
              </div>
              <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div class="rounded-xl bg-slate-50 p-3"><span class="block text-[11px] font-bold uppercase text-slate-400">Vites</span><strong class="mt-1 block text-sm">{{ vehicle.transmission || 'Belirtilmedi' }}</strong></div>
                <div class="rounded-xl bg-slate-50 p-3"><span class="block text-[11px] font-bold uppercase text-slate-400">Yakıt</span><strong class="mt-1 block text-sm">{{ vehicle.fuel || 'Belirtilmedi' }}</strong></div>
                <div class="rounded-xl bg-slate-50 p-3"><span class="block text-[11px] font-bold uppercase text-slate-400">Koltuk</span><strong class="mt-1 block text-sm">{{ vehicle.seats || 'Belirtilmedi' }}</strong></div>
                <div class="rounded-xl bg-slate-50 p-3"><span class="block text-[11px] font-bold uppercase text-slate-400">Durum</span><strong class="mt-1 block text-sm" [class.text-emerald-700]="vehicle.isAvailable !== false" [class.text-red-700]="vehicle.isAvailable === false">{{ vehicle.isAvailable === false ? 'Müsait değil' : 'Müsait' }}</strong></div>
              </div>
            </section>

            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="vehicle-details-title">
              <h2 id="vehicle-details-title" class="text-lg font-black">Araç Bilgileri</h2>
              <dl class="mt-4 divide-y divide-slate-100 text-sm">
                @if (vehicle.deposit !== undefined) { <div class="flex justify-between gap-4 py-3"><dt class="text-slate-500">Depozito</dt><dd class="font-bold">{{ vehicle.deposit | turkishCurrency }}</dd></div> }
                @if (vehicle.dailyMileageLimit) { <div class="flex justify-between gap-4 py-3"><dt class="text-slate-500">Günlük kilometre</dt><dd class="font-bold">{{ vehicle.dailyMileageLimit }} km</dd></div> }
                @if (vehicle.minAge) { <div class="flex justify-between gap-4 py-3"><dt class="text-slate-500">Minimum yaş</dt><dd class="font-bold">{{ vehicle.minAge }}</dd></div> }
                @if (vehicle.minLicenseYears) { <div class="flex justify-between gap-4 py-3"><dt class="text-slate-500">Minimum ehliyet</dt><dd class="font-bold">{{ vehicle.minLicenseYears }} yıl</dd></div> }
                <div class="flex justify-between gap-4 py-3"><dt class="text-slate-500">Sürücü seçeneği</dt><dd class="font-bold">{{ driverOptionLabel(vehicle.driverOption) }}</dd></div>
              </dl>
            </section>

            @if (vehicle.description) { <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="description-title"><h2 id="description-title" class="text-lg font-black">Açıklama</h2><p class="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{{ vehicle.description }}</p></section> }

            @if (vehicle.features?.length) {
              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="features-title">
                <h2 id="features-title" class="text-lg font-black">Araç Özellikleri</h2>
                <div class="mt-4 grid gap-2 sm:grid-cols-2">@for (feature of vehicle.features; track feature) { <div class="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm"><mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px] text-emerald-600">check_circle</mat-icon><span>{{ feature }}</span></div> }</div>
              </section>
            }

            @if (technicalSpecs(); as specs) {
              <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="tech-title">
                <button type="button" (click)="techOpen.update(v => !v)" [attr.aria-expanded]="techOpen()" aria-controls="rental-tech-specs" class="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><span><strong id="tech-title" class="block text-lg">Teknik Özellikler</strong><small class="text-slate-500">Motor, performans ve ölçüler</small></span><mat-icon aria-hidden="true">{{ techOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
                @if (techOpen()) { <dl id="rental-tech-specs" class="mt-4 grid gap-2 sm:grid-cols-2">@for (row of specRows(specs); track row.label) { <div class="rounded-xl bg-slate-50 p-3"><dt class="text-xs font-bold uppercase text-slate-400">{{ row.label }}</dt><dd class="mt-1 text-sm font-black">{{ row.value }}</dd></div> }</dl> }
              </section>
            }
          </div>

          <aside id="rental-reservation" class="rounded-2xl border border-blue-200 bg-white p-4 shadow-xl shadow-blue-950/5 sm:p-6 lg:sticky lg:top-[116px]" aria-labelledby="reservation-title">
            <p class="text-xs font-black uppercase tracking-wider text-blue-600">Rezervasyon</p>
            <h2 id="reservation-title" class="mt-1 font-serif text-2xl font-black">Bu aracı rezerve edin</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">Tarih, teslim ve iade noktası, şoför tercihi ve ek hizmetlerin tamamını tek rezervasyon ekranında seçin.</p>
            <div class="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
              <span class="text-xs font-bold uppercase text-blue-300">Günlük başlangıç fiyatı</span>
              <strong class="mt-1 block text-3xl">{{ vehicle.price | turkishCurrency }}</strong>
              <p class="mt-2 text-xs leading-5 text-slate-400">Nihai tutar rezervasyondaki tarih ve hizmet seçimlerinize göre otomatik güncellenir.</p>
            </div>
            <button type="button" (click)="reserve(vehicle)" [disabled]="vehicle.isAvailable === false" aria-label="Bu araç için rezervasyon oluştur" class="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-600/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><mat-icon aria-hidden="true">event_available</mat-icon>Rezervasyon Oluştur</button>
            <button type="button" (click)="whatsappInquiry()" aria-label="Bu araç hakkında WhatsApp ile bilgi al" class="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 font-black text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><mat-icon aria-hidden="true">chat</mat-icon>WhatsApp ile Sor</button>
          </aside>
        </div>

        <div class="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 p-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div class="mx-auto grid max-w-2xl grid-cols-[.75fr_1.25fr] gap-2"><a [href]="phoneHref()" aria-label="Telefonla ara" class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 font-black text-slate-800"><mat-icon aria-hidden="true">call</mat-icon>Ara</a><button type="button" (click)="reserve(vehicle)" [disabled]="vehicle.isAvailable === false" aria-label="Bu araç için rezervasyon oluştur" class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 font-black text-white disabled:bg-slate-300 disabled:text-slate-500"><mat-icon aria-hidden="true">event_available</mat-icon>Rezervasyon Oluştur</button></div>
        </div>
      } @else {
        <section class="grid min-h-[70vh] place-items-center bg-slate-50 px-6 text-center" role="status"><div><div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div><p class="mt-4 font-bold text-slate-600">Araç bilgileri yükleniyor...</p></div></section>
      }
    </main>
  `,
})
export class CarDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly carService = inject(CarService);
  private readonly seoService = inject(SeoService);

  @ViewChild("gallerySwiper") gallerySwiper?: ElementRef<any>;

  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  private readonly presetStartDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("start"));
  private readonly presetEndDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("end"));
  readonly currentSlide = signal(0);
  readonly techOpen = signal(false);

  readonly car = computed<Car | null>(() => {
    const match = this.carService.getAllVehicles()().find((item) => item.category === "RENTAL" && (String(item.id) === this.routeId || String(item.cloudId || "") === this.routeId));
    return (match as Car | undefined) || null;
  });

  readonly media = computed<GalleryMedia[]>(() => {
    const vehicle = this.car();
    if (!vehicle) return [];
    const seen = new Set<string>();
    const items: GalleryMedia[] = [];
    for (const url of [vehicle.image, ...(vehicle.images || []), ...(vehicle.gallery || [])]) {
      const clean = String(url || "").trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      items.push({ type: "image", url: clean });
    }
    for (const video of vehicle.videos || []) {
      const clean = String(video?.url || "").trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      items.push({ type: "video", url: clean, posterUrl: video.posterUrl, title: video.title });
    }
    return items.slice(0, 30);
  });

  readonly technicalSpecs = computed(() => {
    const vehicle = this.car();
    if (!vehicle) return null;
    const modelKey = vehicle.series ? `${vehicle.series} ${vehicle.model || ""}`.trim() : vehicle.model || "";
    return getTechnicalSpecs(vehicle.brand || "", modelKey) || getTechnicalSpecs(vehicle.brand || "", vehicle.model || "") || null;
  });

  constructor() {
    effect(() => {
      const vehicle = this.car();
      if (!vehicle) return;
      const config = this.carService.getConfig()();
      this.seoService.updateSeoTags({ title: `${vehicle.brand || "Araç"} ${vehicle.model || ""} Kiralama | ${config.companyName}`, description: `${vehicle.brand || "Araç"} ${vehicle.model || ""} kiralama detayları, günlük fiyat, özellikler ve rezervasyon seçenekleri.`, image: vehicle.image || vehicle.images?.[0] || config.seoOgImage });
    });
  }

  previousMedia(): void { this.gallerySwiper?.nativeElement?.swiper?.slidePrev(); }
  nextMedia(): void { this.gallerySwiper?.nativeElement?.swiper?.slideNext(); }
  onSlideChange(event: any): void { this.currentSlide.set(Number(event?.detail?.[0]?.activeIndex || 0)); }

  reserve(vehicle: Car): void {
    if (vehicle.isAvailable === false) return;
    const days = this.rentalDays(this.presetStartDate, this.presetEndDate);
    this.carService.setBookingRequest({
      type: "RENTAL",
      item: vehicle,
      itemName: `${vehicle.brand || ""} ${vehicle.model || ""}`.trim(),
      image: vehicle.image || vehicle.images?.[0],
      basePrice: Number(vehicle.price || 0),
      totalPrice: days > 0 ? days * Number(vehicle.price || 0) : Number(vehicle.price || 0),
      startDate: days > 0 ? this.presetStartDate : undefined,
      endDate: days > 0 ? this.presetEndDate : undefined,
      days: days > 0 ? days : undefined,
      rentalDuration: "daily",
      withDriver: vehicle.driverOption === "WITH_DRIVER",
    });
    void this.router.navigate(["/contact"]);
  }

  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }

  async shareCar(vehicle: Car): Promise<void> {
    const payload = { title: `${vehicle.brand || ""} ${vehicle.model || ""} | Alperler Auto`.trim(), text: "Bu kiralık aracı inceleyin.", url: window.location.href };
    try { if (navigator.share) await navigator.share(payload); else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href); } catch { /* share cancelled */ }
  }

  whatsappInquiry(): void {
    const vehicle = this.car();
    if (!vehicle) return;
    const config = this.carService.getConfig()();
    const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const message = `Merhaba, ${vehicle.brand || ""} ${vehicle.model || ""} kiralık araç hakkında bilgi almak istiyorum. ${window.location.href}`.trim();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  phoneHref(): string { const phone = String(this.carService.getConfig()().phone || "").replace(/[^+\d]/g, ""); return phone ? `tel:${phone}` : "#"; }
  driverOptionLabel(value: Car["driverOption"]): string { if (value === "WITH_DRIVER") return "Şoförlü"; if (value === "BOTH") return "Şoförlü veya şoförsüz"; return "Şoförsüz"; }

  specRows(specs: any): { label: string; value: string }[] {
    const candidates = [["Motor hacmi", specs.engineVolume], ["Motor gücü", specs.enginePower], ["Tork", specs.torque], ["Çekiş", specs.drivetrain], ["Maksimum hız", specs.maxSpeed], ["0-100 km/s", specs.acceleration], ["Ortalama tüketim", specs.combinedFuel], ["Bagaj", specs.trunkCapacity], ["Depo", specs.tankCapacity], ["Ağırlık", specs.weight]];
    return candidates.filter((row) => Boolean(row[1]) && row[1] !== "Belirtilmemiş" && row[1] !== "-").map(([label, value]) => ({ label: String(label), value: String(value) }));
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/fleet"]); }

  private rentalDays(startValue: string, endValue: string): number {
    const start = this.parseLocalDate(startValue);
    const end = this.parseLocalDate(endValue);
    if (!start || !end) return 0;
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }

  private validQueryDate(value: string | null): string { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value) : ""; }
  private parseLocalDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return Number.isNaN(date.getTime()) ? null : date; }
}
