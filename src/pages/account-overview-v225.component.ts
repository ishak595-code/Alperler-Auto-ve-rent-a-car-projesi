import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerAccountService, CustomerBooking } from '../services/customer-account.service';
import { CustomerAuthService } from '../services/customer-auth.service';

@Component({
  selector: 'app-account-overview-v225',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="shell">
        <header class="identity">
          <div class="avatar" aria-hidden="true">
            @if(account.profile()?.avatar_url){<img [src]="account.profile()?.avatar_url" alt=""/>}@else{<span>{{initials()}}</span>}
          </div>
          <div><p>ALPERLER HESABIM</p><h1>{{displayName()}}</h1><span>{{account.profile()?.email || auth.user()?.email}}</span></div>
        </header>

        @if(account.loading()){
          <section class="loading" role="status">Hesabınız hazırlanıyor...</section>
        }@else{
          <section class="welcome" aria-labelledby="account-welcome-title">
            <div><p>GENEL BAKIŞ</p><h2 id="account-welcome-title">Yolculuklarınız tek yerde</h2><span>Rezervasyonlarınıza, favorilerinize ve hesabınıza hızlıca ulaşın.</span></div>
            <a routerLink="/fleet">Yeni Araç Bul</a>
          </section>

          <section class="metrics" aria-label="Hesap özeti">
            <a [routerLink]="['/account']" [queryParams]="{view:'bookings'}"><small>AKTİF</small><strong>{{activeCount()}}</strong><span>Rezervasyon ve talepler</span></a>
            <a [routerLink]="['/account']" [queryParams]="{view:'bookings'}"><small>TAMAMLANAN</small><strong>{{completedCount()}}</strong><span>Geçmiş işlemler</span></a>
            <a href="#loyalty-summary"><small>ALPERLER PUAN</small><strong>{{points() | number}}</strong><span>Mevcut puanınız</span></a>
            <a routerLink="/account/wallet"><small>CÜZDAN</small><strong>{{account.paymentMethods().length}}</strong><span>Kayıtlı kart</span></a>
          </section>

          @if(nextBooking(); as booking){
            <section class="next" aria-labelledby="next-booking-title">
              <header><div><p>SIRADAKİ İŞLEM</p><h2 id="next-booking-title">{{booking.item_name}}</h2></div><a [routerLink]="['/account']" [queryParams]="{view:'bookings'}">Tümünü Gör</a></header>
              <div class="next-body">
                <div><small>REFERANS</small><strong>{{booking.reference}}</strong></div>
                @if(booking.start_at){<div><small>BAŞLANGIÇ</small><strong>{{booking.start_at | date:'dd.MM.yyyy HH:mm'}}</strong></div>}
                <div><small>DURUM</small><strong>{{statusLabel(booking.status)}}</strong></div>
                <div><small>ÖDEME</small><strong>{{paymentLabel(booking.payment_status)}}</strong></div>
              </div>
            </section>
          }

          <section class="quick" aria-labelledby="quick-title">
            <header><p>HIZLI İŞLEMLER</p><h2 id="quick-title">Ne yapmak istersiniz?</h2></header>
            <div>
              <a [routerLink]="['/account']" [queryParams]="{view:'bookings'}"><b>Rezervasyonlarım</b><span>Aktif ve geçmiş işlemlerinizi görün.</span></a>
              <a routerLink="/fleet" [queryParams]="{favs:true}"><b>Favorilerim</b><span>Kaydettiğiniz araç, tur ve içeriklere dönün.</span></a>
              <a [routerLink]="['/account']" [queryParams]="{view:'settings'}"><b>Profil Ayarları</b><span>İletişim bilgilerinizi ve parolanızı yönetin.</span></a>
              <a routerLink="/account/wallet"><b>Cüzdan ve Belgeler</b><span>Kayıtlı kartlarınızı ve belgelerinizi yönetin.</span></a>
            </div>
          </section>

          <section id="loyalty-summary" class="loyalty" aria-label="Sadakat özeti">
            <div><p>ALPERLER AVANTAJ</p><h2>{{account.lifetimeSummary()?.tier || account.loyalty()?.tier || 'Başlangıç'}} seviye</h2><span>Her yolculukta hesabınızdaki avantajları büyütün.</span></div>
            <strong>{{points() | number}} puan</strong>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100dvh;background:#060a12;color:#f5f7fb;padding:16px 14px calc(104px + env(safe-area-inset-bottom))}.shell{width:min(100%,1080px);margin:auto}.identity{display:flex;align-items:center;gap:12px;border-bottom:1px solid #243247;padding:3px 0 16px}.avatar{display:grid;width:56px;height:56px;flex:none;place-items:center;overflow:hidden;border:1px solid #3a4b63;border-radius:17px;background:#111b2a;color:#f2d17c;font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.identity p,.welcome p,.next p,.quick p,.loyalty p{margin:0;color:#c9a75b;font-size:9px;font-weight:950;letter-spacing:.15em}.identity h1{margin:3px 0 0;font:750 24px/1.05 Georgia,serif}.identity>div>span{display:block;margin-top:4px;color:#8fa0b5;font-size:11px}.loading{margin-top:14px;border:1px solid #27364a;border-radius:14px;background:#0b1420;padding:18px;color:#aab6c5}.welcome{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:28px 0 18px}.welcome h2,.next h2,.quick h2,.loyalty h2{margin:5px 0 0;font:750 clamp(25px,6vw,36px)/1.02 Georgia,serif}.welcome span,.loyalty span{display:block;margin-top:7px;color:#91a0b4;font-size:12px;line-height:1.55}.welcome>a,.next header>a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid #40536b;border-radius:12px;background:#111c2c;padding:0 14px;color:#fff;text-decoration:none;font-size:10px;font-weight:900}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.metrics a{min-width:0;border:1px solid #27364a;border-radius:16px;background:#0b1420;padding:14px;color:#fff;text-decoration:none}.metrics small,.next small{display:block;color:#7f90a7;font-size:8px;font-weight:950;letter-spacing:.08em}.metrics strong{display:block;margin-top:5px;font-size:25px}.metrics span{display:block;margin-top:3px;color:#91a0b4;font-size:9px;line-height:1.35}.next,.quick,.loyalty{margin-top:14px;border:1px solid #27364a;border-radius:18px;background:#0b1420;padding:15px}.next header{display:flex;align-items:center;justify-content:space-between;gap:12px}.next h2{font-size:22px}.next-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.next-body>div{border-radius:12px;background:#08111e;padding:11px}.next-body strong{display:block;margin-top:4px;font-size:11px;overflow-wrap:anywhere}.quick>div{display:grid;gap:8px;margin-top:13px}.quick a{display:block;border:1px solid #2d3d52;border-radius:13px;background:#0d1725;padding:13px;color:#fff;text-decoration:none}.quick b,.quick span{display:block}.quick b{font-size:12px}.quick span{margin-top:4px;color:#8fa0b5;font-size:10px;line-height:1.45}.loyalty{display:flex;align-items:center;justify-content:space-between;gap:14px;background:linear-gradient(135deg,#101827,#17150f)}.loyalty h2{font-size:20px}.loyalty>strong{flex:none;color:#f1d27d;font-size:18px}a:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}@media(min-width:720px){.page{padding:24px 24px 110px}.metrics{grid-template-columns:repeat(4,minmax(0,1fr))}.quick>div{grid-template-columns:repeat(2,minmax(0,1fr))}.next-body{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `],
})
export class AccountOverviewV225Component implements OnInit {
  readonly account=inject(CustomerAccountService);
  readonly auth=inject(CustomerAuthService);
  readonly displayName=computed(()=>this.account.profile()?.full_name?.trim()||this.auth.user()?.email?.split('@')[0]||'Alperler Müşterisi');
  readonly initials=computed(()=>this.displayName().split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toLocaleUpperCase('tr-TR')||'').join('')||'A');
  readonly activeCount=computed(()=>this.account.bookings().filter(b=>['PENDING','APPROVED'].includes(b.status)).length);
  readonly completedCount=computed(()=>this.account.bookings().filter(b=>b.status==='COMPLETED').length);
  readonly points=computed(()=>Number(this.account.lifetimeSummary()?.pointsBalance??this.account.loyalty()?.points_balance??0));
  readonly nextBooking=computed<CustomerBooking|null>(()=>{
    const now=Date.now();
    return [...this.account.bookings()].filter(b=>['PENDING','APPROVED'].includes(b.status)).sort((a,b)=>this.time(a.start_at,now)-this.time(b.start_at,now))[0]||null;
  });
  async ngOnInit(){try{await this.account.refresh();}catch{/* Customer-facing empty states remain usable. */}}
  statusLabel(status:string){return({PENDING:'İnceleniyor',APPROVED:'Onaylandı',COMPLETED:'Tamamlandı',REJECTED:'Onaylanmadı',CANCELLED:'İptal edildi'} as Record<string,string>)[status]||status;}
  paymentLabel(status:string){return({PENDING:'Ödeme bekleniyor',AUTHORIZED:'İşlem onaylandı',PAID:'Ödendi',PARTIALLY_PAID:'Kısmi ödeme',NOT_REQUIRED:'Ödeme gerekmiyor',FAILED:'Ödeme tamamlanmadı',REFUNDED:'İade edildi'} as Record<string,string>)[status]||'Bekleniyor';}
  private time(value:string|null|undefined,fallback:number){if(!value)return fallback+Number.MAX_SAFE_INTEGER/4;const t=new Date(value).getTime();return Number.isFinite(t)?t:fallback+Number.MAX_SAFE_INTEGER/4;}
}
