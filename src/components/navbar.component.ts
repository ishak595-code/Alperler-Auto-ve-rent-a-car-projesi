import { Component, HostListener, inject, signal } from "@angular/core";
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
    <nav class="fixed inset-x-0 top-0 z-[100] border-b border-white/10 bg-[#07101f] shadow-xl" aria-label="Ana navigasyon">
      <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div class="flex h-[72px] items-center justify-between gap-2 md:h-24">
          <a routerLink="/" aria-label="Alperler Auto ana sayfa" class="inline-flex min-w-0 max-w-[210px] items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:max-w-[280px]">
            @if (config().logoUrl) {
              <img [src]="config().logoUrl" alt="Alperler Auto" class="max-h-[54px] w-auto max-w-[185px] object-contain md:max-h-[72px] md:max-w-[250px]" />
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
            <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">Ana Sayfa</a>
            <a routerLink="/fleet" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.fleet }}</a>
            <a routerLink="/sales" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.sales }}</a>
            <a routerLink="/list-your-car" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.earn }}</a>
            <a routerLink="/tours" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.tours }}</a>
            <a routerLink="/blog" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.blog }}</a>
            <a routerLink="/contact" routerLinkActive="!text-white !border-blue-400" class="border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.contact }}</a>
            <a routerLink="/about" routerLinkActive="!text-white !border-blue-400" class="hidden 2xl:block border-b-2 border-transparent py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white">{{ t().nav.about }}</a>
          </div>

          <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <div class="relative">
              <button type="button" (click)="toggleLangMenu()" aria-label="Dil seçimi" aria-haspopup="menu" [attr.aria-expanded]="isLangMenuOpen()" class="flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs font-black uppercase text-slate-200 hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ uiService.currentLang() }}</button>
              @if (isLangMenuOpen()) {
                <div role="menu" class="absolute right-0 z-[140] mt-2 max-h-[70svh] w-40 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1526] py-1 shadow-2xl">
                  @for (lang of languages; track lang) {
                    <button type="button" role="menuitem" (click)="setLang(lang)" class="block min-h-11 w-full px-4 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:bg-white/10" [class.text-blue-300]="uiService.currentLang() === lang">{{ langName(lang) }}</button>
                  }
                </div>
              }
            </div>

            <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" [attr.aria-label]="t().common.favorites || 'Favoriler'" class="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <mat-icon aria-hidden="true">star_border</mat-icon>
              @if (favCount() > 0) { <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-black text-white">{{ favCount() }}</span> }
            </a>

            <a routerLink="/appointment" class="hidden xl:inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ t().buttons.appointment }}</a>

            <button type="button" (click)="openMenu()" aria-label="Menüyü aç" [attr.aria-expanded]="isMenuOpen()" aria-controls="mobile-navigation" class="xl:hidden flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
              <mat-icon aria-hidden="true" class="!h-7 !w-7 !text-[28px]">menu</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </nav>

    @if (isMenuOpen()) {
      <section id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Mobil menü" class="fixed inset-0 z-[500] h-[100svh] overflow-hidden bg-[#050b16] text-white xl:hidden">
        <div class="flex h-full flex-col">
          <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 bg-[#07101f] px-4 shadow-lg md:h-24 sm:px-6">
            <div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[0.22em] text-blue-400">Alperler Auto</p><h2 class="mt-1 truncate text-lg font-black text-white">Menü ve Hızlı İşlemler</h2></div>
            <button type="button" (click)="closeMenu()" aria-label="Menüyü kapat" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true" class="!h-7 !w-7 !text-[28px]">close</mat-icon></button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6" style="touch-action: pan-y; -webkit-overflow-scrolling: touch;">
            <div class="mx-auto w-full max-w-xl">
              <div class="mb-4 flex min-h-14 items-center rounded-2xl border border-slate-700 bg-[#0b1526] px-4 shadow-inner focus-within:border-blue-500">
                <mat-icon aria-hidden="true" class="mr-3 shrink-0 text-slate-400">search</mat-icon>
                <input type="search" [placeholder]="t().common.searchPlaceholder || 'Araç Ara...'" aria-label="Araç ara" class="min-w-0 flex-1 bg-transparent py-4 text-base font-semibold text-white outline-none placeholder:text-slate-500" (keyup.enter)="onGlobalSearch($event)" />
              </div>

              <div class="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526] shadow-2xl">
                <button type="button" (click)="navigateFromMenu('/')" class="menu-row"><mat-icon class="text-blue-400">home</mat-icon><span class="flex-1">Ana Sayfa</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/fleet')" class="menu-row"><mat-icon class="text-blue-400">key</mat-icon><span class="flex-1">{{ t().nav.fleet }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/sales')" class="menu-row"><mat-icon class="text-emerald-400">directions_car</mat-icon><span class="flex-1">{{ t().nav.sales }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/list-your-car')" class="menu-row"><mat-icon class="text-violet-400">sell</mat-icon><span class="flex-1">{{ t().nav.earn }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/tours')" class="menu-row"><mat-icon class="text-amber-400">explore</mat-icon><span class="flex-1">{{ t().nav.tours }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/blog')" class="menu-row"><mat-icon class="text-sky-400">article</mat-icon><span class="flex-1">{{ t().nav.blog }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/contact')" class="menu-row"><mat-icon class="text-rose-400">support_agent</mat-icon><span class="flex-1">{{ t().nav.contact }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
                <button type="button" (click)="navigateFromMenu('/about')" class="flex min-h-14 w-full items-center gap-4 px-4 text-left text-base font-bold text-slate-100 hover:bg-white/10 focus:outline-none focus-visible:bg-white/10"><mat-icon class="text-slate-300">info</mat-icon><span class="flex-1">{{ t().nav.about }}</span><mat-icon class="text-slate-500">chevron_right</mat-icon></button>
              </div>

              <div class="mb-4 rounded-2xl border border-white/10 bg-[#0b1526] p-4">
                <div class="mb-3 flex items-center justify-between gap-3"><span class="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Dil</span><span class="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-300">{{ langName(uiService.currentLang()) }}</span></div>
                <div class="flex gap-2 overflow-x-auto pb-1" style="touch-action: pan-x;">
                  @for (lang of languages; track lang) { <button type="button" (click)="setLang(lang)" [class.bg-blue-500]="uiService.currentLang() === lang" [class.text-white]="uiService.currentLang() === lang" class="min-h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ lang }}</button> }
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <button type="button" (click)="navigateFromMenu('/fleet', { favs: 'true' })" class="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-black text-white hover:bg-white/10"><mat-icon>star_border</mat-icon> Favoriler</button>
                <button type="button" (click)="navigateFromMenu('/appointment')" class="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-3 text-sm font-black text-white hover:bg-blue-400"><mat-icon>event_available</mat-icon> Randevu</button>
              </div>
              <p class="mt-5 text-center text-xs leading-relaxed text-slate-500">Güvenli araç kiralama, ikinci el araç, tur ve hızlı rezervasyon hizmetleri.</p>
            </div>
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    .menu-row { display:flex; min-height:56px; width:100%; align-items:center; gap:16px; border-bottom:1px solid rgba(255,255,255,.1); padding:0 16px; text-align:left; font-size:16px; font-weight:700; color:#f1f5f9; }
    .menu-row:hover, .menu-row:focus-visible { background:rgba(255,255,255,.08); outline:none; }
  `],
})
export class NavbarComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  config = this.carService.getConfig();
  isMenuOpen = signal(false);
  isLangMenuOpen = signal(false);
  favCount = this.carService.getFavoriteCount;
  t = this.uiService.translations;

  languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

  openMenu() {
    if (this.isMenuOpen()) return;
    this.isLangMenuOpen.set(false);
    this.isMenuOpen.set(true);
  }

  closeMenu() { this.isMenuOpen.set(false); }

  async navigateFromMenu(path: string, queryParams?: Record<string, string>) {
    try {
      await this.router.navigate([path], queryParams ? { queryParams } : undefined);
    } finally {
      this.closeMenu();
    }
  }

  toggleLangMenu() {
    if (this.isMenuOpen()) return;
    this.isLangMenuOpen.update((value) => !value);
  }

  closeLangMenu() { this.isLangMenuOpen.set(false); }
  setLang(lang: Language) { this.uiService.setLanguage(lang); this.closeLangMenu(); }

  async onGlobalSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    if (!query) return;
    const vehicle = this.carService.getVehicleByAdId(query);
    if (vehicle) await this.router.navigate([vehicle.category === "SALE" ? "/sales" : "/fleet", vehicle.id]);
    else await this.router.navigate(["/fleet"], { queryParams: { search: query } });
    input.value = "";
    this.closeMenu();
  }

  langName(lang: Language): string {
    const names: Record<Language, string> = { TR:"Türkçe", EN:"English", DE:"Deutsch", FR:"Français", KU:"Kurdî", ES:"Español", RU:"Русский", ZH:"中文", AR:"العربية" };
    return names[lang];
  }

  @HostListener("document:keydown.escape") onEscape() { this.closeLangMenu(); this.closeMenu(); }
  @HostListener("window:resize") onResize() { if (typeof window !== "undefined" && window.innerWidth >= 1280) this.closeMenu(); }
}
