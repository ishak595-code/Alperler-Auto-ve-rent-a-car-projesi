import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CarService } from "../services/car.service";
import { FooterSettingsService } from "../services/footer-settings.service";
import { UiService } from "../services/ui.service";
import { SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from "../supabase.config";

interface SocialPlatform {
  name: string;
  url: string;
  icon: string;
}

@Component({
  selector: "app-customer-footer-v70",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (footer.settings().isEnabled) {
      <footer class="customer-footer" [attr.aria-label]="(config().companyName || 'Alperler Rent A Car') + ' alt bilgi'">
        <div class="footer-shell">
          <section class="brand-column" aria-labelledby="footer-brand-title">
            <a routerLink="/" class="brand-link" [attr.aria-label]="(config().companyName || 'Alperler Rent A Car') + ' ana sayfa'">
              <span class="brand-mark" aria-hidden="true">A</span>
              <span class="brand-copy"><strong id="footer-brand-title">{{ config().companyName || 'Alperler Rent A Car' }}</strong><small>{{ cleanTagline() }}</small></span>
            </a>
            <p class="brand-summary">{{ footer.settings().brandSummary }}</p>
            <div class="contact-row" aria-label="İletişim">
              @if (footer.settings().showPhone && phoneHref()) { <a [href]="phoneHref()" class="contact-pill" aria-label="Telefonla ara">Telefon</a> }
              @if (footer.settings().showWhatsapp && whatsappHref()) { <a [href]="whatsappHref()" target="_blank" rel="noopener noreferrer" class="contact-pill whatsapp" aria-label="WhatsApp ile iletişim kur">WhatsApp</a> }
            </div>

            @if (footer.settings().showSocial) {
              <nav class="social-row" aria-label="Sosyal medya hesapları">
                @for (social of socialLinks(); track social.name) {
                  @if (social.url) {
                    <a [href]="social.url" target="_blank" rel="noopener noreferrer" class="social-link" [attr.aria-label]="social.name" [title]="social.name">
                      <img class="social-icon" [src]="social.icon" [alt]="social.name + ' logosu'" />
                    </a>
                  } @else {
                    <span class="social-link social-disabled" role="img" [attr.aria-label]="social.name + ' bağlantısı henüz eklenmedi'" [title]="social.name + ' bağlantısı admin panelinden eklendiğinde aktif olur'">
                      <img class="social-icon" [src]="social.icon" [alt]="social.name + ' logosu'" />
                    </span>
                  }
                }
              </nav>
            }
          </section>

          <nav class="link-column" aria-label="Hizmetler">
            <h2>{{ footer.settings().servicesTitle }}</h2>
            <a routerLink="/fleet">Kiralık Araçlar</a><a routerLink="/sales">Satılık Araçlar</a><a routerLink="/tours">Turlar</a><a routerLink="/campaigns">Kampanyalar</a><a routerLink="/branches">Şubelerimiz</a><a routerLink="/appointment">Randevu</a>
          </nav>

          <nav class="link-column" aria-label="Kurumsal">
            <h2>{{ footer.settings().corporateTitle }}</h2>
            <a routerLink="/about">Hakkımızda</a><a routerLink="/contact">İletişim</a><a routerLink="/blog">Blog</a><a routerLink="/faq">Sık Sorulan Sorular</a>
            @if (footer.settings().showFeedback) { <button type="button" (click)="openFeedback()">Geri Bildirim Gönder</button> }
          </nav>

          @if (footer.settings().showLegalLinks) {
            <nav class="link-column legal-column" aria-label="Yasal bilgiler">
              <h2>{{ footer.settings().legalTitle }}</h2>
              <a routerLink="/legal" [queryParams]="{type:'rental'}">Kiralama Koşulları</a>
              <a routerLink="/legal" [queryParams]="{type:'insurance'}">Sigorta ve Sorumluluk</a>
              <a routerLink="/legal" [queryParams]="{type:'cancellation'}">İade ve İptal</a>
              <a routerLink="/legal" [queryParams]="{type:'kvkk'}">KVKK Aydınlatma</a>
              <a routerLink="/legal" [queryParams]="{type:'privacy'}">Gizlilik</a>
              <details class="legal-more"><summary>Diğer yasal bilgiler</summary><div class="legal-more-links">
                <a routerLink="/legal" [queryParams]="{type:'sales'}">Satış ve İlan Koşulları</a>
                <a routerLink="/legal" [queryParams]="{type:'tour'}">Tur ve Transfer Koşulları</a>
                <a routerLink="/legal" [queryParams]="{type:'partner'}">Aracını Değerlendir Koşulları</a>
                <a routerLink="/legal" [queryParams]="{type:'branch'}">Şube ve Bayilik Koşulları</a>
                <a routerLink="/legal" [queryParams]="{type:'commercial-communication'}">Bülten ve Ticari İleti</a>
                <a routerLink="/legal" [queryParams]="{type:'terms'}">Genel Kullanım Şartları</a>
                <a routerLink="/legal" [queryParams]="{type:'cookies'}">Çerez Politikası</a>
              </div></details>
            </nav>
          }

          @if (footer.settings().newsletterEnabled) {
            <section class="newsletter" aria-labelledby="newsletter-title-v70">
              <h2 id="newsletter-title-v70">{{ footer.settings().newsletterTitle }}</h2><p>{{ footer.settings().newsletterDescription }}</p>
              <form (submit)="subscribe($event)" novalidate>
                <label for="footer-email-v70">E-posta adresi</label>
                <div class="subscribe-row"><input id="footer-email-v70" type="email" [(ngModel)]="email" name="footerEmail" autocomplete="email" inputmode="email" required placeholder="ornek@eposta.com" aria-label="Bülten e-posta adresi" /><button type="submit" [disabled]="submitting()">{{ submitting() ? 'Kaydediliyor…' : footer.settings().newsletterButtonText }}</button></div>
                <p class="consent-note">Abonelik ücretsizdir. <a routerLink="/legal" [queryParams]="{type:'commercial-communication'}">Ticari ileti ve abonelik koşulları</a></p>
                @if (subscribed()) { <p class="success" role="status" aria-live="polite">Aboneliğiniz kaydedildi.</p> }
                @if (subscriptionError()) { <p class="error" role="alert">{{ subscriptionError() }}</p> }
              </form>
            </section>
          }
        </div>
        <div class="footer-bottom"><span>© {{ currentYear }} {{ config().companyName || 'Alperler Rent A Car' }}. Tüm hakları saklıdır.</span><a routerLink="/admin/login">Yönetici</a></div>
      </footer>
    }
  `,
  styles: [`
    :host{display:block}.customer-footer{background:#030817;color:#a8b4c7;border-top:1px solid rgba(148,163,184,.14);padding:2.4rem 0 calc(1rem + env(safe-area-inset-bottom));font-family:ui-sans-serif,system-ui,sans-serif}.footer-shell{width:min(100% - 1.5rem,80rem);margin:auto;display:grid;gap:2rem}.brand-link{display:flex;width:max-content;max-width:100%;align-items:center;gap:.8rem;color:#fff;text-decoration:none}.brand-mark{display:grid;width:48px;height:48px;place-items:center;border-radius:15px;background:linear-gradient(145deg,#2563eb,#1d4ed8);font:900 1.35rem/1 Georgia,serif}.brand-copy{display:flex;min-width:0;flex-direction:column}.brand-copy strong{font-family:Georgia,"Times New Roman",serif;font-size:1.3rem}.brand-copy small{margin-top:.2rem;color:#94a3b8;font-size:.65rem;font-weight:850;text-transform:uppercase}.brand-summary{max-width:430px;margin:1rem 0 0;font-size:.84rem;line-height:1.65;color:#8f9db2}.contact-row,.social-row{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.contact-pill{display:inline-flex;min-height:42px;align-items:center;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:#091224;padding:0 .85rem;color:#dbe7f6;font-size:.73rem;font-weight:850;text-decoration:none}.contact-pill.whatsapp{border-color:rgba(16,185,129,.28);color:#a7f3d0}.social-link{display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(148,163,184,.22);border-radius:13px;background:#fff;text-decoration:none;transition:transform .16s ease,border-color .16s ease,opacity .16s ease}.social-link[href]:hover{transform:translateY(-2px);border-color:#60a5fa}.social-disabled{opacity:.36;cursor:default}.social-icon{display:block;width:21px;height:21px;object-fit:contain}.link-column{display:flex;flex-direction:column;align-items:flex-start;gap:.2rem}.link-column h2,.newsletter h2{margin:0 0 .65rem;color:#fff;font-size:.78rem;font-weight:900;text-transform:uppercase}.link-column a,.link-column button{display:flex;min-height:39px;align-items:center;border:0;background:transparent;padding:0;color:#9ba9bc;font:750 .78rem/1.2 inherit;text-decoration:none}.legal-more{width:100%}.legal-more summary{min-height:38px;display:flex;align-items:center;cursor:pointer;color:#93c5fd;font-size:.7rem;font-weight:900;list-style:none}.legal-more-links{display:flex;flex-direction:column}.newsletter p{margin:0 0 .85rem;max-width:380px;color:#8391a6;font-size:.78rem;line-height:1.55}.newsletter label{display:block;margin-bottom:.35rem;color:#aab7ca;font-size:.69rem;font-weight:850}.subscribe-row{display:grid;grid-template-columns:1fr auto;gap:.45rem;max-width:440px}.subscribe-row input{min-width:0;min-height:46px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:#071020;padding:0 .75rem;color:#fff}.subscribe-row button{min-height:46px;border:0;border-radius:12px;background:#2563eb;padding:0 .85rem;color:#fff;font-weight:900}.newsletter .consent-note{margin:.55rem 0 0;font-size:.66rem;color:#64748b}.consent-note a{color:#93c5fd}.success{margin-top:.55rem!important;color:#86efac!important;font-weight:800}.error{margin-top:.55rem!important;color:#fda4af!important;font-weight:800}.footer-bottom{width:min(100% - 1.5rem,80rem);margin:2rem auto 0;border-top:1px solid rgba(148,163,184,.13);padding-top:1.2rem;display:flex;justify-content:space-between;gap:1rem;color:#64748b;font-size:.68rem}.footer-bottom a{color:#64748b;text-decoration:none}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}@media(max-width:430px){.subscribe-row{grid-template-columns:1fr}.subscribe-row button{width:100%}}@media(min-width:720px){.footer-shell{grid-template-columns:1.3fr 1fr 1fr}.customer-footer{padding-bottom:2.25rem}}@media(min-width:1100px){.footer-shell{grid-template-columns:1.25fr .75fr .75fr 1fr 1.15fr}}
  `],
})
export class CustomerFooterV70Component {
  private readonly carService = inject(CarService);
  private readonly ui = inject(UiService);
  readonly footer = inject(FooterSettingsService);
  readonly config = this.carService.getConfig();
  readonly currentYear = new Date().getFullYear();
  readonly subscribed = signal(false);
  readonly submitting = signal(false);
  readonly subscriptionError = signal("");
  email = "";

  cleanTagline(): string { const raw=String(this.config().tagline||"").trim(); return !raw||/premium/i.test(raw)?"Kiralama • Satış • Tur":raw; }
  phoneHref(): string { const digits=String(this.config().phone||"").replace(/[^+\d]/g,""); return digits?`tel:${digits}`:""; }
  whatsappHref(): string { const digits=String(this.config().whatsapp||this.config().phone||"").replace(/\D/g,""); if(!digits)return""; const message=this.config().whatsappMessage?.trim()||"Merhaba, Alperler Rent A Car hizmetleri hakkında bilgi almak istiyorum."; return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`; }

  socialLinks(): SocialPlatform[] {
    const cfg=this.config();
    return [
      {name:'Instagram',url:this.safeSocialUrl(cfg.instagramUrl),icon:'/brand-icons/instagram.svg'},
      {name:'Facebook',url:this.safeSocialUrl(cfg.facebookUrl),icon:'/brand-icons/facebook.svg'},
      {name:'TikTok',url:this.safeSocialUrl(cfg.tiktokUrl),icon:'/brand-icons/tiktok.svg'},
      {name:'YouTube',url:this.safeSocialUrl(cfg.youtubeUrl),icon:'/brand-icons/youtube.svg'},
      {name:'X',url:this.safeSocialUrl(cfg.twitterUrl),icon:'/brand-icons/x.svg'},
    ];
  }

  async subscribe(event:Event):Promise<void>{
    event.preventDefault(); if(this.submitting())return;
    const normalized=this.email.trim().toLocaleLowerCase('tr-TR'); this.subscribed.set(false); this.subscriptionError.set('');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)||normalized.length>160){this.subscriptionError.set('Geçerli bir e-posta adresi girin.');return;}
    this.submitting.set(true);
    try{
      const response=await fetch(supabaseFunctionUrl('newsletter-gateway'),{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},body:JSON.stringify({email:normalized,locale:this.ui.currentLang().toLowerCase()}),signal:AbortSignal.timeout(12_000)});
      const payload=await response.json().catch(()=>({})) as {ok?:boolean;code?:string};
      if(!response.ok||!payload.ok)throw new Error(payload.code||`NEWSLETTER_HTTP_${response.status}`);
      this.email='';this.subscribed.set(true);
    }catch(error){console.error('Newsletter subscription failed',error);this.subscriptionError.set('Abonelik şu anda kaydedilemedi. Lütfen tekrar deneyin.');}
    finally{this.submitting.set(false);}
  }

  openFeedback():void{this.ui.toggleFeedback(true);}

  private safeSocialUrl(value:string|undefined):string{
    const raw=String(value||'').trim(); if(!raw)return'';
    try{
      const url=new URL(raw); if(url.protocol!=='https:')return'';
      const host=url.hostname.toLowerCase().replace(/^www\./,'');
      const allowed=['instagram.com','tiktok.com','youtube.com','youtu.be','facebook.com','fb.com','x.com','twitter.com'];
      if(!allowed.some((domain)=>host===domain||host.endsWith(`.${domain}`)))return'';
      url.hash=''; return url.toString();
    }catch{return'';}
  }
}
