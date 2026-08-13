#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: expected source text not found`);
  return source.replace(from, to);
}

const listComponent = `import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

@Component({
  selector: "app-vehicle-list-item",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TurkishCurrencyPipe],
  template: \`
    <article
      class="group relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
    >
      <a
        [routerLink]="detailRoute"
        [attr.aria-label]="detailAriaLabel"
        class="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span class="sr-only">{{ detailAriaLabel }}</span>
      </a>

      <div
        class="grid min-h-[148px] grid-cols-[122px_minmax(0,1fr)] sm:min-h-[176px] sm:grid-cols-[185px_minmax(0,1fr)] md:min-h-[196px] md:grid-cols-[240px_minmax(0,1fr)]"
      >
        <div class="relative overflow-hidden bg-slate-100 pointer-events-none">
          <img
            [src]="car.images?.[0] || car.image"
            (error)="handleImageError($event)"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
          />
          @if (car.badge) {
            <span
              class="absolute left-2 top-2 rounded-md bg-slate-950/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow"
              >{{ car.badge }}</span
            >
          }
        </div>

        <div class="relative flex min-w-0 flex-col p-3 sm:p-4 md:p-5 pointer-events-none">
          <div class="flex min-w-0 items-start gap-2">
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.16em] sm:text-xs"
                  [class.text-blue-700]="variant === 'rental'"
                  [class.text-emerald-700]="variant === 'sale'"
                >
                  {{ variant === 'rental' ? 'Kiralık' : 'Satılık' }}
                </span>
                <span class="text-[10px] font-semibold text-slate-400 sm:text-xs">
                  {{ variant === 'rental' ? 'Araç No' : 'İlan No' }}: {{ car.id }}
                </span>
              </div>

              <h3
                class="line-clamp-2 break-words font-serif text-base font-bold leading-snug text-slate-950 sm:text-xl md:text-2xl"
              >
                {{ displayTitle }}
              </h3>
            </div>

            <button
              type="button"
              (click)="toggleFavorite($event)"
              [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
              [attr.aria-pressed]="isFavorite()"
              class="pointer-events-auto relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <mat-icon [class.text-red-500]="isFavorite()" aria-hidden="true">{{
                isFavorite() ? 'favorite' : 'favorite_border'
              }}</mat-icon>
            </button>
          </div>

          <div class="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600 sm:text-xs">
            @if (car.year) {
              <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.year }}</span>
            }
            @if (car.transmission) {
              <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.transmission }}</span>
            }
            @if (car.fuel) {
              <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.fuel }}</span>
            }
            @if (variant === 'rental' && car.seats) {
              <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.seats }} Kişilik</span>
            }
            @if (variant === 'sale' && car.km != null) {
              <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.km | number }} km</span>
            }
          </div>

          @if (car.location) {
            <div class="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-slate-500 sm:text-xs">
              <mat-icon aria-hidden="true" class="!h-4 !w-4 !text-[16px]">location_on</mat-icon>
              <span class="truncate">{{ car.location }}</span>
            </div>
          }

          <div class="mt-auto pt-3">
            <div class="flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
              <div class="min-w-0">
                <div class="text-lg font-black leading-none text-slate-950 sm:text-2xl md:text-3xl">
                  {{ car.price | turkishCurrency }}
                  @if (variant === 'rental') {
                    <span class="text-[11px] font-semibold text-slate-500 sm:text-xs">/ gün</span>
                  }
                </div>
                <div
                  class="mt-1.5 text-[10px] font-bold uppercase tracking-wide"
                  [class.text-emerald-700]="car.isAvailable !== false"
                  [class.text-red-700]="car.isAvailable === false"
                >
                  {{ car.isAvailable === false ? (variant === 'rental' ? 'Müsait değil' : 'Satıldı') : (variant === 'rental' ? 'Müsait' : 'İlan aktif') }}
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-1 text-xs font-bold text-blue-700 sm:text-sm">
                <span class="hidden xs:inline">Detay</span>
                <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px] transition-transform group-hover:translate-x-0.5">chevron_right</mat-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  \`,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get detailRoute(): (string | number)[] {
    return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id];
  }

  get displayTitle(): string {
    const fallback = [this.car.year, this.car.brand, this.car.model].filter(Boolean).join(" ");
    return this.car.title?.trim() || fallback || "Araç ilanı";
  }

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    return `${this.displayTitle}, ${type}, ${this.variant === "rental" ? "araç" : "ilan"} numarası ${this.car.id}. Detayları aç`;
  }

  isFavorite(): boolean {
    return this.carService.isFavorite(this.car.id);
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.carService.toggleFavorite(this.car.id);
  }

  handleImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
`;

