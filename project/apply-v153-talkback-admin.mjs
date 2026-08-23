import fs from 'node:fs';

function patch(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`Patch target not found in ${path}: ${from.slice(0, 120)}`);
  fs.writeFileSync(path, source.replace(from, to));
}

// Admin navigation must return to the requested admin URL, not bounce back to /account.
patch(
  'src/app.routes.ts',
  "const adminGuard: CanActivateFn = async () => {\n  const auth = inject(AuthService); const router = inject(Router); await auth.waitUntilReady();\n  if (auth.isLoggedIn()) return true;\n  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: '/account' } });\n};",
  "const adminGuard: CanActivateFn = async (_route, state) => {\n  const auth = inject(AuthService); const router = inject(Router); await auth.waitUntilReady();\n  if (auth.isLoggedIn()) return true;\n  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });\n};",
);
patch(
  'src/app.routes.ts',
  "const adminAreaGuard = (area: AdminArea): CanActivateFn => async () => {\n  const auth = inject(AuthService); const access = inject(AdminAccessService); const router = inject(Router);\n  await auth.waitUntilReady();\n  if (!auth.isLoggedIn()) return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: '/account' } });",
  "const adminAreaGuard = (area: AdminArea): CanActivateFn => async (_route, state) => {\n  const auth = inject(AuthService); const access = inject(AdminAccessService); const router = inject(Router);\n  await auth.waitUntilReady();\n  if (!auth.isLoggedIn()) return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });",
);
patch(
  'src/app.routes.ts',
  "  { path: 'admin/login', redirectTo: 'account/login', pathMatch: 'full' },",
  "  { path: 'admin/login', loadComponent: () => import('./pages/account-login.component').then(m => m.AccountLoginComponent) },",
);

// The same Supabase identity is used for customer and admin access. Let AuthService
// validate an existing customer session instead of requiring a second password session.
patch(
  'src/services/auth.service.ts',
  '  private readonly storageKey = "alperler_admin_session_v1";',
  '  private readonly storageKey = "alperler_admin_session_v1";\n  private readonly customerStorageKey = "alperler_customer_session_v1";',
);
patch(
  'src/services/auth.service.ts',
  "      const raw = localStorage.getItem(this.storageKey);\n      if (!raw) return;",
  "      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem(this.customerStorageKey);\n      if (!raw) return;",
);
patch(
  'src/services/auth.service.ts',
  '      const redirectTo = `${window.location.origin}/admin/settings?tab=account`;',
  '      const redirectTo = `${window.location.origin}/account/login?recovery=1&returnUrl=${encodeURIComponent(\'/admin\')}`;',
);

// Direct /admin/login uses the unified account screen but remembers that the user
// wants the management panel after successful authentication.
patch(
  'src/pages/account-login.component.ts',
  "  private rememberReturnUrl():void{this.auth.setPostAuthReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));}",
  "  private rememberReturnUrl():void{const requested=this.route.snapshot.queryParamMap.get('returnUrl');const adminEntry=typeof window!=='undefined'&&window.location.pathname.startsWith('/admin/login')?'/admin':null;this.auth.setPostAuthReturnUrl(requested||adminEntry);}",
);

