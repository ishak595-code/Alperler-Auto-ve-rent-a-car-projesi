import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  BranchPartnerAdminRecord,
  BranchPartnerService,
  BranchPartnerStatus,
} from "../../services/branch-partner.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-branch-partner-requests",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-900">
      <header class="sticky top-16 z-20 border-b border-slate-200 bg-white/95 px-4 py-5 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <button type="button" (click)="router.navigate(['/admin/dashboard'])" class="grid min-h-12 min-w-12 place-items-center rounded-xl bg-slate-100 font-black" aria-label="Kontrol paneline dön">←</button>
            <div><p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Şube Adayları</p><h1 class="text-2xl font-black">İş Ortaklığı Başvuruları</h1><p class="mt-1 text-xs text-slate-500">Başvuru, uygunluk, şube hazırlığı ve aktivasyonu birbirinden ayrı yönetin.</p></div>
          </div>
          <div class="grid w-full gap-2 lg:w-auto lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
            <input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Aday, şehir, ilçe veya telefon ara" aria-label="Şube başvurularında ara" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500" />
            <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" aria-label="Şube başvurusu durum filtresi" class="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black"><option value="ALL">Tüm durumlar</option><option value="NEW">Yeni</option><option value="REVIEWING">İnceleniyor</option><option value="CONTACTED">İletişim kuruldu</option><option value="DUE_DILIGENCE">Uygunluk kontrolü</option><option value="APPROVED">Onaylandı</option><option value="REJECTED">Reddedildi</option><option value="CLOSED">Kapalı</option></select>
            <button type="button" (click)="refresh()" [disabled]="service.loading()" class="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50">{{ service.loading() ? 'Yenileniyor...' : 'Yenile' }}</button>
          </div>
        </div>
      </header>

      <section class="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        <div class="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <strong>İşleyiş:</strong> Aday onaylandıktan sonra şube alanı hazırlanır. Hazırlanan şube önce taslaktır. Sözleşme, adres, marka standardı, merkezi fiyat kuralları, güvenlik, müşteri güvencesi, ödeme ayarları ve ilk ilan kontrolü tamamlanmadan canlıya açılamaz.
        </div>

        @if (service.error()) { <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">Başvuru kaynağına ulaşılamadı: {{ service.error() }}</div> }

        <div class="grid gap-4">
          @for (req of filtered(); track req.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div class="flex flex-col gap-6 xl:flex-row xl:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><span [class]="statusClass(req.status)" class="rounded-full px-3 py-1 text-[10px] font-black uppercase">{{ statusLabel(req.status) }}</span><span class="font-mono text-xs font-black text-slate-500">{{ req.reference }}</span><span class="text-xs text-slate-400">{{ req.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>@if(req.provisionedBranchId){<span class="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase text-violet-800">Şube alanı hazır</span>}</div>
                  <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><span class="label">Aday</span><strong class="mt-1 block">{{ req.fullName }}</strong><a [href]="'tel:' + req.phone" class="mt-1 block text-sm font-bold text-blue-700">{{ req.phone }}</a>@if (req.email) {<a [href]="'mailto:' + req.email" class="mt-1 block break-all text-xs text-slate-500">{{ req.email }}</a>}</div>
                    <div><span class="label">Bölge</span><strong class="mt-1 block">{{ req.city }} / {{ req.district }}</strong><p class="mt-1 text-sm text-slate-500">{{ req.operatingArea || 'Ek bölge belirtilmedi' }}</p></div>
                    <div><span class="label">Araç kapasitesi</span><strong class="mt-1 block">{{ req.currentFleetSize }} mevcut / {{ req.plannedFleetSize }} planlanan</strong><p class="mt-1 text-sm text-slate-500">{{ listingLabel(req) }}</p></div>
                    <div><span class="label">Operasyon</span><strong class="mt-1 block">{{ serviceLabels(req) }}</strong><p class="mt-1 text-sm text-slate-500">{{ officeLabel(req) }} · {{ req.experienceYears }} yıl deneyim</p></div>
                  </div>
                  <div class="mt-4 grid gap-3 sm:grid-cols-2"><div class="info"><span class="label">Başlangıç bütçesi</span><strong>{{ budgetLabel(req) }}</strong></div><div class="info"><span class="label">Mevcut işletme</span><strong>{{ req.currentBusiness || 'Belirtilmedi' }}</strong></div></div>
                  @if (req.notes) { <div class="mt-4 rounded-xl bg-slate-50 p-4"><span class="label">Aday notu</span><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{{ req.notes }}</p></div> }
                </div>

                <aside class="w-full space-y-3 xl:w-80">
                  <label class="block"><span class="label">Durum</span><select [ngModel]="req.status" (ngModelChange)="changeStatus(req,$event,note.value)" [disabled]="saving()===req.reference" class="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-black"><option value="NEW">Yeni</option><option value="REVIEWING">İnceleniyor</option><option value="CONTACTED">İletişim kuruldu</option><option value="DUE_DILIGENCE">Uygunluk kontrolü</option><option value="APPROVED">Onaylandı</option><option value="REJECTED">Reddedildi</option><option value="CLOSED">Kapalı</option></select></label>
                  <label class="block"><span class="label">İç not</span><textarea #note rows="5" [value]="req.internalNotes || ''" maxlength="4000" class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" placeholder="Adaya gösterilmez"></textarea></label>
                  <button type="button" (click)="saveNote(req,note.value)" [disabled]="saving()===req.reference" class="min-h-12 w-full rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">{{ saving()===req.reference ? 'Kaydediliyor...' : 'Notu Kaydet' }}</button>

                  @if (req.status === 'APPROVED' && !req.provisionedBranchId) {
                    <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p class="text-xs font-semibold leading-5 text-emerald-900">Aday onaylandı. Şimdi ayrı şube alanı oluşturabilirsiniz. Bu işlem şubeyi canlıya açmaz.</p>
                      <button type="button" (click)="provision(req)" [disabled]="saving()===req.reference" class="mt-3 min-h-12 w-full rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50">{{ saving()===req.reference ? 'Hazırlanıyor...' : 'Şube Alanını Hazırla' }}</button>
                    </div>
                  }
                  @if (req.provisionedBranchId) {
                    <div class="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-900">
                      Bu başvuru için ayrı şube çalışma alanı oluşturuldu. Şube taslakta kalır ve açılış kontrolleri tamamlanmadan ilanları canlı yayınlayamaz.
                      <button type="button" (click)="router.navigate(['/admin/branches'],{queryParams:{branch:req.provisionedBranchId}})" class="mt-3 min-h-11 w-full rounded-lg bg-violet-700 px-3 font-black text-white">Şube Ayarlarına Git</button>
                    </div>
                  }
                </aside>
              </div>
            </article>
          } @empty {
            <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center"><h2 class="font-black">Başvuru bulunamadı</h2><p class="mt-2 text-sm text-slate-500">Seçili filtre için kayıt yok.</p></div>
          }
        </div>
      </section>
    </main>
  `,
  styles: [`
    .label{display:block;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#64748b}.info{display:flex;flex-direction:column;gap:.3rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:.8rem}.info strong{font-size:.83rem}
  `],
})
export class AdminBranchPartnerRequestsComponent implements OnInit {
  readonly service = inject(BranchPartnerService);
  readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly query = signal("");
  readonly statusFilter = signal<"ALL" | BranchPartnerStatus>("ALL");
  readonly saving = signal("");

  readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase("tr-TR");
    const status = this.statusFilter();
    return this.service.records().filter((req) => {
      if (status !== "ALL" && req.status !== status) return false;
      if (!q) return true;
      return `${req.reference} ${req.fullName} ${req.phone} ${req.email || ''} ${req.city} ${req.district} ${req.operatingArea || ''}`.toLocaleLowerCase("tr-TR").includes(q);
    });
  });

  async ngOnInit(): Promise<void> { await this.refresh(); }
  async refresh(): Promise<void> { try { await this.service.refreshAdmin(); } catch { this.toast.show("Şube başvuruları yüklenemedi.", "error"); } }

  async changeStatus(req: BranchPartnerAdminRecord, status: BranchPartnerStatus, note: string): Promise<void> {
    if (req.status === status || this.saving()) return;
    await this.persist(req, status, note, "Başvuru durumu güncellendi.");
  }

  async saveNote(req: BranchPartnerAdminRecord, note: string): Promise<void> {
    if (this.saving()) return;
    await this.persist(req, req.status, note, "İç not kaydedildi.");
  }

  async provision(req: BranchPartnerAdminRecord): Promise<void> {
    if (this.saving() || req.status !== "APPROVED") return;
    this.saving.set(req.reference);
    try {
      const branch = await this.service.provision(req.reference, `Alperler Auto - ${req.district}`);
      this.toast.show(branch.alreadyProvisioned ? "Şube alanı zaten hazırlanmış." : "Şube alanı hazırlandı. Açılış kontrolleri tamamlanmadan canlıya çıkmayacak.", "success");
    } catch (error) {
      const code = error instanceof Error ? error.message : "BRANCH_PROVISION_FAILED";
      this.toast.show(code === "BRANCH_PARTNER_NOT_APPROVED" ? "Önce başvuruyu onaylayın." : "Şube alanı hazırlanamadı.", "error");
    } finally {
      this.saving.set("");
    }
  }

  private async persist(req: BranchPartnerAdminRecord, status: BranchPartnerStatus, note: string, message: string): Promise<void> {
    this.saving.set(req.reference);
    try { await this.service.update(req.reference, status, note); this.toast.show(message, "success"); }
    catch { this.toast.show("Başvuru kaydedilemedi.", "error"); }
    finally { this.saving.set(""); }
  }

  statusLabel(status: BranchPartnerStatus): string { return ({ NEW:"Yeni", REVIEWING:"İnceleniyor", CONTACTED:"İletişim kuruldu", DUE_DILIGENCE:"Uygunluk kontrolü", APPROVED:"Onaylandı", REJECTED:"Reddedildi", CLOSED:"Kapalı" } as Record<string,string>)[status] || status; }
  statusClass(status: BranchPartnerStatus): string { if (status === "APPROVED") return "bg-emerald-100 text-emerald-800"; if (status === "REJECTED" || status === "CLOSED") return "bg-rose-100 text-rose-800"; if (status === "DUE_DILIGENCE" || status === "CONTACTED") return "bg-amber-100 text-amber-800"; if (status === "REVIEWING") return "bg-blue-100 text-blue-800"; return "bg-slate-100 text-slate-700"; }
  serviceLabels(req: BranchPartnerAdminRecord): string { const m: Record<string,string> = { RENTAL:"Kiralama", SALES:"Satış", TOUR_TRANSFER:"Tur / Transfer" }; return req.services.map((s) => m[s] || s).join(" · "); }
  listingLabel(req: BranchPartnerAdminRecord): string { return ({ OWN_FLEET:"Kendi araçları", REGIONAL_NETWORK:"Bölgesel araç ağı", BOTH:"Kendi filo + bölgesel ağ" } as Record<string,string>)[req.listingModel] || req.listingModel; }
  officeLabel(req: BranchPartnerAdminRecord): string { return ({ OWN:"Kendi ofisi", RENT:"Kiralanmış ofis", PLAN:"Ofis planlıyor", NONE:"Ofis yok" } as Record<string,string>)[req.officeStatus] || req.officeStatus; }
  budgetLabel(req: BranchPartnerAdminRecord): string { return ({ DISCUSS:"Görüşmede netleşecek", UNDER_100K:"100.000 TL altı", "100K_250K":"100.000 - 250.000 TL", "250K_500K":"250.000 - 500.000 TL", "500K_PLUS":"500.000 TL ve üzeri" } as Record<string,string>)[req.budgetRange] || req.budgetRange; }
}
