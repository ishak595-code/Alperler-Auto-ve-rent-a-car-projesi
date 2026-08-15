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
  template: `
    <main class="min-h-[100dvh] bg-slate-950 pb-28 text-white">
      <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div class="mx-auto flex max-w-5xl items-center gap-3">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5" aria-label="Kampanyalardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Güncel Fırsatlar</p><h1 class="truncate font-serif text-2xl font-black">Kampanyalar</h1></div>
        </div>
      </header>

      <section class="mx-auto max-w-5xl px-4 py-6">
        <div class="mb-6 rounded-3xl border border-amber-300/15 bg-gradient-to-br from-blue-600/15 via-slate-900 to-amber-500/10 p-5 shadow-2xl">
          <h2 class="font-serif text-2xl font-black sm:text-3xl">Gerçek fırsatlar, açık koşullar</h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Aktif kampanyaları fiyat, avantaj ve bitiş süresiyle birlikte inceleyin. Süresi dolan fırsatlar otomatik olarak listeden çıkar.</p>
        </div>

        @if (campaigns().length) {
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (campaign of campaigns(); track campaign.id) {
              <article class="flex overflow-hidden rounded-3xl border border-white/10 bg-white text-slate-950 shadow-2xl md:flex-col">
                <div class="relative w-32 shrink-0 bg-slate-800 md:h-52 md:w-full">
                  @if (campaign.coverImage) { <img [src]="campaign.coverImage" [alt]="campaign.title" class="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer" /> }
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
                  <span class="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase text-slate-950">{{ campaign.badge || 'KAMPANYA' }}</span>
                  @if (campaign.endsAt) { <span class="absolute bottom-2 left-2 rounded-full bg-slate-950/90 px-2 py-1 text-[9px] font-black text-white">{{ countdown(campaign.endsAt) }}</span> }
                </div>
                <div class="flex min-w-0 flex-1 flex-col p-4">
                  <h2 class="text-base font-black leading-tight sm:text-lg">{{ campaign.title }}</h2>
                  <p class="mt-2 line-clamp-3 text-xs font-medium leading-5 text-slate-600">{{ campaign.shortDescription || campaign.description || 'Kampanya ayrıntılarını inceleyin.' }}</p>
                  <div class="mt-3 flex flex-wrap items-baseline gap-2">
                    @if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) { <span class="text-xs font-bold text-slate-400 line-through">{{ formatPrice(campaign.oldPrice) }}</span> }
                    @if (campaign.newPrice != null) { <strong class="text-lg font-black text-slate-950">{{ formatPrice(campaign.newPrice) }}</strong> }
                    @if (campaign.discountPercent) { <span class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">%{{ campaign.discountPercent }} avantaj</span> }
                  </div>
                  <button type="button" (click)="openCampaign(campaign)" class="mt-auto min-h-11 rounded-xl bg-slate-950 px-3 text-xs font-black text-white">{{ campaign.ctaLabel || 'Fırsatı İncele' }}</button>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
            <mat-icon class="!h-12 !w-12 !text-[48px] text-slate-600" aria-hidden="true">local_offer</mat-icon>
            <h2 class="mt-3 text-lg font-black">Şu anda aktif kampanya yok</h2>
            <p class="mt-2 text-sm leading-6 text-slate-400">Yeni fırsatlar yayınlandığında bu ekran otomatik olarak güncellenir.</p>
          </div>
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
    if (campaign.targetType === "TOUR" && campaign.targetId) { void this.router.navigate(["/tour", campaign.targetId]); return; }
    if (campaign.targetType === "VEHICLE" && campaign.targetId) {
      const vehicle = this.cars.getVehicle(campaign.targetId);
      void this.router.navigate([vehicle?.category === "SALE" ? "/sales" : "/fleet", campaign.targetId]);
      return;
    }
    void this.router.navigate(["/fleet"]);
  }

  formatPrice(value: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }

  countdown(value: string): string {
    const remaining = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return "Süre doldu";
    const hours = Math.floor(remaining / 3_600_000);
    const days = Math.floor(hours / 24);
    return days > 0 ? `${days} gün kaldı` : `${Math.max(1, hours)} saat kaldı`;
  }

  private isLive(item: CampaignRecord): boolean {
    const now = Date.now();
    const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return item.isActive && item.publicationStatus === "PUBLISHED" && (!item.startsAt || start <= now) && (!item.endsAt || end > now);
  }
}
