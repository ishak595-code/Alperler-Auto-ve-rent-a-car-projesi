import { CommonModule, Location } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ConfirmModalComponent],
  template: `
    <app-toast />
    <app-confirm-modal />
    <div class="admin-shell">
      <header class="topbar">
        <button type="button" class="menu-button" (click)="toggleSidebar()" [attr.aria-expanded]="isSidebarOpen()" aria-controls="admin-menu" aria-label="Yönetim menüsünü aç veya kapat"><span aria-hidden="true">☰</span><span>Menü</span></button>
        @if (!isDashboard()) { <button type="button" class="back-button" (click)="goBack()" aria-label="Önceki admin sayfasına dön"><span aria-hidden="true">←</span><span>Geri</span></button> }
        <a routerLink="/admin/dashboard" class="brand" aria-label="Admin kontrol paneline git">
          @if (config().logoUrl) { <img [src]="config().logoUrl" alt="" aria-hidden="true" /> } @else { <span class="brand-mark" aria-hidden="true">A</span> }
          <span><strong>ALPERLER AUTO</strong><small>{{ adminPageTitle() }}</small></span>
        </a>
        <a routerLink="/" class="site-link" target="_blank" aria-label="Müşteri sitesini yeni sekmede aç">Site</a>
      </header>

      @if (isSidebarOpen()) { <button type="button" class="backdrop" (click)="closeSidebar()" aria-label="Yönetim menüsünü kapat"></button> }

      <aside id="admin-menu" class="sidebar" [class.open]="isSidebarOpen()" aria-label="Admin ana menüsü">
        <div class="sidebar-head">
          <div class="profile">
            @if (config().adminProfileUrl) { <img [src]="config().adminProfileUrl" alt="Yönetici profil görseli" /> } @else { <span aria-hidden="true">A</span> }
            <div><strong>Yönetim Merkezi</strong><small>{{ adminPageTitle() }}</small></div>
          </div>
          <button type="button" class="close-button" (click)="closeSidebar()" aria-label="Yönetim menüsünü kapat">×</button>
        </div>

        <div class="menu-search">
          <label for="admin-menu-search">Menüde ara</label>
          <div><span aria-hidden="true">⌕</span><input id="admin-menu-search" [(ngModel)]="menuSearch" type="search" autocomplete="off" placeholder="Araç, bülten, yasal…" aria-label="Yönetim menüsünde sayfa ara" />@if(menuSearch.trim()){<button type="button" (click)="menuSearch=''" aria-label="Menü aramasını temizle">×</button>}</div>
        </div>

        <nav class="menu" aria-label="Admin yönetim bölümleri">
          @if (menuSearch.trim()) {
            <p class="result-title">Arama Sonuçları · {{ searchResults().length }}</p>
            @for (item of searchResults(); track item.route) { <ng-container *ngTemplateOutlet="navItem; context: {$implicit:item}"></ng-container> }
            @empty { <div class="empty-result">Eşleşen yönetim sayfası yok.</div> }
          } @else {
            @for (group of menuGroups; track group.id) {
              <section class="menu-group">
                <button type="button" class="group-toggle" (click)="toggleGroup(group.id)" [attr.aria-expanded]="groupOpen(group.id)" [attr.aria-controls]="'group-'+group.id" [attr.aria-label]="group.title + ' menüsünü ' + (groupOpen(group.id) ? 'kapat' : 'aç')"><span class="group-icon" aria-hidden="true">{{ group.icon }}</span><strong>{{ group.title }}</strong><span aria-hidden="true">{{ groupOpen(group.id) ? '⌃' : '⌄' }}</span></button>
                @if (groupOpen(group.id)) { <div [id]="'group-'+group.id" class="group-items">@for (item of group.items; track item.route) { <ng-container *ngTemplateOutlet="navItem; context: {$implicit:item}"></ng-container> }</div> }
              </section>
            }
          }
        </nav>

        <ng-template #navItem let-item>
          <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{exact:item.route==='/admin/dashboard'}" (click)="closeSidebar()" [attr.aria-label]="item.label + ' sayfasını aç"><span class="menu-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span></a>
        </ng-template>

        <div class="sidebar-foot"><a routerLink="/admin/dashboard" (click)="closeSidebar()" aria-label="Kontrol paneline git">⌂ Kontrol Paneli</a><button type="button" (click)="logout()" aria-label="Admin hesabından çıkış yap">Çıkış Yap</button></div>
      </aside>

      <main class="content"><router-outlet /></main>
    </div>
  `,
  styles: [`
    :host{display:block}.admin-shell{min-height:100vh;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,sans-serif}.topbar{position:fixed;inset:0 0 auto;z-index:80;display:flex;height:64px;align-items:center;gap:.45rem;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.98);padding:0 .65rem;box-shadow:0 4px 20px rgba(15,23,42,.06);backdrop-filter:blur(14px)}.menu-button,.back-button,.site-link{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:.35rem;border:0;border-radius:11px;background:#f1f5f9;padding:0 .7rem;color:#0f172a;font:850 .72rem/1 inherit;text-decoration:none}.site-link{margin-left:auto;background:#0f172a;color:#fff}.brand{display:flex;min-width:0;align-items:center;gap:.5rem;color:#0f172a;text-decoration:none}.brand img,.brand-mark{width:34px;height:34px;flex:none;border-radius:10px}.brand img{object-fit:contain}.brand-mark{display:grid;place-items:center;background:#2563eb;color:#fff;font:900 1rem/1 Georgia,serif}.brand>span:last-child{display:flex;min-width:0;flex-direction:column}.brand strong{font-size:.7rem;white-space:nowrap}.brand small{max-width:42vw;overflow:hidden;color:#2563eb;font-size:.55rem;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.backdrop{position:fixed;inset:64px 0 0;z-index:81;border:0;background:rgba(2,6,23,.57);backdrop-filter:blur(2px)}.sidebar{position:fixed;z-index:82;left:0;top:64px;bottom:0;display:flex;width:min(92vw,360px);transform:translateX(-105%);flex-direction:column;background:#07101f;color:#fff;box-shadow:24px 0 50px rgba(2,6,23,.3);transition:transform .2s ease}.sidebar.open{transform:translateX(0)}.sidebar-head{display:flex;align-items:center;justify-content:space-between;gap:.6rem;border-bottom:1px solid rgba(255,255,255,.09);padding:.9rem}.profile{display:flex;min-width:0;align-items:center;gap:.65rem}.profile img,.profile>span{width:42px;height:42px;flex:none;border-radius:999px}.profile img{object-fit:cover}.profile>span{display:grid;place-items:center;background:#1d4ed8;font-weight:950}.profile div{display:flex;min-width:0;flex-direction:column}.profile strong{font-size:.78rem}.profile small{max-width:220px;overflow:hidden;color:#94a3b8;font-size:.6rem;text-overflow:ellipsis;white-space:nowrap}.close-button{width:42px;height:42px;border:0;border-radius:11px;background:rgba(255,255,255,.08);color:#fff;font-size:1.35rem}.menu-search{border-bottom:1px solid rgba(255,255,255,.08);padding:.8rem}.menu-search>label{display:block;margin:0 0 .35rem;color:#94a3b8;font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em}.menu-search>div{display:flex;min-height:44px;align-items:center;gap:.45rem;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:rgba(255,255,255,.06);padding:0 .65rem}.menu-search input{min-width:0;flex:1;border:0;background:transparent;color:#fff;outline:none;font-size:.75rem}.menu-search input::placeholder{color:#64748b}.menu-search button{width:34px;height:34px;border:0;background:transparent;color:#cbd5e1}.menu{flex:1;overflow-y:auto;padding:.7rem}.menu-group{margin-bottom:.5rem;overflow:hidden;border:1px solid rgba(148,163,184,.12);border-radius:14px}.group-toggle{display:grid;width:100%;min-height:48px;grid-template-columns:30px 1fr auto;align-items:center;gap:.45rem;border:0;background:rgba(255,255,255,.035);padding:0 .65rem;color:#e2e8f0;text-align:left}.group-toggle strong{font-size:.7rem}.group-icon,.menu-icon{display:grid;width:25px;height:25px;place-items:center;border-radius:8px;background:rgba(255,255,255,.06);font-size:.72rem}.group-items{border-top:1px solid rgba(148,163,184,.1);padding:.35rem}.menu a{display:flex;min-height:44px;align-items:center;gap:.65rem;border-radius:11px;padding:0 .65rem;color:#cbd5e1;font-size:.69rem;font-weight:800;text-decoration:none}.menu a:hover,.menu a.active{background:rgba(37,99,235,.2);color:#fff}.result-title{margin:.3rem .45rem .55rem;color:#64748b;font-size:.58rem;font-weight:950;text-transform:uppercase}.empty-result{border:1px dashed rgba(148,163,184,.25);border-radius:12px;padding:1rem;text-align:center;color:#94a3b8;font-size:.7rem}.sidebar-foot{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;border-top:1px solid rgba(255,255,255,.09);padding:.75rem}.sidebar-foot a,.sidebar-foot button{display:flex;min-height:44px;align-items:center;justify-content:center;border:0;border-radius:10px;background:rgba(255,255,255,.06);color:#cbd5e1;font-size:.67rem;font-weight:900;text-decoration:none}.sidebar-foot button{color:#fda4af}.content{min-height:100vh;padding-top:64px}.topbar button:focus-visible,.topbar a:focus-visible,.sidebar button:focus-visible,.menu a:focus-visible,.sidebar-foot a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(max-width:390px){.menu-button span:last-child,.back-button span:last-child{display:none}.menu-button,.back-button{width:42px;padding:0}}@media(prefers-reduced-motion:reduce){.sidebar{transition:none}}
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
  readonly activeGroup = signal('general');
  menuSearch = '';

  readonly menuGroups: AdminMenuGroup[] = [
    { id:'general', title:'Genel', icon:'⌂', items:[
      {route:'/admin/dashboard',label:'Kontrol Paneli',icon:'⌂',keywords:'istatistik özet ana'},
      {route:'/admin/analytics',label:'Ziyaretçi Analitiği',icon:'↗',keywords:'trafik dönüşüm'},
      {route:'/admin/system-health',label:'Sistem Sağlığı',icon:'♡',keywords:'hata servis bağlantı'},
    ]},
    { id:'site', title:'Site & Görünüm', icon:'▦', items:[
      {route:'/admin/homepage',label:'Ana Sayfa Vitrini',icon:'▦',keywords:'bölüm sıra tema'},
      {route:'/admin/navigation',label:'Mobil Menü & Alt Bar',icon:'☰',keywords:'hamburger navigasyon buton'},
      {route:'/admin/footer',label:'Footer & Sosyal Medya',icon:'↓',keywords:'instagram tiktok youtube x bülten'},
      {route:'/admin/legal',label:'Yasal Metin Merkezi',icon:'§',keywords:'kvkk kiralama satış tur bayilik sözleşme'},
      {route:'/admin/settings',label:'Site Ayarları',icon:'⚙',keywords:'logo şirket seo hesap'},
      {route:'/admin/whatsapp',label:'WhatsApp Ayarları',icon:'✆',keywords:'mesaj iletişim'},
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
    return this.menuGroups.flatMap(group=>group.items).filter(item=>`${item.label} ${item.keywords||''}`.toLocaleLowerCase('tr-TR').includes(q));
  });

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const path=this.cleanPath((event as NavigationEnd).urlAfterRedirects); this.currentPath.set(path); this.openCurrentGroup(path); this.closeSidebar();
    });
    this.openCurrentGroup(this.currentPath());
  }

  isDashboard(): boolean { return this.currentPath()==='/admin'||this.currentPath()==='/admin/dashboard'; }
  toggleSidebar(): void { this.isSidebarOpen.update(v=>!v); }
  closeSidebar(): void { this.isSidebarOpen.set(false); }
  toggleGroup(id:string):void{this.activeGroup.set(this.activeGroup()===id?'':id)}
  groupOpen(id:string):boolean{return this.activeGroup()===id}
  goBack(): void { if(typeof window!=='undefined'&&window.history.length>1)this.location.back(); else void this.router.navigate(['/admin/dashboard']); }
  async logout(): Promise<void> { await this.auth.logout(); void this.router.navigate(['/admin/login']); }
  adminPageTitle():string{const item=this.menuGroups.flatMap(g=>g.items).find(i=>this.currentPath()===i.route||this.currentPath().startsWith(i.route+'/'));return item?.label||'Kontrol Merkezi'}
  private openCurrentGroup(path:string):void{const group=this.menuGroups.find(g=>g.items.some(i=>path===i.route||path.startsWith(i.route+'/')));if(group)this.activeGroup.set(group.id)}
  private cleanPath(url:string):string{return url.split('?')[0].split('#')[0].replace(/\/$/,'')||'/'}
}
