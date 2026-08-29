import { Injectable, inject } from "@angular/core";
import { Tour } from "../models/car.model";
import { CarService } from "./car.service";

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

/**
 * Compatibility adapter for the active V170 showcase.
 * Database ownership is canonicalized in CarService -> CatalogService.
 * This adapter must never issue its own Supabase/PostgREST request.
 */
@Injectable({ providedIn: "root" })
export class TourPublicDataV170Service {
  private readonly catalog = inject(CarService);

  async list(): Promise<TourV170[]> {
    await this.catalog.refreshCloudCatalog(true);
    return this.catalog.getTours()().map((tour) => this.asV170(tour));
  }

  async load(identifier: string): Promise<TourV170> {
    const clean = String(identifier || "").trim();
    if (!clean) throw new Error("Tur kimliği eksik.");

    await this.catalog.refreshCloudCatalog(true);
    const tour = this.catalog.getTours()().find((candidate) => {
      const id = String(candidate.cloudId ?? candidate.id ?? "");
      const slug = String(candidate.cloudSlug ?? "");
      return id === clean || slug === clean;
    });

    if (!tour) throw new Error("Bu tur bulunamadı veya yayından kaldırılmış olabilir.");
    return this.asV170(tour);
  }

  private asV170(tour: Tour): TourV170 {
    return tour as TourV170;
  }
}
