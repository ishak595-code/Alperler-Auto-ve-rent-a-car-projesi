import { Injectable, inject, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export type BranchPartnerStatus =
  | "NEW"
  | "REVIEWING"
  | "CONTACTED"
  | "DUE_DILIGENCE"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export type BranchPartnerServiceType = "RENTAL" | "SALES" | "TOUR_TRANSFER";
export type BranchPartnerOfficeStatus = "OWN" | "RENT" | "PLAN" | "NONE";
export type BranchPartnerListingModel = "OWN_FLEET" | "REGIONAL_NETWORK" | "BOTH";
export type BranchPartnerBudgetRange = "DISCUSS" | "UNDER_100K" | "100K_250K" | "250K_500K" | "500K_PLUS";

export interface BranchPartnerSubmission {
  fullName: string;
  phone: string;
  email?: string;
  city: string;
  district: string;
  operatingArea?: string;
  currentBusiness?: string;
  experienceYears: number;
  officeStatus: BranchPartnerOfficeStatus;
  currentFleetSize: number;
  plannedFleetSize: number;
  services: BranchPartnerServiceType[];
  listingModel: BranchPartnerListingModel;
  budgetRange: BranchPartnerBudgetRange;
  notes?: string;
  website?: string;
}

export interface BranchPartnerAdminRecord {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  email?: string;
  city: string;
  district: string;
  operatingArea?: string;
  currentBusiness?: string;
  experienceYears: number;
  officeStatus: BranchPartnerOfficeStatus;
  currentFleetSize: number;
  plannedFleetSize: number;
  services: BranchPartnerServiceType[];
  listingModel: BranchPartnerListingModel;
  budgetRange: BranchPartnerBudgetRange;
  notes?: string;
  status: BranchPartnerStatus;
  internalNotes?: string;
  createdAt: Date;
}

interface GatewayResponse {
  ok: boolean;
  code?: string;
  message?: string;
  reference?: string;
  status?: BranchPartnerStatus;
  requests?: Record<string, unknown>[];
  request?: Record<string, unknown>;
}

@Injectable({ providedIn: "root" })
export class BranchPartnerService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/branch-partner-gateway`;
  private readonly submissionStorageKey = "alperler_branch_partner_submission_key";
  private submissionKey = this.loadSubmissionKey();
  private readonly _records = signal<BranchPartnerAdminRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly records = this._records.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async submit(input: BranchPartnerSubmission): Promise<{ reference: string }> {
    this._error.set(null);
    const payload = await this.callPublic("POST", {
      ...input,
      idempotencyKey: this.submissionKey,
    });
    if (!payload.ok || !payload.reference) throw new Error(payload.code || payload.message || "BRANCH_PARTNER_CREATE_FAILED");
    const reference = payload.reference;
    this.resetSubmissionKey();
    return { reference };
  }

  async refreshAdmin(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const token = await this.requiredToken();
      const response = await fetch(this.endpoint, {
        method: "GET",
        headers: this.headers(token),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as GatewayResponse;
      if (!response.ok || !payload.ok || !Array.isArray(payload.requests)) throw new Error(payload.code || "BRANCH_PARTNER_LIST_FAILED");
      this._records.set(payload.requests.map((row) => this.fromRow(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "BRANCH_PARTNER_LIST_FAILED";
      this._error.set(message);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async update(reference: string, status: BranchPartnerStatus, internalNotes = ""): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(this.endpoint, {
      method: "PATCH",
      headers: this.headers(token),
      body: JSON.stringify({ reference, status, internalNotes }),
    });
    const payload = (await response.json().catch(() => ({}))) as GatewayResponse;
    if (!response.ok || !payload.ok || !payload.request) throw new Error(payload.code || "BRANCH_PARTNER_UPDATE_FAILED");
    const updated = this.fromRow(payload.request);
    this._records.update((items) => items.map((item) => item.reference === reference ? updated : item));
  }

  private async callPublic(method: "POST", body: unknown): Promise<GatewayResponse> {
    const response = await fetch(this.endpoint, {
      method,
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as GatewayResponse;
    if (!response.ok) throw new Error(payload.code || payload.message || `BRANCH_PARTNER_${response.status}`);
    return payload;
  }

  private headers(token?: string): Record<string, string> {
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return token;
  }

  private fromRow(row: Record<string, unknown>): BranchPartnerAdminRecord {
    const services = Array.isArray(row["services"]) ? row["services"].map(String) : [];
    return {
      id: String(row["id"] || ""),
      reference: String(row["reference"] || ""),
      fullName: String(row["full_name"] || ""),
      phone: String(row["phone"] || ""),
      email: row["email"] ? String(row["email"]) : undefined,
      city: String(row["city"] || ""),
      district: String(row["district"] || ""),
      operatingArea: row["operating_area"] ? String(row["operating_area"]) : undefined,
      currentBusiness: row["current_business"] ? String(row["current_business"]) : undefined,
      experienceYears: Number(row["experience_years"] || 0),
      officeStatus: String(row["office_status"] || "PLAN") as BranchPartnerOfficeStatus,
      currentFleetSize: Number(row["current_fleet_size"] || 0),
      plannedFleetSize: Number(row["planned_fleet_size"] || 1),
      services: services as BranchPartnerServiceType[],
      listingModel: String(row["listing_model"] || "OWN_FLEET") as BranchPartnerListingModel,
      budgetRange: String(row["budget_range"] || "DISCUSS") as BranchPartnerBudgetRange,
      notes: row["notes"] ? String(row["notes"]) : undefined,
      status: String(row["status"] || "NEW") as BranchPartnerStatus,
      internalNotes: row["internal_notes"] ? String(row["internal_notes"]) : undefined,
      createdAt: new Date(String(row["created_at"] || new Date().toISOString())),
    };
  }

  private loadSubmissionKey(): string {
    if (typeof sessionStorage !== "undefined") {
      const existing = sessionStorage.getItem(this.submissionStorageKey);
      if (existing) return existing;
      const created = crypto.randomUUID();
      sessionStorage.setItem(this.submissionStorageKey, created);
      return created;
    }
    return crypto.randomUUID();
  }

  private resetSubmissionKey(): void {
    this.submissionKey = crypto.randomUUID();
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(this.submissionStorageKey, this.submissionKey);
  }
}
