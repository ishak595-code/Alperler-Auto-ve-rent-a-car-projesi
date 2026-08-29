import { Injectable, inject } from '@angular/core';
import { Branch } from '../models/branch.model';
import { Vehicle } from '../models/car.model';
import { BlogPost, CarService, FaqItem } from './car.service';
import { CampaignRecord, CampaignService } from './campaign.service';
import { BranchService } from './branch.service';
import { HomepageLayoutService, PublicHomepageSection } from './homepage-layout.service';
import { NavigationConfigService, NavigationItem } from './navigation-config.service';

export type GlobalSearchKind = 'RENTAL' | 'SALE' | 'TOUR' | 'CAMPAIGN' | 'BLOG' | 'BRANCH' | 'FAQ' | 'SECTION' | 'PAGE';

export interface GlobalSearchResult {
  key: string;
  kind: GlobalSearchKind;
  title: string;
  summary: string;
  meta?: string;
  image?: string;
  route: string;
  score: number;
}

type SearchCandidate = Omit<GlobalSearchResult, 'score'> & { haystack: string; exactIds?: string[] };

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly cars = inject(CarService);
  private readonly campaigns = inject(CampaignService);
  private readonly branches = inject(BranchService);
  private readonly homepage = inject(HomepageLayoutService);
  private readonly navigation = inject(NavigationConfigService);

  async refresh(): Promise<void> {
    await Promise.allSettled([
      this.cars.ensureVehicleCloudInventory(),
      this.branches.refresh(),
      this.homepage.load(),
      this.navigation.refreshPublic(),
    ]);
  }

  search(rawQuery: string, kinds?: ReadonlySet<GlobalSearchKind>, limit = 80): GlobalSearchResult[] {
    const query = this.normalize(rawQuery);
    if (query.length < 2) return [];

    return this.candidates()
      .filter((candidate) => !kinds || kinds.has(candidate.kind))
      .map((candidate) => ({ ...candidate, score: this.score(candidate, query) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'tr'))
      .slice(0, Math.max(1, Math.min(200, Math.floor(limit) || 80)))
      .map(({ haystack: _haystack, exactIds: _exactIds, ...result }) => result);
  }

  private candidates(): SearchCandidate[] {
    const results: SearchCandidate[] = [];
    for (const vehicle of this.cars.getCars()()) results.push(this.vehicleCandidate(vehicle, 'RENTAL'));
    for (const vehicle of this.cars.getSaleCars()()) results.push(this.vehicleCandidate(vehicle, 'SALE'));
    for (const tour of this.cars.getTours()()) results.push(this.vehicleCandidate(tour, 'TOUR'));
    for (const post of this.cars.getBlogPosts()()) results.push(this.blogCandidate(post));
    for (const campaign of this.campaigns.publicCampaigns()) {
      if (this.isLiveCampaign(campaign)) results.push(this.campaignCandidate(campaign));
    }
    for (const branch of this.branches.branches()) {
      if (branch.isActive && !/\bdemo\b/i.test(branch.name || '')) results.push(this.branchCandidate(branch));
    }
    for (const faq of this.cars.getFaqs()()) results.push(this.faqCandidate(faq));
    for (const section of this.homepage.sections()) {
      if (section.isEnabled) results.push(this.sectionCandidate(section));
    }
    for (const item of this.uniqueNavigationItems()) results.push(this.pageCandidate(item));
    return this.dedupe(results);
  }

  private vehicleCandidate(item: Vehicle, kind: 'RENTAL' | 'SALE' | 'TOUR'): SearchCandidate {
    const title = item.title || [item.brand, item.model, item.series, item.year].filter(Boolean).join(' ') || `İlan ${item.id}`;
    const summary = String(item.description || item.location || '').trim();
    const route = kind === 'SALE' ? `/sales/${encodeURIComponent(String(item.id))}` : kind === 'TOUR' ? `/tour/${encodeURIComponent(String(item.id))}` : `/fleet/${encodeURIComponent(String(item.id))}`;
    const ids = [item.id, item.cloudId, item.cloudStockCode].filter(Boolean).map((value) => String(value));
    return {
      key: `${kind}:${item.cloudId || item.id}`,
      kind,
      title,
      summary,
      meta: [item.year, item.transmission, item.fuel, item.location].filter(Boolean).join(' · '),
      image: item.image,
      route,
      exactIds: ids,
      haystack: this.normalize([title, summary, item.brand, item.model, item.series, item.year, item.type, item.location, item.transmission, item.fuel, ...ids].filter(Boolean).join(' ')),
    };
  }

  private blogCandidate(post: BlogPost): SearchCandidate {
    return {
      key: `BLOG:${post.cloudId || post.id}`,
      kind: 'BLOG',
      title: post.title,
      summary: post.summary || '',
      meta: post.readTime || post.date || 'Blog',
      image: post.image,
      route: `/blog/${encodeURIComponent(String(post.id))}`,
      exactIds: [String(post.id), String(post.cloudId || ''), String(post.cloudSlug || '')].filter(Boolean),
      haystack: this.normalize([post.title, post.summary, post.content, post.cloudSlug, post.id].filter(Boolean).join(' ')),
    };
  }

  private campaignCandidate(campaign: CampaignRecord): SearchCandidate {
    return {
      key: `CAMPAIGN:${campaign.id}`,
      kind: 'CAMPAIGN',
      title: campaign.title,
      summary: campaign.shortDescription || campaign.description || '',
      meta: campaign.badge || 'Kampanya',
      image: campaign.coverImage,
      route: this.campaignRoute(campaign),
      exactIds: [campaign.id, campaign.slug].filter(Boolean),
      haystack: this.normalize([campaign.title, campaign.slug, campaign.badge, campaign.shortDescription, campaign.description, campaign.campaignType, campaign.targetType, campaign.id].filter(Boolean).join(' ')),
    };
  }

  private branchCandidate(branch: Branch): SearchCandidate {
    const title = branch.name || branch.operatorName || 'Hizmet noktası';
    return {
      key: `BRANCH:${branch.cloudId || branch.id}`,
      kind: 'BRANCH',
      title,
      summary: branch.publicDescription || branch.addressLabel || '',
      meta: [branch.city, branch.district].filter(Boolean).join(' / '),
      image: branch.heroImage,
      route: branch.slug ? `/branches/${encodeURIComponent(branch.slug)}` : '/branches',
      exactIds: [branch.id, branch.cloudId, branch.slug].filter(Boolean).map(String),
      haystack: this.normalize([title, branch.operatorName, branch.operatorLegalName, branch.city, branch.district, branch.addressLabel, branch.publicDescription, ...(branch.services || [])].filter(Boolean).join(' ')),
    };
  }

  private faqCandidate(faq: FaqItem): SearchCandidate {
    return {
      key: `FAQ:${faq.cloudId || faq.id}`,
      kind: 'FAQ',
      title: faq.question,
      summary: faq.answer,
      meta: faq.category || 'Sık Sorulan Sorular',
      route: '/faq',
      exactIds: [String(faq.id), String(faq.cloudId || '')].filter(Boolean),
      haystack: this.normalize([faq.question, faq.answer, faq.category].filter(Boolean).join(' ')),
    };
  }

  private sectionCandidate(section: PublicHomepageSection): SearchCandidate {
    const description = String(section.settings?.['description'] || '').trim();
    const route = this.safeInternalRoute(String(section.settings?.['viewAllUrl'] || '')) || this.defaultSectionRoute(section);
    return {
      key: `SECTION:${section.sectionKey}`,
      kind: 'SECTION',
      title: section.title,
      summary: description,
      meta: 'Ana sayfa bölümü',
      route,
      exactIds: [section.sectionKey],
      haystack: this.normalize([section.title, description, section.settings?.['badge'], section.sectionKey].filter(Boolean).join(' ')),
    };
  }

  private pageCandidate(item: NavigationItem): SearchCandidate {
    return {
      key: `PAGE:${item.itemKey}:${item.route}`,
      kind: 'PAGE',
      title: item.label,
      summary: 'Alperler Rent A Car hizmet sayfası',
      meta: 'Hizmet',
      route: item.route,
      exactIds: [item.itemKey],
      haystack: this.normalize([item.label, item.itemKey, item.route].join(' ')),
    };
  }

  private campaignRoute(campaign: CampaignRecord): string {
    const configured = this.safeInternalRoute(campaign.ctaUrl || '');
    if (configured) return configured;
    const target = String(campaign.targetId || '');
    if (campaign.targetType === 'TOUR' && target) {
      const tour = this.cars.getTours()().find((item) => [item.id, item.cloudId].some((id) => String(id || '') === target));
      if (tour) return `/tour/${encodeURIComponent(String(tour.id))}`;
    }
    if (campaign.targetType === 'VEHICLE' && target) {
      const vehicle = [...this.cars.getCars()(), ...this.cars.getSaleCars()()].find((item) => [item.id, item.cloudId, item.cloudStockCode].some((id) => String(id || '') === target));
      if (vehicle) return vehicle.category === 'SALE' ? `/sales/${encodeURIComponent(String(vehicle.id))}` : `/fleet/${encodeURIComponent(String(vehicle.id))}`;
    }
    return `/campaigns?campaign=${encodeURIComponent(campaign.id)}`;
  }

  private defaultSectionRoute(section: PublicHomepageSection): string {
    if (section.sectionType === 'VEHICLES') return String(section.settings?.['category'] || '').toUpperCase() === 'SALE' ? '/sales' : '/fleet';
    if (section.sectionType === 'TOURS') return '/tours';
    if (section.sectionType === 'BLOG') return '/blog';
    if (section.sectionType === 'CAMPAIGN') return '/campaigns';
    if (String(section.settings?.['renderer'] || '').toUpperCase() === 'BRANCHES') return '/branches';
    if (String(section.settings?.['renderer'] || '').toUpperCase() === 'PARTNER') return '/list-your-car';
    return '/';
  }

  private uniqueNavigationItems(): NavigationItem[] {
    const map = new Map<string, NavigationItem>();
    for (const item of this.navigation.items().filter((entry) => entry.isActive && !entry.archivedAt)) {
      if (!map.has(item.route)) map.set(item.route, item);
    }
    return [...map.values()];
  }

  private isLiveCampaign(campaign: CampaignRecord): boolean {
    if (!campaign.isActive || campaign.publicationStatus !== 'PUBLISHED') return false;
    const now = this.campaigns.clock();
    const start = campaign.startsAt ? new Date(campaign.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = campaign.endsAt ? new Date(campaign.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return (!campaign.startsAt || (Number.isFinite(start) && start <= now))
      && (!campaign.endsAt || (Number.isFinite(end) && end > now));
  }

  private score(candidate: SearchCandidate, query: string): number {
    const ids = (candidate.exactIds || []).map((value) => this.normalize(value)).filter(Boolean);
    const title = this.normalize(candidate.title);
    const words = query.split(' ').filter(Boolean);
    if (ids.includes(query)) return 1_000;
    if (title === query) return 950;
    if (ids.some((id) => id.startsWith(query))) return 900;
    if (title.startsWith(query)) return 800;
    if (title.includes(query)) return 700;
    if (words.length > 1 && words.every((word) => candidate.haystack.includes(word))) return 620;
    if (candidate.haystack.includes(query)) return 540;
    const matches = words.filter((word) => candidate.haystack.includes(word)).length;
    return matches ? 300 + matches * 40 : 0;
  }

  private dedupe(candidates: SearchCandidate[]): SearchCandidate[] {
    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      const key = `${candidate.kind}:${candidate.route}:${this.normalize(candidate.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private safeInternalRoute(value: string): string {
    const route = value.trim();
    return /^\/[A-Za-z0-9_./?#=&%-]*$/.test(route) && !route.startsWith('//') && !route.startsWith('/admin') && !route.startsWith('/branch-portal') ? route : '';
  }

  private normalize(value: unknown): string {
    return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/\s+/g, ' ').trim();
  }
}
