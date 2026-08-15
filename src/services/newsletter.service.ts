import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { UiService } from './ui.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from '../supabase.config';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  locale: string;
  status: 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
  source: string;
  consentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterCampaign {
  id: string;
  title: string;
  subject: string;
  status: string;
  audienceType: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface NewsletterSubscribeResult {
  existing: boolean;
  welcomeEmail: { state: string; reason?: string };
}

export interface NewsletterSendResult {
  campaignId?: string;
  complete: boolean;
  remaining: number;
  counts?: { sent: number; failed: number; skipped: number; pending: number };
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  async subscribe(email: string): Promise<NewsletterSubscribeResult> {
    const normalized = email.trim().toLowerCase();
    if (!this.validEmail(normalized)) throw new Error('INVALID_EMAIL');
    const response = await fetch(supabaseFunctionUrl('newsletter-gateway'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: normalized, locale: this.ui.currentLang().toLowerCase() }),
      signal: AbortSignal.timeout(12_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      existing?: boolean;
      welcomeEmail?: { state?: string; reason?: string };
    };
    if (!response.ok || !payload.ok) throw new Error(payload.code || `NEWSLETTER_HTTP_${response.status}`);
    return {
      existing: payload.existing === true,
      welcomeEmail: {
        state: payload.welcomeEmail?.state || 'unknown',
        reason: payload.welcomeEmail?.reason,
      },
    };
  }

  async listSubscribers(): Promise<NewsletterSubscriber[]> {
    const token = await this.requireToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/subscribers?select=id,email,locale,status,source,consent_at,created_at,updated_at&order=created_at.desc`, {
      headers: this.adminHeaders(token),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`SUBSCRIBER_LIST_${response.status}`);
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      id: String(row.id),
      email: String(row.email || ''),
      locale: String(row.locale || 'tr'),
      status: row.status,
      source: String(row.source || 'WEB'),
      consentAt: row.consent_at || null,
      createdAt: String(row.created_at || ''),
      updatedAt: String(row.updated_at || ''),
    }));
  }

  async listCampaigns(): Promise<NewsletterCampaign[]> {
    const token = await this.requireToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/newsletter_campaigns?select=id,title,subject,status,audience_type,total_recipients,sent_count,failed_count,skipped_count,created_at,completed_at,metadata&order=created_at.desc&limit=100`, {
      headers: this.adminHeaders(token),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`NEWSLETTER_CAMPAIGN_LIST_${response.status}`);
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ''),
      subject: String(row.subject || ''),
      status: String(row.status || 'DRAFT'),
      audienceType: String(row.audience_type || 'ALL'),
      totalRecipients: Number(row.total_recipients || 0),
      sentCount: Number(row.sent_count || 0),
      failedCount: Number(row.failed_count || 0),
      skippedCount: Number(row.skipped_count || 0),
      createdAt: String(row.created_at || ''),
      completedAt: row.completed_at || null,
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    }));
  }

  async sendCampaign(input: { title: string; subject: string; bodyText: string; singleEmail?: string | null }): Promise<NewsletterSendResult> {
    let result = await this.adminAction({ action: 'create_send', ...input });
    if (result.code === 'EMAIL_NOT_CONFIGURED') return result;
    let safety = 0;
    while (result.complete === false && result.remaining > 0 && result.campaignId && safety < 100) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      result = await this.adminAction({ action: 'resume', campaignId: result.campaignId });
      if (result.code === 'EMAIL_NOT_CONFIGURED') return result;
      safety += 1;
    }
    return result;
  }

  async setSubscriberStatus(email: string, status: 'ACTIVE' | 'UNSUBSCRIBED'): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!this.validEmail(normalized)) throw new Error('INVALID_EMAIL');
    const result = await this.adminAction({ action: status === 'ACTIVE' ? 'reactivate' : 'unsubscribe', email: normalized });
    if (result.code && result.code !== '') throw new Error(result.code);
  }

  private async adminAction(payload: Record<string, unknown>): Promise<NewsletterSendResult> {
    const token = await this.requireToken();
    const response = await fetch(supabaseFunctionUrl('newsletter-admin'), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await response.json().catch(() => ({}))) as NewsletterSendResult & { ok?: boolean; code?: string };
    if (!response.ok && body.code !== 'EMAIL_NOT_CONFIGURED') throw new Error(body.code || `NEWSLETTER_ADMIN_${response.status}`);
    return {
      campaignId: body.campaignId,
      complete: body.complete ?? true,
      remaining: Number(body.remaining || 0),
      counts: body.counts,
      code: body.code,
    };
  }

  private async requireToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }

  private adminHeaders(token: string): Record<string, string> {
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
  }

  private validEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 160;
  }
}
