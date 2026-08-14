import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";
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

@Injectable({ providedIn: "root" })
export class CatalogService {
  private readonly authService = inject(AuthService);

  async loadVehicles(): Promise<Vehicle[]> {
    return this.loadList<Vehicle>("vehicles");
  }

  async loadTours(): Promise<Vehicle[]> {
    return this.loadList<Vehicle>("tours");
  }

  async loadBlog(): Promise<CatalogBlogPost[]> {
    return this.loadList<CatalogBlogPost>("blog");
  }

  async loadFaqs(): Promise<CatalogFaqItem[]> {
    return this.loadList<CatalogFaqItem>("faqs");
  }

  async loadConfig(): Promise<Partial<SiteConfig> | null> {
    const payload = await this.request<CatalogListResponse<never>>(
      "GET",
      "config",
    );
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

  private async loadList<T>(resource: string): Promise<T[]> {
    const payload = await this.request<CatalogListResponse<T>>(
      "GET",
      resource,
    );
    if (!payload.ok || !Array.isArray(payload.records)) {
      throw new Error(payload.code || "CATALOG_LOAD_FAILED");
    }
    return payload.records;
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
  ): Promise<T> {
    const response = await fetch(
      `/api/catalog?resource=${encodeURIComponent(resource)}`,
      {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
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
