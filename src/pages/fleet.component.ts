import { Component } from '@angular/core';
import { RentalCatalogV217Component } from './rental-catalog-v217.component';

@Component({
  selector:'app-fleet',
  standalone:true,
  imports:[RentalCatalogV217Component],
  template:`<app-rental-catalog-v217 />`,
})
export class FleetComponent {}
