import { Injectable, inject } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export type CatalogOrigin = "REAL" | "DEMO";
export type CatalogQuality = "UNVERIFIED" | "RESEARCHED" | "BUSINESS_VERIFIED";
export type PublicationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export interface VehicleAdminRecord {
  id: string;
  stockCode: string;
  category: "RENTAL" | "SALE";
  brand: string;
  model: string;
  modelYear?: number;
  price: number;
  rentalPriceDaily?: number;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  engine?: string;
  seats?: number;
  doors?: number;
  location?: string;
  description?: string;
  features: string[];
  images: string[];
  coverImage?: string;
  isFeatured: boolean;
  isActive: boolean;
  availabilityStatus: string;
  seoSlug?: string;
  publicationStatus: PublicationStatus;
  publishedAt?: string;
  scheduledAt?: string;
  recordOrigin: CatalogOrigin;
  dataQualityStatus: CatalogQuality;
  specSourceUrl?: string;
  specSourceName?: string;
  actualVehicleVerified: boolean;
  branchId?: string;
  metadata: Record<string, unknown>;
}

export interface TourAdminRecord {
  id: string;
  title: string;
  seoSlug: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  pricePerPerson: number;
  duration?: string;
  capacity?: number;
  meetingPoint?: string;
  itinerary: unknown[];
  includedItems: string[];
  excludedItems: string[];
  images: string[];
  coverImage?: string;
  isFeatured: boolean;
  isActive: boolean;
  publicationStatus: PublicationStatus;
  publishedAt?: string;
  scheduledAt?: string;
  recordOrigin: CatalogOrigin;
  dataQualityStatus: CatalogQuality;
  sourceUrl?: string;
  sourceName?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  branchId?: string;
  metadata: Record<string, unknown>;
}

interface MediaSummary {
  activeImages: number;
  activeCovers: number;
}

@Injectable({ providedIn: "root" })
export class CatalogAdminEditorService {
  private readonly auth = inject(AuthService);

