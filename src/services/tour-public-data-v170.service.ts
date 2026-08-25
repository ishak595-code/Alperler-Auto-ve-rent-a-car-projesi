import { Injectable, inject } from "@angular/core";
import { Tour } from "../models/car.model";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { PublicCatalogMediaService } from "./public-catalog-media.service";

export interface TourV170 extends Tour {
  shortDescription?: string;
  categoryName?: string;
  locationName?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  badge?: string;
  capacityPolicy?: "FLEXIBLE_DEMAND" | string;
  capacityMeaning?: string;
  reservationHardLimit?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  dataQualityStatus?: string;
}

@Injectable({ providedIn: "root" })
export class TourPublicDataV170Service {
  private readonly media = inject(PublicCatalogMediaService);

  async list(): Promise<TourV170[]> {
    const [rows, media] = await Promise.all([
      this.fetchRows(),
      this.media.loadAll().catch(() => []),
    ]);
    const mapped = rows.map((row) => this.map(row));
    return this.media.hydrate(mapped, media) as TourV170[];
  }

  async load(identifier: string): Promise<TourV170> {
    const clean = String(identifier || "").trim();
    if (!clean) throw new Error("Tur kimliği eksik.");
    const rows = await this.list();
    const item = rows.find((tour) => [tour.id, tour.cloudId, tour.cloudSlug]
      .some((value) => value !== undefined && value !== null && String(value) === clean));
    if (!item) throw new Error("Bu tur bulunamadı veya yayından kaldırılmış olabilir.");
    return item;
  }

  private async fetchRows(): Promise<Record<string, any>[]> {
    const path = "tours?is_active=eq.true&publication_status=eq.PUBLISHED&select=*&order=is_featured.desc,updated_at.desc";
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
    if (!response.ok) throw new Error(`TOUR_PUBLIC_DATA_${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  }

  private map(row: Record<string, any>): TourV170 {
    const metadata = row["metadata"] && typeof row["metadata"] === "object" ? row["metadata"] : {};
    const images = Array.isArray(row["images"])
      ? row["images"].filter((value: unknown): value is string => typeof value === "string" && Boolean(value.trim()))
      : [];
    const latitude = Number(row["latitude"]);
    const longitude = Number(row["longitude"]);
    return {
      ...metadata,
      id: row["id"],
      cloudId: row["id"],
      cloudSlug: row["seo_slug"] || undefined,
      category: "TOUR",
      categoryName: row["category"] || undefined,
      title: String(row["title"] || ""),
      shortDescription: row["short_description"] || undefined,
      description: String(row["description"] || row["short_description"] || ""),
      price: Number(row["price_per_person"] || 0),
      duration: row["duration"] || undefined,
      capacity: Number(row["capacity"] || 0) || undefined,
      meetingPoint: row["meeting_point"] || undefined,
      location: row["location_name"] || row["meeting_point"] || undefined,
      locationName: row["location_name"] || undefined,
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      mapUrl: row["map_url"] || undefined,
      itinerary: Array.isArray(row["itinerary"]) ? row["itinerary"] : [],
      includedItems: Array.isArray(row["included_items"]) ? row["included_items"] : [],
      excludedItems: Array.isArray(row["excluded_items"]) ? row["excluded_items"] : [],
      image: row["cover_image"] || images[0] || undefined,
      images,
      gallery: images,
      isFeatured: Boolean(row["is_featured"]),
      isAvailable: row["is_active"] === true && row["publication_status"] === "PUBLISHED",
      publicationStatus: row["publication_status"],
      branchId: row["branch_id"] || undefined,
      listingOrigin: row["listing_origin"] || undefined,
      createdAt: row["created_at"] || undefined,
      updatedAt: row["updated_at"] || undefined,
      badge: String(metadata["badge"] || "").trim() || undefined,
      capacityPolicy: String(metadata["capacityPolicy"] || "FLEXIBLE_DEMAND"),
      capacityMeaning: String(metadata["capacityMeaning"] || "RECOMMENDED_GROUP_SIZE"),
      reservationHardLimit: metadata["reservationHardLimit"] === true,
      sourceName: row["source_name"] || undefined,
      sourceUrl: row["source_url"] || undefined,
      dataQualityStatus: row["data_quality_status"] || undefined,
    } as TourV170;
  }
}
