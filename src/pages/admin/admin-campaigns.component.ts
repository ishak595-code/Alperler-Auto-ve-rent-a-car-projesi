import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CampaignRecord, CampaignService } from "../../services/campaign.service";
import { CarService } from "../../services/car.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-campaigns",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-amber-400">Kampanya motoru</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">Kampanya Oluştur ve Yayınla</h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Araç, tur veya genel kampanya oluşturun. İndirim, eski-yeni fiyat, tarih aralığı, kapak, CTA ve WhatsApp mesajı bağımsız yönetilir.</p>
        </header>

        <section class="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form (ngSubmit)="save()" class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-20 xl:self-start">
            <div class="flex items-center justify-between gap-3"><div><h2 class="text-xl font-black text-slate-900">{{ editingId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya' }}</h2><p class="text-xs text-slate-500">Taslak veya doğrudan yayın</p></div>@if (editingId) { <button type="button" (click)="reset()" class="text-sm font-black text-blue-600">Yeni</button> }</div>
            <div class="mt-5 space-y-4">
              <label class="field"><span>Başlık</span><input [(ngModel)]="title" name="title" maxlength="180" required placeholder="7 Gün Kirala, 6 Gün Öde" /></label>
              <label class="field"><span>Kısa açıklama</span><textarea [(ngModel)]="shortDescription" name="shortDescription" rows="3" maxlength="500"></textarea></label>
              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Tür</span><select [(ngModel)]="campaignType" name="campaignType"><option value="DISCOUNT">İndirim</option><option value="PRICE">Fiyat</option><option value="BUNDLE">Paket</option><option value="SEASONAL">Sezonluk</option><option value="CUSTOM">Özel</option></select></label><label class="field"><span>Rozet</span><input [(ngModel)]="badge" name="badge" placeholder="FIRSAT" /></label></div>
              <label class="field"><span>Kapak görseli URL</span><input [(ngModel)]="coverImage" name="coverImage" type="url" placeholder="https://..." /></label>
              <div class="grid grid-cols-3 gap-2"><label class="field"><span>Eski fiyat</span><input [(ngModel)]="oldPrice" name="oldPrice" type="number" min="0" /></label><label class="field"><span>Yeni fiyat</span><input [(ngModel)]="newPrice" name="newPrice" type="number" min="0" /></label><label class="field"><span>% İndirim</span><input [(ngModel)]="discountPercent" name="discountPercent" type="number" min="0" max="100" /></label></div>
              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Hedef türü</span><select [(ngModel)]="targetType" name="targetType" (change)="targetId='' "><option value="GENERAL">Genel</option><option value="VEHICLE">Araç</option><option value="TOUR">Tur</option></select></label><label class="field"><span>Hedef</span><select [(ngModel)]="targetId" name="targetId" [disabled]="targetType==='GENERAL'"><option value="">Seç…</option>@for (target of availableTargets(); track target.id) { <option [value]="target.id">{{ target.label }}</option> }</select></label></div>
              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Başlangıç</span><input [(ngModel)]="startsAt" name="startsAt" type="datetime-local" /></label><label class="field"><span>Bitiş</span><input [(ngModel)]="endsAt" name="endsAt" type="datetime-local" /></label></div>
              <label class="field"><span>Buton yazısı</span><input [(ngModel)]="ctaLabel" name="ctaLabel" /></label>
              <label class="field"><span>Buton URL</span><input [(ngModel)]="ctaUrl" name="ctaUrl" placeholder="/fleet/123 veya https://..." /></label>
              <label class="field"><span>WhatsApp mesajı</span><textarea [(ngModel)]="whatsappMessage" name="whatsappMessage" rows="3" placeholder="Merhaba, bu kampanya hakkında bilgi almak istiyorum."></textarea></label>
              <div class="grid grid-cols-2 gap-3"><label class="field"><span>Yayın durumu</span><select [(ngModel)]="publicationStatus" name="publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlandı</option><option value="PUBLISHED">Yayınlandı</option><option value="ARCHIVED">Arşiv</option></select></label><label class="field"><span>Sıra</span><input [(ngModel)]="sortOrder" name="sortOrder" type="number" min="0" /></label></div>
              <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="isActive" name="isActive" /> Aktif</label>
              <button type="submit" [disabled]="saving() || !title.trim()" class="min-h-12 w-full rounded-xl bg-amber-500 font-black text-slate-950 disabled:opacity-40">{{ saving() ? 'Kaydediliyor…' : 'Kampanyayı Kaydet' }}</button>
            </div>
          </form>

          <section class="space-y-4">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><div><h2 class="text-xl font-black text-slate-900">Kampanyalar</h2><p class="text-xs text-slate-500">{{ campaigns().length }} kayıt</p></div><button type="button" (click)="refresh()" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Yenile</button></div></div>
            @for (campaign of campaigns(); track campaign.id; let i = $index) {
              <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" [class.opacity-60]="!campaign.isActive">
                <div class="grid md:grid-cols-[220px_1fr]">
                  <div class="relative min-h-44 bg-slate-900">@if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaign.title" class="absolute inset-0 h-full w-full object-cover" referrerpolicy="no-referrer" /> }<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div><span class="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black text-slate-950">{{ campaign.badge || campaign.campaignType }}</span></div>
                  <div class="p-5"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h3 class="text-xl font-black text-slate-900">{{ campaign.title }}</h3><p class="mt-1 text-sm leading-relaxed text-slate-500">{{ campaign.shortDescription || 'Açıklama yok' }}</p><div class="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase"><span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{{ campaign.publicationStatus }}</span>@if (campaign.discountPercent != null) { <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">%{{ campaign.discountPercent }} indirim</span> }@if (campaign.newPrice != null) { <span class="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{{ campaign.newPrice | number }} ₺</span> }</div></div><div class="flex gap-2"><button type="button" (click)="move(i,-1)" [disabled]="i===0" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30">↑</button><button type="button" (click)="move(i,1)" [disabled]="i===campaigns().length-1" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30">↓</button></div></div><div class="mt-5 grid grid-cols-2 gap-2"><button type="button" (click)="edit(campaign)" class="min-h-11 rounded-xl bg-slate-950 font-black text-white">Düzenle</button><button type="button" (click)="remove(campaign)" class="min-h-11 rounded-xl bg-rose-50 font-black text-rose-700">Sil</button></div></div>
                </div>
              </article>
            } @empty { <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-slate-500">Henüz kampanya yok. Soldaki formdan ilk kampanyayı oluşturabilirsiniz.</div> }
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
  readonly campaigns = this.campaignService.campaigns;
  readonly saving = signal(false);

  editingId = ""; title = ""; shortDescription = ""; badge = "FIRSAT"; campaignType: CampaignRecord["campaignType"] = "DISCOUNT"; coverImage = ""; oldPrice?: number; newPrice?: number; discountPercent?: number; targetType: NonNullable<CampaignRecord["targetType"]> = "GENERAL"; targetId = ""; ctaLabel = "Detayları Gör"; ctaUrl = ""; whatsappMessage = ""; startsAt = ""; endsAt = ""; publicationStatus: CampaignRecord["publicationStatus"] = "DRAFT"; isActive = true; sortOrder = 0;

  readonly availableTargets = computed(() => {
    if (this.targetType === "VEHICLE") return this.cars.getAllVehicles()().filter((row) => row.category !== "TOUR" && row.cloudId).map((row) => ({ id: row.cloudId!, label: `${row.brand || ''} ${row.model || ''} · ${row.category}`.trim() }));
    if (this.targetType === "TOUR") return this.cars.getTours()().filter((row) => row.cloudId).map((row) => ({ id: row.cloudId!, label: row.title || String(row.id) }));
    return [];
  });

  ngOnInit(): void { void this.refresh(); }
  async refresh(): Promise<void> { try { await this.campaignService.refreshAdmin(); } catch (error) { this.toast.show(this.message(error), "error"); } }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.campaignService.save({ id: this.editingId || undefined, title: this.title, campaignType: this.campaignType, shortDescription: this.shortDescription || undefined, badge: this.badge || undefined, coverImage: this.coverImage || undefined, oldPrice: this.oldPrice, newPrice: this.newPrice, discountPercent: this.discountPercent, targetType: this.targetType, targetId: this.targetType === "GENERAL" ? undefined : this.targetId || undefined, ctaLabel: this.ctaLabel, ctaUrl: this.ctaUrl || undefined, whatsappMessage: this.whatsappMessage || undefined, startsAt: this.toIso(this.startsAt), endsAt: this.toIso(this.endsAt), publicationStatus: this.publicationStatus, isActive: this.isActive, sortOrder: this.sortOrder, metadata: {} });
      this.reset(); this.toast.show("Kampanya kaydedildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.saving.set(false); }
  }

  edit(campaign: CampaignRecord): void { this.editingId = campaign.id; this.title = campaign.title; this.shortDescription = campaign.shortDescription || ""; this.badge = campaign.badge || ""; this.campaignType = campaign.campaignType; this.coverImage = campaign.coverImage || ""; this.oldPrice = campaign.oldPrice; this.newPrice = campaign.newPrice; this.discountPercent = campaign.discountPercent; this.targetType = campaign.targetType || "GENERAL"; this.targetId = campaign.targetId || ""; this.ctaLabel = campaign.ctaLabel; this.ctaUrl = campaign.ctaUrl || ""; this.whatsappMessage = campaign.whatsappMessage || ""; this.startsAt = this.toLocal(campaign.startsAt); this.endsAt = this.toLocal(campaign.endsAt); this.publicationStatus = campaign.publicationStatus; this.isActive = campaign.isActive; this.sortOrder = campaign.sortOrder; window.scrollTo({ top: 0, behavior: "smooth" }); }
  reset(): void { this.editingId = ""; this.title = ""; this.shortDescription = ""; this.badge = "FIRSAT"; this.campaignType = "DISCOUNT"; this.coverImage = ""; this.oldPrice = undefined; this.newPrice = undefined; this.discountPercent = undefined; this.targetType = "GENERAL"; this.targetId = ""; this.ctaLabel = "Detayları Gör"; this.ctaUrl = ""; this.whatsappMessage = ""; this.startsAt = ""; this.endsAt = ""; this.publicationStatus = "DRAFT"; this.isActive = true; this.sortOrder = this.campaigns().length + 1; }
  async remove(campaign: CampaignRecord): Promise<void> { try { await this.campaignService.remove(campaign.id); this.toast.show("Kampanya silindi.", "info"); } catch (error) { this.toast.show(this.message(error), "error"); } }
  async move(index: number, delta: number): Promise<void> { const rows = [...this.campaigns()]; const target = index + delta; if (target < 0 || target >= rows.length) return; [rows[index], rows[target]] = [rows[target], rows[index]]; try { await this.campaignService.reorder(rows.map((row) => row.id)); } catch (error) { this.toast.show(this.message(error), "error"); } }
  private toIso(value: string): string | undefined { return value ? new Date(value).toISOString() : undefined; }
  private toLocal(value?: string): string { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0,16); }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Kampanya işlemi tamamlanamadı."; }
}
