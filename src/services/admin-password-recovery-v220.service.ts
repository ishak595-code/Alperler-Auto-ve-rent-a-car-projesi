import { Injectable } from '@angular/core';
import { SUPABASE_PUBLISHABLE_KEY, supabaseAuthUrl } from '../supabase.config';

export interface AdminRecoveryRequestV220 {
  ok: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminPasswordRecoveryV220Service {
  async request(email: string): Promise<AdminRecoveryRequestV220> {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, message: 'Geçerli bir yönetici e-posta adresi girin.' };
    }

    try {
      const redirectTo = `${window.location.origin}/admin/login?recovery=1`;
      const response = await fetch(
        `${supabaseAuthUrl('recover')}?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email: cleanEmail }),
        },
      );

      if (response.ok) return { ok: true };
      if (response.status === 429) {
        return { ok: false, message: 'Çok fazla parola yenileme isteği yapıldı. Birkaç dakika sonra tekrar deneyin.' };
      }
      const payload = await response.json().catch(() => ({})) as { msg?: string; message?: string; error_description?: string };
      return {
        ok: false,
        message: String(payload.error_description || payload.msg || payload.message || 'Parola yenileme isteği işlenemedi.'),
      };
    } catch {
      return { ok: false, message: 'Parola yenileme servisine şu anda ulaşılamıyor.' };
    }
  }
}
