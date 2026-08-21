import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MotionPreference, PremiumThemePalette, SiteConfig } from '../../models/site-config.model';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

type PaletteKey = keyof PremiumThemePalette;
type FullPalette = Required<PremiumThemePalette>;

const PREMIUM_DEFAULTS: FullPalette = {
  background: '#050A18',
  listBackground: '#080F20',
  surface: '#0B1224',
  card: '#0D1628',
  elevated: '#101A2E',
  border: '#24314A',
  primaryBlue: '#2563EB',
  blueLight: '#60A5FA',
  brandGold: '#EABF35',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
};

@Component({
  selector: 'app-admin-appearance-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="appearance" aria-labelledby="appearance-title">
      <header>
        <div>
          <p>Premium responsive tasarım sistemi</p>
          <h2 id="appearance-title">Tema, Renkler ve Ekran Ölçekleri</h2>
          <span>Bu panel yalnız renk ve görünüm değişkenlerini yönetir. Yeni araç, tur, kampanya, blog veya vitrin bölümü eklemenizi kısıtlamaz.</span>
        </div>
        <div class="header-actions">
          <button type="button" class="secondary" (click)="resetPremiumPalette()">Premium Paleti Geri Yükle</button>
          <button type="button" class="primary" (click)="save()" [disabled]="saving">{{ saving ? 'Kaydediliyor…' : 'Görünümü Kaydet' }}</button>
        </div>
      </header>

      <section class="panel-block" aria-labelledby="palette-title">
        <div class="section-title"><div><p>Marka paleti</p><h3 id="palette-title">Müşteri sitesinin bütün premium renkleri</h3></div><span class="status" [class.warn]="contrastWarning()">{{ contrastWarning() ? 'Kontrastı gözden geçirin' : 'Kontrast dengeli' }}</span></div>
        <div class="palette-grid">
          @for (field of colorFields; track field.key) {
            <label class="color-control">
              <span>{{ field.label }}</span>
              <div class="color-row">
                <input type="color" [ngModel]="palette[field.key]" (ngModelChange)="setPaletteColor(field.key,$event)" [name]="'picker-' + field.key" [attr.aria-label]="field.label + ' renk seçici'" />
                <input [ngModel]="palette[field.key]" (ngModelChange)="setPaletteColor(field.key,$event)" [name]="'hex-' + field.key" maxlength="7" pattern="#[0-9A-Fa-f]{6}" [attr.aria-label]="field.label + ' HEX değeri'" />
              </div>
              <small>{{ field.help }}</small>
            </label>
          }
        </div>
      </section>

      <section class="panel-block" aria-labelledby="layout-title">
        <div class="section-title"><div><p>Responsive ölçüler</p><h3 id="layout-title">Telefon, tablet ve masaüstü davranışı</h3></div></div>
        <div class="controls">
          <label><span>İçerik maksimum genişliği: {{ contentMaxWidth }} px</span><input type="range" min="960" max="1600" step="20" [(ngModel)]="contentMaxWidth" name="contentMaxWidth" /><small>Geniş ekranda içeriğin gereksiz yayılmasını önler. Telefon ve tablette genişlik otomatik uyarlanır.</small></label>
          <label><span>Köşe yuvarlaklığı: {{ cornerRadius }} px</span><input type="range" min="8" max="28" step="1" [(ngModel)]="cornerRadius" name="cornerRadius" /><small>Kartlar ve etkileşim alanlarının ortak radius değeridir.</small></label>
          <label><span>Yazı ölçeği: %{{ fontScalePercent() }}</span><input type="range" min="0.9" max="1.15" step="0.01" [(ngModel)]="fontScale" name="fontScale" /><small>Erişilebilirliği bozmadan bütün müşteri ekranlarının yazı ölçeğini ayarlar.</small></label>
          <label><span>Hareket ve animasyon</span><select [(ngModel)]="motionPreference" name="motionPreference"><option value="system">Cihaz tercihine uy</option><option value="reduced">Hareketi azalt</option><option value="full">Normal hareket</option></select><small>Hareket hassasiyeti olan ziyaretçiler için sistem tercihi varsayılandır.</small></label>
        </div>
      </section>

      <section class="preview-wrap" aria-label="Canlı tema ön izlemesi"
        [style.--p-bg]="palette.background" [style.--p-list]="palette.listBackground" [style.--p-surface]="palette.surface"
        [style.--p-card]="palette.card" [style.--p-elevated]="palette.elevated" [style.--p-border]="palette.border"
        [style.--p-blue]="palette.primaryBlue" [style.--p-blue-light]="palette.blueLight" [style.--p-gold]="palette.brandGold"
        [style.--p-text]="palette.text" [style.--p-muted]="palette.textMuted" [style.--p-subtle]="palette.textSubtle"
        [style.--p-radius.px]="clampNumber(cornerRadius,8,28,18)">
        <div class="preview-page">
          <div class="preview-head"><div><small>ALPERLER RENT A CAR</small><strong>Premium görünüm ön izlemesi</strong><span>Ana sayfa, listeler ve detay ekranları aynı paleti kullanır.</span></div><button type="button">Ana Aksiyon</button></div>
          <div class="preview-list">
            <article class="preview-card"><div class="fake-image"><span>YENİ</span></div><small>Kiralık Araç</small><strong>Örnek araç kartı</strong><p>Açıklama ve ikincil bilgiler okunabilir kontrastla gösterilir.</p><div><b>3.500 ₺ / gün</b><i>Detayı aç →</i></div></article>
            <article class="preview-card elevated"><div class="fake-image"><span class="gold">FIRSAT</span></div><small>Satılık Araç</small><strong>Hover / yükseltilmiş yüzey</strong><p>Mavi aktif durum, altın ise yalnız değer ve fırsat vurgusudur.</p><div><b>1.250.000 ₺</b><i>İlanı aç →</i></div></article>
          </div>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host{display:block;background:#f8fafc;padding:0 1rem 1rem}.appearance{width:min(100%,1160px);margin:1rem auto 0;overflow:hidden;border:1px solid #dbe4ef;border-radius:22px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.05)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem 1.1rem}header p,.section-title p{margin:0;color:#2563eb;font-size:.6rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}header h2{margin:.2rem 0 0;font-size:1.15rem}header span{display:block;margin-top:.3rem;max-width:720px;color:#64748b;font-size:.72rem;line-height:1.5}.header-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.55rem}.header-actions button{min-height:44px;border-radius:12px;padding:0 .9rem;font-size:.68rem;font-weight:950}.header-actions .primary{border:0;background:#0f172a;color:#fff}.header-actions .secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.panel-block{border-bottom:1px solid #e2e8f0;padding:1.1rem}.section-title{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-title h3{margin:.2rem 0 0;font-size:.95rem}.status{border-radius:999px;background:#ecfdf5;padding:.4rem .65rem;color:#047857;font-size:.62rem;font-weight:900}.status.warn{background:#fff7ed;color:#c2410c}.palette-grid,.controls{display:grid;gap:1rem}.color-control,.controls label{display:grid;gap:.4rem;min-width:0}.color-control>span,.controls label>span{font-size:.65rem;font-weight:950;color:#334155;text-transform:uppercase;letter-spacing:.04em}.color-control small,.controls small{color:#64748b;font-size:.62rem;line-height:1.45}.color-row{display:grid;grid-template-columns:54px 1fr;gap:.55rem}.color-row input[type="color"]{width:54px;height:46px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:3px}.color-row input:last-child,.controls select{min-width:0;min-height:46px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:0 .7rem;color:#0f172a}.controls input[type="range"]{width:100%;min-height:34px}.preview-wrap{padding:1.1rem;background:#eef2f7}.preview-page{overflow:hidden;border-radius:var(--p-radius);background:var(--p-bg);color:var(--p-text);box-shadow:0 18px 50px rgba(15,23,42,.2)}.preview-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--p-border);padding:1rem 1.1rem}.preview-head div>*{display:block}.preview-head small{color:var(--p-blue-light);font-weight:900;letter-spacing:.1em}.preview-head strong{margin-top:.2rem}.preview-head span{margin-top:.25rem;color:var(--p-muted);font-size:.7rem}.preview-head button{min-height:42px;border:0;border-radius:11px;background:var(--p-blue);padding:0 .8rem;color:#fff;font-weight:900}.preview-list{display:grid;gap:.8rem;background:var(--p-list);padding:1rem}.preview-card{border:1px solid var(--p-border);border-radius:calc(var(--p-radius) * .8);background:var(--p-card);padding:.75rem}.preview-card.elevated{background:var(--p-elevated)}.fake-image{display:flex;min-height:76px;align-items:flex-start;border-radius:10px;background:linear-gradient(135deg,var(--p-surface),var(--p-elevated));padding:.5rem}.fake-image span{border-radius:999px;background:var(--p-blue);padding:.25rem .45rem;color:#fff;font-size:.55rem;font-weight:950}.fake-image .gold{background:var(--p-gold);color:#111827}.preview-card>small{display:block;margin-top:.65rem;color:var(--p-subtle)}.preview-card>strong{display:block;margin-top:.2rem;color:var(--p-text)}.preview-card p{margin:.35rem 0;color:var(--p-muted);font-size:.68rem;line-height:1.5}.preview-card>div:last-child{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.6rem}.preview-card b{color:var(--p-text)}.preview-card i{color:var(--p-blue-light);font-size:.65rem;font-style:normal;font-weight:900}@media(min-width:720px){.palette-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.controls{grid-template-columns:repeat(2,minmax(0,1fr))}.preview-list{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1050px){.palette-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){header,.section-title,.preview-head{align-items:stretch;flex-direction:column}.header-actions{display:grid;width:100%;grid-template-columns:1fr}.preview-head button{width:100%}}
  `],
})
export class AdminAppearanceSettingsComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  saving = false;
  palette: FullPalette = { ...PREMIUM_DEFAULTS };
  contentMaxWidth = 1280;
  cornerRadius = 18;
  fontScale = 1;
  motionPreference: MotionPreference = 'system';

  readonly colorFields: Array<{ key: PaletteKey; label: string; help: string }> = [
    { key: 'background', label: 'Ana arka plan', help: 'Tüm müşteri sayfalarının en alt lacivert zemini.' },
    { key: 'listBackground', label: 'Liste alanı', help: 'Kiralık, satılık ve diğer katalog sonuçlarının bölüm zemini.' },
    { key: 'surface', label: 'Panel yüzeyi', help: 'Filtre, rezervasyon, iletişim ve büyük içerik panelleri.' },
    { key: 'card', label: 'Kart yüzeyi', help: 'Araç, tur, kampanya, blog ve diğer kartların normal zemini.' },
    { key: 'elevated', label: 'Hover / yükseltilmiş', help: 'Hover, seçili alan, dropdown ve ikincil yüzey derinliği.' },
    { key: 'border', label: 'Sınır rengi', help: 'Kart ve panel ayrımını sağlayan ince çizgiler.' },
    { key: 'primaryBlue', label: 'Ana aksiyon mavisi', help: 'Buton, aktif seçim ve temel bağlantı rengi.' },
    { key: 'blueLight', label: 'Açık mavi vurgu', help: 'Hover, focus, link ve küçük premium vurgu rengi.' },
    { key: 'brandGold', label: 'Marka altını', help: 'İndirim, fırsat ve özel değer vurgusu. Genel CTA için kullanılmaz.' },
    { key: 'text', label: 'Ana metin', help: 'Başlıklar, fiyatlar ve yüksek öncelikli metinler.' },
    { key: 'textMuted', label: 'Açıklama metni', help: 'Paragraf ve açıklama metinlerinin dengeli rengi.' },
    { key: 'textSubtle', label: 'İkincil metin', help: 'Metadata, tarih, küçük yardımcı bilgiler ve düşük öncelikli metinler.' },
  ];

  async ngOnInit(): Promise<void> {
    try { await this.cars.refreshCloudCatalog(true); } catch { /* mevcut runtime config korunur */ }
    this.load(this.cars.getConfig()());
  }

  fontScalePercent(): number { return Math.round(this.clampNumber(this.fontScale, .9, 1.15, 1) * 100); }
  validColor(value: string): boolean { return /^#[0-9a-f]{6}$/i.test(String(value || '').trim()); }
  clampNumber(value: unknown, min: number, max: number, fallback: number): number { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }

  setPaletteColor(key: PaletteKey, value: string): void { this.palette = { ...this.palette, [key]: String(value || '').trim().toUpperCase() }; }
  resetPremiumPalette(): void { this.palette = { ...PREMIUM_DEFAULTS }; this.toast.show('Premium varsayılan palet ön izlemeye yüklendi. Kalıcı olması için Görünümü Kaydet düğmesine basın.', 'info'); }
  contrastWarning(): boolean { return this.contrastRatio(this.palette.text, this.palette.card) < 4.5 || this.contrastRatio(this.palette.textMuted, this.palette.card) < 3; }

  async save(): Promise<void> {
    if (this.saving) return;
    const invalid = this.colorFields.find((field) => !this.validColor(this.palette[field.key]));
    if (invalid) { this.toast.show(`${invalid.label} için #RRGGBB biçiminde geçerli bir HEX rengi girin.`, 'error'); return; }
    this.saving = true;
    try {
      const current = this.cars.getConfig()();
      const normalizedPalette = Object.fromEntries(Object.entries(this.palette).map(([key, value]) => [key, String(value).toUpperCase()])) as FullPalette;
      await this.cars.updateConfig({
        ...current,
        premiumPalette: normalizedPalette,
        accentColor: normalizedPalette.primaryBlue,
        pageBackground: normalizedPalette.background,
        contentMaxWidth: Math.round(this.clampNumber(this.contentMaxWidth, 960, 1600, 1280)),
        cornerRadius: Math.round(this.clampNumber(this.cornerRadius, 8, 28, 18)),
        fontScale: Number(this.clampNumber(this.fontScale, .9, 1.15, 1).toFixed(2)),
        motionPreference: ['system','reduced','full'].includes(this.motionPreference) ? this.motionPreference : 'system',
      });
      await this.cars.refreshCloudCatalog(true);
      this.load(this.cars.getConfig()());
      this.toast.show('Premium tasarım paleti ve responsive görünüm ayarları kaydedildi.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Görünüm ayarları kaydedilemedi.', 'error');
    } finally { this.saving = false; }
  }

  private load(config: SiteConfig): void {
    const source = config.premiumPalette || {};
    this.palette = {
      background: this.pickColor(source.background || config.pageBackground, PREMIUM_DEFAULTS.background),
      listBackground: this.pickColor(source.listBackground, PREMIUM_DEFAULTS.listBackground),
      surface: this.pickColor(source.surface, PREMIUM_DEFAULTS.surface),
      card: this.pickColor(source.card, PREMIUM_DEFAULTS.card),
      elevated: this.pickColor(source.elevated, PREMIUM_DEFAULTS.elevated),
      border: this.pickColor(source.border, PREMIUM_DEFAULTS.border),
      primaryBlue: this.pickColor(source.primaryBlue || config.accentColor, PREMIUM_DEFAULTS.primaryBlue),
      blueLight: this.pickColor(source.blueLight, PREMIUM_DEFAULTS.blueLight),
      brandGold: this.pickColor(source.brandGold, PREMIUM_DEFAULTS.brandGold),
      text: this.pickColor(source.text, PREMIUM_DEFAULTS.text),
      textMuted: this.pickColor(source.textMuted, PREMIUM_DEFAULTS.textMuted),
      textSubtle: this.pickColor(source.textSubtle, PREMIUM_DEFAULTS.textSubtle),
    };
    this.contentMaxWidth = Math.round(this.clampNumber(config.contentMaxWidth, 960, 1600, 1280));
    this.cornerRadius = Math.round(this.clampNumber(config.cornerRadius, 8, 28, 18));
    this.fontScale = this.clampNumber(config.fontScale, .9, 1.15, 1);
    this.motionPreference = ['system','reduced','full'].includes(String(config.motionPreference)) ? config.motionPreference as MotionPreference : 'system';
  }

  private pickColor(value: unknown, fallback: string): string { const color = String(value || '').trim(); return this.validColor(color) ? color.toUpperCase() : fallback; }
  private contrastRatio(foreground: string, background: string): number { const a = this.luminance(foreground); const b = this.luminance(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
  private luminance(hex: string): number { const clean = String(hex || '').replace('#',''); if (!/^[0-9a-f]{6}$/i.test(clean)) return 0; const rgb = [0,2,4].map((i) => parseInt(clean.slice(i,i+2),16)/255).map((v) => v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4)); return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]; }
}
