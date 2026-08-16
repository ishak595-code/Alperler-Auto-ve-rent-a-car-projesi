import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { BranchPortalAuthService } from "../services/branch-portal-auth.service";
import { BranchPortalService } from "../services/branch-portal.service";

@Component({
  selector: "app-branch-portal-login",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 px-4 py-10 text-slate-200">
      <div class="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section class="hidden lg:block">
          <p class="text-xs font-black uppercase tracking-[.18em] text-blue-400">Alperler Auto Şube Ağı</p>
          <h1 class="mt-4 max-w-2xl text-5xl font-black leading-[1.05] text-white">Kendi şubenizi yönetin. Marka standardı merkezde kalsın.</h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-slate-400">Bu portal yalnızca onaylanmış Alperler Auto şube yetkilileri içindir. Her şube yalnızca kendi ilanlarını, kendi fiyat sınırlarını, kendi açılış durumunu ve kendisine yönlendirilen müşteri kayıtlarını görür.</p>
          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <div class="benefit"><mat-icon aria-hidden="true">storefront</mat-icon><strong>Ayrı şube alanı</strong><span>İlanlar diğer ilçelerle karışmaz.</span></div>
            <div class="benefit"><mat-icon aria-hidden="true">price_check</mat-icon><strong>Fiyat disiplini</strong><span>Merkezi sınırların dışına çıkılamaz.</span></div>
            <div class="benefit"><mat-icon aria-hidden="true">fact_check</mat-icon><strong>Yayın kontrolü</strong><span>Yeni ilan merkez onayı olmadan canlı olmaz.</span></div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8" aria-labelledby="branch-login-title">
          <a routerLink="/" class="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-slate-400 hover:text-white"><mat-icon aria-hidden="true">arrow_back</mat-icon>Ana Sayfa</a>
          @if (inviteMode()) {
            <div class="mt-5"><p class="text-xs font-black uppercase tracking-wider text-emerald-400">Davet doğrulandı</p><h2 id="branch-login-title" class="mt-2 text-2xl font-black text-white">Şube portalı şifrenizi oluşturun</h2><p class="mt-2 text-sm leading-6 text-slate-400">Şifreniz en az 8 karakter olmalı. Bu hesap ana yönetici panelinden ayrıdır.</p></div>
            <form class="mt-6 space-y-4" (ngSubmit)="finishInvite()">
              <label class="block"><span class="label">Yeni şifre</span><input [(ngModel)]="password" name="invitePassword" type="password" minlength="8" autocomplete="new-password" class="field" required /></label>
              <label class="block"><span class="label">Şifre tekrar</span><input [(ngModel)]="passwordConfirm" name="invitePasswordConfirm" type="password" minlength="8" autocomplete="new-password" class="field" required /></label>
              @if (error()) {<p role="alert" class="error">{{ error() }}</p>}
              <button type="submit" [disabled]="loading()" class="action">{{ loading() ? 'Hesap hazırlanıyor...' : 'Şifremi Kaydet ve Portala Gir' }}</button>
            </form>
          } @else {
            <div class="mt-5"><p class="text-xs font-black uppercase tracking-wider text-blue-400">Yetkili Şube Girişi</p><h2 id="branch-login-title" class="mt-2 text-2xl font-black text-white">Şube Portalı</h2><p class="mt-2 text-sm leading-6 text-slate-400">Merkez tarafından yetkilendirilen e-posta ve şifrenizle giriş yapın.</p></div>
            <form class="mt-6 space-y-4" (ngSubmit)="login()">
              <label class="block"><span class="label">E-posta</span><input [(ngModel)]="email" name="email" type="email" autocomplete="email" class="field" required /></label>
              <label class="block"><span class="label">Şifre</span><input [(ngModel)]="password" name="password" type="password" autocomplete="current-password" class="field" required /></label>
              @if (error()) {<p role="alert" class="error">{{ error() }}</p>}
              <button type="submit" [disabled]="loading()" class="action">{{ loading() ? 'Giriş kontrol ediliyor...' : 'Şube Portalına Gir' }}</button>
            </form>
            <p class="mt-5 text-xs leading-5 text-slate-500">Henüz şube yetkiniz yoksa bu ekrandan hesap oluşturamazsınız. Önce iş ortaklığı başvurunuzun onaylanması ve merkez tarafından şube hesabınızın açılması gerekir.</p>
          }
        </section>
      </div>
    </main>
  `,
  styles: [`
    .benefit{display:flex;min-height:150px;flex-direction:column;gap:.45rem;border:1px solid #1e293b;border-radius:18px;background:#0f172a;padding:1rem}.benefit mat-icon{color:#60a5fa}.benefit strong{color:white}.benefit span{font-size:.72rem;line-height:1.25rem;color:#94a3b8}.label{display:block;margin-bottom:.4rem;font-size:.65rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8}.field{min-height:50px;width:100%;border:1px solid #334155;border-radius:13px;background:#020617;padding:0 .9rem;color:white;outline:none}.field:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.13)}.action{min-height:52px;width:100%;border:0;border-radius:13px;background:#2563eb;padding:0 1rem;font-weight:900;color:white}.action:disabled{opacity:.55}.error{margin:0;border:1px solid rgba(244,63,94,.25);border-radius:12px;background:rgba(244,63,94,.1);padding:.75rem;color:#fecdd3;font-size:.78rem;font-weight:800;line-height:1.3rem}
  `],
})
export class BranchPortalLoginComponent implements OnInit {
  private readonly auth = inject(BranchPortalAuthService);
  private readonly portal = inject(BranchPortalService);
  private readonly router = inject(Router);

  readonly inviteMode = signal(false);
  readonly loading = signal(false);
  readonly error = signal("");
  email = "";
  password = "";
  passwordConfirm = "";

  async ngOnInit(): Promise<void> {
    const fromInvite = await this.auth.bootstrapInviteFromUrl().catch(() => false);
    if (fromInvite) {
      this.inviteMode.set(true);
      return;
    }
    if (this.auth.isLoggedIn()) {
      try {
        const memberships = await this.portal.loadMemberships();
        if (memberships.length) void this.router.navigate(["/branch-portal"]);
      } catch {
        await this.auth.signOut(false);
      }
    }
  }

  async login(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set("");
    try {
      await this.auth.signIn(this.email, this.password);
      const memberships = await this.portal.loadMemberships();
      if (!memberships.length) {
        await this.auth.signOut();
        throw new Error("NO_BRANCH_ACCESS");
      }
      await this.portal.refreshWorkspace();
      await this.router.navigate(["/branch-portal"]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "BRANCH_LOGIN_FAILED";
      this.error.set(code === "INVALID_CREDENTIALS" ? "E-posta veya şifre hatalı." : code === "NO_BRANCH_ACCESS" ? "Bu hesap için aktif bir Alperler Auto şube yetkisi bulunmuyor." : "Giriş tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.");
    } finally {
      this.loading.set(false);
    }
  }

  async finishInvite(): Promise<void> {
    if (this.loading()) return;
    this.error.set("");
    if (this.password.length < 8) { this.error.set("Şifre en az 8 karakter olmalı."); return; }
    if (this.password !== this.passwordConfirm) { this.error.set("Şifreler birbiriyle aynı değil."); return; }
    this.loading.set(true);
    try {
      await this.auth.setPassword(this.password);
      const memberships = await this.portal.loadMemberships();
      if (!memberships.length) throw new Error("NO_BRANCH_ACCESS");
      await this.portal.refreshWorkspace();
      await this.router.navigate(["/branch-portal"]);
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVITE_SETUP_FAILED";
      this.error.set(code === "NO_BRANCH_ACCESS" ? "Davet hesabı oluşturuldu ancak şube yetkisi bulunamadı. Merkez yönetimle iletişime geçin." : "Şifre kaydedilemedi. Davet bağlantısı süresi dolmuş olabilir.");
    } finally {
      this.loading.set(false);
    }
  }
}
