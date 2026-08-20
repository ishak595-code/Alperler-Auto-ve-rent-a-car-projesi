import { Component, HostListener, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter } from "rxjs/operators";
import { NavigationConfigService } from "../services/navigation-config.service";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  template: `
    @if (!hidden() && navigation.mobileDockEnabled()) {
      <nav
        class="customer-command-dock"
        [class.dock-hidden]="navigation.mobileDockAutoHidden()"
        [attr.aria-hidden]="navigation.mobileDockAutoHidden() ? 'true' : null"
        [attr.inert]="navigation.mobileDockAutoHidden() ? '' : null"
        aria-label="Hızlı menü"
      >
        @for (item of navigation.itemsFor('MOBILE_DOCK'); track item.id) {
          <a
            [routerLink]="item.route"
            routerLinkActive="dock-active"
            class="dock-action"
            [attr.aria-label]="item.label"
          >
            <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    }
  `,
  styles: [`
    :host{display:contents}.customer-command-dock{display:none}
    @media (max-width:767px), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .customer-command-dock{position:fixed;z-index:88;left:max(.42rem,env(safe-area-inset-left));right:max(.42rem,env(safe-area-inset-right));bottom:max(.42rem,env(safe-area-inset-bottom));display:flex;align-items:stretch;min-height:67px;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:none;padding:4px;border:1px solid rgba(148,163,184,.2);border-radius:20px;background:linear-gradient(180deg,rgba(7,15,29,.975),rgba(5,12,24,.99));box-shadow:0 16px 40px rgba(2,6,23,.38),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:transform .22s ease,opacity .18s ease}
      .customer-command-dock::-webkit-scrollbar{display:none}
      .customer-command-dock.dock-hidden{transform:translateY(calc(100% + 1.25rem));opacity:0;pointer-events:none}
    }
    .dock-action{position:relative;display:flex;min-width:64px;min-height:58px;flex:1 0 64px;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:13px;background:transparent;padding:4px 3px;color:#94a3b8;text-decoration:none;font-size:9px;font-weight:900;line-height:1.05;text-align:center;touch-action:manipulation;transition:background-color .16s ease,color .16s ease,transform .16s ease}.dock-action::before{content:"";position:absolute;left:32%;right:32%;top:1px;height:2px;border-radius:999px;background:transparent}.dock-action mat-icon{width:21px;height:21px;font-size:21px}.dock-action span{display:-webkit-box;overflow:hidden;max-width:100%;-webkit-box-orient:vertical;-webkit-line-clamp:2}.dock-action:active{transform:translateY(1px)}.dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:-2px}.dock-action.dock-active{background:rgba(37,99,235,.11);color:#f8fafc}.dock-action.dock-active::before{background:#60a5fa}
    @media(max-width:350px){.customer-command-dock{left:3px;right:3px}.dock-action{min-width:60px;flex-basis:60px;font-size:8.4px}.dock-action mat-icon{width:20px;height:20px;font-size:20px}}
    @media(display-mode:standalone) and (max-width:767px){.customer-command-dock{bottom:max(.55rem,env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.customer-command-dock,.dock-action{transition:none}}
  `],
})
export class CustomerMobileDockComponent {
  readonly router = inject(Router);
  readonly navigation = inject(NavigationConfigService);
  readonly hidden = signal(false);
  private lastScrollY = 0;

  constructor() {
    if (typeof window !== "undefined") this.lastScrollY = Math.max(0, window.scrollY || 0);
    this.updateVisibility(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.updateVisibility((event as NavigationEnd).urlAfterRedirects);
    });
  }

  @HostListener("window:scroll")
  onWindowScroll(): void {
    if (typeof window === "undefined") return;
    const currentY = Math.max(0, window.scrollY || 0);

    if (this.hidden() || !this.navigation.mobileDockEnabled() || !this.navigation.mobileDockAutoHideEnabled()) {
      this.navigation.setMobileDockAutoHidden(false);
      this.lastScrollY = currentY;
      return;
    }

    if (currentY <= 24) {
      this.navigation.setMobileDockAutoHidden(false);
      this.lastScrollY = currentY;
      return;
    }

    const delta = currentY - this.lastScrollY;
    if (Math.abs(delta) < 6) return;
    if (delta > 0 && currentY > 96) this.navigation.setMobileDockAutoHidden(true);
    if (delta < 0) this.navigation.setMobileDockAutoHidden(false);
    this.lastScrollY = currentY;
  }

  private updateVisibility(rawUrl: string): void {
    const path = this.cleanPath(rawUrl);
    const shouldHide = path !== "/";

    this.hidden.set(shouldHide);
    this.navigation.setMobileDockRouteHidden(shouldHide);
    this.navigation.setMobileDockAutoHidden(false);
    if (typeof window !== "undefined") this.lastScrollY = Math.max(0, window.scrollY || 0);
  }

  private cleanPath(url: string): string {
    const path = url.split("?")[0].split("#")[0];
    return path || "/";
  }
}
