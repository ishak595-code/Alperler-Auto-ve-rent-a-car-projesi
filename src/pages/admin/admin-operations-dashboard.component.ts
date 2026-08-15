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
    <main class="min-h-[calc(100vh-8rem)] bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-7">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Production Supabase</p>
            <h1 class="mt-1 text-2xl font-black text-slate-950">Canlı Operasyon Özeti</h1>
            <p class="mt-1 text-sm text-slate-500">Gösterilen sayılar localStorage veya demo veri değil, production veritabanından gelir.</p>
          </div>
          <button type="button" (click)="load()" [disabled]="loading()" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50"><mat-icon aria-hidden="true">refresh</mat-icon>{{ loading() ? 'Yükleniyor...' : 'Canlı Veriyi Yenile' }}</button>
        </div>

        @if (error()) {
          <div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ error() }}</div>
        }

        @if (snapshot(); as data) {
          <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Canlı operasyon göstergeleri">
            <a routerLink="/admin/reservations" class="metric"><mat-icon aria-hidden="true">calendar_month</mat-icon><span>Toplam Rezervasyon</span><strong>{{ data.bookings }}</strong><small>{{ data.pendingBookings }} onay bekliyor</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'APPOINTMENT' }" class="metric"><mat-icon aria-hidden="true">event_available</mat-icon><span>Randevu</span><strong>{{ data.appointments }}</strong><small>Veritabanı kaydı</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'SALE_INQUIRY' }" class="metric"><mat-icon aria-hidden="true">sell</mat-icon><span>Satın Alma Talebi</span><strong>{{ data.saleInquiries }}</strong><small>Satış operasyonu</small></a>
            <a routerLink="/admin/reservations" [queryParams]="{ type: 'TOUR' }" class="metric"><mat-icon aria-hidden="true">explore</mat-icon><span>Tur Rezervasyonu</span><strong>{{ data.tourBookings }}</strong><small>Tur operasyonu</small></a>
            <article class="metric"><mat-icon aria-hidden="true">payments</mat-icon><span>Kayıtlı Ciro</span><strong class="!text-2xl">{{ data.revenue | currency:'TRY':'symbol-narrow':'1.0-0':'tr-TR' }}</strong><small>Reddedilmeyen kayıtlar</small></article>
            <a routerLink="/admin/feedback" class="metric"><mat-icon aria-hidden="true">mark_email_unread</mat-icon><span>Açık Mesaj</span><strong>{{ data.openMessages }}</strong><small>NEW + READ</small></a>
            <a routerLink="/admin/partner-requests" class="metric"><mat-icon aria-hidden="true">directions_car_filled</mat-icon><span>Araç Başvurusu</span><strong>{{ data.openPartnerRequests }}</strong><small>İşlem bekleyen</small></a>
            <a routerLink="/admin/subscribers" class="metric"><mat-icon aria-hidden="true">campaign</mat-icon><span>Aktif Abone</span><strong>{{ data.activeSubscribers }}</strong><small>Bülten gönderimi alabilir</small></a>
            <a routerLink="/admin/team" class="metric"><mat-icon aria-hidden="true">groups</mat-icon><span>Aktif Ekip</span><strong>{{ data.activeStaff }}</strong><small>Görev atanabilir</small></a>
            <a routerLink="/admin/system-health" class="metric" [class.!border-red-200]="data.failedNotifications > 0"><mat-icon aria-hidden="true">notification_important</mat-icon><span>Bildirim Hatası</span><strong [class.!text-red-600]="data.failedNotifications > 0">{{ data.failedNotifications }}</strong><small>{{ data.failedNotifications > 0 ? 'İnceleme gerekli' : 'Hata kaydı yok' }}</small></a>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <article class="panel">
              <div class="panel-head"><div><h2>Son Veritabanı Hareketleri</h2><p>Audit log üzerinde gerçek kullanıcı ve sistem işlemleri.</p></div><a routerLink="/admin/audit" class="text-xs font-black text-blue-700 hover:underline">Tüm geçmiş</a></div>
              <div class="divide-y divide-slate-100">
                @for (item of data.recentAudit; track item.id) {
                  <div class="grid gap-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><mat-icon aria-hidden="true">history</mat-icon></div>
                    <div class="min-w-0"><strong class="block truncate text-sm text-slate-950">{{ actionLabel(item.action) }}</strong><small class="block truncate text-slate-500">{{ item.entityType }} · {{ item.entityId }}{{ item.actorEmail ? ' · ' + item.actorEmail : '' }}</small></div>
                    <time class="text-xs font-bold text-slate-400">{{ item.createdAt | date:'dd.MM HH:mm' }}</time>
                  </div>
                } @empty { <div class="p-8 text-center text-sm font-bold text-slate-400">Henüz audit kaydı yok.</div> }
              </div>
            </article>

            <article class="panel h-fit">
              <div class="panel-head"><div><h2>Operasyon Akışı</h2><p>Bir işlemin veri tabanındaki hedefi ve admin ekranı.</p></div></div>
              <div class="space-y-3 p-5 text-sm">
                <a routerLink="/admin/reservations" class="flow-row"><mat-icon aria-hidden="true">key</mat-icon><div><strong>Rezervasyon / Randevu / Tur</strong><span><code>bookings</code> → Rezervasyon Merkezi</span></div></a>
                <a routerLink="/admin/feedback" class="flow-row"><mat-icon aria-hidden="true">mail</mat-icon><div><strong>İletişim Mesajı</strong><span><code>contact_messages</code> → Mesaj Kutusu</span></div></a>
                <a routerLink="/admin/partner-requests" class="flow-row"><mat-icon aria-hidden="true">directions_car</mat-icon><div><strong>Aracını Değerlendir</strong><span><code>partner_requests</code> → Başvurular</span></div></a>
                <a routerLink="/admin/subscribers" class="flow-row"><mat-icon aria-hidden="true">mark_email_read</mat-icon><div><strong>Ücretsiz Bülten</strong><span><code>subscribers</code> → Bülten Merkezi</span></div></a>
                <a routerLink="/admin/assignments" class="flow-row"><mat-icon aria-hidden="true">assignment_ind</mat-icon><div><strong>Ekip Görevleri</strong><span>Personel → Şube / Araç / Tur atamaları</span></div></a>
              </div>
            </article>
          </section>
        } @else if (loading()) {
          <div class="rounded-3xl border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">Production verileri yükleniyor…</div>
        }
      </div>
    </main>
  `,
  styles: [`
    .metric{display:flex;min-height:150px;flex-direction:column;border:1px solid #e2e8f0;border-radius:20px;background:white;padding:1.15rem;text-decoration:none;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:.18s ease}.metric:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,23,42,.08)}.metric mat-icon{color:#2563eb}.metric span{margin-top:.8rem;font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.09em;color:#64748b}.metric strong{margin-top:.25rem;font-size:2.2rem;line-height:1;font-weight:900;color:#0f172a}.metric small{margin-top:.5rem;color:#94a3b8;font-weight:700}
    .panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:white;box-shadow:0 1px 2px rgba(15,23,42,.04)}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1.1rem 1.25rem}.panel-head h2{font-size:1rem;font-weight:900;color:#0f172a}.panel-head p{margin-top:.2rem;font-size:.75rem;color:#64748b}
    .flow-row{display:flex;min-height:66px;align-items:center;gap:.85rem;border:1px solid #e2e8f0;border-radius:14px;padding:.8rem;color:#0f172a;text-decoration:none}.flow-row:hover{border-color:#bfdbfe;background:#eff6ff}.flow-row mat-icon{color:#2563eb}.flow-row div{display:flex;min-width:0;flex-direction:column}.flow-row strong{font-size:.82rem}.flow-row span{margin-top:.2rem;font-size:.7rem;color:#64748b}
  `],
})
export class AdminOperationsDashboardComponent implements OnInit {
  private readonly operations = inject(AdminOperationsService);
  readonly snapshot = signal<AdminOperationsSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { this.snapshot.set(await this.operations.load()); }
    catch (error) { console.error(error); this.error.set('Canlı operasyon verileri Supabase üzerinden yüklenemedi. Oturum ve RLS yetkilerini kontrol edin.'); }
    finally { this.loading.set(false); }
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      owner_bootstrap_repaired: 'Owner hesabı onarıldı',
      campaign_created: 'Kampanya oluşturuldu',
      site_settings_initialized: 'Site ayarları başlatıldı',
      staff_structure_initialized: 'Ekip yapısı kuruldu',
      newsletter_campaign_created: 'Bülten kampanyası oluşturuldu',
      newsletter_campaign_started: 'Bülten gönderimi başlatıldı',
      newsletter_campaign_resumed: 'Bülten gönderimi devam etti',
      newsletter_subscriber_unsubscribed: 'Abone listeden çıktı',
      newsletter_subscriber_reactivated: 'Abone yeniden etkinleştirildi',
    };
    return labels[action] || action.replaceAll('_', ' ');
  }
}
