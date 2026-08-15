import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    @if (!hidden()) {
      <nav class="customer-command-dock xl:hidden" aria-label="Hızlı müşteri işlemleri">
        <button type="button" (click)="openSearch()" class="dock-action dock-search" aria-label="Araç, tur veya blog ara">
          <span class="dock-search-icon"><mat-icon aria-hidden="true">search</mat-icon></span><span>Ara</span>
        </button>
        <a routerLink="/" fragment="campaigns-heading" (click)="goToCampaigns($event)" class="dock-action" aria-label="Kampanyalara git">
          <mat-icon aria-hidden="true">local_offer</mat-icon><span>Kampanya</span>
        </a>
        <a routerLink="/appointment" class="dock-action" aria-label="Randevu talebi oluştur">
          <mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span>
        </a>
      </nav>
    }
  `,
  styles: [`
    :host{display:block}
    .customer-command-dock{position:fixed;z-index:88;left:max(.65rem,env(safe-area-inset-left));right:max(.65rem,env(safe-area-inset-right));bottom:max(.65rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:5px;padding:7px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:linear-gradient(160deg,rgba(7,16,31,.95),rgba(10,24,45,.91));box-shadow:0 22px 55px rgba(2,6,23,.34),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    .dock-action{position:relative;display:flex;min-width:0;min-height:58px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:17px;background:transparent;padding:5px 3px;color:#cbd5e1;text-decoration:none;font-size:10px;font-weight:850;line-height:1.1;letter-spacing:.01em;touch-action:manipulation;transition:background-color .18s ease,color .18s ease,transform .18s ease}.dock-action mat-icon{width:24px;height:24px;font-size:24px}.dock-action:active{transform:translateY(1px)}.dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}.dock-action:hover{background:rgba(255,255,255,.07);color:#fff}
    .dock-search{align-items:flex-start;padding-left:clamp(12px,5vw,26px);color:white}.dock-search-icon{display:flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:14px;background:#2563eb;box-shadow:0 10px 24px rgba(37,99,235,.32)}.dock-search>span:last-child{margin-left:7px;margin-top:1px}
    @media (max-width:380px){.customer-command-dock{left:5px;right:5px;padding:5px}.dock-action{font-size:9px}.dock-search{padding-left:10px}.dock-search-icon{width:37px;height:37px}}
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

  async openSearch(): Promise<void> {
    const currentPath = this.cleanPath(this.router.url);
    if (currentPath !== "/") await this.router.navigate(["/"]);
    this.focusHeroSearch();
  }

  async goToCampaigns(event: Event): Promise<void> {
    event.preventDefault();
    const currentPath = this.cleanPath(this.router.url);
    if (currentPath !== "/") await this.router.navigate(["/"]);
    if (typeof window === "undefined") return;
    window.setTimeout(() => document.getElementById("campaigns-heading")?.scrollIntoView({ behavior: this.prefersReducedMotion() ? "auto" : "smooth", block: "start" }), 50);
  }

  private focusHeroSearch(): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    window.setTimeout(() => {
      const input = document.querySelector('input[aria-label="Araç, tur veya blog ara"]') as HTMLInputElement | null;
      if (!input) return;
      input.scrollIntoView({ behavior: this.prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => input.focus({ preventScroll: true }), this.prefersReducedMotion() ? 0 : 180);
    }, 50);
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
  private prefersReducedMotion(): boolean { return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true; }
}
