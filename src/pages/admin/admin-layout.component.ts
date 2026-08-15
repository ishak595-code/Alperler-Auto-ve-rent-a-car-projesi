import { CommonModule, Location } from "@angular/common";
import { Component, HostListener, inject, signal } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter } from "rxjs";
import { ConfirmModalComponent } from "../../components/confirm-modal.component";
import { ToastComponent } from "../../components/toast.component";
import { AuthService } from "../../services/auth.service";
import { CarService } from "../../services/car.service";

interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
  queryParams?: Record<string, string>;
}

interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

@Component({
  selector: "app-admin-layout",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ConfirmModalComponent],
  styles: [`
    @media (prefers-reduced-motion: reduce){.admin-drawer{transition:none!important}}
  `],
  template: `
    <app-toast></app-toast>
    <app-confirm-modal></app-confirm-modal>

    <div class="min-h-screen bg-slate-100 text-slate-900">
      <header class="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/10 bg-slate-950 text-white shadow-xl">
        <div class="flex h-full items-center gap-2 px-2 sm:px-4 lg:px-6">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Önceki admin sayfasına dön">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>

          <button type="button" (click)="toggleSidebar()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" [attr.aria-expanded]="isSidebarOpen()" aria-controls="admin-navigation" aria-label="Admin menüsünü aç veya kapat">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>

          <div class="min-w-0 flex-1 px-1 sm:px-2">
            <div class="flex items-center gap-2">
              @if(config().logoUrl){<img [src]="config().logoUrl" alt="" class="hidden h-8 w-8 rounded-lg object-contain sm:block" />}
              <div class="min-w-0">
                <p class="truncate text-[9px] font-black uppercase tracking-[.16em] text-blue-400 sm:text-[10px]">Alperler Auto Yönetim</p>
                <h1 class="truncate text-sm font-black sm:text-base">{{ pageTitle() }}</h1>
              </div>
            </div>
          </div>

          <a routerLink="/" class="hidden min-h-10 items-center rounded-xl border border-white/10 px-3 text-xs font-black text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:flex">Siteyi Gör</a>
          <button type="button" (click)="logout()" class="min-h-10 shrink-0 rounded-xl bg-rose-500/15 px-3 text-xs font-black text-rose-200 hover:bg-rose-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Çıkış</button>
        </div>
      </header>

      @if(isSidebarOpen()){
        <button type="button" (click)="closeSidebar()" class="fixed inset-0 z-40 cursor-default bg-slate-950/70 backdrop-blur-sm" aria-label="Admin menüsünü kapat"></button>
      }

      <aside id="admin-navigation" class="admin-drawer fixed bottom-0 left-0 top-0 z-50 flex w-[min(88vw,340px)] flex-col bg-slate-950 text-white shadow-2xl transition-transform duration-200" [class.translate-x-0]="isSidebarOpen()" [class.-translate-x-full]="!isSidebarOpen()" [attr.aria-hidden]="!isSidebarOpen()">
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div><p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-400">Yönetim Merkezi</p><strong class="text-sm">Hızlı Geçiş</strong></div>
          <button type="button" (click)="closeSidebar()" class="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Admin menüsünü kapat"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <nav class="flex-1 overflow-y-auto overscroll-contain p-3" aria-label="Admin ana navigasyonu">
          @for(group of navGroups; track group.label){
            <section class="mb-5">
              <h2 class="px-3 pb-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{{ group.label }}</h2>
              <div class="space-y-1">
                @for(item of group.items; track item.route + item.label){
                  <a [routerLink]="item.route" [queryParams]="item.queryParams || null" (click)="closeSidebar()" routerLinkActive="bg-blue-600 text-white shadow-lg" class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-black" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
                  </a>
                }
              </div>
            </section>
          }
        </nav>

        <div class="border-t border-white/10 p-3">
          <a routerLink="/" (click)="closeSidebar()" class="flex min-h-11 items-center justify-center rounded-xl bg-white/5 px-4 text-sm font-black text-white hover:bg-white/10">Müşteri Sitesine Dön</a>
        </div>
      </aside>

      <main class="min-h-screen w-full pt-16">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly config = this.carService.getConfig();
  readonly isSidebarOpen = signal(false);
  readonly pageTitle = signal("Kontrol Paneli");

  readonly navGroups: AdminNavGroup[] = [
    { label: "Genel", items: [
      { label: "Kontrol Paneli", route: "/admin/dashboard", icon: "01" },
      { label: "Ana Sayfa Vitrini", route: "/admin/homepage", icon: "02" },
    ]},
    { label: "Araç ve İçerik", items: [
      { label: "Katalog Yayın Stüdyosu", route: "/admin/catalog-editor", icon: "03" },
      { label: "Kiralık Araçlar", route: "/admin/cars", queryParams: { tab: "RENTAL" }, icon: "04" },
      { label: "Satılık Araçlar", route: "/admin/cars", queryParams: { tab: "SALES" }, icon: "05" },
      { label: "Fotoğraf ve Video", route: "/admin/media", icon: "06" },
      { label: "Turlar", route: "/admin/tours", icon: "07" },
      { label: "Kampanyalar", route: "/admin/campaigns", icon: "08" },
      { label: "Blog", route: "/admin/blog", icon: "09" },
    ]},
    { label: "Operasyon", items: [
      { label: "Rezervasyonlar", route: "/admin/reservations", icon: "10" },
      { label: "Partner Başvuruları", route: "/admin/partner-requests", icon: "11" },
      { label: "Geri Bildirim", route: "/admin/feedback", icon: "12" },
      { label: "Aboneler", route: "/admin/subscribers", icon: "13" },
    ]},
    { label: "Organizasyon", items: [
      { label: "Yöneticiler ve Çalışanlar", route: "/admin/team", icon: "14" },
      { label: "Şubeler", route: "/admin/branches", icon: "15" },
    ]},
    { label: "Sistem", items: [
      { label: "WhatsApp Ayarları", route: "/admin/whatsapp", icon: "16" },
      { label: "Genel Ayarlar", route: "/admin/settings", icon: "17" },
    ]},
  ];

  private readonly titles: Record<string, string> = {
    "/admin/dashboard": "Kontrol Paneli",
    "/admin/homepage": "Ana Sayfa Vitrini",
    "/admin/campaigns": "Kampanyalar",
    "/admin/media": "Fotoğraf ve Video Yönetimi",
    "/admin/catalog-editor": "Katalog Yayın Stüdyosu",
    "/admin/whatsapp": "WhatsApp Ayarları",
    "/admin/team": "Ekip ve Yetkiler",
    "/admin/branches": "Şube Yönetimi",
    "/admin/cars": "Araç Yönetimi",
    "/admin/reservations": "Rezervasyon Yönetimi",
    "/admin/sales": "Satılık Araç Yönetimi",
    "/admin/tours": "Tur Yönetimi",
    "/admin/blog": "Blog Yönetimi",
    "/admin/partner-requests": "Partner Başvuruları",
    "/admin/feedback": "Geri Bildirimler",
    "/admin/subscribers": "Aboneler",
    "/admin/settings": "Sistem Ayarları",
  };

  constructor() {
    this.updatePageTitle(this.router.url);
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.closeSidebar();
      this.updatePageTitle(event.urlAfterRedirects);
    });
  }

  @HostListener("document:keydown.escape")
  onEscape(): void { this.closeSidebar(); }

  toggleSidebar(): void { this.isSidebarOpen.update((value) => !value); }
  closeSidebar(): void { this.isSidebarOpen.set(false); }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigateByUrl("/admin/dashboard");
  }

  logout(): void {
    this.closeSidebar();
    this.authService.logout();
  }

  private updatePageTitle(url: string): void {
    const path = url.split("?")[0].replace(/\/$/, "") || "/admin/dashboard";
    this.pageTitle.set(this.titles[path] || "Alperler Auto Yönetim");
  }
}
