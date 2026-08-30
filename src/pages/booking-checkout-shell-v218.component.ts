import { Component } from '@angular/core';
import { BookingCheckoutComponent } from './booking-checkout.component';
import { CheckoutLoyaltyPanelComponent } from '../components/checkout-loyalty-panel.component';

@Component({
  selector: 'app-booking-checkout-shell-v218',
  standalone: true,
  imports: [BookingCheckoutComponent, CheckoutLoyaltyPanelComponent],
  template: `
    <app-booking-checkout />
    <app-checkout-loyalty-panel />
  `,
})
export class BookingCheckoutShellV218Component {}
