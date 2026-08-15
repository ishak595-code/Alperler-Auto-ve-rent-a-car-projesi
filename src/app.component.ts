import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { CustomerMobileDockComponent } from './components/customer-mobile-dock.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CustomerMobileDockComponent],
  template: `
    <router-outlet></router-outlet>
    <app-customer-mobile-dock></app-customer-mobile-dock>
  `
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.init();
  }
}
