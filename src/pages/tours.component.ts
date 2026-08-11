import { Component, inject, signal, computed } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { UiService } from "../services/ui.service";
import { CarService } from "../services/car.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-tours",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            
            <div class="relative flex-grow">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Tur arayın..."
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 text-sm text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-slate-800"
              />
              <mat-icon class="text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 text-xl">search</mat-icon>
            </div>

            <button
              (click)="showFilterModal.set(true)"
              aria-label="Filtrele"
              class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all relative"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
              @if (activeFilterCount() > 0) {
                <span class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">{{ activeFilterCount() }}</span>
              }
            </button>

            <button
              (click)="showSortModal.set(true)"
              aria-label="Sırala"
              class="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

       <!-- Filter Modal -->
       @if (showFilterModal()) {
        <div class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" (click)="showFilterModal.set(false)">
          <div class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-slate-900">Filtrele</h2>
              <button (click)="showFilterModal.set(false)" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <mat-icon class="text-slate-400">close</mat-icon>
              </button>
            </div>

            <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <!-- Price Range -->
              <div class="space-y-3">
                <label class="text-sm font-bold text-slate-900 uppercase tracking-wider">Fiyat Aralığı (Kişi Başı)</label>
                <div class="grid grid-cols-2 gap-2">
                  @for (range of [
                    { id: 'All', label: 'Tümü' },
                    { id: '0-5000', label: '0 - 5.000 TL' },
                    { id: '5000-15000', label: '5.000 - 15.000 TL' },
                    { id: '15000+', label: '15.000+ TL' }
                  ]; track range.id) {
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
            </div>

            <div class="p-6 border-t border-slate-100 flex gap-3">
              <button (click)="resetTempFilters()" class="flex-1 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                Sıfırla
              </button>
              <button (click)="applyFilters()" class="flex-[2] py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-blue-500 hover:text-slate-900 transition-all shadow-lg shadow-slate-200">
                Uygula
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Sort Modal -->
      @if (showSortModal()) {
        <div class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" (click)="showSortModal.set(false)">
          <div class="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-slate-900">Sırala</h2>
              <button (click)="showSortModal.set(false)" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <mat-icon class="text-slate-400">close</mat-icon>
              </button>
            </div>

            <div class="p-4 space-y-2">
              @for (opt of [
                { id: 'default', label: 'Varsayılan' },
                { id: 'priceAsc', label: 'Fiyat (Artan)' },
                { id: 'priceDesc', label: 'Fiyat (Azalan)' }
              ]; track opt.id) {
                <button
                  (click)="applySort(opt.id)"
                  [class.bg-blue-50]="sortOption() === opt.id"
                  [class.text-blue-600]="sortOption() === opt.id"
                  class="w-full text-left p-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all flex justify-between items-center"
                >
                  {{ opt.label }}
                  @if (sortOption() === opt.id) {
                    <mat-icon class="text-blue-600 w-5 h-5 text-[20px]">check</mat-icon>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="mb-10 max-w-3xl">
          <h1 class="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Turlarımız 
            <span class="text-xl md:text-3xl text-slate-500 font-medium ml-2">({{ filteredTours().length }} Tur)</span>
          </h1>
          <p class="text-slate-400 leading-relaxed text-lg">
             Doğanın vahşi ve bakir güzellikleriyle buluşun. Cilo Dağları'ndan Berçelan Yaylası'na, gizli kalmış vadilerdeki glamping çadırlarında ve şelale kenarlarında unutulmaz deneyimler. Deneyimli VIP rehberlerimizle Mezopotamya'nın kalbine güvenli bir yolculuk sizi bekliyor.
             @if (searchQuery() || filterPrice() !== 'All') {
              <span class="block mt-2 text-blue-400 text-sm font-semibold">Taramaya uygun <strong>{{ filteredTours().length }}</strong> tur listeleniyor.</span>
             }
          </p>
        </div>

        @if (filteredTours().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (tour of filteredTours(); track tour.id) {
              <a
                [routerLink]="['/tour', tour.id]"
                class="bg-white rounded-2xl flex flex-col p-3 hover:bg-slate-50 transition-all group shadow-sm hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer border border-transparent hover:border-blue-100"
              >
                <div class="relative h-[220px] rounded-xl overflow-hidden mb-4">
                  <img
                    [src]="tour.image || 'https://picsum.photos/seed/tour' + tour.id + '/800/600'"
                    [alt]="tour.title"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerpolicy="no-referrer"
                  />
                  
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>

                  <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-900 font-bold text-[11px] px-3 py-1.5 rounded-full shadow-sm">
                    <mat-icon class="inline-block text-blue-500 !text-[12px] !w-[12px] !h-[12px] mr-1">schedule</mat-icon>
                    {{ tour.duration }}
                  </div>

                  <!-- Favorite Button -->
                  <button
                    (click)="toggleFav($event, tour.id)"
                    class="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center transition-all hover:bg-white text-slate-700 hover:text-red-500 z-10 hover:scale-110 active:scale-95"
                  >
                    <mat-icon class="!text-[22px] !w-[22px] !h-[22px]" [class.text-red-500]="isFav(tour.id)">{{
                      isFav(tour.id) ? "favorite" : "favorite_border"
                    }}</mat-icon>
                  </button>
                  
                  <div class="absolute bottom-3 left-3 right-3">
                    <h4 class="font-bold text-white text-lg leading-tight mb-1 group-hover:text-blue-300 transition-colors line-clamp-1 drop-shadow-md">{{ tour.title }}</h4>
                  </div>
                </div>
                <div class="flex-1 flex flex-col px-2">
                  <p class="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{{ tour.description }}</p>
                  <div class="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                    <div class="flex flex-col">
                      <span class="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Kişi Başı</span>
                      <span class="font-black text-slate-900 text-lg">{{ tour.price }}₺</span>
                    </div>
                    <span class="text-sm text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">İncele</span>
                  </div>
                </div>
              </a>
            }
          </div>
        } @else {
          <div class="text-center py-20 bg-slate-900 rounded-3xl border-2 border-dashed border-slate-800">
            <mat-icon class="text-6xl text-slate-700 mb-4">explore_off</mat-icon>
            <h3 class="text-xl font-bold text-slate-300 mb-2">Tur Bulunamadı</h3>
            <p class="text-slate-500 mb-6">Arama kriterlerinize uygun tur bulunamadı.</p>
            <button (click)="resetFilters()" class="bg-blue-500 text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-blue-400 transition-all">
              Filtreleri Temizle
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ToursComponent {
  uiService = inject(UiService);
  carService = inject(CarService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  t = this.uiService.translations;

  allTours = this.carService.getTours();
  
  searchQuery = signal("");
  filterPrice = signal("All");
  sortOption = signal("default");

  tempFilterPrice = signal("All");

  showFilterModal = signal(false);
  showSortModal = signal(false);

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params["search"]) this.searchQuery.set(params["search"]);
    });
  }

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterPrice() !== "All") count++;
    return count;
  });

  filteredTours = computed(() => {
    let tours = [...this.allTours()];

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      tours = tours.filter(
        (t) =>
          (t.title || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (this.filterPrice() !== "All") {
      const price = this.filterPrice();
      if (price === "0-5000") {
        tours = tours.filter((t) => t.price <= 5000);
      } else if (price === "5000-15000") {
        tours = tours.filter((t) => t.price > 5000 && t.price <= 15000);
      } else if (price === "15000+") {
        tours = tours.filter((t) => t.price > 15000);
      }
    }

    switch (this.sortOption()) {
      case "priceAsc":
        tours.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        tours.sort((a, b) => b.price - a.price);
        break;
    }

    return tours;
  });

  location = inject(Location);
  
  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  toggleFav(event: Event, id: number) {
    event.stopPropagation();
    this.carService.toggleFavorite("tour-" + id);
  }

  isFav(id: number) {
    return this.carService.isFavorite("tour-" + id);
  }

  applyFilters() {
    this.filterPrice.set(this.tempFilterPrice());
    this.showFilterModal.set(false);
  }

  applySort(option: string) {
    this.sortOption.set(option);
    this.showSortModal.set(false);
  }

  resetTempFilters() {
    this.tempFilterPrice.set("All");
  }

  resetFilters() {
    this.searchQuery.set("");
    this.filterPrice.set("All");
    this.sortOption.set("default");
    this.resetTempFilters();
  }
}

