import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { CatalogService } from "./catalog.service";

export type DetailKind = "RENTAL" | "SALE" | "TOUR";

@Injectable({ providedIn: "root" })
export class PublicDetailDataService {
  private readonly catalog = inject(CatalogService);
  private readonly storagePrefix = "https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/";

  async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const records = kind === "TOUR"
      ? await this.catalog.loadTours(true)
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
      } catch { /* fall through to internal CTA */ }
    }
    if (targetType === "VEHICLE" && cleanTargetId) {
      try {
        const vehicles = await this.catalog.loadVehicles(true);
        const vehicle = vehicles.find((item) => this.matches(item, cleanTargetId));
        if (vehicle) return `${vehicle.category === "SALE" ? "/sales" : "/fleet"}/${encodeURIComponent(String(vehicle.id))}`;
      } catch { /* fall through to internal CTA */ }
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
    if (kind === "SALE") return "Bu satılık araç veritabanında bulunamadı.";
    if (kind === "TOUR") return "Bu tur veritabanında bulunamadı.";
    return "Bu kiralık araç veritabanında bulunamadı.";
  }
}
