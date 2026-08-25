import { Component } from "@angular/core";
import { TourShowcaseV169Component } from "./tour-showcase-v169.component";

@Component({
  selector: "app-tours",
  standalone: true,
  imports: [TourShowcaseV169Component],
  template: `<app-tour-showcase-v169 />`,
})
export class ToursComponent {}
