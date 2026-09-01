import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerSavedCardsV225Service, SavedCardV225 } from '../services/customer-saved-cards-v225.service';
import { CustomerDocument, CustomerDocumentType, CustomerWalletService } from '../services/customer-wallet.service';

interface DocumentSlot { type:CustomerDocumentType; title:string; description:string; icon:string; }

@Component({
  selector:'app-account-wallet',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink],
  template:`
    <main class="wallet-page">
      <section class="shell">
        <header class="topbar">
          <div><p>ALPERLER HESABIM</p><h1>Cüzdan ve Belgeler</h1><span>Ödeme kartlarınızı ve rezervasyonlarda kullanacağınız belgeleri tek yerden yönetin.</span></div>
          <nav aria-label="Cüzdan gezinme"><a routerLink="/account">Hesabıma Dön</a><a routerLink="/">Ana Sayfa</a></nav>
        </header>

        @if(message()){<p class="notice ok" role="status">{{message()}}</p>}
        @if(error()){<p class="notice error" role="alert">{{error()}}</p>}

        <section class="card-section" aria-labelledby="saved-cards-title">
          <header class="section-head"><div><p>ÖDEME CÜZDANI</p><h2 id="saved-cards-title">Kayıtlı kartlarım</h2><span>Kartlarınızı sonraki ödemelerde daha hızlı kullanmak için güvenle ekleyebilirsiniz.</span></div><button type="button" class="primary" (click)="toggleCardForm()" [disabled]="!cards.available()">{{cardFormOpen()?'Kapat':'Yeni Kart Ekle'}}</button></header>
          <div class="privacy-note"><strong>Güvenli kart saklama</strong><span>Kart bilgileriniz güvenli ödeme kuruluşunda korunur. Cüzdanda yalnız kartın tanınması için gereken sınırlı bilgiler gösterilir.</span></div>

          @if(cards.loading()){
            <p class="loading" role="status">Kartlarınız hazırlanıyor...</p>
          } @else if(!cards.available()) {
            <div class="empty-card"><strong>Kayıtlı kart özelliği şu anda aktif değil.</strong><span>Rezervasyon sırasında sunulan diğer ödeme seçeneklerini kullanabilirsiniz.</span></div>
          } @else {
            @if(cardFormOpen()){
              <form class="card-form" (ngSubmit)="addCard()" novalidate>
                <label><span>Kart adı</span><input [(ngModel)]="cardForm.alias" name="cardAlias" maxlength="80" autocomplete="off" placeholder="Örn. Kişisel kartım" /></label>
                <label><span>Kart üzerindeki ad soyad</span><input [(ngModel)]="cardForm.holder" name="cardHolder" maxlength="100" autocomplete="cc-name" required /></label>
                <label class="wide"><span>Kart numarası</span><input [(ngModel)]="cardForm.number" name="cardNumber" maxlength="23" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" required /></label>
                <label><span>Son kullanma ayı</span><input [(ngModel)]="cardForm.month" name="expireMonth" maxlength="2" inputmode="numeric" autocomplete="cc-exp-month" placeholder="AA" required /></label>
                <label><span>Son kullanma yılı</span><input [(ngModel)]="cardForm.year" name="expireYear" maxlength="4" inputmode="numeric" autocomplete="cc-exp-year" placeholder="YYYY" required /></label>
                <p class="form-help wide">Kart güvenlik kodu bu işlem için istenmez. Kartınızı eklediğinizde yalnız ödeme kuruluşunun oluşturduğu güvenli kayıt kullanılır.</p>
                <button type="submit" class="primary wide" [disabled]="cards.working()">{{cards.working()?'Kart ekleniyor...':'Kartı Güvenle Kaydet'}}</button>
              </form>
            }
            <div class="saved-grid">
              @for(card of cards.cards();track card.id){
                <article class="saved-card">
                  <div class="card-brand"><span aria-hidden="true">▰</span><div><small>{{card.brand}}</small><strong>•••• {{card.last4}}</strong></div>@if(card.isDefault){<b>Varsayılan</b>}</div>
                  <div class="card-meta"><span>{{card.label}}</span>@if(card.expiryMonth&&card.expiryYear){<time>Son kullanma {{two(card.expiryMonth)}}/{{String(card.expiryYear).slice(-2)}}</time>}</div>
                  <div class="card-actions">@if(!card.isDefault){<button type="button" (click)="makeDefault(card)" [disabled]="cards.working()">Varsayılan Yap</button>}<button type="button" class="remove" (click)="removeCard(card)" [disabled]="cards.working()">Kartı Kaldır</button></div>
                </article>
              } @empty {
                <div class="empty-card"><strong>Henüz kayıtlı kartınız yok.</strong><span>İsterseniz bir kart ekleyip sonraki ödemelerinizi hızlandırabilirsiniz.</span></div>
              }
            </div>
          }
        </section>

        <section class="documents" aria-labelledby="documents-title">
          <header class="section-head"><div><p>BELGELERİM</p><h2 id="documents-title">Kimlik ve ehliyet</h2><span>Rezervasyon doğrulamasında gereken belgeleri bir kez yükleyip durumlarını buradan takip edin.</span></div></header>
          @if(wallet.loading()){
            <p class="loading" role="status">Belgeleriniz hazırlanıyor...</p>
          } @else if(!wallet.hasActiveConsent()){
            <section class="consent-card"><div><p>GİZLİLİK ONAYI</p><h3>{{wallet.terms()?.title||'Belge Kullanım Onayı'}}</h3><span>Kimlik veya ehliyet yüklemeden önce belge kullanım koşullarını onaylamanız gerekir.</span></div>@if(wallet.terms();as terms){<pre>{{terms.body}}</pre>}<button type="button" class="primary" (click)="acceptTerms()" [disabled]="working()||!wallet.terms()">{{working()?'Onaylanıyor...':'Koşulları Kabul Et'}}</button></section>
          } @else {
            <div class="privacy-note"><strong>Özel erişim</strong><span>Belgeleriniz yalnız doğrulama yetkisi olan ekip tarafından rezervasyon işlemleri için görüntülenebilir.</span></div>
            <section class="slot-grid" aria-label="Kimlik ve ehliyet belge alanları">
              @for(slot of slots;track slot.type){
                <article class="slot-card"><header><span class="slot-icon" aria-hidden="true">{{slot.icon}}</span><div><h3>{{slot.title}}</h3><p>{{slot.description}}</p></div></header>
                  @if(documentFor(slot.type);as doc){
                    <div class="document-state"><div><small>DURUM</small><strong [class.verified]="doc.verification_status==='VERIFIED'">{{statusLabel(doc.verification_status)}}</strong></div><span>{{doc.original_name}}</span><time>{{doc.created_at|date:'dd.MM.yyyy HH:mm'}}</time>@if(doc.rejection_reason){<p class="rejection">{{doc.rejection_reason}}</p>}</div>
                    <div class="document-actions"><button type="button" (click)="openDocument(doc)">Görüntüle</button><label class="replace" [class.disabled]="workingType()===slot.type"><span>{{workingType()===slot.type?'Yükleniyor...':'Yeni Fotoğraf Yükle'}}</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" [disabled]="workingType()===slot.type" [attr.aria-label]="slot.title+' için yeni fotoğraf çek veya seç'" (change)="upload(slot.type,$event,doc)" /></label><button type="button" class="remove" (click)="removeDocument(doc)" [disabled]="workingType()===slot.type">Kaldır</button></div>
                  } @else {
                    <div class="empty-state"><strong>Henüz yüklenmedi</strong><span>Telefonunuzun kamerasıyla fotoğraf çekebilir veya galeriden görsel seçebilirsiniz.</span></div><label class="capture" [class.disabled]="workingType()===slot.type"><span>{{workingType()===slot.type?'Yükleniyor...':'Fotoğraf Çek veya Görsel Seç'}}</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" [disabled]="workingType()===slot.type" [attr.aria-label]="slot.title+' fotoğrafı çek veya seç'" (change)="upload(slot.type,$event)" /></label>
                  }
                </article>
              }
            </section>
            <section class="review-info"><div><p>DOĞRULAMA SÜRECİ</p><h3>Belgeniz yüklendiğinde ne olur?</h3></div><ol><li><strong>1</strong><span>Belge hesabınıza eklenir.</span></li><li><strong>2</strong><span>Yetkili ekip rezervasyonla birlikte kontrol eder.</span></li><li><strong>3</strong><span>Sonuç cüzdanınızda görünür; gerekirse yeniden yükleme notu alırsınız.</span></li></ol></section>
          }
        </section>
      </section>
    </main>
  `,
  styles:[`
    :host{display:block}.wallet-page{min-height:100vh;background:#060a12;color:#f4f6f8;padding:clamp(14px,3vw,32px)}.shell{width:min(100%,1080px);margin:auto}.topbar{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding-bottom:1.2rem;border-bottom:1px solid #27364a}.topbar p,.section-head p,.consent-card p,.review-info p{margin:0;color:#c6a15b;font-size:.58rem;font-weight:950;letter-spacing:.14em}.topbar h1{margin:.3rem 0 0;font:700 clamp(1.65rem,4vw,2.6rem)/1.06 Georgia,serif}.topbar>div>span,.section-head>div>span,.consent-card>div>span{display:block;max-width:720px;margin-top:.45rem;color:#9ba8b8;font-size:.72rem;line-height:1.55}.topbar nav{display:flex;gap:.45rem}.topbar a,.primary{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 .85rem;color:#fff;text-decoration:none;font-size:.68rem;font-weight:900}.primary{border:0;background:#315e86}.notice,.loading{margin:1rem 0 0;border-radius:12px;padding:.8rem .9rem;font-size:.72rem;font-weight:850}.notice.ok{background:#0b2d25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #27364a;background:#0b1420;color:#aab5c4}.card-section,.documents{margin-top:1rem;border:1px solid #29394e;border-radius:20px;background:#0b1420;padding:clamp(14px,2vw,20px)}.section-head{display:flex;align-items:center;justify-content:space-between;gap:1rem}.section-head h2{margin:.25rem 0 0;font:700 clamp(1.25rem,3vw,1.7rem)/1.1 Georgia,serif}.privacy-note{display:flex;gap:.65rem;margin-top:1rem;border:1px solid #245045;border-radius:14px;background:#09251f;padding:.85rem;color:#d1fae5}.privacy-note strong{flex:none;font-size:.7rem}.privacy-note span{font-size:.66rem;line-height:1.5}.card-form{display:grid;gap:.7rem;margin-top:1rem;border-top:1px solid #27364a;padding-top:1rem}.card-form label{display:grid;gap:.35rem}.card-form label span{color:#cbd5e1;font-size:.62rem;font-weight:900}.card-form input{width:100%;min-height:46px;border:1px solid #304158;border-radius:11px;background:#08111e;padding:0 .75rem;color:#fff;font:inherit}.wide{grid-column:1/-1}.form-help{margin:0;color:#8fa0b5;font-size:.63rem;line-height:1.55}.saved-grid{display:grid;gap:.7rem;margin-top:1rem}.saved-card{border:1px solid #304158;border-radius:16px;background:linear-gradient(135deg,#101d30,#08111e);padding:1rem}.card-brand{display:flex;align-items:center;gap:.65rem}.card-brand>span{display:grid;width:42px;height:32px;place-items:center;border-radius:9px;background:#c6a15b;color:#101827}.card-brand div{display:flex;min-width:0;flex:1;flex-direction:column}.card-brand small{color:#9aa9bb;font-size:.58rem;font-weight:900}.card-brand strong{margin-top:.12rem;font-size:.94rem}.card-brand b{border-radius:999px;background:#173d32;padding:.35rem .55rem;color:#a7f3d0;font-size:.55rem}.card-meta{display:flex;justify-content:space-between;gap:.7rem;margin-top:.85rem;color:#93a3b5;font-size:.64rem}.card-actions{display:flex;gap:.45rem;margin-top:.8rem}.card-actions button,.document-actions button,.replace,.capture{display:inline-flex;min-height:42px;align-items:center;justify-content:center;border:1px solid #34465d;border-radius:10px;background:#111c2b;padding:0 .7rem;color:#fff;font-size:.62rem;font-weight:900}.remove{color:#fda4af!important;border-color:#5b3440!important}.empty-card{margin-top:1rem;border:1px dashed #304158;border-radius:14px;background:#08111e;padding:1rem;text-align:center}.empty-card strong,.empty-card span{display:block}.empty-card strong{font-size:.76rem}.empty-card span{margin-top:.3rem;color:#8998aa;font-size:.65rem;line-height:1.5}.consent-card{margin-top:1rem;border:1px solid #39495d;border-radius:16px;background:#08111e;overflow:hidden}.consent-card>div{padding:1rem}.consent-card h3,.review-info h3{margin:.3rem 0 0;font:700 1.2rem Georgia,serif}.consent-card pre{max-height:310px;overflow:auto;margin:0;border-block:1px solid #263548;padding:1rem;white-space:pre-wrap;color:#bec8d4;font:inherit;font-size:.7rem;line-height:1.65}.consent-card .primary{margin:1rem}.slot-grid{display:grid;gap:.8rem;margin-top:1rem}.slot-card{border:1px solid #29394e;border-radius:16px;background:#08111e;padding:1rem}.slot-card header{display:flex;gap:.7rem;align-items:flex-start}.slot-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#172234;color:#c6a15b;font-weight:950}.slot-card h3{margin:0;font-size:.94rem}.slot-card header p{margin:.25rem 0 0;color:#8998aa;font-size:.65rem;line-height:1.45}.document-state,.empty-state{margin-top:.8rem;border-radius:12px;background:#0b1420;padding:.75rem}.document-state>div{display:flex;justify-content:space-between;gap:.6rem}.document-state small{color:#718096;font-size:.54rem;font-weight:950}.document-state strong{color:#fde68a;font-size:.65rem}.document-state strong.verified{color:#86efac}.document-state>span,.document-state>time{display:block;margin-top:.3rem;color:#98a6b8;font-size:.62rem}.rejection{margin:.55rem 0 0;border-radius:9px;background:#301b0c;padding:.55rem;color:#fdba74;font-size:.64rem}.empty-state strong,.empty-state span{display:block}.empty-state span{margin-top:.3rem;color:#8998aa;font-size:.64rem;line-height:1.5}.document-actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.7rem}.replace,.capture{position:relative;cursor:pointer}.replace input,.capture input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.capture{width:100%;margin-top:.7rem;border-color:#75602f;background:#c6a15b;color:#111827}.disabled{opacity:.5;cursor:not-allowed}.review-info{margin-top:1rem;border:1px solid #29394e;border-radius:16px;background:#08111e;padding:1rem}.review-info ol{display:grid;gap:.6rem;margin:.9rem 0 0;padding:0;list-style:none}.review-info li{display:flex;align-items:flex-start;gap:.6rem;border-radius:11px;background:#0b1420;padding:.7rem}.review-info li strong{display:grid;width:28px;height:28px;flex:none;place-items:center;border-radius:50%;background:#315e86;font-size:.65rem}.review-info li span{color:#aab5c4;font-size:.68rem;line-height:1.5}a:focus-visible,button:focus-visible,input:focus-visible,label:focus-within{outline:3px solid #7899b8;outline-offset:2px}@media(min-width:720px){.card-form{grid-template-columns:1fr 1fr}.saved-grid,.slot-grid{grid-template-columns:1fr 1fr}.review-info ol{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){.topbar,.section-head{display:block}.topbar nav,.section-head>.primary{margin-top:.8rem}.topbar a{flex:1}.privacy-note{display:block}.privacy-note span{display:block;margin-top:.3rem}.card-meta{display:grid}.card-actions{display:grid;grid-template-columns:1fr 1fr}}
  `]
})
export class AccountWalletComponent implements OnInit {
  readonly wallet=inject(CustomerWalletService);
  readonly cards=inject(CustomerSavedCardsV225Service);
  readonly working=signal(false);
  readonly workingType=signal<CustomerDocumentType|null>(null);
  readonly message=signal('');
  readonly error=signal('');
  readonly cardFormOpen=signal(false);
  readonly String=String;
  cardForm={alias:'',holder:'',number:'',month:'',year:''};
  readonly slots:DocumentSlot[]=[
    {type:'IDENTITY_FRONT',title:'Kimlik Ön Yüz',description:'Kimliğinizin fotoğraflı ön yüzünü net ve tam kadraj yükleyin.',icon:'ID'},
    {type:'IDENTITY_BACK',title:'Kimlik Arka Yüz',description:'Kimliğinizin arka yüzündeki bilgilerin tamamı görünür olmalı.',icon:'ID'},
    {type:'DRIVING_LICENSE_FRONT',title:'Ehliyet Ön Yüz',description:'Sürücü belgenizin ön yüzünü yansıma ve bulanıklık olmadan yükleyin.',icon:'E'},
    {type:'DRIVING_LICENSE_BACK',title:'Ehliyet Arka Yüz',description:'Sürücü belgenizin arka yüzünü tam kadraj yükleyin.',icon:'E'},
  ];

