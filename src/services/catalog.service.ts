import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export interface CatalogBlogPost {
  id: number | string;
  title: string;
  summary: string;
  content: string;
  image: string;
  readTime: string;
  date: string;
  cloudId?: string;
  cloudSlug?: string;
}

export interface CatalogFaqItem {
  id: number | string;
  question: string;
  answer: string;
  category?: string;
  cloudId?: string;
}

interface CatalogListResponse<T> {
  ok: boolean;
  resource?: string;
  records?: T[];
  value?: unknown;
  record?: T;
  code?: string;
}

type PublicResource = "vehicles" | "tours" | "blog" | "faqs" | "config";

@Injectable({ providedIn: "root" })
export class CatalogService {
  private readonly authService = inject(AuthService);

  async loadVehicles(fresh = false): Promise<Vehicle[]> {
    return this.loadList<Vehicle>("vehicles", fresh);
  }

  async loadTours(fresh = false): Promise<Vehicle[]> {
    return this.loadList<Vehicle>("tours", fresh);
  }

  async loadBlog(fresh = false): Promise<CatalogBlogPost[]> {
    return this.loadList<CatalogBlogPost>("blog", fresh);
  }

  async loadFaqs(fresh = false): Promise<CatalogFaqItem[]> {
    return this.loadList<CatalogFaqItem>("faqs", fresh);
  }

  async loadConfig(fresh = false): Promise<Partial<SiteConfig> | null> {
    const payload = await this.publicRequest<never>("config", fresh);
    if (!payload.ok) throw new Error(payload.code || "CONFIG_LOAD_FAILED");
    return payload.value && typeof payload.value === "object"
      ? (payload.value as Partial<SiteConfig>)
      : null;
  }

  async saveVehicle(vehicle: Vehicle): Promise<Vehicle> {
    return this.saveRecord<Vehicle>("vehicles", vehicle);
  }

  async disableVehicle(vehicle: Pick<Vehicle, "id"> & Record<string, unknown>): Promise<void> {
    await this.adminRequest("DELETE", "vehicles", vehicle);
  }

  async saveTour(tour: Vehicle): Promise<Vehicle> {
    return this.saveRecord<Vehicle>("tours", tour);
  }

  async disableTour(tour: Pick<Vehicle, "id"> & Record<string, unknown>): Promise<void> {
    await this.adminRequest("DELETE", "tours", tour);
  }

  async saveBlog(post: CatalogBlogPost): Promise<CatalogBlogPost> {
    return this.saveRecord<CatalogBlogPost>("blog", post);
  }

  async disableBlog(post: CatalogBlogPost): Promise<void> {
    await this.adminRequest("DELETE", "blog", post);
  }

  async saveFaq(faq: CatalogFaqItem): Promise<CatalogFaqItem> {
    return this.saveRecord<CatalogFaqItem>("faqs", faq);
  }

  async disableFaq(faq: CatalogFaqItem): Promise<void> {
    await this.adminRequest("DELETE", "faqs", faq);
  }

  async saveConfig(config: SiteConfig): Promise<SiteConfig> {
    const payload = await this.adminRequest<CatalogListResponse<never>>(
      "PUT",
      "config",
      config,
    );
    if (!payload.ok) throw new Error(payload.code || "CONFIG_SAVE_FAILED");
    return (payload.value || config) as SiteConfig;
  }

  private async loadList<T>(resource: Exclude<PublicResource, "config">, fresh = false): Promise<T[]> {
    const payload = await this.publicRequest<T>(resource, fresh);
    if (!payload.ok || !Array.isArray(payload.records)) {
      throw new Error(payload.code || "CATALOG_LOAD_FAILED");
    }
    return payload.records;
  }

  /**
   * Public catalogue content is intentionally resilient to Vercel Function routing.
   * We prefer /api/catalog so one mapper remains authoritative, but if a new deployment,
   * rewrite or transient function outage makes that endpoint unavailable, the browser
   * can safely read the same published rows directly through Supabase RLS.
   */
  private async publicRequest<T>(resource: PublicResource, fresh: boolean): Promise<CatalogListResponse<T>> {
    try {
      const payload = await this.request<CatalogListResponse<T>>(
        "GET",
        resource,
        undefined,
        undefined,
        fresh,
      );
      if (payload.ok) return payload;
    } catch (error) {
      console.warn(`Public catalog API fallback activated for ${resource}`, error);
    }
    return this.directPublicRequest<T>(resource, fresh);
  }

