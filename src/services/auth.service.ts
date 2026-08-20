import { Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import {
  PRIMARY_ADMIN_EMAIL,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabaseAuthUrl,
  supabaseFunctionUrl,
} from "../supabase.config";

interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
}

interface AuthPayload {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseUser;
  error?: string;
  error_code?: string;
  error_description?: string;
  code?: string;
  msg?: string;
  message?: string;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SupabaseUser;
}

export interface PrimaryAdminRegistrationResult {
  created: boolean;
  confirmationRequired: boolean;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly storageKey = "alperler_admin_session_v1";
  private readonly _isLoggedIn = signal(false);
  private readonly _userEmail = signal<string | null>(null);
  private readonly _authReady = signal(false);
  private readonly _lastErrorCode = signal<string | null>(null);
  private readonly _lastErrorMessage = signal<string | null>(null);
  private readonly _currentUser = signal<SupabaseUser | null>(null);
  private session: StoredSession | null = null;
  private readyResolver!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.readyResolver = resolve;
  });

  constructor(private router: Router) {
    void this.initialize();
  }

  get isLoggedIn() {
    return this._isLoggedIn.asReadonly();
  }

  get lastErrorCode() {
    return this._lastErrorCode.asReadonly();
  }

  get lastErrorMessage() {
    return this._lastErrorMessage.asReadonly();
  }

  async waitUntilReady(): Promise<void> {
    if (this._authReady()) return;
    await this.readyPromise;
  }

  async getAccessToken(): Promise<string | null> {
    await this.waitUntilReady();
    if (!this.session) return null;
    if (this.session.expiresAt <= Date.now() + 60_000) {
      const refreshed = await this.refreshSession();
      if (!refreshed) return null;
    }
    return this.session?.accessToken || null;
  }

  async login(email: string, password: string): Promise<boolean> {
    this.clearError();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      this.setError("invalid_credentials", "E-posta ve şifre alanlarını doldurun.");
      return false;
    }

    try {
      const response = await fetch(`${supabaseAuthUrl("token")}?grant_type=password`, {
        method: "POST",
        headers: this.publicHeaders(),
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok || !payload.access_token || !payload.refresh_token) {
        this.capturePayloadError(payload, "E-posta veya şifre doğrulanamadı.");
        return false;
      }

      this.savePayloadSession(payload);
      const allowed = await this.ensureAdminAccess();
      if (!allowed) {
        await this.clearSession(false);
        if (!this._lastErrorMessage()) {
          this.setError("forbidden", "Bu hesap Alperler Rent A Car yönetici yetkisine sahip değil.");
        }
        return false;
      }
      return true;
    } catch (error) {
      this.captureError(error, "Yönetici giriş servisine ulaşılamadı.");
      return false;
    }
  }

  async registerPrimaryAdmin(password: string): Promise<PrimaryAdminRegistrationResult> {
    this.clearError();
    const validationError = this.validateStrongPassword(password);
    if (validationError) {
      this.setError("weak_password", validationError);
      return { created: false, confirmationRequired: false };
    }
    if (!(await this.ensurePasswordNotPwned(password))) {
      return { created: false, confirmationRequired: false };
    }

    try {
      const redirectTo = this.adminLoginRedirect();
      const response = await fetch(
        `${supabaseAuthUrl("signup")}?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: "POST",
          headers: this.publicHeaders(),
          body: JSON.stringify({
            email: PRIMARY_ADMIN_EMAIL,
            password,
            data: { display_name: "İshak Alper" },
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok) {
        this.capturePayloadError(payload, "İlk yönetici hesabı oluşturulamadı.");
        return { created: false, confirmationRequired: false };
      }

      if (payload.access_token && payload.refresh_token) {
        this.savePayloadSession(payload);
        const allowed = await this.ensureAdminAccess();
        if (!allowed) {
          return { created: true, confirmationRequired: true };
        }
        return { created: true, confirmationRequired: false };
      }

      this.setError(
        "confirmation_required",
        `Hesap oluşturuldu. E-postadaki doğrulama bağlantısı sizi ${redirectTo} adresine geri getirecek. Doğruladıktan sonra giriş yapın.`,
      );
      return { created: true, confirmationRequired: true };
    } catch (error) {
      this.captureError(error, "İlk yönetici hesabı oluşturulamadı.");
      return { created: false, confirmationRequired: false };
    }
  }

  async loginWithGoogle(): Promise<boolean> {
    this.clearError();
    try {
      const redirectTo = this.adminLoginRedirect();
      const authorizeUrl = new URL(supabaseAuthUrl("authorize"));
      authorizeUrl.searchParams.set("provider", "google");
      authorizeUrl.searchParams.set("redirect_to", redirectTo);
      authorizeUrl.searchParams.set("prompt", "select_account");
      window.location.assign(authorizeUrl.toString());
      return true;
    } catch (error) {
      this.captureError(
        error,
        "Google giriş sağlayıcısı henüz Supabase projesinde yapılandırılmamış olabilir.",
      );
      return false;
    }
  }

  hasPasswordProvider(): boolean {
    const user = this._currentUser();
    const providers = user?.app_metadata?.providers || [];
    return providers.includes("email") || user?.app_metadata?.provider === "email";
  }

  async createStrongPasswordForCurrentUser(): Promise<string | null> {
    this.clearError();
    const password = this.generateStrongPassword();
    const success = await this.changeCurrentPassword(password);
    return success ? password : null;
  }

  async changeCurrentPassword(newPassword: string): Promise<boolean> {
    this.clearError();
    const validationError = this.validateStrongPassword(newPassword);
    if (validationError) {
      this.setError("weak_password", validationError);
      return false;
    }
    if (!(await this.ensurePasswordNotPwned(newPassword))) return false;

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      this.setError("session_missing", "Şifre değiştirmek için yeniden yönetici girişi yapın.");
      return false;
    }

    try {
      const response = await fetch(supabaseAuthUrl("user"), {
        method: "PUT",
        headers: this.userHeaders(accessToken),
        body: JSON.stringify({ password: newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload & SupabaseUser;
      if (!response.ok) {
        this.capturePayloadError(payload, "Yönetici şifresi güncellenemedi.");
        return false;
      }
      return true;
    } catch (error) {
      this.captureError(error, "Yönetici şifresi güncellenemedi.");
      return false;
    }
  }

  validateStrongPassword(password: string): string | null {
    if (password.length < 10) return "Şifre en az 10 karakter olmalı.";
    if (!/[a-zçğıöşü]/.test(password)) return "Şifrede en az bir küçük harf bulunmalı.";
    if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return "Şifrede en az bir büyük harf bulunmalı.";
    if (!/[0-9]/.test(password)) return "Şifrede en az bir rakam bulunmalı.";
    return null;
  }

  getCurrentEmail(): string {
    return this._userEmail() || PRIMARY_ADMIN_EMAIL;
  }

  getPrimaryAdminEmail(): string {
    return PRIMARY_ADMIN_EMAIL;
  }

  async logout(): Promise<void> {
    const token = this.session?.accessToken;
    if (token) {
      await fetch(`${supabaseAuthUrl("logout")}?scope=global`, {
        method: "POST",
        headers: this.userHeaders(token),
      }).catch(() => undefined);
    }
    await this.clearSession(false);
    void this.router.navigate(["/admin/login"]);
  }

  async resetPassword(email: string): Promise<boolean> {
    this.clearError();
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.setError("invalid_email", "Geçerli bir yönetici e-posta adresi girin.");
      return false;
    }

    try {
      const redirectTo = `${window.location.origin}/admin/settings?tab=account`;
      const response = await fetch(
        `${supabaseAuthUrl("recover")}?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: "POST",
          headers: this.publicHeaders(),
          body: JSON.stringify({ email: cleanEmail }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok) {
        this.capturePayloadError(payload, "Şifre sıfırlama e-postası gönderilemedi.");
        return false;
      }
      return true;
    } catch (error) {
      this.captureError(error, "Şifre sıfırlama e-postası gönderilemedi.");
      return false;
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.consumeRedirectSession();
      if (!this.session) this.restoreStoredSession();
      if (this.session) {
        if (this.session.expiresAt <= Date.now() + 60_000) {
          await this.refreshSession();
        }
        if (this.session) {
          const user = await this.fetchCurrentUser(this.session.accessToken);
          if (user) {
            this.session.user = user;
            this.persistSession();
            await this.ensureAdminAccess();
          } else {
            await this.clearSession(false);
          }
        }
      }
    } catch (error) {
      console.error("Supabase admin session initialization failed", error);
      await this.clearSession(false);
    } finally {
      if (!this._authReady()) {
        this._authReady.set(true);
        this.readyResolver();
      }
    }
  }

  private consumeRedirectSession(): void {
    if (!window.location.hash.includes("access_token=")) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token") || "";
    const refreshToken = params.get("refresh_token") || "";
    if (!accessToken || !refreshToken) return;
    const expiresIn = Number(params.get("expires_in") || 3600);
    this.session = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
      user: { id: "" },
    };
    this.persistSession();
    history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  }

  private restoreStoredSession(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.expiresAt) return;
      this.session = parsed;
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private savePayloadSession(payload: AuthPayload): void {
    const accessToken = payload.access_token || "";
    const refreshToken = payload.refresh_token || "";
    if (!accessToken || !refreshToken) throw new Error("SESSION_TOKEN_MISSING");
    const expiresAt = payload.expires_at
      ? Number(payload.expires_at) * 1000
      : Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000;
    this.session = {
      accessToken,
      refreshToken,
      expiresAt,
      user: payload.user || { id: "" },
    };
    this.persistSession();
  }

  private persistSession(): void {
    if (!this.session) return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.session));
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.session?.refreshToken) return false;
    try {
      const response = await fetch(`${supabaseAuthUrl("token")}?grant_type=refresh_token`, {
        method: "POST",
        headers: this.publicHeaders(),
        body: JSON.stringify({ refresh_token: this.session.refreshToken }),
      });
      const payload = (await response.json().catch(() => ({}))) as AuthPayload;
      if (!response.ok || !payload.access_token || !payload.refresh_token) {
        await this.clearSession(false);
        return false;
      }
      this.savePayloadSession(payload);
      return true;
    } catch {
      return false;
    }
  }

  private async fetchCurrentUser(accessToken: string): Promise<SupabaseUser | null> {
    const response = await fetch(supabaseAuthUrl("user"), {
      headers: this.userHeaders(accessToken),
    }).catch(() => null);
    if (!response?.ok) return null;
    return (await response.json()) as SupabaseUser;
  }

  private async ensureAdminAccess(): Promise<boolean> {
    if (!this.session) return false;
    const user = await this.fetchCurrentUser(this.session.accessToken);
    if (!user?.id || !user.email) return false;
    this.session.user = user;
    this.persistSession();

    let allowed = await this.hasAdminRow(user.id, this.session.accessToken);
    if (!allowed && user.email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL) {
      allowed = await this.claimPrimaryOwner(this.session.accessToken);
      if (allowed) allowed = await this.hasAdminRow(user.id, this.session.accessToken);
    }

    if (!allowed) return false;
    this._currentUser.set(user);
    this._userEmail.set(user.email.trim().toLowerCase());
    this._isLoggedIn.set(true);
    return true;
  }

  private async hasAdminRow(userId: string, accessToken: string): Promise<boolean> {
    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id&limit=1`,
      { headers: this.userHeaders(accessToken) },
    ).catch(() => null);
    if (!response?.ok) return false;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  }

  private async claimPrimaryOwner(accessToken: string): Promise<boolean> {
    const response = await fetch(supabaseFunctionUrl("claim-owner"), {
      method: "POST",
      headers: this.userHeaders(accessToken),
      body: "{}",
    }).catch(() => null);
    if (!response) {
      this.setError("owner_bootstrap_unavailable", "İlk yönetici yetkisi doğrulanamadı.");
      return false;
    }
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string };
    if (response.ok && payload.ok) return true;
    if (payload.code === "EMAIL_NOT_CONFIRMED") {
      this.setError("email_not_confirmed", "Yönetici e-posta adresini doğruladıktan sonra tekrar giriş yapın.");
      return false;
    }
    if (payload.code === "OWNER_ALREADY_INITIALIZED") {
      this.setError("owner_already_initialized", "Bu hesap yönetici yetkisine sahip değil.");
      return false;
    }
    this.setError("owner_bootstrap_failed", "Yönetici yetkisi doğrulanamadı.");
    return false;
  }

  private async ensurePasswordNotPwned(password: string): Promise<boolean> {
    try {
      const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
      const hash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: "GET",
        headers: { "Add-Padding": "true" },
      });
      if (!response.ok) {
        this.setError(
          "password_safety_unavailable",
          "Şifre sızıntı denetimi şu anda tamamlanamadı. Güvenlik için biraz sonra tekrar deneyin.",
        );
        return false;
      }
      const body = await response.text();
      const compromised = body.split(/\r?\n/).some((line) => {
        const [candidate, count] = line.split(":");
        return candidate?.trim().toUpperCase() === suffix && Number(count || 0) > 0;
      });
      if (compromised) {
        this.setError(
          "pwned_password",
          "Bu şifre daha önce bir veri sızıntısında görülmüş. Lütfen benzersiz ve farklı bir şifre seçin.",
        );
        return false;
      }
      return true;
    } catch {
      this.setError(
        "password_safety_unavailable",
        "Şifre sızıntı denetimi şu anda tamamlanamadı. Güvenlik için biraz sonra tekrar deneyin.",
      );
      return false;
    }
  }

  private adminLoginRedirect(): string {
    if (typeof window === "undefined") return "/admin/login";
    return `${window.location.origin}/admin/login`;
  }

  private publicHeaders(): Record<string, string> {
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    };
  }

  private userHeaders(accessToken: string): Record<string, string> {
    return {
      ...this.publicHeaders(),
      authorization: `Bearer ${accessToken}`,
    };
  }

  private clearError(): void {
    this._lastErrorCode.set(null);
    this._lastErrorMessage.set(null);
  }

  private setError(code: string, message: string): void {
    this._lastErrorCode.set(code);
    this._lastErrorMessage.set(message);
  }

  private capturePayloadError(payload: AuthPayload, fallback: string): void {
    const code = payload.error_code || payload.code || payload.error || "auth_error";
    const raw = payload.error_description || payload.msg || payload.message || fallback;
    const normalized = String(raw).toLowerCase();
    let message = String(raw || fallback);
    if (normalized.includes("invalid login credentials")) message = "E-posta veya şifre doğrulanamadı.";
    else if (normalized.includes("email not confirmed")) message = "E-posta adresinizi doğruladıktan sonra giriş yapın.";
    else if (normalized.includes("user already registered")) message = "Bu yönetici hesabı zaten oluşturulmuş. Giriş yapın veya şifrenizi sıfırlayın.";
    else if (normalized.includes("password")) message = fallback;
    this.setError(String(code), message);
  }

  private captureError(error: unknown, fallback: string): void {
    console.error(fallback, error);
    const message = error instanceof Error && error.message ? error.message : fallback;
    this.setError("network_or_auth_error", message === "Failed to fetch" ? fallback : message);
  }

  private generateStrongPassword(): string {
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const symbols = "!@#$%*+-_?";
    const all = lower + upper + digits + symbols;
    const pick = (chars: string) => {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return chars[bytes[0] % chars.length];
    };
    const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
    while (chars.length < 24) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      const j = bytes[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
  }

  private async clearSession(callRemoteLogout: boolean): Promise<void> {
    if (callRemoteLogout && this.session?.accessToken) {
      await fetch(`${supabaseAuthUrl("logout")}?scope=local`, {
        method: "POST",
        headers: this.userHeaders(this.session.accessToken),
      }).catch(() => undefined);
    }
    this.session = null;
    localStorage.removeItem(this.storageKey);
    this._currentUser.set(null);
    this._userEmail.set(null);
    this._isLoggedIn.set(false);
  }
}
