import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerAccountService, SafePaymentMethod } from '../services/customer-account.service';
import { CustomerSavedCardsV225Service } from '../services/customer-saved-cards-v225.service';

@Component({
  selector:'app-customer-saved-cards-v225',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink],
  template:`
    <section class="wallet" aria-labelledby="saved-cards-title">
      <header class="head"><div><p>CÜZDANIM</p><h1 id="saved-cards-title">Kayıtlı kartlarım</h1><span>Sonraki ödemelerde daha hızlı ilerlemek için kartınızı güvenle kaydedebilirsiniz.</span></div><a routerLink="/account">Genel Bakışa Dön</a></header>
      <div class="security-note"><strong>Kart güvenliği</strong><span>Kart numaranız ve güvenlik kodunuz Alperler hesabınızda saklanmaz. Cüzdanınızda yalnız kartın maskeli özeti görünür.</span></div>
      @if(message()){<p class="notice ok" role="status">{{message()}}</p>}@if(error()){<p class="notice error" role="alert">{{error()}}</p>}

      <section class="card-list" aria-label="Kayıtlı kartlar">
        @for(card of visibleCards();track card.id){
          <article class="saved-card" [class.default]="card.is_default">
            <div class="card-mark" aria-hidden="true">{{brandInitial(card)}}</div>
            <div class="card-copy"><small>{{card.label||brandLabel(card)}}</small><strong>•••• •••• •••• {{card.last4||'••••'}}</strong><span>@if(card.expiry_month&&card.expiry_year){Son kullanma {{two(card.expiry_month)}}/{{String(card.expiry_year).slice(-2)}}}@if(card.is_default){ · Varsayılan kart}</span></div>
            <div class="actions">@if(!card.is_default){<button type="button" (click)="makeDefault(card)" [disabled]="wallet.loading()">Varsayılan Yap</button>}<button type="button" class="remove" (click)="askRemove(card)" [disabled]="wallet.loading()">Kaldır</button></div>
          </article>
        }@empty{
          <div class="empty"><strong>Henüz kayıtlı kartınız yok.</strong><span>Kart eklediğinizde burada yalnız güvenli, maskeli bilgiler gösterilir.</span></div>
        }
      </section>

      @if(removeTarget();as target){<section class="confirm" role="dialog" aria-modal="true" aria-labelledby="remove-card-title"><div><h2 id="remove-card-title">Kartı cüzdandan kaldır?</h2><p>•••• {{target.last4}} ile biten kart artık hızlı ödeme için kullanılamaz.</p><div><button type="button" (click)="removeTarget.set(null)">Vazgeç</button><button type="button" class="danger" (click)="removeConfirmed(target)" [disabled]="wallet.loading()">Kartı Kaldır</button></div></div></section>}

      @if(canAddCard()){
        <section class="add" aria-labelledby="add-card-title">
          <header><div><p>YENİ KART</p><h2 id="add-card-title">Kart ekle</h2><span>Kartınız yalnız açık onayınızla kaydedilir.</span></div><button type="button" (click)="formOpen.update(v=>!v)" [attr.aria-expanded]="formOpen()">{{formOpen()?'Kapat':'Kart Ekle'}}</button></header>
          @if(formOpen()){
            <form (ngSubmit)="addCard()" novalidate autocomplete="on">
              <label class="wide"><span>Kart üzerindeki ad</span><input [(ngModel)]="form.holder" name="cardHolder" autocomplete="cc-name" maxlength="100" required/></label>
              <label class="wide"><span>Kart numarası</span><input [(ngModel)]="form.number" name="cardNumber" autocomplete="cc-number" inputmode="numeric" maxlength="23" placeholder="1234 5678 9012 3456" required/></label>
              <label><span>Ay</span><input [(ngModel)]="form.month" name="cardMonth" autocomplete="cc-exp-month" inputmode="numeric" maxlength="2" placeholder="AA" required/></label>
              <label><span>Yıl</span><input [(ngModel)]="form.year" name="cardYear" autocomplete="cc-exp-year" inputmode="numeric" maxlength="4" placeholder="YYYY" required/></label>
              <label class="wide"><span>Kart adı (isteğe bağlı)</span><input [(ngModel)]="form.alias" name="cardAlias" maxlength="80" placeholder="Örn. Kişisel kartım"/></label>
              <label class="consent wide"><input type="checkbox" [(ngModel)]="form.consent" name="cardConsent"/><span>Bu kartı sonraki ödemelerde hızlıca kullanabilmek için kaydetmek istiyorum.</span></label>
              <button class="primary wide" type="submit" [disabled]="wallet.loading()">{{wallet.loading()?'Kaydediliyor...':'Kartı Güvenle Kaydet'}}</button>
            </form>
          }
        </section>
      }@else{
        <section class="unavailable"><strong>Kayıtlı kart özelliği yakında kullanılabilir olacak.</strong><span>Mevcut ödeme seçeneklerinizi rezervasyon sırasında kullanmaya devam edebilirsiniz.</span></section>
      }
    </section>
  `,
  styles:[`
    :host{display:block;background:#060a12}.wallet{width:min(100% - 28px,1080px);margin:auto;padding:18px 0 2px;color:#f4f6f8}.head{display:flex;align-items:end;justify-content:space-between;gap:14px;border-bottom:1px solid #263548;padding-bottom:16px}.head p,.add header p{margin:0;color:#c6a15b;font-size:9px;font-weight:950;letter-spacing:.14em}.head h1,.add h2{margin:5px 0 0;font:750 clamp(28px,7vw,40px)/1 Georgia,serif}.head span,.add header span{display:block;margin-top:7px;color:#96a4b6;font-size:11px;line-height:1.55}.head a,.add header button,.actions button,.confirm button,.primary{display:inline-flex;min-height:43px;align-items:center;justify-content:center;border:1px solid #34465d;border-radius:11px;background:#101a29;padding:0 12px;color:#fff;text-decoration:none;font-size:9px;font-weight:900}.security-note{display:flex;gap:9px;margin-top:14px;border:1px solid #245145;border-radius:14px;background:#09231e;padding:12px}.security-note strong{flex:none;color:#d1fae5;font-size:10px}.security-note span{color:#a7d7c8;font-size:10px;line-height:1.5}.card-list{display:grid;gap:8px;margin-top:14px}.saved-card{display:grid;grid-template-columns:46px minmax(0,1fr) auto;align-items:center;gap:11px;border:1px solid #29394e;border-radius:16px;background:linear-gradient(135deg,#0d1728,#101828);padding:12px}.saved-card.default{border-color:#806a35;background:linear-gradient(135deg,#111827,#1d190f)}.card-mark{display:grid;width:46px;height:46px;place-items:center;border-radius:13px;background:#17243a;color:#efd47f;font-size:18px;font-weight:950}.card-copy{min-width:0}.card-copy small,.card-copy strong,.card-copy span{display:block}.card-copy small{color:#aab6c6;font-size:9px;font-weight:900}.card-copy strong{margin-top:4px;font-size:14px;letter-spacing:.04em}.card-copy span{margin-top:4px;color:#8091a7;font-size:9px}.actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.actions .remove{border-color:#5b3340;color:#fda4af}.empty,.unavailable{margin-top:14px;border:1px dashed #334155;border-radius:16px;background:#0b1420;padding:20px;text-align:center}.empty strong,.empty span,.unavailable strong,.unavailable span{display:block}.empty span,.unavailable span{margin-top:5px;color:#8fa0b5;font-size:10px;line-height:1.5}.add{margin-top:14px;border:1px solid #29394e;border-radius:18px;background:#0b1420;padding:14px}.add header{display:flex;align-items:center;justify-content:space-between;gap:12px}.add h2{font-size:23px}.add form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;border-top:1px solid #263548;padding-top:14px}.add label{display:grid;gap:5px}.add label>span{color:#b9c5d3;font-size:9px;font-weight:850}.add input{width:100%;min-height:47px;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 11px;color:#fff;font:inherit}.wide{grid-column:1/-1}.consent{display:flex!important;align-items:flex-start;gap:8px}.consent input{width:20px;min-height:20px;flex:none}.consent span{line-height:1.45}.primary{border:0;background:#315e86}.notice{margin-top:10px;border-radius:10px;padding:10px 12px;font-size:10px}.notice.ok{background:#0b2e25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecaca}.confirm{position:fixed;inset:0;z-index:500;display:grid;place-items:center;background:rgba(0,0,0,.72);padding:18px}.confirm>div{width:min(100%,430px);border:1px solid #3b4c62;border-radius:18px;background:#0b1420;padding:18px}.confirm h2{margin:0;font:750 24px Georgia,serif}.confirm p{color:#9aa8b8;line-height:1.5}.confirm>div>div{display:flex;justify-content:flex-end;gap:7px}.confirm .danger{border-color:#743847;background:#34131b;color:#fecdd3}a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}@media(max-width:660px){.head{display:block}.head a{width:100%;margin-top:12px}.saved-card{grid-template-columns:42px minmax(0,1fr)}.card-mark{width:42px;height:42px}.actions{grid-column:1/-1;justify-content:stretch}.actions button{flex:1}.security-note{display:block}.security-note span{display:block;margin-top:4px}}
  `]
})
export class CustomerSavedCardsV225Component implements OnInit{
  readonly account=inject(CustomerAccountService);readonly wallet=inject(CustomerSavedCardsV225Service);readonly formOpen=signal(false);readonly removeTarget=signal<SafePaymentMethod|null>(null);readonly message=signal('');readonly error=signal('');readonly String=String;
  form={holder:'',number:'',month:'',year:'',alias:'',consent:false};
  readonly canAddCard=computed(()=>this.wallet.status()?.canAddCard===true);
  readonly visibleCards=computed(()=>{const scope=this.wallet.status()?.mode;return this.account.paymentMethods().filter(card=>!scope||card.provider_scope===scope);});
  async ngOnInit(){await Promise.allSettled([this.account.refresh(),this.wallet.refreshStatus()]);}
  brandLabel(card:SafePaymentMethod){const value=String(card.brand||'Kart').replaceAll('_',' ');return value==='MASTER CARD'?'Mastercard':value==='VISA'?'Visa':value==='AMERICAN EXPRESS'?'American Express':value;}
  brandInitial(card:SafePaymentMethod){return this.brandLabel(card).slice(0,1).toUpperCase();}
  two(value:number){return String(value).padStart(2,'0');}
  askRemove(card:SafePaymentMethod){this.removeTarget.set(card);}
  async addCard(){this.clear();try{await this.wallet.add({cardAlias:this.form.alias.trim()||'Kartım',cardHolderName:this.form.holder.trim(),cardNumber:this.form.number,expireMonth:this.form.month,expireYear:this.form.year,consent:this.form.consent});await this.account.refresh();this.form={holder:'',number:'',month:'',year:'',alias:'',consent:false};this.formOpen.set(false);this.message.set('Kartınız cüzdanınıza eklendi.');}catch(e){this.error.set(this.wallet.friendlyError(e));}}
  async makeDefault(card:SafePaymentMethod){this.clear();try{await this.wallet.setDefault(card.id);await this.account.refresh();this.message.set('Varsayılan kartınız güncellendi.');}catch(e){this.error.set(this.wallet.friendlyError(e));}}
  async removeConfirmed(card:SafePaymentMethod){this.clear();try{await this.wallet.remove(card.id);this.removeTarget.set(null);await this.account.refresh();this.message.set('Kart cüzdanınızdan kaldırıldı.');}catch(e){this.error.set(this.wallet.friendlyError(e));}}
  private clear(){this.message.set('');this.error.set('');}
}
