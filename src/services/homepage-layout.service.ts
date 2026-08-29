import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CampaignService } from './campaign.service';
import { CarService } from './car.service';
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
type SectionDomain = Pick<PublicHomepageSection, 'sectionType' | 'settings'>;

@Injectable({ providedIn: 'root' })
export class HomepageLayoutService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly cars = inject(CarService);
  private readonly campaigns = inject(CampaignService);
  private readonly _sections = signal<PublicHomepageSection[]>([]);
  private readonly _placements = signal<PublicHomepagePlacement[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal('');
  private readonly _clock = signal(Date.now());
  private readonly publicSectionSelect = 'section_key,title,section_type,is_enabled,sort_order,max_items,settings';
  private readonly publicPlacementSelect = 'id,section_key,entity_type,entity_id,label,sort_order,is_active,starts_at,ends_at,metadata';
  private refreshTimer?: number;
  private inFlight?: Promise<void>;
  private realtimeDirtyWhileLoading = false;

  readonly sections = this._sections.asReadonly();
  readonly placements = this._placements.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly realtimeState = this.realtime.state;

  constructor() {
    const unwatch = this.realtime.watch(
      ['homepage_sections', 'homepage_placements'],
      () => this.onRealtimeChange(),
    );
    this.destroyRef.onDestroy(unwatch);

    if (typeof window !== 'undefined') {
      this.destroyRef.onDestroy(() => {
        if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
      });
    }
  }

  load(): Promise<void> {
    if (this.inFlight) return this.inFlight;

    const run = async () => {
      this._loading.set(true);
      this._error.set('');
      try {
        const [sectionRows, placementRows] = await Promise.all([
          this.get<any[]>(`homepage_sections?is_enabled=eq.true&select=${this.publicSectionSelect}&order=sort_order.asc`),
          this.get<any[]>(`homepage_placements?is_active=eq.true&select=${this.publicPlacementSelect}&order=section_key.asc,sort_order.asc`),
        ]);

        await Promise.allSettled([this.cars.ensureVehicleCloudInventory(), this.campaigns.loadPublic()]);

        const sectionDomains = new Map<string, SectionDomain>();
        for (const row of sectionRows) {
          const sectionKey = String(row.section_key || '');
          if (!sectionKey) continue;
          sectionDomains.set(sectionKey, {
            sectionType: row.section_type as PublicHomepageSection['sectionType'],
            settings: row.settings && typeof row.settings === 'object' ? row.settings as Record<string, unknown> : {},
          });
        }

        const placements = placementRows.map((row) => ({
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
        } as PublicHomepagePlacement)).filter((placement) => {
          if (!placement.id || !placement.sectionKey || !placement.entityId || !placement.isActive) return false;
          const domain = sectionDomains.get(placement.sectionKey);
          return Boolean(domain) && this.placementResolves(placement, domain!);
        });

        this._placements.set(placements);
        const now = this._clock();
        const placementCountBySection = new Map<string, number>();
        for (const placement of placements) {
          if (!this.isInsideWindow(placement, now)) continue;
          placementCountBySection.set(placement.sectionKey, (placementCountBySection.get(placement.sectionKey) || 0) + 1);
        }

        const sections = sectionRows.map((row) => {
          const settings = row.settings && typeof row.settings === 'object' ? row.settings as Record<string, unknown> : {};
          const sectionKey = String(row.section_key || '');
          const sectionType = row.section_type as PublicHomepageSection['sectionType'];
          const mode = this.selectionMode(settings);
          const storedLimit = Math.max(1, Math.floor(Number(row.max_items || 6)));
          const manualCount = placementCountBySection.get(sectionKey) || 0;
          const placementDriven = this.supportsPlacements(sectionType) && mode === 'PLACEMENT';
          return {
            sectionKey,
            title: String(row.title || ''),
            sectionType,
            isEnabled: row.is_enabled !== false,
            sortOrder: Number(row.sort_order || 0),
            maxItems: placementDriven ? Math.max(1, manualCount) : storedLimit,
            settings,
            manualCount,
            placementDriven,
          };
        }).filter((row) => {
          if (!row.sectionKey || !row.isEnabled) return false;
          if (row.placementDriven && row.manualCount === 0) return false;
          return true;
        }).map(({ manualCount: _manualCount, placementDriven: _placementDriven, ...row }) => row as PublicHomepageSection);

        this._sections.set(sections);
        this._loaded.set(true);
      } catch (error) {
        this._error.set(error instanceof Error ? error.message : 'HOMEPAGE_LAYOUT_LOAD_FAILED');
        this._loaded.set(true);
      } finally {
        this._loading.set(false);
        this.inFlight = undefined;
        if (this.realtimeDirtyWhileLoading) {
          this.realtimeDirtyWhileLoading = false;
          this.queueRealtimeRefresh(50);
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

  placementsFor(sectionKey: string): PublicHomepagePlacement[] {
    const section = this._sections().find((row) => row.sectionKey === sectionKey);
    const mode = this.selectionMode(section?.settings || {});
    if (mode === 'LATEST') return [];

    const now = this._clock();
    return this._placements()
      .filter((row) => row.sectionKey === sectionKey && row.isActive && this.isInsideWindow(row, now))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  selectionModeFor(sectionKey: string): HomepageSelectionMode {
    const section = this._sections().find((row) => row.sectionKey === sectionKey);
    return this.selectionMode(section?.settings || {});
  }

  private placementResolves(placement: PublicHomepagePlacement, domain: SectionDomain): boolean {
    const target = placement.entityId.trim();
    if (!target || !this.entityTypeMatchesSection(placement.entityType, domain.sectionType)) return false;

    if (placement.entityType === 'VEHICLE') {
      const category = String(domain.settings['category'] || 'RENTAL').toUpperCase();
      const source = category === 'SALE' ? this.cars.getSaleCars()() : this.cars.getCars()();
      return this.matchesKnownSource(source, target, (item) => [item.id, item.cloudId, item.cloudStockCode]);
    }
    if (placement.entityType === 'TOUR') {
      return this.matchesKnownSource(this.cars.getTours()(), target, (item) => [item.id, item.cloudId]);
    }
    if (placement.entityType === 'BLOG') {
      return this.matchesKnownSource(this.cars.getBlogPosts()(), target, (item) => [item.id, item.cloudId, item.cloudSlug]);
    }
    return this.matchesKnownSource(this.campaigns.publicCampaigns(), target, (item) => [item.id, item.slug]);
  }

  private entityTypeMatchesSection(entityType: PublicHomepagePlacement['entityType'], sectionType: PublicHomepageSection['sectionType']): boolean {
    return (sectionType === 'VEHICLES' && entityType === 'VEHICLE')
      || (sectionType === 'TOURS' && entityType === 'TOUR')
      || (sectionType === 'BLOG' && entityType === 'BLOG')
      || (sectionType === 'CAMPAIGN' && entityType === 'CAMPAIGN');
  }

  private matchesKnownSource<T>(source: T[], target: string, keys: (item: T) => unknown[]): boolean {
    if (!source.length) return true;
    return source.some((item) => keys(item).some((key) => String(key ?? '').trim() === target));
  }

  private selectionMode(settings: Record<string, unknown>): HomepageSelectionMode {
    return String(settings['selectionMode'] || 'PLACEMENT').trim().toUpperCase() === 'LATEST' ? 'LATEST' : 'PLACEMENT';
  }

  private supportsPlacements(type: PublicHomepageSection['sectionType']): boolean {
    return type === 'VEHICLES' || type === 'TOURS' || type === 'BLOG' || type === 'CAMPAIGN';
  }

  private onRealtimeChange(): void {
    if (this.inFlight) {
      this.realtimeDirtyWhileLoading = true;
      return;
    }
    this.queueRealtimeRefresh();
  }

  private queueRealtimeRefresh(delay = 140): void {
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

  private isInsideWindow(row: PublicHomepagePlacement, now: number): boolean {
    const startsAt = row.startsAt ? new Date(row.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const endsAt = row.endsAt ? new Date(row.endsAt).getTime() : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(startsAt) && row.startsAt) return false;
    if (!Number.isFinite(endsAt) && row.endsAt) return false;
    return now >= startsAt && now < endsAt;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HOMEPAGE_LAYOUT_${response.status}`);
    return await response.json() as T;
  }
}
