import { Component } from "@angular/core";
import { TourResultsComponent } from "./tour-results.component";

@Component({
  selector: "app-tours",
  standalone: true,
  imports: [TourResultsComponent],
  template: `<app-tour-results />`,
})
export class ToursComponent {}
