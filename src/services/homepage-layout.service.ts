import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Vehicle } from '../models/car.model';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CampaignRecord } from './campaign.service';
import {
  BlogCardV217,
  BranchCardV217,
  ScalablePublicCatalogV217Service,
  TourCardV217,
} from './scalable-public-catalog-v217.service';
import { PublicContentRealtimeService } from './public-content-realtime.service';
import { publicSwrFetch, readPublicSwr, writePublicSwr, quotaOrPaymentError, turkishQuotaMessage } from './public-json-swr.util';

export interface PublicHomepageSection {
  sectionKey: string;
  title: string;
  sectionType: 'VEHICLES' | 'TOURS' | 'BLOG' | 'CAMPAIGN' | 'CUSTOM';
  isEnabled: boolean;
  sortOrder: number;
  maxItems: number;
  settings: Record<string, unknown>;
}

export interface PublicHomepagePlacement {
  id: string;
  sectionKey: string;
  entityType: 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN';
  entityId: string;
  label?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  metadata: Record<string, unknown>;
}

type HomepageSelectionMode = 'PLACEMENT' | 'LATEST';

/**
 * Built-in vitrin shell (v248): mirrors the seeded homepage_sections keys/order so a first visit during a
 * Supabase quota/API outage still renders stable section headings. Titles/descriptions here are the Turkish
 * marketing defaults; every language resolves its own copy through UiService.publicSectionChrome
 * (homeSection.sections[key] / homeSection.byType[type]). Same sectionKeys as the DB, so when fresh data
 * arrives Angular keeps the same section nodes (track sectionKey) and only swaps copy/items: no flicker.
 */
