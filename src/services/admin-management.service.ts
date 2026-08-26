import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import {
  HomepageAdminService,
  HomepagePlacementRecord,
  HomepageSectionRecord,
} from './homepage-admin.service';

export interface HomepageSection extends HomepageSectionRecord {}
export interface HomepagePlacement extends HomepagePlacementRecord {}

export interface StaffProfile {
  id: string;
  authUserId?: string;
  displayName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department: 'MANAGEMENT' | 'SALES' | 'RENTAL' | 'FLEET' | 'TOURS' | 'CONTENT' | 'SUPPORT' | 'GENERAL';
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
  role: 'owner' | 'admin' | 'editor' | 'support';
  displayName?: string;
  phone?: string;
  isActive: boolean;
  permissions: Record<string, unknown>;
  primaryBranchId?: string;
}

type RawRecord = Record<string, unknown>;

interface ManagementSnapshot {
  ok?: boolean;
  code?: string;
  staff?: RawRecord[];
  branches?: RawRecord[];
  admins?: RawRecord[];
}

interface StaffBranchSnapshot {
  ok?: boolean;
  code?: string;
  assignments?: Array<{ branchId?: string; isPrimary?: boolean }>;
}

interface MutationPayload {
  ok?: boolean;
  code?: string;
  message?: string;
  staff?: RawRecord;
  branch?: RawRecord;
}

