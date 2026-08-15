import { Component } from "@angular/core";
import { PremiumVehicleResultsComponent } from "../components/premium-vehicle-results.component";

@Component({
  selector: "app-rental-results",
  standalone: true,
  imports: [PremiumVehicleResultsComponent],
  template: `<app-premium-vehicle-results mode="rental" />`,
})
export class RentalResultsComponent {}
