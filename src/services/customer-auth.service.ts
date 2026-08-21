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
  private readonly referralStorageKey = 'alperler_pending_referral_v1';
  private readonly returnStorageKey = 'alperler_post_auth_return_v1';
  private session: StoredCustomerSession | null = null;
  private readonly _ready = signal(false);
  private readonly _isLoggedIn = signal(false);
  private readonly _user = signal<CustomerUser | null>(null);
  private readonly _lastError = signal<string | null>(null);
  private readonly _socialProviders = signal<Record<CustomerSocialProvider, boolean>>({ google: false, facebook: false, apple: false });
  private readyResolver!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => (this.readyResolver = resolve));

  readonly ready = this._ready.asReadonly();
  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly user = this._user.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly socialProviders = this._socialProviders.asReadonly();

  constructor() { void this.initialize(); }

  async waitUntilReady(): Promise<void> { if (!this._ready()) await this.readyPromise; }
  providerEnabled(provider: CustomerSocialProvider): boolean { return this._socialProviders()[provider] === true; }

  setPostAuthReturnUrl(url: string | null | undefined): void {
    if (typeof sessionStorage === 'undefined') return;
    const safe = this.safeReturnUrl(url);
    if (safe) sessionStorage.setItem(this.returnStorageKey, safe);
    else sessionStorage.removeItem(this.returnStorageKey);
  }

  consumePostAuthReturnUrl(fallback = '/account'): string {
    if (typeof sessionStorage === 'undefined') return fallback;
    const value = this.safeReturnUrl(sessionStorage.getItem(this.returnStorageKey));
    sessionStorage.removeItem(this.returnStorageKey);
    return value || fallback;
  }

  setPendingReferral(code: string | null | undefined): boolean {
    if (typeof localStorage === 'undefined') return false;
    const clean = String(code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{8,16}$/.test(clean)) {
      if (clean) localStorage.removeItem(this.referralStorageKey);
      return false;
    }
    localStorage.setItem(this.referralStorageKey, clean);
    return true;
  }

  pendingReferral(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const code = (localStorage.getItem(this.referralStorageKey) || '').trim().toUpperCase();
    return /^[A-Z0-9]{8,16}$/.test(code) ? code : null;
  }

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
      await this.claimPendingReferral();
      this.publishSession();
      return true;
    } catch { return this.fail('Giriş servisine şu anda ulaşılamıyor.'); }
  }

  async signUp(email: string, password: string, fullName: string): Promise<{ created: boolean; confirmationRequired: boolean }> {
    this._lastError.set(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.fail('Geçerli bir e-posta adresi girin.');
      return { created: false, confirmationRequired: false };
    }
    if (!cleanName) {
      this.fail('Ad ve soyad alanını doldurun.');
      return { created: false, confirmationRequired: false };
    }
    const passwordError = await this.validatePassword(password);
    if (passwordError) {
      this.fail(passwordError);
      return { created: false, confirmationRequired: false };
    }
    try {
      const referral = this.pendingReferral();
      const redirectTo = this.customerCallbackUrl(referral);
      const response = await fetch(`${supabaseAuthUrl('signup')}?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({
          email: cleanEmail, password,
          data: { full_name: cleanName, account_type: 'customer', ...(referral ? { referral_code: referral } : {}) },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok) { this.fail(this.authMessage(payload, 'Kayıt tamamlanamadı.')); return { created: false, confirmationRequired: false }; }
      if (payload.access_token && payload.refresh_token) {
        this.savePayload(payload);
        await this.ensureProfile();
        await this.claimPendingReferral();
        this.publishSession();
        return { created: true, confirmationRequired: false };
      }
      return { created: true, confirmationRequired: true };
    } catch { this.fail('Kayıt servisine şu anda ulaşılamıyor.'); return { created: false, confirmationRequired: false }; }
  }

  async signInWithProvider(provider: CustomerSocialProvider): Promise<void> {
    this._lastError.set(null);
    if (!this.providerEnabled(provider)) return;
    const redirectTo = this.customerCallbackUrl(this.pendingReferral());
    const url = new URL(supabaseAuthUrl('authorize'));
    url.searchParams.set('provider', provider);
    url.searchParams.set('redirect_to', redirectTo);
    if (provider === 'google') url.searchParams.set('prompt', 'select_account');
    window.location.assign(url.toString());
  }

  async resetPassword(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return this.fail('Önce geçerli e-posta adresinizi girin.');
    try {
      const redirectTo = `${window.location.origin}/account/login`;
      const response = await fetch(`${supabaseAuthUrl('recover')}?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: this.publicHeaders(), body: JSON.stringify({ email: cleanEmail }),
      });
      if (!response.ok) return this.fail('Parola yenileme e-postası gönderilemedi.');
      return true;
    } catch { return this.fail('Parola yenileme servisine ulaşılamıyor.'); }
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
      this.captureReferralFromLocation();
      await this.loadSocialProviders();
      this.consumeRedirectSession();
      if (!this.session) this.restoreSession();
      if (this.session) {
        if (this.session.expiresAt <= Date.now() + 60_000) await this.refreshSession();
        if (this.session) {
          const user = await this.fetchUser(this.session.accessToken);
          if (user) {
            this.session.user = user;
            this.persist();
            await this.ensureProfile();
            await this.claimPendingReferral();
            this.publishSession();
          } else this.clearSession();
        }
      }
    } finally {
      this._ready.set(true); this.readyResolver();
    }
  }

  private captureReferralFromLocation(): void {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('ref');
    if (code) this.setPendingReferral(code);
  }

  private async claimPendingReferral(): Promise<void> {
    const code = this.pendingReferral();
    const token = this.session?.accessToken;
    if (!code || !token) return;
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/claim_customer_referral`, {
        method: 'POST', headers: this.userHeaders(token), body: JSON.stringify({ p_code: code }),
      });
      if (response.ok) {
        localStorage.removeItem(this.referralStorageKey);
        return;
      }
      if (response.status >= 400 && response.status < 500) localStorage.removeItem(this.referralStorageKey);
    } catch {
      // Network failures keep the referral locally for the next authenticated session.
    }
  }

  private async loadSocialProviders(): Promise<void> {
    try {
      const response = await fetch(supabaseAuthUrl('settings'), { headers: this.publicHeaders() });
      if (!response.ok) return;
      const data = await response.json() as { external?: Record<string, unknown> };
      this._socialProviders.set({
        google: data.external?.['google'] === true,
        facebook: data.external?.['facebook'] === true,
        apple: data.external?.['apple'] === true,
      });
    } catch {
      this._socialProviders.set({ google: false, facebook: false, apple: false });
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

  private customerCallbackUrl(referral: string | null): string {
    const base = `${window.location.origin}/account/callback`;
    return referral ? `${base}?ref=${encodeURIComponent(referral)}` : base;
  }

  private safeReturnUrl(value: string | null | undefined): string | null {
    const raw = String(value || '').trim();
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/admin') || raw.startsWith('/branch-portal') || raw.startsWith('/account/login') || raw.startsWith('/account/callback')) return null;
    return raw.slice(0, 1200);
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
    if (value.includes('user already registered')) return 'Bu e-posta ile daha önce kayıt olunmuş. Giriş yapın veya parolanızı yenileyin.';
    return fallback;
  }

  private async isPwnedPassword(password: string): Promise<boolean> {
    try {
      const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const prefix = hash.slice(0, 5); const suffix = hash.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' } });
      if (!response.ok) return false;
      return (await response.text()).split(/\r?\n/).some((line) => line.split(':')[0] === suffix);
    } catch { return false; }
  }
}
