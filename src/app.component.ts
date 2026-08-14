import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { SeoService } from './services/seo.service';
import { PwaInstallComponent } from './components/pwa-install.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaInstallComponent],
  template: `<router-outlet></router-outlet><app-pwa-install></app-pwa-install>`
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.init();
  }
}
