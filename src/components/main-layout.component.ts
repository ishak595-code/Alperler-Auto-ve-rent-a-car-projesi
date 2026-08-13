import { Component, inject, signal } from "@angular/core";
import { RouterOutlet, Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { NavbarComponent } from "./navbar.component";
import { FooterComponent } from "./footer.component";
import { FeedbackComponent } from "./feedback.component";
import { UiService } from "../services/ui.service";
import { CarService } from "../services/car.service";
import { CommonModule, Location } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    FeedbackComponent,
    MatIconModule,
  ],
  template: `
    <div class="min-h-screen flex flex-col font-sans relative bg-slate-50 overflow-x-hidden">
      <a
        href="#main-content"
        class="fixed left-3 top-3 z-[200] -translate-y-24 focus:translate-y-0 bg-white text-slate-950 font-bold px-4 py-3 rounded-lg shadow-xl transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        İçeriğe geç
      </a>

      <app-navbar></app-navbar>

      <main id="main-content" tabindex="-1" class="flex-grow pt-[72px] md:pt-[96px] min-w-0">
        <router-outlet></router-outlet>
      </main>

      <app-footer></app-footer>
      <app-feedback></app-feedback>

      @if (showWhatsapp()) {
        <a
          [href]="
            'https://wa.me/' +
            carService.getConfig()().whatsapp +
            '?text=' +
            getWhatsappMessage()
          "
          target="_blank"
          rel="noopener noreferrer"
          class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[90] w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 md:hover:scale-110 hover:shadow-lg transition-all hover:bg-green-600 animate-fade-in-up focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-600"
          aria-label="WhatsApp destek hattını yeni sekmede aç"
        >
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12.031 0C5.395 0 0 5.393 0 12.032c0 2.126.551 4.204 1.6 6.044L.194 24l6.064-1.589A12.016 12.016 0 0012.031 24c6.634 0 12.03-5.393 12.03-12.03S18.667 0 12.031 0zm3.87 17.202c-.596 1.688-3.045 2.158-4.225 1.956-2.126-.367-4.48-1.956-6.02-3.486-1.54-1.53-3.11-3.873-3.477-6.002-.192-1.18.257-3.63 1.946-4.234.34-.12.724-.138 1.054.01.275.12.504.385.66.696.532 1.063 1.137 2.65 1.256 2.924.12.276.156.606.01.909-.156.312-.413.578-.716.89-.312.312-.66.697-.33 1.266.33.57 1.486 2.45 3.2 3.974 1.348 1.192 2.87 1.632 3.42 1.962.55.33 1.045.248 1.412-.046.367-.294 1.055-1.21 1.44-1.633.386-.421.78-.348 1.202-.192.422.155 2.64 1.248 3.09 1.476.45.23.75.348.86.541.11.192.11 1.11-.476 2.808z"
            />
          </svg>
        </a>
      }
    </div>
  `,
})
export class MainLayoutComponent {
  uiService = inject(UiService);
  carService = inject(CarService);
  router = inject(Router);
  location = inject(Location);

  isHomePage = signal(true);
  showWhatsapp = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageState();
      });

    this.updatePageState();

    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.showWhatsapp.set(true);
      }, 15000);
    }
  }

  getWhatsappMessage(): string {
    const customMsg = this.carService.getConfig()().whatsappMessage;
    if (customMsg) {
      return encodeURIComponent(customMsg);
    }
    return encodeURIComponent("Merhaba, detaylı bilgi almak istiyorum.");
  }

  private updatePageState() {
    const url = this.router.url.split("?")[0];
    this.isHomePage.set(url === "/");
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  getPageTitle(): string {
    const url = this.router.url.split("?")[0];
    if (url.startsWith("/fleet")) return "Kiralık Araçlar";
    if (url.startsWith("/sales")) return "Satılık Araçlar";
    if (url.startsWith("/blog")) return "Blog & Haberler";
    if (url.startsWith("/tours")) return "VIP Turlar";
    if (url.startsWith("/list-your-car")) return "Arabanı Değerlendir";
    if (url.startsWith("/contact")) return "İletişim";
    if (url.startsWith("/about")) return "Hakkımızda";
    if (url.startsWith("/legal")) return "Kurumsal";
    if (url.startsWith("/appointment")) return "Randevu Talebi";
    if (url.startsWith("/faq")) return "S.S.S.";
    return "Alperler Auto";
  }
}
