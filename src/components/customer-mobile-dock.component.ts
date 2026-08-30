import { Component, DestroyRef, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { NavigationConfigService, NavigationItem } from "../services/navigation-config.service";
import { isDockItemCurrent, shouldRenderMobileDock } from "../services/mobile-dock-route-policy";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [MatIconModule, RouterLink],
  template: `
    @if (!hidden() && navigation.mobileDockEnabled()) {
      <nav class="customer-command-dock" [class.dock-auto-hidden]="autoHidden()" aria-label="Alt hızlı menü">
        @for (item of navigation.itemsFor('MOBILE_DOCK'); track item.id) {
          <a
            [routerLink]="item.route"
            class="dock-action"
            [class.dock-primary]="isPrimary(item)"
            [class.dock-active]="isCurrent(item.route)"
            [attr.aria-current]="isCurrent(item.route) ? 'page' : null"
            [attr.aria-label]="item.label"
            [attr.data-dock-item]="item.itemKey"
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
    @media (max-width:639px) and (pointer:coarse), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .customer-command-dock{position:fixed;z-index:88;left:max(.42rem,env(safe-area-inset-left));right:max(.42rem,env(safe-area-inset-right));bottom:max(.42rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:stretch;min-height:70px;overflow:visible;padding:4px;border:1px solid color-mix(in srgb,var(--alper-border,#27364a) 82%,transparent);border-radius:min(var(--site-radius,20px),22px);background:linear-gradient(180deg,var(--alper-surface,#0b1420),var(--alper-bg,#060a12));box-shadow:0 16px 40px rgba(2,6,23,.4),inset 0 1px 0 rgba(255,255,255,.055);transform:translate3d(0,0,0);opacity:1;will-change:transform;transition:transform .22s ease,opacity .16s ease}
      .customer-command-dock.dock-auto-hidden{transform:translate3d(0,calc(100% + 1.4rem + env(safe-area-inset-bottom)),0);opacity:0;pointer-events:none}
    }
    .dock-action{position:relative;display:flex;min-width:0;min-height:61px;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid transparent;border-radius:14px;background:transparent;padding:4px 2px;color:color-mix(in srgb,var(--alper-subtle,#94a3b8) 88%,#fff 12%);text-decoration:none;font-size:9.3px;font-weight:900;line-height:1.05;text-align:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:background-color .16s ease,color .16s ease,transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .dock-action::before{content:"";position:absolute;left:30%;right:30%;top:0;height:3px;border-radius:0 0 999px 999px;background:transparent;transition:background-color .16s ease}
    .dock-icon-shell{display:grid;width:32px;height:30px;place-items:center;border-radius:10px;background:transparent;transition:background-color .16s ease,transform .16s ease,box-shadow .16s ease}
    .dock-action mat-icon{width:22px;height:22px;font-size:22px;line-height:22px}
    .dock-label{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dock-action:active{transform:translateY(1px)}
    .dock-action:focus-visible{outline:3px solid var(--alper-gold,#c6a15b);outline-offset:-3px}
    .dock-action.dock-active{background:color-mix(in srgb,var(--alper-blue,#315e86) 25%,transparent);color:#fff}
    .dock-action.dock-active::before{background:var(--alper-blue-light,#93c5fd)}
    .dock-action.dock-active .dock-icon-shell{background:color-mix(in srgb,var(--alper-blue,#315e86) 38%,transparent);transform:translateY(-1px)}
    .dock-action.dock-primary{margin:-7px 1px 1px;border-color:color-mix(in srgb,var(--alper-gold,#c6a15b) 60%,transparent);background:linear-gradient(180deg,color-mix(in srgb,var(--alper-gold,#c6a15b) 18%,var(--alper-surface,#0b1420)),color-mix(in srgb,var(--alper-gold,#c6a15b) 8%,var(--alper-bg,#060a12)));color:#fff;box-shadow:0 12px 28px rgba(2,6,23,.34),0 0 0 1px rgba(198,161,91,.08)}
    .dock-action.dock-primary::before{background:var(--alper-gold,#c6a15b)}
    .dock-action.dock-primary .dock-icon-shell{width:38px;height:36px;border-radius:12px;background:var(--alper-gold,#c6a15b);color:#111827;box-shadow:0 8px 20px rgba(198,161,91,.22);transform:translateY(-1px)}
    .dock-action.dock-primary .dock-label{color:#f7e8c2;letter-spacing:.01em}
    .dock-action.dock-primary.dock-active{border-color:var(--alper-gold,#c6a15b);background:linear-gradient(180deg,color-mix(in srgb,var(--alper-gold,#c6a15b) 28%,var(--alper-surface,#0b1420)),color-mix(in srgb,var(--alper-gold,#c6a15b) 14%,var(--alper-bg,#060a12)))}
    @media(max-width:350px) and (pointer:coarse){.customer-command-dock{left:3px;right:3px}.dock-action{font-size:8.5px}.dock-icon-shell{width:29px}.dock-action mat-icon{width:20px;height:20px;font-size:20px;line-height:20px}.dock-action.dock-primary .dock-icon-shell{width:34px;height:33px}}
    @media(display-mode:standalone) and (pointer:coarse), (display-mode:fullscreen) and (pointer:coarse){.customer-command-dock{bottom:max(.55rem,env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.customer-command-dock,.dock-action,.dock-icon-shell{transition:none}}
  `],
})
export class CustomerMobileDockComponent {
  readonly router = inject(Router);
  readonly navigation = inject(NavigationConfigService);
  private readonly destroyRef = inject(DestroyRef);
  readonly hidden = signal(false);
  readonly autoHidden = signal(false);
  readonly currentUrl = signal(this.router.url);
  private lastScrollY = 0;
  private scrollFrame: number | null = null;

