import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VisitorAnalyticsService } from '../services/visitor-analytics.service';

@Component({
  selector: 'app-analytics-consent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (analytics.consent() === 'unknown') {
      <section class="fixed inset-x-0 bottom-0 z-[120] p-3 sm:p-4" aria-label="Çerez ve analitik tercihleri">
        <div class="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="max-w-3xl">
              <p class="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">KVKK ve Çerez Tercihleri</p>
              <h2 class="mt-1 text-lg font-black text-slate-950">Deneyimi ve hataları geliştirmek için analitik kullanabiliriz</h2>
              <p class="mt-2 text-sm leading-6 text-slate-600">Kabul ederseniz sayfa ziyaretleri, tıklamalar, kaydırma derinliği, cihaz/tarayıcı bilgisi, yaklaşık ağ konumu, formun hangi aşamasında kalındığı ve teknik hatalar ölçülür. Formlara yazdığınız metinler, şifreler ve kart bilgileri analitik kaydına alınmaz.</p>
              @if (details()) {
                <div class="mt-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                  <strong class="text-slate-900">Zorunlu işlemler:</strong> Site güvenliği, oturum, rezervasyon ve talep işlemleri hizmetin çalışması için gereken ayrı kayıtları kullanabilir.
                  <br><strong class="text-slate-900">Analitik:</strong> Yalnız “Analitiği kabul et” seçeneğiyle etkinleşir. Tercihinizi daha sonra gizlilik/çerez ayarından değiştirebilirsiniz.
                </div>
              }
            </div>
            <div class="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-[430px]">
              <button type="button" (click)="analytics.reject()" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sadece gerekli</button>
              <button type="button" (click)="details.set(!details())" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Tercihler</button>
              <button type="button" (click)="analytics.accept()" class="min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Analitiği kabul et</button>
            </div>
          </div>
          <div class="mt-3 text-xs text-slate-500"><a routerLink="/legal" class="font-bold text-blue-700 underline underline-offset-2">KVKK, gizlilik ve çerez metnini incele</a></div>
        </div>
      </section>
    }
  `,
})
export class AnalyticsConsentComponent {
  readonly analytics = inject(VisitorAnalyticsService);
  readonly details = signal(false);
}
