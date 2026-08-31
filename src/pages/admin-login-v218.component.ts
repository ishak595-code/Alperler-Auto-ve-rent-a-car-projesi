import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-login-v218',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="shell" aria-labelledby="admin-login-title">
        <a routerLink="/" class="brand" aria-label="Alperler Rent A Car ana sayfa">Alperler Rent A Car</a>
        <div class="eyebrow">GÜVENLİ YÖNETİM ERİŞİMİ</div>
        <h1 id="admin-login-title">Admin Paneli</h1>
        <p class="intro">Yalnız yönetim yetkisi tanımlı, doğrulanmış hesaplar giriş yapabilir. Yeni yönetici kaydı bu ekrandan açılamaz.</p>
        <form (ngSubmit)="login()" novalidate>
          <label><span>E-posta</span><input name="email" [(ngModel)]="email" type="email" autocomplete="username" inputmode="email" required /></label>
          <label><span>Parola</span><input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required /></label>
          <button type="submit" class="primary" [disabled]="working()">{{working()?'Doğrulanıyor…':'Giriş Yap'}}</button>
        </form>
        <button type="button" class="recovery" (click)="resetPassword()" [disabled]="working()">Parolamı unuttum</button>
        @if(error()){<p class="error" role="alert">{{error()}}</p>}
        @if(message()){<p class="success" role="status">{{message()}}</p>}
        <p class="security">Parola e-posta ile gönderilmez. Yenileme isterseniz Supabase Auth tek kullanımlık güvenli bağlantıyı e-posta adresinize gönderir.</p>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100dvh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 0,rgba(198,161,91,.08),transparent 32rem),#060a12;color:#f4f6f8;font-family:Inter,system-ui,sans-serif}.shell{width:min(100%,430px);border:1px solid #27364a;border-radius:24px;background:#0b1420;padding:clamp(20px,5vw,32px);box-shadow:0 28px 80px rgba(0,0,0,.38)}.brand{color:#f4f6f8;text-decoration:none;font:700 .82rem Georgia,serif;letter-spacing:.06em;text-transform:uppercase}.eyebrow{margin-top:2rem;color:#c6a15b;font-size:.62rem;font-weight:950;letter-spacing:.16em}h1{margin:.45rem 0 0;font:650 2.35rem/1.05 Georgia,serif}.intro,.security{color:#a2adba;line-height:1.65}.intro{font-size:.76rem;margin:.65rem 0 1.35rem}.security{margin:1.15rem 0 0;border-top:1px solid #27364a;padding-top:1rem;font-size:.63rem}form{display:grid;gap:.85rem}label{display:grid;gap:.35rem}label span{color:#a2adba;font-size:.64rem;font-weight:850}input{width:100%;min-height:50px;border:1px solid #27364a;border-radius:12px;background:#0e1724;padding:0 .8rem;color:#fff;font:inherit;outline:none}input:focus{border-color:#7899b8;box-shadow:0 0 0 3px rgba(120,153,184,.16)}button{min-height:48px;border-radius:11px;font:900 .76rem inherit}.primary{border:0;background:#315e86;color:#fff}.recovery{width:100%;margin-top:.7rem;border:1px solid #27364a;background:transparent;color:#a2adba}.primary:disabled,.recovery:disabled{opacity:.55}.error,.success{margin:.8rem 0 0;border-radius:10px;padding:.75rem;font-size:.68rem;line-height:1.5}.error{border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.15);color:#fecaca}.success{border:1px solid rgba(52,211,153,.24);background:rgba(6,78,59,.14);color:#a7f3d0}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #7899b8;outline-offset:3px}
  `],
})
export class AdminLoginV218Component implements OnInit {
  readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly working=signal(false); readonly error=signal<string|null>(null); readonly message=signal<string|null>(null);
  email='';password='';
  async ngOnInit():Promise<void>{await this.auth.waitUntilReady();if(this.auth.isLoggedIn())await this.router.navigateByUrl('/admin',{replaceUrl:true});}
  async login():Promise<void>{if(this.working())return;this.error.set(null);this.message.set(null);const email=this.email.trim().toLowerCase();if(!email||!this.password){this.error.set('E-posta ve parola alanlarını doldurun.');return;}this.working.set(true);try{if(!await this.auth.login(email,this.password)){this.error.set(this.auth.lastErrorMessage()||'Yönetici hesabı doğrulanamadı.');return;}await this.router.navigateByUrl('/admin',{replaceUrl:true});}finally{this.working.set(false);}}
  async resetPassword():Promise<void>{if(this.working())return;this.error.set(null);this.message.set(null);const email=this.email.trim().toLowerCase();if(!email){this.error.set('Önce yönetici e-posta adresinizi girin.');return;}this.working.set(true);try{if(!await this.auth.resetPassword(email)){this.error.set(this.auth.lastErrorMessage()||'Parola yenileme isteği işlenemedi.');return;}this.message.set('Güvenli parola yenileme bağlantısı e-posta adresinize gönderildi. En yeni bağlantıyı aynı cihaz ve tarayıcıda açın.');}finally{this.working.set(false);}}
}
