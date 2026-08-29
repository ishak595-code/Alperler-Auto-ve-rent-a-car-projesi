import { Component, Injector, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { PublicContentRefreshCoordinatorService } from './services/public-content-refresh-coordinator.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { BookingSuccessOverlayComponent } from './components/booking-success-overlay.component';
import { CheckoutLoyaltyPanelComponent } from './components/checkout-loyalty-panel.component';
import { AdminCustomerLifetimePanelComponent } from './components/admin-customer-lifetime-panel.component';
import { AnalyticsConsentComponent } from './components/analytics-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, BookingSuccessOverlayComponent, CheckoutLoyaltyPanelComponent, AdminCustomerLifetimePanelComponent, AnalyticsConsentComponent],
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
  private publicContentRefresh?: PublicContentRefreshCoordinatorService;
  private backgroundServicesStarted = false;
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
    // SEO, consent and public-content freshness are user-visible startup work.
    // Observability/enrichment that is not needed to render the shell remains deferred.
    this.seoService.init();
    this.syncPublicContentRefresh(this.initialUrl);
    this.scheduleBackgroundServices();
  }

  private scheduleBackgroundServices(): void {
    if (this.backgroundServicesStarted) return;
    const start = () => void this.startBackgroundServices();

    if (typeof window === 'undefined') {
      start();
      return;
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };
    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleWindow.requestIdleCallback(start, { timeout: 2000 });
      return;
    }
    globalThis.setTimeout(start, 500);
  }

  private async startBackgroundServices(): Promise<void> {
    if (this.backgroundServicesStarted) return;
    this.backgroundServicesStarted = true;
    try {
      const [healthModule, analyticsModule, autofillModule] = await Promise.all([
        import('./services/system-health.service'),
        import('./services/visitor-analytics.service'),
        import('./services/customer-profile-autofill.service'),
      ]);
      this.injector.get(healthModule.SystemHealthService).start();
      this.injector.get(analyticsModule.VisitorAnalyticsService).init();
      this.injector.get(autofillModule.CustomerProfileAutofillService).start();
    } catch (error) {
      // Background observability/enrichment must never block the customer shell.
      console.info('Deferred customer background services could not start.', error);
    }
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
