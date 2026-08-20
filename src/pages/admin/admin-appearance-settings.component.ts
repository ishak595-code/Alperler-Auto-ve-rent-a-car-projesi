import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MotionPreference, SiteConfig } from '../../models/site-config.model';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-appearance-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="appearance" aria-labelledby="appearance-title">
      <header>
        <div>
          <p>Responsive görünüm sistemi</p>
          <h2 id="appearance-title">Tema, Renk ve Ekran Ölçekleri</h2>
          <span>Bu ayarlar güvenli sınırlar içinde uygulanır. Telefon, tablet ve masaüstü düzenini bozmadan marka görünümünü değiştirir.</span>
        </div>
        <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Kaydediliyor…' : 'Görünümü Kaydet' }}</button>
      </header>

      <div class="controls">
        <label><span>Vurgu rengi</span><div class="color-row"><input type="color" [(ngModel)]="accentColor" name="accentColor" aria-label="Vurgu rengi seç" /><input [(ngModel)]="accentColor" name="accentColorText" maxlength="7" pattern="#[0-9A-Fa-f]{6}" aria-label="Vurgu rengi HEX" /></div><small>Buton, odak halkası ve marka vurgularında kullanılır.</small></label>
        <label><span>Sayfa arka planı</span><div class="color-row"><input type="color" [(ngModel)]="pageBackground" name="pageBackground" aria-label="Sayfa arka plan rengi seç" /><input [(ngModel)]="pageBackground" name="pageBackgroundText" maxlength="7" pattern="#[0-9A-Fa-f]{6}" aria-label="Sayfa arka plan HEX" /></div><small>Ana müşteri sayfalarının temel zemin rengidir.</small></label>

        <label><span>İçerik maksimum genişliği: {{ contentMaxWidth }} px</span><input type="range" min="960" max="1600" step="20" [(ngModel)]="contentMaxWidth" name="contentMaxWidth" /><small>Geniş ekranlarda içerik aşırı yayılmaz, küçük ekranlarda otomatik yüzde 100'e düşer.</small></label>
        <label><span>Köşe yuvarlaklığı: {{ cornerRadius }} px</span><input type="range" min="8" max="28" step="1" [(ngModel)]="cornerRadius" name="cornerRadius" /><small>Kart ve etkileşim alanları için ortak tasarım ölçüsüdür.</small></label>
        <label><span>Yazı ölçeği: %{{ fontScalePercent() }}</span><input type="range" min="0.9" max="1.15" step="0.01" [(ngModel)]="fontScale" name="fontScale" /><small>Erişilebilirliği korumak için güvenli aralıkta tutulur.</small></label>
        <label><span>Hareket ve animasyon</span><select [(ngModel)]="motionPreference" name="motionPreference"><option value="system">Cihaz tercihine uy</option><option value="reduced">Hareketi azalt</option><option value="full">Normal hareket</option></select><small>Hareket hassasiyeti olan kullanıcılar için sistem tercihi varsayılandır.</small></label>
      </div>

      <div class="preview" [style.--preview-accent]="validColor(accentColor) ? accentColor : '#2563eb'" [style.--preview-bg]="validColor(pageBackground) ? pageBackground : '#050914'" [style.--preview-radius.px]="clampNumber(cornerRadius,8,28,18)">
        <div class="preview-card"><strong>Canlı görünüm örneği</strong><span>Değişiklikler kaydedildiğinde tüm müşteri ekranlarında ortak tasarım değişkenleri güncellenir.</span><button type="button">Örnek Buton</button></div>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block;background:#f8fafc;padding:0 1rem 1rem}.appearance{width:min(100%,1080px);margin:1rem auto 0;overflow:hidden;border:1px solid #dbe4ef;border-radius:22px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.05)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem 1.1rem}header p{margin:0;color:#2563eb;font-size:.6rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}header h2{margin:.2rem 0 0;font-size:1.1rem}header span{display:block;margin-top:.3rem;max-width:720px;color:#64748b;font-size:.7rem;line-height:1.5}header button{min-height:44px;flex:none;border:0;border-radius:12px;background:#0f172a;padding:0 1rem;color:#fff;font-size:.7rem;font-weight:950}.controls{display:grid;gap:1rem;padding:1.1rem}.controls label{display:grid;gap:.4rem;min-width:0}.controls label>span{font-size:.65rem;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.controls small{color:#64748b;font-size:.62rem;line-height:1.45}.controls input[type="range"]{width:100%;min-height:34px}.controls select,.color-row input[type="text"],.color-row input:not([type]){min-height:46px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:0 .7rem;color:#0f172a}.color-row{display:grid;grid-template-columns:54px 1fr;gap:.55rem}.color-row input[type="color"]{width:54px;height:46px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:3px}.color-row input:last-child{min-width:0;border:1px solid #cbd5e1;border-radius:11px;padding:0 .7rem}.preview{padding:1.1rem;background:var(--preview-bg)}.preview-card{max-width:520px;border-radius:var(--preview-radius);background:#fff;padding:1rem;color:#0f172a}.preview-card strong,.preview-card span{display:block}.preview-card span{margin-top:.35rem;color:#64748b;font-size:.7rem;line-height:1.5}.preview-card button{min-height:42px;margin-top:.8rem;border:0;border-radius:calc(var(--preview-radius) * .65);background:var(--preview-accent);padding:0 .9rem;color:#fff;font-weight:900}@media(min-width:760px){.controls{grid-template-columns:1fr 1fr}}@media(max-width:640px){header{flex-direction:column}header button{width:100%}}
  `],
})
export class AdminAppearanceSettingsComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  saving = false;
  accentColor = '#2563eb';
  pageBackground = '#050914';
  contentMaxWidth = 1280;
  cornerRadius = 18;
  fontScale = 1;
  motionPreference: MotionPreference = 'system';

  async ngOnInit(): Promise<void> {
    try { await this.cars.refreshCloudCatalog(true); } catch { /* retain current runtime config */ }
    this.load(this.cars.getConfig()());
  }

  fontScalePercent(): number { return Math.round(this.clampNumber(this.fontScale, .9, 1.15, 1) * 100); }
  validColor(value: string): boolean { return /^#[0-9a-f]{6}$/i.test(String(value || '').trim()); }
  clampNumber(value: unknown, min: number, max: number, fallback: number): number { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }

  async save(): Promise<void> {
    if (this.saving) return;
    if (!this.validColor(this.accentColor) || !this.validColor(this.pageBackground)) { this.toast.show('Renkler #RRGGBB biçiminde geçerli HEX değeri olmalıdır.', 'error'); return; }
    this.saving = true;
    try {
      const current = this.cars.getConfig()();
      await this.cars.updateConfig({
        ...current,
        accentColor: this.accentColor.toLowerCase(),
        pageBackground: this.pageBackground.toLowerCase(),
        contentMaxWidth: Math.round(this.clampNumber(this.contentMaxWidth, 960, 1600, 1280)),
        cornerRadius: Math.round(this.clampNumber(this.cornerRadius, 8, 28, 18)),
        fontScale: Number(this.clampNumber(this.fontScale, .9, 1.15, 1).toFixed(2)),
        motionPreference: ['system','reduced','full'].includes(this.motionPreference) ? this.motionPreference : 'system',
      });
      await this.cars.refreshCloudCatalog(true);
      this.load(this.cars.getConfig()());
      this.toast.show('Responsive görünüm ayarları kaydedildi.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Görünüm ayarları kaydedilemedi.', 'error');
    } finally { this.saving = false; }
  }

  private load(config: SiteConfig): void {
    this.accentColor = this.validColor(config.accentColor || '') ? String(config.accentColor) : '#2563eb';
    this.pageBackground = this.validColor(config.pageBackground || '') ? String(config.pageBackground) : '#050914';
    this.contentMaxWidth = Math.round(this.clampNumber(config.contentMaxWidth, 960, 1600, 1280));
    this.cornerRadius = Math.round(this.clampNumber(config.cornerRadius, 8, 28, 18));
    this.fontScale = this.clampNumber(config.fontScale, .9, 1.15, 1);
    this.motionPreference = ['system','reduced','full'].includes(String(config.motionPreference)) ? config.motionPreference as MotionPreference : 'system';
  }
}
