import { CommonModule } from '@angular/common';
import { Component, Injector, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CustomerAuthService, CustomerSocialProvider } from '../services/customer-auth.service';
import { ProfileAdminBridgeService } from '../services/profile-admin-bridge.service';

type AccountMode='login'|'register'|'recovery';
@Component({
  selector:'app-account-login',standalone:true,imports:[CommonModule,FormsModule,RouterLink],
  template:`
    <main class="page"><section class="shell">
      <header class="topbar"><a routerLink="/" class="brand" aria-label="Alperler Rent A Car ana sayfa"><span class="brand-mark" aria-hidden="true">A</span><span><strong>Alperler Rent A Car</strong><small>Kiralama • Satış • Tur</small></span></a><a routerLink="/" class="site-link">Siteye dön</a></header>
      <section class="auth-wrap" aria-labelledby="account-title">
        <div class="heading"><p>{{ adminReturnTarget() ? 'ALPERLER YÖNETİM HESABI' : 'ALPERLER HESABI' }}</p><h1 id="account-title">{{ mode()==='recovery'?'Yeni parolanızı belirleyin':mode()==='login'?'Hesabınıza giriş yapın':'Hesabınızı oluşturun' }}</h1><span>{{ mode()==='recovery'?'Güvenli yenileme bağlantınız doğrulandı. Yeni parolanızı kaydedin.':adminReturnTarget()?'Yetkili hesabınızla giriş yaptığınızda yönetim paneline güvenli biçimde yönlendirilirsiniz.':mode()==='login'?'İşlemlerinize ve hesabınıza kaldığınız yerden devam edin.':'Kiralama, satış ve tur işlemlerinizi tek hesapta takip edin.' }}</span></div>
        <section class="card" [attr.aria-label]="adminReturnTarget() ? 'Yönetici hesabı girişi' : 'Müşteri hesabı'">
          @if(auth.pendingReferral();as referral){<div class="invite" role="status"><span aria-hidden="true">✦</span><div><strong>Bir arkadaşınızın davetiyle geldiniz.</strong><p>Davetiniz hesabınızla eşleştirilecek. Uygun gerçek işlem tamamlandığında avantaj otomatik değerlendirilir.</p></div></div>}

          @if(mode()!=='recovery'){
            <div class="tabs" role="tablist" aria-label="Hesap işlemi"><button type="button" role="tab" [attr.aria-selected]="mode()==='login'" [class.active]="mode()==='login'" (click)="setMode('login')">Giriş Yap</button><button type="button" role="tab" [attr.aria-selected]="mode()==='register'" [class.active]="mode()==='register'" (click)="setMode('register')">Kayıt Ol</button></div>
            <div class="social" aria-label="Sosyal hesap ile devam et">
              <button type="button" (click)="social('google')" [class.unavailable]="!auth.providerEnabled('google')" aria-label="Google ile devam et"><span class="provider-mark google" aria-hidden="true">G</span><span>Google ile devam et</span></button>
              <button type="button" (click)="social('facebook')" [class.unavailable]="!auth.providerEnabled('facebook')" aria-label="Facebook ile devam et"><span class="provider-mark facebook" aria-hidden="true">f</span><span>Facebook ile devam et</span></button>
              @if(auth.providerEnabled('apple')){<button type="button" (click)="social('apple')" aria-label="Apple ile devam et"><span class="provider-mark apple" aria-hidden="true">●</span><span>Apple ile devam et</span></button>}
            </div><div class="divider"><span>veya e-posta ile</span></div>
          }

          <form (ngSubmit)="submit()">
            @if(mode()==='register'){<label><span>Ad Soyad</span><input name="fullName" [(ngModel)]="fullName" autocomplete="name" required placeholder="Adınız ve soyadınız" /></label>}
            @if(mode()!=='recovery'){<label><span>E-posta</span><input name="email" [(ngModel)]="email" type="email" autocomplete="email" inputmode="email" required placeholder="ornek@email.com" /></label>}
            <label><span>{{mode()==='recovery'?'Yeni parola':'Parola'}}</span><input name="password" [(ngModel)]="password" type="password" [attr.autocomplete]="mode()==='login'?'current-password':'new-password'" required [placeholder]="mode()==='login'?'Parolanız':'En az 10 karakter'" /></label>
            @if(mode()==='register'||mode()==='recovery'){<small class="password-note">En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.</small>}
            @if(mode()==='recovery'){<label><span>Yeni parola tekrar</span><input name="confirmPassword" [(ngModel)]="confirmPassword" type="password" autocomplete="new-password" required placeholder="Yeni parolanızı tekrar girin" /></label>}
            <button class="primary" type="submit" [disabled]="working()">{{working()?'İşleniyor…':mode()==='recovery'?'Yeni Parolayı Kaydet':mode()==='login'?'Giriş Yap':'Kayıt Ol'}}</button>
          </form>
          @if(auth.lastError() || adminError()){<p class="error" role="alert">{{auth.lastError() || adminError()}}</p>}@if(message()){<p class="success" role="status">{{message()}}</p>}
          <div class="secondary-actions">@if(mode()==='login'){<button type="button" class="text-action" (click)="reset()">Parolamı unuttum</button>}@if(mode()==='recovery'){<button type="button" class="text-action" (click)="cancelRecovery()">Giriş ekranına dön</button>}@else{<a routerLink="/">Hesap açmadan devam et</a>}</div>
          @if(mode()!=='recovery'){<details class="account-info"><summary>Alperler hesabı ne sağlar?</summary><div class="info-body"><p>Profil bilgilerinizi yeniden girmeden kullanabilir, hesabınıza bağlanan kiralama, satış ve tur işlemlerinizi takip edebilir, sadakat ve davet avantajlarınızı görebilirsiniz.</p><ul><li>İşlem geçmişi ve profil bilgileri tek yerde</li><li>Alperler Cüzdan ve uygun belge yönetimi</li><li>Sadakat puanları ve kampanyalı arkadaş davetleri</li></ul><a routerLink="/legal">Gizlilik ve kullanım koşullarını inceleyin</a></div></details>}
        </section>
      </section>
    </section></main>
  `,
  styles:[`
    :host{display:block}.page{min-height:100vh;background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--alper-gold,#c6a15b) 5%,transparent),transparent 28rem),var(--alper-bg,#060a12);color:var(--alper-text,#f4f6f8);padding:clamp(16px,3vw,36px)}.shell{width:min(100%,1040px);margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem}.brand{display:inline-flex;min-width:0;align-items:center;gap:.72rem;color:var(--alper-text,#fff);text-decoration:none}.brand-mark{display:grid;width:44px;height:44px;flex:0 0 44px;place-items:center;border-radius:13px;background:var(--alper-gold,#c6a15b);color:#111827;font-weight:950}.brand strong,.brand small{display:block}.brand strong{font:800 .88rem Georgia,serif;letter-spacing:.04em;text-transform:uppercase}.brand small{margin-top:.12rem;color:var(--alper-subtle,#718096);font-size:.52rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.site-link{display:inline-flex;min-height:42px;align-items:center;border:1px solid var(--alper-border,#27364a);border-radius:12px;padding:0 .8rem;color:var(--alper-muted,#a2adba);text-decoration:none;font-size:.7rem;font-weight:850}.auth-wrap{width:min(100%,520px);margin:clamp(48px,8vw,88px) auto 0}.heading{text-align:center;margin-bottom:1.1rem}.heading p{margin:0;color:var(--alper-gold,#c6a15b);font-size:.62rem;font-weight:950;letter-spacing:.16em}.heading h1{margin:.45rem 0 0;font:650 clamp(2rem,7vw,2.75rem)/1.05 Georgia,serif}.heading span{display:block;margin:.55rem auto 0;max-width:430px;color:var(--alper-muted,#a2adba);font-size:.76rem;line-height:1.6}.card{border:1px solid var(--alper-border,#27364a);border-radius:22px;background:var(--alper-surface,#0b1420);padding:clamp(16px,3vw,26px);box-shadow:0 24px 70px rgba(0,0,0,.28)}.invite{display:grid;grid-template-columns:auto 1fr;gap:.7rem;margin-bottom:1rem;border:1px solid color-mix(in srgb,var(--alper-gold,#c6a15b) 30%,transparent);border-radius:13px;background:color-mix(in srgb,var(--alper-gold,#c6a15b) 5%,transparent);padding:.75rem}.invite>span{color:var(--alper-gold,#c6a15b)}.invite strong{display:block;font-size:.72rem}.invite p{margin:.2rem 0 0;color:var(--alper-muted,#a2adba);font-size:.63rem;line-height:1.5}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;border:1px solid var(--alper-border,#27364a);border-radius:13px;background:var(--alper-list,#08101b);padding:4px;margin-bottom:1.1rem}.tabs button{min-height:44px;border:0;border-radius:9px;background:transparent;color:var(--alper-muted,#a2adba);font-weight:900}.tabs button.active{background:var(--alper-elevated,#121d2c);color:var(--alper-text,#fff)}.social{display:grid;gap:.55rem}.social button{display:flex;min-height:48px;align-items:center;justify-content:center;gap:.6rem;border:1px solid var(--alper-border,#27364a);border-radius:11px;background:var(--alper-card,#0e1724);color:var(--alper-text,#fff);font:850 .76rem inherit}.social button.unavailable{border-style:dashed;color:var(--alper-muted,#a2adba)}.provider-mark{display:grid;width:24px;height:24px;place-items:center;border-radius:999px;background:#fff;color:#111827;font-weight:950}.provider-mark.google{font-family:Arial,sans-serif}.provider-mark.facebook{background:#1877f2;color:#fff;font-family:Arial,sans-serif;font-size:1rem}.provider-mark.apple{background:#111;color:#fff}.divider{display:flex;align-items:center;gap:.7rem;margin:1rem 0;color:var(--alper-subtle,#718096);font-size:.62rem}.divider:before,.divider:after{content:'';height:1px;flex:1;background:var(--alper-border,#27364a)}form{display:grid;gap:.8rem}label{display:grid;gap:.35rem}label span{color:var(--alper-muted,#a2adba);font-size:.64rem;font-weight:850}input{width:100%;min-height:48px;border:1px solid var(--alper-border,#27364a);border-radius:11px;background:var(--alper-card,#0e1724);padding:0 .78rem;color:var(--alper-text,#fff);font:inherit;outline:none}input:focus{border-color:var(--alper-blue-light,#7899b8);box-shadow:0 0 0 3px color-mix(in srgb,var(--alper-blue-light,#7899b8) 16%,transparent)}.password-note{color:var(--alper-subtle,#718096);font-size:.61rem;line-height:1.45}.primary{min-height:50px;border:0;border-radius:11px;background:var(--alper-blue,#315e86);color:#fff;font-weight:950}.primary:disabled{opacity:.58}.error,.success{margin:.8rem 0 0;border-radius:10px;padding:.7rem;font-size:.68rem;line-height:1.5}.error{border:1px solid rgba(248,113,113,.25);background:rgba(127,29,29,.14);color:#fecaca}.success{border:1px solid rgba(52,211,153,.24);background:rgba(6,78,59,.14);color:#a7f3d0}.secondary-actions{display:flex;justify-content:space-between;gap:1rem;margin-top:.9rem}.secondary-actions a,.text-action{border:0;background:transparent;padding:.3rem 0;color:var(--alper-muted,#a2adba);text-decoration:none;font-size:.66rem;font-weight:850}.account-info{margin-top:1rem;border-top:1px solid var(--alper-border,#27364a);padding-top:.85rem}.account-info summary{min-height:42px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;color:var(--alper-text,#fff);font-size:.7rem;font-weight:900;list-style:none}.account-info summary:after{content:'+';color:var(--alper-blue-light,#7899b8);font-size:1rem}.account-info[open] summary:after{content:'−'}.info-body{border-radius:12px;background:var(--alper-card,#0e1724);padding:.8rem}.info-body p,.info-body li{color:var(--alper-muted,#a2adba);font-size:.65rem;line-height:1.55}.info-body p{margin:0}.info-body ul{margin:.6rem 0;padding-left:1.1rem}.info-body a{color:var(--alper-blue-light,#7899b8);font-size:.65rem;font-weight:850;text-decoration:none}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--alper-blue-light,#7899b8);outline-offset:3px}@media(max-width:480px){.page{padding:14px}.brand strong{font-size:.76rem}.brand small{font-size:.47rem}.site-link{padding-inline:.6rem}.auth-wrap{margin-top:42px}.secondary-actions{align-items:flex-start;flex-direction:column;gap:.25rem}}
  `]
})
export class AccountLoginComponent implements OnInit{
  readonly auth=inject(CustomerAuthService);
  private readonly injector=inject(Injector);
  private readonly adminBridge=inject(ProfileAdminBridgeService);
  private readonly router=inject(Router);
  private readonly route=inject(ActivatedRoute);
  readonly mode=signal<AccountMode>(this.auth.pendingReferral()?'register':'login');
  readonly working=signal(false);
  readonly message=signal<string|null>(null);
  readonly adminError=signal<string|null>(null);
  email='';password='';confirmPassword='';fullName='';