  async ngOnInit():Promise<void>{
    const results=await Promise.allSettled([this.wallet.refresh(),this.cards.refresh()]);
    if(results[0].status==='rejected')this.error.set('Belgeleriniz şu anda yüklenemedi. Biraz sonra yeniden deneyin.');
    if(results[1].status==='rejected'&&!this.error())this.error.set('Kayıtlı kartlarınız şu anda yüklenemedi. Biraz sonra yeniden deneyin.');
  }

  toggleCardForm():void{this.cardFormOpen.update(v=>!v);this.clearMessages();if(!this.cardFormOpen())this.resetCardForm();}
  async addCard():Promise<void>{this.clearMessages();try{await this.cards.add({cardAlias:this.cardForm.alias.trim()||'Kartım',cardHolderName:this.cardForm.holder.trim(),cardNumber:this.cardForm.number,expireMonth:this.cardForm.month,expireYear:this.cardForm.year});this.resetCardForm();this.cardFormOpen.set(false);this.message.set('Kartınız cüzdanınıza eklendi.');}catch(e){this.error.set(this.messageOf(e));}}
  async removeCard(card:SavedCardV225):Promise<void>{this.clearMessages();try{await this.cards.remove(card.id);this.message.set('Kart cüzdanınızdan kaldırıldı.');}catch(e){this.error.set(this.messageOf(e));}}
  async makeDefault(card:SavedCardV225):Promise<void>{this.clearMessages();try{await this.cards.makeDefault(card.id);this.message.set('Varsayılan kartınız güncellendi.');}catch(e){this.error.set(this.messageOf(e));}}
  two(value:number):string{return String(value).padStart(2,'0');}

