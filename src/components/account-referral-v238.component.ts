import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerAccountService } from '../services/customer-account.service';

@Component({
  selector:'app-account-referral-v238',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
    <section class="referral-card" aria-labelledby="account-referral-title">
      <header class="referral-head">
        <div>
<p>ARKADAŞINI DAVET ET</p>
<h2 id="account-referral-title">Sen de kazan, arkadaşın da kazansın</h2>
<span>Kişisel davet bağlantınızı paylaşın. Arkadaşınız uygun kiralama, araç satın alma veya tur işlemini tamamladığında ödüller hesabınıza işlenir.</span>
        </div>
        <a routerLink="/campaigns" class="campaign-link">Kampanyalı Araçları ve Fırsatları Gör</a>
      </header>

      @if(account.referralSummary(); as referral){
        @if(account.loyaltySettings(); as settings){
<div class="referral-body">
  <div class="invite-box">
    <span class="invite-label">KİŞİSEL DAVET KODUNUZ</span>
    <strong>{{referral.code}}</strong>
    <label class="invite-link"><span>Davet bağlantısı</span><input [value]="referralLink()" readonly aria-label="Kişisel davet bağlantısı" /></label>
    <div class="invite-actions">
      <button type="button" (click)="copyReferralLink()">Davet Linkini Kopyala</button>
      <button type="button" class="secondary" (click)="shareReferralLink()">Paylaş</button>
    </div>
    @if(notice()){<p class="notice" role="status">{{notice()}}</p>}
    @if(error()){<p class="error" role="alert">{{error()}}</p>}
  </div>

  <div class="reward-grid" aria-label="Davet ödülleri">
    <article><span>KİRALAMA</span><strong>+{{settings.referral_rental_inviter_points | number:'1.0-0'}} puan</strong><p>Arkadaşınız +{{settings.referral_rental_invitee_points | number:'1.0-0'}} puan@if(settings.referral_checkout_discount_enabled && settings.referral_rental_invitee_discount>0){ ve {{discountText(settings.referral_rental_invitee_discount)}} davet avantajı} alabilir.</p></article>
    <article><span>ARAÇ SATIŞI</span><strong>+{{settings.referral_sale_inviter_points | number:'1.0-0'}} puan</strong><p>Arkadaşınız +{{settings.referral_sale_invitee_points | number:'1.0-0'}} puan@if(settings.referral_checkout_discount_enabled && settings.referral_sale_invitee_discount>0){ ve {{discountText(settings.referral_sale_invitee_discount)}} davet avantajı} alabilir.</p></article>
    <article><span>TUR</span><strong>+{{settings.referral_tour_inviter_points | number:'1.0-0'}} puan</strong><p>Arkadaşınız +{{settings.referral_tour_invitee_points | number:'1.0-0'}} puan@if(settings.referral_checkout_discount_enabled && settings.referral_tour_invitee_discount>0){ ve {{discountText(settings.referral_tour_invitee_discount)}} davet avantajı} alabilir.</p></article>
  </div>

  <p class="stack-note">{{settings.allow_campaign_referral_stack?'Uygun kampanyalarda davet avantajı kampanyalı fiyatla birlikte kullanılabilir.':'Davet avantajı ile kampanya indirimi aynı işlemde birlikte kullanılamaz.'}}</p>
  <div class="referral-stats">
    <div><span>Kayıt olan</span><strong>{{referral.registered}}</strong></div>
    <div><span>Bekleyen</span><strong>{{referral.pending}}</strong></div>
    <div><span>Ödüllenen</span><strong>{{referral.rewarded}}</strong></div>
    <div><span>Kazanılan puan</span><strong>{{referral.pointsEarned | number:'1.0-0'}}</strong></div>
  </div>
  @if(account.nextReferralMilestone(); as milestone){<div class="milestone"><span>Sonraki davet ödülü</span><strong>{{milestone.remaining}} başarılı davet sonra +{{milestone.bonus | number:'1.0-0'}} bonus puan</strong></div>}
</div>
        } @else { <p class="loading" role="status">Davet programı ayarları şu anda yüklenemedi.</p> }
      } @else { <p class="loading" role="status">Davet kodunuz hazırlanıyor. Profilinizi yenileyip tekrar deneyin.</p> }
    </section>
  `,
  styles:[`
    :host{display:block;margin-top:.85rem}.referral-card{overflow:hidden;border:1px solid #37485f;border-radius:18px;background:linear-gradient(145deg,#0c1725,#08111d);color:#f4f6f8}.referral-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:16px;border-bottom:1px solid #263548}.referral-head>div{max-width:720px}.referral-head p{margin:0;color:#c6a15b;font-size:.56rem;font-weight:950;letter-spacing:.14em}.referral-head h2{margin:.25rem 0 0;font:700 clamp(1.05rem,4vw,1.8rem)/1.08 Georgia,serif}.referral-head span{display:block;margin-top:.35rem;color:#98a6b8;font-size:.68rem;line-height:1.5}.campaign-link{display:inline-flex;min-height:44px;flex:none;align-items:center;border:1px solid #6f5a31;border-radius:11px;background:#1b1820;padding:0 .85rem;color:#f6d78b;font-size:.64rem;font-weight:950;text-decoration:none}.referral-body{display:grid;gap:14px;padding:14px}.invite-box{border:1px solid #304158;border-radius:15px;background:#07101c;padding:13px}.invite-label{display:block;color:#94a3b8;font-size:.55rem;font-weight:950;letter-spacing:.12em}.invite-box>strong{display:block;margin:.35rem 0 .8rem;color:#f6d78b;font:800 1.35rem/1 Georgia,serif;letter-spacing:.08em}.invite-link{display:grid;gap:.35rem}.invite-link span{color:#cbd5e1;font-size:.6rem;font-weight:850}.invite-link input{width:100%;min-height:44px;border:1px solid #304158;border-radius:10px;background:#050b13;padding:0 .7rem;color:#cbd5e1;font:inherit}.invite-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.65rem}.invite-actions button{min-height:44px;border:0;border-radius:10px;background:#315e86;padding:0 .85rem;color:#fff;font-size:.64rem;font-weight:950}.invite-actions .secondary{border:1px solid #304158;background:#0e1724}.notice,.error{margin:.6rem 0 0;font-size:.64rem;font-weight:850}.notice{color:#86efac}.error{color:#fda4af}.reward-grid{display:grid;gap:.7rem}.reward-grid article{border:1px solid #263548;border-radius:14px;background:#0b1420;padding:12px}.reward-grid article>span{color:#94a3b8;font-size:.54rem;font-weight:950;letter-spacing:.1em}.reward-grid article>strong{display:block;margin:.32rem 0;color:#f6d78b;font-size:.92rem}.reward-grid article p{margin:0;color:#9daabd;font-size:.64rem;line-height:1.5}.stack-note{margin:0;border-left:3px solid #c6a15b;background:#121721;padding:.7rem .8rem;color:#cbd5e1;font-size:.64rem;line-height:1.5}.referral-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.55rem}.referral-stats div,.milestone{border:1px solid #263548;border-radius:12px;background:#08111e;padding:.7rem}.referral-stats span,.milestone span{display:block;color:#8492a6;font-size:.55rem;font-weight:850}.referral-stats strong,.milestone strong{display:block;margin-top:.2rem;color:#fff;font-size:.82rem}.milestone strong{color:#f6d78b}.loading{margin:0;padding:16px;color:#aab5c4;font-size:.68rem}.campaign-link:focus-visible,.invite-actions button:focus-visible,input:focus-visible{outline:3px solid #7899b8;outline-offset:3px}@media(min-width:720px){.reward-grid{grid-template-columns:repeat(3,1fr)}.referral-stats{grid-template-columns:repeat(4,1fr)}}@media(max-width:620px){.referral-head{align-items:stretch;flex-direction:column}.campaign-link{width:100%;justify-content:center}}
  `]
})
export class AccountReferralV238Component implements OnInit {
  readonly account=inject(CustomerAccountService);
  readonly notice=signal('');
  readonly error=signal('');
  async ngOnInit():Promise<void>{if(!this.account.referralSummary()||!this.account.loyaltySettings())await this.account.refresh().catch(()=>undefined);}
  referralLink():string{return this.account.referralLink();}
  discountText(value:number):string{const settings=this.account.loyaltySettings();if(!settings||!settings.referral_checkout_discount_enabled||value<=0)return'';const formatted=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(value);return settings.referral_checkout_discount_mode==='PERCENT'?`%${formatted}`:`${formatted} TL`;}
  async copyReferralLink():Promise<void>{this.notice.set('');this.error.set('');const link=this.referralLink();if(!link){this.error.set('Davet bağlantısı şu anda hazırlanamadı.');return;}try{await navigator.clipboard.writeText(link);this.notice.set('Davet bağlantısı kopyalandı.');}catch{this.error.set('Davet bağlantısı kopyalanamadı. Bağlantıyı alandan seçip kopyalayabilirsiniz.');}}
  async shareReferralLink():Promise<void>{this.notice.set('');this.error.set('');const link=this.referralLink();if(!link){this.error.set('Davet bağlantısı şu anda hazırlanamadı.');return;}if(typeof navigator.share==='function'){try{await navigator.share({title:'Alperler Rent A Car',text:'Alperler Rent A Car davet bağlantımla katıl, uygun işlemlerde sen de avantaj kazan.',url:link});this.notice.set('Davet bağlantısı paylaşım için hazırlandı.');return;}catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;}}await this.copyReferralLink();}
}
