
import { Component, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { RouterLink } from '@angular/router';
import { TurkishCurrencyPipe } from '../../pipes/turkish-currency.pipe';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TurkishCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Yönetim Paneli</h1>
           <div class="flex items-center mt-2 text-[10px] font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full w-fit">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Sistem Aktif
           </div>
        </div>
        <div class="text-sm text-slate-500 font-medium">Hoşgeldin, <span class="text-slate-900 font-bold">Admin</span></div>
    </div>
    
    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">
    
    <!-- Top Statistics Area -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
        <div class="bg-blue-500 p-6 rounded-xl shadow-md flex flex-col justify-between text-slate-900">
             <div class="flex justify-between items-center mb-2">
                 <div class="font-bold text-xs opacity-75 uppercase">Toplam Ciro</div>
                 <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <div class="font-bold text-3xl">{{ estimatedRevenue() | turkishCurrency }}</div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div class="text-slate-500 text-xs font-bold uppercase mb-2">Toplam Rezervasyon</div>
           <div class="text-4xl font-bold text-slate-900">{{ reservationsCount() }}</div>
           <div class="mt-2 text-xs text-green-600 font-bold">▲ Geçici Analiz Aktif</div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div class="text-slate-500 text-xs font-bold uppercase mb-2">Bekleyen Onay</div>
           <div class="text-4xl font-bold text-blue-500">{{ pendingCount() }}</div>
           <div class="mt-2 text-xs text-slate-400">Aksiyon bekleniyor</div>
        </div>

        <div class="bg-indigo-600 p-6 rounded-xl shadow-md flex flex-col justify-between text-white border border-indigo-700">
             <div class="flex justify-between items-center mb-2">
                 <div class="font-bold text-xs opacity-75 uppercase">Toplam Ziyaretçi</div>
                 <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
             </div>
             <div class="font-bold text-3xl">{{ visitCount() }}</div>
        </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
       <!-- Detailed Stats Column -->
       <div class="lg:col-span-2 grid grid-cols-1 gap-6">
           <!-- You can add recent activity lists or other full width panel here -->
           <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 class="font-bold text-slate-700 mb-4">Son İşlemler</h3>
               <div class="text-sm text-slate-500">Sistem veritabanından alınan canlı işlem logları burada görünür.</div>
           </div>
       </div>

       <!-- Weekly Revenue Chart (CSS) -->
       <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
           <h3 class="font-bold text-slate-700 mb-4">Haftalık Performans</h3>
           <div class="flex-1 flex items-end justify-between space-x-2 h-48 mt-4">
               <!-- Simulated Bars -->
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[40%] hover:bg-blue-200 transition-all">
                  <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">40%</div>
                  <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Pzt</div>
               </div>
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[60%] hover:bg-blue-200 transition-all">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">60%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Sal</div>
               </div>
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[30%] hover:bg-blue-200 transition-all">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">30%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Çar</div>
               </div>
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[80%] hover:bg-blue-200 transition-all">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">80%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Per</div>
               </div>
               <div class="w-full bg-blue-500 rounded-t-lg relative group h-[95%] shadow-lg">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold">95%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-900 font-bold">Cum</div>
               </div>
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[70%] hover:bg-blue-200 transition-all">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">70%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Cmt</div>
               </div>
               <div class="w-full bg-slate-100 rounded-t-lg relative group h-[50%] hover:bg-blue-200 transition-all">
                   <div class="absolute -top-6 w-full text-center text-xs font-bold opacity-0 group-hover:opacity-100">50%</div>
                   <div class="absolute -bottom-6 w-full text-center text-xs text-slate-400">Paz</div>
               </div>
           </div>
           <div class="mt-8 text-center text-xs text-slate-400">Son 7 günlük rezervasyon yoğunluğu</div>
       </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
       <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 class="font-bold text-slate-900">Son Rezervasyon Hareketleri</h3>
          <a routerLink="/admin/reservations" class="text-xs font-bold text-blue-600 hover:underline">Tümünü Gör</a>
       </div>
       <div class="overflow-x-auto">
           <table class="w-full text-left whitespace-nowrap">
              <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
                 <tr>
                    <th class="px-6 py-3">Müşteri</th>
                    <th class="px-6 py-3">Araç / Hizmet</th>
                    <th class="px-6 py-3">Tarih</th>
                    <th class="px-6 py-3">Durum</th>
                    <th class="px-6 py-3">Tutar</th>
                 </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                 @for (res of recentReservations(); track res.id) {
                    <tr class="hover:bg-slate-50 transition-colors">
                       <td class="px-6 py-4 font-bold text-slate-900">{{ res.customerName }}</td>
                       <td class="px-6 py-4">
                           <div class="font-medium">{{ res.itemName }}</div>
                           <div class="text-xs text-slate-400">{{ res.type }}</div>
                       </td>
                       <td class="px-6 py-4 text-slate-500 text-sm">{{ res.dateCreated | date:'dd.MM.yyyy' }}</td>
                       <td class="px-6 py-4">
                          <span [class]="res.status === 'APPROVED' ? 'bg-green-100 text-green-800' : (res.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')" class="px-2 py-1 rounded-full text-xs font-bold">
                             {{ res.status === 'APPROVED' ? 'Onaylandı' : (res.status === 'REJECTED' ? 'Reddedildi' : 'Bekliyor') }}
                          </span>
                       </td>
                       <td class="px-6 py-4 font-bold">{{ res.totalPrice || res.basePrice | turkishCurrency }}</td>
                    </tr>
                 } @empty {
                     <tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">Henüz kayıt bulunmuyor.</td></tr>
                 }
              </tbody>
           </table>
       </div>
    </div>

    <!-- Notifications Log -->
    <div class="grid grid-cols-1 gap-8">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 class="font-bold text-slate-900 mb-4 flex justify-between items-center">
                <span>Bildirim Geçmişi</span>
                <button (click)="clearAllNotifications()" class="text-xs text-red-500 hover:text-red-700 font-bold">Tümünü Temizle</button>
            </h3>
            <div class="max-h-96 overflow-y-auto">
                <ul class="space-y-4">
                    @for(notif of notifications(); track notif.id) {
                        <li class="bg-slate-50 p-3 rounded border border-slate-100 text-sm relative group">
                            <button (click)="deleteNotification(notif.id)" class="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                            <div class="flex justify-between items-start mb-1 pr-6">
                                <span class="font-bold text-slate-700">{{ notif.to }}</span>
                                <span class="text-xs text-slate-400">{{ notif.date | date:'short' }}</span>
                            </div>
                            <p class="text-slate-600 text-xs">{{ notif.message }}</p>
                        </li>
                    } @empty {
                        <li class="py-4 text-center text-slate-400 text-sm">Gönderilen bildirim yok.</li>
                    }
                </ul>
            </div>
        </div>
    </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  carService = inject(CarService);

  async ngOnInit() {
    try {
      await this.carService.ensureVehicleCloudInventory();
      await this.carService.ensureContentCloud();
    } catch (error) {
      console.error("Admin cloud bootstrap failed", error);
      this.toastService.show("Bulut verileri hazırlanamadı. Firebase yetkilerini kontrol edin.", "error");
    }
  }
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  
  reservations = this.carService.getReservations();
  cars = this.carService.getCars();
  saleCars = this.carService.getSaleCars();
  visitCount = this.carService.getVisitCount();
  notifications = this.carService.getNotifications();

  reservationsCount = computed(() => this.reservations().length);
  
  pendingCount = computed(() => this.reservations().filter(r => r.status === 'PENDING').length);
  
  estimatedRevenue = computed(() => {
     return this.reservations()
       .filter(r => r.status !== 'REJECTED')
       .reduce((acc, curr) => acc + (curr.totalPrice || curr.basePrice || 0), 0);
  });

  totalCars = computed(() => this.cars().length + this.saleCars().length);

  recentReservations = computed(() => this.reservations().slice(0, 5));

  async deleteNotification(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Bildirimi Sil',
          message: 'Bu bildirimi silmek istediğinize emin misiniz?'
      });
      if(confirmed) {
          this.carService.deleteNotification(id);
          this.toastService.show('Bildirim silindi.', 'info');
      }
  }

  async clearAllNotifications() {
      const confirmed = await this.confirmService.confirm({
          title: 'Tümünü Temizle',
          message: 'Tüm bildirim geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
      });
      if(confirmed) {
          this.carService.clearAllNotifications();
          this.toastService.show('Tüm bildirimler temizlendi.', 'success');
      }
  }
}
