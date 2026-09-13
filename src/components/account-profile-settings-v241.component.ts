import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CustomerProfile } from '../services/customer-account.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomerProfileDraftV241, CustomerProfileV241Service } from '../services/customer-profile-v241.service';
import { UiService } from '../services/ui.service';
import { AccountSecurityV223Component } from './account-security-v223.component';

type ProfilePanelV241='avatar'|'info'|'security'|null;

@Component({
  selector:'app-account-profile-settings-v241',
  standalone:true,
  imports:[CommonModule,FormsModule,AccountSecurityV223Component],
  template:`
    <section class="settings" aria-labelledby="profile-settings-v241-title">
      <header class="intro">
        <p>{{ t().accountProfile.kicker }}</p>
        <h1 id="profile-settings-v241-title">{{ t().accountProfile.title }}</h1>
        <span>{{ t().accountProfile.subtitle }}</span>
      </header>

      @if(message()){<p class="notice success" role="status" aria-live="polite">{{message()}}</p>}
      @if(error()){<p class="notice error" role="alert" aria-live="assertive">{{error()}}</p>}
      @if(loading()){<p class="loading" role="status">{{ t().accountProfile.loading }}</p>}
      @else {
        <div class="panel-list">
          <section class="panel">
            <button type="button" class="panel-toggle" (click)="toggle('avatar')" [attr.aria-expanded]="openPanel()==='avatar'" aria-controls="profile-avatar-v241">
              <span><small>{{ t().accountProfile.avatarKicker }}</small><strong>{{ t().accountProfile.avatarTitle }}</strong><em>{{profile()?.avatar_url?t().accountProfile.avatarHas:t().accountProfile.avatarNone}}</em></span><b aria-hidden="true">{{openPanel()==='avatar'?'−':'+'}}</b>
            </button>
            @if(openPanel()==='avatar'){
              <div id="profile-avatar-v241" class="panel-body avatar-body">
                <div class="avatar">@if(profile()?.avatar_url){<img [src]="profile()?.avatar_url" [attr.alt]="t().accountProfile.avatarAlt" />}@else{<span>{{initials()}}</span>}</div>
                <div class="avatar-actions">
                  <label class="file-button"><span>{{avatarSaving()?t().accountProfile.avatarUploading:t().accountProfile.avatarSelect}}</span><input type="file" accept="image/jpeg,image/png,image/webp" (change)="uploadAvatar($event)" [disabled]="avatarSaving()" /></label>
                  @if(profile()?.avatar_url){<button type="button" class="secondary danger" (click)="removeAvatar()" [disabled]="avatarSaving()">{{ t().accountProfile.avatarRemove }}</button>}
                  <p>{{ t().accountProfile.avatarHint }}</p>
                </div>
              </div>
            }
          </section>

          <section class="panel">
            <button type="button" class="panel-toggle" (click)="toggle('info')" [attr.aria-expanded]="openPanel()==='info'" aria-controls="profile-info-v241">
              <span><small>{{ t().accountProfile.infoKicker }}</small><strong>{{ t().accountProfile.infoTitle }}</strong><em>{{ t().accountProfile.infoHint }}</em></span><b aria-hidden="true">{{openPanel()==='info'?'−':'+'}}</b>
            </button>
            @if(openPanel()==='info'){
              <form id="profile-info-v241" class="panel-body form-grid" (ngSubmit)="saveProfile()" novalidate>
                <label><span>{{ t().accountProfile.fullName }}</span><input [(ngModel)]="form.full_name" name="profileFullNameV241" maxlength="160" autocomplete="name" /></label>
                <label><span>{{ t().accountProfile.phone }}</span><input [(ngModel)]="form.phone" name="profilePhoneV241" maxlength="40" autocomplete="tel" /></label>
                <label><span>{{ t().accountProfile.birthDate }}</span><input [(ngModel)]="form.birth_date" name="profileBirthDateV241" type="date" /></label>
                <label><span>{{ t().accountProfile.city }}</span><input [(ngModel)]="form.city" name="profileCityV241" maxlength="100" autocomplete="address-level2" /></label>
                <label><span>{{ t().accountProfile.district }}</span><input [(ngModel)]="form.district" name="profileDistrictV241" maxlength="100" autocomplete="address-level3" /></label>
                <label><span>{{ t().accountProfile.postalCode }}</span><input [(ngModel)]="form.postal_code" name="profilePostalV241" maxlength="30" autocomplete="postal-code" /></label>
                <label class="wide"><span>{{ t().accountProfile.address }}</span><input [(ngModel)]="form.address_line" name="profileAddressV241" maxlength="240" autocomplete="street-address" /></label>
                <label><span>{{ t().accountProfile.language }}</span><select [(ngModel)]="form.preferred_locale" name="profileLocaleV241"><option value="tr">{{ t().accountProfile.localeTr }}</option><option value="en">{{ t().accountProfile.localeEn }}</option><option value="de">{{ t().accountProfile.localeDe }}</option><option value="ku">{{ t().accountProfile.localeKu }}</option><option value="ar">{{ t().accountProfile.localeAr }}</option></select></label>
                <label class="consent"><input type="checkbox" [(ngModel)]="form.marketing_consent" name="profileMarketingV241" /><span>{{ t().accountProfile.marketing }}</span></label>
                <div class="form-actions wide"><button type="button" class="secondary" (click)="closePanel()">{{ t().accountProfile.cancel }}</button><button type="submit" class="primary" [disabled]="profileSaving()">{{profileSaving()?t().accountProfile.saving:t().accountProfile.saveInfo}}</button></div>
              </form>
            }
          </section>

          <section class="panel">
            <button type="button" class="panel-toggle" (click)="toggle('security')" [attr.aria-expanded]="openPanel()==='security'" aria-controls="profile-security-v241">
              <span><small>{{ t().accountProfile.securityKicker }}</small><strong>{{ t().accountProfile.securityTitle }}</strong><em>{{ t().accountProfile.securityHint }}</em></span><b aria-hidden="true">{{openPanel()==='security'?'−':'+'}}</b>
            </button>
            @if(openPanel()==='security'){<div id="profile-security-v241" class="security-body"><app-account-security-v223 /></div>}
          </section>

          <section class="panel logout-panel">
            <button type="button" class="panel-toggle logout" (click)="logout()" [disabled]="loggingOut()">
              <span><small>{{ t().accountProfile.sessionKicker }}</small><strong>{{loggingOut()?t().accountProfile.loggingOut:t().accountProfile.logout}}</strong><em>{{ t().accountProfile.logoutHint }}</em></span><b aria-hidden="true">→</b>
            </button>
          </section>
        </div>
      }
    </section>
  `,
  styles:[`
    :host{display:block;background:#060a12}.settings{width:min(100% - 28px,980px);margin:auto;padding-bottom:calc(100px + env(safe-area-inset-bottom));color:#f4f6f8}.intro{padding:6px 0 14px}.intro p{margin:0;color:#c6a15b;font-size:.56rem;font-weight:950;letter-spacing:.14em}.intro h1{margin:.28rem 0 0;font:700 clamp(1.35rem,5vw,2.1rem)/1.08 Georgia,serif}.intro span{display:block;margin-top:.4rem;color:#98a6b8;font-size:.7rem;line-height:1.5}.panel-list{display:grid;gap:.65rem}.panel{overflow:hidden;border:1px solid #263548;border-radius:16px;background:#0b1420}.panel-toggle{display:flex;width:100%;min-height:74px;align-items:center;justify-content:space-between;gap:1rem;border:0;background:transparent;padding:13px 14px;color:#fff;text-align:left}.panel-toggle span{min-width:0}.panel-toggle small,.panel-toggle strong,.panel-toggle em{display:block}.panel-toggle small{color:#c6a15b;font-size:.53rem;font-weight:950;letter-spacing:.1em}.panel-toggle strong{margin-top:.18rem;font-size:.82rem}.panel-toggle em{margin-top:.18rem;overflow:hidden;color:#8998aa;font-size:.6rem;font-style:normal;line-height:1.4;text-overflow:ellipsis}.panel-toggle>b{flex:none;color:#9fb4ca;font-size:1.2rem}.panel-body,.security-body{border-top:1px solid #263548;padding:14px}.avatar-body{display:flex;align-items:center;gap:1rem}.avatar{display:grid;width:84px;height:84px;flex:none;place-items:center;overflow:hidden;border:1px solid #40516a;border-radius:22px;background:#111c2c;color:#f6d78b;font-size:1.35rem;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.avatar-actions{min-width:0}.avatar-actions p{margin:.6rem 0 0;color:#8998aa;font-size:.61rem;line-height:1.5}.file-button,.secondary,.primary{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border-radius:10px;padding:0 .8rem;font-size:.64rem;font-weight:950}.file-button{position:relative;border:1px solid #E15A62;background:var(--alper-blue-light);color:#fff;cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.secondary{border:1px solid #304158;background:#0e1724;color:#e2e8f0}.danger{margin-left:.4rem;color:#fda4af}.primary{border:0;background:var(--alper-blue-light);color:#fff}.form-grid{display:grid;gap:.72rem}.form-grid label{display:grid;gap:.35rem}.form-grid label>span{color:#cbd5e1;font-size:.62rem;font-weight:900}.form-grid input,.form-grid select{width:100%;min-height:46px;border:1px solid #304158;border-radius:11px;background:#08111e;padding:0 .75rem;color:#fff;font:inherit}.consent{display:flex!important;align-items:center;gap:.55rem}.consent input{width:20px;height:20px;min-height:0;flex:none}.form-actions{display:flex;justify-content:flex-end;gap:.5rem}.wide{grid-column:1/-1}.notice,.loading{margin:0 0 .65rem;border-radius:11px;padding:.75rem .85rem;font-size:.67rem}.success{background:#0b2d25;color:#a7f3d0}.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #263548;background:#0b1420;color:#aab5c4}.logout-panel{border-color:#49303a}.logout small,.logout strong{color:#fda4af}.panel-toggle:focus-visible,.primary:focus-visible,.secondary:focus-visible,.file-button:focus-within,input:focus-visible,select:focus-visible{outline:3px solid #E15A62;outline-offset:3px}@media(min-width:720px){.form-grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){.avatar-body{align-items:flex-start}.avatar-actions{display:grid;gap:.45rem}.danger{margin-left:0}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}.form-actions{justify-content:stretch}.form-actions button{flex:1}}
  `]
})
export class AccountProfileSettingsV241Component implements OnInit {
  private readonly service=inject(CustomerProfileV241Service);
  private readonly auth=inject(CustomerAuthService);
  private readonly router=inject(Router);
  private readonly ui=inject(UiService);
  readonly t=this.ui.translations;
  readonly loading=signal(true);readonly profileSaving=signal(false);readonly avatarSaving=signal(false);readonly loggingOut=signal(false);
  readonly message=signal('');readonly error=signal('');readonly profile=signal<CustomerProfile|null>(null);readonly openPanel=signal<ProfilePanelV241>(null);
  form:CustomerProfileDraftV241={full_name:'',phone:'',birth_date:'',address_line:'',district:'',city:'',postal_code:'',preferred_locale:'tr',marketing_consent:false};

