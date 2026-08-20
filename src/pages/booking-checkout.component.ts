import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { Branch } from "../models/branch.model";
import { RentalExtraOption } from "../models/site-config.model";
import { BookingService } from "../services/booking.service";
import { BranchService } from "../services/branch.service";
import { CarService } from "../services/car.service";
import { PaymentService } from "../services/payment.service";
import { ToastService } from "../services/toast.service";

interface LocationChoice { key: string; label: string; }

@Component({
  selector: "app-booking-checkout",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AccessibleNativeDateComponent],
  template: `
    <main class="checkout-page">
      <header class="checkout-header">
        <div class="header-inner">
          <button type="button" class="icon-button" (click)="goBack()" aria-label="Rezervasyondan geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div class="header-copy"><span>{{ isRental() ? ('Adım ' + checkoutStep() + ' / 3') : 'Talep' }}</span><h1>{{ isRental() ? 'Rezervasyon Oluştur' : 'Talep Oluştur' }}</h1><p>{{ request()?.itemName }}</p></div>
        </div>
      </header>

      <div class="checkout-shell">
        @if (request(); as booking) {
          <section class="item-card" aria-labelledby="checkout-item-title">
            @if (booking.image) {<img [src]="booking.image" [alt]="booking.itemName" />}
            <div><p>{{ isRental() ? 'Kiralık Araç' : 'Satın Alma Talebi' }}</p><h2 id="checkout-item-title">{{ booking.itemName }}</h2>@if (booking.basePrice) {<strong>{{ booking.basePrice | number }} ₺{{ isRental() ? ' / gün' : '' }}</strong>}</div>
          </section>

          @if (successMessage()) {
            <section class="success-card" role="status" aria-live="polite"><mat-icon aria-hidden="true">check_circle</mat-icon><h2>Talebiniz Kaydedildi</h2><p>{{ successMessage() }}</p><strong>Referans: {{ bookingReference() }}</strong><button type="button" (click)="finish()">Ana Sayfaya Dön</button></section>
          } @else if (isRental()) {
            @if (checkoutStep() === 1) {
              <section class="step-card" aria-labelledby="rental-step-title">
                <p class="step-kicker">1. Planlama</p><h2 id="rental-step-title">Tarih, teslim ve şoför seçimi</h2><p class="step-copy">Bu adımda yalnız kiralama planınızı belirleyin. İletişim ve ödeme sonraki ekranlarda açılır.</p>

                <label class="field"><span>Kiralama Türü</span><select [(ngModel)]="rentalDuration" (ngModelChange)="calculatePrice()" aria-label="Kiralama türü"><option value="daily">Günlük</option><option value="monthly">Aylık</option><option value="longterm">Uzun Dönem</option></select></label>
                <div class="date-grid"><app-accessible-native-date label="Alış Tarihi" [value]="startDate" [min]="today" (valueChange)="setStartDate($event)" /><app-accessible-native-date label="İade Tarihi" [value]="endDate" [min]="startDate || today" (valueChange)="setEndDate($event)" /></div>

                <div class="driver-block" aria-labelledby="driver-choice-title"><span id="driver-choice-title">Şoför Tercihi</span><div class="choice-grid">
                  @if (driverAllowed(false)) {<button type="button" (click)="setDriver(false)" [attr.aria-pressed]="!withDriver()" [class.active]="!withDriver()"><mat-icon aria-hidden="true">key</mat-icon><strong>Şoförsüz</strong><small>Aracı siz kullanırsınız</small></button>}
                  @if (driverAllowed(true)) {<button type="button" (click)="setDriver(true)" [attr.aria-pressed]="withDriver()" [class.active]="withDriver()"><mat-icon aria-hidden="true">person_pin</mat-icon><strong>Şoförlü</strong><small>{{ driverPriceLabel() }}</small></button>}
                </div></div>

                <div class="location-grid">
                  <label class="field"><span>Nereden alınacak?</span><select [ngModel]="pickupLocation()" (ngModelChange)="setPickupLocation($event)" aria-label="Teslim alma noktası"><option value="">Teslim alma noktası seçin</option>@for (choice of pickupChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label>
                  <label class="field"><span>Nereye iade edilecek?</span><select [ngModel]="dropoffLocation()" (ngModelChange)="setDropoffLocation($event)" aria-label="İade noktası"><option value="">İade noktası seçin</option>@for (choice of returnChoices(); track choice.key) {<option [value]="choice.label">{{ choice.label }}</option>}</select></label>
                </div>

                @if (additionalExtras().length) {
                  <details class="extras-details"><summary><span><strong>Ek Hizmetler</strong><small>{{ selectedAdditionalCount() ? selectedAdditionalCount() + ' hizmet seçildi' : 'İsterseniz ekleyin' }}</small></span><mat-icon aria-hidden="true">expand_more</mat-icon></summary><div class="extras-list">@for (extra of additionalExtras(); track extra.id) {<label [class.disabled]="extraUnavailable(extra)"><input type="checkbox" [checked]="isExtraSelected(extra.id)" [disabled]="extraUnavailable(extra)" (change)="toggleExtra(extra)" [attr.aria-label]="extra.label + ' ek hizmetini seç'" /><span><strong>{{ extra.label }}</strong><small>{{ extraPriceLabel(extra) }}</small></span></label>}</div></details>
                }

                <div class="price-summary" aria-live="polite"><div><span>Araç · {{ totalDays() }} gün</span><strong>{{ baseRentalTotal() | number }} ₺</strong></div>@if (extrasTotal() > 0) {<div><span>Şoför / ek hizmetler</span><strong>{{ extrasTotal() | number }} ₺</strong></div>}@if (matchedDistanceKm() > 0) {<div><span>Mesafe / yakıt · {{ matchedDistanceKm() | number:'1.0-1' }} km</span><strong>{{ routeFuelTotal() | number }} ₺</strong></div>}<div class="total"><span>Tahmini Toplam</span><strong>{{ totalPrice() | number }} ₺</strong></div></div>
                @if (errorMessage()) {<p class="form-error" role="alert">{{ errorMessage() }}</p>}
                <button type="button" class="next-button" (click)="continueFromPlan()">Sonraki Adım <mat-icon aria-hidden="true">arrow_forward</mat-icon></button>
              </section>
            } @else if (checkoutStep() === 2) {
              <section class="step-card" aria-labelledby="contact-step-title"><p class="step-kicker">2. İletişim</p><h2 id="contact-step-title">Size nasıl ulaşalım?</h2><p class="step-copy">Kiralama planınız korunur. Bu ekranda yalnız iletişim bilgilerinizi tamamlayın.</p><div class="form-grid"><label class="field"><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label><label class="field"><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label><label class="field"><span>Telefon</span><input type="tel" [(ngModel)]="phone" autocomplete="tel" /></label><label class="field"><span>E-posta</span><input type="email" [(ngModel)]="email" autocomplete="email" /></label></div><label class="field note"><span>Not</span><textarea rows="3" [(ngModel)]="notes" placeholder="Özel istek veya açıklama"></textarea></label>@if (errorMessage()) {<p class="form-error" role="alert">{{ errorMessage() }}</p>}<div class="step-actions"><button type="button" class="back-button" (click)="checkoutStep.set(1)">Geri</button><button type="button" class="next-button" (click)="continueFromContact()">Sonraki Adım <mat-icon aria-hidden="true">arrow_forward</mat-icon></button></div></section>
            } @else {
              <section class="step-card" aria-labelledby="payment-step-title"><p class="step-kicker">3. Onay ve Ödeme</p><h2 id="payment-step-title">Rezervasyonu kontrol edin</h2><dl class="review"><div><dt>Araç</dt><dd>{{ booking.itemName }}</dd></div><div><dt>Tarih</dt><dd>{{ formattedDateRange() }}</dd></div><div><dt>Şoför</dt><dd>{{ withDriver() ? 'Şoförlü' : 'Şoförsüz' }}</dd></div><div><dt>Teslim</dt><dd>{{ pickupLocation() }}</dd></div><div><dt>İade</dt><dd>{{ dropoffLocation() || pickupLocation() }}</dd></div><div><dt>Toplam</dt><dd>{{ totalPrice() | number }} ₺</dd></div></dl>
                <div class="payment-grid" role="radiogroup" aria-label="Ödeme yöntemi"><button type="button" (click)="selectPayment('OFFICE')" [class.active]="paymentMethod() === 'OFFICE'" [attr.aria-pressed]="paymentMethod() === 'OFFICE'"><mat-icon aria-hidden="true">storefront</mat-icon><strong>Teslimde</strong><small>Araç tesliminde ödeme</small></button><button type="button" (click)="selectPayment('EFT')" [class.active]="paymentMethod() === 'EFT'" [attr.aria-pressed]="paymentMethod() === 'EFT'"><mat-icon aria-hidden="true">account_balance</mat-icon><strong>Havale / EFT</strong><small>Bilgiler onay sonrası</small></button><button type="button" (click)="selectPayment('CARD')" [class.active]="paymentMethod() === 'CARD'" [attr.aria-pressed]="paymentMethod() === 'CARD'"><mat-icon aria-hidden="true">credit_card</mat-icon><strong>Kart</strong><small>{{ paymentService.cardReady() ? 'Güvenli ödeme hazır' : 'Sağlayıcı bekleniyor' }}</small></button></div>
                @if (paymentMethod() === 'CARD' && !paymentService.cardReady()) {<p class="payment-note">Kart ödeme sağlayıcısı henüz aktif değil. Teslimde veya EFT seçebilirsiniz.</p>}@if (errorMessage()) {<p class="form-error" role="alert">{{ errorMessage() }}</p>}<div class="step-actions"><button type="button" class="back-button" (click)="checkoutStep.set(2)">Geri</button><button type="button" class="submit-button" (click)="submit()" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Kaydediliyor...' : 'Rezervasyon Talebini Gönder' }}</button></div></section>
            }
          } @else {
            <section class="step-card" aria-labelledby="inquiry-title"><p class="step-kicker">Satın Alma Talebi</p><h2 id="inquiry-title">İletişim bilgilerinizi bırakın</h2><div class="form-grid"><label class="field"><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label><label class="field"><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label><label class="field"><span>Telefon</span><input type="tel" [(ngModel)]="phone" autocomplete="tel" /></label><label class="field"><span>E-posta</span><input type="email" [(ngModel)]="email" autocomplete="email" /></label></div><label class="field note"><span>Not</span><textarea rows="3" [(ngModel)]="notes"></textarea></label>@if (errorMessage()) {<p class="form-error" role="alert">{{ errorMessage() }}</p>}<button type="button" class="submit-button full" (click)="submit()" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Kaydediliyor...' : 'Talebi Gönder' }}</button></section>
          }
        }
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;background:#050914;color:#f8fafc}.checkout-page{min-height:100dvh;padding-bottom:30px;background:radial-gradient(circle at 90% 0,rgba(37,99,235,.12),transparent 30%),#050914;font-family:Inter,system-ui,sans-serif}.checkout-header{position:sticky;top:0;z-index:50;border-bottom:1px solid #1e293b;background:rgba(5,9,20,.96);backdrop-filter:blur(16px)}.header-inner{width:min(100% - 24px,860px);min-height:72px;margin:auto;display:flex;align-items:center;gap:10px}.icon-button{display:grid;width:46px;height:46px;place-items:center;border:0;border-radius:50%;background:#111827;color:#fff}.header-copy{min-width:0}.header-copy span{color:#93c5fd;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.header-copy h1{margin:2px 0 0;font:900 20px Georgia,serif}.header-copy p{margin:2px 0 0;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#94a3b8;font-size:12px}.checkout-shell{width:min(100% - 24px,860px);margin:auto;padding:20px 0;display:grid;gap:14px}.item-card,.step-card,.success-card{border:1px solid #253149;border-radius:22px;background:#0b1220;box-shadow:0 18px 48px rgba(0,0,0,.18)}.item-card{display:flex;gap:14px;padding:14px}.item-card img{width:112px;height:84px;flex:none;border-radius:14px;object-fit:cover;background:#020617}.item-card p{margin:0;color:#93c5fd;font-size:10px;font-weight:950;text-transform:uppercase}.item-card h2{margin:3px 0 0;font:900 20px Georgia,serif}.item-card strong{display:block;margin-top:8px;color:#fcd34d}.step-card{padding:18px}.step-kicker{margin:0;color:#93c5fd;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.step-card h2{margin:5px 0 0;font:900 clamp(26px,7vw,36px)/1.1 Georgia,serif}.step-copy{margin:8px 0 18px;color:#94a3b8;font-size:13px;line-height:1.6}.field{display:block}.field>span,.driver-block>span{display:block;margin-bottom:7px;color:#94a3b8;font-size:11px;font-weight:900;text-transform:uppercase}.field select,.field input,.field textarea{width:100%;min-height:50px;border:1px solid #334155;border-radius:13px;background:#050b18;padding:0 13px;color:#fff;font:inherit;outline:none}.field textarea{min-height:90px;padding:12px}.field select:focus,.field input:focus,.field textarea:focus,.choice-grid button:focus-visible,.payment-grid button:focus-visible,.next-button:focus-visible,.back-button:focus-visible,.submit-button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.date-grid,.location-grid,.form-grid{display:grid;gap:12px;margin-top:14px}.driver-block{margin-top:16px}.choice-grid,.payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.choice-grid button,.payment-grid button{min-height:84px;border:1px solid #334155;border-radius:14px;background:#050b18;padding:12px;color:#fff;text-align:left}.choice-grid button.active,.payment-grid button.active{border-color:#60a5fa;background:#172554;box-shadow:0 0 0 1px #60a5fa}.choice-grid mat-icon,.payment-grid mat-icon{color:#93c5fd}.choice-grid strong,.choice-grid small,.payment-grid strong,.payment-grid small{display:block}.choice-grid small,.payment-grid small{margin-top:4px;color:#94a3b8;font-size:11px}.extras-details{margin-top:16px;border:1px solid #334155;border-radius:14px;background:#050b18;overflow:hidden}.extras-details summary{display:flex;min-height:60px;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;cursor:pointer;list-style:none}.extras-details summary::-webkit-details-marker{display:none}.extras-details summary strong,.extras-details summary small{display:block}.extras-details summary small{margin-top:3px;color:#94a3b8}.extras-list{display:grid;gap:8px;border-top:1px solid #1e293b;padding:12px}.extras-list label{display:flex;align-items:center;gap:10px;border:1px solid #253149;border-radius:12px;padding:11px}.extras-list label.disabled{opacity:.45}.extras-list input{width:20px;height:20px}.extras-list span strong,.extras-list span small{display:block}.extras-list span small{margin-top:3px;color:#94a3b8}.price-summary{margin-top:16px;border:1px solid rgba(96,165,250,.22);border-radius:14px;background:rgba(37,99,235,.08);padding:14px}.price-summary>div{display:flex;justify-content:space-between;gap:12px;padding:5px 0}.price-summary span{color:#cbd5e1}.price-summary .total{margin-top:7px;border-top:1px solid rgba(96,165,250,.2);padding-top:12px}.price-summary .total strong{color:#93c5fd;font-size:22px}.next-button,.submit-button,.back-button{display:flex;min-height:52px;align-items:center;justify-content:center;gap:6px;border:0;border-radius:13px;font-weight:950}.next-button,.submit-button{background:#2563eb;color:#fff}.step-card>.next-button{width:100%;margin-top:16px}.back-button{background:#1e293b;color:#fff}.step-actions{display:grid;grid-template-columns:.7fr 1.3fr;gap:10px;margin-top:16px}.submit-button.full{width:100%;margin-top:16px}.note{margin-top:12px}.review{margin:12px 0 18px}.review>div{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #1e293b;padding:12px 0}.review dt{color:#94a3b8}.review dd{margin:0;text-align:right;font-weight:900}.payment-grid{grid-template-columns:1fr;margin-top:12px}.payment-grid button{min-height:78px}.payment-note{border-radius:12px;background:#78350f;padding:12px;color:#fde68a}.form-error{margin:14px 0 0;border-radius:12px;background:#7f1d1d;padding:12px;color:#fecaca;font-weight:800}.success-card{padding:26px;text-align:center}.success-card mat-icon{width:54px;height:54px;font-size:54px;color:#34d399}.success-card h2{margin:8px 0 0;font:900 28px Georgia,serif}.success-card p{color:#cbd5e1}.success-card>strong{display:block;color:#86efac}.success-card button{min-height:48px;margin-top:16px;border:0;border-radius:12px;background:#fff;padding:0 20px;font-weight:900}.submit-button:disabled{opacity:.5}@media(min-width:640px){.date-grid,.location-grid,.form-grid{grid-template-columns:1fr 1fr}.payment-grid{grid-template-columns:repeat(3,1fr)}.step-card{padding:24px}}
  `],
})
export class BookingCheckoutComponent implements OnInit {
  private readonly carService = inject(CarService);
  private readonly bookingService = inject(BookingService);
  private readonly branchService = inject(BranchService);
  readonly paymentService = inject(PaymentService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly request = signal(this.carService.getBookingRequest());
  readonly checkoutStep = signal<1 | 2 | 3>(1);
  readonly paymentMethod = signal<"CARD" | "EFT" | "OFFICE">("OFFICE");
  readonly totalDays = signal(1);
  readonly baseRentalTotal = signal(0);
  readonly extrasTotal = signal(0);
  readonly routeFuelTotal = signal(0);
  readonly matchedDistanceKm = signal(0);
  readonly totalPrice = signal(0);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal("");
  readonly successMessage = signal("");
  readonly bookingReference = signal("");
  readonly selectedExtraIds = signal<string[]>([]);
  readonly pickupLocation = signal("");
  readonly dropoffLocation = signal("");

  readonly today = new Date().toISOString().slice(0, 10);
  firstName = ""; lastName = ""; phone = ""; email = ""; notes = ""; startDate = ""; endDate = ""; rentalDuration = "daily";

  private readonly fallbackExtras: RentalExtraOption[] = [
    { id: "driver", label: "Şoförlü kiralama", description: "Profesyonel sürücü hizmeti", icon: "person_pin", enabled: true, sortOrder: 10, pricePerDay: 1500, pricePerHour: 100 },
    { id: "child-seat", label: "Bebek / çocuk koltuğu", description: "Yaşa uygun güvenlik koltuğu", icon: "child_friendly", enabled: true, sortOrder: 20, pricePerDay: 250 },
    { id: "extra-protection", label: "Ek güvence paketi", description: "Standart kapsama ek koruma talebi", icon: "verified_user", enabled: true, sortOrder: 30, pricePerDay: 450 },
    { id: "additional-driver", label: "Ek sürücü", description: "Sözleşmeye ikinci sürücü eklenmesi", icon: "group_add", enabled: true, sortOrder: 40, pricePerDay: 350 },
    { id: "airport-delivery", label: "Havalimanı teslim / iade", description: "Havalimanı teslimat hizmeti", icon: "flight", enabled: true, sortOrder: 50, flatPrice: 750 },
    { id: "after-hours", label: "Mesai dışı teslim / iade", description: "Normal operasyon saatleri dışındaki teslimat talebi", icon: "schedule", enabled: true, sortOrder: 60, flatPrice: 500 },
    { id: "snow-chain", label: "Kar zinciri seti", description: "Kış koşulları için zincir seti", icon: "ac_unit", enabled: true, sortOrder: 70, flatPrice: 300 },
  ];

  readonly rentalExtras = computed(() => { const configured = this.carService.getConfig()().rentalExtras; const source = Array.isArray(configured) && configured.length ? configured : this.fallbackExtras; return source.filter((item) => item.enabled).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); });
  readonly additionalExtras = computed(() => this.rentalExtras().filter((item) => item.id !== "driver"));
  readonly selectedAdditionalCount = computed(() => this.selectedExtraIds().filter((id) => id !== "driver").length);
  readonly pickupChoices = computed(() => this.buildLocationChoices(this.branchService.pickupPoints(), "pickupLocations"));
  readonly returnChoices = computed(() => { const dedicated = this.buildLocationChoices(this.branchService.returnPoints(), "returnLocations"); return dedicated.length ? dedicated : this.buildLocationChoices(this.branchService.returnPoints(), "pickupLocations"); });
  readonly withDriver = computed(() => this.selectedExtraIds().includes("driver"));

