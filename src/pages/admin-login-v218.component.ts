import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminPasswordRecoveryV220Service } from '../services/admin-password-recovery-v220.service';

@Component({
  selector: 'app-admin-login-v218',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="shell" aria-labelledby="admin-login-title">
        <a routerLink="/" class="brand" aria-label="Alperler Rent A Car ana sayfa">Alperler Rent A Car</a>
        <div class="eyebrow">GÜVENLİ YÖNETİM ERİŞİMİ</div>
        <h1 id="admin-login-title">{{recoveryMode() ? 'Yeni Parola' : 'Admin Paneli'}}</h1>
        <p class="intro">
          {{recoveryMode()
            ? 'Yönetici kurtarma oturumu doğrulandı. Yeni parolanızı belirleyip güvenli yönetim oturumuna devam edin.'
            : 'Yalnız yönetim yetkisi tanımlı, doğrulanmış hesaplar giriş yapabilir. Yeni yönetici kaydı bu ekrandan açılamaz.'}}
        </p>

        @if(recoveryMode()) {
          <form (ngSubmit)="saveNewPassword()" novalidate>
            <label><span>Yeni parola</span><input name="newPassword" [(ngModel)]="password" type="password" autocomplete="new-password" required /></label>
            <label><span>Yeni parola tekrar</span><input name="confirmPassword" [(ngModel)]="confirmPassword" type="password" autocomplete="new-password" required /></label>
            <p class="password-note">En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.</p>
            <button type="submit" class="primary" [disabled]="working()">{{working()?'Kaydediliyor…':'Yeni Parolayı Kaydet'}}</button>
          </form>
          <button type="button" class="recovery" (click)="cancelRecovery()" [disabled]="working()">Giriş ekranına dön</button>
        } @else {
          <form (ngSubmit)="login()" novalidate>
            <label><span>E-posta</span><input name="email" [(ngModel)]="email" type="email" autocomplete="username" inputmode="email" required /></label>
            <label><span>Parola</span><input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required /></label>
            <button type="submit" class="primary" [disabled]="working()">{{working()?'Doğrulanıyor…':'Giriş Yap'}}</button>
          </form>
          <button type="button" class="recovery" (click)="resetPassword()" [disabled]="working()">Parolamı unuttum</button>
        }

        @if(error()){<p class="error" role="alert">{{error()}}</p>}
        @if(message()){<p class="success" role="status">{{message()}}</p>}
        <p class="security">
          {{recoveryMode()
            ? 'Bu ekran yalnız Supabase Auth tarafından doğrulanan tek kullanımlık kurtarma oturumunda parola değiştirebilir.'
            : 'Parola e-posta ile gönderilmez. Yenileme bağlantısı yalnız yönetici kurtarma ekranında ve tek kullanımlık güvenli oturumla çalışır.'}}
        </p>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100dvh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 0,rgba(198,161,91,.08),transparent 32rem),#060a12;color:#f4f6f8;font-family:Inter,system-ui,sans-serif}.shell{width:min(100%,430px);border:1px solid #27364a;border-radius:24px;background:#0b1420;padding:clamp(20px,5vw,32px);box-shadow:0 28px 80px rgba(0,0,0,.38)}.brand{color:#f4f6f8;text-decoration:none;font:700 .82rem Georgia,serif;letter-spacing:.06em;text-transform:uppercase}.eyebrow{margin-top:2rem;color:#c6a15b;font-size:.62rem;font-weight:950;letter-spacing:.16em}h1{margin:.45rem 0 0;font:650 2.35rem/1.05 Georgia,serif}.intro,.security{color:#a2adba;line-height:1.65}.intro{font-size:.76rem;margin:.65rem 0 1.35rem}.security{margin:1.15rem 0 0;border-top:1px solid #27364a;padding-top:1rem;font-size:.63rem}form{display:grid;gap:.85rem}label{display:grid;gap:.35rem}label span{color:#a2adba;font-size:.64rem;font-weight:850}input{width:100%;min-height:50px;border:1px solid #27364a;border-radius:12px;background:#0e1724;padding:0 .8rem;color:#fff;font:inherit;outline:none}input:focus{border-color:#7899b8;box-shadow:0 0 0 3px rgba(120,153,184,.16)}button{min-height:48px;border-radius:11px;font:900 .76rem inherit}.primary{border:0;background:#315e86;color:#fff}.recovery{width:100%;margin-top:.7rem;border:1px solid #27364a;background:transparent;color:#a2adba}.primary:disabled,.recovery:disabled{opacity:.55}.password-note{margin:-.2rem 0 0;color:#7f8ea3;font-size:.61rem;line-height:1.5}.error,.success{margin:.8rem 0 0;border-radius:10px;padding:.75rem;font-size:.68rem;line-height:1.5}.error{border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.15);color:#fecaca}.success{border:1px solid rgba(52,211,153,.24);background:rgba(6,78,59,.14);color:#a7f3d0}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #7899b8;outline-offset:3px}
  `],
})
export class AdminLoginV218Component implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly recovery = inject(AdminPasswordRecoveryV220Service);
  readonly working=signal(false);
  readonly error=signal<string|null>(null);
  readonly message=signal<string|null>(null);
  readonly recoveryMode=signal(false);
  email='';password='';confirmPassword='';

  async ngOnInit():Promise<void>{
    await this.auth.waitUntilReady();
    const requestedRecovery=this.route.snapshot.queryParamMap.get('recovery')==='1';
    if(requestedRecovery){
      if(this.auth.isLoggedIn()){
        this.recoveryMode.set(true);
        return;
      }
      this.error.set('Parola yenileme bağlantısı geçersiz, süresi dolmuş veya yönetici yetkisi doğrulanamamış. Yeni bir bağlantı isteyin.');
      return;
    }
    if(this.auth.isLoggedIn())await this.router.navigateByUrl('/admin',{replaceUrl:true});
  }

  async login():Promise<void>{
    if(this.working()||this.recoveryMode())return;
    this.error.set(null);this.message.set(null);
    const email=this.email.trim().toLowerCase();
    if(!email||!this.password){this.error.set('E-posta ve parola alanlarını doldurun.');return;}
    this.working.set(true);
    try{
      if(!await this.auth.login(email,this.password)){
        this.error.set(this.auth.lastErrorMessage()||'Yönetici hesabı doğrulanamadı.');
        return;
      }
      await this.router.navigateByUrl('/admin',{replaceUrl:true});
    }finally{this.working.set(false);}
  }

  async resetPassword():Promise<void>{
    if(this.working()||this.recoveryMode())return;
    this.error.set(null);this.message.set(null);
    const email=this.email.trim().toLowerCase();
    if(!email){this.error.set('Önce yönetici e-posta adresinizi girin.');return;}
    this.working.set(true);
    try{
      const result=await this.recovery.request(email);
      if(!result.ok){this.error.set(result.message||'Parola yenileme isteği işlenemedi.');return;}
      this.message.set('Güvenli parola yenileme bağlantısı e-posta adresinize gönderildi. En yeni bağlantıyı aynı cihaz ve tarayıcıda açın.');
    }finally{this.working.set(false);}
  }

  async saveNewPassword():Promise<void>{
    if(this.working()||!this.recoveryMode())return;
    this.error.set(null);this.message.set(null);
    if(!this.password||!this.confirmPassword){this.error.set('Yeni parola alanlarını doldurun.');return;}
    if(this.password!==this.confirmPassword){this.error.set('Yeni parolalar birbiriyle eşleşmiyor.');return;}
    this.working.set(true);
    try{
      if(!await this.auth.changeCurrentPassword(this.password)){
        this.error.set(this.auth.lastErrorMessage()||'Yeni yönetici parolası kaydedilemedi.');
        return;
      }
      this.message.set('Parolanız güncellendi. Yönetim paneli açılıyor.');
      await this.router.navigateByUrl('/admin',{replaceUrl:true});
    }finally{this.working.set(false);}
  }

  async cancelRecovery():Promise<void>{
    if(this.working())return;
    this.recoveryMode.set(false);this.password='';this.confirmPassword='';this.error.set(null);this.message.set(null);
    await this.router.navigateByUrl('/admin/login',{replaceUrl:true});
  }
}
