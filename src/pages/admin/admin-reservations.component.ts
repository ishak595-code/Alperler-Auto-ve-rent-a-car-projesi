import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { TurkishCurrencyPipe } from '../../pipes/turkish-currency.pipe';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, TurkishCurrencyPipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-4">
            <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ typeFilter() === 'RENTAL' ? 'Araç Kiralama Talepleri' : typeFilter() === 'TOUR' ? 'Tur Talepleri' : typeFilter() === 'SALE_INQUIRY' ? 'Satın Alma Talepleri' : 'Rezervasyon Yönetimi' }}</h1>
        </div>
        
        <div class="bg-slate-100 p-1 rounded-lg flex flex-wrap">
            <button (click)="filter.set('ALL')" [class]="filter() === 'ALL' ? 'bg-white text-slate-900 shadow-sm rounded-md' : 'text-slate-500 hover:text-slate-700'" class="px-4 py-2 text-sm font-bold transition-all">Tümü</button>
            <button (click)="filter.set('PENDING')" [class]="filter() === 'PENDING' ? 'bg-white text-blue-600 shadow-sm rounded-md' : 'text-slate-500 hover:text-slate-700'" class="px-4 py-2 text-sm font-bold transition-all">Bekleyenler</button>
            <button (click)="filter.set('APPROVED')" [class]="filter() === 'APPROVED' ? 'bg-white text-green-600 shadow-sm rounded-md' : 'text-slate-500 hover:text-slate-700'" class="px-4 py-2 text-sm font-bold transition-all">Onaylananlar</button>
        </div>
    </div>
    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">
    
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 animate-fade-in relative z-20">
       @for (res of filteredReservations(); track res.id) {
           <div class="flex flex-col">
               <!-- Accordion Header -->
               <div class="flex items-center justify-between p-4 md:p-6 hover:bg-slate-50 cursor-pointer transition-colors group" (click)="toggleDetail(res.id!)">
                   <div class="flex items-center gap-4">
                       <div class="hidden md:flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                           <mat-icon>receipt_long</mat-icon>
                       </div>
                       <div>
                           <div class="flex items-center gap-2 mb-1">
                               <div class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm md:text-base">{{ res.customerName }}</div>
                               <span [class]="res.status === 'APPROVED' ? 'bg-green-100 text-green-800' : (res.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')" class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                   {{ res.status === 'APPROVED' ? 'Onaylandı' : (res.status === 'REJECTED' ? 'Reddedildi' : 'Bekliyor') }}
                               </span>
                           </div>
                           <div class="text-xs text-slate-500 font-medium">[{{ res.type === 'RENTAL' ? 'Araç Kiralama' : res.type === 'TOUR' ? 'Tur' : 'Araç Satın Alma' }}] <span class="text-slate-700 font-bold ml-1">{{ res.itemName }}</span></div>
                       </div>
                   </div>
                   <div class="flex flex-col items-end gap-1">
                       <div class="font-black text-slate-900">{{ res.totalPrice || res.basePrice | turkishCurrency }}</div>
                       <mat-icon [class.rotate-180]="expandedId() === res.id" class="text-slate-400 transition-transform">expand_more</mat-icon>
                   </div>
               </div>
               
               <!-- Accordion Body -->
               @if (expandedId() === res.id) {
                   <div class="p-4 md:p-6 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <!-- Müşteri -->
                           <div class="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                               <h4 class="font-bold text-xs uppercase text-slate-400 tracking-wider">Müşteri İletişim</h4>
                               <div class="flex flex-col gap-2">
                                   <div class="flex justify-between items-center text-sm">
                                       <span class="text-slate-500">Telefon:</span>
                                       <a [href]="'tel:' + res.customerPhone" class="font-bold text-blue-600 hover:underline">{{ res.customerPhone }}</a>
                                   </div>
                                   <div class="flex justify-between items-center text-sm">
                                       <span class="text-slate-500">ID:</span>
                                       <span class="font-mono text-xs text-slate-400">{{ res.id }}</span>
                                   </div>
                               </div>
                           </div>
                           
                           <!-- Detaylar -->
                           <div class="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                               <h4 class="font-bold text-xs uppercase text-slate-400 tracking-wider">Talep Bilgileri</h4>
                               @if(res.type === 'RENTAL') {
                                   <div class="grid grid-cols-2 gap-x-2 gap-y-3 text-sm">
                                       <div><span class="text-slate-500 text-xs block">Alış</span><span class="font-medium text-slate-900">{{ res.startDate }}</span></div>
                                       <div><span class="text-slate-500 text-xs block">Dönüş</span><span class="font-medium text-slate-900">{{ res.endDate }}</span></div>
                                       @if (res.withDriver) {
                                           <div class="col-span-2"><span class="text-slate-500 text-xs block">Şoför</span><span class="font-bold text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded inline-block mt-1">Şoförlü Araç Talebi</span></div>
                                       }
                                       <div class="col-span-2 mt-1"><span class="text-slate-500 text-xs block">Süre</span><span class="font-bold text-slate-800">{{ res.days }} Gün Kiralama</span></div>
                                   </div>
                               } @else {
                                   <div class="text-sm font-medium text-slate-900">{{ res.itemName }} için {{ res.type === 'TOUR' ? 'gezi / tur' : 'satın alma' }} talebi gönderildi.</div>
                               }
                           </div>

                           <!-- Notlar & Tutar -->
                           <div class="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                               <div>
                                   <h4 class="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Müşteri Notu</h4>
                                   <p class="text-sm italic text-slate-600 border-l-2 border-blue-500 pl-2">{{ res.notes || 'Not bırakılmadı.' }}</p>
                               </div>
                               <div class="flex justify-between items-end border-t border-slate-50 pt-2 mt-2">
                                   <span class="font-bold text-xs text-slate-400 uppercase">Tutar</span>
                                   <span class="font-black text-lg text-slate-900">{{ res.totalPrice || res.basePrice | turkishCurrency }}</span>
                               </div>
                           </div>
                       </div>
                       
                       <!-- Eylem Butonları -->
                       <div class="mt-6 flex flex-wrap gap-3">
                           @if (res.status === 'PENDING') {
                               <button (click)="updateStatus(res.id!, 'APPROVED', $event)" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
                                   <mat-icon class="text-sm w-4 h-4">check</mat-icon> Onayla
                               </button>
                               <button (click)="updateStatus(res.id!, 'REJECTED', $event)" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
                                   <mat-icon class="text-sm w-4 h-4">close</mat-icon> Reddet
                               </button>
                               <button (click)="deleteReservation(res.id!, $event)" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded font-bold text-sm transition-colors shadow-sm flex items-center gap-2 ml-auto">
                                   <mat-icon class="text-sm w-4 h-4">delete</mat-icon> Sil
                               </button>
                           } @else {
                               <button (click)="updateStatus(res.id!, 'PENDING', $event)" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded font-bold text-sm transition-colors flex items-center gap-2">
                                   <mat-icon class="text-sm w-4 h-4">undo</mat-icon> Beklemeye Al
                               </button>
                               <button (click)="deleteReservation(res.id!, $event)" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded font-bold text-sm transition-colors shadow-sm flex items-center gap-2 ml-auto">
                                   <mat-icon class="text-sm w-4 h-4">delete</mat-icon> Sil
                               </button>
                           }
                       </div>
                   </div>
               }
           </div>
       } @empty {
           <div class="p-16 text-center text-slate-500">
               <mat-icon class="text-5xl text-slate-300 mb-4 block mx-auto">inbox</mat-icon>
               <p class="font-bold">{{ filter() === 'ALL' ? 'Henüz bir talep bulunmuyor.' : 'Bu kriterde talep yok.' }}</p>
           </div>
       }
    </div>
    </div>
  `
})
export class AdminReservationsComponent implements OnInit {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  reservations = this.carService.getReservations();
  
  filter = signal<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  typeFilter = signal<string | null>(null);
  expandedId = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.typeFilter.set(params['type']);
      } else {
        this.typeFilter.set(null);
      }
    });
  }

  goBack() {
      this.router.navigate(['/admin/dashboard']);
  }

  toggleDetail(id: string) {
      if (this.expandedId() === id) {
          this.expandedId.set(null);
      } else {
          this.expandedId.set(id);
      }
  }

  filteredReservations = computed(() => {
     let current = this.reservations();
     if (this.typeFilter()) {
         current = current.filter(r => r.type === this.typeFilter());
     }
     if(this.filter() === 'ALL') return current;
     return current.filter(r => r.status === this.filter());
  });

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING', event?: Event) {
      if(event) event.stopPropagation();
      
      if (status === 'REJECTED') {
          const confirmed = await this.confirmService.confirm({
              title: 'Rezervasyonu Reddet',
              message: 'Bu rezervasyonu reddetmek istediğinize emin misiniz?'
          });
          if (!confirmed) return;
      }
      
      this.carService.updateReservationStatus(id, status);
      
      if (status === 'APPROVED') {
          this.toastService.show('Talep onaylandı ve bilgilendirilecek.', 'success');
      } else if (status === 'REJECTED') {
          this.toastService.show('Talep reddedildi.', 'info');
      } else {
          this.toastService.show('Talebin durumu BEKLİYOR olarak güncellendi.', 'info');
      }
  }

  async deleteReservation(id: string, event?: Event) {
      if(event) event.stopPropagation();

      const confirmed = await this.confirmService.confirm({
          title: 'Kaydı Sil',
          message: 'Bu kaydı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
      });
      if(confirmed) {
          this.carService.deleteReservation(id);
          this.expandedId.set(null);
          this.toastService.show('Talep başarıyla silindi.', 'info');
      }
  }
}
