import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CarService } from '../../services/car.service';
import { CatalogService } from '../../services/catalog.service';
import { FooterSettings, FooterSettingsService } from '../../services/footer-settings.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page">
      <div class="shell">
        <header class="hero">
          <p>Alt bilgi yönetimi</p>
          <h1>Footer, Sosyal Medya ve Bülten</h1>
          <span>Sitenin en alt bölümünde görünecek metinleri, sosyal medya hesaplarını ve bülten alanını buradan yönetin.</span>
        </header>

        <form (submit)="save($event)" class="stack" novalidate>
          <section class="panel" aria-labelledby="footer-visibility-title">
            <div class="heading"><div><h2 id="footer-visibility-title">Görünürlük</h2><p>Footer'da hangi alanların gösterileceğini seçin. Bir alanı kapatmanız kayıtlı bilgiyi silmez.</p></div></div>
            <div class="toggles">
              <label><input type="checkbox" [(ngModel)]="form.isEnabled" name="footerEnabled" aria-label="Footer bölümünü aç veya kapat" /><span>Footer açık</span></label>
              <label><input type="checkbox" [(ngModel)]="form.showPhone" name="showPhone" aria-label="Footer telefon bağlantısını göster veya gizle" /><span>Telefon</span></label>
              <label><input type="checkbox" [(ngModel)]="form.showWhatsapp" name="showWhatsapp" aria-label="Footer WhatsApp bağlantısını göster veya gizle" /><span>WhatsApp</span></label>
              <label><input type="checkbox" [(ngModel)]="form.showSocial" name="showSocial" aria-label="Footer sosyal medya ikonlarını göster veya gizle" /><span>Sosyal medya</span></label>
              <label><input type="checkbox" [(ngModel)]="form.newsletterEnabled" name="newsletterEnabled" aria-label="Footer bülten abonelik alanını göster veya gizle" /><span>Bülten</span></label>
              <label><input type="checkbox" [(ngModel)]="form.showFeedback" name="showFeedback" aria-label="Footer geri bildirim bağlantısını göster veya gizle" /><span>Geri bildirim</span></label>
              <label><input type="checkbox" [(ngModel)]="form.showLegalLinks" name="showLegalLinks" aria-label="Footer yasal bağlantıları göster veya gizle" /><span>Yasal bağlantılar</span></label>
            </div>
          </section>

          <section class="panel" aria-labelledby="footer-content-title">
            <div class="heading"><div><h2 id="footer-content-title">Footer metinleri</h2><p>Bu başlık ve açıklamalar müşterilerin sitenin alt bölümünde gördüğü kurumsal metinlerdir.</p></div></div>
            <div class="grid two">
              <label><span>Marka açıklaması</span><textarea [(ngModel)]="form.brandSummary" name="brandSummary" rows="4" maxlength="700" aria-label="Footer marka açıklaması"></textarea></label>
              <div class="grid">
                <label><span>Hizmetler başlığı</span><input [(ngModel)]="form.servicesTitle" name="servicesTitle" maxlength="80" aria-label="Footer hizmetler başlığı" /></label>
                <label><span>Kurumsal başlığı</span><input [(ngModel)]="form.corporateTitle" name="corporateTitle" maxlength="80" aria-label="Footer kurumsal başlığı" /></label>
                <label><span>Yasal başlığı</span><input [(ngModel)]="form.legalTitle" name="legalTitle" maxlength="80" aria-label="Footer yasal başlığı" /></label>
              </div>
            </div>
          </section>

          <section class="panel" aria-labelledby="social-title">
            <div class="heading"><div><h2 id="social-title">Sosyal medya hesapları</h2><p>Footer'daki sosyal medya ikonlarının hangi hesaba gideceğini belirleyin. Boş bıraktığınız hesap gösterilmez.</p></div></div>
            <div class="grid two">
              <label><span>Instagram URL</span><input [(ngModel)]="instagramUrl" name="instagramUrl" inputmode="url" placeholder="https://instagram.com/..." aria-label="Instagram profil URL adresi" /></label>
              <label><span>TikTok URL</span><input [(ngModel)]="tiktokUrl" name="tiktokUrl" inputmode="url" placeholder="https://tiktok.com/@..." aria-label="TikTok profil URL adresi" /></label>
              <label><span>YouTube URL</span><input [(ngModel)]="youtubeUrl" name="youtubeUrl" inputmode="url" placeholder="https://youtube.com/@..." aria-label="YouTube kanal URL adresi" /></label>
              <label><span>X URL</span><input [(ngModel)]="xUrl" name="xUrl" inputmode="url" placeholder="https://x.com/..." aria-label="X profil URL adresi" /></label>
              <label><span>Facebook URL</span><input [(ngModel)]="facebookUrl" name="facebookUrl" inputmode="url" placeholder="https://facebook.com/..." aria-label="Facebook profil URL adresi" /></label>
            </div>
          </section>

          <section class="panel" aria-labelledby="newsletter-title-admin">
            <div class="heading"><div><h2 id="newsletter-title-admin">Ücretsiz bülten</h2><p>Müşterilerin bültene katılırken gördüğü başlığı, açıklamayı ve buton yazısını buradan düzenleyin.</p></div></div>
            <div class="grid two">
              <label><span>Bülten başlığı</span><input [(ngModel)]="form.newsletterTitle" name="newsletterTitle" maxlength="180" aria-label="Footer bülten başlığı" /></label>
              <label><span>Buton yazısı</span><input [(ngModel)]="form.newsletterButtonText" name="newsletterButtonText" maxlength="80" aria-label="Footer bülten abonelik butonu yazısı" /></label>
              <label class="wide"><span>Bülten açıklaması</span><textarea [(ngModel)]="form.newsletterDescription" name="newsletterDescription" rows="3" maxlength="500" aria-label="Footer bülten açıklaması"></textarea></label>
            </div>
          </section>

          <section class="panel" aria-labelledby="legal-status-title">
            <div class="heading"><div><h2 id="legal-status-title">Yasal metin durumu</h2><p>Footer'da bağlantısı gösterilecek yasal metinlerin hazır olup olmadığını buradan kontrol edin.</p></div><a routerLink="/admin/legal" aria-label="Yasal Metin Merkezi sayfasını aç">Yasal metinleri düzenle</a></div>
            <div class="legal-grid">
              @for (doc of legalStatus(); track doc.label) {
                <div [class.ok]="doc.ready" class="legal-row"><strong>{{ doc.label }}</strong><span>{{ doc.ready ? 'Hazır' : 'Eksik' }}</span></div>
              }
            </div>
          </section>

          <div class="savebar">
            <button type="submit" [disabled]="saving" aria-label="Footer ve sosyal medya ayarlarını kaydet ve yayınla">{{ saving ? 'Kaydediliyor…' : 'Kaydet ve Uygula' }}</button>
          </div>
        </form>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100%;background:#f5f7fb;padding:1rem;color:#0f172a}.shell{width:min(100%,1040px);margin:auto}.hero{border-radius:22px;background:linear-gradient(135deg,#07101f,#0d1b34);padding:1.3rem;color:#fff}.hero p{margin:0;color:#60a5fa;font-size:.64rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.hero h1{margin:.3rem 0 0;font-size:1.55rem}.hero span{display:block;margin-top:.45rem;color:#aab7ca;font-size:.75rem;line-height:1.5}.stack{display:grid;gap:1rem;margin-top:1rem}.panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}.heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem}.heading h2{margin:0;font-size:1rem}.heading p{margin:.25rem 0 0;color:#64748b;font-size:.69rem;line-height:1.5}.heading a{flex:none;border-radius:10px;background:#0f172a;padding:.65rem .75rem;color:#fff;font-size:.64rem;font-weight:900;text-decoration:none}.toggles{display:flex;flex-wrap:wrap;gap:.5rem;padding:1rem}.toggles label{display:flex;min-height:44px;align-items:center;gap:.45rem;border-radius:12px;background:#f1f5f9;padding:0 .8rem;font-size:.7rem;font-weight:900}.grid{display:grid;gap:.75rem;padding:1rem}.grid.two{grid-template-columns:1fr}.grid.two>.grid{padding:0}.grid label{display:grid;gap:.35rem}.grid label>span{color:#475569;font-size:.62rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.grid input,.grid textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:.72rem;color:#0f172a;font:inherit;font-size:.75rem;outline:none}.grid input{min-height:46px}.grid input:focus,.grid textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}.legal-grid{display:grid;gap:.45rem;padding:1rem}.legal-row{display:flex;min-height:44px;align-items:center;justify-content:space-between;gap:.7rem;border-radius:11px;background:#fff1f2;padding:0 .8rem;color:#9f1239;font-size:.69rem}.legal-row.ok{background:#f0fdf4;color:#166534}.legal-row span{font-weight:950}.savebar{position:sticky;bottom:.7rem;display:flex;justify-content:flex-end;border:1px solid #dbeafe;border-radius:16px;background:rgba(255,255,255,.94);padding:.7rem;box-shadow:0 12px 28px rgba(15,23,42,.1);backdrop-filter:blur(10px)}.savebar button{min-height:48px;border:0;border-radius:12px;background:#2563eb;padding:0 1.2rem;color:#fff;font-weight:950}.savebar button:disabled{opacity:.55}.savebar button:focus-visible,.heading a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:760px){.grid.two{grid-template-columns:1fr 1fr}.grid.two .wide{grid-column:1/-1}.legal-grid{grid-template-columns:1fr 1fr}}
  `],
})
export class AdminFooterComponent implements OnInit {
  private readonly footer = inject(FooterSettingsService);
  private readonly carService = inject(CarService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  form: FooterSettings = { ...this.footer.settings() };
  instagramUrl = '';
  tiktokUrl = '';
  youtubeUrl = '';
  xUrl = '';
  facebookUrl = '';
  saving = false;

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.footer.refreshAdmin(), this.carService.refreshCloudCatalog(true)]);
      this.form = { ...this.footer.settings() };
      const cfg = this.carService.getConfig()();
      this.instagramUrl = cfg.instagramUrl || '';
      this.tiktokUrl = cfg.tiktokUrl || '';
      this.youtubeUrl = cfg.youtubeUrl || '';
      this.xUrl = cfg.twitterUrl || '';
      this.facebookUrl = cfg.facebookUrl || '';
    } catch (error) {
      this.toast.show(this.message(error), 'error');
    }
  }

  legalStatus(): { label: string; ready: boolean }[] {
    const cfg = this.carService.getConfig()();
    const documents: Array<[string, string | undefined]> = [
      ['Araç Kiralama Koşulları', cfg.rentalTermsText],
      ['Satış ve İlan Koşulları', cfg.salesTermsText],
      ['Tur ve Transfer Koşulları', cfg.tourTermsText],
      ['Aracını Değerlendir Koşulları', cfg.partnerTermsText],
      ['Şube ve Bayilik Koşulları', cfg.branchTermsText],
      ['Bülten ve Ticari İleti', cfg.commercialCommunicationText],
      ['Genel Kullanım Şartları', cfg.termsText],
      ['KVKK Aydınlatma Metni', cfg.kvkkText],
      ['Gizlilik Politikası', cfg.privacyText],
      ['Çerez Politikası', cfg.cookiesText],
      ['Mesafeli İşlem', cfg.distanceSellingText],
      ['İade ve İptal', cfg.cancellationText],
      ['Sigorta ve Sorumluluk', cfg.insuranceText],
    ];
    return documents.map(([label, value]) => ({ label, ready: String(value || '').trim().length > 20 }));
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving) return;
    try {
      const socials = [this.instagramUrl, this.tiktokUrl, this.youtubeUrl, this.xUrl, this.facebookUrl];
      if (socials.some((url) => !this.validExternalUrl(url))) throw new Error('Sosyal medya bağlantısı boş bırakılmalı veya https:// ile başlayan geçerli bir adres olmalıdır.');
      this.saving = true;
      await this.footer.save(this.form);
      const current = this.carService.getConfig()();
      await this.catalog.saveConfig({
        ...current,
        instagramUrl: this.instagramUrl.trim(),
        tiktokUrl: this.tiktokUrl.trim(),
        youtubeUrl: this.youtubeUrl.trim(),
        twitterUrl: this.xUrl.trim(),
        facebookUrl: this.facebookUrl.trim(),
      });
      await this.carService.refreshCloudCatalog(true);
      this.form = { ...this.footer.settings() };
      this.toast.show('Footer ve sosyal medya ayarları kaydedildi ve siteye uygulandı.', 'success');
    } catch (error) {
      this.toast.show(this.message(error), 'error');
    } finally {
      this.saving = false;
    }
  }

  private validExternalUrl(value: string): boolean {
    const raw = String(value || '').trim();
    if (!raw) return true;
    try { return new URL(raw).protocol === 'https:'; } catch { return false; }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
  }
}
