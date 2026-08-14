import { Component } from "@angular/core";
import { ListYourCarV2Component } from "./list-your-car-v2.component";

@Component({
  selector: "app-list-your-car",
  standalone: true,
  imports: [ListYourCarV2Component],
  template: `<app-list-your-car-v2 />`,
})
export class ListYourCarComponent {}