@Injectable({ providedIn: 'root' })
export class AdminManagementService {
  private readonly auth = inject(AuthService);
  private readonly homepage = inject(HomepageAdminService);
  private readonly adminCoreEndpoint = '/api/partner?op=admin-core';
  private readonly adminTeamEndpoint = '/api/partner?op=admin-team';

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
    await this.homepage.refresh();
    this.syncHomepageSignals();
  }

  async updateSection(section: HomepageSection): Promise<void> {
    await this.homepage.updateSection(section);
    this.syncHomepageSignals();
  }

  async reorderSections(orderedKeys: string[]): Promise<void> {
    await this.homepage.reorderSections(orderedKeys);
    this.syncHomepageSignals();
  }

  async addPlacement(input: Omit<HomepagePlacement, 'id'>): Promise<void> {
    await this.homepage.addPlacement(input);
    this.syncHomepageSignals();
  }

  async updatePlacement(placement: HomepagePlacement): Promise<void> {
    await this.homepage.updatePlacement(placement);
    this.syncHomepageSignals();
  }

  async removePlacement(id: string): Promise<void> {
    await this.homepage.removePlacement(id);
    this.syncHomepageSignals();
  }

  async reorderPlacements(_sectionKey: string, orderedIds: string[]): Promise<void> {
    await this.homepage.reorderPlacements(orderedIds);
    this.syncHomepageSignals();
  }

  async refreshPeople(): Promise<void> {
    this._loading.set(true);
    try {
      const token = await this.requiredToken();
      const payload = await this.request<ManagementSnapshot>(
        `${this.adminCoreEndpoint}&view=management`,
        'GET',
        token,
      );
      if (payload.ok !== true) throw new Error(payload.code || 'ADMIN_MANAGEMENT_LOAD_FAILED');
      this._staff.set((payload.staff || []).map((row) => this.staffFromRow(row)));
      this._branches.set((payload.branches || []).map((row) => this.branchFromRow(row)));
      this._admins.set((payload.admins || []).map((row) => this.adminFromRow(row)));
    } finally {
      this._loading.set(false);
    }
  }

  async saveStaff(staff: Partial<StaffProfile> & Pick<StaffProfile, 'displayName' | 'department'>): Promise<StaffProfile> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'SAVE_STAFF',
      id: staff.id || null,
      displayName: staff.displayName.trim(),
      email: staff.email?.trim().toLowerCase() || null,
      phone: staff.phone?.trim() || null,
      jobTitle: staff.jobTitle?.trim() || null,
      department: staff.department,
      isActive: staff.isActive !== false,
      metadata: staff.metadata || {},
    });
    if (payload.ok !== true || !payload.staff) throw new Error(payload.code || 'STAFF_SAVE_FAILED');
    const saved = this.staffFromRow(payload.staff);
    await this.refreshPeople();
    return saved;
  }

  async setStaffActive(id: string, active: boolean): Promise<void> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'SET_STAFF_ACTIVE',
      staffId: id,
      active,
    });
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_ACTIVE_UPDATE_FAILED');
    await this.refreshPeople();
  }

  async assignStaffToBranch(staffId: string, branchId: string, primary = false): Promise<void> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'ASSIGN_STAFF_BRANCH',
      staffId,
      branchId,
      primary,
    });
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_BRANCH_ASSIGN_FAILED');
  }

  async unassignStaffFromBranch(staffId: string, branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'UNASSIGN_STAFF_BRANCH',
      staffId,
      branchId,
    });
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_BRANCH_UNASSIGN_FAILED');
  }

  async getStaffBranchIds(staffId: string): Promise<Array<{ branchId: string; isPrimary: boolean }>> {
    const token = await this.requiredToken();
    const payload = await this.request<StaffBranchSnapshot>(
      `${this.adminCoreEndpoint}&view=staff-branches&staffId=${encodeURIComponent(staffId)}`,
      'GET',
      token,
    );
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_BRANCH_LOAD_FAILED');
    return (payload.assignments || [])
      .filter((row) => Boolean(row.branchId))
      .map((row) => ({ branchId: String(row.branchId), isPrimary: Boolean(row.isPrimary) }));
  }

  async assignStaffToVehicle(
    vehicleId: string,
    staffId: string,
    responsibility: 'RESPONSIBLE' | 'SALES' | 'FLEET' | 'DELIVERY' | 'MAINTENANCE',
  ): Promise<void> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'ASSIGN_STAFF_VEHICLE', vehicleId, staffId, responsibility,
    });
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_VEHICLE_ASSIGN_FAILED');
  }

  async assignStaffToTour(
    tourId: string,
    staffId: string,
    responsibility: 'COORDINATOR' | 'GUIDE' | 'DRIVER' | 'CONTENT',
  ): Promise<void> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'ASSIGN_STAFF_TOUR', tourId, staffId, responsibility,
    });
    if (payload.ok !== true) throw new Error(payload.code || 'STAFF_TOUR_ASSIGN_FAILED');
  }

  async saveBranch(branch: Partial<BranchRecord> & Pick<BranchRecord, 'code' | 'name' | 'city'>): Promise<BranchRecord> {
    const token = await this.requiredToken();
    const payload = await this.request<MutationPayload>(this.adminCoreEndpoint, 'PATCH', token, {
      action: 'SAVE_BRANCH',
      id: branch.id || null,
      code: branch.code.trim().toUpperCase() || null,
      name: branch.name.trim(),
      city: branch.city.trim(),
      district: branch.district?.trim() || null,
      address: branch.address?.trim() || null,
      phone: branch.phone?.trim() || null,
      email: branch.email?.trim().toLowerCase() || null,
      isActive: branch.isActive !== false,
      sortOrder: branch.sortOrder || 0,
    });
    if (payload.ok !== true || !payload.branch) throw new Error(payload.code || 'BRANCH_SAVE_FAILED');
    const saved = this.branchFromRow(payload.branch);
    await this.refreshPeople();
    return saved;
  }

  async inviteAdmin(input: {
    email: string;
    displayName: string;
    role: AdminUserRecord['role'];
    primaryBranchId?: string;
    permissions?: Record<string, unknown>;
  }): Promise<void> {
    const token = await this.requiredToken();
    await this.teamGateway('POST', token, input);
    await this.refreshPeople();
  }

  async updateAdmin(
    userId: string,
    patch: Partial<Pick<AdminUserRecord, 'role' | 'displayName' | 'isActive' | 'permissions' | 'primaryBranchId'>>,
  ): Promise<void> {
    const token = await this.requiredToken();
    await this.teamGateway('PATCH', token, { userId, ...patch });
    await this.refreshPeople();
  }

  private syncHomepageSignals(): void {
    this._sections.set(this.homepage.sections().map((row) => ({ ...row, settings: { ...row.settings } })));
    this._placements.set(this.homepage.placements().map((row) => ({ ...row, metadata: { ...row.metadata } })));
  }

  private async teamGateway(method: 'POST' | 'PATCH', token: string, body: unknown): Promise<void> {
    const payload = await this.request<{ ok?: boolean; code?: string; message?: string }>(
      this.adminTeamEndpoint,
      method,
      token,
      body,
    );
    if (payload.ok !== true) throw new Error(payload.code || payload.message || 'ADMIN_TEAM_FAILED');
  }

  private staffFromRow(row: RawRecord): StaffProfile {
    return {
      id: String(row['id'] || ''),
      authUserId: this.optionalString(row['auth_user_id']),
      displayName: String(row['display_name'] || ''),
      email: this.optionalString(row['email']),
      phone: this.optionalString(row['phone']),
      jobTitle: this.optionalString(row['job_title']),
      department: String(row['department'] || 'GENERAL') as StaffProfile['department'],
      isActive: row['is_active'] !== false,
      metadata: this.objectValue(row['metadata']),
    };
  }

  private branchFromRow(row: RawRecord): BranchRecord {
    return {
      id: String(row['id'] || ''),
      code: String(row['code'] || ''),
      name: String(row['name'] || ''),
      city: String(row['city'] || ''),
      district: this.optionalString(row['district']),
      address: this.optionalString(row['address_line']),
      phone: this.optionalString(row['phone']),
      email: this.optionalString(row['email']),
      isActive: row['is_active'] !== false,
      sortOrder: Number(row['sort_order'] || 0),
    };
  }

  private adminFromRow(row: RawRecord): AdminUserRecord {
    return {
      userId: String(row['user_id'] || ''),
      email: String(row['email'] || ''),
      role: String(row['role'] || 'support') as AdminUserRecord['role'],
      displayName: this.optionalString(row['display_name']),
      phone: this.optionalString(row['phone']),
      isActive: row['is_active'] !== false,
      permissions: this.objectValue(row['permissions']),
      primaryBranchId: this.optionalString(row['primary_branch_id']),
    };
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private optionalString(value: unknown): string | undefined {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || undefined;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH',
    token: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(endpoint, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
        'x-request-id': crypto.randomUUID(),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({})) as T & { code?: string; message?: string };
    if (!response.ok) throw new Error(String(payload.code || payload.message || `ADMIN_GATEWAY_${response.status}`));
    return payload;
  }
}
