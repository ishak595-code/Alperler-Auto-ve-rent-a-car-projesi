import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { CarService } from "../../services/car.service";

@Component({
  selector: "app-admin-login",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section class="relative hidden min-h-screen overflow-hidden bg-[#07101f] lg:flex lg:items-center lg:justify-center">
        <img
          src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=1920&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div class="absolute inset-0 bg-gradient-to-br from-[#07101f] via-[#07101f]/95 to-blue-950/70"></div>
        <div class="relative z-10 max-w-xl px-12 text-center">
          @if (config().logoUrl) {
            <img [src]="config().logoUrl" alt="Alperler Auto" class="mx-auto mb-8 max-h-24 max-w-sm object-contain" />
          }
          <p class="text-xs font-black uppercase tracking-[0.28em] text-blue-400">Güvenli Yönetim Alanı</p>
          <h1 class="mt-5 font-serif text-5xl font-black text-white">Alperler Auto Yönetim</h1>
          <p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-300">
            Araçlar, rezervasyonlar, satış talepleri, turlar, içerikler ve site ayarları için yetkili yönetim alanı.
          </p>
          <div class="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 text-left text-xs text-slate-300">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Supabase Auth</strong><span>Tek kimlik katmanı</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">RLS</strong><span>Rol tabanlı erişim</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Audit</strong><span>İşlem kayıtları</span></div>
          </div>
        </div>
      </section>

      <section class="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <a routerLink="/" class="absolute right-4 top-4 min-h-11 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:right-8 sm:top-8">Siteye Dön</a>

        <div class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-9">
          <div class="mb-7 text-center">
            <div class="mx-auto mb-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Yönetici Paneli</div>
            <h2 class="text-3xl font-black tracking-tight text-slate-950">
              {{ mode() === 'setup' ? 'İlk Yönetici Kurulumu' : mode() === 'forgot' ? 'Şifreyi Yenile' : 'Giriş Yap' }}
            </h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">
              {{ mode() === 'setup'
                ? 'Bu işlem yalnızca doğrulanmış birincil yönetici e-postasını owner olarak yetkilendirir.'
                : mode() === 'forgot'
                  ? 'Şifre yenileme bağlantısı yönetici e-posta adresine gönderilir.'
                  : 'Yalnızca yetkili Supabase yönetici hesabı kabul edilir.' }}
            </p>
          </div>

          @if (successMsg()) {
            <div role="status" aria-live="polite" class="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">
              {{ successMsg() }}
            </div>
          }
          @if (errorMsg()) {
            <div role="alert" aria-live="assertive" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">
              {{ errorMsg() }}
            </div>
          }

          @if (mode() === 'forgot') {
            <div class="space-y-5">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span>
                <input type="email" [(ngModel)]="resetEmail" autocomplete="email" inputmode="email" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white" />
              </label>
              <button type="button" (click)="doReset()" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white transition hover:bg-blue-600 disabled:opacity-50">
                {{ isLoading() ? 'Gönderiliyor...' : 'Şifre Yenileme Bağlantısı Gönder' }}
              </button>
              <button type="button" (click)="setMode('login')" class="min-h-12 w-full rounded-xl border border-slate-200 font-bold text-slate-600 transition hover:bg-slate-50">Giriş Ekranına Dön</button>
            </div>
          } @else {
            <form (submit)="mode() === 'setup' ? onSetup($event) : onLogin($event)" class="space-y-5">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span>
                <input
                  type="email"
                  [(ngModel)]="username"
                  name="username"
                  autocomplete="username"
                  inputmode="email"
                  [readonly]="mode() === 'setup'"
                  class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white read-only:text-slate-500"
                />
              </label>

              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{{ mode() === 'setup' ? 'Yeni şifre' : 'Şifre' }}</span>
                <div class="relative">
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    [autocomplete]="mode() === 'setup' ? 'new-password' : 'current-password'"
                    [attr.minlength]="mode() === 'setup' ? 8 : null"
                    class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 pr-16 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                  <button type="button" (click)="showPassword.update(v => !v)" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center px-3 text-xs font-black text-slate-500">
                    {{ showPassword() ? 'Gizle' : 'Göster' }}
                  </button>
                </div>
              </label>

              @if (mode() === 'setup') {
                <label class="block">
                  <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Şifre tekrar</span>
                  <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password" minlength="8" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white" />
                </label>
                <div class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs font-semibold leading-relaxed text-blue-900">
                  Şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermelidir. E-posta doğrulama bağlantısı sizi güvenli yönetici giriş ekranına geri getirir.
                </div>
              }

              <button type="submit" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white shadow-lg transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {{ isLoading() ? 'Kontrol ediliyor...' : mode() === 'setup' ? 'Owner Hesabını Oluştur' : 'Güvenli Giriş Yap' }}
              </button>
            </form>

            @if (mode() === 'login') {
              <div class="mt-4 flex justify-between gap-4 text-xs font-black">
                <button type="button" (click)="setMode('forgot')" class="min-h-11 text-blue-700 hover:underline">Şifremi unuttum</button>
                <button type="button" (click)="setMode('setup')" class="min-h-11 text-slate-600 hover:underline">İlk yönetici kurulumu</button>
              </div>

              <div class="my-5 flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400"><span class="h-px flex-1 bg-slate-200"></span>veya<span class="h-px flex-1 bg-slate-200"></span></div>

              <button type="button" (click)="onGoogleLogin()" [disabled]="isLoading()" class="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-5 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Yönetici Girişi
              </button>
              <p class="mt-3 text-center text-[11px] leading-relaxed text-slate-400">Google sağlayıcısı Supabase tarafında etkinleştirildiğinde bu düğme aynı kodla çalışır. Service-role anahtarı tarayıcıya gönderilmez.</p>
            }
          }
        </div>
      </section>
    </main>
  `,
})
export class AdminLoginComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly carService = inject(CarService);
  readonly router = inject(Router);
  readonly config = this.carService.getConfig();

  username = this.authService.getPrimaryAdminEmail();
  password = "";
  confirmPassword = "";
  resetEmail = this.authService.getPrimaryAdminEmail();
  readonly mode = signal<"login" | "setup" | "forgot">("login");
  readonly errorMsg = signal("");
  readonly successMsg = signal("");
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.authService.waitUntilReady();
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(["/admin/dashboard"]);
    }
  }

  setMode(mode: "login" | "setup" | "forgot"): void {
    this.mode.set(mode);
    this.errorMsg.set("");
    this.successMsg.set("");
    this.password = "";
    this.confirmPassword = "";
    this.username = this.authService.getPrimaryAdminEmail();
    this.resetEmail = this.authService.getPrimaryAdminEmail();
  }

  async onLogin(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMsg.set("");
    this.successMsg.set("");
    this.isLoading.set(true);
    const success = await this.authService.login(this.username, this.password);
    this.isLoading.set(false);
    if (success) {
      void this.router.navigate(["/admin/dashboard"]);
      return;
    }
    this.syncError("Yönetici girişi tamamlanamadı.");
  }

  async onSetup(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMsg.set("");
    this.successMsg.set("");
    if (this.password !== this.confirmPassword) {
      this.errorMsg.set("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }
    const validation = this.authService.validateStrongPassword(this.password);
    if (validation) {
      this.errorMsg.set(validation);
      return;
    }

    this.isLoading.set(true);
    const result = await this.authService.registerPrimaryAdmin(this.password);
    this.isLoading.set(false);
    if (!result.created) {
      this.syncError("İlk yönetici hesabı oluşturulamadı.");
      return;
    }
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(["/admin/dashboard"]);
      return;
    }
    this.successMsg.set(
      result.confirmationRequired
        ? "Hesap oluşturuldu. E-posta doğrulama bağlantısını açtıktan sonra bu ekrandan giriş yapın."
        : "Yönetici hesabı oluşturuldu. Şimdi giriş yapabilirsiniz.",
    );
    this.mode.set("login");
    this.password = "";
    this.confirmPassword = "";
  }

  async onGoogleLogin(): Promise<void> {
    this.errorMsg.set("");
    this.successMsg.set("");
    const started = await this.authService.loginWithGoogle();
    if (!started) this.syncError("Google ile giriş başlatılamadı.");
  }

  async doReset(): Promise<void> {
    this.errorMsg.set("");
    this.successMsg.set("");
    this.isLoading.set(true);
    const success = await this.authService.resetPassword(this.resetEmail);
    this.isLoading.set(false);
    if (success) {
      this.successMsg.set("Şifre yenileme bağlantısı e-posta adresine gönderildi.");
      return;
    }
    this.syncError("Şifre yenileme bağlantısı gönderilemedi.");
  }

  private syncError(fallback: string): void {
    this.errorMsg.set(this.authService.lastErrorMessage() || fallback);
  }
}
