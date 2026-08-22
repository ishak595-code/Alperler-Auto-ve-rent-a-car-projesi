import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { CatalogService } from "./catalog.service";

export type DetailKind = "RENTAL" | "SALE" | "TOUR";

@Injectable({ providedIn: "root" })
export class PublicDetailDataService {
  private readonly catalog = inject(CatalogService);
  private readonly storagePrefix = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/catalog-media/`;

  async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const records = kind === "TOUR"
      ? await this.loadToursDirect()
      : await this.catalog.loadVehicles(true);

    const match = records.find((item) => {
      if (kind !== "TOUR" && item.category !== kind) return false;
      return this.matches(item, routeId);
    });
    if (!match) throw new Error(this.notFoundMessage(kind));
    return this.prepare(match, kind);
  }

  async resolveCampaignTarget(targetType?: string, targetId?: string, ctaUrl?: string): Promise<string> {
    const cleanTargetId = String(targetId || "").trim();
    if (targetType === "TOUR" && cleanTargetId) {
      try {
        const tour = await this.load("TOUR", cleanTargetId);
        return `/tour/${encodeURIComponent(String(tour.id))}`;
      } catch { /* fall through */ }
    }
    if (targetType === "VEHICLE" && cleanTargetId) {
      try {
        const vehicles = await this.catalog.loadVehicles(true);
        const vehicle = vehicles.find((item) => this.matches(item, cleanTargetId));
        if (vehicle) return `${vehicle.category === "SALE" ? "/sales" : "/fleet"}/${encodeURIComponent(String(vehicle.id))}`;
      } catch { /* fall through */ }
    }

    const cta = String(ctaUrl || "").trim();
    if (cta.startsWith("/")) return cta;
    return "/campaigns";
  }

  mediaUrl(value?: string): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw.startsWith(this.storagePrefix)
      ? `/catalog-media/${raw.slice(this.storagePrefix.length)}`
      : raw;
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

  private async loadToursDirect(): Promise<Vehicle[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/tours?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc`, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        "cache-control": "no-cache",
      },
    });
    if (!response.ok) throw new Error(`TOUR_DETAIL_DB_${response.status}`);
    const rows = (await response.json()) as Record<string, any>[];
    return rows.map((row) => this.mapTour(row));
  }

  private mapTour(row: Record<string, any>): Vehicle {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const images = Array.isArray(row["images"])
      ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim()))
      : [];
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
      itinerary: Array.isArray(row["itinerary"]) ? row["itinerary"] : [],
      includedItems: Array.isArray(row["included_items"]) ? row["included_items"] : [],
      excludedItems: Array.isArray(row["excluded_items"]) ? row["excluded_items"] : [],
      image: row["cover_image"] || images[0] || undefined,
      images,
      gallery: images,
      isFeatured: Boolean(row["is_featured"]),
      cloudId: row["id"],
      cloudSlug: row["seo_slug"],
      publicationStatus: row["publication_status"],
      branchId: row["branch_id"] || undefined,
      listingOrigin: row["listing_origin"] || undefined,
      createdAt: row["created_at"] || undefined,
      updatedAt: row["updated_at"] || undefined,
    } as Vehicle;
  }

  private prepare(item: Vehicle, kind: DetailKind): Vehicle {
    const images = this.mediaUrls(item);
    const videos = (item.videos || []).map((video) => ({
      ...video,
      url: this.mediaUrl(video.url),
      posterUrl: this.mediaUrl(video.posterUrl),
    })).filter((video) => Boolean(video.url));

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

  private matches(item: Vehicle, routeId: string): boolean {
    const id = String(routeId || "").trim();
    return [item.id, item.cloudId, item.cloudStockCode, item.cloudSlug]
      .some((value) => value !== undefined && value !== null && String(value) === id);
  }

  private notFoundMessage(kind: DetailKind): string {
    if (kind === "SALE") return "Bu satılık araç bulunamadı veya yayından kaldırılmış olabilir.";
    if (kind === "TOUR") return "Bu tur bulunamadı veya yayından kaldırılmış olabilir.";
    return "Bu kiralık araç bulunamadı veya şu anda rezervasyona açık olmayabilir.";
  }
}
