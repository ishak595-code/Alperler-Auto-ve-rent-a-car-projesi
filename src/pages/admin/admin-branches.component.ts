import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { Branch, BranchServiceType } from "../../models/branch.model";
import { BranchService } from "../../services/branch.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-branches",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-100 pb-20 text-slate-900">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <button type="button" (click)="router.navigate(['/admin/dashboard'])" aria-label="Kontrol paneline dön" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div class="min-w-0">
              <h1 class="truncate text-xl font-black">Şube Yönetimi</h1>
              <p class="text-xs text-slate-500">Şube ve teslimat noktalarını merkezi olarak yönetin</p>
            </div>
          </div>
          <button type="button" (click)="newBranch()" class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <mat-icon>add</mat-icon><span class="hidden sm:inline">Yeni Şube</span>
          </button>
        </div>
      </header>

      <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
        <section class="space-y-3" aria-label="Şube listesi">
          @for (branch of branchService.branches(); track branch.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-xs font-bold uppercase tracking-wider text-blue-700">{{ branch.city }} / {{ branch.district }}</div>
                  <h2 class="mt-1 text-lg font-black">{{ branch.name }}</h2>
                  <p class="mt-2 text-sm text-slate-600">{{ branch.addressLabel }}</p>
                  <p class="mt-1 text-sm font-bold">{{ branch.phone }}</p>
                </div>
                <span class="rounded-full px-3 py-1 text-xs font-black" [class.bg-emerald-100]="branch.isActive" [class.text-emerald-800]="branch.isActive" [class.bg-slate-200]="!branch.isActive" [class.text-slate-600]="!branch.isActive">{{ branch.isActive ? 'Aktif' : 'Pasif' }}</span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                @for (service of branch.services; track service) {
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{{ serviceLabel(service) }}</span>
                }
              </div>

              <div class="mt-5 grid grid-cols-2 gap-2">
                <button type="button" (click)="editBranch(branch)" class="min-h-11 rounded-xl border border-slate-300 px-3 font-black hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Düzenle</button>
                <button type="button" (click)="toggleActive(branch)" [disabled]="saving()" class="min-h-11 rounded-xl bg-slate-900 px-3 font-black text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ branch.isActive ? 'Pasife Al' : 'Aktifleştir' }}</button>
              </div>
            </article>
          }
        </section>

        <section class="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24" aria-label="Şube düzenleme formu">
          <div class="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-black">{{ isNew() ? 'Yeni Şube' : 'Şubeyi Düzenle' }}</h2>
              <p class="text-xs text-slate-500">Zorunlu bilgileri eksiksiz girin</p>
            </div>
            <mat-icon class="text-slate-400">storefront</mat-icon>
          </div>

          <div class="space-y-4">
            <label class="block"><span class="field-label">Şube Kimliği</span><input [(ngModel)]="draft.id" [disabled]="!isNew()" class="field" placeholder="ornek-subesi" /></label>
            <label class="block"><span class="field-label">Şube Adı</span><input [(ngModel)]="draft.name" class="field" placeholder="Yüksekova Merkez" /></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="field-label">Şehir</span><input [(ngModel)]="draft.city" class="field" /></label>
              <label class="block"><span class="field-label">İlçe</span><input [(ngModel)]="draft.district" class="field" /></label>
            </div>
            <label class="block"><span class="field-label">Adres</span><textarea [(ngModel)]="draft.addressLabel" rows="3" class="field"></textarea></label>
            <label class="block"><span class="field-label">Telefon</span><input [(ngModel)]="draft.phone" type="tel" class="field" /></label>
            <label class="block"><span class="field-label">WhatsApp</span><input [(ngModel)]="draft.whatsapp" type="tel" class="field" /></label>
            <label class="block"><span class="field-label">E-posta</span><input [(ngModel)]="draft.email" type="email" class="field" /></label>
            <label class="block"><span class="field-label">Harita URL'si</span><input [(ngModel)]="draft.mapUrl" type="url" class="field" placeholder="Gerçek harita bağlantısı varsa ekleyin" /></label>
            <label class="block"><span class="field-label">Öncelik</span><input [(ngModel)]="draft.priority" type="number" min="0" max="9999" class="field" /></label>

            <fieldset class="rounded-xl border border-slate-200 p-4">
              <legend class="px-1 text-xs font-black uppercase tracking-wider text-slate-500">Hizmetler</legend>
              <div class="grid grid-cols-2 gap-2 pt-2">
                @for (service of serviceOptions; track service) {
                  <label class="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-bold">
                    <input type="checkbox" [checked]="hasService(service)" (change)="toggleService(service, $event)" class="h-5 w-5" />
                    {{ serviceLabel(service) }}
                  </label>
                }
              </div>
            </fieldset>

            <div class="grid gap-2 sm:grid-cols-3">
              <label class="check-row"><input type="checkbox" [(ngModel)]="draft.isActive" />Aktif</label>
              <label class="check-row"><input type="checkbox" [(ngModel)]="draft.isPickupPoint" />Teslim Alma</label>
              <label class="check-row"><input type="checkbox" [(ngModel)]="draft.isReturnPoint" />İade</label>
            </div>

            @if (errorMessage()) {
              <div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{{ errorMessage() }}</div>
            }

            <button type="button" (click)="save()" [disabled]="saving()" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              @if (saving()) { <mat-icon class="animate-spin">progress_activity</mat-icon> Kaydediliyor... }
              @else { <mat-icon>save</mat-icon> Şubeyi Kaydet }
            </button>
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field-label{display:block;margin-bottom:.4rem;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.field{min-height:48px;width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.75rem 1rem;outline:none;background:white}.field:focus{box-shadow:0 0 0 2px #3b82f6;border-color:#3b82f6}.check-row{display:flex;min-height:48px;align-items:center;gap:.5rem;border-radius:.75rem;background:#f8fafc;padding:0 .75rem;font-size:.8rem;font-weight:800}.check-row input{width:20px;height:20px}
  `],
})
export class AdminBranchesComponent {
  readonly branchService = inject(BranchService);
  readonly toastService = inject(ToastService);
  readonly router = inject(Router);
  readonly saving = signal(false);
  readonly isNew = signal(true);
  readonly errorMessage = signal("");
  readonly serviceOptions: BranchServiceType[] = ["RENTAL", "SALES", "TOUR", "TRANSFER", "PICKUP", "RETURN"];

  draft: Branch = this.emptyBranch();

  newBranch(): void {
    this.isNew.set(true);
    this.errorMessage.set("");
    this.draft = this.emptyBranch();
  }

  editBranch(branch: Branch): void {
    this.isNew.set(false);
    this.errorMessage.set("");
    this.draft = this.clone(branch);
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set("");
    try {
      await this.branchService.save(this.clone(this.draft));
      this.toastService.show("Şube kaydı buluta gönderildi.", "success");
      this.isNew.set(false);
    } catch (error) {
      console.error("Branch save failed", error);
      this.errorMessage.set("Şube kaydedilemedi. Alanları ve yönetici Firestore izinlerini kontrol edin.");
      this.toastService.show("Şube kaydedilemedi.", "error");
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(branch: Branch): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.branchService.save({ ...this.clone(branch), isActive: !branch.isActive });
      this.toastService.show(branch.isActive ? "Şube pasife alındı." : "Şube aktifleştirildi.", "success");
    } catch (error) {
      console.error("Branch status update failed", error);
      this.toastService.show("Şube durumu değiştirilemedi.", "error");
    } finally {
      this.saving.set(false);
    }
  }

  hasService(service: BranchServiceType): boolean {
    return this.draft.services.includes(service);
  }

  toggleService(service: BranchServiceType, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draft.services = checked
      ? Array.from(new Set([...this.draft.services, service]))
      : this.draft.services.filter((current) => current !== service);
  }

  serviceLabel(service: BranchServiceType): string {
    return ({ RENTAL: "Kiralama", SALES: "Satış", TOUR: "Tur", TRANSFER: "Transfer", PICKUP: "Teslim Alma", RETURN: "İade" } as Record<BranchServiceType, string>)[service];
  }

  private emptyBranch(): Branch {
    return {
      id: "",
      name: "",
      city: "Hakkari",
      district: "Yüksekova",
      addressLabel: "",
      phone: "",
      whatsapp: "",
      email: "",
      mapUrl: "",
      workingHours: [{ label: "Çalışma saatleri", value: "" }],
      services: ["RENTAL", "PICKUP", "RETURN"],
      isActive: true,
      isPickupPoint: true,
      isReturnPoint: true,
      priority: 10,
    };
  }

  private clone(branch: Branch): Branch {
    return {
      ...branch,
      services: [...branch.services],
      workingHours: branch.workingHours.map((row) => ({ ...row })),
    };
  }
}
