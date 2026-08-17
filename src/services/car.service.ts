import { DestroyRef, Injectable, computed, effect, inject, signal } from "@angular/core";
import { GoogleGenAI } from "@google/genai";
import { Car, SaleCar, Tour, Vehicle } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";
import { BookingService } from "./booking.service";
import {
  CatalogBlogPost,
  CatalogFaqItem,
  CatalogService,
} from "./catalog.service";
import { DEFAULT_SITE_CONFIG } from "./default-site-config";
import {
  fallbackBlogPosts,
  fallbackFaqs,
  fallbackInventory,
} from "./mock-data";
import { PublicCatalogMediaService } from "./public-catalog-media.service";
import { PublicContentRealtimeService } from "./public-content-realtime.service";

export interface BlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  image: string;
  readTime: string;
  date: string;
  cloudId?: string;
  cloudSlug?: string;
}

export interface BookingRequest {
  id?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  dateCreated?: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  type: "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";
  item: Car | SaleCar | Tour | null;
  itemName: string;
  image?: string;
  basePrice?: number;
  totalPrice?: number;
  personCount?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  withDriver?: boolean;
  pickupLocation?: string;
  rentalDuration?: string;
  notes?: string;
}

export interface PartnerRequest {
  id: number;
  name: string;
  phone: string;
  email?: string;
  carBrand: string;
  modelYear: number;
  km: number;
  description: string;
  date: Date;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  isOpen?: boolean;
  category?: string;
  cloudId?: string;
}

export interface Feedback {
  id: number;
  category: "BUG" | "FEATURE" | "GENERAL" | "CONTENT" | "OTHER";
  rating: number;
  message: string;
  date: Date;
  status: "NEW" | "REVIEWED" | "ARCHIVED";
}

