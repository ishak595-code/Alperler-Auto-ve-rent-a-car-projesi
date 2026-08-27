import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { DetailMediaItem, DetailMediaLightboxComponent } from "../components/detail-media-lightbox.component";
import { Tour } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { CarService } from "../services/car.service";
import { CommercialOfferContextService } from "../services/commercial-offer-context.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { SeoService } from "../services/seo.service";
import { TourBookingV170Service } from "../services/tour-booking-v170.service";
import { TourDemandV170, TourDemandV170Service } from "../services/tour-demand-v170.service";

@Component({
  selector: "app-tour-detail",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AccessibleNativeDateComponent, DetailMediaLightboxComponent, TurkishCurrencyPipe],
  template: `
    <main class="tour-page">
      @if (tour(); as item) {
        <header class="topbar" [attr.inert]="reservationOpen() ? '' : null" [attr.aria-hidden]="reservationOpen() ? 'true' : null">
          <div class="topbar-inner">
            <button type="button" class="icon-button" (click)="goBack()" aria-label="Turlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
            <div class="topbar-copy"><span>Alperler Tur</span><h1>{{ item.title }}</h1></div>
          </div>
        </header>

        <section class="gallery" [attr.aria-label]="item.title + ' fotoğraf ve video galerisi'" [attr.inert]="reservationOpen() ? '' : null" [attr.aria-hidden]="reservationOpen() ? 'true' : null" (touchstart)="touchStart($event)" (touchend)="touchEnd($event)">
          @if (activeMedia(); as media) {
            <div class="gallery-frame">
              @if (media.kind === 'IMAGE') {
                <button type="button" class="media-open" (click)="openLightbox()" [attr.aria-label]="media.title + ' tam ekran aç'"><img [src]="media.url" [alt]="media.title || item.title" loading="eager" decoding="async" (error)="mediaFailed(media.url)" /></button>
              } @else {
                <video [src]="media.url" [poster]="media.posterUrl || item.image || ''" controls playsinline preload="metadata" [attr.aria-label]="media.title || item.title" (error)="mediaFailed(media.url)"></video>
                <button type="button" class="video-expand" (click)="openLightbox()" aria-label="Videoyu tam ekran galeride aç"><mat-icon aria-hidden="true">fullscreen</mat-icon></button>
              }
              <div class="gallery-shade" aria-hidden="true"></div>
              <div class="hero-copy"><p>{{ item.duration || 'Tur deneyimi' }}</p><h2>{{ item.title }}</h2><span>{{ item.location || item.meetingPoint }}</span></div>
              <div class="gallery-toolbar"><span>{{ currentSlide() + 1 }} / {{ mediaItems().length }}</span>@if (mediaItems().length > 1) {<div><button type="button" (click)="previousMedia()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextMedia()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div>
            </div>
          } @else {
            <div class="gallery-empty" role="status"><mat-icon aria-hidden="true">perm_media</mat-icon><strong>Tur medyası henüz eklenmedi</strong></div>
          }
        </section>

        <div class="detail-layout" [attr.inert]="reservationOpen() ? '' : null" [attr.aria-hidden]="reservationOpen() ? 'true' : null">
          <div class="detail-main">
            <section class="panel summary-panel" aria-labelledby="tour-summary-title">
              <div class="summary-head">
                <div><p class="eyebrow">Rota Bilgisi</p><h2 id="tour-summary-title">{{ item.title }}</h2><p>{{ summaryMeta(item) }}</p></div>
                <div class="price"><span>{{ activeCampaign() ? 'Kampanya · kişi başı' : 'Kişi başı' }}</span>@if(activeCampaign()?.oldPrice){<small>{{ activeCampaign()!.oldPrice! | turkishCurrency }}</small>}<strong>{{ displayUnitPrice() | turkishCurrency }}</strong></div>
              </div>
              <dl class="facts"><div><dt>Süre</dt><dd>{{ display(item.duration) }}</dd></div><div><dt>Önerilen grup</dt><dd>{{ item.capacity ? item.capacity + ' kişi' : 'Belirtilmedi' }}</dd></div><div><dt>Buluşma</dt><dd>{{ display(item.meetingPoint) }}</dd></div><div><dt>Durum</dt><dd class="available">Rezervasyona açık</dd></div></dl>
            </section>

            @if (item.description) {
              <section class="panel accordion-panel"><button type="button" class="accordion-toggle" (click)="aboutOpen.update(v => !v)" [attr.aria-expanded]="aboutOpen()" aria-controls="tour-about"><span><strong>Tur Hakkında</strong><small>Rota ve deneyim ayrıntıları</small></span><mat-icon aria-hidden="true">{{ aboutOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (aboutOpen()) {<p id="tour-about" class="description">{{ item.description }}</p>}</section>
            }

            @if (itineraryRows().length) {
              <section class="panel accordion-panel"><button type="button" class="accordion-toggle" (click)="routeOpen.update(v => !v)" [attr.aria-expanded]="routeOpen()" aria-controls="tour-route"><span><strong>Tur Programı</strong><small>{{ itineraryRows().length }} planlı durak / adım</small></span><mat-icon aria-hidden="true">{{ routeOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (routeOpen()) {<ol id="tour-route" class="route-list">@for (row of itineraryRows(); track $index) {<li><span>{{ $index + 1 }}</span><p>{{ row }}</p></li>}</ol>}</section>
            }

            @if (item.highlights?.length || item.includedItems?.length || item.excludedItems?.length) {
              <section class="panel accordion-panel"><button type="button" class="accordion-toggle" (click)="scopeOpen.update(v => !v)" [attr.aria-expanded]="scopeOpen()" aria-controls="tour-scope"><span><strong>Kapsam</strong><small>Dahil olanlar, hariç olanlar ve öne çıkanlar</small></span><mat-icon aria-hidden="true">{{ scopeOpen() ? 'expand_less' : 'expand_more' }}</mat-icon></button>@if (scopeOpen()) {<div id="tour-scope" class="scope-grid">@if (item.highlights?.length) {<div><h3>Öne Çıkanlar</h3><ul>@for (value of item.highlights; track value) {<li><mat-icon aria-hidden="true">star</mat-icon>{{ value }}</li>}</ul></div>}@if (item.includedItems?.length) {<div><h3>Dahil</h3><ul>@for (value of item.includedItems; track value) {<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{ value }}</li>}</ul></div>}@if (item.excludedItems?.length) {<div><h3>Hariç</h3><ul>@for (value of item.excludedItems; track value) {<li><mat-icon aria-hidden="true">remove_circle_outline</mat-icon>{{ value }}</li>}</ul></div>}</div>}</section>
            }

            @if (mapHref(item)) {
              <section class="panel map-panel" aria-labelledby="tour-map-title"><p class="eyebrow">Konum</p><h2 id="tour-map-title">Buluşma ve rota</h2><span>{{ display(item.meetingPoint || item.location) }}</span><a [href]="mapHref(item)" target="_blank" rel="noopener noreferrer"><mat-icon aria-hidden="true">map</mat-icon>Haritada aç</a></section>
            }
          </div>

          <aside class="reserve-panel" aria-labelledby="tour-reserve-title"><p>Rezervasyon Bilgisi</p><h2 id="tour-reserve-title">Hazır olduğunuzda rezervasyon oluşturun</h2><span>Tarih, kişi sayısı ve canlı talep bilgisi yalnız “Bu Turu Rezerve Et” düğmesine bastığınızda açılır. Harita ve tur içeriği rezervasyon akışının dışında kalır.</span><div class="reserve-price"><small>{{ activeCampaign() ? 'Kampanyalı kişi başı' : 'Kişi başı başlangıç' }}</small><strong>{{ displayUnitPrice() | turkishCurrency }}</strong></div><div class="reserve-note"><mat-icon aria-hidden="true">verified_user</mat-icon><span>Kesin fiyat, kampanya ve uygunluk sunucuda tekrar doğrulanır.</span></div></aside>
        </div>

        <nav class="action-bar" aria-label="Tur hızlı işlemleri" [attr.inert]="reservationOpen() ? '' : null" [attr.aria-hidden]="reservationOpen() ? 'true' : null"><div class="action-inner"><button type="button" class="whatsapp" (click)="whatsapp()" aria-label="WhatsApp üzerinden tur hakkında bilgi al"><mat-icon aria-hidden="true">chat</mat-icon><span>WhatsApp’tan Sor</span></button><button type="button" class="reserve" (click)="openReservation()" aria-label="Bu turu rezerve et"><mat-icon aria-hidden="true">event_available</mat-icon><span>Bu Turu Rezerve Et</span></button></div></nav>

        <app-detail-media-lightbox [open]="lightboxOpen()" [items]="mediaItems()" [index]="currentSlide()" [title]="item.title + ' fotoğraf ve video galerisi'" (closed)="lightboxOpen.set(false)" (indexChange)="currentSlide.set($event)" />

        @if (reservationOpen()) {
          <div class="reservation-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-booking-title" tabindex="-1">
            <header><button type="button" (click)="closeReservation()" [disabled]="submitting()" aria-label="Tur rezervasyonunu kapat"><mat-icon aria-hidden="true">close</mat-icon></button><div><span>Adım {{ reservationStep() }} / 3</span><h2 id="tour-booking-title">Tur Rezervasyonu</h2></div></header>
            <div class="reservation-content">
              @if (reservationSuccess()) {
                <section class="success" role="status"><mat-icon aria-hidden="true">check_circle</mat-icon><h3>Rezervasyon talebiniz kaydedildi</h3><p>Referans: {{ reservationReference() }}</p><button type="button" (click)="closeReservation()" aria-label="Tur detayına dön">Tura Dön</button></section>
              } @else if (reservationStep() === 1) {
                <section id="tour-step-1" class="step-card" tabindex="-1"><p class="step-kicker">1. Tarih ve kişi sayısı</p><h3>Tur planınızı belirleyin</h3><app-accessible-native-date label="Tur Tarihi" [value]="tourDate" [min]="today" (valueChange)="onDateChange($event)" />
                  <div class="demand-box">@if(demandLoading()){<mat-icon aria-hidden="true">sync</mat-icon><div><strong>Güncel talep okunuyor</strong><span>Seçtiğiniz tarih kontrol ediliyor.</span></div>}@else if(demand();as live){<mat-icon aria-hidden="true">event_available</mat-icon><div><strong>Rezervasyon talebi oluşturabilirsiniz</strong><span>{{live.approvedReservations}} onaylı · {{live.pendingReservations}} bekleyen talep · toplam {{live.approvedPeople + live.pendingPeople}} kişi talebi</span></div>}@else if(tourDate){<mat-icon aria-hidden="true">info</mat-icon><div><strong>Talep metriği şu an görüntülenemiyor</strong><span>Rezervasyon sunucuda yine doğrulanacaktır.</span></div>}@else{<mat-icon aria-hidden="true">calendar_month</mat-icon><div><strong>Tarih seçin</strong><span>Canlı talep bilgisi tarih seçildikten sonra burada görünür.</span></div>}</div>
                  <div class="people"><span>Kişi Sayısı</span><div><button type="button" (click)="decreasePerson()" aria-label="Kişi sayısını azalt"><mat-icon aria-hidden="true">remove</mat-icon></button><input type="number" min="1" max="1000000000" [ngModel]="personCount()" (ngModelChange)="setPersonCount($event)" aria-label="Kişi sayısı" /><button type="button" (click)="increasePerson()" aria-label="Kişi sayısını artır"><mat-icon aria-hidden="true">add</mat-icon></button></div><small>Önerilen grup: {{ item.capacity ? item.capacity + ' kişi' : 'belirtilmedi' }}. Bu sayı rezervasyon için sert limit değildir.</small></div>
                  <div class="total"><span>{{ activeCampaign() ? 'Kampanyalı tahmini toplam' : 'Tahmini toplam' }}</span><strong>{{ estimatedTotal() | turkishCurrency }}</strong></div>@if(reservationError()){<p class="form-error" role="alert">{{reservationError()}}</p>}<button type="button" class="next" (click)="goToContact()" aria-label="İletişim bilgileri adımına devam et">Devam Et</button>
                </section>
              } @else if (reservationStep() === 2) {
                <section id="tour-step-2" class="step-card" tabindex="-1"><p class="step-kicker">2. İletişim</p><h3>İletişim bilgilerinizi tamamlayın</h3><div class="form-grid"><label><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label><label><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label><label><span>Telefon</span><input type="tel" [(ngModel)]="phone" autocomplete="tel" /></label><label><span>E-posta</span><input type="email" [(ngModel)]="email" autocomplete="email" /></label></div><label class="note"><span>Not</span><textarea rows="3" [(ngModel)]="notes"></textarea></label>@if(reservationError()){<p class="form-error" role="alert">{{reservationError()}}</p>}<div class="step-actions"><button type="button" class="secondary" (click)="setReservationStep(1)" aria-label="Tarih ve kişi sayısı adımına geri dön">Geri</button><button type="button" class="next" (click)="goToReview()" aria-label="Rezervasyon onay adımına devam et">Devam Et</button></div></section>
              } @else {
                <section id="tour-step-3" class="step-card" tabindex="-1"><p class="step-kicker">3. Onay</p><h3>Talebinizi kontrol edin</h3><dl class="review"><div><dt>Tur</dt><dd>{{item.title}}</dd></div><div><dt>Tarih</dt><dd>{{formattedTourDate()}}</dd></div><div><dt>Kişi</dt><dd>{{personCount()}}</dd></div><div><dt>Tahmini toplam</dt><dd>{{estimatedTotal()|turkishCurrency}}</dd></div></dl><p class="server-note">Kesin fiyat, kampanya, sadakat ve uygunluk sunucuda hesaplanır.</p>@if(reservationError()){<p class="form-error" role="alert">{{reservationError()}}</p>}<div class="step-actions"><button type="button" class="secondary" (click)="setReservationStep(2)" aria-label="İletişim bilgileri adımına geri dön">Geri</button><button type="button" class="next" (click)="submitReservation()" [disabled]="submitting()" aria-label="Rezervasyon talebini gönder">{{submitting()?'Kaydediliyor...':'Rezervasyon Talebini Gönder'}}</button></div></section>
              }
            </div>
          </div>
        }
      } @else if (loading()) {
        <section class="state-panel" role="status"><div class="spinner"></div><strong>Tur bilgileri yükleniyor</strong></section>
      } @else {
        <section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Tur yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()" aria-label="Tur bilgilerini tekrar yükle">Tekrar Dene</button></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.tour-page{min-height:100dvh;padding-bottom:88px;background:#050b18;font-family:Inter,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:70;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.97);backdrop-filter:blur(14px)}.topbar-inner{width:min(100% - 24px,1180px);min-height:70px;margin:auto;display:flex;align-items:center;gap:10px}.topbar-copy span,.eyebrow,.reserve-panel>p,.step-kicker{color:#60a5fa;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.1em}.topbar h1{margin:3px 0 0;max-width:72vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:19px}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:14px;background:#0d1729;color:#fff}.gallery{background:#020617}.gallery-frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden}.media-open,.media-open img,.gallery-frame>video{display:block;width:100%;height:100%}.media-open{border:0;background:#020617;padding:0}.media-open img,.gallery-frame>video{object-fit:cover}.video-expand{position:absolute;z-index:4;top:12px;right:12px;display:grid;width:44px;height:44px;place-items:center;border:1px solid #334155;border-radius:13px;background:rgba(2,6,23,.8);color:#fff}.gallery-shade{pointer-events:none;position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.9),transparent 62%)}.hero-copy{pointer-events:none;position:absolute;left:18px;right:18px;bottom:65px}.hero-copy p{margin:0;color:#fbbf24;font-size:10px;font-weight:900}.hero-copy h2{margin:5px 0 0;font:900 clamp(28px,7vw,52px)/1.04 Georgia,serif}.hero-copy span{display:block;margin-top:6px;color:#dbeafe;font-size:11px}.gallery-toolbar{position:absolute;left:14px;right:14px;bottom:12px;display:flex;align-items:center;justify-content:space-between}.gallery-toolbar>span{border-radius:999px;background:rgba(0,0,0,.72);padding:7px 12px;font-size:11px;font-weight:900}.gallery-toolbar>div{display:flex;gap:7px}.gallery-toolbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.72);color:#fff}.gallery-empty{min-height:340px;display:grid;place-content:center;gap:8px;text-align:center;color:#94a3b8}.detail-layout{width:min(100% - 24px,1180px);margin:auto;padding:20px 0;display:grid;gap:16px}.detail-main{display:grid;gap:12px}.panel,.reserve-panel{border:1px solid #26354d;border-radius:20px;background:#0b1220;padding:18px;box-shadow:0 14px 34px rgba(0,0,0,.18)}.summary-head{display:grid;gap:14px}.summary-head h2,.reserve-panel h2,.map-panel h2{margin:5px 0 0;font:900 clamp(27px,6vw,42px)/1.06 Georgia,serif}.summary-head p:last-child,.reserve-panel>span,.map-panel>span{display:block;margin:7px 0 0;color:#cbd5e1;font-size:13px;line-height:1.6}.price span,.reserve-price small{color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.price small{display:block;margin-top:5px;color:#fb923c;text-decoration:line-through}.price strong,.reserve-price strong{display:block;margin-top:4px;color:#fcd34d;font-size:28px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0 0}.facts>div{border:1px solid #27344f;border-radius:13px;background:#050b18;padding:12px}.facts dt{color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.facts dd{margin:6px 0 0;font-size:13px;font-weight:900}.available{color:#86efac}.accordion-panel{padding:0;overflow:hidden}.accordion-toggle{display:flex;width:100%;min-height:68px;align-items:center;justify-content:space-between;border:0;background:transparent;padding:14px 17px;color:#fff;text-align:left}.accordion-toggle strong{display:block;font-size:16px}.accordion-toggle small{display:block;margin-top:3px;color:#94a3b8;font-size:11px}.description{margin:0;padding:0 17px 17px;white-space:pre-line;color:#cbd5e1;line-height:1.7}.route-list{list-style:none;margin:0;padding:0 17px 17px;display:grid;gap:9px}.route-list li{display:flex;gap:10px;border:1px solid #1e293b;border-radius:12px;background:#050b18;padding:11px}.route-list li>span{display:grid;width:27px;height:27px;flex:none;place-items:center;border-radius:50%;background:#1d4ed8;font-weight:900}.route-list p{margin:3px 0 0;color:#e2e8f0}.scope-grid{display:grid;gap:10px;padding:0 17px 17px}.scope-grid>div{border:1px solid #1e293b;border-radius:13px;background:#050b18;padding:13px}.scope-grid h3{margin:0 0 8px}.scope-grid ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}.scope-grid li{display:flex;gap:8px;color:#cbd5e1}.scope-grid mat-icon{color:#fbbf24}.map-panel a{display:inline-flex;min-height:50px;align-items:center;gap:8px;margin-top:15px;border-radius:13px;background:#2563eb;padding:0 18px;color:#fff;text-decoration:none;font-weight:950}.reserve-price{margin-top:14px;border-radius:13px;background:#050b18;padding:13px}.reserve-note{display:flex;gap:8px;margin-top:12px;color:#94a3b8;font-size:11px;line-height:1.5}.reserve-note mat-icon{color:#86efac}.action-bar{position:fixed;z-index:90;left:0;right:0;bottom:0;border-top:1px solid #334155;background:rgba(5,11,24,.98);padding:9px 12px calc(9px + env(safe-area-inset-bottom));backdrop-filter:blur(16px)}.action-inner{width:min(100%,760px);margin:auto;display:grid;grid-template-columns:1fr 1.2fr;gap:8px}.action-inner button{display:flex;min-height:54px;align-items:center;justify-content:center;gap:7px;border:0;border-radius:13px;font-weight:950}.whatsapp{background:#059669;color:#fff}.reserve{background:#d4af37;color:#071020}.reservation-overlay{position:fixed;z-index:1200;inset:0;overflow-y:auto;background:#050b18}.reservation-overlay>header{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.98);padding:12px 16px}.reservation-overlay>header button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:13px;background:#111827;color:#fff}.reservation-overlay>header span{color:#93c5fd;font-size:10px;font-weight:900}.reservation-overlay>header h2{margin:2px 0 0;font-size:20px}.reservation-content{width:min(100% - 24px,680px);margin:auto;padding:22px 0}.step-card,.success{border:1px solid #253149;border-radius:20px;background:#0b1220;padding:18px}.step-card h3,.success h3{margin:5px 0 17px;font:900 27px Georgia,serif}.demand-box{display:flex;gap:10px;margin-top:12px;border:1px solid #1d4ed8;border-radius:14px;background:#07162d;padding:12px;color:#dbeafe}.demand-box mat-icon{color:#60a5fa}.demand-box strong,.demand-box span{display:block}.demand-box span{margin-top:3px;color:#93a4bc;font-size:11px}.people{margin-top:17px}.people>span,.form-grid label>span,.note>span{display:block;margin-bottom:7px;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.people>div{display:grid;grid-template-columns:52px 1fr 52px;gap:8px}.people button,.people input{min-height:50px;border:1px solid #334155;border-radius:12px;background:#050b18;color:#fff;text-align:center;font:900 18px Inter,system-ui}.people small{display:block;margin-top:7px;color:#94a3b8;line-height:1.5}.total{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-top:15px;border-radius:13px;background:#111827;padding:13px}.total span{color:#94a3b8}.total strong{font-size:24px;color:#fcd34d}.form-grid{display:grid;gap:11px}.form-grid input,.note textarea{width:100%;box-sizing:border-box;border:1px solid #334155;border-radius:12px;background:#050b18;padding:13px;color:#fff;font:inherit}.note{display:block;margin-top:11px}.form-error{margin:13px 0 0;border-radius:12px;background:#7f1d1d;padding:12px;color:#fecaca;font-weight:800}.next,.secondary{min-height:50px;border:0;border-radius:12px;font-weight:950}.next{width:100%;margin-top:15px;background:#2563eb;color:#fff}.step-actions{display:grid;grid-template-columns:.7fr 1.3fr;gap:9px;margin-top:15px}.step-actions .next{margin-top:0}.secondary{background:#1e293b;color:#fff}.review{margin:0}.review>div{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #1e293b;padding:11px 0}.review dt{color:#94a3b8}.review dd{margin:0;text-align:right;font-weight:900}.server-note{color:#94a3b8;font-size:11px;line-height:1.6}.success{text-align:center}.success mat-icon{width:52px;height:52px;font-size:52px;color:#34d399}.success button{min-height:48px;margin-top:14px;border:0;border-radius:12px;background:#fff;padding:0 20px;font-weight:900}.state-panel{min-height:70vh;display:grid;place-content:center;gap:10px;text-align:center;padding:24px}.state-panel button{min-height:46px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:900;padding:0 18px}.spinner{width:40px;height:40px;margin:auto;border:4px solid #334155;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.gallery-frame{aspect-ratio:16/9}.summary-head{grid-template-columns:1fr auto;align-items:end}.price{text-align:right}.scope-grid,.form-grid{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.gallery-frame{aspect-ratio:21/9}.detail-layout{grid-template-columns:minmax(0,1fr) 340px;align-items:start}.reserve-panel{position:sticky;top:90px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  `],
})
export class TourDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly carService = inject(CarService);
  private readonly campaigns = inject(CampaignService);
  private readonly commercialOffer = inject(CommercialOfferContextService);
  private readonly booking = inject(TourBookingV170Service);
  private readonly demandService = inject(TourDemandV170Service);
  private readonly seo = inject(SeoService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  private readonly campaignId = this.route.snapshot.queryParamMap.get("campaign") || "";
  private touchX = 0;

  readonly tour = signal<Tour | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly lightboxOpen = signal(false);
  readonly aboutOpen = signal(false);
  readonly routeOpen = signal(false);
  readonly scopeOpen = signal(false);
  readonly failedMedia = signal<string[]>([]);
  readonly reservationOpen = signal(false);
  readonly reservationStep = signal<1 | 2 | 3>(1);
  readonly personCount = signal(1);
  readonly reservationError = signal("");
  readonly submitting = signal(false);
  readonly reservationSuccess = signal(false);
  readonly reservationReference = signal("");
  readonly demand = signal<TourDemandV170 | null>(null);
  readonly demandLoading = signal(false);
  readonly today = new Date().toISOString().slice(0, 10);
  tourDate = "";
  firstName = "";
  lastName = "";
  phone = "";
  email = "";
  notes = "";

  readonly activeCampaign = computed<CampaignRecord | null>(() => {
    if (!this.campaignId) return null;
    return this.campaigns.publicCampaigns().find((campaign) => campaign.id === this.campaignId && campaign.isActive && campaign.publicationStatus === "PUBLISHED" && campaign.targetType === "TOUR" && String(campaign.targetId || "") === this.routeId) || null;
  });
  readonly mediaItems = computed<DetailMediaItem[]>(() => {
    const item = this.tour();
    if (!item) return [];
    const failed = new Set(this.failedMedia());
    const seen = new Set<string>();
    const rows: DetailMediaItem[] = [];
    for (const url of this.detailData.mediaUrls(item)) if (url && !failed.has(url) && !seen.has(url)) { seen.add(url); rows.push({ kind: "IMAGE", url, title: item.title || "Tur görseli" }); }
    for (const video of item.videos || []) if (video?.url && !failed.has(video.url) && !seen.has(video.url)) { seen.add(video.url); rows.push({ kind: "VIDEO", url: video.url, posterUrl: video.posterUrl || item.image, title: video.title || item.title || "Tur videosu" }); }
    return rows.slice(0, 30);
  });
  readonly activeMedia = computed(() => this.mediaItems()[Math.min(this.currentSlide(), Math.max(0, this.mediaItems().length - 1))] || null);
  readonly displayUnitPrice = computed(() => {
    const base = Number(this.tour()?.price || 0);
    const campaign = this.activeCampaign();
    if (!campaign) return base;
    if (campaign.newPrice != null && Number.isFinite(Number(campaign.newPrice))) return Math.max(0, Number(campaign.newPrice));
    if (campaign.discountMethod === "FIXED_PRICE") return Math.max(0, Number(campaign.discountValue || base));
    if (campaign.discountMethod === "PERCENT") return Math.max(0, Math.round(base * (100 - Number(campaign.discountValue || 0))) / 100);
    if (campaign.discountMethod === "FIXED_AMOUNT" && campaign.discountScope === "UNIT") return Math.max(0, base - Number(campaign.discountValue || 0));
    return base;
  });
  readonly itineraryRows = computed(() => (this.tour()?.itinerary || []).map((value, index) => this.itineraryText(value, index)).filter(Boolean));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.campaignId ? this.campaigns.refreshPublicState(true).catch(() => undefined) : Promise.resolve()]);
    const verified = this.activeCampaign();
    if (verified) this.commercialOffer.activateCampaign(verified);
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set("");
    try {
      const item = await this.detailData.load("TOUR", this.routeId) as Tour;
      this.tour.set(item);
      this.failedMedia.set([]);
      this.currentSlide.set(0);
      const config = this.carService.getConfig()();
      this.seo.updateSeoTags({ title: `${item.title || "Tur"} | Alperler Rent A Car`, description: `${item.title || "Tur"} için rota, süre, kişi başı fiyat ve rezervasyon bilgileri.`, image: item.image || config.seoOgImage });
    } catch (error) {
      this.tour.set(null);
      this.loadError.set(error instanceof Error ? error.message : "Tur verisi alınamadı.");
    } finally { this.loading.set(false); }
  }

  display(value: unknown): string { return this.detailData.display(value); }
  summaryMeta(item: Tour): string { return [item.duration, item.location, item.meetingPoint].filter(Boolean).join(" · ") || "Alperler Rent A Car tur deneyimi"; }
  previousMedia(): void { const length = this.mediaItems().length; if (length > 1) this.currentSlide.update((i) => (i - 1 + length) % length); }
  nextMedia(): void { const length = this.mediaItems().length; if (length > 1) this.currentSlide.update((i) => (i + 1) % length); }
  mediaFailed(url: string): void { this.failedMedia.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }
  openLightbox(): void { if (this.activeMedia()) this.lightboxOpen.set(true); }
  touchStart(event: TouchEvent): void { this.touchX = event.changedTouches[0]?.clientX || 0; }
  touchEnd(event: TouchEvent): void { const end = event.changedTouches[0]?.clientX || 0; if (Math.abs(end - this.touchX) < 45) return; end < this.touchX ? this.nextMedia() : this.previousMedia(); }
  mapHref(item: Tour): string {
    const record = item as Tour & { mapUrl?: string; latitude?: number; longitude?: number; locationName?: string };
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
    }

    const fallbackQuery = String(record.meetingPoint || record.locationName || record.location || "").trim();
    if (record.mapUrl && /^https:\/\//i.test(record.mapUrl)) {
      try {
        const parsed = new URL(record.mapUrl);
        const isGoogleMaps = /(^|\.)google\.[a-z.]+$/i.test(parsed.hostname) && parsed.pathname.startsWith("/maps");
        if (isGoogleMaps) {
          const mapQuery = String(parsed.searchParams.get("q") || parsed.searchParams.get("query") || fallbackQuery).trim();
          if (mapQuery) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
        }
        return parsed.toString();
      } catch {
        // Fall through to the validated location text instead of returning a malformed URL.
      }
    }
    return fallbackQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}` : "";
  }
  private focusAfterRender(selector: string): void { if (typeof window === "undefined") return; window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 0); }
  openReservation(): void { this.reservationOpen.set(true); this.reservationStep.set(1); this.reservationError.set(""); this.reservationSuccess.set(false); this.focusAfterRender(".reservation-overlay > header button"); }
  closeReservation(): void { if (!this.submitting()) { this.reservationOpen.set(false); this.focusAfterRender(".action-inner .reserve"); } }
  setReservationStep(step: 1 | 2 | 3): void { this.reservationStep.set(step); this.reservationError.set(""); this.focusAfterRender(`#tour-step-${step}`); }
  increasePerson(): void { if (this.personCount() < 1_000_000_000) this.personCount.update((value) => value + 1); }
  decreasePerson(): void { if (this.personCount() > 1) this.personCount.update((value) => value - 1); }
  setPersonCount(value: unknown): void { const number = Math.trunc(Number(value)); this.personCount.set(Number.isFinite(number) ? Math.min(1_000_000_000, Math.max(1, number)) : 1); }
  estimatedTotal(): number {
    const item = this.tour();
    if (!item) return 0;
    const persons = this.personCount();
    const normal = Math.max(0, Number(item.price || 0)) * persons;
    const campaign = this.activeCampaign();
    if (!campaign) return normal;
    if (campaign.newPrice != null && campaign.discountScope === "UNIT") return Math.max(0, Number(campaign.newPrice)) * persons;
    if (campaign.discountMethod === "FIXED_PRICE") return Math.max(0, Number(campaign.discountValue || 0)) * persons;
    if (campaign.discountMethod === "PERCENT") return Math.max(0, normal - normal * Number(campaign.discountValue || 0) / 100);
    if (campaign.discountMethod === "FIXED_AMOUNT") return Math.max(0, normal - Number(campaign.discountValue || 0) * (campaign.discountScope === "UNIT" ? persons : 1));
    return normal;
  }
  async onDateChange(value: string): Promise<void> {
    this.tourDate = value;
    this.reservationError.set("");
    this.demand.set(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    this.demandLoading.set(true);
    try { this.demand.set(await this.demandService.check(this.routeId, value)); } catch { this.demand.set(null); } finally { this.demandLoading.set(false); }
  }
  goToContact(): void { if (!this.tourDate || this.tourDate < this.today) { this.reservationError.set("Geçerli bir tur tarihi seçin."); return; } this.setReservationStep(2); }
  goToReview(): void { if (!this.firstName.trim() || !this.lastName.trim() || !/^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { this.reservationError.set("Ad, soyad, telefon ve geçerli e-posta bilgilerini tamamlayın."); return; } this.setReservationStep(3); }

  async submitReservation(): Promise<void> {
    const item = this.tour();
    if (!item || this.submitting()) return;
    this.submitting.set(true);
    this.reservationError.set("");
    try {
      const record = await this.booking.create({
        itemId: String(item.cloudId || item.id),
        image: item.image,
        startDate: this.tourDate,
        personCount: this.personCount(),
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`,
        customerEmail: this.email.trim(),
        customerPhone: this.phone.trim(),
        notes: this.notes.trim(),
      });
      this.reservationReference.set(record.id);
      this.reservationSuccess.set(true);
    } catch (error) {
      console.error("Tour booking failed", error);
      this.reservationError.set("Rezervasyon kaydedilemedi. Tarih, kişi sayısı ve kampanya koşullarını kontrol edip tekrar deneyin.");
    } finally { this.submitting.set(false); }
  }

  formattedTourDate(): string { if (!this.tourDate) return "Seçilmedi"; const date = new Date(`${this.tourDate}T12:00:00`); return Number.isNaN(date.getTime()) ? this.tourDate : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date); }
  whatsapp(): void { const item = this.tour(); if (!item) return; const config = this.carService.getConfig()(); const phone = String(config.whatsapp || config.phone || "").replace(/\D/g, ""); if (!phone) return; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Merhaba, ${item.title || "tur"} hakkında bilgi almak istiyorum. ${window.location.href}`)}`, "_blank", "noopener,noreferrer"); }
  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/tours"]); }
  private itineraryText(value: unknown, index: number): string { if (typeof value === "string") return value.trim(); if (value && typeof value === "object") { const row = value as Record<string, unknown>; return String(row["title"] || row["name"] || row["description"] || row["label"] || `Program adımı ${index + 1}`).trim(); } return ""; }
}