  async ngOnInit():Promise<void>{
    const requested=this.route.snapshot.queryParamMap.get('mode');
    const recovery=this.route.snapshot.queryParamMap.get('recovery')==='1';
    if(requested==='register')this.mode.set('register');
    this.rememberReturnUrl();
    await this.auth.waitUntilReady();
    if(recovery){
      if(this.auth.isLoggedIn()){this.mode.set('recovery');return;}
      this.message.set('Yenileme bağlantısının süresi dolmuş veya bağlantı doğrulanamamış. Yeni bir bağlantı isteyin.');
      this.mode.set('login');return;
    }
    if(this.auth.isLoggedIn())await this.finishSignedInNavigation();
  }

  setMode(mode:'login'|'register'):void{this.mode.set(mode);this.message.set(null);this.adminError.set(null);this.password='';this.confirmPassword='';}

  async submit():Promise<void>{
    this.working.set(true);this.message.set(null);this.adminError.set(null);this.rememberReturnUrl();
    try{
      if(this.mode()==='recovery'){
        if(this.password!==this.confirmPassword){this.message.set('Yeni parolalar birbiriyle eşleşmiyor.');return;}
        if(await this.auth.changePassword(this.password)){
          this.message.set('Parolanız başarıyla güncellendi. Güvenli hesabınız açılıyor.');
          history.replaceState(null,document.title,'/account/login');
          await this.finishSignedInNavigation();
        }
        return;
      }
      if(this.mode()==='login'){
        if(await this.auth.signIn(this.email,this.password))await this.finishSignedInNavigation();
      }else{
        const result=await this.auth.signUp(this.email,this.password,this.fullName);
        if(result.created&&!result.confirmationRequired)await this.finishSignedInNavigation();
        else if(result.created)this.message.set('Kaydınız tamamlandı. E-posta adresinize gelen doğrulama bağlantısına dokunduktan sonra giriş yapabilirsiniz.');
      }
    }finally{this.working.set(false);}
  }

