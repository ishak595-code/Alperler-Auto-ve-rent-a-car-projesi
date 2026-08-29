import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CarService } from './car.service';
import { CustomerAuthService } from './customer-auth.service';

interface FavoriteRow { entity_id: string; }

@Injectable({ providedIn: 'root' })
export class CustomerFavoritesSyncService {
  private readonly auth = inject(CustomerAuthService);
  private readonly cars = inject(CarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storageKey = 'db_favoriteCars';
  private activeUserId = '';
  private lastLocal = new Set<string>();
  private timer?: number;
  private syncing = false;
  private queued = false;

  constructor() {
    const effectRef = effect(() => {
      const userId = String(this.auth.user()?.id || '');
      void this.cars.getFavoriteCount();
      this.queue(userId);
    });
    this.destroyRef.onDestroy(() => effectRef.destroy());

    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent) => {
        if (event.key === this.storageKey) this.queue(String(this.auth.user()?.id || ''));
      };
      window.addEventListener('storage', onStorage);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('storage', onStorage);
        if (this.timer !== undefined) window.clearTimeout(this.timer);
      });
    }
  }

  private queue(userId: string): void {
    if (typeof window === 'undefined') return;
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      void this.sync(userId);
    }, 160);
  }

  private async sync(userId: string): Promise<void> {
    await this.auth.waitUntilReady();
    const currentUserId = String(this.auth.user()?.id || '');
    if (!userId || userId !== currentUserId) {
      this.activeUserId = '';
      this.lastLocal = this.readLocal();
      return;
    }
    if (this.syncing) {
      this.queued = true;
      return;
    }

    this.syncing = true;
    try {
      const token = await this.auth.getAccessToken();
      if (!token) return;
      const local = this.readLocal();

      if (this.activeUserId !== userId) {
        const remote = await this.readRemote(token, userId);
        const merged = new Set<string>([...remote, ...local]);
        const missingRemote = [...local].filter((id) => !remote.has(id));
        if (missingRemote.length) await this.insertRemote(token, userId, missingRemote);
        this.activeUserId = userId;
        this.lastLocal = new Set(merged);
        if (!this.sameSet(local, merged)) this.writeLocal(merged);
        return;
      }

      const added = [...local].filter((id) => !this.lastLocal.has(id));
      const removed = [...this.lastLocal].filter((id) => !local.has(id));
      if (added.length) await this.insertRemote(token, userId, added);
      if (removed.length) await this.deleteRemote(token, userId, removed);
      this.lastLocal = new Set(local);
    } catch (error) {
      console.info('Customer favorites sync deferred.', error);
    } finally {
      this.syncing = false;
      if (this.queued) {
        this.queued = false;
        this.queue(String(this.auth.user()?.id || ''));
      }
    }
  }

  private async readRemote(token: string, userId: string): Promise<Set<string>> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?user_id=eq.${encodeURIComponent(userId)}&entity_type=eq.VEHICLE&select=entity_id&order=created_at.asc`, {
      headers: this.headers(token),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`CUSTOMER_FAVORITES_READ_${response.status}`);
    const rows = await response.json() as FavoriteRow[];
    return new Set(rows.map((row) => this.normalizeId(row.entity_id)).filter(Boolean));
  }

  private async insertRemote(token: string, userId: string, ids: string[]): Promise<void> {
    const payload = ids.map((entityId) => ({ user_id: userId, entity_type: 'VEHICLE', entity_id: entityId }));
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?on_conflict=user_id,entity_type,entity_id`, {
      method: 'POST',
      headers: { ...this.headers(token), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`CUSTOMER_FAVORITES_WRITE_${response.status}`);
  }

  private async deleteRemote(token: string, userId: string, ids: string[]): Promise<void> {
    await Promise.all(ids.map(async (id) => {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_favorites?user_id=eq.${encodeURIComponent(userId)}&entity_type=eq.VEHICLE&entity_id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...this.headers(token), Prefer: 'return=minimal' },
      });
      if (!response.ok) throw new Error(`CUSTOMER_FAVORITES_DELETE_${response.status}`);
    }));
  }

  private readLocal(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set();
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map((value) => this.normalizeId(value)).filter(Boolean));
    } catch {
      return new Set();
    }
  }

  private writeLocal(ids: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    const values = [...ids].map((id) => /^\d+$/.test(id) ? Number(id) : id);
    const serialized = JSON.stringify(values);
    localStorage.setItem(this.storageKey, serialized);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new StorageEvent('storage', { key: this.storageKey, newValue: serialized, storageArea: localStorage }));
      } catch {
        window.dispatchEvent(new Event('storage'));
      }
    }
  }

  private normalizeId(value: unknown): string {
    return String(value ?? '').trim().slice(0, 160);
  }

  private sameSet(left: Set<string>, right: Set<string>): boolean {
    return left.size === right.size && [...left].every((value) => right.has(value));
  }

  private headers(token: string): Record<string, string> {
    return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' };
  }
}
