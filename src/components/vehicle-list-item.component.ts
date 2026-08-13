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
  template: `
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
                <span>Detay</span>
                <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px] transition-transform group-hover:translate-x-0.5">chevron_right</mat-icon>
              </div>
            </div>
          </div>
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
    const fallback = [this.car.year, this.car.brand, this.car.model].filter(Boolean).join(" ");
    return this.car.title?.trim() || fallback || "Araç ilanı";
  }

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const numberType = this.variant === "rental" ? "araç" : "ilan";
    return this.displayTitle + ", " + type + ", " + numberType + " numarası " + this.car.id + ". Detayları aç";
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
