import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-homepage-planner-copy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="copy-card" aria-labelledby="planner-copy-title">
      <header>
        <div>
          <p>Ana sayfa metinleri</p>
          <h2 id="planner-copy-title">Arama ve Hızlı Planlama Metinleri</h2>
          <span>Planlama alanında müşterinin gördüğü bütün etiket, seçenek, tarih, saat, düğme, yüklenme ve hata metinlerini doğrudan site_config.homeContent üzerinden yönetin.</span>
        </div>
        <button type="button" (click)="save()" [disabled]="saving()">{{ saving() ? 'Kaydediliyor…' : 'Metinleri Kaydet' }}</button>
      </header>

      <div class="grid">
        <fieldset>
          <legend>Arama ve hizmet seçimi</legend>
          <label><span>Arama düğmesi</span><input [(ngModel)]="form.searchButtonLabel" name="searchButtonLabel" maxlength="60" /></label>
          <label><span>Hizmet alanı etiketi</span><input [(ngModel)]="form.plannerServiceLabel" name="plannerServiceLabel" maxlength="100" /></label>
          <label><span>Şoförsüz kiralama seçeneği</span><input [(ngModel)]="form.plannerServiceIndividual" name="plannerServiceIndividual" maxlength="120" /></label>
          <label><span>Şoförlü transfer seçeneği</span><input [(ngModel)]="form.plannerServiceDriver" name="plannerServiceDriver" maxlength="120" /></label>
          <label><span>Özel gün seçeneği</span><input [(ngModel)]="form.plannerServiceWedding" name="plannerServiceWedding" maxlength="120" /></label>
          <label><span>Tur seçeneği</span><input [(ngModel)]="form.plannerServiceTour" name="plannerServiceTour" maxlength="120" /></label>
        </fieldset>

        <fieldset>
          <legend>Teslim noktası, süre ve tarihler</legend>
          <label><span>Teslim noktası etiketi</span><input [(ngModel)]="form.plannerPickupLabel" name="plannerPickupLabel" maxlength="100" /></label>
          <label><span>Teslim noktası boş seçeneği</span><input [(ngModel)]="form.plannerPickupPlaceholder" name="plannerPickupPlaceholder" maxlength="180" /></label>
          <label><span>Kiralama süresi etiketi</span><input [(ngModel)]="form.plannerDurationLabel" name="plannerDurationLabel" maxlength="100" /></label>
          <label><span>Tur tarihi etiketi</span><input [(ngModel)]="form.plannerTourDateLabel" name="plannerTourDateLabel" maxlength="80" /></label>
          <label><span>Saatlik kiralama tarihi etiketi</span><input [(ngModel)]="form.plannerHourlyDateLabel" name="plannerHourlyDateLabel" maxlength="80" /></label>
          <label><span>Alış tarihi etiketi</span><input [(ngModel)]="form.plannerStartDateLabel" name="plannerStartDateLabel" maxlength="80" /></label>
          <label><span>İade tarihi etiketi</span><input [(ngModel)]="form.plannerEndDateLabel" name="plannerEndDateLabel" maxlength="80" /></label>
          <label><span>Alış saati etiketi</span><input [(ngModel)]="form.plannerStartTimeLabel" name="plannerStartTimeLabel" maxlength="80" /></label>
          <label><span>İade saati etiketi</span><input [(ngModel)]="form.plannerEndTimeLabel" name="plannerEndTimeLabel" maxlength="80" /></label>
        </fieldset>

        <fieldset>
          <legend>Sonuç ve yüklenme metinleri</legend>
          <label><span>Kiralık araç düğmesi</span><input [(ngModel)]="form.plannerButtonRental" name="plannerButtonRental" maxlength="140" /></label>
          <label><span>Saatlik kiralama düğmesi</span><input [(ngModel)]="form.plannerButtonHourly" name="plannerButtonHourly" maxlength="140" /></label>
          <label><span>Şoförlü araç düğmesi</span><input [(ngModel)]="form.plannerButtonDriver" name="plannerButtonDriver" maxlength="140" /></label>
          <label><span>Özel gün düğmesi</span><input [(ngModel)]="form.plannerButtonWedding" name="plannerButtonWedding" maxlength="140" /></label>
          <label><span>Tur düğmesi</span><input [(ngModel)]="form.plannerButtonTour" name="plannerButtonTour" maxlength="140" /></label>
          <label><span>İlk vitrin yükleme metni</span><input [(ngModel)]="form.plannerLoadingText" name="plannerLoadingText" maxlength="160" /></label>
          <label><span>Bölüm hazırlanıyor etiketi</span><input [(ngModel)]="form.sectionPreparingLabel" name="sectionPreparingLabel" maxlength="120" /></label>
          <label><span>Bölüm yükleniyor metni</span><input [(ngModel)]="form.sectionLoadingLabel" name="sectionLoadingLabel" maxlength="160" /></label>
        </fieldset>

        <fieldset>
          <legend>Doğrulama mesajları</legend>
          <label><span>Tur tarihi eksik</span><input [(ngModel)]="form.plannerErrorTourDate" name="plannerErrorTourDate" maxlength="180" /></label>
          <label><span>Alış tarihi eksik</span><input [(ngModel)]="form.plannerErrorStartDate" name="plannerErrorStartDate" maxlength="180" /></label>
          <label><span>İade tarihi eksik</span><input [(ngModel)]="form.plannerErrorEndDate" name="plannerErrorEndDate" maxlength="180" /></label>
          <label><span>Tarih sırası hatası</span><input [(ngModel)]="form.plannerErrorDateOrder" name="plannerErrorDateOrder" maxlength="180" /></label>
          <label><span>Teslim noktası eksik</span><input [(ngModel)]="form.plannerErrorPickup" name="plannerErrorPickup" maxlength="180" /></label>
          <label><span>Saat sırası hatası</span><input [(ngModel)]="form.plannerErrorTimeOrder" name="plannerErrorTimeOrder" maxlength="180" /></label>
          <label><span>Saatlik üst sınır mesajı</span><input [(ngModel)]="form.plannerErrorHourlyLimit" name="plannerErrorHourlyLimit" maxlength="180" /></label>
        </fieldset>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.copy-card{width:min(100% - 2rem,1180px);margin:1rem auto;border:1px solid #dbe4ef;border-radius:20px;background:#fff;padding:1rem;color:#0f172a;box-shadow:0 8px 24px rgba(15,23,42,.05)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding-bottom:.9rem}header p{margin:0;color:#2563eb;font-size:.62rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}header h2{margin:.2rem 0 0;font-size:1rem;font-weight:950}header span{display:block;margin-top:.3rem;max-width:760px;color:#64748b;font-size:.7rem;line-height:1.5}button{min-height:44px;flex:none;border:0;border-radius:12px;background:#0f172a;padding:0 1rem;color:#fff;font-size:.7rem;font-weight:950}button:disabled{opacity:.5}.grid{display:grid;gap:.75rem;margin-top:.9rem}fieldset{min-width:0;border:1px solid #e2e8f0;border-radius:16px;padding:.8rem}legend{padding:0 .25rem;color:#334155;font-size:.68rem;font-weight:950}label{display:grid;gap:.3rem;margin-top:.58rem}label span{color:#64748b;font-size:.58rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}input{width:100%;min-height:43px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:0 .7rem;color:#0f172a;font-size:.72rem;outline:none}input:focus,button:focus-visible{outline:3px solid rgba(37,99,235,.25);outline-offset:2px;border-color:#2563eb}@media(min-width:760px){.copy-card{padding:1.1rem}.grid{grid-template-columns:1fr 1fr}}@media(max-width:620px){header{flex-direction:column}button{width:100%}}
  `],
})
export class AdminHomepagePlannerCopyComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly saving = signal(false);

  form = this.defaults();

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    try {
      await this.cars.refreshSiteConfig(true);
      const home = this.cars.getConfig()().homeContent || {};
      const defaults = this.defaults();
      this.form = {
        ...defaults,
        ...Object.fromEntries(Object.keys(defaults).map((key) => [key, String((home as Record<string, unknown>)[key] || defaults[key])])),
      };
    } catch {
      this.toast.show('Ana sayfa planlama metinleri yüklenemedi.', 'error');
    }
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const current = this.cars.getConfig()();
      const homeContent = { ...(current.homeContent || {}) } as Record<string, unknown>;
      for (const [key, value] of Object.entries(this.form)) homeContent[key] = String(value || '').trim();
      await this.cars.updateConfig({ ...current, homeContent: homeContent as typeof current.homeContent });
      await this.cars.refreshSiteConfig(true);
      this.toast.show('Planlama metinleri kaydedildi ve ana sayfaya uygulandı.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Planlama metinleri kaydedilemedi.', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  private defaults(): Record<string, string> {
    return {
      searchButtonLabel: 'Ara',
      plannerServiceLabel: 'Ne için araç veya hizmet arıyorsunuz?',
      plannerServiceIndividual: 'Şoförsüz araç kiralama',
      plannerServiceDriver: 'Şoförlü araç / transfer',
      plannerServiceWedding: 'Düğün / özel gün aracı',
      plannerServiceTour: 'Tur / gezi planı',
      plannerPickupLabel: 'Nereden teslim almak istiyorsunuz?',
      plannerPickupPlaceholder: 'Teslim noktasını seçin',
      plannerDurationLabel: 'Kiralama Süresi',
      plannerTourDateLabel: 'Tur tarihi',
      plannerHourlyDateLabel: 'Kiralama tarihi',
      plannerStartDateLabel: 'Alış tarihi',
      plannerEndDateLabel: 'İade tarihi',
      plannerStartTimeLabel: 'Alış Saati',
      plannerEndTimeLabel: 'İade Saati',
      plannerButtonRental: 'Bu Tarihe Uyan Araçları Göster',
      plannerButtonHourly: 'Bu Saatlere Uyan Araçları Göster',
      plannerButtonDriver: 'Şoförlü Seçenekleri Göster',
      plannerButtonWedding: 'Özel Gün Araçlarını Göster',
      plannerButtonTour: 'Bu Tarihe Uyan Turları Göster',
      plannerLoadingText: 'Size uygun seçenekler hazırlanıyor...',
      sectionPreparingLabel: 'İçerik hazırlanıyor',
      sectionLoadingLabel: 'Güncel içerik yükleniyor',
      plannerErrorTourDate: 'Tur tarihini seçin.',
      plannerErrorStartDate: 'Alış tarihini seçin.',
      plannerErrorEndDate: 'İade tarihini seçin.',
      plannerErrorDateOrder: 'İade tarihi alış tarihinden sonra olmalıdır.',
      plannerErrorPickup: 'Teslim alma noktasını seçin.',
      plannerErrorTimeOrder: 'İade saati alış saatinden sonra olmalıdır.',
      plannerErrorHourlyLimit: '23 saati aşan kiralamalar için günlük seçeneği kullanın.',
    };
  }
}
