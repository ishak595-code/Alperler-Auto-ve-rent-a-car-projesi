import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-home-campaign-showcase",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (campaigns().length) {
      <section class="relative overflow-hidden bg-slate-950 py-16 sm:py-20" aria-labelledby="campaign-showcase-title">
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div class="campaign-glow campaign-glow-one"></div>
          <div class="campaign-glow campaign-glow-two"></div>
          <div class="campaign-grid"></div>
        </div>

        <div class="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div class="mx-auto mb-10 max-w-3xl text-center">
            <span class="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.18em] text-amber-300">
              <mat-icon class="!h-4 !w-4 !text-[16px]">bolt</mat-icon>
              {{ campaigns().length }} Canlı Fırsat
            </span>
            <h2 id="campaign-showcase-title" class="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Kaçırılmayacak fırsatlar, gerçek bitiş zamanı</h2>
            <p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Eski fiyat, kampanyalı fiyat, gerçek indirim oranı ve kalan süre açıkça gösterilir. İndirim bilgisi olmayan kampanyada sahte yüzde kullanılmaz.</p>
          </div>

          <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            @for (campaign of campaigns(); track campaign.id; let i = $index) {
              <article class="campaign-card group relative flex min-h-[590px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-2xl transition-transform duration-300 hover:-translate-y-2 focus-within:ring-4 focus-within:ring-blue-400/40" [style.animation-delay.ms]="i * 90">
                <div class="relative h-56 overflow-hidden bg-slate-800">
                  @if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaign.title" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" referrerpolicy="no-referrer" /> }
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent"></div>
                  <div class="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                    <div class="flex max-w-[70%] flex-wrap gap-1.5">
                      <span class="rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-lg">{{ campaign.badge || 'KAMPANYA' }}</span>
                      @if (discountPercent(campaign); as percent) { <span class="rounded-full bg-rose-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg">%{{ percent }} İNDİRİM</span> }
                    </div>
                    @if (countdown(campaign); as remaining) {
                      <span class="countdown-chip rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur" [class.countdown-urgent]="isUrgent(campaign)" [attr.aria-label]="'Kampanyanın bitmesine ' + remaining">{{ remaining }}</span>
                    }
                  </div>
                  <div class="absolute bottom-4 left-4 right-4">
                    <p class="text-[10px] font-black uppercase tracking-[.15em] text-amber-300">{{ urgencyLabel(campaign) }} · {{ intentLabel(campaign) }}</p>
                    <h3 class="mt-1 text-xl font-black leading-tight text-white">{{ campaign.title }}</h3>
                  </div>
                </div>

                <div class="flex flex-1 flex-col p-5">
                  @if (imageCredit(campaign)) {
                    <div class="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                      <span>{{ isRepresentative(campaign) ? 'Temsili model görseli' : 'Doğrulanmış rota görseli' }}</span><span aria-hidden="true">•</span>
                      @if (imageSourceUrl(campaign)) { <a [href]="imageSourceUrl(campaign)" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ imageCredit(campaign) }}</a> } @else { <span>{{ imageCredit(campaign) }}</span> }
                    </div>
                  }

                  <p class="text-sm leading-relaxed text-slate-600">{{ campaign.shortDescription }}</p>
                  <div class="mt-5 space-y-2.5">@for (benefit of benefits(campaign); track benefit) { <div class="flex items-start gap-2.5 text-sm font-bold text-slate-800"><span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true"><mat-icon class="!h-3.5 !w-3.5 !text-[14px]">check</mat-icon></span><span>{{ benefit }}</span></div> }</div>

                  <div class="mt-6 rounded-2xl bg-slate-50 p-4">
                    @if (hasDiscount(campaign)) {
                      <div class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                        <div><p class="text-[9px] font-black uppercase tracking-wider text-rose-500">Kampanya indirimi</p><p class="text-sm font-black text-rose-700">%{{ discountPercent(campaign) }} daha avantajlı</p></div>
                        <div class="text-right"><p class="text-[9px] font-black uppercase tracking-wider text-rose-500">Kazancınız</p><p class="text-sm font-black text-rose-700">{{ formatPrice(savingsAmount(campaign)) }}</p></div>
                      </div>
                    }
                    <div class="flex items-end justify-between gap-3">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{{ priceLabel(campaign) }}</p>
                        @if (hasDiscount(campaign)) { <p class="mt-1 text-sm font-bold text-slate-400 line-through">{{ formatPrice(campaign.oldPrice) }}</p> }
                        <p class="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{{ formatPrice(campaign.newPrice) }}</p>
                      </div>
                      <span class="rounded-xl bg-white px-3 py-2 text-right text-[10px] font-black leading-tight text-slate-500 shadow-sm">{{ priceSuffix(campaign) }}</span>
                    </div>
                    @if (!hasDiscount(campaign)) { <p class="mt-2 text-[10px] font-bold text-slate-400">Bu kampanyada doğrulanmış eski fiyat girilmediği için indirim yüzdesi gösterilmiyor.</p> }
                    @if (campaign.endsAt) { <p class="mt-3 border-t border-slate-200 pt-3 text-[11px] font-bold text-slate-500">{{ formatDate(campaign.endsAt) }} tarihine kadar, stok ve uygunluk koşullarına bağlı.</p> }
                  </div>

                  <p class="mt-4 text-[11px] font-bold leading-relaxed text-slate-400">{{ trustLine(campaign) }}</p>
                  <div class="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5">
                    <button type="button" (click)="openCampaign(campaign)" class="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30">{{ campaign.ctaLabel || 'Detayları Gör' }}</button>
                    <button type="button" (click)="openWhatsapp(campaign)" class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30" [attr.aria-label]="campaign.title + ' için WhatsApp ile bilgi al'"><mat-icon>chat</mat-icon></button>
                  </div>
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block}.campaign-card{animation:campaign-enter .55s cubic-bezier(.2,.8,.2,1) both}.campaign-glow{position:absolute;border-radius:9999px;filter:blur(70px);opacity:.24}.campaign-glow-one{width:28rem;height:28rem;background:#2563eb;left:-10rem;top:-9rem}.campaign-glow-two{width:26rem;height:26rem;background:#f59e0b;right:-9rem;bottom:-11rem}.campaign-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,black,transparent)}.countdown-chip{font-variant-numeric:tabular-nums}.countdown-urgent{background:#be123c!important;border-color:#fb7185!important;box-shadow:0 0 0 1px rgba(251,113,133,.22),0 8px 20px rgba(190,18,60,.28)}@keyframes campaign-enter{from{opacity:0;transform:translateY(22px) scale(.985)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.campaign-card{animation:none!important;transition:none!important}.campaign-card img{transition:none!important}}
  `],
})
export class HomeCampaignShowcaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly campaignService = inject(CampaignService);
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly campaigns = signal<CampaignRecord[]>([]);
  readonly now = signal(Date.now());
  private legacyContainer?: HTMLElement;
  private viewReady = false;
  private clockId?: ReturnType<typeof setInterval>;
  private refreshId?: ReturnType<typeof setInterval>;

  ngOnInit(): void { void this.load(); this.clockId = setInterval(() => { const current = Date.now(); this.now.set(current); this.campaigns.update((rows) => rows.filter((campaign) => this.campaignService.isLive(campaign, current))); }, 1_000); this.refreshId = setInterval(() => void this.load(), 60_000); }
  ngAfterViewInit(): void { this.viewReady = true; this.relocateWhenReady(); }
  ngOnDestroy(): void { if (this.clockId) clearInterval(this.clockId); if (this.refreshId) clearInterval(this.refreshId); if (this.legacyContainer) this.legacyContainer.style.removeProperty("display"); }

  benefits(campaign: CampaignRecord): string[] { const raw = campaign.metadata?.["benefits"]; return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string").slice(0, 3) : []; }
  trustLine(campaign: CampaignRecord): string { return typeof campaign.metadata?.["trustLine"] === "string" ? campaign.metadata["trustLine"] as string : "Şeffaf fiyat • Hızlı talep • Açık koşullar"; }
  imageCredit(campaign: CampaignRecord): string { const attribution = typeof campaign.metadata?.["imageAttribution"] === "string" ? campaign.metadata["imageAttribution"] as string : ""; const license = typeof campaign.metadata?.["imageLicense"] === "string" ? campaign.metadata["imageLicense"] as string : ""; return [attribution, license].filter(Boolean).join(" • "); }
  imageSourceUrl(campaign: CampaignRecord): string { return typeof campaign.metadata?.["imageSourceUrl"] === "string" ? campaign.metadata["imageSourceUrl"] as string : ""; }
  isRepresentative(campaign: CampaignRecord): boolean { return campaign.metadata?.["representativeImage"] === true; }
  intentLabel(campaign: CampaignRecord): string { const intent = this.campaignService.intentOf(campaign); if (intent === "WEDDING") return "Özel gün paketi"; if (intent === "RENTAL") return "Kiralama fırsatı"; if (intent === "SALE") return "Satın alma fırsatı"; if (intent === "TOUR") return "Tur fırsatı"; return "Seçilmiş fırsat"; }
  priceLabel(campaign: CampaignRecord): string { const custom = campaign.metadata?.["priceLabel"]; return typeof custom === "string" && custom.trim() ? custom : "Kampanyalı fiyat"; }
  priceSuffix(campaign: CampaignRecord): string { const custom = campaign.metadata?.["priceSuffix"]; if (typeof custom === "string" && custom.trim()) return custom; const intent = this.campaignService.intentOf(campaign); if (intent === "WEDDING") return "paket"; if (intent === "RENTAL") return "günlük"; if (intent === "TOUR") return "kişi başı"; return "satış fiyatı"; }
  formatPrice(value?: number): string { if (value == null) return "Teklif Al"; return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
  formatDate(value: string): string { return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(value)); }

  hasDiscount(campaign: CampaignRecord): boolean { return typeof campaign.oldPrice === "number" && typeof campaign.newPrice === "number" && campaign.oldPrice > campaign.newPrice && campaign.newPrice >= 0; }
  discountPercent(campaign: CampaignRecord): number | null { if (!this.hasDiscount(campaign)) return null; return Math.max(1, Math.round(((campaign.oldPrice! - campaign.newPrice!) / campaign.oldPrice!) * 100)); }
  savingsAmount(campaign: CampaignRecord): number | undefined { return this.hasDiscount(campaign) ? Math.max(0, campaign.oldPrice! - campaign.newPrice!) : undefined; }
  urgencyLabel(campaign: CampaignRecord): string { const ms = this.campaignService.remainingMs(campaign, this.now()); if (ms == null) return "SINIRLI FIRSAT"; if (ms <= 6 * 60 * 60 * 1_000) return "SON SAATLER"; if (ms <= 24 * 60 * 60 * 1_000) return "SON 24 SAAT"; if (ms <= 72 * 60 * 60 * 1_000) return "SON GÜNLER"; return "SINIRLI SÜRE"; }
  countdown(campaign: CampaignRecord): string | null { const ms = this.campaignService.remainingMs(campaign, this.now()); if (ms == null || ms <= 0) return null; const totalSeconds = Math.floor(ms / 1_000); const days = Math.floor(totalSeconds / 86_400); const hours = Math.floor((totalSeconds % 86_400) / 3_600); const minutes = Math.floor((totalSeconds % 3_600) / 60); const seconds = totalSeconds % 60; if (days > 0) return `${days}g ${String(hours).padStart(2, "0")}s`; if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; }
  isUrgent(campaign: CampaignRecord): boolean { const ms = this.campaignService.remainingMs(campaign, this.now()); return ms != null && ms > 0 && ms <= 72 * 60 * 60 * 1_000; }

  openCampaign(campaign: CampaignRecord): void { const url = campaign.ctaUrl?.trim(); if (!url) return; if (/^https?:\/\//i.test(url)) { window.open(url, "_blank", "noopener,noreferrer"); return; } void this.router.navigateByUrl(url.startsWith("/") ? url : `/${url}`); }
  openWhatsapp(campaign: CampaignRecord): void { if (typeof window === "undefined") return; const config = this.carService.getConfig()(); const number = String(config.whatsapp || config.phone || "").replace(/\D/g, ""); if (!number) return; const username = typeof config.whatsappUsername === "string" && config.whatsappUsername.trim() ? `\nWhatsApp kullanıcı adı: @${config.whatsappUsername.trim().replace(/^@/, "")}` : ""; const message = campaign.whatsappMessage?.trim() || `${campaign.title} hakkında bilgi almak istiyorum.`; window.open(`https://wa.me/${number}?text=${encodeURIComponent(message + username)}`, "_blank", "noopener,noreferrer"); }
  private async load(): Promise<void> { try { const rows = await this.campaignService.loadPublic(); this.campaigns.set(this.selectShowcase(rows)); this.relocateWhenReady(); } catch { this.campaigns.set([]); } }
  private selectShowcase(rows: CampaignRecord[]): CampaignRecord[] { const preferred = ["WEDDING", "RENTAL", "SALE", "TOUR"] as const; const selected: CampaignRecord[] = []; for (const intent of preferred) { const match = rows.find((campaign) => this.campaignService.intentOf(campaign) === intent && !selected.some((item) => item.id === campaign.id)); if (match) selected.push(match); } for (const campaign of rows) { if (selected.length >= 4) break; if (!selected.some((item) => item.id === campaign.id)) selected.push(campaign); } return selected.slice(0, 4); }
  private relocateWhenReady(): void { if (!this.viewReady || this.campaigns().length === 0 || typeof document === "undefined") return; requestAnimationFrame(() => { const marker = document.getElementById("recommended-cars"); if (!marker) return; const legacy = marker.closest("div.max-w-7xl") as HTMLElement | null; if (!legacy || legacy === this.host.nativeElement) return; const parent = legacy.parentElement; if (!parent) return; this.legacyContainer = legacy; legacy.style.display = "none"; parent.insertBefore(this.host.nativeElement, legacy); }); }
}
