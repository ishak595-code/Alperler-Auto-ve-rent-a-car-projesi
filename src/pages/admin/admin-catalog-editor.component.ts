import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import {
  CatalogAdminEditorService,
  TourAdminRecord,
  VehicleAdminRecord,
} from "../../services/catalog-admin-editor.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-catalog-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Kart ve detay içerik merkezi</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">Araç & Tur Tam İçerik Editörü</h1>
          <p class="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">Kartta ve detay sayfasında gösterilen temel bilgiler, teknik alanlar, kampanya bayrakları, yayın durumu ve gelişmiş metadata tek ekrandan düzenlenir. Fotoğraf/video için Medya Kütüphanesi kullanılır.</p>
        </header>

        <div class="grid gap-5 xl:grid-cols-[330px_1fr]">
          <aside class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-20 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:self-start">
            <div class="grid grid-cols-2 gap-2"><button type="button" (click)="mode.set('VEHICLE'); clearSelection()" [class.bg-slate-950]="mode()==='VEHICLE'" [class.text-white]="mode()==='VEHICLE'" class="min-h-11 rounded-xl bg-slate-100 font-black">Araçlar</button><button type="button" (click)="mode.set('TOUR'); clearSelection()" [class.bg-slate-950]="mode()==='TOUR'" [class.text-white]="mode()==='TOUR'" class="min-h-11 rounded-xl bg-slate-100 font-black">Turlar</button></div>
            <input [(ngModel)]="search" type="search" placeholder="Ara…" class="mt-3 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-blue-500" />
            <div class="mt-3 space-y-2">
              @if (mode()==='VEHICLE') {
                @for (item of filteredVehicles(); track item.id) { <button type="button" (click)="selectVehicle(item)" [class.border-blue-500]="selectedVehicle()?.id===item.id" [class.bg-blue-50]="selectedVehicle()?.id===item.id" class="w-full rounded-2xl border border-slate-200 p-3 text-left"><strong class="block truncate text-sm text-slate-900">{{ item.brand }} {{ item.model }}</strong><span class="mt-1 block truncate text-[11px] text-slate-500">{{ item.category }} · {{ item.modelYear || '' }} · {{ item.stockCode }}</span></button> }
              } @else {
                @for (item of filteredTours(); track item.id) { <button type="button" (click)="selectTour(item)" [class.border-blue-500]="selectedTour()?.id===item.id" [class.bg-blue-50]="selectedTour()?.id===item.id" class="w-full rounded-2xl border border-slate-200 p-3 text-left"><strong class="block truncate text-sm text-slate-900">{{ item.title }}</strong><span class="mt-1 block truncate text-[11px] text-slate-500">{{ item.duration || 'Tur' }} · {{ item.publicationStatus }}</span></button> }
              }
            </div>
          </aside>

          <section>
            @if (mode()==='VEHICLE' && selectedVehicle(); as car) {
              <form (ngSubmit)="saveVehicle()" class="space-y-5">
                <section class="panel"><header><h2>Kart Bilgileri</h2><p>Liste ve vitrin kartlarında görünen alanlar.</p></header><div class="form-grid">
                  <label class="field"><span>Stok kodu</span><input [(ngModel)]="car.stockCode" name="stockCode" required /></label>
                  <label class="field"><span>Kategori</span><select [(ngModel)]="car.category" name="category"><option value="RENTAL">Kiralık</option><option value="SALE">Satılık</option></select></label>
                  <label class="field"><span>Marka</span><input [(ngModel)]="car.brand" name="brand" required /></label>
                  <label class="field"><span>Model / Paket</span><input [(ngModel)]="car.model" name="model" required /></label>
                  <label class="field"><span>Yıl</span><input [(ngModel)]="car.modelYear" name="modelYear" type="number" /></label>
                  <label class="field"><span>Fiyat</span><input [(ngModel)]="car.price" name="price" type="number" min="0" /></label>
                  @if (car.category==='RENTAL') { <label class="field"><span>Günlük fiyat</span><input [(ngModel)]="car.rentalPriceDaily" name="rentalPriceDaily" type="number" min="0" /></label> }
                  @if (car.category==='SALE') { <label class="field"><span>Kilometre</span><input [(ngModel)]="car.mileageKm" name="mileageKm" type="number" min="0" /></label> }
                  <label class="field"><span>Konum</span><input [(ngModel)]="car.location" name="location" /></label>
                  <label class="field"><span>SEO slug</span><input [(ngModel)]="car.seoSlug" name="seoSlug" /></label>
                </div></section>

                <section class="panel"><header><h2>Teknik & Detay Özellikleri</h2><p>Detay kartında ve filtrelerde kullanılan teknik alanlar.</p></header><div class="form-grid">
                  <label class="field"><span>Yakıt</span><input [(ngModel)]="car.fuelType" name="fuelType" /></label><label class="field"><span>Vites</span><input [(ngModel)]="car.transmission" name="transmission" /></label><label class="field"><span>Kasa</span><input [(ngModel)]="car.bodyType" name="bodyType" /></label><label class="field"><span>Renk</span><input [(ngModel)]="car.color" name="color" /></label><label class="field"><span>Motor</span><input [(ngModel)]="car.engine" name="engine" /></label><label class="field"><span>Koltuk</span><input [(ngModel)]="car.seats" name="seats" type="number" /></label><label class="field"><span>Kapı</span><input [(ngModel)]="car.doors" name="doors" type="number" /></label><label class="field"><span>Müsaitlik</span><select [(ngModel)]="car.availabilityStatus" name="availabilityStatus"><option value="AVAILABLE">Müsait / Satışta</option><option value="RESERVED">Rezerve</option><option value="RENTED">Kirada</option><option value="SOLD">Satıldı</option><option value="MAINTENANCE">Bakımda</option></select></label>
                  <label class="field md:col-span-2"><span>Açıklama</span><textarea [(ngModel)]="car.description" name="description" rows="6"></textarea></label>
                  <label class="field md:col-span-2"><span>Özellikler, satır başına bir tane</span><textarea [ngModel]="car.features.join('\n')" (ngModelChange)="car.features=splitLines($event)" name="features" rows="7"></textarea></label>
                </div></section>

                <section class="panel"><header><h2>Gelişmiş Kart / Detay Alanları</h2><p>Mevcut UI modelindeki ek alanlar metadata olarak saklanır. Böylece yeni alanlar eklemek için veritabanı şemasını tekrar değiştirmek gerekmez.</p></header><div class="form-grid">
                  <label class="field"><span>İlan başlığı</span><input [ngModel]="meta(car,'title')" (ngModelChange)="setMeta(car,'title',$event)" name="metaTitle" /></label>
                  <label class="field"><span>Seri</span><input [ngModel]="meta(car,'series')" (ngModelChange)="setMeta(car,'series',$event)" name="series" /></label>
                  <label class="field"><span>Rozet</span><input [ngModel]="meta(car,'badge')" (ngModelChange)="setMeta(car,'badge',$event)" name="badge" placeholder="FIRSAT, YENİ, PREMIUM…" /></label>
                  <label class="field"><span>İndirim %</span><input [ngModel]="meta(car,'discountRate')" (ngModelChange)="setMetaNumber(car,'discountRate',$event)" name="discountRate" type="number" min="0" max="100" /></label>
                  <label class="field"><span>Motor gücü</span><input [ngModel]="meta(car,'enginePower')" (ngModelChange)="setMeta(car,'enginePower',$event)" name="enginePower" /></label>
                  <label class="field"><span>Çekiş</span><input [ngModel]="meta(car,'drivetrain')" (ngModelChange)="setMeta(car,'drivetrain',$event)" name="drivetrain" /></label>
                  <label class="field"><span>Tork</span><input [ngModel]="meta(car,'torque')" (ngModelChange)="setMeta(car,'torque',$event)" name="torque" /></label>
                  <label class="field"><span>0-100</span><input [ngModel]="meta(car,'acceleration')" (ngModelChange)="setMeta(car,'acceleration',$event)" name="acceleration" /></label>
                  <label class="field"><span>Maks. hız</span><input [ngModel]="meta(car,'maxSpeed')" (ngModelChange)="setMeta(car,'maxSpeed',$event)" name="maxSpeed" /></label>
                  <label class="field"><span>Yakıt tüketimi</span><input [ngModel]="meta(car,'fuelConsumption')" (ngModelChange)="setMeta(car,'fuelConsumption',$event)" name="fuelConsumption" /></label>
                  <label class="field"><span>Bagaj hacmi</span><input [ngModel]="meta(car,'trunkVolume')" (ngModelChange)="setMeta(car,'trunkVolume',$event)" name="trunkVolume" /></label>
                  <label class="field"><span>Jant</span><input [ngModel]="meta(car,'wheelSize')" (ngModelChange)="setMeta(car,'wheelSize',$event)" name="wheelSize" /></label>
                  <label class="field"><span>Tramer</span><input [ngModel]="meta(car,'tramer')" (ngModelChange)="setMeta(car,'tramer',$event)" name="tramer" /></label>
                  <label class="field"><span>Hasar durumu</span><input [ngModel]="meta(car,'damageStatus')" (ngModelChange)="setMeta(car,'damageStatus',$event)" name="damageStatus" /></label>
                  <label class="field"><span>Garanti</span><input [ngModel]="meta(car,'warranty')" (ngModelChange)="setMeta(car,'warranty',$event)" name="warranty" /></label>
                  <label class="field"><span>Şoför seçeneği</span><select [ngModel]="meta(car,'driverOption') || 'BOTH'" (ngModelChange)="setMeta(car,'driverOption',$event)" name="driverOption"><option value="WITH_DRIVER">Şoförlü</option><option value="WITHOUT_DRIVER">Şoförsüz</option><option value="BOTH">Her ikisi</option></select></label>
                  <label class="field"><span>Min. yaş</span><input [ngModel]="meta(car,'minAge')" (ngModelChange)="setMetaNumber(car,'minAge',$event)" name="minAge" type="number" /></label>
                  <label class="field"><span>Min. ehliyet yılı</span><input [ngModel]="meta(car,'minLicenseYears')" (ngModelChange)="setMetaNumber(car,'minLicenseYears',$event)" name="minLicenseYears" type="number" /></label>
                  <label class="field"><span>Günlük KM limiti</span><input [ngModel]="meta(car,'dailyMileageLimit')" (ngModelChange)="setMetaNumber(car,'dailyMileageLimit',$event)" name="dailyMileageLimit" type="number" /></label>
                  <label class="field"><span>Depozito</span><input [ngModel]="meta(car,'deposit')" (ngModelChange)="setMetaNumber(car,'deposit',$event)" name="deposit" type="number" /></label>
                  <label class="field"><span>Vitrin önceliği</span><input [ngModel]="meta(car,'displayPriority')" (ngModelChange)="setMetaNumber(car,'displayPriority',$event)" name="displayPriority" type="number" /></label>
                  <label class="field"><span>Popülerlik skoru</span><input [ngModel]="meta(car,'popularityScore')" (ngModelChange)="setMetaNumber(car,'popularityScore',$event)" name="popularityScore" type="number" /></label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isCampaign')" (ngModelChange)="setMeta(car,'isCampaign',$event)" name="isCampaign" /> Kampanyalı</label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isPopular')" (ngModelChange)="setMeta(car,'isPopular',$event)" name="isPopular" /> Popüler</label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isPriceDropped')" (ngModelChange)="setMeta(car,'isPriceDropped',$event)" name="isPriceDropped" /> Fiyat düştü</label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isPaintless')" (ngModelChange)="setMeta(car,'isPaintless',$event)" name="isPaintless" /> Boyasız</label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isReplaceFree')" (ngModelChange)="setMeta(car,'isReplaceFree',$event)" name="isReplaceFree" /> Değişensiz</label>
                  <label class="check"><input type="checkbox" [ngModel]="metaBool(car,'isDamageFree')" (ngModelChange)="setMeta(car,'isDamageFree',$event)" name="isDamageFree" /> Hasarsız</label>
                </div></section>

                <section class="panel"><header><h2>Yayın ve Vitrin</h2><p>Taslak, planlama, canlı yayın ve arşiv kontrolü.</p></header><div class="form-grid"><label class="field"><span>Yayın durumu</span><select [(ngModel)]="car.publicationStatus" name="publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label><label class="field"><span>Planlanan tarih</span><input [(ngModel)]="car.scheduledAt" name="scheduledAt" type="datetime-local" /></label><label class="check"><input type="checkbox" [(ngModel)]="car.isFeatured" name="isFeatured" /> Öne çıkar</label><label class="check"><input type="checkbox" [(ngModel)]="car.isActive" name="isActive" /> Aktif</label></div></section>

                <section class="panel"><header><h2>Gelişmiş Metadata JSON</h2><p>Arayüzde henüz ayrı alanı olmayan ek veriler için. Geçersiz JSON kaydedilmez.</p></header><textarea [(ngModel)]="metadataJson" name="metadataJson" rows="14" class="w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-300 outline-none focus:ring-2 focus:ring-blue-500"></textarea></section>
                <button type="submit" [disabled]="saving()" class="min-h-14 w-full rounded-2xl bg-blue-600 px-5 text-lg font-black text-white shadow-lg disabled:opacity-40">{{ saving() ? 'Kaydediliyor…' : 'Tüm Araç Değişikliklerini Kaydet' }}</button>
              </form>
            } @else if (mode()==='TOUR' && selectedTour(); as tour) {
              <form (ngSubmit)="saveTour()" class="space-y-5">
                <section class="panel"><header><h2>Tur Kartı</h2><p>Tur kartında ve detay üst bölümünde görünen alanlar.</p></header><div class="form-grid"><label class="field md:col-span-2"><span>Başlık</span><input [(ngModel)]="tour.title" name="tourTitle" required /></label><label class="field"><span>Slug</span><input [(ngModel)]="tour.seoSlug" name="tourSlug" required /></label><label class="field"><span>Kategori</span><input [(ngModel)]="tour.category" name="tourCategory" /></label><label class="field"><span>Fiyat / kişi</span><input [(ngModel)]="tour.pricePerPerson" name="tourPrice" type="number" min="0" /></label><label class="field"><span>Süre</span><input [(ngModel)]="tour.duration" name="tourDuration" /></label><label class="field"><span>Kapasite</span><input [(ngModel)]="tour.capacity" name="tourCapacity" type="number" /></label><label class="field"><span>Buluşma noktası</span><input [(ngModel)]="tour.meetingPoint" name="meetingPoint" /></label><label class="field md:col-span-2"><span>Kısa açıklama</span><textarea [(ngModel)]="tour.shortDescription" name="shortDescription" rows="3"></textarea></label><label class="field md:col-span-2"><span>Detaylı açıklama</span><textarea [(ngModel)]="tour.description" name="tourDescription" rows="7"></textarea></label><label class="field md:col-span-2"><span>Dahil olanlar, satır başına bir</span><textarea [ngModel]="tour.includedItems.join('\n')" (ngModelChange)="tour.includedItems=splitLines($event)" name="includedItems" rows="5"></textarea></label><label class="field md:col-span-2"><span>Dahil olmayanlar, satır başına bir</span><textarea [ngModel]="tour.excludedItems.join('\n')" (ngModelChange)="tour.excludedItems=splitLines($event)" name="excludedItems" rows="5"></textarea></label></div></section>
                <section class="panel"><header><h2>Yayın</h2></header><div class="form-grid"><label class="field"><span>Yayın durumu</span><select [(ngModel)]="tour.publicationStatus" name="tourPublication"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label><label class="field"><span>Planlanan tarih</span><input [(ngModel)]="tour.scheduledAt" name="tourScheduled" type="datetime-local" /></label><label class="check"><input type="checkbox" [(ngModel)]="tour.isFeatured" name="tourFeatured" /> Öne çıkar</label><label class="check"><input type="checkbox" [(ngModel)]="tour.isActive" name="tourActive" /> Aktif</label></div></section>
                <section class="panel"><header><h2>Tur Metadata JSON</h2><p>Harita, rota, etiket ve sonradan eklenen özel alanlar için.</p></header><textarea [(ngModel)]="metadataJson" name="tourMetadata" rows="14" class="w-full rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-300 outline-none focus:ring-2 focus:ring-blue-500"></textarea></section>
                <button type="submit" [disabled]="saving()" class="min-h-14 w-full rounded-2xl bg-blue-600 px-5 text-lg font-black text-white shadow-lg disabled:opacity-40">{{ saving() ? 'Kaydediliyor…' : 'Tüm Tur Değişikliklerini Kaydet' }}</button>
              </form>
            } @else {
              <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center"><mat-icon class="!h-12 !w-12 !text-[48px] text-slate-300">edit_note</mat-icon><h2 class="mt-4 text-xl font-black text-slate-800">Düzenlemek istediğiniz kaydı seçin</h2><p class="mt-2 text-sm text-slate-500">Soldaki listeden araç veya tur seçin.</p></div>
            }
          </section>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .panel{border:1px solid rgb(226 232 240);background:white;border-radius:24px;padding:20px;box-shadow:0 1px 2px rgb(15 23 42/.04)}.panel>header{margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid rgb(241 245 249)}.panel>header h2{font-size:1.15rem;font-weight:900;color:rgb(15 23 42)}.panel>header p{margin-top:3px;font-size:.75rem;color:rgb(100 116 139)}.form-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:14px}@media(min-width:768px){.form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.field{display:flex;flex-direction:column;gap:6px}.field>span{font-size:.67rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:rgb(71 85 105)}.field input,.field select,.field textarea{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;outline:none}.field textarea{min-height:86px}.field input:focus,.field select:focus,.field textarea:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}.check{display:flex;min-height:44px;align-items:center;gap:9px;border-radius:12px;background:rgb(248 250 252);padding:0 12px;font-size:.8rem;font-weight:800;color:rgb(51 65 85)}
  `],
})
export class AdminCatalogEditorComponent implements OnInit {
  private readonly editor = inject(CatalogAdminEditorService);
  private readonly toast = inject(ToastService);
  readonly mode = signal<"VEHICLE" | "TOUR">("VEHICLE");
  readonly vehicles = signal<VehicleAdminRecord[]>([]);
  readonly tours = signal<TourAdminRecord[]>([]);
  readonly selectedVehicle = signal<VehicleAdminRecord | null>(null);
  readonly selectedTour = signal<TourAdminRecord | null>(null);
  readonly saving = signal(false);
  search = "";
  metadataJson = "{}";

  readonly filteredVehicles = computed(() => { const q = this.search.trim().toLocaleLowerCase("tr-TR"); return this.vehicles().filter((row) => !q || `${row.brand} ${row.model} ${row.stockCode}`.toLocaleLowerCase("tr-TR").includes(q)); });
  readonly filteredTours = computed(() => { const q = this.search.trim().toLocaleLowerCase("tr-TR"); return this.tours().filter((row) => !q || `${row.title} ${row.category || ''}`.toLocaleLowerCase("tr-TR").includes(q)); });

  ngOnInit(): void { void this.refresh(); }
  async refresh(): Promise<void> { try { const [vehicles,tours] = await Promise.all([this.editor.vehicles(),this.editor.tours()]); this.vehicles.set(vehicles); this.tours.set(tours); } catch (error) { this.toast.show(this.message(error),"error"); } }
  clearSelection(): void { this.selectedVehicle.set(null); this.selectedTour.set(null); this.metadataJson = "{}"; }
  selectVehicle(item: VehicleAdminRecord): void { const copy = structuredClone(item); this.selectedVehicle.set(copy); this.selectedTour.set(null); this.metadataJson = JSON.stringify(copy.metadata || {}, null, 2); }
  selectTour(item: TourAdminRecord): void { const copy = structuredClone(item); this.selectedTour.set(copy); this.selectedVehicle.set(null); this.metadataJson = JSON.stringify(copy.metadata || {}, null, 2); }

  async saveVehicle(): Promise<void> { const car = this.selectedVehicle(); if (!car) return; this.saving.set(true); try { car.metadata = this.parseMetadata(); car.scheduledAt = this.toIso(car.scheduledAt); await this.editor.saveVehicle(car); await this.refresh(); this.selectVehicle(this.vehicles().find((row) => row.id===car.id) || car); this.toast.show("Araç kartı ve detay bilgileri kaydedildi.","success"); } catch (error) { this.toast.show(this.message(error),"error"); } finally { this.saving.set(false); } }
  async saveTour(): Promise<void> { const tour = this.selectedTour(); if (!tour) return; this.saving.set(true); try { tour.metadata = this.parseMetadata(); tour.scheduledAt = this.toIso(tour.scheduledAt); await this.editor.saveTour(tour); await this.refresh(); this.selectTour(this.tours().find((row) => row.id===tour.id) || tour); this.toast.show("Tur kartı ve detay bilgileri kaydedildi.","success"); } catch (error) { this.toast.show(this.message(error),"error"); } finally { this.saving.set(false); } }

  meta(record: VehicleAdminRecord,key:string): any { return record.metadata?.[key] ?? ""; }
  metaBool(record: VehicleAdminRecord,key:string): boolean { return record.metadata?.[key] === true; }
  setMeta(record: VehicleAdminRecord,key:string,value:unknown): void { record.metadata = { ...(record.metadata || {}), [key]: value }; this.metadataJson = JSON.stringify(record.metadata,null,2); }
  setMetaNumber(record: VehicleAdminRecord,key:string,value:unknown): void { const n = Number(value); this.setMeta(record,key,Number.isFinite(n)?n:null); }
  splitLines(value: string): string[] { return String(value || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean); }
  private parseMetadata(): Record<string,unknown> { const parsed = JSON.parse(this.metadataJson || "{}"); if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Metadata bir JSON nesnesi olmalıdır."); return parsed as Record<string,unknown>; }
  private toIso(value?: string): string | undefined { if (!value) return undefined; if (/Z$|[+-]\d\d:\d\d$/.test(value)) return value; return new Date(value).toISOString(); }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Katalog kaydı güncellenemedi."; }
}
