import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { CarService } from "../services/car.service";
import { ContactComponent } from "./contact.component";

@Component({
  selector: "app-contact-entry",
  standalone: true,
  imports: [ContactComponent],
  template: `
    @if (redirecting()) {
      <main class="redirect-state" role="status">Rezervasyon ekranı açılıyor...</main>
    } @else {
      <app-contact />
    }
  `,
  styles: [`
    .redirect-state{min-height:55vh;display:grid;place-items:center;background:#f8fafc;color:#475569;font:800 .85rem/1.5 ui-sans-serif,system-ui,sans-serif}
  `],
})
export class ContactEntryComponent {
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  readonly redirecting = signal(false);

  constructor() {
    const request = this.carService.getBookingRequest();
    if (!request) return;

    const previousUrl = this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString() || "";
    const cameFromBookingOrigin = /^\/(fleet|sales)(\/|$)/.test(previousUrl);

    if (cameFromBookingOrigin || !previousUrl) {
      this.redirecting.set(true);
      queueMicrotask(() => {
        void this.router.navigate(["/booking-checkout"], { replaceUrl: true });
      });
    }
  }
}
