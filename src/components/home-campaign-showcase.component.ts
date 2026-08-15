import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
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
      <section class="relative overflow-hidden bg-slate-950 py-14 sm:py-18 lg:py-20" aria-labelledby="campaign-showcase-title">
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div class="campaign-glow campaign-glow-one"></div>
          <div class="campaign-glow campaign-glow-two"></div>
          <div class="campaign-grid-bg"></div>
        </div>

        <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto mb-9 max-w-3xl text-center sm:mb-11">
            <span class="inline-flex min-h-9 items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.18em] text-amber-300">
              <mat-icon class="!h-4 !w-4 !text-[16px]" aria-hidden="true">bolt</mat-icon>
              Seçilmiş Fırsatlar
            </span>
            <h2 id="campaign-showcase-title" class="mt-5 text-balance font-serif text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Avantajı kaçırmadan size uygun fırsatı seçin
            </h2>
            <p class="mx-auto mt-4 max-w-2xl text-pretty text-sm font-medium leading-7 text-slate-300 sm:text-base">
              Kiralama, özel gün ve Cilo tur fırsatlarında fiyatı, kazancınızı ve kalan süreyi tek bakışta görün. Karar vermeden önce tüm temel koşullar açıkça önünüzde.
            </p>
          </div>

          <div class="grid gap-5 md:grid-cols-3 lg:gap-6">
            @for (campaign of campaigns(); track campaign.id; let i = $index) {
              <article
                class="campaign-card group relative flex min-h-[570px] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-2xl transition-transform duration-300 hover:-translate-y-2 focus-within:ring-4 focus-within:ring-blue-400/40"
                [style.animation-delay.ms]="i * 110"
              >
                <div class="relative h-56 overflow-hidden bg-slate-800 sm:h-60">
                  @if (campaign.coverImage) {
                    <img [src]="campaign.coverImage" [alt]="imageAlt(campaign)" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" referrerpolicy="no-referrer" loading="lazy" />
                  }
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                  <div class="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                    <span class="max-w-[72%] rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-lg">{{ campaign.badge || 'KAMPANYA' }}</span>
                    @if (campaign.endsAt) {
                      <span class="rounded-full border border-white/20 bg-slate-950/82 px-3 py-1.5 text-[10px] font-black text-white shadow-lg backdrop-blur" [attr.aria-label]="'Kampanyanın bitmesine ' + countdownLabel(campaign)">
                        {{ countdownLabel(campaign) }}
                      </span>
                    }
                  </div>
                  <div class="absolute bottom-4 left-4 right-4">
                    <p class="text-[10px] font-black uppercase tracking-[.15em] text-amber-300">{{ intentLabel(campaign) }}</p>
                    <h3 class="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">{{ campaign.title }}</h3>
                  </div>
                </div>

                <div class="flex flex-1 flex-col p-5 sm:p-6">
                  @if (imageCredit(campaign)) {
                    <div class="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                      <span>{{ isRepresentative(campaign) ? 'Temsili model görseli' : 'Doğrulanmış rota görseli' }}</span>
                      <span aria-hidden="true">•</span>
                      @if (imageSourceUrl(campaign)) {
                        <a [href]="imageSourceUrl(campaign)" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ imageCredit(campaign) }}</a>
                      } @else {
                        <span>{{ imageCredit(campaign) }}</span>
                      }
                    </div>
                  }

                  <p class="text-sm font-medium leading-6 text-slate-600">{{ campaign.shortDescription || campaign.description || 'Fırsat ayrıntılarını inceleyin.' }}</p>

                  @if (benefits(campaign).length) {
                    <div class="mt-5 space-y-2.5">
                      @for (benefit of benefits(campaign); track benefit) {
                        <div class="flex items-start gap-2.5 text-sm font-bold text-slate-800">
                          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true"><mat-icon class="!h-3.5 !w-3.5 !text-[14px]">check</mat-icon></span>
                          <span>{{ benefit }}</span>
                        </div>
                      }
                    </div>
                  }

                  <div class="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div class="flex items-end justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">{{ priceLabel(campaign) }}</p>
                        @if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {
                          <p class="mt-1 text-xs font-bold text-slate-400 line-through">{{ formatPrice(campaign.oldPrice) }}</p>
                        }
                        <p class="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{{ formatPrice(campaign.newPrice) }}</p>
                      </div>
                      <span class="rounded-xl bg-white px-3 py-2 text-right text-[10px] font-black leading-tight text-slate-500 shadow-sm">{{ priceSuffix(campaign) }}</span>
                    </div>
                    @if (savings(campaign) > 0) {
                      <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                        <span class="text-[11px] font-bold text-slate-500">Bu fırsatla kazancınız</span>
                        <strong class="text-sm font-black text-emerald-700">{{ formatPrice(savings(campaign)) }}</strong>
                      </div>
                    }
                    @if (campaign.endsAt) {
                      <p class="mt-3 border-t border-slate-200 pt-3 text-[11px] font-bold text-slate-500">Fırsat {{ formatDate(campaign.endsAt) }} tarihine kadar geçerli. {{ countdownLong(campaign) }}</p>
                    }
                  </div>

                  <p class="mt-4 text-[11px] font-bold leading-relaxed text-slate-400">{{ trustLine(campaign) }}</p>

                  <div class="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-5">
                    <button type="button" (click)="openCampaign(campaign)" class="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30">
                      {{ campaign.ctaLabel || 'Fırsatı İncele' }}
                    </button>
                    <button type="button" (click)="openWhatsapp(campaign)" class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30" [attr.aria-label]="campaign.title + ' için WhatsApp üzerinden bilgi al'">
                      <mat-icon aria-hidden="true">chat</mat-icon>
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate-400">
            <span>Şeffaf fiyat</span><span aria-hidden="true">•</span><span>Gerçek bitiş süresi</span><span aria-hidden="true">•</span><span>Tek dokunuşla talep</span>
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block}.campaign-card{animation:campaign-enter .55s cubic-bezier(.2,.8,.2,1) both}.campaign-glow{position:absolute;border-radius:9999px;filter:blur(70px);opacity:.24}.campaign-glow-one{width:28rem;height:28rem;background:#2563eb;left:-10rem;top:-9rem}.campaign-glow-two{width:26rem;height:26rem;background:#f59e0b;right:-9rem;bottom:-11rem}.campaign-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,black,transparent)}@keyframes campaign-enter{from{opacity:0;transform:translateY(22px) scale(.985)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.campaign-card{animation:none!important;transition:none!important}.campaign-card img{transition:none!important}}
  `],
})
export class HomeCampaignShowcaseComponent implements OnInit, OnDestroy {
  private readonly campaignService = inject(CampaignService);
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  readonly campaigns = signal<CampaignRecord[]>([]);
  private readonly clock = signal(Date.now());
  private timer?: number;

  ngOnInit(): void {
    if (typeof window !== "undefined") this.timer = window.setInterval(() => this.clock.set(Date.now()), 60_000);
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.timer != null && typeof window !== "undefined") window.clearInterval(this.timer);
  }

  benefits(campaign: CampaignRecord): string[] {
    const raw = campaign.metadata?.["benefits"];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3) : [];
  }

  trustLine(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.["trustLine"] === "string" && String(campaign.metadata["trustLine"]).trim()
      ? String(campaign.metadata["trustLine"])
      : "Şeffaf fiyat • Açık koşullar • Hızlı destek";
  }

  priceLabel(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.["priceLabel"] === "string" && String(campaign.metadata["priceLabel"]).trim()
      ? String(campaign.metadata["priceLabel"])
      : "Kampanya fiyatı";
  }

  priceSuffix(campaign: CampaignRecord): string {
    if (typeof campaign.metadata?.["priceSuffix"] === "string" && String(campaign.metadata["priceSuffix"]).trim()) return String(campaign.metadata["priceSuffix"]);
    const intent = String(campaign.metadata?.["intent"] || "");
    if (intent === "TOUR" || campaign.targetType === "TOUR") return "kişi başı";
    if (intent === "WEDDING") return "özel gün paketi";
    return "kampanya paketi";
  }

  imageAlt(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.["imageAlt"] === "string" && String(campaign.metadata["imageAlt"]).trim() ? String(campaign.metadata["imageAlt"]) : campaign.title;
  }

  imageCredit(campaign: CampaignRecord): string {
    const attribution = typeof campaign.metadata?.["imageAttribution"] === "string" ? String(campaign.metadata["imageAttribution"]) : "";
    const license = typeof campaign.metadata?.["imageLicense"] === "string" ? String(campaign.metadata["imageLicense"]) : "";
    return [attribution, license].filter(Boolean).join(" • ");
  }

  imageSourceUrl(campaign: CampaignRecord): string {
    return typeof campaign.metadata?.["imageSourceUrl"] === "string" ? String(campaign.metadata["imageSourceUrl"]) : "";
  }

  isRepresentative(campaign: CampaignRecord): boolean {
    return campaign.metadata?.["representativeImage"] === true;
  }

  intentLabel(campaign: CampaignRecord): string {
    const intent = String(campaign.metadata?.["intent"] || campaign.targetType || "");
    if (intent === "RENTAL") return "Kiralama fırsatı";
    if (intent === "WEDDING") return "Özel gün fırsatı";
    if (intent === "TOUR") return "Cilo tur fırsatı";
    if (campaign.targetType === "VEHICLE") return "Araç fırsatı";
    return "Seçilmiş fırsat";
  }

  formatPrice(value?: number): string {
    if (value == null) return "Teklif Al";
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(value));
  }

  savings(campaign: CampaignRecord): number {
    if (campaign.oldPrice == null || campaign.newPrice == null) return 0;
    return Math.max(0, campaign.oldPrice - campaign.newPrice);
  }

  countdownLabel(campaign: CampaignRecord): string {
    const parts = this.countdownParts(campaign.endsAt);
    if (!parts) return "Süreli fırsat";
    if (parts.expired) return "Süre doldu";
    if (parts.days > 0) return `${parts.days}g ${parts.hours}s`;
    return `${Math.max(1, parts.hours)}s kaldı`;
  }

  countdownLong(campaign: CampaignRecord): string {
    const parts = this.countdownParts(campaign.endsAt);
    if (!parts || parts.expired) return "";
    if (parts.days > 0) return `Bitmesine ${parts.days} gün ${parts.hours} saat kaldı.`;
    return `Bitmesine ${Math.max(1, parts.hours)} saat kaldı.`;
  }

  openCampaign(campaign: CampaignRecord): void {
    const url = campaign.ctaUrl?.trim() || this.fallbackRoute(campaign);
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    void this.router.navigateByUrl(url.startsWith("/") ? url : `/${url}`);
  }

  openWhatsapp(campaign: CampaignRecord): void {
    if (typeof window === "undefined") return;
    const config = this.carService.getConfig()();
    const number = String(config.whatsapp || config.phone || "").replace(/\D/g, "");
    if (!number) return;
    const username = typeof config.whatsappUsername === "string" && config.whatsappUsername.trim() ? `\nWhatsApp kullanıcı adı: @${config.whatsappUsername.trim().replace(/^@/, "")}` : "";
    const message = campaign.whatsappMessage?.trim() || `Merhaba, ${campaign.title} kampanyasından yararlanmak istiyorum. Uygunluk ve koşulları paylaşabilir misiniz?`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message + username)}`, "_blank", "noopener,noreferrer");
  }

  private async load(): Promise<void> {
    try {
      const rows = await this.campaignService.loadPublic();
      this.campaigns.set(rows.filter((row) => this.isLive(row)).slice(0, 3));
    } catch {
      this.campaigns.set([]);
    }
  }

  private isLive(campaign: CampaignRecord): boolean {
    const now = this.clock();
    const start = campaign.startsAt ? new Date(campaign.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = campaign.endsAt ? new Date(campaign.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return campaign.isActive
      && campaign.publicationStatus === "PUBLISHED"
      && (!campaign.startsAt || Number.isFinite(start) && start <= now)
      && (!campaign.endsAt || Number.isFinite(end) && end > now);
  }

  private countdownParts(value?: string): { days: number; hours: number; expired: boolean } | null {
    if (!value) return null;
    const remaining = new Date(value).getTime() - this.clock();
    if (!Number.isFinite(remaining) || remaining <= 0) return { days: 0, hours: 0, expired: true };
    const totalHours = Math.floor(remaining / 3_600_000);
    return { days: Math.floor(totalHours / 24), hours: totalHours % 24, expired: false };
  }

  private fallbackRoute(campaign: CampaignRecord): string {
    if (campaign.targetType === "TOUR" && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`;
    if (campaign.targetType === "VEHICLE" && campaign.targetId) return `/fleet/${encodeURIComponent(campaign.targetId)}`;
    return "/fleet";
  }
}
