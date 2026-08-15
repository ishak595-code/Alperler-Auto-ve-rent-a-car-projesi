import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NewsletterCampaign, NewsletterService, NewsletterSubscriber } from '../../services/newsletter.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-admin-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-50">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-5 shadow-sm md:px-8">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Canlı Supabase Verisi</p>
            <h1 class="mt-1 text-2xl font-black text-slate-950">Bülten & Abone Merkezi</h1>
            <p class="mt-1 text-sm text-slate-500">Abonelik, izin durumu, kampanya gönderimi ve teslimat sonuçlarını tek merkezden yönetin.</p>
          </div>
          <button type="button" (click)="reload()" [disabled]="loading()" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <mat-icon aria-hidden="true">refresh</mat-icon>{{ loading() ? 'Yükleniyor...' : 'Yenile' }}
          </button>
        </div>
      </header>

      <div class="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        @if (error()) {
          <div role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ error() }}</div>
        }

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Bülten istatistikleri">
          <article class="stat-card"><span>Aktif Abone</span><strong>{{ activeCount() }}</strong><small>Gönderim alabilir</small></article>
          <article class="stat-card"><span>Abonelikten Çıkan</span><strong>{{ unsubscribedCount() }}</strong><small>Gönderim yapılmaz</small></article>
          <article class="stat-card"><span>Toplam Kampanya</span><strong>{{ visibleCampaigns().length }}</strong><small>Sistem mesajları hariç</small></article>
          <article class="stat-card"><span>Son Gönderimler</span><strong>{{ totalSent() }}</strong><small>Sağlayıcı tarafından kabul edilen</small></article>
        </section>

        <section class="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <article class="panel">
            <div class="panel-head">
              <div><h2>Aboneler</h2><p>Her kayıt doğrudan <code>subscribers</code> tablosundan gelir.</p></div>
              <select [(ngModel)]="statusFilter" class="control max-w-48" aria-label="Abone durum filtresi">
                <option value="ALL">Tümü</option>
                <option value="ACTIVE">Aktif</option>
                <option value="UNSUBSCRIBED">Çıkmış</option>
                <option value="BOUNCED">Bounced</option>
              </select>
            </div>
            <div class="divide-y divide-slate-100">
              @for (subscriber of filteredSubscribers(); track subscriber.id) {
                <div class="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <strong class="break-all text-sm text-slate-950">{{ subscriber.email }}</strong>
                      <span [class]="statusClass(subscriber.status)" class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase">{{ statusLabel(subscriber.status) }}</span>
                    </div>
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Dil: {{ subscriber.locale | uppercase }}</span>
                      <span>Kaynak: {{ subscriber.source }}</span>
                      <span>Kayıt: {{ subscriber.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @if (subscriber.status === 'ACTIVE') {
                      <button type="button" (click)="prepareSingle(subscriber.email)" class="action-btn bg-blue-600 text-white hover:bg-blue-700"><mat-icon aria-hidden="true">mail</mat-icon>Mesaj</button>
                      <button type="button" (click)="changeStatus(subscriber, 'UNSUBSCRIBED')" class="action-btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">Çıkar</button>
                    } @else {
                      <button type="button" (click)="changeStatus(subscriber, 'ACTIVE')" class="action-btn bg-emerald-600 text-white hover:bg-emerald-700">Yeniden Aktif Et</button>
                    }
                  </div>
                </div>
              } @empty {
                <div class="p-10 text-center text-sm font-bold text-slate-400">Bu filtrede abone bulunmuyor.</div>
              }
            </div>
          </article>

          <article class="panel h-fit xl:sticky xl:top-28">
            <div class="panel-head"><div><h2>Yeni Kampanya</h2><p>Gönderim sonucu veritabanında alıcı bazında saklanır.</p></div></div>
            <form (submit)="send($event)" class="space-y-4 p-5">
              @if (singleEmail()) {
                <div class="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-800">Yalnızca: {{ singleEmail() }} <button type="button" (click)="singleEmail.set(null)" class="ml-2 underline">Tüm abonelere dön</button></div>
              }
              <label class="field">İç başlık<input [(ngModel)]="campaignTitle" name="campaignTitle" maxlength="180" required class="control" placeholder="Örn. Eylül VIP Kiralama Fırsatları" /></label>
              <label class="field">E-posta konusu<input [(ngModel)]="campaignSubject" name="campaignSubject" maxlength="200" required class="control" placeholder="Örn. Bu hafta 1 gün bizden" /></label>
              <label class="field">Mesaj<textarea [(ngModel)]="campaignBody" name="campaignBody" maxlength="12000" rows="8" required class="control resize-y" placeholder="Müşteriye gidecek profesyonel mesaj..."></textarea></label>
              <button type="submit" [disabled]="sending()" class="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-blue-700 disabled:opacity-50">
                <mat-icon aria-hidden="true">send</mat-icon>{{ sending() ? 'Gönderim işleniyor...' : singleEmail() ? 'Seçili Aboneye Gönder' : 'Tüm Aktif Abonelere Gönder' }}
              </button>
              <p class="text-[11px] leading-5 text-slate-500">Sağlayıcı bağlı değilse kampanya ve teslimat kayıtları yine oluşturulur ancak panel gerçek durumu “E-posta sağlayıcısı bağlı değil” olarak gösterir. Sahte başarı verilmez.</p>
            </form>
          </article>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>Kampanya Geçmişi</h2><p>Gönderim toplamları ve sonuçları Supabase kayıtlarından hesaplanır.</p></div></div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-left text-sm">
              <thead class="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th class="px-5 py-3">Kampanya</th><th class="px-5 py-3">Durum</th><th class="px-5 py-3">Hedef</th><th class="px-5 py-3">Gönderildi</th><th class="px-5 py-3">Başarısız</th><th class="px-5 py-3">Atlandı</th><th class="px-5 py-3">Tarih</th></tr></thead>
              <tbody class="divide-y divide-slate-100">
                @for (campaign of visibleCampaigns(); track campaign.id) {
                  <tr class="hover:bg-slate-50"><td class="px-5 py-4"><strong class="block text-slate-950">{{ campaign.title }}</strong><small class="text-slate-500">{{ campaign.subject }}</small></td><td class="px-5 py-4"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black">{{ campaign.status }}</span></td><td class="px-5 py-4 font-bold">{{ campaign.totalRecipients }}</td><td class="px-5 py-4 font-black text-emerald-700">{{ campaign.sentCount }}</td><td class="px-5 py-4 font-black text-red-600">{{ campaign.failedCount }}</td><td class="px-5 py-4 font-black text-amber-700">{{ campaign.skippedCount }}</td><td class="px-5 py-4 text-slate-500">{{ campaign.createdAt | date:'dd.MM.yyyy HH:mm' }}</td></tr>
                } @empty { <tr><td colspan="7" class="p-10 text-center font-bold text-slate-400">Henüz kullanıcı kampanyası yok.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04)}
    .panel-head{display:flex;gap:1rem;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:1.1rem 1.25rem}.panel-head h2{font-size:1rem;font-weight:900;color:#0f172a}.panel-head p{margin-top:.2rem;font-size:.75rem;color:#64748b}
    .stat-card{display:flex;min-height:130px;flex-direction:column;justify-content:center;border:1px solid #e2e8f0;border-radius:18px;background:white;padding:1.25rem}.stat-card span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b}.stat-card strong{margin-top:.35rem;font-size:2.2rem;line-height:1;font-weight:900;color:#0f172a}.stat-card small{margin-top:.55rem;color:#94a3b8;font-weight:700}
    .field{display:flex;flex-direction:column;gap:.4rem;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#475569}.control{min-height:46px;width:100%;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:.7rem .85rem;color:#0f172a;font-size:.86rem;font-weight:650;outline:none}.control:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}.action-btn{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:.35rem;border-radius:10px;padding:.5rem .75rem;font-size:.72rem;font-weight:900}.action-btn mat-icon{width:16px;height:16px;font-size:16px}
  `],
})
export class AdminSubscribersComponent implements OnInit {
  private readonly newsletter = inject(NewsletterService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly subscribers = signal<NewsletterSubscriber[]>([]);
  readonly campaigns = signal<NewsletterCampaign[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly singleEmail = signal<string | null>(null);
  statusFilter = 'ALL';
  campaignTitle = '';
  campaignSubject = '';
  campaignBody = '';

  readonly activeCount = computed(() => this.subscribers().filter((item) => item.status === 'ACTIVE').length);
  readonly unsubscribedCount = computed(() => this.subscribers().filter((item) => item.status === 'UNSUBSCRIBED').length);
  readonly totalSent = computed(() => this.visibleCampaigns().reduce((sum, item) => sum + item.sentCount, 0));
  readonly visibleCampaigns = computed(() => this.campaigns().filter((item) => item.metadata?.['system'] !== true));
  readonly filteredSubscribers = computed(() => this.statusFilter === 'ALL' ? this.subscribers() : this.subscribers().filter((item) => item.status === this.statusFilter));

  ngOnInit(): void { void this.reload(); }

  async reload(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      const [subscribers, campaigns] = await Promise.all([this.newsletter.listSubscribers(), this.newsletter.listCampaigns()]);
      this.subscribers.set(subscribers); this.campaigns.set(campaigns);
    } catch (error) {
      console.error(error); this.error.set('Bülten verileri Supabase üzerinden yüklenemedi. Yönetici oturumunu ve bağlantıyı kontrol edin.');
    } finally { this.loading.set(false); }
  }

  prepareSingle(email: string): void {
    this.singleEmail.set(email);
    this.campaignTitle = `Özel mesaj | ${email}`;
    this.campaignSubject = '';
    this.campaignBody = '';
  }

  async changeStatus(subscriber: NewsletterSubscriber, status: 'ACTIVE' | 'UNSUBSCRIBED'): Promise<void> {
    const confirmed = await this.confirm.confirm({ title: status === 'ACTIVE' ? 'Aboneliği yeniden etkinleştir' : 'Abonelikten çıkar', message: `${subscriber.email} için bülten durumu ${status === 'ACTIVE' ? 'aktif' : 'abonelikten çıkmış'} olarak değiştirilecek.` });
    if (!confirmed) return;
    try {
      await this.newsletter.setSubscriberStatus(subscriber.email, status);
      this.toast.show(status === 'ACTIVE' ? 'Abonelik yeniden etkinleştirildi.' : 'Abone listeden çıkarıldı.', 'success');
      await this.reload();
    } catch (error) { console.error(error); this.toast.show('Abone durumu veritabanında güncellenemedi.', 'error'); }
  }

  async send(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.campaignTitle.trim() || !this.campaignSubject.trim() || !this.campaignBody.trim()) { this.toast.show('Kampanya başlığı, konu ve mesaj alanlarını doldurun.', 'error'); return; }
    const targetCount = this.singleEmail() ? 1 : this.activeCount();
    if (targetCount < 1) { this.toast.show('Gönderilecek aktif abone bulunmuyor.', 'error'); return; }
    const confirmed = await this.confirm.confirm({ title: 'Bülten gönderimini başlat', message: `${targetCount} aktif alıcı için gerçek e-posta gönderimi başlatılacak ve sonuçlar veritabanına kaydedilecek.` });
    if (!confirmed) return;
    this.sending.set(true);
    try {
      const result = await this.newsletter.sendCampaign({ title: this.campaignTitle.trim(), subject: this.campaignSubject.trim(), bodyText: this.campaignBody.trim(), singleEmail: this.singleEmail() });
      if (result.code === 'EMAIL_NOT_CONFIGURED') {
        this.toast.show('Kampanya kaydedildi ancak e-posta sağlayıcısı henüz bağlı değil. Sahte gönderim yapılmadı.', 'info');
      } else if ((result.counts?.failed || 0) > 0 || (result.counts?.skipped || 0) > 0) {
        this.toast.show(`Gönderim tamamlandı: ${result.counts?.sent || 0} başarılı, ${(result.counts?.failed || 0) + (result.counts?.skipped || 0)} sorunlu.`, 'info');
      } else {
        this.toast.show(`${result.counts?.sent || targetCount} e-posta sağlayıcı tarafından kabul edildi.`, 'success');
      }
      this.campaignTitle = ''; this.campaignSubject = ''; this.campaignBody = ''; this.singleEmail.set(null);
      await this.reload();
    } catch (error) { console.error(error); this.toast.show('Bülten gönderimi tamamlanamadı. Kayıtlar panelde korunuyor.', 'error'); }
    finally { this.sending.set(false); }
  }

  statusLabel(status: NewsletterSubscriber['status']): string { return status === 'ACTIVE' ? 'Aktif' : status === 'UNSUBSCRIBED' ? 'Çıkmış' : 'Bounced'; }
  statusClass(status: NewsletterSubscriber['status']): string { return status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'UNSUBSCRIBED' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'; }
}
