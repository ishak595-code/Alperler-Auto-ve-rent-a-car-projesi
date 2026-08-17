import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CampaignRecord, CampaignService } from "../../services/campaign.service";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";
import { AdminMediaService } from "../../services/admin-media.service";

@Component({
  selector: "app-admin-campaigns",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">Kampanya ve dönüşüm merkezi</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">Kampanyayı Buradan Yönet, Ana Sayfada Anında Yayınla</h1>
          <p class="mt-2 max-w-4xl text-sm leading-relaxed text-slate-300">Aktif ve “Yayınlandı” durumundaki kampanyalar tek Supabase kaynağından okunur. Sıralamadaki ilk 3 kampanya ana sayfa vitrinine otomatik bağlanır. Yeni kampanya ekleme, metin, görsel, fiyat, gerçek bitiş süresi, CTA ve WhatsApp mesajı burada yönetilir.</p>
          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><div class="text-[10px] font-black uppercase tracking-wider text-slate-400">Yayındaki kampanya</div><div class="mt-1 text-2xl font-black">{{ publishedCampaigns().length }}</div></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><div class="text-[10px] font-black uppercase tracking-wider text-slate-400">Ana sayfa vitrini</div><div class="mt-1 text-2xl font-black">{{ homepageCampaigns().length }} / 3</div></div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4"><div class="text-[10px] font-black uppercase tracking-wider text-slate-400">Tek kaynak</div><div class="mt-1 text-sm font-black text-emerald-300">Admin → Supabase → Ana sayfa</div></div>
          </div>
        </header>

        <section class="grid gap-5 xl:grid-cols-[430px_1fr]">
          <form (ngSubmit)="save()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-20 xl:self-start">
            <div class="flex items-center justify-between gap-3">
              <div><h2 class="text-xl font-black text-slate-900">{{ editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya' }}</h2><p class="text-xs text-slate-500">Müşterinin göreceği vitrin içeriğini hazırlayın.</p></div>
              @if (editingId) { <button type="button" (click)="reset()" class="min-h-10 rounded-lg px-3 text-sm font-black text-blue-700">Yeni</button> }
            </div>

            <div class="mt-5 space-y-4">
              <label class="field"><span>Kampanya başlığı</span><input [(ngModel)]="title" name="title" maxlength="180" required placeholder="7 Gün Kirala, 6 Gün Öde" /></label>
              <label class="field"><span>Ana pazarlama mesajı</span><textarea [(ngModel)]="shortDescription" name="shortDescription" rows="3" maxlength="500" placeholder="Müşterinin neden şimdi değerlendirmesi gerektiğini tek paragrafta anlatın."></textarea></label>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Kampanya türü</span><select [(ngModel)]="campaignType" name="campaignType"><option value="DISCOUNT">İndirim</option><option value="PRICE">Fiyat</option><option value="BUNDLE">Paket</option><option value="SEASONAL">Sezonluk</option><option value="CUSTOM">Özel</option></select></label>
                <label class="field"><span>Vitrin rozeti</span><input [(ngModel)]="badge" name="badge" placeholder="7 GÜNDE 1 GÜN BİZDEN" /></label>
              </div>

              <div class="field"><span>Kapak görseli</span><input [(ngModel)]="coverImage" name="coverImage" type="url" placeholder="https://..." aria-label="Kampanya kapak görseli URL adresi" />
                <label class="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-800">Dosya Seç
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="onCampaignCoverSelected($event)" aria-label="Kampanya kapak görseli dosyası seç" />
                </label>
                @if (coverImage) { <img [src]="coverImage" alt="Kampanya kapak önizlemesi" class="mt-2 aspect-video w-full rounded-xl object-cover" /> }
              </div>

              <div class="grid grid-cols-3 gap-2">
                <label class="field"><span>Eski fiyat</span><input [(ngModel)]="oldPrice" name="oldPrice" type="number" min="0" /></label>
                <label class="field"><span>Yeni fiyat</span><input [(ngModel)]="newPrice" name="newPrice" type="number" min="0" /></label>
                <label class="field"><span>% İndirim</span><input [(ngModel)]="discountPercent" name="discountPercent" type="number" min="0" max="100" /></label>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Fiyat etiketi</span><input [(ngModel)]="priceLabel" name="priceLabel" placeholder="Kampanya fiyatı" /></label>
                <label class="field"><span>Fiyat birimi</span><input [(ngModel)]="priceSuffix" name="priceSuffix" placeholder="7 günlük paket / kişi başı" /></label>
              </div>

              <fieldset class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <legend class="px-2 text-[11px] font-black uppercase tracking-wider text-slate-600">Müşteriyi ikna eden gerçek avantajlar</legend>
                <div class="space-y-3">
                  <label class="field"><span>Avantaj 1</span><input [(ngModel)]="benefit1" name="benefit1" placeholder="7 gün kullanım, 6 gün ücret" /></label>
                  <label class="field"><span>Avantaj 2</span><input [(ngModel)]="benefit2" name="benefit2" placeholder="Net 2.800 TL avantaj" /></label>
                  <label class="field"><span>Avantaj 3</span><input [(ngModel)]="benefit3" name="benefit3" placeholder="31 Ekim 2026’ya kadar geçerli" /></label>
                </div>
              </fieldset>

              <label class="field"><span>Güven cümlesi</span><input [(ngModel)]="trustLine" name="trustLine" maxlength="220" placeholder="Şeffaf fiyat • Araç müsaitliğine tabi • Gizli ücret yok" /></label>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Hedef türü</span><select [(ngModel)]="targetType" name="targetType" (change)="targetId='' "><option value="GENERAL">Genel</option><option value="VEHICLE">Araç</option><option value="TOUR">Tur</option></select></label>
                <label class="field"><span>Hedef kayıt</span><select [(ngModel)]="targetId" name="targetId" [disabled]="targetType==='GENERAL'"><option value="">Seç…</option>@for (target of availableTargets(); track target.id) { <option [value]="target.id">{{ target.label }}</option> }</select></label>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Başlangıç</span><input [(ngModel)]="startsAt" name="startsAt" type="datetime-local" aria-label="Kampanya başlangıç tarihi ve saati" /></label>
                <label class="field"><span>Bitiş ve gerçek sayaç</span><input [(ngModel)]="endsAt" name="endsAt" type="datetime-local" aria-label="Kampanya bitiş tarihi ve saati" /></label>
              </div>
              <p class="-mt-2 text-[11px] leading-relaxed text-slate-500">Bitiş tarihi girildiğinde ana sayfadaki sayaç bu gerçek tarihten hesaplanır. Manuel veya uydurma sayaç kullanılmaz.</p>

              <label class="field"><span>Ana CTA butonu</span><input [(ngModel)]="ctaLabel" name="ctaLabel" placeholder="Fırsatı İncele" /></label>
              <label class="field"><span>Buton URL</span><input [(ngModel)]="ctaUrl" name="ctaUrl" placeholder="/fleet/1004 veya /tour/3001" /></label>
              <label class="field"><span>WhatsApp dönüşüm mesajı</span><textarea [(ngModel)]="whatsappMessage" name="whatsappMessage" rows="3" placeholder="Merhaba, bu kampanyadan yararlanmak istiyorum. Uygunluk bilgisini paylaşabilir misiniz?"></textarea></label>

              <div class="grid grid-cols-2 gap-3">
                <label class="field"><span>Yayın durumu</span><select [(ngModel)]="publicationStatus" name="publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label>
                <label class="field"><span>Vitrin sırası</span><input [(ngModel)]="sortOrder" name="sortOrder" type="number" min="0" /></label>
              </div>
              <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="isActive" name="isActive" /> Kampanya aktif</label>

              <div class="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-relaxed text-blue-900">Ana sayfada görünmesi için kampanya hem <strong>Aktif</strong> hem de <strong>Yayınlandı</strong> olmalı. Bu koşulu sağlayan ilk 3 kayıt, buradaki sırasıyla vitrine çıkar.</div>
              <button type="submit" [disabled]="saving() || !title.trim()" class="min-h-12 w-full rounded-xl bg-amber-500 font-black text-slate-950 shadow-lg shadow-amber-200 disabled:opacity-40">{{ saving() ? 'Kaydediliyor…' : editingId ? 'Değişiklikleri Yayınla' : 'Kampanyayı Kaydet' }}</button>
            </div>
          </form>

          <section class="space-y-4">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div><h2 class="text-xl font-black text-slate-900">Kampanyalar ve Ana Sayfa Sırası</h2><p class="mt-1 text-xs text-slate-500">Yukarı ve aşağı düğmeleri ana sayfa sırasını da otomatik günceller.</p></div>
                <button type="button" (click)="refresh()" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Yenile</button>
              </div>
            </div>

            @for (campaign of campaigns(); track campaign.id; let i = $index) {
              <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" [class.opacity-60]="!campaign.isActive">
                <div class="grid md:grid-cols-[220px_1fr]">
                  <div class="relative min-h-48 bg-slate-900">
                    @if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaign.title" class="absolute inset-0 h-full w-full object-cover" referrerpolicy="no-referrer" /> }
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
                    <span class="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black text-slate-950">{{ campaign.badge || campaign.campaignType }}</span>
                    @if (homepagePosition(campaign); as position) {
                      <span class="absolute bottom-3 left-3 rounded-full border border-emerald-300/30 bg-emerald-500/90 px-3 py-1 text-[10px] font-black text-white">ANA SAYFA #{{ position }}</span>
                    }
                  </div>

                  <div class="p-5">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div class="min-w-0 flex-1">
                        <h3 class="text-xl font-black text-slate-900">{{ campaign.title }}</h3>
                        <p class="mt-1 text-sm leading-relaxed text-slate-500">{{ campaign.shortDescription || 'Müşteri açıklaması henüz girilmedi.' }}</p>
                        <div class="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                          <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{{ campaign.publicationStatus }}</span>
                          @if (campaign.discountPercent != null) { <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">%{{ campaign.discountPercent }} avantaj</span> }
                          @if (campaign.newPrice != null) { <span class="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{{ campaign.newPrice | number }} ₺</span> }
                          @if (campaign.endsAt) { <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{{ countdownLabel(campaign) }}</span> }
                        </div>
                        @if (benefitsOf(campaign).length) {
                          <div class="mt-4 grid gap-2 sm:grid-cols-3">
                            @for (benefit of benefitsOf(campaign); track benefit) { <div class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">✓ {{ benefit }}</div> }
                          </div>
                        }
                      </div>
                      <div class="flex gap-2">
                        <button type="button" (click)="move(i,-1)" [disabled]="i===0" class="h-11 w-11 rounded-xl border border-slate-200 font-black disabled:opacity-30" aria-label="Kampanyayı bir sıra yukarı taşı">↑</button>
                        <button type="button" (click)="move(i,1)" [disabled]="i===campaigns().length-1" class="h-11 w-11 rounded-xl border border-slate-200 font-black disabled:opacity-30" aria-label="Kampanyayı bir sıra aşağı taşı">↓</button>
                      </div>
                    </div>
                    <div class="mt-5 grid grid-cols-2 gap-2">
                      <button type="button" (click)="edit(campaign)" class="min-h-11 rounded-xl bg-slate-950 font-black text-white">Düzenle</button>
                      <button type="button" (click)="remove(campaign)" class="min-h-11 rounded-xl bg-rose-50 font-black text-rose-700">Sil</button>
                    </div>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-slate-500">Henüz kampanya yok. Soldaki formdan ilk kampanyayı oluşturabilirsiniz.</div>
            }
          </section>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select,.field textarea{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;color:rgb(15 23 42);outline:none}.field textarea{min-height:78px}.field input:focus,.field select:focus,.field textarea:focus{border-color:rgb(245 158 11);box-shadow:0 0 0 2px rgb(245 158 11/.15)}
  `],
})
export class AdminCampaignsComponent implements OnInit {
  private readonly campaignService = inject(CampaignService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  private readonly adminMedia = inject(AdminMediaService);
  readonly campaigns = this.campaignService.campaigns;
  readonly saving = signal(false);

  editingId = "";
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
  ctaLabel = "Fırsatı İncele";
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
  trustLine = "Şeffaf fiyat • Açık koşullar • Hızlı destek";
  priceLabel = "Kampanya fiyatı";
  priceSuffix = "";
  private editingMetadata: Record<string, unknown> = {};

  readonly publishedCampaigns = computed(() => this.campaigns().filter((row) => row.isActive && row.publicationStatus === "PUBLISHED"));
  readonly homepageCampaigns = computed(() => [...this.publishedCampaigns()].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3));

  readonly availableTargets = computed(() => {
    if (this.targetType === "VEHICLE") return this.cars.getAllVehicles()().filter((row) => row.category !== "TOUR" && row.cloudId).map((row) => ({ id: row.cloudId!, label: `${row.brand || ""} ${row.model || ""} · ${row.category}`.trim() }));
    if (this.targetType === "TOUR") return this.cars.getTours()().filter((row) => row.cloudId).map((row) => ({ id: row.cloudId!, label: row.title || String(row.id) }));
    return [];
  });

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    try { await this.campaignService.refreshAdmin(); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const benefits = [this.benefit1, this.benefit2, this.benefit3].map((value) => value.trim()).filter(Boolean);
      await this.campaignService.save({
        id: this.editingId || undefined,
        title: this.title,
        campaignType: this.campaignType,
        shortDescription: this.shortDescription || undefined,
        badge: this.badge || undefined,
        coverImage: this.coverImage || undefined,
        oldPrice: this.oldPrice,
        newPrice: this.newPrice,
        discountPercent: this.discountPercent,
        targetType: this.targetType,
        targetId: this.targetType === "GENERAL" ? undefined : this.targetId || undefined,
        ctaLabel: this.ctaLabel,
        ctaUrl: this.ctaUrl || undefined,
        whatsappMessage: this.whatsappMessage || undefined,
        startsAt: this.toIso(this.startsAt),
        endsAt: this.toIso(this.endsAt),
        publicationStatus: this.publicationStatus,
        isActive: this.isActive,
        sortOrder: this.sortOrder,
        metadata: {
          ...this.editingMetadata,
          benefits,
          trustLine: this.trustLine.trim(),
          priceLabel: this.priceLabel.trim(),
          priceSuffix: this.priceSuffix.trim(),
        },
      });
      this.reset();
      this.toast.show("Kampanya ve ana sayfa vitrini güncellendi.", "success");
    } catch (error) {
      this.toast.show(this.message(error), "error");
    } finally {
      this.saving.set(false);
    }
  }

  async onCampaignCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const entityId = this.editingId || `draft-${Date.now()}`;
      const uploaded = await this.adminMedia.uploadImage(file, "CAMPAIGN", entityId, "cover");
      this.coverImage = uploaded.publicUrl;
      this.toast.show("Kampanya görseli Supabase Storage'a yüklendi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { input.value = ""; }
  }

  edit(campaign: CampaignRecord): void {
    const benefits = this.benefitsOf(campaign);
    this.editingId = campaign.id;
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
    this.benefit1 = benefits[0] || "";
    this.benefit2 = benefits[1] || "";
    this.benefit3 = benefits[2] || "";
    this.trustLine = typeof campaign.metadata?.["trustLine"] === "string" ? String(campaign.metadata["trustLine"]) : "";
    this.priceLabel = typeof campaign.metadata?.["priceLabel"] === "string" ? String(campaign.metadata["priceLabel"]) : "Kampanya fiyatı";
    this.priceSuffix = typeof campaign.metadata?.["priceSuffix"] === "string" ? String(campaign.metadata["priceSuffix"]) : "";
    this.editingMetadata = { ...(campaign.metadata || {}) };
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  reset(): void {
    this.editingId = "";
    this.title = "";
    this.shortDescription = "";
    this.badge = "FIRSAT";
    this.campaignType = "DISCOUNT";
    this.coverImage = "";
    this.oldPrice = undefined;
    this.newPrice = undefined;
    this.discountPercent = undefined;
    this.targetType = "GENERAL";
    this.targetId = "";
    this.ctaLabel = "Fırsatı İncele";
    this.ctaUrl = "";
    this.whatsappMessage = "";
    this.startsAt = "";
    this.endsAt = "";
    this.publicationStatus = "DRAFT";
    this.isActive = true;
    this.sortOrder = this.campaigns().length + 1;
    this.benefit1 = "";
    this.benefit2 = "";
    this.benefit3 = "";
    this.trustLine = "Şeffaf fiyat • Açık koşullar • Hızlı destek";
    this.priceLabel = "Kampanya fiyatı";
    this.priceSuffix = "";
    this.editingMetadata = {};
  }

  async remove(campaign: CampaignRecord): Promise<void> {
    try {
      await this.campaignService.remove(campaign.id);
      this.toast.show("Kampanya silindi ve ana sayfa sırası güncellendi.", "info");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async move(index: number, delta: number): Promise<void> {
    const rows = [...this.campaigns()];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    try {
      await this.campaignService.reorder(rows.map((row) => row.id));
      this.toast.show("Kampanya sırası ve ana sayfa vitrini güncellendi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  homepagePosition(campaign: CampaignRecord): number | null {
    const index = this.homepageCampaigns().findIndex((row) => row.id === campaign.id);
    return index >= 0 ? index + 1 : null;
  }

  benefitsOf(campaign: CampaignRecord): string[] {
    const raw = campaign.metadata?.["benefits"];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3) : [];
  }

  countdownLabel(campaign: CampaignRecord): string {
    if (!campaign.endsAt) return "Süre sınırı yok";
    const remaining = new Date(campaign.endsAt).getTime() - Date.now();
    if (remaining <= 0) return "Süresi doldu";
    const totalHours = Math.floor(remaining / 3_600_000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return days > 0 ? `${days} gün ${hours} saat kaldı` : `${Math.max(1, hours)} saat kaldı`;
  }

  private toIso(value: string): string | undefined { return value ? new Date(value).toISOString() : undefined; }
  private toLocal(value?: string): string { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Kampanya işlemi tamamlanamadı."; }
}
