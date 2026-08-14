import { CommonModule, Location } from "@angular/common";
import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";

@Component({
  selector: "app-rental-results",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RouterLink,
    VehicleListItemComponent,
  ],
  styles: [`
    dialog:not([open]){display:none}
    dialog::backdrop{background:rgba(2,6,23,.78);backdrop-filter:blur(3px)}
    .filter-title{font-size:.75rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569}
    .filter-option{min-height:44px;border-radius:.75rem;background:#f8fafc;padding:.55rem .75rem;font-size:.8rem;font-weight:800;color:#334155;outline:none;border:1px solid transparent}
    .filter-option:hover{background:#f1f5f9}
    .filter-option:focus-visible{box-shadow:0 0 0 2px #3b82f6}
    .filter-option.selected{background:#2563eb;color:white}
  `],
  template: `
    <main class="min-h-screen bg-slate-950 pb-16 text-slate-300">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 shadow-lg">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
          <button
            type="button"
            (click)="goBack()"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Geri dön"
          >
            <mat-icon>arrow_back</mat-icon>
          </button>

          <label class="relative min-w-0 flex-1">
            <span class="sr-only">Kiralık araçlarda ara</span>
            <mat-icon aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</mat-icon>
            <input
              type="search"
              inputmode="search"
              autocomplete="off"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Marka, model veya ilan no ara..."
              class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
          </label>

          <button
            #filterTrigger
            type="button"
            (click)="openFilterDialog()"
            class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-haspopup="dialog"
            aria-controls="rental-filter-dialog"
            aria-label="Kiralık araçları filtrele"
          >
            <mat-icon>tune</mat-icon>
            @if (activeFilterCount() > 0) {
              <span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-black text-white">{{ activeFilterCount() }}</span>
            }
          </button>

          <button
            #sortTrigger
            type="button"
            (click)="openSortDialog()"
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-haspopup="dialog"
            aria-controls="rental-sort-dialog"
            aria-label="Kiralık araçları sırala"
          >
            <mat-icon>sort</mat-icon>
          </button>
        </div>
      </header>

      <section class="border-b border-slate-800 bg-[#020617] px-4 py-8">
        <div class="mx-auto max-w-7xl">
          <h1 class="font-serif text-3xl font-black text-white sm:text-4xl">
            @if (showFavoritesOnly()) {
              Favorilerim
            } @else {
              Kiralık Araçlar
            }
            <span class="text-lg text-slate-500">({{ filteredVehicles().length }} Araç)</span>
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            @if (showFavoritesOnly()) {
              Favoriye eklediğiniz kiralık ve satılık araçları burada inceleyebilirsiniz.
            } @else {
              Müsaitlik, şoför seçeneği, araç tipi ve bütçenize göre filoyu güvenle filtreleyin.
            }
          </p>
        </div>
      </section>

      @if (hasActiveSearchOrFilter()) {
        <section class="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div class="min-w-0 truncate text-sm font-bold">{{ filteredVehicles().length }} sonuç bulundu</div>
            <button
              type="button"
              (click)="clearAll()"
              class="min-h-11 shrink-0 rounded-xl px-3 text-sm font-black text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Filtreleri Temizle
            </button>
          </div>
        </section>
      }

      @if (withDriver()) {
        <section class="border-b border-blue-200 bg-blue-50 px-4 py-3 text-blue-950">
          <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2 text-sm font-bold">
              <mat-icon class="text-blue-600">person</mat-icon>
              <span class="truncate">Şoförlü hizmet filtresi aktif</span>
            </div>
            <button type="button" (click)="withDriver.set(false); tempWithDriver = false" class="min-h-11 shrink-0 rounded-xl px-3 text-sm font-black text-blue-700">Kaldır</button>
          </div>
        </section>
      }

      <section class="bg-white" aria-label="Kiralık araç sonuçları">
        @if (filteredVehicles().length > 0) {
          <div class="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 xl:grid-cols-4">
            @for (car of filteredVehicles(); track car.id) {
              <div class="min-w-0 bg-white">
                <app-vehicle-list-item
                  [car]="car"
                  [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
                ></app-vehicle-list-item>
              </div>
            }
          </div>
        } @else {
          <div class="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center px-6 text-center text-slate-700">
            <mat-icon class="!h-14 !w-14 !text-[56px] text-slate-300">search_off</mat-icon>
            <h2 class="mt-4 text-xl font-black">Eşleşen araç bulunamadı</h2>
            <p class="mt-2 text-sm text-slate-500">Arama, tarih veya filtreleri değiştirerek tekrar deneyin.</p>
            <button type="button" (click)="clearAll()" class="mt-5 min-h-11 rounded-xl bg-slate-900 px-5 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Tüm Araçları Göster</button>
          </div>
        }
      </section>
    </main>

    <dialog
      #filterDialog
      id="rental-filter-dialog"
      aria-labelledby="rental-filter-title"
      (close)="restoreFilterFocus()"
      class="m-0 mt-auto max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl sm:m-auto sm:rounded-3xl"
    >
      <div class="flex max-h-[92dvh] flex-col">
        <div class="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="rental-filter-title" class="text-xl font-black">Filtrele</h2>
            <p class="mt-1 text-xs text-slate-500">Seçimleriniz Uygula düğmesine basınca sonuçlara yansır.</p>
          </div>
          <button type="button" (click)="closeFilterDialog()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filtre penceresini kapat"><mat-icon>close</mat-icon></button>
        </div>

        <div class="space-y-6 overflow-y-auto overscroll-contain p-5">
          <fieldset>
            <legend class="filter-title">Marka</legend>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" (click)="tempBrand = ''" class="filter-option" [class.selected]="tempBrand === ''">Tümü</button>
              @for (brand of brands(); track brand) {
                <button type="button" (click)="tempBrand = brand" class="filter-option" [class.selected]="tempBrand === brand">{{ brand }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="filter-title">Fiyat / Gün</legend>
            <div class="mt-3 grid grid-cols-2 gap-2">
              @for (option of priceOptions; track option.id) {
                <button type="button" (click)="tempPrice = option.id" class="filter-option" [class.selected]="tempPrice === option.id">{{ option.label }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="filter-title">Yakıt</legend>
            <div class="mt-3 grid grid-cols-2 gap-2">
              @for (option of fuelOptions; track option.id) {
                <button type="button" (click)="tempFuel = option.id" class="filter-option" [class.selected]="tempFuel === option.id">{{ option.label }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="filter-title">Vites</legend>
            <div class="mt-3 grid grid-cols-2 gap-2">
              @for (option of transmissionOptions; track option.id) {
                <button type="button" (click)="tempTransmission = option.id" class="filter-option" [class.selected]="tempTransmission === option.id">{{ option.label }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="filter-title">Araç Tipi</legend>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" (click)="tempType = ''" class="filter-option" [class.selected]="tempType === ''">Tümü</button>
              @for (type of types(); track type) {
                <button type="button" (click)="tempType = type" class="filter-option" [class.selected]="tempType === type">{{ type }}</button>
              }
            </div>
          </fieldset>

          <fieldset>
            <legend class="filter-title">Hizmet</legend>
            <button
              type="button"
              (click)="tempWithDriver = !tempWithDriver"
              [attr.aria-pressed]="tempWithDriver"
              class="mt-3 flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span class="flex items-center gap-3 font-bold text-slate-800"><mat-icon class="text-blue-600">person</mat-icon>Şoförlü kiralama</span>
              <span class="relative h-6 w-12 rounded-full transition-colors" [class.bg-emerald-500]="tempWithDriver" [class.bg-slate-300]="!tempWithDriver">
                <span class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform" [class.translate-x-6]="tempWithDriver"></span>
              </span>
            </button>
          </fieldset>
        </div>

        <div class="grid grid-cols-[1fr_2fr] gap-3 border-t border-slate-200 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button type="button" (click)="resetTemporaryFilters()" class="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sıfırla</button>
          <button type="button" (click)="applyFilters()" class="min-h-12 rounded-xl bg-slate-900 px-4 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Uygula</button>
        </div>
      </div>
    </dialog>

    <dialog
      #sortDialog
      id="rental-sort-dialog"
      aria-labelledby="rental-sort-title"
      (close)="restoreSortFocus()"
      class="m-0 mt-auto w-full max-w-sm overflow-hidden rounded-t-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl sm:m-auto sm:rounded-3xl"
    >
      <div class="flex items-center justify-between border-b border-slate-200 p-5">
        <h2 id="rental-sort-title" class="text-xl font-black">Sırala</h2>
        <button type="button" (click)="closeSortDialog()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Sıralama penceresini kapat"><mat-icon>close</mat-icon></button>
      </div>
      <div class="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        @for (option of sortOptions; track option.id) {
          <button
            type="button"
            (click)="applySort(option.id)"
            class="flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left font-bold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            [class.bg-blue-50]="sortBy() === option.id"
            [class.text-blue-800]="sortBy() === option.id"
          >
            <span>{{ option.label }}</span>
            @if (sortBy() === option.id) { <mat-icon>check</mat-icon> }
          </button>
        }
      </div>
    </dialog>
  `,
})
export class RentalResultsComponent {
  private readonly carService = inject(CarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly uiService = inject(UiService);

  @ViewChild("filterDialog") filterDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("sortDialog") sortDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("filterTrigger") filterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild("sortTrigger") sortTrigger?: ElementRef<HTMLButtonElement>;

  readonly allCars = this.carService.getCars();
  readonly allVehicles = this.carService.getAllVehicles();

  readonly searchQuery = signal("");
  readonly filterBrand = signal("");
  readonly filterPrice = signal("");
  readonly filterFuel = signal("");
  readonly filterTransmission = signal("");
  readonly filterType = signal("");
  readonly withDriver = signal(false);
  readonly sortBy = signal("default");
  readonly showFavoritesOnly = signal(false);

  startDate = "";
  endDate = "";
  rentalDuration = "daily";

  tempBrand = "";
  tempPrice = "";
  tempFuel = "";
  tempTransmission = "";
  tempType = "";
  tempWithDriver = false;

  readonly priceOptions = [
    { id: "", label: "Tümü" },
    { id: "0-3000", label: "0 - 3.000 TL" },
    { id: "3000-5000", label: "3.000 - 5.000 TL" },
    { id: "5000+", label: "5.000 TL ve üzeri" },
  ];

  readonly fuelOptions = [
    { id: "", label: "Tümü" },
    { id: "Dizel", label: "Dizel" },
    { id: "Benzin", label: "Benzin" },
    { id: "Hibrit", label: "Hibrit" },
    { id: "Elektrik", label: "Elektrik" },
  ];

  readonly transmissionOptions = [
    { id: "", label: "Tümü" },
    { id: "Otomatik", label: "Otomatik" },
    { id: "Manuel", label: "Manuel" },
  ];

  readonly sortOptions = [
    { id: "default", label: "Varsayılan" },
    { id: "priceAsc", label: "Fiyat: Artan" },
    { id: "priceDesc", label: "Fiyat: Azalan" },
    { id: "yearDesc", label: "Model Yılı: Yeni" },
  ];

  readonly brands = computed(() =>
    Array.from(new Set(this.allCars().map((car) => car.brand).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr")),
  );

  readonly types = computed(() =>
    Array.from(new Set(this.allCars().map((car) => car.type).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr")),
  );

  readonly activeFilterCount = computed(() =>
    [
      this.filterBrand(),
      this.filterPrice(),
      this.filterFuel(),
      this.filterTransmission(),
      this.filterType(),
      this.withDriver() ? "driver" : "",
    ].filter(Boolean).length,
  );

  readonly hasActiveSearchOrFilter = computed(() =>
    Boolean(
      this.searchQuery().trim() ||
        this.activeFilterCount() ||
        this.showFavoritesOnly(),
    ),
  );

  readonly filteredVehicles = computed(() => {
    let vehicles: Car[] = this.showFavoritesOnly()
      ? (this.allVehicles().filter((vehicle) => this.carService.isFavorite(vehicle.id)) as Car[])
      : [...this.allCars()];

    if (this.startDate && this.endDate && !this.showFavoritesOnly()) {
      const requestedStart = new Date(this.startDate);
      const requestedEnd = new Date(this.endDate);
      vehicles = vehicles.map((car) => {
        const overlaps = (car.bookedDates || []).some((booking) => {
          const bookingStart = new Date(booking.start);
          const bookingEnd = new Date(booking.end);
          return requestedStart <= bookingEnd && requestedEnd >= bookingStart;
        });
        return { ...car, isAvailable: !overlaps };
      });
    }

    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    let result = vehicles.filter((car) => {
      if (query) {
        const haystack = [car.id, car.brand, car.model, car.series, car.year]
          .filter((value) => value !== undefined && value !== null)
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        if (!haystack.includes(query)) return false;
      }
      if (this.filterBrand() && car.brand !== this.filterBrand()) return false;
      if (this.filterFuel() && car.fuel !== this.filterFuel()) return false;
      if (this.filterTransmission() && car.transmission !== this.filterTransmission()) return false;
      if (this.filterType() && car.type !== this.filterType()) return false;
      if (!this.matchesRange(car.price || 0, this.filterPrice())) return false;
      if (
        this.withDriver() &&
        car.driverOption !== "WITH_DRIVER" &&
        car.driverOption !== "BOTH"
      ) return false;
      return true;
    });

    result = [...result];
    if (this.sortBy() === "priceAsc") result.sort((a, b) => a.price - b.price);
    if (this.sortBy() === "priceDesc") result.sort((a, b) => b.price - a.price);
    if (this.sortBy() === "yearDesc") result.sort((a, b) => (b.year || 0) - (a.year || 0));
    return result;
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.startDate = params.get("start") || "";
    this.endDate = params.get("end") || "";
    this.rentalDuration = params.get("duration") || "daily";
    this.withDriver.set(params.get("driver") === "true");
    this.tempWithDriver = this.withDriver();
    this.showFavoritesOnly.set(params.get("favs") === "true");
    this.searchQuery.set(params.get("search")?.trim() || "");
    const type = params.get("filter")?.trim() || "";
    this.filterType.set(type);
    this.tempType = type;
  }

  openFilterDialog(): void {
    this.tempBrand = this.filterBrand();
    this.tempPrice = this.filterPrice();
    this.tempFuel = this.filterFuel();
    this.tempTransmission = this.filterTransmission();
    this.tempType = this.filterType();
    this.tempWithDriver = this.withDriver();
    this.openDialog(this.filterDialog?.nativeElement);
  }

  closeFilterDialog(): void {
    this.closeDialog(this.filterDialog?.nativeElement);
  }

  openSortDialog(): void {
    this.openDialog(this.sortDialog?.nativeElement);
  }

  closeSortDialog(): void {
    this.closeDialog(this.sortDialog?.nativeElement);
  }

  restoreFilterFocus(): void {
    this.filterTrigger?.nativeElement.focus({ preventScroll: true });
  }

  restoreSortFocus(): void {
    this.sortTrigger?.nativeElement.focus({ preventScroll: true });
  }

  applyFilters(): void {
    this.filterBrand.set(this.tempBrand);
    this.filterPrice.set(this.tempPrice);
    this.filterFuel.set(this.tempFuel);
    this.filterTransmission.set(this.tempTransmission);
    this.filterType.set(this.tempType);
    this.withDriver.set(this.tempWithDriver);
    this.closeFilterDialog();
  }

  applySort(value: string): void {
    this.sortBy.set(value);
    this.closeSortDialog();
  }

  resetTemporaryFilters(): void {
    this.tempBrand = "";
    this.tempPrice = "";
    this.tempFuel = "";
    this.tempTransmission = "";
    this.tempType = "";
    this.tempWithDriver = false;
  }

  clearAll(): void {
    this.searchQuery.set("");
    this.filterBrand.set("");
    this.filterPrice.set("");
    this.filterFuel.set("");
    this.filterTransmission.set("");
    this.filterType.set("");
    this.withDriver.set(false);
    this.sortBy.set("default");
    this.showFavoritesOnly.set(false);
    this.resetTemporaryFilters();
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }

  private matchesRange(value: number, range: string): boolean {
    if (!range) return true;
    if (range.endsWith("+")) return value >= Number(range.slice(0, -1));
    const [min, max] = range.split("-").map(Number);
    return value >= min && value <= max;
  }

  private openDialog(dialog?: HTMLDialogElement): void {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  private closeDialog(dialog?: HTMLDialogElement): void {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }
}
