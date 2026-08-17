import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type HomepageSectionType = 'VEHICLES' | 'TOURS' | 'BLOG' | 'CAMPAIGN' | 'CUSTOM';
export type HomepageEntityType = 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN';

export interface HomepageSectionSettings {
  category?: 'RENTAL' | 'SALE';
  renderer?: 'BRANCHES' | 'PARTNER' | 'PROMO';
  badge?: string;
  description?: string;
  backgroundImage?: string;
  coverImage?: string;
  backgroundColor?: string;
  theme?: 'light' | 'soft' | 'dark' | 'brand';
  layout?: 'rail' | 'grid' | 'wide';
  width?: 'standard' | 'wide' | 'full';
  viewAllLabel?: string;
  viewAllUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  [key: string]: unknown;
}

export interface HomepageSectionRecord {
  sectionKey: string;
  title: string;
  sectionType: HomepageSectionType;
  isEnabled: boolean;
  sortOrder: number;
  maxItems: number;
  settings: HomepageSectionSettings;
}

export interface HomepagePlacementRecord {
  id: string;
  sectionKey: string;
  entityType: HomepageEntityType;
  entityId: string;
  label?: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  metadata: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class HomepageAdminService {
  private readonly auth = inject(AuthService);
  private readonly _sections = signal<HomepageSectionRecord[]>([]);
  private readonly _placements = signal<HomepagePlacementRecord[]>([]);
  private readonly _loading = signal(false);

  readonly sections = this._sections.asReadonly();
  readonly placements = this._placements.asReadonly();
  readonly loading = this._loading.asReadonly();

  async refresh(): Promise<void> {
    this._loading.set(true);
    try {
      const token = await this.requiredToken();
      const [sections, placements] = await Promise.all([
        this.rest<any[]>('GET', 'homepage_sections?select=*&order=sort_order.asc', undefined, token),
        this.rest<any[]>('GET', 'homepage_placements?select=*&order=section_key.asc,sort_order.asc', undefined, token),
      ]);
      this._sections.set(sections.map((row) => this.sectionFromRow(row)));
      this._placements.set(placements.map((row) => this.placementFromRow(row)));
    } finally {
      this._loading.set(false);
    }
  }

  async createSection(input: {
    title: string;
    sectionType: HomepageSectionType;
    maxItems?: number;
    settings?: HomepageSectionSettings;
  }): Promise<HomepageSectionRecord> {
    const token = await this.requiredToken();
    const sectionKey = this.createSectionKey(input.title);
    const nextSort = this._sections().reduce((max, item) => Math.max(max, item.sortOrder), 0) + 10;
    const body = {
      section_key: sectionKey,
      title: input.title.trim(),
      section_type: input.sectionType,
      is_enabled: true,
      sort_order: nextSort,
      max_items: this.normalizeMaxItems(input.maxItems ?? 4),
      settings: input.settings || {},
      updated_at: new Date().toISOString(),
    };
    const rows = await this.rest<any[]>('POST', 'homepage_sections?select=*', body, token, 'return=representation');
    const created = this.sectionFromRow(rows[0]);
    await this.refresh();
    return created;
  }

  async updateSection(section: HomepageSectionRecord): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('PATCH', `homepage_sections?section_key=eq.${encodeURIComponent(section.sectionKey)}`, {
      title: section.title.trim(),
      is_enabled: section.isEnabled,
      sort_order: section.sortOrder,
      max_items: this.normalizeMaxItems(section.maxItems),
      settings: section.settings || {},
      updated_at: new Date().toISOString(),
    }, token);
    await this.refresh();
  }

  async deleteSection(sectionKey: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('DELETE', `homepage_sections?section_key=eq.${encodeURIComponent(sectionKey)}`, undefined, token);
    await this.refresh();
  }

  async reorderSections(orderedKeys: string[]): Promise<void> {
    const token = await this.requiredToken();
    await Promise.all(orderedKeys.map((key, index) => this.rest(
      'PATCH',
      `homepage_sections?section_key=eq.${encodeURIComponent(key)}`,
      { sort_order: (index + 1) * 10, updated_at: new Date().toISOString() },
      token,
    )));
    await this.refresh();
  }

  async addPlacement(input: Omit<HomepagePlacementRecord, 'id'>): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('POST', 'homepage_placements?on_conflict=section_key,entity_type,entity_id', {
      section_key: input.sectionKey,
      entity_type: input.entityType,
      entity_id: input.entityId,
      label: input.label || null,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      starts_at: input.startsAt || null,
      ends_at: input.endsAt || null,
      metadata: input.metadata || {},
    }, token, 'resolution=merge-duplicates');
    await this.refresh();
  }

  async updatePlacement(placement: HomepagePlacementRecord): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('PATCH', `homepage_placements?id=eq.${encodeURIComponent(placement.id)}`, {
      label: placement.label || null,
      sort_order: placement.sortOrder,
      is_active: placement.isActive,
      starts_at: placement.startsAt || null,
      ends_at: placement.endsAt || null,
      metadata: placement.metadata || {},
      updated_at: new Date().toISOString(),
    }, token);
    await this.refresh();
  }

  async removePlacement(id: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('DELETE', `homepage_placements?id=eq.${encodeURIComponent(id)}`, undefined, token);
    await this.refresh();
  }

  async reorderPlacements(orderedIds: string[]): Promise<void> {
    const token = await this.requiredToken();
    await Promise.all(orderedIds.map((id, index) => this.rest(
      'PATCH',
      `homepage_placements?id=eq.${encodeURIComponent(id)}`,
      { sort_order: index + 1, updated_at: new Date().toISOString() },
      token,
    )));
    await this.refresh();
  }

  private sectionFromRow(row: any): HomepageSectionRecord {
    return {
      sectionKey: String(row.section_key || ''),
      title: String(row.title || ''),
      sectionType: row.section_type as HomepageSectionType,
      isEnabled: row.is_enabled !== false,
      sortOrder: Number(row.sort_order || 0),
      maxItems: this.normalizeMaxItems(Number(row.max_items || 4)),
      settings: row.settings && typeof row.settings === 'object' ? row.settings : {},
    };
  }

  private placementFromRow(row: any): HomepagePlacementRecord {
    return {
      id: String(row.id || ''),
      sectionKey: String(row.section_key || ''),
      entityType: row.entity_type as HomepageEntityType,
      entityId: String(row.entity_id || ''),
      label: row.label || undefined,
      sortOrder: Number(row.sort_order || 0),
      isActive: row.is_active !== false,
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    };
  }

  private createSectionKey(title: string): string {
    const base = title
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'bolum';
    return `${base}_${Date.now().toString(36)}`;
  }

  private normalizeMaxItems(value: number): number {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric >= 1 ? numeric : 1;
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return token;
  }

  private async rest<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    token: string,
    prefer?: string,
  ): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: method === 'GET' || method === 'DELETE' ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string };
      throw new Error(payload.message || payload.code || `HOMEPAGE_ADMIN_${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
