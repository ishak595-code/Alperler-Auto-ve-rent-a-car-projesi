import { Component, HostListener, OnDestroy, inject, signal } from "@angular/core";
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { CarService } from "../services/car.service";
import { UiService, Language } from "../services/ui.service";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatIconModule,
  ],
  template: `
    <nav
      class="fixed top-0 z-50 w-full transition-all duration-300 bg-slate-900/95 backdrop-blur-md border-b border-white/5 shadow-2xl"
      aria-label="Ana navigasyon"
    >
      <div class="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-[72px] md:h-24 gap-2">
          <a
            class="inline-flex flex-none items-center w-auto max-w-[150px] sm:max-w-[210px] md:max-w-[280px] group rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            routerLink="/"
            (click)="closeMenu(); closeLangMenu()"
            aria-label="Alperler Auto ana sayfa"
            [style.--logo-width-mobile]="(config().logoWidthMobile || 150) + 'px'"
            [style.--logo-width-desktop]="(config().logoWidthDesktop || 200) + 'px'"
          >
            @if (config().logoUrl) {
              <img
                [src]="config().logoUrl"
                alt=""
                aria-hidden="true"
                class="w-[var(--logo-width-mobile)] max-w-[112px] sm:max-w-[160px] md:max-w-[220px] xl:w-[var(--logo-width-desktop)] xl:max-w-[220px] h-auto max-h-[54px] md:max-h-[76px] object-contain transition-all"
              />
            } @else {
              <div
                class="w-10 h-10 md:w-12 md:h-12 shrink-0 flex items-center justify-center mr-2 md:mr-3 drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                aria-hidden="true"
              >
                <svg
                  class="w-full h-full text-blue-500"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M50 5L15 85H30L50 40L70 85H85L50 5Z" fill="currentColor" />
                  <path d="M35 70H65V85H35V70Z" fill="white" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-dasharray="10 4"
                    opacity="0.3"
                  />
                </svg>
              </div>
              <div class="flex flex-col justify-center min-w-0 max-w-[96px] sm:max-w-[150px] md:max-w-[220px] pointer-events-none">
                <span
                  class="font-serif font-bold text-[15px] sm:text-base md:text-xl text-white tracking-wide leading-none group-hover:text-blue-500 transition-colors whitespace-nowrap"
                  >{{ config().companyName | uppercase }}</span
                >
                @if (config().tagline) {
                  <span
                    class="hidden sm:block text-[0.5rem] text-slate-400 font-bold tracking-widest uppercase mt-1 truncate"
                    >{{ config().tagline }}</span
                  >
                }
              </div>
            }
          </a>

          <div class="hidden xl:flex items-center gap-4 2xl:gap-6 min-w-0">
            <div class="relative group hidden 2xl:block">
              <div
                class="flex items-center bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2 focus-within:border-blue-500 transition-all w-56"
              >
                <mat-icon class="text-slate-400 mr-2 text-[18px] w-[18px] h-[18px]">search</mat-icon>
                <input
                  type="search"
                  [placeholder]="t().common.searchPlaceholder || 'Araç Ara...'"
                  aria-label="Araç ara"
                  class="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full min-w-0"
                  (keyup.enter)="onGlobalSearch($event)"
                />
              </div>
            </div>

            <a routerLink="/" [routerLinkActiveOptions]="{exact: true}" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">Ana Sayfa</a>
            <a routerLink="/fleet" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.fleet }}</a>
            <a routerLink="/sales" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.sales }}</a>
            <a routerLink="/list-your-car" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.earn }}</a>
            <a routerLink="/tours" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.tours }}</a>
            <a routerLink="/blog" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.blog }}</a>
            <a routerLink="/contact" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.contact }}</a>
            <a routerLink="/about" (click)="uiService.closeAllOverlays()" routerLinkActive="text-white border-white" class="hidden 2xl:inline-flex text-slate-400 hover:text-white font-medium text-[11px] uppercase tracking-[0.1em] transition-all py-2 border-b-2 border-transparent whitespace-nowrap">{{ t().nav.about }}</a>
          </div>

          <div class="hidden xl:flex items-center gap-3 shrink-0">
            <div class="relative">
              <button
                type="button"
                (click)="toggleLangMenu()"
                class="min-h-10 flex items-center text-xs font-bold text-slate-300 hover:text-white border border-slate-700 px-3 py-2 rounded transition-colors uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Dil seçimi"
                aria-haspopup="menu"
                [attr.aria-expanded]="isLangMenuOpen()"
              >
                {{ uiService.currentLang() }}
                <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              @if (isLangMenuOpen()) {
                <div
                  class="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 py-1"
                  role="menu"
                >
                  @for (lang of languages; track lang) {
                    <button
                      type="button"
                      role="menuitem"
                      (click)="setLang(lang); closeLangMenu()"
                      class="block w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus-visible:bg-slate-800"
                      [class.text-blue-400]="uiService.currentLang() === lang"
                    >
                      {{ langName(lang) }}
                    </button>
                  }
                </div>
              }
            </div>

            <a
              class="relative group w-11 h-11 rounded-full hover:bg-slate-800 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              routerLink="/fleet"
              [queryParams]="{ favs: 'true' }"
              [attr.aria-label]="t().common.favorites || 'Favoriler'"
            >
              <mat-icon class="text-slate-300 group-hover:text-blue-500 transition-colors">star_border</mat-icon>
              @if (favCount() > 0) {
                <span class="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full">{{ favCount() }}</span>
              }
            </a>

            <a
              routerLink="/appointment"
              [attr.aria-label]="t().buttons.appointment"
              class="bg-white hover:bg-blue-500 text-slate-900 px-5 py-3 rounded-sm font-bold text-xs uppercase tracking-widest transition-all shadow-lg border border-transparent hover:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {{ t().buttons.appointment }}
            </a>
          </div>

          <div class="xl:hidden flex items-center gap-1 sm:gap-2 shrink-0">
            <div class="relative">
              <button
                type="button"
                (click)="toggleLangMenu()"
                class="min-w-10 h-11 px-2 flex items-center justify-center text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-lg uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Dil seçimi"
                aria-haspopup="menu"
                [attr.aria-expanded]="isLangMenuOpen()"
              >
                {{ uiService.currentLang() }}
              </button>
              @if (isLangMenuOpen()) {
                <div
                  class="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-[70] py-1"
                  role="menu"
                >
                  @for (lang of languages; track lang) {
                    <button
                      type="button"
                      role="menuitem"
                      (click)="setLang(lang); closeLangMenu()"
                      class="block w-full text-left px-4 py-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus-visible:bg-slate-800"
                      [class.text-blue-400]="uiService.currentLang() === lang"
                    >
                      {{ langName(lang) }}
                    </button>
                  }
                </div>
              }
            </div>

            <a
              class="relative w-11 h-11 rounded-full hover:bg-slate-800 transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              routerLink="/fleet"
              [queryParams]="{ favs: 'true' }"
              [attr.aria-label]="t().common.favorites || 'Favoriler'"
            >
              <mat-icon class="text-slate-300">star_border</mat-icon>
              @if (favCount() > 0) {
                <span class="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full">{{ favCount() }}</span>
              }
            </a>

            <button
              type="button"
              (click)="toggleMenu()"
              class="w-11 h-11 flex items-center justify-center text-white hover:text-blue-400 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              [attr.aria-label]="isMenuOpen() ? 'Menüyü kapat' : 'Menüyü aç'"
              [attr.aria-expanded]="isMenuOpen()"
              aria-controls="mobile-navigation"
            >
              <svg class="h-7 w-7" stroke="currentColor" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                @if (!isMenuOpen()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      @if (isMenuOpen()) {
        <div
          id="mobile-navigation"
          class="xl:hidden fixed left-0 right-0 top-[72px] md:top-[96px] h-[calc(100dvh-72px)] md:h-[calc(100dvh-96px)] bg-slate-900/98 backdrop-blur-xl border-t border-white/10 shadow-2xl z-40 overflow-y-auto overscroll-contain"
        >
          <div class="px-4 sm:px-6 py-5 sm:py-7 flex flex-col items-center text-center">
            <div class="w-full mb-3">
              <div class="flex items-center bg-slate-800/60 border border-slate-700 rounded-xl px-4 min-h-12 focus-within:border-blue-500 transition-all">
                <mat-icon class="text-slate-400 mr-2" aria-hidden="true">search</mat-icon>
                <input
                  type="search"
                  [placeholder]="t().common.searchPlaceholder || 'Araç Ara...'"
                  aria-label="Araç ara"
                  class="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full min-w-0 py-3"
                  (keyup.enter)="onGlobalSearch($event); closeMenu()"
                />
              </div>
            </div>

            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/" [routerLinkActiveOptions]="{exact: true}" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Ana Sayfa</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/fleet" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.fleet }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/sales" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.sales }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/list-your-car" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.earn }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/tours" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.tours }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/blog" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.blog }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/contact" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.contact }}</a>
            <a (click)="closeMenu(); uiService.closeAllOverlays()" routerLink="/about" class="text-base sm:text-lg font-medium text-slate-200 hover:text-white transition-colors min-h-12 flex items-center justify-center w-full border-b border-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{{ t().nav.about }}</a>

            <a
              (click)="closeMenu(); uiService.closeAllOverlays()"
              routerLink="/appointment"
              class="mt-5 flex items-center justify-center w-full min-h-12 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold px-4 rounded-lg shadow-lg text-sm sm:text-base uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {{ t().buttons.appointment }}
            </a>
          </div>
        </div>
      }
    </nav>
  `,
})
export class NavbarComponent implements OnDestroy {
  private previousBodyOverflow: string | null = null;
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  config = this.carService.getConfig();
  isMenuOpen = signal(false);
  isLangMenuOpen = signal(false);

