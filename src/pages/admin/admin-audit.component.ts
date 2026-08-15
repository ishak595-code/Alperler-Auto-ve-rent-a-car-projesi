import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../services/auth.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../../supabase.config";

interface AuditRow {
  id: number;
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: "INSERT" | "UPDATE" | "DELETE" | string;
  entity_type: string;
  entity_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
}

@Component({
  selector: "app-admin-audit",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Denetim ve sorumluluk</p>
          <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Yönetici İşlem Geçmişi</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">İlan, tur, kampanya, medya, ana sayfa vitrini, şube ve ekip yönetiminde yapılan değişikliklerin zaman ve yönetici bazlı kaydı.</p>
            </div>
            <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Kayıtları Yenile' }}</button>
          </div>
        </header>

        <section class="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_180px] md:p-5">
          <label class="field"><span>Ara</span><input [(ngModel)]="query" type="search" placeholder="Yönetici, tablo, kayıt veya değişen alan…" /></label>
          <label class="field"><span>Modül</span><select [(ngModel)]="entityFilter"><option value="">Tümü</option>@for (entity of entityTypes(); track entity) { <option [value]="entity">{{ entityLabel(entity) }}</option> }</select></label>
          <label class="field"><span>İşlem</span><select [(ngModel)]="actionFilter"><option value="">Tümü</option><option value="INSERT">Ekleme</option><option value="UPDATE">Güncelleme</option><option value="DELETE">Silme</option></select></label>
        </section>

        @if (error()) {
          <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div>
        }

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-600">{{ filteredRows().length }} kayıt gösteriliyor</div>
          <div class="divide-y divide-slate-100">
            @for (row of filteredRows(); track row.id) {
              <article class="grid gap-4 p-5 lg:grid-cols-[150px_180px_1fr_190px] lg:items-start">
                <div><span class="inline-flex rounded-full px-3 py-1 text-[10px] font-black" [class.bg-emerald-100]="row.action==='INSERT'" [class.text-emerald-800]="row.action==='INSERT'" [class.bg-blue-100]="row.action==='UPDATE'" [class.text-blue-800]="row.action==='UPDATE'" [class.bg-rose-100]="row.action==='DELETE'" [class.text-rose-800]="row.action==='DELETE'">{{ actionLabel(row.action) }}</span><strong class="mt-2 block text-sm text-slate-900">{{ entityLabel(row.entity_type) }}</strong><small class="block break-all text-slate-400">{{ shortId(row.entity_id) }}</small></div>
                <div><span class="block text-[10px] font-black uppercase tracking-wide text-slate-400">Yönetici</span><strong class="mt-1 block break-all text-xs text-slate-800">{{ row.actor_email || 'Kimliği doğrulanmış yönetici' }}</strong></div>
                <div><span class="block text-[10px] font-black uppercase tracking-wide text-slate-400">Değişiklik</span><p class="mt-1 text-sm font-bold leading-6 text-slate-700">{{ changeSummary(row) }}</p></div>
                <time [attr.datetime]="row.created_at" class="text-xs font-bold text-slate-500 lg:text-right">{{ formatDate(row.created_at) }}</time>
              </article>
            } @empty {
              <div class="p-14 text-center text-sm font-bold text-slate-500">Bu filtrelerle eşleşen işlem kaydı yok.</div>
            }
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select{min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;outline:none}.field input:focus,.field select:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}
  `],
})
export class AdminAuditComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly rows = signal<AuditRow[]>([]);
  readonly loading = signal(false);
  readonly error = signal("");
  query = "";
  entityFilter = "";
  actionFilter = "";

  readonly entityTypes = computed(() => [...new Set(this.rows().map((row) => row.entity_type))].sort());

  ngOnInit(): void { void this.refresh(); }

  filteredRows(): AuditRow[] {
    const needle = this.query.trim().toLocaleLowerCase("tr-TR");
    return this.rows().filter((row) => {
      if (this.entityFilter && row.entity_type !== this.entityFilter) return false;
      if (this.actionFilter && row.action !== this.actionFilter) return false;
      if (!needle) return true;
      const searchable = [row.actor_email, row.entity_type, row.entity_id, this.changeSummary(row)].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR");
      return searchable.includes(needle);
    });
  }

  async refresh(): Promise<void> {
    this.loading.set(true); this.error.set("");
    try {
      const token = await this.auth.getAccessToken();
      if (!token) throw new Error("Yönetici oturumu bulunamadı.");
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/audit_logs?select=id,actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,created_at&order=created_at.desc&limit=300`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`İşlem geçmişi yüklenemedi (${response.status}).`);
      this.rows.set((await response.json()) as AuditRow[]);
    } catch (error) { this.error.set(error instanceof Error ? error.message : "İşlem geçmişi yüklenemedi."); }
    finally { this.loading.set(false); }
  }

  actionLabel(action: string): string { return action === "INSERT" ? "EKLENDİ" : action === "DELETE" ? "SİLİNDİ" : action === "UPDATE" ? "GÜNCELLENDİ" : action; }
  entityLabel(entity: string): string { const labels: Record<string,string> = { vehicles:"Araçlar", tours:"Turlar", campaigns:"Kampanyalar", blog_posts:"Blog", catalog_media:"Medya", homepage_sections:"Ana sayfa bölümleri", homepage_placements:"Vitrin yerleşimi", branches:"Şubeler", staff_profiles:"Çalışanlar", staff_branch_assignments:"Çalışan-şube", vehicle_staff_assignments:"Araç görevlendirme", tour_staff_assignments:"Tur görevlendirme", admin_users:"Yöneticiler" }; return labels[entity] || entity; }
  shortId(value?: string | null): string { if (!value) return ""; return value.length > 18 ? `${value.slice(0,8)}…${value.slice(-6)}` : value; }
  formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("tr-TR", { dateStyle:"medium", timeStyle:"short" }).format(date); }

  changeSummary(row: AuditRow): string {
    if (row.action === "INSERT") return "Yeni kayıt oluşturuldu.";
    if (row.action === "DELETE") return "Kayıt silindi.";
    const before = row.before_data || {};
    const after = row.after_data || {};
    const ignored = new Set(["updated_at", "created_at"]);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => !ignored.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (!changed.length) return "Kayıt güncellendi, görünür alan değişikliği yok.";
    return `Değişen alanlar: ${changed.slice(0,8).map((key) => this.fieldLabel(key)).join(", ")}${changed.length > 8 ? ` ve ${changed.length - 8} alan daha` : ""}.`;
  }

  private fieldLabel(key: string): string { const labels: Record<string,string> = { price:"fiyat", rental_price_daily:"günlük kiralama fiyatı", publication_status:"yayın durumu", cover_image:"kapak görseli", images:"galeri", description:"açıklama", features:"özellikler", branch_id:"şube", is_active:"aktiflik", is_featured:"öne çıkarma", role:"rol", permissions:"yetkiler", sort_order:"sıra", is_cover:"kapak seçimi", alt_text:"alt metin", source_url:"kaynak", license:"lisans" }; return labels[key] || key.replaceAll("_", " "); }
}
