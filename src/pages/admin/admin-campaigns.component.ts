import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CampaignIntent, CampaignRecord, CampaignService } from "../../services/campaign.service";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";

type TargetOption = { id: string; label: string; image?: string; price?: number; route?: string };

@Component({
  selector: "app-admin-campaigns",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-[1440px] space-y-6">
        <header class="overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">Dinamik kampanya motoru</p>
          <div class="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Kampanya Oluştur, Planla ve Otomatik Kapat</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Özel gün, kiralık, satılık veya tur kampanyasını katalogdaki gerçek ilana bağlayın. Süresi dolan kampanya vitrinden otomatik çıkar.</p>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" (click)="applyPreset('WEDDING')" class="preset"><mat-icon>favorite</mat-icon><span>Gelin Arabası</span></button>
              <button type="button" (click)="applyPreset('RENTAL')" class="preset"><mat-icon>key</mat-icon><span>Kiralık</span></button>
              <button type="button" (click)="applyPreset('SALE')" class="preset"><mat-icon>sell</mat-icon><span>Satılık</span></button>
              <button type="button" (click)="applyPreset('TOUR')" class="preset"><mat-icon>landscape</mat-icon><span>Tur</span></button>
            </div>
          </div>
        </header>

        <section class="grid gap-5 xl:grid-cols-[460px_1fr]">
          <form (ngSubmit)="save()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div class="flex items-center justify-between gap-3">
              <div><h2 class="text-xl font-black text-slate-900">{{ editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya' }}</h2><p class="text-xs text-slate-500">{{ purposeLabel() }} · {{ liveStateLabel() }}</p></div>
              @if (editingId) { <button type="button" (click)="reset()" class="text-sm font-black text-blue-600">Yeni</button> }
            </div>

            <div class="mt-5 space-y-4">
              <label class="field"><span>Vitrin amacı</span><select [(ngModel)]="purpose" name="purpose" (change)="purposeChanged()"><option value="WEDDING">Gelin Arabası / Özel Gün</option><option value="RENTAL">Kiralık Araç</option><option value="SALE">Satılık Araç</option><option value="TOUR">Tur</option><option value="GENERAL">Genel</option></select></label>
              <label class="field"><span>Başlık</span><input [(ngModel)]="title" name="title" maxlength="180" required placeholder="Örn. Hayalinizdeki Gelin Arabası Paketi" /></label>
              <label class="field"><span>Kısa açıklama</span><textarea [(ngModel)]="shortDescription" name="shortDescription" rows="3" maxlength="500" placeholder="Kartta görünen net ve ikna edici açıklama"></textarea></label>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Kampanya türü</span><select [(ngModel)]="campaignType" name="campaignType"><option value="DISCOUNT">İndirim</option><option value="PRICE">Fiyat</option><option value="BUNDLE">Paket</option><option value="SEASONAL">Sezonluk</option><option value="CUSTOM">Özel</option></select></label>
                <label class="field"><span>Rozet</span><input [(ngModel)]="badge" name="badge" placeholder="ÖZEL GÜN" /></label>
              </div>

              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div class="grid grid-cols-2 gap-3">
                  <label class="field"><span>Hedef türü</span><select [(ngModel)]="targetType" name="targetType" (change)="targetTypeChanged()"><option value="GENERAL">Genel</option><option value="VEHICLE">Araç</option><option value="TOUR">Tur</option></select></label>
                  <label class="field"><span>Bağlı ilan</span><select [(ngModel)]="targetId" name="targetId" [disabled]="targetType==='GENERAL'" (change)="targetChanged()"><option value="">Seç…</option>@for (target of availableTargets(); track target.id) { <option [value]="target.id">{{ target.label }}</option> }</select></label>
                </div>
                @if (targetId) { <button type="button" (click)="fillFromTarget()" class="mt-3 min-h-10 w-full rounded-xl border border-blue-200 bg-blue-50 text-xs font-black text-blue-700">İlandan fiyat, kapak ve bağlantıyı doldur</button> }
              </div>

              <label class="field"><span>Kapak görseli URL</span><input [(ngModel)]="coverImage" name="coverImage" type="url" placeholder="https://..." /></label>
              @if (coverImage) {
                <div class="relative aspect-[16/9] overflow-hidden rounded-2xl bg-slate-950">
                  <img [src]="coverImage" alt="Kampanya kapak önizlemesi" class="h-full w-full object-cover" referrerpolicy="no-referrer" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                  <div class="absolute bottom-3 left-3 right-3 text-white"><span class="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-slate-950">{{ badge || 'KAMPANYA' }}</span><strong class="mt-2 block text-sm">{{ title || 'Kampanya başlığı' }}</strong></div>
                </div>
              }

              <div class="grid grid-cols-3 gap-2"><label class="field"><span>Eski fiyat</span><input [(ngModel)]="oldPrice" name="oldPrice" type="number" min="0" /></label><label class="field"><span>Yeni fiyat</span><input [(ngModel)]="newPrice" name="newPrice" type="number" min="0" /></label><label class="field"><span>% İndirim</span><input [(ngModel)]="discountPercent" name="discountPercent" type="number" min="0" max="100" /></label></div>
              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Fiyat etiketi</span><input [(ngModel)]="priceLabel" name="priceLabel" placeholder="Net fiyat" /></label><label class="field"><span>Fiyat son eki</span><input [(ngModel)]="priceSuffix" name="priceSuffix" placeholder="paket / günlük / kişi başı" /></label></div>

              <div class="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div class="grid grid-cols-2 gap-3"><label class="field"><span>Başlangıç</span><input [(ngModel)]="startsAt" name="startsAt" type="datetime-local" /></label><label class="field"><span>Bitiş</span><input [(ngModel)]="endsAt" name="endsAt" type="datetime-local" /></label></div>
                <p class="mt-2 text-[11px] font-bold text-amber-800">Bitiş saati geldiğinde vitrin kartı sayfa açıkken de otomatik kaybolur.</p>
              </div>

              <div class="space-y-2"><span class="block text-[11px] font-black uppercase tracking-widest text-slate-500">Kart faydaları</span><input [(ngModel)]="benefit1" name="benefit1" class="mini-input" placeholder="1. fayda" /><input [(ngModel)]="benefit2" name="benefit2" class="mini-input" placeholder="2. fayda" /><input [(ngModel)]="benefit3" name="benefit3" class="mini-input" placeholder="3. fayda" /></div>
              <label class="field"><span>Güven satırı</span><input [(ngModel)]="trustLine" name="trustLine" placeholder="Şeffaf fiyat • Hızlı talep • Açık koşullar" /></label>
              <label class="field"><span>Buton yazısı</span><input [(ngModel)]="ctaLabel" name="ctaLabel" /></label>
              <label class="field"><span>Buton URL</span><input [(ngModel)]="ctaUrl" name="ctaUrl" placeholder="/fleet/1001" /></label>
              <label class="field"><span>WhatsApp mesajı</span><textarea [(ngModel)]="whatsappMessage" name="whatsappMessage" rows="3"></textarea></label>

              <details class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <summary class="cursor-pointer text-sm font-black text-slate-800">Medya kaynağı ve lisans</summary>
                <div class="mt-3 space-y-3"><label class="field"><span>Kaynak sayfası</span><input [(ngModel)]="imageSourceUrl" name="imageSourceUrl" type="url" /></label><label class="field"><span>Atıf</span><input [(ngModel)]="imageAttribution" name="imageAttribution" /></label><label class="field"><span>Lisans</span><input [(ngModel)]="imageLicense" name="imageLicense" /></label><label class="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="representativeImage" name="representativeImage" /> Bu görsel temsili model görselidir</label></div>
              </details>

              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Yayın durumu</span><select [(ngModel)]="publicationStatus" name="publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label><label class="field"><span>Sıra</span><input [(ngModel)]="sortOrder" name="sortOrder" type="number" min="0" /></label></div>
              <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="isActive" name="isActive" /> Kampanya aktif</label>
              <button type="submit" [disabled]="saving() || !title.trim()" class="min-h-12 w-full rounded-xl bg-amber-500 font-black text-slate-950 shadow-lg disabled:opacity-40">{{ saving() ? 'Kaydediliyor…' : 'Kampanyayı Kaydet' }}</button>
            </div>
          </form>

          <section class="space-y-4">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="text-xl font-black text-slate-900">Kampanyalar</h2><p class="text-xs text-slate-500">{{ campaigns().length }} kayıt · tarih penceresi otomatik uygulanır</p></div><button type="button" (click)="refresh()" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Yenile</button></div></div>
            @for (campaign of campaigns(); track campaign.id; let i = $index) {
              <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" [class.opacity-60]="!campaign.isActive">
                <div class="grid md:grid-cols-[240px_1fr]">
                  <div class="relative min-h-48 bg-slate-900">@if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaign.title" class="absolute inset-0 h-full w-full object-cover" referrerpolicy="no-referrer" /> }<div class="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent"></div><span class="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black text-slate-950">{{ campaign.badge || campaign.campaignType }}</span><span class="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[10px] font-black text-white" [class.bg-emerald-500]="campaignService.isLive(campaign)" [class.bg-slate-700]="!campaignService.isLive(campaign)">{{ stateOf(campaign) }}</span></div>
                  <div class="p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p class="text-[10px] font-black uppercase tracking-widest text-blue-600">{{ intentOf(campaign) }}</p><h3 class="mt-1 text-xl font-black text-slate-900">{{ campaign.title }}</h3><p class="mt-1 text-sm leading-relaxed text-slate-500">{{ campaign.shortDescription || 'Açıklama yok' }}</p><div class="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{{ campaign.publicationStatus }}</span>@if (campaign.discountPercent != null) { <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">%{{ campaign.discountPercent }} indirim</span> }@if (campaign.newPrice != null) { <span class="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{{ campaign.newPrice | number }} ₺</span> }@if(campaign.endsAt){<span class="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Bitiş {{ campaign.endsAt | date:'dd.MM.yyyy HH:mm' }}</span>}</div></div><div class="flex gap-2"><button type="button" (click)="move(i,-1)" [disabled]="i===0" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30" aria-label="Yukarı taşı">↑</button><button type="button" (click)="move(i,1)" [disabled]="i===campaigns().length-1" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30" aria-label="Aşağı taşı">↓</button></div></div><div class="mt-5 grid grid-cols-2 gap-2"><button type="button" (click)="edit(campaign)" class="min-h-11 rounded-xl bg-slate-950 font-black text-white">Düzenle</button><button type="button" (click)="remove(campaign)" class="min-h-11 rounded-xl bg-rose-50 font-black text-rose-700">Sil</button></div></div>
                </div>
              </article>
            } @empty { <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-slate-500">Henüz kampanya yok.</div> }
          </section>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select,.field textarea,.mini-input{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;color:rgb(15 23 42);outline:none}.field textarea{min-height:78px}.field input:focus,.field select:focus,.field textarea:focus,.mini-input:focus{border-color:rgb(245 158 11);box-shadow:0 0 0 2px rgb(245 158 11/.15)}.preset{display:flex;min-height:76px;min-width:105px;flex-direction:column;align-items:center;justify-content:center;gap:5px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);padding:10px;color:#fff;font-size:.7rem;font-weight:900;transition:.2s}.preset:hover,.preset:focus-visible{background:#f59e0b;color:#0f172a;outline:none;transform:translateY(-2px)}
  `],
})
export class AdminCampaignsComponent implements OnInit {
  readonly campaignService = inject(CampaignService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  readonly campaigns = this.campaignService.campaigns;
  readonly saving = signal(false);

  editingId = "";
  purpose: CampaignIntent = "GENERAL";
  title = "";
  shortDescription = "";
  badge = "FIRSAT";
  campaignType: CampaignRecord["campaignType"] = "DISCOUNT";
  coverImage = "";
  oldPrice?: number;
  newPrice?: number;
  discountPercent?: number;
  targetType: NonNullable<CampaignRecord["targetType"]> = "GENERAL";
  targetId = "";
  ctaLabel = "Detayları Gör";
  ctaUrl = "";
  whatsappMessage = "";
  startsAt = "";
  endsAt = "";
  publicationStatus: CampaignRecord["publicationStatus"] = "DRAFT";
  isActive = true;
  sortOrder = 0;
  benefit1 = "";
  benefit2 = "";
  benefit3 = "";
  trustLine = "Şeffaf fiyat • Hızlı talep • Açık koşullar";
  priceLabel = "Net fiyat";
  priceSuffix = "";
  imageSourceUrl = "";
  imageAttribution = "";
  imageLicense = "";
  representativeImage = false;
  private editingMetadata: Record<string, unknown> = {};

  ngOnInit(): void { void this.refresh(); }

  availableTargets(): TargetOption[] {
    if (this.targetType === "VEHICLE") {
      return this.cars.getAllVehicles()().filter((row: any) => row.category !== "TOUR" && row.cloudId).map((row: any) => ({
        id: row.cloudId,
        label: `${row.category === "RENTAL" ? "Kiralık" : "Satılık"} · ${row.brand || ""} ${row.model || ""}`.trim(),
        image: row.image,
        price: Number(row.price || 0) || undefined,
        route: row.category === "RENTAL" ? `/fleet/${row.id}` : `/sales/${row.id}`,
      }));
    }
    if (this.targetType === "TOUR") {
      return this.cars.getTours()().filter((row: any) => row.cloudId).map((row: any) => ({
        id: row.cloudId,
        label: `Tur · ${row.title || row.id}`,
        image: row.image,
        price: Number(row.price || 0) || undefined,
        route: `/tour/${row.id}`,
      }));
    }
    return [];
  }

  async refresh(): Promise<void> { try { await this.campaignService.refreshAdmin(); } catch (error) { this.toast.show(this.message(error), "error"); } }

  applyPreset(intent: CampaignIntent): void {
    this.reset(false);
    this.purpose = intent;
    this.purposeChanged();
    const rows = this.availableTargets();
    let match: TargetOption | undefined;
    if (intent === "WEDDING") match = rows.find((row) => /gelin|düğün|c serisi/i.test(row.label));
    else if (intent === "RENTAL") match = rows.find((row) => row.label.startsWith("Kiralık"));
    else if (intent === "SALE") match = rows.find((row) => row.label.startsWith("Satılık"));
    else if (intent === "TOUR") match = rows[0];
    if (match) { this.targetId = match.id; this.fillFromTarget(); }
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000);
    this.startsAt = this.toLocal(now.toISOString());
    this.endsAt = this.toLocal(end.toISOString());
    this.publicationStatus = "DRAFT";
    this.sortOrder = this.campaigns().length + 1;
  }

  purposeChanged(): void {
    if (this.purpose === "TOUR") this.targetType = "TOUR";
    else if (this.purpose === "GENERAL") this.targetType = "GENERAL";
    else this.targetType = "VEHICLE";
    this.targetId = "";
    const presets: Record<CampaignIntent, Partial<AdminCampaignsComponent>> = {
      WEDDING: { campaignType: "BUNDLE", badge: "ÖZEL GÜN", title: "Hayalinizdeki Gelin Arabası Paketi", shortDescription: "Süsleme ve şoförlü hizmetle özel gününüz için tek pakette premium ulaşım.", ctaLabel: "Paketi İncele", whatsappMessage: "Merhaba, gelin arabası özel gün paketi hakkında bilgi almak istiyorum.", benefit1: "Profesyonel araç süslemesi", benefit2: "Şoförlü VIP hizmet", benefit3: "Özel gün planına uygun teslim", trustLine: "Gerçek paket fiyatı • Açık hizmet kapsamı • Hızlı rezervasyon", priceSuffix: "paket" },
      RENTAL: { campaignType: "PRICE", badge: "KİRALAMA FIRSATI", title: "Seçilmiş Kiralık Araç Fırsatı", shortDescription: "Belirli tarihler için şeffaf günlük fiyatla seçilmiş kiralık araç.", ctaLabel: "Aracı İncele", whatsappMessage: "Merhaba, kiralık araç kampanyası hakkında bilgi almak istiyorum.", benefit1: "Şeffaf günlük fiyat", benefit2: "Hızlı uygunluk kontrolü", benefit3: "Doğrudan rezervasyon talebi", trustLine: "Açık fiyat • Uygunluk kontrolü • Güvenli talep", priceSuffix: "günlük" },
      SALE: { campaignType: "PRICE", badge: "SATIŞ FIRSATI", title: "Seçilmiş Satılık Araç Fırsatı", shortDescription: "Ekspertiz ve temel araç bilgileri açık seçilmiş satış fırsatı.", ctaLabel: "İlanı İncele", whatsappMessage: "Merhaba, satılık araç kampanyası hakkında bilgi almak istiyorum.", benefit1: "Açık araç bilgileri", benefit2: "Ekspertiz bilgisi", benefit3: "Şeffaf satış fiyatı", trustLine: "Araç bilgisi açık • Fiyat şeffaf • Hızlı iletişim", priceSuffix: "satış fiyatı" },
      TOUR: { campaignType: "SEASONAL", badge: "TUR FIRSATI", title: "Kaçırılmayacak Tur Deneyimi", shortDescription: "Sınırlı dönem için planlı rota ve şeffaf kişi başı fiyatla seçilmiş tur.", ctaLabel: "Turu İncele", whatsappMessage: "Merhaba, tur kampanyası hakkında bilgi almak istiyorum.", benefit1: "Planlı rota", benefit2: "Rehberli deneyim", benefit3: "Şeffaf kişi başı fiyat", trustLine: "Planlı rota • Açık kapsam • Hızlı rezervasyon", priceSuffix: "kişi başı" },
      GENERAL: { campaignType: "CUSTOM", badge: "KAMPANYA", title: "", shortDescription: "", ctaLabel: "Detayları Gör", benefit1: "", benefit2: "", benefit3: "", trustLine: "Şeffaf fiyat • Hızlı talep • Açık koşullar", priceSuffix: "" },
    };
    Object.assign(this, presets[this.purpose]);
  }

  targetTypeChanged(): void { this.targetId = ""; }
  targetChanged(): void { if (this.targetId) this.fillFromTarget(); }

  fillFromTarget(): void {
    const target = this.availableTargets().find((row) => row.id === this.targetId);
    if (!target) return;
    if (target.image) this.coverImage = target.image;
    if (target.price != null) this.newPrice = target.price;
    if (target.route) this.ctaUrl = target.route;
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const benefits = [this.benefit1, this.benefit2, this.benefit3].map((item) => item.trim()).filter(Boolean);
      const metadata: Record<string, unknown> = {
        ...this.editingMetadata,
        intent: this.purpose,
        benefits,
        trustLine: this.trustLine.trim(),
        priceLabel: this.priceLabel.trim() || "Net fiyat",
        priceSuffix: this.priceSuffix.trim(),
        representativeImage: this.representativeImage,
      };
      if (this.imageSourceUrl.trim()) metadata["imageSourceUrl"] = this.imageSourceUrl.trim(); else delete metadata["imageSourceUrl"];
      if (this.imageAttribution.trim()) metadata["imageAttribution"] = this.imageAttribution.trim(); else delete metadata["imageAttribution"];
      if (this.imageLicense.trim()) metadata["imageLicense"] = this.imageLicense.trim(); else delete metadata["imageLicense"];
      await this.campaignService.save({ id: this.editingId || undefined, title: this.title, campaignType: this.campaignType, shortDescription: this.shortDescription || undefined, badge: this.badge || undefined, coverImage: this.coverImage || undefined, oldPrice: this.oldPrice, newPrice: this.newPrice, discountPercent: this.discountPercent, targetType: this.targetType, targetId: this.targetType === "GENERAL" ? undefined : this.targetId || undefined, ctaLabel: this.ctaLabel, ctaUrl: this.ctaUrl || undefined, whatsappMessage: this.whatsappMessage || undefined, startsAt: this.toIso(this.startsAt), endsAt: this.toIso(this.endsAt), publicationStatus: this.publicationStatus, isActive: this.isActive, sortOrder: this.sortOrder, metadata });
      this.reset();
      this.toast.show("Kampanya kaydedildi. Tarih penceresi otomatik uygulanacak.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.saving.set(false); }
  }

  edit(campaign: CampaignRecord): void {
    this.editingId = campaign.id;
    this.editingMetadata = { ...(campaign.metadata || {}) };
    this.purpose = this.campaignService.intentOf(campaign);
    this.title = campaign.title;
    this.shortDescription = campaign.shortDescription || "";
    this.badge = campaign.badge || "";
    this.campaignType = campaign.campaignType;
    this.coverImage = campaign.coverImage || "";
    this.oldPrice = campaign.oldPrice;
    this.newPrice = campaign.newPrice;
    this.discountPercent = campaign.discountPercent;
    this.targetType = campaign.targetType || "GENERAL";
    this.targetId = campaign.targetId || "";
    this.ctaLabel = campaign.ctaLabel;
    this.ctaUrl = campaign.ctaUrl || "";
    this.whatsappMessage = campaign.whatsappMessage || "";
    this.startsAt = this.toLocal(campaign.startsAt);
    this.endsAt = this.toLocal(campaign.endsAt);
    this.publicationStatus = campaign.publicationStatus;
    this.isActive = campaign.isActive;
    this.sortOrder = campaign.sortOrder;
    const benefits = Array.isArray(campaign.metadata?.["benefits"]) ? campaign.metadata["benefits"] as unknown[] : [];
    this.benefit1 = typeof benefits[0] === "string" ? benefits[0] : "";
    this.benefit2 = typeof benefits[1] === "string" ? benefits[1] : "";
    this.benefit3 = typeof benefits[2] === "string" ? benefits[2] : "";
    this.trustLine = typeof campaign.metadata?.["trustLine"] === "string" ? campaign.metadata["trustLine"] as string : "";
    this.priceLabel = typeof campaign.metadata?.["priceLabel"] === "string" ? campaign.metadata["priceLabel"] as string : "Net fiyat";
    this.priceSuffix = typeof campaign.metadata?.["priceSuffix"] === "string" ? campaign.metadata["priceSuffix"] as string : "";
    this.imageSourceUrl = typeof campaign.metadata?.["imageSourceUrl"] === "string" ? campaign.metadata["imageSourceUrl"] as string : "";
    this.imageAttribution = typeof campaign.metadata?.["imageAttribution"] === "string" ? campaign.metadata["imageAttribution"] as string : "";
    this.imageLicense = typeof campaign.metadata?.["imageLicense"] === "string" ? campaign.metadata["imageLicense"] as string : "";
    this.representativeImage = campaign.metadata?.["representativeImage"] === true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  reset(setOrder = true): void {
    this.editingId = ""; this.editingMetadata = {}; this.purpose = "GENERAL"; this.title = ""; this.shortDescription = ""; this.badge = "FIRSAT"; this.campaignType = "DISCOUNT"; this.coverImage = ""; this.oldPrice = undefined; this.newPrice = undefined; this.discountPercent = undefined; this.targetType = "GENERAL"; this.targetId = ""; this.ctaLabel = "Detayları Gör"; this.ctaUrl = ""; this.whatsappMessage = ""; this.startsAt = ""; this.endsAt = ""; this.publicationStatus = "DRAFT"; this.isActive = true; this.benefit1 = ""; this.benefit2 = ""; this.benefit3 = ""; this.trustLine = "Şeffaf fiyat • Hızlı talep • Açık koşullar"; this.priceLabel = "Net fiyat"; this.priceSuffix = ""; this.imageSourceUrl = ""; this.imageAttribution = ""; this.imageLicense = ""; this.representativeImage = false; if (setOrder) this.sortOrder = this.campaigns().length + 1;
  }

  async remove(campaign: CampaignRecord): Promise<void> { try { await this.campaignService.remove(campaign.id); this.toast.show("Kampanya silindi.", "info"); } catch (error) { this.toast.show(this.message(error), "error"); } }
  async move(index: number, delta: number): Promise<void> { const rows = [...this.campaigns()]; const target = index + delta; if (target < 0 || target >= rows.length) return; [rows[index], rows[target]] = [rows[target], rows[index]]; try { await this.campaignService.reorder(rows.map((row) => row.id)); } catch (error) { this.toast.show(this.message(error), "error"); } }
  intentOf(campaign: CampaignRecord): string { const intent = this.campaignService.intentOf(campaign); return intent === "WEDDING" ? "Gelin Arabası / Özel Gün" : intent === "RENTAL" ? "Kiralık" : intent === "SALE" ? "Satılık" : intent === "TOUR" ? "Tur" : "Genel"; }
  stateOf(campaign: CampaignRecord): string { if (this.campaignService.isLive(campaign)) return "CANLI"; const now = Date.now(); const start = campaign.startsAt ? Date.parse(campaign.startsAt) : 0; const end = campaign.endsAt ? Date.parse(campaign.endsAt) : Number.POSITIVE_INFINITY; if (campaign.publicationStatus === "ARCHIVED" || !campaign.isActive) return "PASİF"; if (start > now) return "BEKLİYOR"; if (end <= now) return "SÜRESİ DOLDU"; return campaign.publicationStatus; }
  purposeLabel(): string { return this.purpose === "WEDDING" ? "Gelin Arabası / Özel Gün" : this.purpose === "RENTAL" ? "Kiralık Araç" : this.purpose === "SALE" ? "Satılık Araç" : this.purpose === "TOUR" ? "Tur" : "Genel"; }
  liveStateLabel(): string { if (this.publicationStatus !== "PUBLISHED" || !this.isActive) return "Taslak/Pasif"; const now = Date.now(); const start = this.startsAt ? new Date(this.startsAt).getTime() : 0; const end = this.endsAt ? new Date(this.endsAt).getTime() : Number.POSITIVE_INFINITY; return start > now ? "Planlı" : end <= now ? "Süresi dolmuş" : "Canlı"; }
  private toIso(value: string): string | undefined { if (!value) return undefined; const date = new Date(value); return Number.isNaN(date.getTime()) ? undefined : date.toISOString(); }
  private toLocal(value?: string): string { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0,16); }
  private message(error: unknown): string { return error instanceof Error ? error.message : "İşlem tamamlanamadı."; }
}
