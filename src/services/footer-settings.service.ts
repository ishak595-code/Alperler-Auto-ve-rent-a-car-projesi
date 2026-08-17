import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PublicContentRealtimeService } from './public-content-realtime.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export interface FooterSettings {
  isEnabled: boolean;
  brandSummary: string;
  servicesTitle: string;
  corporateTitle: string;
  legalTitle: string;
  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterButtonText: string;
  showPhone: boolean;
  showWhatsapp: boolean;
  showSocial: boolean;
  showFeedback: boolean;
  showLegalLinks: boolean;
}

const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  isEnabled: true,
  brandSummary: 'Araç kiralama, ikinci el satış, transfer ve bölgesel tur hizmetlerini tek yerde planlayın.',
  servicesTitle: 'Hizmetler',
  corporateTitle: 'Alperler Auto',
  legalTitle: 'Yasal',
  newsletterEnabled: true,
  newsletterTitle: 'Yeni araç ve fırsatları kaçırmayın',
  newsletterDescription: 'Sadece yeni ilan, tur ve kampanya olduğunda haber alın. Abonelik ücretsizdir.',
  newsletterButtonText: 'Ücretsiz Abone Ol',
  showPhone: true,
  showWhatsapp: true,
  showSocial: true,
  showFeedback: true,
  showLegalLinks: true,
};

@Injectable({ providedIn: 'root' })
export class FooterSettingsService {
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _settings = signal<FooterSettings>({ ...DEFAULT_FOOTER_SETTINGS });
  private readonly _loading = signal(false);
  private refreshTimer?: number;

  readonly settings = this._settings.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor() {
    void this.refreshPublic();
    const unwatch = this.realtime.watch(['footer_settings'], () => this.queueRefresh());
    this.destroyRef.onDestroy(() => {
      unwatch();
      if (this.refreshTimer !== undefined && typeof window !== 'undefined') window.clearTimeout(this.refreshTimer);
    });
  }

  async refreshPublic(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/footer_settings?config_key=eq.main&select=*`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const rows = await response.json() as Record<string, unknown>[];
      if (rows[0]) this._settings.set(this.fromRow(rows[0]));
    } finally {
      this._loading.set(false);
    }
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const rows = await this.rest<Record<string, unknown>[]>('GET', 'footer_settings?config_key=eq.main&select=*', undefined, token);
    this._settings.set(rows[0] ? this.fromRow(rows[0]) : { ...DEFAULT_FOOTER_SETTINGS });
  }

  async save(settings: FooterSettings): Promise<void> {
    const token = await this.requiredToken();
    const payload = {
      is_enabled: Boolean(settings.isEnabled),
      brand_summary: this.clean(settings.brandSummary, 700),
      services_title: this.clean(settings.servicesTitle, 80) || 'Hizmetler',
      corporate_title: this.clean(settings.corporateTitle, 80) || 'Alperler Auto',
      legal_title: this.clean(settings.legalTitle, 80) || 'Yasal',
      newsletter_enabled: Boolean(settings.newsletterEnabled),
      newsletter_title: this.clean(settings.newsletterTitle, 180) || 'Yeni araç ve fırsatları kaçırmayın',
      newsletter_description: this.clean(settings.newsletterDescription, 500),
      newsletter_button_text: this.clean(settings.newsletterButtonText, 80) || 'Ücretsiz Abone Ol',
      show_phone: Boolean(settings.showPhone),
      show_whatsapp: Boolean(settings.showWhatsapp),
      show_social: Boolean(settings.showSocial),
      show_feedback: Boolean(settings.showFeedback),
      show_legal_links: Boolean(settings.showLegalLinks),
      updated_at: new Date().toISOString(),
    };
    await this.rest('PATCH', 'footer_settings?config_key=eq.main', payload, token);
    await this.refreshAdmin();
  }

  private fromRow(row: Record<string, unknown>): FooterSettings {
    return {
      isEnabled: row['is_enabled'] !== false,
      brandSummary: String(row['brand_summary'] || DEFAULT_FOOTER_SETTINGS.brandSummary),
      servicesTitle: String(row['services_title'] || DEFAULT_FOOTER_SETTINGS.servicesTitle),
      corporateTitle: String(row['corporate_title'] || DEFAULT_FOOTER_SETTINGS.corporateTitle),
      legalTitle: String(row['legal_title'] || DEFAULT_FOOTER_SETTINGS.legalTitle),
      newsletterEnabled: row['newsletter_enabled'] !== false,
      newsletterTitle: String(row['newsletter_title'] || DEFAULT_FOOTER_SETTINGS.newsletterTitle),
      newsletterDescription: String(row['newsletter_description'] || DEFAULT_FOOTER_SETTINGS.newsletterDescription),
      newsletterButtonText: String(row['newsletter_button_text'] || DEFAULT_FOOTER_SETTINGS.newsletterButtonText),
      showPhone: row['show_phone'] !== false,
      showWhatsapp: row['show_whatsapp'] !== false,
      showSocial: row['show_social'] !== false,
      showFeedback: row['show_feedback'] !== false,
      showLegalLinks: row['show_legal_links'] !== false,
    };
  }

  private queueRefresh(): void {
    if (typeof window === 'undefined') { void this.refreshPublic(); return; }
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = undefined;
      void this.refreshPublic();
    }, 120);
  }

  private clean(value: string, max: number): string {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }

  private async rest<T = unknown>(method: 'GET' | 'PATCH', path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new Error(payload.message || payload.code || `FOOTER_SETTINGS_${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
