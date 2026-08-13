import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { Meta, Title } from "@angular/platform-browser";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "./car.service";

interface SeoTags {
  title: string;
  description: string;
  image?: string;
  keywords?: string;
}

@Injectable({ providedIn: "root" })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  private readonly document = inject(DOCUMENT);
  private scriptsInjected = false;

  init(): void {
    this.injectTrackingScripts();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateRouteMetadata(event.urlAfterRedirects);
        if (!this.isDetailRoute(event.urlAfterRedirects)) {
          this.setDefaults();
        }
      });

    this.updateRouteMetadata(this.router.url || "/");
    this.setDefaults();
  }

  setDefaults(): void {
    const config = this.carService.getConfig()();
    const defaultTitle =
      config.seoTitle?.trim() ||
      `${config.companyName} | Araç Kiralama, Satış ve Turlar`;
    const defaultDesc =
      config.seoDescription?.trim() ||
      `${config.companyName} ile Yüksekova ve çevresinde araç kiralama, ikinci el araç ve tur hizmetlerini inceleyin.`;
    const defaultKeywords =
      config.seoKeywords?.trim() ||
      "yüksekova araç kiralama, hakkari rent a car, ikinci el araç, yüksekova tur";

    this.updateSeoTags({
      title: defaultTitle,
      description: defaultDesc,
      keywords: defaultKeywords,
      image: this.validAbsoluteUrl(config.seoOgImage) || this.validAbsoluteUrl(config.logoUrl) || undefined,
    });
    this.updateBusinessJsonLd();
  }

  updateSeoTags(config: SeoTags): void {
    const description = config.description.trim().slice(0, 320);
    this.title.setTitle(config.title.trim().slice(0, 180));
    this.meta.updateTag({ name: "description", content: description });
    this.meta.updateTag({ property: "og:type", content: "website" });
    this.meta.updateTag({ property: "og:site_name", content: this.carService.getConfig()().companyName });
    this.meta.updateTag({ property: "og:title", content: config.title });
    this.meta.updateTag({ property: "og:description", content: description });
    this.meta.updateTag({ name: "twitter:card", content: "summary_large_image" });
    this.meta.updateTag({ name: "twitter:title", content: config.title });
    this.meta.updateTag({ name: "twitter:description", content: description });

    if (config.keywords?.trim()) {
      this.meta.updateTag({ name: "keywords", content: config.keywords.trim().slice(0, 500) });
    }

    const image = this.validAbsoluteUrl(config.image);
    if (image) {
      this.meta.updateTag({ property: "og:image", content: image });
      this.meta.updateTag({ name: "twitter:image", content: image });
    } else {
      this.meta.removeTag("property='og:image'");
      this.meta.removeTag("name='twitter:image'");
    }

    this.updateCanonicalAndOgUrl();
  }

  updateJsonLd(schema: unknown): void {
    const head = this.document.head;
    const scriptId = "dynamic-json-ld";
    this.document.getElementById(scriptId)?.remove();
    if (!schema) return;

    const script = this.document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(schema);
    head.appendChild(script);
  }

  private updateRouteMetadata(url: string): void {
    const path = this.cleanPath(url);
    const isAdmin = path === "/admin" || path.startsWith("/admin/");
    this.meta.updateTag({
      name: "robots",
      content: isAdmin
        ? "noindex, nofollow, noarchive"
        : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    });
    this.updateCanonicalAndOgUrl(path);
  }

  private updateCanonicalAndOgUrl(path = this.cleanPath(this.router.url)): void {
    const canonical = this.absoluteRouteUrl(path);
    if (!canonical) return;

    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement("link");
      link.rel = "canonical";
      this.document.head.appendChild(link);
    }
    link.href = canonical;
    this.meta.updateTag({ property: "og:url", content: canonical });
  }

  private updateBusinessJsonLd(): void {
    const config = this.carService.getConfig()();
    const url = this.absoluteRouteUrl("/");
    if (!url) return;

    const sameAs = [
      config.instagramUrl,
      config.facebookUrl,
      config.twitterUrl,
      config.tiktokUrl,
      config.youtubeUrl,
    ]
      .map((value) => this.validAbsoluteUrl(value))
      .filter((value): value is string => Boolean(value));

    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "AutoRental", "AutoDealer"],
      "@id": `${url}#business`,
      name: config.companyName,
      url,
      description: config.seoDescription || config.aboutText?.slice(0, 500),
      telephone: config.phone || undefined,
      email: config.email || undefined,
      address: config.address
        ? {
            "@type": "PostalAddress",
            streetAddress: config.address,
            addressLocality: "Yüksekova",
            addressRegion: "Hakkari",
            addressCountry: "TR",
          }
        : undefined,
      logo: this.validAbsoluteUrl(config.logoUrl) || undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    };

    Object.keys(schema).forEach((key) => schema[key] === undefined && delete schema[key]);
    this.updateJsonLd(schema);
  }

  private injectTrackingScripts(): void {
    if (this.scriptsInjected || typeof window === "undefined") return;
    const config = this.carService.getConfig()();
    const analyticsId = this.validTrackingId(config.googleAnalyticsId);
    const adsId = this.validTrackingId(config.googleAdsId);
    const metaPixelId = /^\d{5,30}$/.test(config.metaPixelId || "") ? config.metaPixelId : "";

    if (analyticsId) this.injectGoogleTag(analyticsId);
    if (adsId && adsId !== analyticsId) this.injectGoogleTag(adsId);
    if (metaPixelId) this.injectMetaPixel(metaPixelId);
    this.scriptsInjected = true;
  }

  private injectGoogleTag(id: string): void {
    const loader = this.document.createElement("script");
    loader.async = true;
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    this.document.head.appendChild(loader);

    const init = this.document.createElement("script");
    init.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
    this.document.head.appendChild(init);
  }

  private injectMetaPixel(id: string): void {
    const script = this.document.createElement("script");
    script.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
    this.document.head.appendChild(script);
  }

  private isDetailRoute(url: string): boolean {
    const path = this.cleanPath(url);
    return /^\/(fleet|sales|tour|blog)\/[^/]+/.test(path);
  }

  private cleanPath(url: string): string {
    const path = (url || "/").split("?")[0].split("#")[0] || "/";
    return path.startsWith("/") ? path : `/${path}`;
  }

  private absoluteRouteUrl(path: string): string | null {
    if (typeof window === "undefined" || !window.location?.origin) return null;
    const clean = this.cleanPath(path);
    return new URL(clean === "/" ? "/" : clean, window.location.origin).toString();
  }

  private validAbsoluteUrl(value?: string | null): string | null {
    if (!value?.trim()) return null;
    try {
      const url = new URL(value.trim(), typeof window !== "undefined" ? window.location.origin : undefined);
      return url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private validTrackingId(value?: string | null): string {
    const id = value?.trim() || "";
    return /^(G-[A-Z0-9]+|GT-[A-Z0-9]+|GTM-[A-Z0-9]+|AW-\d+)$/.test(id) ? id : "";
  }
}
