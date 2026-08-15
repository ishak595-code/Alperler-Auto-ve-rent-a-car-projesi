import { CommonModule, Location } from "@angular/common";
import { Component, ElementRef, Input, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { Vehicle } from "../models/car.model";
import { CarService } from "../services/car.service";
import { VehicleListItemComponent } from "./vehicle-list-item.component";

type ResultMode = "rental" | "sale";
type SortKey = "default" | "priceAsc" | "priceDesc" | "yearDesc" | "yearAsc" | "kmAsc" | "kmDesc" | "powerDesc";
type MultiKey = "brands" | "colors" | "fuels" | "transmissions" | "bodyTypes" | "drivetrains";

interface AdvancedFilters {
  brands: string[];
  colors: string[];
  fuels: string[];
  transmissions: string[];
  bodyTypes: string[];
  drivetrains: string[];
  modelQuery: string;
  locationQuery: string;
  engineQuery: string;
  minPrice: number | null;
  maxPrice: number | null;
  minYear: number | null;
  maxYear: number | null;
  minKm: number | null;
  maxKm: number | null;
  minPower: number | null;
  maxPower: number | null;
  minSeats: number | null;
  maxSeats: number | null;
  minDoors: number | null;
  maxDoors: number | null;
  maxDeposit: number | null;
  driverOption: "" | "WITH_DRIVER" | "WITHOUT_DRIVER" | "BOTH";
  cleanOnly: boolean;
  warrantyOnly: boolean;
  availableOnly: boolean;
}

function emptyFilters(): AdvancedFilters {
  return {
    brands: [], colors: [], fuels: [], transmissions: [], bodyTypes: [], drivetrains: [],
    modelQuery: "", locationQuery: "", engineQuery: "",
    minPrice: null, maxPrice: null, minYear: null, maxYear: null,
    minKm: null, maxKm: null, minPower: null, maxPower: null,
    minSeats: null, maxSeats: null, minDoors: null, maxDoors: null,
    maxDeposit: null, driverOption: "", cleanOnly: false, warrantyOnly: false,
    availableOnly: false,
  };
}

@Component({
  selector: "app-premium-vehicle-results",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent],
  styles: [`
    dialog:not([open]){display:none}
    dialog::backdrop{background:rgba(2,6,23,.78);backdrop-filter:blur(5px)}
    .field-label{display:block;margin-bottom:.4rem;font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
    .field-control{min-height:46px;width:100%;border:1px solid #cbd5e1;border-radius:.85rem;background:#fff;padding:.65rem .8rem;font-size:.86rem;font-weight:700;color:#0f172a;outline:none}
    .field-control:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgb(37 99 235/.14)}
    .choice{display:flex;min-height:44px;align-items:center;gap:.55rem;border:1px solid #e2e8f0;border-radius:.8rem;background:#f8fafc;padding:.55rem .7rem;font-size:.8rem;font-weight:800;color:#334155}
    .choice input{width:18px;height:18px;accent-color:#2563eb}
    .section-card{border:1px solid #e2e8f0;border-radius:1rem;background:#fff;padding:1rem}
    @media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important;transition-duration:.001ms!important;animation-duration:.001ms!important}}
  `],
  template: `
    <main class="min-h-screen bg-slate-950 pb-16 text-slate-200">
      <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 shadow-xl backdrop-blur-xl">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5">
          <button type="button" (click)="goBack()" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Geri dön"><mat-icon>arrow_back</mat-icon></button>

          <form class="relative min-w-0 flex-1" (ngSubmit)="submitSearch()">
            <label>
              <span class="sr-only">{{ mode === 'rental' ? 'Kiralık' : 'Satılık' }} araçlarda ara</span>
              <mat-icon aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</mat-icon>
              <input type="search" inputmode="search" autocomplete="off" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" name="vehicleSearch" placeholder="Marka, model veya ilan no ara..." class="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-14 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />
            </label>
            <button type="submit" class="absolute right-1.5 top-1.5 flex h-9 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Aramayı çalıştır"><mat-icon>arrow_forward</mat-icon></button>
          </form>

          <button #filterTrigger type="button" (click)="openFilterDialog()" class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-haspopup="dialog" aria-controls="premium-filter-dialog" aria-label="Gelişmiş filtreleri aç"><mat-icon>tune</mat-icon>@if(activeFilterCount()>0){<span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-black text-white">{{ activeFilterCount() }}</span>}</button>
          <button #sortTrigger type="button" (click)="openSortDialog()" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-haspopup="dialog" aria-controls="premium-sort-dialog" aria-label="Sıralama seçeneklerini aç"><mat-icon>sort</mat-icon></button>
        </div>
      </header>

      <section class="relative overflow-hidden border-b border-white/10 px-4 py-9 sm:py-12">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,.22),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(14,165,233,.12),transparent_28%)]"></div>
        <div class="relative mx-auto max-w-7xl">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Alperler Auto Seçkisi</p>
          <div class="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 class="font-serif text-3xl font-black text-white sm:text-5xl">{{ mode === 'rental' ? 'Kiralık Araçlar' : 'Satılık Araçlar' }}</h1>
              <p class="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">{{ mode === 'rental' ? 'Bütçe, model yılı, renk, motor gücü, kasa, yakıt, şanzıman ve kiralama koşullarını kendiniz belirleyin.' : 'Fiyat, kilometre, model yılı, renk, motor gücü, hasar ve donanım kriterlerini kendiniz belirleyin.' }}</p>
              @if(mode==='rental' && requestedStart && requestedEnd){<p class="mt-2 inline-flex rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black text-blue-200">Tarih: {{ requestedStart }} → {{ requestedEnd }}</p>}
            </div>
            <div class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><span class="text-2xl font-black text-white">{{ filteredVehicles().length }}</span><span class="text-xs font-bold text-slate-400">eşleşen araç</span></div>
          </div>
        </div>
      </section>

      @if (activeFilterCount() || searchQuery().trim()) {
        <section class="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">
          <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            @if(searchQuery().trim()){<span class="rounded-full bg-slate-100 px-3 py-2 text-xs font-black">Arama: {{ searchQuery() }}</span>}
            @for(label of activeFilterLabels(); track label){<span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-800">{{ label }}</span>}
            <button type="button" (click)="clearAll()" class="ml-auto min-h-10 rounded-xl px-3 text-xs font-black text-rose-700 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Tümünü temizle</button>
          </div>
        </section>
      }

      <section class="bg-slate-100 px-3 py-5 sm:px-5" [attr.aria-label]="mode === 'rental' ? 'Kiralık araç sonuçları' : 'Satılık araç sonuçları'">
        <div class="mx-auto max-w-7xl">
          <div class="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div class="min-w-0"><strong class="block truncate text-sm text-slate-900">{{ sortLabel() }}</strong><span class="text-xs text-slate-500">Filtreler yalnızca seçtiğiniz değerleri uygular.</span></div><button type="button" (click)="openFilterDialog()" class="min-h-11 shrink-0 rounded-xl bg-slate-900 px-4 text-xs font-black text-white">Filtrele</button></div>
          @if(filteredVehicles().length){
            <div class="grid gap-4 lg:grid-cols-2">@for(car of filteredVehicles(); track car.id){<app-vehicle-list-item [car]="car" [variant]="mode"></app-vehicle-list-item>}</div>
          } @else {
            <div class="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm"><mat-icon class="!h-14 !w-14 !text-[56px] text-slate-300">search_off</mat-icon><h2 class="mt-4 text-xl font-black text-slate-900">Bu kriterlerde araç bulunamadı</h2><p class="mt-2 max-w-md text-sm text-slate-500">Bir veya birkaç kriteri gevşeterek tekrar deneyin.</p><button type="button" (click)="clearAll()" class="mt-5 min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white">Filtreleri Temizle</button></div>
          }
        </div>
      </section>
    </main>

    <dialog #filterDialog id="premium-filter-dialog" aria-labelledby="premium-filter-title" (close)="restoreFilterFocus()" class="m-0 mt-auto max-h-[94dvh] w-full max-w-2xl overflow-hidden rounded-t-3xl border-0 bg-slate-50 p-0 text-slate-900 shadow-2xl sm:m-auto sm:rounded-3xl">
      <div class="flex max-h-[94dvh] flex-col">
        <header class="flex items-center justify-between border-b border-slate-200 bg-white p-5 sm:p-6"><div><p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Detaylı seçim</p><h2 id="premium-filter-title" class="mt-1 text-2xl font-black">Gelişmiş Filtre</h2><p class="mt-1 text-xs text-slate-500">Sabit paket yok. Alt ve üst sınırları siz belirlersiniz.</p></div><button type="button" (click)="closeFilterDialog()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filtre penceresini kapat"><mat-icon>close</mat-icon></button></header>

        <div class="space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <section class="section-card"><h3 class="font-black">Temel bilgiler</h3><div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label><span class="field-label">Model / paket</span><input [(ngModel)]="draft.modelQuery" class="field-control" placeholder="Örn. A3, Aventura, Icon" /></label>
            <label><span class="field-label">Konum / şube</span><input [(ngModel)]="draft.locationQuery" class="field-control" placeholder="Şehir, ilçe veya şube" /></label>
            <label><span class="field-label">Minimum fiyat</span><input [(ngModel)]="draft.minPrice" class="field-control" type="number" min="0" inputmode="numeric" /></label>
            <label><span class="field-label">Maksimum fiyat</span><input [(ngModel)]="draft.maxPrice" class="field-control" type="number" min="0" inputmode="numeric" /></label>
            <label><span class="field-label">Minimum model yılı</span><input [(ngModel)]="draft.minYear" class="field-control" type="number" min="1950" max="2100" /></label>
            <label><span class="field-label">Maksimum model yılı</span><input [(ngModel)]="draft.maxYear" class="field-control" type="number" min="1950" max="2100" /></label>
            @if(mode==='sale'){<label><span class="field-label">Minimum kilometre</span><input [(ngModel)]="draft.minKm" class="field-control" type="number" min="0" /></label><label><span class="field-label">Maksimum kilometre</span><input [(ngModel)]="draft.maxKm" class="field-control" type="number" min="0" /></label>}
          </div></section>

          <section class="section-card"><h3 class="font-black">Marka ve gövde</h3><div class="mt-4"><span class="field-label">Marka, birden fazla seçilebilir</span><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">@for(value of brands(); track value){<label class="choice"><input type="checkbox" [checked]="draft.brands.includes(value)" (change)="toggleDraft('brands',value,$event)" />{{ value }}</label>}</div></div><div class="mt-4"><span class="field-label">Kasa tipi</span><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">@for(value of bodyTypes(); track value){<label class="choice"><input type="checkbox" [checked]="draft.bodyTypes.includes(value)" (change)="toggleDraft('bodyTypes',value,$event)" />{{ value }}</label>}</div></div></section>

          <section class="section-card"><h3 class="font-black">Renk</h3><p class="mt-1 text-xs text-slate-500">İlan rengi kapak fotoğrafındaki araç rengiyle eşleştirilir.</p><div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">@for(value of colors(); track value){<label class="choice"><input type="checkbox" [checked]="draft.colors.includes(value)" (change)="toggleDraft('colors',value,$event)" /><span class="h-3 w-3 rounded-full border border-slate-300" [style.background]="colorCss(value)"></span>{{ value }}</label>}</div></section>

          <section class="section-card"><h3 class="font-black">Motor ve aktarma</h3><div class="mt-4 grid gap-3 sm:grid-cols-2"><label><span class="field-label">Motor / hacim içerir</span><input [(ngModel)]="draft.engineQuery" class="field-control" placeholder="Örn. 1.5, 2.0, TDI, TCe" /></label><div></div><label><span class="field-label">Minimum motor gücü (bg)</span><input [(ngModel)]="draft.minPower" class="field-control" type="number" min="0" /></label><label><span class="field-label">Maksimum motor gücü (bg)</span><input [(ngModel)]="draft.maxPower" class="field-control" type="number" min="0" /></label></div><div class="mt-4"><span class="field-label">Yakıt</span><div class="grid grid-cols-2 gap-2 sm:grid-cols-4">@for(value of fuels(); track value){<label class="choice"><input type="checkbox" [checked]="draft.fuels.includes(value)" (change)="toggleDraft('fuels',value,$event)" />{{ value }}</label>}</div></div><div class="mt-4"><span class="field-label">Şanzıman</span><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">@for(value of transmissions(); track value){<label class="choice"><input type="checkbox" [checked]="draft.transmissions.includes(value)" (change)="toggleDraft('transmissions',value,$event)" />{{ value }}</label>}</div></div>@if(drivetrains().length){<div class="mt-4"><span class="field-label">Çekiş</span><div class="grid grid-cols-2 gap-2 sm:grid-cols-3">@for(value of drivetrains(); track value){<label class="choice"><input type="checkbox" [checked]="draft.drivetrains.includes(value)" (change)="toggleDraft('drivetrains',value,$event)" />{{ value }}</label>}</div></div>}</section>

          <section class="section-card"><h3 class="font-black">Kapasite ve yapı</h3><div class="mt-4 grid gap-3 sm:grid-cols-2"><label><span class="field-label">Minimum koltuk</span><input [(ngModel)]="draft.minSeats" class="field-control" type="number" min="1" max="30" /></label><label><span class="field-label">Maksimum koltuk</span><input [(ngModel)]="draft.maxSeats" class="field-control" type="number" min="1" max="30" /></label><label><span class="field-label">Minimum kapı</span><input [(ngModel)]="draft.minDoors" class="field-control" type="number" min="1" max="10" /></label><label><span class="field-label">Maksimum kapı</span><input [(ngModel)]="draft.maxDoors" class="field-control" type="number" min="1" max="10" /></label></div></section>

          <section class="section-card"><h3 class="font-black">{{ mode==='rental' ? 'Kiralama koşulları' : 'Araç durumu' }}</h3><div class="mt-4 grid gap-3 sm:grid-cols-2">
            @if(mode==='rental'){
              <label><span class="field-label">Maksimum depozito</span><input [(ngModel)]="draft.maxDeposit" class="field-control" type="number" min="0" /></label><label><span class="field-label">Şoför seçeneği</span><select [(ngModel)]="draft.driverOption" class="field-control"><option value="">Farketmez</option><option value="WITH_DRIVER">Şoförlü</option><option value="WITHOUT_DRIVER">Şoförsüz</option><option value="BOTH">Her ikisini sunan</option></select></label><label class="choice"><input type="checkbox" [(ngModel)]="draft.availableOnly" />Yalnız müsait araçlar</label>
            } @else {
              <label class="choice"><input type="checkbox" [(ngModel)]="draft.cleanOnly" />Hatasız / hasarsız</label><label class="choice"><input type="checkbox" [(ngModel)]="draft.warrantyOnly" />Garantili</label>
            }
          </div></section>
        </div>

        <footer class="grid grid-cols-[1fr_2fr] gap-3 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5"><button type="button" (click)="resetDraft()" class="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-700">Sıfırla</button><button type="button" (click)="applyFilters()" class="min-h-12 rounded-xl bg-blue-600 px-4 font-black text-white">{{ previewCount() }} Sonucu Göster</button></footer>
      </div>
    </dialog>

    <dialog #sortDialog id="premium-sort-dialog" aria-labelledby="premium-sort-title" (close)="restoreSortFocus()" class="m-0 mt-auto w-full max-w-sm overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl sm:m-auto sm:rounded-3xl">
      <header class="flex items-center justify-between border-b border-slate-200 p-5"><h2 id="premium-sort-title" class="text-xl font-black">Sırala</h2><button type="button" (click)="closeSortDialog()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100" aria-label="Sıralama penceresini kapat"><mat-icon>close</mat-icon></button></header><div class="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">@for(option of sortOptions(); track option.id){<button type="button" (click)="applySort(option.id)" class="flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left font-bold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" [class.bg-blue-50]="sortBy()===option.id" [class.text-blue-800]="sortBy()===option.id"><span>{{ option.label }}</span>@if(sortBy()===option.id){<mat-icon>check</mat-icon>}</button>}</div>
    </dialog>
  `,
})
export class PremiumVehicleResultsComponent {
  private readonly cars = inject(CarService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  @Input() mode: ResultMode = "rental";
  @ViewChild("filterDialog") filterDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("sortDialog") sortDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("filterTrigger") filterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild("sortTrigger") sortTrigger?: ElementRef<HTMLButtonElement>;

  readonly searchQuery = signal("");
  readonly applied = signal<AdvancedFilters>(emptyFilters());
  readonly sortBy = signal<SortKey>("default");
  draft: AdvancedFilters = emptyFilters();

  readonly requestedStart = this.route.snapshot.queryParamMap.get("startDate")?.trim() || "";
  readonly requestedEnd = this.route.snapshot.queryParamMap.get("endDate")?.trim() || "";

  readonly source = computed(() => this.mode === "sale" ? this.cars.getSaleCars()() : this.cars.getCars()());
  readonly datedSource = computed(() => this.withRequestedAvailability(this.source()));
  readonly brands = computed(() => this.unique("brand"));
  readonly colors = computed(() => this.unique("color"));
  readonly fuels = computed(() => this.unique("fuel"));
  readonly transmissions = computed(() => this.unique("transmission"));
  readonly bodyTypes = computed(() => this.unique("type"));
  readonly drivetrains = computed(() => this.unique("drivetrain"));

  readonly activeFilterCount = computed(() => {
    const f = this.applied();
    return f.brands.length + f.colors.length + f.fuels.length + f.transmissions.length + f.bodyTypes.length + f.drivetrains.length +
      [f.modelQuery, f.locationQuery, f.engineQuery, f.minPrice, f.maxPrice, f.minYear, f.maxYear, f.minKm, f.maxKm, f.minPower, f.maxPower, f.minSeats, f.maxSeats, f.minDoors, f.maxDoors, f.maxDeposit, f.driverOption, f.cleanOnly, f.warrantyOnly, f.availableOnly].filter((value) => value !== "" && value !== null && value !== false).length;
  });

  readonly filteredVehicles = computed(() => this.sort(this.filter(this.datedSource(), this.applied(), this.searchQuery())));
  readonly sortOptions = computed(() => {
    const base: Array<{id: SortKey; label: string}> = [
      { id: "default", label: "Önerilen sıralama" }, { id: "priceAsc", label: "Fiyat: düşükten yükseğe" }, { id: "priceDesc", label: "Fiyat: yüksekten düşüğe" }, { id: "yearDesc", label: "Model yılı: en yeni" }, { id: "yearAsc", label: "Model yılı: en eski" }, { id: "powerDesc", label: "Motor gücü: yüksekten düşüğe" },
    ];
    if (this.mode === "sale") base.push({ id: "kmAsc", label: "Kilometre: düşükten yükseğe" }, { id: "kmDesc", label: "Kilometre: yüksekten düşüğe" });
    return base;
  });

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get("search")?.trim();
    if (initial) this.searchQuery.set(initial);
  }