  constructor() {
    this.updateVisibility(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.updateVisibility(event.urlAfterRedirects);
    });
    this.bindStableScrollAutoHide();
  }

  isCurrent(route: string): boolean {
    return isDockItemCurrent(this.currentUrl(), route);
  }

  isPrimary(item: NavigationItem): boolean {
    return item.itemKey === "appointment" || item.metadata?.["primary"] === true;
  }

  private updateVisibility(rawUrl: string): void {
    const shouldHide = !shouldRenderMobileDock(rawUrl);
    this.currentUrl.set(rawUrl);
    this.hidden.set(shouldHide);
    this.navigation.setMobileDockRouteHidden(shouldHide);
    this.setAutoHidden(false);
    if (typeof window !== "undefined") this.lastScrollY = Math.max(0, window.scrollY || 0);
  }

  private bindStableScrollAutoHide(): void {
    if (typeof window === "undefined") return;
    this.lastScrollY = Math.max(0, window.scrollY || 0);
    const onScroll = () => {
      if (this.scrollFrame !== null) return;
      this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null;
        this.applyScrollAutoHide();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    this.destroyRef.onDestroy(() => {
      window.removeEventListener("scroll", onScroll);
      if (this.scrollFrame !== null) window.cancelAnimationFrame(this.scrollFrame);
    });
  }

  private applyScrollAutoHide(): void {
    if (typeof window === "undefined") return;
    const currentY = Math.max(0, window.scrollY || 0);
    if (this.hidden() || !this.navigation.mobileDockAutoHideEnabled()) {
      this.lastScrollY = currentY;
      this.setAutoHidden(false);
      return;
    }
    if (currentY <= 72) {
      this.lastScrollY = currentY;
      this.setAutoHidden(false);
      return;
    }
    const delta = currentY - this.lastScrollY;
    if (Math.abs(delta) < 12) return;
    this.lastScrollY = currentY;
    this.setAutoHidden(delta > 0 && currentY > 120);
  }

  private setAutoHidden(hidden: boolean): void {
    if (this.autoHidden() === hidden) return;
    this.autoHidden.set(hidden);
    this.navigation.setMobileDockAutoHidden(hidden);
  }
}