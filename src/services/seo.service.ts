import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CarService } from '../services/car.service';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private carService = inject(CarService);

  private scriptsInjected = false;

  init() {
    // Inject scripts once on app load
    this.injectTrackingScripts();

    // Reset default SEO tags on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Don't auto-reset if it's a detail page (it will set its own immediately)
      // but to be safe, we reset to home defaults and let components override
      if (
        !event.urlAfterRedirects.includes('/fleet/') &&
        !event.urlAfterRedirects.includes('/sales/') &&
        !event.urlAfterRedirects.includes('/tours/')
      ) {
        this.setDefaults();
      }
    });

    // Make sure we set initially
    this.setDefaults();
  }

  setDefaults() {
    const config = this.carService.getConfig()();
    const defaultTitle = `${config.companyName} | Rent a Car - Tur - Araç Alım Satım`;
    const defaultDesc = config.seoDescription || `Hayalinizdeki aracı kiralayın veya satın alın. ${config.companyName} güvencesiyle 7/24 hizmet, geniş filo ve kusursuz müşteri deneyimi. Global standartlarda rent a car hizmeti.`;
    const defaultKeywords = config.seoKeywords || 'rent a car, araç kiralama, araba kiralama, araba satın al, lüks araç kiralama, havaalanı transfer, vip transfer, egea kiralama, clio kiralama, en iyi rent a car';

    this.updateSeoTags({
      title: defaultTitle,
      description: defaultDesc,
      keywords: defaultKeywords,
      image: config.logoUrl || 'https://images.unsplash.com/photo-1503376762279-7fce1c4c1aef?q=80&w=1200&auto=format&fit=crop'
    });
  }

  updateSeoTags(config: { title: string, description: string, image?: string, keywords?: string }) {
    this.title.setTitle(config.title);

    // Standard Tags
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }

    // Open Graph / Facebook
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    if (config.image) {
      this.meta.updateTag({ property: 'og:image', content: config.image });
    }

    // Twitter
    this.meta.updateTag({ property: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ property: 'twitter:title', content: config.title });
    this.meta.updateTag({ property: 'twitter:description', content: config.description });
    if (config.image) {
      this.meta.updateTag({ property: 'twitter:image', content: config.image });
    }
  }

  private injectTrackingScripts() {
    if (this.scriptsInjected) return;
    
    // Server Side Rendering check if applied in future, but we are client side.
    const config = this.carService.getConfig()();
    const head = document.getElementsByTagName('head')[0];

    // Google Analytics
    if (config.googleAnalyticsId) {
      const gtmScript = document.createElement('script');
      gtmScript.async = true;
      gtmScript.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`;
      head.appendChild(gtmScript);

      const gtmInit = document.createElement('script');
      gtmInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.googleAnalyticsId}');
      `;
      head.appendChild(gtmInit);
    }

    // Google Ads
    if (config.googleAdsId && config.googleAdsId !== config.googleAnalyticsId) {
      const adsScript = document.createElement('script');
      adsScript.async = true;
      adsScript.src = `https://www.googletagmanager.com/gtag/js?id=${config.googleAdsId}`;
      head.appendChild(adsScript);

      const adsInit = document.createElement('script');
      adsInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.googleAdsId}');
      `;
      head.appendChild(adsInit);
    }

    // Meta Pixel
    if (config.metaPixelId) {
      const metaInit = document.createElement('script');
      metaInit.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${config.metaPixelId}');
        fbq('track', 'PageView');
      `;
      head.appendChild(metaInit);

      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${config.metaPixelId}&ev=PageView&noscript=1"/>`;
      head.appendChild(noscript);
    }
    
    this.scriptsInjected = true;
  }

  updateJsonLd(schema: any) {
    const head = document.getElementsByTagName('head')[0];
    const scriptId = 'dynamic-json-ld';
    
    let existingScript = document.getElementById(scriptId);
    if (existingScript) {
      head.removeChild(existingScript);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    head.appendChild(script);
  }
}
