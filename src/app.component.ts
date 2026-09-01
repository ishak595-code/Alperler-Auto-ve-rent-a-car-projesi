import { Component, Injector, ViewEncapsulation, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { PublicContentRefreshCoordinatorService } from './services/public-content-refresh-coordinator.service';
import { DeferredRouteScrollRestorationService } from './services/deferred-route-scroll-restoration.service';
import { BookingSuccessExperienceService } from './services/booking-success-experience.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { BookingSuccessOverlayComponent } from './components/booking-success-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, BookingSuccessOverlayComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <router-outlet></router-outlet>
    @defer (when bookingSuccessExperience.result(); prefetch on idle) {
      <app-booking-success-overlay></app-booking-success-overlay>
    }
    @if (showCustomerChrome()) {
      <app-customer-mobile-dock></app-customer-mobile-dock>
      <app-runtime-status-gate></app-runtime-status-gate>
    }
  `,
  styles: [`
    a[href="/admin/login"]{display:none!important}
    app-rental-catalog-v217 .summary div>span,
    app-sale-catalog-v217 .summary div>span,
    app-tour-catalog-v217 .summary div>span{display:none!important}
  `],
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);
  readonly bookingSuccessExperience = inject(BookingSuccessExperienceService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly deferredScrollRestoration = inject(DeferredRouteScrollRestorationService);
  private publicContentRefresh?: PublicContentRefreshCoordinatorService;
  private backgroundServicesStarted = false;
  private readonly initialUrl = typeof window !== 'undefined' ? window.location.pathname : this.router.url;
  readonly showCustomerChrome = signal(this.isCustomerRoute(this.initialUrl));

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const url=(event as NavigationEnd).urlAfterRedirects;
      this.showCustomerChrome.set(this.isCustomerRoute(url));
      this.syncPublicContentRefresh(url);
    });
  }

  ngOnInit() {
    this.deferredScrollRestoration.start();
    this.seoService.init();
    this.syncPublicContentRefresh(this.initialUrl);
    this.scheduleBackgroundServices();
  }

  private scheduleBackgroundServices(): void {
    if (this.backgroundServicesStarted) return;
    const start = () => void this.startBackgroundServices();
    if (typeof window === 'undefined') { start(); return; }
    const idleWindow = window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number; };
    if (typeof idleWindow.requestIdleCallback === 'function') { idleWindow.requestIdleCallback(start, { timeout: 2000 }); return; }
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
}
