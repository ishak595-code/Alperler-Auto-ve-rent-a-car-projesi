import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
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
          <p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-300">Araçlar, satış ilanları, turlar, içerikler ve site ayarları için yetkili yönetici girişi.</p>
        </div>
      </section>

      <section class="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <a routerLink="/" class="absolute right-4 top-4 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:right-8 sm:top-8">Siteye Dön</a>

        <div class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-9">
          <div class="mb-8 text-center">
            <div class="mx-auto mb-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Yönetici Paneli</div>
            <h2 class="text-3xl font-black tracking-tight text-slate-950">Giriş Yap</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">Yalnızca yetkili yönetici hesabı kabul edilir.</p>
          </div>

          @if (generatedPassword()) {
            <div class="space-y-5" role="status" aria-live="polite">
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 class="font-black text-emerald-900">Çalışan yönetici şifresi oluşturuldu</h3>
                <p class="mt-2 text-sm leading-relaxed text-emerald-800">Şifre Firebase hesabınıza kaydedildi. GitHub koduna veya localStorage alanına yazılmadı. Bunu şimdi güvenli bir yere kaydedin.</p>
              </div>

              <label for="generatedPassword" class="block text-xs font-black uppercase tracking-wider text-slate-500">Yeni şifre</label>
              <div class="flex gap-2">
                <input id="generatedPassword" [value]="generatedPassword()" readonly class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm font-bold text-slate-950" />
                <button type="button" (click)="copyGeneratedPassword()" class="min-h-12 rounded-xl bg-slate-100 px-4 font-black text-slate-800 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Kopyala</button>
              </div>

              <button type="button" (click)="continueToDashboard()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Şifreyi Kaydettim, Panele Geç</button>
            </div>
          } @else if (showForgotPass()) {
            <div class="space-y-5">
              <div>
                <h3 class="text-lg font-black text-slate-950">Şifreyi Yenile</h3>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">Firebase kayıtlı e-posta adresinize güvenli sıfırlama bağlantısı gönderilir.</p>
              </div>

              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span>
                <input type="email" [(ngModel)]="resetEmail" autocomplete="email" class="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white" />
              </label>

              @if (resetSuccess()) {
                <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">Şifre sıfırlama e-postası gönderildi. E-postadaki bağlantıyı açıp yeni şifrenizi belirleyin.</div>
              }

              @if (errorMsg()) {
                <div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">{{ errorMsg() }}</div>
              }

              <button type="button" (click)="doReset()" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white disabled:opacity-50">{{ isLoading() ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder' }}</button>
              <button type="button" (click)="toggleForgot()" class="min-h-12 w-full rounded-xl border border-slate-200 font-bold text-slate-600 transition hover:bg-slate-50">Giriş Ekranına Dön</button>
            </div>
          } @else {
            <form (submit)="onLogin($event)" class="space-y-5">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span>
                <input type="email" [(ngModel)]="username" name="username" autocomplete="username" inputmode="email" class="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white" />
              </label>

              <label class="block">
                <span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Şifre</span>
                <div class="relative">
                  <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" autocomplete="current-password" class="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 pr-14 font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white" />
                  <button type="button" (click)="showPassword.update(v => !v)" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-sm font-black text-slate-500">{{ showPassword() ? 'Gizle' : 'Göster' }}</button>
                </div>
              </label>

              @if (errorMsg()) {
                <div role="alert" aria-live="assertive" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">{{ errorMsg() }}</div>
              }

              <div class="flex justify-end">
                <button type="button" (click)="toggleForgot()" class="text-xs font-black text-blue-700 hover:underline">Şifremi unuttum</button>
              </div>

              <button type="submit" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white shadow-lg transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                {{ isLoading() ? 'Kontrol ediliyor...' : 'E-posta ve Şifre ile Giriş' }}
              </button>

              <div class="flex items-center gap-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-400"><span class="h-px flex-1 bg-slate-200"></span>veya<span class="h-px flex-1 bg-slate-200"></span></div>

              <button type="button" (click)="onGoogleLogin()" [disabled]="isLoading()" class="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-5 font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Yönetici Girişi
              </button>

              <p class="text-center text-[11px] leading-relaxed text-slate-400">İlk Google kurulumunda e-posta/şifre yöntemi yoksa sistem 24 karakterlik güçlü bir şifre oluşturur. Sonraki Google girişlerinde mevcut şifreniz değiştirilmez.</p>
            </form>
          }
        </div>
      </section>
    </main>
  `,
})
export class AdminLoginComponent implements OnInit {
  authService = inject(AuthService);
  carService = inject(CarService);
  router = inject(Router);
  config = this.carService.getConfig();

  username = this.authService.getPrimaryAdminEmail();
  password = "";
  resetEmail = this.authService.getPrimaryAdminEmail();

  errorMsg = signal("");
  showPassword = signal(false);
  isLoading = signal(false);
  showForgotPass = signal(false);
  resetSuccess = signal(false);
  generatedPassword = signal("");

  async ngOnInit() {
    await this.authService.waitUntilReady();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(["/admin/dashboard"]);
    }
  }

  private syncAuthError(fallback: string) {
    this.errorMsg.set(this.authService.lastErrorMessage() || fallback);
  }

  async onLogin(event: Event) {
    event.preventDefault();
    this.errorMsg.set("");
    this.isLoading.set(true);
    const success = await this.authService.login(this.username, this.password);
    this.isLoading.set(false);

    if (success) {
      this.router.navigate(["/admin/dashboard"]);
      return;
    }
    this.syncAuthError("Kullanıcı adı veya şifre doğrulanamadı.");
  }

  async onGoogleLogin() {
    this.errorMsg.set("");
    this.isLoading.set(true);
    const success = await this.authService.loginWithGoogle();

    if (!success) {
      this.isLoading.set(false);
      this.syncAuthError("Google ile giriş tamamlanamadı.");
      return;
    }

    if (this.authService.hasPasswordProvider()) {
      this.isLoading.set(false);
      this.router.navigate(["/admin/dashboard"]);
      return;
    }

    const generated = await this.authService.createStrongPasswordForCurrentUser();
    this.isLoading.set(false);

    if (generated) {
      this.generatedPassword.set(generated);
      return;
    }

    this.syncAuthError("Google girişi başarılı oldu ancak ilk e-posta/şifre kurulumu tamamlanamadı. Panele Google ile erişebilirsiniz; Firebase içinde Email/Password sağlayıcısının açık olduğunu kontrol edin.");
  }

  async copyGeneratedPassword() {
    const value = this.generatedPassword();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      this.errorMsg.set("Şifre otomatik kopyalanamadı. Şifre alanındaki metni seçerek kopyalayın.");
    }
  }

  continueToDashboard() {
    this.generatedPassword.set("");
    this.router.navigate(["/admin/dashboard"]);
  }

  toggleForgot() {
    this.showForgotPass.update((value) => !value);
    this.resetSuccess.set(false);
    this.errorMsg.set("");
    this.resetEmail = this.authService.getPrimaryAdminEmail();
  }

  async doReset() {
    this.errorMsg.set("");
    this.resetSuccess.set(false);
    if (!this.resetEmail.includes("@")) {
      this.errorMsg.set("Geçerli bir e-posta adresi girin.");
      return;
    }

    this.isLoading.set(true);
    const success = await this.authService.resetPassword(this.resetEmail);
    this.isLoading.set(false);

    if (success) {
      this.resetSuccess.set(true);
      return;
    }
    this.syncAuthError("Şifre sıfırlama bağlantısı gönderilemedi.");
  }
}
