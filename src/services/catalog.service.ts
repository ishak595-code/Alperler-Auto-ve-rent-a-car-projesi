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

interface SiteConfigMutationResponse {
  ok?: boolean;
  value?: SiteConfig;
  code?: string;
  message?: string;
}

type PublicResource = "vehicles" | "tours" | "blog" | "faqs" | "config";

const DIRECT_PAGE_SIZE = 500;
const DIRECT_MAX_PAGES = 100;

@Injectable({ providedIn: "root" })
export class CatalogService {
  private readonly authService = inject(AuthService);

  async loadVehicles(fresh = false): Promise<Vehicle[]> {
    const records = await this.loadList<Record<string, any>>("vehicles", fresh);
    return records.map((record) => this.normalizeVehicleRecord(record));
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
    const saved = await this.saveRecord<Record<string, any>>("vehicles", vehicle as unknown as Record<string, any>);
    return this.normalizeVehicleRecord(saved);
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
    const token = await this.authService.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch("/api/partner?op=site-content-admin", {
      method: "PATCH",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
        "x-request-id": crypto.randomUUID(),
      },
      body: JSON.stringify({ action: "saveSiteConfig", config }),
    });
    const payload = await response.json().catch(() => ({})) as SiteConfigMutationResponse;
    if (!response.ok || payload.ok !== true) throw new Error(payload.code || payload.message || `SITE_CONFIG_GATEWAY_${response.status}`);
    return payload.value && typeof payload.value === "object" ? payload.value : config;
  }

  private async loadList<T>(resource: Exclude<PublicResource, "config">, fresh = false): Promise<T[]> {
    const payload = await this.publicRequest<T>(resource, fresh);
    if (!payload.ok || !Array.isArray(payload.records)) throw new Error(payload.code || "CATALOG_LOAD_FAILED");
    return payload.records;
  }

  private publicRequest<T>(resource: PublicResource, fresh: boolean): Promise<CatalogListResponse<T>> {
    return this.directPublicRequest<T>(resource, fresh);
  }

  private async directPublicRequest<T>(resource: PublicResource, fresh: boolean): Promise<CatalogListResponse<T>> {
    const path = this.publicRestPath(resource);

    if (resource === "config") {
      const list = await this.directPage(path, 0, 0, fresh);
      const value = list[0] && typeof list[0] === "object"
        ? (list[0] as Record<string, unknown>)["value"]
        : null;
      return { ok: true, resource, value } as CatalogListResponse<T>;
    }

    const allRows: unknown[] = [];
    let expectedTotal: number | null = null;

    for (let page = 0; page < DIRECT_MAX_PAGES; page += 1) {
      const start = page * DIRECT_PAGE_SIZE;
      const end = start + DIRECT_PAGE_SIZE - 1;
      const pageResult = await this.directPageWithTotal(path, start, end, fresh);
      allRows.push(...pageResult.rows);
      expectedTotal = pageResult.total ?? expectedTotal;

      if (expectedTotal !== null && allRows.length >= expectedTotal) break;
      if (!pageResult.rows.length) break;
      if (expectedTotal === null && pageResult.rows.length < DIRECT_PAGE_SIZE) break;

      if (page === DIRECT_MAX_PAGES - 1) throw new Error("CATALOG_DIRECT_PAGE_LIMIT_REACHED");
    }

    const records = allRows.map((row) => this.mapPublicRow(resource, row)) as T[];
    return { ok: true, resource, records };
  }

  private async directPage(path: string, start: number, end: number, fresh: boolean): Promise<unknown[]> {
    const result = await this.directPageWithTotal(path, start, end, fresh);
    return result.rows;
  }

  private async directPageWithTotal(path: string, start: number, end: number, fresh: boolean): Promise<{ rows: unknown[]; total: number | null }> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method: "GET",
      cache: fresh ? "no-store" : "default",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        Prefer: "count=exact",
        Range: `${start}-${end}`,
        "Range-Unit": "items",
        ...(fresh ? { "cache-control": "no-cache" } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 416 && start > 0) return { rows: [], total: start };
    if (!response.ok) throw new Error(`CATALOG_DIRECT_HTTP_${response.status}`);

    const payload = await response.json() as unknown;
    const rows = Array.isArray(payload) ? payload : [];
    return { rows, total: this.totalFromContentRange(response.headers.get("content-range")) };
  }

  private totalFromContentRange(value: string | null): number | null {
    if (!value) return null;
    const rawTotal = value.split("/").pop();
    if (!rawTotal || rawTotal === "*") return null;
    const total = Number(rawTotal);
    return Number.isFinite(total) ? total : null;
  }

  private publicRestPath(resource: PublicResource): string {
    switch (resource) {
      case "vehicles": return "vehicles?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      case "tours": return "tours?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      case "blog": return "blog_posts?status=eq.PUBLISHED&select=*&order=published_at.desc";
      case "faqs": return "faqs?is_active=eq.true&select=*&order=sort_order.asc";
      case "config": return "site_config?key=eq.site_settings&is_public=eq.true&select=value,updated_at&limit=1";
    }
  }

  private mapPublicRow(resource: Exclude<PublicResource, "config">, raw: unknown): Record<string, unknown> {
    const row = raw && typeof raw === "object" ? raw as Record<string, any> : {};
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    if (resource === "vehicles") return this.normalizeVehicleRecord({ ...row, metadata }) as unknown as Record<string, unknown>;

    if (resource === "tours") {
      const images = Array.isArray(row["images"]) ? row["images"] : [];
      return {
        ...metadata,
        id: row["id"],
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
        id: row["id"],
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

  private normalizeVehicleRecord(raw: Record<string, any>): Vehicle {
    const row = raw && typeof raw === "object" ? raw : {};
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const category = row["category"] === "SALE" ? "SALE" : "RENTAL";
    const images = Array.isArray(row["images"])
      ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim()))
      : [];
    const databaseId = row["cloudId"] ?? row["id"];
    const availabilityStatus = row["availability_status"] ?? row["availabilityStatus"];
    const price = Number(category === "RENTAL" ? row["rental_price_daily"] ?? row["price"] ?? 0 : row["price"] ?? 0);

    return {
      ...metadata,
      ...row,
      id: databaseId,
      category,
      brand: String(row["brand"] || ""),
      model: String(row["model"] || ""),
      year: row["model_year"] ?? row["year"] ?? undefined,
      price: Number.isFinite(price) ? price : 0,
      km: row["mileage_km"] ?? row["km"] ?? undefined,
      fuel: row["fuel_type"] ?? row["fuel"] ?? undefined,
      transmission: row["transmission"] || undefined,
      type: row["body_type"] ?? row["type"] ?? undefined,
      color: row["color"] || undefined,
      engineVolume: row["engine"] ?? row["engineVolume"] ?? metadata["engineVolume"] ?? undefined,
      seats: row["seats"] ?? undefined,
      location: row["location"] || undefined,
      description: String(row["description"] || ""),
      features: Array.isArray(row["features"]) ? row["features"] : [],
      images,
      image: row["cover_image"] ?? row["image"] ?? images[0] ?? undefined,
      isFeatured: typeof row["isFeatured"] === "boolean" ? row["isFeatured"] : Boolean(row["is_featured"]),
      isAvailable: typeof row["isAvailable"] === "boolean"
        ? row["isAvailable"]
        : availabilityStatus ? availabilityStatus === "AVAILABLE" : true,
      availability: category === "SALE"
        ? availabilityStatus === "SOLD" ? "Satıldı" : row["availability"] || metadata["availability"] || "Satışta"
        : row["availability"] ?? metadata["availability"],
      cloudId: row["cloudId"] ?? row["id"],
      cloudStockCode: row["cloudStockCode"] ?? row["stock_code"] ?? undefined,
      publicationStatus: row["publicationStatus"] ?? row["publication_status"] ?? undefined,
      publishedAt: row["publishedAt"] ?? row["published_at"] ?? undefined,
      scheduledAt: row["scheduledAt"] ?? row["scheduled_at"] ?? undefined,
      branchId: row["branchId"] ?? row["branch_id"] ?? undefined,
      listingOrigin: row["listingOrigin"] ?? row["listing_origin"] ?? undefined,
      createdAt: row["createdAt"] ?? row["created_at"] ?? undefined,
      updatedAt: row["updatedAt"] ?? row["updated_at"] ?? undefined,
    } as Vehicle;
  }

  private async saveRecord<T>(resource: string, record: unknown): Promise<T> {
    const payload = await this.adminRequest<CatalogListResponse<T>>("PUT", resource, record);
    if (!payload.ok || !payload.record) throw new Error(payload.code || "CATALOG_SAVE_FAILED");
    return payload.record;
  }

  private async adminRequest<T = CatalogListResponse<unknown>>(
    method: "PUT" | "POST" | "DELETE",
    resource: string,
    body: unknown,
  ): Promise<T> {
    const token = await this.authService.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch(`/api/catalog?resource=${encodeURIComponent(resource)}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as T & { code?: string };
    if (!response.ok) throw new Error(payload.code || `CATALOG_HTTP_${response.status}`);
    return payload;
  }
}
