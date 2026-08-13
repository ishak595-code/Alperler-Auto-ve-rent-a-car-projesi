import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

@Component({
  selector: "app-vehicle-list-item",
  standalone: true,
  imports: [CommonModule, RouterLink, TurkishCurrencyPipe],
  host: { class: "block h-full w-full min-w-0" },
  template: `
    <a
      [routerLink]="detailRoute"
      [attr.aria-label]="detailAriaLabel"
      class="group block h-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <div
        class="relative h-[120px] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-[140px]"
      >
        <img
          [src]="car.images?.[0] || car.image"
          (error)="handleImageError($event)"
          [alt]="displayTitle"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        @if (car.badge) {
          <span
            class="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm"
          >
            {{ car.badge }}
          </span>
        }
      </div>

      <div class="px-1 pt-3">
        <h3
          class="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-base"
        >
          {{ car.brand }} {{ car.model }}
        </h3>

        <div class="mt-1 flex min-w-0 items-center justify-between gap-2">
          <span class="min-w-0 truncate text-xs font-medium text-slate-500">
            {{ car.year }}@if (car.transmission) { • {{ car.transmission }} }
          </span>
          <span
            class="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-900 sm:text-sm"
          >
            {{ car.price | turkishCurrency }}@if (variant === "rental") {<span class="ml-0.5 text-[9px] font-semibold text-slate-500">/gün</span>}
          </span>
        </div>
      </div>
    </a>
  `,
})
export class VehicleListItemComponent {
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

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const details = [
      this.car.year,
      this.variant === "sale" && this.car.km != null
        ? `${this.car.km} kilometre`
        : null,
      this.car.transmission,
      this.car.fuel,
    ]
      .filter(Boolean)
      .join(", ");

    return `${this.displayTitle}, ${type}${details ? `, ${details}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Detayları aç`;
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
