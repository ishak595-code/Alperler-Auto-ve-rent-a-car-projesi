import { CommonModule, Location } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarService } from '../services/car.service';

@Component({
  selector: 'app-tour-results',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 pb-20 text-slate-300">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900 shadow-lg">
        <div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" class="min-h-12 min-w-12 rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Geri dön">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <label class="relative flex-1">
            <span class="sr-only">Tur ara</span>
            <mat-icon aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</mat-icon>
            <input [(ngModel)]="searchQuery" type="search" inputmode="search" autocomplete="off" placeholder="Cilo, rota veya tur ara..." class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40" />
          </label>
          <button #filterTrigger type="button" (click)="openFilter()" class="relative min-h-12 min-w-12 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-haspopup="dialog" [attr.aria-expanded]="filterOpen()" aria-controls="tour-filter-dialog" aria-label="Tur filtrelerini aç">
            <mat-icon>tune</mat-icon>
            @if (activeFilterCount() > 0) {
              <span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">{{ activeFilterCount() }}</span>
            }
          </button>
          <button #sortTrigger type="button" (click)="openSort()" class="min-h-12 min-w-12 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-haspopup="dialog" [attr.aria-expanded]="sortOpen()" aria-controls="tour-sort-dialog" aria-label="Tur sıralamasını aç">
            <mat-icon>sort</mat-icon>
          </button>
        </div>
      </header>

      <section class="mx-auto max-w-7xl px-4 py-8">
        <div class="mb-8 max-w-3xl">
          <p class="text-xs font-black uppercase tracking-[.18em] text-amber-300">Hakkari’nin seçili rotaları</p>
          <h1 class="mt-2 font-serif text-3xl font-black text-white md:text-5xl">Cilo ve Bölge Turlarını Keşfedin <span class="text-xl font-semibold text-slate-500 md:text-3xl">({{ filteredTours().length }} Tur)</span></h1>
          <p class="mt-4 text-base leading-relaxed text-slate-400">Cilo Dağları ve çevresindeki seçili rotaları süre, fiyat ve program detaylarıyla karşılaştırın. Size uygun deneyimi seçin, rota ayrıntılarını görün ve talebinizi doğrudan oluşturun.</p>
        </div>

        @if (filteredTours().length > 0) {
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            @for (tour of filteredTours(); track tour.id) {
              <a [routerLink]="['/tour', tour.id]" class="group overflow-hidden rounded-2xl border border-slate-800 bg-white text-slate-900 shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <div class="relative h-56 overflow-hidden bg-slate-800">
                  @if (tour.image) {
                    <img [src]="tour.image" [alt]="tour.title" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" referrerpolicy="no-referrer" loading="lazy" />
                  } @else {
                    <div class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 px-5 text-center text-slate-400" role="img" [attr.aria-label]="tour.title + ' için doğrulanmış görsel hazırlanıyor'">
                      <mat-icon class="!h-10 !w-10 !text-[40px] text-slate-600" aria-hidden="true">landscape</mat-icon>
                      <span class="text-xs font-black uppercase tracking-wider">Doğrulanmış görsel hazırlanıyor</span>
                    </div>
                  }
                  @if (tour.duration) { <span class="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black shadow">{{ tour.duration }}</span> }
                </div>
                <div class="p-4">
                  <h2 class="text-lg font-black">{{ tour.title }}</h2>
                  <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{{ tour.description }}</p>
                  <div class="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
                    <div><span class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Kişi başı</span><span class="text-xl font-black">{{ tour.price }}₺</span></div>
                    <span class="rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">Turu Keşfet</span>
                  </div>
                </div>
              </a>
            }
          </div>
        } @else {
          <div class="rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900 p-12 text-center">
            <mat-icon class="!h-14 !w-14 !text-6xl text-slate-600">explore_off</mat-icon>
            <h2 class="mt-4 text-xl font-black text-white">Bu seçimlerde uygun tur görünmüyor</h2>
            <p class="mt-2 text-slate-400">Filtreleri temizleyerek diğer Cilo ve bölge rotalarını yeniden görüntüleyin.</p>
            <button type="button" (click)="resetFilters()" class="mt-6 min-h-12 rounded-xl bg-blue-500 px-6 font-black text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Tüm Turları Göster</button>
          </div>
        }
      </section>

      <dialog #filterDialog id="tour-filter-dialog" (close)="onFilterClosed()" (cancel)="onFilterCancelled($event)" class="m-auto w-[min(92vw,32rem)] rounded-3xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/70">
        <form method="dialog" class="overflow-hidden rounded-3xl">
          <div class="flex items-center justify-between border-b border-slate-100 p-5">
            <div><p class="text-xs font-black uppercase tracking-wider text-blue-600">Size uygun rotayı bulun</p><h2 id="tour-filter-title" class="text-xl font-black">Turları Filtrele</h2></div>
            <button type="button" (click)="closeFilter()" class="min-h-12 min-w-12 rounded-xl hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Filtreyi kapat"><mat-icon>close</mat-icon></button>
          </div>
          <div class="max-h-[65vh] space-y-4 overflow-y-auto p-5">
            <fieldset>
              <legend class="mb-3 text-sm font-black">Kişi başı fiyat</legend>
              <div class="grid grid-cols-2 gap-2">
                @for (range of priceRanges; track range.id) {
                  <button type="button" (click)="tempFilterPrice.set(range.id)" [class.bg-slate-950]="tempFilterPrice() === range.id" [class.text-white]="tempFilterPrice() === range.id" class="min-h-12 rounded-xl border border-slate-200 px-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ range.label }}</button>
                }
              </div>
            </fieldset>
          </div>
          <div class="grid grid-cols-2 gap-3 border-t border-slate-100 p-5">
            <button type="button" (click)="resetTempFilters()" class="min-h-12 rounded-xl bg-slate-100 font-black text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sıfırla</button>
            <button type="button" (click)="applyFilters()" class="min-h-12 rounded-xl bg-slate-950 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Uygun Turları Göster</button>
          </div>
        </form>
      </dialog>

      <dialog #sortDialog id="tour-sort-dialog" aria-labelledby="tour-sort-title" (close)="onSortClosed()" (cancel)="onSortCancelled($event)" class="m-auto w-[min(92vw,26rem)] rounded-3xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/70">
        <div class="overflow-hidden rounded-3xl">
          <div class="flex items-center justify-between border-b border-slate-100 p-5"><h2 id="tour-sort-title" class="text-xl font-black">Turları Sırala</h2><button type="button" (click)="closeSort()" class="min-h-12 min-w-12 rounded-xl hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Sıralamayı kapat"><mat-icon>close</mat-icon></button></div>
          <div class="space-y-2 p-4">
            @for (option of sortOptions; track option.id) {
              <button type="button" (click)="applySort(option.id)" class="flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left font-bold hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" [class.bg-blue-50]="sortOption() === option.id" [class.text-blue-700]="sortOption() === option.id">{{ option.label }} @if (sortOption() === option.id) { <mat-icon>check</mat-icon> }</button>
            }
          </div>
        </div>
      </dialog>
    </main>
  `,
})
export class TourResultsComponent {
  private readonly carService = inject(CarService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('filterDialog') private filterDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('sortDialog') private sortDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('filterTrigger') private filterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('sortTrigger') private sortTrigger?: ElementRef<HTMLButtonElement>;

  readonly allTours = this.carService.getTours();
  readonly searchQuery = signal('');
  readonly filterPrice = signal('All');
  readonly tempFilterPrice = signal('All');
  readonly sortOption = signal('default');
  readonly filterOpen = signal(false);
  readonly sortOpen = signal(false);

  readonly priceRanges = [
    { id: 'All', label: 'Tümü' },
    { id: '0-5000', label: '0 - 5.000 TL' },
    { id: '5000-15000', label: '5.000 - 15.000 TL' },
    { id: '15000+', label: '15.000+ TL' },
  ];
  readonly sortOptions = [
    { id: 'default', label: 'Önerilen sıra' },
    { id: 'priceAsc', label: 'Fiyat: düşükten yükseğe' },
    { id: 'priceDesc', label: 'Fiyat: yüksekten düşüğe' },
  ];

  readonly activeFilterCount = computed(() => this.filterPrice() === 'All' ? 0 : 1);
  readonly filteredTours = computed(() => {
    let tours = [...this.allTours()];
    const query = this.searchQuery().trim().toLocaleLowerCase('tr-TR');
    if (query) {
      tours = tours.filter((tour) => `${tour.title || ''} ${tour.description || ''} ${tour.category || ''}`.toLocaleLowerCase('tr-TR').includes(query));
    }
    const price = this.filterPrice();
    if (price === '0-5000') tours = tours.filter((tour) => Number(tour.price) <= 5000);
    if (price === '5000-15000') tours = tours.filter((tour) => Number(tour.price) > 5000 && Number(tour.price) <= 15000);
    if (price === '15000+') tours = tours.filter((tour) => Number(tour.price) > 15000);
    if (this.sortOption() === 'priceAsc') tours.sort((a, b) => Number(a.price) - Number(b.price));
    if (this.sortOption() === 'priceDesc') tours.sort((a, b) => Number(b.price) - Number(a.price));
    return tours;
  });

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['search']) this.searchQuery.set(String(params['search']));
    });
  }

  goBack(): void { this.location.back(); }
  openFilter(): void { this.tempFilterPrice.set(this.filterPrice()); this.filterOpen.set(true); queueMicrotask(() => this.filterDialog?.nativeElement.showModal()); }
  closeFilter(): void { this.filterDialog?.nativeElement.close(); }
  onFilterCancelled(event: Event): void { event.preventDefault(); this.closeFilter(); }
  onFilterClosed(): void { this.filterOpen.set(false); queueMicrotask(() => this.filterTrigger?.nativeElement.focus()); }
  applyFilters(): void { this.filterPrice.set(this.tempFilterPrice()); this.closeFilter(); }
  resetTempFilters(): void { this.tempFilterPrice.set('All'); }
  resetFilters(): void { this.searchQuery.set(''); this.filterPrice.set('All'); this.tempFilterPrice.set('All'); this.sortOption.set('default'); }
  openSort(): void { this.sortOpen.set(true); queueMicrotask(() => this.sortDialog?.nativeElement.showModal()); }
  closeSort(): void { this.sortDialog?.nativeElement.close(); }
  onSortCancelled(event: Event): void { event.preventDefault(); this.closeSort(); }
  onSortClosed(): void { this.sortOpen.set(false); queueMicrotask(() => this.sortTrigger?.nativeElement.focus()); }
  applySort(value: string): void { this.sortOption.set(value); this.closeSort(); }
}
