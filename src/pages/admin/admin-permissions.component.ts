import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AdminManagementService, AdminUserRecord } from "../../services/admin-management.service";
import { ToastService } from "../../services/toast.service";

interface PermissionOption {
  key: "content.manage" | "operations.manage" | "team.manage" | "settings.manage" | "finance.read";
  title: string;
  description: string;
}

@Component({
  selector: "app-admin-permissions",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-full bg-slate-100 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Rol tabanlı erişim</p>
          <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Yönetici Yetki Matrisi</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Her yönetici için rol, ana şube ve ek yetkileri ayrı ayrı yönetin. Owner ve Admin rolleri sistem seviyesinde geniş erişime sahiptir. Editör ve Destek rollerine yalnız ihtiyaç duydukları ek yetkileri verin.</p>
            </div>
            <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Veriyi Yenile' }}</button>
          </div>
        </header>

        <section class="grid gap-3 md:grid-cols-5" aria-label="Yetki açıklamaları">
          @for(option of permissionOptions; track option.key){
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 class="text-sm font-black text-slate-900">{{ option.title }}</h2><p class="mt-1 text-xs leading-relaxed text-slate-500">{{ option.description }}</p></article>
          }
        </section>

        <section class="space-y-4" aria-label="Panel kullanıcıları">
          @for(admin of admins(); track admin.userId){
            <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" [class.opacity-60]="!admin.isActive">
              <div class="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:p-6">
                <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">{{ initials(admin.displayName || admin.email) }}</div>
                <div class="min-w-0 flex-1"><h2 class="truncate text-lg font-black text-slate-900">{{ admin.displayName || admin.email }}</h2><p class="truncate text-sm text-slate-500">{{ admin.email }}</p></div>
                <div class="grid gap-2 sm:grid-cols-3 md:w-[520px]">
                  <label><span class="field-label">Rol</span><select [(ngModel)]="admin.role" class="field"><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editör</option><option value="support">Destek</option></select></label>
                  <label><span class="field-label">Ana şube</span><select [(ngModel)]="admin.primaryBranchId" class="field"><option [ngValue]="undefined">Şubesiz</option>@for(branch of branches(); track branch.id){<option [ngValue]="branch.id">{{ branch.name }}</option>}</select></label>
                  <label class="mt-5 flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-black"><input type="checkbox" [(ngModel)]="admin.isActive" class="h-5 w-5" />Aktif hesap</label>
                </div>
              </div>

              <div class="grid gap-3 p-5 md:grid-cols-5 md:p-6">
                @for(option of permissionOptions; track option.key){
                  <label class="group flex min-h-24 cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-colors" [class.border-blue-300]="permission(admin,option.key)" [class.bg-blue-50]="permission(admin,option.key)" [class.border-slate-200]="!permission(admin,option.key)" [class.bg-slate-50]="!permission(admin,option.key)">
                    <span class="flex items-start justify-between gap-2"><strong class="text-sm text-slate-900">{{ option.title }}</strong><input type="checkbox" [checked]="permission(admin,option.key)" (change)="setPermission(admin,option.key,$event)" class="h-5 w-5 shrink-0 accent-blue-600" /></span><small class="mt-2 text-[11px] leading-relaxed text-slate-500">{{ permissionHint(admin,option.key) }}</small>
                  </label>
                }
              </div>

              <div class="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p class="text-xs text-slate-500">Son aktif owner hesabı sistem tarafından korunur ve yanlışlıkla pasifleştirilemez.</p>
                <button type="button" (click)="save(admin)" [disabled]="savingUserId()===admin.userId" class="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50">{{ savingUserId()===admin.userId ? 'Kaydediliyor…' : 'Yetkileri Kaydet' }}</button>
              </div>
            </article>
          } @empty {
            <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 class="font-black text-slate-900">Henüz yönetici hesabı yok</h2><p class="mt-2 text-sm text-slate-500">İlk owner hesabını Yönetici Girişi ekranındaki ilk kurulum akışıyla oluşturduktan sonra yetki matrisi burada açılır.</p></div>
          }
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field-label{display:block;margin-bottom:.35rem;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.field{min-height:44px;width:100%;border:1px solid #cbd5e1;border-radius:.75rem;background:white;padding:.55rem .7rem;font-size:.82rem;font-weight:700;outline:none}.field:focus{border-color:#2563eb;box-shadow:0 0 0 2px rgb(37 99 235/.14)}
  `],
})
export class AdminPermissionsComponent implements OnInit {
  private readonly management = inject(AdminManagementService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);
  readonly savingUserId = signal("");
  readonly admins = this.management.admins;
  readonly branches = this.management.branches;
  readonly activeBranchCount = computed(() => this.branches().filter((branch) => branch.isActive).length);

  readonly permissionOptions: PermissionOption[] = [
    { key: "content.manage", title: "İçerik", description: "Araç, tur, medya, kampanya ve ana sayfa yönetimi." },
    { key: "operations.manage", title: "Operasyon", description: "Rezervasyon, mesaj ve partner taleplerini yönetme." },
    { key: "team.manage", title: "Ekip", description: "Çalışan, şube ve görevlendirmeleri yönetme." },
    { key: "settings.manage", title: "Ayarlar", description: "Site ayarları ve yapılandırma alanlarını yönetme." },
    { key: "finance.read", title: "Finans", description: "Ödeme ve finansal kayıtları görüntüleme." },
  ];

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try { await this.management.refreshPeople(); }
    catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.loading.set(false); }
  }

  permission(admin: AdminUserRecord, key: PermissionOption["key"]): boolean { return admin.permissions?.[key] === true; }

  setPermission(admin: AdminUserRecord, key: PermissionOption["key"], event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    admin.permissions = { ...(admin.permissions || {}), [key]: checked };
  }

  permissionHint(admin: AdminUserRecord, key: PermissionOption["key"]): string {
    if (admin.role === "owner") return "Owner rolü bu alanda zaten tam yetkilidir.";
    if (admin.role === "admin" && key !== "finance.read") return "Admin rolü bu alanda zaten tam yetkilidir.";
    if (admin.role === "editor" && key === "content.manage") return "Editör rolünde içerik erişimi zaten vardır.";
    if (admin.role === "support" && key === "operations.manage") return "Destek rolünde operasyon erişimi zaten vardır.";
    return this.permission(admin,key) ? "Ek yetki açık." : "Ek yetki kapalı.";
  }

  async save(admin: AdminUserRecord): Promise<void> {
    this.savingUserId.set(admin.userId);
    try {
      await this.management.updateAdmin(admin.userId, { role: admin.role, isActive: admin.isActive, primaryBranchId: admin.primaryBranchId, permissions: admin.permissions || {} });
      this.toast.show("Yönetici rolü ve yetkileri kaydedildi.", "success");
    } catch (error) {
      await this.refresh();
      this.toast.show(this.message(error), "error");
    } finally { this.savingUserId.set(""); }
  }

  initials(value: string): string { return value.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "").join("") || "AA"; }
  private message(error: unknown): string { const code=error instanceof Error?error.message:"İşlem tamamlanamadı."; if(code==="OWNER_REQUIRED") return "Bu işlem yalnız owner hesabıyla yapılabilir."; if(code==="LAST_ACTIVE_OWNER_PROTECTED") return "Son aktif owner hesabı pasifleştirilemez veya rolü düşürülemez."; return code; }
}
