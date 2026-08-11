import { Component, inject, signal, computed, OnInit } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Car } from "../models/car.model";
import { VehicleCardComponent } from "../components/vehicle-card.component";

@Component({
  selector: "app-fleet",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent],
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
                  t().fleet.searchPlaceholder ||
                  'Marka, model veya İlan No ara...'
                "
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-800"
              />
              <svg
                class="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <button
              (click)="showFilterModal.set(true)"
              class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all relative"
              [attr.aria-label]="t().fleet.filterBtn || 'Filtrele'"
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
              [attr.aria-label]="t().fleet.sortBtn || 'Sırala'"
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
                <svg
                  class="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
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
                    (click)="tempFilterBrand.set('All')"
                    [class.bg-blue-500]="tempFilterBrand() === 'All'"
                    [class.text-white]="tempFilterBrand() === 'All'"
                    [class.bg-slate-50]="tempFilterBrand() !== 'All'"
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
                      { id: "All", label: "Tümü" },
                      { id: "0-1000", label: "0 - 1.000 TL" },
                      { id: "1000-2000", label: "1.000 - 2.000 TL" },
                      { id: "2000+", label: "2.000+ TL" },
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

              <!-- Fuel -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.fuel }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (
                    fuel of ["All", "Dizel", "Benzin", "Hibrit", "Elektrik"];
                    track fuel
                  ) {
                    <button
                      (click)="tempFilterFuel.set(fuel)"
                      [class.bg-blue-500]="tempFilterFuel() === fuel"
                      [class.text-white]="tempFilterFuel() === fuel"
                      [class.bg-slate-50]="tempFilterFuel() !== fuel"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{
                        fuel === "All"
                          ? "Tümü"
                          : uiService.translateDbValue(fuel, "fuel")
                      }}
                    </button>
                  }
                </div>
              </div>

              <!-- Transmission -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >{{ t().filters.transmission }}</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (trans of ["All", "Otomatik", "Manuel"]; track trans) {
                    <button
                      (click)="tempFilterTransmission.set(trans)"
                      [class.bg-blue-500]="tempFilterTransmission() === trans"
                      [class.text-white]="tempFilterTransmission() === trans"
                      [class.bg-slate-50]="tempFilterTransmission() !== trans"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{
                        trans === "All"
                          ? "Tümü"
                          : uiService.translateDbValue(trans, "transmission")
                      }}
                    </button>
                  }
                </div>
              </div>

              <!-- Type -->
              <div class="space-y-3">
                <label
                  class="text-sm font-bold text-slate-900 uppercase tracking-wider"
                  >Araç Tipi</label
                >
                <div class="grid grid-cols-2 gap-2">
                  @for (
                    type of [
                      "All",
                      "SUV",
                      "Sedan",
                      "Hatchback",
                      "Pickup",
                      "Luxury",
                      "Minibus",
                      "VIP",
                    ];
                    track type
                  ) {
                    <button
                      (click)="tempFilterType.set(type)"
                      [class.bg-blue-500]="tempFilterType() === type"
                      [class.text-white]="tempFilterType() === type"
                      [class.bg-slate-50]="tempFilterType() !== type"
                      class="py-2 px-4 rounded-xl text-sm font-medium transition-all border border-transparent"
                    >
                      {{
                        type === "All"
                          ? "Tümü"
                          : t().filters[type.toLowerCase()] || type
                      }}
                    </button>
                  }
                </div>
              </div>

              <!-- With Driver Toggle -->
              <div class="pt-4 border-t border-slate-100">
                <button
                  (click)="tempWithDriver.set(!tempWithDriver())"
                  class="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div class="text-left">
                      <span class="block text-sm font-bold text-slate-900"
                        >Şoförlü Kiralama</span
                      >
                      <span
                        class="block text-[10px] text-slate-500 uppercase font-bold tracking-wider"
                        >Özel Hizmet</span
                      >
                    </div>
                  </div>
                  <div
                    class="w-12 h-6 rounded-full transition-colors relative"
                    [class.bg-emerald-500]="tempWithDriver()"
                    [class.bg-slate-300]="!tempWithDriver()"
                  >
                    <div
                      class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                      [class.translate-x-6]="tempWithDriver()"
                    ></div>
                  </div>
                </button>
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
                <svg
                  class="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div class="p-4 space-y-2">
              @for (
                opt of [
                  { id: "default", label: t().sort.default },
                  { id: "priceAsc", label: t().sort.priceAsc },
                  { id: "priceDesc", label: t().sort.priceDesc },
                ];
                track opt.id
              ) {
                <button
                  (click)="applySort(opt.id)"
                  [class.bg-blue-50]="sortOption() === opt.id"
                  [class.text-blue-600]="sortOption() === opt.id"
                  class="w-full text-left p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                >
                  {{ opt.label }}
                  @if (sortOption() === opt.id) {
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <div class="max-w-7xl mx-auto md:px-4 sm:px-6 lg:px-8 mt-6 pb-20">
        <!-- Header Section -->
        <div class="mb-8 px-4 md:px-0">
          <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            @if (showFavoritesOnly()) {
              Favorilerim ({{ sortedCars().length }})
            } @else {
              Filomuz
              <span class="text-xl md:text-2xl text-slate-400 font-medium ml-2"
                >({{ sortedCars().length }} Araç)</span
              >
            }
          </h1>
          <p class="text-slate-500">
            @if (showFavoritesOnly()) {
              Beğendiğiniz ve daha sonra incelemek istediğiniz araçlar burada
              listelenir.
            } @else {
              Yüksekova'nın en geniş ve en yeni araç filosuyla hizmetinizdeyiz.
            }
          </p>
        </div>

        <!-- Driver Mode Indicator -->
        @if (withDriver()) {
          <div
            class="mb-6 mx-4 md:mx-0 bg-blue-50 border border-blue-200 p-4 rounded-xl text-center text-blue-900 font-bold flex items-center justify-center shadow-sm animate-fade-in"
          >
            <svg
              class="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {{ t().filters.driverActive }}
            <button
              (click)="withDriver.set(false)"
              class="ml-4 text-xs underline text-blue-700 hover:text-blue-900"
            >
              {{ t().buttons.remove }}
            </button>
          </div>
        }

        <!-- Car List -->
        @if (sortedCars().length > 0) {
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-card
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
                [withDriver]="withDriver()"
              >
              </app-vehicle-card>
            }
          </div>
        } @else {
          <div
            class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-6"
          >
            <div
              class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6"
            >
              <mat-icon class="text-4xl text-slate-300">
                @if (showFavoritesOnly()) {
                  favorite_border
                } @else {
                  sentiment_dissatisfied
                }
              </mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2">
              @if (showFavoritesOnly()) {
                Henüz favori aracınız yok
              } @else {
                Aradığınız kriterlere uygun araç bulunamadı
              }
            </h3>
            <p class="text-slate-500 max-w-xs mx-auto mb-8">
              @if (showFavoritesOnly()) {
                Beğendiğiniz araçları favorilere ekleyerek burada
                görebilirsiniz.
              } @else {
                Filtreleri temizleyerek tüm araçlarımızı görebilirsiniz.
              }
            </p>
            @if (showFavoritesOnly()) {
              <a
                routerLink="/fleet"
                class="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Araçları İncele
              </a>
            } @else {
              <button
                (click)="resetFilters()"
                class="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Filtreleri Temizle
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class FleetComponent implements OnInit {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  allCars = this.carService.getCars();
  allVehicles = this.carService.getAllVehicles();

  // Filters
  searchQuery = signal("");
  filterType = signal("All");
  filterBrand = signal("All");
  filterFuel = signal("All");
  filterTransmission = signal("All");
  filterPrice = signal("All");
  sortOption = signal("default"); // default, priceAsc, priceDesc

  // Modal States
  showFilterModal = signal(false);
  showSortModal = signal(false);

  // Temporary Filter States (for Apply button)
  tempFilterType = signal("All");
  tempFilterBrand = signal("All");
  tempFilterFuel = signal("All");
  tempFilterTransmission = signal("All");
  tempFilterPrice = signal("All");
  tempWithDriver = signal(false);

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterType() !== "All") count++;
    if (this.filterBrand() !== "All") count++;
    if (this.filterFuel() !== "All") count++;
    if (this.filterTransmission() !== "All") count++;
    if (this.filterPrice() !== "All") count++;
    if (this.withDriver()) count++;
    return count;
  });

  startDate = "";
  endDate = "";
  rentalDuration = "daily";
  withDriver = signal(false);
  showFavoritesOnly = signal(false);

  brands = computed(() => {
    const cars = this.allCars();
    const uniqueBrands = [...new Set(cars.map((c) => c.brand))].sort();
    return uniqueBrands;
  });

  t = this.uiService.translations;

  sortedCars = computed(() => {
    let cars = this.showFavoritesOnly() ? this.allVehicles() : this.allCars();

    // 0. Favorites Filter
    if (this.showFavoritesOnly()) {
      cars = cars.filter((c) => this.carService.isFavorite(c.id));
    }

    // 0.5 Availability Filter
    if (this.startDate && this.endDate) {
      const startReq = new Date(this.startDate);
      const endReq = new Date(this.endDate);

      cars = [...cars].map((c: any) => {
        let available = true;
        if (c.bookedDates && c.bookedDates.length > 0) {
          for (let b of c.bookedDates) {
            const bStart = new Date(b.start);
            const bEnd = new Date(b.end);
            // Check overlap: if startReq <= bEnd && endReq >= bStart -> intersection
            if (startReq <= bEnd && endReq >= bStart) {
              available = false;
              break;
            }
          }
        }
        return { ...c, isAvailable: available };
      });
    }

    // 1. Text Search (Brand, Model, or Ad ID)
    const query = this.searchQuery().toLowerCase();
    if (query) {
      cars = cars.filter(
        (c) =>
          (c.brand || "").toLowerCase().includes(query) ||
          (c.model || "").toLowerCase().includes(query) ||
          (c.id && c.id.toString().includes(query)),
      );
    }

    // 2. Type Filter
    if (this.filterType() !== "All") {
      cars = cars.filter((c) => c.type === this.filterType());
    }

    // 3. Brand Filter
    if (this.filterBrand() !== "All") {
      cars = cars.filter((c) => c.brand === this.filterBrand());
    }

    // 4. Fuel Filter
    if (this.filterFuel() !== "All") {
      cars = cars.filter((c) => c.fuel === this.filterFuel());
    }

    // 5. Transmission Filter
    if (this.filterTransmission() !== "All") {
      cars = cars.filter((c) => c.transmission === this.filterTransmission());
    }

    // 6. Price Filter
    if (this.filterPrice() !== "All") {
      const price = this.filterPrice();
      if (price === "0-1000") {
        cars = cars.filter((c) => c.price <= 1000);
      } else if (price === "1000-2000") {
        cars = cars.filter((c) => c.price > 1000 && c.price <= 2000);
      } else if (price === "2000+") {
        cars = cars.filter((c) => c.price > 2000);
      }
    }

    // 7. Sorting
    if (this.sortOption() === "priceAsc") {
      return [...cars].sort((a, b) => a.price - b.price);
    } else if (this.sortOption() === "priceDesc") {
      return [...cars].sort((a, b) => b.price - a.price);
    }
    return cars;
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["start"]) this.startDate = params["start"];
      if (params["end"]) this.endDate = params["end"];
      if (params["duration"]) this.rentalDuration = params["duration"];
      if (params["driver"] === "true") this.withDriver.set(true);
      if (params["favs"] === "true") this.showFavoritesOnly.set(true);
      if (params["search"]) this.searchQuery.set(params["search"]);
      if (params["filter"]) {
        this.filterType.set(params["filter"]);
        this.tempFilterType.set(params["filter"]);
      }
    });
  }

  location = inject(Location);

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  applyFilters() {
    this.filterType.set(this.tempFilterType());
    this.filterBrand.set(this.tempFilterBrand());
    this.filterFuel.set(this.tempFilterFuel());
    this.filterTransmission.set(this.tempFilterTransmission());
    this.filterPrice.set(this.tempFilterPrice());
    this.withDriver.set(this.tempWithDriver());
    this.showFilterModal.set(false);
  }

  applySort(option: string) {
    this.sortOption.set(option);
    this.showSortModal.set(false);
  }

  resetTempFilters() {
    this.tempFilterType.set("All");
    this.tempFilterBrand.set("All");
    this.tempFilterFuel.set("All");
    this.tempFilterTransmission.set("All");
    this.tempFilterPrice.set("All");
    this.tempWithDriver.set(false);
  }

  resetFilters() {
    this.searchQuery.set("");
    this.filterType.set("All");
    this.filterBrand.set("All");
    this.filterFuel.set("All");
    this.filterTransmission.set("All");
    this.filterPrice.set("All");
    this.sortOption.set("default");
    this.showFavoritesOnly.set(false);
    this.resetTempFilters();
  }

  toggleFav(event: Event, id: number) {
    event.stopPropagation();
    this.carService.toggleFavorite(id);
  }

  isFav(id: number) {
    return this.carService.isFavorite(id);
  }

  goToDetail(id: string | number, event?: Event) {
    if (event) event.stopPropagation();
    const vehicle = this.allVehicles().find((v) => v.id === id);
    const route = vehicle?.category === "SALE" ? "/sales" : "/fleet";
    this.router.navigate([route, id]);
  }

  shareCar(car: Car, event: Event) {
    event.stopPropagation();
    if (navigator.share) {
      navigator
        .share({
          title: `${car.brand} ${car.model}`,
          text: `Harika bir kiralık araç buldum: ${car.brand} ${car.model}`,
          url: window.location.origin + "/fleet/" + car.id,
        })
        .catch(console.error);
    } else {
      navigator.clipboard.writeText(
        window.location.origin + "/fleet/" + car.id,
      );
      alert("Bağlantı kopyalandı!");
    }
  }

  rentCar(car: Car, event?: Event) {
    if (event) event.stopPropagation();
    const request = {
      type: "RENTAL" as const,
      item: car,
      itemName: `${car.brand || ""} ${car.model || ""} ${this.withDriver() ? this.t().car.withDriverLabel : ""}`,
      image: car.image,
      basePrice: car.price, // Send daily price
      startDate: this.startDate,
      endDate: this.endDate,
      rentalDuration: this.rentalDuration,
      withDriver: this.withDriver(),
    };

    this.carService.setBookingRequest(request);
    this.router.navigate(["/contact"]);
  }
}
