import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GlobalSearchKind, GlobalSearchResult, GlobalSearchService } from '../services/global-search.service';

type SearchFilter = 'ALL' | 'VEHICLES' | 'TRAVEL' | 'CONTENT' | 'SERVICES';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="search-page">
      <header class="search-head">
        <div class="search-shell">
          <div class="title-row">
            <button type="button" class="back" (click)="goBack()" aria-label="Aramadan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
            <div><p>ALPERLER ARAMA</p><h1>Ne arıyorsunuz?</h1></div>
          </div>
          <label class="search-box" for="global-search-input">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input id="global-search-input" type="search" inputmode="search" autocomplete="off" [ngModel]="query()" (ngModelChange)="setQuery($event)" placeholder="Marka, model, araç no, tur, kampanya, blog veya hizmet ara" aria-describedby="search-status" />
            @if (query().trim()) {<button type="button" (click)="clearQuery($event)" aria-label="Aramayı temizle"><mat-icon aria-hidden="true">close</mat-icon></button>}
          </label>
          <div class="filters" role="group" aria-label="Arama sonucu türü">
            @for (option of filters; track option.id) {
              <button type="button" (click)="setFilter(option.id)" [attr.aria-pressed]="filter() === option.id" [class.active]="filter() === option.id">{{ option.label }}</button>
            }
          </div>
        </div>
      </header>

      <section class="results" aria-labelledby="search-results-title">
        <div class="result-head"><div><h2 id="search-results-title">Sonuçlar</h2><p id="search-status" role="status" aria-live="polite">{{ statusText() }}</p></div>@if (results().length) {<strong>{{ results().length }}{{ hasMore() ? '+' : '' }}</strong>}</div>
        @if (loading()) {
          <div class="state" role="status"><mat-icon aria-hidden="true">sync</mat-icon><strong>Güncel sonuçlar aranıyor</strong></div>
        } @else if (query().trim().length < 2) {
          <div class="state intro"><mat-icon aria-hidden="true">manage_search</mat-icon><strong>Aramaya başlayın</strong><span>En az iki karakter yazın. Marka, model, stok veya araç numarası, tur, kampanya, blog ve hizmetler birlikte aranır.</span></div>
        } @else if (results().length) {
          <div class="result-grid">
            @for (item of results(); track item.key) {
              <a class="result-card" [routerLink]="item.route" [attr.aria-label]="item.title + ', ' + kindLabel(item.kind)">
                <div class="media">
                  @if (item.image) {<img [src]="item.image" [alt]="item.title" loading="lazy" decoding="async" (error)="hideBrokenImage($event)" />}
                  <span class="kind-icon" aria-hidden="true"><mat-icon>{{ kindIcon(item.kind) }}</mat-icon></span>
                </div>
                <div class="copy">
                  <div class="topline"><span>{{ kindLabel(item.kind) }}</span>@if (item.meta) {<small>{{ item.meta }}</small>}</div>
                  <h3>{{ item.title }}</h3>
                  @if (item.summary) {<p>{{ compact(item.summary) }}</p>}
                  <strong>İncele <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong>
                </div>
              </a>
            }
          </div>
          @if (hasMore()) {
            <button type="button" class="load-more" (click)="loadMore()" [disabled]="loadingMore()">{{ loadingMore() ? 'Yükleniyor...' : 'Daha Fazla Sonuç' }}</button>
          }
        } @else {
          <div class="state"><mat-icon aria-hidden="true">search_off</mat-icon><strong>Eşleşme bulunamadı</strong><span>Farklı bir marka, model, araç numarası, tur adı, kampanya veya hizmet adı deneyin.</span></div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.search-page{min-height:100dvh;padding-bottom:100px;background:#060a12;color:#f8fafc}.search-head{position:sticky;top:0;z-index:55;border-bottom:1px solid #243149;background:rgba(6,10,18,.96);backdrop-filter:blur(18px)}.search-shell,.results{width:min(100% - 20px,1120px);margin:auto}.search-shell{padding:14px 0}.title-row{display:flex;align-items:center;gap:10px}.title-row p{margin:0;color:#c6a15b;font-size:9px;font-weight:950;letter-spacing:.16em}.title-row h1{margin:3px 0 0;font:750 clamp(25px,6vw,38px)/1.05 Georgia,serif}.back{display:grid;width:46px;height:46px;flex:none;place-items:center;border:1px solid #2a3952;border-radius:13px;background:#0d1727;color:#fff}.search-box{display:flex;min-height:56px;margin-top:13px;align-items:center;gap:8px;border:1px solid #34445f;border-radius:16px;background:#0d1727;padding:0 9px 0 13px;box-shadow:0 12px 32px rgba(2,6,23,.18)}.search-box:focus-within{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.13)}.search-box>mat-icon{color:#93a4bb}.search-box input{min-width:0;flex:1;border:0;background:transparent;padding:14px 0;color:#fff;font-size:15px;font-weight:750;outline:none}.search-box input::placeholder{color:#718096}.search-box button{display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:11px;background:transparent;color:#94a3b8}.filters{display:flex;gap:7px;margin-top:11px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.filters::-webkit-scrollbar{display:none}.filters button{min-height:40px;flex:none;border:1px solid #2a3952;border-radius:999px;background:#0d1727;padding:0 13px;color:#aeb9c9;font-size:10px;font-weight:900}.filters button.active{border-color:#c6a15b;background:#2a2418;color:#f8e7ba}.results{padding-top:18px}.result-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:12px}.result-head h2{margin:0;font:750 25px/1 Georgia,serif}.result-head p{margin:5px 0 0;color:#8796aa;font-size:11px}.result-head>strong{display:grid;min-width:34px;height:34px;place-items:center;border-radius:999px;background:#172238;color:#dbeafe;font-size:11px}.result-grid{display:grid;grid-template-columns:1fr;gap:10px}.result-card{display:grid;min-width:0;grid-template-columns:92px minmax(0,1fr);overflow:hidden;border:1px solid #243149;border-radius:18px;background:#0b1424;color:#f8fafc;text-decoration:none;box-shadow:0 12px 30px rgba(2,6,23,.16);transition:transform .17s ease,border-color .17s ease,box-shadow .17s ease}.result-card:hover{transform:translateY(-2px);border-color:#c6a15b;box-shadow:0 18px 38px rgba(2,6,23,.24)}.result-card:focus-visible,.back:focus-visible,.filters button:focus-visible,.search-box button:focus-visible,.load-more:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.media{position:relative;min-height:118px;background:linear-gradient(145deg,#111d31,#172238)}.media img{width:100%;height:100%;object-fit:cover}.kind-icon{position:absolute;left:8px;bottom:8px;display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(2,6,23,.86);color:#e7c777}.kind-icon mat-icon{width:19px;height:19px;font-size:19px}.copy{min-width:0;padding:12px}.topline{display:flex;align-items:center;justify-content:space-between;gap:8px}.topline span{color:#93c5fd;font-size:8px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.topline small{max-width:48%;overflow:hidden;color:#7f90a7;font-size:8px;text-overflow:ellipsis;white-space:nowrap}.copy h3{margin:5px 0 0;font-size:15px;line-height:1.25}.copy p{display:-webkit-box;overflow:hidden;margin:6px 0 0;color:#94a3b8;font-size:10px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.copy>strong{display:inline-flex;align-items:center;gap:3px;margin-top:8px;color:#e7c777;font-size:9px;text-transform:uppercase}.copy>strong mat-icon{width:15px;height:15px;font-size:15px}.state{display:grid;min-height:310px;place-content:center;justify-items:center;border:1px dashed #2a3952;border-radius:22px;background:#0a1321;padding:30px;text-align:center;color:#8190a6}.state mat-icon{width:48px;height:48px;font-size:48px}.state strong{margin-top:10px;color:#f8fafc;font-size:17px}.state span{max-width:500px;margin-top:7px;font-size:11px;line-height:1.65}.state.intro{background:radial-gradient(circle at 50% 0,rgba(49,94,134,.18),transparent 50%),#0a1321}.load-more{display:block;min-height:48px;margin:20px auto 0;border:1px solid #c6a15b;border-radius:14px;background:#161b24;padding:0 24px;color:#f8e7ba;font-weight:900}.load-more:disabled{opacity:.55}@media(min-width:620px){.result-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.result-card{grid-template-columns:112px minmax(0,1fr)}}@media(min-width:1000px){.search-shell{padding:18px 0}.result-grid{gap:14px}.result-card{grid-template-columns:130px minmax(0,1fr)}.media{min-height:142px}.copy{padding:15px}.copy h3{font-size:17px}.copy p{font-size:11px}}@media(prefers-reduced-motion:reduce){.result-card{transition:none}}
  `],
})
export class SearchComponent implements OnInit, OnDestroy {
  private readonly search = inject(GlobalSearchService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private debounceTimer?: ReturnType<typeof setTimeout>;
  private request?: AbortController;
  private requestSerial = 0;

  readonly query = signal('');
  readonly filter = signal<SearchFilter>('ALL');
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly results = signal<GlobalSearchResult[]>([]);
  readonly hasMore = signal(false);
  readonly filters = [
    { id: 'ALL' as const, label: 'Tümü' },
    { id: 'VEHICLES' as const, label: 'Araçlar' },
    { id: 'TRAVEL' as const, label: 'Tur & Fırsat' },
    { id: 'CONTENT' as const, label: 'Rehber' },
    { id: 'SERVICES' as const, label: 'Hizmetler' },
  ];

  readonly statusText = computed(() => {
    const value = this.query().trim();
    if (this.loading()) return 'Güncel içerikler aranıyor.';
    if (value.length < 2) return 'En az iki karakter yazın.';
    if (!this.results().length) return 'Eşleşme bulunamadı.';
    return this.hasMore() ? `İlk ${this.results().length} eşleşme gösteriliyor.` : `${this.results().length} eşleşme bulundu.`;
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const incoming = String(params.get('q') || '').slice(0, 120);
      if (incoming !== this.query()) {
        this.query.set(incoming);
        this.scheduleSearch(0);
      }
    });
  }

  ngOnInit(): void { this.scheduleSearch(0); }
  ngOnDestroy(): void { if (this.debounceTimer) clearTimeout(this.debounceTimer); this.request?.abort(); }

  setQuery(value: string): void {
    const clean = String(value || '').slice(0, 120);
    this.query.set(clean);
    this.scheduleSearch(180);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: clean.trim() || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  setFilter(value: SearchFilter): void {
    if (this.filter() === value) return;
    this.filter.set(value);
    this.scheduleSearch(0);
  }

  async loadMore(): Promise<void> {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    const expectedQuery = this.query().trim();
    const expectedFilter = this.filter();
    this.loadingMore.set(true);
    try {
      const page = await this.search.searchPage(expectedQuery, this.kindSet(expectedFilter), 40, this.results().length);
      if (expectedQuery !== this.query().trim() || expectedFilter !== this.filter()) return;
      const existing = new Set(this.results().map((item) => item.key));
      this.results.update((items) => [...items, ...page.items.filter((item) => !existing.has(item.key))]);
      this.hasMore.set(page.hasMore);
    } finally { this.loadingMore.set(false); }
  }

  clearQuery(event: Event): void { event.preventDefault(); event.stopPropagation(); this.setQuery(''); }
  goBack(): void { if (typeof window !== 'undefined' && window.history.length > 1) this.location.back(); else void this.router.navigate(['/']); }

  kindLabel(kind: GlobalSearchKind): string {
    const labels: Record<GlobalSearchKind,string> = { RENTAL:'Kiralık araç',SALE:'Satılık araç',TOUR:'Tur',CAMPAIGN:'Kampanya',BLOG:'Blog',BRANCH:'Şube',FAQ:'Sık sorulan soru',SECTION:'Vitrin',PAGE:'Hizmet' };
    return labels[kind];
  }
  kindIcon(kind: GlobalSearchKind): string {
    const icons: Record<GlobalSearchKind,string> = { RENTAL:'key',SALE:'directions_car',TOUR:'explore',CAMPAIGN:'local_offer',BLOG:'article',BRANCH:'storefront',FAQ:'help_outline',SECTION:'view_carousel',PAGE:'apps' };
    return icons[kind];
  }
  compact(value: string): string { const text=String(value||'').replace(/\s+/g,' ').trim();return text.length>170?`${text.slice(0,167).trimEnd()}...`:text; }
  hideBrokenImage(event: Event): void { (event.target as HTMLImageElement).style.display='none'; }

  private scheduleSearch(delay: number): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer=setTimeout(()=>void this.runSearch(),delay);
  }

  private async runSearch(): Promise<void> {
    const query=this.query().trim();
    this.request?.abort();
    this.request=undefined;
    if (query.length<2) { this.results.set([]);this.hasMore.set(false);this.loading.set(false);return; }
    const serial=++this.requestSerial;
    const controller=new AbortController();
    this.request=controller;
    this.loading.set(true);
    try {
      const page=await this.search.searchPage(query,this.kindSet(this.filter()),40,0,controller.signal);
      if (serial!==this.requestSerial || controller.signal.aborted) return;
      this.results.set(page.items);
      this.hasMore.set(page.hasMore);
    } catch (error) {
      if (!controller.signal.aborted) { console.error('Global search failed',error);this.results.set([]);this.hasMore.set(false); }
    } finally {
      if (serial===this.requestSerial) this.loading.set(false);
    }
  }

  private kindSet(filter: SearchFilter): ReadonlySet<GlobalSearchKind>|undefined {
    if (filter==='ALL') return undefined;
    if (filter==='VEHICLES') return new Set<GlobalSearchKind>(['RENTAL','SALE']);
    if (filter==='TRAVEL') return new Set<GlobalSearchKind>(['TOUR','CAMPAIGN']);
    if (filter==='CONTENT') return new Set<GlobalSearchKind>(['BLOG','FAQ']);
    return new Set<GlobalSearchKind>(['BRANCH','SECTION','PAGE']);
  }
}
