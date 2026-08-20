import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, effect, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { getTechnicalSpecs } from "../data/technical-specs.data";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { CarService } from "../services/car.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";

interface GalleryMedia { type: "image" | "video"; url: string; posterUrl?: string; title?: string; }

@Component({
  selector: "app-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, TurkishCurrencyPipe],
  template: `
    <main class="detail-page">
      @if (vehicle(); as car) {
        <header class="detail-header"><div class="header-inner"><div class="header-left"><button type="button" class="icon-button" (click)="goBack()" aria-label="Kiralık araçlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div class="header-copy"><span>Kiralık Araç</span><h1>{{ car.brand }} {{ car.model }}</h1></div></div><div class="header-actions"><button type="button" class="icon-button" (click)="share(car)" aria-label="Aracı paylaş"><mat-icon aria-hidden="true">share</mat-icon></button><button type="button" class="icon-button" (click)="toggleFav(car.id)" [attr.aria-label]="isFav(car.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'"><mat-icon aria-hidden="true" [class.favorite-active]="isFav(car.id)">{{ isFav(car.id) ? 'favorite' : 'favorite_border' }}</mat-icon></button></div></div></header>

        <section class="gallery" [attr.aria-label]="car.brand + ' ' + car.model + ' araç medyası'">
          @if (activeMedia(); as mediaItem) {
            <div class="gallery-frame">
              @if (mediaItem.type === 'image') {<img [src]="mediaItem.url" [alt]="car.brand + ' ' + car.model + ' araç görseli'" loading="eager" decoding="async" (error)="mediaFailed(mediaItem.url)" />}
              @else {<video controls playsinline preload="metadata" [poster]="mediaItem.posterUrl || ''" [attr.aria-label]="mediaItem.title || (car.brand + ' ' + car.model + ' araç videosu')"><source [src]="mediaItem.url" /></video>}
              <div class="gallery-toolbar"><span>{{ currentSlide() + 1 }} / {{ media().length }}</span>@if (media().length > 1) {<div><button type="button" (click)="previousMedia()" aria-label="Önceki görsel"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextMedia()" aria-label="Sonraki görsel"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div>
            </div>
          } @else {<div class="gallery-empty" role="status"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>Araç görseli yüklenemedi</strong></div>}
        </section>

        @if (activeCampaign(); as offer) {
          <section class="campaign-strip" aria-label="Bu araca ait aktif kampanya">
            <div><span class="campaign-kicker">KAMPANYA</span><h2>{{ offer.title }}</h2>@if (offer.shortDescription) {<p>{{ offer.shortDescription }}</p>}</div>
            <div class="campaign-value">@if (offer.endsAt) {<span><mat-icon aria-hidden="true">schedule</mat-icon>{{ campaignCountdown(offer.endsAt) }}</span>}@if (offer.oldPrice && offer.newPrice && offer.oldPrice > offer.newPrice) {<small>{{ offer.oldPrice | turkishCurrency }}</small><strong>{{ offer.newPrice | turkishCurrency }}</strong>} @else if (offer.discountPercent) {<strong>%{{ offer.discountPercent }} avantaj</strong>}</div>
          </section>
        }

        <div class="detail-layout">
          <div class="detail-main">
            <section class="panel summary-panel" aria-labelledby="rental-summary-title">
              <div class="summary-head"><div><p class="stock-code">{{ car.cloudStockCode || ('Araç No ' + car.id) }}</p><h2 id="rental-summary-title">{{ car.brand }} {{ car.model }}</h2><p class="summary-meta">{{ summaryMeta(car) }}</p></div><div class="price-block"><span>Günlük kiralama</span><strong>{{ car.price | turkishCurrency }}</strong></div></div>
              <dl class="facts" aria-label="Temel araç bilgileri"><div><dt>Vites</dt><dd>{{ display(car.transmission) }}</dd></div><div><dt>Yakıt</dt><dd>{{ display(car.fuel) }}</dd></div><div><dt>Koltuk</dt><dd>{{ car.seats ? car.seats + ' kişi' : 'Belirtilmedi' }}</dd></div><div><dt>Durum</dt><dd [class.available]="car.isAvailable !== false" [class.unavailable]="car.isAvailable === false">{{ car.isAvailable === false ? 'Müsait değil' : 'Müsait' }}</dd></div></dl>
            </section>

            <section class="panel all-details-panel" aria-labelledby="all-details-title">
              <button type="button" class="all-details-toggle" (click)="detailsOpen.update(v => !v)" [attr.aria-expanded]="detailsOpen()" aria-controls="rental-all-details"><strong id="all-details-title">Tüm Özellikler ve Açıklama</strong><mat-icon aria-hidden="true">{{ detailsOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
              @if (detailsOpen()) {
                <div id="rental-all-details" class="all-details-content">
                  <section class="details-group" aria-labelledby="vehicle-info-title"><h3 id="vehicle-info-title">Araç Bilgileri</h3><dl class="detail-list"><div><dt>Gövde tipi</dt><dd>{{ display(car.type) }}</dd></div><div><dt>Konum</dt><dd>{{ display(car.location) }}</dd></div><div><dt>Sürücü seçeneği</dt><dd>{{ driverOptionLabel(car.driverOption) }}</dd></div>@if (car.dailyMileageLimit) {<div><dt>Günlük kilometre</dt><dd>{{ car.dailyMileageLimit }} km</dd></div>}@if (car.deposit !== undefined) {<div><dt>Depozito</dt><dd>{{ car.deposit | turkishCurrency }}</dd></div>}@if (car.minAge) {<div><dt>Minimum yaş</dt><dd>{{ car.minAge }}</dd></div>}@if (car.minLicenseYears) {<div><dt>Minimum ehliyet</dt><dd>{{ car.minLicenseYears }} yıl</dd></div>}</dl></section>
                  @if (car.features?.length) {<section class="details-group" aria-labelledby="features-title"><h3 id="features-title">Donanım ve Özellikler</h3><ul class="feature-list">@for (feature of car.features; track feature) {<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ feature }}</span></li>}</ul></section>}
                  @if (technicalSpecs(); as specs) {<section class="details-group" aria-labelledby="technical-title"><h3 id="technical-title">Teknik Özellikler</h3><dl class="tech-grid">@for (row of specRows(specs); track row.label) {<div><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div>}</dl></section>}
                  @if (car.description) {<section class="details-group" aria-labelledby="description-title"><h3 id="description-title">Açıklama</h3><p class="description">{{ car.description }}</p></section>}
                </div>
              }
            </section>
          </div>

          <aside class="reservation-panel" aria-labelledby="reservation-title"><p>Rezervasyon</p><h2 id="reservation-title">Bu aracı rezerve edin</h2><div class="reservation-price"><small>Günlük başlangıç fiyatı</small><strong>{{ activeCampaign()?.newPrice || car.price | turkishCurrency }}</strong>@if (activeCampaign()?.newPrice && activeCampaign()!.newPrice! < car.price) {<span class="campaign-price-note">Kampanya fiyatı</span>}</div><button type="button" class="primary-action" (click)="reserve(car)" [disabled]="car.isAvailable === false">Rezervasyon Oluştur</button><button type="button" class="whatsapp-action" (click)="whatsapp()">WhatsApp ile Sor</button></aside>
        </div>

        <nav class="mobile-actions" aria-label="Araç hızlı işlemleri">@if (phoneHref()) {<a [href]="phoneHref()" aria-label="Telefonla ara">Ara</a>} @else {<button type="button" disabled aria-label="Telefon numarası tanımlı değil">Ara</button>}<button type="button" class="whatsapp" (click)="whatsapp()">WhatsApp</button><button type="button" class="reserve" (click)="reserve(car)" [disabled]="car.isAvailable === false">Rezerve Et</button></nav>
      } @else if (loading()) {<section class="state-panel" role="status"><div class="spinner"></div><strong>Araç bilgileri veritabanından yükleniyor</strong></section>}
      @else {<section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Araç kaydı yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>}
    </main>
  `,
  styles: [`
    :host{display:block;background:#050914;color:#f8fafc}.detail-page{min-height:100dvh;padding-bottom:92px;background:#050914;font-family:Inter,system-ui,sans-serif}.detail-header{border-bottom:1px solid #1e293b;background:#071020}.header-inner{width:min(100% - 24px,1180px);min-height:72px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.header-copy{min-width:0}.header-copy span{display:block;color:#93c5fd;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.header-copy h1{margin:2px 0 0;color:#fff;font:900 20px/1.15 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:transparent;color:#fff}.icon-button:focus-visible,.all-details-toggle:focus-visible,.primary-action:focus-visible,.whatsapp-action:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.favorite-active{color:#fb7185}.gallery{background:#000}.gallery-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:4/3;overflow:hidden;background:#020617}.gallery-frame img,.gallery-frame video{display:block;width:100%;height:100%;object-fit:cover}.gallery-toolbar{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.gallery-toolbar>span{border-radius:999px;background:rgba(0,0,0,.72);padding:7px 12px;font-size:12px;font-weight:900}.gallery-toolbar>div{display:flex;gap:8px;pointer-events:auto}.gallery-toolbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff}.gallery-empty{width:min(100%,1180px);margin:auto;aspect-ratio:4/3;display:grid;place-content:center;gap:8px;text-align:center;background:#0f172a;color:#cbd5e1;padding:24px}.campaign-strip{width:min(100% - 24px,1180px);margin:14px auto 0;display:flex;flex-direction:column;gap:14px;border:1px solid rgba(251,191,36,.38);border-radius:20px;background:linear-gradient(135deg,#451a03,#7c2d12 58%,#111827);padding:16px 18px;box-shadow:0 14px 34px rgba(0,0,0,.2)}.campaign-kicker{display:inline-flex;border-radius:999px;background:#fbbf24;padding:5px 8px;color:#451a03;font-size:10px;font-weight:950;letter-spacing:.12em}.campaign-strip h2{margin:7px 0 0;color:#fff;font:900 22px Georgia,serif}.campaign-strip p{margin:5px 0 0;color:#fde68a;font-size:12px;line-height:1.5}.campaign-value{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.campaign-value>span{display:flex;align-items:center;gap:4px;border-radius:999px;background:rgba(255,255,255,.12);padding:6px 9px;color:#fff;font-size:11px;font-weight:900}.campaign-value mat-icon{width:15px;height:15px;font-size:15px}.campaign-value small{text-decoration:line-through;color:#fdba74}.campaign-value strong{font-size:20px;color:#fef3c7}.detail-layout{width:min(100% - 24px,1180px);margin:auto;padding:18px 0 22px;display:grid;gap:18px}.detail-main{display:grid;gap:14px}.panel,.reservation-panel{border:1px solid #253149;border-radius:20px;background:#0b1220;padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.18)}.summary-head{display:flex;flex-direction:column;gap:16px}.stock-code{margin:0;color:#fbbf24;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.summary-head h2,.reservation-panel h2{margin:5px 0 0;color:#fff;font:900 clamp(30px,8vw,46px)/1.08 Georgia,serif}.summary-meta{margin:8px 0 0;color:#cbd5e1;font-size:13px}.price-block span,.reservation-price small{color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase}.price-block strong,.reservation-price strong{display:block;margin-top:4px;color:#93c5fd!important;font-size:30px!important}.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 0}.facts>div{border:1px solid #27344f;border-radius:14px;background:#050b18;padding:14px}.facts dt{color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase}.facts dd{margin:7px 0 0;color:#fff;font-size:15px;font-weight:900}.facts dd.available{color:#86efac}.facts dd.unavailable{color:#fda4af}.all-details-panel{padding:0;overflow:hidden}.all-details-toggle{display:flex;width:100%;min-height:70px;align-items:center;justify-content:space-between;gap:12px;border:0;background:transparent;padding:16px 18px;color:#fff;text-align:left}.all-details-toggle strong{font-size:18px}.all-details-content{border-top:1px solid #1e293b;padding:0 18px 18px}.details-group{padding-top:16px}.details-group+.details-group{margin-top:16px;border-top:1px solid #1e293b}.details-group h3{margin:0 0 10px;color:#fff;font-size:15px}.detail-list{margin:0}.detail-list>div{display:flex;justify-content:space-between;gap:18px;border-top:1px solid #1e293b;padding:11px 0}.detail-list>div:first-child{border-top:0}.detail-list dt{color:#94a3b8}.detail-list dd{margin:0;text-align:right;font-weight:850}.description{margin:0;white-space:pre-line;color:#cbd5e1;line-height:1.75}.feature-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.feature-list li{display:flex;align-items:flex-start;gap:8px;border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.feature-list mat-icon{width:20px;height:20px;font-size:20px;color:#34d399}.tech-grid{display:grid;gap:8px;margin:0}.tech-grid>div{border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.tech-grid dt{color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase}.tech-grid dd{margin:4px 0 0;font-weight:900}.reservation-panel>p{margin:0;color:#93c5fd;font-size:11px;font-weight:950;text-transform:uppercase}.reservation-price{margin-top:16px;border-radius:14px;background:#050b18;padding:14px}.campaign-price-note{display:block;margin-top:4px;color:#fbbf24;font-size:11px;font-weight:900}.primary-action,.whatsapp-action{width:100%;min-height:52px;margin-top:10px;border:0;border-radius:13px;font-weight:950}.primary-action{background:#2563eb;color:#fff}.whatsapp-action{background:#059669;color:#fff}.primary-action:disabled{opacity:.45}.mobile-actions{position:fixed;z-index:80;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:8px;border-top:1px solid #334155;background:#050914;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}.mobile-actions a,.mobile-actions button{display:flex;min-height:52px;align-items:center;justify-content:center;border:0;border-radius:13px;text-decoration:none;font-weight:950}.mobile-actions a,.mobile-actions>button:first-of-type{background:#e2e8f0;color:#0f172a}.mobile-actions .whatsapp{background:#059669;color:#fff}.mobile-actions .reserve{background:#d4af37;color:#071020}.state-panel{min-height:68vh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state-panel button{min-height:46px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;padding:0 18px}.spinner{width:40px;height:40px;margin:auto;border:4px solid #334155;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.gallery-frame,.gallery-empty{aspect-ratio:16/9}.campaign-strip{flex-direction:row;align-items:center;justify-content:space-between}.campaign-value{justify-content:flex-end}.summary-head{flex-direction:row;align-items:end;justify-content:space-between}.price-block{text-align:right}.tech-grid,.feature-list{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.detail-page{padding-bottom:24px}.gallery-frame,.gallery-empty{aspect-ratio:21/9}.detail-layout{grid-template-columns:minmax(0,1fr) 360px;align-items:start}.reservation-panel{position:sticky;top:24px}.mobile-actions{display:none}}
  `],
})
export class CarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly campaigns = inject(CampaignService);
  readonly carService = inject(CarService);
  private readonly seo = inject(SeoService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  private readonly campaignId = this.route.snapshot.queryParamMap.get("campaign") || "";
  private readonly presetStartDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("start"));
  private readonly presetEndDate = this.validQueryDate(this.route.snapshot.queryParamMap.get("end"));

  readonly vehicle = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly detailsOpen = signal(false);
  private readonly failedMedia = signal<string[]>([]);

  readonly activeCampaign = computed<CampaignRecord | null>(() => this.campaignId ? this.campaigns.publicCampaigns().find((item) => item.id === this.campaignId) || null : null);
  readonly media = computed<GalleryMedia[]>(() => {
    const car = this.vehicle();
    if (!car) return [];
    const failed = new Set(this.failedMedia());
    const seen = new Set<string>();
    const result: GalleryMedia[] = [];
    for (const url of this.detailData.mediaUrls(car)) { if (!url || failed.has(url) || seen.has(url)) continue; seen.add(url); result.push({ type: "image", url }); }
    for (const video of car.videos || []) { const url = this.detailData.mediaUrl(video.url); if (!url || failed.has(url) || seen.has(url)) continue; seen.add(url); result.push({ type: "video", url, posterUrl: this.detailData.mediaUrl(video.posterUrl), title: video.title }); }
    return result.slice(0, 30);
  });
  readonly activeMedia = computed(() => { const list = this.media(); return list.length ? list[Math.min(this.currentSlide(), list.length - 1)] : null; });
  readonly technicalSpecs = computed(() => { const car = this.vehicle(); if (!car) return null; const key = car.series ? `${car.series} ${car.model || ""}`.trim() : car.model || ""; return getTechnicalSpecs(car.brand || "", key) || getTechnicalSpecs(car.brand || "", car.model || "") || null; });

  constructor() { effect(() => { const car = this.vehicle(); if (!car) return; const config = this.carService.getConfig()(); this.seo.updateSeoTags({ title: `${car.brand || "Araç"} ${car.model || ""} Kiralama | ${config.companyName}`, description: `${car.brand || "Araç"} ${car.model || ""} günlük fiyat, özellikler ve rezervasyon seçenekleri.`, image: car.image || config.seoOgImage }); }); }

  async ngOnInit(): Promise<void> {
    await Promise.allSettled([this.reload(), this.campaigns.loadPublic()]);
  }
  async reload(): Promise<void> { this.loading.set(true); this.loadError.set(""); try { const car = await this.detailData.load("RENTAL", this.routeId) as Car; this.vehicle.set(car); this.failedMedia.set([]); this.currentSlide.set(0); } catch (error) { this.vehicle.set(null); this.loadError.set(error instanceof Error ? error.message : "Araç verisi alınamadı."); } finally { this.loading.set(false); } }

  display(value: unknown): string { return this.detailData.display(value); }
  summaryMeta(car: Car): string { return [car.year, car.type, car.location].filter(Boolean).join(" · ") || "Alperler Auto kiralık araç"; }
  campaignCountdown(value: string): string { const remaining = new Date(value).getTime() - Date.now(); if (!Number.isFinite(remaining) || remaining <= 0) return "Süre doldu"; const hours = Math.floor(remaining / 3_600_000); const days = Math.floor(hours / 24); if (days > 1) return `${days} gün kaldı`; if (days === 1) return "1 gün kaldı"; return `${Math.max(1, hours)} saat kaldı`; }
  previousMedia(): void { const length = this.media().length; if (length > 1) this.currentSlide.update((i) => (i - 1 + length) % length); }
  nextMedia(): void { const length = this.media().length; if (length > 1) this.currentSlide.update((i) => (i + 1) % length); }
  mediaFailed(url: string): void { this.failedMedia.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }

  reserve(car: Car): void {
    if (car.isAvailable === false) return;
    const days = this.rentalDays(this.presetStartDate, this.presetEndDate);
    const campaignPrice = this.activeCampaign()?.newPrice;
    const basePrice = campaignPrice != null && campaignPrice > 0 ? campaignPrice : Number(car.price || 0);
    this.carService.setBookingRequest({ type: "RENTAL", item: car, itemName: `${car.brand || ""} ${car.model || ""}`.trim(), image: car.image || car.images?.[0], basePrice, totalPrice: days > 0 ? days * basePrice : basePrice, startDate: days > 0 ? this.presetStartDate : undefined, endDate: days > 0 ? this.presetEndDate : undefined, days: days > 0 ? days : undefined, rentalDuration: "daily", withDriver: car.driverOption === "WITH_DRIVER" });
    void this.router.navigate(["/contact"]);
  }
  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }
  async share(car: Car): Promise<void> { const payload = { title: `${car.brand || ""} ${car.model || ""} | Alperler Auto`.trim(), text: "Bu kiralık aracı inceleyin.", url: window.location.href }; try { if (navigator.share) await navigator.share(payload); else await navigator.clipboard?.writeText(window.location.href); } catch { /* paylaşım iptal edildi */ } }
  whatsapp(): void { const car = this.vehicle(); if (!car) return; const config = this.carService.getConfig()(); const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, ""); if (!phone) return; const message = `Merhaba, ${car.brand || ""} ${car.model || ""} kiralık araç hakkında bilgi almak istiyorum. ${window.location.href}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }
  phoneHref(): string { const phone = String(this.carService.getConfig()().phone || "").replace(/[^+\d]/g, ""); return phone ? `tel:${phone}` : ""; }
  driverOptionLabel(value: Car["driverOption"]): string { if (value === "WITH_DRIVER") return "Şoförlü"; if (value === "BOTH") return "Şoförlü veya şoförsüz"; return "Şoförsüz"; }
  specRows(specs: any): { label: string; value: string }[] { const rows = [["Motor hacmi", specs.engineVolume], ["Motor gücü", specs.enginePower], ["Tork", specs.torque], ["Çekiş", specs.drivetrain], ["Maksimum hız", specs.maxSpeed], ["0-100 km/s", specs.acceleration], ["Ortalama tüketim", specs.combinedFuel], ["Bagaj", specs.trunkCapacity], ["Depo", specs.tankCapacity], ["Ağırlık", specs.weight]]; return rows.filter((row) => Boolean(row[1]) && row[1] !== "Belirtilmemiş" && row[1] !== "-").map(([label, value]) => ({ label: String(label), value: String(value) })); }
  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/fleet"]); }
  private rentalDays(startValue: string, endValue: string): number { const start = this.parseDate(startValue); const end = this.parseDate(endValue); if (!start || !end) return 0; return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)); }
  private validQueryDate(value: string | null): string { return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value) : ""; }
  private parseDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return Number.isNaN(date.getTime()) ? null : date; }
}
