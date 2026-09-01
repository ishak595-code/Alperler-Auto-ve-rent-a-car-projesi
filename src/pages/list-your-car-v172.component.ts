import { CommonModule, Location } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Branch } from "../models/branch.model";
import { BranchPublicV171Service } from "../services/branch-public-v171.service";
import { GeoDirectoryService } from "../services/geo-directory.service";
import { PartnerIntent } from "../services/partner-request.service";
import {
  OwnershipStatusV172,
  ValuationFuelV172,
  ValuationTransmissionV172,
  VehicleValuationV172Service,
} from "../services/vehicle-valuation-v172.service";

@Component({
  selector: "app-list-your-car-v172",
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-950 text-white">
      <header class="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur-xl md:px-8">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" (click)="goBack()" aria-label="Önceki sayfaya dön" class="grid min-h-12 min-w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">←</button>
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Alperler Auto</p>
            <h1 class="truncate text-lg font-black tracking-tight md:text-xl">Araç Değerleme ve Filoya Kabul</h1>
          </div>
          <div class="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 sm:block">Güvenli başvuru</div>
        </div>
      </header>

      <section class="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.16),transparent_35%),radial-gradient(circle_at_top_left,rgba(59,130,246,.12),transparent_35%)] px-4 py-10 md:px-8 md:py-16">
        <div class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <span class="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">Satış, garanti ve gelir paylaşımı</span>
            <h2 class="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">Aracını sadece listeleme. Profesyonel değerlemeye sok.</h2>
            <p class="mt-5 max-w-2xl text-sm font-medium leading-7 text-slate-300 md:text-base">Araç bilgilerini, konumunu ve varsa ekspertiz belgelerini gönder. Ekibimiz piyasa bandını, kondisyon sınıfını ve size uygun ticari modeli profesyonel değerleme sürecinde belirler.</p>
            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="hero-stat"><strong>1</strong><span>Güvenli başvuru</span></div>
              <div class="hero-stat"><strong>A-E</strong><span>Kondisyon sınıfı</span></div>
              <div class="hero-stat"><strong>4</strong><span>Teklif modeli</span></div>
            </div>
          </div>
          <aside class="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-6 shadow-2xl shadow-black/20">
            <p class="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Önemli ayrım</p>
            <h3 class="mt-2 text-xl font-black">Beklediğin fiyat resmi teklif değildir.</h3>
            <p class="mt-3 text-sm leading-6 text-amber-50/80">Başvuruda yazdığın tutar yalnızca senin fiyat beklentindir. Alperler Auto piyasa değeri ve resmi teklifi, uzman incelemesi ve gerekiyorsa fiziki ekspertiz sonrasında ayrıca oluşturur.</p>
          </aside>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        @if (success()) {
          <div role="status" aria-live="polite" class="mx-auto max-w-3xl rounded-[2rem] border border-emerald-300/30 bg-emerald-300/10 p-7 text-center md:p-10">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-2xl font-black text-slate-950">✓</div>
            <p class="mt-5 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Başvuru alındı</p>
            <h2 class="mt-2 text-3xl font-black">Değerleme dosyan oluşturuldu.</h2>
            <p class="mt-3 text-sm leading-6 text-slate-300">Referans numaranı sakla. Ekibimiz başvuruyu inceleyip gerekiyorsa ekspertiz veya görüşme randevusu oluşturacak.</p>
            <div class="mx-auto mt-5 max-w-md rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-lg font-black text-emerald-300">{{ reference() }}</div>
            <button type="button" (click)="reset()" class="mt-6 min-h-12 rounded-2xl bg-white px-6 text-sm font-black text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Yeni başvuru oluştur</button>
          </div>
        } @else {
          @if (geo.error()) {
            <div role="alert" class="mb-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">Konum seçenekleri şu anda hazırlanamadı. İl ve ilçe seçimi tamamlanmadan başvuru gönderilemez.</div>
          }
          @if (errorMessage()) {
            <div role="alert" class="mb-5 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">{{ errorMessage() }}</div>
          }

          <div class="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div class="space-y-6">
              <section class="panel">
                <div class="section-head"><span>01</span><div><h2>İşlem modelini seç</h2><p>Aracı satmak mı, filoya gelir modeliyle dahil etmek mi istiyorsun?</p></div></div>
                <div class="mt-5 grid gap-3 md:grid-cols-2">
                  <button type="button" (click)="intent.set('sell')" [class.choice-active]="intent()==='sell'" class="choice-card"><strong>Aracımı satmak istiyorum</strong><span>Uzman değerleme sonrası satın alma teklifi değerlendirilebilir.</span></button>
                  <button type="button" (click)="intent.set('rent')" [class.choice-active]="intent()==='rent'" class="choice-card"><strong>Filoya vermek istiyorum</strong><span>Aylık garanti veya gelir paylaşımı modeli değerlendirilebilir.</span></button>
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><span>02</span><div><h2>Araç bilgileri</h2><p>Değerleme kalitesini doğrudan etkileyen temel teknik bilgiler.</p></div></div>
                <div class="form-grid mt-5">
                  <label><span>Marka *</span><input [ngModel]="carBrand()" (ngModelChange)="carBrand.set($event)" maxlength="100" autocomplete="off" placeholder="Örn. Toyota" /></label>
                  <label><span>Model *</span><input [ngModel]="carModel()" (ngModelChange)="carModel.set($event)" maxlength="100" autocomplete="off" placeholder="Örn. Corolla" /></label>
                  <label><span>Model yılı *</span><input [ngModel]="modelYear()" (ngModelChange)="modelYear.set(toOptionalNumber($event))" type="number" min="1950" [max]="maxModelYear" inputmode="numeric" placeholder="2022" /></label>
                  <label><span>Kilometre *</span><input [ngModel]="km()" (ngModelChange)="km.set(toOptionalNumber($event))" type="number" min="0" max="5000000" inputmode="numeric" placeholder="65000" /></label>
                  <label><span>Yakıt *</span><select [ngModel]="fuelType()" (ngModelChange)="fuelType.set($event)"><option value="">Seç</option><option value="GASOLINE">Benzin</option><option value="DIESEL">Dizel</option><option value="LPG">LPG</option><option value="HYBRID">Hibrit</option><option value="ELECTRIC">Elektrik</option><option value="OTHER">Diğer</option></select></label>
                  <label><span>Vites *</span><select [ngModel]="transmission()" (ngModelChange)="transmission.set($event)"><option value="">Seç</option><option value="AUTOMATIC">Otomatik</option><option value="MANUAL">Manuel</option><option value="SEMI_AUTOMATIC">Yarı otomatik</option><option value="OTHER">Diğer</option></select></label>
                  <label><span>Kasa tipi</span><select [ngModel]="bodyType()" (ngModelChange)="bodyType.set($event)"><option value="">Belirtmek istemiyorum</option><option>Sedan</option><option>Hatchback</option><option>SUV</option><option>Station Wagon</option><option>Coupe</option><option>Pickup</option><option>Van</option><option>Minibüs</option><option>Diğer</option></select></label>
                  <label><span>Renk</span><input [ngModel]="exteriorColor()" (ngModelChange)="exteriorColor.set($event)" maxlength="80" placeholder="Örn. Beyaz" /></label>
                  <label><span>Beklediğin fiyat</span><input [ngModel]="askingPrice()" (ngModelChange)="askingPrice.set(toOptionalNumber($event))" type="number" min="0" inputmode="decimal" placeholder="TL" /><small>Bu tutar resmi değerleme değildir.</small></label>
                  @if (intent()==='rent') {<label class="checkbox-field"><input type="checkbox" [ngModel]="withDriver()" (ngModelChange)="withDriver.set($event)" /><span>Şoförlü hizmet de sunabilirim</span></label>}
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><span>03</span><div><h2>Konum ve tercih edilen şube</h2><p>İl ve ilçenizi seçin, size uygun şube seçeneklerini görüntüleyin.</p></div></div>
                <div class="form-grid mt-5">
                  <label><span>İl *</span><select [ngModel]="provinceCode()" (ngModelChange)="onProvinceChange($event)" [disabled]="geo.loading()"><option value="">{{ geo.loading() ? 'İller hazırlanıyor...' : 'İl seç' }}</option>@for(province of geo.provinces();track province.code){<option [value]="province.code">{{ province.name }}</option>}</select></label>
                  <label><span>İlçe *</span><select [ngModel]="districtCode()" (ngModelChange)="onDistrictChange($event)" [disabled]="!provinceCode()"><option value="">İlçe seç</option>@for(district of districts();track district.code){<option [value]="district.code">{{ district.name }}</option>}</select></label>
                  <label class="md:col-span-2"><span>Tercih edilen şube</span><select [ngModel]="preferredBranchId()" (ngModelChange)="preferredBranchId.set($event)"><option value="">Şube tercihim yok</option>@for(branch of availableBranches();track branch.cloudId || branch.id){<option [value]="branch.cloudId">{{ branch.name }} - {{ branch.city }} / {{ branch.district }}</option>}</select><small>Bölgenize uygun, hizmet veren şubeler gösterilir.</small></label>
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><span>04</span><div><h2>Sahiplik ve araç durumu</h2><p>Ekspertiz öncesi beyan. Nihai kondisyon sınıfını uzman ekip belirler.</p></div></div>
                <div class="form-grid mt-5">
                  <label><span>Sahiplik durumu *</span><select [ngModel]="ownershipStatus()" (ngModelChange)="ownershipStatus.set($event)"><option value="">Seç</option><option value="OWNER">Araç benim</option><option value="AUTHORIZED_SELLER">Satış için yetkiliyim</option><option value="COMPANY_VEHICLE">Şirket aracı</option><option value="OTHER">Diğer</option></select></label>
                  <label class="checkbox-field"><input type="checkbox" [ngModel]="expertReportAvailable()" (ngModelChange)="expertReportAvailable.set($event)" /><span>Mevcut ekspertiz raporum var</span></label>
                  <label class="md:col-span-2"><span>Hasar, değişen, boya ve önemli mekanik durum beyanı</span><textarea [ngModel]="damageDeclaration()" (ngModelChange)="damageDeclaration.set($event)" maxlength="2000" rows="4" placeholder="Bildiğiniz tüm önemli durumları açıkça yazın."></textarea></label>
                </div>
              </section>

              <section class="panel">
                <div class="section-head"><span>05</span><div><h2>Araç kimlik bilgileri</h2><p>Plaka, VIN ve ruhsat bilgileri yalnız başvurunuzun doğrulanması için korunur ve herkese açık gösterilmez.</p></div></div>
                <details class="mt-5 rounded-2xl border border-white/10 bg-white/[.03] p-4">
                  <summary class="cursor-pointer font-black text-emerald-300">Plaka, VIN ve ruhsat bilgisini ekle</summary>
                  <div class="form-grid mt-5">
                    <label><span>Plaka</span><input [ngModel]="licensePlate()" (ngModelChange)="licensePlate.set($event)" maxlength="20" autocomplete="off" placeholder="34 ABC 123" /></label>
                    <label><span>VIN / Şasi numarası</span><input [ngModel]="vin()" (ngModelChange)="vin.set($event)" maxlength="30" autocomplete="off" placeholder="17 haneli VIN" /></label>
                    <label class="md:col-span-2"><span>Ruhsat referansı</span><input [ngModel]="registrationReference()" (ngModelChange)="registrationReference.set($event)" maxlength="80" autocomplete="off" placeholder="İsteğe bağlı" /></label>
                    <label class="checkbox-field md:col-span-2"><input type="checkbox" [ngModel]="ownershipConfirmed()" (ngModelChange)="ownershipConfirmed.set($event)" /><span>Bu araç için beyan vermeye yetkili olduğumu doğruluyorum.</span></label>
                  </div>
                </details>
              </section>

              <section class="panel">
                <div class="section-head"><span>06</span><div><h2>Fotoğraf ve belgeler</h2><p>Fotoğraf, video ve PDF ekspertiz belgesi yükleyebilirsin.</p></div></div>
                <label class="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[.03] p-5 text-center transition hover:border-emerald-400/50 hover:bg-emerald-400/5">
                  <strong class="text-sm">Dosya seç veya yeniden seç</strong><span class="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, MP4, PDF. En fazla 10 dosya, dosya başına 50 MB.</span>
                  <input type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" (change)="onFilesSelected($event)" />
                </label>
                @if (files().length) {
                  <div class="mt-4 grid gap-2">@for(file of files();track file.name + file.size){<div class="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs"><span class="min-w-0 truncate font-bold">{{ file.name }}</span><span class="shrink-0 text-slate-400">{{ formatBytes(file.size) }}</span></div>}</div>
                }
                @if (submitting() && files().length) {
                  <div class="mt-4" aria-live="polite"><div class="mb-2 flex justify-between text-xs font-black"><span>Dosyalar yükleniyor</span><span>{{ overallProgress() }}%</span></div><div class="h-2 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full bg-emerald-400 transition-all" [style.width.%]="overallProgress()"></div></div></div>
                }
              </section>

              <section class="panel">
                <div class="section-head"><span>07</span><div><h2>İletişim ve açıklama</h2><p>Değerleme ekibinin sana ulaşacağı bilgiler.</p></div></div>
                <div class="form-grid mt-5">
                  <label><span>Ad soyad *</span><input [ngModel]="name()" (ngModelChange)="name.set($event)" maxlength="160" autocomplete="name" /></label>
                  <label><span>Telefon *</span><input [ngModel]="phone()" (ngModelChange)="phone.set($event)" maxlength="24" autocomplete="tel" inputmode="tel" placeholder="+90 ..." /></label>
                  <label class="md:col-span-2"><span>E-posta</span><input [ngModel]="email()" (ngModelChange)="email.set($event)" maxlength="160" type="email" autocomplete="email" placeholder="Teklif ve randevu bildirimleri için önerilir" /></label>
                  <label class="md:col-span-2"><span>Ek not</span><textarea [ngModel]="notes()" (ngModelChange)="notes.set($event)" maxlength="4000" rows="4" placeholder="Araçla veya talebinle ilgili ek bilgi"></textarea></label>
                </div>
              </section>

              <section class="panel">
                <div class="space-y-4">
                  <label class="consent"><input type="checkbox" [ngModel]="termsAccepted()" (ngModelChange)="termsAccepted.set($event)" /><span>Başvuru koşullarını okudum ve kabul ediyorum. *</span></label>
                  <label class="consent"><input type="checkbox" [ngModel]="privacyAccepted()" (ngModelChange)="privacyAccepted.set($event)" /><span>Kişisel verilerimin bu değerleme süreci için işlenmesini kabul ediyorum. *</span></label>
                </div>
                <button type="button" (click)="submit()" [disabled]="!formValid() || submitting()" class="mt-6 min-h-14 w-full rounded-2xl bg-emerald-400 px-5 text-sm font-black text-slate-950 shadow-xl shadow-emerald-950/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{{ submitting() ? 'Başvurunuz gönderiliyor...' : 'Profesyonel Değerleme Başvurusu Gönder' }}</button>
                @if (!formValid()) {<p class="mt-3 text-center text-xs font-semibold text-slate-400">Yıldızlı alanları, il-ilçe bilgisini ve onay kutularını tamamla.</p>}
              </section>
            </div>

            <aside class="space-y-4 lg:sticky lg:top-24">
              <section class="rounded-[1.75rem] border border-white/10 bg-white/[.04] p-5">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Dosya özeti</p>
                <dl class="mt-4 space-y-3 text-sm"><div><dt>İşlem</dt><dd>{{ intent()==='sell' ? 'Satış' : 'Filoya katılım' }}</dd></div><div><dt>Araç</dt><dd>{{ carBrand() || '-' }} {{ carModel() || '' }}</dd></div><div><dt>Konum</dt><dd>{{ selectedLocationLabel() }}</dd></div><div><dt>Beklenti</dt><dd>{{ askingPrice() ? (askingPrice() | number:'1.0-0') + ' TL' : 'Belirtilmedi' }}</dd></div><div><dt>Dosya</dt><dd>{{ files().length }} adet</dd></div></dl>
              </section>
              <section class="rounded-[1.75rem] border border-blue-300/20 bg-blue-300/10 p-5"><strong class="text-sm text-blue-200">Süreç nasıl ilerler?</strong><ol class="mt-4 space-y-3 text-xs leading-5 text-blue-50/80"><li><b>1.</b> Başvuru ve belgeleriniz alınır.</li><li><b>2.</b> Uzman ekip piyasa bandı ve A-E kondisyon sınıfı oluşturur.</li><li><b>3.</b> Gerekirse ekspertiz veya görüşme randevusu atanır.</li><li><b>4.</b> Uzman değerlemesi tamamlandığında resmi teklif aşamasına geçilir.</li></ol></section>
            </aside>
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.panel{border:1px solid rgb(255 255 255/.1);border-radius:1.75rem;background:rgb(255 255 255/.04);padding:1.25rem;box-shadow:0 24px 80px rgb(0 0 0/.12)}
    .section-head{display:flex;gap:.85rem;align-items:flex-start}.section-head>span{display:grid;min-width:2.25rem;height:2.25rem;place-items:center;border-radius:.8rem;background:rgb(52 211 153/.12);color:rgb(110 231 183);font-size:.7rem;font-weight:900}.section-head h2{margin:0;font-size:1.1rem;font-weight:900;color:white}.section-head p{margin:.3rem 0 0;font-size:.75rem;line-height:1.4rem;color:rgb(148 163 184)}
    .hero-stat{border:1px solid rgb(255 255 255/.1);border-radius:1rem;background:rgb(255 255 255/.04);padding:1rem}.hero-stat strong{display:block;font-size:1.15rem;color:rgb(110 231 183)}.hero-stat span{display:block;margin-top:.2rem;font-size:.65rem;font-weight:800;color:rgb(148 163 184)}
    .choice-card{min-height:7rem;border:1px solid rgb(255 255 255/.1);border-radius:1.25rem;background:rgb(255 255 255/.035);padding:1rem;text-align:left;transition:.2s}.choice-card strong{display:block;color:white;font-size:.9rem}.choice-card span{display:block;margin-top:.45rem;color:rgb(148 163 184);font-size:.72rem;line-height:1.2rem}.choice-card:hover,.choice-active{border-color:rgb(52 211 153/.6);background:rgb(52 211 153/.1)}
    .form-grid{display:grid;gap:1rem}.form-grid label:not(.checkbox-field){display:block}.form-grid label>span:first-child{display:block;margin-bottom:.4rem;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:rgb(203 213 225)}
    input:not([type=checkbox]):not([type=file]),select,textarea{width:100%;min-height:3rem;border:1px solid rgb(255 255 255/.12);border-radius:.9rem;background:rgb(2 6 23/.55);padding:.7rem .85rem;color:white;font-size:.82rem;font-weight:700;outline:none}textarea{min-height:6.5rem;resize:vertical}input:focus,select:focus,textarea:focus{border-color:rgb(52 211 153);box-shadow:0 0 0 2px rgb(52 211 153/.15)}select option{color:#0f172a;background:white}small{display:block;margin-top:.4rem;color:rgb(100 116 139);font-size:.65rem;line-height:1rem}
    .checkbox-field,.consent{display:flex!important;min-height:3rem;align-items:center;gap:.7rem;border:1px solid rgb(255 255 255/.1);border-radius:.9rem;background:rgb(2 6 23/.35);padding:.75rem}.checkbox-field input,.consent input{width:1.1rem;height:1.1rem;flex:none;accent-color:#34d399}.checkbox-field span,.consent span{margin:0!important;color:rgb(226 232 240)!important;font-size:.75rem!important;font-weight:800!important;text-transform:none!important;letter-spacing:0!important}
    dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgb(255 255 255/.08);padding-bottom:.65rem}dt{color:rgb(148 163 184);font-size:.7rem;font-weight:700}dd{margin:0;text-align:right;color:white;font-size:.72rem;font-weight:900}
    @media(min-width:768px){.panel{padding:1.75rem}.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `],
})
export class ListYourCarV172Component implements OnInit {
  private readonly service=inject(VehicleValuationV172Service);
  readonly geo=inject(GeoDirectoryService);
  private readonly branchSource=inject(BranchPublicV171Service);
  private readonly location=inject(Location);
  private readonly router=inject(Router);

  readonly maxModelYear=new Date().getFullYear()+1;
  readonly intent=signal<PartnerIntent>("sell");
  readonly name=signal("");readonly phone=signal("");readonly email=signal("");
  readonly carBrand=signal("");readonly carModel=signal("");readonly modelYear=signal<number|null>(null);readonly km=signal<number|null>(null);readonly askingPrice=signal<number|null>(null);readonly withDriver=signal(false);
  readonly fuelType=signal<ValuationFuelV172|"">("");readonly transmission=signal<ValuationTransmissionV172|"">("");readonly bodyType=signal("");readonly exteriorColor=signal("");
  readonly provinceCode=signal("");readonly districtCode=signal("");readonly preferredBranchId=signal("");readonly branches=signal<Branch[]>([]);
  readonly ownershipStatus=signal<OwnershipStatusV172|"">("");readonly damageDeclaration=signal("");readonly expertReportAvailable=signal(false);
  readonly licensePlate=signal("");readonly vin=signal("");readonly registrationReference=signal("");readonly ownershipConfirmed=signal(false);
  readonly notes=signal("");readonly termsAccepted=signal(false);readonly privacyAccepted=signal(false);readonly files=signal<File[]>([]);
  readonly submitting=signal(false);readonly errorMessage=signal("");readonly success=signal(false);readonly reference=signal("");

  readonly districts=computed(()=>this.geo.districtsFor(this.provinceCode()));
  readonly availableBranches=computed(()=>this.branches().filter(branch=>Boolean(branch.cloudId)).filter(branch=>!this.provinceCode()||!branch.provinceCode||branch.provinceCode===this.provinceCode()).filter(branch=>!this.districtCode()||!branch.districtCode||branch.districtCode===this.districtCode()));
  readonly overallProgress=computed(()=>{const values=Object.values(this.service.uploadProgress());if(!values.length)return 0;return Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);});
  readonly formValid=computed(()=>{
    const year=this.modelYear(),mileage=this.km();
    const identityEntered=Boolean(this.licensePlate().trim()||this.vin().trim()||this.registrationReference().trim());
    return this.name().trim().length>=2&&/^[+0-9()\s-]{7,24}$/.test(this.phone().trim())&&this.carBrand().trim().length>=1&&this.carModel().trim().length>=1&&year!==null&&Number.isInteger(year)&&year>=1950&&year<=this.maxModelYear&&mileage!==null&&Number.isFinite(mileage)&&mileage>=0&&mileage<=5_000_000&&Boolean(this.fuelType())&&Boolean(this.transmission())&&Boolean(this.provinceCode())&&Boolean(this.districtCode())&&Boolean(this.ownershipStatus())&&this.termsAccepted()&&this.privacyAccepted()&&(!identityEntered||this.ownershipConfirmed())&&!this.geo.error();
  });
  readonly selectedLocationLabel=computed(()=>{const province=this.geo.province(this.provinceCode())?.name;const district=this.geo.district(this.districtCode())?.name;return [province,district].filter(Boolean).join(" / ")||"Seçilmedi";});

  async ngOnInit(){
    const [,branches]=await Promise.allSettled([this.geo.ensureLoaded(),this.branchSource.list()]);
    if(branches.status==="fulfilled")this.branches.set(branches.value);
  }

  onProvinceChange(code:string){this.provinceCode.set(code);this.districtCode.set("");this.preferredBranchId.set("");}
  onDistrictChange(code:string){this.districtCode.set(code);this.preferredBranchId.set("");}
  toOptionalNumber(value:unknown):number|null{if(value===null||value===undefined||value==="")return null;const number=Number(value);return Number.isFinite(number)?number:null;}

  onFilesSelected(event:Event){
    const input=event.target as HTMLInputElement;const selected=Array.from(input.files||[]);const allowed=new Set(["image/jpeg","image/png","image/webp","video/mp4","application/pdf"]);const valid=selected.filter(file=>allowed.has(file.type)&&file.size>0&&file.size<=50*1024*1024).slice(0,10);const total=valid.reduce((sum,file)=>sum+file.size,0);
    if(valid.length!==selected.length||total>200*1024*1024){this.errorMessage.set("Bazı dosyalar kabul edilmedi. En fazla 10 dosya, dosya başına 50 MB ve toplam 200 MB sınırı vardır.");this.files.set(total>200*1024*1024?[]:valid);return;}
    this.errorMessage.set("");this.files.set(valid);
  }

  async submit(){
    if(!this.formValid()||this.submitting())return;this.submitting.set(true);this.errorMessage.set("");
    try{
      const result=await this.service.submit({intent:this.intent(),name:this.name().trim(),phone:this.phone().trim(),email:this.email().trim()||undefined,carBrand:this.carBrand().trim(),carModel:this.carModel().trim(),modelYear:this.modelYear()??undefined,km:this.km()??undefined,askingPrice:this.askingPrice()??undefined,withDriver:this.intent()==="rent"&&this.withDriver(),notes:this.notes().trim()||undefined,files:this.files(),fuelType:this.fuelType()||undefined,transmission:this.transmission()||undefined,bodyType:this.bodyType().trim()||undefined,exteriorColor:this.exteriorColor().trim()||undefined,provinceCode:this.provinceCode(),districtCode:this.districtCode(),preferredBranchId:this.preferredBranchId()||undefined,ownershipStatus:this.ownershipStatus()||undefined,damageDeclaration:this.damageDeclaration().trim()||undefined,expertReportAvailable:this.expertReportAvailable(),termsAccepted:this.termsAccepted(),privacyAccepted:this.privacyAccepted(),licensePlate:this.licensePlate().trim()||undefined,vin:this.vin().trim()||undefined,registrationReference:this.registrationReference().trim()||undefined,ownershipConfirmed:this.ownershipConfirmed()});
      this.reference.set(result.reference);this.success.set(true);if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"smooth"});
    }catch(error){this.errorMessage.set(this.humanError(error));}finally{this.submitting.set(false);}
  }

  reset(){this.service.resetSubmissionKey();this.intent.set("sell");this.name.set("");this.phone.set("");this.email.set("");this.carBrand.set("");this.carModel.set("");this.modelYear.set(null);this.km.set(null);this.askingPrice.set(null);this.withDriver.set(false);this.fuelType.set("");this.transmission.set("");this.bodyType.set("");this.exteriorColor.set("");this.provinceCode.set("");this.districtCode.set("");this.preferredBranchId.set("");this.ownershipStatus.set("");this.damageDeclaration.set("");this.expertReportAvailable.set(false);this.licensePlate.set("");this.vin.set("");this.registrationReference.set("");this.ownershipConfirmed.set(false);this.notes.set("");this.termsAccepted.set(false);this.privacyAccepted.set(false);this.files.set([]);this.errorMessage.set("");this.reference.set("");this.success.set(false);}
  goBack(){if(typeof window!=="undefined"&&window.history.length>1)this.location.back();else void this.router.navigate(["/"]);}
  formatBytes(bytes:number){if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`;}
  private humanError(error:unknown){const code=error instanceof Error?error.message:"";if(code.includes("RATE_LIMITED"))return "Kısa sürede çok fazla başvuru denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.";if(code.includes("INVALID_GEO"))return "İl ve ilçe eşleşmesi doğrulanamadı. Konumu yeniden seçin.";if(code.includes("BRANCH_NOT_FOUND"))return "Seçilen şube artık hizmet vermiyor. Şube tercihini yenileyin.";if(code.includes("PRIVATE_IDENTITY_SAVE_FAILED"))return "Araç kimlik bilgileri kaydedilemedi. Başvurunuz tamamlanmadı. Lütfen tekrar deneyin.";if(code.includes("CONSENT_REQUIRED"))return "Başvuru koşulları ve kişisel veri onayı zorunludur.";return "Başvuru tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";}
}
