import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { SystemHealthService } from './services/system-health.service';
import { NewsletterSyncService } from './services/newsletter-sync.service';
import { VisitorAnalyticsService } from './services/visitor-analytics.service';
import { AccessibilityRuntimeService } from './services/accessibility-runtime.service';
import { LiveContentSyncService } from './services/live-content-sync.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';
import { AnalyticsConsentComponent } from './components/analytics-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent, AnalyticsConsentComponent],
  template: `
    <router-outlet></router-outlet>
    <app-customer-mobile-dock></app-customer-mobile-dock>
    <app-runtime-status-gate></app-runtime-status-gate>
    <app-analytics-consent></app-analytics-consent>
  `
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);
  private readonly systemHealth = inject(SystemHealthService);
  private readonly newsletterSync = inject(NewsletterSyncService);
  private readonly visitorAnalytics = inject(VisitorAnalyticsService);
  private readonly accessibilityRuntime = inject(AccessibilityRuntimeService);
  private readonly liveContentSync = inject(LiveContentSyncService);

  ngOnInit() {
    this.seoService.init();
    this.systemHealth.start();
    void this.newsletterSync;
    this.visitorAnalytics.init();
    this.accessibilityRuntime.start();
    this.liveContentSync.start();
  }
}
