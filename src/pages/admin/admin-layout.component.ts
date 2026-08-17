
import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ToastComponent } from '../../components/toast.component';
import { ConfirmModalComponent } from '../../components/confirm-modal.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ConfirmModalComponent],
  template: `
    <app-toast></app-toast>
    <app-confirm-modal></app-confirm-modal>
    <div class="min-h-screen bg-slate-100 font-sans">
      
      @if (showLayout()) {
        <!-- Top Header -->
        <header class="fixed top-0 w-full bg-slate-900 text-white z-30 px-4 md:px-8 py-3 flex justify-between items-center shadow-md h-16">
           <div class="flex items-center">
               <button (click)="toggleSidebar()" aria-label="Menüyü Aç" class="text-white hover:text-blue-500 transition-colors focus:outline-none p-2 rounded-lg hover:bg-white/10 mr-4">
                   <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
               </button>
              @if(config().logoUrl) {
                  <img [src]="config().logoUrl" alt="Logo" class="h-8 md:h-10 object-contain mr-3">
              } @else {
                  <svg class="h-8 md:h-10 w-auto mr-3 text-blue-500 drop-shadow-md" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 5L15 85H30L50 40L70 85H85L50 5Z" fill="currentColor"/>
                      <path d="M35 70H65V85H35V70Z" fill="white"/>
                      <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="2" stroke-dasharray="10 4" opacity="0.3"/>
                  </svg>
              }
              <span class="font-serif font-bold text-lg md:text-xl tracking-wider">ALPERLER AUTO <span class="text-blue-500 text-sm align-top ml-1 drop-shadow-md">Admin</span></span>
           </div>
        </header>

        <!-- Left Overlay Menu Overlay -->
        @if (isSidebarOpen()) {
          <div (click)="closeSidebar()" class="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-fade-in"></div>
        }

        <!-- Left Sidebar / Drawer -->
        <aside [class]="isSidebarOpen() ? 'translate-x-0' : '-translate-x-full'" class="w-72 bg-slate-900 text-white flex flex-col fixed left-0 top-0 h-full z-50 shadow-2xl transition-transform duration-300 ease-in-out">
          <div class="p-5 border-b border-white/10 flex items-center justify-between">
             <div class="flex items-center gap-3">
                 <div class="w-10 h-10 rounded-full border border-slate-600 bg-slate-800 overflow-hidden flex items-center justify-center relative">
                     @if(config().adminProfileUrl) {
                         <img [src]="config().adminProfileUrl" alt="Admin" class="w-full h-full object-cover">
                     } @else {
                         <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                     }
                 </div>
                 <div>
                     <div class="font-bold text-sm text-white">Yönetici</div>
                     <div class="text-[10px] text-slate-400">Hoş Geldiniz</div>
                 </div>
             </div>
             
             <button (click)="closeSidebar()" aria-label="Admin menüsünü kapat" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          </div>
          
          <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
             <a (click)="closeSidebar()" routerLink="/admin/dashboard" routerLinkActive="bg-blue-500 text-slate-900 font-bold shadow-lg" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all mb-4">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Kontrol Paneli
             </a>
             
             <div class="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Talepler & İşlemler</div>
             <a (click)="closeSidebar()" routerLink="/admin/reservations" [queryParams]="{type: 'RENTAL'}" class="flex items-center px-4 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all pl-8">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                Araç Kiralama
             </a>
             <a (click)="closeSidebar()" routerLink="/admin/reservations" [queryParams]="{type: 'TOUR'}" class="flex items-center px-4 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all pl-8">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Tur Talepleri
             </a>
             <a (click)="closeSidebar()" routerLink="/admin/reservations" [queryParams]="{type: 'SALE_INQUIRY'}" class="flex items-center px-4 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all pl-8 mb-4">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Satın Alma Talepleri
             </a>
  
             <div class="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Veritabanı Yönetimi</div>
             <a (click)="closeSidebar()" routerLink="/admin/cars" [queryParams]="{tab: 'RENTAL'}" class="flex items-center px-4 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all pl-8">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                Kiralık Araçlar
             </a>
             <a (click)="closeSidebar()" routerLink="/admin/cars" [queryParams]="{tab: 'SALES'}" class="flex items-center px-4 py-2.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all pl-8 mb-4">
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Satılık Araçlar
             </a>
  
             <div class="px-4 py-2 mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Diğer Servisler</div>
             <a (click)="closeSidebar()" routerLink="/admin/tours" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Turlar
             </a>
             <a (click)="closeSidebar()" routerLink="/track-car" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l6-3 5.447 2.724A1 1 0 0121 7.618v10.764a1 1 0 01-1.447.894L15 17l-6 3z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7v13" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 4v13" /></svg>
                Canlı Araç Takip
             </a>
             <a (click)="closeSidebar()" routerLink="/admin/blog" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Blog Yazıları
             </a>
             
             <a (click)="closeSidebar()" routerLink="/admin/partner-requests" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                Başvurular
             </a>
  
             <a (click)="closeSidebar()" routerLink="/admin/feedback" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                Geri Bildirimler
             </a>
             
             <a (click)="closeSidebar()" routerLink="/admin/subscribers" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
                Bülten Aboneleri
             </a>
             
             <a (click)="closeSidebar()" routerLink="/admin/settings" class="flex items-center px-4 py-3 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all mt-4 border-t border-white/10 pt-6">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Web Site Ayarları
             </a>
          </nav>
  
          <div class="p-4 border-t border-white/10 space-y-2 mt-auto">
             <a routerLink="/" class="flex items-center px-4 py-3 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Siteye Dön
             </a>
             <button (click)="logout()" class="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all font-bold">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                Çıkış Yap
             </button>
          </div>
        </aside>
      }

      @if (!showLayout()) {
        <nav class="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur" aria-label="Admin sayfa gezinmesi">
          <button type="button" (click)="goBack()" aria-label="Önceki admin sayfasına dön" class="flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">← <span>Geri</span></button>
          <a routerLink="/admin/dashboard" aria-label="Admin kontrol paneline git" class="flex min-h-10 items-center rounded-xl bg-slate-950 px-3 text-sm font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Kontrol Paneli</a>
          <span class="ml-auto max-w-[42vw] truncate text-xs font-bold text-slate-500">{{ adminPageTitle() }}</span>
        </nav>
      }

      <!-- Main Content -->
      <main class="w-full min-h-screen bg-slate-50" [class.pt-16]="showLayout()" [class.pt-14]="!showLayout()">
         <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  carService = inject(CarService);
  router = inject(Router);
  location = inject(Location);
  
  config = this.carService.getConfig();
  isSidebarOpen = signal(false);
  showLayout = signal(true);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Only show top header/sidebar toggle if we are exactly on the dashboard root.
      // Other admin pages should look like fullscreen standalone windows.
      this.showLayout.set(this.location.path() === '/admin/dashboard' || this.location.path() === '/admin');
    });
    
    // Initial check
    this.showLayout.set(this.location.path() === '/admin/dashboard' || this.location.path() === '/admin');
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigate(['/admin/dashboard']);
  }

  adminPageTitle(): string {
    const path = this.location.path().split('?')[0];
    const labels: Record<string,string> = { homepage: 'Ana Sayfa Vitrini', campaigns: 'Kampanyalar', media: 'Fotoğraf & Video', 'catalog-editor': 'Katalog Editörü', reservations: 'Rezervasyonlar', 'partner-requests': 'Araç Başvuruları', 'branch-partner-requests': 'Şube Başvuruları', feedback: 'Mesaj Kutusu', subscribers: 'Bülten Merkezi', team: 'Ekip & Yetkiler', assignments: 'Görev Merkezi', branches: 'Şubeler', whatsapp: 'WhatsApp Ayarları', 'system-health': 'Sistem Sağlığı', audit: 'İşlem Geçmişi', analytics: 'Ziyaretçi Analitiği', settings: 'Site Ayarları', blog: 'Blog' };
    const segment = path.replace(/^\/admin\/?/, '').split('/')[0] || 'dashboard';
    return labels[segment] || 'Admin';
  }

  logout() {
    this.authService.logout();
  }
}
