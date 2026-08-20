import { Injectable, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY, supabaseAuthUrl } from '../supabase.config';

export type CustomerSocialProvider = 'google' | 'facebook' | 'apple';

export interface CustomerUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

interface AuthPayload {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: CustomerUser;
  error?: string;
  error_code?: string;
  error_description?: string;
  code?: string;
  msg?: string;
  message?: string;
}

interface StoredCustomerSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: CustomerUser;
}

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly storageKey = 'alperler_customer_session_v1';
  private session: StoredCustomerSession | null = null;
  private readonly _ready = signal(false);
  private readonly _isLoggedIn = signal(false);
  private readonly _user = signal<CustomerUser | null>(null);
  private readonly _lastError = signal<string | null>(null);
  private readyResolver!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => (this.readyResolver = resolve));

  readonly ready = this._ready.asReadonly();
  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly user = this._user.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  constructor() { void this.initialize(); }

  async waitUntilReady(): Promise<void> { if (!this._ready()) await this.readyPromise; }

  async getAccessToken(): Promise<string | null> {
    await this.waitUntilReady();
    if (!this.session) return null;
    if (this.session.expiresAt <= Date.now() + 60_000 && !(await this.refreshSession())) return null;
    return this.session?.accessToken || null;
  }

  async signIn(email: string, password: string): Promise<boolean> {
    this._lastError.set(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return this.fail('E-posta ve parola alanlarını doldurun.');
    try {
      const response = await fetch(`${supabaseAuthUrl('token')}?grant_type=password`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({ email: cleanEmail, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok || !payload.access_token || !payload.refresh_token) return this.fail(this.authMessage(payload, 'Giriş yapılamadı.'));
      this.savePayload(payload);
      await this.ensureProfile();
      this.publishSession();
      return true;
    } catch { return this.fail('Giriş servisine şu anda ulaşılamıyor.'); }
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ created: boolean; confirmationRequired: boolean }> {
    this._lastError.set(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { created: false, confirmationRequired: !this.fail('Geçerli bir e-posta adresi girin.') };
    if (!cleanName) return { created: false, confirmationRequired: !this.fail('Ad ve soyad alanını doldurun.') };
    const passwordError = await this.validatePassword(password);
    if (passwordError) return { created: false, confirmationRequired: !this.fail(passwordError) };
    try {
      const redirectTo = `${window.location.origin}/account/callback`;
      const response = await fetch(`${supabaseAuthUrl('signup')}?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({
          email: cleanEmail, password,
          data: { full_name: cleanName, account_type: 'customer' },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok) { this.fail(this.authMessage(payload, 'Üyelik oluşturulamadı.')); return { created: false, confirmationRequired: false }; }
      if (payload.access_token && payload.refresh_token) {
        this.savePayload(payload); await this.ensureProfile(); this.publishSession();
        return { created: true, confirmationRequired: false };
      }
      return { created: true, confirmationRequired: true };
    } catch { this.fail('Üyelik servisine şu anda ulaşılamıyor.'); return { created: false, confirmationRequired: false }; }
  }

  async signInWithProvider(provider: CustomerSocialProvider): Promise<void> {
    this._lastError.set(null);
    const redirectTo = `${window.location.origin}/account/callback`;
    const url = new URL(supabaseAuthUrl('authorize'));
    url.searchParams.set('provider', provider);
    url.searchParams.set('redirect_to', redirectTo);
    if (provider === 'google') url.searchParams.set('prompt', 'select_account');
    window.location.assign(url.toString());
  }

  async resetPassword(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return this.fail('Geçerli bir e-posta adresi girin.');
    try {
      const redirectTo = `${window.location.origin}/account/login`;
      const response = await fetch(`${supabaseAuthUrl('recover')}?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({ email: cleanEmail }),
      });
      if (!response.ok) return this.fail('Parola sıfırlama e-postası gönderilemedi.');
      return true;
    } catch { return this.fail('Parola sıfırlama servisine ulaşılamıyor.'); }
  }

  async logout(): Promise<void> {
    const token = this.session?.accessToken;
    if (token) await fetch(`${supabaseAuthUrl('logout')}?scope=local`, { method: 'POST', headers: this.userHeaders(token) }).catch(() => undefined);
    this.clearSession();
  }

  async validatePassword(password: string): Promise<string | null> {
    if (password.length < 10) return 'Parola en az 10 karakter olmalı.';
    if (!/[a-zçğıöşü]/.test(password)) return 'Parolada en az bir küçük harf bulunmalı.';
    if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return 'Parolada en az bir büyük harf bulunmalı.';
    if (!/[0-9]/.test(password)) return 'Parolada en az bir rakam bulunmalı.';
    if (await this.isPwnedPassword(password)) return 'Bu parola daha önce veri sızıntılarında görülmüş. Lütfen farklı bir parola seçin.';
    return null;
  }

  private async initialize(): Promise<void> {
    try {
      this.consumeRedirectSession();
      if (!this.session) this.restoreSession();
      if (this.session) {
        if (this.session.expiresAt <= Date.now() + 60_000) await this.refreshSession();
        if (this.session) {
          const user = await this.fetchUser(this.session.accessToken);
          if (user) { this.session.user = user; this.persist(); await this.ensureProfile(); this.publishSession(); }
          else this.clearSession();
        }
      }
    } finally {
      this._ready.set(true); this.readyResolver();
    }
  }

  private consumeRedirectSession(): void {
    if (typeof window === 'undefined' || !window.location.hash.includes('access_token=')) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token') || '';
    const refreshToken = params.get('refresh_token') || '';
    if (!accessToken || !refreshToken) return;
    const expiresIn = Math.max(60, Number(params.get('expires_in') || 3600));
    this.session = { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000, user: { id: '' } };
    this.persist(); history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  }

  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(this.storageKey); if (!raw) return;
      const parsed = JSON.parse(raw) as StoredCustomerSession;
      if (parsed?.accessToken && parsed?.refreshToken && parsed?.expiresAt) this.session = parsed;
    } catch { localStorage.removeItem(this.storageKey); }
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.session?.refreshToken) return false;
    try {
      const response = await fetch(`${supabaseAuthUrl('token')}?grant_type=refresh_token`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({ refresh_token: this.session.refreshToken }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok || !payload.access_token || !payload.refresh_token) { this.clearSession(); return false; }
      this.savePayload(payload); return true;
    } catch { return false; }
  }

  private async fetchUser(token: string): Promise<CustomerUser | null> {
    const response = await fetch(supabaseAuthUrl('user'), { headers: this.userHeaders(token) }).catch(() => null);
    return response?.ok ? await response.json() as CustomerUser : null;
  }

  private async ensureProfile(): Promise<void> {
    if (!this.session?.accessToken) return;
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/ensure_customer_profile`, {
      method: 'POST', headers: this.userHeaders(this.session.accessToken), body: '{}',
    }).catch(() => null);
    if (!response?.ok) throw new Error('CUSTOMER_PROFILE_INIT_FAILED');
  }

  private savePayload(payload: AuthPayload): void {
    const accessToken = payload.access_token || ''; const refreshToken = payload.refresh_token || '';
    if (!accessToken || !refreshToken) throw new Error('CUSTOMER_SESSION_MISSING');
    this.session = {
      accessToken, refreshToken,
      expiresAt: payload.expires_at ? Number(payload.expires_at) * 1000 : Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000,
      user: payload.user || { id: '' },
    };
    this.persist();
  }

  private publishSession(): void { this._user.set(this.session?.user || null); this._isLoggedIn.set(Boolean(this.session?.user?.id)); }
  private persist(): void { if (this.session) localStorage.setItem(this.storageKey, JSON.stringify(this.session)); }
  private clearSession(): void { this.session = null; localStorage.removeItem(this.storageKey); this._user.set(null); this._isLoggedIn.set(false); }

  private publicHeaders(): Record<string, string> { return { apikey: SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' }; }
  private userHeaders(token: string): Record<string, string> { return { ...this.publicHeaders(), authorization: `Bearer ${token}` }; }
  private fail(message: string): false { this._lastError.set(message); return false; }

  private authMessage(payload: AuthPayload, fallback: string): string {
    const raw = String(payload.error_description || payload.msg || payload.message || payload.error || fallback);
    const value = raw.toLowerCase();
    if (value.includes('invalid login credentials')) return 'E-posta veya parola doğrulanamadı.';
    if (value.includes('email not confirmed')) return 'E-posta adresinizi doğruladıktan sonra giriş yapın.';
    if (value.includes('user already registered')) return 'Bu e-posta ile daha önce üyelik oluşturulmuş. Giriş yapın veya parolanızı sıfırlayın.';
    return fallback;
  }

  private async isPwnedPassword(password: string): Promise<boolean> {
    try {
      const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hash.slice(0, 5); const suffix = hash.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!response.ok) return false;
      const text = await response.text();
      return text.split(/\r?\n/).some((line) => line.split(':', 1)[0]?.trim().toUpperCase() === suffix);
    } catch { return false; }
  }
}
