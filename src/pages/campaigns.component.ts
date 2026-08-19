import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";

@Component({
  selector: "app-campaigns",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <main class="page">
      <header class="topbar"><div class="topbar-inner"><button type="button" class="back" (click)="goBack()" aria-label="Fırsatlardan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div><p class="kicker">Aktif Fırsatlar</p><h1>Kampanyalar</h1></div></div></header>
      <section class="content" aria-labelledby="offers-title">
        <div class="intro"><p class="kicker">Gerçek fiyat · gerçek bitiş</p><h2 id="offers-title">Size uyan fırsatı doğrudan ilgili araca veya tura açın</h2><p>Kampanya kartları uygulama içinde açılır. Süre bilgisi yalnız kampanyanın veritabanındaki gerçek bitiş tarihinden hesaplanır.</p></div>
        @if (campaigns().length) {
          <div class="grid">@for (campaign of campaigns(); track campaign.id) {
            <article class="offer">
              <button type="button" class="offer-button" (click)="openCampaign(campaign)" [attr.aria-label]="campaignAriaLabel(campaign)">
                <div class="media">@if (campaign.coverImage) {<img [src]="campaignImage(campaign)" [alt]="campaign.title" loading="lazy" />}<span class="badge">{{ campaign.badge || (campaign.discountPercent ? '%' + campaign.discountPercent + ' avantaj' : 'Kampanya') }}</span>@if (campaign.endsAt) {<span class="time" [class.urgent]="isUrgent(campaign.endsAt)"><mat-icon aria-hidden="true">schedule</mat-icon>{{ countdown(campaign.endsAt) }}</span>}</div>
                <div class="body"><p class="hook">{{ campaignHook(campaign) }}</p><h2>{{ campaign.title }}</h2><p class="copy">{{ campaign.shortDescription || campaign.description || 'Kampanya koşullarını ve avantajını ilgili detay ekranında inceleyin.' }}</p><div class="price-row"><div>@if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) {<span class="old">{{ formatPrice(campaign.oldPrice) }}</span>}@if (campaign.newPrice != null) {<strong class="new">{{ formatPrice(campaign.newPrice) }}</strong>}</div>@if (campaignSavings(campaign) > 0) {<span class="saving">{{ formatPrice(campaignSavings(campaign)) }} avantaj</span>} @else if (campaign.discountPercent) {<span class="saving">%{{ campaign.discountPercent }} avantaj</span>}</div>@if (campaign.endsAt) {<p class="deadline">Kampanya bitişi: {{ formatDeadline(campaign.endsAt) }}</p>}<span class="cta"><span>{{ campaign.ctaLabel || 'Fırsatı İncele' }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
              </button>
            </article>
          }</div>
        } @else {<div class="empty" role="status"><mat-icon aria-hidden="true">local_offer</mat-icon><h2>Şu anda aktif kampanya yok</h2><p>Yeni kampanya yayınlandığında bu ekran canlı veritabanından otomatik güncellenir.</p></div>}
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.page{min-height:100dvh;padding-bottom:6rem;background:radial-gradient(circle at 90% 0,rgba(37,99,235,.18),transparent 30%),radial-gradient(circle at 10% 70%,rgba(245,158,11,.09),transparent 30%),#050b18}.topbar{position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(148,163,184,.15);background:rgba(5,11,24,.95);backdrop-filter:blur(18px)}.topbar-inner{width:min(100% - 24px,1180px);min-height:70px;margin:auto;display:flex;align-items:center;gap:10px}.back{display:grid;width:44px;height:44px;place-items:center;border:1px solid #253149;border-radius:13px;background:#0b1220;color:#fff}.kicker,.hook{margin:0;color:#93c5fd;font-size:10px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.topbar h1{margin:2px 0 0;font:900 21px Georgia,serif}.content{width:min(100% - 24px,1180px);margin:auto;padding:22px 0}.intro{border:1px solid rgba(96,165,250,.16);border-radius:22px;background:linear-gradient(145deg,rgba(37,99,235,.12),rgba(15,23,42,.78));padding:18px}.intro h2{margin:6px 0 0;font:900 clamp(28px,7vw,44px)/1.08 Georgia,serif}.intro>p:last-child{margin:9px 0 0;max-width:760px;color:#b6c1d2;font-size:13px;line-height:1.65}.grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}.offer{overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#fff;color:#0f172a;box-shadow:0 18px 42px rgba(2,6,23,.3)}.offer-button{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit;cursor:pointer}.offer-button:focus-visible{outline:3px solid #60a5fa;outline-offset:-3px}.media{position:relative;aspect-ratio:16/9;overflow:hidden;background:#172033}.media img{width:100%;height:100%;object-fit:cover}.media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.56),transparent 60%)}.badge{position:absolute;z-index:2;left:10px;top:10px;max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:999px;background:rgba(2,6,23,.9);padding:6px 9px;color:#fff;font-size:10px;font-weight:950}.time{position:absolute;z-index:2;left:10px;bottom:10px;display:flex;align-items:center;gap:4px;border-radius:999px;background:#fff;padding:6px 9px;color:#0f172a;font-size:10px;font-weight:950}.time.urgent{background:#dc2626;color:#fff}.time mat-icon{width:14px;height:14px;font-size:14px}.body{padding:15px}.body h2{margin:5px 0 0;font-size:18px;line-height:1.28}.copy{margin:7px 0 0;color:#59677a;font-size:12px;line-height:1.55}.price-row{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-top:12px}.old{display:block;color:#94a3b8;font-size:11px;font-weight:800;text-decoration:line-through}.new{display:block;margin-top:2px;font-size:20px;font-weight:950}.saving{border-radius:999px;background:#ecfdf5;padding:6px 8px;color:#047857;font-size:10px;font-weight:950}.deadline{margin:10px 0 0;color:#64748b;font-size:11px;font-weight:800}.cta{display:flex;min-height:44px;margin-top:12px;align-items:center;justify-content:space-between;border-radius:12px;background:#0f172a;padding:0 12px;color:#fff;font-size:12px;font-weight:950}.cta mat-icon{width:18px;height:18px;font-size:18px}.empty{margin-top:14px;border:1px dashed #334155;border-radius:22px;background:#0b1424;padding:3rem 1.2rem;text-align:center}.empty h2{margin:8px 0 0}.empty p{color:#94a3b8}@media(min-width:720px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1080px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.offer{transition:transform .2s ease,box-shadow .2s ease}.offer:hover{transform:translateY(-5px);box-shadow:0 28px 58px rgba(2,6,23,.36)}}@media(prefers-reduced-motion:reduce){.offer{transition:none}}
  `],
})
export class CampaignsComponent {
  private readonly campaignService = inject(CampaignService);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly campaigns = computed(() => this.campaignService.publicCampaigns().filter((item) => this.isLive(item)).slice().sort((a, b) => a.sortOrder - b.sortOrder));

  constructor() { void this.campaignService.loadPublic().catch(() => undefined); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
  async openCampaign(campaign: CampaignRecord): Promise<void> { const route = await this.detailData.resolveCampaignTarget(campaign.targetType, campaign.targetId, campaign.ctaUrl); await this.router.navigateByUrl(route); }
  campaignImage(campaign: CampaignRecord): string { return this.detailData.mediaUrl(campaign.coverImage); }
  formatPrice(value: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
  campaignSavings(item: CampaignRecord): number { return item.oldPrice != null && item.newPrice != null ? Math.max(0, item.oldPrice - item.newPrice) : 0; }
  campaignHook(item: CampaignRecord): string { const saving = this.campaignSavings(item); if (saving > 0) return `${this.formatPrice(saving)} cebinizde kalsın`; if (item.discountPercent) return `%${item.discountPercent} gerçek avantaj`; return "Sınırlı süreli kampanya"; }
  campaignAriaLabel(item: CampaignRecord): string { return `${item.title}. ${item.endsAt ? this.countdown(item.endsAt) + '. ' : ''}${item.ctaLabel || 'Fırsatı incele'}`; }
  countdown(value: string): string { const remaining = new Date(value).getTime() - Date.now(); if (!Number.isFinite(remaining) || remaining <= 0) return "Süre doldu"; const hours = Math.floor(remaining / 3_600_000); const days = Math.floor(hours / 24); if (days > 1) return `${days} gün kaldı`; if (days === 1) return "1 gün kaldı"; return `${Math.max(1, hours)} saat kaldı`; }
  isUrgent(value: string): boolean { const remaining = new Date(value).getTime() - Date.now(); return Number.isFinite(remaining) && remaining > 0 && remaining <= 48 * 3_600_000; }
  formatDeadline(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Belirtilmedi" : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); }
  private isLive(item: CampaignRecord): boolean { const now = Date.now(); const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY; const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY; return item.isActive && item.publicationStatus === "PUBLISHED" && (!item.startsAt || start <= now) && (!item.endsAt || end > now); }
}
