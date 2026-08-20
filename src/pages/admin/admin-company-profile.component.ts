import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SiteConfig } from '../../models/site-config.model';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

type CompanyConfig = SiteConfig & {
  companyGroupName?: string;
  siteBrandName?: string;
  automotiveBrandName?: string;
  founderName?: string;
  legalCompanyName?: string;
  commercialTitle?: string;
  companyRegistrationStatus?: 'PLANNING' | 'REGISTERED';
  taxOffice?: string;
  taxNumber?: string;
  mersisNumber?: string;
  tradeRegistryNumber?: string;
  registeredAddress?: string;
  website?: string;
};

@Component({
  selector: 'app-admin-company-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="head">
        <div><p>Kurumsal kimlik</p><h1>Alperler Şirket Bilgileri</h1><span>Şirket çatısını, müşteri markasını, kurucuyu ve Türkiye'deki resmi kuruluş bilgilerini tek kaynaktan yönetin.</span></div>
        <div class="actions"><button type="button" class="secondary" (click)="reload()" [disabled]="loading() || saving()">{{ loading() ? 'Yenileniyor…' : 'Yenile' }}</button><button type="button" class="primary" (click)="save()" [disabled]="loading() || saving()">{{ saving() ? 'Kaydediliyor…' : 'Kaydet ve Uygula' }}</button></div>
      </header>

      <section class="notice"><strong>Marka yapısı:</strong> Şirket çatısı <b>Alperler</b>, bu sitenin müşteri markası <b>Alperler Rent A Car</b>, otomotiv ve filo altyapısının kurumsal adı <b>Alperler Auto</b>. Bu ayrım SEO, Hakkımızda, sözleşme ve yönetim kayıtlarının birbirine karışmasını önler.</section>

      <section class="card"><header><h2>Marka Hiyerarşisi</h2><p>Müşterinin gördüğü isim ile şirket/altyapı adını ayrı tutun.</p></header><div class="grid">
        <label><span>Şirket Çatısı</span><input [(ngModel)]="form.companyGroupName" name="companyGroupName" placeholder="Alperler" /></label>
        <label><span>Site / Müşteri Markası</span><input [(ngModel)]="form.siteBrandName" name="siteBrandName" placeholder="Alperler Rent A Car" /></label>
        <label><span>Otomotiv Altyapısı</span><input [(ngModel)]="form.automotiveBrandName" name="automotiveBrandName" placeholder="Alperler Auto" /></label>
        <label><span>Sitede Kullanılan Ana İsim</span><input [(ngModel)]="form.companyName" name="companyName" required /></label>
        <label><span>Kurucu</span><input [(ngModel)]="form.founderName" name="founderName" placeholder="İshak Alper" /></label>
        <label><span>Slogan</span><input [(ngModel)]="form.tagline" name="tagline" /></label>
      </div></section>

      <section class="card"><header><h2>Türkiye Resmi Şirket Bilgileri</h2><p>Şirket kuruluşu tamamlanana kadar bilinmeyen alanları boş bırakın. Vergi veya sicil numarası uydurmayın.</p></header><div class="grid">
        <label><span>Kuruluş Durumu</span><select [(ngModel)]="form.companyRegistrationStatus" name="companyRegistrationStatus"><option value="PLANNING">Kuruluş aşamasında</option><option value="REGISTERED">Resmen kuruldu</option></select></label>
        <label><span>Resmi / Tescilli Unvan</span><input [(ngModel)]="form.legalCompanyName" name="legalCompanyName" placeholder="Tescil sonrası doldurun" /></label>
        <label><span>Ticari Unvan</span><input [(ngModel)]="form.commercialTitle" name="commercialTitle" /></label>
        <label><span>Vergi Dairesi</span><input [(ngModel)]="form.taxOffice" name="taxOffice" /></label>
        <label><span>Vergi Numarası / TCKN</span><input [(ngModel)]="form.taxNumber" name="taxNumber" inputmode="numeric" /></label>
        <label><span>MERSİS Numarası</span><input [(ngModel)]="form.mersisNumber" name="mersisNumber" inputmode="numeric" /></label>
        <label><span>Ticaret Sicil Numarası</span><input [(ngModel)]="form.tradeRegistryNumber" name="tradeRegistryNumber" /></label>
        <label class="wide"><span>Resmi Kayıtlı Adres</span><textarea [(ngModel)]="form.registeredAddress" name="registeredAddress" rows="3"></textarea></label>
      </div></section>

      <section class="card"><header><h2>İletişim ve Dijital Adres</h2><p>Footer, yasal metinler ve müşteri iletişim alanlarında kullanılabilecek ana bilgiler.</p></header><div class="grid">
        <label><span>Telefon</span><input [(ngModel)]="form.phone" name="phone" autocomplete="tel" /></label>
        <label><span>E-posta</span><input [(ngModel)]="form.email" name="email" type="email" autocomplete="email" /></label>
        <label><span>Web Sitesi</span><input [(ngModel)]="form.website" name="website" placeholder="Domain alındıktan sonra https://..." /></label>
        <label><span>WhatsApp</span><input [(ngModel)]="form.whatsapp" name="whatsapp" /></label>
        <label class="wide"><span>Operasyon Adresi</span><textarea [(ngModel)]="form.address" name="address" rows="3"></textarea></label>
      </div></section>

      <section class="card"><header><h2>Hakkımızda Metni</h2><p>Alperler, Alperler Rent A Car ve Alperler Auto ilişkisini burada açıklayın.</p></header><div class="grid"><label class="wide"><span>Başlık</span><input [(ngModel)]="form.aboutTitle" name="aboutTitle" /></label><label class="wide"><span>Açıklama</span><textarea [(ngModel)]="form.aboutText" name="aboutText" rows="12"></textarea></label></div></section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100vh;background:#f8fafc;padding:1rem;color:#0f172a}.head{max-width:1180px;margin:auto;display:flex;gap:1rem;justify-content:space-between;align-items:end}.head p{margin:0;color:#2563eb;font-size:.65rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.head h1{margin:.2rem 0;font-size:1.55rem}.head span{display:block;max-width:760px;color:#64748b;font-size:.76rem;line-height:1.5}.actions{display:flex;gap:.5rem;flex-wrap:wrap}.actions button{min-height:44px;border-radius:12px;padding:0 1rem;font-weight:900}.primary{border:0;background:#0f172a;color:#fff}.secondary{border:1px solid #cbd5e1;background:#fff}.notice,.card{max-width:1180px;margin:1rem auto 0;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.notice{border-color:#bfdbfe;background:#eff6ff;padding:.9rem;color:#1e3a8a;font-size:.74rem;line-height:1.55}.card>header{border-bottom:1px solid #e2e8f0;padding:1rem}.card h2{margin:0;font-size:1rem}.card header p{margin:.25rem 0 0;color:#64748b;font-size:.7rem}.grid{display:grid;gap:.75rem;padding:1rem}.grid label{display:grid;gap:.35rem}.grid span{color:#475569;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.grid input,.grid select,.grid textarea{width:100%;min-height:46px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:.65rem .75rem;font:inherit;font-size:.78rem}.grid textarea{resize:vertical}.wide{grid-column:1/-1}@media(min-width:760px){.page{padding:1.5rem}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.head{align-items:stretch;flex-direction:column}.actions button{flex:1}}
  `],
})
export class AdminCompanyProfileComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly config = this.cars.getConfig();
  form: CompanyConfig = this.clone(this.config() as CompanyConfig);

  async ngOnInit(): Promise<void> { await this.reload(false); }
  async reload(showToast = true): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.cars.refreshCloudCatalog(true);
      this.form = this.clone(this.config() as CompanyConfig);
      this.form.companyGroupName ||= 'Alperler';
      this.form.siteBrandName ||= 'Alperler Rent A Car';
      this.form.automotiveBrandName ||= 'Alperler Auto';
      this.form.founderName ||= 'İshak Alper';
      this.form.companyRegistrationStatus ||= 'PLANNING';
      if (showToast) this.toast.show('Şirket bilgileri yenilendi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Şirket bilgileri yüklenemedi.', 'error');
    } finally { this.loading.set(false); }
  }
  async save(): Promise<void> {
    if (this.saving()) return;
    if (!this.form.companyGroupName?.trim() || !this.form.siteBrandName?.trim() || !this.form.founderName?.trim()) {
      this.toast.show('Şirket çatısı, site markası ve kurucu alanları boş bırakılamaz.', 'error');
      return;
    }
    this.saving.set(true);
    try {
      this.form.companyName = this.form.siteBrandName.trim();
      await this.cars.updateConfig(this.clone(this.form));
      await this.cars.refreshCloudCatalog(true);
      this.form = this.clone(this.config() as CompanyConfig);
      this.toast.show('Kurumsal bilgiler veritabanına kaydedildi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Kurumsal bilgiler kaydedilemedi.', 'error');
    } finally { this.saving.set(false); }
  }
  private clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
}
