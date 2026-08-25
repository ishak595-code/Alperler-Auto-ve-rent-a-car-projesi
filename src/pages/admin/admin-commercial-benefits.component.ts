import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CampaignRecord, CampaignService } from "../../services/campaign.service";
import { CarService } from "../../services/car.service";
import { CommercialBenefitsAdminService, CommercialBenefitsSettings } from "../../services/commercial-benefits-admin.service";

@Component({
  selector: "app-admin-commercial-benefits",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="hero">
        <p>V166 Ticari Motor</p>
        <h1>Fiyat, Kampanya, Referral ve Sadakat Kontrol Merkezi</h1>
        <span>Fiyat kuralları backend tarafından uygulanır. Buradaki ayarlar vitrini değil gerçek rezervasyon ve işlem fiyatını yönetir.</span>
      </header>

      @if (error()) { <div class="alert error" role="alert">{{ error() }}</div> }
      @if (success()) { <div class="alert success" role="status">{{ success() }}</div> }

      <section class="grid">
        <article class="panel campaign-panel">
          <div class="panel-head"><div><p>Kampanya Fiyat Kuralları</p><h2>Ürüne bağlı gerçek indirim</h2></div><button type="button" (click)="refresh()">Yenile</button></div>
          <label class="field"><span>Kampanya seç</span><select [ngModel]="selectedCampaignId()" (ngModelChange)="selectCampaign($event)"><option value="">Kampanya seçin</option>@for (campaign of campaigns(); track campaign.id) {<option [value]="campaign.id">{{ campaign.title }}</option>}</select></label>

          @if (selectedCampaign(); as campaign) {
            <div class="target-card"><div><small>Hedef kayıt</small><strong>{{ targetLabel(campaign) }}</strong></div><div><small>Katalog normal fiyatı</small><strong>{{ canonicalPrice(campaign) | number:'1.0-2' }} ₺</strong></div></div>

            <div class="form-grid three">
              <label class="field"><span>İndirim yöntemi</span><select [(ngModel)]="discountMethod"><option value="FIXED_AMOUNT">Sabit indirim</option><option value="PERCENT">Yüzde indirim</option><option value="FIXED_PRICE">Nihai fiyat</option></select></label>
              <label class="field"><span>Değer</span><input [(ngModel)]="discountValue" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Uygulama</span><select [(ngModel)]="discountScope"><option value="UNIT">Birim başına</option><option value="ORDER">Sipariş toplamına</option></select></label>
            </div>

            <div class="price-preview">
              <span>Önizleme</span>
              <strong>{{ previewText(campaign) }}</strong>
              <small>Kesin fiyat, checkout sırasında katalog verisi yeniden okunarak server-side hesaplanır.</small>
            </div>

            <div class="form-grid two">
              <label class="field"><span>Vitrin görünürlüğü</span><select [(ngModel)]="visibilityMode"><option value="CAMPAIGN_ONLY">Sadece Kampanya Vitrini</option><option value="EVERYWHERE">Normal liste + Kampanya</option></select></label>
              <label class="field"><span>Öncelik</span><input [(ngModel)]="priority" type="number" min="0" /></label>
              <label class="field"><span>Minimum işlem tutarı</span><input [(ngModel)]="minimumOrderAmount" type="number" min="0" /></label>
              <label class="field"><span>Toplam kullanım limiti</span><input [(ngModel)]="maxRedemptions" type="number" min="1" placeholder="Sınırsız" /></label>
              <label class="field"><span>Müşteri başına kullanım</span><input [(ngModel)]="perCustomerLimit" type="number" min="1" max="1000" /></label>
              <label class="field"><span>Minimum kiralama günü</span><input [(ngModel)]="minimumRentalDays" type="number" min="1" placeholder="Yok" /></label>
              <label class="field"><span>Minimum kiralama saati</span><input [(ngModel)]="minimumRentalHours" type="number" min="1" max="23" placeholder="Yok" /></label>
            </div>

            <div class="toggles">
              <label><input type="checkbox" [(ngModel)]="allowReferralDiscount" /><span><strong>Referral indirimiyle birleşebilir</strong><small>Global politika da izin veriyorsa arkadaş daveti indirimi eklenebilir.</small></span></label>
              <label><input type="checkbox" [(ngModel)]="allowLoyaltyRedemption" /><span><strong>Sadakat puanı kullanılabilir</strong><small>Global politika ve harcama limiti ayrıca uygulanır.</small></span></label>
            </div>

            <button type="button" class="primary" [disabled]="savingCampaign()" (click)="saveCampaign()">{{ savingCampaign() ? 'Kaydediliyor…' : 'Kampanya Fiyat Kuralını Kaydet' }}</button>
          } @else { <div class="empty">Gelişmiş fiyat kurallarını düzenlemek için bir kampanya seçin.</div> }
        </article>

        <article class="panel loyalty-panel">
          <div class="panel-head"><div><p>Global Ticari Politika</p><h2>Referral & Sadakat</h2></div></div>
          @if (benefits) {
            <div class="toggles top">
              <label><input type="checkbox" [(ngModel)]="benefits.enabled" /><span><strong>Sadakat programı aktif</strong><small>Tamamlanan işlemler puan kazandırır.</small></span></label>
              <label><input type="checkbox" [(ngModel)]="benefits.redemptionEnabled" /><span><strong>Puan harcama aktif</strong><small>Checkout'ta puan indirime dönüşebilir.</small></span></label>
              <label><input type="checkbox" [(ngModel)]="benefits.referralCheckoutDiscountEnabled" /><span><strong>Yeni arkadaş indirimi aktif</strong><small>Uygun davetli ilk işlemi için anlık avantaj alır.</small></span></label>
            </div>

            <h3>Puan kazanma ve harcama</h3>
            <div class="form-grid two">
              <label class="field"><span>Kiralama, günlük puan</span><input [(ngModel)]="benefits.pointsPerRentalDay" type="number" min="1" /></label>
              <label class="field"><span>Kiralama minimum puan</span><input [(ngModel)]="benefits.minimumPointsPerRental" type="number" min="0" /></label>
              <label class="field"><span>Tur, her 100 TL için puan</span><input [(ngModel)]="benefits.tourPointsPer100Try" type="number" min="0" /></label>
              <label class="field"><span>Satış, her 1.000 TL için puan</span><input [(ngModel)]="benefits.salePointsPer1000Try" type="number" min="0" /></label>
              <label class="field"><span>1 puan kaç TL?</span><input [(ngModel)]="benefits.pointValueTry" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Minimum harcanabilir puan</span><input [(ngModel)]="benefits.minimumRedeemPoints" type="number" min="0" /></label>
              <label class="field"><span>İşlemin en fazla yüzde kaçı?</span><input [(ngModel)]="benefits.maxRedeemPercent" type="number" min="0" max="100" /></label>
            </div>

            <h3>Yeni arkadaşın anlık indirimi</h3>
            <div class="form-grid two">
              <label class="field"><span>İndirim yöntemi</span><select [(ngModel)]="benefits.referralCheckoutDiscountMode"><option value="FIXED_AMOUNT">Sabit TL</option><option value="PERCENT">Yüzde</option></select></label>
              <label class="field"><span>Kiralama avantajı</span><input [(ngModel)]="benefits.referralRentalInviteeDiscount" type="number" min="0" /></label>
              <label class="field"><span>Satın alma avantajı</span><input [(ngModel)]="benefits.referralSaleInviteeDiscount" type="number" min="0" /></label>
              <label class="field"><span>Tur avantajı</span><input [(ngModel)]="benefits.referralTourInviteeDiscount" type="number" min="0" /></label>
            </div>

            <h3>İşlem tamamlanınca referral puanı</h3>
            <div class="reward-grid">
              <div><strong>Kiralama</strong><label>Davet eden <input [(ngModel)]="benefits.referralRentalInviterPoints" type="number" min="0" /></label><label>Davet edilen <input [(ngModel)]="benefits.referralRentalInviteePoints" type="number" min="0" /></label></div>
              <div><strong>Araç satın alma</strong><label>Davet eden <input [(ngModel)]="benefits.referralSaleInviterPoints" type="number" min="0" /></label><label>Davet edilen <input [(ngModel)]="benefits.referralSaleInviteePoints" type="number" min="0" /></label></div>
              <div><strong>Tur</strong><label>Davet eden <input [(ngModel)]="benefits.referralTourInviterPoints" type="number" min="0" /></label><label>Davet edilen <input [(ngModel)]="benefits.referralTourInviteePoints" type="number" min="0" /></label></div>
            </div>

            <h3>İndirim birleştirme politikası</h3>
            <div class="toggles">
              <label><input type="checkbox" [(ngModel)]="benefits.allowCampaignReferralStack" /><span><strong>Kampanya + Referral</strong><small>İkisi aynı checkout'ta kullanılabilir.</small></span></label>
              <label><input type="checkbox" [(ngModel)]="benefits.allowCampaignLoyaltyStack" /><span><strong>Kampanya + Sadakat</strong><small>Kampanya üstüne puan harcanabilir.</small></span></label>
              <label><input type="checkbox" [(ngModel)]="benefits.allowReferralLoyaltyStack" /><span><strong>Referral + Sadakat</strong><small>Arkadaş indirimi ile puan aynı anda kullanılabilir.</small></span></label>
            </div>

            <h3>Sadakat seviyeleri</h3>
            <div class="form-grid three">
              <label class="field"><span>Silver</span><input [(ngModel)]="benefits.silverThreshold" type="number" min="0" /></label>
              <label class="field"><span>Gold</span><input [(ngModel)]="benefits.goldThreshold" type="number" min="0" /></label>
              <label class="field"><span>Platinum</span><input [(ngModel)]="benefits.platinumThreshold" type="number" min="0" /></label>
            </div>

            <button type="button" class="primary blue" [disabled]="savingBenefits()" (click)="saveBenefits()">{{ savingBenefits() ? 'Kaydediliyor…' : 'Referral & Sadakat Politikasını Kaydet' }}</button>
          } @else { <div class="empty">Global ticari ayarlar yükleniyor.</div> }
        </article>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;background:#f8fafc;color:#0f172a}.page{width:min(100% - 24px,1280px);margin:auto;padding:22px 0 70px}.hero{border-radius:26px;background:#07111f;padding:24px;color:#fff;box-shadow:0 22px 55px rgba(15,23,42,.16)}.hero p,.panel-head p{margin:0;color:#f59e0b;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.hero h1{margin:5px 0 0;font-size:clamp(25px,4vw,38px);font-weight:950}.hero span{display:block;max-width:850px;margin-top:8px;color:#cbd5e1;font-size:13px;line-height:1.6}.alert{margin-top:12px;border-radius:14px;padding:12px 14px;font-size:12px;font-weight:850}.alert.error{background:#fee2e2;color:#991b1b}.alert.success{background:#dcfce7;color:#166534}.grid{display:grid;gap:16px;margin-top:16px}.panel{border:1px solid #e2e8f0;border-radius:24px;background:#fff;padding:18px;box-shadow:0 12px 35px rgba(15,23,42,.06)}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.panel-head h2{margin:3px 0 0;font-size:22px}.panel-head button{min-height:40px;border:1px solid #dbe4ef;border-radius:11px;background:#fff;padding:0 13px;font-weight:900}.field{display:block}.field>span{display:block;margin-bottom:6px;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase}.field input,.field select{width:100%;min-height:46px;border:1px solid #dbe4ef;border-radius:12px;background:#f8fafc;padding:0 11px;color:#0f172a;font:inherit;outline:none}.field input:focus,.field select:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}.panel>.field{margin-top:15px}.form-grid{display:grid;gap:10px;margin-top:13px}.target-card{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.target-card>div{border-radius:13px;background:#f1f5f9;padding:11px}.target-card small,.target-card strong{display:block}.target-card small{color:#64748b;font-size:10px}.target-card strong{margin-top:3px;font-size:13px}.price-preview{margin-top:12px;border:1px solid #fde68a;border-radius:14px;background:#fffbeb;padding:13px}.price-preview span,.price-preview strong,.price-preview small{display:block}.price-preview span{color:#92400e;font-size:10px;font-weight:900;text-transform:uppercase}.price-preview strong{margin-top:3px;color:#78350f;font-size:19px}.price-preview small{margin-top:5px;color:#92400e;line-height:1.5}.toggles{display:grid;gap:8px;margin-top:14px}.toggles label{display:flex;gap:10px;border:1px solid #e2e8f0;border-radius:13px;padding:11px;background:#f8fafc}.toggles input{width:20px;height:20px;flex:none}.toggles strong,.toggles small{display:block}.toggles small{margin-top:3px;color:#64748b;font-size:10px;line-height:1.4}.primary{width:100%;min-height:50px;margin-top:16px;border:0;border-radius:13px;background:#f59e0b;color:#111827;font-weight:950}.primary.blue{background:#2563eb;color:#fff}.primary:disabled{opacity:.5}.empty{margin-top:14px;border:1px dashed #cbd5e1;border-radius:14px;padding:28px;text-align:center;color:#64748b}.loyalty-panel h3{margin:21px 0 0;font-size:14px}.reward-grid{display:grid;gap:9px;margin-top:10px}.reward-grid>div{border:1px solid #e2e8f0;border-radius:14px;padding:11px}.reward-grid strong{display:block;margin-bottom:8px}.reward-grid label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;color:#64748b;font-size:11px}.reward-grid input{width:110px;min-height:38px;border:1px solid #dbe4ef;border-radius:9px;padding:0 8px}.top{margin-top:14px}@media(min-width:720px){.form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.reward-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1100px){.grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:start}.campaign-panel{position:sticky;top:86px}}
  `],
})
export class AdminCommercialBenefitsComponent implements OnInit {
  private readonly campaignsService = inject(CampaignService);
  private readonly benefitsService = inject(CommercialBenefitsAdminService);
  private readonly carService = inject(CarService);

  readonly campaigns = this.campaignsService.campaigns;
  readonly selectedCampaignId = signal("");
  readonly selectedCampaign = computed(() => this.campaigns().find((item) => item.id === this.selectedCampaignId()));
  readonly savingCampaign = signal(false);
  readonly savingBenefits = signal(false);
  readonly error = signal("");
  readonly success = signal("");

  benefits?: CommercialBenefitsSettings;
  discountMethod: CampaignRecord["discountMethod"] = "FIXED_AMOUNT";
  discountValue = 0;
  discountScope: CampaignRecord["discountScope"] = "UNIT";
  visibilityMode: CampaignRecord["visibilityMode"] = "CAMPAIGN_ONLY";
  minimumOrderAmount = 0;
  minimumRentalDays?: number;
  minimumRentalHours?: number;
  maxRedemptions?: number;
  perCustomerLimit = 1;
  allowReferralDiscount = true;
  allowLoyaltyRedemption = true;
  priority = 100;

  async ngOnInit(): Promise<void> { await this.refresh(); }

  async refresh(): Promise<void> {
    this.error.set("");
    try {
      await Promise.all([this.campaignsService.refreshAdmin(), this.carService.refreshCloudCatalog(true)]);
      this.benefits = await this.benefitsService.refresh();
      const current = this.selectedCampaignId();
      if (current && !this.campaigns().some((item) => item.id === current)) this.selectedCampaignId.set("");
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : "Ticari ayarlar yüklenemedi.");
    }
  }

  selectCampaign(id: string): void {
    this.selectedCampaignId.set(String(id || ""));
    const campaign = this.selectedCampaign();
    if (!campaign) return;
    this.discountMethod = campaign.discountMethod;
    this.discountValue = campaign.discountValue;
    this.discountScope = campaign.discountScope;
    this.visibilityMode = campaign.visibilityMode;
    this.minimumOrderAmount = campaign.minimumOrderAmount;
    this.minimumRentalDays = campaign.minimumRentalDays;
    this.minimumRentalHours = campaign.minimumRentalHours;
    this.maxRedemptions = campaign.maxRedemptions;
    this.perCustomerLimit = campaign.perCustomerLimit;
    this.allowReferralDiscount = campaign.allowReferralDiscount;
    this.allowLoyaltyRedemption = campaign.allowLoyaltyRedemption;
    this.priority = campaign.priority;
    this.success.set("");
  }

  async saveCampaign(): Promise<void> {
    const campaign = this.selectedCampaign();
    if (!campaign || this.savingCampaign()) return;
    this.savingCampaign.set(true); this.error.set(""); this.success.set("");
    try {
      const normal = this.canonicalPrice(campaign);
      const unitPreview = this.discountScope === "UNIT" && normal > 0 ? this.discountedUnit(normal) : undefined;
      await this.campaignsService.save({
        ...campaign,
        discountMethod: this.discountMethod,
        discountValue: Number(this.discountValue),
        discountScope: this.discountScope,
        visibilityMode: this.visibilityMode,
        minimumOrderAmount: Number(this.minimumOrderAmount || 0),
        minimumRentalDays: this.positiveOrUndefined(this.minimumRentalDays),
        minimumRentalHours: this.positiveOrUndefined(this.minimumRentalHours),
        maxRedemptions: this.positiveOrUndefined(this.maxRedemptions),
        perCustomerLimit: Math.max(1, Number(this.perCustomerLimit || 1)),
        allowReferralDiscount: this.allowReferralDiscount,
        allowLoyaltyRedemption: this.allowLoyaltyRedemption,
        priority: Math.max(0, Number(this.priority || 0)),
        oldPrice: unitPreview !== undefined ? normal : undefined,
        newPrice: unitPreview,
        discountPercent: this.discountMethod === "PERCENT" ? Number(this.discountValue) : undefined,
      });
      this.success.set("Kampanya fiyat ve kullanım kuralları kaydedildi. Değişiklik audit log'a işlendi.");
      this.selectCampaign(campaign.id);
    } catch (error) { this.error.set(error instanceof Error ? error.message : "Kampanya kuralı kaydedilemedi."); }
    finally { this.savingCampaign.set(false); }
  }

  async saveBenefits(): Promise<void> {
    if (!this.benefits || this.savingBenefits()) return;
    this.savingBenefits.set(true); this.error.set(""); this.success.set("");
    try {
      this.benefits = await this.benefitsService.save(this.benefits);
      this.success.set("Referral, sadakat ve indirim birleştirme politikası kaydedildi. Değişiklik audit log'a işlendi.");
    } catch (error) { this.error.set(error instanceof Error ? error.message : "Ticari politika kaydedilemedi."); }
    finally { this.savingBenefits.set(false); }
  }

  targetLabel(campaign: CampaignRecord): string {
    const target = this.target(campaign);
    if (!target) return campaign.targetId || "Hedef kayıt seçilmedi";
    return String(target.title || [target.brand, target.model].filter(Boolean).join(" ") || campaign.targetId || "Kayıt");
  }

  canonicalPrice(campaign: CampaignRecord): number { return Number(this.target(campaign)?.price || campaign.oldPrice || 0); }

  previewText(campaign: CampaignRecord): string {
    const normal = this.canonicalPrice(campaign);
    if (normal <= 0) return this.discountScope === "ORDER" ? "Sipariş toplamında backend hesaplaması" : "Katalog fiyatı bekleniyor";
    if (this.discountScope === "ORDER") {
      if (this.discountMethod === "PERCENT") return `Sipariş toplamında %${this.discountValue} indirim`;
      if (this.discountMethod === "FIXED_PRICE") return `Sipariş toplamı ${this.formatMoney(this.discountValue)} olarak sınırlandırılır`;
      return `Sipariş toplamından ${this.formatMoney(this.discountValue)} indirim`;
    }
    return `${this.formatMoney(normal)} → ${this.formatMoney(this.discountedUnit(normal))}`;
  }

  private discountedUnit(normal: number): number {
    const value = Math.max(0, Number(this.discountValue || 0));
    if (this.discountMethod === "PERCENT") return Math.max(0, Math.round(normal * (100 - Math.min(100, value)) / 100 * 100) / 100);
    if (this.discountMethod === "FIXED_PRICE") return Math.min(normal, value);
    return Math.max(0, Math.round((normal - value) * 100) / 100);
  }

  private target(campaign: CampaignRecord): any | undefined {
    const id = String(campaign.targetId || "");
    if (!id) return undefined;
    const all = [...this.carService.getAllVehicles()(), ...this.carService.getTours()()];
    return all.find((item: any) => String(item.cloudId || item.id) === id);
  }

  private formatMoney(value: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value); }
  private positiveOrUndefined(value: number | undefined): number | undefined { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined; }
}
