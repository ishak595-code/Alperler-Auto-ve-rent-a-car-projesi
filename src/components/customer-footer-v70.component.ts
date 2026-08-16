import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";

@Component({
  selector: "app-customer-footer-v70",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <footer class="customer-footer" aria-label="Alperler Auto alt bilgi">
      <div class="footer-shell">
        <section class="brand-column" aria-labelledby="footer-brand-title">
          <a routerLink="/" class="brand-link" aria-label="Alperler Auto ana sayfa">
            <span class="brand-mark" aria-hidden="true">A</span>
            <span class="brand-copy">
              <strong id="footer-brand-title">{{ config().companyName || 'Alperler Auto' }}</strong>
              <small>{{ cleanTagline() }}</small>
            </span>
          </a>
          <p class="brand-summary">
            Yüksekova'da araç kiralama, ikinci el satış ve bölgesel tur hizmetlerini tek yerde planlayın. Net bilgi, kolay iletişim ve yerel destek.
          </p>
          <div class="contact-row">
            @if (phoneHref()) {
              <a [href]="phoneHref()" class="contact-pill" aria-label="Alperler Auto telefonunu ara">Telefon</a>
            }
            @if (whatsappHref()) {
              <a [href]="whatsappHref()" target="_blank" rel="noopener noreferrer" class="contact-pill whatsapp" aria-label="Alperler Auto WhatsApp hattını aç">WhatsApp</a>
            }
            @if (config().instagramUrl) {
              <a [href]="config().instagramUrl" target="_blank" rel="noopener noreferrer" class="contact-pill" aria-label="Alperler Auto Instagram hesabını aç">Instagram</a>
            }
          </div>
        </section>

        <nav class="link-column" aria-label="Hizmet bağlantıları">
          <h2>Hizmetler</h2>
          <a routerLink="/fleet">Kiralık Araçlar</a>
          <a routerLink="/sales">Satılık Araçlar</a>
          <a routerLink="/tours">Turlar</a>
          <a routerLink="/campaigns">Kampanyalar</a>
          <a routerLink="/branches">Şubelerimiz</a>
          <a routerLink="/appointment">Randevu</a>
        </nav>

        <nav class="link-column" aria-label="Kurumsal bağlantılar">
          <h2>Alperler Auto</h2>
          <a routerLink="/about">Hakkımızda</a>
          <a routerLink="/contact">İletişim</a>
          <a routerLink="/blog">Blog</a>
          <a routerLink="/faq">Sık Sorulan Sorular</a>
          <a routerLink="/legal">Yasal Bilgilendirmeler</a>
          <button type="button" (click)="openFeedback()">Geri Bildirim Gönder</button>
        </nav>

        <section class="newsletter" aria-labelledby="newsletter-title-v70">
          <h2 id="newsletter-title-v70">Yeni araç ve fırsatları kaçırmayın</h2>
          <p>Sadece yeni ilan, tur ve kampanya olduğunda haber alın.</p>
          <form (submit)="subscribe($event)">
            <label for="footer-email-v70">E-posta adresi</label>
            <div class="subscribe-row">
              <input id="footer-email-v70" type="email" [(ngModel)]="email" name="footerEmail" autocomplete="email" inputmode="email" required placeholder="ornek@eposta.com" aria-label="Bülten için e-posta adresi" />
              <button type="submit">Abone Ol</button>
            </div>
            @if (subscribed()) {
              <p class="success" role="status" aria-live="polite">Aboneliğiniz kaydedildi.</p>
            }
          </form>
        </section>
      </div>

      <div class="footer-bottom">
        <span>© {{ currentYear }} {{ config().companyName || 'Alperler Auto' }}. Tüm hakları saklıdır.</span>
        <a routerLink="/admin/login" aria-label="Yönetici girişi">Yönetici</a>
      </div>
    </footer>
  `,
  styles: [`
    :host{display:block}
    .customer-footer{background:#030817;color:#a8b4c7;border-top:1px solid rgba(148,163,184,.14);padding:2.25rem 0 calc(5.6rem + env(safe-area-inset-bottom));font-family:ui-sans-serif,system-ui,sans-serif}
    .footer-shell{width:min(100% - 1.5rem,80rem);margin:auto;display:grid;gap:2rem}
    .brand-link{display:flex;width:max-content;max-width:100%;align-items:center;gap:.8rem;color:#fff;text-decoration:none;border-radius:14px}.brand-link:focus-visible,.link-column a:focus-visible,.link-column button:focus-visible,.contact-pill:focus-visible,.footer-bottom a:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}
    .brand-mark{display:grid;width:48px;height:48px;place-items:center;border-radius:15px;background:linear-gradient(145deg,#2563eb,#1d4ed8);font:900 1.35rem/1 Georgia,serif;box-shadow:0 14px 28px rgba(37,99,235,.24)}
    .brand-copy{display:flex;min-width:0;flex-direction:column}.brand-copy strong{font-family:Georgia,"Times New Roman",serif;font-size:1.3rem;letter-spacing:.055em}.brand-copy small{margin-top:.2rem;color:#94a3b8;font-size:.65rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
    .brand-summary{max-width:430px;margin:1rem 0 0;font-size:.84rem;line-height:1.65;color:#8f9db2}.contact-row{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.contact-pill{display:inline-flex;min-height:42px;align-items:center;border:1px solid rgba(148,163,184,.2);border-radius:12px;background:#091224;padding:0 .85rem;color:#dbe7f6;font-size:.73rem;font-weight:850;text-decoration:none}.contact-pill.whatsapp{border-color:rgba(16,185,129,.28);color:#a7f3d0}
    .link-column{display:flex;flex-direction:column;align-items:flex-start;gap:.2rem}.link-column h2,.newsletter h2{margin:0 0 .65rem;color:#fff;font-size:.78rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.link-column a,.link-column button{display:flex;min-height:40px;align-items:center;border:0;background:transparent;padding:0;color:#9ba9bc;font:750 .78rem/1.2 inherit;text-decoration:none;cursor:pointer}.link-column a:hover,.link-column button:hover{color:#fff}
    .newsletter p{margin:0 0 .85rem;max-width:330px;color:#8391a6;font-size:.78rem;line-height:1.55}.newsletter label{display:block;margin-bottom:.35rem;color:#aab7ca;font-size:.69rem;font-weight:850}.subscribe-row{display:grid;grid-template-columns:1fr auto;gap:.45rem;max-width:390px}.subscribe-row input{min-width:0;min-height:46px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:#071020;padding:0 .75rem;color:#fff;outline:none}.subscribe-row input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.14)}.subscribe-row button{min-height:46px;border:0;border-radius:12px;background:#2563eb;padding:0 .85rem;color:#fff;font-weight:900;cursor:pointer}.success{margin-top:.55rem!important;color:#86efac!important;font-weight:800}
    .footer-bottom{width:min(100% - 1.5rem,80rem);margin:2rem auto 0;border-top:1px solid rgba(148,163,184,.13);padding-top:1.2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;color:#64748b;font-size:.68rem}.footer-bottom a{display:inline-flex;min-height:40px;align-items:center;color:#64748b;text-decoration:none}
    @media(min-width:720px){.footer-shell{grid-template-columns:1.4fr .8fr .8fr}.newsletter{grid-column:1/-1}.customer-footer{padding-bottom:2.25rem}}
    @media(min-width:1024px){.footer-shell{grid-template-columns:1.45fr .72fr .72fr 1.15fr}.newsletter{grid-column:auto}.customer-footer{padding-top:3rem}}
  `],
})
export class CustomerFooterV70Component {
  private readonly carService = inject(CarService);
  private readonly ui = inject(UiService);
  readonly config = this.carService.getConfig();
  readonly currentYear = new Date().getFullYear();
  readonly subscribed = signal(false);
  email = "";

  cleanTagline(): string {
    const raw = String(this.config().tagline || "").trim();
    if (!raw || /premium/i.test(raw)) return "Kiralama • Satış • Tur";
    return raw;
  }

  phoneHref(): string {
    const digits = String(this.config().phone || "").replace(/[^+\d]/g, "");
    return digits ? `tel:${digits}` : "";
  }

  whatsappHref(): string {
    const digits = String(this.config().whatsapp || this.config().phone || "").replace(/\D/g, "");
    if (!digits) return "";
    const message = this.config().whatsappMessage?.trim() || "Merhaba, Alperler Auto hizmetleri hakkında bilgi almak istiyorum.";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }

  subscribe(event: Event): void {
    event.preventDefault();
    const normalized = this.email.trim().toLocaleLowerCase("tr-TR");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    this.carService.addSubscriber(normalized);
    this.email = "";
    this.subscribed.set(true);
    if (typeof window !== "undefined") window.setTimeout(() => this.subscribed.set(false), 3500);
  }

  openFeedback(): void {
    this.ui.toggleFeedback(true);
  }
}
