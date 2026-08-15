import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export interface AdminOperationsSnapshot {
  bookings: number;
  pendingBookings: number;
  appointments: number;
  saleInquiries: number;
  tourBookings: number;
  openMessages: number;
  openPartnerRequests: number;
  activeSubscribers: number;
  activeStaff: number;
  failedNotifications: number;
  revenue: number;
  recentAudit: Array<{ id: number; action: string; entityType: string; entityId: string; actorEmail: string | null; createdAt: string }>;
}

@Injectable({ providedIn: 'root' })
export class AdminOperationsService {
  private readonly auth = inject(AuthService);

  async load(): Promise<AdminOperationsSnapshot> {
    const token = await this.requireToken();
    const headers = this.headers(token);
    const [
      bookings,
      pendingBookings,
      appointments,
      saleInquiries,
      tourBookings,
      openMessages,
      openPartnerRequests,
      activeSubscribers,
      activeStaff,
      failedNotifications,
      bookingRows,
      auditResponse,
    ] = await Promise.all([
      this.count('bookings?deleted_at=is.null', headers),
      this.count('bookings?deleted_at=is.null&status=eq.PENDING', headers),
      this.count('bookings?deleted_at=is.null&booking_type=eq.APPOINTMENT', headers),
      this.count('bookings?deleted_at=is.null&booking_type=eq.SALE_INQUIRY', headers),
      this.count('bookings?deleted_at=is.null&booking_type=eq.TOUR', headers),
      this.count('contact_messages?status=in.(NEW,READ)', headers),
      this.count('partner_requests?status=in.(NEW,UPLOADING,REVIEWING)', headers),
      this.count('subscribers?status=eq.ACTIVE', headers),
      this.count('staff_profiles?is_active=eq.true', headers),
      this.count('notification_deliveries?status=eq.FAILED', headers),
      fetch(`${SUPABASE_PROJECT_URL}/rest/v1/bookings?deleted_at=is.null&status=neq.REJECTED&select=total_price`, { headers, signal: AbortSignal.timeout(12_000) }),
      fetch(`${SUPABASE_PROJECT_URL}/rest/v1/audit_logs?select=id,action,entity_type,entity_id,actor_email,created_at&order=created_at.desc&limit=12`, { headers, signal: AbortSignal.timeout(12_000) }),
    ]);

    if (!bookingRows.ok) throw new Error(`BOOKING_REVENUE_${bookingRows.status}`);
    if (!auditResponse.ok) throw new Error(`AUDIT_LIST_${auditResponse.status}`);
    const bookingData = await bookingRows.json();
    const auditData = await auditResponse.json();
    const revenue = (Array.isArray(bookingData) ? bookingData : []).reduce((sum: number, row: any) => sum + Number(row.total_price || 0), 0);

    return {
      bookings,
      pendingBookings,
      appointments,
      saleInquiries,
      tourBookings,
      openMessages,
      openPartnerRequests,
      activeSubscribers,
      activeStaff,
      failedNotifications,
      revenue,
      recentAudit: (Array.isArray(auditData) ? auditData : []).map((row: any) => ({
        id: Number(row.id || 0),
        action: String(row.action || ''),
        entityType: String(row.entity_type || ''),
        entityId: String(row.entity_id || ''),
        actorEmail: row.actor_email || null,
        createdAt: String(row.created_at || ''),
      })),
    };
  }

  private async count(path: string, headers: Record<string, string>): Promise<number> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}${path.includes('?') ? '&' : '?'}select=id&limit=1`, {
      method: 'GET',
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`COUNT_${response.status}_${path.split('?')[0]}`);
    const range = response.headers.get('content-range') || '';
    const match = range.match(/\/(\d+|\*)$/);
    return match && match[1] !== '*' ? Number(match[1]) : 0;
  }

  private async requireToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }

  private headers(token: string): Record<string, string> {
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
  }
}
