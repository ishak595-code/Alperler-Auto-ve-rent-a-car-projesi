import { Component, computed, inject, signal } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "../services/car.service";
import { FooterSettingsService } from "../services/footer-settings.service";
import { cleanCustomerPath } from "../services/mobile-dock-route-policy";
import { NavigationConfigService } from "../services/navigation-config.service";
import { PUBLIC_WHATSAPP_FALLBACK_MESSAGE, buildPublicWhatsappHref, resolvePublicWhatsappDigits } from "../services/public-contact-fallback";
import { UiService } from "../services/ui.service";

/**
 * V253 global WhatsApp FAB (bottom chrome).
 *
 * One owner for every public customer page (home, catalogues, contact, blog, ...), mounted once by
 * AppComponent. Pages that own a fixed bottom action bar (vehicle/tour detail, checkout, account)
 * already carry their own WhatsApp action, so the FAB stays off there instead of covering CTAs.
 * On phones the FAB and the homepage dock never share the screen: while the dock is visible the FAB
 * yields (fades out and leaves the tab order); when the dock auto-hides on scroll the FAB glides
 * into the safe-area corner. The number never depends on a successful site_config read.
 */
@Component({
  selector: "app-whatsapp-fab",
  standalone: true,
  template: `
    @if (whatsappFabVisible()) {
      <a [href]="whatsappHref()" target="_blank" rel="noopener noreferrer" class="whatsapp-fab" [class.fab-yield]="navigation.mobileDockRendered()" [attr.aria-label]="t().common.whatsappFabAria || 'WhatsApp'" data-chrome="whatsapp-fab"><svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 0C5.395 0 0 5.393 0 12.032c0 2.126.551 4.204 1.6 6.044L.194 24l6.064-1.589A12.016 12.016 0 0012.031 24c6.634 0 12.03-5.393 12.03-12.03S18.667 0 12.031 0zm3.87 17.202c-.596 1.688-3.045 2.158-4.225 1.956-2.126-.367-4.48-1.956-6.02-3.486-1.54-1.53-3.11-3.873-3.477-6.002-.192-1.18.257-3.63 1.946-4.234.34-.12.724-.138 1.054.01.275.12.504.385.66.696.532 1.063 1.137 2.65 1.256 2.924.12.276.156.606.01.909-.156.312-.413.578-.716.89-.312.312-.66.697-.33 1.266.33.57 1.486 2.45 3.2 3.974 1.348 1.192 2.87 1.632 3.42 1.962.55.33 1.045.248 1.412-.046.367-.294 1.055-1.21 1.44-1.633.386-.421.78-.348 1.202-.192.422.155 2.64 1.248 3.09 1.476.45.23.75.348.86.541.11.192.11 1.11-.476 2.808z" /></svg></a>
      @if (reserveSpace()) { <div class="fab-lane" aria-hidden="true"></div> }
    }
  `,
  styles: [`
    :host{display:contents}
    .whatsapp-fab{position:fixed;right:max(1rem,calc(env(safe-area-inset-right) + .5rem));bottom:max(1rem,calc(env(safe-area-inset-bottom) + .75rem));z-index:87;display:grid;width:52px;height:52px;place-items:center;border-radius:999px;background:#1faa55;color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 32px rgba(2,6,23,.34),0 0 0 4px rgba(31,170,85,.14);opacity:1;visibility:visible;transform:translate3d(0,0,0);transition:opacity .22s ease,transform .26s cubic-bezier(.2,.8,.2,1),visibility 0s linear 0s,box-shadow .16s ease,background-color .16s ease;-webkit-tap-highlight-color:transparent}
    .whatsapp-fab svg{width:26px;height:26px}
    .whatsapp-fab:active{transform:scale(.96)}
    .whatsapp-fab:focus-visible{outline:3px solid #fff;outline-offset:3px}
    .whatsapp-fab:hover{background:#178f46;box-shadow:0 16px 36px rgba(2,6,23,.4),0 0 0 4px rgba(31,170,85,.2)}
    .fab-lane{display:none}
    @media(max-width:639px) and (pointer:coarse), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .whatsapp-fab.fab-yield{opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(0,1.5rem,0) scale(.85);transition:opacity .16s ease,transform .2s ease,visibility 0s linear .2s}
      /* Inner pages have no footer lane: a static spacer lets the last line/button scroll above the FAB. */
      .fab-lane{display:block;height:calc(4.75rem + env(safe-area-inset-bottom))}
    }
    @media(prefers-reduced-motion:reduce){.whatsapp-fab{transition:none}}
  `],
})
export class WhatsappFabComponent {
  private readonly ui = inject(UiService);
  private readonly carService = inject(CarService);
  private readonly footer = inject(FooterSettingsService);
  private readonly router = inject(Router);
  readonly navigation = inject(NavigationConfigService);
  readonly t = this.ui.translations;
  private readonly fabReady = signal(false);
  readonly currentPath = signal(cleanCustomerPath(typeof window !== "undefined" ? window.location.pathname : this.router.url));

  readonly whatsappDigits = computed(() => resolvePublicWhatsappDigits(this.carService.getConfig()()));
  /** The homepage/404 shell (MainLayout) reserves the lane in its footer; inner pages use the spacer. */
  readonly reserveSpace = computed(() => this.currentPath() !== "/");
  readonly whatsappHref = computed(() => buildPublicWhatsappHref(this.whatsappDigits(), this.whatsappMessage()));

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => this.currentPath.set(cleanCustomerPath((event as NavigationEnd).urlAfterRedirects)));
    // Reveal shortly after first paint (fixed element, no layout shift).
    if (typeof window !== "undefined") window.setTimeout(() => this.fabReady.set(true), 600);
  }

  /** Bottom chrome: WhatsApp FAB + footer Feedback CTA are independent controls; neither replaces the other. */
  whatsappFabVisible(): boolean {
    return this.fabReady() && this.footer.settings().showWhatsapp!==false && this.whatsappDigits().length > 0 && !this.hasOwnBottomActionBar();
  }

  /** Detail/checkout/account surfaces own a fixed bottom action bar (with their own WhatsApp action). */
  private hasOwnBottomActionBar(): boolean {
    const url = this.currentPath();
    return /^\/(fleet|sales)\/[^/]+$/.test(url) || /^\/tour\/[^/]+$/.test(url) || /^\/(booking-checkout|track-car|account|branch-portal|admin)(\/|$)/.test(url);
  }

  /** Prefilled message: admin/pack greeting, plus the page the customer is looking at (never a hardcoded domain). */
  private whatsappMessage(): string {
    const pack = String(this.t().common.whatsappDefault || "").trim();
    const custom = String(this.carService.getConfig()().whatsappMessage || "").trim();
    const base = this.ui.currentLang() !== "TR" && pack ? pack : custom || String(this.footer.settings().whatsappDefaultMessage || "").trim() || pack || PUBLIC_WHATSAPP_FALLBACK_MESSAGE;
    const path = this.currentPath();
    if (path === "/" || typeof window === "undefined") return base;
    const label = String(this.t().common.whatsappPageContext || "").trim() || "Sayfa";
    return `${base}\n${label}: ${window.location.origin}${path}`;
  }
}
