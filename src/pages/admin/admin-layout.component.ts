import { CommonModule, Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ConfirmModalComponent } from '../../components/confirm-modal.component';
import { ToastComponent } from '../../components/toast.component';

interface AdminMenuItem { route: string; label: string; icon: string; }
interface AdminMenuGroup { title: string; items: AdminMenuItem[]; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ConfirmModalComponent],
  template: `
    <app-toast />
    <app-confirm-modal />
    <div class="admin-shell">
      <header class="topbar">
        <button type="button" class="icon-button" (click)="toggleSidebar()" aria-label="Admin menüsünü aç veya kapat">☰</button>
        @if (!isDashboard()) {
          <button type="button" class="back-button" (click)="goBack()" aria-label="Önceki admin sayfasına dön"><span aria-hidden="true">←</span><span>Geri</span></button>
        }
        <a routerLink="/admin/dashboard" class="brand" aria-label="Admin kontrol paneline git">
          @if (config().logoUrl) { <img [src]="config().logoUrl" alt="" aria-hidden="true" /> }
          @else { <span class="brand-mark" aria-hidden="true">A</span> }
          <span><strong>ALPERLER AUTO</strong><small>Admin</small></span>
        </a>
        <span class="page-title">{{ adminPageTitle() }}</span>
        <a routerLink="/" class="site-link" aria-label="Müşteri sitesine dön">Site</a>
      </header>

      @if (isSidebarOpen()) {
        <button type="button" class="backdrop" (click)="closeSidebar()" aria-label="Admin menüsünü kapat"></button>
      }

      <aside class="sidebar" [class.open]="isSidebarOpen()" aria-label="Admin ana menüsü">
        <div class="sidebar-head">
          <div class="profile">
            @if (config().adminProfileUrl) { <img [src]="config().adminProfileUrl" alt="Yönetici profil görseli" /> }
            @else { <span aria-hidden="true">A</span> }
            <div><strong>Yönetici</strong><small>{{ adminPageTitle() }}</small></div>
          </div>
          <button type="button" class="icon-button close" (click)="closeSidebar()" aria-label="Admin menüsünü kapat">×</button>
        </div>

        <nav class="menu" aria-label="Admin yönetim bölümleri">
          @for (group of menuGroups; track group.title) {
            <section class="menu-group" [attr.aria-label]="group.title">
              <h2>{{ group.title }}</h2>
              @for (item of group.items; track item.route) {
                <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact: item.route === '/admin/dashboard'}" (click)="closeSidebar()" [attr.aria-label]="item.label">
                  <span class="menu-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
                </a>
              }
            </section>
          }
        </nav>

        <div class="sidebar-foot">
          <a routerLink="/" (click)="closeSidebar()" aria-label="Müşteri sitesine dön">← Siteye Dön</a>
          <button type="button" (click)="logout()" aria-label="Admin hesabından çıkış yap">Çıkış Yap</button>
        </div>
      </aside>

      <main class="content"><router-outlet /></main>
    </div>
  `,
  styles: [`
    :host{display:block}.admin-shell{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif}.topbar{position:fixed;inset:0 0 auto 0;z-index:80;display:flex;height:64px;align-items:center;gap:.5rem;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.97);padding:0 .75rem;box-shadow:0 4px 20px rgba(15,23,42,.06);backdrop-filter:blur(14px)}.icon-button,.back-button,.site-link{display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:0;border-radius:11px;background:#f1f5f9;color:#0f172a;font:800 .76rem/1 inherit;text-decoration:none}.icon-button{width:42px;font-size:1.18rem}.back-button{gap:.3rem;padding:0 .7rem}.site-link{margin-left:auto;padding:0 .8rem;background:#0f172a;color:#fff}.brand{display:flex;min-width:0;align-items:center;gap:.55rem;color:#0f172a;text-decoration:none}.brand img,.brand-mark{width:34px;height:34px;flex:none;border-radius:10px}.brand img{object-fit:contain}.brand-mark{display:grid;place-items:center;background:#2563eb;color:#fff;font:900 1rem/1 Georgia,serif}.brand>span:last-child{display:flex;min-width:0;flex-direction:column}.brand strong{font-size:.72rem;letter-spacing:.04em;white-space:nowrap}.brand small{color:#2563eb;font-size:.56rem;font-weight:900}.page-title{display:none;max-width:28vw;overflow:hidden;color:#64748b;font-size:.7rem;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.backdrop{position:fixed;inset:64px 0 0 0;z-index:81;border:0;background:rgba(2,6,23,.55);backdrop-filter:blur(2px)}.sidebar{position:fixed;z-index:82;left:0;top:64px;bottom:0;display:flex;width:min(88vw,320px);transform:translateX(-105%);flex-direction:column;background:#07101f;color:#fff;box-shadow:24px 0 50px rgba(2,6,23,.3);transition:transform .2s ease}.sidebar.open{transform:translateX(0)}.sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem;border-bottom:1px solid rgba(255,255,255,.09);padding:.9rem}.profile{display:flex;min-width:0;align-items:center;gap:.65rem}.profile img,.profile>span{width:42px;height:42px;flex:none;border-radius:999px}.profile img{object-fit:cover}.profile>span{display:grid;place-items:center;background:#1d4ed8;font-weight:950}.profile div{display:flex;min-width:0;flex-direction:column}.profile strong{font-size:.78rem}.profile small{max-width:180px;overflow:hidden;color:#94a3b8;font-size:.6rem;text-overflow:ellipsis;white-space:nowrap}.sidebar .icon-button.close{background:rgba(255,255,255,.08);color:#fff}.menu{flex:1;overflow-y:auto;padding:.8rem}.menu-group{margin-bottom:.9rem}.menu-group h2{margin:.3rem .65rem;color:#64748b;font-size:.56rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.menu-group a{display:flex;min-height:44px;align-items:center;gap:.65rem;border-radius:11px;padding:0 .7rem;color:#cbd5e1;font-size:.7rem;font-weight:800;text-decoration:none}.menu-group a:hover,.menu-group a.active{background:rgba(37,99,235,.18);color:#fff}.menu-icon{display:grid;width:25px;height:25px;place-items:center;border-radius:8px;background:rgba(255,255,255,.06);font-size:.75rem}.sidebar-foot{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;border-top:1px solid rgba(255,255,255,.09);padding:.75rem}.sidebar-foot a,.sidebar-foot button{display:flex;min-height:44px;align-items:center;justify-content:center;border:0;border-radius:10px;background:rgba(255,255,255,.06);color:#cbd5e1;font-size:.67rem;font-weight:900;text-decoration:none}.sidebar-foot button{color:#fda4af}.content{min-height:100vh;padding-top:64px}.topbar button:focus-visible,.topbar a:focus-visible,.menu a:focus-visible,.sidebar-foot a:focus-visible,.sidebar-foot button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:720px){.page-title{display:block}.topbar{padding:0 1rem}}@media(prefers-reduced-motion:reduce){.sidebar{transition:none}}
  `]
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly carService = inject(CarService);
  readonly config = this.carService.getConfig();
  readonly isSidebarOpen = signal(false);
  readonly currentPath = signal(this.cleanPath(this.router.url));

  readonly menuGroups: AdminMenuGroup[] = [
    { title: 'Genel', items: [
      { route:'/admin/dashboard', label:'Kontrol Paneli', icon:'⌂' },
      { route:'/admin/analytics', label:'Ziyaretçi Analitiği', icon:'↗' },
      { route:'/admin/system-health', label:'Sistem Sağlığı', icon:'♡' },
    ]},
    { title: 'Site & Görünüm', items: [
      { route:'/admin/homepage', label:'Ana Sayfa Vitrini', icon:'▦' },
      { route:'/admin/navigation', label:'Mobil Menü & Alt Bar', icon:'☰' },
      { route:'/admin/footer', label:'Footer & Sosyal Medya', icon:'↓' },
      { route:'/admin/settings', label:'Site Ayarları & Yasal', icon:'⚙' },
      { route:'/admin/whatsapp', label:'WhatsApp Ayarları', icon:'✆' },
    ]},
    { title: 'İçerik', items: [
      { route:'/admin/catalog-editor', label:'Araç & Tur Yayın Stüdyosu', icon:'◇' },
      { route:'/admin/campaigns', label:'Kampanyalar', icon:'%' },
      { route:'/admin/blog', label:'Blog Yazıları', icon:'✎' },
    ]},
    { title: 'Müşteri & Operasyon', items: [
      { route:'/admin/reservations', label:'Rezervasyonlar', icon:'▣' },
      { route:'/admin/partner-requests', label:'Araç Başvuruları', icon:'+' },
      { route:'/admin/branch-partner-requests', label:'Şube Başvuruları', icon:'+' },
      { route:'/admin/feedback', label:'Mesaj Kutusu', icon:'✉' },
      { route:'/admin/subscribers', label:'Bülten Merkezi', icon:'@' },
      { route:'/admin/branches', label:'Şubeler', icon:'⌂' },
    ]},
    { title: 'Ekip & Güvenlik', items: [
      { route:'/admin/team', label:'Ekip & Yetkiler', icon:'♙' },
      { route:'/admin/assignments', label:'Görev Merkezi', icon:'✓' },
      { route:'/admin/audit', label:'İşlem Geçmişi', icon:'↶' },
    ]},
  ];

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentPath.set(this.cleanPath((event as NavigationEnd).urlAfterRedirects));
      this.closeSidebar();
    });
  }

  isDashboard(): boolean { return this.currentPath() === '/admin' || this.currentPath() === '/admin/dashboard'; }
  toggleSidebar(): void { this.isSidebarOpen.update((value) => !value); }
  closeSidebar(): void { this.isSidebarOpen.set(false); }
  goBack(): void { if (typeof window !== 'undefined' && window.history.length > 1) this.location.back(); else void this.router.navigate(['/admin/dashboard']); }
  logout(): void { this.auth.logout(); }

  adminPageTitle(): string {
    const segment = this.currentPath().replace(/^\/admin\/?/, '').split('/')[0] || 'dashboard';
    const labels: Record<string,string> = {
      dashboard:'Kontrol Paneli', analytics:'Ziyaretçi Analitiği', homepage:'Ana Sayfa Vitrini', navigation:'Mobil Menü & Alt Bar', footer:'Footer & Sosyal Medya', settings:'Site Ayarları', whatsapp:'WhatsApp Ayarları', 'catalog-editor':'Araç & Tur Yayın Stüdyosu', campaigns:'Kampanyalar', blog:'Blog', reservations:'Rezervasyonlar', 'partner-requests':'Araç Başvuruları', 'branch-partner-requests':'Şube Başvuruları', feedback:'Mesaj Kutusu', subscribers:'Bülten Merkezi', branches:'Şubeler', team:'Ekip & Yetkiler', assignments:'Görev Merkezi', audit:'İşlem Geçmişi', 'system-health':'Sistem Sağlığı'
    };
    return labels[segment] || 'Admin';
  }

  private cleanPath(url: string): string { return url.split('?')[0].split('#')[0].replace(/\/$/, '') || '/'; }
}
