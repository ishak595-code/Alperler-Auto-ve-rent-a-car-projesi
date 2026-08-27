import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
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

@Injectable({ providedIn: 'root' })
export class HomepageLayoutService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly _sections = signal<PublicHomepageSection[]>([]);
  private readonly _placements = signal<PublicHomepagePlacement[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal('');
  private readonly _clock = signal(Date.now());
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
          this.get<any[]>('homepage_sections?is_enabled=eq.true&select=*&order=sort_order.asc'),
          this.get<any[]>('homepage_placements?is_active=eq.true&select=*&order=section_key.asc,sort_order.asc'),
        ]);
        this._sections.set(sectionRows.map((row) => ({
          sectionKey: String(row.section_key || ''),
          title: String(row.title || ''),
          sectionType: row.section_type,
          isEnabled: row.is_enabled !== false,
          sortOrder: Number(row.sort_order || 0),
          maxItems: Math.max(1, Math.floor(Number(row.max_items || 6))),
          settings: row.settings && typeof row.settings === 'object' ? row.settings : {},
        })).filter((row) => row.sectionKey && row.isEnabled));
        this._placements.set(placementRows.map((row) => ({
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
        })).filter((row) => row.id && row.sectionKey && row.entityId && row.isActive));
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
    const now = this._clock();
    return this._placements()
      .filter((row) => row.sectionKey === sectionKey && row.isActive && this.isInsideWindow(row, now))
      .sort((a, b) => a.sortOrder - b.sortOrder);
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
