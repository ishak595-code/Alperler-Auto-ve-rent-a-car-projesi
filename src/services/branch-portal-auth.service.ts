import { Injectable, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

interface BranchPortalSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
}

@Injectable({ providedIn: "root" })
export class BranchPortalAuthService {
  private readonly storageKey = "alperler_branch_portal_session";
  private readonly _session = signal<BranchPortalSession | null>(this.readSession());
  private refreshPromise: Promise<string | null> | null = null;

  readonly session = this._session.asReadonly();

  isLoggedIn(): boolean {
    return Boolean(this._session()?.accessToken);
  }

  async signIn(email: string, password: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) throw new Error("EMAIL_PASSWORD_REQUIRED");
    const response = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token || !payload?.user?.id) {
      throw new Error(response.status === 400 ? "INVALID_CREDENTIALS" : "BRANCH_LOGIN_FAILED");
    }

    await this.claimBranchAccess(String(payload.access_token));
    this.saveSession({
      accessToken: String(payload.access_token),
      refreshToken: String(payload.refresh_token || ""),
      expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000,
      userId: String(payload.user.id),
      email: String(payload.user.email || normalizedEmail),
    });
  }

  async bootstrapInviteFromUrl(): Promise<boolean> {
    if (typeof window === "undefined" || !window.location.hash) return false;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token") || "";
    const refreshToken = params.get("refresh_token") || "";
    const type = params.get("type") || "";
    if (!accessToken || !["invite", "signup", "recovery", "magiclink"].includes(type)) return false;

    const userResponse = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${accessToken}`,
      },
    });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id || !user?.email_confirmed_at) {
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      return false;
    }

    try {
      await this.claimBranchAccess(accessToken);
    } catch (error) {
      await this.remoteLogout(accessToken);
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      throw error;
    }

    const expiresIn = Math.max(60, Number(params.get("expires_in") || 3600));
    this.saveSession({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userId: String(user.id),
      email: String(user.email || ""),
    });
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    return true;
  }

  async setPassword(password: string): Promise<void> {
    const passwordError = await this.validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    const token = await this.getAccessToken();
    if (!token) throw new Error("BRANCH_SESSION_REQUIRED");
    const response = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error("PASSWORD_UPDATE_FAILED");
  }

  async getAccessToken(): Promise<string | null> {
    const current = this._session();
    if (!current?.accessToken) return null;
    if (current.expiresAt - Date.now() > 90_000) return current.accessToken;
    if (!current.refreshToken) {
      await this.signOut(false);
      return null;
    }
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken().finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  }

  async signOut(callRemote = true): Promise<void> {
    const current = this._session();
    if (callRemote && current?.accessToken) await this.remoteLogout(current.accessToken);
    this.saveSession(null);
  }

  private async claimBranchAccess(accessToken: string): Promise<void> {
    const response = await fetch("/api/partner?op=branch-access-claim", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: "{}",
    }).catch(() => null);
    if (!response) throw new Error("BRANCH_ACCESS_UNAVAILABLE");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.authorized !== true) {
      const code = String(payload?.code || "BRANCH_ACCESS_NOT_GRANTED");
      if (["EMAIL_VERIFICATION_REQUIRED", "BRANCH_IDENTITY_EMAIL_MISMATCH", "BRANCH_ACCESS_NOT_GRANTED"].includes(code)) {
        throw new Error(code);
      }
      throw new Error("BRANCH_ACCESS_NOT_GRANTED");
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    const current = this._session();
    if (!current?.refreshToken) return null;
    const response = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    }).catch(() => null);
    if (!response?.ok) {
      this.saveSession(null);
      return null;
    }
    const payload = await response.json().catch(() => ({}));
    if (!payload?.access_token || !payload?.user?.id || !payload?.user?.email_confirmed_at) {
      this.saveSession(null);
      return null;
    }

    try {
      await this.claimBranchAccess(String(payload.access_token));
    } catch {
      await this.remoteLogout(String(payload.access_token));
      this.saveSession(null);
      return null;
    }

    const next: BranchPortalSession = {
      accessToken: String(payload.access_token),
      refreshToken: String(payload.refresh_token || current.refreshToken),
      expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 3600)) * 1000,
      userId: String(payload.user.id),
      email: String(payload.user.email || current.email),
    };
    this.saveSession(next);
    return next.accessToken;
  }

  private async remoteLogout(accessToken: string): Promise<void> {
    await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => null);
  }

  private async validatePassword(password: string): Promise<string | null> {
    if (password.length < 12) return "PASSWORD_TOO_SHORT";
    if (!/[a-zçğıöşü]/.test(password) || !/[A-ZÇĞİÖŞÜ]/.test(password) || !/[0-9]/.test(password)) return "PASSWORD_COMPLEXITY_REQUIRED";
    if (await this.isPwnedPassword(password)) return "PASSWORD_COMPROMISED";
    return null;
  }

  private async isPwnedPassword(password: string): Promise<boolean> {
    try {
      const bytes = new TextEncoder().encode(password);
      const digest = await crypto.subtle.digest("SHA-1", bytes);
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true" },
      });
      if (!response.ok) return false;
      return (await response.text()).split(/\r?\n/).some((line) => line.split(":", 1)[0]?.trim() === suffix);
    } catch {
      // Availability of the external breach corpus must not lock every portal user out.
      return false;
    }
  }

  private readSession(): BranchPortalSession | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
      // V165 deliberately stops persisting privileged branch refresh tokens across browser sessions.
      if (typeof localStorage !== "undefined") localStorage.removeItem(this.storageKey);
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as BranchPortalSession;
      if (!parsed?.accessToken || !parsed?.userId || !parsed?.email) return null;
      if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now() - 86_400_000) return null;
      return parsed;
    } catch {
      sessionStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private saveSession(session: BranchPortalSession | null): void {
    this._session.set(session);
    if (typeof localStorage !== "undefined") localStorage.removeItem(this.storageKey);
    if (typeof sessionStorage === "undefined") return;
    if (session) sessionStorage.setItem(this.storageKey, JSON.stringify(session));
    else sessionStorage.removeItem(this.storageKey);
  }
}
