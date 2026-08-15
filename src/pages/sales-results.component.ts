import { Component } from "@angular/core";
import { PremiumVehicleResultsComponent } from "../components/premium-vehicle-results.component";

@Component({
  selector: "app-sales-results",
  standalone: true,
  imports: [PremiumVehicleResultsComponent],
  template: `<app-premium-vehicle-results mode="sale" />`,
})
export class SalesResultsComponent {}
