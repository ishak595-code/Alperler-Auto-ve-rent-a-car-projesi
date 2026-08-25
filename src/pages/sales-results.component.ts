import { Component } from '@angular/core';
import { SalesShowcaseV168Component } from './sales-showcase-v168.component';

@Component({
  selector:'app-sales-results',standalone:true,imports:[SalesShowcaseV168Component],
  template:`<app-sales-showcase-v168 />`,
})
export class SalesResultsComponent{}
