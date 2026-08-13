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
    <article class="group relative isolate w-full min-w-0 overflow-hidden border-b border-slate-200 bg-white transition-colors hover:bg-slate-50 focus-within:bg-slate-50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500">
      <a [routerLink]="detailRoute" [attr.aria-label]="detailAriaLabel" class="absolute inset-0 z-10 focus:outline-none"><span class="sr-only">{{ detailAriaLabel }}</span></a>
      <div class="grid min-h-[116px] grid-cols-[112px_minmax(0,1fr)_44px] sm:min-h-[128px] sm:grid-cols-[148px_minmax(0,1fr)_48px] md:min-h-[136px] md:grid-cols-[168px_minmax(0,1fr)_52px]">
        <div class="relative overflow-hidden bg-slate-100 pointer-events-none">
          <img [src]="car.images?.[0] || car.image" (error)="handleImageError($event)" alt="" aria-hidden="true" loading="lazy" decoding="async" class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          @if (car.badge) { <span class="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded bg-slate-950/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-sm sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[9px]">{{ car.badge }}</span> }
        </div>
        <div class="pointer-events-none flex min-w-0 flex-col px-3 py-2.5 sm:px-4 sm:py-3">
          <div class="min-w-0">
            <div class="mb-1 flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px]">
              <span [class.text-blue-700]="variant === 'rental'" [class.text-emerald-700]="variant === 'sale'">{{ variant === 'rental' ? 'Kiralık' : 'Satılık' }}</span>
              <span class="truncate normal-case tracking-normal text-slate-400">{{ variant === 'rental' ? 'Araç No' : 'İlan No' }} {{ car.id }}</span>
            </div>
            <h3 class="line-clamp-2 break-words font-serif text-[15px] font-bold leading-[1.22] text-slate-950 sm:text-lg">{{ displayTitle }}</h3>
          </div>
          <div class="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-slate-500 sm:text-xs" aria-hidden="true">
            @if (car.year) { <span>{{ car.year }}</span> }
            @if (car.transmission) { <span class="text-slate-300">•</span><span>{{ car.transmission }}</span> }
            @if (car.fuel) { <span class="text-slate-300">•</span><span>{{ car.fuel }}</span> }
            @if (variant === 'rental' && car.seats) { <span class="text-slate-300">•</span><span>{{ car.seats }} kişilik</span> }
            @if (variant === 'sale' && car.km != null) { <span class="text-slate-300">•</span><span>{{ car.km | number }} km</span> }
          </div>
          @if (car.location) { <div class="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-slate-400 sm:text-xs"><mat-icon aria-hidden="true" class="!h-3.5 !w-3.5 !text-[14px]">location_on</mat-icon><span class="truncate">{{ car.location }}</span></div> }
          <div class="mt-auto flex min-w-0 items-end justify-between gap-2 pt-1.5">
            <div class="min-w-0"><div class="truncate text-base font-black leading-none text-slate-950 sm:text-xl">{{ car.price | turkishCurrency }} @if (variant === 'rental') { <span class="text-[10px] font-semibold text-slate-500 sm:text-xs">/ gün</span> }</div><div class="mt-1 text-[9px] font-bold uppercase tracking-wide sm:text-[10px]" [class.text-emerald-700]="car.isAvailable !== false" [class.text-red-700]="car.isAvailable === false">{{ car.isAvailable === false ? (variant === 'rental' ? 'Müsait değil' : 'Satıldı') : (variant === 'rental' ? 'Müsait' : 'İlan aktif') }}</div></div>
            <mat-icon aria-hidden="true" class="!h-5 !w-5 shrink-0 !text-[20px] text-blue-700 transition-transform group-hover:translate-x-0.5">chevron_right</mat-icon>
          </div>
        </div>
        <div class="relative z-20 flex items-start justify-center pt-2 sm:pt-3"><button type="button" (click)="toggleFavorite($event)" [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'" [attr.aria-pressed]="isFavorite()" class="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><mat-icon [class.text-red-500]="isFavorite()" aria-hidden="true">{{ isFavorite() ? 'favorite' : 'favorite_border' }}</mat-icon></button></div>
      </div>
    </article>
  `,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);
  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";
  get detailRoute(): (string | number)[] { return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id]; }
  get displayTitle(): string { const fallback = [this.car.year, this.car.brand, this.car.model].filter(Boolean).join(" "); return this.car.title?.trim() || fallback || "Araç ilanı"; }
  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "satılık araç";
    const numberType = this.variant === "rental" ? "araç" : "ilan";
    const meta = [this.car.year, this.car.transmission, this.car.fuel, this.variant === "rental" && this.car.seats ? this.car.seats + " kişilik" : null, this.variant === "sale" && this.car.km != null ? this.car.km + " kilometre" : null].filter(Boolean).join(", ");
    return this.displayTitle + ", " + type + ", " + numberType + " numarası " + this.car.id + (meta ? ", " + meta : "") + ", fiyat " + this.car.price + " Türk lirası. Detayları aç";
  }
  isFavorite(): boolean { return this.carService.isFavorite(this.car.id); }
  toggleFavorite(event: Event) { event.preventDefault(); event.stopPropagation(); this.carService.toggleFavorite(this.car.id); }
  handleImageError(event: Event) { const image = event.target as HTMLImageElement; image.onerror = null; image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop"; }
}
