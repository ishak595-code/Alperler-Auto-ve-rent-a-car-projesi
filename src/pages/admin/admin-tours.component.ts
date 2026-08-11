
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CarService } from '../../services/car.service';
import { Tour } from '../../models/car.model';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-admin-tours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div class="flex items-center gap-4">
            <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Tur Yönetimi</h1>
        </div>
        <button (click)="openModal()" class="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 hover:text-slate-900 transition-colors shadow-sm flex items-center text-sm">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Yeni Tur Ekle
        </button>
    </div>
    
    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">

    @if (isModalOpen()) {
        <div class="fixed inset-0 bg-white overflow-y-auto w-full h-full min-h-[100dvh] animate-in fade-in duration-300" style="z-index: 99999;">
           <div class="max-w-5xl mx-auto w-full min-h-screen flex flex-col bg-white">
             <!-- Header -->
             <div class="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-20">
                <div class="flex items-center gap-4">
                    <button type="button" (click)="closeModal()" class="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 p-2 md:px-5 md:py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        <span class="hidden md:inline">İptal Edip Geri Dön</span>
                    </button>
                    <h3 class="font-bold text-2xl text-slate-900 tracking-tight">
                        {{ editingTour() ? 'Turu Düzenle' : 'Yeni Tur Ekle' }}
                    </h3>
                </div>
             </div>

             <!-- Form Content -->
             <form (submit)="saveTour($event)" class="p-6 md:p-8">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <!-- Main Content Left -->
                     <div class="space-y-6">
                         <div>
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tur Başlığı</label>
                             <input type="text" [(ngModel)]="formTour.title" name="title" required class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                         </div>
                         
                         <div>
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Açıklama</label>
                             <textarea [(ngModel)]="formTour.description" name="description" rows="5" required class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"></textarea>
                         </div>
                         
                         <div>
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Öne Çıkanlar (Virgülle ayırın)</label>
                             <input type="text" [ngModel]="highlightsString" (ngModelChange)="updateHighlights($event)" name="highlights" placeholder="Örn: Kahvaltı, Ulaşım, Rehberlik" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                         </div>
                     </div>
                     
                     <!-- Sidebar Config Right -->
                     <div class="space-y-6">
                         <div class="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h4 class="font-bold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">Tur Parametreleri</h4>
                             
                             <div class="space-y-4">
                                 <div>
                                     <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tur Kategorisi</label>
                                     <input type="text" [(ngModel)]="formTour.category" name="category" placeholder="Örn: Doğa & Macera" class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                                 </div>
                                 <div class="grid grid-cols-2 gap-4">
                                     <div>
                                         <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tur Süresi</label>
                                         <input type="text" [(ngModel)]="formTour.duration" name="duration" required placeholder="Örn: Tam Gün" class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                                     </div>
                                     <div>
                                         <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fiyat (₺)</label>
                                         <input type="number" [(ngModel)]="formTour.price" name="price" required class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none">
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div class="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h4 class="font-bold text-sm text-slate-800 mb-4 border-b border-slate-200 pb-2">Görsel URL</h4>
                             <input type="text" [(ngModel)]="formTour.image" name="image" required class="w-full p-3 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none mb-4">
                             
                             <!-- Preview -->
                             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Önizleme</label>
                             <div class="w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-200 relative">
                                 @if(formTour.image) {
                                     <img [src]="formTour.image" class="w-full h-full object-cover">
                                 } @else {
                                     <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                         <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                         <span class="text-xs font-medium">Görsel Yok</span>
                                     </div>
                                 }
                             </div>
                         </div>
                     </div>
                 </div>
                 
                 <!-- Footer Actions -->
                 <div class="bg-white/95 backdrop-blur-md px-6 py-4 border-t border-slate-200 flex items-center justify-between sticky bottom-0 z-20">
                     <button type="button" (click)="closeModal()" class="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Vazgeç</button>
                     <button type="submit" class="bg-slate-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                         {{ editingTour() ? 'Turu Güncelle' : 'Kaydet ve Yayımla' }}
                     </button>
                 </div>
             </form>
           </div>
        </div>
    } @else {

    <!-- List View -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        @for (tour of tours(); track tour.id) {
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all flex flex-col">
                <div class="h-48 overflow-hidden relative">
                    <img [src]="tour.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="absolute top-2 right-2 bg-blue-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-sm">
                        {{tour.price}} ₺
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-1">
                    <h3 class="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{{tour.title}}</h3>
                    <p class="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{{tour.description}}</p>
                    <div class="flex justify-between items-center mt-auto pt-4 border-t border-slate-100">
                        <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">{{tour.duration}}</span>
                        <div class="flex gap-2">
                            <button (click)="editTour(tour)" class="text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-md font-bold text-xs transition-colors">Düzenle</button>
                            <button (click)="deleteTour(tour.id)" class="text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-md font-bold text-xs transition-colors">Sil</button>
                        </div>
                    </div>
                </div>
            </div>
        }
    </div>
    }
    </div>
  `
})
export class AdminToursComponent {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  router = inject(Router);
  tours = this.carService.getTours();
  
  isModalOpen = signal(false);
  editingTour = signal<Tour | null>(null);
  
  formTour: Partial<Tour> = {};
  highlightsString = '';

  goBack() {
      this.router.navigate(['/admin/dashboard']);
  }

  openModal() {
      this.isModalOpen.set(true);
      this.editingTour.set(null);
      this.formTour = { image: 'https://picsum.photos/800/600' };
      this.highlightsString = '';
  }

  editTour(tour: Tour) {
      this.isModalOpen.set(true);
      this.editingTour.set(tour);
      this.formTour = { ...tour };
      this.highlightsString = (tour.highlights || []).join(', ');
  }

  closeModal() {
      this.isModalOpen.set(false);
  }

  updateHighlights(value: string) {
      this.highlightsString = value;
      this.formTour.highlights = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  saveTour(e: Event) {
      e.preventDefault();
      if (this.formTour.title && this.formTour.price) {
          this.carService.addTour(this.formTour as Tour);
          this.toastService.show(this.editingTour() ? 'Tur güncellendi.' : 'Yeni tur eklendi.', 'success');
          this.closeModal();
      } else {
          this.toastService.show('Lütfen gerekli alanları doldurun.', 'error');
      }
  }

  async deleteTour(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Turu Sil',
          message: 'Bu turu silmek istediğinize emin misiniz?'
      });
      if(confirmed) {
          this.carService.deleteTour(id);
          this.toastService.show('Tur silindi.', 'info');
      }
  }
}
