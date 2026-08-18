import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-rental-results",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent, AccessibleNativeDateComponent],
  template: `
    <main class="min-h-screen bg-slate-950 pb-28 text-slate-300">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur-xl">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-2 py-2 sm:px-4">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Kiralık araçlardan geri dön">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
          </button>
          <label for="rental-search" class="relative min-w-0 flex-1">
            <span class="sr-only">Kiralık araçlarda ilan no, marka veya model ara</span>
            <mat-icon aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</mat-icon>
            <input id="rental-search" type="search" inputmode="search" autocomplete="off" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="İlan no, marka veya model ara" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40" />
          </label>
        </div>
      </header>

      <section class="border-b border-slate-800 bg-[#020617] px-4 py-6 sm:py-8">
        <div class="mx-auto max-w-7xl">
          <p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-400">Size Uyan Aracı Bulun</p>
          <h1 class="mt-1 font-serif text-3xl font-black text-white sm:text-4xl">{{ showFavoritesOnly() ? 'Favorilerim' : 'Kiralık Araçlar' }}</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Araçları rahatça inceleyin. Daha ayrıntılı seçim yapmak istediğinizde filtre panelini açın.</p>
        </div>
      </section>

      @if (!showFavoritesOnly()) {
        <section class="sticky top-16 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 text-slate-900 shadow-sm backdrop-blur" aria-label="Kiralık araç araçları">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div class="min-w-0" aria-live="polite">
              <strong class="block text-sm font-black">{{ filteredVehicles().length }} araç bulundu</strong>
              <span class="block truncate text-[11px] text-slate-500">@if (activeFilterCount()) { {{ activeFilterCount() }} filtre aktif } @else { Filtre uygulanmadı }</span>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              @if (activeFilterCount()) {
                <button type="button" (click)="clearFilters()" class="min-h-11 rounded-xl px-3 text-xs font-black text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Temizle</button>
              }
              <button type="button" (click)="filterOpen.set(true)" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" [attr.aria-expanded]="filterOpen()" aria-controls="rental-filter-sheet">
                <mat-icon aria-hidden="true">tune</mat-icon> Filtrele @if (activeFilterCount()) { <span class="count-badge">{{ activeFilterCount() }}</span> }
              </button>
            </div>
          </div>
        </section>
      }

      <section class="bg-white" aria-label="Kiralık araç sonuçları">
        @if (filteredVehicles().length > 0) {
          <div class="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 xl:grid-cols-4">
            @for (car of filteredVehicles(); track car.id) {
              <div class="min-w-0 bg-white"><app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item></div>
            }
          </div>
        } @else {
          <div class="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center px-6 text-center text-slate-700">
            <mat-icon class="!h-14 !w-14 !text-[56px] text-slate-300" aria-hidden="true">search_off</mat-icon>
            <h2 class="mt-4 text-xl font-black">Bu seçimlere uyan araç bulunamadı</h2>
            <p class="mt-2 text-sm text-slate-500">Filtrelerden birini değiştirin veya tüm filtreleri temizleyin.</p>
            <button type="button" (click)="clearAll()" class="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 font-black text-white">Tüm Araçları Göster</button>
          </div>
        }
      </section>

      @if (filterOpen()) {
        <div class="filter-backdrop" (click)="filterOpen.set(false)" (keydown.escape)="filterOpen.set(false)">
          <section id="rental-filter-sheet" class="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="rental-filter-title" (click)="$event.stopPropagation()">
            <header class="filter-head">
              <div><p>Aramanızı daraltın</p><h2 id="rental-filter-title">Kiralık Araç Filtreleri</h2></div>
              <button type="button" (click)="filterOpen.set(false)" aria-label="Filtreleri kapat"><mat-icon aria-hidden="true">close</mat-icon></button>
            </header>

            <div class="filter-scroll">
              <div class="filter-grid">
                <label><span>Marka</span><select aria-label="Kiralık araç markası" [ngModel]="filterBrand()" (ngModelChange)="filterBrand.set($event)" class="filter-control"><option value="">Tüm markalar</option>@for (brand of brands(); track brand) { <option [value]="brand">{{ brand }}</option> }</select></label>
                <label><span>Araç tipi</span><select aria-label="Kiralık araç tipi" [ngModel]="filterType()" (ngModelChange)="filterType.set($event)" class="filter-control"><option value="">Tüm tipler</option>@for (type of types(); track type) { <option [value]="type">{{ type }}</option> }</select></label>
                <label><span>Yakıt</span><select aria-label="Kiralık araç yakıt türü" [ngModel]="filterFuel()" (ngModelChange)="filterFuel.set($event)" class="filter-control">@for (option of fuelOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
                <label><span>Vites</span><select aria-label="Kiralık araç vites türü" [ngModel]="filterTransmission()" (ngModelChange)="filterTransmission.set($event)" class="filter-control">@for (option of transmissionOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
                <label><span>Günlük fiyat</span><select aria-label="Kiralık araç günlük fiyat aralığı" [ngModel]="filterPrice()" (ngModelChange)="filterPrice.set($event)" class="filter-control">@for (option of priceOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
                <label><span>Koltuk</span><select aria-label="Minimum koltuk sayısı" [ngModel]="minSeats()" (ngModelChange)="minSeats.set(+$event)" class="filter-control"><option [ngValue]="0">Tümü</option><option [ngValue]="4">4+</option><option [ngValue]="5">5+</option><option [ngValue]="7">7+</option></select></label>
                <app-accessible-native-date label="Alış tarihi" [value]="startDate()" [min]="today" (valueChange)="setStartDate($event)" />
                <app-accessible-native-date label="İade tarihi" [value]="endDate()" [min]="startDate() || today" (valueChange)="endDate.set($event)" />
                <label><span>Hizmet</span><select aria-label="Kiralama hizmet seçeneği" [ngModel]="serviceFilter()" (ngModelChange)="serviceFilter.set($event)" class="filter-control"><option value="">Tüm hizmetler</option><option value="driver">Şoförlü seçenek</option><option value="available">Yalnız müsait araçlar</option></select></label>
                <label><span>Sırala</span><select aria-label="Kiralık araçları sırala" [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)" class="filter-control">@for (option of sortOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
              </div>
            </div>

            <footer class="filter-footer">
              <button type="button" (click)="clearFilters()" class="secondary">Filtreleri Temizle</button>
              <button type="button" (click)="filterOpen.set(false)" class="primary">{{ filteredVehicles().length }} Aracı Göster</button>
            </footer>
          </section>
        </div>
      }
    </main>
  `,
  styles: [`
    .count-badge{display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#2563eb;padding:0 5px;font-size:10px}.filter-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.filter-sheet{display:flex;width:100%;max-height:min(88vh,760px);flex-direction:column;border:1px solid #dbe3ee;border-radius:24px 24px 0 0;background:#fff;color:#0f172a;box-shadow:0 -24px 70px rgba(2,6,23,.32)}.filter-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem 1.1rem}.filter-head p{margin:0;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.filter-head h2{margin:2px 0 0;font-size:1.2rem;font-weight:950}.filter-head button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:13px;background:#f1f5f9;color:#334155}.filter-scroll{overflow:auto;padding:1rem}.filter-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.filter-grid label{display:flex;min-width:0;flex-direction:column;gap:.35rem}.filter-grid label>span{color:#475569;font-size:10px;font-weight:950;letter-spacing:.055em;text-transform:uppercase}.filter-grid app-accessible-native-date{--date-bg:#f8fafc;--date-color:#0f172a;--date-label:#475569;--date-border:#cbd5e1}.filter-control{min-height:48px;width:100%;border-radius:12px;border:1px solid #cbd5e1;background:#f8fafc;padding:.6rem .72rem;font-size:.8rem;font-weight:800;color:#0f172a;outline:none}.filter-control:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.14);background:#fff}.filter-footer{display:grid;grid-template-columns:.9fr 1.1fr;gap:.65rem;border-top:1px solid #e2e8f0;background:#fff;padding:.85rem 1rem max(.85rem,env(safe-area-inset-bottom))}.filter-footer button{min-height:50px;border-radius:13px;font-size:.76rem;font-weight:950}.filter-footer .secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.filter-footer .primary{border:0;background:#0f172a;color:#fff}@media(min-width:768px){.filter-backdrop{align-items:center;padding:2rem}.filter-sheet{max-width:760px;border-radius:24px}.filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:420px){.filter-grid{grid-template-columns:1fr}}
  `],
})
export class RentalResultsComponent {
  private readonly carService = inject(CarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly allCars = this.carService.getCars();
  readonly allVehicles = this.carService.getAllVehicles();
  readonly searchQuery = signal("");
  readonly filterBrand = signal("");
  readonly filterPrice = signal("");
  readonly filterFuel = signal("");
  readonly filterTransmission = signal("");
  readonly filterType = signal("");
  readonly minSeats = signal(0);
  readonly serviceFilter = signal<"" | "driver" | "available">("");
  readonly sortBy = signal("default");
  readonly showFavoritesOnly = signal(false);
  readonly startDate = signal("");
  readonly endDate = signal("");
  readonly filterOpen = signal(false);
  readonly today = this.toDateInput(new Date());

  readonly priceOptions = [{ id: "", label: "Tüm fiyatlar" },{ id: "0-3000", label: "0 - 3.000 TL" },{ id: "3000-5000", label: "3.000 - 5.000 TL" },{ id: "5000+", label: "5.000 TL ve üzeri" }];
  readonly fuelOptions = [{ id: "", label: "Tüm yakıtlar" },{ id: "Dizel", label: "Dizel" },{ id: "Benzin", label: "Benzin" },{ id: "Hibrit", label: "Hibrit" },{ id: "Elektrik", label: "Elektrik" }];
  readonly transmissionOptions = [{ id: "", label: "Tüm vitesler" },{ id: "Otomatik", label: "Otomatik" },{ id: "Manuel", label: "Manuel" }];
  readonly sortOptions = [{ id: "default", label: "Önerilen sıra" },{ id: "priceAsc", label: "Fiyat artan" },{ id: "priceDesc", label: "Fiyat azalan" },{ id: "yearDesc", label: "En yeni model" }];

  readonly brands = computed(() => Array.from(new Set(this.allCars().map((car) => car.brand).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly types = computed(() => Array.from(new Set(this.allCars().map((car) => car.type).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly activeFilterCount = computed(() => [this.filterBrand(),this.filterPrice(),this.filterFuel(),this.filterTransmission(),this.filterType(),this.minSeats() ? String(this.minSeats()) : "",this.serviceFilter(),this.startDate(),this.endDate()].filter(Boolean).length);

  readonly filteredVehicles = computed(() => {
    let vehicles: Car[] = this.showFavoritesOnly() ? (this.allVehicles().filter((vehicle) => this.carService.isFavorite(vehicle.id)) as Car[]) : [...this.allCars()];
    const start = this.startDate();
    const end = this.endDate();
    if (start && end && !this.showFavoritesOnly()) {
      const requestedStart = new Date(start);
      const requestedEnd = new Date(end);
      vehicles = vehicles.map((car) => {
        const overlaps = (car.bookedDates || []).some((booking) => requestedStart <= new Date(booking.end) && requestedEnd >= new Date(booking.start));
        return { ...car, isAvailable: !overlaps };
      });
    }

    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    let result = vehicles.filter((car) => {
      if (query) {
        const haystack = [car.id, car.cloudStockCode, car.title, car.brand, car.model, car.series, car.year].filter((value) => value != null).join(" ").toLocaleLowerCase("tr-TR");
        if (!haystack.includes(query)) return false;
      }
      if (this.filterBrand() && car.brand !== this.filterBrand()) return false;
      if (this.filterFuel() && car.fuel !== this.filterFuel()) return false;
      if (this.filterTransmission() && car.transmission !== this.filterTransmission()) return false;
      if (this.filterType() && car.type !== this.filterType()) return false;
      if (this.minSeats() && Number(car.seats || 0) < this.minSeats()) return false;
      if (!this.matchesRange(car.price || 0, this.filterPrice())) return false;
      if (this.serviceFilter() === "driver" && car.driverOption !== "WITH_DRIVER" && car.driverOption !== "BOTH") return false;
      if (this.serviceFilter() === "available" && car.isAvailable === false) return false;
      return true;
    });

    result = [...result];
    if (this.sortBy() === "priceAsc") result.sort((a,b) => a.price-b.price);
    if (this.sortBy() === "priceDesc") result.sort((a,b) => b.price-a.price);
    if (this.sortBy() === "yearDesc") result.sort((a,b) => (b.year||0)-(a.year||0));
    return result;
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.startDate.set(params.get("start") || "");
    this.endDate.set(params.get("end") || "");
    if (params.get("driver") === "true") this.serviceFilter.set("driver");
    this.showFavoritesOnly.set(params.get("favs") === "true");
    this.searchQuery.set(params.get("search")?.trim() || "");
    this.filterType.set(params.get("filter")?.trim() || "");
  }

  setStartDate(value: string): void { this.startDate.set(value); if (this.endDate() && this.endDate() < value) this.endDate.set(value); }
  clearFilters(): void { this.filterBrand.set("");this.filterPrice.set("");this.filterFuel.set("");this.filterTransmission.set("");this.filterType.set("");this.minSeats.set(0);this.serviceFilter.set("");this.sortBy.set("default");this.startDate.set("");this.endDate.set(""); }
  clearAll(): void { this.searchQuery.set("");this.clearFilters();this.showFavoritesOnly.set(false); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }

  private matchesRange(value:number, range:string):boolean { if(!range) return true; if(range.endsWith("+")) return value>=Number(range.slice(0,-1)); const [min,max]=range.split("-").map(Number); return value>=min&&value<=max; }
  private toDateInput(date:Date):string { const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000); return local.toISOString().slice(0,10); }
}
