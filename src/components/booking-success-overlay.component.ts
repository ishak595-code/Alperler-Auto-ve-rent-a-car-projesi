import { Component, OnDestroy, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { BookingSuccessExperienceService } from '../services/booking-success-experience.service';
import { CustomerAuthService } from '../services/customer-auth.service';

@Component({
  selector: 'app-booking-success-overlay',
  standalone: true,
  template: `
    @if (experience.result(); as result) {
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="booking-success-title" aria-describedby="booking-success-description">
        <section class="card">
          <div class="icon" aria-hidden="true">✓</div>
          <p class="eyebrow">TALEBİNİZ ALINDI</p>
          <h2 id="booking-success-title">Talebiniz başarıyla gönderildi</h2>
          <p id="booking-success-description">Talebinizi oluşturduğunuz için teşekkür ederiz. Ekibimiz bilgilerinizi inceleyerek en kısa süre içerisinde sizinle iletişime geçecektir.</p>
          @if (result.itemName) {<strong class="item">{{ result.itemName }}</strong>}
          <div class="reference"><span>Referans numaranız</span><strong>{{ result.reference }}</strong></div>
          @if (auth.isLoggedIn()) {
            <p class="account-note">Talebinizin güncel durumunu Hesabım bölümünden takip edebilir, uygun işlemleri hesabınızdan iptal edebilirsiniz.</p>
          } @else {
            <p class="account-note">Bir sonraki işlemlerinizde taleplerinizi hesabınızdan takip etmek için müşteri hesabınızla giriş yapabilirsiniz.</p>
          }
          <div class="actions">
            @if (auth.isLoggedIn()) {<button type="button" class="primary" (click)="goAccount()">Hesabımda Takip Et</button>}
            <button type="button" [class.primary]="!auth.isLoggedIn()" class="secondary" (click)="goHome()">Ana Sayfaya Dön</button>
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    :host{display:contents}.overlay{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;background:rgba(2,6,23,.82);padding:1rem;backdrop-filter:blur(8px)}.card{width:min(100%,520px);max-height:calc(100dvh - 2rem);overflow:auto;border:1px solid #30425a;border-radius:24px;background:#08111e;padding:clamp(1.2rem,4vw,2rem);color:#f8fafc;box-shadow:0 34px 90px rgba(0,0,0,.5);text-align:center}.icon{display:grid;width:64px;height:64px;margin:auto;place-items:center;border-radius:50%;background:#0f513c;color:#d1fae5;font-size:2rem;font-weight:950}.eyebrow{margin:1rem 0 0;color:#c6a15b;font-size:.6rem;font-weight:950;letter-spacing:.14em}.card h2{margin:.45rem 0 0;font:700 clamp(1.65rem,6vw,2.35rem)/1.05 Georgia,serif}.card>p:not(.eyebrow):not(.account-note){margin:.75rem auto 0;max-width:430px;color:#b8c2cf;font-size:.78rem;line-height:1.65}.item{display:block;margin:.9rem auto 0;color:#fff;font-size:.82rem}.reference{margin:1rem 0 0;border:1px solid #293c54;border-radius:13px;background:#0c1726;padding:.75rem}.reference span,.reference strong{display:block}.reference span{color:#8291a5;font-size:.58rem;font-weight:900;text-transform:uppercase}.reference strong{margin-top:.25rem;color:#93c5fd;font-size:.82rem;overflow-wrap:anywhere}.account-note{margin:.8rem 0 0;color:#9eabbc;font-size:.68rem;line-height:1.55}.actions{display:grid;gap:.5rem;margin-top:1rem}.actions button{min-height:48px;border-radius:12px;padding:0 1rem;font-size:.72rem;font-weight:950}.primary{border:0;background:#c6a15b!important;color:#111827!important}.secondary{border:1px solid #35475d;background:#101a29;color:#f8fafc}button:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}@media(min-width:520px){.actions{grid-template-columns:1fr 1fr}}
  `],
})
export class BookingSuccessOverlayComponent implements OnDestroy {
  readonly experience = inject(BookingSuccessExperienceService);
  readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly navigationSub: Subscription;

  constructor() {
    this.navigationSub = this.router.events.pipe(filter((event) => event instanceof NavigationStart)).subscribe(() => this.experience.clear());
  }

  goAccount(): void {
    this.experience.clear();
    void this.router.navigate(['/account']);
  }

  goHome(): void {
    this.experience.clear();
    void this.router.navigate(['/']);
  }

  ngOnDestroy(): void { this.navigationSub.unsubscribe(); }
}
