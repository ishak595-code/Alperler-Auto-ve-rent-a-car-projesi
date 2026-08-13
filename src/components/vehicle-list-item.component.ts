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
  host: { class: "block w-full min-w-0" },
  template: `
    <article
      class="group relative w-full min-w-0 border-b border-slate-200 bg-white transition-colors last:border-b-0 hover:bg-slate-50 focus-within:bg-blue-50/40 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600"
    >
      <a
        [routerLink]="detailRoute"
        [attr.aria-label]="detailAriaLabel"
        class="absolute inset-0 z-10 focus:outline-none"
      >
        <span class="sr-only">{{ detailAriaLabel }}</span>
      </a>

      <div
        class="grid min-h-[126px] grid-cols-[118px_minmax(0,1fr)_44px] sm:min-h-[138px] sm:grid-cols-[148px_minmax(0,1fr)_48px]"
      >
        <div class="relative m-2 mr-0 overflow-hidden rounded-xl bg-slate-100 sm:m-2.5 sm:mr-0">
          <img
            [src]="car.images?.[0] || car.image"
            (error)="handleImageError($event)"
            [alt]="displayTitle"
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
          />

          @if (car.badge) {
            <span
              class="absolute left-1.5 top-1.5 z-20 max-w-[calc(100%-0.75rem)] truncate rounded-md bg-slate-950/90 px-1.5 py-1 text-[8px] font-black uppercase tracking-wide text-white shadow-sm sm:text-[9px]"
            >
              {{ car.badge }}
            </span>
          }
        </div>

        <div class="pointer-events-none flex min-w-0 flex-col px-3 py-2.5 sm:px-4 sm:py-3">
          <h3
            class="line-clamp-2 break-words font-serif text-[15px] font-extrabold leading-[1.2] text-slate-950 sm:text-[18px]"
          >
            {{ displayTitle }}
          </h3>

          <div
            class="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[10px] font-semibold text-slate-500 sm:text-xs"
            aria-hidden="true"
          >
            @if (car.year) {
              <span class="shrink-0">{{ car.year }}</span>
            }
            @if (variant === "sale" && car.km != null) {
              <span class="shrink-0 text-slate-300">•</span>
              <span class="shrink-0">{{ car.km | number }} km</span>
            }
            @if (car.transmission) {
              <span class="shrink-0 text-slate-300">•</span>
              <span class="truncate">{{ car.transmission }}</span>
            }
            @if (car.fuel) {
              <span class="shrink-0 text-slate-300">•</span>
              <span class="truncate">{{ car.fuel }}</span>
            }
          </div>

          <div class="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold sm:text-[11px]">
            @if (variant === "rental") {
              <span class="truncate text-blue-700">{{ driverOptionText }}</span>
              @if (car.seats) {
                <span class="shrink-0 text-slate-300">•</span>
                <span class="shrink-0 text-slate-500">{{ car.seats }} kişilik</span>
              }
            } @else {
              @if (car.damageStatus) {
                <mat-icon aria-hidden="true" class="!h-4 !w-4 shrink-0 !text-[15px] text-emerald-600">verified</mat-icon>
                <span class="truncate text-emerald-700">{{ car.damageStatus }}</span>
              } @else {
                <span class="truncate text-slate-500">Premium Galeri</span>
              }
            }
          </div>

          <div class="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
            <div class="min-w-0">
              <div class="truncate text-[17px] font-black leading-none text-slate-950 sm:text-xl">
                {{ car.price | turkishCurrency }}
                @if (variant === "rental") {
                  <span class="text-[10px] font-semibold text-slate-500 sm:text-xs">/ gün</span>
                }
              </div>
              <div class="mt-1 flex min-w-0 items-center gap-1 text-[9px] text-slate-500 sm:text-[10px]">
                <mat-icon aria-hidden="true" class="!h-3.5 !w-3.5 shrink-0 !text-[14px]">location_on</mat-icon>
                <span class="truncate">{{ car.location || "Hakkari / Yüksekova" }}</span>
              </div>
            </div>

            <mat-icon
              aria-hidden="true"
              class="!h-5 !w-5 shrink-0 !text-[20px] text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700"
            >
              chevron_right
            </mat-icon>
          </div>
        </div>

        <div class="relative z-20 flex flex-col items-center gap-1 pt-1.5 sm:pt-2">
          <button
            type="button"
            (click)="toggleFavorite($event)"
            [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
            [attr.aria-pressed]="isFavorite()"
            class="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <mat-icon
              aria-hidden="true"
              class="!h-5 !w-5 !text-[20px]"
              [class.text-red-500]="isFavorite()"
            >
              {{ isFavorite() ? "favorite" : "favorite_border" }}
            </mat-icon>
          </button>

          <button
            type="button"
            (click)="shareVehicle($event)"
            aria-label="İlanı paylaş"
            class="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[19px]">share</mat-icon>
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
    const fallback = [
      this.car.year,
      this.car.brand,
      this.car.model,
      this.car.series,
    ]
      .filter(Boolean)
      .join(" ");
    return this.car.title?.trim() || fallback || "Araç ilanı";
  }

  get driverOptionText(): string {
    switch (this.car.driverOption) {
      case "WITH_DRIVER":
        return "Şoförlü";
      case "WITHOUT_DRIVER":
        return "Şoförsüz";
      case "BOTH":
        return "Şoförlü & Şoförsüz";
      default:
        return "Kiralık Araç";
    }
  }

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const details = [
      this.car.year,
      this.variant === "sale" && this.car.km != null
        ? `${this.car.km} kilometre`
        : null,
      this.car.transmission,
      this.car.fuel,
      this.variant === "rental" && this.car.seats
        ? `${this.car.seats} kişilik`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    return `${this.displayTitle}, ${type}${details ? `, ${details}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Detayları aç`;
  }

  isFavorite(): boolean {
    return this.carService.isFavorite(this.car.id);
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.carService.toggleFavorite(this.car.id);
  }

  async shareVehicle(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const path =
      this.variant === "rental"
        ? `/fleet/${this.car.id}`
        : `/sales/${this.car.id}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: this.displayTitle,
          text: `${this.displayTitle} - Alperler Auto`,
          url,
        });
        return;
      } catch {
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Clipboard permissions may be unavailable. The listing remains usable.
      }
    }
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
