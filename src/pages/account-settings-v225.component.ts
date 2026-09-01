import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountSecurityV223Component } from '../components/account-security-v223.component';
import { CustomerAccountService, CustomerProfile } from '../services/customer-account.service';

@Component({
  selector:'app-account-settings-v225',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink,AccountSecurityV223Component],
  template:`
    <main class="page"><section class="shell">
      <header class="head"><div><p>PROFİL AYARLARI</p><h1>Hesap bilgilerinizi yönetin</h1><span>Rezervasyonlarda kullandığınız iletişim ve adres bilgilerini güncel tutun.</span></div><a routerLink="/account">Genel Bakışa Dön</a></header>
      @if(message()){<p class="notice ok" role="status">{{message()}}</p>}@if(error()){<p class="notice error" role="alert">{{error()}}</p>}
      @if(account.loading()){<div class="loading" role="status">Bilgileriniz hazırlanıyor...</div>}@else{
        <section class="card" aria-labelledby="personal-title">
          <header><div><p>KİŞİSEL BİLGİLER</p><h2 id="personal-title">Profiliniz</h2></div></header>
          <div class="avatar-row"><div class="avatar">@if(account.profile()?.avatar_url){<img [src]="account.profile()?.avatar_url" alt="Profil fotoğrafı"/>}@else{<span>{{initials()}}</span>}</div><div><label class="upload">Fotoğraf Değiştir<input type="file" accept="image/jpeg,image/png,image/webp" (change)="uploadAvatar($event)"/></label>@if(account.profile()?.avatar_url){<button type="button" class="ghost" (click)="removeAvatar()">Fotoğrafı Kaldır</button>}</div></div>
          <div class="form">
            <label><span>Ad Soyad</span><input [(ngModel)]="form.full_name" name="fullName" autocomplete="name" maxlength="160"/></label>
            <label><span>Telefon</span><input [(ngModel)]="form.phone" name="phone" autocomplete="tel" maxlength="40"/></label>
            <label><span>Doğum Tarihi</span><input [(ngModel)]="form.birth_date" name="birthDate" type="date"/></label>
            <label><span>Şehir</span><input [(ngModel)]="form.city" name="city" autocomplete="address-level2" maxlength="100"/></label>
            <label><span>İlçe</span><input [(ngModel)]="form.district" name="district" autocomplete="address-level3" maxlength="100"/></label>
            <label><span>Posta Kodu</span><input [(ngModel)]="form.postal_code" name="postal" autocomplete="postal-code" maxlength="30"/></label>
            <label class="wide"><span>Adres</span><input [(ngModel)]="form.address_line" name="address" autocomplete="street-address" maxlength="240"/></label>
            <label><span>Dil</span><select [(ngModel)]="form.preferred_locale" name="locale"><option value="tr">Türkçe</option><option value="en">English</option><option value="de">Deutsch</option><option value="ku">Kurdî</option><option value="ar">العربية</option></select></label>
            <label class="consent"><input type="checkbox" [(ngModel)]="form.marketing_consent" name="marketing"/><span>Kampanya ve fırsatlardan haberdar olmak istiyorum.</span></label>
          </div>
          <button type="button" class="primary" (click)="save()" [disabled]="saving()">{{saving()?'Kaydediliyor...':'Değişiklikleri Kaydet'}}</button>
        </section>
        <app-account-security-v223 />
      }
    </section></main>
  `,
  styles:[`
    :host{display:block}.page{min-height:100dvh;background:#060a12;color:#f4f6f8;padding:16px 14px 38px}.shell{width:min(100%,980px);margin:auto}.head{display:flex;align-items:end;justify-content:space-between;gap:14px;border-bottom:1px solid #263548;padding-bottom:16px}.head p,.card header p{margin:0;color:#c6a15b;font-size:9px;font-weight:950;letter-spacing:.14em}.head h1,.card h2{margin:5px 0 0;font:750 clamp(27px,6vw,38px)/1.02 Georgia,serif}.head span{display:block;margin-top:7px;max-width:650px;color:#96a4b6;font-size:11px;line-height:1.55}.head a,.primary,.ghost,.upload{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid #33465d;border-radius:11px;background:#101a29;padding:0 13px;color:#fff;text-decoration:none;font-size:10px;font-weight:900}.card{margin-top:14px;border:1px solid #263548;border-radius:18px;background:#0b1420;padding:15px}.card h2{font-size:23px}.avatar-row{display:flex;align-items:center;gap:12px;margin-top:15px}.avatar{display:grid;width:72px;height:72px;place-items:center;overflow:hidden;border:1px solid #3b4c62;border-radius:20px;background:#111c2c;color:#efd079;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.avatar-row>div:last-child{display:flex;flex-wrap:wrap;gap:7px}.upload{position:relative;background:#254d73}.upload input{position:absolute;width:1px;height:1px;opacity:0}.form{display:grid;gap:10px;margin-top:16px}.form label{display:grid;gap:5px}.form label>span{color:#b8c4d3;font-size:10px;font-weight:850}.form input,.form select{width:100%;min-height:47px;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 11px;color:#fff;font:inherit}.form .consent{display:flex;align-items:center;gap:9px}.consent input{width:20px;min-height:20px}.wide{grid-column:1/-1}.primary{margin-top:14px;border:0;background:#315e86}.notice,.loading{margin-top:12px;border-radius:11px;padding:11px 13px;font-size:11px}.notice.ok{background:#0b2e25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecaca}.loading{border:1px solid #263548;background:#0b1420;color:#9ba9b9}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,label:focus-within{outline:3px solid #60a5fa;outline-offset:3px}@media(min-width:720px){.page{padding:24px}.form{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.head{display:block}.head a{margin-top:12px;width:100%}}
  `]
})
export class AccountSettingsV225Component implements OnInit{
  readonly account=inject(CustomerAccountService);readonly saving=signal(false);readonly message=signal('');readonly error=signal('');
  form:Partial<CustomerProfile>={full_name:'',phone:'',birth_date:'',address_line:'',district:'',city:'',postal_code:'',preferred_locale:'tr',marketing_consent:false};
  async ngOnInit(){try{await this.account.refresh();this.fill();}catch{this.error.set('Hesap bilgileriniz şu anda açılamadı.');}}
  initials(){const name=this.account.profile()?.full_name||'Alperler';return name.split(/\s+/).slice(0,2).map(v=>v[0]?.toLocaleUpperCase('tr-TR')||'').join('');}
  async save(){if(this.saving())return;this.saving.set(true);this.clear();try{await this.account.updateProfile(this.form);this.fill();this.message.set('Profil bilgileriniz güncellendi.');}catch{this.error.set('Profil bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.');}finally{this.saving.set(false);}}
  async uploadAvatar(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file)return;this.clear();try{await this.account.uploadAvatar(file);this.message.set('Profil fotoğrafınız güncellendi.');}catch(e){const m=e instanceof Error?e.message:'';this.error.set(m.includes('SIZE')?'Fotoğraf en fazla 2 MB olabilir.':m.includes('TYPE')?'JPEG, PNG veya WebP fotoğraf seçin.':'Fotoğraf yüklenemedi.');}}
  async removeAvatar(){this.clear();try{await this.account.removeAvatar();this.message.set('Profil fotoğrafınız kaldırıldı.');}catch{this.error.set('Profil fotoğrafı kaldırılamadı.');}}
  private fill(){const p=this.account.profile();if(!p)return;this.form={full_name:p.full_name||'',phone:p.phone||'',birth_date:p.birth_date||'',address_line:p.address_line||'',district:p.district||'',city:p.city||'',postal_code:p.postal_code||'',preferred_locale:p.preferred_locale||'tr',marketing_consent:Boolean(p.marketing_consent)};}
  private clear(){this.message.set('');this.error.set('');}
}
