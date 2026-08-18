import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ConfirmModalComponent } from '../../components/confirm-modal.component';
import { ToastComponent } from '../../components/toast.component';

interface AdminModuleItem {
  id: 'overview' | 'site' | 'content' | 'operations' | 'team';
  route: string;
  label: string;
  description: string;
  icon: string;
  paths: string[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastComponent, ConfirmModalComponent],
  template: `
    <app-toast />
    <app-confirm-modal />

    <div class="admin-shell">
      <button
        type="button"
        class="menu-trigger"
        (click)="toggleMenu()"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="admin-module-menu"
        [attr.aria-label]="menuOpen() ? 'Yönetim menüsünü kapat' : 'Yönetim menüsünü aç'"
      ><span aria-hidden="true">⋮</span></button>

      @if (menuOpen()) {
        <button type="button" class="menu-backdrop" (click)="closeMenu()" aria-label="Yönetim menüsünü kapat"></button>
        <aside id="admin-module-menu" class="module-menu" aria-label="Yönetim bölümleri">
          <header class="menu-head">
            <div class="profile">
              @if (config().adminProfileUrl) {
                <img [src]="config().adminProfileUrl" alt="Yönetici profil görseli" />
              } @else {
                <span class="avatar" aria-hidden="true">A</span>
              }
              <div>
                <strong>{{ config().adminDisplayName || 'Yönetim Merkezi' }}</strong>
                <small>{{ currentModule()?.label || 'Kontrol Merkezi' }}</small>
              </div>
            </div>
            <button type="button" class="close" (click)="closeMenu()" aria-label="Menüyü kapat">×</button>
          </header>

          <nav class="module-list" aria-label="Ana yönetim bölümleri">
            @for (item of modules; track item.id) {
              <button
                type="button"
                class="module-item"
                [class.active]="isModuleActive(item)"
                (click)="go(item.route)"
                [attr.aria-label]="item.label + '. ' + item.description"
              >
                <span class="module-icon" aria-hidden="true">{{ item.icon }}</span>
                <span class="module-copy"><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
                <span class="arrow" aria-hidden="true">›</span>
              </button>
            }
          </nav>

          <footer class="menu-actions">
            <a href="/" target="_blank" rel="noopener noreferrer">Siteyi Gör</a>
            <button type="button" (click)="logout()">Çıkış Yap</button>
          </footer>
        </aside>
      }

      <main id="admin-page-content" class="admin-page" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh}.admin-shell{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif}.admin-page{min-height:100vh;outline:none}.menu-trigger{position:fixed;top:12px;right:12px;z-index:120;display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:13px;background:#07101f;color:#fff;box-shadow:0 8px 24px rgba(2,6,23,.26);font:950 1.55rem/1 system-ui;cursor:pointer}.menu-trigger:focus-visible,.module-menu button:focus-visible,.module-menu a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.menu-backdrop{position:fixed;inset:0;z-index:108;border:0;background:rgba(15,23,42,.16);backdrop-filter:blur(1px)}.module-menu{position:fixed;top:64px;right:12px;z-index:119;width:min(88vw,330px);max-height:calc(100vh - 78px);overflow:auto;border:1px solid rgba(148,163,184,.2);border-radius:20px;background:#07101f;color:#fff;box-shadow:0 24px 60px rgba(2,6,23,.38)}.menu-head{display:flex;align-items:center;justify-content:space-between;gap:.7rem;border-bottom:1px solid rgba(255,255,255,.08);padding:.8rem}.profile{display:flex;min-width:0;align-items:center;gap:.65rem}.profile img,.avatar{width:40px;height:40px;flex:none;border-radius:999px}.profile img{object-fit:cover}.avatar{display:grid;place-items:center;background:#2563eb;color:#fff;font-weight:950}.profile div{display:flex;min-width:0;flex-direction:column}.profile strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.76rem}.profile small{margin-top:.12rem;color:#94a3b8;font-size:.61rem}.close{display:grid;width:38px;height:38px;flex:none;place-items:center;border:0;border-radius:11px;background:rgba(255,255,255,.07);color:#fff;font-size:1.25rem;cursor:pointer}.module-list{display:grid;gap:.38rem;padding:.6rem}.module-item{display:grid;width:100%;min-height:66px;grid-template-columns:38px 1fr 18px;align-items:center;gap:.65rem;border:1px solid transparent;border-radius:14px;background:rgba(255,255,255,.035);padding:.6rem;color:#e2e8f0;text-align:left;cursor:pointer}.module-item.active{border-color:rgba(96,165,250,.38);background:rgba(37,99,235,.2)}.module-icon{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:rgba(255,255,255,.07);font-size:.9rem}.module-copy{display:flex;min-width:0;flex-direction:column}.module-copy strong{font-size:.75rem}.module-copy small{margin-top:.18rem;color:#94a3b8;font-size:.59rem;line-height:1.35}.arrow{color:#64748b;font-size:1.2rem}.menu-actions{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;border-top:1px solid rgba(255,255,255,.08);padding:.6rem}.menu-actions a,.menu-actions button{display:flex;min-height:42px;align-items:center;justify-content:center;border:0;border-radius:11px;background:rgba(255,255,255,.06);color:#cbd5e1;font-size:.66rem;font-weight:900;text-decoration:none;cursor:pointer}.menu-actions button{color:#fda4af}@media(max-width:520px){.menu-trigger{top:10px;right:10px;width:42px;height:42px}.module-menu{top:60px;right:10px;width:min(92vw,320px);max-height:calc(100vh - 72px)}}
  `],
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  readonly config = this.carService.getConfig();
  readonly menuOpen = signal(false);
  readonly currentPath = signal(this.cleanPath(this.router.url));

  readonly modules: AdminModuleItem[] = [
    { id:'overview', route:'/admin/dashboard', label:'Kontrol Merkezi', description:'Özet, ziyaretçi ve sistem durumu', icon:'⌂', paths:['/admin/dashboard','/admin/analytics','/admin/system-health'] },
    { id:'site', route:'/admin/settings', label:'Site Ayarları', description:'Profil, ana sayfa, footer, yasal, SEO ve iletişim', icon:'⚙', paths:['/admin/settings','/admin/homepage','/admin/navigation','/admin/footer','/admin/legal','/admin/seo','/admin/faq-management','/admin/whatsapp'] },
    { id:'content', route:'/admin/content', label:'İçerik & Katalog', description:'Kiralık, satılık, turlar, kampanyalar ve blog', icon:'◇', paths:['/admin/content','/admin/catalog-editor','/admin/campaigns','/admin/blog','/admin/cars','/admin/sales','/admin/tours'] },
    { id:'operations', route:'/admin/operations', label:'Operasyonlar', description:'Rezervasyon, başvuru, mesaj, bülten ve şubeler', icon:'▣', paths:['/admin/operations','/admin/reservations','/admin/partner-requests','/admin/branch-partner-requests','/admin/feedback','/admin/subscribers','/admin/branches','/admin/branch-network'] },
    { id:'team', route:'/admin/team-center', label:'Ekip & Güvenlik', description:'Yetkiler, görevler ve işlem geçmişi', icon:'♙', paths:['/admin/team-center','/admin/team','/admin/assignments','/admin/audit'] },
  ];

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentPath.set(this.cleanPath((event as NavigationEnd).urlAfterRedirects));
      this.closeMenu();
      queueMicrotask(() => document.getElementById('admin-page-content')?.focus({ preventScroll: true }));
    });
  }

  toggleMenu(): void { this.menuOpen.update((value) => !value); }
  closeMenu(): void { this.menuOpen.set(false); }

  isModuleActive(item: AdminModuleItem): boolean {
    const path = this.currentPath();
    return item.paths.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
  }

  currentModule(): AdminModuleItem | undefined { return this.modules.find((item) => this.isModuleActive(item)); }

  async go(route: string): Promise<void> {
    this.closeMenu();
    await this.router.navigateByUrl(route);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
  }

  private cleanPath(url: string): string {
    return url.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  }
}
