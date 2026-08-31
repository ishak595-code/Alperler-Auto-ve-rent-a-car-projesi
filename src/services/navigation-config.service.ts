import { DestroyRef, Injectable, Injector, computed, inject, signal } from '@angular/core';
import { PublicContentRealtimeService } from './public-content-realtime.service';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

export type NavigationSurface = 'MOBILE_DOCK' | 'MOBILE_MENU';

export interface NavigationSettings {
  mobileDockEnabled: boolean;
  mobileMenuEnabled: boolean;
  mobileDockAutoHide: boolean;
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
  archivedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface NavigationPreset { key: string; label: string; icon: string; route: string; }

const DEFAULT_SETTINGS: NavigationSettings = { mobileDockEnabled: true, mobileMenuEnabled: true, mobileDockAutoHide: true };

const DEFAULT_DOCK: NavigationItem[] = [
  ['fleet', 'Kiralık', 'key', '/fleet'],
  ['sales', 'Satılık', 'directions_car', '/sales'],
  ['search', 'Ara', 'search', '/search'],
  ['campaigns', 'Fırsatlar', 'local_offer', '/campaigns'],
  ['appointment', 'Randevu', 'event_available', '/appointment'],
].map((item, index) => ({ id:`dock-${item[0]}`, surface:'MOBILE_DOCK' as const, itemKey:item[0], label:item[1], icon:item[2], route:item[3], sortOrder:(index+1)*10, isActive:true, archivedAt:null, metadata:{} }));

const DEFAULT_MENU: NavigationItem[] = [
  ['home', 'Ana Sayfa', 'home', '/'],
  ['fleet', 'Kiralık Araçlar', 'key', '/fleet'],
  ['sales', 'Satılık Araçlar', 'directions_car', '/sales'],
  ['campaigns', 'Kampanyalar', 'local_offer', '/campaigns'],
  ['appointment', 'Randevu', 'event_available', '/appointment'],
  ['list-car', 'Aracını Değerlendir', 'sell', '/list-your-car'],
  ['tours', 'Turlar', 'explore', '/tours'],
  ['branches', 'Şubeler', 'storefront', '/branches'],
  ['blog', 'Blog', 'article', '/blog'],
  ['contact', 'İletişim', 'support_agent', '/contact'],
  ['about', 'Hakkımızda', 'info', '/about'],
].map((item, index) => ({ id:`menu-${item[0]}`, surface:'MOBILE_MENU' as const, itemKey:item[0], label:item[1], icon:item[2], route:item[3], sortOrder:(index+1)*10, isActive:true, archivedAt:null, metadata:{} }));

const NAVIGABLE_ROUTE_ROOTS = new Set([
  '', 'fleet', 'sales', 'search', 'campaigns', 'appointment', 'account', 'list-your-car',
  'tours', 'tour', 'branches', 'branch-partner', 'blog', 'contact', 'about',
  'faq', 'legal', 'track-car',
]);

@Injectable({ providedIn: 'root' })
export class NavigationConfigService {
  private readonly injector = inject(Injector);
  private readonly realtime = inject(PublicContentRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly settingsSelect = 'config_key,mobile_dock_enabled,mobile_menu_enabled,mobile_dock_auto_hide';
  private readonly itemSelect = 'id,surface,item_key,label,icon,route,sort_order,is_active,archived_at,metadata';
  private readonly _settings = signal<NavigationSettings>({ ...DEFAULT_SETTINGS });
  private readonly _items = signal<NavigationItem[]>([...DEFAULT_DOCK, ...DEFAULT_MENU]);
  private readonly _loading = signal(false);
  private readonly _mobileDockAutoHidden = signal(false);
  private readonly _mobileDockRouteHidden = signal(false);
  private refreshTimer?: number;
  private adminViewActive = false;

  readonly settings = this._settings.asReadonly();
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly mobileDockEnabled = computed(() => this._settings().mobileDockEnabled);
  readonly mobileMenuEnabled = computed(() => this._settings().mobileMenuEnabled);
  readonly mobileDockAutoHideEnabled = computed(() => this._settings().mobileDockAutoHide);
  readonly mobileDockAutoHidden = this._mobileDockAutoHidden.asReadonly();
  readonly mobileDockRendered = computed(() => this._settings().mobileDockEnabled && !this._mobileDockRouteHidden() && !(this._settings().mobileDockAutoHide && this._mobileDockAutoHidden()));

  readonly presets: NavigationPreset[] = [
    { key:'home', label:'Ana Sayfa', icon:'home', route:'/' },
    { key:'fleet', label:'Kiralık Araçlar', icon:'key', route:'/fleet' },
    { key:'sales', label:'Satılık Araçlar', icon:'directions_car', route:'/sales' },
    { key:'search', label:'Ara', icon:'search', route:'/search' },
    { key:'campaigns', label:'Kampanyalar', icon:'local_offer', route:'/campaigns' },
    { key:'account', label:'Profil', icon:'account_circle', route:'/account' },
    { key:'appointment', label:'Randevu', icon:'event_available', route:'/appointment' },
    { key:'list-car', label:'Aracını Değerlendir', icon:'sell', route:'/list-your-car' },
    { key:'tours', label:'Turlar', icon:'explore', route:'/tours' },
    { key:'branches', label:'Şubeler', icon:'storefront', route:'/branches' },
    { key:'branch-partner', label:'Bayilik Başvurusu', icon:'add_business', route:'/branch-partner' },
    { key:'blog', label:'Blog', icon:'article', route:'/blog' },
    { key:'contact', label:'İletişim', icon:'support_agent', route:'/contact' },
    { key:'about', label:'Hakkımızda', icon:'info', route:'/about' },
    { key:'faq', label:'Sık Sorulan Sorular', icon:'help_outline', route:'/faq' },
    { key:'legal', label:'Yasal Bilgilendirmeler', icon:'gavel', route:'/legal' },
  ];

  constructor() {
    void this.refreshPublic();
    const unwatch = this.realtime.watch(['navigation_settings','navigation_items'], () => this.queueRefresh());
    this.destroyRef.onDestroy(() => { unwatch(); if (this.refreshTimer !== undefined && typeof window !== 'undefined') window.clearTimeout(this.refreshTimer); });
  }

  itemsFor(surface: NavigationSurface, includeInactive = false): NavigationItem[] {
    return this._items().filter((item) => item.surface === surface && !item.archivedAt && (includeInactive || item.isActive)).sort((a,b) => a.sortOrder-b.sortOrder || a.label.localeCompare(b.label,'tr'));
  }
  archivedItemsFor(surface: NavigationSurface): NavigationItem[] { return this._items().filter((item)=>item.surface===surface&&Boolean(item.archivedAt)).sort((a,b)=>(b.archivedAt||'').localeCompare(a.archivedAt||'')); }
  setMobileDockAutoHidden(hidden:boolean):void{ this._mobileDockAutoHidden.set(this._settings().mobileDockAutoHide ? hidden : false); }
  setMobileDockRouteHidden(hidden:boolean):void{ this._mobileDockRouteHidden.set(hidden); if(hidden)this._mobileDockAutoHidden.set(false); }

  async refreshPublic(): Promise<void> {
    this._loading.set(true);
    try {
      const publicHeaders={apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'};
      const [settingsResponse,itemsResponse]=await Promise.all([
        fetch(`${SUPABASE_PROJECT_URL}/rest/v1/navigation_settings?config_key=eq.main&select=${this.settingsSelect}`,{headers:publicHeaders,cache:'no-store'}),
        fetch(`${SUPABASE_PROJECT_URL}/rest/v1/navigation_items?is_active=eq.true&archived_at=is.null&select=${this.itemSelect}&order=surface.asc,sort_order.asc`,{headers:publicHeaders,cache:'no-store'}),
      ]);
      if(settingsResponse.ok){const rows=await settingsResponse.json() as any[];if(rows[0])this.applySettingsRow(rows[0]);}
      if(itemsResponse.ok){const rows=await itemsResponse.json() as any[];this._items.set(rows.map((row)=>this.fromRow(row)));}
    } finally { this._loading.set(false); }
  }

  async refreshAdmin(): Promise<void> {
    const token=await this.requiredToken();this.adminViewActive=true;this._loading.set(true);
    try{
      const [settingsRows,itemRows]=await Promise.all([
        this.rest<any[]>('GET',`navigation_settings?config_key=eq.main&select=${this.settingsSelect}`,undefined,token),
        this.rest<any[]>('GET',`navigation_items?select=${this.itemSelect}&order=surface.asc,sort_order.asc`,undefined,token),
      ]);
      if(settingsRows[0])this.applySettingsRow(settingsRows[0]);else this._settings.set({...DEFAULT_SETTINGS});
      this._items.set(itemRows.map((item)=>this.fromRow(item)));
    }finally{this._loading.set(false);}
  }

  async saveSettings(settings:NavigationSettings):Promise<void>{
    const token=await this.requiredToken();
    await this.rest('PATCH','navigation_settings?config_key=eq.main',{mobile_dock_enabled:settings.mobileDockEnabled,mobile_menu_enabled:settings.mobileMenuEnabled,mobile_dock_auto_hide:settings.mobileDockAutoHide,updated_at:new Date().toISOString()},token);
    if(!settings.mobileDockAutoHide)this._mobileDockAutoHidden.set(false);await this.refreshAdmin();
  }

  async addPreset(surface:NavigationSurface,preset:NavigationPreset):Promise<void>{
    const token=await this.requiredToken();const route=this.safeRoute(preset.route);if(!route)throw new Error('Bu hazır butonun bağlantısı uygulamadaki bir sayfayla eşleşmiyor.');
    const existing=this._items().filter((item)=>item.surface===surface);const duplicate=existing.find((item)=>item.itemKey===preset.key);const nextSort=this.itemsFor(surface,true).reduce((max,item)=>Math.max(max,item.sortOrder),0)+10;
    if(duplicate){await this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(duplicate.id)}`,{label:preset.label,icon:preset.icon,route,sort_order:duplicate.archivedAt?nextSort:duplicate.sortOrder,is_active:true,archived_at:null,updated_at:new Date().toISOString()},token);await this.refreshAdmin();return;}
    await this.rest('POST','navigation_items',{surface,item_key:preset.key,label:preset.label,icon:preset.icon,route,sort_order:nextSort,is_active:true,archived_at:null,metadata:{}},token);await this.refreshAdmin();
  }

  async addCustom(surface:NavigationSurface,input:{label:string;icon:string;route:string}):Promise<void>{
    const token=await this.requiredToken();const label=input.label.trim().slice(0,60);const icon=input.icon.trim().slice(0,60)||'link';const route=this.safeRoute(input.route);if(!label||!route)throw new Error('Geçerli bir buton adı ve çalışan site içi bağlantı girin.');
    const key=`custom-${Date.now().toString(36)}`;const nextSort=this.itemsFor(surface,true).reduce((max,item)=>Math.max(max,item.sortOrder),0)+10;
    await this.rest('POST','navigation_items',{surface,item_key:key,label,icon,route,sort_order:nextSort,is_active:true,archived_at:null,metadata:{custom:true}},token);await this.refreshAdmin();
  }

  async updateItem(item:NavigationItem):Promise<void>{
    if(item.archivedAt)throw new Error('Kaldırılmış bir butonu düzenlemeden önce geri yükleyin.');const token=await this.requiredToken();const route=this.safeRoute(item.route);if(!route)throw new Error('Bu bağlantı uygulamadaki geçerli bir müşteri sayfasına gitmiyor.');
    await this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(item.id)}`,{label:item.label.trim().slice(0,60),icon:item.icon.trim().slice(0,60)||'link',route,sort_order:item.sortOrder,is_active:item.isActive,metadata:item.metadata||{},updated_at:new Date().toISOString()},token);await this.refreshAdmin();
  }

  async archiveItem(id:string):Promise<void>{const token=await this.requiredToken();await this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(id)}`,{is_active:false,archived_at:new Date().toISOString(),updated_at:new Date().toISOString()},token);await this.refreshAdmin();}
  async restoreItem(id:string):Promise<void>{const item=this._items().find((candidate)=>candidate.id===id&&candidate.archivedAt);if(!item)throw new Error('Geri yüklenecek buton bulunamadı.');const route=this.safeRoute(item.route);if(!route)throw new Error('Bu butonun eski bağlantısı artık geçerli değil. Önce aynı butonu hazır seçeneklerden yeniden ekleyin.');const token=await this.requiredToken();const nextSort=this.itemsFor(item.surface,true).reduce((max,candidate)=>Math.max(max,candidate.sortOrder),0)+10;await this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(id)}`,{is_active:true,archived_at:null,sort_order:nextSort,updated_at:new Date().toISOString()},token);await this.refreshAdmin();}
  async reorder(surface:NavigationSurface,orderedIds:string[]):Promise<void>{const token=await this.requiredToken();const allowed=new Set(this.itemsFor(surface,true).map((item)=>item.id));if(orderedIds.some((id)=>!allowed.has(id)))throw new Error('Sıralama listesinde başka bir menüye ait buton bulundu.');await Promise.all(orderedIds.map((id,index)=>this.rest('PATCH',`navigation_items?id=eq.${encodeURIComponent(id)}`,{sort_order:(index+1)*10,updated_at:new Date().toISOString()},token)));await this.refreshAdmin();}

