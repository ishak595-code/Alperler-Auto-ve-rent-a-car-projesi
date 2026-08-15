import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-rental-results",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent],
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
          <h1 class="font-serif text-3xl font-black text-white sm:text-4xl">{{ showFavoritesOnly() ? 'Favorilerim' : 'Kiralık Araçlar' }} <span class="text-lg text-slate-500">({{ filteredVehicles().length }})</span></h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Marka, araç tipi, yakıt, vites, koltuk, fiyat, tarih ve hizmet seçeneklerini doğrudan bu sayfadan uygulayın.</p>
        </div>
      </section>

      @if (!showFavoritesOnly()) {
        <section class="border-b border-slate-200 bg-white px-4 py-5 text-slate-900" aria-labelledby="rental-filter-title">
          <div class="mx-auto max-w-7xl">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div><h2 id="rental-filter-title" class="text-lg font-black">Filtreler</h2><p class="mt-1 text-xs text-slate-500">Her seçim sonuçlara anında uygulanır.</p></div>
              @if (hasActiveSearchOrFilter()) { <button type="button" (click)="clearAll()" class="min-h-11 rounded-xl px-3 text-xs font-black text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Temizle</button> }
            </div>

            <div class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Marka</span><select aria-label="Kiralık araç markası" [ngModel]="filterBrand()" (ngModelChange)="filterBrand.set($event)" class="filter-control"><option value="">Tüm markalar</option>@for (brand of brands(); track brand) { <option [value]="brand">{{ brand }}</option> }</select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Araç tipi</span><select aria-label="Kiralık araç tipi" [ngModel]="filterType()" (ngModelChange)="filterType.set($event)" class="filter-control"><option value="">Tüm tipler</option>@for (type of types(); track type) { <option [value]="type">{{ type }}</option> }</select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Yakıt</span><select aria-label="Kiralık araç yakıt türü" [ngModel]="filterFuel()" (ngModelChange)="filterFuel.set($event)" class="filter-control">@for (option of fuelOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Vites</span><select aria-label="Kiralık araç vites türü" [ngModel]="filterTransmission()" (ngModelChange)="filterTransmission.set($event)" class="filter-control">@for (option of transmissionOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Günlük fiyat</span><select aria-label="Kiralık araç günlük fiyat aralığı" [ngModel]="filterPrice()" (ngModelChange)="filterPrice.set($event)" class="filter-control">@for (option of priceOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Koltuk</span><select aria-label="Minimum koltuk sayısı" [ngModel]="minSeats()" (ngModelChange)="minSeats.set(+$event)" class="filter-control"><option [ngValue]="0">Tümü</option><option [ngValue]="4">4+</option><option [ngValue]="5">5+</option><option [ngValue]="7">7+</option></select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Alış tarihi</span><input aria-label="Kiralık araç alış tarihi" type="date" [min]="today" [ngModel]="startDate()" (ngModelChange)="setStartDate($event)" class="filter-control" /></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">İade tarihi</span><input aria-label="Kiralık araç iade tarihi" type="date" [min]="startDate() || today" [ngModel]="endDate()" (ngModelChange)="endDate.set($event)" class="filter-control" /></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Hizmet</span><select aria-label="Kiralama hizmet seçeneği" [ngModel]="serviceFilter()" (ngModelChange)="serviceFilter.set($event)" class="filter-control"><option value="">Tüm hizmetler</option><option value="driver">Şoförlü seçenek</option><option value="available">Yalnız müsait araçlar</option></select></label>
              <label class="block"><span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sırala</span><select aria-label="Kiralık araçları sırala" [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)" class="filter-control">@for (option of sortOptions; track option.id) { <option [value]="option.id">{{ option.label }}</option> }</select></label>
            </div>

            <div class="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600" aria-live="polite">
              <span class="rounded-full bg-slate-100 px-3 py-2">{{ filteredVehicles().length }} araç bulundu</span>
              @if (activeFilterCount()) { <span class="rounded-full bg-blue-50 px-3 py-2 text-blue-700">{{ activeFilterCount() }} filtre aktif</span> }
            </div>
          </div>
        </section>
      }

      <section class="bg-white" aria-label="Kiralık araç sonuçları">
        @if (filteredVehicles().length > 0) {
          <div class="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 xl:grid-cols-4">
            @for (car of filteredVehicles(); track car.id) { <div class="min-w-0 bg-white"><app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item></div> }
          </div>
        } @else {
          <div class="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center px-6 text-center text-slate-700">
            <mat-icon class="!h-14 !w-14 !text-[56px] text-slate-300" aria-hidden="true">search_off</mat-icon><h2 class="mt-4 text-xl font-black">Eşleşen araç bulunamadı</h2><p class="mt-2 text-sm text-slate-500">Arama, tarih veya filtreleri değiştirerek tekrar deneyin.</p><button type="button" (click)="clearAll()" class="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 font-black text-white">Tüm Araçları Göster</button>
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    .filter-control{min-height:46px;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;background:#f8fafc;padding:.55rem .7rem;font-size:.8rem;font-weight:800;color:#0f172a;outline:none}.filter-control:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}
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
  readonly today = this.toDateInput(new Date());

  readonly priceOptions = [{ id: "", label: "Tüm fiyatlar" },{ id: "0-3000", label: "0 - 3.000 TL" },{ id: "3000-5000", label: "3.000 - 5.000 TL" },{ id: "5000+", label: "5.000 TL ve üzeri" }];
  readonly fuelOptions = [{ id: "", label: "Tüm yakıtlar" },{ id: "Dizel", label: "Dizel" },{ id: "Benzin", label: "Benzin" },{ id: "Hibrit", label: "Hibrit" },{ id: "Elektrik", label: "Elektrik" }];
  readonly transmissionOptions = [{ id: "", label: "Tüm vitesler" },{ id: "Otomatik", label: "Otomatik" },{ id: "Manuel", label: "Manuel" }];
  readonly sortOptions = [{ id: "default", label: "Önerilen sıra" },{ id: "priceAsc", label: "Fiyat artan" },{ id: "priceDesc", label: "Fiyat azalan" },{ id: "yearDesc", label: "En yeni model" }];

  readonly brands = computed(() => Array.from(new Set(this.allCars().map((car) => car.brand).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));
  readonly types = computed(() => Array.from(new Set(this.allCars().map((car) => car.type).filter(Boolean) as string[])).sort((a,b) => a.localeCompare(b,"tr")));

  readonly activeFilterCount = computed(() => [this.filterBrand(),this.filterPrice(),this.filterFuel(),this.filterTransmission(),this.filterType(),this.minSeats() ? String(this.minSeats()) : "",this.serviceFilter(),this.startDate(),this.endDate()].filter(Boolean).length);
  readonly hasActiveSearchOrFilter = computed(() => Boolean(this.searchQuery().trim() || this.activeFilterCount() || this.showFavoritesOnly()));

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
  clearAll(): void { this.searchQuery.set("");this.filterBrand.set("");this.filterPrice.set("");this.filterFuel.set("");this.filterTransmission.set("");this.filterType.set("");this.minSeats.set(0);this.serviceFilter.set("");this.sortBy.set("default");this.showFavoritesOnly.set(false);this.startDate.set("");this.endDate.set(""); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }

  private matchesRange(value:number, range:string):boolean { if(!range) return true; if(range.endsWith("+")) return value>=Number(range.slice(0,-1)); const [min,max]=range.split("-").map(Number); return value>=min&&value<=max; }
  private toDateInput(date:Date):string { const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000); return local.toISOString().slice(0,10); }
}
