import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../services/auth.service";
import { RuntimeControls, RuntimeControlsService } from "../../services/runtime-controls.service";
import { ToastService } from "../../services/toast.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../../supabase.config";

interface SystemEventRow {
  id: number;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  source: string;
  code: string;
  message: string;
  route?: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved_at?: string | null;
  auto_recovered: boolean;
  recovery_action?: string | null;
  release_sha?: string | null;
  client_family?: string | null;
  details?: Record<string, unknown> | null;
}

interface RepairResult {
  ok?: boolean;
  runId?: string;
  runtimeRestored?: boolean;
  navigationSettingsRestored?: boolean;
  navigationItemsInserted?: number;
  homepageSectionsInserted?: number;
  businessDataDeleted?: boolean;
  completedAt?: string;
}

@Component({
  selector: "app-admin-system-health",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Operasyon merkezi</p>
              <h1 class="mt-2 text-3xl font-black md:text-4xl">Sistem Sağlığı ve Bakım</h1>
              <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-300">Teknik sorunları, güvenli toparlanmaları ve sitenin çalışma durumunu tek yerden izleyin. Hata kayıtları müşteri form içeriklerini veya ödeme bilgilerini saklamaz.</p>
            </div>
            <button type="button" (click)="refreshAll()" [disabled]="loading() || repairing()" class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">
              <mat-icon aria-hidden="true">refresh</mat-icon>{{ loading() ? 'Kontrol ediliyor…' : 'Şimdi Kontrol Et' }}
            </button>
          </div>
        </header>

        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sistem sağlık özeti">
          <article class="metric"><span>Son 24 saat</span><strong>{{ events24h() }}</strong><small>toplam hata olayı</small></article>
          <article class="metric"><span>Açık sorun</span><strong>{{ unresolvedCount() }}</strong><small>çözüm bekleyen sorun</small></article>
          <article class="metric"><span>Kritik</span><strong>{{ criticalCount() }}</strong><small>açık kritik hata</small></article>
          <article class="metric"><span>Otomatik toparlandı</span><strong>{{ autoRecoveredCount() }}</strong><small>güvenli onarım uygulandı</small></article>
        </section>

        <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><p class="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Canlı müşteri sistemi</p><h2 class="mt-1 text-xl font-black text-slate-900">Çalışma Modu</h2></div>
              <span class="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-black" [class.bg-emerald-100]="!draft.maintenanceMode && !draft.readOnlyMode" [class.text-emerald-800]="!draft.maintenanceMode && !draft.readOnlyMode" [class.bg-amber-100]="draft.readOnlyMode" [class.text-amber-900]="draft.readOnlyMode" [class.bg-rose-100]="draft.maintenanceMode" [class.text-rose-900]="draft.maintenanceMode">{{ runtimeLabel() }}</span>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.maintenanceMode" /><span><strong>Bakım modu</strong><small>Müşteri ekranlarını bakım mesajıyla kapatır.</small></span></label>
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.readOnlyMode" /><span><strong>Görüntüleme modu</strong><small>Site okunur, yeni işlem oluşturma durdurulur.</small></span></label>
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.allowBookings" /><span><strong>Rezervasyon</strong><small>Yeni kiralama ve tur rezervasyonuna izin ver.</small></span></label>
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.allowAppointments" /><span><strong>Randevu</strong><small>Yeni randevu talebine izin ver.</small></span></label>
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.allowContact" /><span><strong>İletişim</strong><small>İletişim mesajı kabul et.</small></span></label>
              <label class="toggle-card"><input type="checkbox" [(ngModel)]="draft.allowPartnerRequests" /><span><strong>Aracını Değerlendir</strong><small>Yeni araç başvurusu kabul et.</small></span></label>
            </div>

            <div class="mt-5 grid gap-4">
              <label class="field"><span>Bakım başlığı</span><input [(ngModel)]="draft.maintenanceTitle" maxlength="120" /></label>
              <label class="field"><span>Bakım açıklaması</span><textarea [(ngModel)]="draft.maintenanceMessage" rows="3" maxlength="500"></textarea></label>
              <label class="field"><span>Durum mesajı</span><input [(ngModel)]="draft.statusMessage" maxlength="250" placeholder="Örn. Kartla ödeme kısa süreliğine kullanılamıyor" /></label>
            </div>

            <button type="button" (click)="saveRuntimeControls()" [disabled]="saving() || repairing()" class="mt-5 min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">{{ saving() ? 'Kaydediliyor…' : 'Çalışma Modunu Kaydet' }}</button>
          </div>

          <aside class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Veri silmeyen sistem bakımı</p>
            <h2 class="mt-1 text-xl font-black text-slate-900">Güvenli Bakım</h2>
            <p class="mt-3 text-sm leading-6 text-slate-600">Sitenin temel çalışma ayarlarını, ana navigasyonu ve gerekli ana sayfa kayıtlarını sağlıklı varsayılanlara getirir. Araç, müşteri, rezervasyon, kampanya, finans, fotoğraf ve geçmiş kayıtlarını silmez.</p>
            <div class="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <div class="health-note"><mat-icon aria-hidden="true">settings_backup_restore</mat-icon><span><strong>Çalışma ayarları:</strong> bakım ve salt okunur durumlarını kapatır, müşteri işlem kanallarını yeniden açar.</span></div>
              <div class="health-note"><mat-icon aria-hidden="true">account_tree</mat-icon><span><strong>Bağlantılar:</strong> eksik temel menü ve ana sayfa kayıtlarını yeniden oluşturur, mevcut içerikleri korur.</span></div>
              <div class="health-note warning"><mat-icon aria-hidden="true">verified_user</mat-icon><span><strong>Koruma:</strong> işletme verileri üzerinde toplu silme, araç sıfırlama veya müşteri temizleme işlemi yapmaz.</span></div>
            </div>
            <button type="button" (click)="runSafeRepair()" [disabled]="repairing() || saving()" class="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"><mat-icon aria-hidden="true">build_circle</mat-icon>{{ repairing() ? 'Bakım uygulanıyor…' : 'Güvenli Bakımı Çalıştır' }}</button>
            @if (lastRepair(); as repair) {
              <div class="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-900" role="status">
                <strong class="block">Son bakım tamamlandı</strong>
                <span>Temel çalışma ayarları onarıldı. Eklenen menü kaydı: {{ repair.navigationItemsInserted || 0 }}, eklenen ana sayfa bölümü: {{ repair.homepageSectionsInserted || 0 }}. İşletme verisi silinmedi.</span>
              </div>
            }
          </aside>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div class="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <label class="field"><span>Hata ara</span><input type="search" [(ngModel)]="query" placeholder="Kod, kaynak, sayfa veya mesaj…" /></label>
            <label class="field"><span>Önem</span><select [(ngModel)]="severityFilter"><option value="">Tümü</option><option value="CRITICAL">Kritik</option><option value="ERROR">Hata</option><option value="WARN">Uyarı</option><option value="INFO">Bilgi</option></select></label>
            <label class="field"><span>Durum</span><select [(ngModel)]="stateFilter"><option value="OPEN">Açık</option><option value="RESOLVED">Çözülmüş</option><option value="ALL">Tümü</option></select></label>
          </div>
        </section>

        @if (error()) { <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div> }

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 class="font-black text-slate-900">Sistem Olayları</h2><p class="text-xs text-slate-500">{{ filteredEvents().length }} sorun kaydı gösteriliyor</p></div></div>
          <div class="divide-y divide-slate-100">
            @for (event of filteredEvents(); track event.id) {
              <article class="p-5">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2"><span class="severity" [attr.data-level]="event.severity">{{ severityLabel(event.severity) }}</span><span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{{ event.source }}</span>@if (event.auto_recovered) { <span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">OTOMATİK TOPARLANDI</span> }@if (event.resolved_at) { <span class="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800">ÇÖZÜLDÜ</span> }</div>
                    <h3 class="mt-3 break-words text-base font-black text-slate-900">{{ event.code }}</h3>
                    <p class="mt-1 break-words text-sm leading-6 text-slate-600">{{ event.message }}</p>
                    <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500"><span>Tekrar: {{ event.occurrence_count }}</span><span>İlk: {{ formatDate(event.first_seen) }}</span><span>Son: {{ formatDate(event.last_seen) }}</span>@if (event.route) { <span class="break-all">Sayfa: {{ event.route }}</span> }@if (event.client_family) { <span>{{ event.client_family }}</span> }</div>
                    @if (event.recovery_action) { <p class="mt-2 text-xs font-bold text-emerald-700">Onarım: {{ event.recovery_action }}</p> }
                  </div>
                  <button type="button" (click)="toggleResolved(event)" class="min-h-11 shrink-0 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ event.resolved_at ? 'Yeniden Aç' : 'Çözüldü İşaretle' }}</button>
                </div>
              </article>
            } @empty { <div class="p-14 text-center text-sm font-bold text-slate-500">Bu filtrelerle eşleşen sistem olayı yok.</div> }
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .metric{display:flex;min-height:140px;flex-direction:column;border:1px solid #e2e8f0;border-radius:24px;background:white;padding:20px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.metric span{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b}.metric strong{margin-top:10px;font-size:34px;line-height:1;font-weight:900;color:#0f172a}.metric small{margin-top:auto;padding-top:10px;color:#94a3b8;font-weight:700}
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569}.field input,.field select,.field textarea{min-height:44px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;padding:10px 12px;outline:none}.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgb(59 130 246/.14)}
    .toggle-card{display:flex;min-height:72px;cursor:pointer;align-items:flex-start;gap:12px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:13px}.toggle-card input{margin-top:3px;width:20px;height:20px;accent-color:#2563eb}.toggle-card span{display:flex;flex-direction:column}.toggle-card strong{font-size:13px;color:#0f172a}.toggle-card small{margin-top:3px;font-size:11px;line-height:1.45;color:#64748b}
    .health-note{display:flex;gap:10px;border-radius:14px;background:#f0fdf4;padding:12px;color:#166534}.health-note mat-icon{flex:none}.health-note.warning{background:#fff7ed;color:#9a3412}
    .severity{display:inline-flex;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900;background:#f1f5f9;color:#334155}.severity[data-level="WARN"]{background:#fef3c7;color:#92400e}.severity[data-level="ERROR"]{background:#fee2e2;color:#991b1b}.severity[data-level="CRITICAL"]{background:#881337;color:white}.severity[data-level="INFO"]{background:#dbeafe;color:#1e40af}
  `],
})
export class AdminSystemHealthComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly runtime = inject(RuntimeControlsService);
  private readonly toast = inject(ToastService);

  readonly events = signal<SystemEventRow[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly repairing = signal(false);
  readonly lastRepair = signal<RepairResult | null>(null);
  readonly error = signal("");
  query = "";
  severityFilter = "";
  stateFilter: "OPEN" | "RESOLVED" | "ALL" = "OPEN";
  draft: RuntimeControls = { ...this.runtime.controls() };

  readonly events24h = computed(() => { const since = Date.now() - 24 * 60 * 60_000; return this.events().filter((item) => new Date(item.last_seen).getTime() >= since).reduce((sum, item) => sum + item.occurrence_count, 0); });
  readonly unresolvedCount = computed(() => this.events().filter((item) => !item.resolved_at).length);
  readonly criticalCount = computed(() => this.events().filter((item) => !item.resolved_at && item.severity === "CRITICAL").length);
  readonly autoRecoveredCount = computed(() => this.events().filter((item) => item.auto_recovered).reduce((sum, item) => sum + item.occurrence_count, 0));

  ngOnInit(): void { void this.refreshAll(); }

  async refreshAll(): Promise<void> {
    this.loading.set(true); this.error.set("");
    try { await Promise.all([this.loadEvents(), this.runtime.refresh(true)]); this.draft = { ...this.runtime.controls() }; }
    catch (error) { this.error.set(error instanceof Error ? error.message : "Sistem sağlığı yüklenemedi."); }
    finally { this.loading.set(false); }
  }

  filteredEvents(): SystemEventRow[] {
    const needle = this.query.trim().toLocaleLowerCase("tr-TR");
    return this.events().filter((event) => {
      if (this.severityFilter && event.severity !== this.severityFilter) return false;
      if (this.stateFilter === "OPEN" && event.resolved_at) return false;
      if (this.stateFilter === "RESOLVED" && !event.resolved_at) return false;
      if (!needle) return true;
      return [event.code, event.source, event.message, event.route, event.client_family].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(needle);
    });
  }

  async saveRuntimeControls(): Promise<void> {
    this.saving.set(true);
    try {
      const token = await this.requiredToken();
      const clean: RuntimeControls = { ...this.draft, maintenanceTitle: this.draft.maintenanceTitle.trim().slice(0,120) || "Kısa bir bakım çalışması yapıyoruz", maintenanceMessage: this.draft.maintenanceMessage.trim().slice(0,500) || "Lütfen biraz sonra tekrar deneyin.", statusMessage: this.draft.statusMessage.trim().slice(0,250), updatedByAdmin: true };
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/site_config?key=eq.runtime_controls`, { method:"PATCH", headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,"content-type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify({value:clean,is_public:true,updated_at:new Date().toISOString()}) });
      if (!response.ok) throw new Error(`Çalışma modu kaydedilemedi (${response.status}).`);
      await this.runtime.refresh(true); this.draft = { ...this.runtime.controls() }; this.toast.show("Sistem çalışma modu güncellendi.", "success");
    } catch (error) { this.toast.show(error instanceof Error ? error.message : "Ayar kaydedilemedi.", "error"); }
    finally { this.saving.set(false); }
  }

  async runSafeRepair(): Promise<void> {
    if (this.repairing()) return;
    this.repairing.set(true); this.error.set("");
    try {
      const token = await this.requiredToken();
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/admin_repair_system_defaults`, { method:"POST", headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,"content-type":"application/json"}, body:"{}" });
      const payload = await response.json().catch(() => ({})) as RepairResult & { message?: string; code?: string };
      if (!response.ok || payload.ok !== true) throw new Error(payload.message || payload.code || `Güvenli bakım tamamlanamadı (${response.status}).`);
      if (payload.businessDataDeleted !== false) throw new Error("Bakım güvenlik doğrulaması başarısız oldu.");
      this.lastRepair.set(payload);
      await Promise.all([this.runtime.refresh(true), this.loadEvents()]);
      this.draft = { ...this.runtime.controls() };
      this.toast.show("Güvenli bakım tamamlandı. İşletme verileri korunarak temel sistem ayarları onarıldı.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Güvenli bakım tamamlanamadı.";
      this.error.set(message); this.toast.show(message, "error");
    } finally { this.repairing.set(false); }
  }

  async toggleResolved(event: SystemEventRow): Promise<void> {
    try {
      const token = await this.requiredToken();
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/system_events?id=eq.${event.id}`, { method:"PATCH", headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`,"content-type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify({resolved_at:event.resolved_at?null:new Date().toISOString()}) });
      if (!response.ok) throw new Error(`Hata durumu güncellenemedi (${response.status}).`);
      await this.loadEvents(); this.toast.show(event.resolved_at ? "Hata yeniden açıldı." : "Hata çözüldü olarak işaretlendi.", "success");
    } catch (error) { this.toast.show(error instanceof Error ? error.message : "Hata durumu güncellenemedi.", "error"); }
  }

  runtimeLabel(): string { return this.draft.maintenanceMode ? "BAKIM MODU" : this.draft.readOnlyMode ? "GÖRÜNTÜLEME MODU" : "SİSTEM AKTİF"; }
  severityLabel(value: SystemEventRow["severity"]): string { return ({ INFO:"BİLGİ", WARN:"UYARI", ERROR:"HATA", CRITICAL:"KRİTİK" } as const)[value]; }
  formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("tr-TR", { dateStyle:"short", timeStyle:"short" }).format(date); }

  private async loadEvents(): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/system_events?select=id,severity,source,code,message,route,occurrence_count,first_seen,last_seen,resolved_at,auto_recovered,recovery_action,release_sha,client_family,details&order=last_seen.desc&limit=500`, { headers:{apikey:SUPABASE_PUBLISHABLE_KEY,authorization:`Bearer ${token}`} });
    if (!response.ok) throw new Error(`Sistem olayları yüklenemedi (${response.status}).`);
    this.events.set((await response.json()) as SystemEventRow[]);
  }

  private async requiredToken(): Promise<string> { const token=await this.auth.getAccessToken(); if(!token)throw new Error("Yönetici oturumu bulunamadı."); return token; }
}
