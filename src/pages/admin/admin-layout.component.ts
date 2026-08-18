import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ConfirmModalComponent } from '../../components/confirm-modal.component';
import { ToastComponent } from '../../components/toast.component';

interface AdminMenuItem { route: string; label: string; icon: string; keywords?: string; }
interface AdminMenuGroup { id: string; title: string; icon: string; items: AdminMenuItem[]; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, ToastComponent, ConfirmModalComponent],
  template: `
    <app-toast />
    <app-confirm-modal />

    <div class="admin-shell">
      @if (!isMenuOpen()) {
        <button
          type="button"
          class="edge-menu-button"
          (click)="openMenu()"
          aria-controls="admin-command-menu"
          aria-expanded="false"
          [attr.aria-label]="'Yönetim menüsünü aç. Şu an ' + pageTitle() + ' sayfasındasınız'"
        >
          <span aria-hidden="true">⋮</span>
        </button>
      }

      @if (isMenuOpen()) {
        <button type="button" class="menu-backdrop" (click)="closeMenu()" aria-label="Yönetim menüsünü kapat"></button>
      }

      <aside id="admin-command-menu" class="command-drawer" [class.open]="isMenuOpen()" aria-label="Admin yönetim menüsü">
        <header class="drawer-header">
          <div class="profile-block">
            @if (config().adminProfileUrl) {
              <img [src]="config().adminProfileUrl" alt="Yönetici profil görseli" />
            } @else {
              <span class="profile-fallback" aria-hidden="true">A</span>
            }
            <div>
              <strong>{{ config().adminDisplayName || 'Yönetim Merkezi' }}</strong>
              <small>{{ pageTitle() }}</small>
            </div>
          </div>
          <button type="button" class="drawer-close" (click)="closeMenu()" aria-label="Yönetim menüsünü kapat">×</button>
        </header>

        <section class="drawer-brand" aria-label="Alperler Auto yönetim alanı">
          <span class="brand-mark" aria-hidden="true">A</span>
          <div><strong>ALPERLER AUTO</strong><small>Yönetim Merkezi</small></div>
        </section>

        <div class="menu-search">
          <label for="admin-command-search">Menüde ara</label>
          <div class="search-control">
            <span aria-hidden="true">⌕</span>
            <input
              id="admin-command-search"
              [(ngModel)]="menuSearch"
              type="search"
              autocomplete="off"
              placeholder="Araç, ayarlar, bülten, görev…"
              aria-label="Yönetim menüsünde sayfa ara"
            />
            @if (menuSearch.trim()) {
              <button type="button" (click)="menuSearch=''" aria-label="Menü aramasını temizle">×</button>
            }
          </div>
        </div>

        <nav class="menu-scroll" aria-label="Yönetim sayfaları">
          @if (menuSearch.trim()) {
            <p class="result-title">Arama Sonuçları · {{ searchResults().length }}</p>
            @for (item of searchResults(); track item.route) {
              <button type="button" class="nav-item" [class.active]="isActive(item.route)" (click)="go(item.route)" [attr.aria-label]="item.label + ' sayfasını aç'">
                <span class="item-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
              </button>
            } @empty {
              <div class="empty-result">Eşleşen yönetim sayfası bulunamadı.</div>
            }
          } @else {
            @for (group of menuGroups; track group.id) {
              <section class="menu-group">
                <button
                  type="button"
                  class="group-toggle"
                  (click)="toggleGroup(group.id)"
                  [attr.aria-expanded]="groupOpen(group.id)"
                  [attr.aria-controls]="'admin-group-' + group.id"
                >
                  <span class="group-icon" aria-hidden="true">{{ group.icon }}</span>
                  <strong>{{ group.title }}</strong>
                  <span aria-hidden="true">{{ groupOpen(group.id) ? '⌃' : '⌄' }}</span>
                </button>
                @if (groupOpen(group.id)) {
                  <div class="group-items" [id]="'admin-group-' + group.id">
                    @for (item of group.items; track item.route) {
                      <button type="button" class="nav-item" [class.active]="isActive(item.route)" (click)="go(item.route)" [attr.aria-label]="item.label + ' sayfasını aç'">
                        <span class="item-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
                      </button>
                    }
                  </div>
                }
              </section>
            }
          }
        </nav>

        <footer class="drawer-footer">
          <button type="button" (click)="go('/admin/dashboard')">⌂ Kontrol Paneli</button>
          <a href="/" target="_blank" rel="noopener noreferrer" aria-label="Müşteri sitesini yeni sekmede aç">↗ Siteyi Gör</a>
          <button type="button" class="logout" (click)="logout()">Çıkış Yap</button>
        </footer>
      </aside>

      <main id="admin-page-content" class="admin-page" tabindex="-1" [attr.aria-label]="pageTitle()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh}.admin-shell{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif}.admin-page{min-height:100vh;outline:none}.edge-menu-button{position:fixed;right:0;top:76px;z-index:100;display:grid;width:48px;height:58px;place-items:center;border:1px solid rgba(255,255,255,.16);border-right:0;border-radius:16px 0 0 16px;background:#07101f;color:#fff;box-shadow:0 12px 30px rgba(2,6,23,.28);font:900 1.7rem/1 system-ui;cursor:pointer}.edge-menu-button:focus-visible,.command-drawer button:focus-visible,.command-drawer a:focus-visible,.command-drawer input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.menu-backdrop{position:fixed;inset:0;z-index:108;border:0;background:rgba(2,6,23,.62);backdrop-filter:blur(3px)}.command-drawer{position:fixed;z-index:109;inset:0 0 0 auto;display:flex;width:min(94vw,390px);transform:translateX(105%);flex-direction:column;background:#07101f;color:#fff;box-shadow:-28px 0 60px rgba(2,6,23,.36);transition:transform .2s ease}.command-drawer.open{transform:translateX(0)}.drawer-header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-bottom:1px solid rgba(255,255,255,.08);padding:1rem}.profile-block{display:flex;min-width:0;align-items:center;gap:.75rem}.profile-block img,.profile-fallback{width:46px;height:46px;flex:none;border-radius:999px}.profile-block img{object-fit:cover}.profile-fallback{display:grid;place-items:center;background:#2563eb;color:#fff;font-weight:950}.profile-block div{display:flex;min-width:0;flex-direction:column}.profile-block strong{font-size:.82rem}.profile-block small{max-width:235px;overflow:hidden;color:#94a3b8;font-size:.62rem;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.drawer-close{width:44px;height:44px;flex:none;border:0;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-size:1.5rem;cursor:pointer}.drawer-brand{display:flex;align-items:center;gap:.7rem;border-bottom:1px solid rgba(255,255,255,.08);padding:.8rem 1rem}.brand-mark{display:grid;width:35px;height:35px;place-items:center;border-radius:11px;background:linear-gradient(145deg,#2563eb,#1d4ed8);font:900 1rem/1 Georgia,serif}.drawer-brand div{display:flex;flex-direction:column}.drawer-brand strong{font-size:.72rem;letter-spacing:.08em}.drawer-brand small{margin-top:.15rem;color:#64748b;font-size:.56rem;font-weight:850;text-transform:uppercase}.menu-search{border-bottom:1px solid rgba(255,255,255,.08);padding:.8rem 1rem}.menu-search label{display:block;margin-bottom:.4rem;color:#94a3b8;font-size:.58rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.search-control{display:flex;min-height:46px;align-items:center;gap:.45rem;border:1px solid rgba(148,163,184,.2);border-radius:13px;background:rgba(255,255,255,.06);padding:0 .7rem}.search-control input{min-width:0;flex:1;border:0;background:transparent;color:#fff;outline:none;font-size:.76rem}.search-control input::placeholder{color:#64748b}.search-control button{width:34px;height:34px;border:0;background:transparent;color:#cbd5e1}.menu-scroll{flex:1;overflow-y:auto;padding:.75rem}.result-title{margin:.3rem .45rem .6rem;color:#64748b;font-size:.58rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.menu-group{margin-bottom:.55rem;overflow:hidden;border:1px solid rgba(148,163,184,.12);border-radius:15px}.group-toggle{display:grid;width:100%;min-height:50px;grid-template-columns:30px 1fr auto;align-items:center;gap:.5rem;border:0;background:rgba(255,255,255,.035);padding:0 .7rem;color:#e2e8f0;text-align:left;cursor:pointer}.group-toggle strong{font-size:.72rem}.group-icon,.item-icon{display:grid;width:27px;height:27px;place-items:center;border-radius:8px;background:rgba(255,255,255,.06);font-size:.74rem}.group-items{border-top:1px solid rgba(148,163,184,.1);padding:.4rem}.nav-item{display:flex;width:100%;min-height:46px;align-items:center;gap:.7rem;border:0;border-radius:11px;background:transparent;padding:0 .7rem;color:#cbd5e1;font:800 .72rem/1.25 inherit;text-align:left;cursor:pointer}.nav-item:hover,.nav-item.active{background:rgba(37,99,235,.2);color:#fff}.nav-item.active{box-shadow:inset 3px 0 0 #60a5fa}.empty-result{border:1px dashed rgba(148,163,184,.25);border-radius:12px;padding:1rem;text-align:center;color:#94a3b8;font-size:.72rem}.drawer-footer{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;border-top:1px solid rgba(255,255,255,.09);padding:.8rem}.drawer-footer button,.drawer-footer a{display:flex;min-height:44px;align-items:center;justify-content:center;border:0;border-radius:11px;background:rgba(255,255,255,.06);color:#cbd5e1;font-size:.68rem;font-weight:900;text-decoration:none;cursor:pointer}.drawer-footer .logout{grid-column:1/-1;color:#fda4af}@media(max-width:520px){.edge-menu-button{top:70px;width:44px;height:54px}.command-drawer{width:min(96vw,390px)}}@media(prefers-reduced-motion:reduce){.command-drawer{transition:none}}
  `]
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  readonly config = this.carService.getConfig();
  readonly isMenuOpen = signal(false);
  readonly currentPath = signal(this.cleanPath(this.router.url));
  readonly activeGroup = signal('general');
  menuSearch = '';

  readonly menuGroups: AdminMenuGroup[] = [
    { id:'general', title:'Genel', icon:'⌂', items:[
      {route:'/admin/dashboard',label:'Kontrol Paneli',icon:'⌂',keywords:'istatistik özet ana'},
      {route:'/admin/analytics',label:'Ziyaretçi Analitiği',icon:'↗',keywords:'trafik dönüşüm'},
      {route:'/admin/system-health',label:'Sistem Sağlığı',icon:'♡',keywords:'hata servis bağlantı'},
    ]},
    { id:'site', title:'Site & Görünüm', icon:'▦', items:[
      {route:'/admin/settings',label:'Site Ayarları',icon:'⚙',keywords:'profil genel ana sayfa vitrin menü alt bar footer sosyal medya yasal seo sss whatsapp logo iletişim'},
    ]},
    { id:'content', title:'İçerik & Katalog', icon:'◇', items:[
      {route:'/admin/catalog-editor',label:'Araç & Tur Yayın Stüdyosu',icon:'◇',keywords:'kiralık satılık tur fotoğraf video yeni'},
      {route:'/admin/campaigns',label:'Kampanyalar',icon:'%',keywords:'fırsat indirim'},
      {route:'/admin/blog',label:'Blog Yazıları',icon:'✎',keywords:'içerik rehber'},
    ]},
    { id:'operations', title:'Müşteri & Operasyon', icon:'✉', items:[
      {route:'/admin/reservations',label:'Rezervasyonlar',icon:'▣',keywords:'kiralama tur satış randevu'},
      {route:'/admin/partner-requests',label:'Araç Değerlendirme Başvuruları',icon:'+',keywords:'araç sahibi değerlendir'},
      {route:'/admin/branch-partner-requests',label:'Şube & Bayilik Başvuruları',icon:'+',keywords:'franchise bayi'},
      {route:'/admin/feedback',label:'Mesaj Kutusu',icon:'✉',keywords:'geri bildirim hata öneri'},
      {route:'/admin/subscribers',label:'Bülten & Aboneler',icon:'@',keywords:'email kampanya abone'},
      {route:'/admin/branches',label:'Şubeler',icon:'⌂',keywords:'lokasyon teslim franchise'},
    ]},
    { id:'team', title:'Ekip & Güvenlik', icon:'♙', items:[
      {route:'/admin/team',label:'Ekip & Yetkiler',icon:'♙',keywords:'personel rol'},
      {route:'/admin/assignments',label:'Görev Merkezi',icon:'✓',keywords:'görev atama'},
      {route:'/admin/audit',label:'İşlem Geçmişi',icon:'↶',keywords:'audit log güvenlik'},
    ]},
  ];

  readonly searchResults = computed(() => {
    const q = this.menuSearch.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    return this.menuGroups.flatMap(group => group.items).filter(item => `${item.label} ${item.keywords || ''}`.toLocaleLowerCase('tr-TR').includes(q));
  });

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const path = this.cleanPath((event as NavigationEnd).urlAfterRedirects);
      this.currentPath.set(path);
      this.openCurrentGroup(path);
      this.closeMenu();
      queueMicrotask(() => document.getElementById('admin-page-content')?.focus({ preventScroll: true }));
    });
    this.openCurrentGroup(this.currentPath());
  }

  openMenu(): void { this.isMenuOpen.set(true); }
  closeMenu(): void { this.isMenuOpen.set(false); }
  toggleGroup(id: string): void { this.activeGroup.set(this.activeGroup() === id ? '' : id); }
  groupOpen(id: string): boolean { return this.activeGroup() === id; }
  isActive(route: string): boolean {
    if (route === '/admin/settings' && this.isSiteSettingsPath(this.currentPath())) return true;
    return this.currentPath() === route || this.currentPath().startsWith(route + '/');
  }

  async go(route: string): Promise<void> {
    this.closeMenu();
    this.menuSearch = '';
    if (this.currentPath() === route || (route === '/admin/settings' && this.currentPath() === '/admin/settings')) {
      queueMicrotask(() => document.getElementById('admin-page-content')?.focus({ preventScroll: true }));
      return;
    }
    await this.router.navigateByUrl(route);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
  }

  pageTitle(): string {
    if (this.isSiteSettingsPath(this.currentPath())) return 'Site Ayarları';
    const item = this.menuGroups.flatMap(group => group.items).find(item => this.currentPath() === item.route || this.currentPath().startsWith(item.route + '/'));
    return item?.label || 'Kontrol Merkezi';
  }

  private openCurrentGroup(path: string): void {
    if (this.isSiteSettingsPath(path)) {
      this.activeGroup.set('site');
      return;
    }
    const group = this.menuGroups.find(candidate => candidate.items.some(item => path === item.route || path.startsWith(item.route + '/')));
    if (group) this.activeGroup.set(group.id);
  }

  private isSiteSettingsPath(path: string): boolean {
    return ['/admin/settings','/admin/homepage','/admin/navigation','/admin/footer','/admin/legal','/admin/seo','/admin/faq-management','/admin/whatsapp'].some(route => path === route || path.startsWith(route + '/'));
  }

  private cleanPath(url: string): string {
    return url.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  }
}
