import { Injectable, computed, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export interface GeoProvince {
  code: string;
  name: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GeoDistrict {
  code: string;
  provinceCode: string;
  name: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface GeoDirectoryResponse {
  ok: boolean;
  code?: string;
  provinces?: Array<Record<string, unknown>>;
  districts?: Array<Record<string, unknown>>;
  source?: { name?: string; license?: string; sourceUpdatedAt?: string };
}

@Injectable({ providedIn: "root" })
export class GeoDirectoryService {
  private readonly endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/geo-directory`;
  private readonly _provinces = signal<GeoProvince[]>([]);
  private readonly _districts = signal<GeoDistrict[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly provinces = this._provinces.asReadonly();
  readonly districts = this._districts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sourceLabel = computed(() => this._loaded() ? "Türkiye il/ilçe dizini" : "Konum dizini hazırlanıyor");

  async ensureLoaded(): Promise<void> {
    if (this._loaded() && this._provinces().length === 81 && this._districts().length >= 970) return;
    if (!this.loadPromise) this.loadPromise = this.load().finally(() => { this.loadPromise = null; });
    return this.loadPromise;
  }

  districtsFor(provinceCode: string): GeoDistrict[] {
    const code = String(provinceCode || "").trim();
    return code ? this._districts().filter((row) => row.provinceCode === code) : [];
  }

  province(code: string): GeoProvince | undefined {
    return this._provinces().find((row) => row.code === code);
  }

  district(code: string): GeoDistrict | undefined {
    return this._districts().find((row) => row.code === code);
  }

  private async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const response = await fetch(this.endpoint, {
        method: "GET",
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(35_000),
      });
      const payload = (await response.json().catch(() => ({}))) as GeoDirectoryResponse;
      if (!response.ok || !payload.ok || !Array.isArray(payload.provinces) || !Array.isArray(payload.districts)) {
        throw new Error(payload.code || "GEO_DIRECTORY_UNAVAILABLE");
      }
      const provinces = payload.provinces.map((row): GeoProvince => ({
        code: String(row["code"] || ""),
        name: String(row["name"] || ""),
        slug: String(row["slug"] || ""),
        latitude: row["latitude"] === null || row["latitude"] === undefined ? null : Number(row["latitude"]),
        longitude: row["longitude"] === null || row["longitude"] === undefined ? null : Number(row["longitude"]),
      })).filter((row) => /^TUR\d{3}$/.test(row.code) && row.name);
      const districts = payload.districts.map((row): GeoDistrict => ({
        code: String(row["code"] || ""),
        provinceCode: String(row["province_code"] || ""),
        name: String(row["name"] || ""),
        slug: String(row["slug"] || ""),
        latitude: row["latitude"] === null || row["latitude"] === undefined ? null : Number(row["latitude"]),
        longitude: row["longitude"] === null || row["longitude"] === undefined ? null : Number(row["longitude"]),
      })).filter((row) => /^TUR\d{6}$/.test(row.code) && /^TUR\d{3}$/.test(row.provinceCode) && row.name);
      if (provinces.length !== 81 || districts.length < 970) throw new Error("GEO_DIRECTORY_INCOMPLETE");
      this._provinces.set(provinces);
      this._districts.set(districts);
      this._loaded.set(true);
    } catch (error) {
      this._loaded.set(false);
      this._error.set(error instanceof Error ? error.message : "GEO_DIRECTORY_UNAVAILABLE");
      throw error;
    } finally {
      this._loading.set(false);
    }
  }
}
