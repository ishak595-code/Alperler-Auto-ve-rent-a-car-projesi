import { DestroyRef, Injectable, inject } from '@angular/core';
import { BranchService } from './branch.service';
import { CampaignRecord, CampaignService } from './campaign.service';
import { CarService } from './car.service';
import { HomepageLayoutService } from './homepage-layout.service';

@Injectable({ providedIn: 'root' })
export class LiveContentSyncService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cars = inject(CarService);
  private readonly homepage = inject(HomepageLayoutService);
  private readonly branches = inject(BranchService);
  private readonly campaigns = inject(CampaignService);

  private started = false;
  private refreshing = false;
  private timerId: number | null = null;
  private campaignFingerprint = '';
  private lastRefreshAt = 0;

  start(): void {
    if (this.started || typeof window === 'undefined' || typeof document === 'undefined') return;
    this.started = true;

    const refreshOnFocus = () => void this.refresh(true);
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void this.refresh(true);
    };

    window.addEventListener('focus', refreshOnFocus, { passive: true });
    document.addEventListener('visibilitychange', refreshOnVisibility, { passive: true });
    this.timerId = window.setInterval(() => void this.refresh(false), 10_000);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      if (this.timerId !== null) window.clearInterval(this.timerId);
    });

    void this.refresh(true);
  }

  private async refresh(force: boolean): Promise<void> {
    if (this.refreshing || document.visibilityState === 'hidden') return;

    const now = Date.now();
    if (!force && now - this.lastRefreshAt < 9_000) return;

    this.refreshing = true;
    this.lastRefreshAt = now;

    try {
      const [campaignResult] = await Promise.all([
        this.campaigns.loadPublic().then((rows) => ({ ok: true as const, rows })).catch(() => ({ ok: false as const, rows: [] as CampaignRecord[] })),
        this.homepage.load().catch(() => undefined),
        this.cars.refreshCloudCatalog().catch(() => undefined),
        this.branches.refresh().catch(() => undefined),
      ]);

      if (!campaignResult.ok) return;

      const nextFingerprint = this.fingerprintCampaigns(campaignResult.rows);
      if (!this.campaignFingerprint) {
        this.campaignFingerprint = nextFingerprint;
        return;
      }

      if (nextFingerprint !== this.campaignFingerprint) {
        this.campaignFingerprint = nextFingerprint;

        // HomeComponent keeps its campaign list locally. A controlled refresh is
        // only needed when campaign content itself changes. Other homepage data
        // is updated reactively through the injected services above.
        if (window.location.pathname === '/') window.location.reload();
      }
    } finally {
      this.refreshing = false;
    }
  }

  private fingerprintCampaigns(rows: CampaignRecord[]): string {
    return JSON.stringify(rows.map((item) => ({
      id: item.id,
      title: item.title,
      shortDescription: item.shortDescription || '',
      description: item.description || '',
      badge: item.badge || '',
      coverImage: item.coverImage || '',
      oldPrice: item.oldPrice ?? null,
      newPrice: item.newPrice ?? null,
      discountPercent: item.discountPercent ?? null,
      ctaLabel: item.ctaLabel,
      ctaUrl: item.ctaUrl || '',
      startsAt: item.startsAt || '',
      endsAt: item.endsAt || '',
      isActive: item.isActive,
      publicationStatus: item.publicationStatus,
      sortOrder: item.sortOrder,
      metadata: item.metadata || {},
    })));
  }
}
