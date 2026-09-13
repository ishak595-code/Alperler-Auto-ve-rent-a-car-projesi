import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerAccountService } from '../services/customer-account.service';
import { UiService } from '../services/ui.service';
import { AccountSecurityV223Component } from './account-security-v223.component';

@Component({
  selector:'app-account-profile-settings-v225',
  standalone:true,
  imports:[CommonModule,FormsModule,AccountSecurityV223Component],
  template:`
    <section class="profile-settings" aria-labelledby="profile-settings-title">
      <header class="section-head">
        <div>
          <p>{{ t().accountProfile.kicker }}</p>
          <h2 id="profile-settings-title">{{ t().accountProfile.titleAlt }}</h2>
          <span>{{ t().accountProfile.subtitleAlt }}</span>
        </div>
      </header>
      @if(message()){<p class="notice success" role="status">{{message()}}</p>}
      @if(error()){<p class="notice error" role="alert">{{error()}}</p>}
      @if(loading()){
        <p class="loading" role="status">{{ t().accountProfile.loadingAlt }}</p>
      } @else {
        <div class="profile-card">
          <div class="avatar-editor">
            <div class="avatar">@if(account.profile()?.avatar_url){<img [src]="account.profile()?.avatar_url" [attr.alt]="t().accountProfile.avatarAlt" />}@else{<span>{{initials()}}</span>}</div>
            <div><label class="file-button"><span>{{ t().accountProfile.avatarChange }}</span><input type="file" accept="image/jpeg,image/png,image/webp" (change)="uploadAvatar($event)" [disabled]="saving()" /></label>@if(account.profile()?.avatar_url){<button type="button" class="text-button" (click)="removeAvatar()" [disabled]="saving()">{{ t().accountProfile.avatarRemove }}</button>}</div>
          </div>
          <form (ngSubmit)="save()" novalidate>
            <label><span>{{ t().accountProfile.fullName }}</span><input [(ngModel)]="form.full_name" name="profileFullNameV225" maxlength="160" autocomplete="name" /></label>
            <label><span>{{ t().accountProfile.phone }}</span><input [(ngModel)]="form.phone" name="profilePhoneV225" maxlength="40" autocomplete="tel" /></label>
            <label><span>{{ t().accountProfile.birthDate }}</span><input [(ngModel)]="form.birth_date" name="profileBirthDateV225" type="date" /></label>
            <label><span>{{ t().accountProfile.city }}</span><input [(ngModel)]="form.city" name="profileCityV225" maxlength="100" autocomplete="address-level2" /></label>
            <label><span>{{ t().accountProfile.district }}</span><input [(ngModel)]="form.district" name="profileDistrictV225" maxlength="100" autocomplete="address-level3" /></label>
            <label><span>{{ t().accountProfile.postalCode }}</span><input [(ngModel)]="form.postal_code" name="profilePostalV225" maxlength="30" autocomplete="postal-code" /></label>
            <label class="wide"><span>{{ t().accountProfile.address }}</span><input [(ngModel)]="form.address_line" name="profileAddressV225" maxlength="240" autocomplete="street-address" /></label>
            <label><span>{{ t().accountProfile.language }}</span><select [(ngModel)]="form.preferred_locale" name="profileLocaleV225"><option value="tr">{{ t().accountProfile.localeTr }}</option><option value="en">{{ t().accountProfile.localeEn }}</option><option value="de">{{ t().accountProfile.localeDe }}</option><option value="ku">{{ t().accountProfile.localeKu }}</option><option value="ar">{{ t().accountProfile.localeAr }}</option></select></label>
            <label class="consent"><input type="checkbox" [(ngModel)]="form.marketing_consent" name="profileMarketingV225" /><span>{{ t().accountProfile.marketing }}</span></label>
            <button type="submit" class="primary wide" [disabled]="saving()">{{saving()?t().accountProfile.saving:t().accountProfile.saveChanges}}</button>
          </form>
        </div>
      }
    </section>

    <section class="security-launch" aria-labelledby="profile-security-title">
      <div>
        <p>{{ t().accountProfile.securityKicker }}</p>
        <h2 id="profile-security-title">{{ t().accountProfile.securityTitleAlt }}</h2>
        <span>{{ t().accountProfile.securityHintAlt }}</span>
      </div>
      <button type="button" (click)="toggleSecurity()" [attr.aria-expanded]="securityOpen()" aria-controls="profile-security-panel">{{securityOpen()?t().accountProfile.securityClose:t().accountProfile.securityOpen}}</button>
    </section>
    @if(securityOpen()){
      <div id="profile-security-panel"><app-account-security-v223 /></div>
    }
  `,
  styles:[`
    :host{display:block;background:#060a12}.profile-settings,.security-launch{width:min(100% - 28px,1180px);margin:0 auto 16px;color:#f4f6f8}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;border:1px solid #263548;border-radius:18px 18px 0 0;background:#0b1420;padding:14px}.section-head p,.security-launch p{margin:0;color:#c6a15b;font-size:.56rem;font-weight:950;letter-spacing:.14em}.section-head h2,.security-launch h2{margin:.25rem 0 0;font:700 clamp(1.05rem,4vw,1.8rem)/1.08 Georgia,serif}.section-head span,.security-launch span{display:block;margin-top:.35rem;color:#98a6b8;font-size:.68rem;line-height:1.5}.profile-card{border:1px solid #263548;border-top:0;border-radius:0 0 18px 18px;background:#0b1420;padding:14px}.avatar-editor{display:flex;align-items:center;gap:.8rem;border-bottom:1px solid #263548;padding-bottom:14px}.avatar{display:grid;width:76px;height:76px;flex:none;place-items:center;overflow:hidden;border:1px solid #40516a;border-radius:20px;background:#111c2c;color:#f6d78b;font-size:1.25rem;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.file-button,.text-button{display:inline-flex;min-height:40px;align-items:center;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 .7rem;color:#fff;font-size:.62rem;font-weight:900}.file-button{position:relative;cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.text-button{margin-left:.4rem;color:#fda4af}.profile-card form{display:grid;gap:.7rem;margin-top:14px}.profile-card label{display:grid;gap:.35rem}.profile-card label>span{color:#cbd5e1;font-size:.62rem;font-weight:900}.profile-card input,.profile-card select{width:100%;min-height:46px;border:1px solid #304158;border-radius:11px;background:#08111e;padding:0 .75rem;color:#fff;font:inherit}.consent{display:flex!important;align-items:center;gap:.55rem}.consent input{width:20px;height:20px;min-height:0;flex:none}.consent span{line-height:1.4}.wide{grid-column:1/-1}.primary{min-height:46px;border:0;border-radius:11px;background:var(--alper-blue-light);color:#fff;font-weight:950}.notice,.loading{margin:10px 0 0;border-radius:11px;padding:.75rem .85rem;font-size:.67rem}.success{background:#0b2d25;color:#a7f3d0}.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #263548;background:#0b1420;color:#aab5c4}.security-launch{display:flex;align-items:center;justify-content:space-between;gap:1rem;border:1px solid #263548;border-radius:18px;background:#0b1420;padding:14px}.security-launch button{min-height:44px;flex:none;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 .85rem;color:#fff;font-size:.65rem;font-weight:900}.primary:focus-visible,.text-button:focus-visible,.file-button:focus-within,input:focus-visible,select:focus-visible,.security-launch button:focus-visible{outline:3px solid #E15A62;outline-offset:3px}@media(min-width:720px){.profile-card form{grid-template-columns:1fr 1fr}}@media(max-width:620px){.section-head,.security-launch{align-items:stretch;flex-direction:column}.security-launch button{width:100%;justify-content:center}.avatar-editor{align-items:flex-start}.file-button,.text-button{display:flex;margin:0 0 .4rem}.profile-card form{grid-template-columns:1fr}.wide{grid-column:auto}}
  `]
})
export class AccountProfileSettingsV225Component implements OnInit {
  readonly account=inject(CustomerAccountService);
  private readonly ui=inject(UiService);
  readonly t=this.ui.translations;
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly message=signal('');
  readonly error=signal('');
  readonly securityOpen=signal(false);
  form={full_name:'',phone:'',birth_date:'',address_line:'',district:'',city:'',postal_code:'',preferred_locale:'tr',marketing_consent:false};

