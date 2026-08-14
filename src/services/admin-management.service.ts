import { Injectable, inject, signal } from "@angular/core";
import {
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabaseFunctionUrl,
} from "../supabase.config";
import { AuthService } from "./auth.service";

export interface HomepageSection {
  sectionKey: string;
  title: string;
  sectionType: "VEHICLES" | "TOURS" | "BLOG" | "CAMPAIGN" | "CUSTOM";
  isEnabled: boolean;
  sortOrder: number;
  maxItems: number;
  settings: Record<string, unknown>;
}

export interface HomepagePlacement {
  id: string;
  sectionKey: string;
  entityType: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN";
  entityId: string;
  label?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  metadata: Record<string, unknown>;
}

export interface StaffProfile {
  id: string;
  authUserId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department: "MANAGEMENT" | "SALES" | "RENTAL" | "FLEET" | "TOURS" | "CONTENT" | "SUPPORT" | "GENERAL";
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface BranchRecord {
  id: string;
  code: string;
  name: string;
  city: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AdminUserRecord {
  userId: string;
  email: string;
  role: "owner" | "admin" | "editor" | "support";
  displayName?: string;
  phone?: string;
  isActive: boolean;
  permissions: Record<string, unknown>;
  primaryBranchId?: string;
}

interface DbStaffRow {
  id: string;
  auth_user_id?: string | null;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  department: StaffProfile["department"];
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
}

@Injectable({ providedIn: "root" })
export class AdminManagementService {
  private readonly auth = inject(AuthService);
  private readonly _sections = signal<HomepageSection[]>([]);
  private readonly _placements = signal<HomepagePlacement[]>([]);
  private readonly _staff = signal<StaffProfile[]>([]);
  private readonly _branches = signal<BranchRecord[]>([]);
  private readonly _admins = signal<AdminUserRecord[]>([]);
  private readonly _loading = signal(false);

  readonly sections = this._sections.asReadonly();
  readonly placements = this._placements.asReadonly();
  readonly staff = this._staff.asReadonly();
  readonly branches = this._branches.asReadonly();
  readonly admins = this._admins.asReadonly();
  readonly loading = this._loading.asReadonly();

  async refreshHomepage(): Promise<void> {
    const token = await this.requiredToken();
    const [sections, placements] = await Promise.all([
      this.rest<any[]>("GET", "homepage_sections?select=*&order=sort_order.asc", undefined, token),
      this.rest<any[]>("GET", "homepage_placements?select=*&order=section_key.asc,sort_order.asc", undefined, token),
    ]);
    this._sections.set(sections.map((row) => ({
      sectionKey: String(row.section_key),
      title: String(row.title || ""),
      sectionType: row.section_type,
      isEnabled: row.is_enabled !== false,
      sortOrder: Number(row.sort_order || 0),
      maxItems: Number(row.max_items || 6),
      settings: row.settings || {},
    })));
    this._placements.set(placements.map((row) => ({
      id: String(row.id),
      sectionKey: String(row.section_key),
      entityType: row.entity_type,
      entityId: String(row.entity_id),
      label: row.label || undefined,
      sortOrder: Number(row.sort_order || 0),
      isActive: row.is_active !== false,
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      metadata: row.metadata || {},
    })));
  }

  async updateSection(section: HomepageSection): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("PATCH", `homepage_sections?section_key=eq.${encodeURIComponent(section.sectionKey)}`, {
      title: section.title,
      is_enabled: section.isEnabled,
      sort_order: section.sortOrder,
      max_items: section.maxItems,
      settings: section.settings || {},
      updated_at: new Date().toISOString(),
    }, token);
    await this.refreshHomepage();
  }

  async reorderSections(orderedKeys: string[]): Promise<void> {
    const token = await this.requiredToken();
    await Promise.all(orderedKeys.map((key, index) =>
      this.rest("PATCH", `homepage_sections?section_key=eq.${encodeURIComponent(key)}`, {
        sort_order: (index + 1) * 10,
        updated_at: new Date().toISOString(),
      }, token),
    ));
    await this.refreshHomepage();
  }

  async addPlacement(input: Omit<HomepagePlacement, "id">): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("POST", "homepage_placements?on_conflict=section_key,entity_type,entity_id", {
      section_key: input.sectionKey,
      entity_type: input.entityType,
      entity_id: input.entityId,
      label: input.label || null,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      metadata: input.metadata || {},
    }, token, "resolution=merge-duplicates");
    await this.refreshHomepage();
  }

