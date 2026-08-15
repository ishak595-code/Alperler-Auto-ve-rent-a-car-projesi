import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  AdminAnalyticsService,
  AnalyticsDeviceBreakdown,
  AnalyticsFunnelRow,
  AnalyticsInteractionRow,
  AnalyticsLiveSession,
  AnalyticsOverview,
  AnalyticsPageRow,
  AnalyticsTimelineEvent,
} from '../../services/admin-analytics.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-[11px] font-black uppercase tracking-[.2em] text-blue-400">Ziyaretçi Davranış Merkezi</p>
              <h1 class="mt-2 text-3xl font-black md:text-4xl">Canlı Trafik ve Dönüşüm Analitiği</h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-300">KVKK analitik onayı veren ziyaretçilerin sayfa akışı, cihazı, ağ bilgisi, tıklamaları, scroll derinliği, form hunisi ve teknik hataları. Form içeriği, şifre ve kart verisi burada tutulmaz.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <label class="flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold">
                Dönem
                <select [(ngModel)]="days" (change)="refreshAll()" class="rounded-lg bg-slate-900 px-2 py-1 text-white outline-none">
                  <option [ngValue]="1">24 saat</option><option [ngValue]="7">7 gün</option><option [ngValue]="30">30 gün</option><option [ngValue]="90">90 gün</option>
                </select>
              </label>
              <button type="button" (click)="refreshAll()" [disabled]="loading()" class="min-h-12 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">
                {{ loading() ? 'Yükleniyor…' : 'Veriyi Yenile' }}
              </button>
            </div>
          </div>
        </header>

        @if (error()) {
          <div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ error() }}</div>
        }

        <section class="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6" aria-label="Analitik özeti">
          @for (card of summaryCards(); track card.label) {
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between gap-2"><span class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ card.label }}</span><mat-icon class="text-blue-600" aria-hidden="true">{{ card.icon }}</mat-icon></div>
              <strong class="mt-3 block text-2xl font-black text-slate-950">{{ card.value }}</strong>
              <span class="mt-1 block text-xs text-slate-500">{{ card.note }}</span>
            </article>
          }
        </section>

        <section class="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div><p class="text-[10px] font-black uppercase tracking-widest text-blue-600">Canlı ve son oturumlar</p><h2 class="mt-1 text-2xl font-black text-slate-950">Ziyaretçiler</h2></div>
              <div class="grid gap-2 sm:grid-cols-3 md:min-w-[560px]">
                <input [(ngModel)]="search" placeholder="IP, cihaz, şehir, sayfa, müşteri…" aria-label="Ziyaretçi ara" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="liveOnly" /> Sadece canlı</label>
                <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="errorsOnly" /> Hata alanlar</label>
              </div>
            </div>

            <div class="mt-5 space-y-3">
              @for (session of filteredSessions(); track session.session_id) {
                <button type="button" (click)="selectSession(session)" class="w-full rounded-2xl border border-slate-200 p-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span [class.bg-emerald-100]="isLive(session)" [class.text-emerald-700]="isLive(session)" class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{{ isLive(session) ? 'CANLI' : 'SONLANDI' }}</span>
                        <strong class="truncate text-sm text-slate-950">{{ session.known_name || deviceLabel(session) }}</strong>
                        @if (session.customer_reference) { <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{{ session.customer_reference }}</span> }
                      </div>
                      <div class="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                        <span><b class="text-slate-700">IP:</b> {{ session.ip_address || 'Yok' }}</span>
                        <span><b class="text-slate-700">Konum:</b> {{ locationLabel(session) }}</span>
                        <span><b class="text-slate-700">Tarayıcı:</b> {{ session.browser_name || '?' }} {{ session.browser_version || '' }}</span>
                        <span><b class="text-slate-700">Son:</b> {{ session.last_seen_at | date:'dd.MM HH:mm:ss' }}</span>
                      </div>
                      @if (session.known_phone || session.known_email) {
                        <div class="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-700"><span>{{ session.known_phone || '' }}</span><span>{{ session.known_email || '' }}</span></div>
                      }
                    </div>
                    <div class="grid grid-cols-5 gap-1.5 text-center lg:w-[360px]">
                      <span class="rounded-xl bg-slate-50 px-2 py-2"><b class="block text-sm text-slate-900">{{ session.pageview_count }}</b><small class="text-[9px] text-slate-500">Sayfa</small></span>
                      <span class="rounded-xl bg-slate-50 px-2 py-2"><b class="block text-sm text-slate-900">{{ session.click_count }}</b><small class="text-[9px] text-slate-500">Tık</small></span>
                      <span class="rounded-xl bg-slate-50 px-2 py-2"><b class="block text-sm text-slate-900">%{{ session.max_scroll_depth }}</b><small class="text-[9px] text-slate-500">Scroll</small></span>
                      <span class="rounded-xl bg-slate-50 px-2 py-2"><b class="block text-sm text-slate-900">{{ session.form_abandon_count }}</b><small class="text-[9px] text-slate-500">Vazgeçme</small></span>
                      <span [class.bg-red-50]="session.error_count > 0" class="rounded-xl bg-slate-50 px-2 py-2"><b class="block text-sm text-slate-900">{{ session.error_count }}</b><small class="text-[9px] text-slate-500">Hata</small></span>
                    </div>
                  </div>
                </button>
              } @empty {
                <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Bu filtrelerde henüz analitik oturumu yok.</div>
              }
            </div>
          </article>

          <div class="space-y-5">
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-950">Cihaz Dağılımı</h2>
              <div class="mt-4 space-y-3">@for (row of breakdown().devices; track row.label) { <div><div class="flex justify-between text-xs"><b>{{ row.label }}</b><span>{{ row.sessions }}</span></div><div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-blue-600" [style.width.%]="barWidth(row.sessions, breakdown().devices)"></div></div></div> }</div>
            </article>
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-950">Tarayıcılar</h2>
              <div class="mt-4 space-y-2">@for (row of breakdown().browsers.slice(0,6); track row.label) { <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><b>{{ row.label }}</b><span>{{ row.sessions }} oturum</span></div> }</div>
            </article>
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-950">Ülkeler</h2>
              <div class="mt-4 space-y-2">@for (row of breakdown().countries.slice(0,8); track row.label) { <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><b>{{ row.label }}</b><span>{{ row.sessions }}</span></div> }</div>
            </article>
          </div>
        </section>

        <section class="grid gap-5 xl:grid-cols-3">
          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-950">En Çok Görülen Sayfalar</h2><div class="mt-4 space-y-2">@for (row of pages().slice(0,12); track row.path) { <div class="rounded-xl bg-slate-50 px-3 py-2"><div class="truncate text-xs font-bold text-slate-800">{{ row.path }}</div><div class="mt-1 text-[10px] text-slate-500">{{ row.views }} görüntüleme · {{ row.sessions }} oturum</div></div> }</div></article>
          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-950">En Çok Etkileşim Alanlar</h2><div class="mt-4 space-y-2">@for (row of interactions().slice(0,12); track row.path + row.label) { <div class="rounded-xl bg-slate-50 px-3 py-2"><div class="truncate text-xs font-bold text-slate-800">{{ row.label }}</div><div class="mt-1 text-[10px] text-slate-500">{{ row.path }} · {{ row.interactions }} tık @if (row.rage_clicks) { · <b class="text-red-600">{{ row.rage_clicks }} rage</b> }</div></div> }</div></article>
          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-950">Form Hunileri</h2><div class="mt-4 space-y-2">@for (row of funnels(); track row.funnel_name + row.funnel_step + row.event_type) { <div class="rounded-xl bg-slate-50 px-3 py-2"><div class="text-xs font-bold text-slate-800">{{ row.funnel_name }}</div><div class="mt-1 text-[10px] text-slate-500">{{ funnelLabel(row) }} · {{ row.sessions }} oturum</div></div> }</div></article>
        </section>

        @if (selected()) {
          <section class="rounded-3xl border border-blue-200 bg-white p-5 shadow-lg md:p-6" aria-live="polite">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><p class="text-[10px] font-black uppercase tracking-widest text-blue-600">Oturum zaman çizelgesi</p><h2 class="mt-1 text-xl font-black text-slate-950">{{ selected()?.known_name || deviceLabel(selected()!) }}</h2><p class="mt-1 text-xs text-slate-500">{{ selected()?.ip_address || 'IP yok' }} · {{ locationLabel(selected()!) }} · {{ selected()?.landing_path }} → {{ selected()?.exit_path }}</p></div>
              <button type="button" (click)="selected.set(null); timeline.set([])" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Detayı Kapat</button>
            </div>
            <div class="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              @for (event of timeline(); track event.id) {
                <article class="rounded-2xl border border-slate-200 p-3">
                  <div class="flex items-center justify-between gap-2"><span class="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-700">{{ eventLabel(event) }}</span><time class="text-[10px] text-slate-400">{{ event.created_at | date:'HH:mm:ss' }}</time></div>
                  <div class="mt-2 break-words text-xs font-bold text-slate-800">{{ event.element_label || event.path }}</div>
                  @if (event.scroll_depth != null) { <div class="mt-1 text-[10px] text-slate-500">Scroll: %{{ event.scroll_depth }}</div> }
                  @if (event.funnel_name) { <div class="mt-1 text-[10px] text-slate-500">{{ event.funnel_name }} · {{ event.funnel_step }}</div> }
                  @if (event.error_message) { <div class="mt-2 rounded-lg bg-red-50 p-2 text-[10px] font-bold text-red-700">{{ event.error_message }}</div> }
                </article>
              } @empty { <div class="col-span-full rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Oturum olayı bulunamadı.</div> }
            </div>
          </section>
        }
      </div>
    </main>
  `,
})
export class AdminAnalyticsComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminAnalyticsService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly overview = signal<AnalyticsOverview>({ sessions: 0, visitors: 0, pageviews: 0, clicks: 0, errors: 0, formStarts: 0, formSubmits: 0, formAbandons: 0, liveNow: 0, avgMaxScroll: 0 });
  readonly sessions = signal<AnalyticsLiveSession[]>([]);
  readonly pages = signal<AnalyticsPageRow[]>([]);
  readonly interactions = signal<AnalyticsInteractionRow[]>([]);
  readonly funnels = signal<AnalyticsFunnelRow[]>([]);
  readonly breakdown = signal<AnalyticsDeviceBreakdown>({ devices: [], browsers: [], countries: [] });
  readonly selected = signal<AnalyticsLiveSession | null>(null);
  readonly timeline = signal<AnalyticsTimelineEvent[]>([]);
  days = 7;
  search = '';
  liveOnly = false;
  errorsOnly = false;
  private timer?: number;

  readonly summaryCards = computed(() => {
    const o = this.overview();
    const conversion = o.formStarts > 0 ? Math.round((o.formSubmits / o.formStarts) * 100) : 0;
    return [
      { label: 'Şu an canlı', value: o.liveNow, note: 'Son 5 dakika', icon: 'sensors' },
      { label: 'Tekil ziyaretçi', value: o.visitors, note: `${this.days} günlük`, icon: 'person_search' },
      { label: 'Oturum', value: o.sessions, note: `${o.pageviews} sayfa`, icon: 'travel_explore' },
      { label: 'Tıklama', value: o.clicks, note: `Ort. scroll %${o.avgMaxScroll}`, icon: 'ads_click' },
      { label: 'Form dönüşümü', value: `%${conversion}`, note: `${o.formAbandons} vazgeçme`, icon: 'conversion_path' },
      { label: 'Teknik hata', value: o.errors, note: 'JS + promise', icon: 'bug_report' },
    ];
  });

  ngOnInit(): void {
    void this.refreshAll();
    this.timer = window.setInterval(() => void this.refreshLive(), 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) window.clearInterval(this.timer);
  }

  filteredSessions(): AnalyticsLiveSession[] {
    const q = this.search.trim().toLocaleLowerCase('tr-TR');
    return this.sessions().filter((s) => {
      if (this.liveOnly && !this.isLive(s)) return false;
      if (this.errorsOnly && s.error_count < 1) return false;
      if (!q) return true;
      return [s.ip_address, s.city, s.country_region, s.device_model, s.os_name, s.browser_name, s.landing_path, s.exit_path, s.known_name, s.known_phone, s.known_email, s.customer_reference].some((v) => String(v || '').toLocaleLowerCase('tr-TR').includes(q));
    });
  }

  async refreshAll(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      const [overview, sessions, pages, interactions, funnels, breakdown] = await Promise.all([
        this.api.overview(this.days), this.api.liveSessions(150), this.api.topPages(this.days, 25), this.api.interactions(this.days, 35), this.api.funnels(this.days), this.api.deviceBreakdown(this.days),
      ]);
      this.overview.set(overview); this.sessions.set(sessions); this.pages.set(pages); this.interactions.set(interactions); this.funnels.set(funnels); this.breakdown.set(breakdown);
    } catch (error) {
      this.error.set('Analitik verileri yüklenemedi. Yönetici oturumunu ve Supabase bağlantısını kontrol edin.');
      console.error(error);
    } finally { this.loading.set(false); }
  }

  async refreshLive(): Promise<void> {
    try { const [overview, sessions] = await Promise.all([this.api.overview(this.days), this.api.liveSessions(150)]); this.overview.set(overview); this.sessions.set(sessions); } catch { /* keep last known data */ }
  }

  async selectSession(session: AnalyticsLiveSession): Promise<void> {
    this.selected.set(session); this.timeline.set([]);
    try { this.timeline.set(await this.api.timeline(session.session_id, 400)); }
    catch { this.toast.show('Oturum zaman çizelgesi alınamadı.', 'error'); }
  }

  isLive(session: AnalyticsLiveSession): boolean { return Date.now() - new Date(session.last_seen_at).getTime() <= 5 * 60 * 1000; }
  deviceLabel(session: AnalyticsLiveSession): string { return [session.device_model, session.os_name, session.device_type].filter(Boolean).join(' · ') || 'Bilinmeyen cihaz'; }
  locationLabel(session: AnalyticsLiveSession): string { return [session.city, session.country_region, session.country_code].filter(Boolean).join(' / ') || 'Konum belirlenemedi'; }
  barWidth(value: number, rows: { sessions: number }[]): number { const max = Math.max(1, ...rows.map((row) => row.sessions)); return Math.max(3, Math.round((value / max) * 100)); }
  funnelLabel(row: AnalyticsFunnelRow): string { return row.event_type === 'form_start' ? 'Başladı' : row.event_type === 'form_submit' ? row.funnel_step === 'success' ? 'Başarıyla kaydedildi' : 'Gönderim denemesi' : row.event_type === 'form_abandon' ? 'Vazgeçti' : row.funnel_step; }
  eventLabel(event: AnalyticsTimelineEvent): string {
    const labels: Record<string, string> = { session_start: 'Başlangıç', page_view: 'Sayfa', click: 'Tıklama', rage_click: 'Tekrarlı tıklama', scroll_depth: 'Scroll', form_start: 'Form başladı', form_submit: event.funnel_step === 'success' ? 'Form başarılı' : 'Form gönderim', form_abandon: 'Form vazgeçme', js_error: 'JS hata', unhandled_rejection: 'Promise hata', session_end: 'Çıkış' };
    return labels[event.event_type] || event.event_type;
  }
}
