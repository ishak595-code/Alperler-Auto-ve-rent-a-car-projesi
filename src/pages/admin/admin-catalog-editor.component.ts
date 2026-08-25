import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { VehicleCardComponent } from "../../components/vehicle-card.component";
import { Vehicle } from "../../models/car.model";
import {
  CatalogAdminEditorService,
  TourAdminRecord,
  VehicleAdminRecord,
} from "../../services/catalog-admin-editor.service";
import {
  CatalogMediaItem,
  CatalogMediaService,
} from "../../services/catalog-media.service";
import { AdminManagementService } from "../../services/admin-management.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-catalog-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent],
  template: `
    <main class="min-h-full bg-slate-50 p-3 sm:p-4 md:p-8">
      <div class="mx-auto max-w-[1500px] space-y-5">
        <header class="rounded-3xl bg-slate-950 p-5 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Gerçek canlı katalog</p>
          <div class="mt-2 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div class="max-w-4xl">
              <h1 class="text-2xl font-black md:text-4xl">Araç & Tur Yayın Stüdyosu</h1>
              <p class="mt-2 text-sm leading-relaxed text-slate-300">Kiralık araç, satılık araç ve turlar birbirinden ayrı gerçek kayıtlar olarak yönetilir. Yeni kayıt önce taslak açılır, bilgileri ve medyası tamamlandıktan sonra canlıya alınır veya ileri bir tarihe planlanır.</p>
            </div>
          </div>
        </header>

        <section class="sticky top-0 z-40 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur" aria-label="Katalog hızlı işlemleri">
          <div class="grid gap-2 xl:grid-cols-[minmax(280px,1fr)_auto_auto] xl:items-center">
            <input [(ngModel)]="search" type="search" aria-label="Katalogda ara" placeholder="Marka, model, stok kodu veya tur ara…" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500" />
            <div class="grid grid-cols-3 gap-2" role="tablist" aria-label="Katalog türü">
              <button type="button" (click)="filter.set('RENTAL')" [class.bg-blue-600]="filter()==='RENTAL'" [class.text-white]="filter()==='RENTAL'" class="min-h-12 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700">Kiralık</button>
              <button type="button" (click)="filter.set('SALE')" [class.bg-emerald-600]="filter()==='SALE'" [class.text-white]="filter()==='SALE'" class="min-h-12 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700">Satılık</button>
              <button type="button" (click)="filter.set('TOUR')" [class.bg-violet-600]="filter()==='TOUR'" [class.text-white]="filter()==='TOUR'" class="min-h-12 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700">Turlar</button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button type="button" (click)="createVehicle('RENTAL')" [disabled]="saving()" class="min-h-12 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-40">+ Kiralık</button>
              <button type="button" (click)="createVehicle('SALE')" [disabled]="saving()" class="min-h-12 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-40">+ Satılık</button>
              <button type="button" (click)="createTour()" [disabled]="saving()" class="min-h-12 rounded-xl bg-violet-600 px-3 text-xs font-black text-white disabled:opacity-40">+ Tur</button>
            </div>
          </div>
        </section>

        @if (error()) {<div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div>}

        <div class="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:self-start">
            <div class="space-y-2">
              @if (filter() !== 'TOUR') {
                @for (item of filteredVehicles(); track item.id) {
                  <button type="button" (click)="selectVehicle(item)" [class.border-blue-500]="selectedVehicle()?.id===item.id" [class.bg-blue-50]="selectedVehicle()?.id===item.id" class="w-full rounded-2xl border border-slate-200 p-3 text-left">
                    <div class="flex items-center gap-2"><strong class="min-w-0 flex-1 truncate text-sm text-slate-900">{{ item.brand }} {{ item.model }}</strong><span class="rounded-full px-2 py-1 text-[9px] font-black" [class.bg-emerald-100]="item.publicationStatus==='PUBLISHED'" [class.text-emerald-700]="item.publicationStatus==='PUBLISHED'" [class.bg-amber-100]="item.publicationStatus!=='PUBLISHED'">{{ statusLabel(item.publicationStatus) }}</span></div>
                    <span class="mt-1 block truncate text-[11px] text-slate-500">{{ item.category === 'RENTAL' ? 'Kiralık' : 'Satılık' }} · {{ item.modelYear || 'Yıl yok' }} · {{ item.stockCode }}</span>
                  </button>
                } @empty {<div class="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">Kayıt bulunamadı.</div>}
              } @else {
                @for (item of filteredTours(); track item.id) {
                  <button type="button" (click)="selectTour(item)" [class.border-violet-500]="selectedTour()?.id===item.id" [class.bg-violet-50]="selectedTour()?.id===item.id" class="w-full rounded-2xl border border-slate-200 p-3 text-left"><strong class="block truncate text-sm text-slate-900">{{ item.title }}</strong><span class="mt-1 block truncate text-[11px] text-slate-500">{{ item.duration || 'Süre yok' }} · {{ statusLabel(item.publicationStatus) }}</span></button>
                } @empty {<div class="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">Tur bulunamadı.</div>}
              }
            </div>
          </aside>

          <section class="min-w-0">
            @if (loading()) {
              <div class="rounded-3xl bg-white p-12 text-center font-bold text-slate-500">Katalog hazırlanıyor…</div>
            } @else if (selectedVehicle(); as car) {
              <form (ngSubmit)="saveVehicle()" class="space-y-5">
                <div class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
                  <div class="space-y-5">
                    <section class="panel">
                      <header><h2>{{ car.category === 'RENTAL' ? 'Kiralık Araç' : 'Satılık Araç' }} Kart Bilgileri</h2><p>Kartta hangi bilgiler görünüyorsa aynı bilgiler burada yönetilir.</p></header>
                      <div class="form-grid">
                        <label class="field md:col-span-2"><span>İlan başlığı</span><input [ngModel]="meta(car,'title')" (ngModelChange)="setMeta(car,'title',$event)" name="title" /></label>
                        <label class="field"><span>Marka</span><input [(ngModel)]="car.brand" name="brand" required /></label>
                        <label class="field"><span>Model / Paket</span><input [(ngModel)]="car.model" name="model" required /></label>
                        <label class="field"><span>Seri</span><input [ngModel]="meta(car,'series')" (ngModelChange)="setMeta(car,'series',$event)" name="series" /></label>
                        <label class="field"><span>Model yılı</span><input [(ngModel)]="car.modelYear" name="year" type="number" min="1950" max="2100" /></label>
                        <label class="field"><span>Stok kodu</span><input [(ngModel)]="car.stockCode" name="stockCode" required /></label>
                        <label class="field"><span>Rozet</span><input [ngModel]="meta(car,'badge')" (ngModelChange)="setMeta(car,'badge',$event)" name="badge" placeholder="FIRSAT, YENİ, PREMIUM…" /></label>
                        @if (car.category === 'RENTAL') {
                          <label class="field"><span>Günlük fiyat TL</span><input [(ngModel)]="car.rentalPriceDaily" name="rentalPrice" type="number" min="0" /></label>
                          <label class="check md:col-span-2"><input type="checkbox" [ngModel]="meta(car,'hourlyRentalEnabled') === true" (ngModelChange)="setMeta(car,'hourlyRentalEnabled',$event)" name="hourlyRentalEnabled" /> Saatlik kiralamayı etkinleştir</label>
                          <label class="field"><span>Saatlik fiyat TL</span><input [ngModel]="meta(car,'hourlyPrice')" (ngModelChange)="setMetaNumber(car,'hourlyPrice',$event)" name="hourlyPrice" type="number" min="0" step="0.01" /></label>
                          <label class="field"><span>Minimum kiralama saati</span><input [ngModel]="meta(car,'minimumRentalHours') || 1" (ngModelChange)="setMetaNumber(car,'minimumRentalHours',$event)" name="minimumRentalHours" type="number" min="1" max="23" /></label>
                          <label class="field"><span>Saatlik KM limiti</span><input [ngModel]="meta(car,'hourlyMileageLimit')" (ngModelChange)="setMetaNumber(car,'hourlyMileageLimit',$event)" name="hourlyMileageLimit" type="number" min="0" /></label>
                        } @else {
                          <label class="field"><span>Satış fiyatı TL</span><input [(ngModel)]="car.price" name="price" type="number" min="0" /></label>
                          <label class="field"><span>Kilometre</span><input [(ngModel)]="car.mileageKm" name="mileage" type="number" min="0" /></label>
                        }
                        <label class="field"><span>Yakıt</span><input [(ngModel)]="car.fuelType" name="fuel" /></label>
                        <label class="field"><span>Vites</span><input [(ngModel)]="car.transmission" name="transmission" /></label>
                        <label class="field"><span>Kasa tipi</span><input [(ngModel)]="car.bodyType" name="bodyType" /></label>
                        <label class="field"><span>Renk</span><input [(ngModel)]="car.color" name="color" /></label>
                        <label class="field"><span>Konum</span><input [(ngModel)]="car.location" name="location" /></label>
                        <label class="field"><span>SEO adresi</span><input [(ngModel)]="car.seoSlug" name="seoSlug" /></label>
                      </div>
                    </section>

                    <section class="panel">
                      <header><h2>Teknik & Detay Bilgileri</h2></header>
                      <div class="form-grid">
                        <label class="field"><span>Motor</span><input [(ngModel)]="car.engine" name="engine" /></label>
                        <label class="field"><span>Motor gücü</span><input [ngModel]="meta(car,'enginePower')" (ngModelChange)="setMeta(car,'enginePower',$event)" name="enginePower" /></label>
                        <label class="field"><span>Çekiş</span><input [ngModel]="meta(car,'drivetrain')" (ngModelChange)="setMeta(car,'drivetrain',$event)" name="drivetrain" /></label>
                        <label class="field"><span>Tork</span><input [ngModel]="meta(car,'torque')" (ngModelChange)="setMeta(car,'torque',$event)" name="torque" /></label>
                        <label class="field"><span>Koltuk</span><input [(ngModel)]="car.seats" name="seats" type="number" min="1" /></label>
                        <label class="field"><span>Kapı</span><input [(ngModel)]="car.doors" name="doors" type="number" min="1" /></label>
                        <label class="field"><span>0-100</span><input [ngModel]="meta(car,'acceleration')" (ngModelChange)="setMeta(car,'acceleration',$event)" name="acceleration" /></label>
                        <label class="field"><span>Maksimum hız</span><input [ngModel]="meta(car,'maxSpeed')" (ngModelChange)="setMeta(car,'maxSpeed',$event)" name="maxSpeed" /></label>
                        <label class="field"><span>Ortalama yakıt tüketimi</span><input [ngModel]="meta(car,'fuelConsumption')" (ngModelChange)="setMeta(car,'fuelConsumption',$event)" name="fuelConsumption" /></label>
                        <label class="field"><span>Şehir içi tüketim</span><input [ngModel]="meta(car,'cityFuelConsumption')" (ngModelChange)="setMeta(car,'cityFuelConsumption',$event)" name="cityFuelConsumption" /></label>
                        <label class="field"><span>Şehir dışı tüketim</span><input [ngModel]="meta(car,'highwayFuelConsumption')" (ngModelChange)="setMeta(car,'highwayFuelConsumption',$event)" name="highwayFuelConsumption" /></label>
                        <label class="field"><span>Yakıt deposu</span><input [ngModel]="meta(car,'fuelTankCapacity')" (ngModelChange)="setMeta(car,'fuelTankCapacity',$event)" name="fuelTankCapacity" /></label>
                        <label class="field"><span>Jant / lastik</span><input [ngModel]="meta(car,'wheelSize')" (ngModelChange)="setMeta(car,'wheelSize',$event)" name="wheelSize" /></label>
                        <label class="field"><span>Ağırlık</span><input [ngModel]="meta(car,'weight')" (ngModelChange)="setMeta(car,'weight',$event)" name="weight" /></label>
                        <label class="field"><span>Silindir sayısı</span><input [ngModel]="meta(car,'cylinderCount')" (ngModelChange)="setMetaNumber(car,'cylinderCount',$event)" name="cylinderCount" type="number" min="1" max="16" /></label>
                        <label class="field"><span>Uzunluk</span><input [ngModel]="meta(car,'length')" (ngModelChange)="setMeta(car,'length',$event)" name="length" /></label>
                        <label class="field"><span>Genişlik</span><input [ngModel]="meta(car,'width')" (ngModelChange)="setMeta(car,'width',$event)" name="width" /></label>
                        <label class="field"><span>Yükseklik</span><input [ngModel]="meta(car,'height')" (ngModelChange)="setMeta(car,'height',$event)" name="height" /></label>
                        <label class="field"><span>Bagaj hacmi</span><input [ngModel]="meta(car,'trunkVolume')" (ngModelChange)="setMeta(car,'trunkVolume',$event)" name="trunkVolume" /></label>
                        @if (car.category === 'RENTAL') {
                          <label class="field"><span>Araç sınıfı</span><input [ngModel]="meta(car,'group')" (ngModelChange)="setMeta(car,'group',$event)" name="group" /></label>
                          <label class="field"><span>Bagaj adedi</span><input [ngModel]="meta(car,'luggage')" (ngModelChange)="setMetaNumber(car,'luggage',$event)" name="luggage" type="number" /></label>
                          <label class="field"><span>Şoför seçeneği</span><select [ngModel]="meta(car,'driverOption') || 'BOTH'" (ngModelChange)="setMeta(car,'driverOption',$event)" name="driverOption"><option value="WITH_DRIVER">Şoförlü</option><option value="WITHOUT_DRIVER">Şoförsüz</option><option value="BOTH">Her ikisi</option></select></label>
                          <label class="field"><span>Depozito TL</span><input [ngModel]="meta(car,'deposit')" (ngModelChange)="setMetaNumber(car,'deposit',$event)" name="deposit" type="number" /></label>
                          <label class="field"><span>Minimum yaş</span><input [ngModel]="meta(car,'minAge')" (ngModelChange)="setMetaNumber(car,'minAge',$event)" name="minAge" type="number" /></label>
                          <label class="field"><span>Minimum ehliyet yılı</span><input [ngModel]="meta(car,'minLicenseYears')" (ngModelChange)="setMetaNumber(car,'minLicenseYears',$event)" name="licenseYears" type="number" /></label>
                          <label class="field"><span>Günlük KM limiti</span><input [ngModel]="meta(car,'dailyMileageLimit')" (ngModelChange)="setMetaNumber(car,'dailyMileageLimit',$event)" name="dailyMileage" type="number" /></label>
                        } @else {
                          <label class="field md:col-span-2"><span>Hasar / boya özeti</span><input [ngModel]="meta(car,'damageStatus')" (ngModelChange)="setMeta(car,'damageStatus',$event)" name="damageStatus" placeholder="Örn. 1 lokal boyalı, değişen yok" /></label>
                          <label class="field"><span>Tramer durumu</span><select [ngModel]="saleTramerStatus(car)" (ngModelChange)="setSaleTramerStatus(car,$event)" name="tramerStatus"><option value="UNKNOWN">Bilinmiyor / doğrulanmadı</option><option value="DECLARED_CLEAN">Beyan: kayıt yok</option><option value="DECLARED_RECORD">Beyan: kayıt var</option><option value="VERIFIED_CLEAN">Doğrulandı: kayıt yok</option><option value="VERIFIED_RECORD">Doğrulandı: kayıt var</option></select></label>
                          <label class="field"><span>Toplam tramer tutarı TL</span><input type="number" min="0" [ngModel]="meta(car,'tramerAmount')" (ngModelChange)="setOptionalMetaNumber(car,'tramerAmount',$event)" name="tramerAmount" [disabled]="saleTramerStatus(car)==='UNKNOWN'||saleTramerStatus(car).endsWith('CLEAN')" /></label>
                          <label class="field md:col-span-2"><span>Tramer / hasar açıklaması</span><input [ngModel]="meta(car,'tramer')" (ngModelChange)="setMeta(car,'tramer',$event)" name="tramer" placeholder="Kayıt varsa açıklayın; bilinmiyorsa açıkça belirtin" /></label>
                          @if (isVerifiedSaleTramer(car)) {
                            <label class="field"><span>Doğrulama kaynağı</span><input [ngModel]="meta(car,'tramerSourceName')" (ngModelChange)="setMeta(car,'tramerSourceName',$event)" name="tramerSourceName" /></label>
                            <label class="field"><span>Kaynak HTTPS URL</span><input type="url" [ngModel]="meta(car,'tramerSourceUrl')" (ngModelChange)="setMeta(car,'tramerSourceUrl',$event)" name="tramerSourceUrl" placeholder="https://..." /></label>
                            <label class="field"><span>Doğrulama zamanı</span><input type="datetime-local" [ngModel]="meta(car,'tramerVerifiedAt')" (ngModelChange)="setMeta(car,'tramerVerifiedAt',$event)" name="tramerVerifiedAt" /></label>
                          }
                          <label class="field"><span>Garanti</span><input [ngModel]="meta(car,'warranty')" (ngModelChange)="setMeta(car,'warranty',$event)" name="warranty" /></label>
                          <label class="check md:col-span-2"><input type="checkbox" [ngModel]="meta(car,'isDamageFree')===true" (ngModelChange)="setMeta(car,'isDamageFree',$event)" name="isDamageFree" /> Hasarsız / hatasız beyanı</label>
                          <div class="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div class="mb-3"><strong class="block text-sm font-black text-slate-900">Parça Bazlı Ekspertiz</strong><span class="text-[11px] text-slate-500">Her parçayı Bilgi yok, Orijinal, Lokal Boyalı, Boyalı veya Değişen olarak seçin. Bilgi yok, orijinal sayılmaz.</span></div><div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">@for (part of saleParts; track part.key) {<label class="field"><span>{{part.label}}</span><select [ngModel]="salePartStatus(car,part.key)" (ngModelChange)="setSalePart(car,part.key,$event)" [name]="'salePart_'+part.key"><option value="">Bilgi yok</option><option value="original">Orijinal</option><option value="local_painted">Lokal Boyalı</option><option value="painted">Boyalı</option><option value="changed">Değişen</option></select></label>}</div></div>
                        }
                        <label class="field md:col-span-2"><span>Açıklama</span><textarea [(ngModel)]="car.description" name="description" rows="6"></textarea></label>
                        <label class="field md:col-span-2"><span>Özellikler, satır başına bir tane</span><textarea [ngModel]="car.features.join('\n')" (ngModelChange)="car.features=splitLines($event)" name="features" rows="7"></textarea></label>
                      </div>
                    </section>

                    <section class="panel">
                      <header><h2>Gerçek Kayıt, Kaynak & Şube</h2></header>
                      <div class="form-grid">
                        <div class="rounded-xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">GERÇEK ARAÇ</div>
                        <label class="field"><span>Veri doğrulama</span><select [(ngModel)]="car.dataQualityStatus" name="quality"><option value="BUSINESS_VERIFIED">İşletme doğruladı</option><option value="RESEARCHED">Araştırma ile tamamlandı</option><option value="UNVERIFIED">Henüz kontrol edilmedi</option></select></label>
                        <label class="field"><span>Teknik kaynak adı</span><input [(ngModel)]="car.specSourceName" name="sourceName" /></label>
                        <label class="field"><span>Teknik kaynak URL</span><input [(ngModel)]="car.specSourceUrl" name="sourceUrl" type="url" /></label>
                        <label class="field"><span>Şube</span><select [(ngModel)]="car.branchId" name="branch"><option [ngValue]="undefined">Şube seçilmedi</option>@for (branch of branches(); track branch.id) {<option [ngValue]="branch.id">{{ branch.name }} · {{ branch.city }}</option>}</select></label>
                        <label class="field"><span>Müsaitlik</span><select [(ngModel)]="car.availabilityStatus" name="availability"><option value="AVAILABLE">Müsait / Satışta</option><option value="RESERVED">Rezerve</option><option value="RENTED">Kirada</option><option value="SOLD">Satıldı</option><option value="MAINTENANCE">Bakımda</option></select></label>
                      </div>
                    </section>
                  </div>

                  <aside class="space-y-5 2xl:sticky 2xl:top-20 2xl:self-start">
                    <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h2 class="mb-3 text-lg font-black text-slate-900">Canlı Kart Önizlemesi</h2><app-vehicle-card [car]="previewVehicle(car)"></app-vehicle-card></section>
                    <ng-container *ngTemplateOutlet="mediaPanel; context: {$implicit: 'VEHICLE', id: car.id}"></ng-container>
                  </aside>
                </div>

                <section class="panel">
                  <header><h2>Yayın Kontrolü</h2></header>
                  <div class="form-grid">
                    <label class="field"><span>Yayın durumu</span><select [(ngModel)]="car.publicationStatus" name="publication"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label>
                    <label class="field"><span>Planlanan tarih</span><input [(ngModel)]="car.scheduledAt" name="scheduled" type="datetime-local" aria-label="Araç planlanan yayın tarihi ve saati" /></label>
                    <label class="check"><input type="checkbox" [(ngModel)]="car.isFeatured" name="featured" /> Ana sayfada öne çıkarılabilir</label>
                    <label class="check"><input type="checkbox" [(ngModel)]="car.isActive" name="active" /> Kayıt aktif</label>
                  </div>
                  <div class="mt-5 grid gap-2 sm:grid-cols-4">
                    <button type="button" (click)="saveAsVehicleDraft()" [disabled]="saving()" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-black">Taslak Kaydet</button>
                    <button type="button" (click)="scheduleVehicle()" [disabled]="saving()" class="min-h-12 rounded-xl bg-amber-500 px-4 font-black text-slate-950">Planla</button>
                    <button type="button" (click)="publishVehicle()" [disabled]="saving()" class="min-h-12 rounded-xl bg-blue-600 px-4 font-black text-white">Canlı Yayınla</button>
                    <button type="button" (click)="archiveVehicle()" [disabled]="saving()" class="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Arşivle</button>
                  </div>
                </section>
              </form>
            } @else if (selectedTour(); as tour) {
              <form (ngSubmit)="saveTour()" class="space-y-5">
                <div class="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
                  <div class="space-y-5">
                    <section class="panel">
                      <header><h2>Gerçek Tur Kartı</h2></header>
                      <div class="form-grid">
                        <label class="field md:col-span-2"><span>Tur adı</span><input [(ngModel)]="tour.title" name="tourTitle" required /></label>
                        <label class="field"><span>Kategori</span><input [(ngModel)]="tour.category" name="tourCategory" /></label>
                        <label class="field"><span>Fiyat / kişi TL</span><input [(ngModel)]="tour.pricePerPerson" name="tourPrice" type="number" min="0" /></label>
                        <label class="field"><span>Süre</span><input [(ngModel)]="tour.duration" name="duration" /></label>
                        <label class="field"><span>Kapasite</span><input [(ngModel)]="tour.capacity" name="capacity" type="number" min="1" /></label>
                        <label class="field"><span>SEO adresi</span><input [(ngModel)]="tour.seoSlug" name="tourSlug" required /></label>
                        <label class="field"><span>Şube</span><select [(ngModel)]="tour.branchId" name="tourBranch"><option [ngValue]="undefined">Şube seçilmedi</option>@for (branch of branches(); track branch.id) {<option [ngValue]="branch.id">{{ branch.name }} · {{ branch.city }}</option>}</select></label>
                        <label class="field md:col-span-2"><span>Kısa açıklama</span><textarea [(ngModel)]="tour.shortDescription" name="shortDescription" rows="3"></textarea></label>
                        <label class="field md:col-span-2"><span>Detaylı açıklama</span><textarea [(ngModel)]="tour.description" name="tourDescription" rows="7"></textarea></label>
                        <label class="field md:col-span-2"><span>Öne çıkanlar, satır başına bir</span><textarea [ngModel]="metaArray(tour,'highlights').join('\n')" (ngModelChange)="setMeta(tour,'highlights',splitLines($event))" name="highlights" rows="5"></textarea></label>
                        <label class="field md:col-span-2"><span>Dahil olanlar, satır başına bir</span><textarea [ngModel]="tour.includedItems.join('\n')" (ngModelChange)="tour.includedItems=splitLines($event)" name="included" rows="5"></textarea></label>
                        <label class="field md:col-span-2"><span>Dahil olmayanlar, satır başına bir</span><textarea [ngModel]="tour.excludedItems.join('\n')" (ngModelChange)="tour.excludedItems=splitLines($event)" name="excluded" rows="5"></textarea></label>
                      </div>
                    </section>

                    <section class="panel">
                      <header><h2>GPS, Google Harita & Rota</h2></header>
                      <div class="form-grid">
                        <label class="field md:col-span-2"><span>Konum adı</span><input [(ngModel)]="tour.locationName" name="locationName" /></label>
                        <label class="field"><span>Enlem</span><input [(ngModel)]="tour.latitude" name="latitude" type="number" step="0.000001" min="-90" max="90" /></label>
                        <label class="field"><span>Boylam</span><input [(ngModel)]="tour.longitude" name="longitude" type="number" step="0.000001" min="-180" max="180" /></label>
                        <label class="field md:col-span-2"><span>Google Maps / Harita URL</span><input [(ngModel)]="tour.mapUrl" name="mapUrl" type="url" /></label>
                        <label class="field md:col-span-2"><span>Buluşma noktası</span><input [(ngModel)]="tour.meetingPoint" name="meetingPoint" /></label>
                        <label class="field"><span>Kaynak adı</span><input [(ngModel)]="tour.sourceName" name="tourSourceName" /></label>
                        <label class="field"><span>Kaynak URL</span><input [(ngModel)]="tour.sourceUrl" name="tourSourceUrl" type="url" /></label>
                        <label class="field"><span>Veri doğrulama</span><select [(ngModel)]="tour.dataQualityStatus" name="tourQuality"><option value="BUSINESS_VERIFIED">İşletme doğruladı</option><option value="RESEARCHED">Araştırma ile doğrulandı</option><option value="UNVERIFIED">Henüz kontrol edilmedi</option></select></label>
                        <div class="rounded-xl bg-emerald-50 p-4 text-sm font-black text-emerald-800">GERÇEK TUR</div>
                      </div>
                    </section>
                  </div>

                  <aside class="space-y-5 2xl:sticky 2xl:top-20 2xl:self-start">
                    <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">@if (tour.coverImage || tour.images[0]) {<img [src]="tour.coverImage || tour.images[0]" [alt]="tour.title" class="h-full w-full object-cover" referrerpolicy="no-referrer" />} @else {<div class="flex h-full items-center justify-center text-sm font-bold text-slate-400">Kapak görseli yüklenmedi</div>}</div>
                      <h2 class="mt-4 text-xl font-black text-slate-900">{{ tour.title }}</h2><p class="mt-1 text-sm text-slate-500">{{ tour.duration || 'Süre belirtilmedi' }} · {{ tour.locationName || tour.meetingPoint || 'Konum belirtilmedi' }}</p><strong class="mt-3 block text-xl text-violet-700">{{ tour.pricePerPerson | number:'1.0-0' }} TL / kişi</strong>
                    </section>
                    <ng-container *ngTemplateOutlet="mediaPanel; context: {$implicit: 'TOUR', id: tour.id}"></ng-container>
                  </aside>
                </div>

                <section class="panel">
                  <header><h2>Tur Yayını</h2></header>
                  <div class="form-grid">
                    <label class="field"><span>Yayın durumu</span><select [(ngModel)]="tour.publicationStatus" name="tourPublication"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label>
                    <label class="field"><span>Planlanan tarih</span><input [(ngModel)]="tour.scheduledAt" name="tourScheduled" type="datetime-local" aria-label="Tur planlanan yayın tarihi ve saati" /></label>
                    <label class="check"><input type="checkbox" [(ngModel)]="tour.isFeatured" name="tourFeatured" /> Ana sayfada öne çıkarılabilir</label>
                    <label class="check"><input type="checkbox" [(ngModel)]="tour.isActive" name="tourActive" /> Kayıt aktif</label>
                  </div>
                  <div class="mt-5 grid gap-2 sm:grid-cols-4"><button type="button" (click)="saveAsTourDraft()" [disabled]="saving()" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-black">Taslak Kaydet</button><button type="button" (click)="scheduleTour()" [disabled]="saving()" class="min-h-12 rounded-xl bg-amber-500 px-4 font-black text-slate-950">Planla</button><button type="button" (click)="publishTour()" [disabled]="saving()" class="min-h-12 rounded-xl bg-violet-600 px-4 font-black text-white">Canlı Yayınla</button><button type="button" (click)="archiveTour()" [disabled]="saving()" class="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white">Arşivle</button></div>
                </section>
              </form>
            } @else {<div class="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 class="text-xl font-black text-slate-900">Düzenlemek için soldan bir kayıt seç</h2></div>}
          </section>
        </div>
      </div>

      <ng-template #mediaPanel let-entityType let-id="id">
        <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3"><div><h2 class="text-lg font-black text-slate-900">Fotoğraf & Video</h2><p class="text-xs text-slate-500">Yüklenen medya canlı karta ve detay sayfasına otomatik bağlanır.</p></div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{{ media().length }}</span></div>
          <label class="mt-4 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 text-sm font-black text-blue-700"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" class="sr-only" aria-label="Fotoğraf veya video dosyaları seç" (change)="uploadFiles($event, entityType, id)" />{{ uploading() ? 'Yükleniyor %' + mediaService.uploadProgress() : 'Fotoğraf / Video Yükle' }}</label>
          <p class="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">Medya yalnız dosya yükleyerek eklenir. Yeni dosyalar doğrudan Alperler Auto medya deposuna kaydedilir; dış URL yapıştırma kullanılmaz.</p>
          <div class="mt-4 space-y-2">
            @for (item of media(); track item.id) {
              <article class="rounded-2xl border border-slate-200 p-2"><div class="flex gap-3"><div class="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">@if (item.kind === 'IMAGE') {<img [src]="item.url" [alt]="item.altText" class="h-full w-full object-cover" />} @else {<div class="flex h-full items-center justify-center text-xs font-black text-violet-700">VIDEO</div>}</div><div class="min-w-0 flex-1"><strong class="block truncate text-xs text-slate-900">{{ item.altText || item.kind }}</strong><small class="block truncate text-slate-500">{{ item.attribution || item.sourceName || 'İşletme medyası' }}</small></div></div><div class="mt-2 grid grid-cols-2 gap-2">@if (item.kind === 'IMAGE') {<button type="button" (click)="makeCover(item)" [disabled]="item.isCover" class="min-h-9 rounded-lg bg-blue-50 text-[11px] font-black text-blue-700 disabled:opacity-40">{{ item.isCover ? 'Kapak Görseli' : 'Kapak Yap' }}</button>}<button type="button" (click)="removeMedia(item)" class="min-h-9 rounded-lg bg-rose-50 text-[11px] font-black text-rose-700">Kaldır</button></div></article>
            } @empty {<div class="rounded-xl border border-dashed p-5 text-center text-xs text-slate-500">Henüz bağlı medya yok.</div>}
          </div>
        </section>
      </ng-template>
    </main>
  `,
  styles: [`
    .panel { border: 1px solid rgb(226 232 240); background: white; border-radius: 1.5rem; padding: 1rem; box-shadow: 0 1px 2px rgb(15 23 42 / .04); }
    .panel > header { margin-bottom: 1rem; }
    .panel > header h2 { font-size: 1.1rem; font-weight: 900; color: rgb(15 23 42); }
    .form-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: .9rem; }
    .field { display: flex; min-width: 0; flex-direction: column; gap: .35rem; font-size: .75rem; font-weight: 800; color: rgb(71 85 105); }
    .field input, .field select, .field textarea { width: 100%; min-height: 2.75rem; border: 1px solid rgb(226 232 240); border-radius: .75rem; background: rgb(248 250 252); padding: .7rem .8rem; color: rgb(15 23 42); outline: none; font-weight: 600; }
    .field textarea { resize: vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { box-shadow: 0 0 0 2px rgb(59 130 246 / .35); border-color: rgb(59 130 246); }
    .check { display: flex; min-height: 2.75rem; align-items: center; gap: .6rem; border-radius: .75rem; background: rgb(248 250 252); padding: .7rem .8rem; font-size: .75rem; font-weight: 800; color: rgb(51 65 85); }
    @media (min-width: 768px) { .panel { padding: 1.5rem; } .form-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  `],
})
export class AdminCatalogEditorComponent implements OnInit {
  private readonly editor = inject(CatalogAdminEditorService);
  readonly mediaService = inject(CatalogMediaService);
  private readonly management = inject(AdminManagementService);
  private readonly toast = inject(ToastService);

