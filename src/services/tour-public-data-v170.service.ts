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
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly publicTourSelect = "id,title,seo_slug,category,short_description,description,price_per_person,duration,capacity,meeting_point,location_name,latitude,longitude,map_url,itinerary,included_items,excluded_items,images,cover_image,is_featured,is_active,metadata,publication_status,branch_id,listing_origin,created_at,updated_at,source_name,source_url,data_quality_status";

  async list(): Promise<TourV170[]> {
    const [rows, media] = await Promise.all([
      this.fetchRows(`tours?is_active=eq.true&select=${this.publicTourSelect}&order=is_featured.desc,updated_at.desc`),
      this.media.loadAll().catch(() => []),
    ]);
    const mapped = rows.map((row) => this.map(row));
    return this.media.hydrate(mapped, media) as TourV170[];
  }

  async load(identifier: string): Promise<TourV170> {
    const clean = String(identifier || "").trim();
    if (!clean) throw new Error("Tur kimliği eksik.");
    const filter = this.uuidPattern.test(clean)
      ? `id=eq.${encodeURIComponent(clean)}`
      : `seo_slug=eq.${encodeURIComponent(clean)}`;
    const rows = await this.fetchRows(`tours?is_active=eq.true&${filter}&select=${this.publicTourSelect}&limit=1`);
    const row = rows[0];
    if (!row) throw new Error("Bu tur bulunamadı veya yayından kaldırılmış olabilir.");
    const mapped = this.map(row);
    const media = await this.media.loadForTour(String(mapped.cloudId || mapped.id)).catch(() => []);
    return (this.media.hydrate([mapped], media)[0] || mapped) as TourV170;
  }

  private async fetchRows(path: string): Promise<Record<string, any>[]> {
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
      isAvailable: row["is_active"] === true,
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