// Tour reservation: static ARIA labels, modal background isolation and deterministic
// focus changes replace the former global DOM-scanning accessibility mutation behavior.
patch(
  'src/pages/tour-detail.component.ts',
  '<header class="topbar">',
  '<header class="topbar" [attr.inert]="reservationOpen() ? \'\' : null" [attr.aria-hidden]="reservationOpen() ? \'true\' : null">',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="gallery" [attr.aria-label]="item.title + \' tur görselleri\'">',
  '<section class="gallery" [attr.aria-label]="item.title + \' tur görselleri\'" [attr.inert]="reservationOpen() ? \'\' : null" [attr.aria-hidden]="reservationOpen() ? \'true\' : null">',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<div class="detail-layout">',
  '<div class="detail-layout" [attr.inert]="reservationOpen() ? \'\' : null" [attr.aria-hidden]="reservationOpen() ? \'true\' : null">',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<nav class="action-bar" aria-label="Tur hızlı işlemleri">',
  '<nav class="action-bar" aria-label="Tur hızlı işlemleri" [attr.inert]="reservationOpen() ? \'\' : null" [attr.aria-hidden]="reservationOpen() ? \'true\' : null">',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<button type="button" class="whatsapp" (click)="whatsapp()"><mat-icon aria-hidden="true">chat</mat-icon><span>WhatsApp’tan Sor</span></button>',
  '<button type="button" class="whatsapp" (click)="whatsapp()" aria-label="WhatsApp üzerinden tur hakkında soru sor"><mat-icon aria-hidden="true">chat</mat-icon><span>WhatsApp’tan Sor</span></button>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<button type="button" class="reserve" (click)="openReservation()"><mat-icon aria-hidden="true">event_available</mat-icon><span>Bu Turu Rezerve Et</span></button>',
  '<button type="button" class="reserve" (click)="openReservation()" aria-label="Bu turu rezerve et"><mat-icon aria-hidden="true">event_available</mat-icon><span>Bu Turu Rezerve Et</span></button>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<div class="reservation-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-booking-title">',
  '<div class="reservation-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-booking-title" tabindex="-1">',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="success" role="status"><mat-icon aria-hidden="true">check_circle</mat-icon><h3>Rezervasyon talebiniz kaydedildi</h3><p>Referans: {{ reservationReference() }}</p><button type="button" (click)="closeReservation()">Tura Dön</button></section>',
  '<section class="success" role="status"><mat-icon aria-hidden="true">check_circle</mat-icon><h3>Rezervasyon talebiniz kaydedildi</h3><p>Referans: {{ reservationReference() }}</p><button type="button" (click)="closeReservation()" aria-label="Tur detayına dön">Tura Dön</button></section>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="step-card"><p class="step-kicker">1. Tarih ve kişi sayısı</p>',
  '<section id="tour-step-1" class="step-card" tabindex="-1"><p class="step-kicker">1. Tarih ve kişi sayısı</p>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<button type="button" class="next" (click)="goToContact()">Devam Et</button></section>',
  '<button type="button" class="next" (click)="goToContact()" aria-label="İletişim bilgileri adımına devam et">Devam Et</button></section>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="step-card"><p class="step-kicker">2. İletişim</p>',
  '<section id="tour-step-2" class="step-card" tabindex="-1"><p class="step-kicker">2. İletişim</p>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<label><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label>',
  '<label><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" aria-label="Ad" /></label>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<label><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label>',
  '<label><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" aria-label="Soyad" /></label>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<label><span>Telefon</span><input type="tel" [(ngModel)]="phone" autocomplete="tel" /></label>',
  '<label><span>Telefon</span><input type="tel" [(ngModel)]="phone" autocomplete="tel" aria-label="Telefon" /></label>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<label><span>E-posta</span><input type="email" [(ngModel)]="email" autocomplete="email" /></label>',
  '<label><span>E-posta</span><input type="email" [(ngModel)]="email" autocomplete="email" aria-label="E-posta" /></label>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<label class="note"><span>Not</span><textarea rows="3" [(ngModel)]="notes"></textarea></label>',
  '<label class="note"><span>Not</span><textarea rows="3" [(ngModel)]="notes" aria-label="Rezervasyon notu"></textarea></label>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<div class="step-actions"><button type="button" class="secondary" (click)="reservationStep.set(1)">Geri</button><button type="button" class="next" (click)="goToReview()">Devam Et</button></div></section>',
  '<div class="step-actions"><button type="button" class="secondary" (click)="setReservationStep(1)" aria-label="Tarih ve kişi sayısı adımına geri dön">Geri</button><button type="button" class="next" (click)="goToReview()" aria-label="Rezervasyon onay adımına devam et">Devam Et</button></div></section>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="step-card"><p class="step-kicker">3. Onay</p>',
  '<section id="tour-step-3" class="step-card" tabindex="-1"><p class="step-kicker">3. Onay</p>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<div class="step-actions"><button type="button" class="secondary" (click)="reservationStep.set(2)">Geri</button><button type="button" class="next" (click)="submitReservation()" [disabled]="submitting()">{{ submitting() ? \'Kaydediliyor...\' : \'Rezervasyon Talebini Gönder\' }}</button></div></section>',
  '<div class="step-actions"><button type="button" class="secondary" (click)="setReservationStep(2)" aria-label="İletişim bilgileri adımına geri dön">Geri</button><button type="button" class="next" (click)="submitReservation()" [disabled]="submitting()" aria-label="Rezervasyon talebini gönder">{{ submitting() ? \'Kaydediliyor...\' : \'Rezervasyon Talebini Gönder\' }}</button></div></section>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '<section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Tur yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()">Tekrar Dene</button></section>',
  '<section class="state-panel error" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Tur yüklenemedi</strong><span>{{ loadError() }}</span><button type="button" (click)="reload()" aria-label="Tur bilgilerini tekrar yükle">Tekrar Dene</button></section>',
);
patch(
  'src/pages/tour-detail.component.ts',
  '  openReservation(): void { this.reservationOpen.set(true); this.reservationStep.set(1); this.reservationError.set(""); this.reservationSuccess.set(false); }\n  closeReservation(): void { if (!this.submitting()) this.reservationOpen.set(false); }',
  '  openReservation(): void { this.reservationOpen.set(true); this.reservationStep.set(1); this.reservationError.set(""); this.reservationSuccess.set(false); this.focusAfterRender(".reservation-overlay > header button"); }\n  closeReservation(): void { if (!this.submitting()) { this.reservationOpen.set(false); this.focusAfterRender(".action-inner .reserve"); } }\n  setReservationStep(step: 1 | 2 | 3): void { this.reservationStep.set(step); this.reservationError.set(""); this.focusAfterRender(`#tour-step-${step}`); }',
);
patch(
  'src/pages/tour-detail.component.ts',
  '  goToContact(): void { if (!this.tourDate || this.tourDate < this.today) { this.reservationError.set("Geçerli bir tur tarihi seçin."); return; } this.reservationError.set(""); this.reservationStep.set(2); }\n  goToReview(): void { if (!this.firstName.trim() || !this.lastName.trim() || !/^[+0-9()\\s-]{7,24}$/.test(this.phone.trim()) || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(this.email.trim())) { this.reservationError.set("Ad, soyad, telefon ve geçerli e-posta bilgilerini tamamlayın."); return; } this.reservationError.set(""); this.reservationStep.set(3); }',
  '  goToContact(): void { if (!this.tourDate || this.tourDate < this.today) { this.reservationError.set("Geçerli bir tur tarihi seçin."); return; } this.setReservationStep(2); }\n  goToReview(): void { if (!this.firstName.trim() || !this.lastName.trim() || !/^[+0-9()\\s-]{7,24}$/.test(this.phone.trim()) || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(this.email.trim())) { this.reservationError.set("Ad, soyad, telefon ve geçerli e-posta bilgilerini tamamlayın."); return; } this.setReservationStep(3); }',
);
patch(
  'src/pages/tour-detail.component.ts',
  '  imageFailed(url: string): void { this.failedImages.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }',
  '  imageFailed(url: string): void { this.failedImages.update((items) => items.includes(url) ? items : [...items, url]); this.currentSlide.set(0); }\n  private focusAfterRender(selector: string): void { if (typeof window === "undefined") return; window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }), 0); }',
);

console.log('V153 TalkBack and admin login patch applied.');
