import { Component } from "@angular/core";
import { RentalDetailV167Component } from "./rental-detail-v167.component";
import { SaleDetailV168Component } from "./sale-detail-v168.component";
import { TourDetailComponent } from "./tour-detail.component";

@Component({ selector: "app-rental-detail-shell", standalone: true, imports: [RentalDetailV167Component], template: `<app-rental-detail-v167 />` })
export class RentalDetailShellComponent {}

@Component({ selector: "app-sale-detail-shell", standalone: true, imports: [SaleDetailV168Component], template: `<app-sale-detail-v168 />` })
export class SaleDetailShellComponent {}

@Component({ selector: "app-tour-detail-shell", standalone: true, imports: [TourDetailComponent], template: `<app-tour-detail />` })
export class TourDetailShellComponent {}
