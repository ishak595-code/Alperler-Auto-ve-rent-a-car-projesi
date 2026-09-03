import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteConfig } from '../../models/site-config.model';
import { AdminMediaService } from '../../services/admin-media.service';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

type AdminSettingsPanelV241='profile'|'brand'|'contact'|'security'|null;

@Component({
  selector:'app-admin-settings-v241',standalone:true,imports:[CommonModule,FormsModule],
  template:`
    <section class="settings" aria-labelledby="admin-settings-v241-title">
      <header class="intro"><div><p>PROFİL VE GENEL AYARLAR</p><h2 id="admin-settings-v241-title">Düzenlemek istediğiniz alanı açın</h2><span>Her bölüm bağımsız açılır. Kaydettiğiniz bölüm otomatik kapanır ve sayfa gereksiz uzamaz.</span></div><button type="button" class="reload" (click)="reload()" [disabled]="loading()||saving()">{{loading()?'Yenileniyor...':'Bilgileri Yenile'}}</button></header>
      @if(loading()){<p class="state" role="status">Kayıtlı ayarlar hazırlanıyor...</p>}
      @else {
        <div class="panels">
          <section class="panel">
            <button type="button" class="toggle" (click)="toggle('profile')" [attr.aria-expanded]="openPanel()==='profile'" aria-controls="admin-settings-profile-v241"><span><small>YÖNETİCİ PROFİLİ</small><strong>Yönetimde görünen kimlik</strong><em>Ad, profil görseli ve aktif yönetici hesabı</em></span><b aria-hidden="true">{{openPanel()==='profile'?'−':'+'}}</b></button>
            @if(openPanel()==='profile'){
              <div id="admin-settings-profile-v241" class="body profile-body">
                <div class="preview">@if(formConfig.adminProfileUrl){<img [src]="formConfig.adminProfileUrl" alt="Yönetici profil önizlemesi" />}@else{<span>A</span>}</div>
                <div class="fields">
                  <label><span>Yönetimde Görünen Ad</span><input [(ngModel)]="formConfig.adminDisplayName" name="adminDisplayNameV241" autocomplete="name" /></label>
                  <div class="account"><small>AKTİF HESAP</small><strong>{{auth.getCurrentEmail()}}</strong></div>
                  <label class="file-button">{{profileUploading()?'Yükleniyor...':'Profil Fotoğrafı Seç'}}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onAdminProfileSelected($event)" [disabled]="profileUploading()||saving()" /></label>
                  <div class="actions"><button type="button" class="cancel" (click)="close()">Vazgeç</button><button type="button" class="save" (click)="saveSection('profile')" [disabled]="saving()||profileUploading()">{{saving()?'Kaydediliyor...':'Profili Kaydet'}}</button></div>
                </div>
              </div>
            }
          </section>

          <section class="panel">
            <button type="button" class="toggle" (click)="toggle('brand')" [attr.aria-expanded]="openPanel()==='brand'" aria-controls="admin-settings-brand-v241"><span><small>MARKA VE KİMLİK</small><strong>Logo, şirket adı ve tema</strong><em>Müşterilerin gördüğü temel marka bilgileri</em></span><b aria-hidden="true">{{openPanel()==='brand'?'−':'+'}}</b></button>
            @if(openPanel()==='brand'){
              <div id="admin-settings-brand-v241" class="body grid">
                <div class="logo-row wide"><div class="logo-preview">@if(formConfig.logoUrl){<img [src]="formConfig.logoUrl" alt="Site logosu önizlemesi" />}@else{<span>Logo Yok</span>}</div><div><label><span>Logo URL</span><input [(ngModel)]="formConfig.logoUrl" name="logoUrlV241" /></label><label class="file-button">{{logoUploading()?'Yükleniyor...':'Logo Dosyası Seç'}}<input type="file" accept="image/*" (change)="onLogoSelected($event)" [disabled]="logoUploading()||saving()" /></label></div></div>
                <label><span>Şirket Adı</span><input [(ngModel)]="formConfig.companyName" name="companyNameV241" required /></label>
                <label><span>Slogan</span><input [(ngModel)]="formConfig.tagline" name="taglineV241" /></label>
                <label><span>Masaüstü Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthDesktop" name="logoWidthDesktopV241" type="number" min="40" max="500" /></label>
                <label><span>Mobil Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthMobile" name="logoWidthMobileV241" type="number" min="40" max="400" /></label>
                <label><span>Tema</span><select [(ngModel)]="formConfig.theme" name="themeV241"><option value="light">Açık</option><option value="dark">Koyu</option><option value="luxury">Lüks</option><option value="corporate">Kurumsal</option></select></label>
                <div class="actions wide"><button type="button" class="cancel" (click)="close()">Vazgeç</button><button type="button" class="save" (click)="saveSection('brand')" [disabled]="saving()||logoUploading()">{{saving()?'Kaydediliyor...':'Markayı Kaydet'}}</button></div>
              </div>
            }
          </section>

          <section class="panel">
            <button type="button" class="toggle" (click)="toggle('contact')" [attr.aria-expanded]="openPanel()==='contact'" aria-controls="admin-settings-contact-v241"><span><small>TEMEL İLETİŞİM</small><strong>Telefon, e-posta ve adres</strong><em>Sitede müşterilere gösterilen iletişim bilgileri</em></span><b aria-hidden="true">{{openPanel()==='contact'?'−':'+'}}</b></button>
            @if(openPanel()==='contact'){
              <div id="admin-settings-contact-v241" class="body grid">
                <label><span>Telefon</span><input [(ngModel)]="formConfig.phone" name="phoneV241" autocomplete="tel" /></label>
                <label><span>E-posta</span><input [(ngModel)]="formConfig.email" name="emailV241" type="email" autocomplete="email" /></label>
                <label class="wide"><span>Adres</span><textarea [(ngModel)]="formConfig.address" name="addressV241" rows="3"></textarea></label>
                <div class="actions wide"><button type="button" class="cancel" (click)="close()">Vazgeç</button><button type="button" class="save" (click)="saveSection('contact')" [disabled]="saving()">{{saving()?'Kaydediliyor...':'İletişimi Kaydet'}}</button></div>
              </div>
            }
          </section>

          <section class="panel">
            <button type="button" class="toggle" (click)="toggle('security')" [attr.aria-expanded]="openPanel()==='security'" aria-controls="admin-settings-security-v241"><span><small>HESAP GÜVENLİĞİ</small><strong>Yönetici şifresi</strong><em>Mevcut giriş şifrenizi gerektiğinde değiştirin</em></span><b aria-hidden="true">{{openPanel()==='security'?'−':'+'}}</b></button>
            @if(openPanel()==='security'){
              <div id="admin-settings-security-v241" class="body grid">
                <label><span>Yeni Şifre</span><input [(ngModel)]="newPassword" name="newPasswordV241" [type]="showPassword()?'text':'password'" autocomplete="new-password" /></label>
                <label><span>Yeni Şifre Tekrar</span><input [(ngModel)]="confirmPassword" name="confirmPasswordV241" [type]="showPassword()?'text':'password'" autocomplete="new-password" /></label>
                <div class="actions wide"><button type="button" class="cancel" (click)="showPassword.update(v=>!v)">{{showPassword()?'Şifreyi Gizle':'Şifreyi Göster'}}</button><button type="button" class="save dark" (click)="changePassword()" [disabled]="changingPassword()">{{changingPassword()?'Güncelleniyor...':'Şifreyi Güncelle'}}</button></div>
              </div>
            }
          </section>
        </div>
      }
    </section>
  `,
  styles:[`
    :host{display:block}.settings{width:min(100% - 24px,1000px);margin:16px auto 28px;color:#0f172a}.intro{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.7rem}.intro p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.13em}.intro h2{margin:.2rem 0 0;font-size:1.25rem;font-weight:950}.intro span{display:block;margin-top:.25rem;color:#64748b;font-size:.68rem;line-height:1.45}.reload{min-height:42px;flex:none;border:1px solid #dbe4ef;border-radius:11px;background:#fff;padding:0 .8rem;color:#334155;font-size:.65rem;font-weight:950}.panels{display:grid;gap:.55rem}.panel{overflow:hidden;border:1px solid #dbe4ef;border-radius:15px;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.04)}.toggle{display:flex;width:100%;min-height:76px;align-items:center;justify-content:space-between;gap:1rem;border:0;background:#fff;padding:13px 14px;color:#0f172a;text-align:left}.toggle small,.toggle strong,.toggle em{display:block}.toggle small{color:#2563eb;font-size:.52rem;font-weight:950;letter-spacing:.1em}.toggle strong{margin-top:.18rem;font-size:.82rem}.toggle em{margin-top:.17rem;color:#64748b;font-size:.59rem;font-style:normal;line-height:1.4}.toggle>b{flex:none;color:#64748b;font-size:1.2rem}.body{border-top:1px solid #e2e8f0;padding:14px}.profile-body{display:grid;grid-template-columns:120px 1fr;gap:1rem}.preview,.logo-preview{display:grid;place-items:center;overflow:hidden;border:1px solid #dbe4ef;border-radius:18px;background:#f1f5f9}.preview{width:112px;height:112px}.preview img,.logo-preview img{width:100%;height:100%;object-fit:cover}.preview span{font-size:2rem;font-weight:950;color:#94a3b8}.fields,.grid{display:grid;gap:.7rem}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}label{display:grid;gap:.32rem}label>span{font-size:.6rem;font-weight:950;color:#64748b}input,select,textarea{width:100%;min-height:45px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:0 .7rem;color:#0f172a;font:inherit}textarea{padding:.65rem}.account{border:1px solid #dbe4ef;border-radius:10px;background:#f8fafc;padding:.65rem}.account small,.account strong{display:block}.account small{font-size:.52rem;color:#94a3b8}.account strong{margin-top:.16rem;font-size:.68rem;overflow-wrap:anywhere}.file-button{position:relative;display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;padding:0 .75rem;color:#1d4ed8;font-size:.62rem;font-weight:950;cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.logo-row{display:grid;grid-template-columns:120px 1fr;gap:.8rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:.7rem}.logo-preview{width:112px;height:90px;background:#fff}.logo-preview img{object-fit:contain}.actions{display:flex;justify-content:flex-end;gap:.45rem}.actions button{min-height:43px;border-radius:10px;padding:0 .85rem;font-size:.63rem;font-weight:950}.cancel{border:1px solid #dbe4ef;background:#fff;color:#475569}.save{border:0;background:#2563eb;color:#fff}.save.dark{background:#0f172a}.wide{grid-column:1/-1}.state{border:1px solid #dbe4ef;border-radius:12px;background:#fff;padding:.8rem;color:#64748b;font-size:.68rem}.toggle:focus-visible,.reload:focus-visible,.actions button:focus-visible,.file-button:focus-within,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #2563eb;outline-offset:3px}@media(max-width:640px){.intro{align-items:stretch;flex-direction:column}.reload{width:100%}.profile-body,.grid,.logo-row{grid-template-columns:1fr}.preview{width:86px;height:86px}.wide{grid-column:auto}.actions{justify-content:stretch}.actions button{flex:1}}
  `]
})
export class AdminSettingsV241Component implements OnInit {
  private readonly cars=inject(CarService);readonly auth=inject(AuthService);private readonly toast=inject(ToastService);private readonly media=inject(AdminMediaService);
  readonly loading=signal(false);readonly saving=signal(false);readonly profileUploading=signal(false);readonly logoUploading=signal(false);readonly changingPassword=signal(false);readonly showPassword=signal(false);readonly openPanel=signal<AdminSettingsPanelV241>(null);readonly config=this.cars.getConfig();
  formConfig:SiteConfig=this.cloneConfig(this.config());newPassword='';confirmPassword='';
  async ngOnInit():Promise<void>{await this.reload(false);}
  toggle(panel:Exclude<AdminSettingsPanelV241,null>):void{if(this.saving())return;this.openPanel.set(this.openPanel()===panel?null:panel);}
  close():void{this.openPanel.set(null);this.formConfig=this.cloneConfig(this.config());}
  async reload(showToast=true):Promise<void>{if(this.loading())return;this.loading.set(true);try{await this.cars.refreshCloudCatalog(true);this.formConfig=this.cloneConfig(this.config());if(showToast)this.toast.show('Kayıtlı genel ayarlar yenilendi.','success');}catch(error){console.error(error);this.toast.show('Kayıtlı ayarlar yüklenemedi. Mevcut değerler korunuyor.','error');}finally{this.loading.set(false);}}
  async saveSection(section:Exclude<AdminSettingsPanelV241,'security'|null>):Promise<void>{if(this.saving())return;this.saving.set(true);try{await this.cars.updateConfig(this.cloneConfig(this.formConfig));await this.cars.refreshCloudCatalog(true);this.formConfig=this.cloneConfig(this.config());this.openPanel.set(null);this.toast.show(section==='profile'?'Yönetici profili kaydedildi.':section==='brand'?'Marka ayarları kaydedildi.':'İletişim bilgileri kaydedildi.','success');}catch(error){console.error(error);this.toast.show('Ayarlar kaydedilemedi. Bağlantı tekrar denendi ancak işlem tamamlanamadı.','error');}finally{this.saving.set(false);}}
  async onAdminProfileSelected(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||this.profileUploading())return;this.profileUploading.set(true);try{const uploaded=await this.media.uploadImage(file,'SITE_CONFIG','main','admin-profile');this.formConfig.adminProfileUrl=uploaded.publicUrl;this.toast.show('Profil görseli hazır. Bu bölümü kaydederek uygulayın.','success');}catch(error){this.toast.show(error instanceof Error?error.message:'Profil görseli yüklenemedi.','error');}finally{this.profileUploading.set(false);input.value='';}}
  async onLogoSelected(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||this.logoUploading())return;this.logoUploading.set(true);try{const uploaded=await this.media.uploadImage(file,'SITE_CONFIG','main','logo');this.formConfig.logoUrl=uploaded.publicUrl;this.toast.show('Logo hazır. Marka bölümünü kaydederek uygulayın.','success');}catch(error){this.toast.show(error instanceof Error?error.message:'Logo yüklenemedi.','error');}finally{this.logoUploading.set(false);input.value='';}}
  async changePassword():Promise<void>{if(this.changingPassword())return;if(this.newPassword!==this.confirmPassword){this.toast.show('Yeni şifreler birbiriyle eşleşmiyor.','error');return;}const validation=this.auth.validateStrongPassword(this.newPassword);if(validation){this.toast.show(validation,'error');return;}this.changingPassword.set(true);try{const ok=await this.auth.changeCurrentPassword(this.newPassword);if(!ok)throw new Error(this.auth.lastErrorMessage()||'Şifre güncellenemedi.');this.newPassword='';this.confirmPassword='';this.openPanel.set(null);this.toast.show('Yönetici şifresi başarıyla güncellendi.','success');}catch(error){this.toast.show(error instanceof Error?error.message:'Şifre güncellenemedi.','error');}finally{this.changingPassword.set(false);}}
  private cloneConfig(value:SiteConfig):SiteConfig{return JSON.parse(JSON.stringify(value)) as SiteConfig;}
}
