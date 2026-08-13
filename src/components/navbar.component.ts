import { Component, HostListener, OnDestroy, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { Language, UiService } from "../services/ui.service";

@Component({
  selector: "app-navbar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav
      class="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#07101f] shadow-xl"
      aria-label="Ana navigasyon"
    >
      <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div class="flex h-[72px] items-center justify-between gap-2 md:h-24">
          <a
            routerLink="/"
            (click)="closeMenu(); closeLangMenu()"
            aria-label="Alperler Auto ana sayfa"
            class="inline-flex min-w-0 max-w-[210px] items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:max-w-[280px]"
          >
            @if (config().logoUrl) {
              <img
                [src]="config().logoUrl"
                alt="Alperler Auto"
                class="max-h-[54px] w-auto max-w-[185px] object-contain md:max-h-[72px] md:max-w-[250px]"
              />
            } @else {
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white">A</div>
                <div class="min-w-0">
                  <div class="truncate font-serif text-base font-black tracking-wide text-white md:text-xl">{{ config().companyName | uppercase }}</div>
                  <div class="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 md:text-[10px]">{{ config().tagline }}</div>
                </div>
              </div>
            }
          </a>

          <div class="hidden xl:flex items-center gap-4 2xl:gap-6">
            <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">Ana Sayfa</a>
            <a routerLink="/fleet" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.fleet }}</a>
            <a routerLink="/sales" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.sales }}</a>
            <a routerLink="/list-your-car" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.earn }}</a>
            <a routerLink="/tours" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.tours }}</a>
            <a routerLink="/blog" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.blog }}</a>
            <a routerLink="/contact" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.contact }}</a>
            <a routerLink="/about" routerLinkActive="!text-white !border-blue-400" class="hidden 2xl:block border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:text-white">{{ t().nav.about }}</a>
          </div>

          <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <div class="relative">
              <button
                type="button"
                (click)="toggleLangMenu()"
                aria-label="Dil seçimi"
                aria-haspopup="menu"
                [attr.aria-expanded]="isLangMenuOpen()"
                class="flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs font-black uppercase text-slate-200 transition hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {{ uiService.currentLang() }}
              </button>
              @if (isLangMenuOpen()) {
                <div role="menu" class="absolute right-0 z-[140] mt-2 max-h-[70dvh] w-40 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1526] py-1 shadow-2xl">
                  @for (lang of languages; track lang) {
                    <button
                      type="button"
                      role="menuitem"
                      (click)="setLang(lang)"
                      class="block min-h-11 w-full px-4 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:bg-white/10"
                      [class.text-blue-300]="uiService.currentLang() === lang"
                    >
                      {{ langName(lang) }}
                    </button>
                  }
                </div>
              }
            </div>

            <a
              routerLink="/fleet"
              [queryParams]="{ favs: 'true' }"
              [attr.aria-label]="t().common.favorites || 'Favoriler'"
              class="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <mat-icon aria-hidden="true">star_border</mat-icon>
              @if (favCount() > 0) {
                <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-black text-white">{{ favCount() }}</span>
              }
            </a>

            <a
              routerLink="/appointment"
              class="hidden xl:inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {{ t().buttons.appointment }}
            </a>

            <button
              type="button"
              (click)="toggleMenu()"
              [attr.aria-label]="isMenuOpen() ? 'Menüyü kapat' : 'Menüyü aç'"
              [attr.aria-expanded]="isMenuOpen()"
              aria-controls="mobile-navigation"
              class="xl:hidden flex h-11 w-11 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <mat-icon aria-hidden="true" class="!h-7 !w-7 !text-[28px]">{{ isMenuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>
      </div>

      @if (isMenuOpen()) {
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobil menü"
          class="xl:hidden fixed inset-x-0 bottom-0 top-[72px] z-[120] bg-[#050b16] md:top-[96px]"
        >
          <div class="h-full overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
            <div class="mx-auto w-full max-w-xl">
              <div class="mb-5 flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">Alperler Auto</p>
                  <h2 class="mt-1 text-xl font-black text-white">Menü</h2>
                </div>
                <button
                  type="button"
                  (click)="closeMenu()"
                  aria-label="Menüyü kapat"
                  class="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <mat-icon aria-hidden="true">close</mat-icon>
                </button>
              </div>

              <div class="mb-5 flex min-h-13 items-center rounded-2xl border border-slate-700 bg-[#0b1526] px-4 shadow-inner focus-within:border-blue-500">
                <mat-icon aria-hidden="true" class="mr-3 text-slate-400">search</mat-icon>
                <input
                  type="search"
                  [placeholder]="t().common.searchPlaceholder || 'Araç Ara...'"
                  aria-label="Araç ara"
                  class="min-w-0 flex-1 bg-transparent py-4 text-base font-semibold text-white outline-none placeholder:text-slate-500"
                  (keyup.enter)="onGlobalSearch($event); closeMenu()"
                />
              </div>

              <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526] shadow-2xl">
                <a (click)="closeMenu()" routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-blue-400">home</mat-icon><span class="flex-1">Ana Sayfa</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/fleet" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-blue-400">key</mat-icon><span class="flex-1">{{ t().nav.fleet }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/sales" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-emerald-400">directions_car</mat-icon><span class="flex-1">{{ t().nav.sales }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/list-your-car" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-violet-400">sell</mat-icon><span class="flex-1">{{ t().nav.earn }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/tours" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-amber-400">explore</mat-icon><span class="flex-1">{{ t().nav.tours }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/blog" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-sky-400">article</mat-icon><span class="flex-1">{{ t().nav.blog }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/contact" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 border-b border-white/10 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-rose-400">support_agent</mat-icon><span class="flex-1">{{ t().nav.contact }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
                <a (click)="closeMenu()" routerLink="/about" routerLinkActive="!bg-white/10 !text-white" class="flex min-h-14 items-center gap-4 px-4 text-base font-bold text-slate-100 transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">
                  <mat-icon aria-hidden="true" class="text-slate-300">info</mat-icon><span class="flex-1">{{ t().nav.about }}</span><mat-icon aria-hidden="true" class="text-slate-500">chevron_right</mat-icon>
                </a>
              </div>

              <a
                (click)="closeMenu()"
                routerLink="/appointment"
                class="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-center text-sm font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <mat-icon aria-hidden="true">event_available</mat-icon>
                {{ t().buttons.appointment }}
              </a>

              <p class="mt-5 text-center text-xs leading-relaxed text-slate-500">Güvenli araç kiralama, ikinci el araç ve tur hizmetleri.</p>
            </div>
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
    this.uiService.closeAllOverlays();
  }

  toggleLangMenu() {
    this.isLangMenuOpen.update((value) => !value);
    if (this.isLangMenuOpen() && this.isMenuOpen()) this.closeMenu();
  }

  closeLangMenu() {
    this.isLangMenuOpen.set(false);
  }

  setLang(lang: Language) {
    this.uiService.setLanguage(lang);
    this.closeLangMenu();
  }

  onGlobalSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;

    const vehicle = this.carService.getVehicleByAdId(query);
    if (vehicle) {
      this.router.navigate([vehicle.category === "SALE" ? "/sales" : "/fleet", vehicle.id]);
    } else {
      this.router.navigate(["/fleet"], { queryParams: { search: query } });
    }
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

  @HostListener("window:resize")
  onResize() {
    if (typeof window !== "undefined" && window.innerWidth >= 1280 && this.isMenuOpen()) {
      this.closeMenu();
    }
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
