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

  readonly sections = this._sections.asReadonly();
  readonly placements = this._placements.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
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
        const sections = sectionRows
          .map((row) => this.section(row))
          .filter((section) => section.sectionKey && section.isEnabled)
          .sort((left, right) => left.sortOrder - right.sortOrder);

        const vehicleMap: Record<string, Vehicle[]> = {};
        const tourMap: Record<string, TourCardV217[]> = {};
        const blogMap: Record<string, BlogCardV217[]> = {};
        const campaignMap: Record<string, CampaignRecord[]> = {};
        const branchMap: Record<string, BranchCardV217[]> = {};
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
              vehicleMap[section.sectionKey] = [];
              tourMap[section.sectionKey] = [];
              blogMap[section.sectionKey] = [];
              campaignMap[section.sectionKey] = [];
              branchMap[section.sectionKey] = [];
            }
          }),
        );

        const validPlacements = rawPlacements.filter((placement) => validPlacementIds.has(placement.id));
        const visibleSections = sections.filter((section) => {
          const renderer = this.renderer(section);
          if (renderer === 'PARTNER' || renderer === 'PROMO') return true;
          if (renderer === 'BRANCHES') return (branchMap[section.sectionKey] || []).length > 0;
          if (section.sectionType === 'VEHICLES') return (vehicleMap[section.sectionKey] || []).length > 0;
          if (section.sectionType === 'TOURS') return (tourMap[section.sectionKey] || []).length > 0;
          if (section.sectionType === 'BLOG') return (blogMap[section.sectionKey] || []).length > 0;
          if (section.sectionType === 'CAMPAIGN') return (campaignMap[section.sectionKey] || []).length > 0;
          return false;
        });

        this._vehicles.set(vehicleMap);
        this._tours.set(tourMap);
        this._blogs.set(blogMap);
        this._campaigns.set(campaignMap);
        this._branches.set(branchMap);
        this._placements.set(validPlacements);
        this._sections.set(visibleSections);
        this._loaded.set(true);
      } catch (error) {
        this._error.set(error instanceof Error ? error.message : 'HOMEPAGE_LAYOUT_LOAD_FAILED');
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
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`HOMEPAGE_LAYOUT_${response.status}`);
    return await response.json() as T;
  }
}
