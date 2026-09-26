import { CommonModule, Location } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "../services/car.service";
import { FooterSettingsService } from "../services/footer-settings.service";
import { NavigationConfigService } from "../services/navigation-config.service";
import { PUBLIC_WHATSAPP_FALLBACK_MESSAGE, buildPublicWhatsappHref, resolvePublicWhatsappDigits } from "../services/public-contact-fallback";
import { UiService } from "../services/ui.service";
import { CustomerFooterV70Component } from "./customer-footer-v70.component";
import { CustomerPrefooterV174Component } from "./customer-prefooter-v174.component";
import { FeedbackComponent } from "./feedback.component";
import { NavbarComponent } from "./navbar.component";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [CommonModule,RouterOutlet,NavbarComponent,CustomerPrefooterV174Component,CustomerFooterV70Component,FeedbackComponent,MatIconModule],
  template: `
    <div class="layout-root">
      <a href="#main-content" class="skip-link">{{ t().common.skipToContent }}</a>
      <app-navbar></app-navbar>
      <main id="main-content" tabindex="-1" class="customer-main"><router-outlet></router-outlet></main>

      <app-customer-prefooter-v174></app-customer-prefooter-v174>
      <app-customer-footer-v70 [class.mobile-dock-present]="navigation.mobileDockRendered()"></app-customer-footer-v70>

      <app-feedback></app-feedback>

      <!-- WhatsApp FAB (bottom chrome) coexists with footer BOTTOM Feedback CTA — neither replaces the other. -->
      @if (whatsappFabVisible()) {
        <a [href]="getWhatsappHref()" target="_blank" rel="noopener noreferrer" class="whatsapp-fab" [class.dock-offset]="navigation.mobileDockRendered()" [attr.aria-label]="t().common.whatsappFabAria || 'WhatsApp'" data-chrome="whatsapp-fab"><svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 0C5.395 0 0 5.393 0 12.032c0 2.126.551 4.204 1.6 6.044L.194 24l6.064-1.589A12.016 12.016 0 0012.031 24c6.634 0 12.03-5.393 12.03-12.03S18.667 0 12.031 0zm3.87 17.202c-.596 1.688-3.045 2.158-4.225 1.956-2.126-.367-4.48-1.956-6.02-3.486-1.54-1.53-3.11-3.873-3.477-6.002-.192-1.18.257-3.63 1.946-4.234.34-.12.724-.138 1.054.01.275.12.504.385.66.696.532 1.063 1.137 2.65 1.256 2.924.12.276.156.606.01.909-.156.312-.413.578-.716.89-.312.312-.66.697-.33 1.266.33.57 1.486 2.45 3.2 3.974 1.348 1.192 2.87 1.632 3.42 1.962.55.33 1.045.248 1.412-.046.367-.294 1.055-1.21 1.44-1.633.386-.421.78-.348 1.202-.192.422.155 2.64 1.248 3.09 1.476.45.23.75.348.86.541.11.192.11 1.11-.476 2.808z" /></svg></a>
      }
    </div>
  `,
  styles: [`
    :host{display:block}.layout-root{position:relative;display:flex;min-height:100vh;min-height:100dvh;min-width:0;flex-direction:column;overflow-x:hidden;background:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.customer-main{min-width:0;flex:1;padding-top:72px}.skip-link{position:fixed;left:12px;top:12px;z-index:220;transform:translateY(calc(-100% - 28px));border-radius:10px;background:#fff;padding:11px 15px;color:#0f172a;font-weight:900;text-decoration:none;box-shadow:0 16px 36px rgba(2,6,23,.28);transition:transform .16s ease}.skip-link:focus,.skip-link:focus-visible{transform:translateY(0);outline:3px solid #3b82f6;outline-offset:2px}.whatsapp-fab{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:87;display:grid;width:48px;height:48px;place-items:center;border-radius:999px;background:#22c55e;color:#fff;box-shadow:0 12px 30px rgba(2,6,23,.25);transition:bottom .2s ease,transform .16s ease,box-shadow .16s ease,background-color .16s ease}.whatsapp-fab svg{width:24px;height:24px}.whatsapp-fab:active{transform:scale(.96)}.whatsapp-fab:focus-visible{outline:2px solid #fff;outline-offset:3px}.whatsapp-fab:hover{background:#16a34a;box-shadow:0 16px 34px rgba(2,6,23,.3)}
    @media(min-width:768px){.customer-main{padding-top:84px}}
    @media(min-width:1280px){.customer-main{padding-top:96px}}
    @media(max-width:639px) and (pointer:coarse), (max-width:950px) and (max-height:500px) and (pointer:coarse){.whatsapp-fab.dock-offset{bottom:calc(max(1rem,env(safe-area-inset-bottom)) + 5.15rem)}}
    @media(display-mode:standalone) and (pointer:coarse), (display-mode:fullscreen) and (pointer:coarse){.customer-main{padding-top:calc(72px + env(safe-area-inset-top))}}
    @media(display-mode:standalone) and (pointer:coarse) and (min-width:768px), (display-mode:fullscreen) and (pointer:coarse) and (min-width:768px){.customer-main{padding-top:calc(84px + env(safe-area-inset-top))}}
    @media(prefers-reduced-motion:reduce){.skip-link,.whatsapp-fab{transition:none}}
  `],
})
export class MainLayoutComponent {
  uiService=inject(UiService);t=this.uiService.translations;carService=inject(CarService);footer=inject(FooterSettingsService);navigation=inject(NavigationConfigService);router=inject(Router);location=inject(Location);isHomePage=signal(true);currentPath=signal("/");fabReady=signal(false);
  constructor(){
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>this.updatePageState());
    this.updatePageState();
    // Reveal shortly after first paint (fixed element, no layout shift). The number never depends on a
    // successful site_config read: configured value -> last-good snapshot -> public business line.
    if(typeof window!=="undefined")window.setTimeout(()=>this.fabReady.set(true),600);
  }
  getWhatsappNumber(){return resolvePublicWhatsappDigits(this.carService.getConfig()());}
  getWhatsappMessage(){const pack=String(this.t().common.whatsappDefault||"").trim();if(this.uiService.currentLang()!=="TR"&&pack)return pack;const customMsg=String(this.carService.getConfig()().whatsappMessage||"").trim();return customMsg||String(this.footer.settings().whatsappDefaultMessage||"").trim()||pack||PUBLIC_WHATSAPP_FALLBACK_MESSAGE;}
  getWhatsappHref(){return buildPublicWhatsappHref(this.getWhatsappNumber(),this.getWhatsappMessage());}
  /** Bottom chrome: WhatsApp FAB + footer Feedback CTA are independent controls; neither replaces the other. */
  whatsappFabVisible(){return this.fabReady()&&this.footer.settings().showWhatsapp!==false&&this.getWhatsappNumber().length>0&&!this.hasOwnBottomActionBar();}
  /** Detail/checkout/account surfaces own a fixed bottom action bar; keep the FAB off those to avoid covering CTAs. */
  private hasOwnBottomActionBar(){const url=this.currentPath();return /^\/(fleet|sales)\/[^/]+$/.test(url)||/^\/tour\/[^/]+$/.test(url)||/^\/(booking-checkout|track-car|account|branch-portal|admin)(\/|$)/.test(url);}
  private updatePageState(){const url=this.router.url.split("?")[0].split("#")[0]||"/";this.currentPath.set(url);this.isHomePage.set(url==="/");}
  isVehicleDetailPage(){const url=this.router.url.split("?")[0];return /^\/(fleet|sales)\/[^/]+$/.test(url);}
  goBack(){if(window.history.length>1)this.location.back();else void this.router.navigate(["/"]);}
  getPageTitle(){const url=this.router.url.split("?")[0];const p=this.t().layoutTitles;if(url.startsWith("/fleet"))return p.fleet;if(url.startsWith("/sales"))return p.sales;if(url.startsWith("/blog"))return p.blog;if(url.startsWith("/tours"))return p.tours;if(url.startsWith("/list-your-car"))return p.listYourCar;if(url.startsWith("/contact"))return p.contact;if(url.startsWith("/about"))return p.about;if(url.startsWith("/legal"))return p.legal;if(url.startsWith("/appointment"))return p.appointment;if(url.startsWith("/faq"))return p.faq;return p.home;}
}
