import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
  OnInit,
} from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CarService } from "../services/car.service";
import { Vehicle } from "../models/car.model";
import { Router, RouterModule, ActivatedRoute } from "@angular/router";
import { UiService } from "../services/ui.service";
import { MatIconModule } from "@angular/material/icon";
import { LightboxComponent } from "../components/lightbox.component";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";

@Component({
  selector: "app-sales",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    LightboxComponent,
    VehicleListItemComponent,
  ],
  template: `
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <!-- Top Row: Back + Search + Filter/Sort -->
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="relative flex-grow">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                [placeholder]="
                  t().sales.searchPlaceholder ||
                  'Marka, model veya İlan No ara...'
                "
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-800"
              />
              <mat-icon
                class="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 text-xl"
                >search</mat-icon
              >
            </div>

            <button
              (click)="showFilterModal.set(true)"
              class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all relative"
              [attr.aria-label]="t().sales.filterBtn || 'Filtrele'"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              @if (activeFilterCount() > 0) {
                <span
                  class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900"
                  >{{ activeFilterCount() }}</span
                >
              }
            </button>

            <button
              (click)="showSortModal.set(true)"
              class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
              [attr.aria-label]="t().sales.sortBtn || 'Sırala'"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Modal -->
      @if (showFilterModal()) {
        <div
          class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          (click)="showFilterModal.set(false)"
        >
          <div
            class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
            (click)="$event.stopPropagation()"
          >
            <div
              class="p-6 border-b border-slate-100 flex justify-between items-center"
            >
              <h2 class="text-xl font-bold text-slate-900">Filtrele</h2>
              <button
                (click)="showFilterModal.set(false)"
                class="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <mat-icon class="text-slate-400">close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <!-- Brand -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.brand }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  <button
                    (click)="tempFilterBrand.set('')"
                    [class.bg-blue-500]="tempFilterBrand() === ''"
                    [class.text-white]="tempFilterBrand() === ''"
                    [class.bg-slate-50]="tempFilterBrand() !== ''"
                    class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                  >
                    Tümü
                  </button>
                  @for (brand of brands(); track brand) {
                    <button
                      (click)="tempFilterBrand.set(brand)"
                      [class.bg-blue-500]="tempFilterBrand() === brand"
                      [class.text-white]="tempFilterBrand() === brand"
                      [class.bg-slate-50]="tempFilterBrand() !== brand"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{ brand }}
                    </button>
                  }
                </div>
              </div>

              <!-- Price Range -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.priceRange }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (
                    range of [
                      { id: "", label: "Tümü" },
                      { id: "0-500000", label: "0 - 500.000 TL" },
                      { id: "500000-1000000", label: "500.000 - 1.000.000 TL" },
                      {
                        id: "1000000-2000000",
                        label: "1.000.000 - 2.000.000 TL",
                      },
                      { id: "2000000+", label: "2.000.000+ TL" },
                    ];
                    track range.id
                  ) {
                    <button
                      (click)="tempFilterPrice.set(range.id)"
                      [class.bg-blue-500]="tempFilterPrice() === range.id"
                      [class.text-white]="tempFilterPrice() === range.id"
                      [class.bg-slate-50]="tempFilterPrice() !== range.id"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{ range.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Year -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.year }}</label
                >
                <div class="grid grid-cols-3 gap-2">
                  <button
                    (click)="tempFilterYear.set('')"
                    [class.bg-blue-500]="tempFilterYear() === ''"
                    [class.text-white]="tempFilterYear() === ''"
                    [class.bg-slate-50]="tempFilterYear() !== ''"
                    class="py-2 px-2 rounded-xl text-xs font-medium transition-all border border-transparent"
                  >
                    Tümü
                  </button>
                  @for (year of years(); track year) {
                    <button
                      (click)="tempFilterYear.set(year.toString())"
                      [class.bg-blue-500]="tempFilterYear() === year.toString()"
                      [class.text-white]="tempFilterYear() === year.toString()"
                      [class.bg-slate-50]="tempFilterYear() !== year.toString()"
                      class="py-2 px-2 rounded-xl text-xs font-medium transition-all border border-transparent"
                    >
                      {{ year }}
                    </button>
                  }
                </div>
              </div>

              <!-- KM Range -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.kmRange }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (
                    km of [
                      { id: "", label: "Tümü" },
                      { id: "0-50000", label: "0 - 50.000 km" },
                      { id: "50000-100000", label: "50.000 - 100.000 km" },
                      { id: "100000-150000", label: "100.000 - 150.000 km" },
                      { id: "150000+", label: "150.000+ km" },
                    ];
                    track km.id
                  ) {
                    <button
                      (click)="tempFilterKm.set(km.id)"
                      [class.bg-blue-500]="tempFilterKm() === km.id"
                      [class.text-white]="tempFilterKm() === km.id"
                      [class.bg-slate-50]="tempFilterKm() !== km.id"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{ km.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Color -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.color }}</label
                >
                <div class="grid grid-cols-3 gap-2">
                  <button
                    (click)="tempFilterColor.set('')"
                    [class.bg-blue-500]="tempFilterColor() === ''"
                    [class.text-white]="tempFilterColor() === ''"
                    [class.bg-slate-50]="tempFilterColor() !== ''"
                    class="py-2 px-2 rounded-xl text-xs font-medium transition-all border border-transparent"
                  >
                    Tümü
                  </button>
                  @for (color of colors(); track color) {
                    <button
                      (click)="tempFilterColor.set(color)"
                      [class.bg-blue-500]="tempFilterColor() === color"
                      [class.text-white]="tempFilterColor() === color"
                      [class.bg-slate-50]="tempFilterColor() !== color"
                      class="py-2 px-2 rounded-xl text-xs font-medium transition-all border border-transparent"
                    >
                      {{ color }}
                    </button>
                  }
                </div>
              </div>

              <!-- Damage Status -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.damage }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (
                    dmg of [
                      { id: "", label: "Tümü" },
                      { id: "clean", label: t().sales.clean },
                      { id: "damaged", label: t().sales.damaged },
                    ];
                    track dmg.id
                  ) {
                    <button
                      (click)="tempFilterDamage.set(dmg.id)"
                      [class.bg-blue-500]="tempFilterDamage() === dmg.id"
                      [class.text-white]="tempFilterDamage() === dmg.id"
                      [class.bg-slate-50]="tempFilterDamage() !== dmg.id"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{ dmg.label }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <div class="p-6 border-t border-slate-100 flex gap-3">
              <button
                (click)="resetTempFilters()"
                class="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Sıfırla
              </button>
              <button
                (click)="applyFilters()"
                class="flex-[2] py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-blue-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Sort Modal -->
      @if (showSortModal()) {
        <div
          class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          (click)="showSortModal.set(false)"
        >
          <div
            class="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
            (click)="$event.stopPropagation()"
          >
            <div
              class="p-6 border-b border-slate-100 flex justify-between items-center"
            >
              <h2 class="text-xl font-bold text-slate-900">Sırala</h2>
              <button
                (click)="showSortModal.set(false)"
                class="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <mat-icon class="text-slate-400">close</mat-icon>
              </button>
            </div>

            <div class="p-4 space-y-2">
              @for (
                opt of [
                  { id: "default", label: t().sales.sortBtn },
                  { id: "priceAsc", label: t().sales.sortPriceAsc },
                  { id: "priceDesc", label: t().sales.sortPriceDesc },
                  { id: "yearDesc", label: t().sales.sortYearDesc },
                  { id: "yearAsc", label: t().sales.sortYearAsc },
                ];
                track opt.id
              ) {
                <button
                  (click)="applySort(opt.id)"
                  [class.bg-blue-50]="sortBy() === opt.id"
                  [class.text-blue-600]="sortBy() === opt.id"
                  class="w-full text-left p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                >
                  {{ opt.label }}
                  @if (sortBy() === opt.id) {
                    <mat-icon class="text-blue-600">check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Car List -->
      <div class="max-w-7xl mx-auto px-4 md:px-0 py-8 md:py-8">
        <div class="mb-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
            @if (showFavoritesOnly()) {
              Favorilerim ({{ filteredCars().length }})
            } @else {
              Satılık Araçlar
              <span class="text-xl md:text-2xl text-slate-400 font-medium ml-2"
                >({{ filteredCars().length }} İlan)</span
              >
            }
          </h1>
          <p class="text-slate-500">
            @if (
              searchQuery() ||
              filterBrand() ||
              filterYear() ||
              filterKm() ||
              filterCondition() ||
              filterDamage() ||
              filterColor() ||
              filterPrice()
            ) {
              Arama kriterlerinize uygun
              <strong>{{ filteredCars().length }}</strong> sonuç listeleniyor.
            } @else {
              Tüm ilanları inceliyorsunuz.
            }
          </p>
        </div>

        @if (filteredCars().length > 0) {
          <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>
            }
          </div>
        } @else {
          <div
            class="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200"
          >
            <mat-icon class="text-6xl text-slate-300 mb-4">no_sim</mat-icon>
            <h3 class="text-xl font-bold text-slate-900 mb-2">
              Sonuç Bulunamadı
            </h3>
            <p class="text-slate-500 mb-6">
              Arama kriterlerinize uygun araç bulunamadı.
            </p>
            <button
              (click)="clearFilters()"
              class="bg-blue-500 text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all"
            >
              Filtreleri Temizle
            </button>
          </div>
        }
      </div>

      @if (isLightboxOpen()) {
        <app-lightbox
          [items]="lightboxItems()"
          [initialIndex]="lightboxIndex()"
          (close)="closeLightbox()"
        >
        </app-lightbox>
      }
    </div>
  `,
})
export class SalesComponent implements OnInit {
  carService = inject(CarService);
  router = inject(Router);
  uiService = inject(UiService);
  elementRef = inject(ElementRef);
  route = inject(ActivatedRoute);

