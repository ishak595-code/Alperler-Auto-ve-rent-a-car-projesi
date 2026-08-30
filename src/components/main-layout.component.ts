import { CommonModule, Location } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "../services/car.service";
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
      <a href="#main-content" class="skip-link">İçeriğe geç</a>
      <app-navbar></app-navbar>
      <main id="main-content" tabindex="-1" class="customer-main"><router-outlet></router-outlet></main>

      <app-customer-prefooter-v174></app-customer-prefooter-v174>
      <app-customer-footer-v70></app-customer-footer-v70>

      @defer (on idle) {
        <app-feedback></app-feedback>
      }

      @if (isHomePage() && showWhatsapp() && getWhatsappNumber()) {
        <a [href]="getWhatsappHref()" target="_blank" rel="noopener noreferrer" class="whatsapp-fab" [class.dock-offset]="navigation.mobileDockRendered()" aria-label="WhatsApp"><svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 0C5.395 0 0 5.393 0 12.032c0 2.126.551 4.204 1.6 6.044L.194 24l6.064-1.589A12.016 12.016 0 0012.031 24c6.634 0 12.03-5.393 12.03-12.03S18.667 0 12.031 0zm3.87 17.202c-.596 1.688-3.045 2.158-4.225 1.956-2.126-.367-4.48-1.956-6.02-3.486-1.54-1.53-3.11-3.873-3.477-6.002-.192-1.18.257-3.63 1.946-4.234.34-.12.724-.138 1.054.01.275.12.504.385.66.696.532 1.063 1.137 2.65 1.256 2.924.12.276.156.606.01.909-.156.312-.413.578-.716.89-.312.312-.66.697-.33 1.266.33.57 1.486 2.45 3.2 3.974 1.348 1.192 2.87 1.632 3.42 1.962.55.33 1.045.248 1.412-.046.367-.294 1.055-1.21 1.44-1.633.386-.421.78-.348 1.202-.192.422.155 2.64 1.248 3.09 1.476.45.23.75.348.86.541.11.192.11 1.11-.476 2.808z" /></svg></a>
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
  uiService=inject(UiService);carService=inject(CarService);navigation=inject(NavigationConfigService);router=inject(Router);location=inject(Location);isHomePage=signal(true);showWhatsapp=signal(false);
  constructor(){this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>this.updatePageState());this.updatePageState();if(typeof window!=="undefined")setTimeout(()=>this.showWhatsapp.set(true),15000);}
  getWhatsappNumber(){const config=this.carService.getConfig()();return String(config.whatsapp||config.phone||"").replace(/\D/g,"");}
  getWhatsappMessage(){const customMsg=this.carService.getConfig()().whatsappMessage;return customMsg?.trim()||"Merhaba, detaylı bilgi almak istiyorum.";}
  getWhatsappHref(){return`https://wa.me/${this.getWhatsappNumber()}?text=${encodeURIComponent(this.getWhatsappMessage())}`;}
  private updatePageState(){const url=this.router.url.split("?")[0];this.isHomePage.set(url==="/");}
  isVehicleDetailPage(){const url=this.router.url.split("?")[0];return /^\/(fleet|sales)\/[^/]+$/.test(url);}
  goBack(){if(window.history.length>1)this.location.back();else void this.router.navigate(["/"]);}
  getPageTitle(){const url=this.router.url.split("?")[0];if(url.startsWith("/fleet"))return"Kiralık Araçlar";if(url.startsWith("/sales"))return"Satılık Araçlar";if(url.startsWith("/blog"))return"Blog & Haberler";if(url.startsWith("/tours"))return"Turlar";if(url.startsWith("/list-your-car"))return"Arabanı Değerlendir";if(url.startsWith("/contact"))return"İletişim";if(url.startsWith("/about"))return"Hakkımızda";if(url.startsWith("/legal"))return"Kurumsal";if(url.startsWith("/appointment"))return"Randevu Talebi";if(url.startsWith("/faq"))return"S.S.S.";return"Alperler Rent A Car";}
}
