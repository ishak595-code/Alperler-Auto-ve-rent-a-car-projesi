import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-campaigns",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  styles: [`
    :host{display:block;background:#050b18;color:#fff}
    .page{min-height:100dvh;padding-bottom:6.5rem;background:radial-gradient(circle at 90% 0,rgba(37,99,235,.15),transparent 30%),#050b18}
    .topbar{position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(148,163,184,.15);background:rgba(5,11,24,.94);backdrop-filter:blur(18px)}
    .topbar-inner{width:min(100% - 2rem,72rem);min-height:70px;margin:auto;display:flex;align-items:center;gap:.8rem}
    .back{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(148,163,184,.18);border-radius:13px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer}.back:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
    .kicker{margin:0;color:#93c5fd;font-size:.62rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.topbar h1{margin:.15rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.45rem}
    .content{width:min(100% - 2rem,72rem);margin:auto;padding:1.5rem 0 2.5rem}.intro{border:1px solid rgba(96,165,250,.15);border-radius:22px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(15,23,42,.74));padding:1.1rem}.intro h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:1.7rem;line-height:1.08}.intro p{margin:.55rem 0 0;color:#b6c1d2;font-size:.82rem;line-height:1.6}
    .grid{display:grid;grid-template-columns:1fr;gap:.9rem;margin-top:1rem}.offer{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#fff;color:#0f172a;box-shadow:0 18px 42px rgba(2,6,23,.28);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.offer-button{display:grid;width:100%;grid-template-columns:112px minmax(0,1fr);border:0;background:transparent;padding:0;text-align:left;color:inherit;cursor:pointer}.offer-button:focus-visible{outline:3px solid #60a5fa;outline-offset:-3px}.media{position:relative;min-height:174px;background:#172033;overflow:hidden}.media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s ease}.media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.62),transparent 65%)}.badge{position:absolute;z-index:2;left:.5rem;top:.5rem;right:.5rem;width:max-content;max-width:calc(100% - 1rem);border-radius:999px;background:rgba(2,6,23,.9);padding:.3rem .5rem;color:#fff;font-size:.52rem;font-weight:900;text-transform:uppercase}.time{position:absolute;z-index:2;left:.5rem;bottom:.5rem;border-radius:999px;background:#fff;padding:.3rem .5rem;color:#0f172a;font-size:.55rem;font-weight:900}.body{min-width:0;padding:.9rem;display:flex;flex-direction:column}.body h2{margin:0;font-size:.96rem;line-height:1.3;font-weight:950}.copy{margin:.48rem 0 0;color:#59677a;font-size:.72rem;line-height:1.5}.price-row{display:flex;margin-top:.7rem;align-items:end;justify-content:space-between;gap:.6rem}.old{display:block;color:#94a3b8;font-size:.62rem;font-weight:750;text-decoration:line-through}.new{display:block;color:#0f172a;font-size:1rem;font-weight:950}.discount{display:inline-flex;border-radius:999px;background:#ecfdf5;padding:.3rem .5rem;color:#047857;font-size:.6rem;font-weight:900}.cta{display:flex;margin-top:auto;padding-top:.75rem;align-items:center;justify-content:space-between;gap:.5rem;color:#1d4ed8;font-size:.7rem;font-weight:950}.cta mat-icon{font-size:19px;width:19px;height:19px}.empty{margin-top:1rem;border:1px dashed #334155;border-radius:22px;background:#0b1424;padding:3rem 1.2rem;text-align:center}.empty h2{margin:.7rem 0 0;font-size:1rem}.empty p{margin:.4rem 0 0;color:#94a3b8;font-size:.8rem;line-height:1.55}
    @media(min-width:640px){.offer-button{grid-template-columns:180px minmax(0,1fr)}.body{padding:1.1rem}.body h2{font-size:1.08rem}}
    @media(min-width:768px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.offer-button{grid-template-columns:1fr}.media{min-height:220px}.body{min-height:230px}}
    @media(min-width:1100px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(hover:hover) and (pointer:fine){.offer:hover{transform:translateY(-5px);border-color:rgba(96,165,250,.45);box-shadow:0 28px 58px rgba(2,6,23,.34)}.offer:hover img{transform:scale(1.045)}}
    @media(prefers-reduced-motion:reduce){.offer,.media img{transition:none}}
  `],
  template: `
    <main class="page">
      <header class="topbar">
        <div class="topbar-inner">
          <button type="button" class="back" (click)="goBack()" aria-label="Fırsatlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div><p class="kicker">Aktif Fırsatlar</p><h1>Fırsatlar</h1></div>
        </div>
      </header>

      <section class="content" aria-labelledby="offers-title">
        <div class="intro">
          <h2 id="offers-title">İhtiyacınıza uyan avantajı net biçimde görün</h2>
          <p>Fiyat farkını, hizmet kapsamını ve gerçek bitiş tarihini karşılaştırın. Size uyan fırsata dokunduğunuzda doğrudan ilgili araç veya tur detayına geçersiniz.</p>
        </div>

        @if (campaigns().length) {
          <div class="grid">
            @for (campaign of campaigns(); track campaign.id) {
              <article class="offer">
                <button type="button" class="offer-button" (click)="openCampaign(campaign)" [attr.aria-label]="campaign.title + '. ' + (campaign.ctaLabel || 'Fırsatı incele')">
                  <div class="media">
                    @if (campaign.coverImage) {<img [src]="campaign.coverImage" [alt]="campaign.title" loading="lazy" referrerpolicy="no-referrer" />}
                    <span class="badge">{{ campaign.badge || (campaign.discountPercent ? '%' + campaign.discountPercent + ' avantaj' : 'Fırsat') }}</span>
                    @if (campaign.endsAt) {<span class="time">{{ countdown(campaign.endsAt) }}</span>}
                  </div>
                  <div class="body">
                    <h2>{{ campaign.title }}</h2>
                    <p class="copy">{{ campaign.shortDescription || campaign.description || 'Koşulları ve avantajı görmek için fırsatı inceleyin.' }}</p>
                    <div class="price-row">
                      <div>
                        @if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old">{{ formatPrice(campaign.oldPrice) }}</span>}
                        @if (campaign.newPrice != null) {<strong class="new">{{ formatPrice(campaign.newPrice) }}</strong>}
                      </div>
                      @if (campaign.discountPercent) {<span class="discount">%{{ campaign.discountPercent }} avantaj</span>}
                    </div>
                    <span class="cta"><span>{{ campaign.ctaLabel || 'Fırsatı İncele' }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                  </div>
                </button>
              </article>
            }
          </div>
        } @else {
          <div class="empty" role="status"><mat-icon aria-hidden="true">local_offer</mat-icon><h2>Şu anda aktif fırsat yok</h2><p>Yeni bir fırsat yayınlandığında bu ekran veritabanından otomatik olarak güncellenir.</p></div>
        }
      </section>
    </main>
  `,
})
export class CampaignsComponent {
  private readonly campaignService = inject(CampaignService);
  private readonly cars = inject(CarService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly campaigns = computed(() => this.campaignService.publicCampaigns().filter((item) => this.isLive(item)).slice().sort((a, b) => a.sortOrder - b.sortOrder));

  constructor() { void this.campaignService.loadPublic().catch(() => undefined); }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }

  openCampaign(campaign: CampaignRecord): void {
    const url = campaign.ctaUrl?.trim();
    if (url?.startsWith("/")) { void this.router.navigateByUrl(url); return; }
    if (url && /^https:\/\//i.test(url) && typeof window !== "undefined") { window.location.assign(url); return; }
    if (campaign.targetType === "TOUR" && campaign.targetId) { void this.router.navigate(["/tour", this.resolvePublicId(campaign.targetId)]); return; }
    if (campaign.targetType === "VEHICLE" && campaign.targetId) {
      const vehicle = [...this.cars.getCars()(), ...this.cars.getSaleCars()()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId));
      void this.router.navigate([vehicle?.category === "SALE" ? "/sales" : "/fleet", vehicle?.id || campaign.targetId]);
      return;
    }
    void this.router.navigate(["/search"]);
  }

  formatPrice(value: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }

  countdown(value: string): string {
    const remaining = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return "Süre doldu";
    const hours = Math.floor(remaining / 3_600_000);
    const days = Math.floor(hours / 24);
    return days > 0 ? `${days} gün kaldı` : `${Math.max(1, hours)} saat kaldı`;
  }

  private resolvePublicId(cloudId: string): string | number {
    const tour = this.cars.getTours()().find((item) => String(item.cloudId || item.id) === String(cloudId));
    return tour?.id || cloudId;
  }

  private isLive(item: CampaignRecord): boolean {
    const now = Date.now();
    const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return item.isActive && item.publicationStatus === "PUBLISHED" && (!item.startsAt || start <= now) && (!item.endsAt || end > now);
  }
}
