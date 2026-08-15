import { CommonModule } from "@angular/common";
import { Component, Input, inject } from "@angular/core";
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
    <article class="group h-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md" [attr.aria-labelledby]="titleId">
      <a [routerLink]="detailRoute" [attr.aria-label]="detailAriaLabel" class="block rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/40">
        <div class="relative h-[120px] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-[140px]">
          <img [src]="car.images?.[0] || car.image" (error)="handleImageError($event)" [alt]="displayTitle + ', ' + (variant === 'rental' ? 'kiralık araç' : 'satılık araç')" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
          @if (car.badge) { <span class="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">{{ car.badge }}</span> }
          @if (car.isCampaign || car.discountRate) { <span class="absolute bottom-2 left-2 rounded bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-sm">@if (car.discountRate) { %{{ car.discountRate }} İNDİRİM } @else { KAMPANYA }</span> }
        </div>

        <div class="px-1 pt-3">
          <h3 [id]="titleId" class="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 sm:text-base">{{ displayTitle }}</h3>
          <div class="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600 sm:text-xs">
            @if (car.year) { <span class="rounded bg-slate-100 px-2 py-1">{{ car.year }}</span> }
            @if (car.transmission) { <span class="rounded bg-slate-100 px-2 py-1">{{ car.transmission }}</span> }
            @if (car.fuel) { <span class="rounded bg-slate-100 px-2 py-1">{{ car.fuel }}</span> }
            @if (variant === 'sale' && car.km != null) { <span class="rounded bg-slate-100 px-2 py-1">{{ car.km | number }} km</span> }
            @if (variant === 'rental' && car.seats) { <span class="rounded bg-slate-100 px-2 py-1">{{ car.seats }} kişilik</span> }
          </div>
          <div class="mt-3 flex min-w-0 items-center justify-between gap-2">
            <span class="min-w-0 truncate text-xs font-medium text-slate-500">{{ car.location || config().address }}</span>
            <span class="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-900 sm:text-sm">{{ car.price | turkishCurrency }}@if (variant === 'rental') {<span class="ml-0.5 text-[9px] font-semibold text-slate-500">/gün</span>}</span>
          </div>
        </div>
      </a>

      <div class="mt-3 grid grid-cols-2 gap-2">
        <a [routerLink]="detailRoute" class="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/40" [attr.aria-label]="detailAriaLabel">Araç Detaylarını Gör</a>
        <button type="button" (click)="openWhatsApp($event)" class="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/40" [attr.aria-label]="displayTitle + ' için WhatsApp üzerinden bilgi al'">WhatsApp ile Bilgi Al</button>
      </div>
    </article>
  `,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);
  readonly config = this.carService.getConfig();

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get titleId(): string { return `vehicle-list-title-${String(this.car.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
  get detailRoute(): (string | number)[] { return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id]; }
  get displayTitle(): string { return this.car.title?.trim() || [this.car.year, this.car.brand, this.car.model, this.car.series].filter(Boolean).join(" ") || "Araç ilanı"; }
  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "ikinci el satılık araç";
    const details = [this.car.year, this.variant === "sale" && this.car.km != null ? `${this.car.km} kilometre` : null, this.car.transmission, this.car.fuel].filter(Boolean).join(", ");
    return `${this.displayTitle}, ${type}${details ? `, ${details}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Araç detaylarını görüntüle`;
  }

  openWhatsApp(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    if (typeof window === "undefined") return;
    const cfg = this.config();
    const number = String(cfg.whatsapp || cfg.phone || "").replace(/\D/g, "");
    if (!number) return;
    const pageUrl = `${window.location.origin}${this.variant === "rental" ? "/fleet/" : "/sales/"}${this.car.id}`;
    const base = cfg.whatsappMessage?.trim() || "Merhaba, bu araç hakkında bilgi almak istiyorum.";
    const message = `${base}\n\n${this.displayTitle}\n${pageUrl}`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