  t = this.uiService.translations;
  saleCars = this.carService.getSaleCars();

  // Lightbox Signals
  isLightboxOpen = signal(false);
  lightboxItems = signal<{ url: string; type: "image" | "video" }[]>([]);
  lightboxIndex = signal(0);

  // Expansion Signals
  expandedDescription = signal<Record<string | number, boolean>>({});
  expandedFeatures = signal<Record<string | number, boolean>>({});
  expandedSpecs = signal<Record<string | number, boolean>>({});

  toggleDescription(id: string | number) {
    this.expandedDescription.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  toggleFeatures(id: string | number) {
    this.expandedFeatures.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  toggleSpecs(id: string | number) {
    this.expandedSpecs.update((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  ngOnInit() {
    // Auto-expand all sections for all cars by default as requested
    const initialExpansion: Record<string | number, boolean> = {};
    this.saleCars().forEach((car) => {
      initialExpansion[car.id] = true;
    });
    this.expandedDescription.set({ ...initialExpansion });
    this.expandedFeatures.set({ ...initialExpansion });
    this.expandedSpecs.set({ ...initialExpansion });

    this.route.queryParams.subscribe((params) => {
      if (params["favs"] === "true") {
        this.showFavoritesOnly.set(true);
      }
      if (params["search"]) {
        this.searchQuery.set(params["search"]);
      }
    });
  }

  isFilterOpen = signal<boolean>(false);
  isSortOpen = signal<boolean>(false);

  // Modal States
  showFilterModal = signal(false);
  showSortModal = signal(false);

  // Temporary Filter States (for Apply button)
  tempFilterBrand = signal<string>("");
  tempFilterYear = signal<string>("");
  tempFilterKm = signal<string>("");
  tempFilterCondition = signal<string>("");
  tempFilterDamage = signal<string>("");
  tempFilterColor = signal<string>("");
  tempFilterPrice = signal<string>("");

  filterBrand = signal<string>("");
  filterYear = signal<string>("");
  filterKm = signal<string>("");
  filterCondition = signal<string>("");
  filterDamage = signal<string>("");
  filterColor = signal<string>("");
  filterPrice = signal<string>("");
  showFavoritesOnly = signal<boolean>(false);

  sortBy = signal<string>("default");
  searchQuery = signal<string>("");

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isFilterOpen.set(false);
      this.isSortOpen.set(false);
    }
  }

  toggleFilter() {
    this.isFilterOpen.update((v) => !v);
    if (this.isFilterOpen()) this.isSortOpen.set(false);
  }

  toggleSort() {
    this.isSortOpen.update((v) => !v);
    if (this.isSortOpen()) this.isFilterOpen.set(false);
  }

  setSort(val: string) {
    this.sortBy.set(val);
    this.isSortOpen.set(false);
  }

  applyFilters() {
    this.filterBrand.set(this.tempFilterBrand());
    this.filterYear.set(this.tempFilterYear());
    this.filterKm.set(this.tempFilterKm());
    this.filterCondition.set(this.tempFilterCondition());
    this.filterDamage.set(this.tempFilterDamage());
    this.filterColor.set(this.tempFilterColor());
    this.filterPrice.set(this.tempFilterPrice());
    this.showFilterModal.set(false);
  }

  applySort(option: string) {
    this.sortBy.set(option);
    this.showSortModal.set(false);
  }

  resetTempFilters() {
    this.tempFilterBrand.set("");
    this.tempFilterYear.set("");
    this.tempFilterKm.set("");
    this.tempFilterCondition.set("");
    this.tempFilterDamage.set("");
    this.tempFilterColor.set("");
    this.tempFilterPrice.set("");
  }

  clearFilters() {
    this.filterBrand.set("");
    this.filterYear.set("");
    this.filterKm.set("");
    this.filterCondition.set("");
    this.filterDamage.set("");
    this.filterColor.set("");
    this.filterPrice.set("");
    this.searchQuery.set("");
    this.sortBy.set("default");
    this.showFavoritesOnly.set(false);
    this.resetTempFilters();
  }

  location = inject(Location);

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterBrand()) count++;
    if (this.filterYear()) count++;
    if (this.filterKm()) count++;
    if (this.filterCondition()) count++;
    if (this.filterDamage()) count++;
    if (this.filterColor()) count++;
    if (this.filterPrice()) count++;
    return count;
  });

