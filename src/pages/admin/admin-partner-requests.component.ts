
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-admin-partner-requests',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Araç Kiralama Başvuruları</h1>
        </div>
    </div>
    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">
    
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
       <div class="overflow-x-auto">
           <table class="w-full text-left whitespace-nowrap">
              <thead class="bg-slate-900 text-white text-xs uppercase">
                 <tr>
                    <th class="px-6 py-4">Tarih</th>
                    <th class="px-6 py-4">Ad Soyad</th>
                    <th class="px-6 py-4">İletişim</th>
                    <th class="px-6 py-4">Araç</th>
                    <th class="px-6 py-4">Model/KM</th>
                    <th class="px-6 py-4">Açıklama</th>
                    <th class="px-6 py-4 text-right">İşlemler</th>
                 </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                 @for (req of requests(); track req.id) {
                    <tr class="hover:bg-slate-50 transition-colors">
                       <td class="px-6 py-4 text-sm text-slate-500">{{ req.date | date:'dd.MM.yyyy' }}</td>
                       <td class="px-6 py-4 font-bold text-slate-900">{{ req.name }}</td>
                       <td class="px-6 py-4 text-sm">
                           <div class="font-mono">{{ req.phone }}</div>
                           <div class="text-xs text-slate-400">{{ req.email }}</div>
                       </td>
                       <td class="px-6 py-4 font-bold">{{ req.carBrand }}</td>
                       <td class="px-6 py-4 text-sm">{{ req.modelYear }} / {{ req.km }} KM</td>
                       <td class="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" [title]="req.description">{{ req.description }}</td>
                       <td class="px-6 py-4 text-right">
                          <button (click)="deleteRequest(req.id)" class="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                             Sil
                          </button>
                       </td>
                    </tr>
                 } @empty {
                     <tr><td colspan="7" class="px-6 py-12 text-center text-slate-500">
                        Henüz bir başvuru bulunmuyor.
                     </td></tr>
                 }
              </tbody>
           </table>
       </div>
    </div>
    </div>
  `
})
export class AdminPartnerRequestsComponent {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  router = inject(Router);
  requests = this.carService.getPartnerRequests();

  goBack() {
      this.router.navigate(['/admin/dashboard']);
  }

  async deleteRequest(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Başvuruyu Sil',
          message: 'Bu başvuruyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
      });
      if(confirmed) {
          this.carService.deletePartnerRequest(id);
          this.toastService.show('Başvuru silindi.', 'info');
      }
  }
}
