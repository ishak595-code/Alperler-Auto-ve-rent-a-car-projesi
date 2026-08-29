import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AdminAuditRow {
  id: number;
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  entity_type: string;
  entity_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  private readonly auth = inject(AuthService);

  async list(limit = 300): Promise<AdminAuditRow[]> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('Yönetici oturumu bulunamadı.');

    const safeLimit = Math.max(1, Math.min(Math.trunc(Number(limit) || 300), 500));
    const response = await fetch(`/api/partner?op=admin-core&view=audit&limit=${safeLimit}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      data?: unknown;
    } | AdminAuditRow[];

    if (!response.ok) {
      const code = !Array.isArray(payload) ? payload.code : undefined;
      if (response.status === 401) throw new Error('Yönetici oturumunuzun süresi dolmuş. Yeniden giriş yapın.');
      if (response.status === 403) throw new Error('Bu işlem geçmişini görüntüleme yetkiniz bulunmuyor.');
      throw new Error(code ? `İşlem geçmişi yüklenemedi (${code}).` : 'İşlem geçmişi yüklenemedi.');
    }

    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data as AdminAuditRow[]
        : [];
    return rows;
  }
}
