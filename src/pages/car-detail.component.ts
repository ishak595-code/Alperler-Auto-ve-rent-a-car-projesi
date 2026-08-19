import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { CatalogService } from "../services/catalog.service";
import { SeoService } from "../services/seo.service";
import { getTechnicalSpecs } from "../data/technical-specs.data";

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
  template: `
    <main class="detail-page">
      @if (vehicle(); as car) {
        <header class="detail-header">
          <div class="detail-header-inner">
            <div class="header-left">
              <button type="button" class="icon-button" (click)="goBack()" aria-label="Geri">
                <mat-icon aria-hidden="true">arrow_back</mat-icon>
              </button>
              <div class="header-copy">
                <span>Kiralık Araç</span>
                <h1>{{ car.brand }} {{ car.model }}</h1>
              </div>
            </div>
            <div class="header-actions">
              <button type="button" class="icon-button" (click)="shareCar(car)" aria-label="Paylaş"><mat-icon aria-hidden="true">share</mat-icon></button>
              <button type="button" class="icon-button" (click)="toggleFav(car.id)" [attr.aria-label]="isFav(car.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'">
                <mat-icon aria-hidden="true" [class.favorite-active]="isFav(car.id)">{{ isFav(car.id) ? 'favorite' : 'favorite_border' }}</mat-icon>
              </button>
            </div>
          </div>
        </header>

        <section class="gallery" [attr.aria-label]="car.brand + ' ' + car.model + ' araç görselleri'">
          @if (activeMedia(); as item) {
            <div class="gallery-frame">
              @if (item.type === 'image') {
                <img [src]="item.url" [alt]="car.brand + ' ' + car.model + ' araç görseli'" loading="eager" decoding="async" (error)="onMediaError(item.url)" />
              } @else {
                <video controls playsinline preload="metadata" [poster]="item.posterUrl || ''" [attr.aria-label]="item.title || (car.brand + ' ' + car.model + ' araç videosu')"><source [src]="item.url" /></video>
              }
              <div class="gallery-toolbar">
                <span>{{ currentSlide() + 1 }} / {{ media().length }}</span>
                @if (media().length > 1) {
                  <div>
                    <button type="button" (click)="previousMedia()" aria-label="Önceki görsel"><mat-icon aria-hidden="true">chevron_left</mat-icon></button>
                    <button type="button" (click)="nextMedia()" aria-label="Sonraki görsel"><mat-icon aria-hidden="true">chevron_right</mat-icon></button>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="gallery-empty" role="status"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>Araç görseli yüklenemedi</strong><span>Medya kaydı yenileniyor veya dosya geçici olarak erişilemiyor.</span></div>
          }
        </section>

        <div class="detail-layout">
          <div class="detail-main">
            <section class="panel summary-panel" aria-labelledby="vehicle-summary-title">
              <div class="summary-head">
                <div>
                  <p class="stock-code">{{ car.cloudStockCode || ('Araç No ' + car.id) }}</p>
                  <h2 id="vehicle-summary-title">{{ car.brand }} {{ car.model }}</h2>
                  <p class="summary-meta">{{ summaryMeta(car) }}</p>
                </div>
                <div class="price-block">
                  <span>Günlük kiralama</span>
                  <strong>{{ car.price | turkishCurrency }}</strong>
                </div>
              </div>

              <dl class="facts" aria-label="Temel araç bilgileri">
                <div><dt>Vites</dt><dd>{{ displayValue(car.transmission) }}</dd></div>
                <div><dt>Yakıt</dt><dd>{{ displayValue(car.fuel) }}</dd></div>
                <div><dt>Koltuk</dt><dd>{{ car.seats ? (car.seats + ' kişi') : 'Belirtilmedi' }}</dd></div>
                <div><dt>Durum</dt><dd [class.available]="car.isAvailable !== false" [class.unavailable]="car.isAvailable === false">{{ car.isAvailable === false ? 'Müsait değil' : 'Müsait' }}</dd></div>
              </dl>
            </section>

            <section class="panel" aria-labelledby="vehicle-details-title">
              <h2 id="vehicle-details-title">Araç Bilgileri</h2>
              <dl class="detail-list">
                <div><dt>Gövde tipi</dt><dd>{{ displayValue(car.type) }}</dd></div>
                <div><dt>Konum</dt><dd>{{ displayValue(car.location) }}</dd></div>
                <div><dt>Sürücü seçeneği</dt><dd>{{ driverOptionLabel(car.driverOption) }}</dd></div>
                @if (car.dailyMileageLimit) { <div><dt>Günlük kilometre</dt><dd>{{ car.dailyMileageLimit }} km</dd></div> }
                @if (car.deposit !== undefined) { <div><dt>Depozito</dt><dd>{{ car.deposit | turkishCurrency }}</dd></div> }
                @if (car.minAge) { <div><dt>Minimum yaş</dt><dd>{{ car.minAge }}</dd></div> }
                @if (car.minLicenseYears) { <div><dt>Minimum ehliyet</dt><dd>{{ car.minLicenseYears }} yıl</dd></div> }
              </dl>
            </section>

            @if (car.description) {
              <section class="panel" aria-labelledby="description-title"><h2 id="description-title">Açıklama</h2><p class="description">{{ car.description }}</p></section>
            }

            @if (car.features?.length) {
              <section class="panel" aria-labelledby="features-title">
                <h2 id="features-title">Araç Özellikleri</h2>
                <ul class="feature-list">@for (feature of car.features; track feature) { <li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ feature }}</span></li> }</ul>
              </section>
            }

            @if (technicalSpecs(); as specs) {
              <section class="panel" aria-labelledby="tech-title">
                <button type="button" class="tech-toggle" (click)="techOpen.update(v => !v)" [attr.aria-expanded]="techOpen()" aria-controls="rental-tech-specs">
                  <span><strong id="tech-title">Teknik Özellikler</strong><small>Motor, performans ve ölçüler</small></span><mat-icon aria-hidden="true">{{ techOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
                @if (techOpen()) { <dl id="rental-tech-specs" class="tech-grid">@for (row of specRows(specs); track row.label) { <div><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div> }</dl> }
              </section>
            }
          </div>

          <aside class="reservation-panel" aria-labelledby="reservation-title">
            <p>Rezervasyon</p>
            <h2 id="reservation-title">Bu aracı rezerve edin</h2>
            <span>Tarih, teslim ve iade noktası, şoför tercihi ve ek hizmetleri rezervasyon ekranında seçin.</span>
            <div class="reservation-price"><small>Günlük başlangıç fiyatı</small><strong>{{ car.price | turkishCurrency }}</strong></div>
            <button type="button" class="primary-action" (click)="reserve(car)" [disabled]="car.isAvailable === false" aria-label="Bu araç için rezervasyon oluştur">Rezervasyon Oluştur</button>
            <button type="button" class="whatsapp-action" (click)="whatsappInquiry()" aria-label="Bu araç hakkında WhatsApp ile bilgi al">WhatsApp ile Sor</button>
          </aside>
        </div>

        <nav class="mobile-actions" aria-label="Araç hızlı işlemleri">
          @if (phoneHref()) { <a [href]="phoneHref()" aria-label="Telefonla ara">Ara</a> } @else { <button type="button" disabled aria-label="Telefon numarası henüz tanımlı değil">Ara</button> }
          <button type="button" class="whatsapp" (click)="whatsappInquiry()" aria-label="WhatsApp ile bilgi al">WhatsApp</button>
          <button type="button" class="reserve" (click)="reserve(car)" [disabled]="car.isAvailable === false" aria-label="Bu araç için rezervasyon oluştur">Rezerve Et</button>
        </nav>
      } @else if (loading()) {
        <section class="state-panel" role="status"><div class="spinner"></div><strong>Araç bilgileri veritabanından yükleniyor</strong></section>
      } @else {
        <section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Araç kaydı yüklenemedi</strong><span>{{ loadError() || 'Lütfen sayfayı yenileyin.' }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#050914;color:#f8fafc}.detail-page{min-height:100vh;padding-bottom:92px;background:#050914;color:#f8fafc;font-family:Inter,system-ui,sans-serif}.detail-header{position:relative;z-index:20;border-bottom:1px solid #1e293b;background:#071020}.detail-header-inner{width:min(100% - 24px,1180px);min-height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.header-copy{min-width:0}.header-copy span{display:block;color:#93c5fd;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.header-copy h1{margin:2px 0 0;color:#fff;font:900 20px/1.15 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:transparent;color:#fff}.icon-button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.favorite-active{color:#fb7185}.gallery{background:#000}.gallery-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:4/3;background:#020617;overflow:hidden}.gallery-frame img,.gallery-frame video{display:block;width:100%;height:100%;object-fit:cover}.gallery-toolbar{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.gallery-toolbar>span{border-radius:999px;background:rgba(0,0,0,.72);padding:7px 12px;color:#fff;font-size:12px;font-weight:900}.gallery-toolbar>div{display:flex;gap:8px;pointer-events:auto}.gallery-toolbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff}.gallery-empty{width:min(100%,1180px);margin:auto;aspect-ratio:4/3;display:grid;place-content:center;gap:8px;text-align:center;background:#0f172a;color:#cbd5e1;padding:24px}.gallery-empty mat-icon{margin:auto;width:48px;height:48px;font-size:48px}.gallery-empty strong{color:#fff;font-size:16px}.gallery-empty span{max-width:420px;font-size:13px;line-height:1.5}.detail-layout{width:min(100% - 24px,1180px);margin:0 auto;padding:22px 0;display:grid;gap:18px}.detail-main{display:grid;gap:18px}.panel,.reservation-panel{border:1px solid #253149;border-radius:20px;background:#0b1220;padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.18)}.panel h2,.reservation-panel h2{margin:0;color:#fff;font:900 24px/1.12 Georgia,serif}.summary-head{display:flex;flex-direction:column;gap:16px}.stock-code{margin:0;color:#fbbf24;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.summary-head h2{margin:5px 0 0;font-size:clamp(30px,8vw,46px)}.summary-meta{margin:8px 0 0;color:#cbd5e1;font-size:13px}.price-block{display:flex;flex-direction:column;gap:4px}.price-block span{color:#94a3b8;font-size:12px;font-weight:900;text-transform:uppercase}.price-block strong{display:block;color:#93c5fd!important;font-size:30px!important;line-height:1.1!important}.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 0}.facts>div{min-width:0;border:1px solid #27344f;border-radius:14px;background:#050b18;padding:14px}.facts dt{color:#94a3b8;font-size:12px;font-weight:900;text-transform:uppercase}.facts dd{display:block!important;margin:7px 0 0!important;color:#fff!important;font-size:16px!important;font-weight:900!important;line-height:1.25!important;min-height:20px}.facts dd.available{color:#86efac!important}.facts dd.unavailable{color:#fda4af!important}.detail-list{margin:12px 0 0}.detail-list>div{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #1e293b;padding:12px 0}.detail-list>div:first-child{border-top:0}.detail-list dt{color:#94a3b8}.detail-list dd{margin:0;color:#fff;font-weight:850;text-align:right}.description{margin:12px 0 0;white-space:pre-line;color:#cbd5e1;font-size:14px;line-height:1.75}.feature-list{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px}.feature-list li{display:flex;align-items:flex-start;gap:8px;border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px;color:#e2e8f0}.feature-list mat-icon{width:20px;height:20px;font-size:20px;color:#34d399}.tech-toggle{display:flex;width:100%;min-height:52px;align-items:center;justify-content:space-between;gap:12px;border:0;background:transparent;color:#fff;text-align:left}.tech-toggle strong{display:block;color:#fff;font-size:18px}.tech-toggle small{display:block;margin-top:3px;color:#94a3b8}.tech-grid{display:grid;gap:8px;margin:12px 0 0}.tech-grid>div{border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.tech-grid dt{color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase}.tech-grid dd{margin:4px 0 0;color:#fff;font-weight:900}.reservation-panel>p{margin:0;color:#93c5fd;font-size:12px;font-weight:950;text-transform:uppercase}.reservation-panel>span{display:block;margin-top:8px;color:#cbd5e1;font-size:14px;line-height:1.6}.reservation-price{margin-top:16px;border-radius:14px;background:#050b18;padding:14px}.reservation-price small{display:block;color:#93c5fd;font-size:11px;font-weight:900;text-transform:uppercase}.reservation-price strong{display:block;margin-top:4px;color:#fff!important;font-size:30px!important}.primary-action,.whatsapp-action{width:100%;min-height:52px;margin-top:10px;border:0;border-radius:13px;font-weight:950}.primary-action{background:#2563eb;color:#fff}.whatsapp-action{background:#064e3b;color:#d1fae5;border:1px solid #047857}.primary-action:disabled{background:#334155;color:#94a3b8}.mobile-actions{position:fixed;z-index:80;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;border-top:1px solid #334155;background:#050914;padding:10px max(12px,env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-right))}.mobile-actions a,.mobile-actions button{display:flex;min-width:0;min-height:52px;align-items:center;justify-content:center;border:0;border-radius:13px;padding:0 6px;text-decoration:none;font-size:14px;font-weight:950;white-space:nowrap}.mobile-actions a,.mobile-actions button:first-child{background:#e2e8f0;color:#0f172a}.mobile-actions .whatsapp{background:#059669;color:#fff}.mobile-actions .reserve{background:#d4af37;color:#fff}.mobile-actions button:disabled{opacity:.45}.state-panel{min-height:68vh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px;background:#050914;color:#cbd5e1}.state-panel strong{color:#fff}.state-panel.error mat-icon{margin:auto;color:#fda4af}.state-panel button{min-height:46px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;padding:0 18px}.spinner{width:40px;height:40px;margin:auto;border:4px solid #334155;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.gallery-frame,.gallery-empty{aspect-ratio:16/9}.summary-head{flex-direction:row;align-items:end;justify-content:space-between}.price-block{text-align:right}.tech-grid{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.detail-page{padding-bottom:24px}.gallery-frame,.gallery-empty{aspect-ratio:21/9}.detail-layout{grid-template-columns:minmax(0,1fr) 360px;align-items:start}.reservation-panel{position:sticky;top:24px}.mobile-actions{display:none}}
  `],
})
export class CarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly catalog = inject(CatalogService);
  readonly carService = inject(CarService);
  private readonly seoService = inject(SeoService);

  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  private readonly presetStartDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("start"));
  private readonly presetEndDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("end"));
  readonly vehicle = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly techOpen = signal(false);
  private readonly failedMediaUrls = signal<string[]>([]);

  readonly media = computed<GalleryMedia[]>(() => {
    const car = this.vehicle();
    if (!car) return [];
    const failed = new Set(this.failedMediaUrls());
    const seen = new Set<string>();
    const items: GalleryMedia[] = [];
    for (const url of [car.image, ...(car.images || []), ...(car.gallery || [])]) {
      const clean = this.toMediaUrl(url);
      if (!clean || failed.has(clean) || seen.has(clean)) continue;
      seen.add(clean);
      items.push({ type: "image", url: clean });
    }
    for (const video of car.videos || []) {
      const clean = this.toMediaUrl(video?.url);
      if (!clean || failed.has(clean) || seen.has(clean)) continue;
      seen.add(clean);
      items.push({ type: "video", url: clean, posterUrl: this.toMediaUrl(video.posterUrl), title: video.title });
    }
    return items.slice(0, 30);
  });

  readonly activeMedia = computed(() => {
    const items = this.media();
    if (!items.length) return null;
    return items[Math.min(Math.max(0, this.currentSlide()), items.length - 1)] || items[0];
  });

  readonly technicalSpecs = computed(() => {
    const car = this.vehicle();
    if (!car) return null;
    const modelKey = car.series ? `${car.series} ${car.model || ""}`.trim() : car.model || "";
    return getTechnicalSpecs(car.brand || "", modelKey) || getTechnicalSpecs(car.brand || "", car.model || "") || null;
  });

  constructor() {
    effect(() => {
      const car = this.vehicle();
      if (!car) return;
      const config = this.carService.getConfig()();
      this.seoService.updateSeoTags({ title: `${car.brand || "Araç"} ${car.model || ""} Kiralama | ${config.companyName}`, description: `${car.brand || "Araç"} ${car.model || ""} kiralama detayları, günlük fiyat, özellikler ve rezervasyon seçenekleri.`, image: this.toMediaUrl(car.image || car.images?.[0]) || config.seoOgImage });
    });
  }

  async ngOnInit(): Promise<void> {
    const shared = this.findVehicle(this.carService.getAllVehicles()());
    if (shared) this.vehicle.set(this.prepareVehicle(shared as Car));
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set("");
    try {
      const records = await this.catalog.loadVehicles(true);
      const match = this.findVehicle(records);
      if (!match) throw new Error("Bu kiralık araç veritabanında bulunamadı.");
      this.vehicle.set(this.prepareVehicle(match as Car));
      this.failedMediaUrls.set([]);
      this.currentSlide.set(0);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : "Araç verisi alınamadı.");
      if (!this.vehicle()) this.vehicle.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private findVehicle(records: Car[]): Car | undefined {
    return records.find((item) => item.category === "RENTAL" && (String(item.id) === this.routeId || String(item.cloudId || "") === this.routeId || String(item.cloudStockCode || "") === this.routeId));
  }

  private prepareVehicle(car: Car): Car {
    const images = (car.images || []).map((url) => this.toMediaUrl(url)).filter(Boolean);
    const gallery = (car.gallery || []).map((url) => this.toMediaUrl(url)).filter(Boolean);
    return {
      ...car,
      price: Number(car.price || 0),
      image: this.toMediaUrl(car.image || images[0]),
      images,
      gallery,
      transmission: car.transmission || "Belirtilmedi",
      fuel: car.fuel || "Belirtilmedi",
      seats: Number(car.seats || 0) || undefined,
      isAvailable: car.isAvailable !== false,
    };
  }

  private toMediaUrl(value?: string): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const prefix = "https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/";
    if (raw.startsWith(prefix)) return `/catalog-media/${raw.slice(prefix.length)}`;
    return raw;
  }

  summaryMeta(car: Car): string {
    return [car.year, car.type, car.location].filter(Boolean).join(" · ") || "Alperler Auto kiralık araç";
  }

  displayValue(value: unknown): string {
    const text = String(value ?? "").trim();
    return text || "Belirtilmedi";
  }

  previousMedia(): void { const length = this.media().length; if (length > 1) this.currentSlide.update((index) => (index - 1 + length) % length); }
  nextMedia(): void { const length = this.media().length; if (length > 1) this.currentSlide.update((index) => (index + 1) % length); }
  onMediaError(url: string): void { this.failedMediaUrls.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }

  reserve(car: Car): void {
    if (car.isAvailable === false) return;
    const days = this.rentalDays(this.presetStartDate, this.presetEndDate);
    this.carService.setBookingRequest({ type: "RENTAL", item: car, itemName: `${car.brand || ""} ${car.model || ""}`.trim(), image: car.image || car.images?.[0], basePrice: Number(car.price || 0), totalPrice: days > 0 ? days * Number(car.price || 0) : Number(car.price || 0), startDate: days > 0 ? this.presetStartDate : undefined, endDate: days > 0 ? this.presetEndDate : undefined, days: days > 0 ? days : undefined, rentalDuration: "daily", withDriver: car.driverOption === "WITH_DRIVER" });
    void this.router.navigate(["/contact"]);
  }

  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }

  async shareCar(car: Car): Promise<void> {
    const payload = { title: `${car.brand || ""} ${car.model || ""} | Alperler Auto`.trim(), text: "Bu kiralık aracı inceleyin.", url: window.location.href };
    try { if (navigator.share) await navigator.share(payload); else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href); } catch { /* paylaşım iptal edildi */ }
  }

  whatsappInquiry(): void {
    const car = this.vehicle();
    if (!car) return;
    const config = this.carService.getConfig()();
    const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const message = `Merhaba, ${car.brand || ""} ${car.model || ""} kiralık araç hakkında bilgi almak istiyorum. ${window.location.href}`.trim();
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  phoneHref(): string { const phone = String(this.carService.getConfig()().phone || "").replace(/[^+\d]/g, ""); return phone ? `tel:${phone}` : ""; }
  driverOptionLabel(value: Car["driverOption"]): string { if (value === "WITH_DRIVER") return "Şoförlü"; if (value === "BOTH") return "Şoförlü veya şoförsüz"; return "Şoförsüz"; }

  specRows(specs: any): { label: string; value: string }[] {
    const candidates = [["Motor hacmi", specs.engineVolume], ["Motor gücü", specs.enginePower], ["Tork", specs.torque], ["Çekiş", specs.drivetrain], ["Maksimum hız", specs.maxSpeed], ["0-100 km/s", specs.acceleration], ["Ortalama tüketim", specs.combinedFuel], ["Bagaj", specs.trunkCapacity], ["Depo", specs.tankCapacity], ["Ağırlık", specs.weight]];
    return candidates.filter((row) => Boolean(row[1]) && row[1] !== "Belirtilmemiş" && row[1] !== "-").map(([label, value]) => ({ label: String(label), value: String(value) }));
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/fleet"]); }
  private rentalDays(startValue: string, endValue: string): number { const start = this.parseLocalDate(startValue); const end = this.parseLocalDate(endValue); if (!start || !end) return 0; return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)); }
  private validQueryDate(value: string | null): string { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value) : ""; }
  private parseLocalDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return Number.isNaN(date.getTime()) ? null : date; }
}
