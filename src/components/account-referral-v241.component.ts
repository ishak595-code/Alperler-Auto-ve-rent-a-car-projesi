import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerAccountService } from '../services/customer-account.service';

@Component({
  selector:'app-account-referral-v241',
  standalone:true,
  imports:[CommonModule,RouterLink],
  template:`
    <section class="referral" aria-labelledby="referral-v241-title">
      <button type="button" class="summary" (click)="toggle()" [attr.aria-expanded]="open()" aria-controls="referral-v241-panel">
        <span><small>ARKADAŞINI DAVET ET</small><strong id="referral-v241-title">Sen de kazan, arkadaşın da kazansın</strong><em>{{summaryText()}}</em></span><b aria-hidden="true">{{open()?'−':'+'}}</b>
      </button>
      @if(open()){
        <div id="referral-v241-panel" class="body">
          @if(loading()){<p class="state" role="status">Davet bilgileriniz hazırlanıyor...</p>}
          @else if(account.referralSummary(); as referral){
            <div class="invite">
              <span>KİŞİSEL DAVET KODUNUZ</span><strong>{{referral.code}}</strong>
              <label><span>Davet bağlantısı</span><input [value]="referralLink()" readonly aria-label="Kişisel davet bağlantısı" /></label>
              <div class="actions"><button type="button" (click)="copyReferralLink()">Linki Kopyala</button><button type="button" class="secondary" (click)="shareReferralLink()">Paylaş</button></div>
              @if(notice()){<p class="notice" role="status" aria-live="polite">{{notice()}}</p>}
              @if(error()){<p class="error" role="alert" aria-live="assertive">{{error()}}</p>}
            </div>
            @if(account.loyaltySettings(); as settings){
              <div class="rewards">
                <article><small>KİRALAMA</small><strong>+{{settings.referral_rental_inviter_points | number:'1.0-0'}} puan</strong></article>
                <article><small>ARAÇ SATIŞI</small><strong>+{{settings.referral_sale_inviter_points | number:'1.0-0'}} puan</strong></article>
                <article><small>TUR</small><strong>+{{settings.referral_tour_inviter_points | number:'1.0-0'}} puan</strong></article>
              </div>
            }
            <div class="stats"><div><span>Kayıt olan</span><strong>{{referral.registered}}</strong></div><div><span>Bekleyen</span><strong>{{referral.pending}}</strong></div><div><span>Ödüllenen</span><strong>{{referral.rewarded}}</strong></div><div><span>Kazanılan puan</span><strong>{{referral.pointsEarned | number:'1.0-0'}}</strong></div></div>
            @if(account.nextReferralMilestone(); as milestone){<p class="milestone">{{milestone.remaining}} başarılı davet sonra +{{milestone.bonus | number:'1.0-0'}} bonus puan</p>}
            <a routerLink="/campaigns" class="campaign">Kampanyaları ve fırsatları gör</a>
          } @else {<p class="state">Davet kodunuz şu anda hazırlanamadı. Bölümü kapatıp yeniden açarak tekrar deneyebilirsiniz.</p>}
        </div>
      }
    </section>
  `,
  styles:[`
    :host{display:block}.referral{overflow:hidden;border:1px solid #37485f;border-radius:16px;background:linear-gradient(145deg,#0c1725,#08111d);color:#f4f6f8}.summary{display:flex;width:100%;min-height:82px;align-items:center;justify-content:space-between;gap:1rem;border:0;background:transparent;padding:14px;color:#fff;text-align:left}.summary small,.summary strong,.summary em{display:block}.summary small{color:#c6a15b;font-size:.54rem;font-weight:950;letter-spacing:.12em}.summary strong{margin-top:.2rem;font-size:.84rem}.summary em{margin-top:.2rem;color:#8f9eb0;font-size:.61rem;font-style:normal;line-height:1.45}.summary>b{font-size:1.25rem;color:#a7bed8}.body{display:grid;gap:.75rem;border-top:1px solid #263548;padding:13px}.invite{border:1px solid #304158;border-radius:13px;background:#07101c;padding:12px}.invite>span{color:#94a3b8;font-size:.54rem;font-weight:950;letter-spacing:.1em}.invite>strong{display:block;margin:.25rem 0 .7rem;color:#f6d78b;font:800 1.25rem Georgia,serif;letter-spacing:.08em}.invite label{display:grid;gap:.3rem}.invite label span{font-size:.6rem;color:#cbd5e1}.invite input{width:100%;min-height:43px;border:1px solid #304158;border-radius:9px;background:#050b13;padding:0 .65rem;color:#cbd5e1}.actions{display:flex;gap:.5rem;margin-top:.6rem}.actions button,.campaign{display:inline-flex;min-height:43px;align-items:center;justify-content:center;border:0;border-radius:9px;background:#315e86;padding:0 .75rem;color:#fff;font-size:.63rem;font-weight:950;text-decoration:none}.actions .secondary{border:1px solid #304158;background:#0e1724}.rewards,.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem}.rewards article,.stats div{border:1px solid #263548;border-radius:11px;background:#0b1420;padding:.65rem}.rewards small,.rewards strong,.stats span,.stats strong{display:block}.rewards small,.stats span{color:#8e9bad;font-size:.52rem}.rewards strong,.stats strong{margin-top:.2rem;font-size:.76rem}.rewards strong{color:#f6d78b}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.milestone,.state{margin:0;border-radius:10px;background:#111a28;padding:.7rem;color:#cbd5e1;font-size:.63rem;line-height:1.45}.campaign{width:100%;background:#1b1820;color:#f6d78b;border:1px solid #6f5a31}.notice,.error{margin:.55rem 0 0;font-size:.62rem;font-weight:850}.notice{color:#86efac}.error{color:#fda4af}.summary:focus-visible,.actions button:focus-visible,.campaign:focus-visible,input:focus-visible{outline:3px solid #7899b8;outline-offset:3px}@media(min-width:720px){.stats{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:480px){.rewards{grid-template-columns:1fr}}
  `]
})
export class AccountReferralV241Component implements OnInit {
  readonly account=inject(CustomerAccountService);readonly open=signal(false);readonly loading=signal(false);readonly notice=signal('');readonly error=signal('');
  async ngOnInit():Promise<void>{if(!this.account.referralSummary())await this.refresh().catch(()=>undefined);}
  async toggle():Promise<void>{this.open.update(value=>!value);if(this.open()&&!this.account.referralSummary())await this.refresh();}
  summaryText():string{const referral=this.account.referralSummary();return referral?`${referral.successfulReferrals} başarılı davet, ${referral.pointsEarned} puan kazanıldı`:'Kişisel davet kodunuzu ve ödüllerinizi görüntüleyin';}
  referralLink():string{return this.account.referralLink();}
  async copyReferralLink():Promise<void>{this.notice.set('');this.error.set('');const link=this.referralLink();if(!link){this.error.set('Davet bağlantısı hazırlanamadı.');return;}try{await navigator.clipboard.writeText(link);this.notice.set('Davet bağlantısı kopyalandı.');}catch{this.error.set('Bağlantı otomatik kopyalanamadı. Alandan seçerek kopyalayabilirsiniz.');}}
  async shareReferralLink():Promise<void>{this.notice.set('');this.error.set('');const link=this.referralLink();if(!link){this.error.set('Davet bağlantısı hazırlanamadı.');return;}if(typeof navigator.share==='function'){try{await navigator.share({title:'Alperler Rent A Car',text:'Alperler Rent A Car davet bağlantımla katıl.',url:link});return;}catch(e){if(e instanceof DOMException&&e.name==='AbortError')return;}}await this.copyReferralLink();}
  private async refresh():Promise<void>{if(this.loading())return;this.loading.set(true);this.error.set('');try{await this.account.refresh();}catch{this.error.set('Davet bilgileri şu anda yüklenemedi.');}finally{this.loading.set(false);}}
}
