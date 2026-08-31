import { Component, OnDestroy, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatest, Subscription } from "rxjs";
import { CatalogCampaignContextComponent } from "../components/catalog-campaign-context.component";
import { TourFavoriteActionV2192Component } from "../components/tour-favorite-action-v2192.component";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { ResilientPublicDetailDataV2192Service } from "../services/resilient-public-detail-data-v2192.service";
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
 *
 * V219.2 also owns route-instance safety. Angular can reuse a routed shell when
 * only :id changes. The legacy detail children read their route from snapshot,
 * so a keyed child instance is recreated for each id/campaign pair instead of
 * accidentally showing or requesting the previous entity.
 */
abstract class DetailRouteKeyOwner implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly routeKey = signal(this.currentKey());
  private readonly routeSubscription: Subscription = combineLatest([
    this.route.paramMap,
    this.route.queryParamMap,
  ]).subscribe(() => this.routeKey.set(this.currentKey()));

  private currentKey(): string {
    const id = String(this.route.snapshot.paramMap.get("id") || "");
    const campaign = String(this.route.snapshot.queryParamMap.get("campaign") || "");
    return `${id}|${campaign}`;
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }
}

const detailDataProvider = {
  provide: PublicDetailDataService,
  useClass: ResilientPublicDetailDataV2192Service,
};

@Component({
  selector: "app-rental-detail-shell",
  standalone: true,
  imports: [CarDetailComponent],
  providers: [detailDataProvider],
  template: `
    @for (key of [routeKey()]; track key) {
      <app-car-detail />
    }
  `,
})
export class RentalDetailShellComponent extends DetailRouteKeyOwner {}

@Component({
  selector: "app-sale-detail-shell",
  standalone: true,
  imports: [CatalogCampaignContextComponent, SaleCarDetailComponent],
  providers: [detailDataProvider],
  template: `
    @for (key of [routeKey()]; track key) {
      <app-catalog-campaign-context targetKind="SALE" />
      <app-sale-car-detail />
    }
  `,
})
export class SaleDetailShellComponent extends DetailRouteKeyOwner {}

@Component({
  selector: "app-tour-detail-shell",
  standalone: true,
  imports: [CatalogCampaignContextComponent, TourDetailComponent, TourFavoriteActionV2192Component],
  providers: [detailDataProvider],
  template: `
    @for (key of [routeKey()]; track key) {
      <div class="tour-detail-instance">
        <app-catalog-campaign-context targetKind="TOUR" />
        <app-tour-favorite-action-v2192 />
        <app-tour-detail />
      </div>
    }
  `,
  styles: [`:host{display:block}.tour-detail-instance{position:relative}`],
})
export class TourDetailShellComponent extends DetailRouteKeyOwner {}
