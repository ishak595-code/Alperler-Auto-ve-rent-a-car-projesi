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
          <p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-300">Araçlar, rezervasyonlar, satış talepleri, turlar, müşteriler, ekip ve muhasebe için yetkili yönetim alanı.</p>
          <div class="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 text-left text-xs text-slate-300">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Güvenli Giriş</strong><span>Yetkili hesap kontrolü</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Rol Bazlı Yetki</strong><span>Çalışana göre erişim</span></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><strong class="block text-white">Denetim Kaydı</strong><span>Yönetim hareketleri</span></div>
          </div>
        </div>
      </section>

      <section class="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <a routerLink="/" class="absolute right-4 top-4 min-h-11 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 sm:right-8 sm:top-8">Siteye Dön</a>

        <div class="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-9">
          <div class="mb-7 text-center">
            <div class="mx-auto mb-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Yönetici Paneli</div>
            <h2 class="text-3xl font-black tracking-tight text-slate-950">{{ mode() === 'forgot' ? 'Şifreyi Yenile' : mode() === 'set-password' ? 'Yeni Şifre Belirle' : 'Giriş Yap' }}</h2>
            <p class="mt-2 text-sm leading-relaxed text-slate-500">{{ mode() === 'forgot' ? 'Yenileme isteği kayıtlı yönetici e-posta adresi için güvenli biçimde işlenir.' : mode() === 'set-password' ? 'Yeni şifrenizi belirleyin. Bu ekran yalnız geçerli davet veya yenileme bağlantısıyla açılır.' : 'Yalnızca aktif ve yetkili yönetici hesapları giriş yapabilir.' }}</p>
          </div>

          @if (successMsg()) { <div role="status" aria-live="polite" class="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800">{{ successMsg() }}</div> }
          @if (errorMsg()) { <div role="alert" aria-live="assertive" class="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-relaxed text-red-700">{{ errorMsg() }}</div> }

          @if (mode() === 'forgot') {
            <div class="space-y-5">
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span><input type="email" [(ngModel)]="resetEmail" autocomplete="email" inputmode="email" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /></label>
              <button type="button" (click)="doReset()" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white transition hover:bg-slate-800 disabled:opacity-50">{{ isLoading() ? 'İstek işleniyor...' : 'Şifre Yenileme Bağlantısı İste' }}</button>
              <button type="button" (click)="setMode('login')" class="min-h-12 w-full rounded-xl border border-slate-200 font-bold text-slate-600 transition hover:bg-slate-50">Giriş Ekranına Dön</button>
            </div>
          } @else if (mode() === 'set-password') {
            <form (submit)="onSetPassword($event)" class="space-y-5">
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yeni şifre</span><div class="relative"><input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="newPassword" autocomplete="new-password" minlength="10" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 pr-16 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /><button type="button" (click)="showPassword.update(v => !v)" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center px-3 text-xs font-black text-slate-500">{{ showPassword() ? 'Gizle' : 'Göster' }}</button></div></label>
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yeni şifre tekrar</span><input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password" minlength="10" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /></label>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-relaxed text-slate-700">En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.</div>
              <button type="submit" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white transition hover:bg-slate-800 disabled:opacity-50">{{ isLoading() ? 'Kaydediliyor...' : 'Yeni Şifreyi Kaydet' }}</button>
            </form>
          } @else {
            <form (submit)="onLogin($event)" class="space-y-5">
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Yönetici e-postası</span><input type="email" [(ngModel)]="username" name="username" autocomplete="username" inputmode="email" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /></label>
              <label class="block"><span class="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Şifre</span><div class="relative"><input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" autocomplete="current-password" class="min-h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-4 pr-16 font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:bg-white" /><button type="button" (click)="showPassword.update(v => !v)" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute inset-y-0 right-0 flex min-w-14 items-center justify-center px-3 text-xs font-black text-slate-500">{{ showPassword() ? 'Gizle' : 'Göster' }}</button></div></label>
              <button type="submit" [disabled]="isLoading()" class="min-h-14 w-full rounded-xl bg-slate-950 px-5 font-black text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600">{{ isLoading() ? 'Kontrol ediliyor...' : 'Güvenli Giriş Yap' }}</button>
            </form>
            <div class="mt-4 flex justify-start text-xs font-black"><button type="button" (click)="setMode('forgot')" class="min-h-11 text-slate-700 hover:underline">Şifremi unuttum</button></div>
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
  readonly mode = signal<"login" | "forgot" | "set-password">("login");
  readonly errorMsg = signal("");
  readonly successMsg = signal("");
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.authService.waitUntilReady();
    const params = new URLSearchParams(window.location.search);
    const passwordFlow = params.get("recovery") === "1" || params.get("invite") === "1";
    if (passwordFlow) {
      if (this.authService.isLoggedIn()) this.mode.set("set-password");
      else { this.mode.set("forgot"); this.errorMsg.set("Bağlantının süresi dolmuş veya bağlantı doğrulanamamış. Yeni bir şifre yenileme bağlantısı isteyin."); }
      return;
    }
    if (this.authService.isLoggedIn()) void this.router.navigate(["/admin/dashboard"]);
  }

  setMode(mode: "login" | "forgot" | "set-password"): void {
    this.mode.set(mode); this.errorMsg.set(""); this.successMsg.set(""); this.password = ""; this.confirmPassword = "";
    this.username = this.authService.getPrimaryAdminEmail(); this.resetEmail = this.authService.getPrimaryAdminEmail();
  }

  async onLogin(event: Event): Promise<void> {
    event.preventDefault(); this.errorMsg.set(""); this.successMsg.set(""); this.isLoading.set(true);
    const success = await this.authService.login(this.username, this.password); this.isLoading.set(false);
    if (success) { void this.router.navigate(["/admin/dashboard"]); return; }
    this.syncError("Yönetici girişi tamamlanamadı.");
  }

  async onSetPassword(event: Event): Promise<void> {
    event.preventDefault(); this.errorMsg.set(""); this.successMsg.set("");
    if (this.password !== this.confirmPassword) { this.errorMsg.set("Yeni şifreler birbiriyle eşleşmiyor."); return; }
    const validation = this.authService.validateStrongPassword(this.password); if (validation) { this.errorMsg.set(validation); return; }
    this.isLoading.set(true); const success = await this.authService.changeCurrentPassword(this.password); this.isLoading.set(false);
    if (!success) { this.syncError("Yeni şifre kaydedilemedi."); return; }
    this.successMsg.set("Şifreniz güncellendi. Yönetim paneli açılıyor."); this.password = ""; this.confirmPassword = "";
    window.history.replaceState(null, document.title, "/admin/login");
    setTimeout(() => void this.router.navigate(["/admin/dashboard"]), 450);
  }

  async doReset(): Promise<void> {
    this.errorMsg.set(""); this.successMsg.set("");
    const email = this.resetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.errorMsg.set("Geçerli yönetici e-posta adresini girin."); return; }
    this.isLoading.set(true);
    const success = await this.authService.resetPassword(email);
    this.isLoading.set(false);
    if (!success) { this.syncError("Şifre yenileme isteği işlenemedi."); return; }
    this.successMsg.set("Yenileme isteği e-posta servisine iletildi. Gelen kutusu ve spam klasörünü kontrol edin. Güvenlik nedeniyle hesap varlığı bu ekranda açıklanmaz.");
  }

  private syncError(fallback: string): void { this.errorMsg.set(this.authService.lastErrorMessage() || fallback); }
}
