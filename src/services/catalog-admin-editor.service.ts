import { Injectable, inject } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export interface VehicleAdminRecord {
  id: string;
  stockCode: string;
  category: "RENTAL" | "SALE";
  brand: string;
  model: string;
  modelYear?: number;
  price: number;
  rentalPriceDaily?: number;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  engine?: string;
  seats?: number;
  doors?: number;
  location?: string;
  description?: string;
  features: string[];
  images: string[];
  coverImage?: string;
  isFeatured: boolean;
  isActive: boolean;
  availabilityStatus: string;
  seoSlug?: string;
  publicationStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  scheduledAt?: string;
  metadata: Record<string, unknown>;
}

export interface TourAdminRecord {
  id: string;
  title: string;
  seoSlug: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  pricePerPerson: number;
  duration?: string;
  capacity?: number;
  meetingPoint?: string;
  itinerary: unknown[];
  includedItems: string[];
  excludedItems: string[];
  images: string[];
  coverImage?: string;
  isFeatured: boolean;
  isActive: boolean;
  publicationStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string;
  scheduledAt?: string;
  metadata: Record<string, unknown>;
}

@Injectable({ providedIn: "root" })
export class CatalogAdminEditorService {
  private readonly auth = inject(AuthService);

  async vehicles(): Promise<VehicleAdminRecord[]> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>("GET", "vehicles?select=*&order=updated_at.desc", undefined, token);
    return rows.map((row) => this.vehicleFromRow(row));
  }

  async tours(): Promise<TourAdminRecord[]> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>("GET", "tours?select=*&order=updated_at.desc", undefined, token);
    return rows.map((row) => this.tourFromRow(row));
  }

  async saveVehicle(record: VehicleAdminRecord): Promise<void> {
    const token = await this.requiredToken();
    const body = {
      stock_code: record.stockCode.trim(),
      category: record.category,
      brand: record.brand.trim(),
      model: record.model.trim(),
      model_year: record.modelYear ?? null,
      price: Math.max(0, Number(record.price) || 0),
      rental_price_daily: record.category === "RENTAL" ? Math.max(0, Number(record.rentalPriceDaily ?? record.price) || 0) : null,
      mileage_km: record.category === "SALE" ? record.mileageKm ?? null : null,
      fuel_type: record.fuelType?.trim() || null,
      transmission: record.transmission?.trim() || null,
      body_type: record.bodyType?.trim() || null,
      color: record.color?.trim() || null,
      engine: record.engine?.trim() || null,
      seats: record.seats ?? null,
      doors: record.doors ?? null,
      location: record.location?.trim() || null,
      description: record.description?.trim() || null,
      features: record.features.filter(Boolean).slice(0, 100),
      images: record.images.filter(Boolean).slice(0, 30),
      cover_image: record.coverImage?.trim() || record.images[0] || null,
      is_featured: record.isFeatured,
      is_active: record.isActive,
      availability_status: record.availabilityStatus || "AVAILABLE",
      seo_slug: record.seoSlug?.trim() || null,
      publication_status: record.publicationStatus,
      published_at: record.publicationStatus === "PUBLISHED" ? (record.publishedAt || new Date().toISOString()) : record.publishedAt || null,
      scheduled_at: record.publicationStatus === "SCHEDULED" ? record.scheduledAt || null : null,
      metadata: record.metadata || {},
      updated_at: new Date().toISOString(),
    };
    await this.rest("PATCH", `vehicles?id=eq.${encodeURIComponent(record.id)}`, body, token);
  }

  async saveTour(record: TourAdminRecord): Promise<void> {
    const token = await this.requiredToken();
    const body = {
      title: record.title.trim(),
      seo_slug: record.seoSlug.trim(),
      category: record.category?.trim() || null,
      short_description: record.shortDescription?.trim() || null,
      description: record.description?.trim() || null,
      price_per_person: Math.max(0, Number(record.pricePerPerson) || 0),
      duration: record.duration?.trim() || null,
      capacity: record.capacity ?? null,
      meeting_point: record.meetingPoint?.trim() || null,
      itinerary: record.itinerary || [],
      included_items: record.includedItems.filter(Boolean).slice(0, 100),
      excluded_items: record.excludedItems.filter(Boolean).slice(0, 100),
      images: record.images.filter(Boolean).slice(0, 30),
      cover_image: record.coverImage?.trim() || record.images[0] || null,
      is_featured: record.isFeatured,
      is_active: record.isActive,
      publication_status: record.publicationStatus,
      published_at: record.publicationStatus === "PUBLISHED" ? (record.publishedAt || new Date().toISOString()) : record.publishedAt || null,
      scheduled_at: record.publicationStatus === "SCHEDULED" ? record.scheduledAt || null : null,
      metadata: record.metadata || {},
      updated_at: new Date().toISOString(),
    };
    await this.rest("PATCH", `tours?id=eq.${encodeURIComponent(record.id)}`, body, token);
  }

  private vehicleFromRow(row: any): VehicleAdminRecord {
    return {
      id: String(row.id), stockCode: String(row.stock_code || ""), category: row.category === "SALE" ? "SALE" : "RENTAL",
      brand: String(row.brand || ""), model: String(row.model || ""), modelYear: row.model_year ?? undefined,
      price: Number(row.price || 0), rentalPriceDaily: row.rental_price_daily == null ? undefined : Number(row.rental_price_daily),
      mileageKm: row.mileage_km ?? undefined, fuelType: row.fuel_type || undefined, transmission: row.transmission || undefined,
      bodyType: row.body_type || undefined, color: row.color || undefined, engine: row.engine || undefined,
      seats: row.seats ?? undefined, doors: row.doors ?? undefined, location: row.location || undefined,
      description: row.description || undefined, features: Array.isArray(row.features) ? row.features : [],
      images: Array.isArray(row.images) ? row.images : [], coverImage: row.cover_image || undefined,
      isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false, availabilityStatus: row.availability_status || "AVAILABLE",
      seoSlug: row.seo_slug || undefined, publicationStatus: row.publication_status || "PUBLISHED",
      publishedAt: row.published_at || undefined, scheduledAt: row.scheduled_at || undefined,
      metadata: row.metadata || {},
    };
  }

  private tourFromRow(row: any): TourAdminRecord {
    return {
      id: String(row.id), title: String(row.title || ""), seoSlug: String(row.seo_slug || ""), category: row.category || undefined,
      shortDescription: row.short_description || undefined, description: row.description || undefined,
      pricePerPerson: Number(row.price_per_person || 0), duration: row.duration || undefined, capacity: row.capacity ?? undefined,
      meetingPoint: row.meeting_point || undefined, itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
      includedItems: Array.isArray(row.included_items) ? row.included_items : [], excludedItems: Array.isArray(row.excluded_items) ? row.excluded_items : [],
      images: Array.isArray(row.images) ? row.images : [], coverImage: row.cover_image || undefined,
      isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false,
      publicationStatus: row.publication_status || "PUBLISHED", publishedAt: row.published_at || undefined, scheduledAt: row.scheduled_at || undefined,
      metadata: row.metadata || {},
    };
  }

  private async rest<T = unknown>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, ...(method === "GET" ? {} : { "content-type": "application/json" }) },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(String(payload?.message || payload?.code || `CATALOG_ADMIN_${response.status}`));
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
