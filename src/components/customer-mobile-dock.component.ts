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
          <mat-icon aria-hidden="true">search</mat-icon><span>Ara</span>
        </a>
        <a routerLink="/tours" routerLinkActive="dock-active" class="dock-action" aria-label="Turları aç">
          <mat-icon aria-hidden="true">explore</mat-icon><span>Turlar</span>
        </a>
        <a routerLink="/campaigns" routerLinkActive="dock-active" class="dock-action" aria-label="Kampanyaları aç">
          <mat-icon aria-hidden="true">local_offer</mat-icon><span>Fırsatlar</span>
        </a>
        <a routerLink="/appointment" routerLinkActive="dock-active" class="dock-action" aria-label="Randevu talebi oluştur">
          <mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span>
        </a>
      </nav>
    }
  `,
  styles: [`
    :host{display:contents}
    .customer-command-dock{display:none}

    @media (max-width:767px), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .customer-command-dock{
        position:fixed;
        z-index:88;
        left:max(.45rem,env(safe-area-inset-left));
        right:max(.45rem,env(safe-area-inset-right));
        bottom:max(.45rem,env(safe-area-inset-bottom));
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        align-items:stretch;
        gap:2px;
        padding:5px;
        border:1px solid rgba(148,163,184,.22);
        border-radius:22px;
        background:rgba(7,16,31,.96);
        box-shadow:0 18px 42px rgba(2,6,23,.34),inset 0 1px 0 rgba(255,255,255,.08);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px)
      }
    }

    .dock-action{
      position:relative;
      display:flex;
      min-width:0;
      min-height:55px;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:3px;
      border:0;
      border-radius:14px;
      background:transparent;
      padding:5px 1px;
      color:#aebbd0;
      text-decoration:none;
      font-size:8.5px;
      font-weight:800;
      line-height:1.05;
      white-space:nowrap;
      touch-action:manipulation;
      transition:background-color .16s ease,color .16s ease,transform .16s ease
    }
    .dock-action mat-icon{width:21px;height:21px;font-size:21px}
    .dock-action:active{transform:translateY(1px)}
    .dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}
    .dock-action:hover,.dock-action.dock-active{background:rgba(255,255,255,.075);color:#fff}
    .dock-action.dock-active::after{content:"";position:absolute;left:28%;right:28%;bottom:3px;height:2px;border-radius:999px;background:#60a5fa}
    .dock-search{color:#dbeafe}
    .dock-search mat-icon{display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:10px;background:#2563eb;color:#fff;font-size:20px;box-shadow:0 6px 14px rgba(37,99,235,.26)}
    .dock-search.dock-active mat-icon{background:#eff6ff;color:#1d4ed8}

    @media (max-width:380px){
      .customer-command-dock{left:3px;right:3px;padding:4px;gap:1px}
      .dock-action{min-height:53px;font-size:7.7px}
      .dock-action mat-icon{width:20px;height:20px;font-size:20px}
      .dock-search mat-icon{width:28px;height:28px;font-size:19px}
    }

    @media (display-mode:standalone) and (max-width:767px){.customer-command-dock{bottom:max(.65rem,env(safe-area-inset-bottom))}}
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