  readonly vehicles = signal<VehicleAdminRecord[]>([]);
  readonly tours = signal<TourAdminRecord[]>([]);
  readonly selectedVehicle = signal<VehicleAdminRecord | null>(null);
  readonly selectedTour = signal<TourAdminRecord | null>(null);
  readonly media = signal<CatalogMediaItem[]>([]);
  readonly filter = signal<"RENTAL" | "SALE" | "TOUR">("RENTAL");
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal("");
  readonly saleParts=[{key:'hood',label:'Kaput'},{key:'frontBumper',label:'Ön tampon'},{key:'rearBumper',label:'Arka tampon'},{key:'roof',label:'Tavan'},{key:'trunk',label:'Bagaj kapağı'},{key:'frontLeftDoor',label:'Sol ön kapı'},{key:'frontRightDoor',label:'Sağ ön kapı'},{key:'rearLeftDoor',label:'Sol arka kapı'},{key:'rearRightDoor',label:'Sağ arka kapı'},{key:'frontLeftFender',label:'Sol ön çamurluk'},{key:'frontRightFender',label:'Sağ ön çamurluk'},{key:'rearLeftFender',label:'Sol arka çamurluk'},{key:'rearRightFender',label:'Sağ arka çamurluk'}] as const;
  search = "";

  readonly branches = computed(() => this.management.branches().filter((branch) => branch.isActive));
  readonly filteredVehicles = computed(() => {const q = this.search.trim().toLocaleLowerCase("tr-TR");const category = this.filter();if (category === "TOUR") return [];return this.vehicles().filter((item) => item.category === category).filter((item) => !q || `${item.brand} ${item.model} ${item.stockCode}`.toLocaleLowerCase("tr-TR").includes(q));});
  readonly filteredTours = computed(() => {const q = this.search.trim().toLocaleLowerCase("tr-TR");return this.tours().filter((item) => !q || `${item.title} ${item.category || ''}`.toLocaleLowerCase("tr-TR").includes(q));});

