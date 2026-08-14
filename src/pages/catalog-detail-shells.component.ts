import { Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CarDetailComponent } from "./car-detail.component";
import { SaleCarDetailComponent } from "./sale-car-detail.component";
import { TourDetailComponent } from "./tour-detail.component";
import { CatalogVideoPanelComponent } from "../components/catalog-video-panel.component";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-rental-detail-shell",
  standalone: true,
  imports: [CarDetailComponent, CatalogVideoPanelComponent],
  template: `
    <app-car-detail />
    @if (cloudId()) { <app-catalog-video-panel entityType="VEHICLE" [entityId]="cloudId()" /> }
  `,
})
export class RentalDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly cloudId = computed(() => this.cars.getAllVehicles()().find((item) => String(item.id) === this.routeId && item.category === "RENTAL")?.cloudId || "");
}

@Component({
  selector: "app-sale-detail-shell",
  standalone: true,
  imports: [SaleCarDetailComponent, CatalogVideoPanelComponent],
  template: `
    <app-sale-car-detail />
    @if (cloudId()) { <app-catalog-video-panel entityType="VEHICLE" [entityId]="cloudId()" /> }
  `,
})
export class SaleDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly cloudId = computed(() => this.cars.getAllVehicles()().find((item) => String(item.id) === this.routeId && item.category === "SALE")?.cloudId || "");
}

@Component({
  selector: "app-tour-detail-shell",
  standalone: true,
  imports: [TourDetailComponent, CatalogVideoPanelComponent],
  template: `
    <app-tour-detail />
    @if (cloudId()) { <app-catalog-video-panel entityType="TOUR" [entityId]="cloudId()" /> }
  `,
})
export class TourDetailShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly cars = inject(CarService);
  private readonly routeId = this.route.snapshot.paramMap.get("id") || "";
  readonly cloudId = computed(() => this.cars.getTours()().find((item) => String(item.id) === this.routeId)?.cloudId || "");
}