  brands = computed(() => {
    const cars = this.saleCars();
    return [...new Set(cars.map((c) => c.brand).filter((b): b is string => !!b))].sort();
  });

  years = computed(() => {
    const cars = this.saleCars();
    return [...new Set(cars.map((c) => c.year).filter((y): y is number => y !== undefined))].sort((a, b) => b - a);
  });

  colors = computed(() => {
    const cars = this.saleCars();
    return [...new Set(cars.map((c) => c.color).filter((c): c is string => !!c))].sort();
  });

  filteredCars = computed(() => {
    let cars = [...this.saleCars()];

    if (this.showFavoritesOnly()) {
      cars = cars.filter((c) => this.carService.isFavorite(c.id));
    }

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      cars = cars.filter(
        (c) =>
          (c.brand || "").toLowerCase().includes(q) ||
          (c.model || "").toLowerCase().includes(q) ||
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.id && c.id.toString().includes(q)),
      );
    }

    if (this.filterBrand()) {
      cars = cars.filter((c) => c.brand === this.filterBrand());
    }

    if (this.filterYear()) {
      cars = cars.filter(
        (c) => (c.year?.toString() || "") === this.filterYear(),
      );
    }

    if (this.filterColor()) {
      cars = cars.filter((c) => c.color === this.filterColor());
    }

