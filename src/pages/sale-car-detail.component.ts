import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { DetailMediaItem, DetailMediaLightboxComponent } from "../components/detail-media-lightbox.component";
import { ExpertiseGraphicComponent } from "../components/expertise-graphic.component";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";

@Component({
  selector: "app-sale-car-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, DetailMediaLightboxComponent, ExpertiseGraphicComponent, TurkishCurrencyPipe],
  template: `
    <main class="sale-page">
      @if (car(); as item) {
        <header class="sale-header">
          <div class="header-left"><button type="button" class="header-button" (click)="goBack()" aria-label="Satılık araçlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div><span>Satılık Araç · Canlı Katalog</span><h1>{{ item.brand }} {{ item.model }}</h1></div></div>
          <div class="header-actions"><button type="button" class="header-button" (click)="share(item)" aria-label="İlanı paylaş"><mat-icon aria-hidden="true">share</mat-icon></button><button type="button" class="header-button" (click)="toggleFav(item.id)" [attr.aria-label]="isFav(item.id) ? 'Favorilerden çıkar' : 'Favorilere ekle'"><mat-icon aria-hidden="true" [class.favorite]="isFav(item.id)">{{ isFav(item.id) ? 'favorite' : 'favorite_border' }}</mat-icon></button></div>
        </header>

        <section class="media-area" [attr.aria-label]="item.brand + ' ' + item.model + ' fotoğraf ve video galerisi'" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
          @if (activeMedia(); as media) {
            <div class="media-frame">
              @if (media.kind === 'IMAGE') {
                <button type="button" class="media-open" (click)="openLightbox()" [attr.aria-label]="item.brand + ' ' + item.model + ' görselini büyüt'"><img [src]="media.url" [alt]="media.title || (item.brand + ' ' + item.model)" loading="eager" decoding="async" (error)="mediaFailed(media.url)" /></button>
              } @else {
                <video [src]="media.url" [poster]="media.posterUrl || item.image || ''" controls playsinline preload="metadata" [attr.aria-label]="media.title || (item.brand + ' ' + item.model + ' videosu')" (error)="mediaFailed(media.url)"></video><button type="button" class="video-expand" (click)="openLightbox()" aria-label="Videoyu tam ekran aç"><mat-icon aria-hidden="true">fullscreen</mat-icon></button>
              }
              @if (item.badge) {<span class="listing-badge">{{ item.badge }}</span>}
              <div class="media-controls"><span>{{ currentSlide() + 1 }} / {{ mediaItems().length }}</span>@if (mediaItems().length > 1) {<div><button type="button" (click)="previousMedia()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextMedia()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div>
            </div>
          } @else {
            <div class="media-empty" role="status"><mat-icon aria-hidden="true">directions_car</mat-icon><strong>Araç medyası yüklenemedi</strong></div>
          }
        </section>

        <section class="listing-head" aria-labelledby="listing-title">
          <div><p class="listing-no">İlan No {{ item.cloudStockCode || item.id }}</p><h2 id="listing-title">{{ item.year }} {{ item.brand }} @if(item.series){<span>{{item.series}}</span>} {{ item.model }}</h2><p class="summary">{{ summaryMeta(item) }}</p></div><strong class="listing-price">{{ item.price | turkishCurrency }}</strong>
          @if (item.viewers || item.favCount) {<div class="social-proof" aria-label="İlan etkileşim bilgileri">@if(item.viewers){<span><mat-icon aria-hidden="true">visibility</mat-icon>{{item.viewers}} görüntülenme</span>}@if(item.favCount){<span><mat-icon aria-hidden="true">favorite</mat-icon>{{item.favCount}} favori</span>}</div>}
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
                <div><dt>İlan No</dt><dd class="important">{{ item.cloudStockCode || item.id }}</dd></div><div><dt>İlan Tarihi</dt><dd>{{ listingDate(item) }}</dd></div><div><dt>Marka</dt><dd>{{ display(item.brand) }}</dd></div><div><dt>Seri / Model</dt><dd>{{ [item.series,item.model].filter(Boolean).join(' ') || 'Belirtilmedi' }}</dd></div><div><dt>Yıl</dt><dd>{{ display(item.year) }}</dd></div><div><dt>Kilometre</dt><dd>{{ item.km ? ((item.km | number) + ' km') : 'Belirtilmedi' }}</dd></div><div><dt>Yakıt</dt><dd>{{ display(item.fuel) }}</dd></div><div><dt>Vites</dt><dd>{{ display(item.transmission) }}</dd></div><div><dt>Kasa Tipi</dt><dd>{{ display(item.type) }}</dd></div><div><dt>Renk</dt><dd>{{ display(item.color) }}</dd></div><div><dt>Koltuk</dt><dd>{{ item.seats ? item.seats + ' kişi' : 'Belirtilmedi' }}</dd></div><div><dt>Kapı</dt><dd>{{ display(item.doors) }}</dd></div><div><dt>Çekiş</dt><dd>{{ display(item.drivetrain) }}</dd></div><div><dt>Motor Gücü</dt><dd>{{ display(item.enginePower) }}</dd></div><div><dt>Motor Hacmi</dt><dd>{{ display(item.engineVolume) }}</dd></div><div><dt>Garanti</dt><dd>{{ display(item.warranty || (item.hasWarranty ? 'Var' : 'Belirtilmedi')) }}</dd></div><div><dt>Durum</dt><dd>{{ display(item.availability || 'Satışta') }}</dd></div>
              </dl>

              @if (technicalRows().length) {
                <section class="expand-section"><button type="button" class="expand-button" (click)="techOpen.update(v => !v)" [attr.aria-expanded]="techOpen()" aria-controls="sale-tech-specs"><span><mat-icon aria-hidden="true">settings_suggest</mat-icon>{{ techOpen() ? 'Teknik Özellikleri Gizle' : 'Tüm Teknik Özellikleri İncele' }}</span><mat-icon aria-hidden="true">{{ techOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (techOpen()) {<dl id="sale-tech-specs" class="spec-grid">@for (row of technicalRows(); track row.label) {<div><dt>{{row.label}}</dt><dd>{{row.value}}</dd></div>}</dl>}</section>
              }

              @if (features().length) {
                <section class="expand-section"><button type="button" class="expand-button blue" (click)="featuresOpen.update(v => !v)" [attr.aria-expanded]="featuresOpen()" aria-controls="sale-features"><span><mat-icon aria-hidden="true">checklist</mat-icon>{{ featuresOpen() ? 'Donanımı Gizle' : 'Tüm Donanım ve Özellikleri Göster' }}</span><mat-icon aria-hidden="true">{{ featuresOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (featuresOpen()) {<ul id="sale-features" class="feature-grid">@for (feature of features(); track feature) {<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{feature}}</li>}</ul>}</section>
              }

              <section class="expertise" aria-labelledby="expertise-title"><h3 id="expertise-title"><mat-icon aria-hidden="true">verified</mat-icon>Ekspertiz ve Tramer Durumu</h3><div class="truth-grid"><div><span>Hasar Durumu</span><strong>{{ item.damageStatus || (item.isDamageFree ? 'Hatasız & Boyasız' : 'Belirtilmedi') }}</strong></div><div><span>Tramer Beyanı</span><strong>{{ tramerStatusLabel(item) }}</strong></div>@if(item.tramerAmount != null){<div><span>Tramer Tutarı</span><strong>{{item.tramerAmount|turkishCurrency}}</strong></div>}@if(item.tramerVerifiedAt){<div><span>Doğrulama</span><strong>{{formatDate(item.tramerVerifiedAt)}}</strong></div>}</div><app-expertise-graphic [data]="item.damageExpertise"></app-expertise-graphic><div class="tramer"><strong><mat-icon aria-hidden="true">info</mat-icon>Tramer Bilgisi</strong><p>{{ item.tramer || tramerNarrative(item) }}</p>@if(item.tramerSourceName){<small>Kaynak: {{item.tramerSourceName}}</small>}</div></section>
            </div>
          }

          @if (activeTab() === 'desc') {
            <article class="description-panel"><h3>{{ item.brand }} {{ item.model }} Açıklaması</h3><p>{{ item.description || 'Bu ilan için açıklama henüz girilmedi.' }}</p>@if(features().length){<h4>Öne çıkan donanımlar</h4><ul>@for(feature of features().slice(0,12);track feature){<li>{{feature}}</li>}</ul>}</article>
          }

          @if (activeTab() === 'loc') {
            <div class="location-panel"><div class="location-map"><mat-icon aria-hidden="true">location_on</mat-icon><strong>{{ display(item.location, 'Konum bilgisi mevcut değil') }}</strong>@if(mapHref(item)){<a [href]="mapHref(item)" target="_blank" rel="noopener noreferrer"><mat-icon aria-hidden="true">map</mat-icon>Haritada aç</a>}</div><div class="dealer-card"><span class="dealer-icon"><mat-icon aria-hidden="true">storefront</mat-icon></span><div><strong>{{ carService.getConfig()().companyName }}</strong><p>{{ item.location || 'Araç konumu ilan kaydından gösteriliyor.' }}</p></div></div></div>
          }
        </section>

        <nav class="bottom-actions" aria-label="Satılık araç işlemleri">@if (phoneHref()) {<a [href]="phoneHref()"><mat-icon aria-hidden="true">call</mat-icon>Ara</a>} @else {<button type="button" disabled><mat-icon aria-hidden="true">call</mat-icon>Ara</button>}<button type="button" class="inquiry" (click)="inquire(item)" [disabled]="item.availability === 'Satıldı'"><mat-icon aria-hidden="true">request_quote</mat-icon>Satış Talebi</button><button type="button" class="whatsapp" (click)="whatsapp()" aria-label="WhatsApp ile bilgi al"><mat-icon aria-hidden="true">chat</mat-icon></button></nav>

        <app-detail-media-lightbox [open]="lightboxOpen()" [items]="mediaItems()" [index]="currentSlide()" [title]="item.brand + ' ' + item.model + ' fotoğraf ve video galerisi'" (closed)="lightboxOpen.set(false)" (indexChange)="currentSlide.set($event)" />
      } @else if (loading()) {
        <section class="state" role="status"><div class="spinner"></div><strong>Satılık araç bilgileri hazırlanıyor</strong></section>
      } @else {
        <section class="state error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>İlan yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#f8fafc}.sale-page{min-height:100dvh;padding-bottom:86px;background:#050b18;font-family:Inter,system-ui,sans-serif}.sale-header{position:sticky;top:0;z-index:70;display:flex;min-height:70px;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.98);padding:0 12px;backdrop-filter:blur(14px)}.header-left,.header-actions{display:flex;align-items:center;gap:8px}.header-left span{color:#34d399;font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.sale-header h1{margin:3px 0 0;max-width:64vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px}.header-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:14px;background:#0d1729;color:#fff}.favorite{color:#fb7185}.media-area{background:#020617}.media-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden}.media-open,.media-open img,.media-frame>video{display:block;width:100%;height:100%}.media-open{border:0;background:#020617;padding:0}.media-open img,.media-frame>video{object-fit:cover}.video-expand{position:absolute;z-index:5;right:12px;top:12px;display:grid;width:44px;height:44px;place-items:center;border:1px solid #334155;border-radius:13px;background:rgba(2,6,23,.8);color:#fff}.listing-badge{position:absolute;left:14px;top:14px;border-radius:999px;background:#10b981;padding:6px 10px;color:#042f2e;font-size:10px;font-weight:950}.media-controls{position:absolute;left:14px;right:14px;bottom:13px;display:flex;align-items:center;justify-content:space-between}.media-controls>span{border-radius:999px;background:rgba(0,0,0,.72);padding:7px 11px;font-size:11px;font-weight:900}.media-controls>div{display:flex;gap:7px}.media-controls button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff}.media-empty{min-height:340px;display:grid;place-content:center;gap:8px;text-align:center;color:#94a3b8}.listing-head{display:grid;gap:12px;width:min(100% - 24px,1060px);margin:18px auto 0;border:1px solid #253149;border-radius:20px;background:#0b1220;padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.18)}.listing-no{margin:0;color:#34d399;font-size:11px;font-weight:950;text-transform:uppercase}.listing-head h2{margin:5px 0 0;font:900 clamp(28px,7vw,44px)/1.08 Georgia,serif}.listing-head h2 span{color:#94a3b8}.summary{margin:8px 0 0;color:#94a3b8}.listing-price{color:#f8fafc;font-size:32px}.social-proof{display:flex;flex-wrap:wrap;gap:8px}.social-proof span{display:flex;align-items:center;gap:5px;border:1px solid #334155;border-radius:999px;background:#050b18;padding:7px 10px;color:#cbd5e1;font-size:11px;font-weight:850}.social-proof mat-icon{width:16px;height:16px;font-size:16px;color:#34d399}.sale-tabs{position:sticky;top:70px;z-index:60;display:grid;grid-template-columns:repeat(3,1fr);width:min(100% - 24px,1060px);margin:16px auto 0;overflow:hidden;border:1px solid #253149;border-radius:16px;background:#0b1220}.sale-tabs button{display:flex;min-height:64px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;background:#0b1220;color:#94a3b8;font-size:10px;font-weight:950}.sale-tabs button+button{border-left:1px solid #253149}.sale-tabs button.active{background:#0f766e;color:#fff}.sale-tabs mat-icon{width:20px;height:20px;font-size:20px}.tab-content{width:min(100% - 24px,1060px);min-height:420px;margin:12px auto 0;overflow:hidden;border:1px solid #253149;border-radius:20px;background:#0b1220}.listing-table{margin:0}.listing-table>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 16px}.listing-table>div:nth-child(even){background:#071020}.listing-table dt{color:#94a3b8;font-size:13px}.listing-table dd{margin:0;text-align:right;font-size:13px;font-weight:850}.listing-table dd.important{color:#34d399}.expand-section{padding:16px;border-top:1px solid #253149}.expand-button{display:flex;width:100%;min-height:56px;align-items:center;justify-content:space-between;gap:12px;border:0;border-radius:14px;background:#111827;padding:0 15px;color:#fff;font-weight:900;text-align:left}.expand-button.blue{background:#075985}.expand-button>span{display:flex;align-items:center;gap:9px}.spec-grid{display:grid;gap:8px;margin:12px 0 0}.spec-grid>div{display:flex;justify-content:space-between;gap:12px;border:1px solid #253149;border-radius:11px;background:#050b18;padding:11px}.spec-grid dt{color:#94a3b8}.spec-grid dd{margin:0;text-align:right;font-weight:850}.feature-grid{list-style:none;display:grid;gap:8px;margin:12px 0 0;padding:0}.feature-grid li{display:flex;align-items:flex-start;gap:7px;border:1px solid #253149;border-radius:11px;background:#050b18;padding:11px;color:#cbd5e1}.feature-grid mat-icon{color:#34d399}.expertise{padding:20px 16px;border-top:1px solid #253149}.expertise h3{display:flex;align-items:center;gap:8px;margin:0 0 14px}.expertise h3 mat-icon{color:#60a5fa}.truth-grid{display:grid;gap:8px;margin-bottom:16px}.truth-grid>div{display:flex;justify-content:space-between;gap:12px;border:1px solid #253149;border-radius:12px;background:#050b18;padding:12px}.truth-grid span{color:#94a3b8}.truth-grid strong{text-align:right}.tramer{margin-top:16px;border:1px solid #854d0e;border-radius:12px;background:#291b05;padding:14px;color:#fde68a}.tramer strong{display:flex;align-items:center;gap:6px;color:#fff}.tramer p{margin:7px 0 0;line-height:1.55}.tramer small{display:block;margin-top:7px}.description-panel,.location-panel{padding:20px 16px}.description-panel h3{margin:0;font-size:21px}.description-panel p{white-space:pre-line;color:#cbd5e1;line-height:1.75}.description-panel h4{margin:22px 0 8px}.description-panel ul{display:grid;gap:7px;color:#cbd5e1}.location-map{min-height:230px;display:grid;place-content:center;gap:9px;border:1px dashed #334155;border-radius:15px;background:#071020;text-align:center;color:#cbd5e1;padding:18px}.location-map>mat-icon{margin:auto;width:44px;height:44px;font-size:44px;color:#34d399}.location-map a{display:flex;min-height:48px;align-items:center;justify-content:center;gap:7px;margin-top:7px;border-radius:12px;background:#2563eb;color:#fff;text-decoration:none;font-weight:900}.dealer-card{display:flex;gap:12px;margin-top:14px;border:1px solid #253149;border-radius:14px;background:#071020;padding:14px}.dealer-icon{display:grid;width:46px;height:46px;flex:none;place-items:center;border-radius:50%;background:#064e3b;color:#6ee7b7}.dealer-card p{margin:5px 0 0;color:#94a3b8}.bottom-actions{position:fixed;z-index:90;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1.35fr 58px;gap:8px;border-top:1px solid #334155;background:rgba(5,11,24,.98);padding:9px 10px calc(9px + env(safe-area-inset-bottom));backdrop-filter:blur(16px)}.bottom-actions a,.bottom-actions button{display:flex;min-height:54px;align-items:center;justify-content:center;gap:6px;border:0;border-radius:12px;background:#0f766e;color:#fff;text-decoration:none;font-weight:950}.bottom-actions .inquiry{background:#2563eb}.bottom-actions .whatsapp{background:#059669}.bottom-actions button:disabled{opacity:.45}.state{min-height:70dvh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state button{min-height:46px;border:0;border-radius:10px;background:#2563eb;color:#fff;padding:0 18px;font-weight:900}.spinner{width:42px;height:42px;margin:auto;border:4px solid #334155;border-top-color:#34d399;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:720px){.media-frame{aspect-ratio:16/9}.listing-head{grid-template-columns:1fr auto;align-items:end}.social-proof{grid-column:1/-1}.spec-grid,.feature-grid,.truth-grid{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.media-frame{aspect-ratio:21/9}.bottom-actions{left:50%;right:auto;width:min(760px,calc(100% - 28px));transform:translateX(-50%);border:1px solid #334155;border-bottom:0;border-radius:16px 16px 0 0}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
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
  private touchX = 0;

  readonly car = signal<Car | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly activeTab = signal<"info" | "desc" | "loc">("info");
  readonly currentSlide = signal(0);
  readonly techOpen = signal(false);
  readonly featuresOpen = signal(false);
  readonly lightboxOpen = signal(false);
  readonly failedMedia = signal<string[]>([]);

  readonly mediaItems = computed<DetailMediaItem[]>(() => {
    const item = this.car();
    if (!item) return [];
    const failed = new Set(this.failedMedia());
    const seen = new Set<string>();
    const rows: DetailMediaItem[] = [];
    for (const url of this.detailData.mediaUrls(item)) if (url && !failed.has(url) && !seen.has(url)) { seen.add(url); rows.push({ kind: "IMAGE", url, title: `${item.brand || ''} ${item.model || ''}`.trim() || "Araç görseli" }); }
    for (const video of item.videos || []) if (video?.url && !failed.has(video.url) && !seen.has(video.url)) { seen.add(video.url); rows.push({ kind: "VIDEO", url: video.url, posterUrl: video.posterUrl || item.image, title: video.title || `${item.brand || ''} ${item.model || ''} videosu`.trim() }); }
    return rows.slice(0, 40);
  });
  readonly activeMedia = computed(() => this.mediaItems()[Math.min(this.currentSlide(), Math.max(0, this.mediaItems().length - 1))] || null);
  readonly features = computed(() => {
    const item = this.car();
    if (!item) return [];
    const detailed = item.detailedFeatures ? [...(item.detailedFeatures.interior || []), ...(item.detailedFeatures.exterior || []), ...(item.detailedFeatures.multimedia || []), ...(item.detailedFeatures.safety || [])] : [];
    return [...new Set([...(item.features || []), ...detailed].map((value) => String(value || "").trim()).filter(Boolean))];
  });
  readonly technicalRows = computed(() => {
    const item = this.car();
    if (!item) return [] as {label:string;value:string}[];
    const specs = item.technicalSpecs;
    const rows: Array<[string, unknown]> = [
      ["Maksimum hız", specs?.maxSpeed || item.maxSpeed], ["0-100 km/s", specs?.acceleration || item.acceleration], ["Motor hacmi", specs?.engineVolume || item.engineVolume], ["Motor gücü", specs?.enginePower || item.enginePower], ["Tork", specs?.torque || item.torque], ["Çekiş", specs?.drivetrain || item.drivetrain], ["Silindir", specs?.cylinders || (item.cylinderCount ? `${item.cylinderCount} silindir` : "")], ["Şehir içi tüketim", specs?.cityFuel || item.cityFuelConsumption], ["Uzun yol tüketim", specs?.highwayFuel || item.highwayFuelConsumption], ["Ortalama tüketim", specs?.combinedFuel || item.fuelConsumption], ["Depo", specs?.tankCapacity || item.fuelTankCapacity], ["Bagaj", specs?.trunkCapacity || item.trunkVolume], ["Jant / Lastik", specs?.wheels || item.wheelSize], ["Boyutlar", specs?.dimensions || [item.length,item.width,item.height].filter(Boolean).join(" × ")], ["Ağırlık", specs?.weight || item.weight],
    ];
    return rows.filter(([,value]) => String(value ?? "").trim() && String(value) !== "-").map(([label,value]) => ({label, value:String(value)}));
  });

  async ngOnInit(): Promise<void> { await this.reload(); }
  async reload(): Promise<void> {
    this.loading.set(true); this.loadError.set("");
    try {
      const item = await this.detailData.load("SALE", this.routeId) as Car;
      this.car.set(item); this.failedMedia.set([]); this.currentSlide.set(0);
      const config = this.carService.getConfig()();
      this.seo.updateSeoTags({ title: `${item.brand || "Araç"} ${item.model || ""} Satılık | ${config.companyName}`, description: `${item.year || ""} ${item.brand || ""} ${item.model || ""} satılık araç ilanı. Fiyat, kilometre, ekspertiz, açıklama ve konum bilgileri.`, image: item.image || config.seoOgImage });
    } catch (error) { this.car.set(null); this.loadError.set(error instanceof Error ? error.message : "İlan verisi alınamadı."); } finally { this.loading.set(false); }
  }

  display(value: unknown, fallback = "Belirtilmedi"): string { return this.detailData.display(value, fallback); }
  summaryMeta(item: Car): string { return [item.year, item.km ? `${item.km.toLocaleString('tr-TR')} km` : "", item.fuel, item.transmission, item.type].filter(Boolean).join(" · "); }
  listingDate(item: Car): string { return this.formatDate(item.createdAt || item.updatedAt || "") || "Tarih bilgisi yok"; }
  formatDate(value: string): string { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("tr-TR", {day:"2-digit",month:"long",year:"numeric"}).format(date) : ""; }
  previousMedia(): void { const length = this.mediaItems().length; if (length > 1) this.currentSlide.update((index) => (index - 1 + length) % length); }
  nextMedia(): void { const length = this.mediaItems().length; if (length > 1) this.currentSlide.update((index) => (index + 1) % length); }
  mediaFailed(url: string): void { this.failedMedia.update((items) => items.includes(url) ? items : [...items,url]); this.currentSlide.set(0); }
  openLightbox(): void { if (this.activeMedia()) this.lightboxOpen.set(true); }
  touchStart(event: TouchEvent): void { this.touchX = event.changedTouches[0]?.clientX || 0; }
  touchEnd(event: TouchEvent): void { const end = event.changedTouches[0]?.clientX || 0; if (Math.abs(end - this.touchX) < 45) return; end < this.touchX ? this.nextMedia() : this.previousMedia(); }
  toggleFav(id: string | number): void { this.carService.toggleFavorite(id); }
  isFav(id: string | number): boolean { return this.carService.isFavorite(id); }
  tramerStatusLabel(item: Car): string { const map: Record<string,string> = {UNKNOWN:"Bilgi yok",DECLARED_CLEAN:"Beyan: kayıt yok",DECLARED_RECORD:"Beyan: kayıt var",VERIFIED_CLEAN:"Doğrulandı: kayıt yok",VERIFIED_RECORD:"Doğrulandı: kayıt var"}; return map[String(item.tramerStatus || "UNKNOWN")] || "Belirtilmedi"; }
  tramerNarrative(item: Car): string { if (item.tramerAmount != null) return `Bildirilen tramer tutarı ${Number(item.tramerAmount).toLocaleString('tr-TR')} TL.`; return "Tramer beyanı ve doğrulama bilgileri yukarıda ayrı gösterilir."; }
  mapHref(item: Car): string { const record = item as Car & {mapUrl?:string;latitude?:number;longitude?:number}; if(record.mapUrl && /^https:\/\//i.test(record.mapUrl)) return record.mapUrl; if(Number.isFinite(Number(record.latitude))&&Number.isFinite(Number(record.longitude))) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${record.latitude},${record.longitude}`)}`; const query=String(item.location||"").trim(); return query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:""; }
  inquire(item: Car): void { if (item.availability === "Satıldı") return; this.carService.setBookingRequest({ type: "SALE_INQUIRY", item, itemName: `${item.brand || ""} ${item.model || ""}`.trim(), image: item.image || item.images?.[0], basePrice: Number(item.price || 0) }); void this.router.navigate(["/contact"]); }
  async share(item: Car): Promise<void> { const payload = {title:`${item.brand || ""} ${item.model || ""} | Alperler Auto`.trim(),text:"Bu satılık araç ilanını inceleyin.",url:window.location.href}; try { if(navigator.share) await navigator.share(payload); else await navigator.clipboard?.writeText(window.location.href); } catch { /* kullanıcı paylaşımı iptal etti */ } }
  whatsapp(): void { const item=this.car(); if(!item)return; const config=this.carService.getConfig()(); const phone=String(config.whatsapp||config.phone||"").replace(/\D/g,""); if(!phone)return; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Merhaba, ${item.brand || ""} ${item.model || ""} satılık araç ilanı hakkında bilgi almak istiyorum. ${window.location.href}`)}`,"_blank","noopener,noreferrer"); }
  phoneHref(): string { const phone=String(this.carService.getConfig()().phone||"").replace(/[^+\d]/g,""); return phone?`tel:${phone}`:""; }
  goBack(): void { if(window.history.length>1)this.location.back(); else void this.router.navigate(["/sales"]); }
}
