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
        <div class="absolute inset-0 bg-gradient-to-br from-[#07101f] via-[#07101f] to-slate-950"></div>
        <div class="relative z-10 max-w-xl px-12 text-center">
          @if (config().logoUrl) { <img [src]="config().logoUrl" alt="Alperler Rent A Car" class="mx-auto mb-8 max-h-24 max-w-sm object-contain" /> }
          <p class="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Güvenli Yönetim Alanı</p>
          <h1 class="mt-5 font-serif text-5xl font-black text-white">Alperler Yönetim</h1>
          <p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-300">Araçlar, rezervasyonlar, satış talepleri, turlar, müşteriler ve site ayarları için yetkili yönetim alanı.</p>
          <div class="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 text-left text-xs text-slate-300">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Güvenli Giriş</strong><span>Yetkili hesap kontrolü</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Yetki Yönetimi</strong><span>Göreve göre erişim</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">İşlem Geçmişi</strong><span>Yönetim kayıtları</span></div>
          </div>
        </div>
      </section>

      <section class="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <a routerLink="/" class="absolute right-4 top-4 min-h-11 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 sm:right-8 sm:top-8">Siteye Dön</a>

        <div class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-9">
          <div class="mb-7 text-center">
            <div class="mx-auto mb-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Yönetici Paneli</div>
            <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ mode() === 'setup' ? 'İlk Yönetici Kurulumu' : mode() === 'forgot' ? 'Şifreyi Yenile' : 'Giriş Yap' }}</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ mode() === 'setup' ? 'Birincil yönetici hesabını güvenli biçimde oluşturun.' : mode() === 'forgot' ? 'Şifre yenileme bağlantısı yönetici e-posta adresine gönderilir.' : 'Yalnızca yetkili yönetici hesapları giriş yapabilir.' }}</p>
          </div>

          @if (successMsg()) { <div role="status" aria-live="polite" class="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">{{ successMsg() }}</div> }
          @if (errorMsg()) { <div role="alert" aria-live="assertive" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">{{ errorMsg() }}</div> }

          @if (mode() === 'forgot') {
            <div class="space-y-5">
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span><input type="email" [(ngModel)]="resetEmail" autocomplete="email" inputmode="email" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /></label>
              <button type="button" (click)="doReset()" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white transition hover:bg-slate-800 disabled:opacity-50">{{ isLoading() ? 'Gönderiliyor...' : 'Şifre Yenileme Bağlantısı Gönder' }}</button>
              <button type="button" (click)="setMode('login')" class="min-h-12 w-full rounded-xl border border-slate-200 font-bold text-slate-600 transition hover:bg-slate-50">Giriş Ekranına Dön</button>
            </div>
          } @else {
            <form (submit)="mode() === 'setup' ? onSetup($event) : onLogin($event)" class="space-y-5">
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span><input type="email" [(ngModel)]="username" name="username" autocomplete="username" inputmode="email" [readonly]="mode() === 'setup'" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white read-only:text-slate-500" /></label>
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{{ mode() === 'setup' ? 'Yeni şifre' : 'Şifre' }}</span><div class="relative"><input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" [autocomplete]="mode() === 'setup' ? 'new-password' : 'current-password'" [attr.minlength]="mode() === 'setup' ? 10 : null" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 pr-16 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /><button type="button" (click)="showPassword.update(v => !v)" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center px-3 text-xs font-black text-slate-500">{{ showPassword() ? 'Gizle' : 'Göster' }}</button></div></label>

              @if (mode() === 'setup') {
                <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Şifre tekrar</span><input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password" minlength="10" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /></label>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-700">Şifreniz en az 10 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.</div>
              }

              <button type="submit" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600">{{ isLoading() ? 'Kontrol ediliyor...' : mode() === 'setup' ? 'Yönetici Hesabını Oluştur' : 'Güvenli Giriş Yap' }}</button>
            </form>

            @if (mode() === 'login') { <div class="mt-4 flex justify-between gap-4 text-xs font-black"><button type="button" (click)="setMode('forgot')" class="min-h-11 text-slate-700 hover:underline">Şifremi unuttum</button><button type="button" (click)="setMode('setup')" class="min-h-11 text-slate-600 hover:underline">İlk yönetici kurulumu</button></div> }
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

  async ngOnInit(): Promise<void> { await this.authService.waitUntilReady(); if (this.authService.isLoggedIn()) void this.router.navigate(["/admin/dashboard"]); }
  setMode(mode: "login" | "setup" | "forgot"): void { this.mode.set(mode); this.errorMsg.set(""); this.successMsg.set(""); this.password = ""; this.confirmPassword = ""; this.username = this.authService.getPrimaryAdminEmail(); this.resetEmail = this.authService.getPrimaryAdminEmail(); }
  async onLogin(event: Event): Promise<void> { event.preventDefault(); this.errorMsg.set(""); this.successMsg.set(""); this.isLoading.set(true); const success = await this.authService.login(this.username, this.password); this.isLoading.set(false); if (success) { void this.router.navigate(["/admin/dashboard"]); return; } this.syncError("Yönetici girişi tamamlanamadı."); }
  async onSetup(event: Event): Promise<void> { event.preventDefault(); this.errorMsg.set(""); this.successMsg.set(""); if (this.password !== this.confirmPassword) { this.errorMsg.set("Yeni şifreler birbiriyle eşleşmiyor."); return; } const validation = this.authService.validateStrongPassword(this.password); if (validation) { this.errorMsg.set(validation); return; } this.isLoading.set(true); const result = await this.authService.registerPrimaryAdmin(this.password); this.isLoading.set(false); if (!result.created) { this.syncError("İlk yönetici hesabı oluşturulamadı."); return; } if (this.authService.isLoggedIn()) { void this.router.navigate(["/admin/dashboard"]); return; } this.successMsg.set(result.confirmationRequired ? "Hesap oluşturuldu. E-posta doğrulamasını tamamladıktan sonra giriş yapın." : "Yönetici hesabı oluşturuldu. Şimdi giriş yapabilirsiniz."); this.mode.set("login"); this.password = ""; this.confirmPassword = ""; }
  async doReset(): Promise<void> { this.errorMsg.set(""); this.successMsg.set(""); this.isLoading.set(true); const success = await this.authService.resetPassword(this.resetEmail); this.isLoading.set(false); if (success) { this.successMsg.set("Şifre yenileme bağlantısı e-posta adresine gönderildi."); return; } this.syncError("Şifre yenileme bağlantısı gönderilemedi."); }
  private syncError(fallback: string): void { this.errorMsg.set(this.authService.lastErrorMessage() || fallback); }
}
