import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HomepageAdminService, HomepageSectionRecord } from '../../services/homepage-admin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-homepage-block-copy-v1742',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="studio" aria-labelledby="block-copy-v1742-title">
      <header class="studio-head">
        <div>
          <p>V174.2 Dinamik Vitrin Metinleri</p>
          <h2 id="block-copy-v1742-title">Kart, CTA ve Durum Yazıları</h2>
          <span>Kampanya, tur, şube, blog ve özel vitrinlerde müşterinin gördüğü mikro metinleri veritabanından yönetin. Kaydetme işlemleri V174 service-role gateway üzerinden audit kontrollü yapılır.</span>
        </div>
        <button type="button" class="refresh" (click)="reload()" [disabled]="loading()">{{ loading() ? 'Yükleniyor…' : 'Metinleri Yenile' }}</button>
      </header>

      @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }

      <div class="section-list">
        @for (section of editableSections(); track section.sectionKey) {
          <article class="section-card">
            <div class="section-title">
              <div><strong>{{ section.title }}</strong><small>{{ section.sectionKey }} · {{ rendererLabel(section) }}</small></div>
              <button type="button" class="save" (click)="save(section)" [disabled]="savingKey() === section.sectionKey">{{ savingKey() === section.sectionKey ? 'Kaydediliyor…' : 'Bu Bloğu Kaydet' }}</button>
            </div>

            @if (section.sectionType === 'CAMPAIGN') {
              <div class="grid">
                <label class="wide toggle"><input type="checkbox" [ngModel]="bool(section,'showDiscount',true)" (ngModelChange)="setBool(section,'showDiscount',$event)" [name]="section.sectionKey+'-showDiscount'" /><span>Kampanya kartlarında indirim bilgisini göster</span></label>
                <label class="wide toggle"><input type="checkbox" [ngModel]="bool(section,'showCountdown',true)" (ngModelChange)="setBool(section,'showCountdown',$event)" [name]="section.sectionKey+'-showCountdown'" /><span>Kampanya kartlarında süre sayacını göster</span></label>
                <label><span>Kart üst etiketi</span><input [ngModel]="text(section,'campaignLabel')" (ngModelChange)="setText(section,'campaignLabel',$event)" [name]="section.sectionKey+'-campaignLabel'" maxlength="80" /></label>
                <label><span>İndirim son eki</span><input [ngModel]="text(section,'campaignDiscountSuffix')" (ngModelChange)="setText(section,'campaignDiscountSuffix',$event)" [name]="section.sectionKey+'-campaignDiscountSuffix'" maxlength="50" /></label>
                <label class="wide"><span>İçerik açıklaması yoksa gösterilecek metin</span><textarea [ngModel]="text(section,'campaignFallbackDescription')" (ngModelChange)="setText(section,'campaignFallbackDescription',$event)" [name]="section.sectionKey+'-campaignFallbackDescription'" rows="3" maxlength="300"></textarea></label>
                <label><span>Kart CTA metni</span><input [ngModel]="text(section,'campaignCtaLabel')" (ngModelChange)="setText(section,'campaignCtaLabel',$event)" [name]="section.sectionKey+'-campaignCtaLabel'" maxlength="100" /></label>
                <label><span>Kazanç son eki</span><input [ngModel]="text(section,'campaignSavingSuffix')" (ngModelChange)="setText(section,'campaignSavingSuffix',$event)" [name]="section.sectionKey+'-campaignSavingSuffix'" maxlength="50" /></label>
                <label><span>Avantaj son eki</span><input [ngModel]="text(section,'campaignAdvantageSuffix')" (ngModelChange)="setText(section,'campaignAdvantageSuffix',$event)" [name]="section.sectionKey+'-campaignAdvantageSuffix'" maxlength="50" /></label>
                <label><span>Sınırlı fırsat metni</span><input [ngModel]="text(section,'campaignLimitedLabel')" (ngModelChange)="setText(section,'campaignLimitedLabel',$event)" [name]="section.sectionKey+'-campaignLimitedLabel'" maxlength="100" /></label>
                <label><span>Süresi doldu metni</span><input [ngModel]="text(section,'campaignExpiredLabel')" (ngModelChange)="setText(section,'campaignExpiredLabel',$event)" [name]="section.sectionKey+'-campaignExpiredLabel'" maxlength="80" /></label>
                <label><span>Gün kaldı son eki</span><input [ngModel]="text(section,'campaignDaysRemainingSuffix')" (ngModelChange)="setText(section,'campaignDaysRemainingSuffix',$event)" [name]="section.sectionKey+'-campaignDaysRemainingSuffix'" maxlength="80" /></label>
                <label><span>1 gün kaldı metni</span><input [ngModel]="text(section,'campaignOneDayRemainingLabel')" (ngModelChange)="setText(section,'campaignOneDayRemainingLabel',$event)" [name]="section.sectionKey+'-campaignOneDayRemainingLabel'" maxlength="80" /></label>
                <label><span>Saat kaldı son eki</span><input [ngModel]="text(section,'campaignHoursRemainingSuffix')" (ngModelChange)="setText(section,'campaignHoursRemainingSuffix',$event)" [name]="section.sectionKey+'-campaignHoursRemainingSuffix'" maxlength="80" /></label>
                <label><span>15 dakika ilgi son eki</span><input [ngModel]="text(section,'campaignProofActiveSuffix')" (ngModelChange)="setText(section,'campaignProofActiveSuffix',$event)" [name]="section.sectionKey+'-campaignProofActiveSuffix'" maxlength="120" /></label>
                <label><span>24 saat ilgi son eki</span><input [ngModel]="text(section,'campaignProofRecentSuffix')" (ngModelChange)="setText(section,'campaignProofRecentSuffix',$event)" [name]="section.sectionKey+'-campaignProofRecentSuffix'" maxlength="120" /></label>
                <label><span>Toplam kişi son eki</span><input [ngModel]="text(section,'campaignProofUniqueSuffix')" (ngModelChange)="setText(section,'campaignProofUniqueSuffix',$event)" [name]="section.sectionKey+'-campaignProofUniqueSuffix'" maxlength="100" /></label>
                <label><span>Görüntülenme son eki</span><input [ngModel]="text(section,'campaignViewsSuffix')" (ngModelChange)="setText(section,'campaignViewsSuffix',$event)" [name]="section.sectionKey+'-campaignViewsSuffix'" maxlength="80" /></label>
                <label><span>Yeni kampanya metni</span><input [ngModel]="text(section,'campaignNewLabel')" (ngModelChange)="setText(section,'campaignNewLabel',$event)" [name]="section.sectionKey+'-campaignNewLabel'" maxlength="100" /></label>
              </div>
            }

            @if (section.sectionType === 'TOURS') {
              <div class="grid">
                <label class="wide"><span>Tur açıklaması yoksa gösterilecek metin</span><textarea [ngModel]="text(section,'tourFallbackDescription')" (ngModelChange)="setText(section,'tourFallbackDescription',$event)" [name]="section.sectionKey+'-tourFallbackDescription'" rows="3" maxlength="300"></textarea></label>
                <label><span>Tur kart CTA metni</span><input [ngModel]="text(section,'tourCardCtaLabel')" (ngModelChange)="setText(section,'tourCardCtaLabel',$event)" [name]="section.sectionKey+'-tourCardCtaLabel'" maxlength="100" /></label>
              </div>
            }

            @if (renderer(section) === 'BRANCHES') {
              <div class="grid">
                <label><span>Franchise etiketi</span><input [ngModel]="text(section,'branchFranchiseLabel')" (ngModelChange)="setText(section,'branchFranchiseLabel',$event)" [name]="section.sectionKey+'-branchFranchiseLabel'" maxlength="100" /></label>
                <label><span>Standart nokta etiketi</span><input [ngModel]="text(section,'branchLocationLabel')" (ngModelChange)="setText(section,'branchLocationLabel',$event)" [name]="section.sectionKey+'-branchLocationLabel'" maxlength="100" /></label>
                <label class="wide"><span>Şube açıklaması yoksa konumdan sonra eklenecek metin</span><input [ngModel]="text(section,'branchFallbackDescriptionSuffix')" (ngModelChange)="setText(section,'branchFallbackDescriptionSuffix',$event)" [name]="section.sectionKey+'-branchFallbackDescriptionSuffix'" maxlength="220" /></label>
                <label><span>Teslim alma etiketi</span><input [ngModel]="text(section,'branchPickupLabel')" (ngModelChange)="setText(section,'branchPickupLabel',$event)" [name]="section.sectionKey+'-branchPickupLabel'" maxlength="80" /></label>
                <label><span>İade etiketi</span><input [ngModel]="text(section,'branchReturnLabel')" (ngModelChange)="setText(section,'branchReturnLabel',$event)" [name]="section.sectionKey+'-branchReturnLabel'" maxlength="80" /></label>
                <label><span>Şube kart CTA metni</span><input [ngModel]="text(section,'branchCardCtaLabel')" (ngModelChange)="setText(section,'branchCardCtaLabel',$event)" [name]="section.sectionKey+'-branchCardCtaLabel'" maxlength="100" /></label>
                <label class="wide toggle"><input type="checkbox" [ngModel]="bool(section,'showPartnerCta',true)" (ngModelChange)="setBool(section,'showPartnerCta',$event)" [name]="section.sectionKey+'-showPartnerCta'" /><span>Bayilik CTA alanını göster</span></label>
                <label class="wide"><span>Bayilik CTA başlığı</span><input [ngModel]="text(section,'partnerCtaTitle')" (ngModelChange)="setText(section,'partnerCtaTitle',$event)" [name]="section.sectionKey+'-partnerCtaTitle'" maxlength="220" /></label>
                <label><span>Bayilik CTA butonu</span><input [ngModel]="text(section,'partnerCtaLabel')" (ngModelChange)="setText(section,'partnerCtaLabel',$event)" [name]="section.sectionKey+'-partnerCtaLabel'" maxlength="100" /></label>
                <label><span>Bayilik CTA rotası</span><input [ngModel]="text(section,'partnerRoute')" (ngModelChange)="setText(section,'partnerRoute',$event)" [name]="section.sectionKey+'-partnerRoute'" maxlength="300" placeholder="/branch-partner" /></label>
              </div>
            }

            @if (section.sectionType === 'BLOG') {
              <div class="grid">
                <label><span>Blog kart CTA metni</span><input [ngModel]="text(section,'blogCardCtaLabel')" (ngModelChange)="setText(section,'blogCardCtaLabel',$event)" [name]="section.sectionKey+'-blogCardCtaLabel'" maxlength="100" /></label>
              </div>
            }

            @if (renderer(section) === 'PROMO') {
              <div class="grid">
                <label><span>Varsayılan üst etiket</span><input [ngModel]="text(section,'promoFallbackBadge')" (ngModelChange)="setText(section,'promoFallbackBadge',$event)" [name]="section.sectionKey+'-promoFallbackBadge'" maxlength="100" /></label>
                <label class="wide"><span>Varsayılan açıklama</span><textarea [ngModel]="text(section,'promoFallbackDescription')" (ngModelChange)="setText(section,'promoFallbackDescription',$event)" [name]="section.sectionKey+'-promoFallbackDescription'" rows="3" maxlength="300"></textarea></label>
              </div>
            }
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.studio{width:min(100% - 2rem,1180px);margin:1rem auto;border:1px solid #dbe4ef;border-radius:20px;background:#f8fafc;padding:1rem;color:#0f172a}.studio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.studio-head p{margin:0;color:#2563eb;font-size:.62rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.studio-head h2{margin:.2rem 0 0;font-size:1.05rem;font-weight:950}.studio-head span{display:block;margin-top:.3rem;max-width:820px;color:#64748b;font-size:.7rem;line-height:1.5}.refresh,.save{min-height:44px;border:0;border-radius:12px;padding:0 .85rem;font-size:.68rem;font-weight:950;cursor:pointer}.refresh{flex:none;background:#0f172a;color:#fff}.save{background:#166534;color:#fff}.refresh:disabled,.save:disabled{opacity:.5;cursor:not-allowed}.section-list{display:grid;gap:.8rem;margin-top:1rem}.section-card{overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#fff}.section-title{display:flex;align-items:center;justify-content:space-between;gap:.8rem;border-bottom:1px solid #e2e8f0;padding:.8rem}.section-title strong,.section-title small{display:block}.section-title strong{font-size:.78rem}.section-title small{margin-top:.2rem;color:#64748b;font-size:.58rem}.grid{display:grid;gap:.65rem;padding:.8rem}.grid label{display:grid;gap:.3rem}.grid label>span{color:#475569;font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.grid input:not([type=checkbox]),.grid textarea{width:100%;min-height:43px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:.6rem .65rem;color:#0f172a;font:inherit;font-size:.72rem}.grid textarea{min-height:82px;resize:vertical}.toggle{display:flex!important;align-items:center;gap:.45rem;min-height:44px;border-radius:10px;background:#f1f5f9;padding:.55rem .7rem}.toggle span{font-size:.64rem!important;text-transform:none!important}.alert{margin-top:.8rem;border:1px solid #fecdd3;border-radius:12px;background:#fff1f2;padding:.7rem;color:#be123c;font-size:.7rem;font-weight:850}input:focus,textarea:focus,button:focus-visible{outline:3px solid rgba(37,99,235,.25);outline-offset:2px}@media(min-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.grid .wide{grid-column:1/-1}}@media(max-width:620px){.studio-head,.section-title{align-items:stretch;flex-direction:column}.refresh,.save{width:100%}}
  `],
})
export class AdminHomepageBlockCopyV1742Component implements OnInit {
  private readonly homepage = inject(HomepageAdminService);
  private readonly toast = inject(ToastService);
  readonly savingKey = signal('');
  readonly error = signal('');
  readonly loading = this.homepage.loading;
  readonly editableSections = computed(() => this.homepage.sections().filter(section => section.sectionType === 'CAMPAIGN' || section.sectionType === 'TOURS' || section.sectionType === 'BLOG' || ['BRANCHES','PROMO'].includes(this.renderer(section))));

  async ngOnInit(): Promise<void> { await this.reload(); }

  async reload(): Promise<void> {
    this.error.set('');
    try { await this.homepage.refresh(); }
    catch (error) { this.error.set(this.message(error)); }
  }

  async save(section: HomepageSectionRecord): Promise<void> {
    if (this.savingKey()) return;
    try {
      this.validate(section);
      this.savingKey.set(section.sectionKey);
      await this.homepage.updateSection(section);
      this.toast.show(`${section.title} blok metinleri canlı veritabanında güncellendi.`, 'success');
    } catch (error) {
      this.toast.show(this.message(error), 'error');
    } finally {
      this.savingKey.set('');
    }
  }

  renderer(section: HomepageSectionRecord): string { return String(section.settings?.renderer || '').toUpperCase(); }
  rendererLabel(section: HomepageSectionRecord): string { return this.renderer(section) || section.sectionType; }
  text(section: HomepageSectionRecord, key: string): string { return String(section.settings?.[key] ?? ''); }
  setText(section: HomepageSectionRecord, key: string, value: string): void { section.settings = { ...(section.settings || {}), [key]: String(value ?? '').trimStart() }; }
  bool(section: HomepageSectionRecord, key: string, fallback: boolean): boolean { const value=section.settings?.[key]; return typeof value === 'boolean' ? value : fallback; }
  setBool(section: HomepageSectionRecord, key: string, value: boolean): void { section.settings = { ...(section.settings || {}), [key]: Boolean(value) }; }

  private validate(section: HomepageSectionRecord): void {
    if (this.renderer(section) === 'BRANCHES') {
      const route=this.text(section,'partnerRoute').trim();
      if (this.bool(section,'showPartnerCta',true) && (!route || !route.startsWith('/'))) throw new Error('Bayilik CTA rotası / ile başlayan site rotası olmalıdır.');
    }
    for (const [key,value] of Object.entries(section.settings || {})) {
      if (typeof value === 'string' && value.length > 700) throw new Error(`${key} metni izin verilen uzunluğu aşıyor.`);
    }
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : 'Blok metinleri işlemi tamamlanamadı.'; }
}
