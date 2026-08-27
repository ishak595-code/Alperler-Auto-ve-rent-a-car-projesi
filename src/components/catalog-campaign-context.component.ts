import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CampaignProof, CampaignRecord, CampaignService } from '../services/campaign.service';
import { CommercialOfferContextService } from '../services/commercial-offer-context.service';
import { PublicDetailDataService } from '../services/public-detail-data.service';
import { TurkishCurrencyPipe } from '../pipes/turkish-currency.pipe';

type CampaignTargetKind = 'TOUR' | 'SALE';

@Component({
  selector: 'app-catalog-campaign-context',
  standalone: true,
  imports: [CommonModule, MatIconModule, TurkishCurrencyPipe],
  template: `
    @if (campaign(); as offer) {
      <section class="campaign-context" aria-label="Bu içerikte kullanılan kampanya">
        <div class="copy">
          <div class="badges">
            <span class="campaign-badge">{{ offer.badge || 'KAMPANYA' }}</span>
            @if (discountLabel(offer)) { <span class="discount-badge">{{ discountLabel(offer) }}</span> }
          </div>
          <p class="eyebrow">AKTİF KAMPANYA</p>
          <h2>{{ offer.title }}</h2>
          @if (offer.shortDescription || offer.description) {
            <p class="description">{{ offer.shortDescription || offer.description }}</p>
          }
          @if (benefits(offer).length) {
            <ul class="benefits" aria-label="Kampanya avantajları">
              @for (benefit of benefits(offer); track benefit) {
                <li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{ benefit }}</span></li>
              }
            </ul>
          }
          @if (trustLine(offer)) { <p class="trust"><mat-icon aria-hidden="true">verified_user</mat-icon>{{ trustLine(offer) }}</p> }
        </div>

        <div class="commercial">
          <div class="proof" [class.hot]="proofFor(offer).activeViewers15m > 0 || proofFor(offer).recentViewers24h > 1">
            <span class="dot" aria-hidden="true"></span>
            <mat-icon aria-hidden="true">visibility</mat-icon>
            <strong>{{ proofLabel(offer) }}</strong>
          </div>
          @if (offer.endsAt) {
            <div class="countdown"><mat-icon aria-hidden="true">schedule</mat-icon><span>{{ countdown(offer.endsAt) }}</span></div>
          }
          @if (offer.oldPrice && offer.newPrice && offer.oldPrice > offer.newPrice) {
            <div class="price"><small>{{ offer.oldPrice | turkishCurrency }}</small><strong>{{ offer.newPrice | turkishCurrency }}</strong><span>{{ (offer.oldPrice - offer.newPrice) | turkishCurrency }} avantaj</span></div>
          } @else if (offer.newPrice != null) {
            <div class="price"><strong>{{ offer.newPrice | turkishCurrency }}</strong><span>Kampanya fiyatı</span></div>
          } @else if (offer.discountPercent) {
            <div class="price"><strong>%{{ offer.discountPercent }}</strong><span>fiyat avantajı</span></div>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.campaign-context{width:min(100% - 24px,1180px);margin:14px auto 2px;display:grid;gap:16px;border:1px solid rgba(251,191,36,.42);border-radius:22px;background:radial-gradient(circle at 95% 0,rgba(251,191,36,.18),transparent 38%),linear-gradient(135deg,#451a03 0%,#7c2d12 47%,#111827 100%);padding:17px;box-shadow:0 18px 44px rgba(0,0,0,.26)}.badges{display:flex;flex-wrap:wrap;gap:7px}.campaign-badge,.discount-badge{display:inline-flex;min-height:26px;align-items:center;border-radius:999px;padding:0 9px;font-size:9px;font-weight:950;letter-spacing:.08em}.campaign-badge{background:#fbbf24;color:#451a03}.discount-badge{background:#fff;color:#7f1d1d}.eyebrow{margin:10px 0 0;color:#fde68a;font-size:9px;font-weight:950;letter-spacing:.14em}.copy h2{margin:5px 0 0;font:900 clamp(23px,6vw,36px)/1.08 Georgia,serif}.description{margin:8px 0 0;max-width:760px;color:#ffedd5;font-size:12px;line-height:1.65}.benefits{list-style:none;margin:11px 0 0;padding:0;display:grid;gap:6px}.benefits li{display:flex;align-items:flex-start;gap:7px;color:#fff7ed;font-size:11px;font-weight:750}.benefits mat-icon,.trust mat-icon{width:17px;height:17px;font-size:17px;color:#fcd34d;flex:none}.trust{display:flex;align-items:flex-start;gap:7px;margin:11px 0 0;color:#fde68a;font-size:10px;font-weight:850}.commercial{display:grid;align-content:start;gap:9px}.proof,.countdown{display:flex;min-height:36px;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(15,23,42,.42);padding:0 10px;color:#fff;font-size:10px}.proof.hot{background:rgba(124,45,18,.58)}.proof mat-icon,.countdown mat-icon{width:16px;height:16px;font-size:16px;color:#fcd34d}.dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.13)}.price{border-radius:14px;background:rgba(2,6,23,.5);padding:12px}.price small,.price strong,.price span{display:block}.price small{color:#fdba74;font-size:11px;text-decoration:line-through}.price strong{margin-top:2px;color:#fff7ed;font-size:25px}.price span{margin-top:3px;color:#fde68a;font-size:10px;font-weight:900}@media(min-width:760px){.campaign-context{grid-template-columns:minmax(0,1fr) 260px;align-items:start;padding:20px}.benefits{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  `],
})
export class CatalogCampaignContextComponent implements OnInit {
  @Input({ required: true }) targetKind: CampaignTargetKind = 'TOUR';
  private readonly route = inject(ActivatedRoute);
  private readonly campaigns = inject(CampaignService);
  private readonly commercialOffer = inject(CommercialOfferContextService);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly campaignId = this.route.snapshot.queryParamMap.get('campaign') || '';
  private readonly routeId = this.route.snapshot.paramMap.get('id') || '';
  private readonly resolvedTargetId = signal('');