@Injectable({ providedIn: "root" })
export class CarService {
  private readonly catalogService = inject(CatalogService);
  private readonly catalogMediaService = inject(PublicCatalogMediaService);
  private readonly bookingService = inject(BookingService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _bookingRequest = signal<BookingRequest | null>(null);
  private readonly _favoriteCars = signal<(number | string)[]>([]);
  private readonly _visitCount = signal(0);
  private readonly _partnerRequests = signal<PartnerRequest[]>([]);
  private readonly _feedbacks = signal<Feedback[]>([]);
  private readonly _subscribers = signal<string[]>([]);
  private readonly _notifications = signal<{ id: number; to: string; message: string; date: Date }[]>([]);

  private readonly _config = signal<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  private readonly _faqs = signal<FaqItem[]>([...fallbackFaqs]);
  private readonly _inventory = signal<Vehicle[]>([...fallbackInventory]);
  private readonly _blogPosts = signal<BlogPost[]>([...fallbackBlogPosts]);
  private readonly _reservations = signal<BookingRequest[]>([]);
  private readonly _tours = signal<Tour[]>([...fallbackInventory.filter((vehicle) => vehicle.category === "TOUR")]);

  private cloudRefreshTimer?: number;
  private cloudRefreshInFlight = false;
  private cloudRefreshQueued = false;
  private genAI: GoogleGenAI | null = null;
  private readonly apiKey = (typeof process !== "undefined" && process.env?.["API_KEY"]) || "";

  constructor() {
    if (this.apiKey) this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    this.loadFromStorage();
    this.incrementVisitCount();
    this.installLocalPersistence();
    void this.refreshCloudCatalog();

    const unwatch = this.realtime.watch(
      ["vehicles", "tours", "catalog_media", "media_assets", "blog_posts", "faqs", "site_config"],
      () => this.queueCloudCatalogRefresh(),
    );
    this.destroyRef.onDestroy(unwatch);

    if (typeof window !== "undefined") {
      const handleStorage = (event: StorageEvent) => { if (event.key?.startsWith("db_")) this.loadFromStorage(); };
      const onVisibility = () => { if (document.visibilityState === "visible") this.queueCloudCatalogRefresh(0); };
      const fallbackTimer = window.setInterval(() => { if (document.visibilityState === "visible") this.queueCloudCatalogRefresh(0); }, 60_000);
      window.addEventListener("storage", handleStorage);
      document.addEventListener("visibilitychange", onVisibility);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener("storage", handleStorage);
        document.removeEventListener("visibilitychange", onVisibility);
        window.clearInterval(fallbackTimer);
        if (this.cloudRefreshTimer !== undefined) window.clearTimeout(this.cloudRefreshTimer);
      });
    }
  }

  async refreshCloudCatalog(fresh = false): Promise<void> {
    if (this.cloudRefreshInFlight) { if (fresh) this.cloudRefreshQueued = true; return; }
    this.cloudRefreshInFlight = true;
    try {
      const [vehicles, tours, blog, faqs, config, media] = await Promise.allSettled([
        this.catalogService.loadVehicles(fresh), this.catalogService.loadTours(fresh), this.catalogService.loadBlog(fresh),
        this.catalogService.loadFaqs(fresh), this.catalogService.loadConfig(fresh), this.catalogMediaService.loadAll(),
      ]);
      if (vehicles.status === "fulfilled") {
        const source = media.status === "fulfilled" ? this.catalogMediaService.hydrate(vehicles.value, media.value) : vehicles.value;
        this.replaceVehicleCatalog(source.map((vehicle) => this.mergeVehicleWithFallback(vehicle)));
      }
      if (tours.status === "fulfilled") {
        const source = media.status === "fulfilled" ? this.catalogMediaService.hydrate(tours.value, media.value) : tours.value;
        const mergedTours = source.map((tour) => this.mergeVehicleWithFallback(tour) as Tour);
        this._tours.set(mergedTours);
        this._inventory.update((inventory) => [...inventory.filter((vehicle) => vehicle.category !== "TOUR"), ...mergedTours]);
      }
      if (blog.status === "fulfilled") this._blogPosts.set(blog.value.map((post) => this.catalogBlogToBlogPost(post)));
      if (faqs.status === "fulfilled") this._faqs.set(faqs.value.map((faq) => this.catalogFaqToFaq(faq)));
      if (config.status === "fulfilled" && config.value) this._config.set(this.normalizeConfig(config.value));
    } finally {
      this.cloudRefreshInFlight = false;
      if (this.cloudRefreshQueued) { this.cloudRefreshQueued = false; this.queueCloudCatalogRefresh(60); }
    }
  }

  async ensureVehicleCloudInventory(): Promise<void> { await this.refreshCloudCatalog(true); }
  resetStats(): void { this._visitCount.set(0); if (typeof localStorage !== "undefined") localStorage.removeItem("db_visits"); if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("session_active"); }
  getVehicleByAdId(id: number | string): Vehicle | undefined { const searchId = String(id); return this._inventory().find((vehicle) => String(vehicle.id) === searchId); }
  getConfig() { return this._config.asReadonly(); }
  getAllVehicles() { return this._inventory.asReadonly(); }
  getCars() { return computed(() => this._inventory().filter((vehicle) => vehicle.category === "RENTAL")); }
  getCar(id: number | string) { return this._inventory().find((vehicle) => vehicle.id == id && vehicle.category === "RENTAL"); }
  getVehicle(id: number | string) { return this._inventory().find((vehicle) => vehicle.id == id); }
  getSaleCars() { return computed(() => this._inventory().filter((vehicle) => vehicle.category === "SALE")); }
  getSaleCar(id: number | string) { return this._inventory().find((vehicle) => vehicle.id == id && vehicle.category === "SALE"); }
  getTours() { return this._tours.asReadonly(); }
  getTour(id: number | string) { return this._tours().find((tour) => tour.id == id); }
  getBlogPosts() { return this._blogPosts.asReadonly(); }
  getBlogPost(id: number) { return this._blogPosts().find((post) => post.id === id); }
  getReservations() { return this._reservations.asReadonly(); }
  getPartnerRequests() { return this._partnerRequests.asReadonly(); }
  getVisitCount() { return this._visitCount.asReadonly(); }
  getFaqs() { return this._faqs.asReadonly(); }
  getFeedbacks() { return this._feedbacks.asReadonly(); }
  getSubscribers() { return this._subscribers.asReadonly(); }
  getNotifications() { return this._notifications.asReadonly(); }

  async submitPartnerRequest(request: Omit<PartnerRequest, "id" | "date">): Promise<PartnerRequest> {
    const carParts = request.carBrand.trim().split(/\s+/).filter(Boolean);
    const brand = carParts.shift() || request.carBrand.trim();
    const model = carParts.join(" ") || "Belirtilmedi";
    const response = await fetch("/api/partner-requests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), intent: "rent", name: request.name, phone: request.phone, email: request.email, carBrand: brand, carModel: model, modelYear: request.modelYear, km: request.km, withDriver: false, notes: request.description, files: [] }),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string };
    if (!response.ok || !payload.ok) throw new Error(payload.code || "PARTNER_REQUEST_FAILED");
    const saved: PartnerRequest = { ...request, id: Date.now(), date: new Date() };
    this._partnerRequests.update((items) => [saved, ...items]);
    return saved;
  }

  deletePartnerRequest(id: number): void { this._partnerRequests.update((items) => items.filter((item) => item.id !== id)); }
  addFeedback(feedback: Omit<Feedback, "id" | "date" | "status">): void { this._feedbacks.update((items) => [{ ...feedback, id: Date.now(), date: new Date(), status: "NEW" }, ...items]); }
  updateFeedbackStatus(id: number, status: "NEW" | "REVIEWED" | "ARCHIVED"): void { this._feedbacks.update((items) => items.map((item) => (item.id === id ? { ...item, status } : item))); }
  deleteFeedback(id: number): void { this._feedbacks.update((items) => items.filter((item) => item.id !== id)); }

  addFaq(faq: FaqItem): void {
    const candidate: FaqItem = { ...faq, id: faq.id || Date.now() };
    const previous = this._faqs(); this._faqs.update((items) => this.upsertById(items, candidate));
    void this.catalogService.saveFaq(candidate as CatalogFaqItem).then((saved) => this._faqs.update((items) => this.upsertById(items, this.catalogFaqToFaq(saved)))).catch((error) => { console.error("FAQ cloud save failed", error); this._faqs.set(previous); });
  }
  deleteFaq(id: number): void {
    const existing = this._faqs().find((faq) => faq.id === id); if (!existing) return;
    const previous = this._faqs(); this._faqs.update((items) => items.filter((faq) => faq.id !== id));
    void this.catalogService.disableFaq(existing as CatalogFaqItem).catch((error) => { console.error("FAQ cloud disable failed", error); this._faqs.set(previous); });
  }

  addTour(tour: Tour): void {
    const candidate: Tour = { ...tour, id: tour.id || Date.now(), category: "TOUR" };
    const previous = this._tours(); this.setTourLocally(candidate);
    void this.catalogService.saveTour(candidate).then((saved) => this.setTourLocally(this.mergeVehicleWithFallback(saved) as Tour)).catch((error) => { console.error("Tour cloud save failed", error); this._tours.set(previous); this.syncToursIntoInventory(); });
  }
  deleteTour(id: number): void {
    const existing = this._tours().find((tour) => tour.id == id); if (!existing) return;
    const previous = this._tours(); this._tours.update((items) => items.filter((tour) => tour.id != id)); this.syncToursIntoInventory();
    void this.catalogService.disableTour(existing as Tour & Record<string, unknown>).catch((error) => { console.error("Tour cloud disable failed", error); this._tours.set(previous); this.syncToursIntoInventory(); });
  }

  addPartnerRequest(req: Omit<PartnerRequest, "id" | "date">): void { this._partnerRequests.update((items) => [{ ...req, id: Date.now(), date: new Date() }, ...items]); }

  async updateConfig(newConfig: SiteConfig): Promise<void> {
    const normalized = this.normalizeConfig(newConfig);
    const previous = this._config();
    this._config.set(normalized);
    try {
      const saved = await this.catalogService.saveConfig(normalized);
      this._config.set(this.normalizeConfig(saved));
    } catch (error) {
      console.error("Site config cloud save failed", error);
      this._config.set(previous);
      throw error;
    }
  }

  async addCar(car: Car): Promise<Car> {
    const candidate: Car = { ...car, id: car.id || Date.now(), category: "RENTAL" };
    const saved = this.mergeVehicleWithFallback(await this.catalogService.saveVehicle(candidate)) as Car;
    this._inventory.update((items) => this.upsertById(items, saved)); return saved;
  }
  async deleteCar(id: number | string): Promise<void> { const existing = this._inventory().find((vehicle) => vehicle.id == id && vehicle.category === "RENTAL"); if (!existing) return; await this.catalogService.disableVehicle(existing as Vehicle & Record<string, unknown>); this._inventory.update((items) => items.filter((vehicle) => vehicle.id != id)); }
  async addSaleCar(car: SaleCar): Promise<SaleCar> { const candidate: SaleCar = { ...car, id: car.id || Date.now(), category: "SALE" }; const saved = this.mergeVehicleWithFallback(await this.catalogService.saveVehicle(candidate)) as SaleCar; this._inventory.update((items) => this.upsertById(items, saved)); return saved; }
  async deleteSaleCar(id: number | string): Promise<void> { const existing = this._inventory().find((vehicle) => vehicle.id == id && vehicle.category === "SALE"); if (!existing) return; await this.catalogService.disableVehicle(existing as Vehicle & Record<string, unknown>); this._inventory.update((items) => items.filter((vehicle) => vehicle.id != id)); }

  addBlogPost(post: BlogPost): void {
    const candidate: BlogPost = { ...post, id: post.id || Date.now() }; const previous = this._blogPosts(); this._blogPosts.update((items) => this.upsertById(items, candidate));
    void this.catalogService.saveBlog(candidate as CatalogBlogPost).then((saved) => this._blogPosts.update((items) => this.upsertById(items, this.catalogBlogToBlogPost(saved)))).catch((error) => { console.error("Blog cloud save failed", error); this._blogPosts.set(previous); });
  }
  deleteBlogPost(id: number): void { const existing = this._blogPosts().find((post) => post.id === id); if (!existing) return; const previous = this._blogPosts(); this._blogPosts.update((items) => items.filter((post) => post.id !== id)); void this.catalogService.disableBlog(existing as CatalogBlogPost).catch((error) => { console.error("Blog cloud archive failed", error); this._blogPosts.set(previous); }); }

  setBookingRequest(request: BookingRequest | null): void { this._bookingRequest.set(request); }
  getBookingRequest() { return this._bookingRequest.asReadonly(); }
  async addReservation(request: BookingRequest): Promise<void> { await this.bookingService.createBooking(request); }
  getFavoriteCars() { return this._favoriteCars.asReadonly(); }
  toggleFavorite(id: number | string): void { this._favoriteCars.update((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }

  addSubscriber(email: string): void { const normalized = email.trim().toLowerCase(); if (!normalized) return; this._subscribers.update((items) => items.includes(normalized) ? items : [normalized, ...items]); }
  addNotification(to: string, message: string): void { this._notifications.update((items) => [{ id: Date.now(), to, message, date: new Date() }, ...items]); }

  async getFeedbackAnalysis(): Promise<string> {
    const feedbacks = this._feedbacks(); if (!feedbacks.length) return "Henüz analiz edilecek geri bildirim yok.";
    if (!this.apiKey || !this.genAI) return "Yapay zekâ analizi için API anahtarı bağlı değil.";
    const feedbackText = feedbacks.map((feedback) => `- [${feedback.category}] (${feedback.rating}/5): ${feedback.message}`).join("\n");
    try { const result = await this.genAI.models.generateContent({ model: "gemini-2.5-flash", contents: `Müşteri geri bildirimlerini Türkçe, kısa ve profesyonel biçimde analiz et. Genel duygu, en önemli üç konu ve iki uygulanabilir iyileştirme önerisi ver.\n\n${feedbackText}` }); return result.text || "Analiz tamamlanamadı."; }
    catch (error) { console.error("Feedback Analysis Error", error); return "Analiz sırasında bir hata oluştu."; }
  }

  async getAIRecommendation(userQuery: string): Promise<string> {
    if (!this.apiKey || !this.genAI) return `Üzgünüm, şu an bağlantı kurulamıyor. Lütfen telefonla bizi arayın: ${this._config().phone}`;
    const contextData = {
      availableRentalCars: this._inventory().filter((vehicle) => vehicle.category === "RENTAL" && vehicle.isAvailable).map((vehicle) => ({ brand: vehicle.brand, model: vehicle.model, type: vehicle.type, price: vehicle.price, fuel: vehicle.fuel, transmission: vehicle.transmission, seats: vehicle.seats })),
      salesGallery: this._inventory().filter((vehicle) => vehicle.category === "SALE").map((vehicle) => ({ brand: vehicle.brand, model: vehicle.model, year: vehicle.year, price: vehicle.price, km: vehicle.km })),
      tours: this._tours().map((tour) => ({ title: tour.title, price: tour.price, duration: tour.duration })),
      companyInfo: { name: this._config().companyName, phone: this._config().phone, address: this._config().address, about: this._config().aboutText },
    };
    try { const result = await this.genAI.models.generateContent({ model: "gemini-2.5-flash", contents: `Sen Alperler Auto'nun Türkçe satış ve destek asistanısın. Yalnız araç kiralama, araç satışı, tur ve şirket bilgileri kapsamında yanıt ver. Envanterde olmayan bilgi uydurma. Kullanıcıya uygun olduğunda somut araç veya tur öner ve sonraki adımı belirt. Markdown kullanma.\n\nCANLI VERİ: ${JSON.stringify(contextData)}\n\nKULLANICI: ${userQuery}` }); return result.text || "Şu an yanıt veremiyorum."; }
    catch (error) { console.error("AI Error", error); return `Şu an size yanıt veremiyorum. Lütfen ${this._config().phone} numarasından bize ulaşın.`; }
  }

  private mergeVehicleWithFallback(vehicle: Vehicle): Vehicle {
    const fallback = fallbackInventory.find((candidate) => String(candidate.id) === String(vehicle.id));
    const safeFallback: Partial<Vehicle> = fallback ? { ...fallback } : {};
    delete safeFallback.image; delete safeFallback.images; delete safeFallback.gallery; delete safeFallback.videos;
    const cloudBacked = Boolean(vehicle.cloudId);
    const merged = { ...safeFallback, ...vehicle, category: vehicle.category || fallback?.category } as Vehicle;
    if (cloudBacked) {
      merged.image = vehicle.image; merged.images = Array.isArray(vehicle.images) ? vehicle.images : [];
      merged.gallery = Array.isArray(vehicle.gallery) ? vehicle.gallery : Array.isArray(vehicle.images) ? vehicle.images : [];
      merged.videos = Array.isArray(vehicle.videos) ? vehicle.videos : [];
    }
    return merged;
  }
  private replaceVehicleCatalog(vehicles: Vehicle[]): void { this._inventory.update((inventory) => [...inventory.filter((vehicle) => vehicle.category === "TOUR"), ...vehicles]); }
  private syncToursIntoInventory(): void { this._inventory.update((inventory) => [...inventory.filter((vehicle) => vehicle.category !== "TOUR"), ...this._tours()]); }
  private setTourLocally(tour: Tour): void { this._tours.update((items) => this.upsertById(items, tour)); this.syncToursIntoInventory(); }
  private catalogBlogToBlogPost(post: CatalogBlogPost): BlogPost { const fallback = fallbackBlogPosts.find((candidate) => String(candidate.id) === String(post.id)); const numericId = Number(post.id); return { ...(fallback || {}), ...post, id: Number.isFinite(numericId) ? numericId : fallback?.id || Date.now() } as BlogPost; }
  private catalogFaqToFaq(faq: CatalogFaqItem): FaqItem { const numericId = Number(faq.id); const fallback = fallbackFaqs.find((candidate) => String(candidate.id) === String(faq.id)); return { ...(fallback || {}), ...faq, id: Number.isFinite(numericId) ? numericId : fallback?.id || Date.now() } as FaqItem; }

  private normalizeConfig(raw: Partial<SiteConfig>): SiteConfig {
    const homeContent = { ...(DEFAULT_SITE_CONFIG.homeContent || {}), ...(raw.homeContent || {}) };
    return {
      ...DEFAULT_SITE_CONFIG,
      ...raw,
      homeContent,
      team: Array.isArray(raw.team) ? raw.team : DEFAULT_SITE_CONFIG.team,
      rentalExtras: Array.isArray(raw.rentalExtras) ? raw.rentalExtras : DEFAULT_SITE_CONFIG.rentalExtras,
      adminEmails: Array.isArray(raw.adminEmails) ? raw.adminEmails : DEFAULT_SITE_CONFIG.adminEmails,
    };
  }

  private upsertById<T extends { id: number | string }>(items: T[], next: T): T[] { const found = items.some((item) => String(item.id) === String(next.id)); return found ? items.map((item) => String(item.id) === String(next.id) ? next : item) : [next, ...items]; }
  private queueCloudCatalogRefresh(delay = 120): void { if (typeof window === "undefined") { void this.refreshCloudCatalog(true); return; } if (this.cloudRefreshTimer !== undefined) window.clearTimeout(this.cloudRefreshTimer); this.cloudRefreshTimer = window.setTimeout(() => { this.cloudRefreshTimer = undefined; void this.refreshCloudCatalog(true); }, delay); }

  private loadFromStorage(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const favorites = JSON.parse(localStorage.getItem("db_favorites") || "[]") as (number | string)[];
      if (Array.isArray(favorites)) this._favoriteCars.set(favorites);
      this._visitCount.set(Number(localStorage.getItem("db_visits") || "0") || 0);
    } catch { /* local cache is optional */ }
  }
  private incrementVisitCount(): void { if (typeof sessionStorage === "undefined" || typeof localStorage === "undefined") return; if (sessionStorage.getItem("session_active")) return; sessionStorage.setItem("session_active", "true"); const next = Number(localStorage.getItem("db_visits") || "0") + 1; localStorage.setItem("db_visits", String(next)); this._visitCount.set(next); }
  private installLocalPersistence(): void {
    if (typeof localStorage === "undefined") return;
    effect(() => localStorage.setItem("db_favorites", JSON.stringify(this._favoriteCars())));
  }
}
