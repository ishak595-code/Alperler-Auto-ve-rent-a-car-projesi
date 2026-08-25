import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CustomerAccountService, CustomerBooking } from '../services/customer-account.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { CustomerBookingActionsService } from '../services/customer-booking-actions.service';
import { ProfileAdminBridgeService } from '../services/profile-admin-bridge.service';

@Component({
  selector: 'app-account-dashboard-v150',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="account-page">
      <section class="shell">
        <header class="account-header">
          <div>
            <p class="eyebrow">ALPERLER HESABIM</p>
            <h1>{{ displayName() }}</h1>
            <span>{{ account.profile()?.email || auth.user()?.email }}</span>
          </div>
          <div class="header-actions">
            @if (adminBridge.access()) {
              <button type="button" class="admin-entry" (click)="openAdmin()" [disabled]="adminOpening()">
                {{ adminOpening() ? 'Yönetim açılıyor...' : 'Yönetim Paneli' }}
              </button>
            }
            <a routerLink="/">Siteye Dön</a>
            <button type="button" class="logout" (click)="logout()">Çıkış Yap</button>
          </div>
        </header>

        @if (pageMessage()) {<p class="notice success" role="status">{{ pageMessage() }}</p>}
        @if (pageError()) {<p class="notice error" role="alert">{{ pageError() }}</p>}

        @if (account.loading()) {
          <section class="loading" role="status">Hesap bilgileriniz hazırlanıyor...</section>
        } @else {
          <section class="action-grid" aria-label="Hızlı işlemler">
            <a routerLink="/fleet"><small>ARAÇ</small><strong>Araç Kirala</strong><span>Saatlik veya günlük uygun araçları inceleyin.</span></a>
            <a routerLink="/tours"><small>TUR</small><strong>Tur Planla</strong><span>Tur seçeneklerini ve müsait tarihleri görüntüleyin.</span></a>
            <a routerLink="/sales"><small>SATIŞ</small><strong>Satılık Araçlar</strong><span>İlanları inceleyin ve satın alma talebi oluşturun.</span></a>
            <a routerLink="/account/wallet" class="documents"><small>GÜVENLİ KASA</small><strong>Kimlik ve Ehliyet</strong><span>Kimlik ve ehliyetinizin ön ve arka yüzünü güvenle yönetin.</span></a>
          </section>

          @if (account.lifetimeSummary(); as lifetime) {
            <section class="loyalty-overview" aria-labelledby="loyalty-overview-title">
              <header>
                <div><p class="eyebrow">ALPERLER SADAKAT</p><h2 id="loyalty-overview-title">Sadakat ve müşteri geçmişiniz</h2><span>{{ tenureLabel() }} · {{ engagementLabel(lifetime.engagementBand) }} · {{ lifetime.tier }} seviye</span></div>
                <strong class="points-balance">{{ lifetime.pointsBalance | number }} <small>puan</small></strong>
              </header>
              <div class="loyalty-grid">
                <article><small>Araç kiralama</small><strong>{{ lifetime.completedRentals }}</strong><span>tamamlanan kiralama</span></article>
                <article><small>Tur</small><strong>{{ lifetime.completedTours }}</strong><span>tamamlanan tur</span></article>
                <article><small>Satış</small><strong>{{ lifetime.completedSales }}</strong><span>tamamlanan satış işlemi</span></article>
                <article><small>Kampanya</small><strong>{{ lifetime.campaignsCompleted }}</strong><span>tamamlanan kampanya kullanımı</span></article>
                <article><small>Başarılı davet</small><strong>{{ lifetime.successfulReferrals }}</strong><span>arkadaş katkısı</span></article>
                <article><small>Toplam tamamlanan</small><strong>{{ lifetime.completedTotal }}</strong><span>tüm hizmetler</span></article>
              </div>
              <div class="points-ledger" aria-label="Sadakat puanı özeti">
                <article><span>Toplam kazanılan</span><strong>+{{ lifetime.pointsEarned | number }}</strong></article>
                <article><span>Toplam kullanılan</span><strong>-{{ lifetime.pointsRedeemedGross | number }}</strong></article>
                <article><span>İade edilen</span><strong>+{{ lifetime.pointsRedemptionRefunded | number }}</strong></article>
                <article><span>Net kullanılan</span><strong>{{ lifetime.pointsRedeemedNet | number }}</strong></article>
                <article><span>Süresi dolan</span><strong>{{ lifetime.pointsExpired | number }}</strong></article>
                <article><span>Davet puanı</span><strong>+{{ lifetime.referralPointsEarned | number }}</strong></article>
              </div>
              @if (spendEntries().length) {
                <div class="lifetime-spend" aria-label="Tamamlanan işlem harcama özeti">
                  @for (entry of spendEntries(); track entry.currency) {
                    <article><small>{{ entry.currency }} harcama</small><strong>{{ entry.spent | number:'1.0-2' }} {{ entry.currency }}</strong><span>{{ entry.transactions }} işlem · {{ entry.saved | number:'1.0-2' }} {{ entry.currency }} toplam avantaj</span></article>
                  }
                </div>
              }
              <p class="loyalty-note">Puan bakiyesi gerçek hareket defterinden hesaplanır. Puan kullandığınızda bakiye düşer; iptal veya reddedilen uygun işlemlerde iade hareketi ayrıca kaydedilir.</p>
            </section>
          }

          <section class="status-overview" aria-labelledby="status-overview-title">
            <header><div><p class="eyebrow">TALEPLERİM</p><h2 id="status-overview-title">Rezervasyon ve talepleriniz</h2><span>Gönderdiğiniz işlemlerin güncel durumunu buradan takip edebilirsiniz.</span></div><button type="button" (click)="reload()" [disabled]="account.loading()">Yenile</button></header>
            <div class="summary-grid">
              <article><small>İnceleniyor</small><strong>{{ countStatus('PENDING') }}</strong></article>
              <article><small>Onaylandı</small><strong>{{ countStatus('APPROVED') }}</strong></article>
              <article><small>Tamamlandı</small><strong>{{ countStatus('COMPLETED') }}</strong></article>
              <article><small>Toplam İşlem</small><strong>{{ account.bookings().length }}</strong></article>
            </div>
          </section>

          <section id="history" class="history" aria-labelledby="history-title">
            <header><div><p class="eyebrow">İŞLEM GEÇMİŞİ</p><h2 id="history-title">Tüm talepleriniz</h2></div></header>
            <div class="booking-list">
              @for (booking of account.bookings(); track booking.id) {
                <article class="booking-card">
                  <div class="booking-top">
                    <div class="booking-identity">
                      @if (booking.image) {<img [src]="booking.image" alt="" />}
                      <div><small>{{ typeLabel(booking.booking_type) }}</small><strong>{{ booking.item_name }}</strong><span>{{ booking.reference }}</span></div>
                    </div>
                    <span class="status" [class]="'status ' + statusClass(booking.status)">{{ statusLabel(booking.status) }}</span>
                  </div>
                  <p class="status-copy">{{ statusDescription(booking) }}</p>
                  <dl class="booking-meta">
                    <div><dt>Oluşturulma</dt><dd>{{ booking.created_at | date:'dd.MM.yyyy HH:mm' }}</dd></div>
                    @if (booking.start_at) {<div><dt>Başlangıç</dt><dd>{{ booking.start_at | date:'dd.MM.yyyy HH:mm' }}</dd></div>}
                    @if (booking.end_at) {<div><dt>Bitiş</dt><dd>{{ booking.end_at | date:'dd.MM.yyyy HH:mm' }}</dd></div>}
                    @if (booking.total_price !== null && booking.total_price !== undefined) {<div><dt>Tutar</dt><dd>{{ booking.total_price | number:'1.0-2' }} {{ booking.currency }}</dd></div>}
                  </dl>
                  @if (cancelActions.canCancel(booking.status, booking.start_at)) {
                    @if (cancelConfirm() === booking.reference) {
                      <div class="cancel-confirm" role="group" [attr.aria-label]="booking.reference + ' iptal onayı'">
                        <p>Bu talebi iptal etmek istediğinizden emin misiniz?</p>
                        <div><button type="button" (click)="cancelConfirm.set(null)" [disabled]="cancelActions.workingReference() === booking.reference">Vazgeç</button><button type="button" class="danger" (click)="confirmCancel(booking)" [disabled]="cancelActions.workingReference() === booking.reference">{{ cancelActions.workingReference() === booking.reference ? 'İptal ediliyor...' : 'Talebi İptal Et' }}</button></div>
                      </div>
                    } @else {
                      <button type="button" class="cancel-button" (click)="cancelConfirm.set(booking.reference)">Talebi İptal Et</button>
                    }
                  }
                </article>
              } @empty {
                <div class="empty"><strong>Henüz bir talebiniz yok.</strong><span>Araç kiralama, tur veya satış talebi oluşturduğunuzda burada görünecek.</span><a routerLink="/">Hizmetleri İncele</a></div>
              }
            </div>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.account-page{min-height:100vh;background:#060a12;color:#f4f6f8;padding:clamp(14px,3vw,34px)}.shell{width:min(100%,1180px);margin:auto}.account-header{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding:.3rem 0 1.3rem;border-bottom:1px solid #263548}.eyebrow{margin:0;color:#c6a15b;font-size:.58rem;font-weight:950;letter-spacing:.14em}.account-header h1,.status-overview h2,.history h2,.loyalty-overview h2{margin:.3rem 0 0;font:700 clamp(1.5rem,4vw,2.35rem)/1.05 Georgia,serif}.account-header>div>span,.status-overview header span,.loyalty-overview header span{display:block;margin-top:.35rem;color:#98a6b8;font-size:.72rem}.header-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.45rem}.header-actions a,.header-actions button,.status-overview header button{display:inline-flex;min-height:44px;align-items:center;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 .85rem;color:#f8fafc;text-decoration:none;font-weight:900;font-size:.7rem}.header-actions .admin-entry{border-color:#b58d42;background:#c6a15b;color:#111827}.header-actions .logout{color:#fda4af}.notice,.loading{margin:1rem 0 0;border-radius:13px;padding:.8rem .95rem;font-size:.75rem;font-weight:800}.notice.success{background:#0b2d25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #263548;background:#0b1420;color:#a8b4c7}.action-grid{display:grid;gap:.7rem;margin-top:1.2rem}.action-grid a{display:block;border:1px solid #27364a;border-radius:17px;background:#0b1420;padding:1rem;color:#fff;text-decoration:none;box-shadow:0 12px 28px rgba(0,0,0,.14)}.action-grid a.documents{border-color:#6f5930;background:linear-gradient(145deg,#141811,#0b1420)}.action-grid small,.action-grid strong,.action-grid span{display:block}.action-grid small{color:#c6a15b;font-size:.55rem;font-weight:950;letter-spacing:.13em}.action-grid strong{margin-top:.25rem;font-size:.9rem}.action-grid span{margin-top:.35rem;color:#91a0b2;font-size:.65rem;line-height:1.5}.loyalty-overview,.status-overview,.history{margin-top:1rem;border:1px solid #27364a;border-radius:20px;background:#0b1420;overflow:hidden}.loyalty-overview{border-color:#6f5930;background:linear-gradient(145deg,#15160f,#0b1420 55%)}.loyalty-overview>header,.status-overview>header,.history>header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid #253448}.loyalty-overview h2,.status-overview h2,.history h2{font-size:1.3rem}.points-balance{flex:none;color:#f6d78b;font-size:1.7rem;text-align:right}.points-balance small{display:block;color:#9f8b60;font-size:.58rem;text-transform:uppercase}.loyalty-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem;padding:1rem}.loyalty-grid article,.summary-grid article{border:1px solid #263548;border-radius:13px;background:#09111d;padding:.85rem}.loyalty-grid small,.loyalty-grid strong,.loyalty-grid span,.summary-grid small,.summary-grid strong{display:block}.loyalty-grid small,.summary-grid small{color:#91a0b2;font-size:.6rem;font-weight:850}.loyalty-grid strong,.summary-grid strong{margin-top:.2rem;font-size:1.4rem}.loyalty-grid span{margin-top:.15rem;color:#6f8095;font-size:.58rem}.points-ledger{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;border-top:1px solid #253448;border-bottom:1px solid #253448;background:#253448}.points-ledger article{display:flex;justify-content:space-between;gap:.5rem;background:#0a1320;padding:.72rem}.points-ledger span{color:#8fa0b3;font-size:.62rem}.points-ledger strong{font-size:.7rem}.lifetime-spend{display:grid;gap:.55rem;padding:1rem}.lifetime-spend article{border-radius:12px;background:#101a27;padding:.8rem}.lifetime-spend small,.lifetime-spend strong,.lifetime-spend span{display:block}.lifetime-spend small{color:#c6a15b;font-size:.58rem;font-weight:900}.lifetime-spend strong{margin-top:.18rem}.lifetime-spend span{margin-top:.18rem;color:#8493a6;font-size:.6rem}.loyalty-note{margin:0;padding:0 1rem 1rem;color:#8999ad;font-size:.62rem;line-height:1.55}.summary-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem;padding:1rem}.booking-list{display:grid;gap:.7rem;padding:.8rem}.booking-card{border:1px solid #263548;border-radius:16px;background:#08111e;padding:.9rem}.booking-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem}.booking-identity{display:flex;min-width:0;align-items:center;gap:.65rem}.booking-identity img{width:58px;height:46px;flex:none;border-radius:9px;object-fit:cover}.booking-identity div{min-width:0}.booking-identity small,.booking-identity strong,.booking-identity span{display:block}.booking-identity small{color:#c6a15b;font-size:.55rem;font-weight:950}.booking-identity strong{margin-top:.15rem;overflow:hidden;text-overflow:ellipsis;font-size:.82rem;white-space:nowrap}.booking-identity span{margin-top:.18rem;color:#718096;font-size:.58rem}.status{flex:none;border-radius:999px;padding:.32rem .55rem;font-size:.57rem;font-weight:950}.status.pending{background:#30270f;color:#fde68a}.status.approved{background:#0a3024;color:#a7f3d0}.status.completed{background:#102b43;color:#bfdbfe}.status.rejected,.status.cancelled{background:#35131b;color:#fecdd3}.status-copy{margin:.7rem 0 0;color:#b5c0cf;font-size:.68rem;line-height:1.55}.booking-meta{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin:.75rem 0 0}.booking-meta>div{border-radius:10px;background:#0e1724;padding:.55rem}.booking-meta dt{color:#718096;font-size:.54rem;font-weight:900;text-transform:uppercase}.booking-meta dd{margin:.15rem 0 0;font-size:.65rem;font-weight:850}.cancel-button,.cancel-confirm button{min-height:42px;border:1px solid #5f3340;border-radius:10px;background:transparent;padding:0 .75rem;color:#fda4af;font-size:.66rem;font-weight:900}.cancel-button{margin-top:.75rem}.cancel-confirm{margin-top:.75rem;border:1px solid #59303b;border-radius:12px;background:#1e1117;padding:.75rem}.cancel-confirm p{margin:0;color:#fecdd3;font-size:.68rem}.cancel-confirm>div{display:flex;gap:.45rem;margin-top:.6rem}.cancel-confirm button{color:#e2e8f0}.cancel-confirm .danger{background:#9f1239;border-color:#9f1239;color:#fff}.empty{display:grid;place-items:start;gap:.45rem;padding:1.4rem;color:#a7b2c0}.empty strong{color:#fff}.empty span{font-size:.72rem}.empty a{display:inline-flex;min-height:42px;align-items:center;border-radius:10px;background:#315e86;padding:0 .8rem;color:#fff;text-decoration:none;font-size:.68rem;font-weight:900}a:focus-visible,button:focus-visible{outline:3px solid #7899b8;outline-offset:2px}@media(min-width:720px){.action-grid{grid-template-columns:repeat(4,1fr)}.loyalty-grid{grid-template-columns:repeat(3,1fr)}.points-ledger{grid-template-columns:repeat(3,1fr)}.lifetime-spend{grid-template-columns:repeat(2,1fr)}.summary-grid{grid-template-columns:repeat(4,1fr)}.booking-meta{grid-template-columns:repeat(4,1fr)}}@media(max-width:680px){.account-header,.loyalty-overview>header{display:block}.points-balance{text-align:left;margin-top:.8rem}.header-actions{justify-content:flex-start;margin-top:.8rem}.header-actions>*{flex:1 1 auto;justify-content:center}.booking-top{display:block}.status{display:inline-block;margin-top:.6rem}.booking-meta{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  `],
})
export class AccountDashboardV150Component implements OnInit {
  readonly account = inject(CustomerAccountService);
  readonly auth = inject(CustomerAuthService);
  readonly cancelActions = inject(CustomerBookingActionsService);
  readonly adminBridge = inject(ProfileAdminBridgeService);
  private readonly router = inject(Router);
  readonly cancelConfirm = signal<string | null>(null);
  readonly pageMessage = signal('');
  readonly pageError = signal('');
  readonly adminOpening = signal(false);
  readonly displayName = computed(() => accountName(this.account.profile()?.full_name, this.auth.user()?.email));

  async ngOnInit(): Promise<void> { await Promise.allSettled([this.reload(), this.adminBridge.refresh()]); }
  async reload(): Promise<void> { this.pageError.set('');try{await this.account.refresh();}catch{this.pageError.set('Hesap bilgileriniz şu anda yenilenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');} }
  countStatus(status: string): number { return this.account.bookings().filter((row) => row.status === status).length; }
  tenureLabel():string{const value=this.account.lifetimeSummary();if(!value)return'';if(value.tenureFullYears>0)return`${value.tenureFullYears} yıl ${value.tenureMonths%12} aydır müşteri`;return`${value.tenureMonths} aydır müşteri`;}
  engagementLabel(value:string):string{if(value==='LONG_TERM')return'Uzun dönem müşteri';if(value==='LOYAL')return'Sadık müşteri';if(value==='REGULAR')return'Düzenli müşteri';return'Yeni müşteri';}
  spendEntries():Array<{currency:string;spent:number;saved:number;transactions:number}>{const spend=this.account.lifetimeSummary()?.spendByCurrency||{};return Object.entries(spend).map(([currency,row])=>({currency,spent:Number(row.spent||0),saved:Number(row.saved||0),transactions:Number(row.transactions||0)})).sort((a,b)=>b.spent-a.spent);}
  typeLabel(value: string): string { if(value==='RENTAL')return'Araç Kiralama';if(value==='TOUR')return'Tur Rezervasyonu';if(value==='SALE_INQUIRY')return'Satın Alma Talebi';if(value==='APPOINTMENT')return'Randevu Talebi';return'Talep'; }
  statusLabel(value: string): string { if(value==='APPROVED')return'Onaylandı';if(value==='REJECTED')return'Onaylanmadı';if(value==='COMPLETED')return'Tamamlandı';if(value==='CANCELLED')return'İptal Edildi';return'İnceleniyor'; }
  statusClass(value: string): string { if(value==='APPROVED')return'approved';if(value==='REJECTED')return'rejected';if(value==='COMPLETED')return'completed';if(value==='CANCELLED')return'cancelled';return'pending'; }
  statusDescription(booking: CustomerBooking): string {if(booking.status==='APPROVED')return'Talebiniz onaylandı. İşlem ayrıntıları için ekibimiz gerektiğinde sizinle iletişime geçecektir.';if(booking.status==='REJECTED')return'Talebiniz bu aşamada onaylanmadı. Ayrıntı veya alternatif seçenekler için destek ekibimizle iletişime geçebilirsiniz.';if(booking.status==='COMPLETED')return'Bu işlem tamamlandı. Geçmiş kayıt olarak hesabınızda saklanır.';if(booking.status==='CANCELLED')return'Bu talep iptal edildi ve artık aktif işlem olarak değerlendirilmez.';return'Talebiniz başarıyla alındı ve ekibimiz tarafından inceleniyor. Durum değiştiğinde bu bölüm güncellenir.';}
  async confirmCancel(booking: CustomerBooking): Promise<void> {this.pageMessage.set('');this.pageError.set('');try{await this.cancelActions.cancel(booking.reference);this.cancelConfirm.set(null);this.pageMessage.set('Talebiniz başarıyla iptal edildi. Güncel durum işlem geçmişinize işlendi.');await this.account.refresh();}catch(error){this.pageError.set(error instanceof Error?error.message:'Talep iptal edilemedi.');}}
  async openAdmin(): Promise<void> {if(this.adminOpening())return;this.adminOpening.set(true);this.pageError.set('');try{await this.adminBridge.openAdmin();}catch(error){this.pageError.set(error instanceof Error?error.message:'Yönetim paneli açılamadı.');this.adminOpening.set(false);}}
  async logout(): Promise<void> {await this.auth.logout();this.account.clearLocalProfile();void this.router.navigate(['/account/login']);}
}

function accountName(fullName?: string | null, email?: string | null): string {const name=String(fullName||'').trim();if(name)return name;const local=String(email||'').split('@')[0].replace(/[._-]+/g,' ').trim();return local?local.replace(/\b\w/g,(letter)=>letter.toLocaleUpperCase('tr-TR')):'Hesabım';}
