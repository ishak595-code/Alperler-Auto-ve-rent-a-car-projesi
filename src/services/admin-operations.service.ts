import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

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

interface AdminOperationsPayload extends Partial<AdminOperationsSnapshot> {
  ok?: boolean;
  code?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminOperationsService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = '/api/partner?op=admin-core&view=operations';

  async load(): Promise<AdminOperationsSnapshot> {
    const token = await this.requireToken();
    const response = await fetch(this.endpoint, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        'x-request-id': crypto.randomUUID(),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as AdminOperationsPayload;
    if (!response.ok || payload.ok !== true) throw new Error(payload.code || payload.message || `ADMIN_OPERATIONS_${response.status}`);

    return {
      bookings: Number(payload.bookings || 0),
      pendingBookings: Number(payload.pendingBookings || 0),
      appointments: Number(payload.appointments || 0),
      saleInquiries: Number(payload.saleInquiries || 0),
      tourBookings: Number(payload.tourBookings || 0),
      openMessages: Number(payload.openMessages || 0),
      openPartnerRequests: Number(payload.openPartnerRequests || 0),
      activeSubscribers: Number(payload.activeSubscribers || 0),
      activeStaff: Number(payload.activeStaff || 0),
      failedNotifications: Number(payload.failedNotifications || 0),
      revenue: Number(payload.revenue || 0),
      recentAudit: Array.isArray(payload.recentAudit) ? payload.recentAudit.map((row) => ({
        id: Number(row.id || 0),
        action: String(row.action || ''),
        entityType: String(row.entityType || ''),
        entityId: String(row.entityId || ''),
        actorEmail: row.actorEmail || null,
        createdAt: String(row.createdAt || ''),
      })) : [],
    };
  }

  private async requireToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }
}
