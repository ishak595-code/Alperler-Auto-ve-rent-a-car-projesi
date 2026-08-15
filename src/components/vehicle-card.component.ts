import { CommonModule } from "@angular/common";
import { Component, Input, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterModule } from "@angular/router";
import { Car } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-vehicle-card",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TurkishCurrencyPipe],
  template: `
    <article class="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-4 focus-within:ring-blue-500/30" [attr.aria-labelledby]="titleId">
      <div class="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <a [routerLink]="detailRoute" class="block h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-600" [attr.aria-label]="detailAriaLabel">
          <img [src]="car.images?.[0] || car.image" (error)="handleImageError($event)" loading="lazy" decoding="async" [alt]="imageAlt" class="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-105" referrerpolicy="no-referrer" />
        </a>

        <div class="absolute right-3 top-3 z-20 flex gap-2">
          <button type="button" (click)="toggleFavorite($event)" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600" [attr.aria-label]="favoriteAriaLabel" [attr.aria-pressed]="isFavorite()">
            <mat-icon aria-hidden="true" [class.text-red-500]="isFavorite()">{{ isFavorite() ? 'favorite' : 'favorite_border' }}</mat-icon>
          </button>
          <button type="button" (click)="shareVehicle($event)" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600" [attr.aria-label]="displayTitle + ' aracını paylaş'">
            <mat-icon aria-hidden="true">share</mat-icon>
          </button>
        </div>

        @if (car.badge) { <span class="absolute left-3 top-3 z-10 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">{{ car.badge }}</span> }
        <span class="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow" [class.bg-emerald-500]="car.isAvailable !== false" [class.text-slate-950]="car.isAvailable !== false" [class.bg-rose-600]="car.isAvailable === false" [class.text-white]="car.isAvailable === false">
          {{ availabilityLabel }}
        </span>
      </div>

      <div class="flex flex-1 flex-col p-4 sm:p-5">
        <div class="flex-1">
          <p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{{ variant === 'rental' ? 'Kiralık Araç' : 'İkinci El Satılık' }}</p>
          <h3 [id]="titleId" class="mt-1 text-xl font-black leading-tight text-slate-950">
            <a [routerLink]="detailRoute" class="rounded focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500" [attr.aria-label]="detailAriaLabel">{{ displayTitle }}</a>
          </h3>

          <dl class="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            @if (car.year) { <div class="fact"><dt>Yıl</dt><dd>{{ car.year }}</dd></div> }
            @if (car.transmission) { <div class="fact"><dt>Vites</dt><dd>{{ car.transmission }}</dd></div> }
            @if (car.fuel) { <div class="fact"><dt>Yakıt</dt><dd>{{ car.fuel }}</dd></div> }
            @if (variant === 'sale' && car.km != null) { <div class="fact"><dt>KM</dt><dd>{{ car.km | number }}</dd></div> }
            @if (variant === 'rental' && car.seats) { <div class="fact"><dt>Koltuk</dt><dd>{{ car.seats }} kişi</dd></div> }
            @if (variant === 'sale' && car.damageStatus) { <div class="fact"><dt>Hasar</dt><dd>{{ car.damageStatus }}</dd></div> }
          </dl>

          @if (variant === 'rental') {
            <div class="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-bold text-blue-950">
              @if (car.driverOption) { <p>{{ driverLabel }}</p> }
              @if (car.dailyMileageLimit) { <p class="mt-1">Günlük {{ car.dailyMileageLimit }} km kullanım limiti</p> }
              @if (car.minAge || car.minLicenseYears) { <p class="mt-1">@if (car.minAge) { Minimum yaş {{ car.minAge }} } @if (car.minLicenseYears) { · En az {{ car.minLicenseYears }} yıllık ehliyet }</p> }
            </div>
          } @else {
            <div class="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-950">
              <p>Ekspertiz ve araç detayları talep ekranında korunur.</p>
              @if (car.color) { <p class="mt-1">Renk: {{ car.color }}</p> }
              @if (car.warranty || car.hasWarranty) { <p class="mt-1">Garanti: {{ car.warranty || 'Var' }}</p> }
            </div>
          }
        </div>

        <div class="mt-5 border-t border-slate-100 pt-4">
          <div class="flex items-end justify-between gap-3">
            <div class="min-w-0 text-sm text-slate-500"><mat-icon aria-hidden="true" class="mr-1 align-middle !text-[16px]">location_on</mat-icon><span>{{ car.location || carService.getConfig()().address }}</span></div>
            <div class="shrink-0 text-right"><strong class="block text-2xl font-black text-slate-950">{{ (withDriver ? car.price + 1500 : car.price) | turkishCurrency }}</strong>@if (variant === 'rental') { <span class="text-xs font-bold text-slate-500">günlük</span> }</div>
          </div>

          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" (click)="doAction($event, 'primary')" [disabled]="car.isAvailable === false" class="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500" [attr.aria-label]="primaryAriaLabel" [attr.aria-disabled]="car.isAvailable === false">
              {{ buttonText }}
            </button>
            <a [routerLink]="detailRoute" class="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500" [attr.aria-label]="detailAriaLabel">Araç Detaylarını Gör</a>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .fact{border:1px solid rgb(226 232 240);border-radius:12px;background:rgb(248 250 252);padding:8px 10px}.fact dt{font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(100 116 139)}.fact dd{margin-top:2px;font-weight:800;color:rgb(15 23 42)}
  `],
})
export class VehicleCardComponent {
  readonly carService = inject(CarService);
  private readonly router = inject(Router);

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";
  @Input() withDriver = false;