  favCount = this.carService.getFavoriteCount;
  t = this.uiService.translations;

  languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

  toggleMenu() {
    const next = !this.isMenuOpen();
    this.isMenuOpen.set(next);
    this.isLangMenuOpen.set(false);
    this.setBodyScrollLock(next);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    this.setBodyScrollLock(false);
  }

  openAbout() {
    this.router.navigate(["/about"]);
  }

  openContact() {
    this.router.navigate(["/contact"]);
  }

  setLang(lang: Language) {
    this.uiService.setLanguage(lang);
    this.closeLangMenu();
  }

  toggleLangMenu() {
    this.isLangMenuOpen.update((v) => !v);
  }

  closeLangMenu() {
    this.isLangMenuOpen.set(false);
  }

  onGlobalSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    const vehicle = this.carService.getVehicleByAdId(query);
    if (vehicle) {
      const type = vehicle.category === "SALE" ? "sales" : "fleet";
      this.router.navigate([`/${type}`, vehicle.id]);
      input.value = "";
      return;
    }

    this.router.navigate(["/fleet"], { queryParams: { search: query } });
    input.value = "";
  }

  langName(lang: Language): string {
    const names: Record<Language, string> = {
      TR: "Türkçe",
      EN: "English",
      DE: "Deutsch",
      FR: "Français",
      KU: "Kurdî",
      ES: "Español",
      RU: "Русский",
      ZH: "中文",
      AR: "العربية",
    };
    return names[lang];
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    this.closeLangMenu();
    if (this.isMenuOpen()) this.closeMenu();
  }

  ngOnDestroy() {
    this.setBodyScrollLock(false);
  }

  private setBodyScrollLock(locked: boolean) {
    if (typeof document === "undefined") return;

    if (locked) {
      if (this.previousBodyOverflow === null) {
        this.previousBodyOverflow = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
      return;
    }

    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
  }
}
