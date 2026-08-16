import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive],
  template: `
    @if (!hidden()) {
      <nav class="customer-command-dock" aria-label="Mobil alt navigasyon">
        <a routerLink="/fleet" routerLinkActive="dock-active" class="dock-action" aria-label="Kiralık araçları aç">
          <mat-icon aria-hidden="true">key</mat-icon><span>Kiralık</span>
        </a>
        <a routerLink="/sales" routerLinkActive="dock-active" class="dock-action" aria-label="Satılık araçları aç">
          <mat-icon aria-hidden="true">directions_car</mat-icon><span>Satılık</span>
        </a>
        <a routerLink="/search" routerLinkActive="dock-active" class="dock-action dock-search" aria-label="İlan arama ekranını aç">
          <span class="dock-search-icon"><mat-icon aria-hidden="true">search</mat-icon></span><span>Ara</span>
        </a>
        <a routerLink="/campaigns" routerLinkActive="dock-active" class="dock-action" aria-label="Kampanyaları aç">
          <mat-icon aria-hidden="true">local_offer</mat-icon><span>Kampanya</span>
        </a>
        <a routerLink="/appointment" routerLinkActive="dock-active" class="dock-action" aria-label="Randevu talebi oluştur">
          <mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span>
        </a>
      </nav>
    }
  `,
  styles: [`
    :host{display:contents}

    /* Phone-first rule: the bottom dock must never compete with the desktop/tablet header. */
    .customer-command-dock{display:none}

    @media (max-width:767px), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .customer-command-dock{position:fixed;z-index:88;left:max(.55rem,env(safe-area-inset-left));right:max(.55rem,env(safe-area-inset-right));bottom:max(.55rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;gap:2px;padding:6px;border:1px solid rgba(255,255,255,.14);border-radius:25px;background:linear-gradient(160deg,rgba(7,16,31,.97),rgba(10,24,45,.94));box-shadow:0 22px 55px rgba(2,6,23,.36),inset 0 1px 0 rgba(255,255,255,.1);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    }

    .dock-action{position:relative;display:flex;min-width:0;min-height:58px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;border-radius:16px;background:transparent;padding:5px 2px;color:#cbd5e1;text-decoration:none;font-size:9.5px;font-weight:850;line-height:1.05;letter-spacing:0;touch-action:manipulation;transition:background-color .18s ease,color .18s ease,transform .18s ease}.dock-action mat-icon{width:23px;height:23px;font-size:23px}.dock-action:active{transform:translateY(1px)}.dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}.dock-action:hover,.dock-action.dock-active{background:rgba(255,255,255,.07);color:#fff}
    .dock-search{margin-top:-16px;color:white}.dock-search-icon{display:flex;width:48px;height:48px;align-items:center;justify-content:center;border:3px solid rgba(255,255,255,.16);border-radius:17px;background:#2563eb;box-shadow:0 12px 28px rgba(37,99,235,.4)}.dock-search-icon mat-icon{width:27px;height:27px;font-size:27px}.dock-search>span:last-child{margin-top:0}.dock-search.dock-active .dock-search-icon{background:#fff;color:#1d4ed8;border-color:#60a5fa}

    @media (max-width:380px){.customer-command-dock{left:4px;right:4px;padding:5px}.dock-action{font-size:8.5px;min-height:56px}.dock-action mat-icon{width:21px;height:21px;font-size:21px}.dock-search-icon{width:44px;height:44px}}
    @media (display-mode:standalone) and (max-width:767px){.customer-command-dock{bottom:max(.7rem,env(safe-area-inset-bottom))}}
    @media (prefers-reduced-motion:reduce){.dock-action{transition:none}}
  `],
})
export class CustomerMobileDockComponent {
  readonly router = inject(Router);
  readonly hidden = signal(false);

  constructor() {
    this.updateVisibility(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => this.updateVisibility((event as NavigationEnd).urlAfterRedirects));
  }

  private updateVisibility(rawUrl: string): void {
    const path = this.cleanPath(rawUrl);
    this.hidden.set(
      path.startsWith("/admin") ||
      /^\/(fleet|sales)\/[^/]+$/.test(path) ||
      /^\/tour\/[^/]+$/.test(path) ||
      path.startsWith("/booking") ||
      path.startsWith("/appointment") ||
      path.startsWith("/track-car")
    );
  }

  private cleanPath(url: string): string { return url.split("?")[0].split("#")[0]; }
}
