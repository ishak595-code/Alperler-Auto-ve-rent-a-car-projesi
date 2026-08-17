import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { VehicleListItemComponent } from './vehicle-list-item.component';
import { PublicHomepageSection, HomepageLayoutService } from '../services/homepage-layout.service';
import { CarService, BlogPost } from '../services/car.service';
import { CampaignRecord, CampaignService } from '../services/campaign.service';
import { BranchService } from '../services/branch.service';
import { Vehicle } from '../models/car.model';
import { Branch } from '../models/branch.model';

@Component({
  selector: 'app-dynamic-home-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, VehicleListItemComponent],
  template: `
    @if (shouldRender()) {
      <section
        class="home-section"
        [ngClass]="sectionClasses()"
        [ngStyle]="sectionStyles()"
        [attr.aria-labelledby]="section.sectionKey + '-title'"
      >
        <div class="section-inner">
          @if (renderer() === 'PARTNER') {
            <div class="partner-card">
              <div class="partner-copy">
                <p class="section-kicker">{{ badge('Araç Sahipleri') }}</p>
                <h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2>
                <p>{{ description('Aracınızı satış veya kiralama filosu için değerlendirmeye gönderin; ekibimiz size uygun yolu birlikte netleştirsin.') }}</p>
              </div>
              <a class="primary-cta" [href]="ctaUrl('/list-your-car')">{{ ctaLabel('Aracımı Değerlendir') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
            </div>
          } @else if (renderer() === 'PROMO') {
            <div class="promo-card">
              @if (coverImage()) {
                <div class="promo-media"><img [src]="coverImage()" [alt]="section.title" loading="lazy" /></div>
              }
              <div class="promo-copy">
                <p class="section-kicker">{{ badge('AlperAuto') }}</p>
                <h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2>
                <p>{{ description('Detayları keşfedin.') }}</p>
                @if (ctaLabel('') && ctaUrl('')) {
                  <a class="primary-cta" [href]="ctaUrl('')">{{ ctaLabel('') }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
                }
              </div>
            </div>
          } @else {
            <header class="section-head">
              <div>
                <p class="section-kicker">{{ badge(defaultBadge()) }}</p>
                <h2 [id]="section.sectionKey + '-title'">{{ section.title }}</h2>
                @if (description(defaultDescription())) { <p class="section-desc">{{ description(defaultDescription()) }}</p> }
              </div>
              @if (viewAllUrl()) {
                <a class="view-all" [href]="viewAllUrl()">{{ viewAllLabel() }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
              }
            </header>

            @if (section.sectionType === 'VEHICLES') {
              <div class="content-rail" [class.grid-layout]="isGrid()">
                @for (car of vehicles(); track stableVehicleKey(car)) {
                  <div class="vehicle-shell"><app-vehicle-list-item [car]="car" [variant]="car.category === 'SALE' ? 'sale' : 'rental'"></app-vehicle-list-item></div>
                }
              </div>
            }

            @if (section.sectionType === 'CAMPAIGN') {
              <div class="content-rail" [class.grid-layout]="isGrid()">
                @for (campaign of campaigns(); track campaign.id) {
                  <article class="offer-card">
                    <a class="offer-link" [href]="campaignHref(campaign)" [attr.aria-label]="campaign.title + ' fırsatını incele'">
                      <div class="media"><img [src]="campaign.coverImage || fallbackImage" [alt]="campaign.title" loading="lazy" />
                        @if (campaign.badge || campaign.discountPercent) { <span class="media-badge">{{ campaign.badge || ('%' + campaign.discountPercent + ' avantaj') }}</span> }
                      </div>
                      <div class="card-body">
                        <p class="micro">{{ campaignHook(campaign) }}</p>
                        <h3>{{ campaign.title }}</h3>
                        <p>{{ campaign.shortDescription || campaign.description || 'Fırsatın kapsamını ve koşullarını inceleyin.' }}</p>
                        <div class="price-row">
                          <div>@if (campaign.oldPrice && campaign.newPrice && campaign.oldPrice > campaign.newPrice) { <span class="old-price">{{ formatPrice(campaign.oldPrice) }}</span> } @if (campaign.newPrice != null) { <strong>{{ formatPrice(campaign.newPrice) }}</strong> }</div>
                          @if (campaignSavings(campaign) > 0) { <span class="saving">{{ formatPrice(campaignSavings(campaign)) }} avantaj</span> }
                        </div>
                        <span class="card-cta">{{ campaign.ctaLabel || 'Fırsatı İncele' }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></span>
                      </div>
                    </a>
                  </article>
                }
              </div>
            }

            @if (section.sectionType === 'TOURS') {
              <div class="content-rail" [class.grid-layout]="isGrid()">
                @for (tour of tours(); track stableVehicleKey(tour)) {
                  <a class="image-card" [routerLink]="['/tour', tour.id]">
                    <div class="media"><img [src]="tour.image || fallbackImage" [alt]="entityTitle(tour)" loading="lazy" /></div>
                    <div class="card-body"><div class="title-row"><h3>{{ entityTitle(tour) }}</h3>@if (tour.price) { <strong>{{ formatPrice(tour.price) }}</strong> }</div><p>{{ tour.description || tour.location || 'Rotayı ve deneyim ayrıntılarını keşfedin.' }}</p><span class="text-link">Turu Keşfet <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                  </a>
                }
              </div>
            }

            @if (renderer() === 'BRANCHES') {
              <div class="content-rail" [class.grid-layout]="isGrid()">
                @for (branch of branches(); track branch.id) {
                  <a class="branch-card" [routerLink]="branch.slug ? ['/branches', branch.slug] : ['/branches']">
                    <span class="branch-icon" aria-hidden="true"><mat-icon>storefront</mat-icon></span>
                    <p class="micro">{{ branch.networkType === 'FRANCHISE' ? 'Yetkili Bayi' : 'Alperler Auto Noktası' }}</p>
                    <h3>{{ branch.name }}</h3>
                    <p>{{ branch.publicDescription || ((branch.district || branch.city) + ' bölgesindeki araç ve hizmet seçeneklerini inceleyin.') }}</p>
                    <div class="branch-meta"><span>{{ branch.city }} / {{ branch.district }}</span>@if (branch.isPickupPoint) { <span>Teslim alma</span> }@if (branch.isReturnPoint) { <span>İade</span> }</div>
                    <strong>Şubeyi Keşfet <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong>
                  </a>
                }
              </div>
              <a class="partner-inline" routerLink="/branch-partner"><span><mat-icon aria-hidden="true">add_business</mat-icon><b>Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?</b></span><strong>Bayilik Başvurusu <mat-icon aria-hidden="true">arrow_forward</mat-icon></strong></a>
            }

            @if (section.sectionType === 'BLOG') {
              <div class="content-rail" [class.grid-layout]="isGrid()">
                @for (post of blogs(); track post.cloudId || post.id) {
                  <a class="image-card" [routerLink]="['/blog', post.id]">
                    <div class="media"><img [src]="post.image || fallbackImage" [alt]="post.title" loading="lazy" /></div>
                    <div class="card-body"><h3>{{ post.title }}</h3><p>{{ post.summary }}</p><span class="text-link">Yazıyı Oku <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                  </a>
                }
              </div>
            }

            @if (viewAllUrl()) {
              <a class="mobile-view-all" [href]="viewAllUrl()">{{ viewAllLabel() }} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>
            }
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block}.home-section{padding:2rem 0;background:#fff;color:#0f172a;background-position:center;background-size:cover;background-repeat:no-repeat}.section-inner{width:min(100% - 1.25rem,80rem);margin:auto}.width-standard .section-inner{max-width:68rem}.width-wide .section-inner{max-width:80rem}.width-full .section-inner{width:100%;max-width:none;padding-inline:clamp(.7rem,3vw,2rem)}.theme-soft{background-color:#f4f7fb}.theme-dark{background-color:#050b18;color:#fff}.theme-brand{background:linear-gradient(145deg,#071124,#0b2347);color:#fff}.theme-dark .section-desc,.theme-brand .section-desc{color:#9fb0c7}.theme-dark .section-kicker,.theme-brand .section-kicker{color:#93c5fd}.theme-dark .view-all,.theme-brand .view-all{color:#bfdbfe}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-kicker,.micro{margin:0;color:#2563eb;font-size:.62rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.home-section h2{margin:.25rem 0 0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.6rem,6.6vw,2.7rem);line-height:1.05;letter-spacing:-.02em}.section-desc{margin:.45rem 0 0;max-width:760px;color:#64748b;font-size:.76rem;line-height:1.58}.view-all{display:none;align-items:center;gap:.18rem;color:#1d4ed8;font-size:.72rem;font-weight:900;text-decoration:none}.content-rail{display:flex;gap:.78rem;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;padding:.15rem .05rem .8rem;scrollbar-width:none}.content-rail::-webkit-scrollbar{display:none}.vehicle-shell,.offer-card,.image-card,.branch-card{flex:0 0 min(78vw,310px);min-width:0;scroll-snap-align:start}.vehicle-shell{overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 12px 28px rgba(15,23,42,.075)}.offer-card,.image-card{overflow:hidden;border:1px solid rgba(148,163,184,.18);border-radius:20px;background:#fff;color:#0f172a;box-shadow:0 14px 36px rgba(15,23,42,.09)}.offer-link,.image-card{display:block;color:inherit;text-decoration:none}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#e2e8f0}.media img{width:100%;height:100%;object-fit:cover}.media-badge{position:absolute;left:.65rem;top:.65rem;border-radius:999px;background:rgba(2,6,23,.88);padding:.35rem .55rem;color:#fff;font-size:.57rem;font-weight:950}.card-body{padding:.9rem}.card-body h3{margin:.25rem 0 0;font-size:.94rem;line-height:1.28}.card-body>p:not(.micro){display:-webkit-box;overflow:hidden;margin:.42rem 0 0;color:#64748b;font-size:.7rem;line-height:1.48;-webkit-box-orient:vertical;-webkit-line-clamp:2}.price-row,.title-row{display:flex;align-items:end;justify-content:space-between;gap:.55rem;margin-top:.65rem}.old-price{display:block;color:#94a3b8;font-size:.58rem;font-weight:800;text-decoration:line-through}.saving{border-radius:999px;background:#ecfdf5;padding:.35rem .5rem;color:#047857;font-size:.58rem;font-weight:950}.card-cta{display:flex;min-height:40px;margin-top:.65rem;align-items:center;justify-content:space-between;border-radius:11px;background:#0f172a;padding:0 .75rem;color:#fff;font-size:.66rem;font-weight:950}.text-link{display:flex;align-items:center;gap:.15rem;margin-top:.65rem;color:#1d4ed8;font-size:.68rem;font-weight:900}.branch-card{display:block;border:1px solid #dce5ef;border-radius:20px;background:#fff;padding:1rem;color:#0f172a;text-decoration:none;box-shadow:0 12px 30px rgba(15,23,42,.06)}.branch-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:#eff6ff;color:#2563eb}.branch-card h3{margin:.65rem 0 .3rem;font-size:1rem}.branch-card>p:not(.micro){color:#64748b;font-size:.7rem;line-height:1.48}.branch-meta{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.65rem}.branch-meta span{border-radius:999px;background:#f1f5f9;padding:.3rem .45rem;color:#475569;font-size:.57rem;font-weight:850}.branch-card strong{display:flex;align-items:center;gap:.15rem;margin-top:.75rem;color:#1d4ed8;font-size:.68rem}.partner-inline{display:flex;flex-direction:column;gap:.45rem;margin-top:.7rem;border:1px solid #dbeafe;border-radius:17px;background:#eff6ff;padding:.9rem;color:#1e3a8a;text-decoration:none}.partner-inline span,.partner-inline strong{display:flex;align-items:center;gap:.35rem}.partner-inline strong{font-size:.7rem}.mobile-view-all{display:flex;min-height:44px;margin:.25rem auto 0;width:max-content;align-items:center;gap:.2rem;border-radius:12px;background:#0f172a;padding:0 1rem;color:#fff;font-size:.7rem;font-weight:900;text-decoration:none}.grid-layout{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));align-items:stretch;overflow:visible;scroll-snap-type:none}.grid-layout>*{width:auto!important;max-width:none!important;min-width:0;flex:none}.partner-card,.promo-card{display:grid;gap:1rem;border:1px solid rgba(148,163,184,.18);border-radius:24px;background:rgba(255,255,255,.92);padding:1.25rem;color:#0f172a;box-shadow:0 18px 42px rgba(15,23,42,.08)}.theme-dark .partner-card,.theme-brand .partner-card,.theme-dark .promo-card,.theme-brand .promo-card{background:rgba(8,18,35,.86);color:#fff}.partner-copy>p:not(.section-kicker),.promo-copy>p:not(.section-kicker){max-width:700px;color:#64748b;font-size:.78rem;line-height:1.6}.theme-dark .partner-copy>p:not(.section-kicker),.theme-brand .partner-copy>p:not(.section-kicker),.theme-dark .promo-copy>p:not(.section-kicker),.theme-brand .promo-copy>p:not(.section-kicker){color:#aab7ca}.primary-cta{display:flex;min-height:48px;width:max-content;align-items:center;justify-content:center;gap:.25rem;border-radius:12px;background:#2563eb;padding:0 1rem;color:#fff;font-size:.72rem;font-weight:950;text-decoration:none}.promo-media{overflow:hidden;border-radius:18px;aspect-ratio:16/8}.promo-media img{width:100%;height:100%;object-fit:cover}.mat-icon,.card-cta mat-icon,.text-link mat-icon,.view-all mat-icon,.mobile-view-all mat-icon,.primary-cta mat-icon,.branch-card mat-icon,.partner-inline mat-icon{width:16px;height:16px;font-size:16px}
    @media(min-width:720px){.view-all{display:flex}.mobile-view-all{display:none}.content-rail.grid-layout{grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}.partner-card{grid-template-columns:1fr auto;align-items:center}.promo-card{grid-template-columns:minmax(240px,.8fr) 1.2fr;align-items:center}.promo-card:not(:has(.promo-media)){grid-template-columns:1fr}}
    @media(min-width:1050px){.content-rail.grid-layout{grid-template-columns:repeat(auto-fit,minmax(275px,1fr))}.home-section{padding:3rem 0}.partner-inline{flex-direction:row;align-items:center;justify-content:space-between}}
  `],
})
export class DynamicHomeSectionComponent {
  @Input({ required: true }) section!: PublicHomepageSection;

