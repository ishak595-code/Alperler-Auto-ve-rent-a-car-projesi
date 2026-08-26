import { Component, Injector, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { SystemHealthService } from './services/system-health.service';
import { NewsletterSyncService } from './services/newsletter-sync.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';
import { CustomerProfileAutofillService } from './services/customer-profile-autofill.service';
import { PublicContentRefreshCoordinatorService } from './services/public-content-refresh-coordinator.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { AnalyticsConsentComponent } from './components/analytics-consent.component';
import { BookingSuccessOverlayComponent } from './components/booking-success-overlay.component';
import { CheckoutLoyaltyPanelComponent } from './components/checkout-loyalty-panel.component';
import { AdminCustomerLifetimePanelComponent } from './components/admin-customer-lifetime-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, AnalyticsConsentComponent, BookingSuccessOverlayComponent, CheckoutLoyaltyPanelComponent, AdminCustomerLifetimePanelComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <router-outlet></router-outlet>
    <app-booking-success-overlay></app-booking-success-overlay>
    @if (showCheckoutLoyalty()) { <app-checkout-loyalty-panel></app-checkout-loyalty-panel> }
    @if (showAdminCustomer360()) { <app-admin-customer-lifetime-panel></app-admin-customer-lifetime-panel> }
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
  private readonly injector = inject(Injector);
  private readonly systemHealth = inject(SystemHealthService);
  private readonly newsletterSync = inject(NewsletterSyncService);
  private readonly visitorAnalytics = inject(VisitorAnalyticsService);
  private readonly customerAutofill = inject(CustomerProfileAutofillService);
  private publicContentRefresh?: PublicContentRefreshCoordinatorService;
  private readonly initialUrl = typeof window !== 'undefined' ? window.location.pathname : this.router.url;
  readonly showCustomerChrome = signal(this.isCustomerRoute(this.initialUrl));
  readonly showCheckoutLoyalty = signal(this.isCheckoutRoute(this.initialUrl));
  readonly showAdminCustomer360 = signal(this.isAdminCustomerDetail(this.initialUrl));

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const url=(event as NavigationEnd).urlAfterRedirects;
      this.showCustomerChrome.set(this.isCustomerRoute(url));
      this.showCheckoutLoyalty.set(this.isCheckoutRoute(url));
      this.showAdminCustomer360.set(this.isAdminCustomerDetail(url));
      this.syncPublicContentRefresh(url);
    });
  }

  ngOnInit() {
    this.seoService.init();
    this.systemHealth.start();
    void this.newsletterSync;
    this.visitorAnalytics.init();
    this.customerAutofill.start();
    this.syncPublicContentRefresh(this.initialUrl);
  }

  private syncPublicContentRefresh(url: string): void {
    if (this.isCustomerRoute(url)) {
      this.publicContentRefresh ??= this.injector.get(PublicContentRefreshCoordinatorService);
      this.publicContentRefresh.start();
      return;
    }
    this.publicContentRefresh?.stop();
  }

  private cleanPath(url:string):string{return url.split('?')[0].split('#')[0];}
  private isCustomerRoute(url: string): boolean {
    const path = this.cleanPath(url);
    return !path.startsWith('/admin') && !path.startsWith('/branch-portal');
  }
  private isCheckoutRoute(url:string):boolean{return this.cleanPath(url)==='/booking-checkout';}
  private isAdminCustomerDetail(url:string):boolean{return /^\/admin\/customers\/[0-9a-f-]{36}$/i.test(this.cleanPath(url));}
}
