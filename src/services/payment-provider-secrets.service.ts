import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface PaytrSecretStatus {
  merchantIdSet: boolean;
  merchantKeySet: boolean;
  merchantSaltSet: boolean;
  configured: boolean;
  updatedAt: string | null;
}

export interface IyzicoSecretSetStatus {
  apiKeySet: boolean;
  secretKeySet: boolean;
  configured: boolean;
  updatedAt: string | null;
}

export interface PaymentProviderSecretStatus {
  paytr: PaytrSecretStatus;
  iyzico: {
    sandbox: IyzicoSecretSetStatus;
    live: IyzicoSecretSetStatus;
  };
}

const EMPTY_STATUS: PaymentProviderSecretStatus = {
  paytr: { merchantIdSet: false, merchantKeySet: false, merchantSaltSet: false, configured: false, updatedAt: null },
  iyzico: {
    sandbox: { apiKeySet: false, secretKeySet: false, configured: false, updatedAt: null },
    live: { apiKeySet: false, secretKeySet: false, configured: false, updatedAt: null },
  },
};

@Injectable({ providedIn: 'root' })
export class PaymentProviderSecretsService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = '/api/partner?op=admin-core';
  private readonly _status = signal<PaymentProviderSecretStatus>(structuredClone(EMPTY_STATUS));
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly status = this._status.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  async refresh(): Promise<void> {
    this._loading.set(true);
    try {
      const token = await this.requiredToken();
      const response = await fetch(`${this.endpoint}&view=payment-provider-secrets`, {
        headers: this.headers(token),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown> & { code?: string };
      if (!response.ok) throw new Error(String(payload.code || `PAYMENT_SECRET_STATUS_${response.status}`));
      this._status.set(this.normalize(payload));
    } finally {
      this._loading.set(false);
    }
  }

  async savePaytr(input: { merchantId: string; merchantKey: string; merchantSalt: string }): Promise<void> {
    const merchantId = input.merchantId.trim();
    const merchantKey = input.merchantKey.trim();
    const merchantSalt = input.merchantSalt.trim();
    if (!merchantId || merchantKey.length < 3 || merchantSalt.length < 3) throw new Error('PayTR Merchant No, Merchant Key ve Merchant Salt alanlarının üçünü de doldurun.');
    await this.patch({ action: 'SAVE_PAYMENT_PROVIDER_SECRETS', provider: 'PAYTR', scope: 'default', credentials: { merchantId, merchantKey, merchantSalt } });
  }

  async saveIyzico(scope: 'sandbox' | 'live', input: { apiKey: string; secretKey: string }): Promise<void> {
    const apiKey = input.apiKey.trim();
    const secretKey = input.secretKey.trim();
    if (apiKey.length < 3 || secretKey.length < 3) throw new Error(`iyzico ${scope === 'sandbox' ? 'Sandbox' : 'Canlı'} API Key ve Secret Key alanlarını birlikte doldurun.`);
    await this.patch({ action: 'SAVE_PAYMENT_PROVIDER_SECRETS', provider: 'IYZICO', scope, credentials: { apiKey, secretKey } });
  }

  async clear(provider: 'PAYTR' | 'IYZICO', scope: 'default' | 'sandbox' | 'live' | 'all'): Promise<void> {
    await this.patch({ action: 'CLEAR_PAYMENT_PROVIDER_SECRETS', provider, scope });
  }

  private async patch(body: Record<string, unknown>): Promise<void> {
    if (this._saving()) return;
    this._saving.set(true);
    try {
      const token = await this.requiredToken();
      const response = await fetch(this.endpoint, {
        method: 'PATCH',
        headers: this.headers(token),
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown> & { code?: string };
      if (!response.ok) throw new Error(String(payload.code || `PAYMENT_SECRET_SAVE_${response.status}`));
      this._status.set(this.normalize(payload));
    } finally {
      this._saving.set(false);
    }
  }

  private normalize(value: Record<string, unknown>): PaymentProviderSecretStatus {
    const paytr = this.object(value['paytr']);
    const iyzico = this.object(value['iyzico']);
    const sandbox = this.object(iyzico['sandbox']);
    const live = this.object(iyzico['live']);
    return {
      paytr: {
        merchantIdSet: paytr['merchantIdSet'] === true,
        merchantKeySet: paytr['merchantKeySet'] === true,
        merchantSaltSet: paytr['merchantSaltSet'] === true,
        configured: paytr['configured'] === true,
        updatedAt: this.date(paytr['updatedAt']),
      },
      iyzico: {
        sandbox: { apiKeySet: sandbox['apiKeySet'] === true, secretKeySet: sandbox['secretKeySet'] === true, configured: sandbox['configured'] === true, updatedAt: this.date(sandbox['updatedAt']) },
        live: { apiKeySet: live['apiKeySet'] === true, secretKeySet: live['secretKeySet'] === true, configured: live['configured'] === true, updatedAt: this.date(live['updatedAt']) },
      },
    };
  }

  private object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
  private date(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
  private async requiredToken(): Promise<string> { const token = await this.auth.getAccessToken(); if (!token) throw new Error('ADMIN_SESSION_REQUIRED'); return token; }
  private headers(token: string): Record<string, string> { return { authorization: `Bearer ${token}`, accept: 'application/json', 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() }; }
}
