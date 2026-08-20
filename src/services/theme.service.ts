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
      this.setTheme(config.theme || 'luxury');
      this.applyAppearance({
        accentColor: config.accentColor,
        pageBackground: config.pageBackground,
        contentMaxWidth: config.contentMaxWidth,
        cornerRadius: config.cornerRadius,
        fontScale: config.fontScale,
        motionPreference: config.motionPreference,
      });
    });
  }

  setTheme(theme: Theme) {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-luxury', 'theme-corporate');
    document.body.classList.add(`theme-${theme}`);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', this.getThemeColor(theme));
  }

  private applyAppearance(config: {
    accentColor?: string;
    pageBackground?: string;
    contentMaxWidth?: number;
    cornerRadius?: number;
    fontScale?: number;
    motionPreference?: string;
  }): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const accent = this.safeColor(config.accentColor, '#2563eb');
    const background = this.safeColor(config.pageBackground, '#050914');
    const maxWidth = this.clamp(config.contentMaxWidth, 960, 1600, 1280);
    const radius = this.clamp(config.cornerRadius, 8, 28, 18);
    const scale = this.clamp(config.fontScale, .9, 1.15, 1);
    root.style.setProperty('--brand-accent', accent);
    root.style.setProperty('--site-page-bg', background);
    root.style.setProperty('--site-content-max', `${Math.round(maxWidth)}px`);
    root.style.setProperty('--site-radius', `${Math.round(radius)}px`);
    root.style.setProperty('--site-font-scale', scale.toFixed(2));
    document.body.dataset['motion'] = ['reduced','full'].includes(String(config.motionPreference)) ? String(config.motionPreference) : 'system';
  }

  private safeColor(value: unknown, fallback: string): string {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  private clamp(value: unknown, min: number, max: number, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  private getThemeColor(theme: Theme): string {
    const configured = this.carService.getConfig()().pageBackground;
    if (/^#[0-9a-f]{6}$/i.test(String(configured || ''))) return String(configured);
    switch(theme) {
      case 'dark': return '#0f172a';
      case 'luxury': return '#050914';
      case 'corporate': return '#0c4a6e';
      default: return '#f8fafc';
    }
  }
}