  async social(provider:CustomerSocialProvider):Promise<void>{
    this.message.set(null);this.adminError.set(null);
    if(!this.auth.providerEnabled(provider)){
      this.message.set(provider==='google'?'Google ile giriş bağlantısı görünür durumda ancak OAuth sağlayıcısı henüz Supabase Auth içinde etkin değil.':'Facebook ile giriş bağlantısı görünür durumda ancak OAuth sağlayıcısı henüz Supabase Auth içinde etkin değil.');
      return;
    }
    this.rememberReturnUrl();
    await this.auth.signInWithProvider(provider);
  }

  async reset():Promise<void>{
    this.message.set(null);this.adminError.set(null);
    if(this.adminReturnTarget()){
      const adminAuth=this.injector.get(AuthService);
      const ok=await adminAuth.resetPassword(this.email);
      if(!ok)this.adminError.set(adminAuth.lastErrorMessage()||'Yönetici parola yenileme isteği işlenemedi.');
      if(ok)this.message.set('Parola yenileme bağlantısı e-posta adresinize gönderildi. En yeni e-postadaki bağlantıyı aynı cihaz ve tarayıcıda açın.');
      return;
    }
    if(await this.auth.resetPassword(this.email))this.message.set('Parola yenileme bağlantısı e-posta adresinize gönderildi. En yeni e-postadaki bağlantıyı aynı cihaz ve tarayıcıda açın.');
  }

