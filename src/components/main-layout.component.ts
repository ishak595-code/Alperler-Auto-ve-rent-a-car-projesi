import { CommonModule, Location } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "../services/car.service";
import { FooterSettingsService } from "../services/footer-settings.service";
import { NavigationConfigService } from "../services/navigation-config.service";
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
      <app-customer-footer-v70 [class.mobile-dock-present]="navigation.mobileDockRendered()" [class.bottom-chrome-space]="bottomChromeLane()"></app-customer-footer-v70>

      <app-feedback></app-feedback>

      <!-- V253: the WhatsApp FAB is global bottom chrome (app-whatsapp-fab in AppComponent) so every
           public page gets it once; this shell only reserves its lane in the footer on phones. -->
    </div>
  `,
  styles: [`
    :host{display:block}.layout-root{position:relative;display:flex;min-height:100vh;min-height:100dvh;min-width:0;flex-direction:column;overflow-x:hidden;background:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.customer-main{min-width:0;flex:1;padding-top:72px}.skip-link{position:fixed;left:12px;top:12px;z-index:220;transform:translateY(calc(-100% - 28px));border-radius:10px;background:#fff;padding:11px 15px;color:#0f172a;font-weight:900;text-decoration:none;box-shadow:0 16px 36px rgba(2,6,23,.28);transition:transform .16s ease}.skip-link:focus,.skip-link:focus-visible{transform:translateY(0);outline:3px solid #3b82f6;outline-offset:2px}
    @media(min-width:768px){.customer-main{padding-top:84px}}
    @media(min-width:1280px){.customer-main{padding-top:96px}}
    @media(display-mode:standalone) and (pointer:coarse), (display-mode:fullscreen) and (pointer:coarse){.customer-main{padding-top:calc(72px + env(safe-area-inset-top))}}
    @media(display-mode:standalone) and (pointer:coarse) and (min-width:768px), (display-mode:fullscreen) and (pointer:coarse) and (min-width:768px){.customer-main{padding-top:calc(84px + env(safe-area-inset-top))}}
    @media(prefers-reduced-motion:reduce){.skip-link{transition:none}}
  `],
})
export class MainLayoutComponent {
  uiService=inject(UiService);t=this.uiService.translations;carService=inject(CarService);footer=inject(FooterSettingsService);navigation=inject(NavigationConfigService);router=inject(Router);location=inject(Location);isHomePage=signal(true);currentPath=signal("/");
  constructor(){
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>this.updatePageState());
    this.updatePageState();
  }
  /** Phones reserve the bottom-chrome lane (dock or WhatsApp FAB) by route so it never toggles on scroll. */
  bottomChromeLane(){return this.navigation.mobileDockOnRoute()||(this.footer.settings().showWhatsapp!==false&&!this.hasOwnBottomActionBar());}
  /** Detail/checkout/account surfaces own a fixed bottom action bar; keep the FAB off those to avoid covering CTAs. */
  private hasOwnBottomActionBar(){const url=this.currentPath();return /^\/(fleet|sales)\/[^/]+$/.test(url)||/^\/tour\/[^/]+$/.test(url)||/^\/(booking-checkout|track-car|account|branch-portal|admin)(\/|$)/.test(url);}
  private updatePageState(){const url=this.router.url.split("?")[0].split("#")[0]||"/";this.currentPath.set(url);this.isHomePage.set(url==="/");}
  isVehicleDetailPage(){const url=this.router.url.split("?")[0];return /^\/(fleet|sales)\/[^/]+$/.test(url);}
  goBack(){if(window.history.length>1)this.location.back();else void this.router.navigate(["/"]);}
  getPageTitle(){const url=this.router.url.split("?")[0];const p=this.t().layoutTitles;if(url.startsWith("/fleet"))return p.fleet;if(url.startsWith("/sales"))return p.sales;if(url.startsWith("/blog"))return p.blog;if(url.startsWith("/tours"))return p.tours;if(url.startsWith("/list-your-car"))return p.listYourCar;if(url.startsWith("/contact"))return p.contact;if(url.startsWith("/about"))return p.about;if(url.startsWith("/legal"))return p.legal;if(url.startsWith("/appointment"))return p.appointment;if(url.startsWith("/faq"))return p.faq;return p.home;}
}
