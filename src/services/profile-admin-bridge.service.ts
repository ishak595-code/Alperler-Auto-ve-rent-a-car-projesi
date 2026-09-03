import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

export interface ProfileAdminAccess {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'support';
}

@Injectable({ providedIn: 'root' })
export class ProfileAdminBridgeService {
  private readonly auth = inject(CustomerAuthService);
  readonly access = signal<ProfileAdminAccess | null>(null);
  readonly loading = signal(false);

  async refresh(): Promise<ProfileAdminAccess | null> {
    await this.auth.waitUntilReady();
    const user = this.auth.user();
    const token = await this.auth.getAccessToken();
    if (!user?.id || !token) {
      this.access.set(null);
      return null;
    }

    this.loading.set(true);
    try {
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=user_id,email,role&limit=1`,
        {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            authorization: `Bearer ${token}`,
            accept: 'application/json',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!response.ok) {
        this.access.set(null);
        return null;
      }
      const rows = await response.json() as Array<{ user_id?: string; email?: string; role?: string }>;
      const row = rows[0];
      if (!row?.user_id) {
        this.access.set(null);
        return null;
      }
      const role = row.role === 'owner' || row.role === 'editor' || row.role === 'support' ? row.role : 'admin';
      const profile: ProfileAdminAccess = {
        userId: row.user_id,
        email: String(row.email || user.email || ''),
        role,
      };
      this.access.set(profile);
      return profile;
    } catch {
      this.access.set(null);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async openAdmin(): Promise<void> {
    const access = await this.refresh();
    if (!access) throw new Error('Bu hesapta yönetim yetkisi bulunmuyor.');
    if (typeof window === 'undefined') throw new Error('Tarayıcı oturumu kullanılamıyor.');

    // V243 boundary: a customer JWT may prove that the identity also has an admin role,
    // but it is never copied into the admin session. Super admin always authenticates
    // through the dedicated /admin/login flow and dedicated admin storage key.
    window.location.assign('/admin/login');
  }
}
