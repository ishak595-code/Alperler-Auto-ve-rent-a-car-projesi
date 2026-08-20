import { CommonModule, Location } from "@angular/common";
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ExpertiseGraphicComponent } from "../components/expertise-graphic.component";
import { getTechnicalSpecs } from "../data/technical-specs.data";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";

@Component({
  selector: "app-sale-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, ExpertiseGraphicComponent, TurkishCurrencyPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <main class="sale-page">
      @if (car(); as item) {
        <header class="sale-header">
          <div class="header-left">
            <button type="button" class="header-button" (click)="goBack()" aria-label="Satılık araçlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
            <h1>İlan Detayı</h1>
          </div>
          <div class="header-actions">
            <button type="button" class="header-button" (click)="share(item)" aria-label="İlanı paylaş"><mat-icon aria-hidden="true">share</mat-icon></button>
            <button type="button" class="header-button" (click)="toggleFav(item.id)" [attr.aria-label]="isFav(item.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'"><mat-icon aria-hidden="true" [class.favorite]="isFav(item.id)">{{ isFav(item.id) ? 'star' : 'star_border' }}</mat-icon></button>
          </div>
        </header>

        <section class="media-area" [attr.aria-label]="item.brand + ' ' + item.model + ' ilan görselleri'">
          @if (activeImage(); as image) {
            <button type="button" class="main-image-button" (click)="openLightbox()" [attr.aria-label]="item.brand + ' ' + item.model + ' görselini büyüt'">
              <img [src]="image" [alt]="item.brand + ' ' + item.model + ' satılık araç görseli'" loading="eager" decoding="async" (error)="imageFailed(image)" />
            </button>
            @if (item.badge) {<span class="listing-badge">{{ item.badge }}</span>}
            <div class="image-controls">
              <span>{{ currentSlide() + 1 }} / {{ images().length }}</span>
              @if (images().length > 1) {
                <div><button type="button" (click)="previousImage()" aria-label="Önceki görsel"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextImage()" aria-label="Sonraki görsel"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>
              }
            </div>
          } @else {
            <div class="media-empty" role="status"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>Araç görseli yüklenemedi</strong></div>
          }
        </section>

        <section class="listing-head" aria-labelledby="listing-title">
          <div>
            <p class="listing-no">İlan No {{ item.cloudStockCode || item.id }}</p>
            <h2 id="listing-title">{{ item.brand }} @if (item.series) {<span>{{ item.series }}</span>} {{ item.model }}</h2>
          </div>
          <strong class="listing-price">{{ item.price | turkishCurrency }}</strong>
        </section>

        <nav class="sale-tabs" aria-label="İlan detay bölümleri">
          <button type="button" (click)="activeTab.set('info')" [class.active]="activeTab() === 'info'" [attr.aria-pressed]="activeTab() === 'info'"><mat-icon aria-hidden="true">list_alt</mat-icon><span>İLAN BİLGİLERİ</span></button>
          <button type="button" (click)="activeTab.set('desc')" [class.active]="activeTab() === 'desc'" [attr.aria-pressed]="activeTab() === 'desc'"><mat-icon aria-hidden="true">description</mat-icon><span>AÇIKLAMA</span></button>
          <button type="button" (click)="activeTab.set('loc')" [class.active]="activeTab() === 'loc'" [attr.aria-pressed]="activeTab() === 'loc'"><mat-icon aria-hidden="true">location_on</mat-icon><span>KONUM</span></button>
        </nav>

        <section class="tab-content">
          @if (activeTab() === 'info') {
            <div class="info-panel">
              <dl class="listing-table">
                <div><dt>İlan No</dt><dd class="important">{{ item.cloudStockCode || item.id }}</dd></div>
                <div><dt>İlan Tarihi</dt><dd>{{ listingDate(item) }}</dd></div>
                <div><dt>Marka</dt><dd>{{ display(item.brand) }}</dd></div>
                <div><dt>Seri / Model</dt><dd>{{ display(item.series) }} {{ display(item.model, '') }}</dd></div>
                <div><dt>Yıl</dt><dd>{{ display(item.year) }}</dd></div>
                <div><dt>Kilometre</dt><dd>{{ item.km ? ((item.km | number) + ' km') : 'Belirtilmedi' }}</dd></div>
                <div><dt>Yakıt</dt><dd>{{ display(item.fuel) }}</dd></div>
                <div><dt>Vites</dt><dd>{{ display(item.transmission) }}</dd></div>
                <div><dt>Kasa Tipi</dt><dd>{{ display(item.type) }}</dd></div>
                <div><dt>Motor Gücü</dt><dd>{{ display(item.enginePower) }}</dd></div>
                <div><dt>Motor Hacmi</dt><dd>{{ display(item.engineVolume) }}</dd></div>
                <div><dt>Çekiş</dt><dd>{{ display(item.drivetrain) }}</dd></div>
                <div><dt>Renk</dt><dd>{{ display(item.color) }}</dd></div>
                <div><dt>Garanti</dt><dd>{{ display(item.warranty) }}</dd></div>
              </dl>

              @if (techSpecs(); as specs) {
                <section class="expand-section">
                  <button type="button" class="expand-button" (click)="techOpen.update(v => !v)" [attr.aria-expanded]="techOpen()" aria-controls="sale-tech-specs"><span><mat-icon aria-hidden="true">settings_suggest</mat-icon>{{ techOpen() ? 'Teknik Özellikleri Gizle' : 'Tüm Teknik Özellikleri İncele' }}</span><mat-icon aria-hidden="true">{{ techOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
                  @if (techOpen()) {
                    <dl id="sale-tech-specs" class="spec-grid">
                      @for (row of specRows(specs); track row.label) {<div><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div>}
                    </dl>
                  }
                </section>
              }

              @if (features().length) {
                <section class="expand-section">
                  <button type="button" class="expand-button light" (click)="featuresOpen.update(v => !v)" [attr.aria-expanded]="featuresOpen()" aria-controls="sale-features"><span><mat-icon aria-hidden="true">checklist</mat-icon>{{ featuresOpen() ? 'Tüm Özellikleri Gizle' : 'Tüm Özellikleri Göster' }}</span><mat-icon aria-hidden="true">{{ featuresOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>
                  @if (featuresOpen()) {<ul id="sale-features" class="feature-grid">@for (feature of features(); track feature) {<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{ feature }}</li>}</ul>}
                </section>
              }

              <section class="expertise" aria-labelledby="expertise-title">
                <h3 id="expertise-title"><mat-icon aria-hidden="true">verified</mat-icon>Ekspertiz ve Tramer Durumu</h3>
                <div class="damage-summary"><span>Hasar Özeti</span><strong>{{ item.damageStatus || (item.isDamageFree ? 'Hatasız & Boyasız' : 'Belirtilmedi') }}</strong></div>
                <app-expertise-graphic [data]="item.damageExpertise"></app-expertise-graphic>
                <div class="tramer"><strong><mat-icon aria-hidden="true">info</mat-icon>Tramer Bilgisi</strong><p>{{ item.tramer || 'Tramer bilgisi belirtilmedi.' }}</p></div>
              </section>
            </div>
          }

          @if (activeTab() === 'desc') {
            <article class="description-panel">
              <h3>{{ item.brand }} {{ item.model }} Açıklaması</h3>
              <p>{{ item.description || 'Bu ilan için açıklama henüz girilmedi.' }}</p>
            </article>
          }

          @if (activeTab() === 'loc') {
            <div class="location-panel">
              <div class="location-map" role="img" [attr.aria-label]="display(item.location, carService.getConfig()().address || 'Araç konumu')"><mat-icon aria-hidden="true">location_on</mat-icon><strong>{{ display(item.location, carService.getConfig()().address || 'Konum bilgisi mevcut değil') }}</strong></div>
              <div class="dealer-card"><span class="dealer-icon"><mat-icon aria-hidden="true">storefront</mat-icon></span><div><strong>{{ carService.getConfig()().companyName }}</strong><p>{{ item.location || carService.getConfig()().address || 'Adres bilgisi mevcut değil' }}</p></div></div>
            </div>
          }
        </section>

        <nav class="bottom-actions" aria-label="Satılık araç işlemleri">
          @if (phoneHref()) {<a [href]="phoneHref()"><mat-icon aria-hidden="true">call</mat-icon>Ara</a>} @else {<button type="button" disabled><mat-icon aria-hidden="true">call</mat-icon>Ara</button>}
          <button type="button" class="inquiry" (click)="inquire(item)" [disabled]="item.availability === 'Satıldı'"><mat-icon aria-hidden="true">request_quote</mat-icon>Satış Talebi</button>
          <button type="button" class="whatsapp" (click)="whatsapp()" aria-label="WhatsApp ile bilgi al"><mat-icon aria-hidden="true">chat</mat-icon></button>
        </nav>

        @if (lightboxOpen() && activeImage()) {
          <div class="lightbox" role="dialog" aria-modal="true" aria-label="Araç görseli büyütülmüş görünüm">
            <button type="button" class="lightbox-close" (click)="lightboxOpen.set(false)" aria-label="Büyütülmüş görseli kapat"><mat-icon aria-hidden="true">close</mat-icon></button>
            <img [src]="activeImage()" [alt]="item.brand + ' ' + item.model + ' büyük görsel'" />
            @if (images().length > 1) {<div class="lightbox-nav"><button type="button" (click)="previousImage()" aria-label="Önceki görsel"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><span>{{ currentSlide() + 1 }} / {{ images().length }}</span><button type="button" (click)="nextImage()" aria-label="Sonraki görsel"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}
          </div>
        }
      } @else if (loading()) {
        <section class="state" role="status"><div class="spinner"></div><strong>İlan bilgileri veritabanından yükleniyor</strong></section>
      } @else {
        <section class="state error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>İlan yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#f4f4f4;color:#212121}.sale-page{min-height:100dvh;padding-bottom:76px;background:#f4f4f4;font-family:Inter,system-ui,sans-serif}.sale-header{position:sticky;top:0;z-index:60;display:flex;height:56px;align-items:center;justify-content:space-between;background:#005c8d;padding:0 12px;color:#fff;box-shadow:0 3px 12px rgba(0,0,0,.18)}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.sale-header h1{margin:0;font-size:18px;font-weight:900}.header-button{display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:50%;background:transparent;color:#fff}.header-button:focus-visible,.sale-tabs button:focus-visible,.expand-button:focus-visible,.bottom-actions a:focus-visible,.bottom-actions button:focus-visible{outline:3px solid #7dd3fc;outline-offset:2px}.favorite{color:#fde047}.media-area{position:relative;width:min(100%,1100px);margin:auto;aspect-ratio:1;background:#f8f9fa;border-bottom:1px solid #e2e8f0;overflow:hidden}.main-image-button{display:block;width:100%;height:100%;border:0;background:#f8f9fa;padding:0}.main-image-button img{width:100%;height:100%;object-fit:contain}.listing-badge{position:absolute;z-index:2;left:14px;top:14px;border-radius:7px;background:rgba(15,23,42,.9);padding:7px 10px;color:#fff;font-size:11px;font-weight:900}.image-controls{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.image-controls>span{border-radius:999px;background:rgba(0,0,0,.55);padding:6px 10px;color:#fff;font-size:11px;font-weight:900}.image-controls>div{display:flex;gap:7px;pointer-events:auto}.image-controls button{display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.62);color:#fff}.media-empty{height:100%;display:grid;place-content:center;gap:8px;text-align:center;color:#64748b}.media-empty mat-icon{margin:auto;width:48px;height:48px;font-size:48px}.listing-head{display:flex;flex-direction:column;gap:10px;background:#fff;padding:18px 16px;border-bottom:1px solid #e2e8f0;box-shadow:0 3px 12px rgba(15,23,42,.05)}.listing-no{margin:0;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase}.listing-head h2{margin:4px 0 0;color:#0f172a;font-size:24px;font-weight:950;line-height:1.15}.listing-head h2 span{color:#64748b;font-weight:600}.listing-price{color:#d32f2f;font-size:28px;font-weight:950;letter-spacing:-.02em}.sale-tabs{position:sticky;top:56px;z-index:50;display:grid;grid-template-columns:repeat(3,1fr);background:#fff;box-shadow:0 3px 12px rgba(15,23,42,.08)}.sale-tabs button{display:flex;min-height:62px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-bottom:3px solid #e2e8f0;background:#fff;color:#0f172a;font-size:10px;font-weight:950}.sale-tabs button+button{border-left:1px solid #e2e8f0}.sale-tabs button.active{border-bottom-color:#005c8d;background:#005c8d;color:#fff}.sale-tabs mat-icon{width:20px;height:20px;font-size:20px}.tab-content{width:min(100%,1000px);min-height:420px;margin:auto;background:#fff}.info-panel{padding-bottom:22px}.listing-table{margin:0}.listing-table>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 16px}.listing-table>div:nth-child(even){background:#f8fafc}.listing-table dt{color:#64748b;font-size:13px}.listing-table dd{margin:0;text-align:right;color:#0f172a;font-size:13px;font-weight:800}.listing-table dd.important{color:#d32f2f}.expand-section{padding:16px;border-top:8px solid #f1f5f9}.expand-button{display:flex;width:100%;min-height:56px;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:15px;background:#0f172a;padding:0 15px;color:#fff;font-weight:900;text-align:left;box-shadow:0 8px 20px rgba(15,23,42,.15)}.expand-button.light{background:#005c8d}.expand-button>span{display:flex;align-items:center;gap:9px}.spec-grid{display:grid;gap:8px;margin:12px 0 0}.spec-grid>div{display:flex;justify-content:space-between;gap:12px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;padding:11px}.spec-grid dt{color:#64748b}.spec-grid dd{margin:0;font-weight:850;text-align:right}.feature-grid{list-style:none;display:grid;gap:8px;margin:12px 0 0;padding:0}.feature-grid li{display:flex;align-items:flex-start;gap:7px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;padding:11px;color:#334155}.feature-grid mat-icon{width:19px;height:19px;font-size:19px;color:#059669}.expertise{padding:20px 16px;border-top:8px solid #f1f5f9}.expertise h3{display:flex;align-items:center;gap:8px;margin:0 0 14px;color:#1e293b;font-size:16px}.expertise h3 mat-icon{color:#2563eb}.damage-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:13px}.damage-summary span{color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}.damage-summary strong{text-align:right}.tramer{margin-top:16px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;padding:14px;color:#475569}.tramer strong{display:flex;align-items:center;gap:6px;color:#0f172a}.tramer p{margin:6px 0 0;line-height:1.55}.description-panel,.location-panel{padding:20px 16px}.description-panel h3{margin:0;color:#0f172a;font-size:19px}.description-panel p{margin:12px 0 0;white-space:pre-line;color:#475569;font-size:15px;line-height:1.75}.location-map{min-height:230px;display:grid;place-content:center;gap:8px;border:2px dashed #cbd5e1;border-radius:15px;background:#f8fafc;text-align:center;color:#64748b;padding:18px}.location-map mat-icon{margin:auto;width:44px;height:44px;font-size:44px;color:#005c8d}.dealer-card{display:flex;align-items:flex-start;gap:12px;margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:14px;box-shadow:0 8px 20px rgba(15,23,42,.05)}.dealer-icon{display:grid;width:46px;height:46px;flex:none;place-items:center;border-radius:50%;background:#e0f2fe;color:#0369a1}.dealer-card strong{font-size:16px}.dealer-card p{margin:5px 0 0;color:#64748b;line-height:1.5}.bottom-actions{position:fixed;z-index:70;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1.3fr 58px;gap:8px;border-top:1px solid #e2e8f0;background:#fff;padding:8px 10px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -5px 20px rgba(15,23,42,.12)}.bottom-actions a,.bottom-actions button{display:flex;min-height:52px;align-items:center;justify-content:center;gap:6px;border:0;border-radius:10px;background:#005c8d;color:#fff;text-decoration:none;font-weight:900}.bottom-actions .inquiry{background:#005c8d}.bottom-actions .whatsapp{background:#25d366;border-radius:50%}.bottom-actions button:disabled{opacity:.45}.lightbox{position:fixed;z-index:120;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.96);padding:56px 12px 70px}.lightbox>img{max-width:100%;max-height:100%;object-fit:contain}.lightbox-close{position:absolute;right:12px;top:12px;display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff}.lightbox-nav{position:absolute;left:12px;right:12px;bottom:14px;display:flex;align-items:center;justify-content:center;gap:16px;color:#fff;font-weight:900}.lightbox-nav button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff}.state{min-height:70dvh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state button{min-height:46px;border:0;border-radius:10px;background:#005c8d;color:#fff;padding:0 18px;font-weight:900}.spinner{width:42px;height:42px;margin:auto;border:4px solid #cbd5e1;border-top-color:#005c8d;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:720px){.media-area{aspect-ratio:16/9}.listing-head{flex-direction:row;align-items:end;justify-content:space-between;padding:22px 24px}.tab-content{margin-top:14px;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,.08)}.spec-grid,.feature-grid{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.sale-page{padding-bottom:0}.media-area{aspect-ratio:21/9}.bottom-actions{position:sticky;bottom:0;width:min(100%,1000px);margin:14px auto 0;border:1px solid #e2e8f0;border-radius:14px;grid-template-columns:1fr 1.4fr 64px}.sale-tabs{width:min(100%,1000px);margin:auto}}
  `],
})
export class SaleCarDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  readonly carService = inject(CarService);
  private readonly seo = inject(SeoService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";

  readonly car = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly activeTab = signal<"info" | "desc" | "loc">("info");
  readonly currentSlide = signal(0);
  readonly techOpen = signal(false);
  readonly featuresOpen = signal(false);
  readonly lightboxOpen = signal(false);
  private readonly failedImages = signal<string[]>([]);

  readonly images = computed(() => {
    const item = this.car();
    if (!item) return [];
    const failed = new Set(this.failedImages());
    return this.detailData.mediaUrls(item).filter((url) => !failed.has(url));
  });
  readonly activeImage = computed(() => {
    const list = this.images();
    return list.length ? list[Math.min(this.currentSlide(), list.length - 1)] : "";
  });
  readonly features = computed(() => {
    const item = this.car();
    if (!item) return [];
    const detailed = item.detailedFeatures ? [
      ...(item.detailedFeatures.interior || []),
      ...(item.detailedFeatures.exterior || []),
      ...(item.detailedFeatures.multimedia || []),
      ...(item.detailedFeatures.safety || []),
    ] : [];
    return [...new Set([...(item.features || []), ...detailed].map((value) => String(value || "").trim()).filter(Boolean))];
  });
  readonly techSpecs = computed(() => {
    const item = this.car();
    if (!item) return null;
    const modelKey = item.series ? `${item.series} ${item.model || ""}`.trim() : item.model || "";
    return getTechnicalSpecs(item.brand || "", modelKey) || getTechnicalSpecs(item.brand || "", item.model || "") || null;
  });

  async ngOnInit(): Promise<void> { await this.reload(); }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set("");
    try {
      const item = await this.detailData.load("SALE", this.routeId) as Car;
      this.car.set(item);
      this.failedImages.set([]);
      this.currentSlide.set(0);
      const config = this.carService.getConfig()();
      this.seo.updateSeoTags({
        title: `${item.brand || "Araç"} ${item.model || ""} Satılık | ${config.companyName}`,
        description: `${item.year || ""} ${item.brand || ""} ${item.model || ""} satılık araç ilanı. Fiyat, kilometre, ekspertiz, açıklama ve konum bilgileri.`,
        image: item.image || config.seoOgImage,
      });
    } catch (error) {
      this.car.set(null);
      this.loadError.set(error instanceof Error ? error.message : "İlan verisi alınamadı.");
    } finally {
      this.loading.set(false);
    }
  }

  display(value: unknown, fallback = "Belirtilmedi"): string { return this.detailData.display(value, fallback); }
  listingDate(item: Car): string {
    const value = item.createdAt || item.updatedAt;
    if (!value) return "Tarih bilgisi yok";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Tarih bilgisi yok" : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }
  previousImage(): void { const length = this.images().length; if (length > 1) this.currentSlide.update((index) => (index - 1 + length) % length); }
  nextImage(): void { const length = this.images().length; if (length > 1) this.currentSlide.update((index) => (index + 1) % length); }
  imageFailed(url: string): void { this.failedImages.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }
  openLightbox(): void { if (this.activeImage()) this.lightboxOpen.set(true); }
  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }
  inquire(item: Car): void {
    if (item.availability === "Satıldı") return;
    this.carService.setBookingRequest({ type: "SALE_INQUIRY", item, itemName: `${item.brand || ""} ${item.model || ""}`.trim(), image: item.image || item.images?.[0], basePrice: Number(item.price || 0) });
    void this.router.navigate(["/contact"]);
  }
  async share(item: Car): Promise<void> {
    const payload = { title: `${item.brand || ""} ${item.model || ""} | Alperler Auto`.trim(), text: "Bu satılık araç ilanını inceleyin.", url: window.location.href };
    try { if (navigator.share) await navigator.share(payload); else await navigator.clipboard?.writeText(window.location.href); } catch { /* paylaşım iptal edildi */ }
  }
  whatsapp(): void {
    const item = this.car();
    if (!item) return;
    const config = this.carService.getConfig()();
    const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const message = `Merhaba, ${item.brand || ""} ${item.model || ""} satılık araç ilanı hakkında bilgi almak istiyorum. ${window.location.href}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
  phoneHref(): string { const phone = String(this.carService.getConfig()().phone || "").replace(/[^+\d]/g, ""); return phone ? `tel:${phone}` : ""; }
  specRows(specs: any): { label: string; value: string }[] {
    const rows = [["Maksimum hız", specs.maxSpeed], ["0-100 km/s", specs.acceleration], ["Motor hacmi", specs.engineVolume], ["Motor gücü", specs.enginePower], ["Tork", specs.torque], ["Çekiş", specs.drivetrain], ["Silindir", specs.cylinders], ["Şehir içi tüketim", specs.cityFuel], ["Uzun yol tüketim", specs.highwayFuel], ["Ortalama tüketim", specs.combinedFuel], ["Depo", specs.tankCapacity], ["Bagaj", specs.trunkCapacity], ["Boyutlar", specs.dimensions], ["Ağırlık", specs.weight]];
    return rows.filter((row) => Boolean(row[1]) && row[1] !== "Belirtilmemiş" && row[1] !== "-").map(([label, value]) => ({ label: String(label), value: String(value) }));
  }
  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/sales"]); }
}
