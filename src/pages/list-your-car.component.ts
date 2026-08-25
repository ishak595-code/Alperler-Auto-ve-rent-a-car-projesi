import { Component } from "@angular/core";
import { ListYourCarV172Component } from "./list-your-car-v172.component";

@Component({
  selector: "app-list-your-car",
  standalone: true,
  imports: [ListYourCarV172Component],
  template: `<app-list-your-car-v172 />`,
})
export class ListYourCarComponent {}
