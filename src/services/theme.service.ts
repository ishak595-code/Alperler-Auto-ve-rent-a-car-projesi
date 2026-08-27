import { Injectable, signal, effect, inject } from '@angular/core';
import { PremiumThemePalette } from '../models/site-config.model';
import { CarService } from './car.service';

export type Theme = 'light' | 'dark' | 'luxury' | 'corporate';

const PREMIUM_DEFAULTS: Required<PremiumThemePalette> = {
  background: '#06080D',
  listBackground: '#090C12',
  surface: '#0D1118',
  card: '#11161E',
  elevated: '#171D26',
  border: '#303846',
  primaryBlue: '#9E1B24',
  blueLight: '#E15A62',
  brandGold: '#D4AF37',
  text: '#F8F6F1',
  textMuted: '#B8B4AA',
  textSubtle: '#81858A',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly carService = inject(CarService);
  currentTheme = signal<Theme>('light');

  constructor() {
    effect(() => {
      const config = this.carService.getConfig()();
      this.setTheme(config.theme || 'luxury');
      this.applyAppearance({
        accentColor: config.accentColor,
        pageBackground: config.pageBackground,
        premiumPalette: config.premiumPalette,
        contentMaxWidth: config.contentMaxWidth,
        cornerRadius: config.cornerRadius,
        fontScale: config.fontScale,
        motionPreference: config.motionPreference,
      });
    });
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-luxury', 'theme-corporate');
    document.body.classList.add(`theme-${theme}`);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', this.getThemeColor(theme));
  }

  private applyAppearance(config: {
    accentColor?: string;
    pageBackground?: string;
    premiumPalette?: PremiumThemePalette;
    contentMaxWidth?: number;
    cornerRadius?: number;
    fontScale?: number;
    motionPreference?: string;
  }): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const source = config.premiumPalette || {};
    const palette: Required<PremiumThemePalette> = {
      background: this.safeColor(source.background, PREMIUM_DEFAULTS.background),
      listBackground: this.safeColor(source.listBackground, PREMIUM_DEFAULTS.listBackground),
      surface: this.safeColor(source.surface, PREMIUM_DEFAULTS.surface),
      card: this.safeColor(source.card, PREMIUM_DEFAULTS.card),
      elevated: this.safeColor(source.elevated, PREMIUM_DEFAULTS.elevated),
      border: this.safeColor(source.border, PREMIUM_DEFAULTS.border),
      primaryBlue: this.safeColor(source.primaryBlue ?? config.accentColor, PREMIUM_DEFAULTS.primaryBlue),
      blueLight: this.safeColor(source.blueLight, PREMIUM_DEFAULTS.blueLight),
      brandGold: this.safeColor(source.brandGold, PREMIUM_DEFAULTS.brandGold),
      text: this.safeColor(source.text, PREMIUM_DEFAULTS.text),
      textMuted: this.safeColor(source.textMuted, PREMIUM_DEFAULTS.textMuted),
      textSubtle: this.safeColor(source.textSubtle, PREMIUM_DEFAULTS.textSubtle),
    };
    const background = this.safeColor(source.background ?? config.pageBackground, PREMIUM_DEFAULTS.background);
    const maxWidth = this.clamp(config.contentMaxWidth, 960, 1600, 1280);
    const radius = this.clamp(config.cornerRadius, 8, 28, 18);
    const scale = this.clamp(config.fontScale, .9, 1.15, 1);

    root.style.setProperty('--brand-accent', palette.primaryBlue);
    root.style.setProperty('--site-page-bg', background);
    root.style.setProperty('--site-content-max', `${Math.round(maxWidth)}px`);
    root.style.setProperty('--site-radius', `${Math.round(radius)}px`);
    root.style.setProperty('--site-font-scale', scale.toFixed(2));
    root.style.setProperty('--alper-bg', background);
    root.style.setProperty('--alper-list', palette.listBackground);
    root.style.setProperty('--alper-surface', palette.surface);
    root.style.setProperty('--alper-card', palette.card);
    root.style.setProperty('--alper-elevated', palette.elevated);
    root.style.setProperty('--alper-border', palette.border);
    root.style.setProperty('--alper-blue', palette.primaryBlue);
    root.style.setProperty('--alper-blue-light', palette.blueLight);
    root.style.setProperty('--alper-gold', palette.brandGold);
    root.style.setProperty('--alper-text', palette.text);
    root.style.setProperty('--alper-muted', palette.textMuted);
    root.style.setProperty('--alper-subtle', palette.textSubtle);

    document.body.dataset['motion'] = ['reduced', 'full'].includes(String(config.motionPreference))
      ? String(config.motionPreference)
      : 'system';
  }

  private safeColor(value: unknown, fallback: string): string {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : fallback;
  }

  private clamp(value: unknown, min: number, max: number, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  private getThemeColor(theme: Theme): string {
    const config = this.carService.getConfig()();
    const configured = config.premiumPalette?.background || config.pageBackground;
    if (/^#[0-9a-f]{6}$/i.test(String(configured || ''))) return String(configured);
    switch (theme) {
      case 'dark': return '#090C12';
      case 'luxury': return PREMIUM_DEFAULTS.background;
      case 'corporate': return '#11161E';
      default: return '#F8F6F1';
    }
  }
}