  private async directPublicRequest<T>(resource: PublicResource, fresh: boolean): Promise<CatalogListResponse<T>> {
    const path = this.publicRestPath(resource);
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method: "GET",
      cache: fresh ? "no-store" : "default",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        ...(fresh ? { "cache-control": "no-cache" } : {}),
      },
    });
    if (!response.ok) throw new Error(`CATALOG_DIRECT_${resource.toUpperCase()}_${response.status}`);
    const rows = (await response.json()) as unknown;
    const list = Array.isArray(rows) ? rows : [];

    if (resource === "config") {
      const value = list[0] && typeof list[0] === "object"
        ? (list[0] as Record<string, unknown>)["value"]
        : null;
      return { ok: true, resource, value } as CatalogListResponse<T>;
    }

    const records = list.map((row) => this.mapPublicRow(resource, row)) as T[];
    return { ok: true, resource, records };
  }

  private publicRestPath(resource: PublicResource): string {
    switch (resource) {
      case "vehicles":
        return "vehicles?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      case "tours":
        return "tours?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      case "blog":
        return "blog_posts?status=eq.PUBLISHED&select=*&order=published_at.desc";
      case "faqs":
        return "faqs?is_active=eq.true&select=*&order=sort_order.asc";
      case "config":
        return "site_config?key=eq.site_settings&is_public=eq.true&select=value,updated_at&limit=1";
    }
  }

  private mapPublicRow(resource: Exclude<PublicResource, "config">, raw: unknown): Record<string, unknown> {
    const row = raw && typeof raw === "object" ? raw as Record<string, any> : {};
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    if (resource === "vehicles") {
      const images = Array.isArray(row["images"]) ? row["images"] : [];
      const category = row["category"] === "SALE" ? "SALE" : "RENTAL";
      const id = this.legacyId(metadata["legacyId"]) ?? row["id"];
      return {
        ...metadata,
        id,
        category,
        brand: row["brand"] || "",
        model: row["model"] || "",
        year: row["model_year"] ?? undefined,
        price: Number(category === "RENTAL" ? row["rental_price_daily"] ?? row["price"] ?? 0 : row["price"] ?? 0),
        km: row["mileage_km"] ?? undefined,
        fuel: row["fuel_type"] || undefined,
        transmission: row["transmission"] || undefined,
        type: row["body_type"] || undefined,
        color: row["color"] || undefined,
        engineVolume: row["engine"] || metadata["engineVolume"] || undefined,
        seats: row["seats"] ?? undefined,
        location: row["location"] || undefined,
        description: row["description"] || "",
        features: Array.isArray(row["features"]) ? row["features"] : [],
        images,
        image: row["cover_image"] || images[0] || undefined,
        isFeatured: Boolean(row["is_featured"]),
        isAvailable: row["availability_status"] === "AVAILABLE",
        availability: category === "SALE"
          ? row["availability_status"] === "SOLD" ? "Satıldı" : metadata["availability"] || "Satışta"
          : metadata["availability"],
        cloudId: row["id"],
        cloudStockCode: row["stock_code"],
        publicationStatus: row["publication_status"],
        publishedAt: row["published_at"] || undefined,
        scheduledAt: row["scheduled_at"] || undefined,
        branchId: row["branch_id"] || undefined,
        listingOrigin: row["listing_origin"] || undefined,
        updatedAt: row["updated_at"],
      };
    }

    if (resource === "tours") {
      const images = Array.isArray(row["images"]) ? row["images"] : [];
      return {
        ...metadata,
        id: this.legacyId(metadata["legacyId"]) ?? row["id"],
        category: "TOUR",
        title: row["title"] || "",
        description: row["description"] || row["short_description"] || "",
        price: Number(row["price_per_person"] || 0),
        duration: row["duration"] || undefined,
        capacity: row["capacity"] ?? undefined,
        meetingPoint: row["meeting_point"] || undefined,
        itinerary: Array.isArray(row["itinerary"]) ? row["itinerary"] : [],
        includedItems: Array.isArray(row["included_items"]) ? row["included_items"] : [],
        excludedItems: Array.isArray(row["excluded_items"]) ? row["excluded_items"] : [],
        image: row["cover_image"] || images[0] || undefined,
        images,
        isFeatured: Boolean(row["is_featured"]),
        cloudId: row["id"],
        cloudSlug: row["seo_slug"],
        publicationStatus: row["publication_status"],
        branchId: row["branch_id"] || undefined,
        listingOrigin: row["listing_origin"] || undefined,
        updatedAt: row["updated_at"],
      };
    }

    if (resource === "blog") {
      return {
        id: this.legacyId(metadata["legacyId"]) ?? row["id"],
        title: row["title"] || "",
        summary: row["excerpt"] || "",
        content: row["content"] || "",
        image: row["cover_image"] || "",
        readTime: metadata["readTime"] || "4 Dk Okuma",
        date: metadata["originalDate"] || (row["published_at"] ? new Date(row["published_at"]).toLocaleDateString("tr-TR") : ""),
        cloudId: row["id"],
        cloudSlug: row["slug"],
        updatedAt: row["updated_at"],
      };
    }

    return {
      id: row["sort_order"] || row["id"],
      question: row["question"] || "",
      answer: row["answer"] || "",
      category: row["category"] || undefined,
      cloudId: row["id"],
      updatedAt: row["updated_at"],
    };
  }

  private legacyId(value: unknown): number | string | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string" || !value.trim()) return null;
    const normalized = value.trim();
    return /^\d+$/.test(normalized) ? Number(normalized) : normalized.slice(0, 120);
  }

  private async saveRecord<T>(resource: string, record: T): Promise<T> {
    const payload = await this.adminRequest<CatalogListResponse<T>>(
      "PUT",
      resource,
      record,
    );
    if (!payload.ok || !payload.record) {
      throw new Error(payload.code || "CATALOG_SAVE_FAILED");
    }
    return payload.record;
  }

  private async adminRequest<T = CatalogListResponse<unknown>>(
    method: "PUT" | "POST" | "DELETE",
    resource: string,
    body: unknown,
  ): Promise<T> {
    const token = await this.authService.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return this.request<T>(method, resource, body, token);
  }

  private async request<T>(
    method: "GET" | "PUT" | "POST" | "DELETE",
    resource: string,
    body?: unknown,
    token?: string,
    fresh = false,
  ): Promise<T> {
    const freshQuery = fresh && method === "GET" ? `&fresh=${Date.now()}` : "";
    const response = await fetch(
      `/api/catalog?resource=${encodeURIComponent(resource)}${freshQuery}`,
      {
        method,
        cache: fresh ? "no-store" : "default",
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(fresh ? { "cache-control": "no-cache" } : {}),
          ...(method === "GET" ? {} : { "content-type": "application/json" }),
        },
        body: method === "GET" ? undefined : JSON.stringify(body),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as T & {
      code?: string;
    };
    if (!response.ok) {
      throw new Error(payload.code || `CATALOG_HTTP_${response.status}`);
    }
    return payload;
  }
}
