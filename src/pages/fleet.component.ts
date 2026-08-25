import { Component } from "@angular/core";
import { RentalShowcaseV167Component } from "./rental-showcase-v167.component";

@Component({
  selector: "app-fleet",
  standalone: true,
  imports: [RentalShowcaseV167Component],
  template: `<app-rental-showcase-v167 />`,
})
export class FleetComponent {}
