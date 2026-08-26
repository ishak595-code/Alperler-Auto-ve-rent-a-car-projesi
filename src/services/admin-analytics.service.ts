import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AnalyticsOverview {
  sessions: number;
  visitors: number;
  pageviews: number;
  clicks: number;
  errors: number;
  formStarts: number;
  formSubmits: number;
  formAbandons: number;
  liveNow: number;
  avgMaxScroll: number;
}

export interface AnalyticsLiveSession {
  session_id: string;
  visitor_id: string;
  started_at: string;
  last_seen_at: string;
  ended_at?: string | null;
  landing_path: string;
  exit_path: string;
  referrer?: string | null;
  locale?: string | null;
  timezone?: string | null;
  device_type: string;
  device_model?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  browser_name?: string | null;
  browser_version?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  event_count: number;
  pageview_count: number;
  click_count: number;
  error_count: number;
  form_start_count: number;
  form_submit_count: number;
  form_abandon_count: number;
  max_scroll_depth: number;
  ip_address?: string | null;
  country_code?: string | null;
  country_region?: string | null;
  city?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  edge_timezone?: string | null;
  user_agent?: string | null;
  known_name?: string | null;
  known_phone?: string | null;
  known_email?: string | null;
  customer_reference?: string | null;
}

export interface AnalyticsPageRow { path: string; views: number; sessions: number; }
export interface AnalyticsInteractionRow { label: string; element_key?: string; path: string; interactions: number; rage_clicks: number; }
export interface AnalyticsFunnelRow { funnel_name: string; funnel_step: string; event_type: string; events: number; sessions: number; }
export interface AnalyticsBreakdownRow { label: string; sessions: number; }
export interface AnalyticsDeviceBreakdown { devices: AnalyticsBreakdownRow[]; browsers: AnalyticsBreakdownRow[]; countries: AnalyticsBreakdownRow[]; }
export interface AnalyticsTimelineEvent {
  id: number;
  event_type: string;
  path: string;
  page_title?: string;
  element_key?: string;
  element_label?: string;
  element_role?: string;
  scroll_depth?: number;
  funnel_name?: string;
  funnel_step?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly auth = inject(AuthService);

  overview(days = 7): Promise<AnalyticsOverview> {
    return this.query<AnalyticsOverview>({ view: 'OVERVIEW', days });
  }

  liveSessions(limit = 100): Promise<AnalyticsLiveSession[]> {
    return this.query<AnalyticsLiveSession[]>({ view: 'LIVE_SESSIONS', limit });
  }

  topPages(days = 7, limit = 20): Promise<AnalyticsPageRow[]> {
    return this.query<AnalyticsPageRow[]>({ view: 'TOP_PAGES', days, limit });
  }

  interactions(days = 7, limit = 30): Promise<AnalyticsInteractionRow[]> {
    return this.query<AnalyticsInteractionRow[]>({ view: 'INTERACTIONS', days, limit });
  }

  funnels(days = 7): Promise<AnalyticsFunnelRow[]> {
    return this.query<AnalyticsFunnelRow[]>({ view: 'FUNNELS', days });
  }

  deviceBreakdown(days = 7): Promise<AnalyticsDeviceBreakdown> {
    return this.query<AnalyticsDeviceBreakdown>({ view: 'DEVICE_BREAKDOWN', days });
  }

  timeline(sessionId: string, limit = 300): Promise<AnalyticsTimelineEvent[]> {
    return this.query<AnalyticsTimelineEvent[]>({ view: 'TIMELINE', sessionId, limit });
  }

  purge(eventDays = 180, rawIpDays = 30): Promise<{ anonymizedIpRows: number; deletedSessions: number; deletedEventsCascade: number }> {
    return this.query({ view: 'PURGE', eventDays, rawIpDays });
  }

  private async query<T>(payload: Record<string, unknown>): Promise<T> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    const response = await fetch('/api/partner?op=analytics-admin', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; data?: T };
    if (!response.ok || !body.ok || body.data === undefined) throw new Error(body.code || `ANALYTICS_HTTP_${response.status}`);
    return body.data;
  }
}
