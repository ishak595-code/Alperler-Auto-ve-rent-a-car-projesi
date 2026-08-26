import { Injectable, inject } from "@angular/core";
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

interface CatalogSnapshotPayload {
  vehicles?: Record<string, unknown>[];
  tours?: Record<string, unknown>[];
}

@Injectable({ providedIn: "root" })
export class CatalogAdminEditorService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = "/api/partner?op=catalog-admin";

  async vehicles(): Promise<VehicleAdminRecord[]> {
    const snapshot = await this.snapshot();
    return (snapshot.vehicles || []).map((row) => this.vehicleFromRow(row));
  }

  async tours(): Promise<TourAdminRecord[]> {
    const snapshot = await this.snapshot();
    return (snapshot.tours || []).map((row) => this.tourFromRow(row));
  }

  async createVehicle(category: "RENTAL" | "SALE"): Promise<VehicleAdminRecord> {
    const payload = await this.request<{ record?: Record<string, unknown> }>("POST", this.endpoint, {
      action: "CREATE_VEHICLE",
      category,
    });
    if (!payload.record) throw new Error("Araç taslağı oluşturulamadı.");
    return this.vehicleFromRow(payload.record);
  }

  async createTour(): Promise<TourAdminRecord> {
    const payload = await this.request<{ record?: Record<string, unknown> }>("POST", this.endpoint, { action: "CREATE_TOUR" });
    if (!payload.record) throw new Error("Tur taslağı oluşturulamadı.");
    return this.tourFromRow(payload.record);
  }

  async vehiclePublicationErrors(record: VehicleAdminRecord): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    return this.vehicleErrors(record, await this.mediaSummary("VEHICLE", record.id));
  }

  async tourPublicationErrors(record: TourAdminRecord): Promise<string[]> {
    if (!this.requiresPublicationGate(record.publicationStatus)) return [];
    return this.tourErrors(record, await this.mediaSummary("TOUR", record.id));
  }

  async saveVehicle(record: VehicleAdminRecord): Promise<void> {
    if (this.requiresPublicationGate(record.publicationStatus)) {
      const errors = this.vehicleErrors(record, await this.mediaSummary("VEHICLE", record.id));
      if (errors.length) throw new Error(`Yayın engellendi: ${errors.join(" · ")}`);
    }

    const effectivePrice = record.category === "RENTAL"
      ? Math.max(0, Number(record.rentalPriceDaily ?? record.price) || 0)
      : Math.max(0, Number(record.price) || 0);

    await this.request("PATCH", this.endpoint, {
      action: "SAVE_VEHICLE",
      id: record.id,
      payload: {
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
        metadata: this.object(record.metadata),
      },
    });
  }

  async saveTour(record: TourAdminRecord): Promise<void> {
    if (this.requiresPublicationGate(record.publicationStatus)) {
      const errors = this.tourErrors(record, await this.mediaSummary("TOUR", record.id));
      if (errors.length) throw new Error(`Yayın engellendi: ${errors.join(" · ")}`);
    }

    await this.request("PATCH", this.endpoint, {
      action: "SAVE_TOUR",
      id: record.id,
      payload: {
        title: record.title.trim(),
        seo_slug: record.seoSlug.trim(),
        category: record.category?.trim() || null,
        short_description: record.shortDescription?.trim() || null,
        description: record.description?.trim() || null,
        price_per_person: Math.max(0, Number(record.pricePerPerson) || 0),
        duration: record.duration?.trim() || null,
        capacity: record.capacity ?? null,
        meeting_point: record.meetingPoint?.trim() || null,
        itinerary: Array.isArray(record.itinerary) ? record.itinerary : [],
        included_items: record.includedItems.filter(Boolean).slice(0, 100),
        excluded_items: record.excludedItems.filter(Boolean).slice(0, 100),
        images: record.images.filter(Boolean).slice(0, 30),
        cover_image: record.coverImage?.trim() || record.images[0] || null,
        is_featured: record.isFeatured,
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
        metadata: this.object(record.metadata),
      },
    });
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

  private async snapshot(): Promise<CatalogSnapshotPayload> {
    const payload = await this.request<{ data?: CatalogSnapshotPayload }>("GET", `${this.endpoint}&view=snapshot`);
    return payload.data || {};
  }

  private async mediaSummary(kind: "VEHICLE" | "TOUR", id: string): Promise<MediaSummary> {
    const payload = await this.request<{ data?: Partial<MediaSummary> }>(
      "GET",
      `${this.endpoint}&view=media-summary&kind=${kind.toLowerCase()}&id=${encodeURIComponent(id)}`,
    );
    return {
      activeImages: Math.max(0, Number(payload.data?.activeImages || 0)),
      activeCovers: Math.max(0, Number(payload.data?.activeCovers || 0)),
    };
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
    if (record.category === "SALE") this.saleTruthErrors(record, errors);
    if (media.activeImages < 1) errors.push("En az bir aktif araç görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı yayın için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  private saleTruthErrors(record: VehicleAdminRecord, errors: string[]): void {
    const status = String(record.metadata?.["tramerStatus"] || "UNKNOWN").toUpperCase();
    if (status === "UNKNOWN") errors.push("Canlı satılık ilanda tramer için en az beyan seçilmeli.");
    if (["DECLARED_RECORD", "VERIFIED_RECORD"].includes(status) && Number(record.metadata?.["tramerAmount"] || 0) <= 0) errors.push("Tramer kaydı varsa toplam tutar TL olarak girilmeli.");
    if (["DECLARED_RECORD", "VERIFIED_RECORD"].includes(status) && !String(record.metadata?.["tramer"] || "").trim()) errors.push("Tramer kayıt açıklaması eksik.");
    if (status.startsWith("VERIFIED_")) {
      if (!String(record.metadata?.["tramerSourceName"] || "").trim()) errors.push("Tramer doğrulama kaynak adı eksik.");
      if (!this.isHttps(String(record.metadata?.["tramerSourceUrl"] || ""))) errors.push("Tramer doğrulama URL adresi geçerli HTTPS olmalı.");
      if (!String(record.metadata?.["tramerVerifiedAt"] || "").trim()) errors.push("Tramer doğrulama zamanı eksik.");
    }
    const expertise = record.metadata?.["damageExpertise"];
    const values = expertise && typeof expertise === "object" && !Array.isArray(expertise)
      ? Object.values(expertise as Record<string, unknown>).map(String)
      : [];
    if (record.metadata?.["isDamageFree"] === true && values.some((value) => ["local_painted", "painted", "changed"].includes(value))) {
      errors.push("Hasarsız beyanı ile lokal boyalı, boyalı veya değişen parça çelişiyor.");
    }
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
    if (!(record.duration || "").trim()) errors.push("Tur süresi zorunlu.");
    if (!record.capacity || record.capacity < 1 || record.capacity > 1000) errors.push("Tur kapasitesi 1 ile 1000 arasında olmalı.");
    if (!(record.meetingPoint || "").trim()) errors.push("Buluşma noktası zorunlu.");
    if (!Array.isArray(record.itinerary) || record.itinerary.length < 1) errors.push("Tur programı en az bir adımdan oluşmalı.");
    if (record.includedItems.length < 1) errors.push("Fiyata dahil en az bir kalem girilmeli.");
    if (record.excludedItems.length < 1) errors.push("Fiyata dahil olmayan en az bir kalem girilmeli.");
    if (media.activeImages < 1) errors.push("En az bir aktif tur görseli gerekli.");
    if (media.activeCovers !== 1) errors.push("Tam olarak bir aktif kapak görseli seçilmeli.");
    if (record.publicationStatus === "SCHEDULED" && !this.validFutureSchedule(record.scheduledAt)) errors.push("Planlı tur yayını için gelecekte bir tarih ve saat seçin.");
    return errors;
  }

  private vehicleFromRow(row: Record<string, any>): VehicleAdminRecord {
    return {
      id: String(row.id), stockCode: String(row.stock_code || ""), category: row.category === "SALE" ? "SALE" : "RENTAL",
      brand: String(row.brand || ""), model: String(row.model || ""), modelYear: row.model_year ?? undefined,
      price: Number(row.price || 0), rentalPriceDaily: row.rental_price_daily == null ? undefined : Number(row.rental_price_daily),
      mileageKm: row.mileage_km ?? undefined, fuelType: row.fuel_type || undefined, transmission: row.transmission || undefined,
      bodyType: row.body_type || undefined, color: row.color || undefined, engine: row.engine || undefined, seats: row.seats ?? undefined,
      doors: row.doors ?? undefined, location: row.location || undefined, description: row.description || undefined,
      features: Array.isArray(row.features) ? row.features : [], images: Array.isArray(row.images) ? row.images : [], coverImage: row.cover_image || undefined,
      isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false, availabilityStatus: row.availability_status || "AVAILABLE",
      seoSlug: row.seo_slug || undefined, publicationStatus: this.publicationStatus(row.publication_status), publishedAt: row.published_at || undefined,
      scheduledAt: this.toLocalDateTimeInput(row.scheduled_at), recordOrigin: row.record_origin === "DEMO" ? "DEMO" : "REAL",
      dataQualityStatus: this.quality(row.data_quality_status), specSourceUrl: row.spec_source_url || undefined,
      specSourceName: row.spec_source_name || undefined, actualVehicleVerified: row.actual_vehicle_verified === true,
      branchId: row.branch_id || undefined, metadata: this.object(row.metadata),
    };
  }

  private tourFromRow(row: Record<string, any>): TourAdminRecord {
    return {
      id: String(row.id), title: String(row.title || ""), seoSlug: String(row.seo_slug || ""), category: row.category || undefined,
      shortDescription: row.short_description || undefined, description: row.description || undefined, pricePerPerson: Number(row.price_per_person || 0),
      duration: row.duration || undefined, capacity: row.capacity ?? undefined, meetingPoint: row.meeting_point || undefined,
      itinerary: Array.isArray(row.itinerary) ? row.itinerary : [], includedItems: Array.isArray(row.included_items) ? row.included_items : [],
      excludedItems: Array.isArray(row.excluded_items) ? row.excluded_items : [], images: Array.isArray(row.images) ? row.images : [],
      coverImage: row.cover_image || undefined, isFeatured: Boolean(row.is_featured), isActive: row.is_active !== false,
      publicationStatus: this.publicationStatus(row.publication_status), publishedAt: row.published_at || undefined,
      scheduledAt: this.toLocalDateTimeInput(row.scheduled_at), recordOrigin: row.record_origin === "DEMO" ? "DEMO" : "REAL",
      dataQualityStatus: this.quality(row.data_quality_status), sourceUrl: row.source_url || undefined, sourceName: row.source_name || undefined,
      locationName: row.location_name || undefined, latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude), mapUrl: row.map_url || undefined,
      branchId: row.branch_id || undefined, metadata: this.object(row.metadata),
    };
  }

  private quality(value: unknown): CatalogQuality {
    return value === "RESEARCHED" || value === "BUSINESS_VERIFIED" ? value : "UNVERIFIED";
  }

  private publicationStatus(value: unknown): PublicationStatus {
    return value === "DRAFT" || value === "SCHEDULED" || value === "ARCHIVED" ? value : "PUBLISHED";
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

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private publicationMessage(raw: string): string {
    const messages: Record<string, string> = {
      BRAND_MODEL_REQUIRED: "Marka ve model zorunlu.",
      MODEL_YEAR_INVALID: "Model yılı eksik veya geçersiz.",
      PRICE_REQUIRED: "Fiyat 0 olamaz.",
      BRANCH_REQUIRED: "Şube seçilmedi.",
      DESCRIPTION_TOO_SHORT: "Açıklama yeterince ayrıntılı değil.",
      DATA_UNVERIFIED: "Veri doğrulama durumu tamamlanmadı.",
      TECHNICAL_SOURCE_REQUIRED: "Teknik kaynak adı ve HTTPS bağlantısı gerekli.",
      SOURCE_REQUIRED: "Kaynak adı ve HTTPS bağlantısı gerekli.",
      LOCATION_REQUIRED: "Tur konumu zorunlu.",
      TITLE_SLUG_REQUIRED: "Tur adı ve SEO adresi zorunlu.",
      SCHEDULE_MUST_BE_FUTURE: "Planlanan yayın tarihi gelecekte olmalı.",
      PUBLISHED_MUST_BE_ACTIVE: "Canlı yayınlanan kayıt aktif olmalı.",
      ACTIVE_IMAGE_REQUIRED: "En az bir aktif görsel gerekli.",
      SINGLE_ACTIVE_COVER_REQUIRED: "Tam olarak bir aktif kapak görseli gerekli.",
      SALE_MILEAGE_REQUIRED: "Satılık araç kilometresi zorunlu.",
      SALE_FUEL_REQUIRED: "Satılık araç yakıt tipi zorunlu.",
      SALE_TRANSMISSION_REQUIRED: "Satılık araç vites bilgisi zorunlu.",
      SALE_BODY_TYPE_REQUIRED: "Satılık araç kasa tipi zorunlu.",
      SALE_COLOR_REQUIRED: "Satılık araç renk bilgisi zorunlu.",
      SALE_ENGINE_REQUIRED: "Satılık araç motor bilgisi zorunlu.",
      SALE_LOCATION_REQUIRED: "Satılık araç konumu zorunlu.",
      SALE_TRAMER_STATUS_REQUIRED: "Tramer durumu zorunlu.",
      SALE_TRAMER_DECLARATION_REQUIRED: "Tramer beyanı zorunlu.",
      SALE_TRAMER_AMOUNT_REQUIRED: "Tramer kayıt tutarı zorunlu.",
      SALE_TRAMER_DETAIL_REQUIRED: "Tramer açıklaması zorunlu.",
      SALE_TRAMER_VERIFICATION_PROVENANCE_REQUIRED: "Doğrulanmış tramer için kaynak ve doğrulama zamanı gerekli.",
      SALE_DAMAGE_FREE_EXPERTISE_CONFLICT: "Hasarsız beyanı ekspertiz bilgileriyle çelişiyor.",
      DURATION_REQUIRED: "Tur süresi zorunlu.",
      CAPACITY_REQUIRED: "Tur kapasitesi zorunlu.",
      MEETING_POINT_REQUIRED: "Buluşma noktası zorunlu.",
      ITINERARY_REQUIRED: "Tur programı zorunlu.",
      INCLUDED_ITEMS_REQUIRED: "Fiyata dahil kalemler zorunlu.",
      EXCLUDED_ITEMS_REQUIRED: "Fiyata dahil olmayan kalemler zorunlu.",
      CURRENCY_MUST_BE_TRY: "Tur para birimi TRY olmalı.",
    };
    const code = raw.split(":").pop()?.trim() || raw;
    return messages[code] || raw;
  }

  private async request<T = Record<string, unknown>>(method: "GET" | "POST" | "PATCH", url: string, body?: Record<string, unknown>): Promise<T> {
    const token = await this.requiredToken();
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(method === "GET" ? {} : { "content-type": "application/json" }),
      },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || payload["ok"] === false) {
      const code = String(payload["code"] || `CATALOG_ADMIN_${response.status}`);
      if (code.includes("PUBLICATION_BLOCKED:")) throw new Error(`Yayın engellendi: ${this.publicationMessage(code)}`);
      if (code === "INVALID_CATALOG_FIELD_VALUE") throw new Error("Girilen katalog alanlarından biri geçersiz. Sayı, tarih ve seçimleri kontrol edin.");
      if (code === "RATE_LIMITED") throw new Error("Çok hızlı işlem yapıldı. Kısa bir süre sonra tekrar deneyin.");
      throw new Error(code);
    }
    return payload as T;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("Yönetici oturumu gerekli.");
    return token;
  }
}
