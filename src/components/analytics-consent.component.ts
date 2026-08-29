import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VisitorAnalyticsService } from '../services/visitor-analytics.service';

@Component({
  selector: 'app-analytics-consent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (analytics.choiceRequired()) {
      <section class="analytics-consent-shell fixed inset-x-0 z-[120] p-3 sm:p-4" aria-label="Çerez, analitik ve pazarlama tercihleri">
        <div class="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-3xl">
              <p class="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Gizlilik ve Çerez Tercihleri</p>
              <h2 class="mt-1 text-lg font-black text-slate-950">İsteğe bağlı ölçüm ve pazarlama teknolojilerini siz seçin</h2>
              <p class="mt-2 text-sm leading-6 text-slate-600">Zorunlu işlemler site güvenliği, oturum ve rezervasyon için çalışır. Analitik ve pazarlama teknolojileri ise yalnız açık tercihinizle etkinleşir. Formlara yazdığınız metinler, şifreler ve kart bilgileri analitik kaydına alınmaz.</p>

              @if (details()) {
                <div class="mt-4 grid gap-3 sm:grid-cols-2" aria-label="İsteğe bağlı çerez tercihleri">
                  <label class="flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input type="checkbox" class="mt-1 h-5 w-5" [checked]="analyticsOn()" (change)="setAnalytics($event)" />
                    <span><strong class="block text-sm text-slate-950">Analitik</strong><span class="mt-1 block text-xs leading-5 text-slate-600">Sayfa ziyaretleri, tıklamalar, cihaz/tarayıcı türü, form aşamaları ve teknik hatalar. Yapılandırılmışsa Google Analytics de yalnız bu izinle yüklenir.</span></span>
                  </label>
                  <label class="flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input type="checkbox" class="mt-1 h-5 w-5" [checked]="marketingOn()" (change)="setMarketing($event)" />
                    <span><strong class="block text-sm text-slate-950">Pazarlama</strong><span class="mt-1 block text-xs leading-5 text-slate-600">Yapılandırılmışsa Google Ads ve Meta Pixel gibi reklam ölçüm teknolojileri. Analitik izninden bağımsızdır ve ayrıca seçilmelidir.</span></span>
                  </label>
                </div>
                <button type="button" (click)="saveDetailedPreferences()" class="mt-3 min-h-12 w-full rounded-xl border border-blue-600 bg-blue-50 px-4 text-sm font-black text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:w-auto">Seçimlerimi kaydet</button>
              }
            </div>

            <div class="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-[460px]">
              <button type="button" (click)="analytics.reject()" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sadece gerekli</button>
              <button type="button" (click)="acceptAnalyticsOnly()" class="min-h-12 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Yalnız analitik</button>
              <button type="button" (click)="details.set(!details())" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Tercihleri düzenle</button>
              <button type="button" (click)="analytics.acceptAllOptional()" class="min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Tüm isteğe bağlıları kabul et</button>
            </div>
          </div>
          <div class="mt-3 text-xs text-slate-500"><a routerLink="/legal" [queryParams]="{type:'cookies'}" class="font-bold text-blue-700 underline underline-offset-2">KVKK, gizlilik ve çerez metnini incele</a></div>
        </div>
      </section>
    }
  `,
  styles: [`
    .analytics-consent-shell{bottom:0;max-height:100dvh;overflow-y:auto;overscroll-behavior:contain}
    @media (max-width:639px) and (pointer:coarse), (max-width:950px) and (max-height:500px) and (pointer:coarse){
      .analytics-consent-shell{bottom:calc(max(.42rem,env(safe-area-inset-bottom)) + 76px);max-height:calc(100dvh - max(.42rem,env(safe-area-inset-bottom)) - 82px)}
    }
    @media (display-mode:standalone) and (pointer:coarse), (display-mode:fullscreen) and (pointer:coarse){
      .analytics-consent-shell{bottom:calc(max(.55rem,env(safe-area-inset-bottom)) + 76px);max-height:calc(100dvh - max(.55rem,env(safe-area-inset-bottom)) - 82px)}
    }
  `],
})
export class AnalyticsConsentComponent {
  readonly analytics = inject(VisitorAnalyticsService);
  readonly details = signal(false);
  readonly analyticsOn = signal(false);
  readonly marketingOn = signal(false);

  constructor() {
    effect(() => {
      this.analyticsOn.set(this.analytics.consent() === 'accepted');
      this.marketingOn.set(this.analytics.marketingConsent() === 'accepted');
    });
  }

  acceptAnalyticsOnly(): void {
    this.analytics.savePreferences(true, false);
  }

  saveDetailedPreferences(): void {
    this.analytics.savePreferences(this.analyticsOn(), this.marketingOn());
  }

  setAnalytics(event: Event): void {
    this.analyticsOn.set(event.target instanceof HTMLInputElement && event.target.checked);
  }

  setMarketing(event: Event): void {
    this.marketingOn.set(event.target instanceof HTMLInputElement && event.target.checked);
  }
}
