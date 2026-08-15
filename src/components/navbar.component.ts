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
            <button id="mobile-menu-trigger" type="button" (click)="toggleMenu()" [attr.aria-label]="isMenuOpen() ? 'Menüyü kapat' : 'Menüyü aç'" [attr.aria-expanded]="isMenuOpen()" aria-controls="mobile-navigation" class="xl:hidden flex h-12 w-12 items-center justify-center rounded-xl text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">{{ isMenuOpen() ? 'close' : 'menu' }}</mat-icon></button>
          </div>
        </div>
      </div>
    </nav>

    <nav
      id="mobile-navigation"
      aria-label="Mobil navigasyon"
      [class.hidden]="!isMenuOpen()"
      [attr.aria-hidden]="isMenuOpen() ? null : 'true'"
      [attr.inert]="isMenuOpen() ? null : ''"
      class="fixed inset-x-0 bottom-0 top-[72px] z-[95] overflow-y-auto overscroll-contain bg-[#050b16] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 text-white md:top-[96px] sm:px-6 xl:hidden"
      style="touch-action: pan-y; -webkit-overflow-scrolling: touch;"
    >
      <div class="mx-auto w-full max-w-xl">
        <div class="mb-3 px-1">
          <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Alperler Auto</p>
          <p class="mt-1 text-sm leading-6 text-slate-400">Bölümler arasında hızlı ve erişilebilir gezinme.</p>
        </div>

        <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1526] shadow-2xl">
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

        <p class="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-400">
          Arama, favoriler, dil ve randevu işlemleri ekranın altındaki hızlı işlem çubuğunda bulunur.
        </p>
      </div>
    </nav>
  `,
  styles: [`
    .nav-link{border-bottom:2px solid transparent;padding:.5rem 0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;white-space:nowrap}
    .menu-row{display:flex;min-height:56px;align-items:center;gap:16px;border-bottom:1px solid rgba(255,255,255,.1);padding:0 16px;font-size:16px;font-weight:700;color:#f1f5f9;text-decoration:none}.menu-row span{flex:1}.menu-row.last{border-bottom:0}.menu-row:focus-visible{background:rgba(255,255,255,.08);outline:none}
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

  toggleMenu(): void { this.isMenuOpen() ? this.closeMenu(false) : this.openMenu(); }
  openMenu(): void { if (this.isMenuOpen()) return; this.isLangMenuOpen.set(false); this.isMenuOpen.set(true); }
  closeMenu(restoreFocus = false): void { if (!this.isMenuOpen()) return; this.isMenuOpen.set(false); if (restoreFocus) this.focusElement("mobile-menu-trigger"); }
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

  @HostListener("document:keydown.escape") onEscape(): void { this.closeLangMenu(); this.closeMenu(true); }
  @HostListener("window:resize") onResize(): void { if (typeof window !== "undefined" && window.innerWidth >= 1280) this.closeMenu(false); }
}
