import { Component } from "@angular/core";
import { TourShowcaseV170Component } from "./tour-showcase-v170.component";

@Component({
  selector: "app-tours",
  standalone: true,
  imports: [TourShowcaseV170Component],
  template: `<app-tour-showcase-v170 />`,
})
export class ToursComponent {}
