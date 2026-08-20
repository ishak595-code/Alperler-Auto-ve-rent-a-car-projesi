import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { MarketingService } from '../../services/marketing.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-marketing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="head">
        <div>
          <p>Büyüme merkezi</p>
          <h1>Çok Kanallı Reklam Merkezi</h1>
          <span>Araç, tur veya marka kampanyasını gerçek reklam hesaplarına güvenli biçimde hazırlayın. Dış kampanyalar önce PAUSED oluşturulur.</span>
        </div>
        <button type="button" (click)="refresh()" [disabled]="loading()">{{ loading() ? 'Yenileniyor…' : 'Yenile' }}</button>
      </header>

      <section class="integrations">
        <article [class.ready]="configured('GOOGLE_ADS')">
          <strong>Google Performance Max</strong>
          <span>{{ configured('GOOGLE_ADS') ? 'OAuth + developer token + reklam hesabı hazır' : 'Google Ads bağlantı bilgileri eksik' }}</span>
          <small>Search, YouTube, Display, Discover, Gmail ve Maps envanterine uygun tek kampanya. Google dağılımı performansa göre optimize eder.</small>
        </article>
        <article [class.ready]="configured('META_ADS')">
          <strong>Meta Otomatik Yerleşimler</strong>
          <span>{{ configured('META_ADS') ? 'Meta reklam hesabı bağlantısı hazır' : 'Access token / reklam hesabı / Page eksik' }}</span>
          <small>Facebook ve Instagram dahil uygun Meta yerleşimleri kısıtlanmaz. Kampanya yine PAUSED oluşturulur.</small>
        </article>
      </section>

      <section class="notice">
        <strong>Yeni HTTPS domain bağlanmadan yayın yok:</strong>
        Taslak hazırlayabilirsiniz. Gerçek kampanya oluştururken Hedef URL yeni resmi domain üzerinde olmalıdır. Eski deneme domaini kullanılmaz.
      </section>

      <div class="layout">
        <section class="card">
          <header>
            <h2>Yeni Reklam Taslağı</h2>
            <p>İçeriği seçin, kreatifi hazırlayın, bütçeyi belirleyin. Yayınlama ayrı ve kontrollü bir işlemdir.</p>
          </header>
          <div class="form">
            <label>
              <span>Platform</span>
              <select [(ngModel)]="form.provider" name="provider">
                <option value="GOOGLE_ADS">Google Performance Max</option>
                <option value="META_ADS">Meta - Facebook / Instagram</option>
              </select>
            </label>
            <label>
              <span>Reklam Konusu</span>
              <select [(ngModel)]="form.targetType" name="targetType" (ngModelChange)="targetChanged()">
                <option value="VEHICLE">Araç</option>
                <option value="TOUR">Tur</option>
                <option value="SITE">Genel Site / Marka</option>
              </select>
            </label>

            @if (form.targetType !== 'SITE') {
              <label class="wide">
                <span>İçerik</span>
                <select [(ngModel)]="form.targetId" name="targetId" (ngModelChange)="targetSelected()">
                  <option value="">Seçin</option>
                  @for (item of targetOptions(); track item.id) {
                    <option [value]="item.id">{{ item.label }}</option>
                  }
                </select>
                @if (selectedPath()) { <small>Site yolu: {{ selectedPath() }}</small> }
              </label>
            }

            <label class="wide"><span>Kampanya Adı</span><input [(ngModel)]="form.name" name="name" maxlength="180" /></label>
            <label><span>Günlük Bütçe</span><input [(ngModel)]="form.dailyBudget" name="dailyBudget" type="number" min="1" step="1" /></label>
            <label><span>Para Birimi</span><select [(ngModel)]="form.currency" name="currency"><option value="TRY">TRY</option><option value="EUR">EUR</option><option value="USD">USD</option></select></label>
            <label class="wide"><span>Hedef URL - tam HTTPS adresi</span><input [(ngModel)]="form.landingUrl" name="landingUrl" inputmode="url" placeholder="https://yeni-domaininiz.com/fleet/..." /></label>

            @if (form.provider === 'GOOGLE_ADS') {
              <div class="subhead wide"><strong>Google Performance Max kreatifi</strong><small>Google’ın zorunlu minimum seti. Görseller gerçek içerikten hazırlanmalı ve belirtilen oranları karşılamalıdır.</small></div>
              <label class="wide"><span>Kısa Başlık 1 - en fazla 30</span><input [(ngModel)]="form.headline" name="headline" maxlength="30" /></label>
              <label><span>Kısa Başlık 2 - en fazla 30</span><input [(ngModel)]="form.headline2" name="headline2" maxlength="30" /></label>
              <label><span>Kısa Başlık 3 - en fazla 30</span><input [(ngModel)]="form.headline3" name="headline3" maxlength="30" /></label>
              <label class="wide"><span>Uzun Başlık - en fazla 90</span><input [(ngModel)]="form.longHeadline" name="longHeadline" maxlength="90" /></label>
              <label class="wide"><span>Açıklama 1 - en fazla 90</span><textarea [(ngModel)]="form.description" name="description" rows="3" maxlength="90"></textarea></label>
              <label class="wide"><span>Açıklama 2 - en fazla 90</span><textarea [(ngModel)]="form.description2" name="description2" rows="3" maxlength="90"></textarea></label>
              <label class="wide"><span>Yatay Görsel URL - 1.91:1, en az 600x314</span><input [(ngModel)]="form.landscapeImageUrl" name="landscapeImageUrl" inputmode="url" placeholder="https://.../arac-yatay.jpg" /></label>
              <label class="wide"><span>Kare Görsel URL - 1:1, en az 300x300</span><input [(ngModel)]="form.squareImageUrl" name="squareImageUrl" inputmode="url" placeholder="https://.../arac-kare.jpg" /></label>
              <label class="wide"><span>Kare Logo URL - 1:1, en az 128x128</span><input [(ngModel)]="form.logoUrl" name="logoUrl" inputmode="url" placeholder="https://.../logo-kare.png" /></label>
              <label class="wide"><span>İşletme Adı - en fazla 25</span><input [(ngModel)]="form.businessName" name="businessName" maxlength="25" /></label>
            } @else {
              <div class="subhead wide"><strong>Meta reklam kreatifi</strong><small>Facebook ve Instagram için otomatik yerleşim uyumlu bağlantı reklamı hazırlanır.</small></div>
              <label class="wide"><span>Başlık</span><input [(ngModel)]="form.headline" name="metaHeadline" maxlength="255" /></label>
              <label class="wide"><span>Ana Reklam Metni</span><textarea [(ngModel)]="form.primaryText" name="primaryText" rows="4"></textarea></label>
              <label class="wide"><span>Kısa Açıklama</span><textarea [(ngModel)]="form.description" name="metaDescription" rows="3" maxlength="255"></textarea></label>
              <label class="wide"><span>Gerçek Reklam Görseli URL</span><input [(ngModel)]="form.imageUrl" name="imageUrl" inputmode="url" placeholder="https://.../arac.jpg" /></label>
            }

            <button type="button" class="primary wide" (click)="save()" [disabled]="working()">Taslağı Kaydet</button>
          </div>
        </section>

        <section class="card guide">
          <header><h2>Yayın ve Güvenlik Kuralları</h2></header>
          <ul>
            <li>Reklam hesap tokenları tarayıcıya veya kampanya metnine yazılmaz.</li>
            <li>Google Performance Max, uygun envanterde Search, YouTube, Display, Discover, Gmail ve Maps’e erişebilir. Her kanal için gösterim garantisi verilmez.</li>
            <li>Google PMax için 3 kısa başlık, 1 uzun başlık, 2 açıklama, yatay ve kare görsel ile logo minimum set olarak doğrulanır.</li>
            <li>Meta tarafında özel placement listesi gönderilmez. Böylece reklam hesabının uygun otomatik yerleşimleri kullanılabilir.</li>
            <li>Reklam vermek sosyal medya profilinde organik gönderi yayınlamakla aynı şey değildir. Bu merkez ücretli reklam kampanyalarını yönetir.</li>
            <li>Oluşturulan dış kampanyalar önce PAUSED kalır. Hesap, hedefleme, ödeme yöntemi ve dönüşüm takibi son kez kontrol edildikten sonra aktif edilir.</li>
            <li>Reklam giderleri muhasebede ADVERTISING kategorisinde izlenebilir.</li>
          </ul>
        </section>
      </div>

      <section class="card campaigns">
        <header><h2>Reklam Kampanyaları</h2><p>{{ campaigns().length }} kayıt</p></header>
        @if (campaigns().length === 0) {
          <p class="empty">Henüz reklam taslağı yok.</p>
        } @else {
          <div class="rows">
            @for (c of campaigns(); track c.id) {
              <article>
                <div>
                  <strong>{{ c.name }}</strong>
                  <span>{{ providerName(c.provider) }} · {{ c.target_type }} · {{ c.daily_budget || 0 }} {{ c.currency }}/gün</span>
                  @if (c.last_error) { <small>{{ errorText(c.last_error) }}</small> }
                </div>
                <div class="right">
                  <b>{{ c.status }}</b>
                  <button type="button" (click)="publish(c)" [disabled]="working() || !configured(c.provider) || c.status === 'PUBLISHING'">
                    {{ configured(c.provider) ? 'Sağlayıcıda PAUSED Oluştur' : 'Hesabı Bağla' }}
                  </button>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100vh;background:#f8fafc;padding:1rem;color:#0f172a}.head{max-width:1240px;margin:auto;display:flex;justify-content:space-between;gap:1rem;align-items:end}.head p{margin:0;color:#7c3aed;font-size:.62rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.head h1{margin:.2rem 0;font-size:1.55rem}.head span{display:block;max-width:760px;color:#64748b;font-size:.75rem;line-height:1.5}.head button,.primary{min-height:44px;border:0;border-radius:12px;background:#0f172a;color:#fff;padding:0 1rem;font-weight:900}.integrations,.notice,.layout,.card{max-width:1240px;margin:1rem auto 0}.integrations{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.integrations article{border:1px solid #fecaca;border-radius:16px;background:#fff1f2;padding:.85rem;color:#9f1239}.integrations article.ready{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}.integrations strong,.integrations span,.integrations small{display:block}.integrations span{margin-top:.25rem;font-size:.7rem}.integrations small{margin-top:.3rem;opacity:.8;font-size:.63rem;line-height:1.45}.notice{border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff;padding:.85rem;color:#1e3a8a;font-size:.72rem;line-height:1.5}.layout{display:grid;gap:1rem}.card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;overflow:hidden}.card>header{border-bottom:1px solid #e2e8f0;padding:1rem}.card h2{margin:0;font-size:1rem}.card header p{margin:.2rem 0 0;color:#64748b;font-size:.68rem}.form{display:grid;gap:.7rem;padding:1rem}.form label{display:grid;gap:.3rem;min-width:0}.form span{font-size:.6rem;font-weight:900;text-transform:uppercase;color:#475569}.form small{color:#64748b;font-size:.63rem;overflow-wrap:anywhere}.form input,.form select,.form textarea{width:100%;min-width:0;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:.6rem;font:inherit;font-size:.76rem;box-sizing:border-box}.wide{grid-column:1/-1}.subhead{border-top:1px solid #e2e8f0;margin-top:.25rem;padding-top:.8rem;display:grid;gap:.2rem}.subhead strong{font-size:.78rem}.subhead small{font-size:.65rem;line-height:1.45}.guide ul{margin:0;padding:1rem 1rem 1rem 2rem;color:#475569;font-size:.72rem;line-height:1.65}.rows article{display:flex;justify-content:space-between;align-items:center;gap:1rem;border-top:1px solid #f1f5f9;padding:.85rem 1rem}.rows article:first-child{border-top:0}.rows strong,.rows span,.rows small{display:block}.rows span{margin-top:.2rem;color:#64748b;font-size:.65rem}.rows small{margin-top:.2rem;color:#b91c1c;font-size:.6rem}.right{text-align:right}.right b{display:block;color:#7c3aed;font-size:.62rem}.right button{min-height:38px;margin-top:.4rem;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 .7rem;font-size:.62rem;font-weight:900}.right button:disabled{opacity:.45}.empty{padding:1.5rem;text-align:center;color:#64748b}@media(min-width:800px){.page{padding:1.5rem}.layout{grid-template-columns:1.25fr .75fr}.form{grid-template-columns:1fr 1fr}}@media(max-width:650px){.head{flex-direction:column;align-items:stretch}.integrations{grid-template-columns:1fr}.rows article{align-items:flex-start;flex-direction:column}.right{text-align:left}.page{padding:.75rem}.card{border-radius:14px}}
  `],
})
export class AdminMarketingComponent implements OnInit {
  private readonly marketing = inject(MarketingService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly campaigns = this.marketing.campaigns;
  readonly loading = this.marketing.loading;
  readonly working = signal(false);
  readonly rentals = this.cars.getCars();
  readonly sales = this.cars.getSaleCars();
  readonly tours = this.cars.getTours();

  form = {
    provider: 'META_ADS', targetType: 'VEHICLE', targetId: '', name: '', dailyBudget: 300, currency: 'TRY',
    landingUrl: '', headline: '', headline2: 'Yüksekova’da Hızlı Rezervasyon', headline3: 'Alperler Rent A Car',
    longHeadline: '', primaryText: '', description: '', description2: 'Talebinizi güvenli şekilde gönderin, ayrıntıları ekibimizle netleştirin.',
    imageUrl: '', landscapeImageUrl: '', squareImageUrl: '', logoUrl: '', businessName: 'Alperler Rent A Car',
  };

  readonly targetOptions = computed(() => {
    if (this.form.targetType === 'TOUR') {
      return this.tours().map((x: any) => ({
        id: String(x.cloudId || x.id),
        label: x.title || x.name || String(x.id),
        path: `/tour/${x.cloudId || x.id}`,
        image: x.image || x.images?.[0] || x.gallery?.[0] || '',
      }));
    }
    if (this.form.targetType === 'VEHICLE') {
      return [...this.rentals(), ...this.sales()].map((x: any) => ({
        id: String(x.cloudId || x.id),
        label: `${x.brand || ''} ${x.model || ''} ${x.modelYear || x.year || ''}`.trim(),
        path: `/${x.category === 'SALE' ? 'sales' : 'fleet'}/${x.cloudId || x.id}`,
        image: x.image || x.images?.[0] || x.gallery?.[0] || '',
      }));
    }
    return [];
  });

  readonly selectedPath = computed(() => this.targetOptions().find((x) => x.id === this.form.targetId)?.path || '');

  async ngOnInit() {
    await Promise.allSettled([this.cars.refreshCloudCatalog(true), this.refresh()]);
  }

  configured(provider: string) { return this.marketing.configured(provider); }
  providerName(provider: string) { return provider === 'GOOGLE_ADS' ? 'Google Performance Max' : provider === 'META_ADS' ? 'Meta Ads' : provider; }

  async refresh() {
    try { await this.marketing.refresh(); }
    catch (error) { this.toast.show(this.msg(error), 'error'); }
  }

  targetChanged() { this.form.targetId = ''; }

  targetSelected() {
    const item = this.targetOptions().find((x) => x.id === this.form.targetId);
    if (!item) return;
    if (!this.form.name) this.form.name = `Alperler ${item.label}`;
    this.form.headline = item.label.slice(0, 30);
    if (!this.form.longHeadline) this.form.longHeadline = `${item.label} için Alperler Rent A Car ile talebinizi oluşturun.`.slice(0, 90);
    if (!this.form.primaryText) this.form.primaryText = `${item.label} için detayları inceleyin ve talebinizi Alperler Rent A Car’a iletin.`;
    if (!this.form.description) this.form.description = 'Yüksekova’da net süreç, gerçek ilan bilgisi ve yerel ekip desteği.';
    if (!this.form.imageUrl && item.image) this.form.imageUrl = item.image;
  }

  async save() {
    if (!this.form.name.trim() || Number(this.form.dailyBudget) <= 0) {
      this.toast.show('Kampanya adı ve günlük bütçe gereklidir.', 'error'); return;
    }
    if (this.form.targetType !== 'SITE' && !this.form.targetId) {
      this.toast.show('Reklam verilecek araç veya turu seçin.', 'error'); return;
    }
    this.working.set(true);
    try {
      await this.marketing.saveCampaign({
        provider: this.form.provider,
        targetType: this.form.targetType,
        targetId: this.form.targetType === 'SITE' ? undefined : this.form.targetId,
        name: this.form.name.trim(),
        objective: 'TRAFFIC',
        dailyBudget: Number(this.form.dailyBudget),
        currency: this.form.currency,
        audience: { country: 'TR' },
        creative: {
          landingUrl: this.form.landingUrl.trim(),
          headline: this.form.headline.trim(),
          headline2: this.form.headline2.trim(),
          headline3: this.form.headline3.trim(),
          longHeadline: this.form.longHeadline.trim(),
          primaryText: this.form.primaryText.trim(),
          description: this.form.description.trim(),
          description2: this.form.description2.trim(),
          imageUrl: this.form.imageUrl.trim(),
          landscapeImageUrl: this.form.landscapeImageUrl.trim(),
          squareImageUrl: this.form.squareImageUrl.trim(),
          logoUrl: this.form.logoUrl.trim(),
          businessName: this.form.businessName.trim(),
        },
      });
      await this.refresh();
      this.toast.show('Reklam taslağı kaydedildi. Henüz para harcanmadı.', 'success');
    } catch (error) {
      this.toast.show(this.msg(error), 'error');
    } finally { this.working.set(false); }
  }

  async publish(campaign: any) {
    const channelText = campaign.provider === 'GOOGLE_ADS'
      ? 'Google Performance Max kampanyası uygun Google kanalları için'
      : 'Meta kampanyası otomatik yerleşimler için';
    if (!confirm(`${channelText} PAUSED olarak oluşturulsun mu? Bu işlem reklamı aktif etmez ve harcama başlatmaz.`)) return;
    this.working.set(true);
    try {
      await this.marketing.publish(campaign.id);
      await this.refresh();
      this.toast.show('Kampanya sağlayıcıda PAUSED olarak oluşturuldu. Son kontrolden sonra reklam hesabında aktif edilebilir.', 'success');
    } catch (error) {
      this.toast.show(this.msg(error), 'error');
    } finally { this.working.set(false); }
  }

  errorText(code: unknown) { return this.msg(new Error(String(code || ''))); }

  private msg(error: unknown) {
    const code = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
    return ({
      GOOGLE_ADS_NOT_CONFIGURED: 'Google Ads OAuth, developer token veya müşteri hesabı henüz bağlı değil.',
      META_ADS_NOT_CONFIGURED: 'Meta Marketing API tokenı, reklam hesabı, Page veya Graph API sürümü henüz bağlı değil.',
      GOOGLE_CREATIVE_INCOMPLETE: 'Google reklamı için yeni domain üzerindeki tam HTTPS hedef URL gereklidir.',
      GOOGLE_PMAX_ASSETS_INCOMPLETE: 'Performance Max için 3 kısa başlık, 1 uzun başlık, 2 açıklama ve işletme adı eksiksiz olmalıdır.',
      GOOGLE_LANDSCAPE_IMAGE_INVALID: 'Google yatay görseli erişilebilir JPG/PNG/GIF olmalı, 1.91:1 oranında ve en fazla 5 MB olmalıdır.',
      GOOGLE_SQUARE_IMAGE_INVALID: 'Google kare görseli erişilebilir JPG/PNG/GIF olmalı, 1:1 oranında ve en fazla 5 MB olmalıdır.',
      GOOGLE_LOGO_INVALID: 'Google logosu erişilebilir kare JPG/PNG/GIF olmalı ve en fazla 5 MB olmalıdır.',
      META_CREATIVE_INCOMPLETE: 'Meta reklamı için yeni domain üzerindeki hedef URL, başlık ve ana metin gereklidir.',
      META_IMAGE_INVALID: 'Meta reklam görseli geçerli ve herkese açık bir HTTPS adresi olmalıdır.',
      GOOGLE_ADS_PUBLISH_FAILED: 'Google Ads kampanyası oluşturulamadı. Reklam hesabı, ödeme, dönüşüm hedefi ve kreatif kurallarını kontrol edin.',
      META_ADS_PUBLISH_FAILED: 'Meta kampanyası oluşturulamadı. Reklam hesabı, Page, ödeme ve kreatif kurallarını kontrol edin.',
    } as Record<string, string>)[code] || code;
  }
}
