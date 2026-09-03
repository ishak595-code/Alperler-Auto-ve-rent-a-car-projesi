import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteConfig } from '../../models/site-config.model';
import { AdminAccessService } from '../../services/admin-access.service';
import { AdminMediaService } from '../../services/admin-media.service';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

type AdminSettingsPanelV243='brand'|'contact'|'account'|null;

@Component({
  selector:'app-admin-settings-v241',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    <section class="settings" aria-labelledby="admin-settings-v243-title">
      <header class="intro">
        <div>
          <p>SÜPER ADMİN AYARLARI</p>
          <h2 id="admin-settings-v243-title">Yönetim ve site ayarları</h2>
          <span>Süper admin kimliği müşteri profilinden tamamen ayrıdır. Üstten bir alan seçin, yalnız o bölüm aşağıda açılsın.</span>
        </div>
        <button type="button" class="reload" (click)="reload()" [disabled]="loading()||saving()">{{loading()?'Yenileniyor...':'Bilgileri Yenile'}}</button>
      </header>

      <nav class="subtabs" aria-label="Genel ayar alt bölümleri">
        <button type="button" [class.active]="openPanel()==='brand'" (click)="select('brand')" [attr.aria-expanded]="openPanel()==='brand'"><strong>Marka</strong><small>Logo, ad ve tema</small></button>
        <button type="button" [class.active]="openPanel()==='contact'" (click)="select('contact')" [attr.aria-expanded]="openPanel()==='contact'"><strong>İletişim</strong><small>Telefon, e-posta, adres</small></button>
        <button type="button" [class.active]="openPanel()==='account'" (click)="select('account')" [attr.aria-expanded]="openPanel()==='account'"><strong>Süper Admin</strong><small>Rol, hesap ve güvenlik</small></button>
      </nav>

      @if(loading()){
        <p class="state" role="status">Yönetim ayarları hazırlanıyor...</p>
      } @else if(openPanel()==='brand') {
        <section class="panel" aria-labelledby="admin-brand-v243-title">
          <header class="panel-head"><div><small>MARKA VE KİMLİK</small><h3 id="admin-brand-v243-title">Müşterilerin gördüğü marka</h3></div><button type="button" (click)="close()" aria-label="Bölümü kapat">×</button></header>
          <div class="body grid">
            <div class="logo-row wide">
              <div class="logo-preview">@if(formConfig.logoUrl){<img [src]="formConfig.logoUrl" alt="Site logosu önizlemesi" />}@else{<span>Logo Yok</span>}</div>
              <div class="logo-copy"><strong>Site Logosu</strong><p>Logo yalnız dosyadan yüklenir. Teknik URL alanı gösterilmez.</p><label class="file-button">{{logoUploading()?'Yükleniyor...':'Logo Dosyası Seç'}}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onLogoSelected($event)" [disabled]="logoUploading()||saving()" /></label></div>
            </div>
            <label><span>Şirket Adı</span><input [(ngModel)]="formConfig.companyName" name="companyNameV243" required /></label>
            <label><span>Slogan</span><input [(ngModel)]="formConfig.tagline" name="taglineV243" /></label>
            <label><span>Masaüstü Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthDesktop" name="logoWidthDesktopV243" type="number" min="40" max="500" /></label>
            <label><span>Mobil Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthMobile" name="logoWidthMobileV243" type="number" min="40" max="400" /></label>
            <label><span>Tema</span><select [(ngModel)]="formConfig.theme" name="themeV243"><option value="light">Açık</option><option value="dark">Koyu</option><option value="luxury">Lüks</option><option value="corporate">Kurumsal</option></select></label>
            <div class="actions wide"><button type="button" class="cancel" (click)="close()">Vazgeç</button><button type="button" class="save" (click)="saveSection('brand')" [disabled]="saving()||logoUploading()">{{saving()?'Kaydediliyor...':'Markayı Kaydet'}}</button></div>
          </div>
        </section>
      } @else if(openPanel()==='contact') {
        <section class="panel" aria-labelledby="admin-contact-v243-title">
          <header class="panel-head"><div><small>TEMEL İLETİŞİM</small><h3 id="admin-contact-v243-title">Sitede yayınlanan iletişim bilgileri</h3></div><button type="button" (click)="close()" aria-label="Bölümü kapat">×</button></header>
          <div class="body grid">
            <label><span>Telefon</span><input [(ngModel)]="formConfig.phone" name="phoneV243" autocomplete="tel" /></label>
            <label><span>E-posta</span><input [(ngModel)]="formConfig.email" name="emailV243" type="email" autocomplete="email" /></label>
            <label class="wide"><span>Adres</span><textarea [(ngModel)]="formConfig.address" name="addressV243" rows="3"></textarea></label>
            <div class="actions wide"><button type="button" class="cancel" (click)="close()">Vazgeç</button><button type="button" class="save" (click)="saveSection('contact')" [disabled]="saving()">{{saving()?'Kaydediliyor...':'İletişimi Kaydet'}}</button></div>
          </div>
        </section>
      } @else if(openPanel()==='account') {
        <section class="panel" aria-labelledby="admin-account-v243-title">
          <header class="panel-head"><div><small>SÜPER ADMİN HESABI</small><h3 id="admin-account-v243-title">Yönetici kimliği ve güvenliği</h3></div><button type="button" (click)="close()" aria-label="Bölümü kapat">×</button></header>
          <div class="body account-grid">
            <div class="admin-identity">
              <div><small>YÖNETİCİ E-POSTASI</small><strong>{{adminProfile()?.email || auth.getCurrentEmail()}}</strong></div>
              <div><small>YETKİ</small><strong>{{roleLabel()}}</strong></div>
              <p>Bu bilgiler yalnız <code>admin_users</code> ve yönetici oturumundan gelir. Müşteri profili, cüzdanı veya belgeleri bu alanda kullanılmaz.</p>
            </div>
            <div class="password-box">
              <label><span>Yeni Yönetici Şifresi</span><input [(ngModel)]="newPassword" name="newPasswordV243" [type]="showPassword()?'text':'password'" autocomplete="new-password" /></label>
              <label><span>Yeni Şifre Tekrar</span><input [(ngModel)]="confirmPassword" name="confirmPasswordV243" [type]="showPassword()?'text':'password'" autocomplete="new-password" /></label>
              <div class="actions"><button type="button" class="cancel" (click)="showPassword.update(v=>!v)">{{showPassword()?'Şifreyi Gizle':'Şifreyi Göster'}}</button><button type="button" class="save dark" (click)="changePassword()" [disabled]="changingPassword()">{{changingPassword()?'Güncelleniyor...':'Şifreyi Güncelle'}}</button></div>
            </div>
          </div>
        </section>
      } @else {
        <div class="empty-state"><strong>Bir ayar alanı seçin.</strong><span>Marka, iletişim veya süper admin hesabı yukarıdaki seçeneklerden açılır.</span></div>
      }
    </section>
  `,
  styles:[`
    :host{display:block}.settings{width:min(100% - 24px,1000px);margin:16px auto 28px;color:#0f172a}.intro{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;margin-bottom:.7rem}.intro p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.13em}.intro h2{margin:.2rem 0 0;font-size:1.25rem;font-weight:950}.intro span{display:block;margin-top:.25rem;color:#64748b;font-size:.68rem;line-height:1.45}.reload{min-height:42px;flex:none;border:1px solid #dbe4ef;border-radius:11px;background:#fff;padding:0 .8rem;color:#334155;font-size:.65rem;font-weight:950}.subtabs{display:flex;gap:.45rem;overflow-x:auto;margin-bottom:.65rem;padding-bottom:.1rem;scrollbar-width:none}.subtabs::-webkit-scrollbar{display:none}.subtabs button{min-width:145px;min-height:56px;flex:0 0 auto;border:1px solid #dbe4ef;border-radius:12px;background:#fff;padding:.55rem .72rem;color:#475569;text-align:left}.subtabs strong,.subtabs small{display:block}.subtabs strong{font-size:.7rem;font-weight:950}.subtabs small{margin-top:.16rem;color:#64748b;font-size:.54rem}.subtabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.panel{overflow:hidden;border:1px solid #dbe4ef;border-radius:15px;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.04)}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:13px 14px}.panel-head small{display:block;color:#2563eb;font-size:.52rem;font-weight:950;letter-spacing:.1em}.panel-head h3{margin:.18rem 0 0;font-size:.88rem;font-weight:950}.panel-head>button{display:grid;width:38px;height:38px;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#64748b;font-size:1.1rem}.body{padding:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}label{display:grid;gap:.32rem}label>span{font-size:.6rem;font-weight:950;color:#64748b}input,select,textarea{width:100%;min-height:45px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:0 .7rem;color:#0f172a;font:inherit}textarea{padding:.65rem}.logo-row{display:grid;grid-template-columns:120px 1fr;gap:.8rem;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:.7rem}.logo-preview{display:grid;width:112px;height:90px;place-items:center;overflow:hidden;border:1px solid #dbe4ef;border-radius:14px;background:#fff}.logo-preview img{width:100%;height:100%;object-fit:contain}.logo-copy strong{font-size:.72rem}.logo-copy p{margin:.25rem 0 .55rem;color:#64748b;font-size:.58rem;line-height:1.45}.file-button{position:relative;display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;padding:0 .75rem;color:#1d4ed8;font-size:.62rem;font-weight:950;cursor:pointer}.file-button input{position:absolute;width:1px;height:1px;opacity:0}.actions{display:flex;justify-content:flex-end;gap:.45rem}.actions button{min-height:43px;border-radius:10px;padding:0 .85rem;font-size:.63rem;font-weight:950}.cancel{border:1px solid #dbe4ef;background:#fff;color:#475569}.save{border:0;background:#2563eb;color:#fff}.save.dark{background:#0f172a}.wide{grid-column:1/-1}.account-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:.8rem}.admin-identity,.password-box{border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc;padding:.8rem}.admin-identity>div+div{margin-top:.7rem}.admin-identity small,.admin-identity strong{display:block}.admin-identity small{color:#94a3b8;font-size:.52rem;font-weight:950}.admin-identity strong{margin-top:.16rem;font-size:.72rem;overflow-wrap:anywhere}.admin-identity p{margin:.8rem 0 0;color:#64748b;font-size:.59rem;line-height:1.5}.admin-identity code{font-size:.58rem}.password-box{display:grid;gap:.7rem}.state,.empty-state{border:1px solid #dbe4ef;border-radius:12px;background:#fff;padding:.9rem;color:#64748b;font-size:.68rem}.empty-state strong,.empty-state span{display:block}.empty-state strong{color:#334155}.empty-state span{margin-top:.2rem}.subtabs button:focus-visible,.reload:focus-visible,.panel-head>button:focus-visible,.actions button:focus-visible,.file-button:focus-within,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #2563eb;outline-offset:3px}@media(max-width:640px){.intro{align-items:stretch;flex-direction:column}.reload{width:100%}.grid,.logo-row,.account-grid{grid-template-columns:1fr}.logo-preview{width:96px;height:76px}.wide{grid-column:auto}.actions{justify-content:stretch}.actions button{flex:1}}
  `]
})
export class AdminSettingsV241Component implements OnInit {
  private readonly cars=inject(CarService);
  readonly auth=inject(AuthService);
  private readonly access=inject(AdminAccessService);
  private readonly toast=inject(ToastService);
  private readonly media=inject(AdminMediaService);
  readonly adminProfile=this.access.profile;
  readonly loading=signal(false);
  readonly saving=signal(false);
  readonly logoUploading=signal(false);
  readonly changingPassword=signal(false);
  readonly showPassword=signal(false);
  readonly openPanel=signal<AdminSettingsPanelV243>(null);
  readonly config=this.cars.getConfig();
  formConfig:SiteConfig=this.cloneConfig(this.config());
  newPassword='';
  confirmPassword='';

  async ngOnInit():Promise<void>{
    await Promise.all([this.reload(false),this.access.refresh(true)]);
  }

  select(panel:Exclude<AdminSettingsPanelV243,null>):void{
    if(this.saving()||this.logoUploading()||this.changingPassword())return;
    if(this.openPanel()===panel){this.close();return;}
    this.formConfig=this.cloneConfig(this.config());
    this.newPassword='';this.confirmPassword='';this.showPassword.set(false);
    this.openPanel.set(panel);
  }

  close():void{
    this.openPanel.set(null);
    this.formConfig=this.cloneConfig(this.config());
    this.newPassword='';this.confirmPassword='';this.showPassword.set(false);
  }

  async reload(showToast=true):Promise<void>{
    if(this.loading())return;
    this.loading.set(true);
    try{
      await Promise.all([this.cars.refreshCloudCatalog(true),this.access.refresh(true)]);
      this.formConfig=this.cloneConfig(this.config());
      if(showToast)this.toast.show('Yönetim ve site ayarları yenilendi.','success');
    }catch(error){
      console.error(error);
      this.toast.show('Kayıtlı ayarlar yüklenemedi. Mevcut değerler korunuyor.','error');
    }finally{this.loading.set(false);}
  }

  async saveSection(section:'brand'|'contact'):Promise<void>{
    if(this.saving())return;
    this.saving.set(true);
    try{
      const latest=this.cloneConfig(this.config());
      if(section==='brand'){
        latest.companyName=this.formConfig.companyName;
        latest.tagline=this.formConfig.tagline;
        latest.logoUrl=this.formConfig.logoUrl;
        latest.logoWidthDesktop=this.formConfig.logoWidthDesktop;
        latest.logoWidthMobile=this.formConfig.logoWidthMobile;
        latest.theme=this.formConfig.theme;
      }else{
        latest.phone=this.formConfig.phone;
        latest.email=this.formConfig.email;
        latest.address=this.formConfig.address;
      }
      await this.cars.updateConfig(latest);
      await this.cars.refreshCloudCatalog(true);
      this.formConfig=this.cloneConfig(this.config());
      this.openPanel.set(null);
      this.toast.show(section==='brand'?'Marka ayarları kaydedildi.':'İletişim bilgileri kaydedildi.','success');
    }catch(error){
      console.error(error);
      this.toast.show('Ayarlar kaydedilemedi. Değişiklik uygulanmadı.','error');
    }finally{this.saving.set(false);}
  }

  async onLogoSelected(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];
    input.value='';
    if(!file||this.logoUploading())return;
    this.logoUploading.set(true);
    try{
      const uploaded=await this.media.uploadImage(file,'SITE_CONFIG','main','logo');
      this.formConfig.logoUrl=uploaded.publicUrl;
      this.toast.show('Logo dosyası yüklendi. Kalıcı olması için Markayı Kaydet seçeneğini kullanın.','success');
    }catch(error){
      console.error(error);
      this.toast.show(error instanceof Error?error.message:'Logo yüklenemedi.','error');
    }finally{this.logoUploading.set(false);}
  }

  async changePassword():Promise<void>{
    if(this.changingPassword())return;
    if(!this.newPassword||!this.confirmPassword){this.toast.show('Yeni şifre alanlarını doldurun.','error');return;}
    if(this.newPassword!==this.confirmPassword){this.toast.show('Yeni şifreler eşleşmiyor.','error');return;}
    this.changingPassword.set(true);
    try{
      const ok=await this.auth.changeCurrentPassword(this.newPassword);
      if(!ok){this.toast.show(this.auth.lastErrorMessage()||'Yönetici şifresi güncellenemedi.','error');return;}
      this.newPassword='';this.confirmPassword='';this.showPassword.set(false);this.openPanel.set(null);
      this.toast.show('Süper admin şifresi güncellendi.','success');
    }finally{this.changingPassword.set(false);}
  }

  roleLabel():string{
    const role=this.adminProfile()?.role;
    return role==='owner'?'Süper Admin / Owner':role==='admin'?'Admin':role==='editor'?'İçerik Editörü':role==='support'?'Destek':'Yönetici';
  }

  private cloneConfig(config:SiteConfig):SiteConfig{
    return typeof structuredClone==='function'?structuredClone(config):JSON.parse(JSON.stringify(config)) as SiteConfig;
  }
}
