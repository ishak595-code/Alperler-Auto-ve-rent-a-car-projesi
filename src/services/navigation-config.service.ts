import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PublicContentRealtimeService } from './public-content-realtime.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type NavigationSurface = 'MOBILE_DOCK' | 'MOBILE_MENU';

export interface NavigationSettings {
  mobileDockEnabled: boolean;
  mobileMenuEnabled: boolean;
}

export interface NavigationItem {
  id: string;
  surface: NavigationSurface;
  itemKey: string;
  label: string;
  icon: string;
  route: string;
  sortOrder: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface NavigationPreset {
  key: string;
  label: string;
  icon: string;
  route: string;
}

const DEFAULT_SETTINGS: NavigationSettings = { mobileDockEnabled: true, mobileMenuEnabled: true };
const DEFAULT_DOCK: NavigationItem[] = [
  ['fleet','Kiralık','key','/fleet'],['sales','Satılık','directions_car','/sales'],['search','Ara','search','/search'],['campaigns','Fırsatlar','local_offer','/campaigns'],['appointment','Randevu','event_available','/appointment'],
].map((item,index) => ({ id:`dock-${item[0]}`, surface:'MOBILE_DOCK' as const, itemKey:item[0], label:item[1], icon:item[2], route:item[3], sortOrder:(index+1)*10, isActive:true, metadata:{} }));
const DEFAULT_MENU: NavigationItem[] = [
  ['home','Ana Sayfa','home','/'],['fleet','Kiralık Araçlar','key','/fleet'],['sales','Satılık Araçlar','directions_car','/sales'],['campaigns','Kampanyalar','local_offer','/campaigns'],['appointment','Randevu','event_available','/appointment'],['list-car','Aracını Değerlendir','sell','/list-your-car'],['tours','Turlar','explore','/tours'],['branches','Şubeler','storefront','/branches'],['blog','Blog','article','/blog'],['contact','İletişim','support_agent','/contact'],['about','Hakkımızda','info','/about'],
].map((item,index) => ({ id:`menu-${item[0]}`, surface:'MOBILE_MENU' as const, itemKey:item[0], label:item[1], icon:item[2], route:item[3], sortOrder:(index+1)*10, isActive:true, metadata:{} }));

@Injectable({ providedIn: 'root' })
export class NavigationConfigService {
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _settings = signal<NavigationSettings>({ ...DEFAULT_SETTINGS });
  private readonly _items = signal<NavigationItem[]>([...DEFAULT_DOCK, ...DEFAULT_MENU]);
  private readonly _loading = signal(false);
  private refreshTimer?: number;

  readonly settings = this._settings.asReadonly();
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly mobileDockEnabled = computed(() => this._settings().mobileDockEnabled);
  readonly mobileMenuEnabled = computed(() => this._settings().mobileMenuEnabled);

  readonly presets: NavigationPreset[] = [
    { key:'home', label:'Ana Sayfa', icon:'home', route:'/' },
    { key:'fleet', label:'Kiralık Araçlar', icon:'key', route:'/fleet' },
    { key:'sales', label:'Satılık Araçlar', icon:'directions_car', route:'/sales' },
    { key:'search', label:'Ara', icon:'search', route:'/search' },
    { key:'campaigns', label:'Kampanyalar', icon:'local_offer', route:'/campaigns' },
    { key:'appointment', label:'Randevu', icon:'event_available', route:'/appointment' },
    { key:'list-car', label:'Aracını Değerlendir', icon:'sell', route:'/list-your-car' },
    { key:'tours', label:'Turlar', icon:'explore', route:'/tours' },
    { key:'branches', label:'Şubeler', icon:'storefront', route:'/branches' },
    { key:'branch-partner', label:'Bayilik Başvurusu', icon:'add_business', route:'/branch-partner' },
    { key:'blog', label:'Blog', icon:'article', route:'/blog' },
    { key:'contact', label:'İletişim', icon:'support_agent', route:'/contact' },
    { key:'about', label:'Hakkımızda', icon:'info', route:'/about' },
    { key:'faq', label:'Sık Sorulan Sorular', icon:'help_outline', route:'/faq' },
  ];

  constructor() {
    void this.refreshPublic();
    const unwatch = this.realtime.watch(['navigation_settings','navigation_items'], () => this.queueRefresh());
    this.destroyRef.onDestroy(() => { unwatch(); if (this.refreshTimer !== undefined && typeof window !== 'undefined') window.clearTimeout(this.refreshTimer); });
  }

  itemsFor(surface: NavigationSurface, includeInactive = false): NavigationItem[] {
    return this._items().filter((item) => item.surface === surface && (includeInactive || item.isActive)).sort((a,b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label,'tr'));
  }

  async refreshPublic(): Promise<void> {
    this._loading.set(true);
    try {
      const publicHeaders = { apikey: SUPABASE_PUBLISHABLE_KEY, accept: 'application/json' };
      const [settingsResponse, itemsResponse] = await Promise.all([
        fetch(`${SUPABASE_PROJECT_URL}/rest/v1/navigation_settings?config_key=eq.main&select=*`, { headers:publicHeaders, cache:'no-store' }),
        fetch(`${SUPABASE_PROJECT_URL}/rest/v1/navigation_items?is_active=eq.true&select=*&order=surface.asc,sort_order.asc`, { headers:publicHeaders, cache:'no-store' }),
      ]);
      if (settingsResponse.ok) {
        const rows = await settingsResponse.json() as any[]; const row = rows[0];
        if (row) this._settings.set({ mobileDockEnabled: row.mobile_dock_enabled !== false, mobileMenuEnabled: row.mobile_menu_enabled !== false });
      }
      if (itemsResponse.ok) {
        const rows = await itemsResponse.json() as any[];
        this._items.set(rows.map((row) => this.fromRow(row)));
      }
    } finally { this._loading.set(false); }
  }

