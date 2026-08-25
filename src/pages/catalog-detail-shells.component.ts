import { Component } from "@angular/core";
import { RentalDetailV167Component } from "./rental-detail-v167.component";
import { SaleCarDetailComponent } from "./sale-car-detail.component";
import { TourDetailComponent } from "./tour-detail.component";

@Component({ selector: "app-rental-detail-shell", standalone: true, imports: [RentalDetailV167Component], template: `<app-rental-detail-v167 />` })
export class RentalDetailShellComponent {}

@Component({ selector: "app-sale-detail-shell", standalone: true, imports: [SaleCarDetailComponent], template: `<app-sale-car-detail />` })
export class SaleDetailShellComponent {}

@Component({ selector: "app-tour-detail-shell", standalone: true, imports: [TourDetailComponent], template: `<app-tour-detail />` })
export class TourDetailShellComponent {}