  async vehicles(): Promise<VehicleAdminRecord[]> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>("GET", "vehicles?select=*&order=updated_at.desc", undefined, token);
    return rows.map((row) => this.vehicleFromRow(row));
  }

  async tours(): Promise<TourAdminRecord[]> {
    const token = await this.requiredToken();
    const rows = await this.rest<any[]>("GET", "tours?select=*&order=updated_at.desc", undefined, token);
    return rows.map((row) => this.tourFromRow(row));
  }

  async createVehicle(category: "RENTAL" | "SALE"): Promise<VehicleAdminRecord> {
    const token = await this.requiredToken();
    const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const stockCode = `${category === "RENTAL" ? "RENT" : "SALE"}-${suffix}`;
    const body = {
      stock_code: stockCode,
      category,
      brand: "Yeni",
      model: category === "RENTAL" ? "Kiralık Araç" : "Satılık Araç",
      price: 0,
      rental_price_daily: category === "RENTAL" ? 0 : null,
      mileage_km: category === "SALE" ? 0 : null,
      features: [],
      images: [],
      is_featured: false,
      is_active: false,
      availability_status: "AVAILABLE",
      seo_slug: stockCode.toLowerCase(),
      publication_status: "DRAFT",
      record_origin: "REAL",
      data_quality_status: "UNVERIFIED",
      actual_vehicle_verified: false,
      metadata: {
        title: category === "RENTAL" ? "Yeni Kiralık Araç" : "Yeni Satılık Araç",
        createdFrom: "ADMIN_V1681",
        ...(category === "SALE" ? { tramerStatus: "UNKNOWN", tramerCurrency: "TRY", damageExpertise: {}, isDamageFree: false } : {}),
      },
    };
    const rows = await this.rest<any[]>("POST", "vehicles?select=*", body, token);
    if (!rows?.[0]) throw new Error("Araç taslağı oluşturulamadı.");
    return this.vehicleFromRow(rows[0]);
  }

  async createTour(): Promise<TourAdminRecord> {
    const token = await this.requiredToken();
    const suffix = crypto.randomUUID().slice(0, 8).toLowerCase();
    const body = {
      title: "Yeni Tur",
      seo_slug: `tur-${suffix}`,
      price_per_person: 0,
      itinerary: [],
      included_items: [],
      excluded_items: [],
      images: [],
      is_featured: false,
      is_active: false,
      publication_status: "DRAFT",
      record_origin: "REAL",
      data_quality_status: "UNVERIFIED",
      metadata: { createdFrom: "ADMIN_V52" },
    };
    const rows = await this.rest<any[]>("POST", "tours?select=*", body, token);
    if (!rows?.[0]) throw new Error("Tur taslağı oluşturulamadı.");
    return this.tourFromRow(rows[0]);
  }

  async vehiclePublicationErrors(record: VehicleAdminRecord): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    const token = await this.requiredToken();
    const media = await this.mediaSummary("vehicle_id", record.id, token);
    const errors: string[] = [];
    const currentYear = new Date().getFullYear();
    const effectivePrice = record.category === "RENTAL" ? Number(record.rentalPriceDaily ?? record.price) : Number(record.price);

    if (!record.stockCode.trim()) errors.push("Stok kodu eksik.");
    if (!record.brand.trim() || !record.model.trim()) errors.push("Marka ve model zorunlu.");
    if (!record.modelYear || record.modelYear < 1950 || record.modelYear > currentYear + 1) errors.push("Model yılı eksik veya geçersiz.");
    if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) errors.push(record.category === "RENTAL" ? "Günlük kiralama fiyatı 0 olamaz." : "Satış fiyatı 0 olamaz.");
    if (!record.branchId) errors.push("İlanın bağlı olduğu şube seçilmedi.");
    if ((record.description || "").trim().length < 40) errors.push("Açıklama en az 40 karakter olmalı.");
    if (record.dataQualityStatus === "UNVERIFIED") errors.push("Veri doğrulama durumu tamamlanmadı.");
    if (record.dataQualityStatus !== "BUSINESS_VERIFIED") {
      if (!(record.specSourceName || "").trim()) errors.push("Teknik kaynak adı eksik.");
      if (!this.isHttps(record.specSourceUrl)) errors.push("Teknik kaynak URL adresi geçerli HTTPS olmalı.");
    }
    if (record.category === "SALE") {
      const status=String(record.metadata?.["tramerStatus"]||"UNKNOWN").toUpperCase();
      if (status === "UNKNOWN") errors.push("Canlı satılık ilanda tramer için en az beyan seçilmeli.");
      if ((status === "DECLARED_RECORD" || status === "VERIFIED_RECORD") && Number(record.metadata?.["tramerAmount"]||0) <= 0) errors.push("Tramer kaydı varsa toplam tutar TL olarak girilmeli.");
      if ((status === "DECLARED_RECORD" || status === "VERIFIED_RECORD") && !String(record.metadata?.["tramer"]||"").trim()) errors.push("Tramer kayıt açıklaması eksik.");
      if (status.startsWith("VERIFIED_")) {
        if (!String(record.metadata?.["tramerSourceName"]||"").trim()) errors.push("Tramer doğrulama kaynak adı eksik.");
        if (!this.isHttps(String(record.metadata?.["tramerSourceUrl"]||""))) errors.push("Tramer doğrulama URL adresi geçerli HTTPS olmalı.");
        if (!String(record.metadata?.["tramerVerifiedAt"]||"").trim()) errors.push("Tramer doğrulama zamanı eksik.");
      }
      const expertise=record.metadata?.["damageExpertise"];const values=expertise&&typeof expertise==="object"&&!Array.isArray(expertise)?Object.values(expertise as Record<string,unknown>).map(String):[];
      if(record.metadata?.["isDamageFree"]===true&&values.some(v=>v==="local_painted"||v==="painted"||v==="changed"))errors.push("Hasarsız beyanı ile lokal boyalı, boyalı veya değişen parça çelişiyor.");
    }
    if (media.activeImages < 1) errors.push("En az bir aktif araç görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı yayın için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  async tourPublicationErrors(record: TourAdminRecord): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    const token = await this.requiredToken();
    const media = await this.mediaSummary("tour_id", record.id, token);
    const errors: string[] = [];

    if (!record.title.trim()) errors.push("Tur adı zorunlu.");
    if (!record.seoSlug.trim()) errors.push("SEO adresi zorunlu.");
    if (!Number.isFinite(Number(record.pricePerPerson)) || Number(record.pricePerPerson) <= 0) errors.push("Tur fiyatı 0 olamaz.");
    if (!record.branchId) errors.push("Turun bağlı olduğu şube seçilmedi.");
    if ((record.description || "").trim().length < 40) errors.push("Detaylı açıklama en az 40 karakter olmalı.");
    if (record.dataQualityStatus === "UNVERIFIED") errors.push("Veri doğrulama durumu tamamlanmadı.");
    if (!(record.locationName || "").trim()) errors.push("Tur konumu zorunlu.");
    if (record.dataQualityStatus !== "BUSINESS_VERIFIED") {
      if (!(record.sourceName || "").trim()) errors.push("Araştırma kaynak adı eksik.");
      if (!this.isHttps(record.sourceUrl)) errors.push("Araştırma kaynak URL adresi geçerli HTTPS olmalı.");
    }
    if (media.activeImages < 1) errors.push("En az bir aktif tur görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı tur yayını için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  async saveVehicle(record: VehicleAdminRecord): Promise<void> {
    const token = await this.requiredToken();
    const errors = await this.vehiclePublicationErrorsWithToken(record, token);
    if (errors.length) throw new Error(`Yayın engellendi: ${errors.join(" · ")}`);

    const effectivePrice = record.category === "RENTAL"
      ? Math.max(0, Number(record.rentalPriceDaily ?? record.price) || 0)
      : Math.max(0, Number(record.price) || 0);
    const publishing = this.requiresPublicationGate(record.publicationStatus);
    const active = publishing ? true : record.publicationStatus === "ARCHIVED" || record.publicationStatus === "DRAFT" ? false : record.isActive;

    const body = {
      stock_code: record.stockCode.trim(),
      category: record.category,
      brand: record.brand.trim(),
      model: record.model.trim(),
      model_year: record.modelYear ?? null,
      price: effectivePrice,
      rental_price_daily: record.category === "RENTAL" ? effectivePrice : null,
      mileage_km: record.category === "SALE" ? Math.max(0, Number(record.mileageKm) || 0) : null,
      fuel_type: record.fuelType?.trim() || null,
      transmission: record.transmission?.trim() || null,
      body_type: record.bodyType?.trim() || null,
      color: record.color?.trim() || null,
      engine: record.engine?.trim() || null,
      seats: record.seats ?? null,
      doors: record.doors ?? null,
      location: record.location?.trim() || null,
      description: record.description?.trim() || null,
      features: record.features.filter(Boolean).slice(0, 100),
      is_featured: record.isFeatured,
      is_active: active,
      availability_status: record.availabilityStatus || "AVAILABLE",
      seo_slug: record.seoSlug?.trim() || null,
      publication_status: record.publicationStatus,
      published_at: record.publicationStatus === "PUBLISHED" ? (record.publishedAt || new Date().toISOString()) : record.publishedAt || null,
      scheduled_at: record.publicationStatus === "SCHEDULED" ? this.toIsoDateTime(record.scheduledAt) : null,
      record_origin: record.recordOrigin || "REAL",
      data_quality_status: record.dataQualityStatus || "UNVERIFIED",
      spec_source_url: record.specSourceUrl?.trim() || null,
      spec_source_name: record.specSourceName?.trim() || null,
      actual_vehicle_verified: record.dataQualityStatus === "UNVERIFIED" ? false : record.actualVehicleVerified === true,
      branch_id: record.branchId || null,
      metadata: record.metadata || {},
      updated_at: new Date().toISOString(),
    };
    await this.rest("PATCH", `vehicles?id=eq.${encodeURIComponent(record.id)}`, body, token);
  }

  async saveTour(record: TourAdminRecord): Promise<void> {
    const token = await this.requiredToken();
    const errors = await this.tourPublicationErrorsWithToken(record, token);
    if (errors.length) throw new Error(`Yayın engellendi: ${errors.join(" · ")}`);

    const publishing = this.requiresPublicationGate(record.publicationStatus);
    const active = publishing ? true : record.publicationStatus === "ARCHIVED" || record.publicationStatus === "DRAFT" ? false : record.isActive;
    const body = {
      title: record.title.trim(),
      seo_slug: record.seoSlug.trim(),
      category: record.category?.trim() || null,
      short_description: record.shortDescription?.trim() || null,
      description: record.description?.trim() || null,
      price_per_person: Math.max(0, Number(record.pricePerPerson) || 0),
      duration: record.duration?.trim() || null,
      capacity: record.capacity ?? null,
      meeting_point: record.meetingPoint?.trim() || null,
      itinerary: record.itinerary || [],
      included_items: record.includedItems.filter(Boolean).slice(0, 100),
      excluded_items: record.excludedItems.filter(Boolean).slice(0, 100),
      images: record.images.filter(Boolean).slice(0, 30),
      cover_image: record.coverImage?.trim() || record.images[0] || null,
      is_featured: record.isFeatured,
      is_active: active,
      publication_status: record.publicationStatus,
      published_at: record.publicationStatus === "PUBLISHED" ? (record.publishedAt || new Date().toISOString()) : record.publishedAt || null,
      scheduled_at: record.publicationStatus === "SCHEDULED" ? this.toIsoDateTime(record.scheduledAt) : null,
      record_origin: record.recordOrigin || "REAL",
      data_quality_status: record.dataQualityStatus || "UNVERIFIED",
      source_url: record.sourceUrl?.trim() || null,
      source_name: record.sourceName?.trim() || null,
      location_name: record.locationName?.trim() || null,
      latitude: this.optionalNumber(record.latitude),
      longitude: this.optionalNumber(record.longitude),
      map_url: record.mapUrl?.trim() || null,
      branch_id: record.branchId || null,
      metadata: record.metadata || {},
      updated_at: new Date().toISOString(),
    };
    await this.rest("PATCH", `tours?id=eq.${encodeURIComponent(record.id)}`, body, token);
  }

  async archiveVehicle(record: VehicleAdminRecord): Promise<void> {
    record.publicationStatus = "ARCHIVED";
    record.isActive = false;
    await this.saveVehicle(record);
  }

  async archiveTour(record: TourAdminRecord): Promise<void> {
    record.publicationStatus = "ARCHIVED";
    record.isActive = false;
    await this.saveTour(record);
  }

  private async vehiclePublicationErrorsWithToken(record: VehicleAdminRecord, token: string): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    const media = await this.mediaSummary("vehicle_id", record.id, token);
    return this.vehicleErrors(record, media);
  }

  private async tourPublicationErrorsWithToken(record: TourAdminRecord, token: string): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    const media = await this.mediaSummary("tour_id", record.id, token);
    return this.tourErrors(record, media);
  }

  private vehicleErrors(record: VehicleAdminRecord, media: MediaSummary): string[] {
    const errors: string[] = [];
    const currentYear = new Date().getFullYear();
    const effectivePrice = record.category === "RENTAL" ? Number(record.rentalPriceDaily ?? record.price) : Number(record.price);
    if (!record.stockCode.trim()) errors.push("Stok kodu eksik.");
    if (!record.brand.trim() || !record.model.trim()) errors.push("Marka ve model zorunlu.");
    if (!record.modelYear || record.modelYear < 1950 || record.modelYear > currentYear + 1) errors.push("Model yılı eksik veya geçersiz.");
    if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) errors.push(record.category === "RENTAL" ? "Günlük kiralama fiyatı 0 olamaz." : "Satış fiyatı 0 olamaz.");
    if (!record.branchId) errors.push("İlanın bağlı olduğu şube seçilmedi.");
    if ((record.description || "").trim().length < 40) errors.push("Açıklama en az 40 karakter olmalı.");
    if (record.dataQualityStatus === "UNVERIFIED") errors.push("Veri doğrulama durumu tamamlanmadı.");
    if (record.dataQualityStatus !== "BUSINESS_VERIFIED") {
      if (!(record.specSourceName || "").trim()) errors.push("Teknik kaynak adı eksik.");
      if (!this.isHttps(record.specSourceUrl)) errors.push("Teknik kaynak URL adresi geçerli HTTPS olmalı.");
    }
    if (media.activeImages < 1) errors.push("En az bir aktif araç görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı yayın için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  private tourErrors(record: TourAdminRecord, media: MediaSummary): string[] {
    const errors: string[] = [];
    if (!record.title.trim()) errors.push("Tur adı zorunlu.");
    if (!record.seoSlug.trim()) errors.push("SEO adresi zorunlu.");
    if (!Number.isFinite(Number(record.pricePerPerson)) || Number(record.pricePerPerson) <= 0) errors.push("Tur fiyatı 0 olamaz.");
    if (!record.branchId) errors.push("Turun bağlı olduğu şube seçilmedi.");
    if ((record.description || "").trim().length < 40) errors.push("Detaylı açıklama en az 40 karakter olmalı.");
    if (record.dataQualityStatus === "UNVERIFIED") errors.push("Veri doğrulama durumu tamamlanmadı.");
    if (!(record.locationName || "").trim()) errors.push("Tur konumu zorunlu.");
    if (record.dataQualityStatus !== "BUSINESS_VERIFIED") {
      if (!(record.sourceName || "").trim()) errors.push("Araştırma kaynak adı eksik.");
      if (!this.isHttps(record.sourceUrl)) errors.push("Araştırma kaynak URL adresi geçerli HTTPS olmalı.");
    }
    if (media.activeImages < 1) errors.push("En az bir aktif tur görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı tur yayını için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  private async mediaSummary(column: "vehicle_id" | "tour_id", id: string, token: string): Promise<MediaSummary> {
    const rows = await this.rest<Array<{ kind?: string; is_cover?: boolean; is_active?: boolean }>>(
      "GET",
      `catalog_media?${column}=eq.${encodeURIComponent(id)}&is_active=eq.true&select=kind,is_cover,is_active`,
      undefined,
      token,
    );
    return {
      activeImages: rows.filter((row) => row.kind === "IMAGE" && row.is_active !== false).length,
      activeCovers: rows.filter((row) => row.kind === "IMAGE" && row.is_active !== false && row.is_cover === true).length,
    };
  }

  private vehicleFromRow(row: any): VehicleAdminRecord {
    return {
      id: String(row.id), stockCode: String(row.stock_code || ""), category: row.category === "SALE" ? "SALE" : "RENTAL",
      brand: String(row.brand || ""), model: String(row.model || ""), modelYear: row.model_year ?? undefined,
      price: Number(row.price || 0), rentalPriceDaily: row.rental_price_daily == null ? undefined : Number(row.rental_price_daily),
      mileageKm: row.mileage_km ?? undefined, fuelType: row.fuel_type || undefined, transmission: row.transmission || undefined,
      bodyType: row.body_type || undefined, color: row.color || undefined, engine: row.engine || undefined, seats: row.seats ?? undefined,
      doors: row.doors ?? undefined, location: row.location || undefined, description: row.description || undefined,
      features: Array.isArray(row.features) ? row.features : [], images: Array.isArray(row.images) ? row.images : [], coverImage: row.cover_image || undefined,
      isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false, availabilityStatus: row.availability_status || "AVAILABLE",
      seoSlug: row.seo_slug || undefined, publicationStatus: row.publication_status || "PUBLISHED", publishedAt: row.published_at || undefined,
      scheduledAt: this.toLocalDateTimeInput(row.scheduled_at), recordOrigin: row.record_origin === "DEMO" ? "DEMO" : "REAL",
      dataQualityStatus: this.quality(row.data_quality_status), specSourceUrl: row.spec_source_url || undefined,
      specSourceName: row.spec_source_name || undefined, actualVehicleVerified: row.actual_vehicle_verified === true,
      branchId: row.branch_id || undefined, metadata: row.metadata || {},
    };
  }

  private tourFromRow(row: any): TourAdminRecord {
    return {
      id: String(row.id), title: String(row.title || ""), seoSlug: String(row.seo_slug || ""), category: row.category || undefined,
      shortDescription: row.short_description || undefined, description: row.description || undefined, pricePerPerson: Number(row.price_per_person || 0),
      duration: row.duration || undefined, capacity: row.capacity ?? undefined, meetingPoint: row.meeting_point || undefined,
      itinerary: Array.isArray(row.itinerary) ? row.itinerary : [], includedItems: Array.isArray(row.included_items) ? row.included_items : [],
      excludedItems: Array.isArray(row.excluded_items) ? row.excluded_items : [], images: Array.isArray(row.images) ? row.images : [],
      coverImage: row.cover_image || undefined, isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false,
      publicationStatus: row.publication_status || "PUBLISHED", publishedAt: row.published_at || undefined,
      scheduledAt: this.toLocalDateTimeInput(row.scheduled_at), recordOrigin: row.record_origin === "DEMO" ? "DEMO" : "REAL",
      dataQualityStatus: this.quality(row.data_quality_status), sourceUrl: row.source_url || undefined, sourceName: row.source_name || undefined,
      locationName: row.location_name || undefined, latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude), mapUrl: row.map_url || undefined,
      branchId: row.branch_id || undefined, metadata: row.metadata || {},
    };
  }

  private quality(value: unknown): CatalogQuality {
    return value === "RESEARCHED" || value === "BUSINESS_VERIFIED" ? value : "UNVERIFIED";
  }

  private requiresPublicationGate(status: PublicationStatus): boolean {
    return status === "PUBLISHED" || status === "SCHEDULED";
  }

  private validFutureSchedule(value?: string): boolean {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) && timestamp > Date.now() + 60_000;
  }

  private isHttps(value?: string): boolean {
    if (!value) return false;
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }

  private optionalNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toIsoDateTime(value: unknown): string | null {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  }

  private toLocalDateTimeInput(value: unknown): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    const offsetMs = parsed.getTimezoneOffset() * 60_000;
    return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  private publicationMessage(raw: string): string {
    const messages: Record<string, string> = {
      "BRAND_MODEL_REQUIRED": "Marka ve model zorunlu.",
      "MODEL_YEAR_INVALID": "Model yılı eksik veya geçersiz.",
      "PRICE_REQUIRED": "Fiyat 0 olamaz.",
      "BRANCH_REQUIRED": "Şube seçilmedi.",
      "DESCRIPTION_TOO_SHORT": "Açıklama en az 40 karakter olmalı.",
      "DATA_UNVERIFIED": "Veri doğrulama durumu tamamlanmadı.",
      "TECHNICAL_SOURCE_REQUIRED": "Teknik kaynak adı ve HTTPS bağlantısı gerekli.",
      "SOURCE_REQUIRED": "Kaynak adı ve HTTPS bağlantısı gerekli.",
      "LOCATION_REQUIRED": "Tur konumu zorunlu.",
      "TITLE_SLUG_REQUIRED": "Tur adı ve SEO adresi zorunlu.",
      "SCHEDULE_MUST_BE_FUTURE": "Planlanan yayın tarihi gelecekte olmalı.",
      "PUBLISHED_MUST_BE_ACTIVE": "Canlı yayınlanan kayıt aktif olmalı.",
      "ACTIVE_IMAGE_REQUIRED": "En az bir aktif görsel gerekli.",
      "SINGLE_ACTIVE_COVER_REQUIRED": "Tam olarak bir aktif kapak görseli gerekli.",
    };
    const code = raw.split(":").pop() || "";
    return messages[code] || raw;
  }

  private async rest<T = unknown>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        ...(method === "GET" ? {} : { "content-type": "application/json", Prefer: "return=representation" }),
      },
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const raw = String(payload?.message || payload?.code || `CATALOG_ADMIN_${response.status}`);
      if (raw.includes("PUBLICATION_BLOCKED:")) throw new Error(`Yayın engellendi: ${this.publicationMessage(raw)}`);
      throw new Error(raw);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("Yönetici oturumu gerekli.");
    return token;
  }
}
