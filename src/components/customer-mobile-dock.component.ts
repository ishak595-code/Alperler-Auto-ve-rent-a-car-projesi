import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  template: `
    @if (!hidden()) {
      <nav class="customer-command-dock" aria-label="Mobil ana menü">
        <a routerLink="/fleet" routerLinkActive="dock-active" class="dock-action" aria-label="Kiralık araçları aç">
          <mat-icon aria-hidden="true">key</mat-icon><span>Kiralık</span>
        </a>
        <a routerLink="/sales" routerLinkActive="dock-active" class="dock-action" aria-label="Satılık araçları aç">
          <mat-icon aria-hidden="true">directions_car</mat-icon><span>Satılık</span>
        </a>
        <a routerLink="/search" routerLinkActive="dock-active" class="dock-action" aria-label="Araç, tur veya ilan ara">
          <mat-icon aria-hidden="true">search</mat-icon><span>Ara</span>
        </a>
        <a routerLink="/campaigns" routerLinkActive="dock-active" class="dock-action" aria-label="Fırsatları ve kampanyaları aç">
          <mat-icon aria-hidden="true">local_offer</mat-icon><span>Fırsatlar</span>
        </a>
        <a routerLink="/appointment" routerLinkActive="dock-active" class="dock-action" aria-label="Randevu oluştur">
          <mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span>
        </a>
      </nav>
    }
  `,
  styles: [`
    :host{display:contents}.customer-command-dock{display:none}
    @media (max-width:767px), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .customer-command-dock{position:fixed;z-index:88;left:max(.42rem,env(safe-area-inset-left));right:max(.42rem,env(safe-area-inset-right));bottom:max(.42rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:stretch;min-height:67px;padding:4px;border:1px solid rgba(148,163,184,.2);border-radius:20px;background:linear-gradient(180deg,rgba(7,15,29,.975),rgba(5,12,24,.99));box-shadow:0 16px 40px rgba(2,6,23,.38),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    }
    .dock-action{position:relative;display:flex;min-width:0;min-height:58px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:13px;background:transparent;padding:4px 2px;color:#94a3b8;text-decoration:none;font-size:9px;font-weight:900;line-height:1;text-align:center;touch-action:manipulation;transition:background-color .16s ease,color .16s ease,transform .16s ease}.dock-action::before{content:"";position:absolute;left:32%;right:32%;top:1px;height:2px;border-radius:999px;background:transparent}.dock-action mat-icon{width:21px;height:21px;font-size:21px}.dock-action:active{transform:translateY(1px)}.dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:-2px}.dock-action.dock-active{background:rgba(37,99,235,.11);color:#f8fafc}.dock-action.dock-active::before{background:#60a5fa}
    @media(max-width:350px){.customer-command-dock{left:3px;right:3px}.dock-action{font-size:8.4px}.dock-action mat-icon{width:20px;height:20px;font-size:20px}}
    @media(display-mode:standalone) and (max-width:767px){.customer-command-dock{bottom:max(.55rem,env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.dock-action{transition:none}}
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
      path.startsWith("/branch-portal") ||
      /^\/(fleet|sales)\/[^/]+$/.test(path) ||
      /^\/tour\/[^/]+$/.test(path) ||
      path.startsWith("/booking") ||
      path.startsWith("/appointment") ||
      path.startsWith("/track-car")
    );
  }

  private cleanPath(url: string): string { return url.split("?")[0].split("#")[0]; }
}
