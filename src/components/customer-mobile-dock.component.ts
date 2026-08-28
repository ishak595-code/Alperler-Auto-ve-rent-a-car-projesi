import { Component, HostListener, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { filter } from "rxjs/operators";
import { NavigationConfigService } from "../services/navigation-config.service";
import { isDockItemCurrent, shouldRenderMobileDock } from "../services/mobile-dock-route-policy";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [MatIconModule, RouterLink],
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
            class="dock-action"
            [class.dock-active]="isCurrent(item.route)"
            [attr.aria-current]="isCurrent(item.route) ? 'page' : null"
            [attr.aria-label]="item.label"
            (click)="onDockClick($event, item.route)"
          >
            <span class="dock-icon-shell" aria-hidden="true"><mat-icon>{{ item.icon }}</mat-icon></span>
            <span class="dock-label">{{ item.label }}</span>
          </a>
        }
      </nav>
    }
  `,
  styles: [`
    :host{display:contents}.customer-command-dock{display:none}
    @media (max-width:767px) and (pointer:coarse){
      .customer-command-dock{position:fixed;z-index:88;left:max(.42rem,env(safe-area-inset-left));right:max(.42rem,env(safe-area-inset-right));bottom:max(.42rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:stretch;min-height:70px;overflow:hidden;padding:4px;border:1px solid color-mix(in srgb,var(--alper-border,#27364a) 82%,transparent);border-radius:min(var(--site-radius,20px),22px);background:linear-gradient(180deg,color-mix(in srgb,var(--alper-surface,#0b1420) 98%,transparent),color-mix(in srgb,var(--alper-bg,#060a12) 99%,transparent));box-shadow:0 16px 40px rgba(2,6,23,.4),inset 0 1px 0 rgba(255,255,255,.055);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transition:transform .22s ease,opacity .18s ease}
      .customer-command-dock.dock-hidden{transform:translateY(calc(100% + 1.25rem));opacity:0;pointer-events:none}
    }
    .dock-action{position:relative;display:flex;min-width:0;min-height:61px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:14px;background:transparent;padding:4px 2px;color:color-mix(in srgb,var(--alper-subtle,#94a3b8) 88%,#fff 12%);text-decoration:none;font-size:9.3px;font-weight:900;line-height:1.05;text-align:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .16s ease,color .16s ease,transform .16s ease}
    .dock-action::before{content:"";position:absolute;left:30%;right:30%;top:0;height:3px;border-radius:0 0 999px 999px;background:transparent;transition:background-color .16s ease}
    .dock-icon-shell{display:grid;width:32px;height:30px;place-items:center;border-radius:10px;background:transparent;transition:background-color .16s ease,transform .16s ease}
    .dock-action mat-icon{width:22px;height:22px;font-size:22px;line-height:22px}
    .dock-label{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dock-action:active{transform:translateY(1px)}
    .dock-action:focus-visible{outline:2px solid var(--alper-blue-light,#93c5fd);outline-offset:-2px}
    .dock-action.dock-active{background:color-mix(in srgb,var(--alper-blue,#315e86) 25%,transparent);color:#fff}
    .dock-action.dock-active::before{background:var(--alper-blue-light,#93c5fd)}
    .dock-action.dock-active .dock-icon-shell{background:color-mix(in srgb,var(--alper-blue,#315e86) 38%,transparent);transform:translateY(-1px)}
    @media(max-width:350px) and (pointer:coarse){.customer-command-dock{left:3px;right:3px}.dock-action{font-size:8.5px}.dock-icon-shell{width:29px}.dock-action mat-icon{width:20px;height:20px;font-size:20px;line-height:20px}}
    @media(display-mode:standalone) and (max-width:767px) and (pointer:coarse), (display-mode:fullscreen) and (max-width:767px) and (pointer:coarse){.customer-command-dock{bottom:max(.55rem,env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.customer-command-dock,.dock-action,.dock-icon-shell{transition:none}}
  `],
})
export class CustomerMobileDockComponent {
  readonly router = inject(Router);
  readonly navigation = inject(NavigationConfigService);
  readonly hidden = signal(false);
  readonly currentUrl = signal(this.router.url);
  private lastScrollY = 0;

  constructor() {
    if (typeof window !== "undefined") this.lastScrollY = Math.max(0, window.scrollY || 0);
    this.updateVisibility(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.updateVisibility((event as NavigationEnd).urlAfterRedirects);
    });
  }

  isCurrent(route: string): boolean {
    return isDockItemCurrent(this.currentUrl(), route);
  }

  onDockClick(event: MouseEvent, route: string): void {
    if (!this.isCurrent(route)) return;
    event.preventDefault();
    this.navigation.setMobileDockAutoHidden(false);
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
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
    const shouldHide = !shouldRenderMobileDock(rawUrl);
    this.currentUrl.set(rawUrl);
    this.hidden.set(shouldHide);
    this.navigation.setMobileDockRouteHidden(shouldHide);
    this.navigation.setMobileDockAutoHidden(false);
    if (typeof window !== "undefined") this.lastScrollY = Math.max(0, window.scrollY || 0);
  }
}
