import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import {
  AdminManagementService,
  AdminUserRecord,
  BranchRecord,
  StaffProfile,
} from "../../services/admin-management.service";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-team",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Organizasyon ve erişim</p>
          <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Ekip, Yetkiler ve Şubeler</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Yönetici erişimi Auth üzerinden, çalışan ve görevlendirmeler ise Supabase veritabanından yönetilir. Yönetici davetleri owner yetkisi gerektirir.</p>
            </div>

          </div>
        </header>

        <section class="sticky top-16 z-40 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur" aria-label="Ekip hızlı işlemleri">
          <div class="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto]">
            @if (tab() !== 'assignments') {
              <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" type="search" autocomplete="off" [placeholder]="teamSearchPlaceholder()" aria-label="Ekip yönetimi kayıtlarında ara" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500" />
            } @else {
              <div class="hidden sm:block"></div>
            }
            <button type="button" (click)="startNewForCurrentTab()" class="min-h-12 rounded-xl bg-blue-600 px-5 text-sm font-black text-white">+ {{ newActionLabel() }}</button>
            <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Yenile' }}</button>
          </div>
        </section>

        <nav class="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4" aria-label="Ekip yönetimi bölümleri">
          <button type="button" (click)="tab.set('admins')" [class.bg-slate-950]="tab()==='admins'" [class.text-white]="tab()==='admins'" class="min-h-12 rounded-xl px-3 font-black">Yöneticiler</button>
          <button type="button" (click)="tab.set('staff')" [class.bg-slate-950]="tab()==='staff'" [class.text-white]="tab()==='staff'" class="min-h-12 rounded-xl px-3 font-black">Çalışanlar</button>
          <button type="button" (click)="tab.set('branches')" [class.bg-slate-950]="tab()==='branches'" [class.text-white]="tab()==='branches'" class="min-h-12 rounded-xl px-3 font-black">Şubeler</button>
          <button type="button" (click)="tab.set('assignments')" [class.bg-slate-950]="tab()==='assignments'" [class.text-white]="tab()==='assignments'" class="min-h-12 rounded-xl px-3 font-black">Görevlendirme</button>
        </nav>

        @if (tab()==='admins') {
          <section class="grid gap-5 xl:grid-cols-[390px_1fr]">
            <form id="team-admin-form" (ngSubmit)="inviteAdmin()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <h2 class="text-xl font-black text-slate-900">Yeni Yönetici Davet Et</h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">Davet e-postası Supabase Auth tarafından gönderilir.</p>
              <div class="mt-5 space-y-4">
                <label class="field"><span>Ad soyad</span><input [(ngModel)]="adminName" name="adminName" maxlength="160" required /></label>
                <label class="field"><span>E-posta</span><input [(ngModel)]="adminEmail" name="adminEmail" type="email" autocomplete="email" required /></label>
                <label class="field"><span>Rol</span><select [(ngModel)]="adminRole" name="adminRole"><option value="admin">Yönetici</option><option value="editor">Editör</option><option value="support">Destek</option><option value="owner">Owner</option></select></label>
                <label class="field"><span>Ana şube</span><select [(ngModel)]="adminBranchId" name="adminBranchId"><option value="">Şube yok</option>@for (branch of branches(); track branch.id) { <option [value]="branch.id">{{ branch.name }}</option> }</select></label>
                <button type="submit" [disabled]="saving() || !adminName.trim() || !adminEmail.trim()" class="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-40">Davet Gönder</button>
              </div>
            </form>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div class="flex items-center justify-between"><div><h2 class="text-xl font-black text-slate-900">Panel Kullanıcıları</h2><p class="text-xs text-slate-500">{{ admins().length }} yetkili hesap</p></div></div>
              <div class="mt-5 space-y-3">
                @for (admin of filteredAdmins(); track admin.userId) {
                  <article class="rounded-2xl border border-slate-200 p-4" [class.opacity-50]="!admin.isActive">
                    <div class="flex flex-col gap-4 md:flex-row md:items-center">
                      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-black text-white">{{ initials(admin.displayName || admin.email) }}</div>
                      <div class="min-w-0 flex-1"><strong class="block truncate text-slate-900">{{ admin.displayName || admin.email }}</strong><span class="block truncate text-sm text-slate-500">{{ admin.email }}</span></div>
                      <div class="grid gap-2 sm:grid-cols-3 md:w-[430px]">
                        <select [(ngModel)]="admin.role" (change)="saveAdmin(admin)" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="owner">Owner</option><option value="admin">Admin</option><option value="editor">Editör</option><option value="support">Destek</option></select>
                        <select [(ngModel)]="admin.primaryBranchId" (change)="saveAdmin(admin)" class="min-h-11 rounded-xl border border-slate-200 px-3 text-sm"><option [ngValue]="undefined">Şubesiz</option>@for (branch of branches(); track branch.id) { <option [ngValue]="branch.id">{{ branch.name }}</option> }</select>
                        <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="admin.isActive" (change)="saveAdmin(admin)" /> Aktif</label>
                      </div>
                    </div>
                  </article>
                } @empty { <div class="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">Owner hesabı ilk girişte oluşturulduktan sonra burada görünür.</div> }
              </div>
            </div>
          </section>
        }

        @if (tab()==='staff') {
          <section class="grid gap-5 xl:grid-cols-[390px_1fr]">
            <form id="team-staff-form" (ngSubmit)="saveStaff()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div class="flex items-center justify-between"><h2 class="text-xl font-black text-slate-900">{{ editingStaffId ? 'Çalışanı Düzenle' : 'Çalışan Ekle' }}</h2>@if (editingStaffId) { <button type="button" (click)="resetStaffForm()" class="text-sm font-bold text-blue-600">Yeni kayıt</button> }</div>
              <div class="mt-5 space-y-4">
                <label class="field"><span>Ad soyad</span><input [(ngModel)]="staffName" name="staffName" required /></label>
                <label class="field"><span>Görev unvanı</span><input [(ngModel)]="staffTitle" name="staffTitle" placeholder="Satış Danışmanı, Tur Rehberi…" /></label>
                <label class="field"><span>Departman</span><select [(ngModel)]="staffDepartment" name="staffDepartment"><option value="MANAGEMENT">Yönetim</option><option value="SALES">Satış</option><option value="RENTAL">Kiralama</option><option value="FLEET">Filo</option><option value="TOURS">Turlar</option><option value="CONTENT">İçerik</option><option value="SUPPORT">Destek</option><option value="GENERAL">Genel</option></select></label>
                <label class="field"><span>E-posta</span><input [(ngModel)]="staffEmail" name="staffEmail" type="email" /></label>
                <label class="field"><span>Telefon</span><input [(ngModel)]="staffPhone" name="staffPhone" type="tel" /></label>
                <button type="submit" [disabled]="saving() || !staffName.trim()" class="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-40">Kaydet</button>
              </div>
            </form>
            <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              @for (staff of filteredStaff(); track staff.id) {
                <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" [class.opacity-50]="!staff.isActive">
                  <div class="flex items-start justify-between gap-3"><div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 font-black text-blue-700">{{ initials(staff.displayName) }}</div><span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">{{ staff.department }}</span></div>
                  <h3 class="mt-4 text-lg font-black text-slate-900">{{ staff.displayName }}</h3><p class="text-sm text-slate-500">{{ staff.jobTitle || 'Görev belirtilmedi' }}</p>
                  <div class="mt-4 space-y-1 text-xs text-slate-500"><div>{{ staff.email || 'E-posta yok' }}</div><div>{{ staff.phone || 'Telefon yok' }}</div></div>
                  <div class="mt-5 grid grid-cols-2 gap-2"><button type="button" (click)="editStaff(staff)" class="min-h-11 rounded-xl border border-slate-200 font-black">Düzenle</button><button type="button" (click)="toggleStaff(staff)" class="min-h-11 rounded-xl bg-slate-100 font-black">{{ staff.isActive ? 'Pasifleştir' : 'Aktifleştir' }}</button></div>
                </article>
              } @empty { <div class="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Henüz çalışan kaydı yok.</div> }
            </div>
          </section>
        }

        @if (tab()==='branches') {
          <section class="grid gap-5 xl:grid-cols-[390px_1fr]">
            <form id="team-branch-form" (ngSubmit)="saveBranch()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div class="flex items-center justify-between"><h2 class="text-xl font-black text-slate-900">{{ editingBranchId ? 'Şubeyi Düzenle' : 'Şube Ekle' }}</h2>@if (editingBranchId) { <button type="button" (click)="resetBranchForm()" class="text-sm font-bold text-blue-600">Yeni kayıt</button> }</div>
              <div class="mt-5 space-y-4">
                <label class="field"><span>Şube kodu</span><input [(ngModel)]="branchCode" name="branchCode" placeholder="YKVA-MRK" required /></label>
                <label class="field"><span>Şube adı</span><input [(ngModel)]="branchName" name="branchName" required /></label>
                <label class="field"><span>Şehir</span><input [(ngModel)]="branchCity" name="branchCity" required /></label>
                <label class="field"><span>İlçe</span><input [(ngModel)]="branchDistrict" name="branchDistrict" /></label>
                <label class="field"><span>Adres</span><textarea [(ngModel)]="branchAddress" name="branchAddress" rows="3"></textarea></label>
                <label class="field"><span>Telefon</span><input [(ngModel)]="branchPhone" name="branchPhone" type="tel" /></label>
                <label class="field"><span>E-posta</span><input [(ngModel)]="branchEmail" name="branchEmail" type="email" /></label>
                <button type="submit" [disabled]="saving() || !branchName.trim() || !branchCity.trim()" class="min-h-12 w-full rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-40">Şubeyi Kaydet</button>
              </div>
            </form>
            <div class="grid gap-3 md:grid-cols-2">
              @for (branch of filteredBranches(); track branch.id) {
                <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div class="flex items-start justify-between gap-3"><div><span class="text-[10px] font-black uppercase tracking-widest text-blue-600">{{ branch.code || 'ŞUBE' }}</span><h3 class="mt-1 text-xl font-black text-slate-900">{{ branch.name }}</h3></div><span [class.bg-emerald-100]="branch.isActive" [class.text-emerald-700]="branch.isActive" class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black">{{ branch.isActive ? 'AKTİF' : 'PASİF' }}</span></div>
                  <p class="mt-3 text-sm text-slate-600">{{ branch.district ? branch.district + ' / ' : '' }}{{ branch.city }}</p><p class="mt-1 text-xs leading-relaxed text-slate-500">{{ branch.address || 'Adres girilmedi' }}</p>
                  <button type="button" (click)="editBranch(branch)" class="mt-5 min-h-11 w-full rounded-xl border border-slate-200 font-black">Düzenle</button>
                </article>
              } @empty { <div class="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Henüz şube yok.</div> }
            </div>
          </section>
        }

        @if (tab()==='assignments') {
          <section id="team-assignment-form" class="grid gap-5 lg:grid-cols-3">
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-900">Çalışanı Şubeye Ata</h2><div class="mt-4 space-y-3"><label class="field"><span>Çalışan</span><select [(ngModel)]="assignmentStaffId"><option value="">Seç</option>@for (member of activeStaff(); track member.id) { <option [value]="member.id">{{ member.displayName }}</option> }</select></label><label class="field"><span>Şube</span><select [(ngModel)]="assignmentBranchId"><option value="">Seç</option>@for (branch of branches(); track branch.id) { <option [value]="branch.id">{{ branch.name }}</option> }</select></label><label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="assignmentPrimary" /> Ana şube yap</label><button type="button" (click)="assignBranch()" class="min-h-12 w-full rounded-xl bg-slate-950 font-black text-white">Ata</button></div></article>

            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-900">Araç Sorumluluğu</h2><div class="mt-4 space-y-3"><label class="field"><span>Çalışan</span><select [(ngModel)]="vehicleStaffId"><option value="">Seç</option>@for (member of activeStaff(); track member.id) { <option [value]="member.id">{{ member.displayName }}</option> }</select></label><label class="field"><span>Araç</span><select [(ngModel)]="vehicleId"><option value="">Seç</option>@for (vehicle of cloudVehicles(); track vehicle.cloudId) { <option [value]="vehicle.cloudId">{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.category }}</option> }</select></label><label class="field"><span>Sorumluluk</span><select [(ngModel)]="vehicleResponsibility"><option value="RESPONSIBLE">Genel sorumlu</option><option value="SALES">Satış</option><option value="FLEET">Filo</option><option value="DELIVERY">Teslimat</option><option value="MAINTENANCE">Bakım</option></select></label><button type="button" (click)="assignVehicle()" class="min-h-12 w-full rounded-xl bg-slate-950 font-black text-white">Araç Görevi Ata</button></div></article>

            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="text-lg font-black text-slate-900">Tur Görevlendirmesi</h2><div class="mt-4 space-y-3"><label class="field"><span>Çalışan</span><select [(ngModel)]="tourStaffId"><option value="">Seç</option>@for (member of activeStaff(); track member.id) { <option [value]="member.id">{{ member.displayName }}</option> }</select></label><label class="field"><span>Tur</span><select [(ngModel)]="tourId"><option value="">Seç</option>@for (tour of cloudTours(); track tour.cloudId) { <option [value]="tour.cloudId">{{ tour.title }}</option> }</select></label><label class="field"><span>Görev</span><select [(ngModel)]="tourResponsibility"><option value="COORDINATOR">Koordinatör</option><option value="GUIDE">Rehber</option><option value="DRIVER">Şoför</option><option value="CONTENT">İçerik sorumlusu</option></select></label><button type="button" (click)="assignTour()" class="min-h-12 w-full rounded-xl bg-slate-950 font-black text-white">Tur Görevi Ata</button></div></article>
          </section>
        }
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select,.field textarea{width:100%;min-height:46px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:10px 12px;color:rgb(15 23 42);outline:none}.field textarea{min-height:84px}.field input:focus,.field select:focus,.field textarea:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}
  `],
})
export class AdminTeamComponent implements OnInit {
  private readonly management = inject(AdminManagementService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);

  readonly tab = signal<"admins" | "staff" | "branches" | "assignments">("admins");
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly searchQuery = signal("");
  readonly admins = this.management.admins;
  readonly staff = this.management.staff;
  readonly branches = this.management.branches;
  readonly activeStaff = computed(() => this.staff().filter((row) => row.isActive));
  readonly filteredAdmins = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    if (!q) return this.admins();
    return this.admins().filter((row) => `${row.displayName || ""} ${row.email} ${row.role}`.toLocaleLowerCase("tr-TR").includes(q));
  });
  readonly filteredStaff = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    if (!q) return this.staff();
    return this.staff().filter((row) => `${row.displayName} ${row.jobTitle || ""} ${row.department} ${row.email || ""} ${row.phone || ""}`.toLocaleLowerCase("tr-TR").includes(q));
  });
  readonly filteredBranches = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    if (!q) return this.branches();
    return this.branches().filter((row) => `${row.code} ${row.name} ${row.city} ${row.district || ""} ${row.address || ""}`.toLocaleLowerCase("tr-TR").includes(q));
  });
  readonly cloudVehicles = computed(() => this.cars.getAllVehicles()().filter((row) => row.category !== "TOUR" && row.cloudId));
  readonly cloudTours = computed(() => this.cars.getTours()().filter((row) => row.cloudId));

  adminName = ""; adminEmail = ""; adminRole: AdminUserRecord["role"] = "admin"; adminBranchId = "";
  editingStaffId = ""; staffName = ""; staffTitle = ""; staffDepartment: StaffProfile["department"] = "GENERAL"; staffEmail = ""; staffPhone = "";
  editingBranchId = ""; branchCode = ""; branchName = ""; branchCity = ""; branchDistrict = ""; branchAddress = ""; branchPhone = ""; branchEmail = "";
  assignmentStaffId = ""; assignmentBranchId = ""; assignmentPrimary = false;
  vehicleStaffId = ""; vehicleId = ""; vehicleResponsibility: "RESPONSIBLE" | "SALES" | "FLEET" | "DELIVERY" | "MAINTENANCE" = "RESPONSIBLE";
  tourStaffId = ""; tourId = ""; tourResponsibility: "COORDINATOR" | "GUIDE" | "DRIVER" | "CONTENT" = "COORDINATOR";

  ngOnInit(): void { void this.refresh(); }

  teamSearchPlaceholder(): string {
    return this.tab() === "admins" ? "Yönetici adı, e-posta veya rol ara…" : this.tab() === "staff" ? "Çalışan, unvan veya departman ara…" : "Şube, kod, şehir veya ilçe ara…";
  }

  newActionLabel(): string {
    return this.tab() === "admins" ? "Yeni Yönetici" : this.tab() === "staff" ? "Yeni Çalışan" : this.tab() === "branches" ? "Yeni Şube" : "Yeni Görev";
  }

  startNewForCurrentTab(): void {
    this.searchQuery.set("");
    if (this.tab() === "staff") this.resetStaffForm();
    if (this.tab() === "branches") this.resetBranchForm();
    if (this.tab() === "admins") { this.adminName = ""; this.adminEmail = ""; this.adminRole = "admin"; this.adminBranchId = ""; }
    const target = this.tab() === "admins" ? "team-admin-form" : this.tab() === "staff" ? "team-staff-form" : this.tab() === "branches" ? "team-branch-form" : "team-assignment-form";
    if (typeof document !== "undefined") document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try { await this.management.refreshPeople(); }
    catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.loading.set(false); }
  }

  async inviteAdmin(): Promise<void> {
    this.saving.set(true);
    try {
      await this.management.inviteAdmin({ email: this.adminEmail, displayName: this.adminName, role: this.adminRole, primaryBranchId: this.adminBranchId || undefined, permissions: this.defaultPermissions(this.adminRole) });
      this.adminName = ""; this.adminEmail = ""; this.adminRole = "admin"; this.adminBranchId = "";
      this.toast.show("Yönetici daveti gönderildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.saving.set(false); }
  }

  async saveAdmin(admin: AdminUserRecord): Promise<void> {
    try { await this.management.updateAdmin(admin.userId, { role: admin.role, isActive: admin.isActive, primaryBranchId: admin.primaryBranchId, permissions: admin.permissions }); this.toast.show("Yönetici yetkisi güncellendi.", "success"); }
    catch (error) { await this.refresh(); this.toast.show(this.message(error), "error"); }
  }

  async saveStaff(): Promise<void> {
    this.saving.set(true);
    try {
      await this.management.saveStaff({ id: this.editingStaffId || undefined, displayName: this.staffName, jobTitle: this.staffTitle || undefined, department: this.staffDepartment, email: this.staffEmail || undefined, phone: this.staffPhone || undefined, isActive: true, metadata: {} });
      this.resetStaffForm(); this.toast.show("Çalışan kaydedildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.saving.set(false); }
  }

  editStaff(staff: StaffProfile): void { this.editingStaffId = staff.id; this.staffName = staff.displayName; this.staffTitle = staff.jobTitle || ""; this.staffDepartment = staff.department; this.staffEmail = staff.email || ""; this.staffPhone = staff.phone || ""; window.scrollTo({ top: 0, behavior: "smooth" }); }
  resetStaffForm(): void { this.editingStaffId = ""; this.staffName = ""; this.staffTitle = ""; this.staffDepartment = "GENERAL"; this.staffEmail = ""; this.staffPhone = ""; }
  async toggleStaff(staff: StaffProfile): Promise<void> { try { await this.management.setStaffActive(staff.id, !staff.isActive); } catch (error) { this.toast.show(this.message(error), "error"); } }

  async saveBranch(): Promise<void> {
    this.saving.set(true);
    try {
      await this.management.saveBranch({ id: this.editingBranchId || undefined, code: this.branchCode, name: this.branchName, city: this.branchCity, district: this.branchDistrict || undefined, address: this.branchAddress || undefined, phone: this.branchPhone || undefined, email: this.branchEmail || undefined, isActive: true, sortOrder: this.editingBranchId ? this.branches().find((row) => row.id === this.editingBranchId)?.sortOrder || 0 : this.branches().length * 10 + 10 });
      this.resetBranchForm(); this.toast.show("Şube kaydedildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.saving.set(false); }
  }

  editBranch(branch: BranchRecord): void { this.editingBranchId = branch.id; this.branchCode = branch.code; this.branchName = branch.name; this.branchCity = branch.city; this.branchDistrict = branch.district || ""; this.branchAddress = branch.address || ""; this.branchPhone = branch.phone || ""; this.branchEmail = branch.email || ""; window.scrollTo({ top: 0, behavior: "smooth" }); }
  resetBranchForm(): void { this.editingBranchId = ""; this.branchCode = ""; this.branchName = ""; this.branchCity = ""; this.branchDistrict = ""; this.branchAddress = ""; this.branchPhone = ""; this.branchEmail = ""; }

  async assignBranch(): Promise<void> { if (!this.assignmentStaffId || !this.assignmentBranchId) return this.toast.show("Çalışan ve şube seçin.", "error"); try { await this.management.assignStaffToBranch(this.assignmentStaffId, this.assignmentBranchId, this.assignmentPrimary); this.toast.show("Şube görevi kaydedildi.", "success"); } catch (error) { this.toast.show(this.message(error), "error"); } }
  async assignVehicle(): Promise<void> { if (!this.vehicleStaffId || !this.vehicleId) return this.toast.show("Çalışan ve araç seçin.", "error"); try { await this.management.assignStaffToVehicle(this.vehicleId, this.vehicleStaffId, this.vehicleResponsibility); this.toast.show("Araç sorumluluğu kaydedildi.", "success"); } catch (error) { this.toast.show(this.message(error), "error"); } }
  async assignTour(): Promise<void> { if (!this.tourStaffId || !this.tourId) return this.toast.show("Çalışan ve tur seçin.", "error"); try { await this.management.assignStaffToTour(this.tourId, this.tourStaffId, this.tourResponsibility); this.toast.show("Tur görevi kaydedildi.", "success"); } catch (error) { this.toast.show(this.message(error), "error"); } }

  initials(value: string): string { return value.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]?.toLocaleUpperCase("tr-TR") || "").join("") || "AA"; }
  private defaultPermissions(role: AdminUserRecord["role"]): Record<string, boolean> { if (role === "owner" || role === "admin") return { catalog: true, bookings: true, content: true, team: role === "owner", settings: true }; if (role === "editor") return { catalog: true, bookings: false, content: true, team: false, settings: false }; return { catalog: false, bookings: true, content: false, team: false, settings: false }; }
  private message(error: unknown): string { const code = error instanceof Error ? error.message : "İşlem tamamlanamadı."; if (code === "OWNER_REQUIRED") return "Bu işlem yalnız owner hesabıyla yapılabilir."; if (code === "LAST_ACTIVE_OWNER_PROTECTED") return "Son aktif owner hesabı pasifleştirilemez veya rolü düşürülemez."; return code; }
}
