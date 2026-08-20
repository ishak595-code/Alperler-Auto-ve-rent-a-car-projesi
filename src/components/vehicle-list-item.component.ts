import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-vehicle-list-item",
  standalone: true,
  imports: [CommonModule, RouterLink, TurkishCurrencyPipe],
  host: { class: "block h-full w-full min-w-0" },
  template: `
    <a
      [routerLink]="detailRoute"
      [attr.aria-label]="detailAriaLabel"
      class="group block h-full min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl active:translate-y-0 active:scale-[.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <article class="flex h-full min-w-0 flex-col">
        <div class="relative h-[148px] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-[160px]">
          <img
            [src]="car.images?.[0] || car.image || '/vehicle-placeholder.svg'"
            (error)="handleImageError($event)"
            [alt]="displayTitle"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
          @if (car.badge) {
            <span class="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-slate-950/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow">{{ car.badge }}</span>
          }
          @if (car.isCampaign || car.discountRate) {
            <span class="absolute bottom-2 left-2 rounded-full bg-amber-400 px-2.5 py-1 text-[9px] font-black uppercase text-slate-950 shadow">
              @if (car.discountRate) { %{{ car.discountRate }} indirim } @else { Kampanya }
            </span>
          }
          <span class="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-blue-700 shadow transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </div>

        <div class="flex flex-1 flex-col px-1 pt-3">
          <h3 class="min-w-0 text-base font-black leading-tight text-slate-950 transition-colors group-hover:text-blue-700">{{ displayTitle }}</h3>

          <div class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600 sm:text-xs">
            @if (car.year) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.year }}</span> }
            @if (car.transmission) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.transmission }}</span> }
            @if (car.fuel) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.fuel }}</span> }
            @if (variant === 'sale' && car.km != null) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.km | number }} km</span> }
            @if (variant === 'rental' && car.seats) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.seats }} kişilik</span> }
          </div>

          <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{{ cardDescription }}</p>

          <div class="mt-auto flex min-w-0 items-end justify-between gap-2 border-t border-slate-100 pt-3">
            <div class="min-w-0">
              <span class="block truncate text-[11px] font-semibold text-slate-500">{{ car.location || config().address }}</span>
              <span class="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-700">
                {{ variant === 'sale' ? 'İlan detayını aç' : 'Aracı ve fiyatı incele' }}
                <span aria-hidden="true">→</span>
              </span>
            </div>
            <span class="shrink-0 text-right text-sm font-black text-slate-950 sm:text-base">
              {{ car.price | turkishCurrency }}@if (variant === "rental") {<span class="ml-0.5 block text-[9px] font-semibold text-slate-500">/ gün</span>}
            </span>
          </div>
        </div>
      </article>
    </a>
  `,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);
  readonly config = this.carService.getConfig();

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get detailRoute(): (string | number)[] {
    return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id];
  }

  get displayTitle(): string {
    const fallback = [this.car.year, this.car.brand, this.car.model, this.car.series].filter(Boolean).join(" ");
    return this.car.title?.trim() || fallback || "Araç ilanı";
  }

  get cardDescription(): string {
    const description = String(this.car.description || "").trim().replace(/\s+/g, " ");
    if (description) return description;
    if (this.variant === "sale") {
      return "Fiyat, kilometre, teknik özellikler ve mevcut araç bilgilerini incelemek için ilan detayını açın.";
    }
    return "Günlük fiyatı, araç özelliklerini ve rezervasyonda kullanabileceğiniz teslim ve ek hizmet seçeneklerini inceleyin.";
  }

  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const details = [this.car.year, this.variant === "sale" && this.car.km != null ? `${this.car.km} kilometre` : null, this.car.transmission, this.car.fuel].filter(Boolean).join(", ");
    return `${this.displayTitle}, ${type}${details ? `, ${details}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Detayları aç`;
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "/vehicle-placeholder.svg";
  }
}