  private readonly cars = inject(CarService);
  private readonly campaignsService = inject(CampaignService);
  private readonly branchesService = inject(BranchService);
  private readonly layout = inject(HomepageLayoutService);

  readonly fallbackImage = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop';

  shouldRender(): boolean {
    if (!this.section?.isEnabled) return false;
    if (this.renderer() === 'PARTNER' || this.renderer() === 'PROMO') return true;
    if (this.renderer() === 'BRANCHES') return this.branches().length > 0;
    if (this.section.sectionType === 'VEHICLES') return this.vehicles().length > 0;
    if (this.section.sectionType === 'TOURS') return this.tours().length > 0;
    if (this.section.sectionType === 'BLOG') return this.blogs().length > 0;
    if (this.section.sectionType === 'CAMPAIGN') return this.campaigns().length > 0;
    return false;
  }

  renderer(): 'DEFAULT' | 'BRANCHES' | 'PARTNER' | 'PROMO' {
    const configured = String(this.setting('renderer', '')).toUpperCase();
    if (configured === 'BRANCHES' || configured === 'PARTNER' || configured === 'PROMO') return configured;
    if (this.section.sectionKey === 'branches') return 'BRANCHES';
    if (this.section.sectionKey === 'partner') return 'PARTNER';
    return this.section.sectionType === 'CUSTOM' ? 'PROMO' : 'DEFAULT';
  }

