import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerLifetimeAdminService } from '../services/customer-lifetime-admin.service';

@Component({
  selector:'app-admin-customer-lifetime-panel',
  standalone:true,
  imports:[CommonModule],
  template:`
    <aside class="customer-360" aria-label="Müşteri yaşam boyu özeti">
      @if(!open()){
        <button type="button" class="launcher" (click)="open.set(true)" aria-expanded="false"><span><small>MÜŞTERİ 360</small><strong>{{headline()}}</strong></span><b>Detay</b></button>
      }@else{
        <section class="panel" aria-labelledby="customer-360-title">
          <header><div><small>MÜŞTERİ 360</small><h2 id="customer-360-title">Yaşam boyu müşteri değeri</h2></div><button type="button" (click)="open.set(false)" aria-label="Müşteri 360 panelini kapat">×</button></header>
          @if(service.loading()){<p class="state">Müşteri geçmişi hesaplanıyor…</p>}
          @else if(service.summary();as s){
            <div class="hero"><div><strong>{{tenure()}}</strong><span>{{engagement(s.engagementBand)}} · {{s.tier}} seviye</span></div><div><strong>{{s.pointsBalance|number}}</strong><span>mevcut puan</span></div></div>
            <div class="metric-grid">
              <article><small>Kiralama</small><strong>{{s.completedRentals}}</strong></article>
              <article><small>Tur</small><strong>{{s.completedTours}}</strong></article>
              <article><small>Satış</small><strong>{{s.completedSales}}</strong></article>
              <article><small>Toplam</small><strong>{{s.completedTotal}}</strong></article>
              <article><small>Kampanya</small><strong>{{s.campaignsCompleted}}</strong></article>
              <article><small>Davet</small><strong>{{s.successfulReferrals}}</strong></article>
            </div>
            <section class="block"><h3>Puan hareketleri</h3><dl><div><dt>Kazanılan</dt><dd>+{{s.pointsEarned|number}}</dd></div><div><dt>Kullanılan</dt><dd>-{{s.pointsRedeemedGross|number}}</dd></div><div><dt>İade</dt><dd>+{{s.pointsRedemptionRefunded|number}}</dd></div><div><dt>Net kullanım</dt><dd>{{s.pointsRedeemedNet|number}}</dd></div><div><dt>Süresi dolan</dt><dd>{{s.pointsExpired|number}}</dd></div><div><dt>Davet puanı</dt><dd>+{{s.referralPointsEarned|number}}</dd></div></dl></section>
            <section class="block"><h3>Tamamlanan harcama</h3>@for(entry of spend();track entry.currency){<article class="spend"><strong>{{entry.spent|number:'1.0-2'}} {{entry.currency}}</strong><span>{{entry.transactions}} işlem · {{entry.saved|number:'1.0-2'}} {{entry.currency}} avantaj</span></article>}@empty{<p class="state compact">Tamamlanan harcama bulunmuyor.</p>}</section>
            <section class="block"><h3>İlişki geçmişi</h3><dl><div><dt>Müşteri başlangıcı</dt><dd>{{s.customerSince|date:'dd.MM.yyyy'}}</dd></div><div><dt>İlk tamamlanan</dt><dd>{{s.firstCompletedAt?(s.firstCompletedAt|date:'dd.MM.yyyy'):'-'}}</dd></div><div><dt>Son tamamlanan</dt><dd>{{s.lastCompletedAt?(s.lastCompletedAt|date:'dd.MM.yyyy'):'-'}}</dd></div><div><dt>Referral indirimi</dt><dd>{{s.referralDiscountUses}} kullanım</dd></div></dl></section>
          }@else{<p class="state error">Müşteri yaşam boyu özeti yüklenemedi.</p>}
        </section>
      }
    </aside>
  `,
  styles:[`
    :host{position:fixed;z-index:140;right:16px;bottom:18px;pointer-events:none}.customer-360{width:min(430px,calc(100vw - 24px));pointer-events:auto}.launcher,.panel{width:100%;border:1px solid #c9a85f;border-radius:18px;background:#0f172a;color:#fff;box-shadow:0 20px 50px rgba(15,23,42,.35)}.launcher{display:flex;min-height:62px;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;text-align:left}.launcher small,.launcher strong{display:block}.launcher small,.panel header small{color:#e7c77b;font-size:9px;font-weight:950;letter-spacing:.13em}.launcher strong{margin-top:2px;font-size:12px}.launcher b{border-radius:999px;background:#d4af37;padding:7px 10px;color:#111827;font-size:10px}.panel{max-height:min(78vh,760px);overflow:auto;padding:14px}.panel header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.panel h2{margin:3px 0 0;font-size:20px}.panel header button{display:grid;width:38px;height:38px;place-items:center;border:1px solid #334155;border-radius:11px;background:#111827;color:#fff;font-size:20px}.hero{display:grid;grid-template-columns:1.3fr .7fr;gap:8px;margin-top:13px}.hero>div{border:1px solid #334155;border-radius:13px;background:#111827;padding:11px}.hero strong,.hero span{display:block}.hero strong{font-size:16px}.hero span{margin-top:3px;color:#94a3b8;font-size:9px}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.metric-grid article{border-radius:11px;background:#111827;padding:9px}.metric-grid small,.metric-grid strong{display:block}.metric-grid small{color:#94a3b8;font-size:8px}.metric-grid strong{margin-top:2px;font-size:16px}.block{margin-top:10px;border-top:1px solid #334155;padding-top:10px}.block h3{margin:0 0 7px;color:#e7c77b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.block dl{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0}.block dl>div,.spend{border-radius:9px;background:#111827;padding:8px}.block dt{color:#7f8da1;font-size:8px;text-transform:uppercase}.block dd{margin:2px 0 0;font-size:10px;font-weight:900}.spend+.spend{margin-top:6px}.spend strong,.spend span{display:block}.spend span{margin-top:2px;color:#94a3b8;font-size:9px}.state{margin:12px 0 0;border-radius:10px;background:#111827;padding:10px;color:#aab6c6;font-size:10px}.state.compact{margin:0}.state.error{color:#fecaca}@media(max-width:600px){:host{right:12px;bottom:12px;left:12px}.customer-360{width:100%}.panel{max-height:72vh}}`]
})
export class AdminCustomerLifetimePanelComponent implements OnInit{
  readonly service=inject(CustomerLifetimeAdminService);private readonly router=inject(Router);readonly open=signal(false);readonly userId=computed(()=>this.extractUserId(this.router.url));
  async ngOnInit():Promise<void>{const id=this.extractUserId(this.router.url);if(id)await this.service.load(id).catch(()=>undefined);}
  headline():string{const s=this.service.summary();return s?`${this.tenure()} · ${s.completedTotal} tamamlanan işlem`:'Müşteri geçmişini görüntüle';}
  tenure():string{const s=this.service.summary();if(!s)return'';return s.tenureFullYears>0?`${s.tenureFullYears} yıl ${s.tenureMonths%12} ay`:s.tenureMonths>0?`${s.tenureMonths} ay`:`${s.tenureDays} gün`;}
  engagement(value:string):string{return value==='LONG_TERM'?'Uzun dönem':value==='LOYAL'?'Sadık':value==='REGULAR'?'Düzenli':'Yeni müşteri';}
  spend():Array<{currency:string;spent:number;saved:number;transactions:number}>{const raw=this.service.summary()?.spendByCurrency||{};return Object.entries(raw).map(([currency,row])=>({currency,spent:Number(row.spent||0),saved:Number(row.saved||0),transactions:Number(row.transactions||0)})).sort((a,b)=>b.spent-a.spent);}
  private extractUserId(url:string):string{const path=url.split('?')[0].split('#')[0];const match=/^\/admin\/customers\/([0-9a-f-]{36})$/i.exec(path);return match?.[1]||'';}
}
