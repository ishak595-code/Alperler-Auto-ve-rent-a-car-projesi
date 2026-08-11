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
    <a
      [routerLink]="[variant === 'rental' ? '/fleet' : '/sales', car.id]"
      class="flex flex-col p-3 md:p-4 transition-all duration-300 bg-white w-full h-full group hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:shadow-md"
    >
      <!-- Image -->
      <div
        class="w-full h-[120px] md:h-[160px] shrink-0 relative mb-4 bg-slate-100 rounded-xl overflow-hidden"
      >
        <img
          [src]="car.images?.[0] || car.image"
          (error)="handleImageError($event)"
          loading="lazy"
          decoding="async"
          [alt]="car.brand + ' ' + car.model"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerpolicy="no-referrer"
        />

        <!-- Action Buttons overlay -->
        <div class="absolute top-2 right-2 flex flex-col gap-2 z-20">
          <button
            (click)="toggleFavorite($event)"
            class="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow hover:bg-white flex items-center justify-center transition-colors group/btn"
          >
            <mat-icon
              [class.text-red-500]="isFavorite()"
              class="text-slate-400 group-hover/btn:text-red-500 text-[18px] transition-colors"
            >
              {{ isFavorite() ? "favorite" : "favorite_border" }}
            </mat-icon>
          </button>
          <button
            (click)="shareVehicle($event)"
            class="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow hover:bg-white flex items-center justify-center transition-colors group/btn"
          >
            <mat-icon
              class="text-slate-400 group-hover/btn:text-blue-500 text-[18px] transition-colors"
              >share</mat-icon
            >
          </button>
        </div>
        @if (car.badge) {
          @if (car.badge === "ACİL" || car.badge.includes("ACİL")) {
            <span
              class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-widest uppercase z-10 shadow-md animate-pulse"
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

      <!-- Content -->
      <div class="flex-grow flex flex-col justify-between min-w-0">
        <div>
          <div class="flex justify-between items-start">
            <!-- Title -->
            <h3
              class="text-lg md:text-xl font-serif font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors"
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
            </h3>
          </div>

          <!-- Specs -->
          <div
            class="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500 font-medium"
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
              <span
                class="bg-slate-100 px-2 py-1 rounded text-slate-700 hidden sm:inline-block"
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

        <!-- Trust Elements -->
        <div
          class="mt-3 mb-2 flex flex-col gap-1.5 text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-700"
        >
          @if (variant === "rental") {
            <div class="flex items-center bg-blue-50/70 p-1.5 rounded text-blue-900">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-blue-600"
                >verified_user</mat-icon
              >
              %100 Kaskolu & Yol Yardım
            </div>
          } @else {
            <div class="flex items-center bg-emerald-50/70 p-1.5 rounded text-emerald-900">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-emerald-600"
                >fact_check</mat-icon
              >
              101 Nokta Ekspertizli
            </div>
            <div class="flex items-center bg-slate-50 p-1.5 rounded text-slate-800">
              <mat-icon
                class="text-[14px] w-[14px] h-[14px] mr-1.5 text-emerald-500"
                >shield</mat-icon
              >
              Alperler Güvencesi
            </div>
          }
        </div>

        <!-- Location & Price -->
        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-6 pt-4 border-t border-slate-100"
        >
          <div class="flex flex-col mb-4 sm:mb-0">
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
                    <span class="w-2 h-2 rounded-full mr-1.5 bg-red-500"></span>
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
            <div class="flex items-center text-xs md:text-sm text-slate-500">
              <mat-icon class="text-[16px] w-[16px] h-[16px] mr-1 shrink-0"
                >location_on</mat-icon
              >
              <span>{{ t().car.location }}</span>
            </div>
          </div>
          <div
            class="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight"
          >
            {{ (withDriver ? car.price + 1500 : car.price) | turkishCurrency }}
            @if (car.category === "RENTAL") {
              <span class="text-sm font-normal text-slate-500 ml-1"
                >/ {{ t().car.day }}</span
              >
            }
          </div>
        </div>

        <!-- Call to Actions -->
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button
            class="bg-slate-900 hover:bg-slate-800 text-white text-[10px] sm:text-xs font-bold py-2 px-2 border border-slate-900 rounded-lg text-center transition-colors flex items-center justify-center whitespace-nowrap"
            (click)="doAction($event, 'primary')"
          >
            {{ variant === "rental" ? "Kirala" : "Satın Al" }}
          </button>
          <a
            [routerLink]="[variant === 'rental' ? '/fleet' : '/sales', car.id]"
            class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-[10px] sm:text-xs font-bold py-2 px-2 rounded-lg text-center transition-colors flex items-center justify-center whitespace-nowrap"
          >
            Detay
          </a>
        </div>
      </div>
    </a>
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

  handleImageError(event: any) {
    event.target.src =
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }

  showAllFeatures = signal(false);

  doAction(event: Event, action: string) {
    event.stopPropagation();
    event.preventDefault();

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
    if (navigator.share) {
      navigator.share({
        title: `${this.car.brand} ${this.car.model}`,
        text: `${this.car.year} model ${this.car.brand} ${this.car.model} Alperler'de!`,
        url:
          window.location.origin +
          (this.variant === "rental" ? "/fleet/" : "/sales/") +
          this.car.id,
      });
    }
  }

  get buttonText(): string {
    if (this.variant === "rental") {
      if (!this.car.isAvailable) return this.t().buttons.notAvailable;
      if (this.withDriver) return this.t().buttons.rentDriver;
      return this.t().home.featured.bookBtn || "HEMEN KİRALA";
    } else {
      return this.t().car.inspectNow || "HEMEN AL";
    }
  }
}