  async ngOnInit():Promise<void>{try{await this.account.refresh();this.readProfile();}catch{this.error.set(this.t().accountProfile.errLoadRetry);}finally{this.loading.set(false);}}
  toggleSecurity():void{this.securityOpen.update(value=>!value);}
  initials():string{const value=this.form.full_name||this.account.profile()?.email||'A';return value.split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'A';}
  async save():Promise<void>{if(this.saving())return;this.clearMessages();this.saving.set(true);try{await this.account.updateProfile({...this.form,country:'TR'});this.readProfile();this.message.set(this.t().accountProfile.msgUpdated);}catch{this.error.set(this.t().accountProfile.errSaveRetry);}finally{this.saving.set(false);}}
  async uploadAvatar(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.saving())return;this.clearMessages();this.saving.set(true);try{await this.account.uploadAvatar(file);this.message.set(this.t().accountProfile.msgAvatarUpdated);}catch(e){const code=e instanceof Error?e.message:'';this.error.set(code.includes('AVATAR_SIZE_INVALID')?this.t().accountProfile.errAvatarSize:code.includes('AVATAR_TYPE_INVALID')?this.t().accountProfile.errAvatarType:this.t().accountProfile.errAvatarUpdate);}finally{this.saving.set(false);}}
  async removeAvatar():Promise<void>{if(this.saving())return;this.clearMessages();this.saving.set(true);try{await this.account.removeAvatar();this.message.set(this.t().accountProfile.msgAvatarRemoved);}catch{this.error.set(this.t().accountProfile.errAvatarRemove);}finally{this.saving.set(false);}}
  private readProfile():void{const p=this.account.profile();this.form={full_name:p?.full_name||'',phone:p?.phone||'',birth_date:p?.birth_date||'',address_line:p?.address_line||'',district:p?.district||'',city:p?.city||'',postal_code:p?.postal_code||'',preferred_locale:p?.preferred_locale||'tr',marketing_consent:Boolean(p?.marketing_consent)};}
  private clearMessages():void{this.message.set('');this.error.set('');}
}
