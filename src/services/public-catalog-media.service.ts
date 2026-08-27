import { Injectable } from "@angular/core";
import { Vehicle } from "../models/car.model";
import {
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLISHABLE_KEY,
} from "../supabase.config";

export type PublicCatalogMediaKind = "IMAGE" | "VIDEO";

export interface PublicCatalogMediaItem {
  id: string;
  vehicleId?: string;
  tourId?: string;
  blogPostId?: string;
  kind: PublicCatalogMediaKind;
  url: string;
  posterUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  license?: string;
  attribution?: string;
  altText: string;
  sortOrder: number;
  isCover: boolean;
}

interface PublicCatalogMediaRow {
  id: string;
  vehicle_id?: string | null;
  tour_id?: string | null;
  blog_post_id?: string | null;
  kind?: string | null;
  storage_bucket?: string | null;
  object_path?: string | null;
  external_url?: string | null;
  poster_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  license?: string | null;
  attribution?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  is_cover?: boolean | null;
}

@Injectable({ providedIn: "root" })
export class PublicCatalogMediaService {
  private readonly select = "id,vehicle_id,tour_id,blog_post_id,kind,storage_bucket,object_path,external_url,poster_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover";

  loadAll(): Promise<PublicCatalogMediaItem[]> {
    return this.loadPath(`catalog_media?is_active=eq.true&select=${this.select}&order=sort_order.asc,created_at.asc`);
  }

  loadForVehicle(vehicleId: string): Promise<PublicCatalogMediaItem[]> {
    const id = String(vehicleId || "").trim();
    if (!id) return Promise.resolve([]);
    return this.loadPath(`catalog_media?is_active=eq.true&vehicle_id=eq.${encodeURIComponent(id)}&select=${this.select}&order=sort_order.asc,created_at.asc`);
  }

  loadForTour(tourId: string): Promise<PublicCatalogMediaItem[]> {
    const id = String(tourId || "").trim();
    if (!id) return Promise.resolve([]);
    return this.loadPath(`catalog_media?is_active=eq.true&tour_id=eq.${encodeURIComponent(id)}&select=${this.select}&order=sort_order.asc,created_at.asc`);
  }

  loadForBlog(blogPostId: string): Promise<PublicCatalogMediaItem[]> {
    const id = String(blogPostId || "").trim();
    if (!id) return Promise.resolve([]);
    return this.loadPath(`catalog_media?is_active=eq.true&blog_post_id=eq.${encodeURIComponent(id)}&select=${this.select}&order=sort_order.asc,created_at.asc`);
  }

  hydrate(records: Vehicle[], media: PublicCatalogMediaItem[]): Vehicle[] {
    const byOwner = new Map<string, PublicCatalogMediaItem[]>();
    for (const item of media) {
      const ownerId = item.vehicleId || item.tourId;
      if (!ownerId) continue;
      const current = byOwner.get(ownerId) || [];
      current.push(item);
      byOwner.set(ownerId, current);
    }

    return records.map((record) => {
      const cloudId = record.cloudId;
      if (!cloudId) return record;
      const ownerMedia = (byOwner.get(cloudId) || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
      if (!ownerMedia.length) return record;

      const imageMedia = ownerMedia.filter((item) => item.kind === "IMAGE" && item.url);
      const videoMedia = ownerMedia.filter((item) => item.kind === "VIDEO" && item.url);
      const cover = imageMedia.find((item) => item.isCover) || imageMedia[0];
      const images = imageMedia.map((item) => item.url);
      const videos = videoMedia.map((item) => ({
        url: item.url,
        posterUrl: item.posterUrl || cover?.url,
        title: item.altText || (record.title || [record.brand, record.model].filter(Boolean).join(" ")),
        attribution: item.attribution || item.sourceName,
      }));

      return {
        ...record,
        ...(cover ? { image: cover.url } : {}),
        ...(images.length ? { images, gallery: images } : {}),
        videos,
      };
    });
  }

  private async loadPath(path: string): Promise<PublicCatalogMediaItem[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        "cache-control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`PUBLIC_CATALOG_MEDIA_${response.status}`);
    return ((await response.json()) as PublicCatalogMediaRow[])
      .map((row) => this.fromRow(row))
      .filter((item): item is PublicCatalogMediaItem => Boolean(item));
  }

  private fromRow(row: PublicCatalogMediaRow): PublicCatalogMediaItem | null {
    const kind = row.kind === "VIDEO" ? "VIDEO" : row.kind === "IMAGE" ? "IMAGE" : null;
    if (!kind) return null;
    const url = this.resolveUrl(row.external_url, row.storage_bucket, row.object_path);
    if (!url) return null;
    return {
      id: row.id,
      vehicleId: row.vehicle_id || undefined,
      tourId: row.tour_id || undefined,
      blogPostId: row.blog_post_id || undefined,
      kind,
      url,
      posterUrl: row.poster_url ? this.safeExternalUrl(row.poster_url) : undefined,
      sourceUrl: row.source_url || undefined,
      sourceName: row.source_name || undefined,
      license: row.license || undefined,
      attribution: row.attribution || undefined,
      altText: row.alt_text || "Katalog medyası",
      sortOrder: Number(row.sort_order || 0),
      isCover: row.is_cover === true,
    };
  }

  private resolveUrl(
    externalUrl?: string | null,
    storageBucket?: string | null,
    objectPath?: string | null,
  ): string {
    if (storageBucket === "catalog-media" && objectPath) {
      const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
      return `/catalog-media/${encodedPath}`;
    }
    if (storageBucket && objectPath) {
      const encodedBucket = encodeURIComponent(storageBucket);
      const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
      return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
    }
    return this.safeExternalUrl(externalUrl || "");
  }

  private safeExternalUrl(value: string): string {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.toString() : "";
    } catch {
      return "";
    }
  }
}
