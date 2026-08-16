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
    if (!userResponse.ok || !user?.id) return false;

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
    if (password.length < 8) throw new Error("PASSWORD_TOO_SHORT");
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
    if (!this.refreshPromise) this.refreshPromise = this.refreshAccessToken().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  async signOut(callRemote = true): Promise<void> {
    const current = this._session();
    if (callRemote && current?.accessToken) {
      await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${current.accessToken}`,
        },
      }).catch(() => null);
    }
    this.saveSession(null);
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
    if (!payload?.access_token || !payload?.user?.id) {
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

  private readSession(): BranchPortalSession | null {
    if (typeof localStorage === "undefined") return null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as BranchPortalSession;
      if (!parsed?.accessToken || !parsed?.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private saveSession(session: BranchPortalSession | null): void {
    this._session.set(session);
    if (typeof localStorage === "undefined") return;
    if (session) localStorage.setItem(this.storageKey, JSON.stringify(session));
    else localStorage.removeItem(this.storageKey);
  }
}