  async ngOnInit(): Promise<void> {
    const booking = this.request(); if (!booking) { await this.router.navigate(["/contact"]); return; }
    this.startDate = booking.startDate || ""; this.endDate = booking.endDate || ""; this.rentalDuration = booking.rentalDuration || "daily";
    if (booking.withDriver === true && this.driverAllowed(true)) this.selectedExtraIds.set(["driver"]);
    await Promise.allSettled([this.branchService.refresh(), this.paymentService.refreshIntegrationStatus()]);
    const configAddress = String(this.carService.getConfig()().address || "");
    const pickup = booking.pickupLocation || this.pickupChoices()[0]?.label || configAddress;
    const dropoff = this.returnChoices().find((item) => item.label === pickup)?.label || this.returnChoices()[0]?.label || pickup;
    this.pickupLocation.set(pickup || ""); this.dropoffLocation.set(dropoff || ""); this.calculatePrice();
  }

  isRental(): boolean { return this.request()?.type === "RENTAL"; }
  driverAllowed(withDriver: boolean): boolean { const option = this.request()?.item?.driverOption; if (!withDriver) return true; return option !== "WITHOUT_DRIVER" && this.rentalExtras().some((item) => item.id === "driver" && item.enabled); }
  setDriver(value: boolean): void { if (!this.driverAllowed(value)) return; this.selectedExtraIds.update((items) => value ? (items.includes("driver") ? items : ["driver", ...items]) : items.filter((id) => id !== "driver")); this.calculatePrice(); }
  driverPriceLabel(): string { const extra = this.rentalExtras().find((item) => item.id === "driver"); return extra ? this.extraPriceLabel(extra) : "Şoför hizmeti"; }
  setStartDate(value: string): void { this.startDate = value; if (this.endDate && value && this.endDate <= value) this.endDate = ""; this.errorMessage.set(""); this.calculatePrice(); }
  setEndDate(value: string): void { this.endDate = value; this.errorMessage.set(""); this.calculatePrice(); }
  setPickupLocation(value: string): void { this.pickupLocation.set(String(value || "")); this.errorMessage.set(""); this.calculatePrice(); }
  setDropoffLocation(value: string): void { this.dropoffLocation.set(String(value || "")); this.errorMessage.set(""); this.calculatePrice(); }
  isExtraSelected(id: string): boolean { return this.selectedExtraIds().includes(id); }
  extraUnavailable(extra: RentalExtraOption): boolean { return extra.id === "driver" && this.request()?.item?.driverOption === "WITHOUT_DRIVER"; }
  toggleExtra(extra: RentalExtraOption): void { if (this.extraUnavailable(extra)) return; this.selectedExtraIds.update((items) => items.includes(extra.id) ? items.filter((id) => id !== extra.id) : [...items, extra.id]); this.calculatePrice(); }
  extraAmount(extra: RentalExtraOption): number { return Math.round(Number(extra.pricePerDay || 0) * Math.max(1, this.totalDays()) + Number(extra.flatPrice || 0)); }
  extraPriceLabel(extra: RentalExtraOption): string { const parts: string[] = []; if (extra.pricePerDay) parts.push(`${new Intl.NumberFormat("tr-TR").format(extra.pricePerDay)} ₺/gün`); if (extra.flatPrice) parts.push(`${new Intl.NumberFormat("tr-TR").format(extra.flatPrice)} ₺ tek sefer`); return parts.join(" + ") || "Ücretsiz"; }