  private queueRefresh():void{
    if(typeof window==='undefined'){void this.refreshPublic();return;}if(this.refreshTimer!==undefined)window.clearTimeout(this.refreshTimer);
    this.refreshTimer=window.setTimeout(()=>{this.refreshTimer=undefined;if(this.adminViewActive){void this.refreshAdmin().catch(()=>{this.adminViewActive=false;return this.refreshPublic();});}else void this.refreshPublic();},120);
  }
  private applySettingsRow(row:any):void{const next:NavigationSettings={mobileDockEnabled:row.mobile_dock_enabled!==false,mobileMenuEnabled:row.mobile_menu_enabled!==false,mobileDockAutoHide:row.mobile_dock_auto_hide!==false};this._settings.set(next);if(!next.mobileDockAutoHide)this._mobileDockAutoHidden.set(false);}
  private fromRow(row:any):NavigationItem{return{id:String(row.id||''),surface:row.surface as NavigationSurface,itemKey:String(row.item_key||''),label:String(row.label||''),icon:String(row.icon||'link'),route:String(row.route||'/'),sortOrder:Number(row.sort_order||0),isActive:row.is_active!==false,archivedAt:row.archived_at?String(row.archived_at):null,metadata:row.metadata&&typeof row.metadata==='object'?row.metadata:{}};}
  private safeRoute(value:string):string{const route=String(value||'').trim();if(!/^\/[A-Za-z0-9_./?#=&%-]*$/.test(route))return'';const path=route.split('?')[0].split('#')[0];const root=path.split('/').filter(Boolean)[0]||'';return NAVIGABLE_ROUTE_ROOTS.has(root)?route:'';}
  private async requiredToken():Promise<string>{const {AuthService}=await import('./auth.service');const auth=this.injector.get(AuthService);const token=await auth.getAccessToken();if(!token)throw new Error('ADMIN_SESSION_REQUIRED');return token;}
  private async rest<T=unknown>(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body:unknown,token:string):Promise<T>{
    const response=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`,{method,headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,...(method==='GET'?{}:{'content-type':'application/json'}),...(method==='POST'?{Prefer:'return=minimal'}:{})},body:method==='GET'||method==='DELETE'?undefined:JSON.stringify(body),cache:'no-store'});
    if(!response.ok){const payload=await response.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(payload.message||payload.code||`NAVIGATION_${response.status}`);}if(response.status===204)return undefined as T;const text=await response.text();return(text?JSON.parse(text):undefined) as T;
  }
}
