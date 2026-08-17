import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { AdminManagementService } from "../../services/admin-management.service";
import {
  AssignmentCenterService,
  AssignmentSnapshot,
  StaffBranchAssignmentRecord,
  TourStaffAssignmentRecord,
  VehicleStaffAssignmentRecord,
} from "../../services/assignment-center.service";
import { CarService } from "../../services/car.service";
import { ConfirmService } from "../../services/confirm.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-assignment-center",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Operasyon kontrolü</p>
          <div class="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Görev ve Sorumluluk Merkezi</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Çalışanların şube, araç ve tur sorumluluklarını tek ekranda görün. Eski veya yanlış görevlendirmeleri güvenli biçimde kaldırın.
              </p>
            </div>

          </div>
        </header>

        <section class="sticky top-16 z-40 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end" aria-label="Görev merkezi hızlı işlemleri">
          <a routerLink="/admin/team" class="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-black text-white"><mat-icon aria-hidden="true">add_task</mat-icon>Yeni Görev Ata</a>
          <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-black text-slate-950 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Yenile' }}</button>
        </section>

        <section class="grid gap-3 sm:grid-cols-3">
          <article class="metric"><span>Şube ataması</span><strong>{{ snapshot().branches.length }}</strong></article>
          <article class="metric"><span>Araç sorumluluğu</span><strong>{{ snapshot().vehicles.length }}</strong></article>
          <article class="metric"><span>Tur görevlendirmesi</span><strong>{{ snapshot().tours.length }}</strong></article>
        </section>

        @if (error()) {
          <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div>
        }

        <section class="grid gap-6 xl:grid-cols-3">
          <article class="panel">
            <header class="panel-title"><div><p>ŞUBE</p><h2>Çalışan Şubeleri</h2></div><mat-icon aria-hidden="true">storefront</mat-icon></header>
            <div class="space-y-3 p-4">
              @for (item of snapshot().branches; track item.staffId + ':' + item.branchId) {
                <div class="assignment-card">
                  <div class="min-w-0 flex-1">
                    <strong>{{ staffName(item.staffId) }}</strong>
                    <span>{{ branchName(item.branchId) }}</span>
                    @if (item.isPrimary) { <small class="badge">ANA ŞUBE</small> }
                  </div>
                  <button type="button" (click)="removeBranch(item)" class="remove-btn" aria-label="Şube atamasını kaldır"><mat-icon aria-hidden="true">link_off</mat-icon></button>
                </div>
              } @empty { <div class="empty">Aktif şube görevlendirmesi yok.</div> }
            </div>
          </article>

          <article class="panel">
            <header class="panel-title"><div><p>ARAÇ</p><h2>Araç Sorumluları</h2></div><mat-icon aria-hidden="true">directions_car</mat-icon></header>
            <div class="space-y-3 p-4">
              @for (item of snapshot().vehicles; track item.vehicleId + ':' + item.staffId + ':' + item.responsibility) {
                <div class="assignment-card">
                  <div class="min-w-0 flex-1">
                    <strong>{{ staffName(item.staffId) }}</strong>
                    <span>{{ vehicleName(item.vehicleId) }}</span>
                    <small class="badge">{{ vehicleRoleLabel(item.responsibility) }}</small>
                  </div>
                  <button type="button" (click)="removeVehicle(item)" class="remove-btn" aria-label="Araç sorumluluğunu kaldır"><mat-icon aria-hidden="true">link_off</mat-icon></button>
                </div>
              } @empty { <div class="empty">Aktif araç sorumluluğu yok.</div> }
            </div>
          </article>

          <article class="panel">
            <header class="panel-title"><div><p>TUR</p><h2>Tur Ekibi</h2></div><mat-icon aria-hidden="true">explore</mat-icon></header>
            <div class="space-y-3 p-4">
              @for (item of snapshot().tours; track item.tourId + ':' + item.staffId + ':' + item.responsibility) {
                <div class="assignment-card">
                  <div class="min-w-0 flex-1">
                    <strong>{{ staffName(item.staffId) }}</strong>
                    <span>{{ tourName(item.tourId) }}</span>
                    <small class="badge">{{ tourRoleLabel(item.responsibility) }}</small>
                  </div>
                  <button type="button" (click)="removeTour(item)" class="remove-btn" aria-label="Tur görevlendirmesini kaldır"><mat-icon aria-hidden="true">link_off</mat-icon></button>
                </div>
              } @empty { <div class="empty">Aktif tur görevlendirmesi yok.</div> }
            </div>
          </article>
        </section>

        <section class="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-relaxed text-blue-950">
          <strong class="block font-black">Yönetim ilkesi</strong>
          Bir çalışanı pasifleştirmek görev kayıtlarını otomatik silmez. Bu ekran eski ilişkileri görünür tutar; böylece görev devri kontrollü yapılır ve geçmiş bağlantılar yanlışlıkla kaybolmaz.
        </section>
      </div>
    </main>
  `,
  styles: [`
    .metric{display:flex;min-height:110px;flex-direction:column;justify-content:space-between;border:1px solid rgb(226 232 240);border-radius:24px;background:white;padding:20px;box-shadow:0 8px 26px rgb(15 23 42/.05)}.metric span{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:rgb(100 116 139)}.metric strong{font-size:2rem;font-weight:900;color:rgb(15 23 42)}
    .panel{overflow:hidden;border:1px solid rgb(226 232 240);border-radius:28px;background:white;box-shadow:0 10px 30px rgb(15 23 42/.06)}.panel-title{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgb(241 245 249);padding:18px 20px}.panel-title p{font-size:.62rem;font-weight:900;letter-spacing:.16em;color:rgb(37 99 235)}.panel-title h2{margin-top:2px;font-size:1.05rem;font-weight:900;color:rgb(15 23 42)}.panel-title mat-icon{color:rgb(37 99 235)}
    .assignment-card{display:flex;align-items:center;gap:12px;border:1px solid rgb(226 232 240);border-radius:18px;padding:14px}.assignment-card strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;font-weight:900;color:rgb(15 23 42)}.assignment-card span{margin-top:2px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.75rem;color:rgb(100 116 139)}.badge{margin-top:8px;display:inline-flex;border-radius:999px;background:rgb(239 246 255);padding:4px 8px;font-size:.58rem;font-weight:900;letter-spacing:.08em;color:rgb(29 78 216)}.remove-btn{display:flex;min-height:44px;min-width:44px;align-items:center;justify-content:center;border-radius:14px;background:rgb(255 241 242);color:rgb(190 18 60)}.remove-btn:focus-visible{outline:2px solid rgb(225 29 72);outline-offset:2px}.empty{border:1px dashed rgb(203 213 225);border-radius:18px;padding:28px 16px;text-align:center;font-size:.8rem;color:rgb(100 116 139)}
  `],
})
export class AdminAssignmentCenterComponent implements OnInit {
  private readonly assignments = inject(AssignmentCenterService);
  private readonly management = inject(AdminManagementService);
  private readonly cars = inject(CarService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal("");
  readonly snapshot = signal<AssignmentSnapshot>({ branches: [], vehicles: [], tours: [] });

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set("");
    try {
      await this.management.refreshPeople();
      this.snapshot.set(await this.assignments.load());
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  staffName(id: string): string { return this.management.staff().find((row) => row.id === id)?.displayName || `Çalışan ${id.slice(0, 8)}`; }
  branchName(id: string): string { return this.management.branches().find((row) => row.id === id)?.name || `Şube ${id.slice(0, 8)}`; }
  vehicleName(id: string): string {
    const row = this.cars.getAllVehicles()().find((item) => item.cloudId === id);
    return row ? `${row.year || ''} ${row.brand || ''} ${row.model || ''}`.replace(/\s+/g, " ").trim() : `Araç ${id.slice(0, 8)}`;
  }
  tourName(id: string): string { return this.cars.getTours()().find((item) => item.cloudId === id)?.title || `Tur ${id.slice(0, 8)}`; }

  vehicleRoleLabel(value: string): string { return ({ RESPONSIBLE: "GENEL SORUMLU", SALES: "SATIŞ", FLEET: "FİLO", DELIVERY: "TESLİMAT", MAINTENANCE: "BAKIM" } as Record<string,string>)[value] || value; }
  tourRoleLabel(value: string): string { return ({ COORDINATOR: "KOORDİNATÖR", GUIDE: "REHBER", DRIVER: "ŞOFÖR", CONTENT: "İÇERİK" } as Record<string,string>)[value] || value; }

  async removeBranch(item: StaffBranchAssignmentRecord): Promise<void> {
    const ok = await this.confirm.confirm({ title: "Şube görevini kaldır", message: `${this.staffName(item.staffId)} için ${this.branchName(item.branchId)} bağlantısı kaldırılsın mı?`, confirmText: "Görevi Kaldır" });
    if (!ok) return;
    try { await this.assignments.removeBranch(item.staffId, item.branchId); await this.refresh(); this.toast.show("Şube görevi kaldırıldı.", "success"); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async removeVehicle(item: VehicleStaffAssignmentRecord): Promise<void> {
    const ok = await this.confirm.confirm({ title: "Araç sorumluluğunu kaldır", message: `${this.staffName(item.staffId)} için ${this.vehicleName(item.vehicleId)} görevi kaldırılsın mı?`, confirmText: "Görevi Kaldır" });
    if (!ok) return;
    try { await this.assignments.removeVehicle(item.vehicleId, item.staffId, item.responsibility); await this.refresh(); this.toast.show("Araç sorumluluğu kaldırıldı.", "success"); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async removeTour(item: TourStaffAssignmentRecord): Promise<void> {
    const ok = await this.confirm.confirm({ title: "Tur görevini kaldır", message: `${this.staffName(item.staffId)} için ${this.tourName(item.tourId)} görevi kaldırılsın mı?`, confirmText: "Görevi Kaldır" });
    if (!ok) return;
    try { await this.assignments.removeTour(item.tourId, item.staffId, item.responsibility); await this.refresh(); this.toast.show("Tur görevlendirmesi kaldırıldı.", "success"); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : "Görev verisi alınamadı."; }
}
