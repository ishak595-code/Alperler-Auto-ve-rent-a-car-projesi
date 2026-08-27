import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import type { CatalogBlogPost } from "./catalog.service";
import { PublicCatalogMediaService } from "./public-catalog-media.service";

export type DetailKind = "RENTAL" | "SALE" | "TOUR";

@Injectable({ providedIn: "root" })
export class PublicDetailDataService {
  private readonly media = inject(PublicCatalogMediaService);
  private readonly storagePrefix = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/catalog-media/`;
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const clean = String(routeId || "").trim();
    if (!clean) throw new Error(this.notFoundMessage(kind));
    const item = kind === "TOUR"
      ? await this.loadTourDirect(clean)
      : await this.loadVehicleDirect(kind, clean);
    if (!item) throw new Error(this.notFoundMessage(kind));
    return this.prepare(item, kind);
  }

  async loadBlog(routeId: string): Promise<CatalogBlogPost> {
    const clean = String(routeId || "").trim();
    if (!clean) throw new Error("Bu blog yazısı bulunamadı veya yayından kaldırılmış olabilir.");
    const filter = this.uuidPattern.test(clean)
      ? `id=eq.${encodeURIComponent(clean)}`
      : `slug=eq.${encodeURIComponent(clean)}`;
    const rows = await this.fetchRows(`blog_posts?status=eq.PUBLISHED&${filter}&select=*&limit=1`, "BLOG_DETAIL_DB");
    const row = rows[0];
    if (!row) throw new Error("Bu blog yazısı bulunamadı veya yayından kaldırılmış olabilir.");
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] as Record<string, unknown> : {};
    return {
      id: String(row["id"] || clean),
      title: String(row["title"] || ""),
      summary: String(row["excerpt"] || ""),
      content: String(row["content"] || ""),
      image: String(row["cover_image"] || ""),
      readTime: String(metadata["readTime"] || "4 Dk Okuma"),
      date: String(metadata["originalDate"] || (row["published_at"] ? new Date(String(row["published_at"])).toLocaleDateString("tr-TR") : "")),
      cloudId: String(row["id"] || "") || undefined,
      cloudSlug: String(row["slug"] || "") || undefined,
    };
  }

  async resolveCampaignTarget(targetType?: string, targetId?: string, ctaUrl?: string): Promise<string> {
    const cleanTargetId = String(targetId || "").trim();
    if (targetType === "TOUR" && cleanTargetId) {
      try {
        const tour = await this.load("TOUR", cleanTargetId);
        return `/tour/${encodeURIComponent(String(tour.id))}`;
      } catch { /* fall through to the explicit general CTA only if the canonical target disappeared */ }
    }
    if (targetType === "VEHICLE" && cleanTargetId) {
      for (const category of ["RENTAL", "SALE"] as const) {
        try {
          const vehicle = await this.load(category, cleanTargetId);
          return `${category === "SALE" ? "/sales" : "/fleet"}/${encodeURIComponent(String(vehicle.id))}`;
        } catch { /* try the other vehicle category */ }
      }
    }
    const cta = String(ctaUrl || "").trim();
    return cta.startsWith("/") ? cta : "/campaigns";
  }

  mediaUrl(value?: string): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.startsWith(this.storagePrefix) ? `/catalog-media/${raw.slice(this.storagePrefix.length)}` : raw;
  }

  mediaUrls(item: Vehicle): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of [item.image, ...(item.images || []), ...(item.gallery || [])]) {
      const url = this.mediaUrl(value);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      result.push(url);
    }
    return result.slice(0, 30);
  }

  display(value: unknown, fallback = "Belirtilmedi"): string {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  private async loadVehicleDirect(kind: "RENTAL" | "SALE", routeId: string): Promise<Vehicle | null> {
    const filter = this.uuidPattern.test(routeId)
      ? `id=eq.${encodeURIComponent(routeId)}`
      : `stock_code=eq.${encodeURIComponent(routeId)}`;
    const rows = await this.fetchRows(`vehicles?is_active=eq.true&publication_status=eq.PUBLISHED&category=eq.${kind}&${filter}&select=*&limit=1`, "VEHICLE_DETAIL_DB");
    const row = rows[0];
    if (!row) return null;
    const mapped = this.mapVehicle(row, kind);
    const ownerId = String(mapped.cloudId || mapped.id || "");
    const ownerMedia = await this.media.loadForVehicle(ownerId).catch(() => []);
    return (this.media.hydrate([mapped], ownerMedia)[0] || mapped) as Vehicle;
  }

  private async loadTourDirect(routeId: string): Promise<Vehicle | null> {
    const filter = this.uuidPattern.test(routeId)
      ? `id=eq.${encodeURIComponent(routeId)}`
      : `seo_slug=eq.${encodeURIComponent(routeId)}`;
    const rows = await this.fetchRows(`tours?is_active=eq.true&publication_status=eq.PUBLISHED&${filter}&select=*&limit=1`, "TOUR_DETAIL_DB");
    const row = rows[0];
    if (!row) return null;
    const mapped = this.mapTour(row);
    const ownerId = String(mapped.cloudId || mapped.id || "");
    const ownerMedia = await this.media.loadForTour(ownerId).catch(() => []);
    return (this.media.hydrate([mapped], ownerMedia)[0] || mapped) as Vehicle;
  }

  private async fetchRows(path: string, code: string): Promise<Record<string, any>[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        "cache-control": "no-cache",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`${code}_${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  }

