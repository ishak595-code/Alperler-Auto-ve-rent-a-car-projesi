import { DestroyRef, Injectable, computed, effect, inject, signal } from "@angular/core";
import { Car, SaleCar, Tour, Vehicle } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";
import {
  CatalogBlogPost,
  CatalogFaqItem,
  CatalogService,
} from "./catalog.service";
import { CampaignService } from "./campaign.service";
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

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  isOpen?: boolean;
  category?: string;
  cloudId?: string;
}

@Injectable({ providedIn: "root" })
export class CarService {
  private readonly catalogService = inject(CatalogService);
  private readonly catalogMediaService = inject(PublicCatalogMediaService);
  private readonly campaignService = inject(CampaignService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  // Route handoff only. This state is intentionally in-memory and never persisted.
  private readonly _bookingRequest = signal<BookingRequest | null>(null);
  // Favorites are an intentional device preference until a cross-device account feature owns them.
  private readonly _favoriteCars = signal<(number | string)[]>([]);

  private readonly _config = signal<SiteConfig>({ ...DEFAULT_SITE_CONFIG });
  private readonly _faqs = signal<FaqItem[]>([]);
  private readonly _inventory = signal<Vehicle[]>([]);
  private readonly _blogPosts = signal<BlogPost[]>([]);
  private readonly _tours = signal<Tour[]>([]);

  private cloudRefreshTimer?: number;
  private cloudRefreshInFlight = false;
  private cloudRefreshQueued = false;
  private configRefreshTimer?: number;
  private configRefreshInFlight?: Promise<void>;
  private configRefreshQueued = false;

  constructor() {
    this.purgeObsoleteBusinessCaches();
    this.loadDevicePreferences();
    this.installDevicePreferencePersistence();

    const unwatchCatalog = this.realtime.watch(
      ["vehicles", "tours", "catalog_media", "media_assets", "blog_posts", "faqs"],
      () => this.queueCloudCatalogRefresh(),
    );
    const unwatchConfig = this.realtime.watch(
      ["site_config"],
      () => this.queueConfigRefresh(),
    );
    this.destroyRef.onDestroy(unwatchCatalog);
    this.destroyRef.onDestroy(unwatchConfig);

    if (typeof window !== "undefined") {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === "db_favoriteCars") this.loadDevicePreferences();
      };
      window.addEventListener("storage", handleStorage);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener("storage", handleStorage);
        if (this.cloudRefreshTimer !== undefined) window.clearTimeout(this.cloudRefreshTimer);
        if (this.configRefreshTimer !== undefined) window.clearTimeout(this.configRefreshTimer);
      });
    }
  }

  refreshSiteConfig(fresh = false): Promise<void> {
    if (this.configRefreshInFlight) {
      if (fresh) this.configRefreshQueued = true;
      return this.configRefreshInFlight;
    }

    const request = (async () => {
      const config = await this.catalogService.loadConfig(fresh);
      if (config) this._config.set(this.normalizeConfig(config));
    })();

    this.configRefreshInFlight = request;
    return request.finally(() => {
      if (this.configRefreshInFlight === request) this.configRefreshInFlight = undefined;
      if (this.configRefreshQueued) {
        this.configRefreshQueued = false;
        this.queueConfigRefresh(60);
      }
    });
  }

  async refreshCloudCatalog(fresh = false): Promise<void> {
    if (this.cloudRefreshInFlight) {
      if (fresh) this.cloudRefreshQueued = true;
      return;
    }
    this.cloudRefreshInFlight = true;
    try {
      const [vehicles, tours, blog, faqs, media] = await Promise.allSettled([
        this.catalogService.loadVehicles(fresh),
        this.catalogService.loadTours(fresh),
        this.catalogService.loadBlog(fresh),
        this.catalogService.loadFaqs(fresh),
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
    } finally {
      this.cloudRefreshInFlight = false;
      if (this.cloudRefreshQueued) {
        this.cloudRefreshQueued = false;
        this.queueCloudCatalogRefresh(60);
      }
    }
  }

  async ensureVehicleCloudInventory(): Promise<void> {
    await Promise.allSettled([
      this.refreshSiteConfig(true),
      this.refreshCloudCatalog(true),
      this.campaignService.loadPublic(),
    ]);
  }

  getVehicleByAdId(id: number | string): Vehicle | undefined {
    const searchId = String(id);
    return this._inventory().find((vehicle) => String(vehicle.id) === searchId);
  }

  getConfig() {
    return this._config.asReadonly();
  }

  getAllVehicles() {
    return computed(() => this._inventory().filter((vehicle) => this.isVisibleInStandardCatalog(vehicle)));
  }

  getCars() {
    return computed(() =>
      this._inventory().filter((vehicle) => vehicle.category === "RENTAL" && this.isVisibleInStandardCatalog(vehicle)),
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
      this._inventory().filter((vehicle) => vehicle.category === "SALE" && this.isVisibleInStandardCatalog(vehicle)),
    );
  }

  getSaleCar(id: number | string) {
    return this._inventory().find(
      (vehicle) => vehicle.id == id && vehicle.category === "SALE",
    );
  }

  getTours() {
    return computed(() => this._tours().filter((tour) => this.isVisibleInStandardCatalog(tour)));
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

  getFaqs() {
    return this._faqs.asReadonly();
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

  triggerWebhook(eventName: string, _payload: unknown): void {
    console.info(`External browser webhook disabled for ${eventName}.`);
  }

  private isVisibleInStandardCatalog(vehicle: Vehicle): boolean {
    const id = String(vehicle.cloudId ?? vehicle.id ?? "").trim().toLowerCase();
    if (!id) return true;
    const now = Date.now();
    return !this.campaignService.publicCampaigns().some((campaign) => {
      if (campaign.visibilityMode !== "CAMPAIGN_ONLY" || !campaign.isActive || campaign.publicationStatus !== "PUBLISHED") return false;
      if (campaign.targetType !== (vehicle.category === "TOUR" ? "TOUR" : "VEHICLE")) return false;
      if (String(campaign.targetId || "").trim().toLowerCase() !== id) return false;
      const start = campaign.startsAt ? new Date(campaign.startsAt).getTime() : Number.NEGATIVE_INFINITY;
      const end = campaign.endsAt ? new Date(campaign.endsAt).getTime() : Number.POSITIVE_INFINITY;
      return (!campaign.startsAt || start <= now) && (!campaign.endsAt || end > now);
    });
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
    return { ...DEFAULT_SITE_CONFIG, ...config } as SiteConfig;
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

  private queueConfigRefresh(delay = 140): void {
    if (typeof window === "undefined") {
      void this.refreshSiteConfig(true);
      return;
    }
    if (this.configRefreshTimer !== undefined) window.clearTimeout(this.configRefreshTimer);
    this.configRefreshTimer = window.setTimeout(() => {
      this.configRefreshTimer = undefined;
      void this.refreshSiteConfig(true);
    }, delay);
  }

  private installDevicePreferencePersistence(): void {
    if (typeof localStorage === "undefined") return;
    effect(() => localStorage.setItem("db_favoriteCars", JSON.stringify(this._favoriteCars())));
  }

  private purgeObsoleteBusinessCaches(): void {
    if (typeof localStorage === "undefined") return;
    const obsoleteBusinessCacheKey = /^db_(?:cars|rental_?cars?|sale_?cars?|sales?|vehicles?|tours?|inventory|config|faqs?|blog|subscribers|reservations(?:_v2)?|partnerrequests(?:_v2)?|visits|feedbacks(?:_v2)?|notifications)(?:_|$)/i;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && obsoleteBusinessCacheKey.test(key)) localStorage.removeItem(key);
    }
    sessionStorage.removeItem("session_active");
  }

  private loadDevicePreferences(): void {
    if (typeof localStorage === "undefined") return;
    this.readStorage("db_favoriteCars", (value) => {
      if (Array.isArray(value)) this._favoriteCars.set(value as (number | string)[]);
    });
  }

  private readStorage(key: string, apply: (value: unknown) => void): void {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      apply(JSON.parse(raw));
    } catch (error) {
      console.warn(`Ignoring invalid local preference: ${key}`, error);
      localStorage.removeItem(key);
    }
  }
}
