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
          <span>Planlama kutusunda müşterinin gördüğü etiket, seçenek, tarih, düğme ve hata metinlerini veritabanından yönetin.</span>
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
          <legend>Teslim noktası ve tarihler</legend>
          <label><span>Teslim noktası etiketi</span><input [(ngModel)]="form.plannerPickupLabel" name="plannerPickupLabel" maxlength="100" /></label>
          <label><span>Teslim noktası boş seçeneği</span><input [(ngModel)]="form.plannerPickupPlaceholder" name="plannerPickupPlaceholder" maxlength="180" /></label>
          <label><span>Teslim noktası sayaç son eki</span><input [(ngModel)]="form.plannerPickupCountSuffix" name="plannerPickupCountSuffix" maxlength="120" /></label>
          <label><span>Tur tarihi etiketi</span><input [(ngModel)]="form.plannerTourDateLabel" name="plannerTourDateLabel" maxlength="80" /></label>
          <label><span>Alış tarihi etiketi</span><input [(ngModel)]="form.plannerStartDateLabel" name="plannerStartDateLabel" maxlength="80" /></label>
          <label><span>İade tarihi etiketi</span><input [(ngModel)]="form.plannerEndDateLabel" name="plannerEndDateLabel" maxlength="80" /></label>
        </fieldset>

        <fieldset>
          <legend>Sonuç düğmeleri</legend>
          <label><span>Kiralık araç düğmesi</span><input [(ngModel)]="form.plannerButtonRental" name="plannerButtonRental" maxlength="140" /></label>
          <label><span>Şoförlü araç düğmesi</span><input [(ngModel)]="form.plannerButtonDriver" name="plannerButtonDriver" maxlength="140" /></label>
          <label><span>Özel gün düğmesi</span><input [(ngModel)]="form.plannerButtonWedding" name="plannerButtonWedding" maxlength="140" /></label>
          <label><span>Tur düğmesi</span><input [(ngModel)]="form.plannerButtonTour" name="plannerButtonTour" maxlength="140" /></label>
          <label><span>Vitrin yükleme metni</span><input [(ngModel)]="form.plannerLoadingText" name="plannerLoadingText" maxlength="160" /></label>
        </fieldset>

        <fieldset>
          <legend>Doğrulama mesajları</legend>
          <label><span>Tur tarihi eksik</span><input [(ngModel)]="form.plannerErrorTourDate" name="plannerErrorTourDate" maxlength="180" /></label>
          <label><span>Alış tarihi eksik</span><input [(ngModel)]="form.plannerErrorStartDate" name="plannerErrorStartDate" maxlength="180" /></label>
          <label><span>İade tarihi eksik</span><input [(ngModel)]="form.plannerErrorEndDate" name="plannerErrorEndDate" maxlength="180" /></label>
          <label><span>Tarih sırası hatası</span><input [(ngModel)]="form.plannerErrorDateOrder" name="plannerErrorDateOrder" maxlength="180" /></label>
          <label><span>Teslim noktası eksik</span><input [(ngModel)]="form.plannerErrorPickup" name="plannerErrorPickup" maxlength="180" /></label>
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
      await this.cars.refreshCloudCatalog(true);
      const home = this.cars.getConfig()().homeContent || {};
      this.form = {
        ...this.defaults(),
        ...Object.fromEntries(Object.keys(this.defaults()).map((key) => [key, String((home as Record<string, unknown>)[key] || (this.defaults() as Record<string, string>)[key])])),
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
      await this.cars.refreshCloudCatalog(true);
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
      plannerServiceLabel: 'Ne arıyorsunuz?',
      plannerServiceIndividual: 'Şoförsüz araç kiralama',
      plannerServiceDriver: 'Şoförlü transfer',
      plannerServiceWedding: 'Düğün / özel gün aracı',
      plannerServiceTour: 'Özel tur',
      plannerPickupLabel: 'Nereden?',
      plannerPickupPlaceholder: 'Teslim almak istediğiniz yeri seçin',
      plannerPickupCountSuffix: 'teslim seçeneği mevcut',
      plannerTourDateLabel: 'Tur tarihi',
      plannerStartDateLabel: 'Alış tarihi',
      plannerEndDateLabel: 'İade tarihi',
      plannerButtonRental: 'Tarihime Uyan Araçları Göster',
      plannerButtonDriver: 'Şoförlü Araçları Göster',
      plannerButtonWedding: 'Özel Gün Araçlarını Göster',
      plannerButtonTour: 'Bu Tarihe Uyan Turları Göster',
      plannerLoadingText: 'Size uygun vitrin hazırlanıyor...',
      plannerErrorTourDate: 'Önce tur tarihini seçin.',
      plannerErrorStartDate: 'Önce alış tarihini seçin.',
      plannerErrorEndDate: 'İade tarihini de seçin.',
      plannerErrorDateOrder: 'İade tarihi alış tarihinden önce olamaz.',
      plannerErrorPickup: 'Nereden teslim almak istediğinizi seçin.',
    };
  }
}
