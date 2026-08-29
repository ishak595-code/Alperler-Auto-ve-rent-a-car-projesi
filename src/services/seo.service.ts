import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteConfig } from '../models/site-config.model';
import { CarService } from './car.service';
import { VisitorAnalyticsService } from './visitor-analytics.service';

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  private readonly analytics = inject(VisitorAnalyticsService);
  private readonly config = this.carService.getConfig();

  private initialized = false;
  private trackingSignature = '';

  constructor() {
    effect(() => {
      const config = this.config();
      const analyticsAllowed = this.analytics.consent() === 'accepted';
      const marketingAllowed = this.analytics.marketingConsent() === 'accepted';
      if (!this.initialized || typeof document === 'undefined') return;
      this.setDefaults(config);
      this.syncTrackingScripts(config, analyticsAllowed, marketingAllowed);
    });
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const config = this.config();
    this.setDefaults(config);
    this.syncTrackingScripts(
      config,
      this.analytics.consent() === 'accepted',
      this.analytics.marketingConsent() === 'accepted',
    );

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        if (!url.includes('/fleet/') && !url.includes('/sales/') && !url.includes('/tour/')) {
          this.setDefaults();
        } else {
          this.updateCanonicalUrl();
        }
        this.trackThirdPartyPageView(url);
      });
  }

  setDefaults(config: SiteConfig = this.config()): void {
    const title = config.seoTitle?.trim() || `${config.companyName} | Rent a Car - Tur - Araç Alım Satım`;
    const description = config.seoDescription?.trim() || `Hayalinizdeki aracı kiralayın veya satın alın. ${config.companyName} güvencesiyle araç kiralama, satış ve tur hizmetlerini inceleyin.`;
    const keywords = config.seoKeywords?.trim() || 'rent a car, araç kiralama, araba kiralama, araba satın al, tur, transfer';
    const image = config.seoOgImage?.trim() || config.logoUrl?.trim() || 'https://images.unsplash.com/photo-1503376762279-7fce1c4c1aef?q=80&w=1200&auto=format&fit=crop';

    this.updateSeoTags({
      title,
      description,
      keywords,
      image,
      author: config.seoAuthor?.trim(),
      ogTitle: config.seoOgTitle?.trim(),
      ogDescription: config.seoOgDescription?.trim(),
      twitterHandle: config.seoTwitterHandle?.trim(),
    });
  }

  updateSeoTags(config: {
    title: string;
    description: string;
    image?: string;
    keywords?: string;
    author?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterHandle?: string;
  }): void {
    this.title.setTitle(config.title);

    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) this.meta.updateTag({ name: 'keywords', content: config.keywords });
    else this.meta.removeTag('name="keywords"');

    if (config.author) this.meta.updateTag({ name: 'author', content: config.author });
    else this.meta.removeTag('name="author"');

    const socialTitle = config.ogTitle || config.title;
    const socialDescription = config.ogDescription || config.description;

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: socialTitle });
    this.meta.updateTag({ property: 'og:description', content: socialDescription });
    if (config.image) this.meta.updateTag({ property: 'og:image', content: config.image });
    else this.meta.removeTag('property="og:image"');

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: socialTitle });
    this.meta.updateTag({ name: 'twitter:description', content: socialDescription });
    if (config.image) this.meta.updateTag({ name: 'twitter:image', content: config.image });
    else this.meta.removeTag('name="twitter:image"');

    if (config.twitterHandle) this.meta.updateTag({ name: 'twitter:site', content: config.twitterHandle });
    else this.meta.removeTag('name="twitter:site"');

    this.updateCanonicalUrl();
  }

  updateJsonLd(schema: unknown): void {
    if (typeof document === 'undefined') return;
    const head = document.head;
    const scriptId = 'dynamic-json-ld';
    document.getElementById(scriptId)?.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    head.appendChild(script);
  }

  private updateCanonicalUrl(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
  }

  private syncTrackingScripts(config: SiteConfig, analyticsAllowed: boolean, marketingAllowed: boolean): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const configuredAnalyticsId = this.cleanTrackingId(config.googleAnalyticsId);
    const configuredAdsId = this.cleanTrackingId(config.googleAdsId);
    const configuredPixelId = this.cleanTrackingId(config.metaPixelId);
    const analyticsId = analyticsAllowed ? configuredAnalyticsId : '';
    const adsId = marketingAllowed ? configuredAdsId : '';
    const pixelId = marketingAllowed ? configuredPixelId : '';
    const signature = `${analyticsAllowed}:${analyticsId}|${marketingAllowed}:${adsId}|${pixelId}`;
    if (signature === this.trackingSignature) return;
    this.trackingSignature = signature;

    this.applyRevocationState(configuredAnalyticsId, analyticsAllowed, marketingAllowed);
    document.querySelectorAll('[data-alperler-tracking="true"]').forEach((node) => node.remove());

    const head = document.head;
    const googleIds = Array.from(new Set([analyticsId, adsId].filter(Boolean)));
    if (googleIds.length) {
      const external = document.createElement('script');
      external.async = true;
      external.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleIds[0])}`;
      external.dataset['alperlerTracking'] = 'true';
      head.appendChild(external);

      const googleInit = document.createElement('script');
      googleInit.dataset['alperlerTracking'] = 'true';
      googleInit.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          analytics_storage: '${analyticsAllowed ? 'granted' : 'denied'}',
          ad_storage: '${marketingAllowed ? 'granted' : 'denied'}',
          ad_user_data: '${marketingAllowed ? 'granted' : 'denied'}',
          ad_personalization: '${marketingAllowed ? 'granted' : 'denied'}'
        });
        gtag('js', new Date());
        ${googleIds.map((id) => `gtag('config', '${this.escapeInline(id)}');`).join('\n        ')}
      `;
      head.appendChild(googleInit);
    }

    if (pixelId) {
      const metaInit = document.createElement('script');
      metaInit.dataset['alperlerTracking'] = 'true';
      metaInit.text = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent', 'grant');
        fbq('init', '${this.escapeInline(pixelId)}');
        fbq('track', 'PageView');
      `;
      head.appendChild(metaInit);
    }
  }

  private applyRevocationState(analyticsId: string, analyticsAllowed: boolean, marketingAllowed: boolean): void {
    const trackingWindow = window as TrackingWindow;
    if (analyticsId) {
      const runtimeFlags = trackingWindow as unknown as Record<string, unknown>;
      runtimeFlags[`ga-disable-${analyticsId}`] = !analyticsAllowed;
    }

    trackingWindow.gtag?.('consent', 'update', {
      analytics_storage: analyticsAllowed ? 'granted' : 'denied',
      ad_storage: marketingAllowed ? 'granted' : 'denied',
      ad_user_data: marketingAllowed ? 'granted' : 'denied',
      ad_personalization: marketingAllowed ? 'granted' : 'denied',
    });

    if (marketingAllowed) trackingWindow.fbq?.('consent', 'grant');
    else trackingWindow.fbq?.('consent', 'revoke');

    if (!analyticsAllowed) this.clearFirstPartyTrackingCookies(['_ga', '_gid']);
    if (!marketingAllowed) this.clearFirstPartyTrackingCookies(['_gcl_', '_fbp', '_fbc']);
  }

  private trackThirdPartyPageView(url: string): void {
    if (typeof window === 'undefined') return;
    const trackingWindow = window as TrackingWindow;
    const path = url.split('#')[0] || '/';
    const config = this.config();
    if (this.analytics.consent() === 'accepted' && this.cleanTrackingId(config.googleAnalyticsId)) {
      trackingWindow.gtag?.('event', 'page_view', { page_path: path, page_title: document.title });
    }
    if (this.analytics.marketingConsent() === 'accepted' && this.cleanTrackingId(config.metaPixelId)) {
      trackingWindow.fbq?.('track', 'PageView');
    }
  }

  private clearFirstPartyTrackingCookies(prefixes: string[]): void {
    if (typeof document === 'undefined' || typeof location === 'undefined') return;
    const names = document.cookie
      .split(';')
      .map((entry) => entry.split('=')[0]?.trim())
      .filter((name): name is string => Boolean(name && prefixes.some((prefix) => name.startsWith(prefix))));
    const hostname = location.hostname;
    const domains = ['', hostname, `.${hostname}`];
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
      }
    }
  }

  private cleanTrackingId(value?: string): string {
    return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  }

  private escapeInline(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
