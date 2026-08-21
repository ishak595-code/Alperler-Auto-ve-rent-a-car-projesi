import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerAuthService, CustomerSocialProvider } from '../services/customer-auth.service';

@Component({
  selector: 'app-account-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <section class="shell">
        <header class="topbar">
          <a routerLink="/" class="brand" aria-label="Alperler Rent A Car ana sayfa">
            <span class="brand-mark" aria-hidden="true">A</span>
            <span><strong>Alperler Rent A Car</strong><small>Kiralama • Satış • Tur</small></span>
          </a>
          <a routerLink="/" class="site-link">Siteye dön</a>
        </header>

        <div class="layout">
          <section class="intro" aria-labelledby="account-title">
            <p class="eyebrow">ALPERLER HESABI</p>
            <h1 id="account-title">İşlemlerinizi tek hesapta, daha az uğraşla yönetin.</h1>
            <p class="intro-copy">Araç kiralama, satın alma talebi ve tur işlemleriniz hesabınıza bağlanır. Profil bilgileriniz, sadakat puanlarınız, davet avantajlarınız ve Alperler Cüzdan aynı yerde kalır.</p>
            <p class="guest-note">Üyelik zorunlu değildir. İsterseniz siteyi hesap açmadan gezebilir ve uygun işlemleri misafir olarak sürdürebilirsiniz.</p>

            <div class="benefits" aria-label="Üyelik avantajları">
              <article><span class="benefit-index">01</span><div><strong>Tekrar bilgi girmeyin</strong><p>Ad, telefon ve adres gibi temel bilgiler sonraki işlemlerde hazır olur.</p></div></article>
              <article><span class="benefit-index">02</span><div><strong>İşlemleriniz kaybolmasın</strong><p>Kiralama, satış ve tur geçmişinizi hesabınızdan takip edin.</p></div></article>
              <article><span class="benefit-index">03</span><div><strong>Sadakat avantajlarını görün</strong><p>Puan, seviye ve arkadaş daveti kazanımlarınız tek bakışta görünür.</p></div></article>
            </div>
          </section>

          <section class="card" aria-label="Müşteri hesabı">
            @if (auth.pendingReferral(); as referral) {
              <div class="invite" role="status">
                <span class="invite-icon" aria-hidden="true">✦</span>
                <div><strong>Bir arkadaşınız sizi davet etti.</strong><p>Davet kodunuz {{ referral }} hesabınıza hazırlanacak. Puan, yalnız uygun gerçek işlem tamamlandığında oluşur.</p></div>
              </div>
            }

            <div class="tabs" role="tablist" aria-label="Hesap işlemi">
              <button type="button" role="tab" [attr.aria-selected]="mode()==='login'" [class.active]="mode()==='login'" (click)="setMode('login')">Giriş Yap</button>
              <button type="button" role="tab" [attr.aria-selected]="mode()==='register'" [class.active]="mode()==='register'" (click)="setMode('register')">Kayıt Ol</button>
            </div>

            <div class="card-heading">
              <h2>{{ mode()==='login' ? 'Tekrar hoş geldiniz' : 'Alperler hesabınıza kayıt olun' }}</h2>
              <p>{{ mode()==='login' ? 'E-posta ve parolanızla hesabınıza giriş yapın.' : 'Birkaç bilgiyle kaydınızı tamamlayın ve işlemlerinizi tek yerde toplayın.' }}</p>
            </div>

            @if (anySocialProviderEnabled()) {
              <div class="social" aria-label="Sosyal hesap ile devam et">
                @if (auth.providerEnabled('google')) { <button type="button" (click)="social('google')"><span class="provider-mark" aria-hidden="true">G</span>Google ile devam et</button> }
                @if (auth.providerEnabled('facebook')) { <button type="button" (click)="social('facebook')"><span class="provider-mark facebook" aria-hidden="true">f</span>Facebook ile devam et</button> }
                @if (auth.providerEnabled('apple')) { <button type="button" (click)="social('apple')">Apple ile devam et</button> }
              </div>
              <div class="divider"><span>veya e-posta ile</span></div>
            }

            <form (ngSubmit)="submit()">
              @if (mode()==='register') {
                <label><span>Ad Soyad</span><input name="fullName" [(ngModel)]="fullName" autocomplete="name" required placeholder="Adınız ve soyadınız" /></label>
              }
              <label><span>E-posta</span><input name="email" [(ngModel)]="email" type="email" autocomplete="email" inputmode="email" required placeholder="ornek@email.com" /></label>
              <label><span>Parola</span><input name="password" [(ngModel)]="password" type="password" [attr.autocomplete]="mode()==='register' ? 'new-password' : 'current-password'" required [placeholder]="mode()==='register' ? 'En az 10 karakter' : 'Parolanız'" /></label>
              @if (mode()==='register') {
                <small class="password-note">En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.</small>
              }
              <button class="primary" type="submit" [disabled]="working()">{{ working() ? 'İşleniyor…' : mode()==='login' ? 'Giriş Yap' : 'Kayıt Ol' }}</button>
            </form>

            @if (auth.lastError()) { <p class="error" role="alert">{{ auth.lastError() }}</p> }
            @if (message()) { <p class="success" role="status">{{ message() }}</p> }

            <div class="secondary-actions">
              @if (mode()==='login') { <button class="text-action" type="button" (click)="reset()">Parolamı unuttum</button> }
              <a routerLink="/">Hesap açmadan devam et</a>
            </div>

            @if (mode()==='register') {
              <p class="legal-note">Kayıt olarak hesap hizmeti için gerekli verilerin işlenmesini kabul etmiş olursunuz. Gizlilik ve kullanım koşullarını <a routerLink="/legal">buradan</a> inceleyebilirsiniz.</p>
            }
          </section>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100vh;background:radial-gradient(circle at 15% 12%,rgba(234,191,53,.045),transparent 26rem),#050a18;color:#f8fafc;padding:clamp(18px,3vw,42px)}.shell{width:min(100%,1180px);margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:clamp(42px,7vw,88px)}.brand{display:inline-flex;align-items:center;gap:.75rem;color:#f8fafc;text-decoration:none;min-width:0}.brand-mark{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:13px;background:#eabf35;color:#111827;font-weight:950;box-shadow:0 10px 28px rgba(0,0,0,.26)}.brand strong,.brand small{display:block}.brand strong{font-family:Georgia,serif;font-size:.9rem;letter-spacing:.045em;text-transform:uppercase}.brand small{margin-top:.1rem;color:#64748b;font-size:.54rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.site-link{display:inline-flex;min-height:42px;align-items:center;border:1px solid #24314a;border-radius:12px;padding:0 .85rem;color:#cbd5e1;text-decoration:none;font-size:.72rem;font-weight:800}.site-link:hover{border-color:#334155;color:#fff}.layout{display:grid;gap:clamp(34px,7vw,88px);align-items:start}.intro{padding-top:clamp(8px,2vw,22px)}.eyebrow{margin:0;color:#d5b449;font-size:.65rem;font-weight:950;letter-spacing:.18em}.intro h1{max-width:760px;margin:.65rem 0 1.15rem;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.15rem,6vw,4.7rem);font-weight:650;line-height:.99;letter-spacing:-.035em}.intro-copy{max-width:650px;margin:0;color:#cbd5e1;font-size:clamp(.94rem,1.8vw,1.08rem);line-height:1.72}.guest-note{max-width:620px;margin:1rem 0 0;color:#94a3b8;font-size:.78rem;line-height:1.65}.benefits{display:grid;gap:0;margin-top:clamp(34px,5vw,60px);border-top:1px solid #24314a}.benefits article{display:grid;grid-template-columns:42px 1fr;gap:1rem;padding:1.15rem 0;border-bottom:1px solid #1c293d}.benefit-index{color:#64748b;font-size:.62rem;font-weight:900;letter-spacing:.12em}.benefits strong{display:block;font-size:.82rem}.benefits p{margin:.28rem 0 0;color:#94a3b8;font-size:.72rem;line-height:1.55}.card{border:1px solid #24314a;border-radius:24px;background:#0b1224;padding:clamp(18px,3vw,30px);box-shadow:0 24px 70px rgba(0,0,0,.3)}.invite{display:grid;grid-template-columns:auto 1fr;gap:.8rem;align-items:start;margin-bottom:1.2rem;border:1px solid rgba(234,191,53,.28);border-radius:15px;background:rgba(234,191,53,.045);padding:.85rem}.invite-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:#eabf35;color:#111827}.invite strong,.invite p{display:block}.invite strong{font-size:.76rem}.invite p{margin:.22rem 0 0;color:#94a3b8;font-size:.65rem;line-height:1.5}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;border:1px solid #24314a;border-radius:14px;background:#080f20;padding:4px}.tabs button{min-height:44px;border:0;border-radius:10px;background:transparent;color:#94a3b8;font-size:.72rem;font-weight:900}.tabs button.active{background:#101a2e;color:#f8fafc;box-shadow:inset 0 0 0 1px #334155}.card-heading{padding:1.45rem 0 1.05rem}.card-heading h2{margin:0;font-family:Georgia,serif;font-size:1.42rem;font-weight:650}.card-heading p{margin:.35rem 0 0;color:#94a3b8;font-size:.72rem;line-height:1.55}.social{display:grid;gap:.6rem}.social button{display:flex;min-height:48px;align-items:center;justify-content:center;gap:.65rem;border:1px solid #2b3950;border-radius:12px;background:#0d1628;color:#f8fafc;font:inherit;font-size:.75rem;font-weight:850}.social button:hover{border-color:#3a4a63;background:#101a2e}.provider-mark{display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:#f8fafc;color:#111827;font-weight:950}.provider-mark.facebook{background:#1877f2;color:#fff}.divider{display:flex;align-items:center;gap:.8rem;margin:1.15rem 0;color:#64748b;font-size:.62rem}.divider:before,.divider:after{content:'';height:1px;flex:1;background:#24314a}form{display:grid;gap:.85rem}label{display:grid;gap:.38rem}label span{color:#cbd5e1;font-size:.65rem;font-weight:850}input{width:100%;min-height:48px;border:1px solid #2a3850;border-radius:12px;background:#0d1628;padding:0 .8rem;color:#f8fafc;font:inherit;font-size:.8rem;outline:none}input::placeholder{color:#64748b}input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.12)}.password-note{color:#64748b;font-size:.62rem;line-height:1.5}.primary{min-height:50px;margin-top:.15rem;border:0;border-radius:12px;background:#2563eb;color:white;font-weight:950;letter-spacing:.01em}.primary:hover{filter:brightness(1.05)}.primary:disabled{opacity:.58}.error,.success{margin:.8rem 0 0;border-radius:11px;padding:.72rem .78rem;font-size:.7rem;line-height:1.5}.error{border:1px solid rgba(248,113,113,.28);background:rgba(127,29,29,.15);color:#fecaca}.success{border:1px solid rgba(52,211,153,.25);background:rgba(6,78,59,.18);color:#a7f3d0}.secondary-actions{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-top:1rem}.secondary-actions a,.text-action{border:0;background:transparent;padding:.3rem 0;color:#94a3b8;text-decoration:none;font-size:.68rem;font-weight:800}.secondary-actions a:hover,.text-action:hover{color:#f8fafc}.legal-note{margin:1rem 0 0;border-top:1px solid #1c293d;padding-top:1rem;color:#64748b;font-size:.6rem;line-height:1.55}.legal-note a{color:#94a3b8}@media(min-width:900px){.layout{grid-template-columns:minmax(0,1.15fr) minmax(360px,.72fr)}.card{position:sticky;top:32px}}@media(max-width:899px){.topbar{margin-bottom:42px}.intro h1{max-width:680px}.benefits{margin-bottom:6px}}@media(max-width:520px){.page{padding:16px}.topbar{align-items:flex-start}.brand strong{font-size:.78rem}.brand small{font-size:.48rem}.site-link{min-height:38px;padding:0 .65rem}.intro h1{font-size:2.25rem}.card{border-radius:20px;padding:16px}.secondary-actions{align-items:flex-start;flex-direction:column;gap:.35rem}}
  `],
})
export class AccountLoginComponent implements OnInit {
  readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = signal<'login'|'register'>(this.auth.pendingReferral() ? 'register' : 'login');
  readonly working = signal(false);
  readonly message = signal<string|null>(null);
  email = '';
  password = '';
  fullName = '';

  async ngOnInit(): Promise<void> {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'register') this.mode.set('register');
    this.rememberReturnUrl();
    await this.auth.waitUntilReady();
    if (this.auth.isLoggedIn()) await this.router.navigateByUrl(this.auth.consumePostAuthReturnUrl('/account'), { replaceUrl: true });
  }

  setMode(mode: 'login'|'register'): void {
    this.mode.set(mode);
    this.message.set(null);
  }

  anySocialProviderEnabled(): boolean {
    return this.auth.providerEnabled('google') || this.auth.providerEnabled('facebook') || this.auth.providerEnabled('apple');
  }

  async submit(): Promise<void> {
    this.working.set(true);
    this.message.set(null);
    this.rememberReturnUrl();
    try {
      if (this.mode() === 'login') {
        if (await this.auth.signIn(this.email, this.password)) await this.router.navigateByUrl(this.auth.consumePostAuthReturnUrl('/account'), { replaceUrl: true });
      } else {
        const result = await this.auth.signUp(this.email, this.password, this.fullName);
        if (result.created && !result.confirmationRequired) await this.router.navigateByUrl(this.auth.consumePostAuthReturnUrl('/account'), { replaceUrl: true });
        else if (result.created) this.message.set('Kaydınız tamamlandı. E-posta adresinize gelen doğrulama bağlantısına dokunduktan sonra giriş yapabilirsiniz.');
      }
    } finally {
      this.working.set(false);
    }
  }

  async social(provider: CustomerSocialProvider): Promise<void> {
    this.rememberReturnUrl();
    await this.auth.signInWithProvider(provider);
  }

  async reset(): Promise<void> {
    if (await this.auth.resetPassword(this.email)) this.message.set('Parola yenileme bağlantısı e-posta adresinize gönderildi.');
  }

  private rememberReturnUrl(): void {
    this.auth.setPostAuthReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
  }
}
