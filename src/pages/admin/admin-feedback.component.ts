
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CarService } from '../../services/car.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-4">
            <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            </button>
            <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Geri Bildirimler</h2>
        </div>
        <div class="flex gap-2">
            <button (click)="filter.set('ALL')" [class.bg-slate-800]="filter() === 'ALL'" [class.text-white]="filter() === 'ALL'" class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-100 transition-colors">Tümü</button>
            <button (click)="filter.set('NEW')" [class.bg-blue-600]="filter() === 'NEW'" [class.text-white]="filter() === 'NEW'" class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-blue-50 transition-colors">Yeni</button>
            <button (click)="filter.set('REVIEWED')" [class.bg-green-600]="filter() === 'REVIEWED'" [class.text-white]="filter() === 'REVIEWED'" class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-green-50 transition-colors">İncelendi</button>
            <button (click)="filter.set('ARCHIVED')" [class.bg-gray-600]="filter() === 'ARCHIVED'" [class.text-white]="filter() === 'ARCHIVED'" class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-gray-50 transition-colors">Arşiv</button>
        </div>
    </div>
    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8 space-y-6">

      <!-- AI Analysis Summary -->
      <div class="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-lg font-bold text-indigo-900 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Yapay Zeka Analizi
                </h3>
                <p class="text-sm text-indigo-600 mt-1">Tüm geri bildirimlerin otomatik özeti.</p>
            </div>
            <button (click)="analyze()" [disabled]="isAnalyzing()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                @if (isAnalyzing()) {
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analiz Ediliyor...
                } @else {
                    Analiz Et
                }
            </button>
        </div>
        
        @if (analysisResult()) {
            <div class="bg-white/80 p-4 rounded-lg text-slate-700 text-sm whitespace-pre-line border border-indigo-100">
                {{ analysisResult() }}
            </div>
        }
      </div>

      <!-- Feedback List -->
      <div class="grid gap-4">
        @for (item of filteredFeedbacks(); track item.id) {
            <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <span [class]="getCategoryClass(item.category)" class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {{ getCategoryLabel(item.category) }}
                        </span>
                        <div class="flex text-blue-400 text-sm">
                            @for (star of [1,2,3,4,5]; track star) {
                                <span>{{ star <= item.rating ? '★' : '☆' }}</span>
                            }
                        </div>
                        <span class="text-xs text-slate-400">{{ item.date | date:'medium' }}</span>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <select [ngModel]="item.status" (ngModelChange)="updateStatus(item.id, $event)" class="text-xs border-slate-200 rounded-lg py-1 px-2 focus:ring-blue-500">
                            <option value="NEW">Yeni</option>
                            <option value="REVIEWED">İncelendi</option>
                            <option value="ARCHIVED">Arşiv</option>
                        </select>
                        <button (click)="deleteFeedback(item.id)" class="text-red-400 hover:text-red-600 p-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>

                <p class="text-slate-700 leading-relaxed">{{ item.message }}</p>
            </div>
        } @empty {
            <div class="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p class="text-slate-500">Bu kategoride geri bildirim bulunmuyor.</p>
            </div>
        }
      </div>
    </div>
  `
})
export class AdminFeedbackComponent {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  router = inject(Router);
  
  filter = signal<'ALL' | 'NEW' | 'REVIEWED' | 'ARCHIVED'>('ALL');
  isAnalyzing = signal(false);
  analysisResult = signal<string | null>(null);

  feedbacks = this.carService.getFeedbacks();

  goBack() {
      this.router.navigate(['/admin/dashboard']);
  }

  filteredFeedbacks = computed(() => {
      const all = this.feedbacks();
      const f = this.filter();
      if (f === 'ALL') return all;
      return all.filter(x => x.status === f);
  });

  getCategoryLabel(cat: string) {
      const labels: any = { 'BUG': 'Hata', 'FEATURE': 'Özellik', 'GENERAL': 'Genel', 'CONTENT': 'İçerik', 'OTHER': 'Diğer' };
      return labels[cat] || cat;
  }

  getCategoryClass(cat: string) {
      const classes: any = {
          'BUG': 'bg-red-100 text-red-700',
          'FEATURE': 'bg-purple-100 text-purple-700',
          'GENERAL': 'bg-blue-100 text-blue-700',
          'CONTENT': 'bg-orange-100 text-orange-700',
          'OTHER': 'bg-gray-100 text-gray-700'
      };
      return classes[cat] || 'bg-gray-100 text-gray-700';
  }

  updateStatus(id: number, status: any) {
      this.carService.updateFeedbackStatus(id, status);
  }

  async deleteFeedback(id: number) {
      const confirmed = await this.confirmService.confirm({
          title: 'Geri Bildirimi Sil',
          message: 'Bu geri bildirimi silmek istediğinize emin misiniz?'
      });
      if(confirmed) {
          this.carService.deleteFeedback(id);
          this.toastService.show('Geri bildirim silindi.', 'info');
      }
  }

  async analyze() {
      this.isAnalyzing.set(true);
      const result = await this.carService.analyzeFeedback();
      this.analysisResult.set(result);
      this.isAnalyzing.set(false);
  }
}
