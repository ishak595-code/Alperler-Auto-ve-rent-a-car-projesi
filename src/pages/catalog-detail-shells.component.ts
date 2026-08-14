import { Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CarDetailComponent } from "./car-detail.component";
import { SaleCarDetailComponent } from "./sale-car-detail.component";
import { TourDetailComponent } from "./tour-detail.component";
import { CatalogMixedGalleryComponent } from "../components/catalog-mixed-gallery.component";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-rental-detail-shell",
  standalone: true,
  imports: [CarDetailComponent, CatalogMixedGalleryComponent],
  template: `
    <app-car-detail />
    @if (vehicle()) {
      <app-catalog-mixed-gallery
        entityType="VEHICLE"
        [entityId]="vehicle()!.cloudId || ''"
        [fallbackImages]="vehicleImages()"
        [fallbackAlt]="(vehicle()!.brand || '') + ' ' + (vehicle()!.model || '')"
      />
    }
  `,
})
export class RentalDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly vehicle = computed(() => this.cars.getAllVehicles()().find((item) => String(item.id) === this.routeId && item.category === "RENTAL"));
  readonly vehicleImages = computed(() => this.collectImages(this.vehicle()));
  private collectImages(item: any): string[] { return Array.from(new Set([item?.image, ...(item?.images || []), ...(item?.gallery || [])].filter(Boolean))); }
}

@Component({
  selector: "app-sale-detail-shell",
  standalone: true,
  imports: [SaleCarDetailComponent, CatalogMixedGalleryComponent],
  template: `
    <app-sale-car-detail />
    @if (vehicle()) {
      <app-catalog-mixed-gallery
        entityType="VEHICLE"
        [entityId]="vehicle()!.cloudId || ''"
        [fallbackImages]="vehicleImages()"
        [fallbackAlt]="(vehicle()!.brand || '') + ' ' + (vehicle()!.model || '')"
      />
    }
  `,
})
export class SaleDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly vehicle = computed(() => this.cars.getAllVehicles()().find((item) => String(item.id) === this.routeId && item.category === "SALE"));
  readonly vehicleImages = computed(() => this.collectImages(this.vehicle()));
  private collectImages(item: any): string[] { return Array.from(new Set([item?.image, ...(item?.images || []), ...(item?.gallery || [])].filter(Boolean))); }
}

@Component({
  selector: "app-tour-detail-shell",
  standalone: true,
  imports: [TourDetailComponent, CatalogMixedGalleryComponent],
  template: `
    <div class="relative">
      <app-tour-detail />
      @if (tour()) {
        <app-catalog-mixed-gallery
          #tourGallery
          entityType="TOUR"
          [entityId]="tour()!.cloudId || ''"
          [fallbackImages]="tourImages()"
          [fallbackAlt]="tour()!.title || 'Tur galerisi'"
          [hideLauncher]="true"
        />
        <button
          type="button"
          (click)="tourGallery.open(0, $event)"
          class="absolute left-0 right-0 top-16 z-30 h-[40vh] min-h-[300px] cursor-zoom-in bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500 sm:h-[50vh]"
          [attr.aria-label]="(tour()!.title || 'Tur') + ' fotoğraf ve video galerisini tam ekran aç'"
        >
          <span class="absolute bottom-5 right-4 inline-flex min-h-11 items-center rounded-full border border-white/30 bg-black/65 px-4 text-xs font-black text-white shadow-xl backdrop-blur sm:right-8">
            Galeriyi Tam Ekran Aç
          </span>
        </button>
      }
    </div>
  `,
})
export class TourDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly tour = computed(() => this.cars.getTours()().find((item) => String(item.id) === this.routeId));
  readonly tourImages = computed(() => this.collectImages(this.tour()));
  private collectImages(item: any): string[] { return Array.from(new Set([item?.image, ...(item?.images || []), ...(item?.gallery || [])].filter(Boolean))); }
}
