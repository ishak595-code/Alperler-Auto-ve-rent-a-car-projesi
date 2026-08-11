import { Injectable, signal, effect, inject } from '@angular/core';
import { CarService } from './car.service';

export type Theme = 'light' | 'dark' | 'luxury' | 'corporate';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  carService = inject(CarService);
  currentTheme = signal<Theme>('light');

  constructor() {
    effect(() => {
      const config = this.carService.getConfig()();
      if (config.theme) {
        this.setTheme(config.theme);
      }
    });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme) {
    // Remove all theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-luxury', 'theme-corporate');
    // Add current theme class
    document.body.classList.add(`theme-${theme}`);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', this.getThemeColor(theme));
    }
  }

  private getThemeColor(theme: Theme): string {
      switch(theme) {
          case 'dark': return '#0f172a';
          case 'luxury': return '#1c1917';
          case 'corporate': return '#0c4a6e';
          default: return '#f8fafc';
      }
  }
}