  private mapVehicle(row: Record<string, any>, category: "RENTAL" | "SALE"): Vehicle {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const images = Array.isArray(row["images"])
      ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim()))
      : [];
    const availabilityStatus = row["availability_status"];
    const price = Number(category === "RENTAL" ? row["rental_price_daily"] ?? row["price"] ?? 0 : row["price"] ?? 0);
    const hourlyPrice = this.numberOrUndefined(row["rental_price_hourly"] ?? metadata["hourlyPrice"]);
    const minimumRentalHours = this.numberOrUndefined(row["minimum_rental_hours"] ?? metadata["minimumRentalHours"]);
    const hourlyMileageLimit = this.numberOrUndefined(row["hourly_mileage_limit"] ?? metadata["hourlyMileageLimit"]);
    return {
      ...metadata,
      ...row,
      id: row["id"],
      cloudId: row["id"],
      cloudStockCode: row["stock_code"] || undefined,
      cloudSlug: row["seo_slug"] || undefined,
      category,
      brand: String(row["brand"] || ""),
      model: String(row["model"] || ""),
      year: row["model_year"] ?? undefined,
      price: Number.isFinite(price) ? price : 0,
      km: row["mileage_km"] ?? undefined,
      fuel: row["fuel_type"] ?? undefined,
      transmission: row["transmission"] || undefined,
      type: row["body_type"] ?? undefined,
      color: row["color"] || undefined,
      engineVolume: row["engine"] ?? metadata["engineVolume"] ?? undefined,
      seats: row["seats"] ?? undefined,
      doors: row["doors"] ?? metadata["doors"] ?? undefined,
      location: row["location"] || undefined,
      description: String(row["description"] || ""),
      features: Array.isArray(row["features"]) ? row["features"] : [],
      images,
      gallery: images,
      image: row["cover_image"] ?? images[0] ?? undefined,
      isFeatured: Boolean(row["is_featured"]),
      isAvailable: availabilityStatus ? availabilityStatus === "AVAILABLE" : true,
      availability: category === "SALE"
        ? availabilityStatus === "SOLD" ? "Satıldı" : metadata["availability"] || "Satışta"
        : metadata["availability"],
      hourlyPrice,
      hourlyRentalEnabled: row["hourly_rental_enabled"] != null
        ? Boolean(row["hourly_rental_enabled"])
        : Boolean(metadata["hourlyRentalEnabled"]),
      minimumRentalHours,
      hourlyMileageLimit,
      publicationStatus: row["publication_status"] ?? undefined,
      publishedAt: row["published_at"] ?? undefined,
      scheduledAt: row["scheduled_at"] ?? undefined,
      branchId: row["branch_id"] || undefined,
      listingOrigin: row["listing_origin"] || undefined,
      createdAt: row["created_at"] || undefined,
      updatedAt: row["updated_at"] || undefined,
    } as Vehicle;
  }

  private mapTour(row: Record<string, any>): Vehicle {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const images = Array.isArray(row["images"])
      ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim()))
      : [];
    const published = row["publication_status"] === "PUBLISHED" && row["is_active"] === true;
    return {
      ...metadata,
      id: row["id"],
      category: "TOUR",
      title: String(row["title"] || ""),
      description: String(row["description"] || row["short_description"] || ""),
      price: Number(row["price_per_person"] || 0),
      duration: row["duration"] || undefined,
      capacity: Number(row["capacity"] || 0) || undefined,
      meetingPoint: row["meeting_point"] || undefined,
      location: row["location_name"] || row["meeting_point"] || undefined,
      itinerary: Array.isArray(row["itinerary"]) ? row["itinerary"] : [],
      includedItems: Array.isArray(row["included_items"]) ? row["included_items"] : [],
      excludedItems: Array.isArray(row["excluded_items"]) ? row["excluded_items"] : [],
      image: row["cover_image"] || images[0] || undefined,
      images,
      gallery: images,
      isFeatured: Boolean(row["is_featured"]),
      isAvailable: published,
      cloudId: row["id"],
      cloudSlug: row["seo_slug"] || undefined,
      publicationStatus: row["publication_status"],
      branchId: row["branch_id"] || undefined,
      listingOrigin: row["listing_origin"] || undefined,
      createdAt: row["created_at"] || undefined,
      updatedAt: row["updated_at"] || undefined,
    } as Vehicle;
  }

  private numberOrUndefined(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private prepare(item: Vehicle, kind: DetailKind): Vehicle {
    const images = this.mediaUrls(item);
    const videos = (item.videos || [])
      .map((video) => ({ ...video, url: this.mediaUrl(video.url), posterUrl: this.mediaUrl(video.posterUrl) }))
      .filter((video) => Boolean(video.url));
    return {
      ...item,
      category: kind,
      price: Number(item.price || 0),
      image: this.mediaUrl(item.image || images[0]),
      images,
      gallery: images,
      videos,
      transmission: item.transmission || undefined,
      fuel: item.fuel || undefined,
      seats: Number(item.seats || 0) || undefined,
      km: Number(item.km || 0) || undefined,
      isAvailable: kind === "SALE" ? item.availability !== "Satıldı" : item.isAvailable !== false,
    };
  }

  private notFoundMessage(kind: DetailKind): string {
    if (kind === "SALE") return "Bu satılık araç bulunamadı veya yayından kaldırılmış olabilir.";
    if (kind === "TOUR") return "Bu tur bulunamadı veya yayından kaldırılmış olabilir.";
    return "Bu kiralık araç bulunamadı veya şu anda rezervasyona açık olmayabilir.";
  }
}