  submitSearch(): void {
    const q = this.normalize(this.searchQuery());
    if (!q) return;
    const exact = this.datedSource().find((car) => this.normalize(car.cloudStockCode) === q || this.normalize(String(car.id)) === q || this.normalize(car.cloudId) === q);
    if (exact) void this.router.navigate([this.mode === "sale" ? "/sales" : "/fleet", exact.id]);
  }

  openFilterDialog(): void { this.draft = this.clone(this.applied()); this.filterDialog?.nativeElement.showModal(); }
  closeFilterDialog(): void { this.filterDialog?.nativeElement.close(); }
  restoreFilterFocus(): void { this.filterTrigger?.nativeElement.focus({ preventScroll: true }); }
  openSortDialog(): void { this.sortDialog?.nativeElement.showModal(); }
  closeSortDialog(): void { this.sortDialog?.nativeElement.close(); }
  restoreSortFocus(): void { this.sortTrigger?.nativeElement.focus({ preventScroll: true }); }
  applyFilters(): void { this.applied.set(this.clone(this.draft)); this.closeFilterDialog(); }
  resetDraft(): void { this.draft = emptyFilters(); }
  previewCount(): number { return this.filter(this.datedSource(), this.draft, this.searchQuery()).length; }
  applySort(value: SortKey): void { this.sortBy.set(value); this.closeSortDialog(); }
  clearAll(): void { this.searchQuery.set(""); this.applied.set(emptyFilters()); this.sortBy.set("default"); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigateByUrl("/"); }

