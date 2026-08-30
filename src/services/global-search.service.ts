import { Injectable } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type GlobalSearchKind = 'RENTAL' | 'SALE' | 'TOUR' | 'CAMPAIGN' | 'BLOG' | 'BRANCH' | 'FAQ' | 'SECTION' | 'PAGE';

export interface GlobalSearchResult {
  key: string;
  kind: GlobalSearchKind;
  title: string;
  summary: string;
  meta?: string;
  image?: string;
  route: string;
  score: number;
}

export interface GlobalSearchPage {
  items: GlobalSearchResult[];
  hasMore: boolean;
  nextOffset: number;
}

type SearchRow = {
  result_key?: unknown;
  kind?: unknown;
  title?: unknown;
  summary?: unknown;
  meta?: unknown;
  image?: unknown;
  route?: unknown;
  score?: unknown;
};

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly pageSizeDefault = 40;

  /** Compatibility no-op. V217 never preloads the catalog for search. */
  async refresh(): Promise<void> { return; }

  async searchPage(
    rawQuery: string,
    kinds?: ReadonlySet<GlobalSearchKind>,
    limit = this.pageSizeDefault,
    offset = 0,
    signal?: AbortSignal,
  ): Promise<GlobalSearchPage> {
    const query = String(rawQuery || '').trim().slice(0, 120);
    if (this.normalize(query).length < 2) return { items: [], hasMore: false, nextOffset: 0 };

    const pageSize = Math.max(1, Math.min(80, Math.floor(limit) || this.pageSizeDefault));
    const requestSize = pageSize + 1;
    const body = {
      p_query: query,
      p_kinds: kinds?.size ? [...kinds] : null,
      p_limit: requestSize,
      p_offset: Math.max(0, Math.floor(offset) || 0),
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/public_global_search_v217`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: signal || AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`GLOBAL_SEARCH_V217_${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload as SearchRow[] : [];
    const hasMore = rows.length > pageSize;
    const items = rows.slice(0, pageSize).map((row) => this.mapRow(row)).filter((item): item is GlobalSearchResult => Boolean(item));
    return { items, hasMore, nextOffset: Math.max(0, offset) + items.length };
  }

  private mapRow(row: SearchRow): GlobalSearchResult | null {
    const kind = String(row.kind || '').toUpperCase() as GlobalSearchKind;
    if (!['RENTAL','SALE','TOUR','CAMPAIGN','BLOG','BRANCH','FAQ','SECTION','PAGE'].includes(kind)) return null;
    const key = String(row.result_key || '').trim();
    const title = String(row.title || '').trim();
    const route = this.safeInternalRoute(String(row.route || ''));
    if (!key || !title || !route) return null;
    return {
      key,
      kind,
      title,
      summary: String(row.summary || '').trim(),
      meta: String(row.meta || '').trim() || undefined,
      image: String(row.image || '').trim() || undefined,
      route,
      score: Number.isFinite(Number(row.score)) ? Number(row.score) : 0,
    };
  }

  private safeInternalRoute(value: string): string {
    const route = value.trim();
    return /^\/[A-Za-z0-9_./?#=&%-]*$/.test(route)
      && !route.startsWith('//')
      && !route.startsWith('/admin')
      && !route.startsWith('/branch-portal') ? route : '';
  }

  private normalize(value: unknown): string {
    return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();
  }
}
