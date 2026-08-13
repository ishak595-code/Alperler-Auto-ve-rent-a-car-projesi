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
  host: { class: "block min-w-0" },
  template: `
    <article
      class="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-blue-600"
    >
      <a
        [routerLink]="detailRoute"
        [attr.aria-label]="detailAriaLabel"
        class="absolute inset-0 z-10 rounded-[18px] focus:outline-none"
      >
        <span class="sr-only">{{ detailAriaLabel }}</span>
      </a>

      <div class="relative m-2 mb-0 aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100 sm:m-2.5 sm:mb-0">
        <img
          [src]="car.images?.[0] || car.image"
          (error)="handleImageError($event)"
          [alt]="displayTitle"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        @if (car.badge) {
          <span
            class="absolute left-2 top-2 z-20 max-w-[calc(100%-3.75rem)] truncate rounded-md px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-white shadow-md"
            [class.bg-amber-500]="car.badge === 'FIRSAT'"
            [class.bg-slate-900]="car.badge !== 'FIRSAT'"
          >
            {{ car.badge }}
          </span>
        }

        <div class="absolute right-1.5 top-1.5 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            (click)="toggleFavorite($event)"
            [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
            [attr.aria-pressed]="isFavorite()"
            class="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-md backdrop-blur-sm transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
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
            class="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-md backdrop-blur-sm transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <mat-icon aria-hidden="true" class="!h-5 !w-5 !text-[20px]">share</mat-icon>
          </button>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col p-3 pt-2.5 sm:p-3.5 sm:pt-3">
        <h3
          class="line-clamp-3 min-h-[3.7rem] break-words font-serif text-[15px] font-extrabold leading-[1.22] text-slate-950 sm:min-h-[4.15rem] sm:text-[17px]"
        >
          {{ displayTitle }}
        </h3>

        <div class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600 sm:text-[11px]">
          @if (car.year) {
            <span class="rounded bg-slate-100 px-2 py-1.5">{{ car.year }}</span>
          }
          @if (variant === "sale" && car.km != null) {
            <span class="rounded bg-slate-100 px-2 py-1.5">{{ car.km | number }} km</span>
          }
          @if (car.transmission) {
            <span class="rounded bg-slate-100 px-2 py-1.5">{{ car.transmission }}</span>
          }
          @if (variant === "rental" && car.seats) {
            <span class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1.5">
              <mat-icon aria-hidden="true" class="!h-3.5 !w-3.5 !text-[14px]">person</mat-icon>
              {{ car.seats }} Kişilik
            </span>
          }
        </div>

        @if (variant === "sale" && car.damageStatus) {
          <div
            class="mt-2 flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 text-[10px] font-extrabold leading-tight text-emerald-700 sm:text-[11px]"
          >
            <mat-icon aria-hidden="true" class="!h-4 !w-4 shrink-0 !text-[16px]">verified</mat-icon>
            <span class="line-clamp-2">{{ car.damageStatus }}</span>
          </div>
        }

        <div class="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-2 text-[9px] font-extrabold leading-tight text-blue-800 sm:text-[10px]">
          <mat-icon aria-hidden="true" class="!h-4 !w-4 shrink-0 !text-[16px] text-blue-600">shield</mat-icon>
          <span>{{ variant === "rental" ? "%100 Kaskolu & Yol Yardım" : "101 Nokta Ekspertizli" }}</span>
        </div>

        <div class="mt-auto pt-3">
          <div
            class="mb-2 inline-flex max-w-full items-center rounded px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide"
            [class.border]="true"
            [class.border-blue-200]="variant === 'rental'"
            [class.bg-blue-50]="variant === 'rental'"
            [class.text-blue-700]="variant === 'rental'"
            [class.border-slate-200]="variant === 'sale'"
            [class.bg-slate-50]="variant === 'sale'"
            [class.text-slate-700]="variant === 'sale'"
          >
            {{ variant === "rental" ? driverOptionText : "Premium Galeri" }}
          </div>

          <div class="mb-3 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
            <mat-icon aria-hidden="true" class="!h-4 !w-4 shrink-0 !text-[16px] text-slate-500">location_on</mat-icon>
            <span class="truncate">{{ car.location || "Hakkari / Yüksekova" }}</span>
          </div>

          <div class="mb-3 min-w-0 whitespace-nowrap text-[18px] font-black leading-none text-slate-950 sm:text-[22px]">
            {{ car.price | turkishCurrency }}
            @if (variant === "rental") {
              <span class="text-[10px] font-semibold text-slate-500 sm:text-xs">/ gün</span>
            }
          </div>

          <div class="relative z-30 grid grid-cols-2 gap-2">
            <a
              [routerLink]="detailRoute"
              class="pointer-events-auto flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-2 text-center text-[10px] font-extrabold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:text-[11px]"
            >
              {{ variant === "rental" ? "Kirala" : "Satın Al" }}
            </a>
            <a
              [routerLink]="detailRoute"
              class="pointer-events-auto flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-center text-[10px] font-extrabold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:text-[11px]"
            >
              Detay
            </a>
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
        // Clipboard can be blocked by browser permissions. The card remains usable.
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
