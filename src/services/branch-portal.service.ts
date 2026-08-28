import { Injectable, inject, signal } from "@angular/core";
import { Branch } from "../models/branch.model";
import { Vehicle } from "../models/car.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { BranchPortalAuthService } from "./branch-portal-auth.service";

export type BranchMemberRole = "BRANCH_OWNER" | "BRANCH_MANAGER" | "BRANCH_EDITOR";

export interface BranchPortalMembership {
  branchId: string;
  role: BranchMemberRole;
  branch: Branch;
}

export interface BranchPricingRule {
  id: string;
  branchId?: string;
  category: "RENTAL" | "SALE" | "TOUR";
  vehicleClass: string;
  minPrice?: number;
  maxPrice?: number;
  recommendedPrice?: number;
  currency: string;
  enforceMin: boolean;
  enforceMax: boolean;
}

export interface BranchNetworkPolicy {
  id: string;
  ruleKey: string;
  version: number;
  category: string;
  title: string;
  summary?: string;
  content: string;
  isRequired: boolean;
  accepted: boolean;
}

export interface BranchSetupItem {
  id: string;
  key: string;
  label: string;
  required: boolean;
  completedAt?: string;
  notes?: string;
}

export interface BranchBooking {
  id: string;
  type: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
  createdAt?: string;
}

export interface BranchVehicleDraft {
  cloudId?: string;
  category: "RENTAL" | "SALE";
  brand: string;
  model: string;
  year?: number;
  price: number;
  km?: number;
  fuel?: string;
  transmission?: string;
  type?: string;
  color?: string;
  seats?: number;
  location?: string;
  description?: string;
  features?: string[];
  images?: string[];
  coverImage?: string;
}

const BRANCH_PORTAL_BRANCH_SELECT = [
  "id", "code", "slug", "name", "city", "district", "address_line", "phone", "whatsapp", "email", "latitude", "longitude",
  "map_url", "opening_hours", "services", "is_active", "is_pickup_point", "is_return_point", "sort_order", "network_type",
  "public_status", "territory_label", "public_description", "hero_image", "customer_guarantee_enabled", "central_pricing_required",
  "listing_requires_approval", "brand_profile", "service_rules",
].join(",");
const BRANCH_PORTAL_VEHICLE_SELECT = [
  "id", "stock_code", "category", "brand", "model", "model_year", "price", "rental_price_daily", "mileage_km", "fuel_type",
  "transmission", "body_type", "color", "seats", "location", "description", "features", "images", "cover_image", "is_featured",
  "is_active", "availability_status", "publication_status", "branch_id", "listing_origin", "rejection_reason", "metadata", "updated_at",
].join(",");
const BRANCH_PRICING_SELECT = "id,branch_id,category,vehicle_class,min_price,max_price,recommended_price,currency,enforce_min,enforce_max";
const NETWORK_POLICY_SELECT = "id,rule_key,version,category,title,summary,content,is_required";
const BRANCH_SETUP_SELECT = "id,checklist_key,label,is_required,completed_at,notes,sort_order";
const BRANCH_BOOKING_SELECT = "id,booking_type,status,customer_name,customer_phone,customer_email,start_date,end_date,total_price,created_at";

@Injectable({ providedIn: "root" })
export class BranchPortalService {
  private readonly auth = inject(BranchPortalAuthService);
  private readonly _memberships = signal<BranchPortalMembership[]>([]);
  private readonly _selectedBranchId = signal<string>("");
  private readonly _vehicles = signal<Vehicle[]>([]);
  private readonly _pricing = signal<BranchPricingRule[]>([]);
  private readonly _policies = signal<BranchNetworkPolicy[]>([]);
  private readonly _setup = signal<BranchSetupItem[]>([]);
  private readonly _bookings = signal<BranchBooking[]>([]);
  private readonly _loading = signal(false);

  readonly memberships = this._memberships.asReadonly();
  readonly selectedBranchId = this._selectedBranchId.asReadonly();
  readonly vehicles = this._vehicles.asReadonly();
  readonly pricing = this._pricing.asReadonly();
  readonly policies = this._policies.asReadonly();
  readonly setup = this._setup.asReadonly();
  readonly bookings = this._bookings.asReadonly();
  readonly loading = this._loading.asReadonly();

  currentMembership(): BranchPortalMembership | undefined {
    return this._memberships().find((item) => item.branchId === this._selectedBranchId());
  }

