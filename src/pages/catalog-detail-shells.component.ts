import { Component } from "@angular/core";
import { CatalogCampaignContextComponent } from "../components/catalog-campaign-context.component";
import { TourFavoriteButtonV220Component } from "../components/tour-favorite-button-v220.component";
import { CarDetailComponent } from "./car-detail.component";
import { SaleCarDetailComponent } from "./sale-car-detail.component";
import { TourDetailComponent } from "./tour-detail.component";

/**
 * V201 public-detail ownership boundary.
 *
 * Keep the approved customer UX in exactly one component per entity. Newer
 * catalogue/data/media work must be integrated into these canonical detail
 * components instead of swapping the public screen to parallel V167/V168/V170
 * presentations. This prevents data hardening from silently redesigning the
 * customer journey.
 */
@Component({
  selector: "app-rental-detail-shell",
  standalone: true,
  imports: [CarDetailComponent],
  template: `<app-car-detail />`,
})
export class RentalDetailShellComponent {}

@Component({
  selector: "app-sale-detail-shell",
  standalone: true,
  imports: [CatalogCampaignContextComponent, SaleCarDetailComponent],
  template: `<app-catalog-campaign-context targetKind="SALE" /><app-sale-car-detail />`,
})
export class SaleDetailShellComponent {}

@Component({
  selector: "app-tour-detail-shell",
  standalone: true,
  imports: [CatalogCampaignContextComponent, TourDetailComponent, TourFavoriteButtonV220Component],
  template: `<app-catalog-campaign-context targetKind="TOUR" /><app-tour-favorite-button-v220 /><app-tour-detail />`,
})
export class TourDetailShellComponent {}
