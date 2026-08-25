import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export type AdminRole = "owner" | "admin" | "editor" | "support";
export type AdminArea = "content" | "operations" | "team" | "settings" | "finance" | "analytics" | "marketing" | "telematics";

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
    if (!token) return this.finish(null);

    const userId = this.subjectFromJwt(token);
    if (!userId) return this.finish(null);

    const response = await fetch(
      `${SUPABASE_PROJECT_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,email,role,is_active,permissions,primary_branch_id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
          accept: "application/json",
        },
        cache: "no-store",
      },
    ).catch(() => null);

    if (!response?.ok) return this.finish(null);
    const rows = await response.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || String(row.user_id || "") !== userId || row.is_active !== true) return this.finish(null);
    const role = this.normalizeRole(row.role);
    if (!role) return this.finish(null);

    return this.finish({
      userId,
      email: String(row.email || "").trim().toLowerCase(),
      role,
      isActive: true,
      permissions: row.permissions && typeof row.permissions === "object" ? row.permissions : {},
      primaryBranchId: this.isUuid(String(row.primary_branch_id || "")) ? String(row.primary_branch_id) : undefined,
    });
  }

  async can(area: AdminArea): Promise<boolean> {
    const profile = await this.refresh();
    return this.canWithProfile(profile, area);
  }

  canCached(area: AdminArea): boolean {
    return this.canWithProfile(this._profile(), area);
  }

  clear(): void {
    this._profile.set(null);
    this._loaded.set(false);
  }

  private finish(profile: AdminAccessProfile | null): AdminAccessProfile | null {
    this._profile.set(profile);
    this._loaded.set(true);
    return profile;
  }

  private subjectFromJwt(token: string): string | null {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
      const payload = JSON.parse(atob(normalized)) as { sub?: unknown };
      const subject = typeof payload.sub === "string" ? payload.sub : "";
      return this.isUuid(subject) ? subject : null;
    } catch {
      return null;
    }
  }

  private canWithProfile(profile: AdminAccessProfile | null, area: AdminArea): boolean {
    if (!profile?.isActive) return false;
    if (profile.role === "owner" || profile.role === "admin") return true;
    if (area === "content" && profile.role === "editor") return true;
    if (area === "operations" && profile.role === "support") return true;
    if (area === "analytics") return this.permission(profile.permissions, "analytics.read") || this.permission(profile.permissions, "analytics.manage");
    if (area === "finance") return this.permission(profile.permissions, "finance.read") || this.permission(profile.permissions, "finance.manage");
    if (area === "telematics") return this.permission(profile.permissions, "telematics.read") || this.permission(profile.permissions, "telematics.manage");
    if (area === "marketing") return this.permission(profile.permissions, "marketing.manage");
    return this.permission(profile.permissions, `${area}.manage`);
  }

  private permission(permissions: Record<string, unknown>, key: string): boolean {
    return permissions?.[key] === true;
  }

  private normalizeRole(value: unknown): AdminRole | null {
    return value === "owner" || value === "admin" || value === "editor" || value === "support" ? value : null;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