  continueFromPlan(): void { if (!this.startDate || !this.endDate) { this.errorMessage.set("Alış ve iade tarihlerini seçin."); return; } if (this.startDate < this.today || this.endDate <= this.startDate) { this.errorMessage.set("İade tarihi alış tarihinden sonra olmalıdır."); return; } if (!this.pickupLocation()) { this.errorMessage.set("Teslim alma noktasını seçin."); return; } if (!this.dropoffLocation()) this.dropoffLocation.set(this.pickupLocation()); this.errorMessage.set(""); this.checkoutStep.set(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  continueFromContact(): void { if (!this.validContact()) { this.errorMessage.set("Ad, soyad, telefon ve geçerli e-posta bilgilerini tamamlayın."); return; } this.errorMessage.set(""); this.calculatePrice(); this.checkoutStep.set(3); window.scrollTo({ top: 0, behavior: "smooth" }); }
  validContact(): boolean { return Boolean(this.firstName.trim() && this.lastName.trim() && /^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())); }
  formattedDateRange(): string { const format = (value: string) => { const date = this.parseLocalDate(value); return date ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date) : value; }; return `${format(this.startDate)} → ${format(this.endDate)}`; }

  calculatePrice(): void { const booking = this.request(); if (!booking || booking.type !== "RENTAL") return; let days = 1; if (this.startDate && this.endDate) { const start = this.parseLocalDate(this.startDate); const end = this.parseLocalDate(this.endDate); if (start && end) days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)); } this.totalDays.set(days); const rental = Math.round(Number(booking.basePrice || 0) * days); const extras = this.rentalExtras().filter((extra) => this.isExtraSelected(extra.id) && !this.extraUnavailable(extra)).reduce((sum, extra) => sum + this.extraAmount(extra), 0); const route = this.findRoute(this.pickupLocation(), this.dropoffLocation()); const distance = route?.distanceKm ? Math.max(0, Number(route.distanceKm)) : 0; const config = this.carService.getConfig()(); const fuelPrice = Math.max(0, Number(config.rentalFuelPricePerLiter ?? 85)); const consumption = Math.max(0, Number(config.rentalAverageConsumptionPer100Km ?? 8.5)); const fuel = distance > 0 ? Math.round(distance * consumption / 100 * fuelPrice) : 0; this.baseRentalTotal.set(rental); this.extrasTotal.set(extras); this.matchedDistanceKm.set(distance); this.routeFuelTotal.set(fuel); this.totalPrice.set(rental + extras + fuel); }
  selectPayment(method: "CARD" | "EFT" | "OFFICE"): void { this.errorMessage.set(""); this.paymentMethod.set(method); }

  async submit(): Promise<void> {
    const booking = this.request(); if (!booking || this.isSubmitting()) return;
    if (!this.validContact()) { this.errorMessage.set("İletişim bilgilerinizi tamamlayın."); if (this.isRental()) this.checkoutStep.set(2); return; }
    if (this.isRental() && (!this.startDate || !this.endDate || !this.pickupLocation())) { this.errorMessage.set("Kiralama planı eksik. İlk adıma dönüp tarih ve teslim noktasını tamamlayın."); this.checkoutStep.set(1); return; }
    if (this.isRental() && this.paymentMethod() === "CARD" && !this.paymentService.cardReady()) { this.errorMessage.set("Kart ödeme sağlayıcısı henüz aktif değil. Teslimde veya EFT seçebilirsiniz."); return; }
    this.isSubmitting.set(true); this.errorMessage.set("");
    try {
      this.calculatePrice();
      const extras = this.rentalExtras().filter((extra) => this.isExtraSelected(extra.id) && !this.extraUnavailable(extra));
      const extrasText = extras.map((extra) => `${extra.label}: ${new Intl.NumberFormat("tr-TR").format(this.extraAmount(extra))} ₺`).join(", ");
      const detailNotes = this.isRental() ? [`Teslim alma: ${this.pickupLocation()}`, `İade: ${this.dropoffLocation() || this.pickupLocation()}`, `Sürücü tercihi: ${this.withDriver() ? "Şoförlü" : "Şoförsüz"}`, extrasText ? `Ek hizmetler: ${extrasText}` : "Ek hizmetler: Yok", `Araç bedeli: ${this.baseRentalTotal()} TRY`, `Ek hizmet toplamı: ${this.extrasTotal()} TRY`, this.matchedDistanceKm() > 0 ? `Tanımlı rota mesafesi: ${this.matchedDistanceKm()} km` : "", this.matchedDistanceKm() > 0 ? `Mesafe / yakıt bedeli: ${this.routeFuelTotal()} TRY` : ""] : [];
      const record = await this.bookingService.create({ type: booking.type, itemId: booking.item?.cloudId || booking.item?.id, itemName: booking.itemName, image: booking.image, customerName: `${this.firstName.trim()} ${this.lastName.trim()}`, customerEmail: this.email.trim(), customerPhone: this.phone.trim(), basePrice: booking.basePrice, totalPrice: this.isRental() ? this.totalPrice() : booking.basePrice, currency: "TRY", startDate: this.isRental() ? this.startDate : booking.startDate, endDate: this.isRental() ? this.endDate : booking.endDate, days: this.isRental() ? this.totalDays() : undefined, withDriver: this.isRental() ? this.withDriver() : undefined, pickupLocation: this.isRental() ? this.pickupLocation() : booking.pickupLocation, dropoffLocation: this.isRental() ? (this.dropoffLocation() || this.pickupLocation()) : undefined, rentalDuration: this.isRental() ? this.rentalDuration : undefined, notes: [this.notes.trim(), ...detailNotes].filter(Boolean).join("\n"), paymentMethod: this.isRental() ? this.paymentMethod() : "NONE", source: "WEB" });
      this.bookingReference.set(record.id);
      if (this.isRental() && this.paymentMethod() === "CARD") { const origin = window.location.origin; const payment = await this.paymentService.createCardSession({ bookingReference: record.id, amount: record.totalPrice || 0, currency: "TRY", method: "CARD", customer: { name: record.customerName, email: record.customerEmail || this.email.trim(), phone: record.customerPhone }, returnUrl: `${origin}/contact?payment=success&booking=${encodeURIComponent(record.id)}`, cancelUrl: `${origin}/contact?payment=cancel&booking=${encodeURIComponent(record.id)}`, description: record.itemName, metadata: { bookingType: record.type } }); if (payment.ok && payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; } this.successMessage.set("Rezervasyon kaydedildi ancak kart ödeme oturumu başlatılamadı. Talebiniz kaybolmadı."); return; }
      this.successMessage.set(this.isRental() ? "Rezervasyon talebiniz kaydedildi. Uygunluk doğrulandıktan sonra sizinle iletişime geçilecektir." : "Talebiniz kaydedildi. Ekibimiz sizinle iletişime geçilecektir.");
    } catch (error) { console.error("Checkout submission failed.", error); const detail = error instanceof Error ? error.message : ""; this.errorMessage.set(detail.includes("INVALID_RENTAL_VEHICLE") ? "Araç kaydı doğrulanamadı. Araç sayfasına dönüp tekrar deneyin." : "Talep kaydedilemedi. Bilgilerinizi kontrol edip tekrar deneyin."); this.toastService.show("Talep kaydedilemedi.", "error"); }
    finally { this.isSubmitting.set(false); }
  }

  goBack(): void { if (this.isRental() && this.checkoutStep() > 1) { this.checkoutStep.update((step) => (step - 1) as 1 | 2 | 3); this.errorMessage.set(""); return; } if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
  finish(): void { this.carService.clearBookingRequest(); void this.router.navigate(["/"]); }
  private findRoute(fromValue: string, toValue: string) { const from = this.normalizeLocation(fromValue); const to = this.normalizeLocation(toValue); if (!from || !to || from === to) return undefined; return (this.carService.getConfig()().rentalRoutePricing || []).find((route) => { if (route.enabled === false || Number(route.distanceKm || 0) <= 0) return false; const routeFrom = this.normalizeLocation(route.from); const routeTo = this.normalizeLocation(route.to); return (routeFrom === from && routeTo === to) || (routeFrom === to && routeTo === from); }); }
  private normalizeLocation(value: string): string { return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR"); }
  private buildLocationChoices(branches: Branch[], serviceRuleKey: string): LocationChoice[] { const values: LocationChoice[] = []; for (const branch of branches) { const raw = branch.serviceRules?.[serviceRuleKey]; const locations = Array.isArray(raw) ? raw.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 16) : []; if (locations.length) locations.forEach((label, index) => values.push({ key: `${branch.id}:${serviceRuleKey}:${index}`, label })); else values.push({ key: `${branch.id}:${serviceRuleKey}:main`, label: `${branch.name} · ${branch.district || branch.city}` }); } return values.filter((item, index, list) => list.findIndex((other) => other.label === item.label) === index); }
  private parseLocalDate(value: string): Date | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || ""); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return Number.isNaN(date.getTime()) ? null : date; }
}
