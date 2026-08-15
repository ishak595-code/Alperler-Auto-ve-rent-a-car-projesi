import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { Vehicle } from "../models/car.model";
import { CarService } from "../services/car.service";

interface RankedVehicle {
  vehicle: Vehicle;
  score: number;
}

@Component({
  selector: "app-search",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-[100dvh] bg-slate-950 pb-28 text-white">
      <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div class="mx-auto max-w-4xl">
          <div class="mb-4 flex items-center gap-3">
            <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5" aria-label="Aramadan geri dön">
              <mat-icon aria-hidden="true">arrow_back</mat-icon>
            </button>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Hızlı Bul</p>
              <h1 class="font-serif text-2xl font-black">İlan Ara</h1>
            </div>
          </div>

          <label for="global-search" class="block text-xs font-black uppercase tracking-wider text-slate-400">İlan no, araç adı, marka veya model</label>
          <div class="mt-2 flex min-h-14 items-center gap-2 rounded-2xl border border-blue-400/35 bg-slate-900 px-3 shadow-2xl shadow-blue-950/20 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/30">
            <mat-icon class="shrink-0 text-blue-300" aria-hidden="true">search</mat-icon>
            <input
              id="global-search"
              #searchInput
              type="search"
              inputmode="search"
              autocomplete="off"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="Örn. 1004, Megane, Audi A3"
              aria-describedby="search-help search-status"
              class="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-slate-500"
            />
            @if (query().trim()) {
              <button type="button" (click)="query.set(''); searchInput.focus()" class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5" aria-label="Aramayı temizle">
                <mat-icon aria-hidden="true">close</mat-icon>
              </button>
            }
          </div>
          <p id="search-help" class="mt-2 text-xs leading-5 text-slate-500">Yazdıkça en güçlü eşleşmeler üstte sıralanır. Tam ilan numarası eşleşmesi her zaman ilk sıraya gelir.</p>

          <div class="mt-4 grid grid-cols-3 gap-2" aria-label="İlan türü filtresi">
            @for (option of categoryOptions; track option.id) {
              <button
                type="button"
                (click)="category.set(option.id)"
                [attr.aria-pressed]="category() === option.id"
                class="min-h-11 rounded-xl border px-2 text-xs font-black"
                [class.border-blue-400]="category() === option.id"
                [class.bg-blue-600]="category() === option.id"
                [class.border-white/10]="category() !== option.id"
                [class.bg-white/5]="category() !== option.id"
              >{{ option.label }}</button>
            }
          </div>
        </div>
      </header>

      <section class="mx-auto max-w-4xl px-4 py-5" aria-labelledby="search-results-title">
        <div class="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="search-results-title" class="text-lg font-black">Sonuçlar</h2>
            <p id="search-status" role="status" aria-live="polite" class="mt-1 text-xs text-slate-400">{{ resultStatus() }}</p>
          </div>
        </div>

        @if (results().length) {
          <div class="space-y-3">
            @for (item of results(); track item.id) {
              <a [routerLink]="routeFor(item)" class="group grid min-h-28 grid-cols-[112px_1fr] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:grid-cols-[160px_1fr]">
                <div class="relative bg-slate-800">
                  <img [src]="item.image || fallbackImage" [alt]="titleFor(item)" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  <span class="absolute left-2 top-2 rounded-full bg-slate-950/90 px-2 py-1 text-[9px] font-black uppercase text-white">{{ typeLabel(item) }}</span>
                </div>
                <div class="min-w-0 p-3 sm:p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="text-[10px] font-black uppercase tracking-wider text-blue-300">İlan {{ item.id }}</p>
                      <h3 class="mt-1 line-clamp-2 text-base font-black leading-tight text-white sm:text-lg">{{ titleFor(item) }}</h3>
                    </div>
                    <mat-icon class="shrink-0 text-slate-500 transition group-hover:translate-x-1" aria-hidden="true">chevron_right</mat-icon>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
                    @if (item.year) { <span>{{ item.year }}</span> }
                    @if (item.transmission) { <span>{{ item.transmission }}</span> }
                    @if (item.fuel) { <span>{{ item.fuel }}</span> }
                    @if (item.location) { <span>{{ item.location }}</span> }
                  </div>
                  @if (item.price) {
                    <strong class="mt-2 block text-sm font-black text-amber-300">{{ formatPrice(item) }}</strong>
                  }
                </div>
              </a>
            }
          </div>
        } @else if (query().trim().length >= 2) {
          <div class="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
            <mat-icon class="!h-12 !w-12 !text-[48px] text-slate-600" aria-hidden="true">search_off</mat-icon>
            <h3 class="mt-3 text-lg font-black">Eşleşen ilan bulunamadı</h3>
            <p class="mt-2 text-sm leading-6 text-slate-400">İlan numarasını veya marka ve model adını farklı yazarak tekrar deneyin.</p>
          </div>
        } @else {
          <div class="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <h3 class="font-black">Aramaya başlayın</h3>
            <p class="mt-2 text-sm leading-6 text-slate-400">En az iki karakter yazın. Örneğin bir ilan numarası, “Megane”, “Audi A3” veya “Cilo” yazabilirsiniz.</p>
          </div>
        }
      </section>
    </main>
  `,
})
export class SearchComponent {
  private readonly cars = inject(CarService);
  private readonly location = inject(Location);

  readonly query = signal("");
  readonly category = signal<"ALL" | "RENTAL" | "SALE">("ALL");
  readonly fallbackImage = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=900&auto=format&fit=crop";
  readonly categoryOptions = [
    { id: "ALL" as const, label: "Tümü" },
    { id: "RENTAL" as const, label: "Kiralık" },
    { id: "SALE" as const, label: "Satılık" },
  ];

  readonly inventory = this.cars.getAllVehicles();

  readonly results = computed(() => {
    const raw = this.query().trim();
    const q = this.normalize(raw);
    if (q.length < 2) return [] as Vehicle[];

    const ranked: RankedVehicle[] = this.inventory()
      .filter((vehicle) => this.category() === "ALL" || vehicle.category === this.category())
      .map((vehicle) => ({ vehicle, score: this.score(vehicle, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || Number(b.vehicle.year || 0) - Number(a.vehicle.year || 0));

    return ranked.slice(0, 60).map((entry) => entry.vehicle);
  });

  readonly resultStatus = computed(() => {
    const q = this.query().trim();
    if (q.length < 2) return "Aramak için en az iki karakter yazın.";
    return `${this.results().length} eşleşme bulundu.`;
  });

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
  }

  routeFor(item: Vehicle): any[] {
    if (item.category === "SALE") return ["/sales", item.id];
    if (item.category === "TOUR") return ["/tour", item.id];
    return ["/fleet", item.id];
  }

  titleFor(item: Vehicle): string {
    return item.title || [item.brand, item.model, item.series, item.year].filter(Boolean).join(" ") || `İlan ${item.id}`;
  }

  typeLabel(item: Vehicle): string {
    if (item.category === "SALE") return "Satılık";
    if (item.category === "TOUR") return "Tur";
    return "Kiralık";
  }

  formatPrice(item: Vehicle): string {
    const text = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(item.price || 0);
    return item.category === "RENTAL" ? `${text} / gün` : item.category === "TOUR" ? `${text} / kişi` : text;
  }

  private score(item: Vehicle, q: string): number {
    const id = this.normalize(String(item.id));
    const stock = this.normalize(String(item.cloudStockCode || ""));
    const title = this.normalize(this.titleFor(item));
    const brandModel = this.normalize([item.brand, item.model].filter(Boolean).join(" "));
    const all = this.normalize([item.id, item.cloudStockCode, item.title, item.brand, item.model, item.series, item.year, item.type, item.location].filter(Boolean).join(" "));

    if (id === q || stock === q) return 1000;
    if (title === q || brandModel === q) return 900;
    if (id.startsWith(q) || stock.startsWith(q)) return 800;
    if (title.startsWith(q) || brandModel.startsWith(q)) return 700;
    if (brandModel.includes(q)) return 600;
    if (title.includes(q)) return 550;
    if (all.includes(q)) return 400;
    const words = q.split(" ").filter(Boolean);
    if (words.length > 1 && words.every((word) => all.includes(word))) return 300;
    return 0;
  }

  private normalize(value: string): string {
    return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
  }
}
