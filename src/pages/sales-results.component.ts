import { Component } from '@angular/core';
import { SaleCatalogV217Component } from './sale-catalog-v217.component';

@Component({
  selector:'app-sales-results',
  standalone:true,
  imports:[SaleCatalogV217Component],
  template:`<app-sale-catalog-v217 />`,
})
export class SalesResultsComponent {}