  cancelRecovery():void{
    const target=this.adminReturnTarget();
    history.replaceState(null,document.title,target?`/account/login?returnUrl=${encodeURIComponent(target)}`:'/account/login');
    this.mode.set('login');this.password='';this.confirmPassword='';this.message.set(null);this.adminError.set(null);
  }

  adminReturnTarget():string|null{
    const requested=String(this.route.snapshot.queryParamMap.get('returnUrl')||'').trim();
    if(requested.startsWith('/admin')&&!requested.startsWith('//')&&!requested.startsWith('/admin/login'))return requested.slice(0,1200);
    if(typeof window!=='undefined'&&window.location.pathname.startsWith('/admin/login'))return'/admin';
    return null;
  }

  private async finishSignedInNavigation():Promise<void>{
    const adminTarget=this.adminReturnTarget();
    if(adminTarget){
      try{await this.adminBridge.openAdmin(adminTarget);return;}
      catch(error){
        this.message.set(error instanceof Error?error.message:'Yönetim paneli oturumu açılamadı.');
        return;
      }
    }
    await this.router.navigateByUrl(this.auth.consumePostAuthReturnUrl('/account'),{replaceUrl:true});
  }

  private rememberReturnUrl():void{
    const requested=this.route.snapshot.queryParamMap.get('returnUrl');
    if(this.adminReturnTarget())return;
    this.auth.setPostAuthReturnUrl(requested);
  }
}