export const DEFAULT_HOMEPAGE_SECTIONS: readonly PublicHomepageSection[] = Object.freeze([
  { sectionKey: 'campaigns', title: 'Aktif Fırsatlar', sectionType: 'CAMPAIGN', isEnabled: true, sortOrder: 5, maxItems: 3, settings: { selectionMode: 'PLACEMENT', theme: 'graphite', width: 'wide', layout: 'rail', badge: 'Kaçırmadan İncele', viewAllLabel: 'Tüm fırsatlar', description: 'Planınıza ekstra avantaj katacak seçili fırsatlar burada. Süre dolmadan size uyan kampanyayı yakalayın, gerçek fiyat avantajını görün ve tek dokunuşla detayına geçin.' } },
  { sectionKey: 'rental_featured', title: 'Kiralık Araçlar', sectionType: 'VEHICLES', isEnabled: true, sortOrder: 10, maxItems: 5, settings: { selectionMode: 'PLACEMENT', category: 'RENTAL', theme: 'dark', width: 'wide', layout: 'rail', badge: 'Planınıza Uyan Araçlar', viewAllLabel: 'Tüm kiralık araçlar', description: 'Şehir içinde pratik, uzun yolda rahat, özel günlerde şık. Planınıza uyan aracı seçin, tarihlerinizi belirleyin ve Yüksekova’dan yola güvenle çıkın.' } },
  { sectionKey: 'sale_featured', title: 'İkinci El Araçlar', sectionType: 'VEHICLES', isEnabled: true, sortOrder: 20, maxItems: 5, settings: { selectionMode: 'PLACEMENT', category: 'SALE', theme: 'sand', width: 'wide', layout: 'rail', badge: 'İçinize Sinen Aracı Bulun', viewAllLabel: 'Tüm satılık araçlar', description: 'Yeni yol arkadaşınızı rakam kalabalığında kaybolmadan bulun. Öne çıkan ikinci el araçları karşılaştırın, güven veren detayları görün ve içinize sinen araç için görüşmeyi başlatın.' } },
  { sectionKey: 'tour_featured', title: 'Turlar ve Rotalar', sectionType: 'TOURS', isEnabled: true, sortOrder: 30, maxItems: 5, settings: { selectionMode: 'PLACEMENT', theme: 'ocean', width: 'wide', layout: 'rail', badge: 'Hakkâri’yi Yerel Gözle Keşfedin', viewAllLabel: 'Tüm turlar', description: 'Hakkâri’nin hafızasında kalan yollarına yerel gözle çıkın. Cilo’dan yaylalara uzanan rotalarda size uyan deneyimi seçin, tarihinizi belirleyin ve gerisini birlikte planlayalım.' } },
  { sectionKey: 'branches', title: 'Şubeler ve Hizmet Noktaları', sectionType: 'CUSTOM', isEnabled: true, sortOrder: 35, maxItems: 3, settings: { renderer: 'BRANCHES', theme: 'soft', width: 'wide', layout: 'rail', badge: 'Hizmet Ağı', viewAllLabel: 'Tüm noktalar', showPartnerCta: true, partnerRoute: '/branch-partner', description: 'Size en uygun Alperler Rent A Car hizmet noktasını bulun. Her şubenin teslim ve iade imkanlarını, kiralama, satış, tur ve transfer hizmetlerini, çalışma bilgilerini ve iletişim kanallarını inceleyin; ihtiyacınıza göre doğrudan ilgili şubeye ulaşın.' } },
  { sectionKey: 'partner', title: 'Aracını Değerlendir', sectionType: 'CUSTOM', isEnabled: true, sortOrder: 40, maxItems: 1, settings: { renderer: 'PARTNER', theme: 'brand', width: 'wide', layout: 'wide', badge: 'Aracınız İçin Seçenekleri Görün', ctaLabel: 'Aracımı değerlendir', ctaUrl: '/list-your-car', description: 'Aracınızı satmak veya kiralama filosunda değerlendirmek istiyorsanız marka, model, yıl, kilometre ve fiyat beklentinizi birkaç adımda gönderin. İsterseniz fotoğraf, video veya belge ekleyin; ekibimiz aracın durumunu ve talep ettiğiniz modeli inceleyerek uygun sonraki adımı sizinle netleştirsin.' } },
  { sectionKey: 'blog_featured', title: 'Rehber ve İçerikler', sectionType: 'BLOG', isEnabled: true, sortOrder: 50, maxItems: 5, settings: { selectionMode: 'PLACEMENT', theme: 'graphite', width: 'wide', layout: 'rail', badge: 'Rehber & İpuçları', viewAllLabel: 'Tüm yazılar', description: 'Araç seçimi, kiralama süreci, yolculuk planlama, bölgesel rotalar ve güvenli sürüş hakkında karar vermenizi kolaylaştıracak içerikleri okuyun. Her yazının tamamına girerek ayrıntılı rehberi inceleyebilir ve size yararlı olan içeriği paylaşabilirsiniz.' } },
  { sectionKey: 'closing_cta', title: 'Yolculuğunuzu Birlikte Planlayalım', sectionType: 'CUSTOM', isEnabled: true, sortOrder: 60, maxItems: 1, settings: { renderer: 'PROMO', theme: 'dark', width: 'full', layout: 'wide', badge: 'ALPERLER RENT A CAR', ctaLabel: 'Rezervasyon oluştur', ctaUrl: '/appointment', description: 'Hakkari ve Yüksekova’da kiralama, özel gün aracı ve rota planınızı tek noktadan oluşturun. Uygun seçeneği birlikte netleştirip rezervasyonunuzu güvenle başlatın.' } },
] satisfies PublicHomepageSection[]);

type HomepageRenderer = 'BRANCHES' | 'PARTNER' | 'PROMO' | 'DEFAULT';

