import { Component } from '@angular/core';
import { TourCatalogV217Component } from './tour-catalog-v217.component';

@Component({
  selector:'app-tours',
  standalone:true,
  imports:[TourCatalogV217Component],
  template:`<app-tour-catalog-v217 />`,
})
export class ToursComponent {}
