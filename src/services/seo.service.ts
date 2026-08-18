import { Injectable, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SiteConfig } from '../models/site-config.model';
import { CarService } from './car.service';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  private readonly config = this.carService.getConfig();

  private initialized = false;
  private trackingSignature = '';

  private readonly configEffect = effect(() => {
    const config = this.config();
    if (!this.initialized || typeof document === 'undefined') return;
    this.setDefaults(config);
    this.syncTrackingScripts(config);
  });

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    const config = this.config();
    this.setDefaults(config);
    this.syncTrackingScripts(config);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        if (!url.includes('/fleet/') && !url.includes('/sales/') && !url.includes('/tour/')) {
          this.setDefaults();
        } else {
          this.updateCanonicalUrl();
        }
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

  private syncTrackingScripts(config: SiteConfig): void {
    if (typeof document === 'undefined') return;

    const analyticsId = this.cleanTrackingId(config.googleAnalyticsId);
    const adsId = this.cleanTrackingId(config.googleAdsId);
    const pixelId = this.cleanTrackingId(config.metaPixelId);
    const signature = `${analyticsId}|${adsId}|${pixelId}`;
    if (signature === this.trackingSignature) return;
    this.trackingSignature = signature;

    document.querySelectorAll('[data-alperler-tracking="true"]').forEach((node) => node.remove());

    const head = document.head;
    const googleIds = Array.from(new Set([analyticsId, adsId].filter(Boolean)));
    for (const id of googleIds) {
      const external = document.createElement('script');
      external.async = true;
      external.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      external.dataset['alperlerTracking'] = 'true';
      head.appendChild(external);
    }

    if (googleIds.length) {
      const googleInit = document.createElement('script');
      googleInit.dataset['alperlerTracking'] = 'true';
      googleInit.text = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
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
        fbq('init', '${this.escapeInline(pixelId)}');
        fbq('track', 'PageView');
      `;
      head.appendChild(metaInit);

      const noscript = document.createElement('noscript');
      noscript.dataset['alperlerTracking'] = 'true';
      noscript.innerHTML = `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1"/>`;
      document.body?.appendChild(noscript);
    }
  }

  private cleanTrackingId(value?: string): string {
    return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  }

  private escapeInline(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
