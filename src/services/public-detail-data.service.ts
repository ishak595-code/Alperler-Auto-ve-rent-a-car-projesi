import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import type { CatalogBlogPost } from "./catalog.service";
import { PublicCatalogMediaService } from "./public-catalog-media.service";

export type DetailKind = "RENTAL" | "SALE" | "TOUR";
export type BlogDetailMediaItem = { kind: "IMAGE" | "VIDEO"; url: string; posterUrl?: string; title: string };
export interface BlogDetailPost extends CatalogBlogPost {
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  media: BlogDetailMediaItem[];
}

@Injectable({ providedIn: "root" })
export class PublicDetailDataService {
  private readonly media = inject(PublicCatalogMediaService);
  private readonly storagePrefix = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/catalog-media/`;
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly numericPattern = /^\d+$/;
  private readonly transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
  private readonly detailCache = new Map<string, { value: Vehicle; expiresAt: number }>();
  private readonly detailInFlight = new Map<string, Promise<Vehicle>>();
  private readonly detailCacheTtlMs = 20_000;
  private readonly vehicleSelect = [
    "id", "stock_code", "category", "brand", "model", "model_year", "price", "currency",
    "rental_price_daily", "rental_price_hourly", "hourly_rental_enabled", "minimum_rental_hours", "hourly_mileage_limit",
    "mileage_km", "fuel_type", "transmission", "body_type", "color", "engine", "seats", "doors", "location",
    "description", "features", "images", "cover_image", "is_featured", "is_active", "availability_status", "seo_slug",
    "metadata", "created_at", "updated_at", "publication_status", "published_at", "scheduled_at", "branch_id", "listing_origin",
  ].join(",");
  private readonly tourSelect = [
    "id", "title", "short_description", "description", "price_per_person", "currency", "duration", "capacity", "meeting_point",
    "itinerary", "included_items", "excluded_items", "cover_image", "images", "is_featured", "is_active", "seo_slug", "metadata",
    "created_at", "updated_at", "publication_status", "published_at", "scheduled_at", "latitude", "longitude", "map_url", "category",
    "location_name", "branch_id", "listing_origin",
  ].join(",");
  private readonly blogSelect = "id,slug,title,excerpt,content,cover_image,author_name,published_at,seo_title,seo_description,metadata,status";

  async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const clean = String(routeId || "").trim();
    if (!clean) throw new Error(this.notFoundMessage(kind));

    const cacheKey = `${kind}:${clean}`;
    const cached = this.detailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) this.detailCache.delete(cacheKey);

    const existing = this.detailInFlight.get(cacheKey);
    if (existing) return existing;

    const request = (async () => {
      const item = kind === "TOUR" ? await this.loadTourDirect(clean) : await this.loadVehicleDirect(kind, clean);
      if (!item) throw new Error(this.notFoundMessage(kind));
      const prepared = this.prepare(item, kind);
      this.detailCache.set(cacheKey, { value: prepared, expiresAt: Date.now() + this.detailCacheTtlMs });
      return prepared;
    })().finally(() => {
      if (this.detailInFlight.get(cacheKey) === request) this.detailInFlight.delete(cacheKey);
    });

    this.detailInFlight.set(cacheKey, request);
    return request;
  }

  async loadBlogList(): Promise<BlogDetailPost[]> {
    const rows = await this.fetchRows(`blog_posts?status=eq.PUBLISHED&select=${this.blogSelect}&order=published_at.desc`, "BLOG_LIST_DB");
    return rows.map((row) => this.mapBlogRow(row, []));
  }

  async loadBlog(routeId: string): Promise<BlogDetailPost> {
    const clean = String(routeId || "").trim();
    if (!clean) throw new Error("Bu blog yazısı bulunamadı veya yayından kaldırılmış olabilir.");

    let row: Record<string, any> | undefined;
    if (this.uuidPattern.test(clean)) {
      row = (await this.fetchRows(`blog_posts?status=eq.PUBLISHED&id=eq.${encodeURIComponent(clean)}&select=${this.blogSelect}&limit=1`, "BLOG_DETAIL_DB"))[0];
    } else if (!this.numericPattern.test(clean)) {
      row = (await this.fetchRows(`blog_posts?status=eq.PUBLISHED&slug=eq.${encodeURIComponent(clean)}&select=${this.blogSelect}&limit=1`, "BLOG_DETAIL_DB"))[0];
    }

    if (!row && this.numericPattern.test(clean)) {
      const legacyRows = await this.fetchRows(`blog_posts?status=eq.PUBLISHED&select=${this.blogSelect}&order=published_at.desc`, "BLOG_LEGACY_ROUTE_DB");
      const legacyId = Number(clean);
      row = legacyRows.find((candidate) => this.stableNumericId(candidate["id"]) === legacyId);
    }

    if (!row) throw new Error("Bu blog yazısı bulunamadı veya yayından kaldırılmış olabilir.");
    const ownerId = String(row["id"] || "");
    const ownerMedia = ownerId ? await this.media.loadForBlog(ownerId).catch(() => []) : [];
    return this.mapBlogRow(row, ownerMedia);
  }

  async resolveCampaignTarget(targetType?: string, targetId?: string, ctaUrl?: string): Promise<string> {
    const cleanTargetId = String(targetId || "").trim();
    if (targetType === "TOUR" && cleanTargetId) {
      try { const tour = await this.load("TOUR", cleanTargetId); return `/tour/${encodeURIComponent(String(tour.id))}`; } catch { /* use explicit CTA fallback */ }
    }
    if (targetType === "VEHICLE" && cleanTargetId) {
      for (const category of ["RENTAL", "SALE"] as const) {
        try { const vehicle = await this.load(category, cleanTargetId); return `${category === "SALE" ? "/sales" : "/fleet"}/${encodeURIComponent(String(vehicle.id))}`; } catch { /* try other vehicle category */ }
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

  private mapBlogRow(row: Record<string, any>, ownerMedia: Awaited<ReturnType<PublicCatalogMediaService["loadForBlog"]>>): BlogDetailPost {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] as Record<string, unknown> : {};
    const imageMedia = ownerMedia.filter((item) => item.kind === "IMAGE" && item.url);
    const videoMedia = ownerMedia.filter((item) => item.kind === "VIDEO" && item.url);
    const cover = imageMedia.find((item) => item.isCover) || imageMedia[0];
    const fallbackCover = this.mediaUrl(String(row["cover_image"] || ""));
    const media: BlogDetailMediaItem[] = [
      ...imageMedia.map((item) => ({ kind: "IMAGE" as const, url: item.url, title: item.altText || String(row["title"] || "Blog görseli") })),
      ...videoMedia.map((item) => ({ kind: "VIDEO" as const, url: item.url, posterUrl: item.posterUrl || cover?.url || fallbackCover || undefined, title: item.altText || String(row["title"] || "Blog videosu") })),
    ];
    if (!media.length && fallbackCover) media.push({ kind: "IMAGE", url: fallbackCover, title: String(row["title"] || "Blog görseli") });
    const ownerId = String(row["id"] || "");
    return {
      id: ownerId,
      title: String(row["title"] || ""),
      summary: String(row["excerpt"] || ""),
      content: String(row["content"] || ""),
      image: cover?.url || fallbackCover,
      readTime: String(metadata["readTime"] || "4 Dk Okuma"),
      date: String(metadata["originalDate"] || (row["published_at"] ? new Date(String(row["published_at"])).toLocaleDateString("tr-TR") : "")),
      cloudId: ownerId || undefined,
      cloudSlug: String(row["slug"] || "") || undefined,
      authorName: String(row["author_name"] || "") || undefined,
      seoTitle: String(row["seo_title"] || "") || undefined,
      seoDescription: String(row["seo_description"] || "") || undefined,
      media,
    };
  }

  private async loadVehicleDirect(kind: "RENTAL" | "SALE", routeId: string): Promise<Vehicle | null> {
    let row: Record<string, any> | undefined;
    if (this.numericPattern.test(routeId)) {
      const rows = await this.fetchRows(`vehicles?is_active=eq.true&category=eq.${kind}&select=${this.vehicleSelect}`, "VEHICLE_LEGACY_ROUTE_DB");
      row = rows.find((candidate) => this.legacyNumericId(candidate) === Number(routeId));
    } else {
      const filter = this.uuidPattern.test(routeId) ? `id=eq.${encodeURIComponent(routeId)}` : `stock_code=eq.${encodeURIComponent(routeId)}`;
      row = (await this.fetchRows(`vehicles?is_active=eq.true&category=eq.${kind}&${filter}&select=${this.vehicleSelect}&limit=1`, "VEHICLE_DETAIL_DB"))[0];
    }
    if (!row) return null;
    const mapped = this.mapVehicle(row, kind);
    const ownerId = String(mapped.cloudId || mapped.id || "");
    const ownerMedia = await this.media.loadForVehicle(ownerId).catch(() => []);
    return (this.media.hydrate([mapped], ownerMedia)[0] || mapped) as Vehicle;
  }

  private async loadTourDirect(routeId: string): Promise<Vehicle | null> {
    let row: Record<string, any> | undefined;
    if (this.numericPattern.test(routeId)) {
      const rows = await this.fetchRows(`tours?is_active=eq.true&select=${this.tourSelect}`, "TOUR_LEGACY_ROUTE_DB");
      row = rows.find((candidate) => this.legacyNumericId(candidate) === Number(routeId) || String(candidate["seo_slug"] || "").startsWith(`legacy-${routeId}-`));
    } else {
      const filter = this.uuidPattern.test(routeId) ? `id=eq.${encodeURIComponent(routeId)}` : `seo_slug=eq.${encodeURIComponent(routeId)}`;
      row = (await this.fetchRows(`tours?is_active=eq.true&${filter}&select=${this.tourSelect}&limit=1`, "TOUR_DETAIL_DB"))[0];
    }
    if (!row) return null;
    const mapped = this.mapTour(row);
    const ownerId = String(mapped.cloudId || mapped.id || "");
    const ownerMedia = await this.media.loadForTour(ownerId).catch(() => []);
    return (this.media.hydrate([mapped], ownerMedia)[0] || mapped) as Vehicle;
  }

  private async fetchRows(path: string, code: string): Promise<Record<string, any>[]> {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
          method: "GET",
          cache: "no-store",
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json", "cache-control": "no-cache" },
          signal: AbortSignal.timeout(8_000),
        });
      } catch (error) {
        if (attempt >= maxAttempts) throw new Error(`${code}_NETWORK`, { cause: error });
        await this.wait(220 * attempt);
        continue;
      }

      if (response.ok) {
        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
      }

      if (!this.transientStatuses.has(response.status) || attempt >= maxAttempts) {
        throw new Error(`${code}_${response.status}`);
      }
      await this.wait(220 * attempt);
    }
    throw new Error(`${code}_NETWORK`);
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private mapVehicle(row: Record<string, any>, category: "RENTAL" | "SALE"): Vehicle {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const images = Array.isArray(row["images"]) ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim())) : [];
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
      year: row["model_year"] ?? metadata["year"] ?? undefined,
      price: Number.isFinite(price) ? price : 0,
      km: row["mileage_km"] ?? metadata["km"] ?? metadata["mileage"] ?? undefined,
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
      availability: category === "SALE" ? availabilityStatus === "SOLD" ? "Satıldı" : metadata["availability"] || "Satışta" : metadata["availability"],
      hourlyPrice,
      hourlyRentalEnabled: row["hourly_rental_enabled"] != null ? Boolean(row["hourly_rental_enabled"]) : Boolean(metadata["hourlyRentalEnabled"]),
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
    const images = Array.isArray(row["images"]) ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim())) : [];
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
      locationName: row["location_name"] || undefined,
      latitude: this.numberOrUndefined(row["latitude"]),
      longitude: this.numberOrUndefined(row["longitude"]),
      mapUrl: row["map_url"] || undefined,
      itinerary: Array.isArray(row["itinerary"]) ? row["itinerary"] : [],
      includedItems: Array.isArray(row["included_items"]) ? row["included_items"] : [],
      excludedItems: Array.isArray(row["excluded_items"]) ? row["excluded_items"] : [],
      image: row["cover_image"] || images[0] || undefined,
      images,
      gallery: images,
      isFeatured: Boolean(row["is_featured"]),
      isAvailable: row["is_active"] === true,
      cloudId: row["id"],
      cloudSlug: row["seo_slug"] || undefined,
      publicationStatus: row["publication_status"],
      publishedAt: row["published_at"] || undefined,
      scheduledAt: row["scheduled_at"] || undefined,
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

  private legacyNumericId(row: Record<string, any>): number | undefined {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] as Record<string, unknown> : {};
    const value = metadata["legacyId"] ?? metadata["legacy_id"] ?? metadata["id"];
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : undefined;
  }

  private stableNumericId(value: unknown): number {
    const normalized = String(value || "").trim();
    if (this.numericPattern.test(normalized)) return Number(normalized);
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 1;
  }

  private prepare(item: Vehicle, kind: DetailKind): Vehicle {
    const images = this.mediaUrls(item);
    const videos = (item.videos || []).map((video) => ({ ...video, url: this.mediaUrl(video.url), posterUrl: this.mediaUrl(video.posterUrl) })).filter((video) => Boolean(video.url));
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
      km: item.km == null ? undefined : Number(item.km),
      isAvailable: kind === "SALE" ? item.availability !== "Satıldı" : item.isAvailable !== false,
    };
  }

  private notFoundMessage(kind: DetailKind): string {
    if (kind === "SALE") return "Bu satılık araç bulunamadı veya yayından kaldırılmış olabilir.";
    if (kind === "TOUR") return "Bu tur bulunamadı veya yayından kaldırılmış olabilir.";
    return "Bu kiralık araç bulunamadı veya şu anda rezervasyona açık olmayabilir.";
  }
}