  async loadMemberships(): Promise<BranchPortalMembership[]> {
    const token = await this.requiredToken();
    const userId = this.auth.session()?.userId;
    if (!userId) throw new Error("BRANCH_SESSION_REQUIRED");
    const memberships = await this.rest<any[]>(
      `branch_memberships?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=branch_id,role&order=created_at.asc`,
      { method: "GET" },
      token,
    );
    const results: BranchPortalMembership[] = [];
    for (const membership of Array.isArray(memberships) ? memberships : []) {
      const branchId = String(membership.branch_id || "");
      if (!branchId) continue;
      const branches = await this.rest<any[]>(`branches?id=eq.${encodeURIComponent(branchId)}&select=${BRANCH_PORTAL_BRANCH_SELECT}&limit=1`, { method: "GET" }, token);
      const row = Array.isArray(branches) ? branches[0] : null;
      if (!row) continue;
      results.push({ branchId, role: String(membership.role || "BRANCH_EDITOR") as BranchMemberRole, branch: this.mapBranch(row) });
    }
    this._memberships.set(results);
    if (!this._selectedBranchId() || !results.some((item) => item.branchId === this._selectedBranchId())) {
      this._selectedBranchId.set(results[0]?.branchId || "");
    }
    return results;
  }

  async selectBranch(branchId: string): Promise<void> {
    if (!this._memberships().some((item) => item.branchId === branchId)) throw new Error("BRANCH_ACCESS_DENIED");
    this._selectedBranchId.set(branchId);
    await this.refreshWorkspace();
  }

  async refreshWorkspace(): Promise<void> {
    const branchId = this._selectedBranchId();
    if (!branchId) return;
    this._loading.set(true);
    try {
      await Promise.all([
        this.loadVehicles(branchId),
        this.loadPricing(branchId),
        this.loadPolicies(branchId),
        this.loadSetup(branchId),
        this.loadBookings(branchId),
      ]);
    } finally {
      this._loading.set(false);
    }
  }