  async refreshAdmin(): Promise<void> {
    const token = await this.requiredToken();
    this._loading.set(true);
    try {
      const [settingsRows, itemRows] = await Promise.all([
        this.rest<any[]>('GET','navigation_settings?config_key=eq.main&select=*',undefined,token),
        this.rest<any[]>('GET','navigation_items?select=*&order=surface.asc,sort_order.asc',undefined,token),
      ]);
      const row = settingsRows[0];
      this._settings.set(row ? { mobileDockEnabled: row.mobile_dock_enabled !== false, mobileMenuEnabled: row.mobile_menu_enabled !== false } : { ...DEFAULT_SETTINGS });
      this._items.set(itemRows.map((item) => this.fromRow(item)));
    } finally { this._loading.set(false); }
  }

  async saveSettings(settings: NavigationSettings): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('PATCH','navigation_settings?config_key=eq.main',{ mobile_dock_enabled:settings.mobileDockEnabled, mobile_menu_enabled:settings.mobileMenuEnabled, updated_at:new Date().toISOString() },token);
    await this.refreshAdmin();
  }

  async addPreset(surface: NavigationSurface, preset: NavigationPreset): Promise<void> {
    const token = await this.requiredToken();
    const existing = this.itemsFor(surface,true);
    const duplicate = existing.find((item) => item.itemKey === preset.key);
    if (duplicate) {
      duplicate.isActive = true; duplicate.label = preset.label; duplicate.icon = preset.icon; duplicate.route = preset.route;
      await this.updateItem(duplicate); return;
    }
    const nextSort = existing.reduce((max,item) => Math.max(max,item.sortOrder),0) + 10;
    await this.rest('POST','navigation_items',{ surface, item_key:preset.key, label:preset.label, icon:preset.icon, route:preset.route, sort_order:nextSort, is_active:true, metadata:{} },token);
    await this.refreshAdmin();
  }

  async addCustom(surface: NavigationSurface, input: { label:string; icon:string; route:string }): Promise<void> {
    const token = await this.requiredToken();
    const label = input.label.trim().slice(0,60); const icon = input.icon.trim().slice(0,60) || 'link'; const route = this.safeRoute(input.route);
    if (!label || !route) throw new Error('Geçerli bir buton adı ve site bağlantısı girin.');
    const key = `custom-${Date.now().toString(36)}`;
    const nextSort = this.itemsFor(surface,true).reduce((max,item) => Math.max(max,item.sortOrder),0) + 10;
    await this.rest('POST','navigation_items',{ surface, item_key:key, label, icon, route, sort_order:nextSort, is_active:true, metadata:{ custom:true } },token);
    await this.refreshAdmin();
  }

  async updateItem(item: NavigationItem): Promise<void> {
    const token = await this.requiredToken();
    const route = this.safeRoute(item.route); if (!route) throw new Error('Geçerli bir site bağlantısı girin.');
    await this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(item.id)}`,{ label:item.label.trim().slice(0,60), icon:item.icon.trim().slice(0,60) || 'link', route, sort_order:item.sortOrder, is_active:item.isActive, metadata:item.metadata || {}, updated_at:new Date().toISOString() },token);
    await this.refreshAdmin();
  }

  async deleteItem(id: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest('DELETE',`navigation_items?id=eq.${encodeURIComponent(id)}`,undefined,token);
    await this.refreshAdmin();
  }

  async reorder(surface: NavigationSurface, orderedIds: string[]): Promise<void> {
    const token = await this.requiredToken();
    const allowed = new Set(this.itemsFor(surface,true).map((item) => item.id));
    const ids = orderedIds.filter((id) => allowed.has(id));
    await Promise.all(ids.map((id,index) => this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(id)}`,{ sort_order:(index+1)*10, updated_at:new Date().toISOString() },token)));
    await this.refreshAdmin();
  }

  private queueRefresh(): void {
    if (typeof window === 'undefined') { void this.refreshPublic(); return; }
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => { this.refreshTimer = undefined; void this.refreshPublic(); },120);
  }

  private fromRow(row: any): NavigationItem {
    return { id:String(row.id || ''), surface:row.surface as NavigationSurface, itemKey:String(row.item_key || ''), label:String(row.label || ''), icon:String(row.icon || 'link'), route:String(row.route || '/'), sortOrder:Number(row.sort_order || 0), isActive:row.is_active !== false, metadata:row.metadata && typeof row.metadata === 'object' ? row.metadata : {} };
  }

  private safeRoute(value: string): string {
    const route = String(value || '').trim(); return /^\/[A-Za-z0-9_./?#=&%-]*$/.test(route) ? route : '';
  }

  private async requiredToken(): Promise<string> { const token = await this.auth.getAccessToken(); if (!token) throw new Error('ADMIN_SESSION_REQUIRED'); return token; }

  private async rest<T=unknown>(method:'GET'|'POST'|'PATCH'|'DELETE', path:string, body:unknown, token:string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, { method, headers:{ apikey:SUPABASE_PUBLISHABLE_KEY, authorization:`Bearer ${token}`, ...(method==='GET'?{}:{'content-type':'application/json'}), ...(method==='POST'?{Prefer:'return=minimal'}:{}) }, body:method==='GET'||method==='DELETE'?undefined:JSON.stringify(body), cache:'no-store' });
    if (!response.ok) { const payload = await response.json().catch(() => ({})) as { message?:string; code?:string }; throw new Error(payload.message || payload.code || `NAVIGATION_${response.status}`); }
    if (response.status === 204) return undefined as T; const text = await response.text(); return (text ? JSON.parse(text) : undefined) as T;
  }
}
