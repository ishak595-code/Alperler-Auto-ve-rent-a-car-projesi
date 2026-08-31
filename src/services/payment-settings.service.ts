import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type PaymentProviderSetting = 'PAYTR' | 'IYZICO' | 'NONE';
export type DepositMode = 'NONE' | 'FIXED' | 'PERCENT';

export interface PaymentSettings {
  provider: PaymentProviderSetting;
  cardEnabled: boolean;
  eftEnabled: boolean;
  officeEnabled: boolean;
  depositMode: DepositMode;
  depositValue: number;
  currency: 'TRY' | 'EUR' | 'USD' | 'CHF';
  bankName: string;
  iban: string;
  accountHolder: string;
  customerNote: string;
  testMode: boolean;
}

interface ProviderStatusPayload {
  payment?: {
    providerDetails?: {
      paytr?: { configured?: boolean };
      iyzico?: { sandboxConfigured?: boolean; liveConfigured?: boolean };
    };
  };
}

const DEFAULTS: PaymentSettings = {
  provider: 'PAYTR', cardEnabled: false, eftEnabled: true, officeEnabled: true,
  depositMode: 'NONE', depositValue: 0, currency: 'TRY', bankName: '', iban: '', accountHolder: '',
  customerNote: 'Kartla online ödeme, seçili sağlayıcının sunucu anahtarları doğrulandıktan sonra aktif edilir. Havale/EFT ve teslimde ödeme seçenekleri işletme tercihine göre kullanılabilir.',
  testMode: true,
};

@Injectable({ providedIn: 'root' })
export class PaymentSettingsService {
  private readonly auth = inject(AuthService);
  private readonly adminEndpoint = '/api/partner?op=admin-core';
  private readonly providerStatusEndpoint = '/api/payments?op=provider-status';
  private readonly publicSettingsSelect = 'config_key,provider,card_enabled,eft_enabled,office_enabled,deposit_mode,deposit_value,currency,bank_name,iban,account_holder,customer_note';
  private readonly _settings = signal<PaymentSettings>({ ...DEFAULTS });
  private readonly _loading = signal(false);
  readonly settings = this._settings.asReadonly();
  readonly loading = this._loading.asReadonly();

  async refreshPublic(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/payment_settings?config_key=eq.main&select=${this.publicSettingsSelect}`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' }, cache: 'no-store',
      });
      if (!response.ok) return;
      const rows = await response.json() as any[];
      if (rows[0]) this._settings.set({ ...this.fromRow(rows[0]), testMode: true });
    } finally { this._loading.set(false); }
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${this.adminEndpoint}&view=payment-settings`, { headers: this.adminHeaders(token), cache: 'no-store' });
    const row = await response.json().catch(() => ({})) as Record<string, unknown> & { code?: string };
    if (!response.ok) throw new Error(String(row.code || `PAYMENT_SETTINGS_${response.status}`));
    this._settings.set(row['config_key'] ? this.fromRow(row) : { ...DEFAULTS });
  }

  async save(settings: PaymentSettings): Promise<void> {
    const token = await this.requiredToken();
    const value = Number(settings.depositValue || 0);
    if (!Number.isFinite(value) || value < 0) throw new Error('Depozito değeri geçerli değil.');
    if (settings.depositMode === 'PERCENT' && value > 100) throw new Error('Yüzde depozito 100 değerini geçemez.');
    if (settings.provider === 'NONE' && settings.cardEnabled) throw new Error('Kartla ödeme için PayTR veya iyzico sağlayıcısını seçin.');
    if (settings.provider === 'PAYTR' && settings.cardEnabled && settings.currency !== 'TRY') {
      throw new Error('PayTR kart tahsilatı bu entegrasyonda TRY ile çalışır. Kart açıkken para birimini TRY seçin.');
    }
    await this.assertCardProviderReady(settings);
    const response = await fetch(this.adminEndpoint, {
      method: 'PATCH',
      headers: this.adminHeaders(token),
      body: JSON.stringify({
        action: 'SAVE_PAYMENT_SETTINGS',
        provider: settings.provider,
        cardEnabled: Boolean(settings.cardEnabled),
        eftEnabled: Boolean(settings.eftEnabled),
        officeEnabled: Boolean(settings.officeEnabled),
        depositMode: settings.depositMode,
        depositValue: value,
        currency: settings.currency,
        bankName: this.clean(settings.bankName, 160) || null,
        iban: this.clean(settings.iban, 80).replace(/\s+/g, '').toUpperCase() || null,
        accountHolder: this.clean(settings.accountHolder, 180) || null,
        customerNote: this.clean(settings.customerNote, 1000) || null,
        testMode: Boolean(settings.testMode),
      }),
      cache: 'no-store',
    });
    const row = await response.json().catch(() => ({})) as Record<string, unknown> & { code?: string };
    if (!response.ok) throw new Error(String(row.code || `PAYMENT_SETTINGS_${response.status}`));
    this._settings.set(row['config_key'] ? this.fromRow(row) : { ...settings });
  }

  private async assertCardProviderReady(settings: PaymentSettings): Promise<void> {
    if (!settings.cardEnabled || settings.provider === 'NONE') return;
    const response = await fetch(this.providerStatusEndpoint, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({})) as ProviderStatusPayload;
    if (!response.ok) throw new Error('Ödeme sağlayıcısı durumu doğrulanamadı. Kartı açmadan önce bağlantıyı yeniden kontrol edin.');
    const details = payload.payment?.providerDetails;
    if (settings.provider === 'PAYTR' && details?.paytr?.configured !== true) {
      throw new Error('PayTR anahtarlarını önce Ödeme ve Depozito ekranındaki güvenli kasaya kaydedin.');
    }
    if (settings.provider === 'IYZICO' && settings.testMode && details?.iyzico?.sandboxConfigured !== true) {
      throw new Error('iyzico Sandbox anahtarlarını önce Ödeme ve Depozito ekranındaki güvenli kasaya kaydedin.');
    }
    if (settings.provider === 'IYZICO' && !settings.testMode && details?.iyzico?.liveConfigured !== true) {
      throw new Error('iyzico Canlı anahtarlarını önce Ödeme ve Depozito ekranındaki güvenli kasaya kaydedin.');
    }
  }

  private fromRow(row: any): PaymentSettings {
    return {
      provider: ['PAYTR','IYZICO','NONE'].includes(row.provider) ? row.provider : 'PAYTR',
      cardEnabled: row.card_enabled === true,
      eftEnabled: row.eft_enabled !== false,
      officeEnabled: row.office_enabled !== false,
      depositMode: ['NONE','FIXED','PERCENT'].includes(row.deposit_mode) ? row.deposit_mode : 'NONE',
      depositValue: Number(row.deposit_value || 0),
      currency: ['TRY','EUR','USD','CHF'].includes(row.currency) ? row.currency : 'TRY',
      bankName: String(row.bank_name || ''), iban: String(row.iban || ''), accountHolder: String(row.account_holder || ''),
      customerNote: String(row.customer_note || DEFAULTS.customerNote), testMode: row.test_mode !== false,
    };
  }
  private clean(value: string, max: number): string { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }
  private async requiredToken(): Promise<string> { const token = await this.auth.getAccessToken(); if (!token) throw new Error('ADMIN_SESSION_REQUIRED'); return token; }
  private adminHeaders(token:string):Record<string,string> { return { authorization:`Bearer ${token}`, accept:'application/json', 'content-type':'application/json', 'x-request-id':crypto.randomUUID() }; }
}