  async saveVehicle(input: BranchVehicleDraft, submitForReview: boolean): Promise<Vehicle> {
    const branchId = this.requiredBranchId();
    const token = await this.requiredToken();
    const category = input.category === "SALE" ? "SALE" : "RENTAL";
    const brand = input.brand.trim().slice(0, 120);
    const model = input.model.trim().slice(0, 160);
    const price = Number(input.price);
    if (!brand || !model || !Number.isFinite(price) || price <= 0) throw new Error("VEHICLE_REQUIRED_FIELDS");

    const images = (input.images || []).filter((value) => /^https:\/\//i.test(value)).slice(0, 30);
    const payload: Record<string, unknown> = {
      category,
      brand,
      model,
      model_year: this.numberOrNull(input.year),
      price,
      currency: "TRY",
      rental_price_daily: category === "RENTAL" ? price : null,
      mileage_km: category === "SALE" ? this.numberOrNull(input.km) : null,
      fuel_type: this.clean(input.fuel, 40) || null,
      transmission: this.clean(input.transmission, 40) || null,
      body_type: this.clean(input.type, 60) || null,
      color: this.clean(input.color, 60) || null,
      seats: this.numberOrNull(input.seats),
      location: this.clean(input.location, 240) || null,
      description: this.clean(input.description, 10_000) || null,
      features: (input.features || []).map((item) => this.clean(item, 120)).filter(Boolean).slice(0, 100),
      images,
      cover_image: this.clean(input.coverImage, 2048) || images[0] || null,
      is_featured: false,
      is_active: true,
      availability_status: "AVAILABLE",
      publication_status: submitForReview ? "PENDING_REVIEW" : "DRAFT",
      record_origin: "REAL",
      data_quality_status: "UNVERIFIED",
      actual_vehicle_verified: false,
      branch_id: branchId,
      listing_origin: "BRANCH",
      metadata: { portalVersion: 1 },
    };

    let rows: any[];
    if (input.cloudId) {
      rows = await this.rest<any[]>(
        `vehicles?id=eq.${encodeURIComponent(input.cloudId)}&branch_id=eq.${encodeURIComponent(branchId)}&select=${BRANCH_PORTAL_VEHICLE_SELECT}`,
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) },
        token,
      );
    } else {
      payload["stock_code"] = `BR-${branchId.slice(0, 8).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      rows = await this.rest<any[]>(
        `vehicles?select=${BRANCH_PORTAL_VEHICLE_SELECT}`,
        { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) },
        token,
      );
    }
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) throw new Error("BRANCH_VEHICLE_SAVE_FAILED");
    const mapped = this.mapVehicle(row);
    await this.loadVehicles(branchId);
    return mapped;
  }

  async hideVehicle(cloudId: string): Promise<void> {
    const branchId = this.requiredBranchId();
    const token = await this.requiredToken();
    await this.rest(
      `vehicles?id=eq.${encodeURIComponent(cloudId)}&branch_id=eq.${encodeURIComponent(branchId)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false, publication_status: "PENDING_REVIEW" }) },
      token,
    );
    await this.loadVehicles(branchId);
  }

  async uploadVehicleImage(file: File): Promise<string> {
    const branchId = this.requiredBranchId();
    const token = await this.requiredToken();
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (!allowed.has(file.type)) throw new Error("IMAGE_TYPE_NOT_ALLOWED");
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[file.type] || "jpg";
    const path = `branches/${branchId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const response = await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/vehicle-media/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        "content-type": file.type,
        "x-upsert": "false",
      },
      body: file,
    });
    if (!response.ok) throw new Error("IMAGE_UPLOAD_FAILED");
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/vehicle-media/${path}`;
  }

  async acceptPolicy(policyId: string): Promise<void> {
    const branchId = this.requiredBranchId();
    const token = await this.requiredToken();
    const userId = this.auth.session()?.userId;
    if (!userId) throw new Error("BRANCH_SESSION_REQUIRED");
    await this.rest(
      "branch_policy_acceptances?on_conflict=branch_id,policy_rule_id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ branch_id: branchId, policy_rule_id: policyId, accepted_by: userId, metadata: { source: "branch_portal" } }),
      },
      token,
    );
    await this.loadPolicies(branchId);
  }

  priceHint(category: "RENTAL" | "SALE", vehicleClass = "*"): BranchPricingRule | undefined {
    const exact = this._pricing().find((rule) => rule.category === category && rule.vehicleClass === vehicleClass && rule.branchId === this._selectedBranchId());
    const branchGeneric = this._pricing().find((rule) => rule.category === category && rule.vehicleClass === "*" && rule.branchId === this._selectedBranchId());
    const globalExact = this._pricing().find((rule) => rule.category === category && rule.vehicleClass === vehicleClass && !rule.branchId);
    const globalGeneric = this._pricing().find((rule) => rule.category === category && rule.vehicleClass === "*" && !rule.branchId);
    return exact || branchGeneric || globalExact || globalGeneric;
  }

  private async loadVehicles(branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>(`vehicles?branch_id=eq.${encodeURIComponent(branchId)}&select=${BRANCH_PORTAL_VEHICLE_SELECT}&order=updated_at.desc`, { method: "GET" }, token);
    this._vehicles.set((Array.isArray(rows) ? rows : []).map((row) => this.mapVehicle(row)));
  }

  private async loadPricing(branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const [branchRules, globalRules] = await Promise.all([
      this.rest<any[]>(`branch_pricing_rules?branch_id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&select=${BRANCH_PRICING_SELECT}&order=vehicle_class.asc`, { method: "GET" }, token),
      this.rest<any[]>(`branch_pricing_rules?branch_id=is.null&is_active=eq.true&select=${BRANCH_PRICING_SELECT}&order=vehicle_class.asc`, { method: "GET" }, token),
    ]);
    this._pricing.set([...(Array.isArray(branchRules) ? branchRules : []), ...(Array.isArray(globalRules) ? globalRules : [])].map((row) => ({
      id: String(row.id), branchId: row.branch_id ? String(row.branch_id) : undefined, category: String(row.category) as BranchPricingRule["category"], vehicleClass: String(row.vehicle_class || "*"), minPrice: row.min_price === null ? undefined : Number(row.min_price), maxPrice: row.max_price === null ? undefined : Number(row.max_price), recommendedPrice: row.recommended_price === null ? undefined : Number(row.recommended_price), currency: String(row.currency || "TRY"), enforceMin: row.enforce_min !== false, enforceMax: row.enforce_max === true,
    })));
  }

  private async loadPolicies(branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const [rules, accepted] = await Promise.all([
      this.rest<any[]>(`network_policy_rules?is_active=eq.true&select=${NETWORK_POLICY_SELECT}&order=category.asc,version.desc`, { method: "GET" }, token),
      this.rest<any[]>(`branch_policy_acceptances?branch_id=eq.${encodeURIComponent(branchId)}&select=policy_rule_id`, { method: "GET" }, token),
    ]);
    const acceptedIds = new Set((Array.isArray(accepted) ? accepted : []).map((row) => String(row.policy_rule_id)));
    this._policies.set((Array.isArray(rules) ? rules : []).map((row) => ({ id: String(row.id), ruleKey: String(row.rule_key || ""), version: Number(row.version || 1), category: String(row.category || ""), title: String(row.title || ""), summary: row.summary ? String(row.summary) : undefined, content: String(row.content || ""), isRequired: row.is_required !== false, accepted: acceptedIds.has(String(row.id)) })));
  }

  private async loadSetup(branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>(`branch_setup_checklist?branch_id=eq.${encodeURIComponent(branchId)}&select=${BRANCH_SETUP_SELECT}&order=sort_order.asc`, { method: "GET" }, token);
    this._setup.set((Array.isArray(rows) ? rows : []).map((row) => ({ id: String(row.id), key: String(row.checklist_key || ""), label: String(row.label || ""), required: row.is_required !== false, completedAt: row.completed_at ? String(row.completed_at) : undefined, notes: row.notes ? String(row.notes) : undefined })));
  }

  private async loadBookings(branchId: string): Promise<void> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>(`bookings?fulfillment_branch_id=eq.${encodeURIComponent(branchId)}&select=${BRANCH_BOOKING_SELECT}&order=created_at.desc&limit=100`, { method: "GET" }, token);
    this._bookings.set((Array.isArray(rows) ? rows : []).map((row) => ({ id: String(row.id), type: String(row.booking_type || ""), status: String(row.status || ""), customerName: row.customer_name ? String(row.customer_name) : undefined, customerPhone: row.customer_phone ? String(row.customer_phone) : undefined, customerEmail: row.customer_email ? String(row.customer_email) : undefined, startDate: row.start_date ? String(row.start_date) : undefined, endDate: row.end_date ? String(row.end_date) : undefined, totalPrice: row.total_price === null || row.total_price === undefined ? undefined : Number(row.total_price), createdAt: row.created_at ? String(row.created_at) : undefined })));
  }

  private mapBranch(row: any): Branch {
    return {
      id: String(row.code || row.id), cloudId: String(row.id), slug: row.slug || undefined, name: String(row.name || ""), city: String(row.city || ""), district: String(row.district || ""), addressLabel: String(row.address_line || ""), phone: String(row.phone || ""), whatsapp: row.whatsapp || undefined, email: row.email || undefined, latitude: row.latitude === null ? undefined : Number(row.latitude), longitude: row.longitude === null ? undefined : Number(row.longitude), mapUrl: row.map_url || undefined, workingHours: Array.isArray(row.opening_hours) ? row.opening_hours : [], services: Array.isArray(row.services) ? row.services : [], isActive: Boolean(row.is_active), isPickupPoint: Boolean(row.is_pickup_point), isReturnPoint: Boolean(row.is_return_point), priority: Number(row.sort_order || 0), networkType: row.network_type || "OWNED", publicStatus: row.public_status || "DRAFT", territoryLabel: row.territory_label || undefined, publicDescription: row.public_description || undefined, heroImage: row.hero_image || undefined, customerGuaranteeEnabled: row.customer_guarantee_enabled !== false, centralPricingRequired: row.central_pricing_required !== false, listingRequiresApproval: row.listing_requires_approval !== false, brandProfile: row.brand_profile || {}, serviceRules: row.service_rules || {},
    };
  }

  private mapVehicle(row: any): Vehicle {
    const category = row.category === "SALE" ? "SALE" : "RENTAL";
    const images = Array.isArray(row.images) ? row.images : [];
    return {
      id: row.metadata?.legacyId ?? row.id,
      cloudId: String(row.id),
      cloudStockCode: row.stock_code || undefined,
      category,
      publicationStatus: row.publication_status || "DRAFT",
      branchId: row.branch_id || undefined,
      listingOrigin: row.listing_origin || "BRANCH",
      rejectionReason: row.rejection_reason || undefined,
      brand: row.brand || "",
      model: row.model || "",
      year: row.model_year ?? undefined,
      price: Number(category === "RENTAL" ? row.rental_price_daily ?? row.price ?? 0 : row.price ?? 0),
      km: row.mileage_km ?? undefined,
      fuel: row.fuel_type || undefined,
      transmission: row.transmission || undefined,
      type: row.body_type || undefined,
      color: row.color || undefined,
      seats: row.seats ?? undefined,
      location: row.location || undefined,
      description: row.description || "",
      features: Array.isArray(row.features) ? row.features : [],
      images,
      image: row.cover_image || images[0] || undefined,
      isFeatured: Boolean(row.is_featured),
      isAvailable: row.availability_status === "AVAILABLE",
      updatedAt: row.updated_at || undefined,
    };
  }

  private async rest<T = unknown>(path: string, init: RequestInit, token: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const code = String(payload?.message || payload?.code || `BRANCH_REST_${response.status}`);
      if (code.includes("BRANCH_PRICE_OUTSIDE_CENTRAL_RULE")) throw new Error("BRANCH_PRICE_OUTSIDE_CENTRAL_RULE");
      if (code.includes("BRANCH_NOT_ACTIVE")) throw new Error("BRANCH_NOT_ACTIVE");
      throw new Error(code);
    }
    return payload as T;
  }

  private requiredBranchId(): string {
    const branchId = this._selectedBranchId();
    if (!branchId || !this._memberships().some((item) => item.branchId === branchId)) throw new Error("BRANCH_ACCESS_DENIED");
    return branchId;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("BRANCH_SESSION_REQUIRED");
    return token;
  }

  private numberOrNull(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private clean(value: unknown, max: number): string {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }
}
