import { CommonModule } from "@angular/common";
import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { VehicleCardComponent } from "../../components/vehicle-card.component";
import { Vehicle } from "../../models/car.model";
import { AdminManagementService } from "../../services/admin-management.service";
import {
  CatalogAdminEditorService,
  TourAdminRecord,
  VehicleAdminRecord,
} from "../../services/catalog-admin-editor.service";
import {
  CatalogMediaItem,
  CatalogMediaService,
} from "../../services/catalog-media.service";
import { ToastService } from "../../services/toast.service";

export type CatalogWorkspaceMode = "RENTAL" | "SALE" | "TOUR";
type WorkspaceStep = 1 | 2 | 3 | 4;
/** Sekmeler arası geçişte liste anında görünsün diye mod başına son liste (titreme yok). */
const catalogCache = new Map<string, VehicleAdminRecord[] | TourAdminRecord[]>();

@Component({
  selector: "app-admin-catalog-workspace",
  standalone: true,
  imports: [CommonModule, FormsModule, VehicleCardComponent],
  template: `
    <main class="workspace-page">
      <div class="shell">
          <header class="toolbar">
            <h1>{{ pageTitle() }} <span class="count" aria-live="polite">{{ resultCount() }} kayıt</span></h1>
            <div class="toolbar-actions">
              <input [(ngModel)]="search" type="search" [attr.aria-label]="modeLabel() + ' kayıtlarında ara'" [placeholder]="searchPlaceholder()" autocomplete="off" />
              <button type="button" class="ghost" (click)="refresh()" [disabled]="loading()" aria-label="Listeyi yenile">Yenile</button>
              <button type="button" class="primary" (click)="createNew()" [disabled]="saving()">+ {{ newButtonLabel() }}</button>
            </div>
          </header>

          @if (error()) {<div class="alert" role="alert"><strong>Liste yüklenemedi.</strong> {{ error() }}</div>}

          <section class="list-panel" [attr.aria-label]="modeLabel() + ' listesi'">
            @if (loading()) {
              <div class="empty" role="status">Kayıtlar yükleniyor…</div>
            } @else if (mode === 'TOUR') {
              <ul class="rows">
                @for (item of filteredTours(); track item.id) {
                  <li>
                    <button type="button" class="row" [id]="'row-' + item.id" (click)="viewTour(item)" [attr.aria-label]="tourRowLabel(item)">
                      <span class="thumb" aria-hidden="true">@if(item.coverImage || item.images[0]){<img [src]="item.coverImage || item.images[0]" alt="" loading="lazy"/>}</span>
                      <span class="copy"><strong>{{ item.title || 'İsimsiz tur' }}</strong><small>{{ item.duration || 'Süre girilmedi' }} · {{ item.pricePerPerson | number:'1.0-0' }} TL/kişi</small></span>
                      <span class="badge" [class]="'badge s-' + item.publicationStatus.toLowerCase()">{{ statusLabel(item.publicationStatus) }}</span>
                      <span class="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                } @empty {<li class="empty">Aramanıza uygun tur bulunamadı.</li>}
              </ul>
            } @else {
              <ul class="rows">
                @for (item of filteredVehicles(); track item.id) {
                  <li>
                    <button type="button" class="row" [id]="'row-' + item.id" (click)="viewVehicle(item)" [attr.aria-label]="vehicleRowLabel(item)">
                      <span class="thumb" aria-hidden="true">@if(item.coverImage || item.images[0]){<img [src]="item.coverImage || item.images[0]" alt="" loading="lazy"/>}</span>
                      <span class="copy"><strong>{{ item.brand || 'Marka' }} {{ item.model || 'Model' }}</strong><small>{{ item.modelYear || 'Yıl yok' }} · {{ item.stockCode || 'Stok kodu yok' }}{{ priceMeta(item) }}</small></span>
                      <span class="badge" [class]="'badge s-' + item.publicationStatus.toLowerCase()">{{ statusLabel(item.publicationStatus) }}</span>
                      <span class="chev" aria-hidden="true">›</span>
                    </button>
                  </li>
                } @empty {<li class="empty">Aramanıza uygun araç bulunamadı.</li>}
              </ul>
            }
          </section>

        @if (viewingVehicle() || viewingTour() || selectedVehicle() || selectedTour()) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-labelledby]="'sheet-title'" (keydown.escape)="closeSheet()">
            @if ((viewingVehicle() || viewingTour()) && !selectedVehicle() && !selectedTour()) {
              <section class="detail-shell">
                <header class="detail-head">
                  <button type="button" class="back" (click)="closeSheet()" aria-label="Listeye dön">←</button>
                  <h2 id="sheet-title" tabindex="-1" #sheetTitle>{{ viewingTitle() }}</h2>
                  <span [class]="'badge s-' + viewingStatus().toLowerCase()">{{ statusLabel(viewingStatus()) }}</span>
                </header>
                @if (viewingVehicle(); as car) {
                  <div class="detail-body">
                    <div class="detail-media">@if (car.coverImage || car.images[0]) {<img [src]="car.coverImage || car.images[0]" [alt]="car.brand + ' ' + car.model + ' kapak görseli'" />} @else {<div class="no-media">Görsel yok</div>}</div>
                    <dl class="facts">
                      <div><dt>Fiyat</dt><dd>{{ priceMeta(car) ? priceMeta(car).slice(3) : 'Girilmedi' }}</dd></div>
                      <div><dt>Model yılı</dt><dd>{{ car.modelYear || '—' }}</dd></div>
                      <div><dt>Stok kodu</dt><dd>{{ car.stockCode || '—' }}</dd></div>
                      <div><dt>Yakıt</dt><dd>{{ car.fuelType || '—' }}</dd></div>
                      <div><dt>Vites</dt><dd>{{ car.transmission || '—' }}</dd></div>
                      <div><dt>Kasa</dt><dd>{{ car.bodyType || '—' }}</dd></div>
                      <div><dt>Renk</dt><dd>{{ car.color || '—' }}</dd></div>
                      <div><dt>Konum</dt><dd>{{ car.location || '—' }}</dd></div>
                      <div><dt>Müsaitlik</dt><dd>{{ availabilityLabel(car.availabilityStatus) }}</dd></div>
                      <div><dt>Şube</dt><dd>{{ branchName(car.branchId) }}</dd></div>
                      <div><dt>Görsel sayısı</dt><dd>{{ car.images.length }}</dd></div>
                      <div><dt>Veri doğrulama</dt><dd>{{ qualityLabel(car.dataQualityStatus) }}</dd></div>
                    </dl>
                    @if (car.description) {<p class="desc">{{ car.description }}</p>}
                    @if (car.features.length) {<div class="chips">@for (feature of car.features.slice(0, 16); track feature) {<span>{{ feature }}</span>}</div>}
                  </div>
                  <footer class="detail-actions">
                    <button type="button" class="primary" (click)="editVehicle(car)">Düzenle</button>
                    @if (car.publicationStatus !== 'PUBLISHED') {<button type="button" class="ghost" (click)="quickStatus(car, 'PUBLISHED')" [disabled]="saving()">Yayınla</button>}
                    @if (car.publicationStatus !== 'ARCHIVED') {<button type="button" class="ghost danger" (click)="quickStatus(car, 'ARCHIVED')" [disabled]="saving()">Arşivle</button>} @else {<button type="button" class="ghost" (click)="quickStatus(car, 'DRAFT')" [disabled]="saving()">Taslağa Al</button>}
                    <a class="ghost link" [href]="mode==='RENTAL' ? '/fleet/'+car.id : '/sales/'+car.id" target="_blank" rel="noopener">Müşteri sayfası</a>
                  </footer>
                }
                @if (viewingTour(); as tour) {
                  <div class="detail-body">
                    <div class="detail-media">@if (tour.coverImage || tour.images[0]) {<img [src]="tour.coverImage || tour.images[0]" [alt]="tour.title + ' kapak görseli'" />} @else {<div class="no-media">Görsel yok</div>}</div>
                    <dl class="facts">
                      <div><dt>Kişi başı</dt><dd>{{ tour.pricePerPerson | number:'1.0-0' }} TL</dd></div>
                      <div><dt>Süre</dt><dd>{{ tour.duration || '—' }}</dd></div>
                      <div><dt>Kapasite</dt><dd>{{ tour.capacity || '—' }}</dd></div>
                      <div><dt>Konum</dt><dd>{{ tour.locationName || '—' }}</dd></div>
                      <div><dt>Buluşma</dt><dd>{{ tour.meetingPoint || '—' }}</dd></div>
                      <div><dt>Şube</dt><dd>{{ branchName(tour.branchId) }}</dd></div>
                      <div><dt>Görsel sayısı</dt><dd>{{ tour.images.length }}</dd></div>
                      <div><dt>Veri doğrulama</dt><dd>{{ qualityLabel(tour.dataQualityStatus) }}</dd></div>
                    </dl>
                    @if (tour.shortDescription || tour.description) {<p class="desc">{{ tour.shortDescription || tour.description }}</p>}
                  </div>
                  <footer class="detail-actions">
                    <button type="button" class="primary" (click)="editTour(tour)">Düzenle</button>
                    @if (tour.publicationStatus !== 'PUBLISHED') {<button type="button" class="ghost" (click)="quickStatus(tour, 'PUBLISHED')" [disabled]="saving()">Yayınla</button>}
                    @if (tour.publicationStatus !== 'ARCHIVED') {<button type="button" class="ghost danger" (click)="quickStatus(tour, 'ARCHIVED')" [disabled]="saving()">Arşivle</button>} @else {<button type="button" class="ghost" (click)="quickStatus(tour, 'DRAFT')" [disabled]="saving()">Taslağa Al</button>}
                    <a class="ghost link" [href]="'/tour/'+tour.id" target="_blank" rel="noopener">Müşteri sayfası</a>
                  </footer>
                }
              </section>
            } @else {
          <section class="editor-shell">
            <header class="editor-head">
              <button type="button" class="back" (click)="closeSheet()">← Geri</button>
              <div><p>{{ selectedTitle() }}</p><strong id="sheet-title" tabindex="-1" #sheetTitle>{{ stepTitle() }}</strong></div>
              <span>{{ step() }}/4</span>
            </header>

            <nav class="steps" aria-label="İçerik oluşturma adımları">
              @for (item of stepItems; track item.id) {
                <button type="button" [class.active]="step()===item.id" [class.done]="step()>item.id" (click)="step.set(item.id)"><b>{{ item.id }}</b><span>{{ item.label }}</span></button>
              }
            </nav>

            @if (step() === 1) {
              <section class="panel media-first">
                <header><h2>Fotoğraf & Video</h2><p>Bu medya yalnız bu {{ entityNoun() }} kaydına aittir. Ortak galeri kullanılmaz.</p></header>
                <label class="upload-zone">
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" (change)="uploadFiles($event)" />
                  <strong>{{ uploading() ? 'Yükleniyor %' + mediaService.uploadProgress() : 'Fotoğraf veya Video Dosyası Seç' }}</strong>
                  <span>JPEG, PNG, WebP, AVIF, MP4, WebM · en fazla 50 MB/dosya</span>
                </label>
                <div class="media-grid">
                  @for(item of media(); track item.id) {
                    <article class="media-card">
                      <div class="media-preview">
                        @if(item.kind==='IMAGE'){<img [src]="item.url" [alt]="item.altText || selectedTitle()"/>}
                        @else{<video [src]="item.url" [poster]="item.posterUrl" controls playsinline preload="metadata"></video>}
                        @if(item.isCover){<b>KAPAK</b>}
                      </div>
                      <label><span>Alternatif metin</span><input [ngModel]="item.altText" (ngModelChange)="updateAlt(item,$event)" /></label>
                      <div class="media-actions">@if(item.kind==='IMAGE'){<button type="button" (click)="makeCover(item)" [disabled]="item.isCover">Kapak Yap</button>}<button type="button" class="danger" (click)="removeMedia(item)">Kaldır</button></div>
                    </article>
                  } @empty {<div class="empty">Henüz bu kayda ait medya yüklenmedi.</div>}
                </div>
              </section>
            }

            @if (step() === 2 && selectedVehicle(); as car) {
              <section class="panel">
                <header><h2>Kart & Temel Bilgiler</h2><p>Müşterinin liste kartında ve detay başlığında göreceği temel bilgiler.</p></header>
                <div class="form-grid">
                  <label class="wide"><span>İlan başlığı</span><input [ngModel]="meta(car,'title')" (ngModelChange)="setMeta(car,'title',$event)" /></label>
                  <label><span>Marka</span><input [(ngModel)]="car.brand" required /></label>
                  <label><span>Model / Paket</span><input [(ngModel)]="car.model" required /></label>
                  <label><span>Seri</span><input [ngModel]="meta(car,'series')" (ngModelChange)="setMeta(car,'series',$event)" /></label>
                  <label><span>Model yılı</span><input [(ngModel)]="car.modelYear" type="number" min="1950" max="2100" /></label>
                  <label><span>Stok kodu</span><input [(ngModel)]="car.stockCode" required /></label>
                  <label><span>Rozet</span><input [ngModel]="meta(car,'badge')" (ngModelChange)="setMeta(car,'badge',$event)" placeholder="YENİ, PREMIUM, FIRSAT" /></label>
                  @if(mode==='RENTAL'){
                    <label><span>Günlük fiyat TL</span><input [(ngModel)]="car.rentalPriceDaily" type="number" min="0" /></label>
                    <label class="check wide"><input type="checkbox" [ngModel]="meta(car,'hourlyRentalEnabled')===true" (ngModelChange)="setMeta(car,'hourlyRentalEnabled',$event)"/> Saatlik kiralama aktif</label>
                    <label><span>Saatlik fiyat TL</span><input [ngModel]="meta(car,'hourlyPrice')" (ngModelChange)="setMetaNumber(car,'hourlyPrice',$event)" type="number" min="0" step="0.01" /></label>
                    <label><span>Minimum kiralama saati</span><input [ngModel]="meta(car,'minimumRentalHours') || 1" (ngModelChange)="setMetaNumber(car,'minimumRentalHours',$event)" type="number" min="1" max="23" /></label>
                    <label><span>Saatlik KM limiti</span><input [ngModel]="meta(car,'hourlyMileageLimit')" (ngModelChange)="setMetaNumber(car,'hourlyMileageLimit',$event)" type="number" min="0" /></label>
                  } @else {
                    <label><span>Satış fiyatı TL</span><input [(ngModel)]="car.price" type="number" min="0" /></label>
                    <label><span>Kilometre</span><input [(ngModel)]="car.mileageKm" type="number" min="0" /></label>
                  }
                  <label><span>Yakıt</span><input [(ngModel)]="car.fuelType" /></label>
                  <label><span>Vites</span><input [(ngModel)]="car.transmission" /></label>
                  <label><span>Kasa tipi</span><input [(ngModel)]="car.bodyType" /></label>
                  <label><span>Renk</span><input [(ngModel)]="car.color" /></label>
                  <label><span>Konum</span><input [(ngModel)]="car.location" /></label>
                  <label><span>SEO adresi</span><input [(ngModel)]="car.seoSlug" /></label>
                  <label class="wide"><span>Kısa / detay açıklaması</span><textarea [(ngModel)]="car.description" rows="6"></textarea></label>
                </div>
              </section>
            }

            @if (step() === 2 && selectedTour(); as tour) {
              <section class="panel">
                <header><h2>Tur Kartı & Temel Bilgiler</h2><p>Tur kartı ve detay sayfasının ana başlık bilgileri.</p></header>
                <div class="form-grid">
                  <label class="wide"><span>Tur adı</span><input [(ngModel)]="tour.title" required /></label>
                  <label><span>Kategori</span><input [(ngModel)]="tour.category" /></label>
                  <label><span>Fiyat / kişi TL</span><input [(ngModel)]="tour.pricePerPerson" type="number" min="0" /></label>
                  <label><span>Süre</span><input [(ngModel)]="tour.duration" /></label>
                  <label><span>Kapasite</span><input [(ngModel)]="tour.capacity" type="number" min="1" /></label>
                  <label><span>SEO adresi</span><input [(ngModel)]="tour.seoSlug" required /></label>
                  <label class="wide"><span>Kısa açıklama</span><textarea [(ngModel)]="tour.shortDescription" rows="3"></textarea></label>
                  <label class="wide"><span>Detaylı açıklama</span><textarea [(ngModel)]="tour.description" rows="7"></textarea></label>
                  <label><span>Rozet</span><input [ngModel]="meta(tour,'badge')" (ngModelChange)="setMeta(tour,'badge',$event)" /></label>
                  <label><span>Şube</span><select [(ngModel)]="tour.branchId"><option [ngValue]="undefined">Şube seçin</option>@for(branch of branches();track branch.id){<option [ngValue]="branch.id">{{branch.name}} · {{branch.city}}</option>}</select></label>
                </div>
              </section>
            }

            @if (step() === 3 && selectedVehicle(); as car) {
              <div class="stack">
                <section class="panel">
                  <header><h2>Teknik Özellikler</h2><p>Detay sayfasında görünen teknik bilgiler.</p></header>
                  <div class="form-grid">
                    <label><span>Motor</span><input [(ngModel)]="car.engine" /></label>
                    <label><span>Motor gücü</span><input [ngModel]="meta(car,'enginePower')" (ngModelChange)="setMeta(car,'enginePower',$event)" /></label>
                    <label><span>Çekiş</span><input [ngModel]="meta(car,'drivetrain')" (ngModelChange)="setMeta(car,'drivetrain',$event)" /></label>
                    <label><span>Tork</span><input [ngModel]="meta(car,'torque')" (ngModelChange)="setMeta(car,'torque',$event)" /></label>
                    <label><span>Koltuk</span><input [(ngModel)]="car.seats" type="number" min="1" /></label>
                    <label><span>Kapı</span><input [(ngModel)]="car.doors" type="number" min="1" /></label>
                    <label><span>Silindir</span><input [ngModel]="meta(car,'cylinderCount')" (ngModelChange)="setMetaNumber(car,'cylinderCount',$event)" type="number" min="1" max="16" /></label>
                    <label><span>0-100</span><input [ngModel]="meta(car,'acceleration')" (ngModelChange)="setMeta(car,'acceleration',$event)" /></label>
                    <label><span>Maksimum hız</span><input [ngModel]="meta(car,'maxSpeed')" (ngModelChange)="setMeta(car,'maxSpeed',$event)" /></label>
                    <label><span>Ortalama tüketim</span><input [ngModel]="meta(car,'fuelConsumption')" (ngModelChange)="setMeta(car,'fuelConsumption',$event)" /></label>
                    <label><span>Şehir içi tüketim</span><input [ngModel]="meta(car,'cityFuelConsumption')" (ngModelChange)="setMeta(car,'cityFuelConsumption',$event)" /></label>
                    <label><span>Şehir dışı tüketim</span><input [ngModel]="meta(car,'highwayFuelConsumption')" (ngModelChange)="setMeta(car,'highwayFuelConsumption',$event)" /></label>
                    <label><span>Yakıt deposu</span><input [ngModel]="meta(car,'fuelTankCapacity')" (ngModelChange)="setMeta(car,'fuelTankCapacity',$event)" /></label>
                    <label><span>Bagaj hacmi</span><input [ngModel]="meta(car,'trunkVolume')" (ngModelChange)="setMeta(car,'trunkVolume',$event)" /></label>
                    <label><span>Jant / lastik</span><input [ngModel]="meta(car,'wheelSize')" (ngModelChange)="setMeta(car,'wheelSize',$event)" /></label>
                    <label><span>Ağırlık</span><input [ngModel]="meta(car,'weight')" (ngModelChange)="setMeta(car,'weight',$event)" /></label>
                    <label><span>Uzunluk</span><input [ngModel]="meta(car,'length')" (ngModelChange)="setMeta(car,'length',$event)" /></label>
                    <label><span>Genişlik</span><input [ngModel]="meta(car,'width')" (ngModelChange)="setMeta(car,'width',$event)" /></label>
                    <label><span>Yükseklik</span><input [ngModel]="meta(car,'height')" (ngModelChange)="setMeta(car,'height',$event)" /></label>
                  </div>
                </section>

                @if(mode==='RENTAL'){
                  <section class="panel"><header><h2>Kiralama Koşulları</h2></header><div class="form-grid">
                    <label><span>Araç sınıfı</span><input [ngModel]="meta(car,'group')" (ngModelChange)="setMeta(car,'group',$event)" /></label>
                    <label><span>Bagaj adedi</span><input [ngModel]="meta(car,'luggage')" (ngModelChange)="setMetaNumber(car,'luggage',$event)" type="number" min="0" /></label>
                    <label><span>Şoför seçeneği</span><select [ngModel]="meta(car,'driverOption') || 'BOTH'" (ngModelChange)="setMeta(car,'driverOption',$event)"><option value="WITH_DRIVER">Şoförlü</option><option value="WITHOUT_DRIVER">Şoförsüz</option><option value="BOTH">Her ikisi</option></select></label>
                    <label><span>Depozito TL</span><input [ngModel]="meta(car,'deposit')" (ngModelChange)="setMetaNumber(car,'deposit',$event)" type="number" min="0" /></label>
                    <label><span>Minimum yaş</span><input [ngModel]="meta(car,'minAge')" (ngModelChange)="setMetaNumber(car,'minAge',$event)" type="number" min="18" /></label>
                    <label><span>Minimum ehliyet yılı</span><input [ngModel]="meta(car,'minLicenseYears')" (ngModelChange)="setMetaNumber(car,'minLicenseYears',$event)" type="number" min="0" /></label>
                    <label><span>Günlük KM limiti</span><input [ngModel]="meta(car,'dailyMileageLimit')" (ngModelChange)="setMetaNumber(car,'dailyMileageLimit',$event)" type="number" min="0" /></label>
                  </div></section>
                } @else {
                  <section class="panel"><header><h2>Ekspertiz & Satış Doğruluğu</h2><p>Müşteriye sunulan hasar ve tramer bilgileri aynı kaydın içinde yönetilir.</p></header><div class="form-grid">
                    <label class="wide"><span>Hasar / boya özeti</span><input [ngModel]="meta(car,'damageStatus')" (ngModelChange)="setMeta(car,'damageStatus',$event)" /></label>
                    <label><span>Tramer durumu</span><select [ngModel]="saleTramerStatus(car)" (ngModelChange)="setSaleTramerStatus(car,$event)"><option value="UNKNOWN">Bilinmiyor</option><option value="DECLARED_CLEAN">Beyan: kayıt yok</option><option value="DECLARED_RECORD">Beyan: kayıt var</option><option value="VERIFIED_CLEAN">Doğrulandı: kayıt yok</option><option value="VERIFIED_RECORD">Doğrulandı: kayıt var</option></select></label>
                    <label><span>Toplam tramer TL</span><input [ngModel]="meta(car,'tramerAmount')" (ngModelChange)="setOptionalMetaNumber(car,'tramerAmount',$event)" type="number" min="0" /></label>
                    <label class="wide"><span>Tramer açıklaması</span><textarea [ngModel]="meta(car,'tramer')" (ngModelChange)="setMeta(car,'tramer',$event)" rows="3"></textarea></label>
                    <label><span>Garanti</span><input [ngModel]="meta(car,'warranty')" (ngModelChange)="setMeta(car,'warranty',$event)" /></label>
                    <label class="check"><input type="checkbox" [ngModel]="meta(car,'isDamageFree')===true" (ngModelChange)="setMeta(car,'isDamageFree',$event)"/> Hasarsız / hatasız beyanı</label>
                    @if(isVerifiedSaleTramer(car)){
                      <label><span>Doğrulama kaynağı</span><input [ngModel]="meta(car,'tramerSourceName')" (ngModelChange)="setMeta(car,'tramerSourceName',$event)" /></label>
                      <label><span>Kaynak HTTPS URL</span><input [ngModel]="meta(car,'tramerSourceUrl')" (ngModelChange)="setMeta(car,'tramerSourceUrl',$event)" type="url" /></label>
                      <label><span>Doğrulama zamanı</span><input [ngModel]="meta(car,'tramerVerifiedAt')" (ngModelChange)="setMeta(car,'tramerVerifiedAt',$event)" type="datetime-local" /></label>
                    }
                    <div class="wide expertise"><strong>Parça Bazlı Ekspertiz</strong><div class="form-grid">@for(part of saleParts;track part.key){<label><span>{{part.label}}</span><select [ngModel]="salePartStatus(car,part.key)" (ngModelChange)="setSalePart(car,part.key,$event)"><option value="">Bilgi yok</option><option value="original">Orijinal</option><option value="local_painted">Lokal boyalı</option><option value="painted">Boyalı</option><option value="changed">Değişen</option></select></label>}</div></div>
                  </div></section>
                }

                <section class="panel"><header><h2>Donanım & Yayın Kaynağı</h2></header><div class="form-grid">
                  <label class="wide"><span>Özellikler, satır başına bir</span><textarea [ngModel]="car.features.join('\n')" (ngModelChange)="car.features=splitLines($event)" rows="7"></textarea></label>
                  <label><span>Şube</span><select [(ngModel)]="car.branchId"><option [ngValue]="undefined">Şube seçin</option>@for(branch of branches();track branch.id){<option [ngValue]="branch.id">{{branch.name}} · {{branch.city}}</option>}</select></label>
                  <label><span>Müsaitlik</span><select [(ngModel)]="car.availabilityStatus"><option value="AVAILABLE">Müsait / Satışta</option><option value="RESERVED">Rezerve</option><option value="RENTED">Kirada</option><option value="SOLD">Satıldı</option><option value="MAINTENANCE">Bakımda</option></select></label>
                  <label><span>Veri doğrulama</span><select [(ngModel)]="car.dataQualityStatus"><option value="BUSINESS_VERIFIED">İşletme doğruladı</option><option value="RESEARCHED">Araştırma ile tamamlandı</option><option value="UNVERIFIED">Kontrol edilmedi</option></select></label>
                  <label class="check"><input type="checkbox" [(ngModel)]="car.actualVehicleVerified"/> Gerçek araç fiziksel olarak doğrulandı</label>
                  <label><span>Teknik kaynak adı</span><input [(ngModel)]="car.specSourceName" /></label>
                  <label><span>Teknik kaynak URL</span><input [(ngModel)]="car.specSourceUrl" type="url" /></label>
                </div></section>
              </div>
            }

            @if (step() === 3 && selectedTour(); as tour) {
              <div class="stack">
                <section class="panel"><header><h2>Tur Programı & Kapsam</h2><p>Detay sayfasındaki rota ve dahil/hariç bölümleri.</p></header><div class="form-grid">
                  <label class="wide"><span>Tur programı, her satır bir adım</span><textarea [ngModel]="itineraryLines(tour)" (ngModelChange)="tour.itinerary=splitLines($event)" rows="7" placeholder="Otel/merkezden hareket&#10;Şelale durağı&#10;Öğle yemeği&#10;Dönüş"></textarea></label>
                  <label class="wide"><span>Öne çıkanlar</span><textarea [ngModel]="metaArray(tour,'highlights').join('\n')" (ngModelChange)="setMeta(tour,'highlights',splitLines($event))" rows="5"></textarea></label>
                  <label class="wide"><span>Fiyata dahil</span><textarea [ngModel]="tour.includedItems.join('\n')" (ngModelChange)="tour.includedItems=splitLines($event)" rows="5"></textarea></label>
                  <label class="wide"><span>Fiyata dahil değil</span><textarea [ngModel]="tour.excludedItems.join('\n')" (ngModelChange)="tour.excludedItems=splitLines($event)" rows="5"></textarea></label>
                </div></section>
                <section class="panel"><header><h2>Konum, GPS & Kaynak</h2></header><div class="form-grid">
                  <label class="wide"><span>Konum adı</span><input [(ngModel)]="tour.locationName" /></label>
                  <label><span>Enlem</span><input [(ngModel)]="tour.latitude" type="number" step="0.000001" min="-90" max="90" /></label>
                  <label><span>Boylam</span><input [(ngModel)]="tour.longitude" type="number" step="0.000001" min="-180" max="180" /></label>
                  <label class="wide"><span>Google Maps / Harita URL</span><input [(ngModel)]="tour.mapUrl" type="url" /></label>
                  <label class="wide"><span>Buluşma noktası</span><input [(ngModel)]="tour.meetingPoint" /></label>
                  <label><span>Veri doğrulama</span><select [(ngModel)]="tour.dataQualityStatus"><option value="BUSINESS_VERIFIED">İşletme doğruladı</option><option value="RESEARCHED">Araştırma ile doğrulandı</option><option value="UNVERIFIED">Kontrol edilmedi</option></select></label>
                  <label><span>Kaynak adı</span><input [(ngModel)]="tour.sourceName" /></label>
                  <label class="wide"><span>Kaynak HTTPS URL</span><input [(ngModel)]="tour.sourceUrl" type="url" /></label>
                </div></section>
              </div>
            }

            @if (step() === 4) {
              <div class="preview-layout">
                <section class="panel">
                  <header><h2>Önizleme</h2><p>Yayınlamadan önce müşterinin göreceği ana içeriği kontrol edin.</p></header>
                  @if(selectedVehicle();as car){<app-vehicle-card [car]="previewVehicle(car)"></app-vehicle-card><div class="detail-preview"><h3>{{car.brand}} {{car.model}}</h3><p>{{car.description}}</p><div>@for(feature of car.features.slice(0,12);track feature){<span>{{feature}}</span>}</div></div>}
                  @if(selectedTour();as tour){<div class="tour-preview"><div class="preview-image">@if(tour.coverImage || tour.images[0]){<img [src]="tour.coverImage || tour.images[0]" [alt]="tour.title"/>}</div><h3>{{tour.title}}</h3><p>{{tour.shortDescription || tour.description}}</p><strong>{{tour.pricePerPerson | number:'1.0-0'}} TL / kişi</strong><small>{{tour.duration}} · {{tour.locationName || tour.meetingPoint}}</small></div>}
                </section>
                <section class="panel publish-panel">
                  <header><h2>Yayınlama</h2><p>Taslak, planlı yayın, canlı yayın veya arşiv.</p></header>
                  @if(selectedVehicle();as car){
                    <label><span>Planlanan tarih</span><input [(ngModel)]="car.scheduledAt" type="datetime-local" /></label>
                    <label class="check"><input type="checkbox" [(ngModel)]="car.isFeatured"/> Ana sayfada öne çıkar</label>
                    <div class="publish-actions"><button type="button" (click)="saveVehicleAs('DRAFT')" [disabled]="saving()">Taslak Kaydet</button><button type="button" class="schedule" (click)="saveVehicleAs('SCHEDULED')" [disabled]="saving()">Planla</button><button type="button" class="publish" (click)="saveVehicleAs('PUBLISHED')" [disabled]="saving()">Canlı Yayınla</button><button type="button" class="archive" (click)="saveVehicleAs('ARCHIVED')" [disabled]="saving()">Arşivle</button></div>
                    <a class="public-link" [href]="mode==='RENTAL' ? '/fleet/'+car.id : '/sales/'+car.id" target="_blank" rel="noopener">Müşteri detay sayfasını aç</a>
                  }
                  @if(selectedTour();as tour){
                    <label><span>Planlanan tarih</span><input [(ngModel)]="tour.scheduledAt" type="datetime-local" /></label>
                    <label class="check"><input type="checkbox" [(ngModel)]="tour.isFeatured"/> Ana sayfada öne çıkar</label>
                    <div class="publish-actions"><button type="button" (click)="saveTourAs('DRAFT')" [disabled]="saving()">Taslak Kaydet</button><button type="button" class="schedule" (click)="saveTourAs('SCHEDULED')" [disabled]="saving()">Planla</button><button type="button" class="publish" (click)="saveTourAs('PUBLISHED')" [disabled]="saving()">Canlı Yayınla</button><button type="button" class="archive" (click)="saveTourAs('ARCHIVED')" [disabled]="saving()">Arşivle</button></div>
                    <a class="public-link" [href]="'/tour/'+tour.id" target="_blank" rel="noopener">Müşteri detay sayfasını aç</a>
                  }
                </section>
              </div>
            }

            <footer class="editor-nav">
              <button type="button" class="ghost" (click)="previousStep()" [disabled]="step()===1">← Önceki</button>
              <div><button type="button" class="ghost" (click)="saveProgress()" [disabled]="saving()">{{ saving() ? 'Kaydediliyor…' : 'Taslağı Kaydet' }}</button>@if(step()<4){<button type="button" class="primary" (click)="nextStep()">Sonraki →</button>}</div>
            </footer>
          </section>
            }
          </div>
        }
      </div>
    </main>
  `,
  styles: [`
.sheet{position:fixed;inset:0;z-index:200;overflow-y:auto;background:#f4f7fb;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.detail-shell{width:min(100%,900px);margin:auto;padding:8px 8px 28px}.detail-head{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;background:#f4f7fb;padding:6px 0}.detail-head .back,.editor-head .back{min-height:38px;min-width:38px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#0f172a;font-weight:900}.detail-head h2{flex:1;min-width:0;margin:0;font-size:16px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.detail-head h2:focus{outline:none}.detail-body{border:1px solid #dbe4ef;border-radius:14px;background:#fff;padding:12px}.detail-media{aspect-ratio:16/9;overflow:hidden;border-radius:10px;background:#e2e8f0}.detail-media img{width:100%;height:100%;object-fit:cover}.no-media{display:grid;height:100%;place-items:center;color:#64748b;font-size:12px}.facts{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin:12px 0 0}.facts div{display:flex;flex-direction:column;min-width:0}.facts dt{color:#64748b;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.facts dd{margin:0;font-size:13px;font-weight:800;overflow-wrap:anywhere}.desc{margin:12px 0 0;color:#334155;font-size:13px;line-height:1.6}.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.chips span{border-radius:999px;background:#f1f5f9;padding:4px 8px;font-size:11px}.detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}.detail-actions>*{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:10px;font-size:12px;font-weight:900;text-decoration:none;cursor:pointer}.detail-actions .link{color:#1d4ed8}.danger{color:#be123c}.sheet .editor-shell{width:min(100%,1100px);margin:8px auto}@media(min-width:720px){.facts{grid-template-columns:repeat(3,1fr)}.detail-actions{display:flex;flex-wrap:wrap}}
    :host{display:block;background:#f4f7fb;color:#0f172a}.workspace-page{padding:8px 8px 16px}.shell{width:min(100%,1380px);margin:auto}.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 8px}.toolbar h1{margin:0;font-size:15px;font-weight:950}.toolbar .count{margin-left:6px;color:#64748b;font-size:11px;font-weight:700}.toolbar-actions{display:flex;flex:1 1 320px;gap:6px}.toolbar-actions input{flex:1 1 120px;min-width:0;min-height:40px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 10px;font-size:13px}.toolbar-actions button{min-height:40px;flex:0 0 auto;border-radius:10px;padding:0 12px;font-size:12px;font-weight:900}.primary{border:0;background:#2563eb;color:white}.ghost{border:1px solid #dbe4ef;background:white;color:#0f172a}.alert{margin:0 0 8px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;padding:10px 12px;color:#9f1239;font-size:12px;line-height:1.5}.alert strong{display:block;margin-bottom:2px}.list-panel,.editor-shell{border:1px solid #dbe4ef;border-radius:14px;background:white;box-shadow:0 4px 14px rgba(15,23,42,.04);overflow:hidden}.editor-shell{margin-top:8px}.rows{list-style:none;margin:0;padding:0}.rows li{border-bottom:1px solid #eef2f7}.rows li:last-child{border-bottom:0}.row{display:grid;width:100%;grid-template-columns:56px minmax(0,1fr) auto 14px;align-items:center;gap:10px;min-height:56px;border:0;background:white;padding:6px 10px 6px 8px;text-align:left;color:inherit;cursor:pointer}.row:hover{background:#f8fafc}.row:focus-visible{outline:2px solid #2563eb;outline-offset:-2px;background:#eff6ff}.thumb{display:block;width:56px;height:42px;overflow:hidden;border-radius:8px;background:#e2e8f0}.thumb img{width:100%;height:100%;object-fit:cover}.copy{min-width:0}.copy strong,.copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.copy strong{font-size:13px;font-weight:900}.copy small{margin-top:2px;color:#64748b;font-size:11px}.badge{flex:none;border-radius:999px;padding:3px 8px;font-size:9px;font-weight:950;letter-spacing:.04em;background:#e2e8f0;color:#334155}.badge.s-published{background:#dcfce7;color:#166534}.badge.s-draft{background:#fef3c7;color:#92400e}.badge.s-scheduled{background:#dbeafe;color:#1e40af}.badge.s-archived{background:#e2e8f0;color:#475569}.chev{color:#94a3b8;font-size:18px;line-height:1}.empty{padding:28px 14px;text-align:center;color:#64748b;font-size:12px}.editor-head{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;background:#07101f;padding:12px;color:white}.editor-head .back{min-height:40px;border:1px solid #334155;border-radius:10px;background:#0f1c31;padding:0 11px;color:white;font-weight:850}.editor-head p{margin:0;color:#94a3b8;font-size:9px}.editor-head strong{display:block;margin-top:2px;font-size:14px}.editor-head>span{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;background:#1d4ed8;font-size:11px;font-weight:950}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e2e8f0}.steps button{display:grid;min-height:64px;place-items:center;gap:2px;border:0;background:white;padding:8px;color:#64748b}.steps b{display:grid;width:24px;height:24px;place-items:center;border-radius:50%;background:#e2e8f0;font-size:9px}.steps span{font-size:8px;font-weight:850}.steps button.active{background:#eff6ff;color:#1d4ed8}.steps button.active b,.steps button.done b{background:#2563eb;color:white}.panel{margin:14px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:15px}.panel>header{margin-bottom:14px}.panel h2{margin:0;font-size:18px}.panel header p{margin:5px 0 0;color:#64748b;font-size:10px;line-height:1.5}.upload-zone{display:grid;min-height:180px;place-items:center;align-content:center;gap:7px;border:2px dashed #93c5fd;border-radius:18px;background:#eff6ff;padding:20px;text-align:center;cursor:pointer}.upload-zone input{position:absolute;width:1px;height:1px;opacity:0}.upload-zone strong{color:#1d4ed8}.upload-zone span{color:#64748b;font-size:9px}.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:12px}.media-card{border:1px solid #e2e8f0;border-radius:14px;padding:8px}.media-preview{position:relative;aspect-ratio:16/10;overflow:hidden;border-radius:10px;background:#0f172a}.media-preview img,.media-preview video{width:100%;height:100%;object-fit:cover}.media-preview b{position:absolute;top:7px;left:7px;border-radius:999px;background:#fbbf24;padding:4px 7px;font-size:8px}.media-card label,.panel label{display:flex;flex-direction:column;gap:5px;margin-top:8px;color:#475569;font-size:9px;font-weight:850}.media-card input,.panel input,.panel select,.panel textarea{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:8px 10px;color:#0f172a}.media-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.media-actions button,.publish-actions button,.ghost{min-height:40px;border:1px solid #dbe4ef;border-radius:10px;background:white;font-size:9px;font-weight:900}.danger{color:#be123c}.form-grid{display:grid;grid-template-columns:1fr;gap:10px}.form-grid label{margin-top:0}.wide{grid-column:1/-1}.check{flex-direction:row!important;align-items:center!important;min-height:44px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:8px 10px}.check input{width:auto!important;min-height:auto!important}.expertise{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:12px}.expertise>strong{display:block;margin-bottom:10px}.stack{display:grid;gap:0}.preview-layout{display:grid}.detail-preview,.tour-preview{margin-top:12px;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.detail-preview h3,.tour-preview h3{margin:0}.detail-preview p,.tour-preview p{color:#64748b;font-size:10px;line-height:1.6}.detail-preview div{display:flex;flex-wrap:wrap;gap:5px}.detail-preview span{border-radius:999px;background:#f1f5f9;padding:5px 7px;font-size:8px}.preview-image{aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:#e2e8f0}.preview-image img{width:100%;height:100%;object-fit:cover}.tour-preview strong,.tour-preview small{display:block;margin-top:7px}.publish-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.publish-actions .schedule{background:#fef3c7;color:#92400e}.publish-actions .publish{background:#16a34a;color:white}.publish-actions .archive{background:#0f172a;color:white}.public-link{display:flex;min-height:44px;align-items:center;justify-content:center;margin-top:10px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:900;text-decoration:none}.editor-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #e2e8f0;background:#f8fafc;padding:12px}.editor-nav>div{display:flex;gap:7px}.editor-nav button{min-height:44px;padding:0 13px}.ghost:disabled,.primary:disabled,.publish-actions button:disabled{opacity:.45}@media(min-width:720px){.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.preview-layout{grid-template-columns:minmax(0,1fr) minmax(320px,.55fr)}.steps span{font-size:9px}}@media(max-width:560px){.editor-head{grid-template-columns:1fr auto}.editor-head .back{grid-column:1/-1;justify-self:start}.steps span{display:none}.panel{margin:8px;padding:12px}.publish-actions{grid-template-columns:1fr}.editor-nav{align-items:stretch;flex-direction:column}.editor-nav>div{display:grid;grid-template-columns:1fr 1fr}.editor-nav>button{width:100%}}
  `],
})
export class AdminCatalogWorkspaceComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mode: CatalogWorkspaceMode = "RENTAL";
  private readonly editor = inject(CatalogAdminEditorService);
  readonly mediaService = inject(CatalogMediaService);
  private readonly management = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly vehicles = signal<VehicleAdminRecord[]>([]);
  readonly tours = signal<TourAdminRecord[]>([]);
  readonly selectedVehicle = signal<VehicleAdminRecord | null>(null);
  readonly selectedTour = signal<TourAdminRecord | null>(null);
  readonly viewingVehicle = signal<VehicleAdminRecord | null>(null);
  readonly viewingTour = signal<TourAdminRecord | null>(null);
  private lastFocusedRowId = '';
  readonly media = signal<CatalogMediaItem[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal("");
  readonly step = signal<WorkspaceStep>(1);
  search = "";
  readonly stepItems = [{id:1 as const,label:"Medya"},{id:2 as const,label:"Kart & Temel"},{id:3 as const,label:"Detaylar"},{id:4 as const,label:"Önizleme & Yayın"}];
  readonly saleParts=[{key:'hood',label:'Kaput'},{key:'frontBumper',label:'Ön tampon'},{key:'rearBumper',label:'Arka tampon'},{key:'roof',label:'Tavan'},{key:'trunk',label:'Bagaj kapağı'},{key:'frontLeftDoor',label:'Sol ön kapı'},{key:'frontRightDoor',label:'Sağ ön kapı'},{key:'rearLeftDoor',label:'Sol arka kapı'},{key:'rearRightDoor',label:'Sağ arka kapı'},{key:'frontLeftFender',label:'Sol ön çamurluk'},{key:'frontRightFender',label:'Sağ ön çamurluk'},{key:'rearLeftFender',label:'Sol arka çamurluk'},{key:'rearRightFender',label:'Sağ arka çamurluk'}] as const;
  readonly branches = computed(() => this.management.branches().filter((branch) => branch.isActive));
  readonly filteredVehicles = computed(() => {const q=this.search.trim().toLocaleLowerCase('tr-TR');return this.vehicles().filter((row)=>row.category===this.mode).filter((row)=>!q||`${row.brand} ${row.model} ${row.stockCode} ${row.modelYear||''}`.toLocaleLowerCase('tr-TR').includes(q));});
  readonly filteredTours = computed(() => {const q=this.search.trim().toLocaleLowerCase('tr-TR');return this.tours().filter((row)=>!q||`${row.title} ${row.category||''} ${row.locationName||''}`.toLocaleLowerCase('tr-TR').includes(q));});
  readonly resultCount = computed(() => this.mode==='TOUR'?this.filteredTours().length:this.filteredVehicles().length);

  ngOnInit():void{const cached=catalogCache.get(this.mode);if(cached){if(this.mode==='TOUR')this.tours.set(cached as TourAdminRecord[]);else this.vehicles.set(cached as VehicleAdminRecord[]);}void this.refresh();}
  modeLabel():string{return this.mode==='RENTAL'?'Kiralık Araç':this.mode==='SALE'?'Satılık Araç':'Tur';}
  pageTitle():string{return this.mode==='RENTAL'?'Kiralık Araçlar':this.mode==='SALE'?'Satılık Araçlar':'Turlar';}
  pageDescription():string{return this.mode==='RENTAL'?'Kiralık araçları listeleyin, arayın, kendi fotoğraf ve videolarını yükleyin, fiyat ve koşulları tamamlayıp yayınlayın.':this.mode==='SALE'?'Satılık araçları kendi medyası, teknik bilgileri ve ekspertiziyle tek kayıtta yönetin.':'Her turun kendi fotoğraf/video, program, rota, fiyat, kapasite ve yayın ayarlarını tek akışta yönetin.';}
  searchPlaceholder():string{return `${this.modeLabel()} ara…`;}
  newButtonLabel():string{return this.mode==='RENTAL'?'Yeni Kiralık Araç':this.mode==='SALE'?'Yeni Satılık Araç':'Yeni Tur';}
  entityNoun():string{return this.mode==='TOUR'?'tur':'araç';}
  selectedTitle():string{const car=this.selectedVehicle();if(car)return `${car.brand||'Yeni'} ${car.model||this.modeLabel()}`.trim();return this.selectedTour()?.title||'Yeni Tur';}
  vehicleRowLabel(item:VehicleAdminRecord):string{return `${item.brand||'Marka'} ${item.model||'Model'}, ${item.modelYear||'yıl yok'}, ${this.statusSpoken(item.publicationStatus)}${this.priceMeta(item)}. Ayrıntıları aç`;}
  tourRowLabel(item:TourAdminRecord):string{return `${item.title||'İsimsiz tur'}, ${item.duration||'süre girilmedi'}, ${Math.round(item.pricePerPerson||0)} lira kişi başı, ${this.statusSpoken(item.publicationStatus)}. Ayrıntıları aç`;}
  priceMeta(item:VehicleAdminRecord):string{const value=item.category==='RENTAL'?Number(item.rentalPriceDaily??item.price??0):Number(item.price||0);if(!value)return'';return` · ${new Intl.NumberFormat('tr-TR').format(value)} TL${item.category==='RENTAL'?'/gün':''}`;}
  statusSpoken(status:string):string{return status==='PUBLISHED'?'canlı':status==='DRAFT'?'taslak':status==='SCHEDULED'?'planlı':'arşiv';}
  stepTitle():string{return this.stepItems.find((row)=>row.id===this.step())?.label||'';}

  /** Yenileme sırasında mevcut liste ekranda kalır (titreme yok); yükleniyor durumu yalnız ilk açılışta görünür. */
  async refresh():Promise<void>{const hasData=this.mode==='TOUR'?this.tours().length>0:this.vehicles().length>0;if(!hasData)this.loading.set(true);this.error.set('');try{const catalogPromise=this.mode==='TOUR'?this.editor.tours():this.editor.vehicles();const[catalogResult,peopleResult]=await Promise.allSettled([catalogPromise,this.management.refreshPeople()]);if(catalogResult.status==='fulfilled'){catalogCache.set(this.mode,catalogResult.value);if(this.mode==='TOUR'){this.tours.set(catalogResult.value as TourAdminRecord[]);}else{this.vehicles.set(catalogResult.value as VehicleAdminRecord[]);}}else{this.error.set(this.message(catalogResult.reason));}if(peopleResult.status==='rejected'){console.error('Ekip/şube verisi yüklenemedi (katalog listesini etkilemez):',peopleResult.reason);}}finally{this.loading.set(false);}}
  async createNew():Promise<void>{this.saving.set(true);try{if(this.mode==='TOUR'){const item=await this.editor.createTour();this.tours.update((rows)=>[item,...rows]);await this.selectTour(item);}else{const item=await this.editor.createVehicle(this.mode);if(this.mode==='SALE')item.metadata={...(item.metadata||{}),tramerStatus:'UNKNOWN',tramerCurrency:'TRY',damageExpertise:{},isDamageFree:false};this.vehicles.update((rows)=>[item,...rows]);await this.selectVehicle(item);}this.step.set(1);this.toast.show(`${this.modeLabel()} taslağı oluşturuldu. Önce medya ekleyebilirsiniz.`,'success');}catch(error){this.toast.show(this.message(error),'error');}finally{this.saving.set(false);}}
  async selectVehicle(item:VehicleAdminRecord):Promise<void>{this.selectedTour.set(null);this.selectedVehicle.set(this.clone(item));this.step.set(1);this.openSheet();await this.loadMedia('VEHICLE',item.id);}
  async selectTour(item:TourAdminRecord):Promise<void>{this.selectedVehicle.set(null);this.selectedTour.set(this.clone(item));this.step.set(1);this.openSheet();await this.loadMedia('TOUR',item.id);}
  /** Satıra dokunma: önce salt-okunur ayrıntı paneli (düzenleme, yayın, arşiv, müşteri sayfası oradan). */
  viewVehicle(item:VehicleAdminRecord):void{this.lastFocusedRowId=item.id;this.viewingTour.set(null);this.viewingVehicle.set(item);this.openSheet();}
  viewTour(item:TourAdminRecord):void{this.lastFocusedRowId=item.id;this.viewingVehicle.set(null);this.viewingTour.set(item);this.openSheet();}
  editVehicle(item:VehicleAdminRecord):void{this.lastFocusedRowId=item.id;void this.selectVehicle(item);}
  editTour(item:TourAdminRecord):void{this.lastFocusedRowId=item.id;void this.selectTour(item);}
  viewingTitle():string{const car=this.viewingVehicle();if(car)return `${car.brand||'Marka'} ${car.model||'Model'}`.trim();return this.viewingTour()?.title||'Tur';}
  viewingStatus():string{return this.viewingVehicle()?.publicationStatus||this.viewingTour()?.publicationStatus||'DRAFT';}
  availabilityLabel(value:string):string{return({AVAILABLE:'Müsait / Satışta',RESERVED:'Rezerve',RENTED:'Kirada',SOLD:'Satıldı',MAINTENANCE:'Bakımda'} as Record<string,string>)[value]||value||'—';}
  qualityLabel(value:string):string{return value==='BUSINESS_VERIFIED'?'İşletme doğruladı':value==='RESEARCHED'?'Araştırma ile tamamlandı':'Kontrol edilmedi';}
  branchName(id?:string):string{if(!id)return'Seçilmedi';const branch=this.management.branches().find((row)=>row.id===id);return branch?`${branch.name} · ${branch.city}`:'Seçilmedi';}
  async quickStatus(record:VehicleAdminRecord|TourAdminRecord,status:'DRAFT'|'PUBLISHED'|'ARCHIVED'):Promise<void>{this.saving.set(true);try{const next=this.clone(record);next.publicationStatus=status;next.isActive=status==='PUBLISHED';next.publishedAt=status==='PUBLISHED'?new Date().toISOString():next.publishedAt;next.scheduledAt=undefined;next.recordOrigin='REAL';if('brand' in next)await this.editor.saveVehicle(next);else await this.editor.saveTour(next);await this.refresh();const fresh=this.mode==='TOUR'?this.tours().find((row)=>row.id===record.id):this.vehicles().find((row)=>row.id===record.id);if(fresh){if('brand' in fresh)this.viewingVehicle.set(fresh as VehicleAdminRecord);else this.viewingTour.set(fresh as TourAdminRecord);}this.toast.show(this.statusSaveMessage(status),'success');}catch(error){this.toast.show(this.message(error),'error');}finally{this.saving.set(false);}}
  /** Panel: sayfanın geri kalanı kaydırılmaz, odak panel başlığına gider. */
  private openSheet():void{if(typeof document==='undefined')return;document.body.style.overflow='hidden';window.setTimeout(()=>{(document.getElementById('sheet-title') as HTMLElement|null)?.focus();},40);}
  closeSheet():void{const rowId=this.lastFocusedRowId;this.viewingVehicle.set(null);this.viewingTour.set(null);this.selectedVehicle.set(null);this.selectedTour.set(null);this.media.set([]);this.step.set(1);if(typeof document==='undefined')return;document.body.style.overflow='';if(rowId)window.setTimeout(()=>{document.getElementById(`row-${rowId}`)?.focus();},40);}
  closeEditor():void{this.closeSheet();}
  ngOnDestroy():void{if(typeof document!=='undefined')document.body.style.overflow='';}
  /** Kayıt sonrası düzenleyici kapanır, liste açılır ve odak kaydedilen satıra döner (ekran okuyucu satırı okur). */
  private returnToList(id:string):void{this.lastFocusedRowId=id;this.closeSheet();if(typeof window==='undefined')return;window.setTimeout(()=>{const row=document.getElementById(`row-${id}`);if(row){row.focus();row.scrollIntoView({block:'center'});}else{window.scrollTo({top:0});}},80);}
  nextStep():void{this.step.set(Math.min(4,this.step()+1) as WorkspaceStep);}
  previousStep():void{this.step.set(Math.max(1,this.step()-1) as WorkspaceStep);}

  async uploadFiles(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const files=Array.from(input.files||[]).slice(0,20);const id=this.selectedVehicle()?.id||this.selectedTour()?.id;if(!files.length||!id)return;const type=this.mode==='TOUR'?'TOUR':'VEHICLE';this.uploading.set(true);try{let hasCover=this.media().some((item)=>item.kind==='IMAGE'&&item.isCover);let sort=this.media().length+1;for(const file of files){const image=file.type.startsWith('image/');await this.mediaService.upload(type,id,file,{altText:file.name,isCover:image&&!hasCover,sortOrder:sort++});if(image&&!hasCover)hasCover=true;}await this.loadMedia(type,id);await this.reloadSelection();this.toast.show('Dosyalar yalnız bu kayda bağlandı.','success');}catch(error){this.toast.show(this.message(error),'error');}finally{this.uploading.set(false);input.value='';}}
  async updateAlt(item:CatalogMediaItem,value:string):Promise<void>{try{await this.mediaService.update(item,{altText:value});this.media.update((rows)=>rows.map((row)=>row.id===item.id?{...row,altText:value}:row));}catch(error){this.toast.show(this.message(error),'error');}}
  async makeCover(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.update(item,{isCover:true});await this.loadMediaForSelection();await this.reloadSelection();this.toast.show('Kapak görseli değiştirildi.','success');}catch(error){this.toast.show(this.message(error),'error');}}
  async removeMedia(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.remove(item);await this.loadMediaForSelection();await this.reloadSelection();this.toast.show('Medya kaldırıldı.','info');}catch(error){this.toast.show(this.message(error),'error');}}

  async saveProgress():Promise<void>{if(this.selectedVehicle())await this.saveVehicleAs('DRAFT');else if(this.selectedTour())await this.saveTourAs('DRAFT');}
  async saveVehicleAs(status:'DRAFT'|'SCHEDULED'|'PUBLISHED'|'ARCHIVED'):Promise<void>{const car=this.selectedVehicle();if(!car)return;if(status==='SCHEDULED'&&!this.validFutureSchedule(car.scheduledAt)){this.toast.show('Planlı yayın için gelecekte bir tarih ve saat seçin.','error');return;}car.publicationStatus=status;car.isActive=status==='PUBLISHED'||status==='SCHEDULED';car.publishedAt=status==='PUBLISHED'?new Date().toISOString():car.publishedAt;car.scheduledAt=status==='SCHEDULED'?car.scheduledAt:undefined;car.recordOrigin='REAL';if(this.mode==='RENTAL'&&this.meta(car,'hourlyRentalEnabled')===true){const hourly=Number(this.meta(car,'hourlyPrice')||0),minimum=Number(this.meta(car,'minimumRentalHours')||1);if(hourly<=0||!Number.isInteger(minimum)||minimum<1||minimum>23){this.toast.show('Saatlik kiralama için fiyat ve 1-23 arası minimum saat zorunlu.','error');return;}}if(this.mode==='SALE'){const truth=this.saleTruthError(car);if(truth){this.toast.show(truth,'error');return;}}this.saving.set(true);try{await this.editor.saveVehicle(car);await this.reloadSelection();this.toast.show(this.statusSaveMessage(status),'success');this.returnToList(car.id);}catch(error){this.toast.show(this.message(error),'error');}finally{this.saving.set(false);}}
  async saveTourAs(status:'DRAFT'|'SCHEDULED'|'PUBLISHED'|'ARCHIVED'):Promise<void>{const tour=this.selectedTour();if(!tour)return;if(status==='SCHEDULED'&&!this.validFutureSchedule(tour.scheduledAt)){this.toast.show('Planlı yayın için gelecekte bir tarih ve saat seçin.','error');return;}tour.publicationStatus=status;tour.isActive=status==='PUBLISHED'||status==='SCHEDULED';tour.publishedAt=status==='PUBLISHED'?new Date().toISOString():tour.publishedAt;tour.scheduledAt=status==='SCHEDULED'?tour.scheduledAt:undefined;tour.recordOrigin='REAL';this.saving.set(true);try{await this.editor.saveTour(tour);await this.reloadSelection();this.toast.show(this.statusSaveMessage(status),'success');this.returnToList(tour.id);}catch(error){this.toast.show(this.message(error),'error');}finally{this.saving.set(false);}}

  previewVehicle(car:VehicleAdminRecord):Vehicle{return{id:car.id,cloudId:car.id,category:car.category,title:String(this.meta(car,'title')||''),brand:car.brand,model:car.model,series:String(this.meta(car,'series')||''),year:car.modelYear,price:car.category==='RENTAL'?Number(car.rentalPriceDaily??car.price??0):Number(car.price||0),hourlyRentalEnabled:car.category==='RENTAL'&&this.meta(car,'hourlyRentalEnabled')===true,hourlyPrice:car.category==='RENTAL'?Number(this.meta(car,'hourlyPrice')||0):undefined,minimumRentalHours:car.category==='RENTAL'?Number(this.meta(car,'minimumRentalHours')||1):undefined,hourlyMileageLimit:car.category==='RENTAL'?Number(this.meta(car,'hourlyMileageLimit')||0)||undefined:undefined,km:car.category==='SALE'?car.mileageKm:undefined,fuel:car.fuelType,transmission:car.transmission,type:car.bodyType,color:car.color,location:car.location,seats:car.seats,image:car.coverImage||car.images[0],images:car.images,badge:String(this.meta(car,'badge')||''),description:car.description,features:car.features,isFeatured:car.isFeatured,isAvailable:car.availabilityStatus==='AVAILABLE'};}
  itineraryLines(tour:TourAdminRecord):string{return(tour.itinerary||[]).map((value,index)=>{if(typeof value==='string')return value;if(value&&typeof value==='object'){const row=value as Record<string,unknown>;return String(row['title']||row['name']||row['description']||row['label']||`Program adımı ${index+1}`);}return'';}).filter(Boolean).join('\n');}
  meta(record:{metadata:Record<string,unknown>},key:string):any{return record.metadata?.[key]??'';}
  metaArray(record:{metadata:Record<string,unknown>},key:string):string[]{const value=record.metadata?.[key];return Array.isArray(value)?value.map(String):[];}
  setMeta(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{record.metadata={...(record.metadata||{}),[key]:value};}
  setMetaNumber(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{const parsed=Number(value);this.setMeta(record,key,Number.isFinite(parsed)?parsed:null);}
  setOptionalMetaNumber(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{if(value===''||value==null){const next={...(record.metadata||{})};delete next[key];record.metadata=next;return;}const parsed=Number(value);if(Number.isFinite(parsed))this.setMeta(record,key,Math.max(0,parsed));}
  splitLines(value:unknown):string[]{return String(value||'').split(/\r?\n/).map((line)=>line.trim()).filter(Boolean).slice(0,100);}
  statusLabel(status:string):string{return status==='PUBLISHED'?'CANLI':status==='DRAFT'?'TASLAK':status==='SCHEDULED'?'PLANLI':'ARŞİV';}
  saleTramerStatus(record:{metadata:Record<string,unknown>}):string{const value=String(this.meta(record,'tramerStatus')||'UNKNOWN').toUpperCase();return['DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD'].includes(value)?value:'UNKNOWN';}
  isVerifiedSaleTramer(record:{metadata:Record<string,unknown>}):boolean{return this.saleTramerStatus(record).startsWith('VERIFIED_');}
  setSaleTramerStatus(record:{metadata:Record<string,unknown>},value:string):void{const status=['UNKNOWN','DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD'].includes(value)?value:'UNKNOWN';this.setMeta(record,'tramerStatus',status);this.setMeta(record,'tramerCurrency','TRY');if(status==='UNKNOWN'){this.setMeta(record,'tramer','Belirtilmedi / doğrulanmadı');this.setOptionalMetaNumber(record,'tramerAmount','');}if(status.endsWith('CLEAN')){this.setMeta(record,'tramer',status.startsWith('VERIFIED_')?'Doğrulandı: tramer kaydı yok':'Beyan: tramer kaydı yok');this.setMeta(record,'tramerAmount',0);}if(!status.startsWith('VERIFIED_')){const next={...(record.metadata||{})};delete next['tramerSourceName'];delete next['tramerSourceUrl'];delete next['tramerVerifiedAt'];record.metadata=next;}}
  salePartStatus(record:{metadata:Record<string,unknown>},key:string):string{const raw=this.meta(record,'damageExpertise');const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?String((raw as Record<string,unknown>)[key]||''):'';return['original','local_painted','painted','changed'].includes(value)?value:'';}
  setSalePart(record:{metadata:Record<string,unknown>},key:string,value:string):void{const raw=this.meta(record,'damageExpertise');const next=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...(raw as Record<string,unknown>)}:{};if(['original','local_painted','painted','changed'].includes(value))next[key]=value;else delete next[key];this.setMeta(record,'damageExpertise',next);}
  saleTruthError(record:{metadata:Record<string,unknown>,publicationStatus:string}):string{const status=this.saleTramerStatus(record);const publishing=record.publicationStatus==='PUBLISHED'||record.publicationStatus==='SCHEDULED';if(publishing&&status==='UNKNOWN')return'Canlı satılık ilanda tramer durumu için en az beyan seçilmelidir.';if(status.endsWith('RECORD')&&Number(this.meta(record,'tramerAmount')||0)<=0)return'Tramer kaydı varsa toplam tramer tutarını girin.';if(status.endsWith('RECORD')&&!String(this.meta(record,'tramer')||'').trim())return'Tramer açıklaması eksik.';if(this.isVerifiedSaleTramer(record)){if(!String(this.meta(record,'tramerSourceName')||'').trim())return'Doğrulanmış tramer için kaynak adı zorunlu.';try{if(new URL(String(this.meta(record,'tramerSourceUrl')||'')).protocol!=='https:')return'Tramer doğrulama bağlantısı HTTPS olmalı.';}catch{return'Tramer doğrulama bağlantısı geçersiz.';}if(!String(this.meta(record,'tramerVerifiedAt')||'').trim())return'Tramer doğrulama zamanı zorunlu.';}const raw=this.meta(record,'damageExpertise');const values=raw&&typeof raw==='object'&&!Array.isArray(raw)?Object.values(raw as Record<string,unknown>).map(String):[];if(this.meta(record,'isDamageFree')===true&&values.some((value)=>['local_painted','painted','changed'].includes(value)))return'Hasarsız beyanı ile boyalı veya değişen parça çelişiyor.';return'';}

  private async loadMedia(type:'VEHICLE'|'TOUR',id:string):Promise<void>{try{this.media.set(await this.mediaService.load(type,id));}catch{this.media.set([]);}}
  private async loadMediaForSelection():Promise<void>{const car=this.selectedVehicle();if(car)return this.loadMedia('VEHICLE',car.id);const tour=this.selectedTour();if(tour)return this.loadMedia('TOUR',tour.id);}
  private async reloadSelection():Promise<void>{const vehicleId=this.selectedVehicle()?.id;const tourId=this.selectedTour()?.id;if(this.mode==='TOUR'){const rows=await this.editor.tours();this.tours.set(rows);if(tourId){const row=rows.find((item)=>item.id===tourId);if(row)this.selectedTour.set(this.clone(row));}}else{const rows=await this.editor.vehicles();this.vehicles.set(rows);if(vehicleId){const row=rows.find((item)=>item.id===vehicleId);if(row)this.selectedVehicle.set(this.clone(row));}}await this.loadMediaForSelection();}
  private validFutureSchedule(value?:string):boolean{if(!value)return false;const timestamp=new Date(value).getTime();return Number.isFinite(timestamp)&&timestamp>Date.now()+60_000;}
  private statusSaveMessage(status:string):string{return status==='PUBLISHED'?'Kayıt canlı yayınlandı.':status==='SCHEDULED'?'Yayın planlandı.':status==='ARCHIVED'?'Kayıt arşivlendi.':'Taslak kaydedildi.';}
  private clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
  private message(error:unknown):string{return error instanceof Error?error.message:'İşlem tamamlanamadı.';}
}
