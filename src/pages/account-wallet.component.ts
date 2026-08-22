import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerDocument, CustomerDocumentType, CustomerWalletService } from '../services/customer-wallet.service';

interface DocumentSlot {
  type: CustomerDocumentType;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-account-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="vault-page">
      <section class="shell">
        <header class="topbar">
          <div><p>GÜVENLİ BELGE KASASI</p><h1>Kimlik ve ehliyet belgeleriniz</h1><span>Rezervasyon doğrulamasında gerekli belgeleri bir kez yükleyin. Belgeleriniz herkese açık değildir ve yalnız yetkili ekip tarafından incelenir.</span></div>
          <div><a routerLink="/account">Hesabıma Dön</a><a routerLink="/">Siteye Dön</a></div>
        </header>

        @if (message()) {<p class="notice ok" role="status">{{ message() }}</p>}
        @if (error()) {<p class="notice error" role="alert">{{ error() }}</p>}

        @if (wallet.loading()) {
          <section class="loading" role="status">Belge kasanız hazırlanıyor...</section>
        } @else if (!wallet.hasActiveConsent()) {
          <section class="consent-card">
            <div><p>GİZLİLİK ONAYI</p><h2>{{ wallet.terms()?.title || 'Güvenli Belge Kasası Onayı' }}</h2><span>Kimlik veya ehliyet yüklemeden önce belge saklama koşullarını onaylamanız gerekir.</span></div>
            @if (wallet.terms(); as terms) {<pre>{{ terms.body }}</pre>}
            <button type="button" (click)="acceptTerms()" [disabled]="working() || !wallet.terms()">{{ working() ? 'Onaylanıyor...' : 'Koşulları Kabul Et ve Kasayı Aç' }}</button>
          </section>
        } @else {
          <section class="security-note" aria-label="Belge güvenliği bilgisi">
            <strong>Özel ve kontrollü erişim</strong>
            <span>Dosyalar özel depolama alanında tutulur. Yönetici görüntülemek istediğinde yalnız kısa süreli güvenli bağlantı oluşturulur.</span>
          </section>

          <section class="slot-grid" aria-label="Kimlik ve ehliyet belge alanları">
            @for (slot of slots; track slot.type) {
              <article class="slot-card">
                <header><span class="slot-icon" aria-hidden="true">{{ slot.icon }}</span><div><h2>{{ slot.title }}</h2><p>{{ slot.description }}</p></div></header>
                @if (documentFor(slot.type); as doc) {
                  <div class="document-state">
                    <div><small>DURUM</small><strong [class.verified]="doc.verification_status === 'VERIFIED'">{{ statusLabel(doc.verification_status) }}</strong></div>
                    <span>{{ doc.original_name }}</span>
                    <time>{{ doc.created_at | date:'dd.MM.yyyy HH:mm' }}</time>
                    @if (doc.rejection_reason) {<p class="rejection">{{ doc.rejection_reason }}</p>}
                  </div>
                  <div class="document-actions">
                    <button type="button" (click)="openDocument(doc)">Görüntüle</button>
                    <label class="replace" [class.disabled]="workingType() === slot.type">
                      <span>{{ workingType() === slot.type ? 'Yükleniyor...' : 'Yeni Fotoğraf Yükle' }}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" [disabled]="workingType() === slot.type" [attr.aria-label]="slot.title + ' için yeni fotoğraf çek veya seç'" (change)="upload(slot.type, $event, doc)" />
                    </label>
                    <button type="button" class="remove" (click)="removeDocument(doc)" [disabled]="workingType() === slot.type">Kaldır</button>
                  </div>
                } @else {
                  <div class="empty-state"><strong>Henüz yüklenmedi</strong><span>Telefonunuzun kamerasıyla fotoğraf çekebilir veya galeriden görsel seçebilirsiniz.</span></div>
                  <label class="capture" [class.disabled]="workingType() === slot.type">
                    <span>{{ workingType() === slot.type ? 'Yükleniyor...' : 'Fotoğraf Çek veya Görsel Seç' }}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" [disabled]="workingType() === slot.type" [attr.aria-label]="slot.title + ' fotoğrafı çek veya seç'" (change)="upload(slot.type, $event)" />
                  </label>
                }
              </article>
            }
          </section>

          <section class="review-info">
            <div><p>DOĞRULAMA SÜRECİ</p><h2>Belgeniz yüklendiğinde ne olur?</h2></div>
            <ol><li><strong>1</strong><span>Belge hesabınıza güvenli şekilde kaydedilir.</span></li><li><strong>2</strong><span>Yetkili ekip kimlik ve ehliyet bilgilerini rezervasyonla birlikte kontrol eder.</span></li><li><strong>3</strong><span>Doğrulama sonucu burada “Doğrulandı” olarak görünür. Görüntü net değilse yeniden yükleme notu gösterilir.</span></li></ol>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.vault-page{min-height:100vh;background:#060a12;color:#f4f6f8;padding:clamp(14px,3vw,32px)}.shell{width:min(100%,1080px);margin:auto}.topbar{display:flex;align-items:end;justify-content:space-between;gap:1rem;padding-bottom:1.2rem;border-bottom:1px solid #27364a}.topbar p,.consent-card p,.review-info p{margin:0;color:#c6a15b;font-size:.58rem;font-weight:950;letter-spacing:.14em}.topbar h1,.consent-card h2,.review-info h2{margin:.3rem 0 0;font:700 clamp(1.6rem,4vw,2.5rem)/1.06 Georgia,serif}.topbar>div>span,.consent-card>div>span{display:block;max-width:720px;margin-top:.45rem;color:#9ba8b8;font-size:.72rem;line-height:1.55}.topbar>div:last-child{display:flex;gap:.45rem}.topbar a{display:inline-flex;min-height:44px;align-items:center;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 .8rem;color:#fff;text-decoration:none;font-size:.68rem;font-weight:900}.notice,.loading{margin:1rem 0 0;border-radius:12px;padding:.8rem .9rem;font-size:.72rem;font-weight:850}.notice.ok{background:#0b2d25;color:#a7f3d0}.notice.error{background:#35131b;color:#fecdd3}.loading{border:1px solid #27364a;background:#0b1420;color:#aab5c4}.consent-card{margin-top:1rem;border:1px solid #39495d;border-radius:20px;background:#0b1420;overflow:hidden}.consent-card>div{padding:1rem}.consent-card h2{font-size:1.35rem}.consent-card pre{max-height:310px;overflow:auto;margin:0;border-top:1px solid #263548;border-bottom:1px solid #263548;background:#08111e;padding:1rem;white-space:pre-wrap;color:#bec8d4;font:inherit;font-size:.7rem;line-height:1.65}.consent-card button{min-height:48px;margin:1rem;border:0;border-radius:11px;background:#c6a15b;padding:0 1rem;color:#111827;font-weight:950}.security-note{display:flex;gap:.6rem;margin-top:1rem;border:1px solid #245045;border-radius:15px;background:#09251f;padding:.9rem;color:#d1fae5}.security-note strong{flex:none;font-size:.72rem}.security-note span{font-size:.68rem;line-height:1.5}.slot-grid{display:grid;gap:.8rem;margin-top:1rem}.slot-card{border:1px solid #29394e;border-radius:18px;background:#0b1420;padding:1rem}.slot-card header{display:flex;gap:.7rem;align-items:flex-start}.slot-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#172234;color:#c6a15b;font-size:1.1rem}.slot-card h2{margin:0;font-size:.94rem}.slot-card header p{margin:.25rem 0 0;color:#8998aa;font-size:.65rem;line-height:1.45}.document-state,.empty-state{margin-top:.8rem;border-radius:12px;background:#08111e;padding:.75rem}.document-state>div{display:flex;align-items:center;justify-content:space-between;gap:.6rem}.document-state small{color:#718096;font-size:.54rem;font-weight:950}.document-state strong{color:#fde68a;font-size:.65rem}.document-state strong.verified{color:#86efac}.document-state>span,.document-state>time{display:block;margin-top:.3rem;color:#98a6b8;font-size:.62rem}.rejection{margin:.55rem 0 0;border-radius:9px;background:#301b0c;padding:.55rem;color:#fdba74;font-size:.64rem}.empty-state strong,.empty-state span{display:block}.empty-state strong{font-size:.72rem}.empty-state span{margin-top:.3rem;color:#8998aa;font-size:.64rem;line-height:1.5}.document-actions{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.7rem}.document-actions button,.replace,.capture{display:inline-flex;min-height:43px;align-items:center;justify-content:center;border:1px solid #34465d;border-radius:10px;background:#111c2b;padding:0 .75rem;color:#fff;font-size:.64rem;font-weight:900}.replace,.capture{position:relative;cursor:pointer}.replace input,.capture input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.remove{color:#fda4af!important;border-color:#5b3440!important}.capture{width:100%;margin-top:.7rem;border-color:#75602f;background:#c6a15b;color:#111827}.disabled{opacity:.5;cursor:not-allowed}.review-info{margin-top:1rem;border:1px solid #29394e;border-radius:18px;background:#0b1420;padding:1rem}.review-info h2{font-size:1.25rem}.review-info ol{display:grid;gap:.6rem;margin:.9rem 0 0;padding:0;list-style:none}.review-info li{display:flex;align-items:flex-start;gap:.6rem;border-radius:11px;background:#08111e;padding:.7rem}.review-info li strong{display:grid;width:28px;height:28px;flex:none;place-items:center;border-radius:50%;background:#315e86;font-size:.65rem}.review-info li span{color:#aab5c4;font-size:.68rem;line-height:1.5}a:focus-visible,button:focus-visible,label:focus-within{outline:3px solid #7899b8;outline-offset:2px}@media(min-width:720px){.slot-grid{grid-template-columns:1fr 1fr}.review-info ol{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){.topbar{display:block}.topbar>div:last-child{margin-top:.8rem}.topbar a{flex:1;justify-content:center}.security-note{display:block}.security-note span{display:block;margin-top:.3rem}}
  `],
})
export class AccountWalletComponent implements OnInit {
  readonly wallet = inject(CustomerWalletService);
  readonly working = signal(false);
  readonly workingType = signal<CustomerDocumentType | null>(null);
  readonly message = signal('');
  readonly error = signal('');
  readonly slots: DocumentSlot[] = [
    { type: 'IDENTITY_FRONT', title: 'Kimlik Ön Yüz', description: 'Kimliğinizin fotoğraflı ön yüzünü net ve tam kadraj yükleyin.', icon: 'ID' },
    { type: 'IDENTITY_BACK', title: 'Kimlik Arka Yüz', description: 'Kimliğinizin arka yüzündeki bilgilerin tamamı görünür olmalı.', icon: 'ID' },
    { type: 'DRIVING_LICENSE_FRONT', title: 'Ehliyet Ön Yüz', description: 'Sürücü belgenizin ön yüzünü yansıma ve bulanıklık olmadan yükleyin.', icon: 'E' },
    { type: 'DRIVING_LICENSE_BACK', title: 'Ehliyet Arka Yüz', description: 'Sürücü belgenizin arka yüzünü tam kadraj yükleyin.', icon: 'E' },
  ];

  async ngOnInit(): Promise<void> {
    try { await this.wallet.refresh(); }
    catch { this.error.set('Belge kasası şu anda açılamadı. Lütfen yeniden deneyin.'); }
  }

  documentFor(type: CustomerDocumentType): CustomerDocument | null {
    return this.wallet.documents().find((document) => document.document_type === type) || null;
  }

  statusLabel(status: CustomerDocument['verification_status']): string {
    if (status === 'VERIFIED') return 'Doğrulandı';
    if (status === 'REJECTED') return 'Yeniden Yükleme Gerekli';
    if (status === 'EXPIRED') return 'Süresi Doldu';
    return 'İnceleniyor';
  }

  async acceptTerms(): Promise<void> {
    if (this.working()) return;
    this.working.set(true); this.clearMessages();
    try { await this.wallet.acceptTerms(); this.message.set('Belge kasanız etkinleştirildi. Kimlik ve ehliyet belgelerinizi güvenle ekleyebilirsiniz.'); }
    catch { this.error.set('Belge kasası onayı şu anda tamamlanamadı.'); }
    finally { this.working.set(false); }
  }

  async upload(type: CustomerDocumentType, event: Event, previous?: CustomerDocument): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.workingType()) return;
    this.workingType.set(type); this.clearMessages();
    try {
      await this.wallet.uploadDocument(file, type);
      if (previous) await this.wallet.deleteDocument(previous).catch(() => undefined);
      await this.wallet.refresh();
      this.message.set(`${this.slotTitle(type)} başarıyla yüklendi ve doğrulama sırasına alındı.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      this.error.set(detail.includes('DOCUMENT_SIZE_INVALID') ? 'Belge dosyası en fazla 10 MB olabilir.' : detail.includes('DOCUMENT_TYPE_INVALID') ? 'Lütfen JPEG, PNG veya WebP formatında bir görsel seçin.' : 'Belge yüklenemedi. Lütfen görüntüyü kontrol edip tekrar deneyin.');
    } finally { this.workingType.set(null); }
  }

  async openDocument(document: CustomerDocument): Promise<void> {
    this.clearMessages();
    try { await this.wallet.openDocument(document); }
    catch { this.error.set('Belge şu anda güvenli görüntüleyicide açılamadı.'); }
  }

  async removeDocument(document: CustomerDocument): Promise<void> {
    if (this.workingType()) return;
    this.workingType.set(document.document_type); this.clearMessages();
    try { await this.wallet.deleteDocument(document); this.message.set(`${this.slotTitle(document.document_type)} kaldırıldı.`); }
    catch { this.error.set('Belge kaldırılamadı. Lütfen tekrar deneyin.'); }
    finally { this.workingType.set(null); }
  }

  private slotTitle(type: CustomerDocumentType): string { return this.slots.find((slot) => slot.type === type)?.title || 'Belge'; }
  private clearMessages(): void { this.message.set(''); this.error.set(''); }
}
