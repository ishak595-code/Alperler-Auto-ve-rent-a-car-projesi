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
  private readonly _notifications = signal<
    { id: number; to: string; message: string; date: Date }[]
  >([]);

  private readonly _config = signal<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  private readonly _faqs = signal<FaqItem[]>([]);
  private readonly _inventory = signal<Vehicle[]>([]);
  private readonly _blogPosts = signal<BlogPost[]>([]);
  private readonly _reservations = signal<BookingRequest[]>([]);
  private readonly _tours = signal<Tour[]>([]);

  private cloudRefreshTimer?: number;
  private cloudRefreshInFlight = false;
  private cloudRefreshQueued = false;
  private genAI: GoogleGenAI | null = null;
  private readonly apiKey =
    (typeof process !== "undefined" && process.env?.["API_KEY"]) || "";

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
      const handleStorage = (event: StorageEvent) => {
        if (event.key?.startsWith("db_")) this.loadFromStorage();
      };
      const onVisibility = () => {
        if (document.visibilityState === "visible") this.queueCloudCatalogRefresh(0);
      };
      const fallbackTimer = window.setInterval(() => {
        if (document.visibilityState === "visible") this.queueCloudCatalogRefresh(0);
      }, 60_000);
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
    if (this.cloudRefreshInFlight) {
      if (fresh) this.cloudRefreshQueued = true;
      return;
    }
    this.cloudRefreshInFlight = true;
    try {
      const [vehicles, tours, blog, faqs, config, media] = await Promise.allSettled([
        this.catalogService.loadVehicles(fresh),
        this.catalogService.loadTours(fresh),
        this.catalogService.loadBlog(fresh),
        this.catalogService.loadFaqs(fresh),
        this.catalogService.loadConfig(fresh),
        this.catalogMediaService.loadAll(),
      ]);

      if (vehicles.status === "fulfilled") {
        const source = media.status === "fulfilled"
          ? this.catalogMediaService.hydrate(vehicles.value, media.value)
          : vehicles.value;
        this.replaceVehicleCatalog(source);
      }

      if (tours.status === "fulfilled") {
        const source = media.status === "fulfilled"
          ? this.catalogMediaService.hydrate(tours.value, media.value)
          : tours.value;
        const liveTours = source as Tour[];
        this._tours.set(liveTours);
        this._inventory.update((inventory) => [
          ...inventory.filter((vehicle) => vehicle.category !== "TOUR"),
          ...liveTours,
        ]);
      }

      if (blog.status === "fulfilled") {
        this._blogPosts.set(blog.value.map((post) => this.catalogBlogToBlogPost(post)));
      }

      if (faqs.status === "fulfilled") {
        this._faqs.set(faqs.value.map((faq) => this.catalogFaqToFaq(faq)));
      }

      if (config.status === "fulfilled" && config.value) {
        this._config.set(this.normalizeConfig(config.value));
      }
    } finally {
      this.cloudRefreshInFlight = false;
      if (this.cloudRefreshQueued) {
        this.cloudRefreshQueued = false;
        this.queueCloudCatalogRefresh(60);
      }
    }
  }

  async ensureVehicleCloudInventory(): Promise<void> {
    await this.refreshCloudCatalog(true);
  }

  resetStats(): void {
    this._visitCount.set(0);
    if (typeof localStorage !== "undefined") localStorage.removeItem("db_visits");
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("session_active");
  }

  getVehicleByAdId(id: number | string): Vehicle | undefined {
    const searchId = String(id);
    return this._inventory().find((vehicle) => String(vehicle.id) === searchId);
  }

  getConfig() {
    return this._config.asReadonly();
  }

  getAllVehicles() {
    return this._inventory.asReadonly();
  }

  getCars() {
    return computed(() =>
      this._inventory().filter((vehicle) => vehicle.category === "RENTAL"),
    );
  }

  getCar(id: number | string) {
    return this._inventory().find(
      (vehicle) => vehicle.id == id && vehicle.category === "RENTAL",
    );
  }

  getVehicle(id: number | string) {
    return this._inventory().find((vehicle) => vehicle.id == id);
  }

  getSaleCars() {
    return computed(() =>
      this._inventory().filter((vehicle) => vehicle.category === "SALE"),
    );
  }

  getSaleCar(id: number | string) {
    return this._inventory().find(
      (vehicle) => vehicle.id == id && vehicle.category === "SALE",
    );
  }

  getTours() {
    return this._tours.asReadonly();
  }

  getTour(id: number | string) {
    return this._tours().find((tour) => tour.id == id);
  }

  getBlogPosts() {
    return this._blogPosts.asReadonly();
  }

  getBlogPost(id: number) {
    return this._blogPosts().find((post) => post.id === id);
  }

  getReservations() {
    return this._reservations.asReadonly();
  }

  getPartnerRequests() {
    return this._partnerRequests.asReadonly();
  }

  getVisitCount() {
    return this._visitCount.asReadonly();
  }

  getFaqs() {
    return this._faqs.asReadonly();
  }

  getFeedbacks() {
    return this._feedbacks.asReadonly();
  }

  getSubscribers() {
    return this._subscribers.asReadonly();
  }

  getNotifications() {
    return this._notifications.asReadonly();
  }

  async submitPartnerRequest(
    request: Omit<PartnerRequest, "id" | "date">,
  ): Promise<PartnerRequest> {
    const carParts = request.carBrand.trim().split(/\s+/).filter(Boolean);
    const brand = carParts.shift() || request.carBrand.trim();
    const model = carParts.join(" ") || "Belirtilmedi";
    const response = await fetch("/api/partner-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        intent: "rent",
        name: request.name,
        phone: request.phone,
        email: request.email,
        carBrand: brand,
        carModel: model,
        modelYear: request.modelYear,
        km: request.km,
        withDriver: false,
        notes: request.description,
        files: [],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
    };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.code || "PARTNER_REQUEST_FAILED");
    }

    const saved: PartnerRequest = { ...request, id: Date.now(), date: new Date() };
    this._partnerRequests.update((items) => [saved, ...items]);
    return saved;
  }

  deletePartnerRequest(id: number): void {
    this._partnerRequests.update((items) => items.filter((item) => item.id !== id));
  }

  addFeedback(feedback: Omit<Feedback, "id" | "date" | "status">): void {
    this._feedbacks.update((items) => [
      { ...feedback, id: Date.now(), date: new Date(), status: "NEW" },
      ...items,
    ]);
  }

  updateFeedbackStatus(
    id: number,
    status: "NEW" | "REVIEWED" | "ARCHIVED",
  ): void {
    this._feedbacks.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  deleteFeedback(id: number): void {
    this._feedbacks.update((items) => items.filter((item) => item.id !== id));
  }

  addFaq(faq: FaqItem): void {
    const candidate: FaqItem = {
      ...faq,
      id: faq.id || Date.now(),
    };
    const previous = this._faqs();
    this._faqs.update((items) => this.upsertById(items, candidate));
    void this.catalogService
      .saveFaq(candidate as CatalogFaqItem)
      .then((saved) => {
        const normalized = this.catalogFaqToFaq(saved);
        this._faqs.update((items) => this.upsertById(items, normalized));
      })
      .catch((error) => {
        console.error("FAQ cloud save failed", error);
        this._faqs.set(previous);
      });
  }

  deleteFaq(id: number): void {
    const existing = this._faqs().find((faq) => faq.id === id);
    if (!existing) return;
    const previous = this._faqs();
    this._faqs.update((items) => items.filter((faq) => faq.id !== id));
    void this.catalogService.disableFaq(existing as CatalogFaqItem).catch((error) => {
      console.error("FAQ cloud disable failed", error);
      this._faqs.set(previous);
    });
  }

  addTour(tour: Tour): void {
    const candidate: Tour = { ...tour, id: tour.id || Date.now(), category: "TOUR" };
    const previous = this._tours();
    this.setTourLocally(candidate);
    void this.catalogService
      .saveTour(candidate)
      .then((saved) => this.setTourLocally(saved as Tour))
      .catch((error) => {
        console.error("Tour cloud save failed", error);
        this._tours.set(previous);
        this.syncToursIntoInventory();
      });
  }

  deleteTour(id: number): void {
    const existing = this._tours().find((tour) => tour.id == id);
    if (!existing) return;
    const previous = this._tours();
    this._tours.update((items) => items.filter((tour) => tour.id != id));
    this.syncToursIntoInventory();
    void this.catalogService.disableTour(existing as Tour & Record<string, unknown>).catch((error) => {
      console.error("Tour cloud disable failed", error);
      this._tours.set(previous);
      this.syncToursIntoInventory();
    });
  }

  addPartnerRequest(req: Omit<PartnerRequest, "id" | "date">): void {
    this._partnerRequests.update((items) => [
      { ...req, id: Date.now(), date: new Date() },
      ...items,
    ]);
  }

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
    const candidate: Car = {
      ...car,
      id: car.id || Date.now(),
      category: "RENTAL",
    };
    const saved = await this.catalogService.saveVehicle(candidate) as Car;
    this._inventory.update((items) => this.upsertById(items, saved));
    return saved;
  }

  async deleteCar(id: number | string): Promise<void> {
    const existing = this._inventory().find(
      (vehicle) => vehicle.id == id && vehicle.category === "RENTAL",
    );
    if (!existing) return;
    await this.catalogService.disableVehicle(
      existing as Vehicle & Record<string, unknown>,
    );
    this._inventory.update((items) => items.filter((vehicle) => vehicle.id != id));
  }

  async addSaleCar(car: SaleCar): Promise<SaleCar> {
    const candidate: SaleCar = {
      ...car,
      id: car.id || Date.now(),
      category: "SALE",
    };
    const saved = await this.catalogService.saveVehicle(candidate) as SaleCar;
    this._inventory.update((items) => this.upsertById(items, saved));
    return saved;
  }

  async deleteSaleCar(id: number | string): Promise<void> {
    const existing = this._inventory().find(
      (vehicle) => vehicle.id == id && vehicle.category === "SALE",
    );
    if (!existing) return;
    await this.catalogService.disableVehicle(
      existing as Vehicle & Record<string, unknown>,
    );
    this._inventory.update((items) => items.filter((vehicle) => vehicle.id != id));
  }

  addBlogPost(post: BlogPost): void {
    const candidate: BlogPost = { ...post, id: post.id || Date.now() };
    const previous = this._blogPosts();
    this._blogPosts.update((items) => this.upsertById(items, candidate));
    void this.catalogService
      .saveBlog(candidate as CatalogBlogPost)
      .then((saved) => {
        const normalized = this.catalogBlogToBlogPost(saved);
        this._blogPosts.update((items) => this.upsertById(items, normalized));
      })
      .catch((error) => {
        console.error("Blog cloud save failed", error);
        this._blogPosts.set(previous);
      });
  }

  deleteBlogPost(id: number): void {
    const existing = this._blogPosts().find((post) => post.id === id);
    if (!existing) return;
    const previous = this._blogPosts();
    this._blogPosts.update((items) => items.filter((post) => post.id !== id));
    void this.catalogService.disableBlog(existing as CatalogBlogPost).catch((error) => {
      console.error("Blog cloud archive failed", error);
      this._blogPosts.set(previous);
    });
  }

  async addReservation(req: BookingRequest): Promise<BookingRequest> {
    const record = await this.bookingService.create({
      type: req.type,
      itemId: req.item?.id,
      itemName: req.itemName || req.item?.brand || "Rezervasyon",
      image: req.image,
      customerName: req.customerName || "",
      customerEmail: req.customerEmail,
      customerPhone: req.customerPhone || "",
      basePrice: req.basePrice,
      totalPrice: req.totalPrice,
      currency: "TRY",
      personCount: req.personCount,
      startDate: req.startDate,
      endDate: req.endDate,
      days: req.days,
      withDriver: req.withDriver,
      pickupLocation: req.pickupLocation,
      rentalDuration: req.rentalDuration,
      notes: req.notes,
      paymentMethod: "NONE",
      source: "WEB",
    });

    const saved: BookingRequest = {
      ...req,
      id: record.id,
      status:
        record.status === "APPROVED"
          ? "APPROVED"
          : record.status === "REJECTED"
            ? "REJECTED"
            : "PENDING",
      dateCreated: record.createdAt,
    };
    this._reservations.update((items) => [
      saved,
      ...items.filter((item) => item.id !== saved.id),
    ]);
    return saved;
  }

  async updateReservationStatus(
    id: string,
    status: "APPROVED" | "REJECTED" | "PENDING",
  ): Promise<void> {
    await this.bookingService.updateStatus(id, status);
    this._reservations.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );

    if (status === "APPROVED") {
      const reservation = this._reservations().find((item) => item.id === id);
      if (reservation?.item && reservation.startDate && reservation.endDate) {
        this._inventory.update((inventory) =>
          inventory.map((vehicle) => {
            if (vehicle.id !== reservation.item!.id) return vehicle;
            return {
              ...vehicle,
              bookedDates: [
                ...(vehicle.bookedDates || []),
                { start: reservation.startDate!, end: reservation.endDate! },
              ],
            };
          }),
        );
      }
    }
  }

  async deleteReservation(id: string): Promise<void> {
    await this.bookingService.delete(id);
    this._reservations.update((items) => items.filter((item) => item.id !== id));
  }

  setBookingRequest(request: BookingRequest): void {
    this._bookingRequest.set(request);
  }

  getBookingRequest(): BookingRequest | null {
    return this._bookingRequest();
  }

  clearBookingRequest(): void {
    this._bookingRequest.set(null);
  }

  toggleFavorite(id: number | string): void {
    this._favoriteCars.update((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }

  isFavorite(id: number | string): boolean {
    return this._favoriteCars().includes(id);
  }

  getFavoriteCount = computed(() => this._favoriteCars().length);

  removeSubscriber(email: string): void {
    this._subscribers.update((items) => items.filter((item) => item !== email));
  }

  addSubscriber(email: string): void {
    const normalized = email.trim().toLowerCase();
    if (normalized && !this._subscribers().includes(normalized)) {
      this._subscribers.update((items) => [normalized, ...items]);
    }
  }

  sendNotification(
    to: string,
    message: string,
    _pdfData?: unknown,
    subject?: string,
    htmlMessage?: string,
  ): void {
    const notification = { id: Date.now(), to, message, date: new Date() };
    this._notifications.update((items) => [notification, ...items]);

    const normalizedRecipient = to.trim().toLowerCase();
    const allowedBusinessRecipients = new Set(
      [this._config().email, ...(this._config().adminEmails || [])]
        .filter(Boolean)
        .map((value) => value.trim().toLowerCase()),
    );
    if (!normalizedRecipient.includes("@") || !allowedBusinessRecipients.has(normalizedRecipient)) {
      return;
    }

    void fetch("/api/send-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: normalizedRecipient,
        subject: subject || "Alperler Auto Bildirim",
        text: message,
        html: htmlMessage,
      }),
    }).catch((error) => console.error("Business notification failed", error));
  }

  deleteNotification(id: number): void {
    this._notifications.update((items) => items.filter((item) => item.id !== id));
  }

  clearAllNotifications(): void {
    this._notifications.set([]);
  }

  triggerWebhook(eventName: string, _payload: unknown): void {
    console.info(`External browser webhook disabled for ${eventName}.`);
  }

  async analyzeFeedback(): Promise<string> {
    if (!this.apiKey || !this.genAI) return "AI servisi şu an kullanılamıyor.";
    const feedbacks = this._feedbacks();
    if (feedbacks.length === 0) return "Henüz analiz edilecek geri bildirim bulunmuyor.";

    const feedbackText = feedbacks
      .map((feedback) =>
        `- [${feedback.category}] (${feedback.rating}/5): ${feedback.message}`,
      )
      .join("\n");

    try {
      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Müşteri geri bildirimlerini Türkçe, kısa ve profesyonel biçimde analiz et. Genel duygu, en önemli üç konu ve iki uygulanabilir iyileştirme önerisi ver.\n\n${feedbackText}`,
      });
      return result.text || "Analiz tamamlanamadı.";
    } catch (error) {
      console.error("Feedback Analysis Error", error);
      return "Analiz sırasında bir hata oluştu.";
    }
  }

  async getAIRecommendation(userQuery: string): Promise<string> {
    if (!this.apiKey || !this.genAI) {
      return `Üzgünüm, şu an bağlantı kurulamıyor. Lütfen telefonla bizi arayın: ${this._config().phone}`;
    }

    const contextData = {
      availableRentalCars: this._inventory()
        .filter((vehicle) => vehicle.category === "RENTAL" && vehicle.isAvailable)
        .map((vehicle) => ({
          brand: vehicle.brand,
          model: vehicle.model,
          type: vehicle.type,
          price: vehicle.price,
          fuel: vehicle.fuel,
          transmission: vehicle.transmission,
          seats: vehicle.seats,
        })),
      salesGallery: this._inventory()
        .filter((vehicle) => vehicle.category === "SALE")
        .map((vehicle) => ({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          km: vehicle.km,
        })),
      tours: this._tours().map((tour) => ({
        title: tour.title,
        price: tour.price,
        duration: tour.duration,
      })),
      companyInfo: {
        name: this._config().companyName,
        phone: this._config().phone,
        address: this._config().address,
        about: this._config().aboutText,
      },
    };

    try {
      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Sen Alperler Auto'nun Türkçe satış ve destek asistanısın. Yalnız araç kiralama, araç satışı, tur ve şirket bilgileri kapsamında yanıt ver. Envanterde olmayan bilgi uydurma. Kullanıcıya uygun olduğunda somut araç veya tur öner ve sonraki adımı belirt. Markdown kullanma.\n\nCANLI VERİ: ${JSON.stringify(contextData)}\n\nKULLANICI: ${userQuery}`,
      });
      return result.text || "Şu an yanıt veremiyorum.";
    } catch (error) {
      console.error("AI Error", error);
      return `Şu an size yanıt veremiyorum. Lütfen ${this._config().phone} numarasından bize ulaşın.`;
    }
  }

  private replaceVehicleCatalog(vehicles: Vehicle[]): void {
    this._inventory.update((inventory) => [
      ...inventory.filter((vehicle) => vehicle.category === "TOUR"),
      ...vehicles,
    ]);
  }

  private syncToursIntoInventory(): void {
    this._inventory.update((inventory) => [
      ...inventory.filter((vehicle) => vehicle.category !== "TOUR"),
      ...this._tours(),
    ]);
  }

  private setTourLocally(tour: Tour): void {
    this._tours.update((items) => this.upsertById(items, tour));
    this.syncToursIntoInventory();
  }

  private catalogBlogToBlogPost(post: CatalogBlogPost): BlogPost {
    return {
      ...post,
      id: this.stableNumericId(post.id),
    } as BlogPost;
  }

  private catalogFaqToFaq(faq: CatalogFaqItem): FaqItem {
    return {
      ...faq,
      id: this.stableNumericId(faq.id),
    } as FaqItem;
  }

  private stableNumericId(value: number | string): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const normalized = String(value || "").trim();
    if (/^\d+$/.test(normalized)) return Number(normalized);
    let hash = 2166136261;
    for (let index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) || 1;
  }

  private normalizeConfig(config: Partial<SiteConfig>): SiteConfig {
    const serialized = JSON.stringify({ ...DEFAULT_SITE_CONFIG, ...config })
      .replace(/Alperler Rent A Car/g, "Alperler Auto")
      .replace(/Alperler Oto/g, "Alperler Auto")
      .replace(/ALPERLER RENT A CAR/g, "ALPERLER AUTO")
      .replace(/ALPERLER OTO/g, "ALPERLER AUTO");
    return JSON.parse(serialized) as SiteConfig;
  }

  private upsertById<T extends { id: number | string }>(items: T[], value: T): T[] {
    const exists = items.some((item) => String(item.id) === String(value.id));
    return exists
      ? items.map((item) =>
          String(item.id) === String(value.id) ? value : item,
        )
      : [value, ...items];
  }

  private queueCloudCatalogRefresh(delay = 140): void {
    if (typeof window === "undefined") {
      void this.refreshCloudCatalog(true);
      return;
    }
    if (this.cloudRefreshTimer !== undefined) window.clearTimeout(this.cloudRefreshTimer);
    this.cloudRefreshTimer = window.setTimeout(() => {
      this.cloudRefreshTimer = undefined;
      void this.refreshCloudCatalog(true);
    }, delay);
  }

  private incrementVisitCount(): void {
    if (typeof sessionStorage === "undefined") return;
    if (!sessionStorage.getItem("session_active")) {
      sessionStorage.setItem("session_active", "true");
      this._visitCount.update((count) => count + 1);
    }
  }

  private installLocalPersistence(): void {
    if (typeof localStorage === "undefined") return;

    // Only user/session state is persisted locally. Published catalogue content
    // is server-authoritative and is intentionally never cached as browser truth.
    effect(() => localStorage.setItem("db_reservations_v2", JSON.stringify(this._reservations())));
    effect(() => localStorage.setItem("db_partnerRequests_v2", JSON.stringify(this._partnerRequests())));
    effect(() => localStorage.setItem("db_visits", String(this._visitCount())));
    effect(() => localStorage.setItem("db_feedbacks_v2", JSON.stringify(this._feedbacks())));
    effect(() => localStorage.setItem("db_subscribers", JSON.stringify(this._subscribers())));
    effect(() => localStorage.setItem("db_notifications", JSON.stringify(this._notifications())));
    effect(() => localStorage.setItem("db_favoriteCars", JSON.stringify(this._favoriteCars())));
  }

  private loadFromStorage(): void {
    if (typeof localStorage === "undefined") return;

    // Purge every historical catalogue snapshot. This duplicates the bootstrap
    // guard intentionally so CarService remains safe in tests and alternate entrypoints.
    const catalogCacheKey = /^db_(?:cars|rental_?cars?|sale_?cars?|sales?|vehicles?|tours?|inventory|config|faqs?|blog)(?:_|$)/i;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && catalogCacheKey.test(key)) localStorage.removeItem(key);
    }

    this.readStorage("db_reservations_v2", (value) => {
      if (Array.isArray(value)) this._reservations.set(value as BookingRequest[]);
    });
    this.readStorage("db_partnerRequests_v2", (value) => {
      if (Array.isArray(value)) this._partnerRequests.set(value as PartnerRequest[]);
    });
    this.readStorage("db_feedbacks_v2", (value) => {
      if (Array.isArray(value)) this._feedbacks.set(value as Feedback[]);
    });
    this.readStorage("db_subscribers", (value) => {
      if (Array.isArray(value)) this._subscribers.set(value as string[]);
    });
    this.readStorage("db_notifications", (value) => {
      if (Array.isArray(value)) {
        this._notifications.set(
          value.map((item: any) => ({ ...item, date: new Date(item.date) })),
        );
      }
    });
    this.readStorage("db_favoriteCars", (value) => {
      if (Array.isArray(value)) this._favoriteCars.set(value as (number | string)[]);
    });

    const visits = Number(localStorage.getItem("db_visits") || 0);
    if (Number.isFinite(visits) && visits >= 0) this._visitCount.set(visits);
  }

  private readStorage(key: string, apply: (value: unknown) => void): void {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      apply(JSON.parse(raw));
    } catch (error) {
      console.warn(`Ignoring invalid local cache: ${key}`, error);
      localStorage.removeItem(key);
    }
  }
}