@Injectable({ providedIn: 'root' })
export class HomepageLayoutService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly catalog = inject(ScalablePublicCatalogV217Service);

  private readonly _sections = signal<PublicHomepageSection[]>([]);
  private readonly _placements = signal<PublicHomepagePlacement[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal('');
  private readonly _sectionErrors = signal<Record<string, string>>({});
  private readonly _usingBuiltInSections = signal(false);
  private readonly _clock = signal(Date.now());
  private readonly _vehicles = signal<Record<string, Vehicle[]>>({});
  private readonly _tours = signal<Record<string, TourCardV217[]>>({});
  private readonly _blogs = signal<Record<string, BlogCardV217[]>>({});
  private readonly _campaigns = signal<Record<string, CampaignRecord[]>>({});
  private readonly _branches = signal<Record<string, BranchCardV217[]>>({});

  private readonly publicSectionSelect = 'section_key,title,section_type,is_enabled,sort_order,max_items,settings';
  private readonly publicPlacementSelect = 'id,section_key,entity_type,entity_id,label,sort_order,is_active,starts_at,ends_at,metadata';
  private refreshTimer?: number;
  private inFlight?: Promise<void>;
  private dirty = false;
  private boundedOwnerProbeStarted = false;

  readonly sections = this._sections.asReadonly();
  readonly placements = this._placements.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly sectionErrors = this._sectionErrors.asReadonly();
  /** True while the vitrin renders the built-in section set (no DB response and no last-good snapshot yet). */
  readonly usingBuiltInSections = this._usingBuiltInSections.asReadonly();
  readonly realtimeState = this.realtime.state;

  constructor() {
    const unwatch = this.realtime.watch(
      ['homepage_sections', 'homepage_placements', 'vehicles', 'tours', 'blog_posts', 'campaigns', 'branches'],
      () => this.onRealtime(),
    );
    this.destroyRef.onDestroy(unwatch);
    this.destroyRef.onDestroy(() => {
      if (this.refreshTimer !== undefined && typeof window !== 'undefined') {
        window.clearTimeout(this.refreshTimer);
      }
    });
    this.restoreSnapshot();
  }

  load(): Promise<void> {
    if (this.inFlight) return this.inFlight;

    const run = async (): Promise<void> => {
      this._loading.set(true);
      this._error.set('');

      try {
        const [sectionRows, placementRows] = await Promise.all([
          this.get<any[]>(`homepage_sections?is_enabled=eq.true&select=${this.publicSectionSelect}&order=sort_order.asc`),
          this.get<any[]>(`homepage_placements?is_active=eq.true&select=${this.publicPlacementSelect}&order=section_key.asc,sort_order.asc`),
        ]);

        const now = this._clock();
        const rawPlacements = placementRows
          .map((row) => this.placement(row))
          .filter((placement) =>
            placement.id &&
            placement.sectionKey &&
            placement.entityId &&
            placement.isActive &&
            this.inside(placement, now),
          );
        // A successful read is authoritative (admin order/visibility wins). Blank admin copy is never
        // rendered as blank: DynamicHomeSectionComponent resolves admin -> i18n built-in defaults.
        const sections = sectionRows
          .map((row) => this.section(row))
          .filter((section) => section.sectionKey && section.isEnabled)
          .sort((left, right) => left.sortOrder - right.sortOrder);

        // A deliberately empty placement-driven homepage still needs one bounded
        // public owner read so the first visit can recover when content is added.
        const hasBoundedOwnerRead = sections.some((section) => {
          if (!['VEHICLES', 'TOURS', 'BLOG', 'CAMPAIGN'].includes(section.sectionType)) return false;
          const mode = this.mode(section.settings);
          return mode === 'LATEST' || this.placementsForSection(rawPlacements, section, mode).length > 0;
        });
        if (!hasBoundedOwnerRead) this.ensureBoundedOwnerRequest();

        const vehicleMap: Record<string, Vehicle[]> = {};
        const tourMap: Record<string, TourCardV217[]> = {};
        const blogMap: Record<string, BlogCardV217[]> = {};
        const campaignMap: Record<string, CampaignRecord[]> = {};
        const branchMap: Record<string, BranchCardV217[]> = {};
        const sectionErrorMap: Record<string, string> = {};
        const validPlacementIds = new Set<string>();

        await Promise.all(
          sections.map(async (section) => {
            const mode = this.mode(section.settings);
            const placements = this.placementsForSection(rawPlacements, section, mode);
            const limit = this.sectionLimit(section, placements, mode);

            try {
              if (this.renderer(section) === 'BRANCHES') {
                branchMap[section.sectionKey] = await this.catalog.listBranches(limit);
                return;
              }

              if (section.sectionType === 'VEHICLES') {
                const category = String(section.settings['category'] || 'RENTAL').toUpperCase() === 'SALE' ? 'SALE' : 'RENTAL';
                let rows: Vehicle[];
                if (mode === 'PLACEMENT') {
                  rows = await this.catalog.vehiclesByIdentifiers(
                    placements.map((placement) => placement.entityId),
                    category,
                  );
                  this.markResolved(
                    placements,
                    rows,
                    (item) => [
                      String(item.id),
                      String(item.cloudId || ''),
                      String(item.cloudStockCode || ''),
                      String(item.cloudSlug || ''),
                    ],
                    validPlacementIds,
                  );
                } else {
                  rows = (await this.catalog.listVehicles({
                    category,
                    page: 0,
                    pageSize: limit,
                    sortBy: 'recommended',
                  })).items;
                }
                vehicleMap[section.sectionKey] = rows.slice(0, limit);
                return;
              }

              if (section.sectionType === 'TOURS') {
                let rows: TourCardV217[];
                if (mode === 'PLACEMENT') {
                  rows = await this.catalog.toursByIdentifiers(placements.map((placement) => placement.entityId));
                  this.markResolved(
                    placements,
                    rows,
                    (item) => [String(item.id), String(item.cloudId || ''), String(item.cloudSlug || '')],
                    validPlacementIds,
                  );
                } else {
                  rows = (await this.catalog.listTours({ page: 0, pageSize: limit, sortBy: 'featured' })).items;
                }
                tourMap[section.sectionKey] = rows.slice(0, limit);
                return;
              }

              if (section.sectionType === 'BLOG') {
                let rows: BlogCardV217[];
                if (mode === 'PLACEMENT') {
                  rows = await this.catalog.blogsByIdentifiers(placements.map((placement) => placement.entityId));
                  this.markResolved(
                    placements,
                    rows,
                    (item) => [item.id, item.cloudId, String(item.cloudSlug || '')],
                    validPlacementIds,
                  );
                } else {
                  rows = (await this.catalog.listBlogs({ page: 0, pageSize: limit })).items;
                }
                blogMap[section.sectionKey] = rows.slice(0, limit);
                return;
              }

              if (section.sectionType === 'CAMPAIGN') {
                let rows: CampaignRecord[];
                if (mode === 'PLACEMENT') {
                  rows = await this.catalog.campaignsByIdentifiers(placements.map((placement) => placement.entityId));
                  this.markResolved(
                    placements,
                    rows,
                    (item) => [item.id, item.slug],
                    validPlacementIds,
                  );
                } else {
                  rows = await this.catalog.latestCampaigns(limit);
                }
                campaignMap[section.sectionKey] = rows.slice(0, limit);
              }
            } catch (error) {
              console.error('Homepage section load failed', section.sectionKey, error);
              const raw = error instanceof Error ? error.message : 'CATALOG_LOAD_FAILED';
              const statusMatch = /(\d{3})/.exec(raw);
              const status = statusMatch ? Number(statusMatch[1]) : 0;
              sectionErrorMap[section.sectionKey] = quotaOrPaymentError(status, raw)
                ? turkishQuotaMessage(section.title || 'Bu bölüm')
                : raw;
              // Keep last-good items for this section when available.
              vehicleMap[section.sectionKey] = this._vehicles()[section.sectionKey] || [];
              tourMap[section.sectionKey] = this._tours()[section.sectionKey] || [];
              blogMap[section.sectionKey] = this._blogs()[section.sectionKey] || [];
              campaignMap[section.sectionKey] = this._campaigns()[section.sectionKey] || [];
              branchMap[section.sectionKey] = this._branches()[section.sectionKey] || [];
            }
          }),
        );

        const validPlacements = rawPlacements.filter((placement) => validPlacementIds.has(placement.id));
        // Keep every enabled section — empty and failed states must render durable chrome (never silent blank).
        const visibleSections = sections;

        this._vehicles.set(vehicleMap);
        this._tours.set(tourMap);
        this._blogs.set(blogMap);
        this._campaigns.set(campaignMap);
        this._branches.set(branchMap);
        this._sectionErrors.set(sectionErrorMap);
        this._placements.set(validPlacements);
        this._sections.set(visibleSections);
        this._error.set('');
        this._loaded.set(true);
        this._usingBuiltInSections.set(false);
        this.persistSnapshot();
      } catch (error) {
        // Keep the runtime ownership contract observable even when the homepage
        // shell itself is temporarily unavailable (for example Supabase 402/503).
        this.ensureBoundedOwnerRequest();
        const message = error instanceof Error ? error.message : 'HOMEPAGE_LAYOUT_LOAD_FAILED';
        const statusMatch = /(?:HOMEPAGE_LAYOUT_|PUBLIC_CATALOG_|HTTP_)?(\d{3})/.exec(message);
        const status = statusMatch ? Number(statusMatch[1]) : 0;
        const friendly = quotaOrPaymentError(status, message)
          ? turkishQuotaMessage('Ana sayfa vitrini')
          : message;
        // Prefer last-good in-memory/local snapshot, then stable built-in sections, over wiping the vitrin.
        if (!this._sections().length) this.restoreSnapshot();
        if (!this._sections().length) {
          this._sections.set(DEFAULT_HOMEPAGE_SECTIONS.map((section) => ({ ...section, settings: { ...section.settings } })));
          this._usingBuiltInSections.set(true);
        }
        if (this._sections().length) {
          // Mark catalog sections as degraded so each block can show retry chrome.
          const degraded: Record<string, string> = { ...this._sectionErrors() };
          for (const section of this._sections()) {
            const renderer = this.renderer(section);
            if (renderer === 'PARTNER' || renderer === 'PROMO') continue;
            degraded[section.sectionKey] = degraded[section.sectionKey] || friendly;
          }
          this._sectionErrors.set(degraded);
          this._error.set(friendly);
        } else {
          this._error.set(friendly);
        }
        this._loaded.set(true);
      } finally {
        this._loading.set(false);
        this.inFlight = undefined;
        if (this.dirty) {
          this.dirty = false;
          this.queue(60);
        }
      }
    };

    this.inFlight = run();
    return this.inFlight;
  }

  async refreshPublicState(): Promise<void> {
    this._clock.set(Date.now());
    await this.load();
  }

  vehiclesFor(key: string): Vehicle[] {
    return this._vehicles()[key] || [];
  }

  toursFor(key: string): TourCardV217[] {
    return this._tours()[key] || [];
  }

  blogsFor(key: string): BlogCardV217[] {
    return this._blogs()[key] || [];
  }

  campaignsFor(key: string): CampaignRecord[] {
    return this._campaigns()[key] || [];
  }

  branchesFor(key: string): BranchCardV217[] {
    return this._branches()[key] || [];
  }

  sectionHasError(key: string): boolean {
    return Boolean(this._sectionErrors()[key]);
  }

  sectionErrorMessage(key: string): string {
    return this._sectionErrors()[key] || '';
  }

  placementsFor(key: string): PublicHomepagePlacement[] {
    return this._placements()
      .filter((placement) => placement.sectionKey === key)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  selectionModeFor(key: string): HomepageSelectionMode {
    const section = this._sections().find((row) => row.sectionKey === key);
    return this.mode(section?.settings || {});
  }

  private section(row: any): PublicHomepageSection {
    return {
      sectionKey: String(row.section_key || ''),
      title: String(row.title || ''),
      sectionType: row.section_type,
      isEnabled: row.is_enabled !== false,
      sortOrder: Number(row.sort_order || 0),
      maxItems: this.limit(Number(row.max_items || 6), 1, 48),
      settings: row.settings && typeof row.settings === 'object' ? row.settings : {},
    };
  }

  private placement(row: any): PublicHomepagePlacement {
    return {
      id: String(row.id || ''),
      sectionKey: String(row.section_key || ''),
      entityType: row.entity_type,
      entityId: String(row.entity_id || ''),
      label: row.label || undefined,
      sortOrder: Number(row.sort_order || 0),
      isActive: row.is_active !== false,
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    };
  }

  private placementsForSection(
    rawPlacements: PublicHomepagePlacement[],
    section: PublicHomepageSection,
    mode: HomepageSelectionMode,
  ): PublicHomepagePlacement[] {
    if (mode === 'LATEST') return [];
    return rawPlacements
      .filter((placement) =>
        placement.sectionKey === section.sectionKey &&
        this.typeMatches(placement.entityType, section.sectionType),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  private sectionLimit(
    section: PublicHomepageSection,
    placements: PublicHomepagePlacement[],
    mode: HomepageSelectionMode,
  ): number {
    const storedLimit = this.limit(section.maxItems, 1, 48);
    const manualCount = placements.length;
    const placementDriven = mode === 'PLACEMENT';
    return placementDriven ? Math.max(1, manualCount) : storedLimit;
  }

  private markResolved<T>(
    placements: PublicHomepagePlacement[],
    rows: T[],
    keys: (item: T) => string[],
    target: Set<string>,
  ): void {
    for (const placement of placements) {
      if (rows.some((row) => keys(row).some((key) => key && key === placement.entityId))) {
        target.add(placement.id);
      }
    }
  }

  private typeMatches(
    entity: PublicHomepagePlacement['entityType'],
    section: PublicHomepageSection['sectionType'],
  ): boolean {
    return (
      (section === 'VEHICLES' && entity === 'VEHICLE') ||
      (section === 'TOURS' && entity === 'TOUR') ||
      (section === 'BLOG' && entity === 'BLOG') ||
      (section === 'CAMPAIGN' && entity === 'CAMPAIGN')
    );
  }

  private renderer(section: PublicHomepageSection): HomepageRenderer {
    const value = String(section.settings['renderer'] || '').toUpperCase();
    if (value === 'BRANCHES' || value === 'PARTNER' || value === 'PROMO') return value;
    if (section.sectionKey === 'branches') return 'BRANCHES';
    if (section.sectionKey === 'partner') return 'PARTNER';
    return section.sectionType === 'CUSTOM' ? 'PROMO' : 'DEFAULT';
  }

  private mode(settings: Record<string, unknown>): HomepageSelectionMode {
    return String(settings['selectionMode'] || 'PLACEMENT').toUpperCase() === 'LATEST' ? 'LATEST' : 'PLACEMENT';
  }

  private inside(row: PublicHomepagePlacement, now: number): boolean {
    const start = row.startsAt ? new Date(row.startsAt).getTime() : -Infinity;
    const end = row.endsAt ? new Date(row.endsAt).getTime() : Infinity;
    if (row.startsAt && !Number.isFinite(start)) return false;
    if (row.endsAt && !Number.isFinite(end)) return false;
    return now >= start && now < end;
  }

  private onRealtime(): void {
    if (this.inFlight) {
      this.dirty = true;
      return;
    }
    this.queue();
  }

  private queue(delay = 160): void {
    if (typeof window === 'undefined') {
      void this.refreshPublicState();
      return;
    }
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = undefined;
      void this.refreshPublicState();
    }, delay);
  }

  private limit(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.floor(value) || min));
  }

  private async get<T>(path: string): Promise<T> {
    const cacheKey = `homepage-shell:${path.split('?')[0]}`;
    const result = await publicSwrFetch<T>({
      key: cacheKey,
      freshMs: 45_000,
      staleMs: 12 * 60 * 60_000,
      isValid: (value) => Array.isArray(value),
      loader: async () => {
        const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error(`HOMEPAGE_LAYOUT_${response.status}`);
        return await response.json() as T;
      },
    });
    return result.value;
  }

  private ensureBoundedOwnerRequest(): void {
    if (this.boundedOwnerProbeStarted) return;
    this.boundedOwnerProbeStarted = true;
    void this.catalog.primeBoundedOwner().catch(() => undefined);
  }

  private persistSnapshot(): void {
    writePublicSwr('homepage-layout:snapshot', {
      sections: this._sections(),
      placements: this._placements(),
      vehicles: this._vehicles(),
      tours: this._tours(),
      blogs: this._blogs(),
      campaigns: this._campaigns(),
      branches: this._branches(),
    });
  }

  private restoreSnapshot(): void {
    const cached = readPublicSwr<{
      sections: PublicHomepageSection[];
      placements: PublicHomepagePlacement[];
      vehicles: Record<string, Vehicle[]>;
      tours: Record<string, TourCardV217[]>;
      blogs: Record<string, BlogCardV217[]>;
      campaigns: Record<string, CampaignRecord[]>;
      branches: Record<string, BranchCardV217[]>;
    }>('homepage-layout:snapshot', 12 * 60 * 60_000);
    if (!cached?.value?.sections?.length) return;
    this._sections.set(cached.value.sections);
    this._placements.set(cached.value.placements || []);
    this._vehicles.set(cached.value.vehicles || {});
    this._tours.set(cached.value.tours || {});
    this._blogs.set(cached.value.blogs || {});
    this._campaigns.set(cached.value.campaigns || {});
    this._branches.set(cached.value.branches || {});
  }
}