await writeFile('src/components/vehicle-list-item.component.ts', listComponent, 'utf8');

// Rental inventory page: one professional linked row per vehicle at every viewport size.
{
  const path = 'src/pages/fleet.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace(
    'imports: [CommonModule, FormsModule, MatIconModule, VehicleCardComponent, RouterLink],',
    'imports: [CommonModule, FormsModule, MatIconModule, VehicleListItemComponent, RouterLink],',
  );
  s = s.replace(
    'class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"',
    'class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg"',
  );

  const oldList = `          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-card
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
                [withDriver]="withDriver()"
              >
              </app-vehicle-card>
            }
          </div>`;
  const newList = `          <div class="mx-auto flex max-w-5xl flex-col gap-3 px-3 sm:gap-4 sm:px-4 md:px-0">
            @for (car of sortedCars(); track car.id) {
              <app-vehicle-list-item
                [car]="car"
                [variant]="car.category === 'SALE' ? 'sale' : 'rental'"
              ></app-vehicle-list-item>
            }
          </div>`;
  s = replaceOnce(s, oldList, newList, 'fleet linked inventory list');
  s = s.replace('              Filomuz\n', '              Kiralık Araçlar\n');
  await writeFile(path, s, 'utf8');
}

// Sales inventory page: same linked-row information architecture, with sale-specific metadata.
{
  const path = 'src/pages/sales.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replace(
    'import { VehicleCardComponent } from "../components/vehicle-card.component";',
    'import { VehicleListItemComponent } from "../components/vehicle-list-item.component";',
  );
  s = s.replace('    VehicleCardComponent,', '    VehicleListItemComponent,');
  s = s.replace(
    'class="text-3xl md:text-4xl font-bold text-slate-900 mb-2"',
    'class="text-3xl md:text-4xl font-bold text-white mb-2"',
  );

  const oldList = `          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-card [car]="car" variant="sale"></app-vehicle-card>
            }
          </div>`;
  const newList = `          <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">
            @for (car of filteredCars(); track car.id) {
              <app-vehicle-list-item [car]="car" variant="sale"></app-vehicle-list-item>
            }
          </div>`;
  s = replaceOnce(s, oldList, newList, 'sales linked inventory list');
  await writeFile(path, s, 'utf8');
}

// Homepage rental/sale collections should also read as lists; keep the curated horizontal showcase unchanged.
{
  const path = 'src/pages/home.component.ts';
  let s = await readFile(path, 'utf8');
  s = s.replaceAll(
    'class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 max-w-7xl mx-auto mb-12 md:mb-16"',
    'class="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4 mb-12 md:mb-16"',
  );
  s = s.replace(
    '<img [src]="car.images?.[0] || car.image" [alt]="car.brand + \' \' + car.model" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />',
    '<img [src]="car.images?.[0] || car.image" (error)="handleRecommendedImageError($event)" [alt]="car.brand + \' \' + car.model" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />',
  );

  if (!s.includes('handleRecommendedImageError(event: Event)')) {
    s = replaceOnce(
      s,
      `  hideBrokenImage(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
`,
      `  hideBrokenImage(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  handleRecommendedImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
`,
      'homepage showcase image fallback',
    );
  }
  await writeFile(path, s, 'utf8');
}

console.log('Rental, sales and homepage inventory now use stable ID-linked professional list rows.');
