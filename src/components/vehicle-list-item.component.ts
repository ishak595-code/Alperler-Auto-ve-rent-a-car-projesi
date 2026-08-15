import { CommonModule } from "@angular/common";
import { Component, Input, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-vehicle-list-item",
  standalone: true,
  imports: [CommonModule, RouterLink, TurkishCurrencyPipe],
  host: { class: "block h-full w-full min-w-0" },
  template: `
    <article class="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transform-none" [attr.aria-labelledby]="titleId">
      <a [routerLink]="detailRoute" [attr.aria-label]="detailAriaLabel" class="block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/40">
        <div class="relative h-[190px] w-full overflow-hidden rounded-2xl bg-slate-100 sm:h-[220px]">
          <img [src]="car.images?.[0] || car.image" (error)="handleImageError($event)" [alt]="displayTitle + ', ' + (variant === 'rental' ? 'kiralık araç' : 'satılık araç')" loading="lazy" decoding="async" class="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]" />
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
          @if (car.badge) { <span class="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-slate-950/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">{{ car.badge }}</span> }
          @if (car.isCampaign || car.discountRate) { <span class="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase text-slate-950 shadow-lg">@if (car.discountRate) { %{{ car.discountRate }} İNDİRİM } @else { KAMPANYA }</span> }
          @if (car.color) { <span class="absolute bottom-3 right-3 rounded-full border border-white/30 bg-slate-950/70 px-3 py-1 text-[10px] font-black text-white backdrop-blur">{{ car.color }}</span> }
        </div>

        <div class="px-1 pt-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 [id]="titleId" class="truncate text-base font-black text-slate-950 transition-colors group-hover:text-blue-700 sm:text-lg">{{ displayTitle }}</h3>
              @if (car.series) { <p class="mt-0.5 truncate text-xs font-semibold text-slate-500">{{ car.series }}</p> }
            </div>
            <span class="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">{{ car.price | turkishCurrency }}@if (variant === 'rental') {<span class="ml-0.5 text-[9px] font-semibold text-slate-300">/gün</span>}</span>
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-700 sm:text-xs">
            @if (car.year) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.year }}</span> }
            @if (car.transmission) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.transmission }}</span> }
            @if (car.fuel) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.fuel }}</span> }
            @if (car.type) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.type }}</span> }
            @if (car.enginePower) { <span class="rounded-lg bg-blue-50 px-2.5 py-1.5 text-blue-800">{{ car.enginePower }}</span> }
            @if (variant === 'sale' && car.km != null) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.km | number }} km</span> }
            @if (variant === 'rental' && car.seats) { <span class="rounded-lg bg-slate-100 px-2.5 py-1.5">{{ car.seats }} kişilik</span> }
          </div>

          <div class="mt-3 flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
            <span aria-hidden="true">●</span><span class="min-w-0 truncate">{{ car.location || config().address }}</span>
          </div>
        </div>
      </a>

      <div class="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div class="min-w-0"><span class="block text-[9px] font-black uppercase tracking-[.12em] text-slate-400">İlan No</span><strong class="block truncate text-xs text-slate-800">{{ listingNumber }}</strong></div>
        <button type="button" (click)="copyListingNumber($event)" class="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" [attr.aria-label]="'İlan numarası ' + listingNumber + ' panoya kopyala'">Kopyala</button>
      </div>

      <div class="mt-auto grid grid-cols-2 gap-2 pt-3">
        <a [routerLink]="detailRoute" class="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-center text-xs font-black text-slate-800 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/40" [attr.aria-label]="detailAriaLabel">Detayları Gör</a>
        <button type="button" (click)="openWhatsApp($event)" class="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/40" [attr.aria-label]="displayTitle + ' için WhatsApp üzerinden bilgi al'">WhatsApp</button>
      </div>
    </article>
  `,
})
export class VehicleListItemComponent {
  private readonly carService = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly config = this.carService.getConfig();

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";

  get titleId(): string { return `vehicle-list-title-${String(this.car.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
  get detailRoute(): (string | number)[] { return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id]; }
  get displayTitle(): string { return this.car.title?.trim() || [this.car.year, this.car.brand, this.car.model, this.car.series].filter(Boolean).join(" ") || "Araç ilanı"; }
  get listingNumber(): string { return String(this.car.cloudStockCode || this.car.id); }
  get detailAriaLabel(): string {
    const type = this.variant === "rental" ? "kiralık araç" : "ikinci el satılık araç";
    const details = [this.car.year, this.variant === "sale" && this.car.km != null ? `${this.car.km} kilometre` : null, this.car.transmission, this.car.fuel, this.car.color].filter(Boolean).join(", ");
    return `${this.displayTitle}, ilan numarası ${this.listingNumber}, ${type}${details ? `, ${details}` : ""}, fiyat ${this.car.price} Türk lirası${this.variant === "rental" ? " günlük" : ""}. Araç detaylarını görüntüle`;
  }

  async copyListingNumber(event: Event): Promise<void> {
    event.preventDefault(); event.stopPropagation();
    const value = this.listingNumber;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const input = document.createElement("textarea"); input.value = value; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
      }
      this.toast.show(`İlan no kopyalandı: ${value}`, "success");
    } catch {
      this.toast.show("İlan numarası kopyalanamadı.", "error");
    }
  }

  openWhatsApp(event: Event): void {
    event.preventDefault(); event.stopPropagation();
    if (typeof window === "undefined") return;
    const cfg = this.config();
    const number = String(cfg.whatsapp || cfg.phone || "").replace(/\D/g, "");
    if (!number) return;
    const pageUrl = `${window.location.origin}${this.variant === "rental" ? "/fleet/" : "/sales/"}${this.car.id}`;
    const base = cfg.whatsappMessage?.trim() || "Merhaba, bu araç hakkında bilgi almak istiyorum.";
    const message = `${base}\n\n${this.displayTitle}\nİlan No: ${this.listingNumber}\n${pageUrl}`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
