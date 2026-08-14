import { Component } from "@angular/core";
import { RentalResultsComponent } from "./rental-results.component";

@Component({
  selector: "app-fleet",
  standalone: true,
  imports: [RentalResultsComponent],
  template: `<app-rental-results />`,
})
export class FleetComponent {}
