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

          <div class="hidden xl:flex items-center gap-3 2xl:gap-5">
            <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="!text-white !border-blue-400" class="nav-link">Ana Sayfa</a>
            <a routerLink="/fleet" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.fleet }}</a>
            <a routerLink="/sales" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.sales }}</a>
            <a routerLink="/list-your-car" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.earn }}</a>
            <a routerLink="/tours" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.tours }}</a>
            <a routerLink="/branches" routerLinkActive="!text-white !border-blue-400" class="nav-link">Şubeler</a>
            <a routerLink="/blog" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.blog }}</a>
            <a routerLink="/contact" routerLinkActive="!text-white !border-blue-400" class="nav-link">{{ t().nav.contact }}</a>
          </div>

          <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" (click)="toggleLangMenu()" aria-label="Dil seçimi" [attr.aria-expanded]="isLangMenuOpen()" class="flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs font-black uppercase text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ uiService.currentLang() }}</button>
            @if (isLangMenuOpen()) {
              <div role="menu" class="absolute right-16 top-16 z-[140] max-h-96 w-40 overflow-y-auto rounded-xl border border-slate-700 bg-[#0b1526] py-1 shadow-2xl md:top-20">
                @for (lang of languages; track lang) {
                  <button type="button" role="menuitem" (click)="setLang(lang)" class="block min-h-11 w-full px-4 py-2 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:bg-white/10">{{ langName(lang) }}</button>
                }
              </div>
            }
            <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" aria-label="Favoriler" class="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">star_border</mat-icon></a>
            <button id="mobile-menu-trigger" type="button" (click)="toggleMenu()" [attr.aria-label]="isMenuOpen() ? 'Menüyü kapat' : 'Menüyü aç'" [attr.aria-expanded]="isMenuOpen()" aria-controls="mobile-navigation" class="xl:hidden flex h-12 w-12 items-center justify-center rounded-xl text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">{{ isMenuOpen() ? 'close' : 'menu' }}</mat-icon></button>
          </div>
        </div>
      </div>
    </nav>

    @if (isMenuOpen()) {
      <nav id="mobile-navigation" aria-label="Mobil navigasyon" class="fixed inset-x-0 bottom-0 top-[72px] z-[95] overflow-y-auto overscroll-contain bg-[#050b16] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-white md:top-[96px] sm:px-6 xl:hidden" style="touch-action: pan-y; -webkit-overflow-scrolling: touch;">
        <div class="mx-auto w-full max-w-xl">
          <div class="mb-4 flex min-h-14 items-center rounded-2xl border border-slate-700 bg-[#0b1526] px-4">
            <mat-icon aria-hidden="true" class="mr-3 text-slate-400">search</mat-icon>
            <input type="search" aria-label="Araç ara" [placeholder]="t().common.searchPlaceholder || 'Araç Ara...'" (keyup.enter)="onGlobalSearch($event)" class="min-w-0 flex-1 bg-transparent py-4 text-base font-semibold text-white outline-none placeholder:text-slate-500" />
          </div>

          <div class="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526]">
            <a id="mobile-menu-first-link" routerLink="/" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">home</mat-icon><span>Ana Sayfa</span></a>
            <a routerLink="/fleet" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">key</mat-icon><span>{{ t().nav.fleet }}</span></a>
            <a routerLink="/sales" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">directions_car</mat-icon><span>{{ t().nav.sales }}</span></a>
            <a routerLink="/list-your-car" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">sell</mat-icon><span>{{ t().nav.earn }}</span></a>
            <a routerLink="/tours" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">explore</mat-icon><span>{{ t().nav.tours }}</span></a>
            <a routerLink="/branches" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">storefront</mat-icon><span>Şubeler</span></a>
            <a routerLink="/blog" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">article</mat-icon><span>{{ t().nav.blog }}</span></a>
            <a routerLink="/contact" (click)="closeMenu(false)" class="menu-row"><mat-icon aria-hidden="true">support_agent</mat-icon><span>{{ t().nav.contact }}</span></a>
            <a routerLink="/about" (click)="closeMenu(false)" class="menu-row last"><mat-icon aria-hidden="true">info</mat-icon><span>{{ t().nav.about }}</span></a>
          </div>

          <details class="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526]">
            <summary class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 text-sm font-bold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400">
              <mat-icon aria-hidden="true" class="text-blue-300">language</mat-icon>
              <span class="flex-1">Dil</span>
              <span class="text-xs font-semibold text-slate-400">{{ langName(uiService.currentLang()) }}</span>
              <mat-icon aria-hidden="true" class="text-slate-500">expand_more</mat-icon>
            </summary>
            <div class="grid grid-cols-2 gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
              @for (lang of languages; track lang) {
                <button type="button" (click)="setLang(lang)" [attr.aria-pressed]="uiService.currentLang() === lang" [class.bg-blue-500]="uiService.currentLang() === lang" class="min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{{ langName(lang) }}</button>
              }
            </div>
          </details>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" (click)="closeMenu(false)" class="quick-link"><mat-icon aria-hidden="true">star_border</mat-icon>Favoriler</a>
            <a routerLink="/appointment" (click)="closeMenu(false)" class="quick-link bg-blue-500"><mat-icon aria-hidden="true">event_available</mat-icon>Randevu</a>
          </div>
        </div>
      </nav>
    }
  `,
  styles: [`
    .nav-link{border-bottom:2px solid transparent;padding:.5rem 0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;white-space:nowrap}
    .menu-row{display:flex;min-height:56px;align-items:center;gap:16px;border-bottom:1px solid rgba(255,255,255,.1);padding:0 16px;font-size:16px;font-weight:700;color:#f1f5f9;text-decoration:none}.menu-row span{flex:1}.menu-row.last{border-bottom:0}.menu-row:focus-visible{background:rgba(255,255,255,.08);outline:none}
    .quick-link{display:flex;min-height:56px;align-items:center;justify-content:center;gap:8px;border-radius:16px;border:1px solid rgba(255,255,255,.1);padding:0 12px;font-size:14px;font-weight:900;color:white;text-decoration:none}
    summary::-webkit-details-marker{display:none}
  `],
})
export class NavbarComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  config = this.carService.getConfig();
  isMenuOpen = signal(false);
  isLangMenuOpen = signal(false);
  t = this.uiService.translations;
  languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

  toggleMenu(): void { this.isMenuOpen() ? this.closeMenu() : this.openMenu(); }
  openMenu(): void { if (this.isMenuOpen()) return; this.isLangMenuOpen.set(false); this.isMenuOpen.set(true); this.focusElement("mobile-menu-first-link"); }
  closeMenu(restoreFocus = true): void { if (!this.isMenuOpen()) return; this.isMenuOpen.set(false); if (restoreFocus) this.focusElement("mobile-menu-trigger"); }
  toggleLangMenu(): void { if (!this.isMenuOpen()) this.isLangMenuOpen.update(v => !v); }
  closeLangMenu(): void { this.isLangMenuOpen.set(false); }
  setLang(lang: Language): void { this.uiService.setLanguage(lang); this.closeLangMenu(); }

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

  @HostListener("document:keydown.escape") onEscape(): void { this.closeLangMenu(); this.closeMenu(); }
  @HostListener("window:resize") onResize(): void { if (typeof window !== "undefined" && window.innerWidth >= 1280) this.closeMenu(false); }
}
