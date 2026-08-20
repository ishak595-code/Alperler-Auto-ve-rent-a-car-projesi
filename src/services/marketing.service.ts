import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL } from '../supabase.config';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly auth = inject(AuthService);
  readonly campaigns = signal<any[]>([]);
  readonly integrations = signal<any[]>([]);
  readonly loading = signal(false);

  private async headers() {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  }

  async refresh() {
    this.loading.set(true);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/marketing-admin`, { headers: await this.headers() });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.code || 'MARKETING_READ_FAILED');
      this.campaigns.set(data.campaigns || []);
      this.integrations.set(data.integrations || []);
    } finally {
      this.loading.set(false);
    }
  }

  async saveCampaign(body: Record<string, unknown>) { return this.post({ action: 'save_campaign', ...body }); }
  async publish(id: string) { return this.post({ action: 'publish', id }); }
  configured(provider: string) { return this.integrations().find((x) => x.provider === provider)?.runtime_configured === true; }
  deliveryMode(provider: string) { return this.integrations().find((x) => x.provider === provider)?.delivery_mode || null; }
  channels(provider: string): string[] { return this.integrations().find((x) => x.provider === provider)?.channels || []; }

  private async post(body: Record<string, unknown>) {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/marketing-admin`, {
      method: 'POST', headers: await this.headers(), body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.code || 'MARKETING_ACTION_FAILED');
    return data;
  }
}
