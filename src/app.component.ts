import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { SystemHealthService } from './services/system-health.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';
import { RuntimeStatusGateComponent } from './components/runtime-status-gate.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent, RuntimeStatusGateComponent],
  template: `
    <router-outlet></router-outlet>
    <app-customer-mobile-dock></app-customer-mobile-dock>
    <app-runtime-status-gate></app-runtime-status-gate>
  `
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);
  private readonly systemHealth = inject(SystemHealthService);

  ngOnInit() {
    this.seoService.init();
    this.systemHealth.start();
  }
}
