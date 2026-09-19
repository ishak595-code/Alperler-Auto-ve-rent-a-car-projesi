import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommercialOfferContextService } from '../services/commercial-offer-context.service';
import { CustomerAccountService } from '../services/customer-account.service';
import { CustomerAuthService } from '../services/customer-auth.service';
import { UiService } from '../services/ui.service';

@Component({
  selector:'app-checkout-loyalty-panel',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
    @if(auth.isLoggedIn() && account.lifetimeSummary(); as lifetime){
      @if(account.loyaltySettings()?.redemption_enabled !== false && lifetime.pointsBalance > 0){
        <aside class="loyalty-panel" [attr.aria-label]="t().loyaltyPanel.panelAria">
          @if(!open()){
            <button type="button" class="summary" (click)="open.set(true)" [attr.aria-expanded]="false">
              <span><small>{{ t().loyaltyPanel.brand }}</small><strong>{{ pointsBalanceLabel(lifetime.pointsBalance) }}</strong></span><b>{{ t().loyaltyPanel.usePoints }}</b>
            </button>
          }@else{
            <section class="sheet" aria-labelledby="checkout-loyalty-title">
              <header><div><small>{{ t().loyaltyPanel.brand }}</small><h2 id="checkout-loyalty-title">{{ t().loyaltyPanel.sheetTitle }}</h2><p>{{ t().loyaltyPanel.balancePrefix }} <strong>{{lifetime.pointsBalance|number}} {{ t().loyaltyPanel.pointsUnit }}</strong></p></div><button type="button" class="close" (click)="open.set(false)" [attr.aria-label]="t().loyaltyPanel.closeAria">×</button></header>
              <label><span>{{ t().loyaltyPanel.pointsLabel }}</span><input type="number" inputmode="numeric" [min]="minimumPoints()" [max]="lifetime.pointsBalance" step="1" [ngModel]="points()" (ngModelChange)="setPoints($event)" /></label>
              <div class="quick" [attr.aria-label]="t().loyaltyPanel.quickAria"><button type="button" (click)="selectRatio(.25)">%25</button><button type="button" (click)="selectRatio(.5)">%50</button><button type="button" (click)="selectRatio(1)">{{ t().loyaltyPanel.all }}</button></div>
              <p class="rule">{{ ruleLabel() }}</p>
              <div class="actions"><button type="button" class="remove" (click)="removePoints()">{{ t().loyaltyPanel.remove }}</button><button type="button" class="apply" (click)="applyPoints()" [disabled]="points()>0 && points()<minimumPoints()">{{ applyLabel() }}</button></div>
              @if(applied()){<p class="applied" role="status">{{ appliedLabel() }}</p>}
            </section>
          }
        </aside>
      }
    }
  `,
  styles:[`
    :host{position:fixed;z-index:95;left:12px;right:12px;bottom:76px;pointer-events:none}.loyalty-panel{width:min(100%,520px);margin:0 auto;pointer-events:auto}.summary,.sheet{width:100%;border:1px solid #8b6f37;border-radius:18px;background:linear-gradient(135deg,#15170e,#101827);box-shadow:0 18px 46px rgba(0,0,0,.4);color:#fff}.summary{display:flex;min-height:64px;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;text-align:left}.summary span small,.summary span strong{display:block}.summary small,.sheet header small{color:#d6b66d;font-size:9px;font-weight:950;letter-spacing:.12em}.summary strong{margin-top:3px;font-size:13px}.summary b{border-radius:999px;background:#d6b66d;padding:8px 11px;color:#111827;font-size:11px}.sheet{padding:14px}.sheet header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sheet h2{margin:3px 0 0;font:900 20px Georgia,serif}.sheet header p{margin:5px 0 0;color:#a9b5c5;font-size:11px}.close{display:grid;width:40px;height:40px;place-items:center;border:1px solid #334155;border-radius:12px;background:#111827;color:#fff;font-size:22px}.sheet label{display:block;margin-top:13px}.sheet label span{display:block;margin-bottom:6px;color:#94a3b8;font-size:10px;font-weight:900;text-transform:uppercase}.sheet input{width:100%;min-height:48px;border:1px solid #475569;border-radius:12px;background:#050b18;padding:0 12px;color:#fff;font-size:16px;font-weight:900}.quick{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.quick button{min-height:40px;border:1px solid #334155;border-radius:10px;background:#0f172a;color:#e2e8f0;font-weight:900}.rule{margin:10px 0 0;color:#8fa0b4;font-size:10px;line-height:1.5}.actions{display:grid;grid-template-columns:.8fr 1.2fr;gap:8px;margin-top:12px}.actions button{min-height:46px;border:0;border-radius:11px;font-weight:950}.remove{background:#1e293b;color:#cbd5e1}.apply{background:#d6b66d;color:#111827}.apply:disabled{opacity:.45}.applied{margin:10px 0 0;border-radius:10px;background:#0c2d24;padding:9px;color:#a7f3d0;font-size:10px;line-height:1.45}@media(min-width:900px){:host{left:auto;right:24px;bottom:24px;width:480px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  `]
})
export class CheckoutLoyaltyPanelComponent implements OnInit{
  readonly auth=inject(CustomerAuthService);readonly account=inject(CustomerAccountService);private readonly offer=inject(CommercialOfferContextService);private readonly ui=inject(UiService);readonly t=this.ui.translations;readonly open=signal(false);readonly points=signal(0);readonly applied=signal(false);readonly minimumPoints=computed(()=>Math.max(0,Number(this.account.loyaltySettings()?.minimum_redeem_points||0)));
  async ngOnInit():Promise<void>{await this.auth.waitUntilReady();if(!this.auth.isLoggedIn())return;await this.account.refresh().catch(()=>undefined);}
  setPoints(value:unknown):void{const balance=Math.max(0,Number(this.account.lifetimeSummary()?.pointsBalance||0));const next=Math.max(0,Math.min(balance,Math.floor(Number(value)||0)));this.points.set(next);this.applied.set(false);}
  selectRatio(ratio:number):void{const balance=Math.max(0,Number(this.account.lifetimeSummary()?.pointsBalance||0));this.setPoints(Math.floor(balance*Math.max(0,Math.min(1,ratio))));}
  applyPoints():void{const selected=this.points();if(selected>0&&selected<this.minimumPoints())return;this.offer.setLoyaltyPoints(selected);this.applied.set(selected>0);}
  removePoints():void{this.points.set(0);this.offer.setLoyaltyPoints(0);this.applied.set(false);}
  pointsBalanceLabel(n:number):string{return String(this.t().loyaltyPanel.pointsBalance||'').replace('{n}', String(n));}
  ruleLabel():string{return String(this.t().loyaltyPanel.rule||'').replace('{n}', String(this.minimumPoints()));}
  applyLabel():string{return this.points()>0?String(this.t().loyaltyPanel.apply||'').replace('{n}', String(this.points())):this.t().loyaltyPanel.selectPoints;}
  appliedLabel():string{return String(this.t().loyaltyPanel.applied||'').replace('{n}', String(this.points()));}
}
