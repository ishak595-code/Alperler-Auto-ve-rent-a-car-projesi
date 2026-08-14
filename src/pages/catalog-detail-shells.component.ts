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
    <app-tour-detail />
    @if (tour()) {
      <app-catalog-mixed-gallery
        entityType="TOUR"
        [entityId]="tour()!.cloudId || ''"
        [fallbackImages]="tourImages()"
        [fallbackAlt]="tour()!.title || 'Tur galerisi'"
      />
    }
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