  toggleDraft(key: MultiKey, value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.draft[key];
    this.draft = { ...this.draft, [key]: checked ? Array.from(new Set([...current, value])) : current.filter((item) => item !== value) };
  }

  activeFilterLabels(): string[] {
    const f = this.applied(); const labels: string[] = [];
    if (f.brands.length) labels.push(`Marka: ${f.brands.join(", ")}`);
    if (f.colors.length) labels.push(`Renk: ${f.colors.join(", ")}`);
    if (f.fuels.length) labels.push(`Yakıt: ${f.fuels.join(", ")}`);
    if (f.transmissions.length) labels.push(`Vites: ${f.transmissions.join(", ")}`);
    if (f.bodyTypes.length) labels.push(`Kasa: ${f.bodyTypes.join(", ")}`);
    if (f.drivetrains.length) labels.push(`Çekiş: ${f.drivetrains.join(", ")}`);
    if (f.minPrice != null || f.maxPrice != null) labels.push(`Fiyat: ${f.minPrice ?? 0} - ${f.maxPrice ?? "∞"}`);
    if (f.minYear != null || f.maxYear != null) labels.push(`Yıl: ${f.minYear ?? "…"} - ${f.maxYear ?? "…"}`);
    if (this.mode === "sale" && (f.minKm != null || f.maxKm != null)) labels.push(`KM: ${f.minKm ?? 0} - ${f.maxKm ?? "∞"}`);
    if (f.minPower != null || f.maxPower != null) labels.push(`Güç: ${f.minPower ?? 0} - ${f.maxPower ?? "∞"} bg`);
    if (f.cleanOnly) labels.push("Hatasız / hasarsız"); if (f.warrantyOnly) labels.push("Garantili"); if (f.availableOnly) labels.push("Müsait");
    return labels;
  }

