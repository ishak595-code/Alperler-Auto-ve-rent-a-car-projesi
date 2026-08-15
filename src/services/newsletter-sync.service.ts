import { Injectable, effect, inject } from '@angular/core';
import { supabaseFunctionUrl } from '../supabase.config';
import { CarService } from './car.service';
import { UiService } from './ui.service';

@Injectable({ providedIn: 'root' })
export class NewsletterSyncService {
  private readonly carService = inject(CarService);
  private readonly uiService = inject(UiService);
  private readonly subscribers = this.carService.getSubscribers();
  private readonly synced = new Set<string>();
  private readonly inFlight = new Set<string>();
  private readonly retryCount = new Map<string, number>();

  constructor() {
    effect(() => {
      const locale = this.uiService.currentLang().toLowerCase();
      for (const rawEmail of this.subscribers()) {
        const email = rawEmail.trim().toLowerCase();
        if (!this.isEmail(email) || this.synced.has(email) || this.inFlight.has(email)) continue;
        void this.sync(email, locale);
      }
    });
  }

  private async sync(email: string, locale: string): Promise<void> {
    this.inFlight.add(email);
    try {
      const response = await fetch(supabaseFunctionUrl('newsletter-gateway'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale }),
        signal: AbortSignal.timeout(12_000),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.code || `NEWSLETTER_HTTP_${response.status}`);
      this.synced.add(email);
      this.retryCount.delete(email);
    } catch (error) {
      console.error('Newsletter cloud sync failed', error);
      const attempts = (this.retryCount.get(email) || 0) + 1;
      this.retryCount.set(email, attempts);
      if (attempts <= 3 && typeof window !== 'undefined') {
        const delay = Math.min(30_000, 2_000 * 2 ** (attempts - 1));
        window.setTimeout(() => {
          if (!this.synced.has(email) && !this.inFlight.has(email)) void this.sync(email, locale);
        }, delay);
      }
    } finally {
      this.inFlight.delete(email);
    }
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 160;
  }
}
