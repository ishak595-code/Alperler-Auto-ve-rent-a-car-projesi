import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

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
    return this.rpc<AnalyticsOverview>('analytics_overview', { p_days: days });
  }

  liveSessions(limit = 100): Promise<AnalyticsLiveSession[]> {
    return this.rpc<AnalyticsLiveSession[]>('analytics_live_sessions', { p_limit: limit });
  }

  topPages(days = 7, limit = 20): Promise<AnalyticsPageRow[]> {
    return this.rpc<AnalyticsPageRow[]>('analytics_top_pages', { p_days: days, p_limit: limit });
  }

  interactions(days = 7, limit = 30): Promise<AnalyticsInteractionRow[]> {
    return this.rpc<AnalyticsInteractionRow[]>('analytics_interactions', { p_days: days, p_limit: limit });
  }

  funnels(days = 7): Promise<AnalyticsFunnelRow[]> {
    return this.rpc<AnalyticsFunnelRow[]>('analytics_funnels', { p_days: days });
  }

  deviceBreakdown(days = 7): Promise<AnalyticsDeviceBreakdown> {
    return this.rpc<AnalyticsDeviceBreakdown>('analytics_device_breakdown', { p_days: days });
  }

  timeline(sessionId: string, limit = 300): Promise<AnalyticsTimelineEvent[]> {
    return this.rpc<AnalyticsTimelineEvent[]>('analytics_session_timeline', { p_session_id: sessionId, p_limit: limit });
  }

  purge(eventDays = 180, rawIpDays = 30): Promise<{ anonymizedIpRows: number; deletedSessions: number; deletedEventsCascade: number }> {
    return this.rpc('purge_visitor_analytics', { p_event_days: eventDays, p_raw_ip_days: rawIpDays });
  }

  private async rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ANALYTICS_RPC_FAILED_${response.status}:${text.slice(0, 240)}`);
    }
    return await response.json() as T;
  }
}