  readonly campaign = computed<CampaignRecord | null>(() => {
    if (!this.routeId) return null;
    const expectedTarget = this.targetKind === 'TOUR' ? 'TOUR' : 'VEHICLE';
    const aliases = new Set([this.routeId, this.resolvedTargetId()].map((value) => String(value || '').trim()).filter(Boolean));
    const matches = this.campaigns.publicCampaigns().filter((item) =>
      item.isActive &&
      item.publicationStatus === 'PUBLISHED' &&
      item.targetType === expectedTarget &&
      aliases.has(String(item.targetId || '').trim())
    );
    if (this.campaignId) return matches.find((item) => item.id === this.campaignId) || null;
    return matches[0] || null;
  });

  async ngOnInit(): Promise<void> {
    if (!this.routeId) return;
    const kind = this.targetKind === 'TOUR' ? 'TOUR' : 'SALE';
    await Promise.allSettled([
      this.campaigns.refreshPublicState(true),
      this.detailData.load(kind, this.routeId).then((item) => this.resolvedTargetId.set(String(item.cloudId || item.id || ''))),
    ]);
    const verified = this.campaign();
    if (verified) this.commercialOffer.activateCampaign(verified);
  }

  proofFor(item: CampaignRecord): CampaignProof {
    return this.campaigns.proofByCampaign()[item.id] || { campaignId: item.id, pageViewsTotal: 0, uniqueViewersTotal: 0, recentViewers24h: 0, activeViewers15m: 0 };
  }

  proofLabel(item: CampaignRecord): string {
    const proof = this.proofFor(item);
    if (proof.activeViewers15m > 0) return `${proof.activeViewers15m} kişi son 15 dakikada inceledi`;
    if (proof.recentViewers24h > 0) return `${proof.recentViewers24h} kişi son 24 saatte inceledi`;
    if (proof.uniqueViewersTotal > 0) return `${proof.uniqueViewersTotal} kişi inceledi`;
    if (proof.pageViewsTotal > 0) return `${proof.pageViewsTotal} görüntülenme`;
    return 'Yeni kampanya';
  }

  benefits(item: CampaignRecord): string[] {
    const value = item.metadata?.['benefits'];
    return Array.isArray(value) ? value.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 6) : [];
  }

  trustLine(item: CampaignRecord): string {
    return String(item.metadata?.['trustLine'] || '').trim();
  }

  discountLabel(item: CampaignRecord): string {
    if (item.discountPercent) return `%${item.discountPercent} İNDİRİM`;
    if (item.oldPrice && item.newPrice && item.oldPrice > item.newPrice) {
      const percent = Math.round(((item.oldPrice - item.newPrice) / item.oldPrice) * 100);
      return percent > 0 ? `%${percent} AVANTAJ` : '';
    }
    return '';
  }

  countdown(value: string): string {
    const remaining = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return 'Süre doldu';
    const hours = Math.floor(remaining / 3_600_000);
    const days = Math.floor(hours / 24);
    if (days > 1) return `${days} gün kaldı`;
    if (days === 1) return '1 gün kaldı';
    return `${Math.max(1, hours)} saat kaldı`;
  }
}