  async updatePlacement(placement: HomepagePlacement): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("PATCH", `homepage_placements?id=eq.${encodeURIComponent(placement.id)}`, {
      section_key: placement.sectionKey,
      label: placement.label || null,
      sort_order: placement.sortOrder,
      is_active: placement.isActive,
      starts_at: placement.startsAt || null,
      ends_at: placement.endsAt || null,
      metadata: placement.metadata || {},
      updated_at: new Date().toISOString(),
    }, token);
    await this.refreshHomepage();
  }

  async removePlacement(id: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("DELETE", `homepage_placements?id=eq.${encodeURIComponent(id)}`, undefined, token);
    this._placements.update((rows) => rows.filter((row) => row.id !== id));
  }

  async reorderPlacements(_sectionKey: string, orderedIds: string[]): Promise<void> {
    const token = await this.requiredToken();
    await Promise.all(orderedIds.map((id, index) =>
      this.rest("PATCH", `homepage_placements?id=eq.${encodeURIComponent(id)}`, {
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      }, token),
    ));
    await this.refreshHomepage();
  }

  async refreshPeople(): Promise<void> {
    this._loading.set(true);
    try {
      const token = await this.requiredToken();
      const [staffRows, branchRows, adminRows] = await Promise.all([
        this.rest<DbStaffRow[]>("GET", "staff_profiles?select=*&order=display_name.asc", undefined, token),
        this.rest<any[]>("GET", "branches?select=*&order=sort_order.asc,name.asc", undefined, token),
        this.rest<any[]>("GET", "admin_users?select=*&order=created_at.asc", undefined, token),
      ]);
      this._staff.set(staffRows.map((row) => this.staffFromRow(row)));
      this._branches.set(branchRows.map((row) => ({
        id: String(row.id), code: String(row.code || ""), name: String(row.name || ""), city: String(row.city || ""),
        district: row.district || undefined, address: row.address_line || undefined, phone: row.phone || undefined,
        email: row.email || undefined, isActive: row.is_active !== false, sortOrder: Number(row.sort_order || 0),
      })));
      this._admins.set(adminRows.map((row) => ({
        userId: String(row.user_id), email: String(row.email || ""), role: row.role,
        displayName: row.display_name || undefined, phone: row.phone || undefined, isActive: row.is_active !== false,
        permissions: row.permissions || {}, primaryBranchId: row.primary_branch_id || undefined,
      })));
    } finally {
      this._loading.set(false);
    }
  }

  async saveStaff(staff: Partial<StaffProfile> & Pick<StaffProfile, "displayName" | "department">): Promise<StaffProfile> {
    const token = await this.requiredToken();
    const body = {
      display_name: staff.displayName.trim(), email: staff.email?.trim().toLowerCase() || null,
      phone: staff.phone?.trim() || null, job_title: staff.jobTitle?.trim() || null,
      department: staff.department, is_active: staff.isActive !== false, metadata: staff.metadata || {},
      updated_at: new Date().toISOString(),
    };
    const rows = staff.id
      ? await this.rest<DbStaffRow[]>("PATCH", `staff_profiles?id=eq.${encodeURIComponent(staff.id)}&select=*`, body, token, "return=representation")
      : await this.rest<DbStaffRow[]>("POST", "staff_profiles?select=*", body, token, "return=representation");
    const saved = this.staffFromRow(rows[0]);
    await this.refreshPeople();
    return saved;
  }

  async setStaffActive(id: string, active: boolean): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("PATCH", `staff_profiles?id=eq.${encodeURIComponent(id)}`, { is_active: active, updated_at: new Date().toISOString() }, token);
    await this.refreshPeople();
  }

  async assignStaffToBranch(staffId: string, branchId: string, primary = false): Promise<void> {
    const token = await this.requiredToken();
    if (primary) await this.rest("PATCH", `staff_branch_assignments?staff_id=eq.${encodeURIComponent(staffId)}&is_primary=eq.true`, { is_primary: false }, token);
    await this.rest("POST", "staff_branch_assignments?on_conflict=staff_id,branch_id", { staff_id: staffId, branch_id: branchId, is_primary: primary }, token, "resolution=merge-duplicates");
  }

  async unassignStaffFromBranch(staffId: string, branchId: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("DELETE", `staff_branch_assignments?staff_id=eq.${encodeURIComponent(staffId)}&branch_id=eq.${encodeURIComponent(branchId)}`, undefined, token);
  }

  async getStaffBranchIds(staffId: string): Promise<Array<{ branchId: string; isPrimary: boolean }>> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>("GET", `staff_branch_assignments?staff_id=eq.${encodeURIComponent(staffId)}&select=branch_id,is_primary`, undefined, token);
    return rows.map((row) => ({ branchId: String(row.branch_id), isPrimary: Boolean(row.is_primary) }));
  }

  async assignStaffToVehicle(vehicleId: string, staffId: string, responsibility: "RESPONSIBLE" | "SALES" | "FLEET" | "DELIVERY" | "MAINTENANCE"): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("POST", "vehicle_staff_assignments?on_conflict=vehicle_id,staff_id,responsibility", { vehicle_id: vehicleId, staff_id: staffId, responsibility }, token, "resolution=ignore-duplicates");
  }

  async assignStaffToTour(tourId: string, staffId: string, responsibility: "COORDINATOR" | "GUIDE" | "DRIVER" | "CONTENT"): Promise<void> {
    const token = await this.requiredToken();
    await this.rest("POST", "tour_staff_assignments?on_conflict=tour_id,staff_id,responsibility", { tour_id: tourId, staff_id: staffId, responsibility }, token, "resolution=ignore-duplicates");
  }

  async saveBranch(branch: Partial<BranchRecord> & Pick<BranchRecord, "code" | "name" | "city">): Promise<BranchRecord> {
    const token = await this.requiredToken();
    const body = {
      code: branch.code.trim().toUpperCase() || null, name: branch.name.trim(), city: branch.city.trim() || null,
      district: branch.district?.trim() || null, address_line: branch.address?.trim() || null,
      phone: branch.phone?.trim() || null, email: branch.email?.trim().toLowerCase() || null,
      is_active: branch.isActive !== false, sort_order: branch.sortOrder || 0, updated_at: new Date().toISOString(),
    };
    const rows = branch.id
      ? await this.rest<any[]>("PATCH", `branches?id=eq.${encodeURIComponent(branch.id)}&select=*`, body, token, "return=representation")
      : await this.rest<any[]>("POST", "branches?select=*", body, token, "return=representation");
    await this.refreshPeople();
    const row = rows[0];
    return { id: String(row.id), code: String(row.code || ""), name: String(row.name || ""), city: String(row.city || ""), district: row.district || undefined, address: row.address_line || undefined, phone: row.phone || undefined, email: row.email || undefined, isActive: row.is_active !== false, sortOrder: Number(row.sort_order || 0) };
  }

  async inviteAdmin(input: { email: string; displayName: string; role: AdminUserRecord["role"]; primaryBranchId?: string; permissions?: Record<string, unknown> }): Promise<void> {
    const token = await this.requiredToken();
    await this.teamGateway("POST", token, input);
    await this.refreshPeople();
  }

  async updateAdmin(userId: string, patch: Partial<Pick<AdminUserRecord, "role" | "displayName" | "isActive" | "permissions" | "primaryBranchId">>): Promise<void> {
    const token = await this.requiredToken();
    await this.teamGateway("PATCH", token, { userId, ...patch });
    await this.refreshPeople();
  }

  private async teamGateway(method: "POST" | "PATCH", token: string, body: unknown): Promise<void> {
    const response = await fetch(supabaseFunctionUrl("admin-team"), {
      method,
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.code || `ADMIN_TEAM_${response.status}`);
  }

  private staffFromRow(row: DbStaffRow): StaffProfile {
    return { id: row.id, authUserId: row.auth_user_id || undefined, displayName: row.display_name, email: row.email || undefined, phone: row.phone || undefined, jobTitle: row.job_title || undefined, department: row.department, isActive: row.is_active !== false, metadata: row.metadata || {} };
  }

  private async rest<T = unknown>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body: unknown, token: string, prefer?: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, ...(method === "GET" ? {} : { "content-type": "application/json" }), ...(prefer ? { Prefer: prefer } : {}) },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(String(payload?.message || payload?.code || `ADMIN_DB_${response.status}`));
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }
}
