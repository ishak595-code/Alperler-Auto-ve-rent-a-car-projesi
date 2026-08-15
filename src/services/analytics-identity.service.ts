import { Injectable } from '@angular/core';
import { supabaseFunctionUrl } from '../supabase.config';
import { currentAnalyticsSessionId } from './analytics-link.util';

export type AnalyticsIdentityType = 'BOOKING' | 'CONTACT' | 'PARTNER_REQUEST' | 'SUBSCRIBER';

@Injectable({ providedIn: 'root' })
export class AnalyticsIdentityService {
  private readonly endpoint = supabaseFunctionUrl('analytics-link');

  async link(input: { entityType: AnalyticsIdentityType; reference: string; phone?: string; email?: string }): Promise<boolean> {
    const sessionId = currentAnalyticsSessionId();
    if (!sessionId || !input.reference?.trim()) return false;
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          entityType: input.entityType,
          reference: input.reference.trim().slice(0, 120),
          phone: input.phone?.trim().slice(0, 80) || undefined,
          email: input.email?.trim().toLowerCase().slice(0, 180) || undefined,
        }),
        credentials: 'omit',
        keepalive: true,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
