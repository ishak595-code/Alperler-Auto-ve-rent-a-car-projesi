import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

interface CustomerCancelResult {
  ok?: boolean;
  reference?: string;
  status?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerBookingActionsService {
  private readonly auth = inject(CustomerAuthService);
  readonly workingReference = signal<string | null>(null);

  async cancel(reference: string): Promise<CustomerCancelResult> {
    const clean = String(reference || '').trim();
    if (!clean || clean.length > 80) throw new Error('Geçerli bir işlem referansı bulunamadı.');
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('Bu işlem için hesabınıza yeniden giriş yapmanız gerekiyor.');

    this.workingReference.set(clean);
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/customer_cancel_booking`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_reference: clean }),
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
      });
      const payload = await response.json().catch(() => ({})) as CustomerCancelResult & { message?: string; code?: string };
      if (!response.ok || payload.ok === false) throw new Error(this.message(payload.message || payload.code || 'BOOKING_CANCEL_FAILED'));
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('İptal işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.');
      throw error instanceof Error ? error : new Error('İptal işlemi tamamlanamadı.');
    } finally {
      this.workingReference.set(null);
    }
  }

  canCancel(status: string, startAt?: string | null): boolean {
    if (status !== 'PENDING' && status !== 'APPROVED') return false;
    if (status === 'APPROVED' && startAt) {
      const start = new Date(startAt);
      if (!Number.isNaN(start.getTime()) && start.getTime() <= Date.now()) return false;
    }
    return true;
  }

  private message(value: string): string {
    if (value.includes('BOOKING_ALREADY_STARTED')) return 'Başlamış bir işlem uygulama üzerinden iptal edilemez. Destek ekibiyle iletişime geçin.';
    if (value.includes('BOOKING_CANNOT_BE_CANCELLED')) return 'Bu işlem mevcut durumunda artık uygulama üzerinden iptal edilemez.';
    if (value.includes('BOOKING_NOT_FOUND')) return 'İşlem bulunamadı veya bu hesaba ait değil.';
    if (value.includes('CUSTOMER_SESSION_REQUIRED')) return 'Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.';
    return 'İptal işlemi şu anda tamamlanamadı. Lütfen tekrar deneyin.';
  }
}
