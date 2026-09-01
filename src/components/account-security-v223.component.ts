import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerAuthService } from '../services/customer-auth.service';

@Component({
  selector: 'app-account-security-v223',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section id="account-security" class="security-shell" aria-labelledby="account-security-title">
      <div class="security-card">
        <header>
          <div>
            <p class="eyebrow">HESAP GÜVENLİĞİ</p>
            <h2 id="account-security-title">Parolanızı güvenle yönetin</h2>
            <span>Yeni parola yalnız Supabase Auth hesabınızda değiştirilir. Parola uygulama veritabanında veya tarayıcı ayarlarında saklanmaz.</span>
          </div>
          <button type="button" class="toggle" (click)="toggle()" [attr.aria-expanded]="open()" aria-controls="account-password-form">
            {{ open() ? 'Kapat' : 'Parolayı Değiştir' }}
          </button>
        </header>

        @if (message()) { <p class="notice success" role="status">{{ message() }}</p> }
        @if (error()) { <p class="notice error" role="alert">{{ error() }}</p> }

        @if (open()) {
          <form id="account-password-form" (ngSubmit)="save()" novalidate>
            <label>
              <span>Yeni parola</span>
              <input [(ngModel)]="newPassword" name="accountNewPassword" type="password" autocomplete="new-password" minlength="10" required />
            </label>
            <label>
              <span>Yeni parola tekrar</span>
              <input [(ngModel)]="confirmPassword" name="accountConfirmPassword" type="password" autocomplete="new-password" minlength="10" required />
            </label>
            <p class="hint">En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın. Veri sızıntılarında görülen parolalar kabul edilmez.</p>
            <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Güncelleniyor…' : 'Yeni Parolayı Kaydet' }}</button>
          </form>
        }
      </div>
    </section>
  `,
  styles: [`
    :host{display:block;background:#060a12}.security-shell{padding:0 clamp(14px,3vw,34px)}.security-card{width:min(100%,1180px);margin:0 auto 16px;border:1px solid #263548;border-radius:18px;background:#0b1420;padding:14px;color:#f4f6f8}.security-card header{display:flex;align-items:center;justify-content:space-between;gap:14px}.eyebrow{margin:0;color:#c6a15b;font-size:.56rem;font-weight:950;letter-spacing:.14em}.security-card h2{margin:.25rem 0 0;font:700 clamp(1.05rem,3vw,1.45rem)/1.1 Georgia,serif}.security-card header span{display:block;margin-top:.35rem;max-width:720px;color:#98a6b8;font-size:.68rem;line-height:1.5}.toggle,.primary{min-height:44px;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 14px;color:#f8fafc;font-weight:900}.primary{border:0;background:#315e86}.toggle:focus-visible,.primary:focus-visible,input:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}form{display:grid;gap:10px;margin-top:14px;border-top:1px solid #263548;padding-top:14px}label{display:grid;gap:5px}label span{color:#cbd5e1;font-size:.64rem;font-weight:900}input{width:100%;min-height:48px;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 12px;color:#fff;font:inherit}.hint{margin:0;color:#98a6b8;font-size:.64rem;line-height:1.55}.notice{margin:12px 0 0;border-radius:10px;padding:10px 12px;font-size:.68rem;line-height:1.5}.success{border:1px solid rgba(52,211,153,.28);background:rgba(6,78,59,.18);color:#a7f3d0}.error{border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.18);color:#fecaca}@media(min-width:720px){form{grid-template-columns:1fr 1fr}.hint,.primary{grid-column:1/-1}.primary{justify-self:start}}@media(max-width:620px){.security-card header{align-items:stretch;flex-direction:column}.toggle{width:100%}}
  `],
})
export class AccountSecurityV223Component {
  private readonly auth = inject(CustomerAuthService);
  readonly open = signal(false);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  newPassword = '';
  confirmPassword = '';

  toggle(): void {
    this.open.update((value) => !value);
    this.error.set(null);
    this.message.set(null);
    if (!this.open()) this.clearFields();
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.error.set(null);
    this.message.set(null);
    if (!this.newPassword || !this.confirmPassword) {
      this.error.set('Yeni parola alanlarını doldurun.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Yeni parolalar birbiriyle eşleşmiyor.');
      return;
    }
    this.saving.set(true);
    try {
      if (!(await this.auth.changePassword(this.newPassword))) {
        this.error.set(this.auth.lastError() || 'Yeni parola kaydedilemedi.');
        return;
      }
      this.clearFields();
      this.open.set(false);
      this.message.set('Parolanız güvenli şekilde güncellendi.');
    } finally {
      this.saving.set(false);
    }
  }

  private clearFields(): void {
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