  async ngOnInit():Promise<void>{await this.reload();}
  toggle(panel:Exclude<ProfilePanelV241,null>):void{this.clearMessages();this.openPanel.set(this.openPanel()===panel?null:panel);}
  closePanel():void{this.openPanel.set(null);this.readProfile(this.profile());this.clearMessages();}
  initials():string{const value=this.form.full_name||this.profile()?.email||'A';return value.split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'A';}

  async saveProfile():Promise<void>{
    if(this.profileSaving())return;this.clearMessages();this.profileSaving.set(true);
    try{const updated=await this.service.updateProfile(this.form);this.profile.set(updated);this.readProfile(updated);this.message.set(this.t().accountProfile.msgSaved);this.openPanel.set(null);}
    catch(error){this.error.set(this.errorText(error,this.t().accountProfile.errSave));}
    finally{this.profileSaving.set(false);}
  }

  async uploadAvatar(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.avatarSaving())return;
    this.clearMessages();this.avatarSaving.set(true);
    try{const updated=await this.service.uploadAvatar(file);this.profile.set(updated);this.message.set(this.t().accountProfile.msgAvatarUpdated);this.openPanel.set(null);}
    catch(error){const code=this.errorText(error,this.t().accountProfile.errAvatarUpdate);this.error.set(code.includes('AVATAR_SIZE_INVALID')?this.t().accountProfile.errAvatarSize:code.includes('AVATAR_TYPE_INVALID')?this.t().accountProfile.errAvatarType:`${this.t().accountProfile.errAvatarUpdate} ${code}`);}
    finally{this.avatarSaving.set(false);}
  }

  async removeAvatar():Promise<void>{if(this.avatarSaving())return;this.clearMessages();this.avatarSaving.set(true);try{const updated=await this.service.removeAvatar();this.profile.set(updated);this.message.set(this.t().accountProfile.msgAvatarRemoved);this.openPanel.set(null);}catch(error){this.error.set(this.errorText(error,this.t().accountProfile.errAvatarRemove));}finally{this.avatarSaving.set(false);}}
  async logout():Promise<void>{if(this.loggingOut())return;this.loggingOut.set(true);try{await this.auth.logout();await this.router.navigateByUrl('/account/login');}finally{this.loggingOut.set(false);}}

  private async reload():Promise<void>{this.loading.set(true);this.clearMessages();try{const profile=await this.service.loadProfile();this.profile.set(profile);this.readProfile(profile);}catch(error){this.error.set(this.errorText(error,this.t().accountProfile.errLoad));}finally{this.loading.set(false);}}
  private readProfile(p:CustomerProfile|null):void{this.form={full_name:p?.full_name||'',phone:p?.phone||'',birth_date:p?.birth_date||'',address_line:p?.address_line||'',district:p?.district||'',city:p?.city||'',postal_code:p?.postal_code||'',preferred_locale:p?.preferred_locale||'tr',marketing_consent:Boolean(p?.marketing_consent)};}
  private clearMessages():void{this.message.set('');this.error.set('');}
  private errorText(error:unknown,fallback:string):string{return error instanceof Error&&error.message?error.message:fallback;}
}