  vehicles(): Vehicle[] {
    const source = this.vehicleRoute() === '/sales' ? this.cars.getSaleCars()() : this.cars.getCars()();
    return this.orderedEntities(source, 'VEHICLE', (item) => [String(item.id), String(item.cloudId || ''), String(item.cloudStockCode || '')]);
  }

  tours(): Vehicle[] {
    return this.orderedEntities(this.cars.getTours()(), 'TOUR', (item) => [String(item.id), String(item.cloudId || '')]);
  }

  blogs(): BlogPost[] {
    return this.orderedEntities(this.cars.getBlogPosts()(), 'BLOG', (item) => [String(item.id), String(item.cloudId || '')]);
  }

  campaigns(): CampaignRecord[] {
    const source = this.campaignsService.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a, b) => a.sortOrder - b.sortOrder);
    return this.orderedEntities(source, 'CAMPAIGN', (item) => [String(item.id)]);
  }

  branches(): Branch[] {
    return this.branchesService.branches().filter((item) => item.isActive && !/\bdemo\b/i.test(item.name)).slice(0, this.limit());
  }

  badge(fallback = ''): string { return String(this.setting('badge', fallback) || fallback); }
  description(fallback = ''): string { return String(this.setting('description', fallback) || fallback); }
  ctaLabel(fallback = ''): string { return String(this.setting('ctaLabel', fallback) || fallback); }
  ctaUrl(fallback = ''): string { return this.safeHref(String(this.setting('ctaUrl', fallback) || fallback)); }
  coverImage(): string { return this.safeImage(String(this.setting('coverImage', '') || '')); }
  isGrid(): boolean { return String(this.setting('layout', 'rail')).toLowerCase() === 'grid'; }

  sectionClasses(): string[] {
    const theme = String(this.setting('theme', 'light')).toLowerCase();
    const width = String(this.setting('width', 'wide')).toLowerCase();
    return [`theme-${['light','soft','dark','brand'].includes(theme) ? theme : 'light'}`, `width-${['standard','wide','full'].includes(width) ? width : 'wide'}`];
  }

  sectionStyles(): Record<string, string> {
    const styles: Record<string, string> = {};
    const color = String(this.setting('backgroundColor', '') || '').trim();
    if (/^#[0-9a-f]{3,8}$/i.test(color)) styles['background-color'] = color;
    const image = this.safeImage(String(this.setting('backgroundImage', '') || ''));
    if (image) styles['background-image'] = `linear-gradient(rgba(2,6,23,.12),rgba(2,6,23,.12)),url("${image.replace(/"/g, '')}")`;
    return styles;
  }

  defaultBadge(): string {
    if (this.section.sectionType === 'VEHICLES') return this.vehicleRoute() === '/sales' ? 'Seçili İkinci El Araçlar' : 'Seçili Kiralık Araçlar';
    if (this.section.sectionType === 'CAMPAIGN') return 'Seçili Avantajlar';
    if (this.section.sectionType === 'TOURS') return 'Yerel Rotalar';
    if (this.section.sectionType === 'BLOG') return 'Rehber & İpuçları';
    if (this.renderer() === 'BRANCHES') return 'Hizmet Ağı';
    return 'AlperAuto';
  }

  defaultDescription(): string {
    if (this.section.sectionType === 'VEHICLES') return this.vehicleRoute() === '/sales' ? 'Öne çıkan ikinci el araçları karşılaştırın ve ilan ayrıntılarını inceleyin.' : 'Planınıza uyan öne çıkan kiralık araçları karşılaştırın.';
    if (this.section.sectionType === 'CAMPAIGN') return 'Planınıza uyan güncel avantajları ve koşullarını inceleyin.';
    if (this.section.sectionType === 'TOURS') return 'Yerel rehberlerle öne çıkan rotaları keşfedin.';
    if (this.section.sectionType === 'BLOG') return 'Yola çıkmadan önce seçili rehber ve ipuçlarına göz atın.';
    if (this.renderer() === 'BRANCHES') return 'Şubeleri, yetkili bayileri ve hizmet noktalarını keşfedin.';
    return '';
  }

  viewAllLabel(): string {
    const configured = String(this.setting('viewAllLabel', '') || '').trim();
    if (configured) return configured;
    if (this.section.sectionType === 'VEHICLES') return this.vehicleRoute() === '/sales' ? 'Tüm Satılık Araçlar' : 'Tüm Kiralık Araçlar';
    if (this.section.sectionType === 'TOURS') return 'Tüm Turlar';
    if (this.section.sectionType === 'CAMPAIGN') return 'Tüm Fırsatlar';
    if (this.section.sectionType === 'BLOG') return 'Tüm Yazılar';
    if (this.renderer() === 'BRANCHES') return 'Tüm Noktalar';
    return 'Tümünü Gör';
  }

  viewAllUrl(): string {
    const configured = String(this.setting('viewAllUrl', '') || '').trim();
    if (configured) return this.safeHref(configured);
    if (this.section.sectionType === 'VEHICLES') return this.vehicleRoute();
    if (this.section.sectionType === 'TOURS') return '/tours';
    if (this.section.sectionType === 'CAMPAIGN') return '/campaigns';
    if (this.section.sectionType === 'BLOG') return '/blog';
    if (this.renderer() === 'BRANCHES') return '/branches';
    return '';
  }

  vehicleRoute(): '/fleet' | '/sales' { return String(this.setting('category', 'RENTAL')).toUpperCase() === 'SALE' ? '/sales' : '/fleet'; }
  stableVehicleKey(item: Vehicle): string { return String(item.cloudId || item.id); }
  entityTitle(item: Vehicle): string { return item.title || [item.brand, item.model, item.year].filter(Boolean).join(' ') || `İlan ${item.id}`; }
  formatPrice(value: number): string { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value); }
  campaignSavings(item: CampaignRecord): number { return item.oldPrice != null && item.newPrice != null ? Math.max(0, item.oldPrice - item.newPrice) : 0; }
  campaignHook(item: CampaignRecord): string { const saving = this.campaignSavings(item); if (saving > 0) return `${this.formatPrice(saving)} cebinizde kalsın`; if (item.discountPercent) return `%${item.discountPercent} avantaj`; return 'Planınıza değer katan fırsat'; }

  campaignHref(campaign: CampaignRecord): string {
    const cta = String(campaign.ctaUrl || '').trim();
    if (cta && (/^https:\/\//i.test(cta) || cta.startsWith('/'))) return cta;
    if (campaign.targetType === 'TOUR' && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`;
    if (campaign.targetType === 'VEHICLE' && campaign.targetId) {
      const vehicle = [...this.cars.getCars()(), ...this.cars.getSaleCars()()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId) || String(item.id) === String(campaign.targetId));
      return vehicle?.category === 'SALE' ? `/sales/${encodeURIComponent(vehicle.id)}` : `/fleet/${encodeURIComponent(vehicle?.id || campaign.targetId)}`;
    }
    return '/campaigns';
  }

  private orderedEntities<T>(source: T[], entityType: 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN', keys: (item: T) => string[]): T[] {
    const ids = this.layout.placementsFor(this.section.sectionKey).filter((item) => item.entityType === entityType).map((item) => item.entityId);
    if (!ids.length) return source.slice(0, this.limit());
    const map = new Map<string, T>();
    source.forEach((item) => keys(item).filter(Boolean).forEach((key) => map.set(key, item)));
    const ordered = ids.map((id) => map.get(id)).filter((item): item is T => Boolean(item));
    return (ordered.length ? ordered : source).slice(0, this.limit());
  }

  private limit(): number { const value = Math.floor(Number(this.section.maxItems || 1)); return Number.isFinite(value) && value >= 1 ? value : 1; }
  private setting(key: string, fallback: unknown): unknown { const settings = this.section.settings && typeof this.section.settings === 'object' ? this.section.settings : {}; return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback; }
  private safeImage(value: string): string { const trimmed = value.trim(); return /^https:\/\//i.test(trimmed) || trimmed.startsWith('/') || /^data:image\//i.test(trimmed) ? trimmed : ''; }
  private safeHref(value: string): string { const trimmed = value.trim(); return /^https:\/\//i.test(trimmed) || trimmed.startsWith('/') ? trimmed : ''; }
  private isLiveCampaign(item: CampaignRecord): boolean { if (!item.isActive || item.publicationStatus !== 'PUBLISHED') return false; const now = Date.now(); const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY; const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY; return (!item.startsAt || (Number.isFinite(start) && start <= now)) && (!item.endsAt || (Number.isFinite(end) && end > now)); }
}