  get displayTitle(): string {
    return this.car.title?.trim() || [this.car.year, this.car.brand, this.car.model, this.car.series].filter(Boolean).join(" ") || "Araç ilanı";
  }

  get titleId(): string { return `vehicle-card-title-${String(this.car.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
  get detailRoute(): (string | number)[] { return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id]; }
  get imageAlt(): string { return `${this.displayTitle}, ${this.variant === "rental" ? "kiralık" : "satılık"} araç`; }
  get detailAriaLabel(): string { return `${this.displayTitle} ${this.variant === "rental" ? "kiralık araç" : "ikinci el satılık araç"} detaylarını görüntüle`; }
  get favoriteAriaLabel(): string { return `${this.displayTitle} aracını ${this.isFavorite() ? "favorilerden çıkar" : "favorilere ekle"}`; }
  get primaryAriaLabel(): string { return `${this.displayTitle} için ${this.buttonText.toLocaleLowerCase("tr-TR")}`; }
  get availabilityLabel(): string { return this.car.isAvailable === false ? (this.variant === "rental" ? "Müsait Değil" : "Satıldı") : (this.variant === "rental" ? "Müsait" : "Satışta"); }
  get driverLabel(): string { return this.car.driverOption === "WITH_DRIVER" ? "Yalnız şoförlü kiralama" : this.car.driverOption === "WITHOUT_DRIVER" ? "Şoförsüz kiralama" : this.car.driverOption === "BOTH" ? "Şoförlü veya şoförsüz kiralama" : ""; }

  get buttonText(): string {
    if (this.car.isAvailable === false) return this.variant === "rental" ? "Müsait Değil" : "Satıldı";
    if (this.variant === "rental") return this.withDriver ? "Şoförlü Rezervasyon Oluştur" : "Rezervasyon Oluştur";
    return "Satın Alma Talebi Gönder";
  }

  handleImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }

  doAction(event: Event, action: string): void {
    event.stopPropagation(); event.preventDefault();
    if (this.car.isAvailable === false || action !== "primary") return;
    this.carService.setBookingRequest({
      type: this.variant === "rental" ? "RENTAL" : "SALE_INQUIRY",
      item: this.car,
      itemName: `${this.car.brand || ""} ${this.car.model || ""}`.trim() || this.displayTitle,
      image: this.car.images?.[0] || this.car.image,
      basePrice: this.car.price,
      withDriver: this.variant === "rental" ? this.withDriver : undefined,
    });
    void this.router.navigate(["/contact"]);
  }

  isFavorite(): boolean { return this.carService.isFavorite(this.car.id); }

  toggleFavorite(event: Event): void {
    event.stopPropagation(); event.preventDefault();
    this.carService.toggleFavorite(this.car.id);
  }

  shareVehicle(event: Event): void {
    event.stopPropagation(); event.preventDefault();
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${this.variant === "rental" ? "/fleet/" : "/sales/"}${this.car.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: this.displayTitle, text: `${this.displayTitle} Alperler Auto ilanı`, url }).catch(() => undefined);
      return;
    }
    if (navigator.clipboard) void navigator.clipboard.writeText(url);
  }
}
