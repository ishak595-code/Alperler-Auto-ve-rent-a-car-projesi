import { Component, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { SystemHealthService } from './services/system-health.service';
import { NewsletterSyncService } from './services/newsletter-sync.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';
import { CustomerProfileAutofillService } from './services/customer-profile-autofill.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { AnalyticsConsentComponent } from './components/analytics-consent.component';
import { BookingSuccessOverlayComponent } from './components/booking-success-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, AnalyticsConsentComponent, BookingSuccessOverlayComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <router-outlet></router-outlet>
    <app-booking-success-overlay></app-booking-success-overlay>
    @if (showCustomerChrome()) {
      <app-customer-mobile-dock></app-customer-mobile-dock>
      <app-runtime-status-gate></app-runtime-status-gate>
      <app-analytics-consent></app-analytics-consent>
    }
  `,
  styles: [`
    a[href="/admin/login"]{display:none!important}
  `],
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly systemHealth = inject(SystemHealthService);
  private readonly newsletterSync = inject(NewsletterSyncService);
  private readonly visitorAnalytics = inject(VisitorAnalyticsService);
  private readonly customerAutofill = inject(CustomerProfileAutofillService);
  readonly showCustomerChrome = signal(
    this.isCustomerRoute(typeof window !== 'undefined' ? window.location.pathname : this.router.url),
  );

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.showCustomerChrome.set(this.isCustomerRoute((event as NavigationEnd).urlAfterRedirects));
    });
  }

  ngOnInit() {
    this.seoService.init();
    this.systemHealth.start();
    void this.newsletterSync;
    this.visitorAnalytics.init();
    this.customerAutofill.start();
  }

  private isCustomerRoute(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return !path.startsWith('/admin') && !path.startsWith('/branch-portal');
  }
}
