import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";

@Component({
  selector: "app-sale-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, TurkishCurrencyPipe],
  template: `
    <main class="detail-page">
      @if (vehicle(); as car) {
        <header class="detail-header">
          <div class="header-inner">
            <div class="header-left">
              <button type="button" class="icon-button" (click)="goBack()" aria-label="Satılık araçlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
              <div class="header-copy"><span>Satılık Araç</span><h1>{{ car.brand }} {{ car.model }}</h1></div>
            </div>
            <div class="header-actions">
              <button type="button" class="icon-button" (click)="share(car)" aria-label="İlanı paylaş"><mat-icon aria-hidden="true">share</mat-icon></button>
              <button type="button" class="icon-button" (click)="toggleFav(car.id)" [attr.aria-label]="isFav(car.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'"><mat-icon aria-hidden="true" [class.favorite-active]="isFav(car.id)">{{ isFav(car.id) ? 'favorite' : 'favorite_border' }}</mat-icon></button>
            </div>
          </div>
        </header>

        <section class="gallery" [attr.aria-label]="car.brand + ' ' + car.model + ' satılık araç görselleri'">
          @if (activeImage(); as image) {
            <div class="gallery-frame">
              <img [src]="image" [alt]="car.brand + ' ' + car.model + ' araç görseli'" loading="eager" decoding="async" (error)="imageFailed(image)" />
              <div class="gallery-toolbar">
                <span>{{ currentSlide() + 1 }} / {{ images().length }}</span>
                @if (images().length > 1) {
                  <div><button type="button" (click)="previousImage()" aria-label="Önceki görsel"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextImage()" aria-label="Sonraki görsel"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>
                }
              </div>
            </div>
          } @else {
            <div class="gallery-empty" role="status"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>Araç görseli yüklenemedi</strong><span>Medya kaydı veritabanında doğrulanıyor.</span></div>
          }
        </section>

        <div class="detail-layout">
          <div class="detail-main">
            <section class="panel summary-panel" aria-labelledby="sale-summary-title">
              <div class="summary-head">
                <div><p class="stock-code">{{ car.cloudStockCode || ('İlan No ' + car.id) }}</p><h2 id="sale-summary-title">{{ car.brand }} {{ car.model }}</h2><p class="summary-meta">{{ summaryMeta(car) }}</p></div>
                <div class="price-block"><span>Satış fiyatı</span><strong>{{ car.price | turkishCurrency }}</strong></div>
              </div>
              <dl class="facts" aria-label="Temel ilan bilgileri">
                <div><dt>Yıl</dt><dd>{{ display(car.year) }}</dd></div>
                <div><dt>Kilometre</dt><dd>{{ car.km ? ((car.km | number) + ' km') : 'Belirtilmedi' }}</dd></div>
                <div><dt>Yakıt</dt><dd>{{ display(car.fuel) }}</dd></div>
                <div><dt>Vites</dt><dd>{{ display(car.transmission) }}</dd></div>
                <div><dt>Renk</dt><dd>{{ display(car.color) }}</dd></div>
                <div><dt>Durum</dt><dd [class.available]="car.availability !== 'Satıldı'" [class.unavailable]="car.availability === 'Satıldı'">{{ car.availability === 'Satıldı' ? 'Satıldı' : 'Satışta' }}</dd></div>
              </dl>
            </section>

            <section class="panel accordion-panel">
              <button type="button" class="accordion-toggle" (click)="infoOpen.update(v => !v)" [attr.aria-expanded]="infoOpen()" aria-controls="sale-info"><span><strong>Tüm İlan Bilgileri</strong><small>Motor, gövde, çekiş, garanti ve konum</small></span><mat-icon aria-hidden="true">{{ infoOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
              @if (infoOpen()) {
                <dl id="sale-info" class="detail-list">
                  <div><dt>Marka</dt><dd>{{ display(car.brand) }}</dd></div><div><dt>Model</dt><dd>{{ display(car.model) }}</dd></div><div><dt>Seri</dt><dd>{{ display(car.series) }}</dd></div><div><dt>Kasa tipi</dt><dd>{{ display(car.type) }}</dd></div><div><dt>Motor hacmi</dt><dd>{{ display(car.engineVolume) }}</dd></div><div><dt>Motor gücü</dt><dd>{{ display(car.enginePower) }}</dd></div><div><dt>Çekiş</dt><dd>{{ display(car.drivetrain) }}</dd></div><div><dt>Garanti</dt><dd>{{ display(car.warranty) }}</dd></div><div><dt>Konum</dt><dd>{{ display(car.location) }}</dd></div>
                </dl>
              }
            </section>

            @if (allFeatures().length) {
              <section class="panel accordion-panel">
                <button type="button" class="accordion-toggle" (click)="featuresOpen.update(v => !v)" [attr.aria-expanded]="featuresOpen()" aria-controls="sale-features"><span><strong>Donanım ve Özellikler</strong><small>{{ allFeatures().length }} kayıtlı özellik</small></span><mat-icon aria-hidden="true">{{ featuresOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
                @if (featuresOpen()) {<ul id="sale-features" class="feature-list">@for (feature of allFeatures(); track feature) {<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ feature }}</span></li>}</ul>}
              </section>
            }

            <section class="panel accordion-panel">
              <button type="button" class="accordion-toggle" (click)="expertOpen.update(v => !v)" [attr.aria-expanded]="expertOpen()" aria-controls="sale-expertise"><span><strong>Ekspertiz ve Araç Durumu</strong><small>Hasar, tramer ve kayıtlı kontrol bilgileri</small></span><mat-icon aria-hidden="true">{{ expertOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
              @if (expertOpen()) {
                <dl id="sale-expertise" class="detail-list"><div><dt>Hasar durumu</dt><dd>{{ display(car.damageStatus) }}</dd></div><div><dt>Tramer</dt><dd>{{ display(car.tramer) }}</dd></div><div><dt>Ekspertiz notu</dt><dd>{{ display(car.expertReport) }}</dd></div><div><dt>Boyasız</dt><dd>{{ car.isPaintless === true ? 'Evet' : car.isPaintless === false ? 'Hayır' : 'Belirtilmedi' }}</dd></div><div><dt>Değişensiz</dt><dd>{{ car.isReplaceFree === true ? 'Evet' : car.isReplaceFree === false ? 'Hayır' : 'Belirtilmedi' }}</dd></div></dl>
              }
            </section>

            @if (car.description) {
              <section class="panel accordion-panel"><button type="button" class="accordion-toggle" (click)="descriptionOpen.update(v => !v)" [attr.aria-expanded]="descriptionOpen()" aria-controls="sale-description"><span><strong>Açıklama</strong><small>İlanın detaylı açıklaması</small></span><mat-icon aria-hidden="true">{{ descriptionOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (descriptionOpen()) {<p id="sale-description" class="description">{{ car.description }}</p>}</section>
            }
          </div>

          <aside class="action-panel" aria-labelledby="sale-action-title"><p>Satın Alma</p><h2 id="sale-action-title">Bu araçla ilgileniyorum</h2><span>Talebinizi bırakın. Araç uygunluğu ve satış süreci doğrulandıktan sonra ekip sizinle iletişime geçsin.</span><div class="action-price"><small>İlan fiyatı</small><strong>{{ car.price | turkishCurrency }}</strong></div><button type="button" class="primary-action" (click)="inquire(car)" [disabled]="car.availability === 'Satıldı'">Talep Oluştur</button><button type="button" class="whatsapp-action" (click)="whatsapp()">WhatsApp ile Sor</button></aside>
        </div>

        <nav class="mobile-actions" aria-label="Satılık araç hızlı işlemleri">@if (phoneHref()) {<a [href]="phoneHref()">Ara</a>} @else {<button type="button" disabled>Ara</button>}<button type="button" class="whatsapp" (click)="whatsapp()">WhatsApp</button><button type="button" class="request" (click)="inquire(car)" [disabled]="car.availability === 'Satıldı'">Talep Oluştur</button></nav>
      } @else if (loading()) {
        <section class="state-panel" role="status"><div class="spinner"></div><strong>Satılık araç veritabanından yükleniyor</strong></section>
      } @else {
        <section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>İlan yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#f4f7fb;color:#0f172a}.detail-page{min-height:100dvh;padding-bottom:92px;background:#f4f7fb;font-family:Inter,system-ui,sans-serif}.detail-header{position:relative;z-index:20;border-bottom:1px solid #dbe3ee;background:#fff}.header-inner{width:min(100% - 24px,1180px);min-height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.header-copy{min-width:0}.header-copy span{display:block;color:#2563eb;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.header-copy h1{margin:2px 0 0;font:900 20px/1.15 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:transparent;color:#0f172a}.icon-button:focus-visible,.accordion-toggle:focus-visible,.primary-action:focus-visible,.whatsapp-action:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.favorite-active{color:#e11d48}.gallery{background:#071020}.gallery-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:4/3;overflow:hidden;background:#020617}.gallery-frame img{display:block;width:100%;height:100%;object-fit:cover}.gallery-toolbar{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.gallery-toolbar>span{border-radius:999px;background:rgba(0,0,0,.74);padding:7px 12px;color:#fff;font-size:12px;font-weight:900}.gallery-toolbar>div{display:flex;gap:8px;pointer-events:auto}.gallery-toolbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.74);color:#fff}.gallery-empty{width:min(100%,1180px);margin:auto;aspect-ratio:4/3;display:grid;place-content:center;gap:8px;text-align:center;background:#0f172a;color:#cbd5e1;padding:24px}.detail-layout{width:min(100% - 24px,1180px);margin:auto;padding:22px 0;display:grid;gap:18px}.detail-main{display:grid;gap:14px}.panel,.action-panel{border:1px solid #dbe3ee;border-radius:20px;background:#fff;padding:18px;box-shadow:0 14px 34px rgba(15,23,42,.07)}.summary-head{display:flex;flex-direction:column;gap:16px}.stock-code{margin:0;color:#b45309;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.summary-head h2,.action-panel h2{margin:5px 0 0;font:900 clamp(30px,8vw,46px)/1.08 Georgia,serif}.summary-meta{margin:8px 0 0;color:#64748b;font-size:13px}.price-block span,.action-price small{color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}.price-block strong,.action-price strong{display:block;margin-top:4px;color:#0f172a!important;font-size:30px!important}.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 0}.facts>div{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:14px}.facts dt{color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}.facts dd{margin:7px 0 0;color:#0f172a;font-size:15px;font-weight:900}.facts dd.available{color:#047857}.facts dd.unavailable{color:#be123c}.accordion-panel{padding:0;overflow:hidden}.accordion-toggle{display:flex;width:100%;min-height:72px;align-items:center;justify-content:space-between;gap:12px;border:0;background:#fff;padding:16px 18px;text-align:left;color:#0f172a}.accordion-toggle strong{display:block;font-size:17px}.accordion-toggle small{display:block;margin-top:4px;color:#64748b}.detail-list{margin:0;padding:0 18px 16px}.detail-list>div{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #eef2f7;padding:12px 0}.detail-list dt{color:#64748b}.detail-list dd{margin:0;font-weight:850;text-align:right}.feature-list{list-style:none;margin:0;padding:0 18px 16px;display:grid;gap:8px}.feature-list li{display:flex;align-items:flex-start;gap:8px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:11px}.feature-list mat-icon{width:20px;height:20px;font-size:20px;color:#059669}.description{margin:0;padding:0 18px 18px;white-space:pre-line;color:#475569;line-height:1.7}.action-panel>p{margin:0;color:#2563eb;font-size:12px;font-weight:950;text-transform:uppercase}.action-panel>span{display:block;margin-top:8px;color:#64748b;line-height:1.6}.action-price{margin-top:16px;border-radius:14px;background:#f1f5f9;padding:14px}.primary-action,.whatsapp-action{width:100%;min-height:52px;margin-top:10px;border:0;border-radius:13px;font-weight:950}.primary-action{background:#0f172a;color:#fff}.whatsapp-action{background:#059669;color:#fff}.primary-action:disabled{opacity:.45}.mobile-actions{position:fixed;z-index:80;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:8px;border-top:1px solid #dbe3ee;background:#fff;padding:10px max(12px,env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-right))}.mobile-actions a,.mobile-actions button{display:flex;min-height:52px;align-items:center;justify-content:center;border:0;border-radius:13px;text-decoration:none;font-weight:950}.mobile-actions a,.mobile-actions>button:first-of-type{background:#e2e8f0;color:#0f172a}.mobile-actions .whatsapp{background:#059669;color:#fff}.mobile-actions .request{background:#d4af37;color:#fff}.state-panel{min-height:68vh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state-panel button{min-height:46px;border:0;border-radius:12px;background:#0f172a;color:#fff;font-weight:900;padding:0 18px}.spinner{width:40px;height:40px;margin:auto;border:4px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.gallery-frame,.gallery-empty{aspect-ratio:16/9}.summary-head{flex-direction:row;align-items:end;justify-content:space-between}.price-block{text-align:right}.feature-list{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.detail-page{padding-bottom:24px}.gallery-frame,.gallery-empty{aspect-ratio:21/9}.detail-layout{grid-template-columns:minmax(0,1fr) 360px;align-items:start}.action-panel{position:sticky;top:24px}.mobile-actions{display:none}}
  `],
})
export class SaleCarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly carService = inject(CarService);
  private readonly seo = inject(SeoService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";

  readonly vehicle = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly infoOpen = signal(false);
  readonly featuresOpen = signal(false);
  readonly expertOpen = signal(false);
  readonly descriptionOpen = signal(false);
  private readonly failedImages = signal<string[]>([]);

  readonly images = computed(() => {
    const car = this.vehicle(); if (!car) return [];
    const failed = new Set(this.failedImages());
    return this.detailData.mediaUrls(car).filter((url) => !failed.has(url));
  });
  readonly activeImage = computed(() => { const list = this.images(); return list.length ? list[Math.min(this.currentSlide(), list.length - 1)] : ""; });
  readonly allFeatures = computed(() => {
    const car = this.vehicle(); if (!car) return [];
    const detailed = car.detailedFeatures ? [...(car.detailedFeatures.interior || []), ...(car.detailedFeatures.exterior || []), ...(car.detailedFeatures.multimedia || []), ...(car.detailedFeatures.safety || [])] : [];
    return [...new Set([...(car.features || []), ...detailed].map((value) => String(value || "").trim()).filter(Boolean))];
  });

  async ngOnInit(): Promise<void> { await this.reload(); }
  async reload(): Promise<void> {
    this.loading.set(true); this.loadError.set("");
    try {
      const car = await this.detailData.load("SALE", this.routeId) as Car;
      this.vehicle.set(car); this.failedImages.set([]); this.currentSlide.set(0);
      const config = this.carService.getConfig()();
      this.seo.updateSeoTags({ title: `${car.brand || "Araç"} ${car.model || ""} Satılık | ${config.companyName}`, description: `${car.brand || "Araç"} ${car.model || ""} satılık araç fiyatı, kilometresi, ekspertiz ve donanım bilgileri.`, image: car.image || config.seoOgImage });
    } catch (error) { this.vehicle.set(null); this.loadError.set(error instanceof Error ? error.message : "İlan verisi alınamadı."); }
    finally { this.loading.set(false); }
  }

  display(value: unknown): string { return this.detailData.display(value); }
  summaryMeta(car: Car): string { return [car.year, car.type, car.location].filter(Boolean).join(" · ") || "Alperler Auto satılık araç"; }
  previousImage(): void { const length = this.images().length; if (length > 1) this.currentSlide.update((i) => (i - 1 + length) % length); }
  nextImage(): void { const length = this.images().length; if (length > 1) this.currentSlide.update((i) => (i + 1) % length); }
  imageFailed(url: string): void { this.failedImages.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }
  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }

  inquire(car: Car): void {
    if (car.availability === "Satıldı") return;
    this.carService.setBookingRequest({ type: "SALE_INQUIRY", item: car, itemName: `${car.brand || ""} ${car.model || ""}`.trim(), image: car.image || car.images?.[0], basePrice: Number(car.price || 0) });
    void this.router.navigate(["/contact"]);
  }

  async share(car: Car): Promise<void> { const payload = { title: `${car.brand || ""} ${car.model || ""} | Alperler Auto`.trim(), text: "Bu satılık araç ilanını inceleyin.", url: window.location.href }; try { if (navigator.share) await navigator.share(payload); else await navigator.clipboard?.writeText(window.location.href); } catch { /* cancelled */ } }
  whatsapp(): void { const car = this.vehicle(); if (!car) return; const config = this.carService.getConfig()(); const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, ""); if (!phone) return; const message = `Merhaba, ${car.brand || ""} ${car.model || ""} satılık araç ilanı hakkında bilgi almak istiyorum. ${window.location.href}`.trim(); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }
  phoneHref(): string { const phone = String(this.carService.getConfig()().phone || "").replace(/[^+\d]/g, ""); return phone ? `tel:${phone}` : ""; }
  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/sales"]); }
}
