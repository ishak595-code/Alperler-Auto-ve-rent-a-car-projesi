import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { NavigationEnd, Router, RouterLink } from "@angular/router";
import { filter } from "rxjs/operators";
import { CarService } from "../services/car.service";
import { Language, UiService } from "../services/ui.service";

@Component({
  selector: "app-customer-mobile-dock",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    @if (!hidden()) {
      <nav class="customer-command-dock xl:hidden" aria-label="Hızlı müşteri işlemleri">
        <a routerLink="/" fragment="campaigns-heading" (click)="goToCampaigns($event)" class="dock-action" aria-label="Kampanyalara git">
          <mat-icon aria-hidden="true">local_offer</mat-icon><span>Kampanya</span>
        </a>
        <a routerLink="/fleet" [queryParams]="{ favs: 'true' }" class="dock-action relative" aria-label="Favori araçları aç">
          <mat-icon aria-hidden="true">favorite_border</mat-icon><span>Favoriler</span>
          @if (favoriteCount() > 0) { <span class="dock-badge" aria-label="{{ favoriteCount() }} favori">{{ favoriteCount() > 9 ? '9+' : favoriteCount() }}</span> }
        </a>
        <button type="button" (click)="openSearch()" class="dock-action dock-search" aria-label="Araç, tur veya blog ara">
          <span class="dock-search-icon"><mat-icon aria-hidden="true">search</mat-icon></span><span>Ara</span>
        </button>
        <button type="button" (click)="openLanguageDialog()" class="dock-action" aria-label="Dil seç" aria-haspopup="dialog">
          <mat-icon aria-hidden="true">language</mat-icon><span>{{ ui.currentLang() }}</span>
        </button>
        <a routerLink="/appointment" class="dock-action" aria-label="Randevu talebi oluştur">
          <mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span>
        </a>
      </nav>
    }

    <dialog #languageDialog class="language-dialog" aria-labelledby="language-dialog-title" (cancel)="closeLanguageDialog()" (click)="closeOnBackdrop($event)">
      <div class="language-sheet">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
          <div><p class="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Dil seçimi</p><h2 id="language-dialog-title" class="mt-1 text-xl font-black text-slate-950">Site dilini değiştir</h2></div>
          <button type="button" (click)="closeLanguageDialog()" class="dialog-close" aria-label="Dil penceresini kapat"><mat-icon aria-hidden="true">close</mat-icon></button>
        </header>
        <div class="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
          @for (lang of languages; track lang) {
            <button type="button" (click)="setLanguage(lang)" [attr.aria-pressed]="ui.currentLang() === lang" [class.language-selected]="ui.currentLang() === lang" class="language-option">
              <strong>{{ lang }}</strong><span>{{ languageName(lang) }}</span>
            </button>
          }
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    :host{display:block}
    .customer-command-dock{position:fixed;z-index:88;left:max(.65rem,env(safe-area-inset-left));right:max(.65rem,env(safe-area-inset-right));bottom:max(.65rem,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:end;gap:3px;padding:7px;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:linear-gradient(160deg,rgba(7,16,31,.94),rgba(10,24,45,.9));box-shadow:0 22px 55px rgba(2,6,23,.34),inset 0 1px 0 rgba(255,255,255,.12);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    .dock-action{position:relative;display:flex;min-width:0;min-height:56px;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:0;border-radius:17px;background:transparent;padding:5px 2px;color:#cbd5e1;text-decoration:none;font-size:9px;font-weight:800;line-height:1.1;letter-spacing:.01em;touch-action:manipulation;transition:background-color .18s ease,color .18s ease,transform .18s ease}.dock-action mat-icon{width:23px;height:23px;font-size:23px}.dock-action:active{transform:translateY(1px)}.dock-action:focus-visible{outline:2px solid #60a5fa;outline-offset:1px}.dock-action:hover{background:rgba(255,255,255,.07);color:#fff}
    .dock-search{color:white}.dock-search-icon{display:flex;width:39px;height:39px;align-items:center;justify-content:center;border-radius:14px;background:#2563eb;box-shadow:0 8px 20px rgba(37,99,235,.28)}.dock-search span:last-child{margin-top:1px}
    .dock-badge{position:absolute;right:7px;top:4px;display:flex;min-width:18px;height:18px;align-items:center;justify-content:center;border-radius:999px;background:#ef4444;padding:0 5px;color:white;font-size:9px;font-weight:900;box-shadow:0 0 0 2px #07101f}
    .language-dialog{width:min(92vw,500px);max-width:none;border:0;border-radius:28px;padding:0;background:transparent;box-shadow:none}.language-dialog::backdrop{background:rgba(2,6,23,.74);backdrop-filter:blur(6px)}.language-sheet{overflow:hidden;border:1px solid rgba(148,163,184,.3);border-radius:28px;background:white;box-shadow:0 34px 90px rgba(2,6,23,.38)}
    .dialog-close{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:14px;background:#f1f5f9;color:#0f172a}.dialog-close:focus-visible{outline:2px solid #2563eb;outline-offset:2px}.language-option{display:flex;min-height:68px;flex-direction:column;align-items:flex-start;justify-content:center;border:1px solid #e2e8f0;border-radius:16px;background:white;padding:10px 13px;text-align:left;color:#0f172a}.language-option strong{font-size:12px}.language-option span{margin-top:2px;font-size:11px;color:#64748b}.language-option:focus-visible{outline:2px solid #2563eb;outline-offset:1px}.language-selected{border-color:#2563eb;background:#eff6ff}.language-selected strong{color:#1d4ed8}
    @media (max-width:380px){.customer-command-dock{left:5px;right:5px;gap:0;padding:5px}.dock-action{font-size:8px}.dock-action mat-icon{width:21px;height:21px;font-size:21px}.dock-search-icon{width:36px;height:36px}}
    @media (prefers-reduced-motion:reduce){.dock-action{transition:none}}
  `],
})
export class CustomerMobileDockComponent {
  @ViewChild("languageDialog") languageDialog?: ElementRef<HTMLDialogElement>;
  readonly router = inject(Router);
  readonly ui = inject(UiService);
  readonly carService = inject(CarService);
  readonly favoriteCount = this.carService.getFavoriteCount;
  readonly hidden = signal(false);
  readonly languages: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];

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

  openLanguageDialog(): void { const dialog = this.languageDialog?.nativeElement; if (dialog && !dialog.open) dialog.showModal(); }
  closeLanguageDialog(): void { const dialog = this.languageDialog?.nativeElement; if (dialog?.open) dialog.close(); }
  closeOnBackdrop(event: MouseEvent): void { if (event.target === this.languageDialog?.nativeElement) this.closeLanguageDialog(); }
  setLanguage(lang: Language): void { this.ui.setLanguage(lang); this.closeLanguageDialog(); }

  languageName(lang: Language): string {
    return ({ TR: "Türkçe", EN: "English", DE: "Deutsch", FR: "Français", KU: "Kurdî", ES: "Español", RU: "Русский", ZH: "中文", AR: "العربية" } as Record<Language, string>)[lang];
  }

  private focusHeroSearch(): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    window.setTimeout(() => {
      const input = document.querySelector('input[aria-label="Araç, tur veya blog ara"]') as HTMLInputElement | null;
      if (!input) return;
      input.scrollIntoView({ behavior: this.prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      window.setTimeout(() => input.focus({ preventScroll: true }), this.prefersReducedMotion() ? 0 : 220);
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
    if (this.hidden()) this.closeLanguageDialog();
  }

  private cleanPath(url: string): string { return url.split("?")[0].split("#")[0]; }
  private prefersReducedMotion(): boolean { return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true; }
}
