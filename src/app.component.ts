import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { SystemHealthService } from './services/system-health.service';
import { NewsletterSyncService } from './services/newsletter-sync.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';
import { AccessibilityRuntimeService } from './services/accessibility-runtime.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { AnalyticsConsentComponent } from './components/analytics-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, AnalyticsConsentComponent],
  template: `
    <router-outlet></router-outlet>
    @if (showCustomerChrome()) {
      <app-customer-mobile-dock></app-customer-mobile-dock>
      <app-runtime-status-gate></app-runtime-status-gate>
      <app-analytics-consent></app-analytics-consent>
    }
  `
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly systemHealth = inject(SystemHealthService);
  private readonly newsletterSync = inject(NewsletterSyncService);
  private readonly visitorAnalytics = inject(VisitorAnalyticsService);
  private readonly accessibilityRuntime = inject(AccessibilityRuntimeService);
  readonly showCustomerChrome = signal(this.isCustomerRoute(this.router.url));

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
    this.accessibilityRuntime.start();
  }

  private isCustomerRoute(url: string): boolean {
    const path = url.split('?')[0].split('#')[0];
    return !path.startsWith('/admin') && !path.startsWith('/branch-portal');
  }
}