  documentFor(type:CustomerDocumentType):CustomerDocument|null{return this.wallet.documents().find(document=>document.document_type===type)||null;}
  statusLabel(status:CustomerDocument['verification_status']):string{if(status==='VERIFIED')return'Doğrulandı';if(status==='REJECTED')return'Yeniden Yükleme Gerekli';if(status==='EXPIRED')return'Süresi Doldu';return'İnceleniyor';}
  async acceptTerms():Promise<void>{if(this.working())return;this.working.set(true);this.clearMessages();try{await this.wallet.acceptTerms();this.message.set('Belge alanınız açıldı. Belgelerinizi ekleyebilirsiniz.');}catch{this.error.set('Belge onayı şu anda tamamlanamadı.');}finally{this.working.set(false);}}
  async upload(type:CustomerDocumentType,event:Event,previous?:CustomerDocument):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];input.value='';if(!file||this.workingType())return;this.workingType.set(type);this.clearMessages();try{await this.wallet.uploadDocument(file,type);if(previous)await this.wallet.deleteDocument(previous).catch(()=>undefined);await this.wallet.refresh();this.message.set(`${this.slotTitle(type)} başarıyla yüklendi.`);}catch(error){const detail=error instanceof Error?error.message:'';this.error.set(detail.includes('DOCUMENT_SIZE_INVALID')?'Belge dosyası en fazla 10 MB olabilir.':detail.includes('DOCUMENT_TYPE_INVALID')?'Lütfen JPEG, PNG veya WebP formatında bir görsel seçin.':'Belge yüklenemedi. Görüntüyü kontrol edip tekrar deneyin.');}finally{this.workingType.set(null);}}
  async openDocument(document:CustomerDocument):Promise<void>{this.clearMessages();try{await this.wallet.openDocument(document);}catch{this.error.set('Belge şu anda görüntülenemedi.');}}
  async removeDocument(document:CustomerDocument):Promise<void>{if(this.workingType())return;this.workingType.set(document.document_type);this.clearMessages();try{await this.wallet.deleteDocument(document);this.message.set(`${this.slotTitle(document.document_type)} kaldırıldı.`);}catch{this.error.set('Belge kaldırılamadı. Lütfen tekrar deneyin.');}finally{this.workingType.set(null);}}
  private resetCardForm():void{this.cardForm={alias:'',holder:'',number:'',month:'',year:''};}
  private slotTitle(type:CustomerDocumentType):string{return this.slots.find(slot=>slot.type===type)?.title||'Belge';}
  private clearMessages():void{this.message.set('');this.error.set('');}
  private messageOf(error:unknown):string{return error instanceof Error?error.message:'İşlem tamamlanamadı. Lütfen tekrar deneyin.';}
}
