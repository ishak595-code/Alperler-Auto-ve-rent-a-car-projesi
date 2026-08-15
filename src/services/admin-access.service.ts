import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export type AdminRole = "owner" | "admin" | "editor" | "support";
export type AdminArea = "content" | "operations" | "team" | "settings" | "finance" | "analytics";

export interface AdminAccessProfile {
  userId: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  permissions: Record<string, unknown>;
  primaryBranchId?: string;
}

@Injectable({ providedIn: "root" })
export class AdminAccessService {
  private readonly auth = inject(AuthService);
  private readonly _profile = signal<AdminAccessProfile | null>(null);
  private readonly _loaded = signal(false);

  readonly profile = this._profile.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  async refresh(force = false): Promise<AdminAccessProfile | null> {
    if (this._loaded() && !force) return this._profile();
    const token = await this.auth.getAccessToken();
    if (!token) {
      this._profile.set(null);
      this._loaded.set(true);
      return null;
    }

    const email = this.auth.getCurrentEmail().trim().toLowerCase();
    if (!email) {
      this._profile.set(null);
      this._loaded.set(true);
      return null;
    }

    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&is_active=eq.true&select=user_id,email,role,is_active,permissions,primary_branch_id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
        },
      },
    ).catch(() => null);

    if (!response?.ok) {
      this._profile.set(null);
      this._loaded.set(true);
      return null;
    }

    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) {
      this._profile.set(null);
      this._loaded.set(true);
      return null;
    }

    const profile: AdminAccessProfile = {
      userId: String(row.user_id || ""),
      email: String(row.email || email),
      role: this.normalizeRole(row.role),
      isActive: row.is_active !== false,
      permissions: row.permissions && typeof row.permissions === "object" ? row.permissions : {},
      primaryBranchId: row.primary_branch_id || undefined,
    };
    this._profile.set(profile);
    this._loaded.set(true);
    return profile;
  }

  async can(area: AdminArea): Promise<boolean> {
    const profile = await this.refresh();
    if (!profile?.isActive) return false;
    if (profile.role === "owner" || profile.role === "admin") return true;
    if (area === "content" && profile.role === "editor") return true;
    if (area === "operations" && profile.role === "support") return true;
    if (area === "analytics") return this.permission(profile.permissions, "analytics.read");
    return this.permission(profile.permissions, `${area}.manage`) ||
      (area === "finance" && this.permission(profile.permissions, "finance.read"));
  }

  canCached(area: AdminArea): boolean {
    const profile = this._profile();
    if (!profile?.isActive) return false;
    if (profile.role === "owner" || profile.role === "admin") return true;
    if (area === "content" && profile.role === "editor") return true;
    if (area === "operations" && profile.role === "support") return true;
    if (area === "analytics") return this.permission(profile.permissions, "analytics.read");
    return this.permission(profile.permissions, `${area}.manage`) ||
      (area === "finance" && this.permission(profile.permissions, "finance.read"));
  }

  clear(): void {
    this._profile.set(null);
    this._loaded.set(false);
  }

  private permission(permissions: Record<string, unknown>, key: string): boolean {
    return permissions?.[key] === true;
  }

  private normalizeRole(value: unknown): AdminRole {
    return value === "owner" || value === "editor" || value === "support" ? value : "admin";
  }
}
