import { Component } from "@angular/core";
import { CarDetailComponent } from "./car-detail.component";
import { SaleCarDetailComponent } from "./sale-car-detail.component";
import { TourDetailComponent } from "./tour-detail.component";

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
  imports: [SaleCarDetailComponent],
  template: `<app-sale-car-detail />`,
})
export class SaleDetailShellComponent {}

@Component({
  selector: "app-tour-detail-shell",
  standalone: true,
  imports: [TourDetailComponent],
  template: `<app-tour-detail />`,
})
export class TourDetailShellComponent {}