    if (this.filterCondition() === "0") {
      cars = cars.filter((c) => (c.km || 0) === 0);
    } else if (this.filterCondition() === "2") {
      cars = cars.filter((c) => (c.km || 0) > 0);
    }

    if (this.filterDamage() === "clean") {
      cars = cars.filter(
        (c) => c.isDamageFree && c.isPaintless && c.isReplaceFree,
      );
    } else if (this.filterDamage() === "damaged") {
      cars = cars.filter(
        (c) => !c.isDamageFree || !c.isPaintless || !c.isReplaceFree,
      );
    }

    if (this.filterKm()) {
      const km = this.filterKm();
      if (km === "0-50000") {
        cars = cars.filter((c) => (c.km || 0) <= 50000);
      } else if (km === "50000-100000") {
        cars = cars.filter((c) => (c.km || 0) > 50000 && (c.km || 0) <= 100000);
      } else if (km === "100000-150000") {
        cars = cars.filter((c) => (c.km || 0) > 100000 && (c.km || 0) <= 150000);
      } else if (km === "150000+") {
        cars = cars.filter((c) => (c.km || 0) > 150000);
      }
    }

    if (this.filterPrice()) {
      const price = this.filterPrice();
      if (price === "0-500000") {
        cars = cars.filter((c) => c.price <= 500000);
      } else if (price === "500000-1000000") {
        cars = cars.filter((c) => c.price > 500000 && c.price <= 1000000);
      } else if (price === "1000000-2000000") {
        cars = cars.filter((c) => c.price > 1000000 && c.price <= 2000000);
      } else if (price === "2000000+") {
        cars = cars.filter((c) => c.price > 2000000);
      }
    }

    switch (this.sortBy()) {
      case "priceAsc":
        cars.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        cars.sort((a, b) => b.price - a.price);
        break;
      case "yearDesc":
        cars.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case "yearAsc":
        cars.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
    }

    return cars;
  });

  toggleFav(event: Event, id: number) {
    event.stopPropagation();
    this.carService.toggleFavorite(id);
  }

  isFav(id: number) {
    return this.carService.isFavorite(id);
  }

  openLightbox(images: string[], index: number) {
    this.lightboxItems.set(images.map((url) => ({ type: "image", url })));
    this.lightboxIndex.set(index);
    this.isLightboxOpen.set(true);
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
  }

  shareCar(car: Vehicle) {
    const url = `${window.location.origin}/sales/${car.id}`;
    if (navigator.share) {
      navigator
        .share({
          title: `${car.brand} ${car.model} - Alperler Auto`,
          text: car.description,
          url: url,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        console.log("İlan linki kopyalandı");
      });
    }
  }

  openWhatsApp(car: Vehicle) {
    const phone = "905379594851";
    const url = `${window.location.origin}/sales/${car.id}`;
    const text = this.t()
      .car.whatsappMsg.replace("{brand}", car.brand || "")
      .replace("{model}", car.model || "")
      .replace("{year}", car.year?.toString() || "")
      .replace("{url}", url);
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  }

  inquireCar(car: Vehicle, type: "INFO" | "MEET") {
    this.carService.setBookingRequest({
      type: "SALE_INQUIRY",
      item: car,
      itemName: `${car.brand || ""} ${car.model || ""} (${car.year || ""}) - ${type === "MEET" ? "Randevu" : "Bilgi"}`,
      image: car.image,
      basePrice: car.price,
    });
    this.router.navigate(["/contact"]);
  }
}
