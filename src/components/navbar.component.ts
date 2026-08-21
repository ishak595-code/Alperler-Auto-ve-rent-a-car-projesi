import { Component, HostListener, effect, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { CustomerAuthService } from "../services/customer-auth.service";
import { CustomerAccountService } from "../services/customer-account.service";
import { Language, UiService } from "../services/ui.service";
import { NavigationConfigService } from "../services/navigation-config.service";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#07101f] shadow-xl" aria-label="Ana navigasyon">
      <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div class="flex h-[72px] items-center justify-between gap-2 md:h-24">
          <a routerLink="/" aria-label="Alperler Rent A Car ana sayfa" class="inline-flex min-w-0 flex-1 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:max-w-[300px] xl:flex-none">
            @if (config().logoUrl) {
              <img [src]="config().logoUrl" alt="Alperler Rent A Car" class="max-h-[54px] w-auto max-w-[220px] object-contain md:max-h-[72px] md:max-w-[280px]" />
            } @else {
              <div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div class="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black shadow-lg">A</div>
                <div class="min-w-0">
                  <div class="brand-name font-serif font-black uppercase tracking-[.04em] text-white">Alperler Rent A Car</div>
                  <div class="brand-sub mt-0.5 font-black uppercase tracking-[.13em] text-slate-400">Kiralama • Satış • Tur</div>
                </div>
              </div>
            }
          </a>

          <div class="desktop-nav hidden xl:flex" aria-label="Masaüstü site menüsü">
            @for (item of navigation.itemsFor('MOBILE_MENU'); track item.id) {
              <a [routerLink]="item.route" [routerLinkActiveOptions]="{ exact: item.route === '/' }" routerLinkActive="nav-link-active" class="nav-link" [attr.aria-label]="item.label">{{ item.label }}</a>
            }
          </div>

          <div class="relative flex shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" (click)="toggleLangMenu()" aria-label="Dil seçimi" [attr.aria-expanded]="isLangMenuOpen()" class="hidden xl:flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs font-black uppercase text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ uiService.currentLang() }}</button>
            @if (isLangMenuOpen()) {
              <div role="menu" class="absolute right-12 top-14 z-[140] max-h-96 w-40 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1526] py-1 shadow-2xl">
                @for (lang of languages; track lang) {
                  <button type="button" role="menuitem" (click)="setLang(lang)" class="block min-h-11 w-full px-4 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">{{ langName(lang) }}</button>
                }
              </div>
            }
            <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" aria-label="Favoriler" class="relative hidden xl:flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">favorite_border</mat-icon></a>
            <a [routerLink]="customerAuth.isLoggedIn() ? '/account' : '/account/login'" [attr.aria-label]="customerAuth.isLoggedIn() ? 'Hesabım' : 'Giriş yap veya üye ol'" class="account-entry relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-2 text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              @if (customerAuth.isLoggedIn() && customerAccount.profile()?.avatar_url) {
                <img class="account-avatar" [src]="customerAccount.profile()?.avatar_url" alt="" aria-hidden="true" />
              } @else {
                <mat-icon aria-hidden="true">{{ customerAuth.isLoggedIn() ? 'account_circle' : 'person_outline' }}</mat-icon>
              }
              <span class="hidden lg:inline">{{ customerAuth.isLoggedIn() ? accountLabel() : 'Giriş' }}</span>
            </a>
            @if (navigation.mobileMenuEnabled()) {
              <button id="mobile-menu-trigger" type="button" (click)="toggleMenu()" [attr.aria-label]="isMenuOpen() ? 'Menüyü kapat' : 'Menüyü aç'" [attr.aria-expanded]="isMenuOpen()" aria-controls="mobile-navigation" class="xl:hidden flex h-12 w-12 items-center justify-center rounded-xl text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">{{ isMenuOpen() ? 'close' : 'menu' }}</mat-icon></button>
            }
          </div>
        </div>
      </div>
    </nav>

    @if (navigation.mobileMenuEnabled()) {
    <nav id="mobile-navigation" aria-label="Mobil navigasyon" [class.hidden]="!isMenuOpen()" [attr.aria-hidden]="isMenuOpen() ? null : 'true'" [attr.inert]="isMenuOpen() ? null : ''" class="fixed inset-x-0 bottom-0 top-[72px] z-[95] overflow-y-auto overscroll-contain bg-[#050b16] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 text-white md:top-[96px] sm:px-6 xl:hidden" style="touch-action: pan-y; -webkit-overflow-scrolling: touch;">
      <div class="mx-auto w-full max-w-xl">
        <div class="mb-4 px-1">
          <p class="menu-kicker text-[10px] font-black uppercase tracking-[.2em]">Alperler Rent A Car</p>
          <p class="mt-1 text-sm leading-6 text-slate-400">Kiralama, satış, tur ve müşteri işlemlerinin tamamına buradan ulaşın.</p>
        </div>

        <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526] shadow-2xl">
          @for (item of navigation.itemsFor('MOBILE_MENU'); track item.id; let first = $first; let last = $last) {
            <a [id]="first ? 'mobile-menu-first-link' : null" [routerLink]="item.route" (click)="closeMenu(false)" class="menu-row" [class.last]="last" [attr.aria-label]="item.label"><mat-icon aria-hidden="true">{{ item.icon }}</mat-icon><span>{{ item.label }}</span></a>
          }
        </div>

        <div class="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526] shadow-2xl" aria-label="Kişisel ayarlar">
          <a [routerLink]="customerAuth.isLoggedIn() ? '/account' : '/account/login'" (click)="closeMenu(false)" class="menu-row account-menu-row" [attr.aria-label]="customerAuth.isLoggedIn() ? 'Hesabım' : 'Giriş yap veya üye ol'">
            @if (customerAuth.isLoggedIn() && customerAccount.profile()?.avatar_url) {
              <img class="menu-avatar" [src]="customerAccount.profile()?.avatar_url" alt="" aria-hidden="true" />
            } @else {
              <mat-icon aria-hidden="true">{{ customerAuth.isLoggedIn() ? 'account_circle' : 'person_outline' }}</mat-icon>
            }
            <span>{{ customerAuth.isLoggedIn() ? accountLabel() : 'Giriş Yap / Üye Ol' }}</span>
          </a>
          <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" (click)="closeMenu(false)" class="menu-row">
            <mat-icon aria-hidden="true">favorite_border</mat-icon>
            <span>Favoriler</span>
            @if (favoriteCount() > 0) { <strong class="menu-count" [attr.aria-label]="favoriteCount() + ' favori'">{{ favoriteCount() > 99 ? '99+' : favoriteCount() }}</strong> }
          </a>
          <button type="button" class="menu-row last" (click)="toggleMobileLanguage()" [attr.aria-expanded]="mobileLanguageOpen()" aria-controls="mobile-language-options">
            <mat-icon aria-hidden="true">language</mat-icon>
            <span>Dil: {{ langName(uiService.currentLang()) }}</span>
            <mat-icon aria-hidden="true" class="transition-transform" [class.rotate-180]="mobileLanguageOpen()">expand_more</mat-icon>
          </button>
          @if (mobileLanguageOpen()) {
            <div id="mobile-language-options" class="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/10 p-3 sm:grid-cols-3" aria-label="Dil seçenekleri">
              @for (lang of languages; track lang) {
                <button type="button" (click)="setMobileLang(lang)" [attr.aria-pressed]="uiService.currentLang() === lang" class="min-h-12 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-left text-sm font-bold text-slate-100 hover:bg-white/[.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                  <span class="block text-[10px] font-black uppercase tracking-wider text-slate-400">{{ lang }}</span>
                  <span class="mt-0.5 block text-xs">{{ langName(lang) }}</span>
                </button>
              }
            </div>
          }
        </div>
      </div>
    </nav>
    }
  `,
  styles: [`
    .brand-mark{background:#eabf35;color:#111827;box-shadow:0 10px 28px rgba(0,0,0,.28)}
    .brand-name{font-size:13.5px;line-height:1.05;white-space:nowrap}.brand-sub{font-size:7px;line-height:1.2;white-space:nowrap}.account-entry span{max-width:110px;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:900;white-space:nowrap}.account-entry:hover{background:rgba(255,255,255,.065)}.account-avatar,.menu-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:999px;object-fit:cover;border:1px solid rgba(255,255,255,.18)}.menu-avatar{width:32px;height:32px;flex-basis:32px}.menu-kicker{color:#d5b449}
    .desktop-nav{min-width:0;max-width:min(62vw,760px);flex:1;align-items:center;justify-content:flex-start;gap:.72rem;overflow-x:auto;scrollbar-width:none;padding:.3rem .2rem}.desktop-nav::-webkit-scrollbar{display:none}
    .nav-link{flex:none;border-bottom:2px solid transparent;padding:.5rem 0;font-size:10px;font-weight:800;letter-spacing:.055em;text-transform:uppercase;color:#cbd5e1;white-space:nowrap;text-decoration:none}.nav-link:hover{color:#fff}.nav-link-active{color:#fff!important;border-color:#60a5fa!important}
    .menu-row{display:flex;width:100%;min-height:58px;align-items:center;gap:16px;border:0;border-bottom:1px solid rgba(255,255,255,.1);background:transparent;padding:0 16px;text-align:left;font-size:16px;font-weight:700;color:#f1f5f9;text-decoration:none}.menu-row span{flex:1;min-width:0}.menu-row.last{border-bottom:0}.menu-row:focus-visible,.menu-row:hover{background:rgba(255,255,255,.055);outline:none}.menu-count{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:#101a2e;padding:0 8px;color:#e2e8f0;font-size:11px;font-weight:900}
    @media (min-width:390px){.brand-name{font-size:14.5px}.brand-sub{font-size:7.5px}}@media(min-width:480px){.brand-name{font-size:16px}.brand-sub{font-size:8px}}@media(min-width:1536px){.desktop-nav{gap:1rem}.nav-link{font-size:10.5px}}
  `],
})
export class NavbarComponent {
  carService = inject(CarService);
  customerAuth = inject(CustomerAuthService);
  customerAccount = inject(CustomerAccountService);
  uiService = inject(UiService);
  navigation = inject(NavigationConfigService);
  router = inject(Router);
  config = this.carService.getConfig();
  favoriteCount = this.carService.getFavoriteCount;
  isMenuOpen = signal(false);
  isLangMenuOpen = signal(false);
  mobileLanguageOpen = signal(false);
  languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

  constructor() {
    effect(() => { if (!this.navigation.mobileMenuEnabled()) this.closeMenu(false); });
    effect(() => {
      if (this.customerAuth.isLoggedIn()) void this.customerAccount.refreshProfileSummary();
      else this.customerAccount.clearLocalProfile();
    });
  }

  accountLabel(): string {
    const fullName = String(this.customerAccount.profile()?.full_name || '').trim();
    return fullName ? fullName.split(/\s+/)[0] : 'Hesabım';
  }

  toggleMenu(): void { this.isMenuOpen() ? this.closeMenu(false) : this.openMenu(); }
  openMenu(): void { if (this.isMenuOpen()) return; this.isLangMenuOpen.set(false); this.mobileLanguageOpen.set(false); this.isMenuOpen.set(true); }
  closeMenu(restoreFocus = false): void { if (!this.isMenuOpen()) return; this.isMenuOpen.set(false); this.mobileLanguageOpen.set(false); if (restoreFocus) this.focusElement("mobile-menu-trigger"); }
  toggleLangMenu(): void { if (!this.isMenuOpen()) this.isLangMenuOpen.update(v => !v); }
  closeLangMenu(): void { this.isLangMenuOpen.set(false); }
  toggleMobileLanguage(): void { this.mobileLanguageOpen.update(value => !value); }
  setLang(lang: Language): void { this.uiService.setLanguage(lang); this.closeLangMenu(); }
  setMobileLang(lang: Language): void { this.uiService.setLanguage(lang); this.mobileLanguageOpen.set(false); }

  async onGlobalSearch(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;
    const vehicle = this.carService.getVehicleByAdId(query);
    if (vehicle) await this.router.navigate([vehicle.category === "SALE" ? "/sales" : "/fleet", vehicle.id]);
    else await this.router.navigate(["/fleet"], { queryParams: { search: query } });
    input.value = "";
    this.closeMenu(false);
  }

  langName(lang: Language): string {
    return ({TR:"Türkçe",EN:"English",DE:"Deutsch",FR:"Français",KU:"Kurdî",ES:"Español",RU:"Русский",ZH:"中文",AR:"العربية"} as Record<Language,string>)[lang];
  }

  private focusElement(id: string): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    window.requestAnimationFrame(() => (document.getElementById(id) as HTMLElement | null)?.focus({ preventScroll: true }));
  }

  @HostListener("document:keydown.escape") onEscape(): void { this.closeLangMenu(); this.closeMenu(true); }
  @HostListener("window:resize") onResize(): void { if (typeof window !== "undefined" && window.innerWidth >= 1280) this.closeMenu(false); }
}