  ngOnInit(): void {void this.refresh();}
  async refresh(): Promise<void> {this.loading.set(true);this.error.set("");try {await this.management.refreshPeople();const [vehicles,tours]=await Promise.all([this.editor.vehicles(),this.editor.tours()]);this.vehicles.set(vehicles);this.tours.set(tours);if(!this.selectedVehicle()&&!this.selectedTour()){const first=vehicles.find((item)=>item.category==="RENTAL")||vehicles[0];if(first)await this.selectVehicle(first);}} catch(error){this.error.set(this.message(error));} finally{this.loading.set(false);}}
  async createVehicle(category:"RENTAL"|"SALE"):Promise<void>{this.saving.set(true);try{const item=await this.editor.createVehicle(category);if(category==='SALE'){item.metadata={...(item.metadata||{}),tramerStatus:'UNKNOWN',tramerCurrency:'TRY',damageExpertise:{},isDamageFree:false};}this.vehicles.update((rows)=>[item,...rows]);this.filter.set(category);await this.selectVehicle(item);this.toast.show(`${category==='RENTAL'?'Kiralık':'Satılık'} gerçek araç kaydı oluşturuldu.`,"success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.saving.set(false);}}
  async createTour():Promise<void>{this.saving.set(true);try{const item=await this.editor.createTour();this.tours.update((rows)=>[item,...rows]);this.filter.set("TOUR");await this.selectTour(item);this.toast.show("Gerçek tur kaydı oluşturuldu.","success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.saving.set(false);}}
  async selectVehicle(item:VehicleAdminRecord):Promise<void>{this.selectedTour.set(null);this.selectedVehicle.set(this.clone(item));await this.loadMedia("VEHICLE",item.id);}
  async selectTour(item:TourAdminRecord):Promise<void>{this.selectedVehicle.set(null);this.selectedTour.set(this.clone(item));await this.loadMedia("TOUR",item.id);}
  async saveVehicle():Promise<void>{const car=this.selectedVehicle();if(!car)return;if(car.publicationStatus==="SCHEDULED"&&!this.validFutureSchedule(car.scheduledAt)){this.toast.show("Planlı yayın için gelecekte bir tarih ve saat seçin.","error");return;}if(car.category==="RENTAL"&&this.meta(car,"hourlyRentalEnabled")===true){const hourly=Number(this.meta(car,"hourlyPrice")||0),minimum=Number(this.meta(car,"minimumRentalHours")||1);if(hourly<=0){this.toast.show("Saatlik kiralama açıksa saatlik fiyat sıfırdan büyük olmalı.","error");return;}if(!Number.isInteger(minimum)||minimum<1||minimum>23){this.toast.show("Minimum saat 1 ile 23 arasında olmalı.","error");return;}}if(car.category==='SALE'){const saleError=this.saleTruthError(car);if(saleError){this.toast.show(saleError,'error');return;}}car.recordOrigin="REAL";this.saving.set(true);try{await this.editor.saveVehicle(car);await this.reloadCurrent();this.selectedVehicle.set(null);this.media.set([]);this.toast.show("Araç bilgileri kaydedildi.","success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.saving.set(false);}}
  async saveAsVehicleDraft():Promise<void>{const car=this.selectedVehicle();if(!car)return;car.publicationStatus="DRAFT";car.isActive=false;car.scheduledAt=undefined;await this.saveVehicle();}
  async scheduleVehicle():Promise<void>{const car=this.selectedVehicle();if(!car)return;if(!this.validFutureSchedule(car.scheduledAt)){this.toast.show("Planlamak için gelecekte bir tarih ve saat seçin.","error");return;}car.publicationStatus="SCHEDULED";car.isActive=true;car.publishedAt=undefined;await this.saveVehicle();}
  async publishVehicle():Promise<void>{const car=this.selectedVehicle();if(!car)return;car.publicationStatus="PUBLISHED";car.isActive=true;car.publishedAt=new Date().toISOString();car.scheduledAt=undefined;await this.saveVehicle();}
  async archiveVehicle():Promise<void>{const car=this.selectedVehicle();if(!car)return;car.publicationStatus="ARCHIVED";car.isActive=false;car.scheduledAt=undefined;await this.saveVehicle();}
  async saveTour():Promise<void>{const tour=this.selectedTour();if(!tour)return;if(tour.publicationStatus==="SCHEDULED"&&!this.validFutureSchedule(tour.scheduledAt)){this.toast.show("Planlı tur yayını için gelecekte bir tarih ve saat seçin.","error");return;}tour.recordOrigin="REAL";this.saving.set(true);try{await this.editor.saveTour(tour);await this.reloadCurrent();this.selectedTour.set(null);this.media.set([]);this.toast.show("Tur bilgileri kaydedildi.","success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.saving.set(false);}}
  async saveAsTourDraft():Promise<void>{const tour=this.selectedTour();if(!tour)return;tour.publicationStatus="DRAFT";tour.isActive=false;tour.scheduledAt=undefined;await this.saveTour();}
  async scheduleTour():Promise<void>{const tour=this.selectedTour();if(!tour)return;if(!this.validFutureSchedule(tour.scheduledAt)){this.toast.show("Planlamak için gelecekte bir tarih ve saat seçin.","error");return;}tour.publicationStatus="SCHEDULED";tour.isActive=true;tour.publishedAt=undefined;await this.saveTour();}
  async publishTour():Promise<void>{const tour=this.selectedTour();if(!tour)return;tour.publicationStatus="PUBLISHED";tour.isActive=true;tour.publishedAt=new Date().toISOString();tour.scheduledAt=undefined;await this.saveTour();}
  async archiveTour():Promise<void>{const tour=this.selectedTour();if(!tour)return;tour.publicationStatus="ARCHIVED";tour.isActive=false;tour.scheduledAt=undefined;await this.saveTour();}
  async uploadFiles(event:Event,entityType:"VEHICLE"|"TOUR",id:string):Promise<void>{const input=event.target as HTMLInputElement;const files=Array.from(input.files||[]).slice(0,20);if(!files.length)return;this.uploading.set(true);try{let hasCover=this.media().some((item)=>item.kind==="IMAGE"&&item.isCover);let sortOrder=this.media().length+1;for(const file of files){const isImage=file.type.startsWith("image/");await this.mediaService.upload(entityType,id,file,{altText:file.name,isCover:isImage&&!hasCover,sortOrder});if(isImage&&!hasCover)hasCover=true;sortOrder+=1;}await this.loadMedia(entityType,id);await this.reloadCurrent();this.toast.show("Medya yüklendi ve katalog kaydına bağlandı.","success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.uploading.set(false);input.value="";}}
  async makeCover(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.update(item,{isCover:true});await this.loadMediaForSelection();await this.reloadCurrent();this.toast.show("Kapak görseli değiştirildi.","success");}catch(error){this.toast.show(this.message(error),"error");}}
  async removeMedia(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.remove(item);await this.loadMediaForSelection();await this.reloadCurrent();this.toast.show("Medya kaldırıldı.","info");}catch(error){this.toast.show(this.message(error),"error");}}
  previewVehicle(car:VehicleAdminRecord):Vehicle{return{id:car.id,category:car.category,cloudId:car.id,title:String(this.meta(car,"title")||""),brand:car.brand,model:car.model,series:String(this.meta(car,"series")||""),year:car.modelYear,price:car.category==="RENTAL"?Number(car.rentalPriceDaily??car.price??0):Number(car.price||0),hourlyRentalEnabled:car.category==="RENTAL"&&this.meta(car,"hourlyRentalEnabled")===true,hourlyPrice:car.category==="RENTAL"?Number(this.meta(car,"hourlyPrice")||0):undefined,minimumRentalHours:car.category==="RENTAL"?Number(this.meta(car,"minimumRentalHours")||1):undefined,hourlyMileageLimit:car.category==="RENTAL"?Number(this.meta(car,"hourlyMileageLimit")||0)||undefined:undefined,km:car.category==="SALE"?car.mileageKm:undefined,fuel:car.fuelType,transmission:car.transmission,type:car.bodyType,color:car.color,location:car.location,seats:car.seats,image:car.coverImage||car.images[0],images:car.images,badge:String(this.meta(car,"badge")||""),description:car.description,features:car.features,isFeatured:car.isFeatured,isAvailable:car.availabilityStatus==="AVAILABLE"};}
  meta(record:{metadata:Record<string,unknown>},key:string):any{return record.metadata?.[key]??"";}metaArray(record:{metadata:Record<string,unknown>},key:string):string[]{const value=record.metadata?.[key];return Array.isArray(value)?value.map(String):[];}setMeta(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{record.metadata={...(record.metadata||{}),[key]:value};}setMetaNumber(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{const parsed=Number(value);this.setMeta(record,key,Number.isFinite(parsed)?parsed:null);}setOptionalMetaNumber(record:{metadata:Record<string,unknown>},key:string,value:unknown):void{if(value===''||value==null){const m={...(record.metadata||{})};delete m[key];record.metadata=m;return;}const parsed=Number(value);if(Number.isFinite(parsed))this.setMeta(record,key,Math.max(0,parsed));}saleTramerStatus(record:{metadata:Record<string,unknown>}):string{const s=String(this.meta(record,'tramerStatus')||'UNKNOWN').toUpperCase();return ['DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD'].includes(s)?s:'UNKNOWN';}isVerifiedSaleTramer(record:{metadata:Record<string,unknown>}):boolean{return this.saleTramerStatus(record).startsWith('VERIFIED_');}setSaleTramerStatus(record:{metadata:Record<string,unknown>},value:string):void{const s=['UNKNOWN','DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD'].includes(value)?value:'UNKNOWN';this.setMeta(record,'tramerStatus',s);this.setMeta(record,'tramerCurrency','TRY');if(s==='UNKNOWN'){this.setMeta(record,'tramer','Belirtilmedi / doğrulanmadı');this.setOptionalMetaNumber(record,'tramerAmount','');}if(s==='DECLARED_CLEAN'){this.setMeta(record,'tramer','Beyan: tramer kaydı yok');this.setMeta(record,'tramerAmount',0);}if(s==='VERIFIED_CLEAN'){this.setMeta(record,'tramer','Doğrulandı: tramer kaydı yok');this.setMeta(record,'tramerAmount',0);}if(!s.startsWith('VERIFIED_')){const m={...(record.metadata||{})};delete m['tramerSourceName'];delete m['tramerSourceUrl'];delete m['tramerVerifiedAt'];record.metadata=m;}}salePartStatus(record:{metadata:Record<string,unknown>},key:string):string{const raw=this.meta(record,'damageExpertise');const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?String((raw as Record<string,unknown>)[key]||''):'';return ['original','local_painted','painted','changed'].includes(v)?v:'';}setSalePart(record:{metadata:Record<string,unknown>},key:string,value:string):void{const raw=this.meta(record,'damageExpertise');const map=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...(raw as Record<string,unknown>)}:{};if(['original','local_painted','painted','changed'].includes(value))map[key]=value;else delete map[key];this.setMeta(record,'damageExpertise',map);}saleTruthError(record:{metadata:Record<string,unknown>,publicationStatus:string}):string{const status=this.saleTramerStatus(record);const publishing=record.publicationStatus==='PUBLISHED'||record.publicationStatus==='SCHEDULED';if(publishing&&status==='UNKNOWN')return 'Canlı satılık ilanda tramer durumu için en az beyan seçilmelidir.';if(status.endsWith('RECORD')&&Number(this.meta(record,'tramerAmount')||0)<=0)return 'Tramer kaydı varsa toplam tramer tutarını TL olarak girin.';if(status.endsWith('RECORD')&&!String(this.meta(record,'tramer')||'').trim())return 'Tramer kaydı açıklaması eksik.';if(this.isVerifiedSaleTramer(record)){if(!String(this.meta(record,'tramerSourceName')||'').trim())return 'Doğrulanmış tramer için kaynak adı zorunlu.';try{if(new URL(String(this.meta(record,'tramerSourceUrl')||'')).protocol!=='https:')return 'Tramer doğrulama bağlantısı HTTPS olmalı.';}catch{return 'Tramer doğrulama bağlantısı geçersiz.';}if(!String(this.meta(record,'tramerVerifiedAt')||'').trim())return 'Tramer doğrulama zamanı zorunlu.';}const raw=this.meta(record,'damageExpertise');const vals=raw&&typeof raw==='object'&&!Array.isArray(raw)?Object.values(raw as Record<string,unknown>).map(String):[];if(this.meta(record,'isDamageFree')===true&&vals.some(v=>v==='local_painted'||v==='painted'||v==='changed'))return 'Hasarsız beyanı ile lokal boyalı, boyalı veya değişen parça aynı anda seçilemez.';return '';}splitLines(value:unknown):string[]{return String(value||"").split(/\r?\n/).map((line)=>line.trim()).filter(Boolean).slice(0,100);}statusLabel(status:string):string{return status==="PUBLISHED"?"CANLI":status==="DRAFT"?"TASLAK":status==="SCHEDULED"?"PLANLI":"ARŞİV";}
  private validFutureSchedule(value?:string):boolean{if(!value)return false;const timestamp=new Date(value).getTime();return Number.isFinite(timestamp)&&timestamp>Date.now()+60_000;}
  private async loadMedia(type:"VEHICLE"|"TOUR",id:string):Promise<void>{try{this.media.set(await this.mediaService.load(type,id));}catch{this.media.set([]);}}
  private async loadMediaForSelection():Promise<void>{const car=this.selectedVehicle();if(car)return this.loadMedia("VEHICLE",car.id);const tour=this.selectedTour();if(tour)return this.loadMedia("TOUR",tour.id);}
  private async reloadCurrent():Promise<void>{const vehicleId=this.selectedVehicle()?.id;const tourId=this.selectedTour()?.id;const[vehicles,tours]=await Promise.all([this.editor.vehicles(),this.editor.tours()]);this.vehicles.set(vehicles);this.tours.set(tours);if(vehicleId){const row=vehicles.find((item)=>item.id===vehicleId);if(row)this.selectedVehicle.set(this.clone(row));}if(tourId){const row=tours.find((item)=>item.id===tourId);if(row)this.selectedTour.set(this.clone(row));}}
  private clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}private message(error:unknown):string{return error instanceof Error?error.message:"İşlem tamamlanamadı.";}
}