  sortLabel(): string { return this.sortOptions().find((item) => item.id === this.sortBy())?.label || "Önerilen sıralama"; }
  colorCss(value: string): string {
    const text = this.normalize(value); const map: Record<string,string> = { siyah: "#111827", beyaz: "#f8fafc", gri: "#94a3b8", gumus: "#cbd5e1", mavi: "#2563eb", lacivert: "#1e3a8a", kirmizi: "#dc2626", yesil: "#16a34a", bej: "#d6c7a1", kahverengi: "#78350f" };
    return map[text] || "#e2e8f0";
  }

  private withRequestedAvailability(rows: Vehicle[]): Vehicle[] {
    if (this.mode !== "rental" || !this.requestedStart || !this.requestedEnd) return rows;
    const requestedStart = new Date(this.requestedStart);
    const requestedEnd = new Date(this.requestedEnd);
    if (Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedEnd.getTime())) return rows;
    return rows.map((car) => {
      const overlaps = (car.bookedDates || []).some((booking) => {
        const bookingStart = new Date(booking.start);
        const bookingEnd = new Date(booking.end);
        return requestedStart < bookingEnd && requestedEnd > bookingStart;
      });
      return { ...car, isAvailable: car.isAvailable !== false && !overlaps };
    });
  }

  private filter(rows: Vehicle[], f: AdvancedFilters, rawSearch: string): Vehicle[] {
    const query = this.normalize(rawSearch);
    return rows.filter((car) => {
      if (query) {
        const haystack = [car.cloudStockCode, car.cloudId, car.id, car.title, car.brand, car.model, car.series, car.year, car.color, car.fuel, car.transmission, car.type, car.location].map((v) => v ?? "").join(" ");
        if (!this.normalize(haystack).includes(query)) return false;
      }
      if (f.brands.length && !f.brands.includes(car.brand || "")) return false;
      if (f.colors.length && !f.colors.includes(car.color || "")) return false;
      if (f.fuels.length && !f.fuels.includes(car.fuel || "")) return false;
      if (f.transmissions.length && !f.transmissions.includes(car.transmission || "")) return false;
      if (f.bodyTypes.length && !f.bodyTypes.includes(car.type || "")) return false;
      if (f.drivetrains.length && !f.drivetrains.includes(car.drivetrain || "")) return false;
      if (f.modelQuery && !this.normalize(`${car.model || ""} ${car.series || ""} ${car.title || ""}`).includes(this.normalize(f.modelQuery))) return false;
      if (f.locationQuery && !this.normalize(car.location).includes(this.normalize(f.locationQuery))) return false;
      if (f.engineQuery && !this.normalize(`${car.engineVolume || ""} ${car.enginePower || ""}`).includes(this.normalize(f.engineQuery))) return false;
      if (!this.inRange(car.price, f.minPrice, f.maxPrice)) return false;
      if (!this.inRange(car.year, f.minYear, f.maxYear)) return false;
      if (this.mode === "sale" && !this.inRange(car.km, f.minKm, f.maxKm)) return false;
      const power = this.numeric(car.enginePower);
      if ((f.minPower != null || f.maxPower != null) && !this.inRange(power, f.minPower, f.maxPower)) return false;
      if (!this.inRange(car.seats, f.minSeats, f.maxSeats)) return false;
      if (!this.inRange(car.doors, f.minDoors, f.maxDoors)) return false;
      if (f.maxDeposit != null && Number(car.deposit ?? Number.MAX_SAFE_INTEGER) > f.maxDeposit) return false;
      if (f.driverOption) {
        if (f.driverOption === "WITH_DRIVER" && !["WITH_DRIVER","BOTH"].includes(car.driverOption || "")) return false;
        if (f.driverOption === "WITHOUT_DRIVER" && !["WITHOUT_DRIVER","BOTH"].includes(car.driverOption || "")) return false;
        if (f.driverOption === "BOTH" && car.driverOption !== "BOTH") return false;
      }
      if (f.cleanOnly && !this.isClean(car)) return false;
      if (f.warrantyOnly && !(car.hasWarranty || this.normalize(car.warranty).includes("garanti"))) return false;
      if (f.availableOnly && car.isAvailable === false) return false;
      return true;
    });
  }

  private sort(rows: Vehicle[]): Vehicle[] {
    const result = [...rows]; const key = this.sortBy();
    if (key === "priceAsc") result.sort((a,b) => a.price-b.price);
    else if (key === "priceDesc") result.sort((a,b) => b.price-a.price);
    else if (key === "yearDesc") result.sort((a,b) => (b.year||0)-(a.year||0));
    else if (key === "yearAsc") result.sort((a,b) => (a.year||0)-(b.year||0));
    else if (key === "kmAsc") result.sort((a,b) => (a.km??Number.MAX_SAFE_INTEGER)-(b.km??Number.MAX_SAFE_INTEGER));
    else if (key === "kmDesc") result.sort((a,b) => (b.km||0)-(a.km||0));
    else if (key === "powerDesc") result.sort((a,b) => (this.numeric(b.enginePower)||0)-(this.numeric(a.enginePower)||0));
    else result.sort((a,b) => (Number(b.isFeatured)-Number(a.isFeatured)) || ((b.displayPriority||0)-(a.displayPriority||0)) || ((b.year||0)-(a.year||0)));
    return result;
  }

  private unique(key: "brand" | "color" | "fuel" | "transmission" | "type" | "drivetrain"): string[] { return Array.from(new Set(this.datedSource().map((car) => car[key]).filter((value): value is string => typeof value === "string" && Boolean(value.trim())))).sort((a,b) => a.localeCompare(b,"tr")); }
  private inRange(value: number | undefined, min: number | null, max: number | null): boolean { if (min == null && max == null) return true; if (value == null || !Number.isFinite(Number(value))) return false; const n=Number(value); return (min==null||n>=min)&&(max==null||n<=max); }
  private numeric(value: unknown): number | undefined { if (typeof value === "number" && Number.isFinite(value)) return value; const match=String(value??"").replace(",",".").match(/\d+(?:\.\d+)?/); const n=match?Number(match[0]):NaN; return Number.isFinite(n)?n:undefined; }
  private isClean(car: Vehicle): boolean { const text=this.normalize(`${car.damageStatus||""} ${car.tramer||""}`); return car.isDamageFree===true || car.isPaintless===true || text.includes("hatasiz") || text.includes("hasarsiz") || text.includes("boyasiz"); }
  private normalize(value: unknown): string { return String(value??"").trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i"); }
  private clone<T>(value:T):T { return JSON.parse(JSON.stringify(value)) as T; }
}
