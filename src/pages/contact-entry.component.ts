import { Component, inject } from "@angular/core";
import { CarService } from "../services/car.service";
import { BookingCheckoutComponent } from "./booking-checkout.component";
import { ContactComponent } from "./contact.component";

@Component({
  selector: "app-contact-entry",
  standalone: true,
  imports: [BookingCheckoutComponent, ContactComponent],
  template: `@if (showCheckout) { <app-booking-checkout /> } @else { <app-contact /> }`,
})
export class ContactEntryComponent {
  private readonly carService = inject(CarService);
  readonly showCheckout = this.carService.getBookingRequest() !== null;
}
