import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type PaymentProviderSetting = 'PAYTR' | 'GENERIC_HOSTED' | 'NONE';
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

const DEFAULTS: PaymentSettings = {
  provider: 'PAYTR', cardEnabled: false, eftEnabled: true, officeEnabled: true,
  depositMode: 'NONE', depositValue: 0, currency: 'TRY', bankName: '', iban: '', accountHolder: '',
  customerNote: 'Kartla online ödeme, sağlayıcı hesabı doğrulandıktan sonra aktif edilir. Havale/EFT ve teslimde ödeme seçenekleri işletme tercihine göre kullanılabilir.',
  testMode: true,
};

@Injectable({ providedIn: 'root' })
export class PaymentSettingsService {
  private readonly auth = inject(AuthService);
  private readonly _settings = signal<PaymentSettings>({ ...DEFAULTS });
  private readonly _loading = signal(false);
  readonly settings = this._settings.asReadonly();
  readonly loading = this._loading.asReadonly();

  async refreshPublic(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/payment_settings?config_key=eq.main&select=*`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' }, cache: 'no-store',
      });
      if (!response.ok) return;
      const rows = await response.json() as any[];
      if (rows[0]) this._settings.set(this.fromRow(rows[0]));
    } finally { this._loading.set(false); }
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>('GET', 'payment_settings?config_key=eq.main&select=*', undefined, token);
    this._settings.set(rows[0] ? this.fromRow(rows[0]) : { ...DEFAULTS });
  }

  async save(settings: PaymentSettings): Promise<void> {
    const token = await this.requiredToken();
    const value = Number(settings.depositValue || 0);
    if (!Number.isFinite(value) || value < 0) throw new Error('Depozito değeri geçerli değil.');
    if (settings.depositMode === 'PERCENT' && value > 100) throw new Error('Yüzde depozito 100 değerini geçemez.');
    const payload = {
      provider: settings.provider,
      card_enabled: Boolean(settings.cardEnabled),
      eft_enabled: Boolean(settings.eftEnabled),
      office_enabled: Boolean(settings.officeEnabled),
      deposit_mode: settings.depositMode,
      deposit_value: value,
      currency: settings.currency,
      bank_name: this.clean(settings.bankName, 160) || null,
      iban: this.clean(settings.iban, 80).replace(/\s+/g, '').toUpperCase() || null,
      account_holder: this.clean(settings.accountHolder, 180) || null,
      customer_note: this.clean(settings.customerNote, 1000) || null,
      test_mode: Boolean(settings.testMode),
      updated_at: new Date().toISOString(),
    };
    await this.rest('PATCH', 'payment_settings?config_key=eq.main', payload, token);
    await this.refreshAdmin();
  }

  private fromRow(row: any): PaymentSettings {
    return {
      provider: ['PAYTR','GENERIC_HOSTED','NONE'].includes(row.provider) ? row.provider : 'PAYTR',
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
  private async rest<T=unknown>(method:'GET'|'PATCH', path:string, body:unknown, token:string):Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, { method, headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization:`Bearer ${token}`, accept:'application/json', ...(method==='GET'?{}:{'content-type':'application/json'}) }, body: method==='GET'?undefined:JSON.stringify(body), cache:'no-store' });
    if (!response.ok) { const payload = await response.json().catch(()=>({})) as {message?:string;code?:string}; throw new Error(payload.message || payload.code || `PAYMENT_SETTINGS_${response.status}`); }
    if (response.status === 204) return undefined as T; const text = await response.text(); return (text ? JSON.parse(text) : undefined) as T;
  }
}
