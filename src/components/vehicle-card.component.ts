import { Component, Input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { Car } from "../models/car.model";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";

@Component({
  selector: "app-vehicle-card",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TurkishCurrencyPipe],
  template: `
    <article
      class="flex flex-col p-3 sm:p-4 transition-all duration-300 bg-white w-full h-full group hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md min-w-0 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
    >
      <div
        class="w-full h-[150px] sm:h-[170px] md:h-[190px] shrink-0 relative mb-4 bg-slate-100 rounded-xl overflow-hidden"
      >
        <a
          [routerLink]="detailRoute"
          class="block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          [attr.aria-label]="detailAriaLabel"
        >
          <img
            [src]="car.images?.[0] || car.image"
            (error)="handleImageError($event)"
            loading="lazy"
            decoding="async"
            [alt]="car.brand + ' ' + car.model"
            class="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
            referrerpolicy="no-referrer"
          />
        </a>

        <div class="absolute top-2 right-2 flex flex-col gap-2 z-20">
          <button
            type="button"
            (click)="toggleFavorite($event)"
            class="w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow hover:bg-white flex items-center justify-center transition-colors group/btn focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            [attr.aria-label]="isFavorite() ? 'Favorilerden çıkar' : 'Favorilere ekle'"
            [attr.aria-pressed]="isFavorite()"
          >
            <mat-icon
              [class.text-red-500]="isFavorite()"
              class="text-slate-500 group-hover/btn:text-red-500 text-[20px] transition-colors"
            >
              {{ isFavorite() ? "favorite" : "favorite_border" }}
            </mat-icon>
          </button>
          <button
            type="button"
            (click)="shareVehicle($event)"
            class="w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow hover:bg-white flex items-center justify-center transition-colors group/btn focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            [attr.aria-label]="car.brand + ' ' + car.model + ' aracını paylaş'"
          >
            <mat-icon
              class="text-slate-500 group-hover/btn:text-blue-500 text-[20px] transition-colors"
              >share</mat-icon
            >
          </button>
        </div>

        @if (car.badge) {
          @if (car.badge === "ACİL" || car.badge.includes("ACİL")) {
            <span
              class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-widest uppercase z-10 shadow-md motion-safe:animate-pulse"
              >{{ car.badge }}</span
            >
          } @else if (car.badge === "FIRSAT" || car.badge.includes("FIRSAT")) {
            <span
              class="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-widest uppercase z-10 shadow-md"
              >{{ car.badge }}</span
            >
          } @else {
            <span
              class="absolute top-2 left-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase z-10 shadow-md"
              >{{ car.badge }}</span
            >
          }
        }
      </div>

      <div class="flex-grow flex flex-col justify-between min-w-0">
        <div class="min-w-0">
          <h3
            class="text-lg sm:text-xl font-serif font-bold text-slate-900 leading-tight mb-2 min-w-0"
          >
            <a
              [routerLink]="detailRoute"
              class="block break-words group-hover:text-blue-600 transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {{
                car.title ||
                  car.year +
                    " " +
                    car.brand +
                    " " +
                    car.model +
                    " " +
                    (car.series || "")
              }}
            </a>
          </h3>

          <div
            class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-slate-500 font-medium min-w-0"
          >
            <span class="bg-slate-100 px-2 py-1 rounded text-slate-700">{{
              car.year
            }}</span>
            @if (car.km) {
              <span class="bg-slate-100 px-2 py-1 rounded text-slate-700"
                >{{ car.km | number }} km</span
              >
            }
            @if (car.transmission) {
              <span class="bg-slate-100 px-2 py-1 rounded text-slate-700">{{
                car.transmission
              }}</span>
            }
            @if (car.fuel) {
              <span class="bg-slate-100 px-2 py-1 rounded text-slate-700"
                >{{ car.fuel }}</span
              >
            }
            @if (car.category === "RENTAL" && car.seats) {
              <span
                class="bg-slate-100 px-2 py-1 rounded text-slate-700 flex items-center"
                ><mat-icon class="text-[14px] w-[14px] h-[14px] mr-1"
                  >person</mat-icon
                >{{ car.seats }} Kişilik</span
              >
            }
            @if (car.category === "SALE" && car.damageStatus) {
              <span
                class="bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center border border-emerald-100 font-bold"
                ><mat-icon class="text-[14px] w-[14px] h-[14px] mr-1"
                  >verified</mat-icon
                >{{ car.damageStatus }}</span
              >
            }
          </div>
        </div>

        <div
          class="mt-3 mb-2 flex flex-col gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-700"
        >
          @if (variant === "rental") {
            <div class="flex items-center bg-blue-50/70 p-1.5 rounded text-blue-900">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-blue-600 shrink-0"
                >verified_user</mat-icon
              >
              <span>%100 Kaskolu & Yol Yardım</span>
            </div>
          } @else {
            <div class="flex items-center bg-emerald-50/70 p-1.5 rounded text-emerald-900">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-emerald-600 shrink-0"
                >fact_check</mat-icon
              >
              <span>101 Nokta Ekspertizli</span>
            </div>
            <div class="flex items-center bg-slate-50 p-1.5 rounded text-slate-800">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-emerald-500 shrink-0"
                >shield</mat-icon
              >
              <span>Alperler Güvencesi</span>
            </div>
          }
        </div>

        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mt-5 pt-4 border-t border-slate-100 min-w-0"
        >
          <div class="flex flex-col min-w-0">
            <div class="flex flex-wrap gap-2 mb-2">
              @if (car.category === "RENTAL") {
                <span
                  [class]="
                    car.isAvailable !== false
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  "
                  class="text-[10px] px-2 py-1 rounded w-fit border uppercase tracking-wider font-bold flex items-center"
                >
                  <span
                    class="w-2 h-2 rounded-full mr-1.5"
                    [class]="
                      car.isAvailable !== false ? 'bg-green-500' : 'bg-red-500'
                    "
                    aria-hidden="true"
                  ></span>
                  {{ car.isAvailable !== false ? "Müsait" : "Dolu" }}
                </span>
                @if (car.driverOption) {
                  <span
                    class="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-1 rounded font-bold w-fit border uppercase tracking-wider"
                  >
                    {{
                      car.driverOption === "WITH_DRIVER"
                        ? "ŞOFÖRLÜ"
                        : car.driverOption === "WITHOUT_DRIVER"
                          ? "ŞOFÖRSÜZ"
                          : "ŞOFÖRLÜ & ŞOFÖRSÜZ"
                    }}
                  </span>
                }
              } @else {
                @if (car.isAvailable === false) {
                  <span
                    class="bg-red-50 text-red-700 border-red-200 text-[10px] px-2 py-1 rounded font-bold w-fit border uppercase tracking-wider flex items-center"
                  >
                    <span class="w-2 h-2 rounded-full mr-1.5 bg-red-500" aria-hidden="true"></span>
                    Satıldı
                  </span>
                } @else {
                  <span
                    class="bg-slate-50 text-slate-700 border-slate-200 text-[10px] px-2 py-1 rounded font-bold w-fit border uppercase tracking-wider"
                  >
                    {{ t().car.premiumGallery }}
                  </span>
                }
              }
            </div>
            <div class="flex items-center text-xs sm:text-sm text-slate-500 min-w-0">
              <mat-icon class="text-[16px] w-[16px] h-[16px] mr-1 shrink-0"
                >location_on</mat-icon
              >
              <span class="truncate">{{ t().car.location }}</span>
            </div>
          </div>
          <div
            class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words"
          >
            {{ (withDriver ? car.price + 1500 : car.price) | turkishCurrency }}
            @if (car.category === "RENTAL") {
              <span class="text-sm font-normal text-slate-500 ml-1"
                >/ {{ t().car.day }}</span
              >
            }
          </div>
        </div>

        <div class="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            class="min-h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 border border-slate-900 rounded-lg text-center transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            (click)="doAction($event, 'primary')"
            [disabled]="car.isAvailable === false"
            [attr.aria-disabled]="car.isAvailable === false"
          >
            {{ buttonText }}
          </button>
          <a
            [routerLink]="detailRoute"
            class="min-h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-lg text-center transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            [attr.aria-label]="detailAriaLabel"
          >
            Detay
          </a>
        </div>
      </div>
    </article>
  `,
})
export class VehicleCardComponent {
  uiService = inject(UiService);
  carService = inject(CarService);
  router = inject(Router);
  t = this.uiService.translations;

