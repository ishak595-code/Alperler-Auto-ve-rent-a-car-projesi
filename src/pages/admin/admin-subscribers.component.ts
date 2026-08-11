import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Bülten Aboneleri</h1>
            <p class="text-sm text-slate-500 mt-1">Sitenizden haber almak isteyen e-posta abonelerini yönetin ve toplu mesajlar gönderin.</p>
        </div>
    </div>

    <div class="w-full bg-slate-50 min-h-[calc(100vh-10rem)] p-4 md:p-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                <div class="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                   <h3 class="font-bold text-xl text-slate-800 flex items-center gap-2">
                       <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                       Tüm Aboneler
                   </h3>
                   <span class="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm border border-blue-200">{{ subscribers().length }} Kayıt</span>
                </div>
                
                <div class="border-t border-slate-200 divide-y divide-slate-100 min-h-[400px]">
                    @for(sub of subscribers(); track sub) {
                        <div class="flex flex-col group">
                            <!-- Row Header (Clickable) -->
                            <div class="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" (click)="toggleAccordion(sub)">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        {{ sub.charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{{ sub }}</div>
                                </div>
                                <div class="flex items-center gap-2">
                                    @if (selectedSubscriber() === sub) {
                                      <span class="text-xs font-bold text-blue-500 mr-2 uppercase tracking-wide hidden sm:block">Seçili</span>
                                    }
                                    <mat-icon [class.rotate-180]="expandedSub() === sub" class="text-slate-400 transition-transform">expand_more</mat-icon>
                                </div>
                            </div>
                            
                            <!-- Accordion Content -->
                            @if (expandedSub() === sub) {
                                <div class="p-6 bg-slate-50 border-t border-b border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                    <div class="flex flex-col gap-4">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h4 class="font-bold text-slate-800 text-sm mb-1">Müşteri Email Bilgisi</h4>
                                                <div class="text-xs text-slate-500 font-mono">{{ sub }}</div>
                                            </div>
                                            <button (click)="deleteSubscriber(sub, $event)" class="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold text-xs shadow-sm flex items-center gap-2 transition-colors">
                                                <mat-icon class="w-4 h-4 text-sm">delete</mat-icon> Abonelikten Çıkar
                                            </button>
                                        </div>
                                        
                                        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-2">
                                            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bu aboneye özel mesaj gönder</p>
                                            <div class="flex gap-2">
                                                <textarea [(ngModel)]="localMessages[sub]" rows="2" class="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-slate-400" placeholder="Sayın ilgili, sizin için tasarladığımız kampanya..."></textarea>
                                                <button (click)="sendIndividualMessage(sub)" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-lg transition-colors flex items-center shadow">
                                                    <mat-icon>send</mat-icon>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    } @empty {
                        <div class="p-12 text-center text-slate-400">
                            <mat-icon class="text-5xl text-slate-300 mb-4 block mx-auto">group_off</mat-icon>
                            <p class="font-bold">Henüz bülten abonesi bulunmuyor.</p>
                        </div>
                    }
                </div>
            </div>
        </div>

        <div>
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                    Toplu Gönderim
                </h3>
                <div class="text-sm text-slate-500 mb-4">Seçili abonelere veya tüm listeye anında e-posta / bildirim kampanyası gönderin.</div>
                
                <div class="space-y-4">
                    <div>
                         <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Gönderilecek Kişiler</label>
                         <div class="p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 font-medium">
                              {{ selectedSubscriber() ? selectedSubscriber() : 'Tüm Aboneler (' + subscribers().length + ' Kişi)' }}
                         </div>
                         @if(selectedSubscriber()) {
                             <button (click)="selectedSubscriber.set(null)" class="text-xs text-red-500 mt-1 font-bold hover:underline">Seçimi İptal Et (Tümüne Gönder)</button>
                         }
                    </div>
                
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Mesaj İçeriği</label>
                        <textarea [(ngModel)]="campaignMessage" rows="5" class="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-sm" placeholder="Sayın üyelerimiz, yeni kampanyamız..."></textarea>
                    </div>
                    
                    <button (click)="sendCampaign()" class="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-blue-500 hover:text-slate-900 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        Mesajı Gönder
                    </button>
                </div>
            </div>
        </div>
    </div>
    </div>
  `
})
export class AdminSubscribersComponent {
  carService = inject(CarService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);

  subscribers = this.carService.getSubscribers();
  selectedSubscriber = signal<string | null>(null);
  expandedSub = signal<string | null>(null);
  campaignMessage = '';
  
  localMessages: Record<string, string> = {};

  toggleAccordion(email: string) {
      if (this.expandedSub() === email) {
          this.expandedSub.set(null);
          this.selectedSubscriber.set(null);
      } else {
          this.expandedSub.set(email);
          this.selectedSubscriber.set(email);
      }
  }

  // Old openDetail can be safely removed or kept for legacy
  openDetail(email: string) {
      this.toggleAccordion(email);
  }

  async deleteSubscriber(email: string, event?: Event) {
    if(event) event.stopPropagation();

    const confirmed = await this.confirmService.confirm({
      title: 'Aboneyi Sil',
      message: `"${email}" adresini bülten listesinden çıkarmak istediğinize emin misiniz?`
    });
    
    if (confirmed) {
        this.carService.removeSubscriber(email);
        this.toastService.show('Abone başarıyla listeden çıkarıldı.', 'success');
        if (this.selectedSubscriber() === email) {
            this.selectedSubscriber.set(null);
            this.expandedSub.set(null);
        }
    }
  }

  async sendIndividualMessage(email: string) {
      const msg = this.localMessages[email];
      if (!msg || msg.trim().length === 0) {
          this.toastService.show('Lütfen mesajınızı yazın.', 'error');
          return;
      }
      
      this.carService.sendNotification(email, `[ÖZEL MESAJ] ${msg}`);
      this.toastService.show(`Özel mesajınız ${email} adresine gönderildi.`, 'success');
      this.localMessages[email] = ''; // Clear after sending
  }

  async sendCampaign() {
      if (!this.campaignMessage) {
          this.toastService.show('Lütfen gönderilecek mesajı yazın.', 'error');
          return;
      }
      
      const subs = this.subscribers();
      if (subs.length === 0) {
          this.toastService.show('Gönderilecek abone bulunmuyor.', 'error');
          return;
      }

      const confirmed = await this.confirmService.confirm({
          title: 'Mesajı Gönder',
          message: this.selectedSubscriber() 
             ? `Sadece seçili aboneye (${this.selectedSubscriber()}) mesaj gönderilecektir. Onaylıyor musunuz?`
             : `Bu mesaj toplam ${subs.length} aboneye gönderilecektir. Onaylıyor musunuz?`
      });

      if (confirmed) {
          // Simulate sending
          let index = 0;
          const targetList = this.selectedSubscriber() ? [this.selectedSubscriber()!] : subs;
          
          targetList.forEach(email => {
              setTimeout(() => {
                  this.carService.sendNotification(email, `[BÜLTEN] ${this.campaignMessage}`);
              }, index * 200);
              index++;
          });
          
          setTimeout(() => {
              this.toastService.show('Mesaj(lar) başarıyla gönderildi ve bildirim geçmişine işlendi.', 'success');
              this.campaignMessage = '';
              // this.selectedSubscriber.set(null); // Keep selected or not.
          }, index * 200 + 100);
      }
  }
}
