import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminOperationsService, AdminOperationsSnapshot } from '../../services/admin-operations.service';

@Component({
  selector: 'app-admin-operations-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <main class="min-h-[calc(100vh-7rem)] bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-black text-slate-950">Bugünün Özeti</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500">Rezervasyon, mesaj, başvuru ve ekip durumunu hızlıca kontrol edin.</p>
          </div>
          <button type="button" (click)="load()" [disabled]="loading()" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50"><mat-icon aria-hidden="true">refresh</mat-icon>{{ loading() ? 'Yenileniyor…' : 'Yenile' }}</button>
        </div>

        @if (error()) {
          <div role="alert" class="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <span class="font-bold">{{ error() }}</span>
            <button type="button" (click)="load()" class="min-h-10 rounded-xl bg-amber-950 px-4 text-xs font-black text-white">Tekrar Dene</button>
          </div>
        }

        @if (snapshot(); as data) {
          <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Operasyon göstergeleri">
            <a routerLink="/admin/reservations" class="metric"><mat-icon aria-hidden="true">calendar_month</mat-icon><span>Rezervasyon</span><strong>{{ data.bookings }}</strong><small>{{ data.pendingBookings }} onay bekliyor</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'APPOINTMENT' }" class="metric"><mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span><strong>{{ data.appointments }}</strong><small>Toplam kayıt</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'SALE_INQUIRY' }" class="metric"><mat-icon aria-hidden="true">sell</mat-icon><span>Satın Alma Talebi</span><strong>{{ data.saleInquiries }}</strong><small>İlgilenilecek talepler</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'TOUR' }" class="metric"><mat-icon aria-hidden="true">explore</mat-icon><span>Tur Rezervasyonu</span><strong>{{ data.tourBookings }}</strong><small>Tur talepleri</small></a>
            <article class="metric"><mat-icon aria-hidden="true">payments</mat-icon><span>Toplam Tutar</span><strong class="!text-2xl">{{ data.revenue | currency:'TRY':'symbol-narrow':'1.0-0':'tr-TR' }}</strong><small>Aktif işlemler</small></article>
            <a routerLink="/admin/feedback" class="metric"><mat-icon aria-hidden="true">mark_email_unread</mat-icon><span>Mesaj</span><strong>{{ data.openMessages }}</strong><small>İlgilenilmeyi bekliyor</small></a>
            <a routerLink="/admin/partner-requests" class="metric"><mat-icon aria-hidden="true">directions_car_filled</mat-icon><span>Araç Başvurusu</span><strong>{{ data.openPartnerRequests }}</strong><small>İşlem bekliyor</small></a>
            <a routerLink="/admin/subscribers" class="metric"><mat-icon aria-hidden="true">campaign</mat-icon><span>Aktif Abone</span><strong>{{ data.activeSubscribers }}</strong><small>Bülten alabilir</small></a>
            <a routerLink="/admin/team" class="metric"><mat-icon aria-hidden="true">groups</mat-icon><span>Aktif Ekip</span><strong>{{ data.activeStaff }}</strong><small>Görev atanabilir</small></a>
            <a routerLink="/admin/system-health" class="metric" [class.!border-red-200]="data.failedNotifications > 0"><mat-icon aria-hidden="true">notification_important</mat-icon><span>Bildirim Sorunu</span><strong [class.!text-red-600]="data.failedNotifications > 0">{{ data.failedNotifications }}</strong><small>{{ data.failedNotifications > 0 ? 'Kontrol gerekli' : 'Sorun görünmüyor' }}</small></a>
          </section>

          <section class="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <article class="panel">
              <div class="panel-head"><div><h2>Son İşlemler</h2><p>Yönetim panelinde yapılan son değişiklikler.</p></div><a routerLink="/admin/audit" class="text-xs font-black text-blue-700">Tümünü Gör</a></div>
              <div class="divide-y divide-slate-100">
                @for (item of data.recentAudit; track item.id) {
                  <div class="grid gap-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><mat-icon aria-hidden="true">history</mat-icon></div>
                    <div class="min-w-0"><strong class="block truncate text-sm text-slate-950">{{ actionLabel(item.action) }}</strong><small class="block truncate text-slate-500">{{ item.actorEmail || 'Sistem işlemi' }}</small></div>
                    <time class="text-xs font-bold text-slate-400">{{ item.createdAt | date:'dd.MM HH:mm' }}</time>
                  </div>
                } @empty { <div class="p-8 text-center text-sm font-bold text-slate-400">Henüz işlem geçmişi yok.</div> }
              </div>
            </article>

            <article class="panel h-fit">
              <div class="panel-head"><div><h2>Hızlı Erişim</h2><p>Sık kullanılan işlemlere doğrudan gidin.</p></div></div>
              <div class="grid gap-3 p-4">
                <a routerLink="/admin/reservations" class="quick"><mat-icon aria-hidden="true">key</mat-icon><span>Rezervasyonlar</span></a>
                <a routerLink="/admin/feedback" class="quick"><mat-icon aria-hidden="true">mail</mat-icon><span>Mesajlar</span></a>
                <a routerLink="/admin/partner-requests" class="quick"><mat-icon aria-hidden="true">directions_car</mat-icon><span>Araç Başvuruları</span></a>
                <a routerLink="/admin/subscribers" class="quick"><mat-icon aria-hidden="true">mark_email_read</mat-icon><span>Bülten & Aboneler</span></a>
              </div>
            </article>
          </section>
        } @else if (loading()) {
          <div class="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">Bilgiler yükleniyor…</div>
        }
      </div>
    </main>
  `,
  styles: [`
    .metric{display:flex;min-height:138px;flex-direction:column;border:1px solid #e2e8f0;border-radius:18px;background:white;padding:1rem;text-decoration:none;box-shadow:0 1px 2px rgba(15,23,42,.04)}.metric mat-icon{color:#2563eb}.metric span{margin-top:.65rem;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#64748b}.metric strong{margin-top:.2rem;font-size:2rem;line-height:1;font-weight:900;color:#0f172a}.metric small{margin-top:.42rem;color:#94a3b8;font-size:.68rem;font-weight:700}.panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:white}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem}.panel-head h2{font-size:.95rem;font-weight:900;color:#0f172a}.panel-head p{margin-top:.18rem;font-size:.7rem;color:#64748b}.quick{display:flex;min-height:52px;align-items:center;gap:.7rem;border:1px solid #e2e8f0;border-radius:13px;padding:.7rem;color:#0f172a;text-decoration:none;font-size:.75rem;font-weight:900}.quick mat-icon{color:#2563eb}
  `],
})
export class AdminOperationsDashboardComponent implements OnInit {
  private readonly operations = inject(AdminOperationsService);
  readonly snapshot = signal<AdminOperationsSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.snapshot.set(await this.operations.load());
    } catch (error) {
      console.error(error);
      this.error.set('Özet bilgiler şu anda yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      this.loading.set(false);
    }
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      owner_bootstrap_repaired: 'Yönetici hesabı güncellendi',
      campaign_created: 'Kampanya oluşturuldu',
      site_settings_initialized: 'Site ayarları hazırlandı',
      staff_structure_initialized: 'Ekip yapısı hazırlandı',
      newsletter_campaign_created: 'Bülten kampanyası oluşturuldu',
      newsletter_campaign_started: 'Bülten gönderimi başlatıldı',
      newsletter_campaign_resumed: 'Bülten gönderimi devam etti',
      newsletter_subscriber_unsubscribed: 'Abone listeden çıktı',
      newsletter_subscriber_reactivated: 'Abone yeniden etkinleştirildi',
    };
    return labels[action] || action.replaceAll('_', ' ');
  }
}
