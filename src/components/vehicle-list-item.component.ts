import { Component, Input, inject } from "@angular/core";
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
  host: { class: "block" },
  template: `
    <article
      class="group relative w-full min-w-0 border-b border-slate-200 bg-white transition-colors hover:bg-slate-50 focus-within:bg-blue-50/40 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500"
    >
      <a
        [routerLink]="detailRoute"
        [attr.aria-label]="detailAriaLabel"
        class="absolute inset-0 z-10 focus:outline-none"
      >
        <span class="sr-only">{{ detailAriaLabel }}</span>
      </a>

      <div
        class="grid min-h-[104px] grid-cols-[124px_minmax(0,1fr)_44px] sm:min-h-[116px] sm:grid-cols-[148px_minmax(0,1fr)_48px]"
      >
        <div class="relative overflow-hidden bg-slate-100 pointer-events-none">
          <img
            [src]="car.images?.[0] || car.image"
            (error)="handleImageError($event)"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover"
          />
          @if (car.badge) {
            <span
              class="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate bg-slate-950/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-sm"
            >
              {{ car.badge }}
            </span>
          }
        </div>

        <div class="pointer-events-none flex min-w-0 flex-col px-3 py-2.5 sm:px-4 sm:py-3">
          <h3
            class="line-clamp-2 break-words text-[16px] font-semibold leading-[1.24] text-slate-900 sm:text-[18px]"
          >
            {{ displayTitle }}
          </h3>

          <div
            class="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] font-medium text-slate-500 sm:text-xs"
            aria-hidden="true"
          >
            @if (car.year) {
              <span class="shrink-0">{{ car.year }}</span>
            }
            @if (car.transmission) {
              <span class="shrink-0 text-slate-300">•</span>
              <span class="truncate">{{ car.transmission }}</span>
            }
            @if (car.fuel) {
              <span class="shrink-0 text-slate-300">•</span>
              <span class="truncate">{{ car.fuel }}</span>
            }
            <span class="shrink-0 text-slate-300">•</span>
            <span
              class="truncate font-semibold"
              [class.text-emerald-700]="car.isAvailable !== false"
              [class.text-red-700]="car.isAvailable === false"
            >
              {{ statusText }}
            </span>
          </div>

          <div class="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
            <div class="truncate text-[17px] font-extrabold leading-none text-blue-700 sm:text-xl">
              {{ car.price | turkishCurrency }}
              @if (variant === "rental") {
                <span class="text-[10px] font-semibold text-slate-500 sm:text-xs">/ gün</span>
              }
            </div>
            <mat-icon
              aria-hidden="true"
              class="!h-5 !w-5 shrink-0 !text-[20px] text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700"
            >
              chevron_right
            </mat-icon>
          </div>
        </div>

        <div class="relative z-20 flex items-start justify-center pt-1.5 sm:pt-2">
          <button
            type="button"
            (click)="toggleFavorite($event)"
            [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
            [attr.aria-pressed]="isFavorite()"
            class="pointer-events-auto flex h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <mat-icon [class.text-red-500]="isFavorite()" aria-hidden="true">
              {{ isFavorite() ? "favorite" : "favorite_border" }}
            </mat-icon>
          </button>
        </div>
      </div>
    </article>
  `,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get detailRoute(): (string | number)[] {
    return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id];
  }

  get displayTitle(): string {
    const fallback = [this.car.year, this.car.brand, this.car.model]
      .filter(Boolean)
      .join(" ");
    return this.car.title?.trim() || fallback || "Araç ilanı";
  }

  get statusText(): string {
    if (this.car.isAvailable === false) {
      return this.variant === "rental" ? "Müsait değil" : "Satıldı";
    }
    return this.variant === "rental" ? "Müsait" : "İlan aktif";
  }

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const meta = [
      this.car.year,
      this.car.transmission,
      this.car.fuel,
      this.statusText,
    ]
      .filter(Boolean)
      .join(", ");

    return `${this.displayTitle}, ${type}${meta ? `, ${meta}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Detayları aç`;
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
    image.src =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
