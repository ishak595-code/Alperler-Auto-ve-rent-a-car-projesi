import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminOperationsService, AdminOperationsSnapshot } from '../../services/admin-operations.service';

@Component({
  selector:'app-admin-operations-dashboard',
  standalone:true,
  imports:[CommonModule,RouterLink,MatIconModule],
  template:`
    <main class="min-h-[calc(100vh-7rem)] bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 class="text-xl font-black text-slate-950">Bugünün Operasyon Merkezi</h2><p class="mt-1 text-sm leading-6 text-slate-500">Yeni rezervasyonları, bugünkü teslim ve dönüşleri, yaklaşan işleri ve bekleyen tahsilatları tek ekrandan izleyin.</p></div>
          <button type="button" (click)="load()" [disabled]="loading()" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50"><mat-icon aria-hidden="true">refresh</mat-icon>{{loading()?'Yenileniyor…':'Yenile'}}</button>
        </div>

        @if(error()){<div role="alert" class="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"><span class="font-bold">{{error()}}</span><button type="button" (click)="load()" class="min-h-10 rounded-xl bg-amber-950 px-4 text-xs font-black text-white">Tekrar Dene</button></div>}

        @if(snapshot();as data){
          <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Bugünün operasyon göstergeleri">
            <a routerLink="/admin/reservations" class="metric" [attr.aria-label]="'Bugün '+data.todayBookings+' yeni rezervasyon alındı'"><mat-icon aria-hidden="true">today</mat-icon><span>Bugün Alınan</span><strong>{{data.todayBookings}}</strong><small>Yeni rezervasyon</small></a>
            <a routerLink="/admin/reservations" class="metric" [attr.aria-label]="'Bugün '+data.todayStarts+' rezervasyon başlıyor'"><mat-icon aria-hidden="true">key</mat-icon><span>Bugün Başlayan</span><strong>{{data.todayStarts}}</strong><small>Teslim / buluşma</small></a>
            <a routerLink="/admin/reservations" class="metric" [attr.aria-label]="'Bugün '+data.todayEnds+' rezervasyon bitiyor'"><mat-icon aria-hidden="true">assignment_return</mat-icon><span>Bugün Biten</span><strong>{{data.todayEnds}}</strong><small>Dönüş / tamamlama</small></a>
            <a routerLink="/admin/finance" class="metric" [class.attention]="data.officePaymentsDue>0" [attr.aria-label]="data.officePaymentsDue+' rezervasyonda ofiste tahsilat bekleniyor'"><mat-icon aria-hidden="true">storefront</mat-icon><span>Ofiste Tahsilat</span><strong>{{data.officePaymentsDue}}</strong><small>{{data.officePaymentsDue>0?'Tahsilat bekliyor':'Bekleyen yok'}}</small></a>
            <a routerLink="/admin/finance" class="metric" [class.attention]="data.eftPaymentsDue>0" [attr.aria-label]="data.eftPaymentsDue+' rezervasyonda EFT tahsilatı bekleniyor'"><mat-icon aria-hidden="true">account_balance</mat-icon><span>EFT Bekleyen</span><strong>{{data.eftPaymentsDue}}</strong><small>{{data.eftPaymentsDue>0?'Doğrulama gerekli':'Bekleyen yok'}}</small></a>
          </section>

          <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Genel operasyon göstergeleri">
            <a routerLink="/admin/reservations" class="compact"><span>Toplam rezervasyon</span><strong>{{data.bookings}}</strong><small>{{data.pendingBookings}} onay bekliyor</small></a>
            <a routerLink="/admin/feedback" class="compact"><span>Açık mesaj</span><strong>{{data.openMessages}}</strong><small>Yanıt bekleyen iletişim</small></a>
            <a routerLink="/admin/partner-requests" class="compact"><span>Araç başvurusu</span><strong>{{data.openPartnerRequests}}</strong><small>İşlem bekliyor</small></a>
            <a routerLink="/admin/system-health" class="compact" [class.attention]="data.failedNotifications>0"><span>Bildirim sorunu</span><strong>{{data.failedNotifications}}</strong><small>{{data.failedNotifications>0?'Kontrol gerekli':'Sorun görünmüyor'}}</small></a>
          </section>

          <section class="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
            <article class="panel">
              <div class="panel-head"><div><h2>Bugün ve Yaklaşanlar</h2><p>Önümüzdeki 7 gün içinde başlayacak rezervasyonlar. Tutar gösteriliyorsa henüz tahsil edilmemiş bakiyedir.</p></div><a routerLink="/admin/reservations" class="text-xs font-black text-blue-700">Tüm Rezervasyonlar</a></div>
              <div class="divide-y divide-slate-100">
                @for(item of data.upcoming;track item.id){
                  <article class="upcoming-row" [attr.aria-label]="upcomingAria(item)">
                    <div class="date-box" aria-hidden="true"><strong>{{item.startAt|date:'dd'}}</strong><span>{{item.startAt|date:'MMM':'':'tr-TR'}}</span><small>{{item.startAt|date:'HH:mm'}}</small></div>
                    <div class="upcoming-copy"><strong>{{item.itemName}}</strong><span>{{item.customerName}} · {{item.reference}}</span><small>{{typeLabel(item.bookingType)}} · {{statusLabel(item.status)}}</small></div>
                    <div class="upcoming-payment"><strong [class.due]="item.amountDue>0">{{item.amountDue>0?money(item.amountDue,item.currency):'Tahsilat tamam'}}</strong><span>{{paymentLabel(item.paymentMethod)}}</span><a routerLink="/admin/finance" [attr.aria-label]="item.reference+' tahsilat ekranını aç'">Muhasebe</a></div>
                  </article>
                } @empty {<div class="p-8 text-center text-sm font-bold text-slate-400">Önümüzdeki 7 gün için yaklaşan rezervasyon görünmüyor.</div>}
              </div>
            </article>

            <article class="panel h-fit">
              <div class="panel-head"><div><h2>İş Yükü</h2><p>Operasyon ekibinin hızlı kontrol alanları.</p></div></div>
              <div class="workload">
                <a routerLink="/admin/reservations" [queryParams]="{type:'APPOINTMENT'}"><span>Randevular</span><strong>{{data.appointments}}</strong></a>
                <a routerLink="/admin/reservations" [queryParams]="{type:'TOUR'}"><span>Tur rezervasyonları</span><strong>{{data.tourBookings}}</strong></a>
                <a routerLink="/admin/reservations" [queryParams]="{type:'SALE_INQUIRY'}"><span>Satın alma talepleri</span><strong>{{data.saleInquiries}}</strong></a>
                <a routerLink="/admin/subscribers"><span>Aktif aboneler</span><strong>{{data.activeSubscribers}}</strong></a>
                <a routerLink="/admin/team"><span>Aktif ekip</span><strong>{{data.activeStaff}}</strong></a>
              </div>
            </article>
          </section>

          <section class="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <article class="panel"><div class="panel-head"><div><h2>Son İşlemler</h2><p>Yönetim panelinde yapılan son değişiklikler.</p></div><a routerLink="/admin/audit" class="text-xs font-black text-blue-700">Tümünü Gör</a></div><div class="divide-y divide-slate-100">@for(item of data.recentAudit;track item.id){<div class="grid gap-2 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><mat-icon aria-hidden="true">history</mat-icon></div><div class="min-w-0"><strong class="block truncate text-sm text-slate-950">{{actionLabel(item.action)}}</strong><small class="block truncate text-slate-500">{{item.actorEmail||'Sistem işlemi'}}</small></div><time class="text-xs font-bold text-slate-400">{{item.createdAt|date:'dd.MM HH:mm'}}</time></div>}@empty{<div class="p-8 text-center text-sm font-bold text-slate-400">Henüz işlem geçmişi yok.</div>}</div></article>
            <article class="panel h-fit"><div class="panel-head"><div><h2>Hızlı Erişim</h2><p>Sık kullanılan işlemlere doğrudan gidin.</p></div></div><div class="grid gap-3 p-4"><a routerLink="/admin/reservations" class="quick"><mat-icon aria-hidden="true">key</mat-icon><span>Rezervasyonlar</span></a><a routerLink="/admin/finance" class="quick"><mat-icon aria-hidden="true">payments</mat-icon><span>Muhasebe & Tahsilat</span></a><a routerLink="/admin/feedback" class="quick"><mat-icon aria-hidden="true">mail</mat-icon><span>Mesajlar</span></a><a routerLink="/admin/partner-requests" class="quick"><mat-icon aria-hidden="true">directions_car</mat-icon><span>Araç Başvuruları</span></a></div></article>
          </section>
        } @else if(loading()){<div class="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">Bilgiler yükleniyor…</div>}
      </div>
    </main>
  `,
  styles:[`
    .metric{display:flex;min-height:138px;flex-direction:column;border:1px solid #e2e8f0;border-radius:18px;background:white;padding:1rem;text-decoration:none;box-shadow:0 1px 2px rgba(15,23,42,.04)}.metric.attention,.compact.attention{border-color:#fed7aa;background:#fff7ed}.metric mat-icon{color:#2563eb}.metric span{margin-top:.65rem;font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#64748b}.metric strong{margin-top:.2rem;font-size:2rem;line-height:1;font-weight:900;color:#0f172a}.metric small{margin-top:.42rem;color:#94a3b8;font-size:.68rem;font-weight:700}.compact{display:flex;min-height:100px;flex-direction:column;border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:.9rem;text-decoration:none}.compact span{font-size:.65rem;font-weight:900;color:#475569}.compact strong{margin-top:.2rem;font-size:1.6rem;color:#0f172a}.compact small{margin-top:.25rem;font-size:.63rem;color:#94a3b8}.panel{overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:white}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e2e8f0;padding:1rem}.panel-head h2{font-size:.95rem;font-weight:900;color:#0f172a}.panel-head p{margin-top:.18rem;font-size:.7rem;color:#64748b;line-height:1.5}.upcoming-row{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:.8rem;align-items:center;padding:.85rem 1rem}.date-box{display:grid;min-height:58px;place-items:center;border-radius:13px;background:#eff6ff;color:#1d4ed8}.date-box strong{font-size:1rem;line-height:1}.date-box span,.date-box small{font-size:.55rem;font-weight:900;text-transform:uppercase}.upcoming-copy{min-width:0}.upcoming-copy strong,.upcoming-copy span,.upcoming-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.upcoming-copy strong{font-size:.78rem}.upcoming-copy span{margin-top:.2rem;font-size:.66rem;color:#64748b}.upcoming-copy small{margin-top:.18rem;font-size:.58rem;color:#94a3b8}.upcoming-payment{text-align:right}.upcoming-payment strong,.upcoming-payment span{display:block}.upcoming-payment strong{font-size:.7rem;color:#047857}.upcoming-payment strong.due{color:#b45309}.upcoming-payment span{margin-top:.15rem;font-size:.58rem;color:#64748b}.upcoming-payment a{display:inline-flex;min-height:34px;align-items:center;margin-top:.35rem;border-radius:9px;background:#0f172a;padding:0 .65rem;color:#fff;font-size:.58rem;font-weight:900;text-decoration:none}.workload{display:grid;gap:.55rem;padding:1rem}.workload a{display:flex;min-height:48px;align-items:center;justify-content:space-between;gap:.8rem;border:1px solid #e2e8f0;border-radius:12px;padding:0 .8rem;color:#0f172a;text-decoration:none;font-size:.7rem;font-weight:850}.workload strong{font-size:1rem}.quick{display:flex;min-height:52px;align-items:center;gap:.7rem;border:1px solid #e2e8f0;border-radius:13px;padding:.7rem;color:#0f172a;text-decoration:none;font-size:.75rem;font-weight:900}.quick mat-icon{color:#2563eb}a:focus-visible,button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(max-width:640px){.upcoming-row{grid-template-columns:48px minmax(0,1fr);align-items:start}.upcoming-payment{grid-column:2;text-align:left}.upcoming-payment a{min-height:40px}}
  `],
})
export class AdminOperationsDashboardComponent implements OnInit{
  private readonly operations=inject(AdminOperationsService);
  readonly snapshot=signal<AdminOperationsSnapshot|null>(null);readonly loading=signal(false);readonly error=signal('');
  ngOnInit():void{void this.load();}
  async load():Promise<void>{if(this.loading())return;this.loading.set(true);this.error.set('');try{this.snapshot.set(await this.operations.load());}catch(error){console.error(error);this.error.set('Özet bilgiler şu anda yüklenemedi. Mevcut kayıtlar etkilenmedi; kısa süre sonra yeniden deneyebilirsiniz.');}finally{this.loading.set(false);}}
  money(value:number,currency:string){try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value||0));}catch{return`${Number(value||0).toFixed(2)} ${currency}`;}}
  typeLabel(value:string){return({RENTAL:'Araç kiralama',TOUR:'Tur',SALE_INQUIRY:'Satın alma',APPOINTMENT:'Randevu'} as Record<string,string>)[value]||value;}
  statusLabel(value:string){return({PENDING:'Onay bekliyor',APPROVED:'Onaylandı',COMPLETED:'Tamamlandı',CANCELLED:'İptal',REJECTED:'Onaylanmadı'} as Record<string,string>)[value]||value;}
  paymentLabel(value:string){return({OFFICE:'Ofiste ödeme',EFT:'Havale / EFT',CARD:'Kart',NONE:'Ödeme gerekmiyor'} as Record<string,string>)[value]||value;}
  upcomingAria(item:{reference:string;itemName:string;customerName:string;startAt:string;amountDue:number;currency:string;paymentMethod:string}){const date=new Date(item.startAt).toLocaleString('tr-TR');const due=item.amountDue>0?`${this.money(item.amountDue,item.currency)} bakiye bekliyor`:'tahsilat tamam';return`${item.reference}, ${item.itemName}, ${item.customerName}, ${date}, ${this.paymentLabel(item.paymentMethod)}, ${due}`;}
  actionLabel(action:string):string{const labels:Record<string,string>={owner_bootstrap_repaired:'Yönetici hesabı güncellendi',campaign_created:'Kampanya oluşturuldu',site_settings_initialized:'Site ayarları hazırlandı',staff_structure_initialized:'Ekip yapısı hazırlandı',newsletter_campaign_created:'Bülten kampanyası oluşturuldu',newsletter_campaign_started:'Bülten gönderimi başlatıldı',newsletter_campaign_resumed:'Bülten gönderimi devam etti',newsletter_subscriber_unsubscribed:'Abone listeden çıktı',newsletter_subscriber_reactivated:'Abone yeniden etkinleştirildi'};return labels[action]||action.replaceAll('_',' ');}
}