  @Input({ required: true }) car!: Car;
  @Input() variant: "rental" | "sale" = "rental";
  @Input() withDriver = false;

  showAllFeatures = signal(false);

  get detailRoute(): (string | number)[] {
    return [this.variant === "rental" ? "/fleet" : "/sales", this.car.id];
  }

  get detailAriaLabel(): string {
    return `${this.car.year || ""} ${this.car.brand || ""} ${this.car.model || ""} detaylarını görüntüle`.trim();
  }

  handleImageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }

  doAction(event: Event, action: string) {
    event.stopPropagation();
    event.preventDefault();

    if (this.car.isAvailable === false) return;

    if (action === "primary") {
      const request = {
        type:
          this.variant === "rental"
            ? ("RENTAL" as const)
            : ("SALE_INQUIRY" as const),
        item: this.car,
        itemName: `${this.car.brand} ${this.car.model}`,
        image: this.car.images?.[0] || this.car.image,
        basePrice: this.car.price,
      };
      this.carService.setBookingRequest(request);
      this.router.navigate(["/contact"]);
    } else if (action === "whatsapp") {
      const url =
        window.location.origin +
        (this.variant === "rental" ? "/fleet/" : "/sales/") +
        this.car.id;
      const msg = this.t()
        .car.whatsappMsg.replace("{brand}", this.car.brand || "")
        .replace("{model}", this.car.model || "")
        .replace("{year}", (this.car.year || "").toString())
        .replace("{url}", url);
      window.open(
        `https://wa.me/905320000000?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  isFavorite() {
    return this.carService.isFavorite(this.car.id);
  }

  toggleFavorite(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.carService.toggleFavorite(this.car.id);
  }

  toggleFeatures(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.showAllFeatures.update((v) => !v);
  }

  shareVehicle(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (typeof navigator !== "undefined" && navigator.share && typeof window !== "undefined") {
      navigator.share({
        title: `${this.car.brand} ${this.car.model}`,
        text: `${this.car.year} model ${this.car.brand} ${this.car.model} Alperler'de!`,
        url:
          window.location.origin +
          (this.variant === "rental" ? "/fleet/" : "/sales/") +
          this.car.id,
      }).catch(() => {
        // Kullanıcı paylaşım penceresini kapatırsa hata göstermeyiz.
      });
    }
  }

  get buttonText(): string {
    if (this.car.isAvailable === false) {
      return this.variant === "rental"
        ? this.t().buttons.notAvailable || "MÜSAİT DEĞİL"
        : "SATILDI";
    }

    if (this.variant === "rental") {
      if (this.withDriver) return this.t().buttons.rentDriver;
      return this.t().home.featured.bookBtn || "HEMEN KİRALA";
    }

    return this.t().car.inspectNow || "HEMEN AL";
  }
}
