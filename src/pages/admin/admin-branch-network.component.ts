import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { BranchNetworkAdminService } from "../../services/branch-network-admin.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-branch-network",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-100 pb-24 text-slate-900">
      <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div class="flex min-w-0 items-center gap-3"><button type="button" (click)="router.navigate(['/admin/branches'])" class="grid h-11 w-11 place-items-center rounded-xl bg-slate-100" aria-label="Şube listesine dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Merkezi Şube Kontrolü</p><h1 class="truncate text-lg font-black">{{ branch()?.name || 'Şube ağı' }}</h1></div></div>
          <button type="button" (click)="reload()" [disabled]="service.loading()" class="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Yenile</button>
        </div>
      </header>

      @if (error()) {<section class="mx-auto max-w-4xl px-4 py-10"><div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 font-bold text-rose-900">{{ error() }}</div></section>}
      @else if (branch(); as current) {
        <section class="border-b border-slate-200 bg-slate-950 text-white"><div class="mx-auto max-w-7xl px-4 py-7 md:px-8"><div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div class="flex flex-wrap gap-2"><span [class]="statusClass(current.public_status)" class="rounded-full px-3 py-1 text-xs font-black">{{ statusLabel(current.public_status) }}</span><span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{{ current.network_type }}</span></div><h2 class="mt-3 text-2xl font-black">{{ current.city }} / {{ current.district }}</h2><p class="mt-1 text-sm text-slate-400">{{ current.code }} · {{ current.slug }}</p></div><div class="flex flex-wrap gap-2">@if(current.public_status==='ACTIVE'){<button type="button" (click)="suspend()" [disabled]="saving()" class="danger-action">Şubeyi Durdur</button>}@else{<button type="button" (click)="activate()" [disabled]="saving()" class="success-action">Kontroller Tamamsa Aktifleştir</button>}@if(current.slug && current.public_status==='ACTIVE'){<a [routerLink]="['/branches',current.slug]" target="_blank" class="light-action">Canlı Sayfa</a>}</div></div></div></section>

        <div class="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-8 xl:grid-cols-[1fr_1fr]">
          <section class="space-y-5">
            <div class="card">
              <div class="card-head"><div><p class="kicker">Açılış Kapısı</p><h2>Zorunlu kontrol listesi</h2></div><strong>{{ checklistCompleted() }}/{{ checklistRequired() }}</strong></div>
              <div class="mt-4 space-y-2">@for (item of workspace()?.checklist || []; track item.id) {<div class="check-row"><button type="button" (click)="toggleChecklist(item)" [disabled]="saving()" [attr.aria-label]="item.label + (item.completed_at ? ' tamamlandı, geri al' : ' tamamlandı olarak işaretle')" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" [class.bg-emerald-100]="item.completed_at" [class.text-emerald-700]="item.completed_at" [class.bg-slate-100]="!item.completed_at"><mat-icon aria-hidden="true">{{ item.completed_at ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon></button><div class="min-w-0"><strong>{{ item.label }}</strong><p>{{ item.checklist_key }}</p></div><span>{{ item.completed_at ? 'Tamam' : 'Bekliyor' }}</span></div>}</div>
              <div class="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-950">Aktivasyon yalnızca bu kutulara bağlı değil. Veritabanı ayrıca adres, telefon ve bütün zorunlu ağ kurallarının bayi tarafından kabul edilmiş olmasını kontrol eder.</div>
            </div>

            <div class="card"><p class="kicker">Bayi Erişimi</p><h2>Şube yetkilileri</h2><div class="mt-4 space-y-2">@for (member of workspace()?.members || []; track member.id) {<div class="rounded-xl bg-slate-50 p-3"><div class="font-black">{{ member.invited_email || member.user_id }}</div><div class="mt-1 text-xs font-bold text-slate-500">{{ member.role }}</div></div>} @empty {<p class="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">Henüz şube portalı yetkilisi yok.</p>}</div><div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><label><span class="field-label">Yetkili e-posta</span><input [(ngModel)]="inviteEmail" type="email" class="field" placeholder="bayi@ornek.com" /></label><label><span class="field-label">Rol</span><select [(ngModel)]="inviteRole" class="field"><option value="BRANCH_OWNER">Şube Sahibi</option><option value="BRANCH_MANAGER">Şube Yöneticisi</option><option value="BRANCH_EDITOR">İlan Editörü</option></select></label></div><button type="button" (click)="invite()" [disabled]="saving()" class="primary mt-3 w-full">Şube Portalı Daveti Gönder</button><p class="mt-2 text-xs leading-5 text-slate-500">Yeni kullanıcı e-posta davetiyle kendi şifresini oluşturur. Ana admin paneline erişim verilmez.</p></div>

            <div class="card"><p class="kicker">Fiyat Disiplini</p><h2>Şubeye özel fiyat kuralı</h2><div class="mt-4 grid gap-3 sm:grid-cols-2"><label><span class="field-label">Kategori</span><select [(ngModel)]="priceCategory" class="field"><option value="RENTAL">Kiralama</option><option value="SALE">Satış</option><option value="TOUR">Tur</option></select></label><label><span class="field-label">Araç sınıfı</span><input [(ngModel)]="vehicleClass" class="field" placeholder="* veya SUV" /></label><label><span class="field-label">Alt sınır</span><input [(ngModel)]="minPrice" type="number" min="0" class="field" /></label><label><span class="field-label">Önerilen fiyat</span><input [(ngModel)]="recommendedPrice" type="number" min="0" class="field" /></label><label><span class="field-label">Üst sınır</span><input [(ngModel)]="maxPrice" type="number" min="0" class="field" /></label><label class="flex min-h-12 items-center gap-2 self-end rounded-xl bg-slate-50 px-3 text-sm font-bold"><input [(ngModel)]="enforceMax" type="checkbox" class="h-5 w-5" />Üst sınırı zorunlu uygula</label></div><button type="button" (click)="savePrice()" [disabled]="saving()" class="primary mt-3 w-full">Fiyat Kuralını Kaydet</button><div class="mt-4 space-y-2">@for(rule of workspace()?.pricing || []; track rule.id){<div class="rounded-xl bg-slate-50 p-3 text-xs"><strong>{{ rule.category }} · {{ rule.vehicle_class }}</strong><p class="mt-1 text-slate-600">Alt: {{ rule.min_price ?? 'yok' }} · Önerilen: {{ rule.recommended_price ?? 'yok' }} · Üst: {{ rule.max_price ?? 'yok' }} {{ rule.branch_id ? ' · Şubeye özel' : ' · Merkezi' }}</p></div>}</div></div>
          </section>

          <section class="space-y-5">
            <div class="card"><div class="card-head"><div><p class="kicker">Ağ Kuralları</p><h2>Bayi kabul durumu</h2></div><strong>{{ acceptedPolicyCount() }}/{{ requiredPolicyCount() }}</strong></div><div class="mt-4 space-y-2">@for(policy of workspace()?.policies || []; track policy.id){<div class="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"><div><strong class="text-sm">{{ policy.title }}</strong><p class="mt-1 text-xs text-slate-500">{{ policy.category }} · v{{ policy.version }}</p></div><span [class.bg-emerald-100]="policyAccepted(policy.id)" [class.text-emerald-800]="policyAccepted(policy.id)" [class.bg-amber-100]="!policyAccepted(policy.id)" [class.text-amber-800]="!policyAccepted(policy.id)" class="rounded-full px-2 py-1 text-[10px] font-black">{{ policyAccepted(policy.id) ? 'Kabul' : 'Bekliyor' }}</span></div>}</div></div>

            <div class="card"><div class="card-head"><div><p class="kicker">Merkez Yayın Kuyruğu</p><h2>Şube araç ilanları</h2></div><span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">{{ pendingVehicleCount() }} bekliyor</span></div><div class="mt-4 space-y-3">@for(vehicle of workspace()?.vehicles || []; track vehicle.id){<article class="rounded-xl border border-slate-200 p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><span [class]="listingClass(vehicle.publication_status)" class="rounded-full px-2 py-1 text-[10px] font-black">{{ listingLabel(vehicle.publication_status) }}</span><h3 class="mt-2 font-black">{{ vehicle.brand }} {{ vehicle.model }}</h3><p class="mt-1 text-xs text-slate-500">{{ vehicle.category }} · {{ vehicle.model_year || 'Yıl yok' }} · {{ vehicle.body_type || 'Sınıf yok' }}</p></div><strong>{{ vehicle.category==='RENTAL' ? (vehicle.rental_price_daily ?? vehicle.price) : vehicle.price }} {{ vehicle.currency }}</strong></div>@if(vehicle.rejection_reason){<p class="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-800">{{ vehicle.rejection_reason }}</p>}<div class="mt-3 grid gap-2 sm:grid-cols-3"><button type="button" (click)="approveVehicle(vehicle.id)" [disabled]="saving()" class="approve">Onayla ve Yayınla</button><button type="button" (click)="rejectVehicle(vehicle.id)" [disabled]="saving()" class="reject">Düzeltme İste</button><button type="button" (click)="suspendVehicle(vehicle.id)" [disabled]="saving()" class="neutral">Yayından Kaldır</button></div></article>} @empty {<p class="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Bu şubeden henüz ilan gelmedi.</p>}</div></div>
          </section>
        </div>
      }
    </main>
  `,
  styles: [`
    .card{border:1px solid #e2e8f0;border-radius:18px;background:white;padding:1.15rem;box-shadow:0 5px 18px rgba(15,23,42,.04)}.card-head{display:flex;align-items:start;justify-content:space-between;gap:1rem}.card h2{margin-top:.15rem;font-size:1.1rem;font-weight:900}.kicker{font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#2563eb}.check-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:.65rem;border-radius:12px;background:#f8fafc;padding:.6rem}.check-row strong{font-size:.78rem}.check-row p{margin-top:.12rem;font-size:.62rem;color:#94a3b8}.check-row>span{font-size:.62rem;font-weight:900;color:#64748b}.field-label{display:block;margin-bottom:.35rem;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#64748b}.field{min-height:48px;width:100%;border:1px solid #cbd5e1;border-radius:12px;background:white;padding:0 .8rem;outline:none}.field:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}.primary,.success-action,.danger-action,.light-action,.approve,.reject,.neutral{display:flex;align-items:center;justify-content:center;border-radius:12px;font-weight:900}.primary{min-height:48px;background:#2563eb;padding:0 1rem;color:white}.success-action{min-height:44px;background:#059669;padding:0 1rem;color:white}.danger-action{min-height:44px;background:#be123c;padding:0 1rem;color:white}.light-action{min-height:44px;background:white;padding:0 1rem;color:#0f172a}.approve,.reject,.neutral{min-height:42px;padding:0 .7rem;font-size:.72rem}.approve{background:#ecfdf5;color:#047857}.reject{background:#fff1f2;color:#be123c}.neutral{background:#f1f5f9;color:#334155}
  `],
})
export class AdminBranchNetworkComponent implements OnInit {
  readonly service = inject(BranchNetworkAdminService);
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly branchId = signal("");
  readonly saving = signal(false);
  readonly error = signal("");

  inviteEmail = "";
  inviteRole: "BRANCH_OWNER" | "BRANCH_MANAGER" | "BRANCH_EDITOR" = "BRANCH_OWNER";
  priceCategory: "RENTAL" | "SALE" | "TOUR" = "RENTAL";
  vehicleClass = "*";
  minPrice: number | null = null;
  recommendedPrice: number | null = null;
  maxPrice: number | null = null;
  enforceMax = false;

  workspace = this.service.workspace;
  branch = () => this.workspace()?.branch || null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get("id") || "";
    this.branchId.set(id);
    if (!id) { this.error.set("Şube kimliği eksik."); return; }
    await this.reload();
  }

  async reload(): Promise<void> {
    this.error.set("");
    try { await this.service.load(this.branchId()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : "Şube ağı bilgileri yüklenemedi."); }
  }

  checklistRequired(): number { return (this.workspace()?.checklist || []).filter((item) => item.is_required !== false).length; }
  checklistCompleted(): number { return (this.workspace()?.checklist || []).filter((item) => item.is_required !== false && item.completed_at).length; }
  requiredPolicyCount(): number { return (this.workspace()?.policies || []).filter((item) => item.is_required !== false).length; }
  acceptedPolicyCount(): number { return (this.workspace()?.policies || []).filter((item) => item.is_required !== false && this.policyAccepted(item.id)).length; }
  pendingVehicleCount(): number { return (this.workspace()?.vehicles || []).filter((item) => item.publication_status === "PENDING_REVIEW").length; }
  policyAccepted(id: string): boolean { return (this.workspace()?.acceptances || []).some((item) => String(item.policy_rule_id) === String(id)); }

  async toggleChecklist(item: any): Promise<void> {
    await this.run(async () => this.service.setChecklist(this.branchId(), String(item.checklist_key), !item.completed_at, String(item.notes || "")), item.completed_at ? "Kontrol maddesi geri alındı." : "Kontrol maddesi tamamlandı.");
  }

  async invite(): Promise<void> {
    if (!this.inviteEmail.trim()) { this.toast.show("Yetkili e-posta adresini girin.", "error"); return; }
    await this.run(async () => { const result = await this.service.inviteMember(this.branchId(), this.inviteEmail, this.inviteRole); this.inviteEmail = ""; return result; }, "Şube portalı yetkisi kaydedildi. Yeni kullanıcıysa davet e-postası gönderildi.");
  }

  async savePrice(): Promise<void> {
    await this.run(async () => this.service.setPricing(this.branchId(), this.priceCategory, { vehicleClass: this.vehicleClass || "*", minPrice: this.minPrice, recommendedPrice: this.recommendedPrice, maxPrice: this.maxPrice, enforceMin: true, enforceMax: this.enforceMax }), "Şube fiyat kuralı kaydedildi.");
  }

  async activate(): Promise<void> {
    await this.run(async () => this.service.activate(this.branchId()), "Şube bütün güvenlik kapılarını geçti ve canlıya alındı.", true);
  }

  async suspend(): Promise<void> {
    await this.run(async () => this.service.suspend(this.branchId()), "Şube ve bağlı halka açık içerikler durduruldu.");
  }

  async approveVehicle(vehicleId: string): Promise<void> {
    await this.run(async () => this.service.moderateVehicle(this.branchId(), vehicleId, "APPROVE"), "İlan merkez tarafından onaylandı.");
  }

  async rejectVehicle(vehicleId: string): Promise<void> {
    const reason = typeof window !== "undefined" ? window.prompt("Bayinin düzeltmesi gereken noktayı açıkça yazın:", "") || "" : "";
    if (!reason.trim()) return;
    await this.run(async () => this.service.moderateVehicle(this.branchId(), vehicleId, "REJECT", reason), "İlan düzeltme notuyla bayiye geri gönderildi.");
  }

  async suspendVehicle(vehicleId: string): Promise<void> {
    const reason = typeof window !== "undefined" ? window.prompt("Yayından kaldırma nedenini yazın:", "Merkezi yayın standardı") || "" : "";
    if (!reason.trim()) return;
    await this.run(async () => this.service.moderateVehicle(this.branchId(), vehicleId, "SUSPEND", reason), "İlan yayından kaldırıldı.");
  }

  statusLabel(status: string): string { return ({ DRAFT:"Kurulum Aşamasında", ACTIVE:"Canlı", SUSPENDED:"Durduruldu", CLOSED:"Kapalı" } as Record<string,string>)[status] || status; }
  statusClass(status: string): string { if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-300"; if (status === "SUSPENDED" || status === "CLOSED") return "bg-rose-500/15 text-rose-300"; return "bg-amber-500/15 text-amber-300"; }
  listingLabel(status: string): string { return ({ DRAFT:"Taslak", PENDING_REVIEW:"Onay Bekliyor", PUBLISHED:"Canlı", REJECTED:"Düzeltme", SUSPENDED:"Durduruldu", ARCHIVED:"Arşiv" } as Record<string,string>)[status] || status; }
  listingClass(status: string): string { if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800"; if (status === "PENDING_REVIEW") return "bg-blue-100 text-blue-800"; if (status === "REJECTED" || status === "SUSPENDED") return "bg-rose-100 text-rose-800"; return "bg-slate-100 text-slate-700"; }

  private async run<T>(action: () => Promise<T>, success: string, activation = false): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try { await action(); this.toast.show(success, "success"); }
    catch (error) {
      const code = error instanceof Error ? error.message : "BRANCH_ACTION_FAILED";
      const message = code === "BRANCH_SETUP_INCOMPLETE" ? "Şube açılamaz. Zorunlu açılış kontrol listesinde eksikler var." : code === "BRANCH_REQUIRED_POLICIES_NOT_ACCEPTED" ? "Şube açılamaz. Bayi zorunlu ağ kurallarının tamamını henüz kabul etmedi." : code === "BRANCH_ADDRESS_PHONE_REQUIRED" ? "Şube açılamaz. Gerçek adres ve telefon bilgisi eksik." : code === "INVITE_REDIRECT_NOT_ALLOWED" ? "Davet yönlendirme adresi Supabase Auth izin listesinde değil. Site URL ayarını kontrol edin." : activation ? "Şube aktivasyon güvenlik kapısından geçemedi." : "İşlem tamamlanamadı.";
      this.toast.show(message, "error");
    } finally { this.saving.set(false); }
  }
}
