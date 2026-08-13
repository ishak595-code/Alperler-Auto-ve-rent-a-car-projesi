
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex font-sans bg-slate-100">
      
      <!-- Left Side: Branding (Hidden on mobile) -->
      <div class="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
         <div class="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=1920&auto=format&fit=crop" alt="Admin Background" class="object-cover w-full h-full opacity-20">
         </div>
         <div class="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-900/20"></div>
         
         <div class="relative z-10 text-center p-12 animate-fade-in">
             @if(config().logoUrl) {
                 <img [src]="config().logoUrl" alt="Logo" class="h-24 object-contain mx-auto mb-8 drop-shadow-2xl">
             } @else {
                 <div class="w-24 h-24 bg-blue-500 text-slate-900 rounded-2xl flex items-center justify-center text-5xl font-serif font-bold mx-auto mb-8 shadow-[0_0_40px_rgba(245,158,11,0.4)]">A</div>
             }
             <h1 class="text-6xl font-serif font-bold text-white mb-4 tracking-tight">YÖNETİM</h1>
             <p class="text-slate-400 text-xl tracking-[0.3em] uppercase font-light border-t border-white/10 pt-6 mt-6 inline-block">Alperler Auto</p>
         </div>
      </div>

      <!-- Right Side: Login Card -->
      <div class="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 md:p-8 relative">
          
          <!-- Back to Site -->
          <a href="/" class="absolute top-8 right-8 text-sm font-bold text-slate-400 hover:text-slate-900 flex items-center transition-colors">
             <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
             Siteye Dön
          </a>

          <div class="w-full max-w-[440px] bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 animate-fade-in-up">
              <div class="text-center mb-10">
                  <span class="bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">Yönetici Paneli</span>
                  <h2 class="text-3xl font-bold text-slate-900">Giriş Yapın</h2>
                  <p class="text-slate-500 mt-2 text-sm">Devam etmek için yetkili hesap bilgilerinizle oturum açın.</p>
              </div>

              @if (generatedPassword()) {
                  <div role="status" aria-live="polite" class="space-y-5">
                    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                      <h3 class="font-bold text-lg mb-2">Güçlü yönetici şifreniz oluşturuldu</h3>
                      <p class="text-sm leading-relaxed">Bu şifre Firebase hesabınıza güvenli biçimde bağlandı. Şifre GitHub koduna veya tarayıcı localStorage alanına kaydedilmedi. Aşağıdaki şifreyi şimdi güvenli bir yere kaydedin.</p>
                    </div>
                    <label for="generatedAdminPassword" class="block text-xs font-bold text-slate-600 uppercase tracking-wider">Yeni yönetici şifresi</label>
                    <div class="flex gap-2">
                      <input id="generatedAdminPassword" [value]="generatedPassword()" readonly aria-label="Yeni yönetici şifresi" class="min-w-0 flex-1 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-sm text-slate-900" />
                      <button type="button" (click)="copyGeneratedPassword()" class="min-h-12 px-4 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Kopyala</button>
                    </div>
                    <button type="button" (click)="continueToDashboard()" class="w-full min-h-14 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Şifreyi Kaydettim, Panele Geç</button>
                  </div>
              } @else if (!showForgotPass) {
                  <form (submit)="onLogin($event)" class="space-y-5">
                      
                      <div class="space-y-4">
                          <div class="relative group">
                              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              </div>
                              <input type="email" [(ngModel)]="username" name="username" autocomplete="username" inputmode="email" aria-label="Yönetici e-posta adresi" class="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-900 transition-all placeholder-slate-400" placeholder="Kullanıcı Adı / E-Posta">
                          </div>

                          <div class="relative group">
                              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <svg class="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                              </div>
                              <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" name="password" autocomplete="current-password" aria-label="Yönetici şifresi" class="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold text-slate-900 transition-all placeholder-slate-400" placeholder="Şifre">
                              
                              <button type="button" (click)="togglePasswordVisibility()" [attr.aria-label]="showPassword() ? 'Şifreyi gizle' : 'Şifreyi göster'" class="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                                  @if(showPassword()) {
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                                  } @else {
                                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                  }
                              </button>
                          </div>
                      </div>

                      @if (errorMsg()) {
                          <div class="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 animate-pulse">
                              <svg class="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              <span class="text-sm font-bold">{{ errorMsg() }}</span>
                          </div>
                      }

                      <div class="flex justify-end">
                          <button type="button" (click)="toggleForgot()" class="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">Şifrenizi mi unuttunuz?</button>
                      </div>

                      <button type="submit" [disabled]="isLoading()" class="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:bg-blue-500 hover:text-slate-900 hover:shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95">
                          @if(isLoading()) {
                              <span class="flex items-center justify-center">
                                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                  Kontrol Ediliyor...
                              </span>
                          } @else {
                              Giriş Yap
                          }
                      </button>

                      <div class="relative flex items-center py-2">
                        <div class="flex-grow border-t border-slate-200"></div>
                        <span class="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase min-w-max">veya</span>
                        <div class="flex-grow border-t border-slate-200"></div>
                      </div>

                      <button type="button" (click)="onGoogleLogin()" [disabled]="isLoading()" class="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed">
                          <svg class="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Google ile Yönetici Girişi
                      </button>
                  </form>
              } @else {
                  <!-- Forgot Password View -->
                  <div class="space-y-6 animate-fade-in">
                      <div class="text-center">
                          <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                          </div>
                          <h3 class="font-bold text-slate-900 text-lg">Şifre Sıfırlama</h3>
                          <p class="text-slate-500 text-sm mt-1">E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.</p>
                      </div>

                      @if(!resetSuccess()) {
                          <div class="space-y-4">
                              <input type="email" [(ngModel)]="resetEmail" class="w-full p-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none font-bold" placeholder="E-Posta Adresiniz">
                              <button (click)="doReset()" [disabled]="isLoading()" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg">
                                  @if(isLoading()) { Bekleyiniz... } @else { Link Gönder }
                              </button>
                          </div>
                      } @else {
                          <div class="bg-green-50 p-6 rounded-xl border border-green-100 text-center animate-fade-in">
                              <svg class="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              <p class="text-green-800 font-bold text-lg">Başarılı!</p>
                              <p class="text-slate-600 text-sm mt-1">Lütfen e-posta kutunuzu kontrol edin.</p>
                          </div>
                      }

                      <button (click)="toggleForgot()" class="w-full py-2 text-slate-400 font-bold hover:text-slate-900 transition-colors text-sm">
                          &larr; Giriş Ekranına Dön
                      </button>
                  </div>
              }
          </div>

          <div class="mt-8 text-center text-xs text-slate-400 font-medium">
              &copy; 2024 Alperler Auto Yönetim Paneli v3.1
          </div>
      </div>
    </div>
  `
})
export class AdminLoginComponent implements OnInit {
  authService = inject(AuthService);
  carService = inject(CarService);
  router = inject(Router);
  
  config = this.carService.getConfig();

  username = '';
  password = '';
  errorMsg = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  
  showForgotPass = false;
  resetEmail = '';
  resetSuccess = signal(false);
  generatedPassword = signal('');

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  clearError() {
    this.errorMsg.set('');
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  async onLogin(e: Event) {
    e.preventDefault();
    this.clearError();
    this.isLoading.set(true);
    
    const success = await this.authService.login(this.username, this.password);
    
    this.isLoading.set(false);

    if (success) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.errorMsg.set('Kullanıcı adı veya şifre hatalı.');
    }
  }

  async onGoogleLogin() {
    this.clearError();
    this.isLoading.set(true);
    
    const success = await this.authService.loginWithGoogle();
    
    this.isLoading.set(false);

    if (success) {
      try {
        const generated = await this.authService.createStrongPasswordForCurrentUser();
        if (generated) {
          this.generatedPassword.set(generated);
          return;
        }
      } catch (error) {
        console.warn('Strong password creation is unavailable; Google login remains active.', error);
      }
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.errorMsg.set('Yetkisiz giriş denemesi veya işlem iptal edildi.');
    }
  }

  async copyGeneratedPassword() {
    const value = this.generatedPassword();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      this.errorMsg.set('Şifre kopyalanamadı. Metni seçip kopyalayabilirsiniz.');
    }
  }

  continueToDashboard() {
    this.generatedPassword.set('');
    this.router.navigate(['/admin/dashboard']);
  }

  toggleForgot() {
      this.showForgotPass = !this.showForgotPass;
      this.resetSuccess.set(false);
      this.resetEmail = '';
      this.errorMsg.set('');
  }

  async doReset() {
      if (!this.resetEmail || !this.resetEmail.includes('@')) {
         this.errorMsg.set('Geçerli bir e-posta adresi giriniz.');
         return;
      }

      this.isLoading.set(true);
      const success = await this.authService.resetPassword(this.resetEmail);
      this.isLoading.set(false);
      
      if(success) {
          this.resetSuccess.set(true);
          this.errorMsg.set('');
      } else {
          this.errorMsg.set('İşlem başarısız oldu.');
      }
  }
}
