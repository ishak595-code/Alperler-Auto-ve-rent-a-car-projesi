import { Component } from "@angular/core";
import { RentalDetailV167Component } from "./rental-detail-v167.component";
import { SaleDetailV1681Component } from "./sale-detail-v1681.component";
import { TourDetailV170Component } from "./tour-detail-v170.component";

@Component({ selector: "app-rental-detail-shell", standalone: true, imports: [RentalDetailV167Component], template: `<app-rental-detail-v167 />` })
export class RentalDetailShellComponent {}

@Component({ selector: "app-sale-detail-shell", standalone: true, imports: [SaleDetailV1681Component], template: `<app-sale-detail-v1681 />` })
export class SaleDetailShellComponent {}

@Component({ selector: "app-tour-detail-shell", standalone: true, imports: [TourDetailV170Component], template: `<app-tour-detail-v170 />` })
export class TourDetailShellComponent {}
