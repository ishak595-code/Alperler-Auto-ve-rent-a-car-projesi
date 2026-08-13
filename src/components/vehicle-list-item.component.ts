import { Component, Input, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

@Component({
  selector: "app-vehicle-list-item",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TurkishCurrencyPipe],
  template: `
    <article class="relative w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
      <div class="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)] min-h-[150px] sm:min-h-[180px]">
        <a [routerLink]="detailRoute" [attr.aria-label]="detailLabel" class="relative block bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
          <img
            [src]="car.images?.[0] || car.image"
            (error)="handleImageError($event)"
            [alt]="car.brand + ' ' + car.model"
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover"
          />
          @if (car.badge) {
            <span class="absolute left-2 top-2 rounded-md bg-slate-950/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">{{ car.badge }}</span>
          }
        </a>

        <div class="flex min-w-0 flex-col p-3 sm:p-4 md:p-5">
          <div class="flex min-w-0 items-start gap-2">
            <div class="min-w-0 flex-1">
              <p class="mb-1 text-[10px] sm:text-xs font-black uppercase tracking-widest" [class.text-blue-600]="variant === 'rental'" [class.text-emerald-700]="variant === 'sale'">
                {{ variant === 'rental' ? 'Kiralık' : 'Satılık' }}
              </p>
              <h3 class="text-base sm:text-xl font-serif font-bold leading-tight text-slate-950">
                <a [routerLink]="detailRoute" class="rounded-sm break-words focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ car.year }} {{ car.brand }} {{ car.model }}</a>
              </h3>
            </div>
            <button
              type="button"
              (click)="toggleFavorite($event)"
              [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
              [attr.aria-pressed]="isFavorite()"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <mat-icon [class.text-red-500]="isFavorite()">{{ isFavorite() ? 'favorite' : 'favorite_border' }}</mat-icon>
            </button>
          </div>

          <div class="mt-2 flex flex-wrap gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-600">
            @if (car.transmission) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.transmission }}</span> }
            @if (car.fuel) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.fuel }}</span> }
            @if (variant === 'rental' && car.seats) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.seats }} Kişilik</span> }
            @if (variant === 'sale' && car.km) { <span class="rounded-md bg-slate-100 px-2 py-1">{{ car.km | number }} km</span> }
          </div>

          <div class="mt-auto pt-3">
            <div class="flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-3">
              <div>
                <div class="text-lg sm:text-2xl font-black text-slate-950">
                  {{ car.price | turkishCurrency }}
                  @if (variant === 'rental') { <span class="text-xs font-medium text-slate-500">/ gün</span> }
                </div>
                <div class="mt-1 text-[10px] font-bold uppercase tracking-wide" [class.text-emerald-700]="car.isAvailable !== false" [class.text-red-700]="car.isAvailable === false">
                  {{ car.isAvailable === false ? (variant === 'rental' ? 'Dolu' : 'Satıldı') : 'Müsait' }}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="primaryAction($event)"
                  [disabled]="car.isAvailable === false"
                  [attr.aria-label]="actionLabel"
                  class="min-h-11 rounded-xl bg-slate-950 px-3 sm:px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >{{ variant === 'rental' ? 'Kirala' : 'İncele' }}</button>
                <a [routerLink]="detailRoute" [attr.aria-label]="detailLabel" class="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 sm:px-4 text-xs font-bold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Detay</a>
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
  private readonly router = inject(Router);

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get detailRoute(): (string | number)[] {
    return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id];
  }

  get detailLabel(): string {
    return `${this.car.year || ""} ${this.car.brand || ""} ${this.car.model || ""} detaylarını aç`.trim();
  }

  get actionLabel(): string {
    return this.variant === "rental"
      ? `${this.car.brand} ${this.car.model} kiralama talebi oluştur`
      : `${this.car.brand} ${this.car.model} satın alma talebi oluştur`;
  }

  isFavorite(): boolean {
    return this.carService.isFavorite(this.car.id);
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.carService.toggleFavorite(this.car.id);
  }

  primaryAction(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.car.isAvailable === false) return;
    this.carService.setBookingRequest({
      type: this.variant === "rental" ? "RENTAL" : "SALE_INQUIRY",
      item: this.car,
      itemName: `${this.car.brand} ${this.car.model}`,
      image: this.car.images?.[0] || this.car.image,
      basePrice: this.car.price,
    });
    this.router.navigate(["/contact"]);
  }

  handleImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
