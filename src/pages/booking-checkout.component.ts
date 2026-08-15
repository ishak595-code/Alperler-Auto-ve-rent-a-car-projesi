import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { Vehicle } from "../models/car.model";
import { BookingService } from "../services/booking.service";
import { CarService } from "../services/car.service";
import { PaymentService } from "../services/payment.service";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-booking-checkout",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main id="booking-checkout-main" class="min-h-screen bg-slate-950 pb-20 text-slate-200" [attr.aria-busy]="isSubmitting()" aria-labelledby="checkout-title">
      <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400" aria-label="Önceki sayfaya dön">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 id="checkout-title" class="truncate text-lg font-black text-white sm:text-xl">{{ pageTitle() }}</h1>
            <p class="truncate text-sm text-slate-400">{{ request()?.itemName }}</p>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        @if (request(); as booking) {
          <nav class="mb-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-3" aria-label="Talep oluşturma adımları">
            <ol class="grid gap-2 text-xs font-black sm:grid-cols-3">
              <li class="rounded-xl bg-blue-500/15 px-3 py-2 text-blue-300"><span aria-hidden="true">1.</span> {{ isRental() ? 'Araç ve kiralama' : isTour() ? 'Tur bilgileri' : 'Araç bilgileri' }}</li>
              <li class="rounded-xl bg-slate-800 px-3 py-2 text-slate-200"><span aria-hidden="true">2.</span> İletişim bilgileri</li>
              <li class="rounded-xl bg-slate-800 px-3 py-2 text-slate-200"><span aria-hidden="true">3.</span> {{ isRental() ? 'Ödeme ve gönderim' : 'Talebi gönder' }}</li>
            </ol>
          </nav>

          <form (ngSubmit)="submit()" novalidate class="space-y-5" aria-describedby="checkout-help">
            <p id="checkout-help" class="sr-only">Tüm zorunlu alanlar yıldız işareti ile belirtilmiştir. Formda yukarıdan aşağıya doğru ilerleyebilirsiniz.</p>

            <section class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl" aria-labelledby="selected-item-heading">
              <div class="grid gap-5 p-5 sm:grid-cols-[180px_1fr] sm:p-6">
                @if (booking.image) {
                  <img [src]="booking.image" [alt]="booking.itemName + ' seçili araç görseli'" class="h-40 w-full rounded-2xl object-cover sm:h-32" referrerpolicy="no-referrer" />
                }
                <div class="min-w-0">
                  <p class="text-xs font-black uppercase tracking-[.14em] text-blue-400">{{ itemTypeLabel() }}</p>
                  <h2 id="selected-item-heading" class="mt-1 text-2xl font-black text-white">{{ booking.itemName }}</h2>
                  @if (booking.basePrice) {
                    <p class="mt-2 text-xl font-black text-blue-300">{{ booking.basePrice | number }} ₺{{ priceSuffix() }}</p>
                  }
                  @if (vehicleFacts().length) {
                    <dl class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Seçilen aracın temel özellikleri">
                      @for (fact of vehicleFacts(); track fact.label) {
                        <div class="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                          <dt class="text-[10px] font-black uppercase tracking-wider text-slate-500">{{ fact.label }}</dt>
                          <dd class="mt-1 text-sm font-bold text-white">{{ fact.value }}</dd>
                        </div>
                      }
                    </dl>
                  }
                  @if (vehicleFeatures().length) {
                    <div class="mt-4 rounded-xl bg-slate-800/70 p-3">
                      <h3 class="text-xs font-black uppercase tracking-wider text-slate-300">Öne çıkan özellikler</h3>
                      <ul class="mt-2 grid gap-1 text-sm text-slate-200 sm:grid-cols-2">
                        @for (feature of vehicleFeatures(); track feature) { <li>• {{ feature }}</li> }
                      </ul>
                    </div>
                  }
                </div>
              </div>
            </section>

            @if (isRental()) {
              <section class="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6" aria-labelledby="rental-step-heading">
                <div class="mb-5 flex items-center gap-3">
                  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 font-black text-slate-950" aria-hidden="true">1</span>
                  <div><h2 id="rental-step-heading" class="text-xl font-black text-white">Kiralama Detayları</h2><p class="text-sm text-slate-400">Seçtiğiniz araca uygun tarih, saat ve ek hizmetleri belirleyin.</p></div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block sm:col-span-2" for="rental-duration">
                    <span class="mb-2 block text-xs font-black uppercase tracking-wider text-slate-300">Kiralama Türü *</span>
                    <select id="rental-duration" name="rentalDuration" [(ngModel)]="rentalDuration" (change)="rentalDurationChanged()" class="input-control" aria-describedby="rental-duration-help">
                      <option value="hourly">Saatlik</option><option value="daily">Günlük</option><option value="monthly">Aylık</option><option value="longterm">Uzun Dönem</option>
                    </select>
                    <span id="rental-duration-help" class="mt-1 block text-xs text-slate-500">Saatlik seçimde bitiş saati otomatik hesaplanır.</span>
                  </label>

                  <label class="block" for="rental-start-date"><span class="field-label">Alış Tarihi *</span><input id="rental-start-date" name="startDate" type="date" [min]="today" [(ngModel)]="startDate" (change)="rentalWindowChanged()" class="input-control" required /></label>
                  <label class="block" for="rental-start-time"><span class="field-label">Alış Saati *</span><input id="rental-start-time" name="startTime" type="time" [(ngModel)]="startTime" (change)="rentalWindowChanged()" class="input-control" required /></label>

                  @if (rentalDuration === 'hourly') {
                    <label class="block sm:col-span-2" for="rental-hours">
                      <span class="field-label">Kiralama Süresi *</span>
                      <div class="flex items-center gap-3"><input id="rental-hours" name="selectedHours" type="number" min="1" max="23" [(ngModel)]="selectedHours" (input)="rentalWindowChanged()" class="input-control min-w-0 flex-1" required aria-describedby="hourly-end" /><span class="rounded-xl bg-slate-800 px-4 py-3 font-black">Saat</span></div>
                      <span id="hourly-end" class="mt-2 block text-sm font-bold text-blue-300" aria-live="polite">@if (hourlyEndLabel()) { Tahmini dönüş: {{ hourlyEndLabel() }} }</span>
                    </label>
                  } @else {
                    <label class="block" for="rental-end-date"><span class="field-label">Dönüş Tarihi *</span><input id="rental-end-date" name="endDate" type="date" [min]="startDate || today" [(ngModel)]="endDate" (change)="rentalWindowChanged()" class="input-control" required /></label>
                    <label class="block" for="rental-end-time"><span class="field-label">Dönüş Saati *</span><input id="rental-end-time" name="endTime" type="time" [(ngModel)]="endTime" (change)="rentalWindowChanged()" class="input-control" required /></label>
                  }
                </div>

                @if (rentalWindowError()) { <div role="alert" aria-live="assertive" class="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">{{ rentalWindowError() }}</div> }

                <fieldset class="mt-5"><legend class="mb-3 text-xs font-black uppercase tracking-wider text-slate-300">Ek Hizmetler</legend>
                  <div class="grid gap-3 sm:grid-cols-3">
                    <label class="option-card"><input id="extra-driver" name="withDriver" type="checkbox" [(ngModel)]="withDriver" (change)="calculatePrice()" class="h-5 w-5" /><span><strong>Şoförlü</strong><small>Uygunsa şoför hizmeti ekle</small></span></label>
                    <label class="option-card"><input id="extra-child-seat" name="wantsChildSeat" type="checkbox" [(ngModel)]="wantsChildSeat" (change)="calculatePrice()" class="h-5 w-5" /><span><strong>Bebek Koltuğu</strong><small>Çocuk güvenlik koltuğu</small></span></label>
                    <label class="option-card"><input id="extra-insurance" name="wantsInsurance" type="checkbox" [(ngModel)]="wantsInsurance" (change)="calculatePrice()" class="h-5 w-5" /><span><strong>Ek Güvence</strong><small>Ek koruma paketi</small></span></label>
                  </div>
                </fieldset>

                <div class="mt-5 flex items-end justify-between gap-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4" aria-live="polite" aria-atomic="true">
                  <div><div class="text-xs font-black uppercase text-blue-300">Tahmini Toplam</div><div class="mt-1 text-sm text-slate-400">{{ rentalDuration === 'hourly' ? selectedHours + ' saat' : totalDays() + ' gün' }}</div></div>
                  <div class="text-2xl font-black text-blue-300">{{ totalPrice() | number }} ₺</div>
                </div>
              </section>
            }

            @if (isTour()) {
              <section class="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6" aria-labelledby="tour-step-heading">
                <div class="mb-5 flex items-center gap-3"><span class="step-number" aria-hidden="true">1</span><div><h2 id="tour-step-heading" class="text-xl font-black text-white">Tur Detayları</h2><p class="text-sm text-slate-400">Katılımcı sayısını ve istediğiniz tarihi seçin.</p></div></div>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label for="tour-person-count"><span class="field-label">Kişi Sayısı *</span><input id="tour-person-count" name="personCount" type="number" min="1" max="100" [(ngModel)]="personCount" class="input-control" required /></label>
                  <label for="tour-date"><span class="field-label">Tur Tarihi *</span><input id="tour-date" name="tourDate" type="date" [min]="today" [(ngModel)]="tourDate" class="input-control" required /></label>
                </div>
              </section>
            }

            <section class="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6" aria-labelledby="contact-step-heading">
              <div class="mb-5 flex items-center gap-3"><span class="step-number" aria-hidden="true">{{ isRental() || isTour() ? '2' : '1' }}</span><div><h2 id="contact-step-heading" class="text-xl font-black text-white">İletişim Bilgileri</h2><p class="text-sm text-slate-400">Talep durumu ve geri dönüş için kullanılacaktır.</p></div></div>
              <div class="grid gap-4 sm:grid-cols-2">
                <label for="customer-first-name"><span class="field-label">Ad *</span><input id="customer-first-name" name="firstName" autocomplete="given-name" [(ngModel)]="firstName" class="input-control" required /></label>
                <label for="customer-last-name"><span class="field-label">Soyad *</span><input id="customer-last-name" name="lastName" autocomplete="family-name" [(ngModel)]="lastName" class="input-control" required /></label>
                <label for="customer-phone"><span class="field-label">Telefon *</span><input id="customer-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" [(ngModel)]="phone" class="input-control" placeholder="05XX XXX XX XX" required aria-describedby="phone-help" /><span id="phone-help" class="field-help">Size ulaşabileceğimiz telefon numarası.</span></label>
                <label for="customer-email"><span class="field-label">E-posta *</span><input id="customer-email" name="email" type="email" inputmode="email" autocomplete="email" [(ngModel)]="email" class="input-control" placeholder="ornek@email.com" required aria-describedby="email-help" /><span id="email-help" class="field-help">Talep ve durum bildirimleri bu adrese gönderilir.</span></label>
              </div>
              <label for="customer-notes" class="mt-4 block"><span class="field-label">Not veya Özel İstek</span><textarea id="customer-notes" name="notes" rows="4" [(ngModel)]="notes" class="input-control" placeholder="Teslimat, özel istek veya açıklama"></textarea></label>
            </section>

            @if (isRental()) {
              <section class="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6" aria-labelledby="payment-step-heading">
                <div class="mb-5 flex items-center gap-3"><span class="step-number" aria-hidden="true">3</span><div><h2 id="payment-step-heading" class="text-xl font-black text-white">Ödeme Yöntemi</h2><p class="text-sm text-slate-400">Rezervasyon talebiniz kaydedilir, ödeme yöntemi buna göre işlenir.</p></div></div>
                <fieldset><legend class="sr-only">Ödeme yöntemi seçin</legend><div class="grid gap-3 sm:grid-cols-3">
                  <label class="payment-card" [class.payment-selected]="paymentMethod() === 'CARD'"><input type="radio" name="paymentMethod" value="CARD" [ngModel]="paymentMethod()" (ngModelChange)="selectPayment($event)" class="h-5 w-5" /><span><mat-icon aria-hidden="true">credit_card</mat-icon><strong>Kredi / Banka Kartı</strong><small>{{ paymentService.cardReady() ? 'Güvenli ödeme sayfası hazır' : 'Sağlayıcı bağlantısı bekleniyor' }}</small></span></label>
                  <label class="payment-card" [class.payment-selected]="paymentMethod() === 'OFFICE'"><input type="radio" name="paymentMethod" value="OFFICE" [ngModel]="paymentMethod()" (ngModelChange)="selectPayment($event)" class="h-5 w-5" /><span><mat-icon aria-hidden="true">storefront</mat-icon><strong>Ofiste Ödeme</strong><small>Araç tesliminde ödeme</small></span></label>
                  <label class="payment-card" [class.payment-selected]="paymentMethod() === 'EFT'"><input type="radio" name="paymentMethod" value="EFT" [ngModel]="paymentMethod()" (ngModelChange)="selectPayment($event)" class="h-5 w-5" /><span><mat-icon aria-hidden="true">account_balance</mat-icon><strong>Havale / EFT</strong><small>Banka bilgileri onay sonrası iletilir</small></span></label>
                </div></fieldset>
                @if (paymentMethod() === 'CARD' && !paymentService.cardReady()) { <div role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Kart seçeneği arayüzde hazırdır ancak gerçek ödeme sağlayıcısı henüz etkin değildir. Şimdilik Ofiste Ödeme veya EFT seçebilirsiniz.</div> }
              </section>
            }

            @if (errorMessage()) { <div id="checkout-error" tabindex="-1" role="alert" aria-live="assertive" class="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-100">{{ errorMessage() }}</div> }

            @if (successMessage()) {
              <section id="checkout-success" tabindex="-1" role="status" aria-live="polite" class="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <mat-icon class="!h-12 !w-12 !text-[48px] text-emerald-400" aria-hidden="true">check_circle</mat-icon>
                <h2 class="mt-3 text-2xl font-black text-white">Talebiniz Gönderildi</h2>
                <p class="mt-2 text-slate-300">{{ successMessage() }}</p><p class="mt-3 text-sm font-bold text-emerald-300">Referans numarası: {{ bookingReference() }}</p>
                <button type="button" (click)="finish()" class="mt-5 min-h-12 rounded-xl bg-white px-6 font-black text-slate-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400">Ana Sayfaya Dön</button>
              </section>
            } @else {
              <button type="submit" [disabled]="isSubmitting()" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 text-base font-black text-slate-950 shadow-xl transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-white" [attr.aria-label]="submitAriaLabel()">
                @if (isSubmitting()) { <mat-icon class="animate-spin" aria-hidden="true">progress_activity</mat-icon> Gönderiliyor... } @else if (isRental() && paymentMethod() === 'CARD') { Güvenli Ödemeye Devam Et } @else { {{ submitLabel() }} }
              </button>
            }
          </form>
        }
      </div>
    </main>
  `,
  styles: [`
    .input-control{width:100%;min-height:48px;border:1px solid rgb(51 65 85);border-radius:14px;background:rgb(2 6 23);padding:11px 13px;color:white;outline:none}.input-control:focus{border-color:rgb(96 165 250);box-shadow:0 0 0 3px rgb(59 130 246/.28)}.field-label{display:block;margin-bottom:8px;font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(203 213 225)}.field-help{display:block;margin-top:6px;font-size:.72rem;color:rgb(100 116 139)}.option-card,.payment-card{display:flex;min-height:72px;cursor:pointer;align-items:center;gap:12px;border:1px solid rgb(51 65 85);border-radius:16px;background:rgb(2 6 23);padding:14px;transition:.15s}.option-card:focus-within,.payment-card:focus-within{box-shadow:0 0 0 3px rgb(59 130 246/.3);border-color:rgb(96 165 250)}.option-card span,.payment-card span{display:flex;min-width:0;flex-direction:column}.option-card strong,.payment-card strong{color:white}.option-card small,.payment-card small{margin-top:2px;font-size:.7rem;color:rgb(148 163 184)}.payment-selected{border-color:rgb(96 165 250);background:rgb(59 130 246/.12)}.payment-card mat-icon{margin-bottom:4px;color:rgb(96 165 250)}.step-number{display:flex;height:36px;width:36px;flex:none;align-items:center;justify-content:center;border-radius:999px;background:rgb(59 130 246);font-weight:900;color:rgb(2 6 23)}
  `],
})
export class BookingCheckoutComponent implements OnInit {
  readonly carService = inject(CarService);
  readonly bookingService = inject(BookingService);
  readonly paymentService = inject(PaymentService);
  readonly toastService = inject(ToastService);
  readonly router = inject(Router);
  readonly location = inject(Location);

  readonly request = signal(this.carService.getBookingRequest());
  readonly paymentMethod = signal<"CARD" | "EFT" | "OFFICE">("OFFICE");
  readonly totalDays = signal(1);
  readonly totalPrice = signal(0);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal("");
  readonly successMessage = signal("");
  readonly bookingReference = signal("");
  readonly rentalWindowError = signal("");

  readonly today = this.turkeyToday();
  firstName = "";
  lastName = "";
  phone = "";
  email = "";
  notes = "";
  startDate = "";
  startTime = "09:00";
  endDate = "";
  endTime = "09:00";
  rentalDuration = "daily";
  selectedHours = 1;
  personCount = 1;
  tourDate = "";
  withDriver = false;
  wantsChildSeat = false;
  wantsInsurance = false;

  async ngOnInit(): Promise<void> {
    const booking = this.request();
    if (!booking) { await this.router.navigate(["/contact"]); return; }
    if (booking.startDate) this.applyInitialDateTime(booking.startDate, true);
    if (booking.endDate) this.applyInitialDateTime(booking.endDate, false);
    this.rentalDuration = booking.rentalDuration || "daily";
    this.withDriver = Boolean(booking.withDriver);
    this.personCount = Math.max(1, Number(booking.personCount) || 1);
    this.tourDate = booking.startDate?.slice(0, 10) || "";
    this.calculatePrice();
    await this.paymentService.refreshIntegrationStatus();
  }

  isRental(): boolean { return this.request()?.type === "RENTAL"; }
  isTour(): boolean { return this.request()?.type === "TOUR"; }
  isSaleInquiry(): boolean { return this.request()?.type === "SALE_INQUIRY"; }
  pageTitle(): string { return this.isRental() ? "Araç Rezervasyonu" : this.isTour() ? "Tur Rezervasyonu" : "Satın Alma Talebi"; }
  itemTypeLabel(): string { return this.isRental() ? "Kiralık Araç" : this.isTour() ? "VIP Tur" : "İkinci El Satılık Araç"; }
  priceSuffix(): string { return this.isRental() ? " / gün" : this.isTour() ? " / kişi" : ""; }
  submitLabel(): string { return this.isTour() ? "Tur Rezervasyon Talebini Gönder" : this.isSaleInquiry() ? "Satın Alma Talebini Gönder" : "Rezervasyon Talebini Gönder"; }
  submitAriaLabel(): string { const name = this.request()?.itemName || "seçili içerik"; return `${name} için ${this.submitLabel()}`; }

  vehicleFacts(): { label: string; value: string }[] {
    const item = this.request()?.item as Vehicle | null | undefined;
    if (!item || item.category === "TOUR") return [];
    const facts: { label: string; value: string | number | undefined | null }[] = [
      { label: "Model Yılı", value: item.year }, { label: "Vites", value: item.transmission }, { label: "Yakıt", value: item.fuel }, { label: "Kasa", value: item.type }, { label: "Konum", value: item.location },
    ];
    if (item.category === "RENTAL") facts.push(
      { label: "Koltuk", value: item.seats ? `${item.seats} kişi` : undefined },
      { label: "Depozito", value: item.deposit != null ? `${item.deposit.toLocaleString("tr-TR")} ₺` : undefined },
      { label: "Minimum Yaş", value: item.minAge ? `${item.minAge}` : undefined },
      { label: "Ehliyet", value: item.minLicenseYears ? `En az ${item.minLicenseYears} yıl` : undefined },
      { label: "Günlük KM", value: item.dailyMileageLimit ? `${item.dailyMileageLimit} km` : undefined },
      { label: "Şoför", value: item.driverOption === "WITH_DRIVER" ? "Şoförlü" : item.driverOption === "WITHOUT_DRIVER" ? "Şoförsüz" : item.driverOption === "BOTH" ? "Şoförlü veya şoförsüz" : undefined },
    );
    if (item.category === "SALE") facts.push(
      { label: "Kilometre", value: item.km != null ? `${item.km.toLocaleString("tr-TR")} km` : undefined },
      { label: "Renk", value: item.color }, { label: "Motor", value: item.engineVolume }, { label: "Güç", value: item.enginePower }, { label: "Çekiş", value: item.drivetrain }, { label: "Hasar", value: item.damageStatus }, { label: "Tramer", value: item.tramer }, { label: "Garanti", value: item.warranty || (item.hasWarranty ? "Var" : undefined) },
    );
    return facts.filter((fact) => fact.value !== undefined && fact.value !== null && String(fact.value).trim()).map((fact) => ({ label: fact.label, value: String(fact.value) }));
  }

  vehicleFeatures(): string[] { const item = this.request()?.item as Vehicle | null | undefined; return item?.features?.filter(Boolean).slice(0, 8) || []; }

  selectPayment(method: "CARD" | "EFT" | "OFFICE"): void { this.errorMessage.set(""); this.paymentMethod.set(method); }

  rentalDurationChanged(): void {
    if (this.rentalDuration === "hourly") this.endDate = "";
    else if (!this.endDate && this.startDate) { const next = new Date(`${this.startDate}T12:00:00+03:00`); next.setUTCDate(next.getUTCDate() + 1); this.endDate = this.dateInTurkey(next); this.endTime = this.startTime; }
    this.rentalWindowChanged();
  }

  rentalWindowChanged(): void {
    this.rentalWindowError.set("");
    if (!this.isRental()) return;
    const window = this.rentalWindow();
    if (this.startDate && this.startTime && !window) this.rentalWindowError.set("Dönüş tarih ve saati alıştan sonra olmalıdır.");
    this.calculatePrice();
  }

  hourlyEndLabel(): string {
    if (this.rentalDuration !== "hourly") return "";
    const window = this.rentalWindow(); if (!window) return "";
    return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(window.end);
  }

  calculatePrice(): void {
    const booking = this.request(); if (!booking || booking.type !== "RENTAL") return;
    const basePrice = booking.basePrice || 0;
    if (this.rentalDuration === "hourly") {
      const hours = Math.max(1, Math.min(23, Number(this.selectedHours) || 1)); this.selectedHours = hours;
      const hourly = Math.min(basePrice, (basePrice / 24) * 1.5 * hours);
      const driver = this.withDriver ? Math.min(1500, (1500 / 24) * 1.5 * hours) : 0;
      const childSeat = this.wantsChildSeat ? Math.min(250, (250 / 24) * 1.5 * hours) : 0;
      const insurance = this.wantsInsurance ? Math.min(450, (450 / 24) * 1.5 * hours) : 0;
      this.totalDays.set(1); this.totalPrice.set(Math.round(hourly + driver + childSeat + insurance)); return;
    }
    const window = this.rentalWindow(); if (!window) { this.totalDays.set(1); this.totalPrice.set(basePrice); return; }
    const days = Math.max(1, Math.ceil((window.end.getTime() - window.start.getTime()) / 86_400_000));
    const startTurkey = new Date(window.start.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    let multiplier = 1; if ([11, 0, 1].includes(startTurkey.getMonth())) multiplier -= 0.1; if ([0, 6].includes(startTurkey.getDay())) multiplier += 0.15;
    this.totalDays.set(days);
    this.totalPrice.set(Math.round(basePrice * days * multiplier + (this.withDriver ? 1500 * days : 0) + (this.wantsChildSeat ? 250 * days : 0) + (this.wantsInsurance ? 450 * days : 0)));
  }

  isFormValid(): boolean {
    if (!this.firstName.trim() || !this.lastName.trim()) return false;
    if (!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return false;
    if (this.isRental() && !this.rentalWindow()) return false;
    if (this.isTour() && (!this.tourDate || !Number.isInteger(Number(this.personCount)) || Number(this.personCount) < 1 || Number(this.personCount) > 100)) return false;
    return true;
  }

  async submit(): Promise<void> {
    const booking = this.request();
    if (!booking || this.isSubmitting()) return;
    this.errorMessage.set("");
    if (!this.isFormValid()) { this.errorMessage.set(this.validationMessage()); this.focusStatus("checkout-error"); return; }
    if (this.isRental() && this.paymentMethod() === "CARD" && !this.paymentService.cardReady()) { this.errorMessage.set("Kart ödeme sağlayıcısı henüz etkin değil. Lütfen Ofiste Ödeme veya Havale / EFT seçin."); this.focusStatus("checkout-error"); return; }

    this.isSubmitting.set(true);
    try {
      this.calculatePrice();
      const rentalWindow = this.isRental() ? this.rentalWindow() : null;
      const tourStart = this.isTour() ? this.turkeyDateTime(this.tourDate, "09:00") : null;
      const extras = [this.wantsChildSeat ? "Bebek Koltuğu" : "", this.wantsInsurance ? "Ek Güvence" : ""].filter(Boolean);
      const cloudId = (booking.item as Vehicle | null)?.cloudId || booking.item?.id;
      const tourPeople = this.isTour() ? Math.max(1, Math.min(100, Number(this.personCount) || 1)) : undefined;
      const record = await this.bookingService.create({
        type: booking.type, itemId: cloudId, itemName: booking.itemName, image: booking.image,
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`, customerEmail: this.email.trim(), customerPhone: this.phone.trim(),
        basePrice: booking.basePrice, totalPrice: this.isRental() ? this.totalPrice() : this.isTour() ? (booking.basePrice || 0) * (tourPeople || 1) : booking.basePrice,
        currency: "TRY", personCount: tourPeople,
        startDate: this.isRental() ? rentalWindow!.start.toISOString() : this.isTour() ? tourStart!.toISOString() : booking.startDate,
        endDate: this.isRental() ? rentalWindow!.end.toISOString() : this.isTour() ? tourStart!.toISOString() : booking.endDate,
        days: this.isRental() ? this.totalDays() : undefined, rentalHours: this.isRental() && this.rentalDuration === "hourly" ? this.selectedHours : undefined,
        withDriver: this.isRental() ? this.withDriver : undefined, pickupLocation: booking.pickupLocation, rentalDuration: this.isRental() ? this.rentalDuration : undefined,
        notes: [this.notes.trim(), extras.length ? `Ekstralar: ${extras.join(", ")}` : ""].filter(Boolean).join("\n"), paymentMethod: this.isRental() ? this.paymentMethod() : "NONE", source: "WEB",
      });
      this.bookingReference.set(record.id);

      if (this.isRental() && this.paymentMethod() === "CARD") {
        const origin = window.location.origin;
        const payment = await this.paymentService.createCardSession({ bookingReference: record.id, amount: record.totalPrice || 0, currency: "TRY", method: "CARD", customer: { name: record.customerName, email: record.customerEmail || this.email.trim(), phone: record.customerPhone }, returnUrl: `${origin}/contact?payment=success&booking=${encodeURIComponent(record.id)}`, cancelUrl: `${origin}/contact?payment=cancel&booking=${encodeURIComponent(record.id)}`, description: record.itemName, metadata: { bookingType: record.type } });
        if (payment.ok && payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; }
        this.successMessage.set("Rezervasyon talebiniz gönderildi ancak ödeme oturumu başlatılamadı. Talebiniz kaybolmadı ve ekibimiz ödeme durumunu kontrol edecektir.");
        this.focusStatus("checkout-success"); return;
      }

      this.successMessage.set(this.isTour() ? "Tur rezervasyon talebiniz gönderildi. Ekibimiz uygunluk ve buluşma detaylarını sizinle paylaşacaktır." : this.isSaleInquiry() ? "Satın alma talebiniz gönderildi. Ekibimiz araç ve ekspertiz detaylarıyla sizinle iletişime geçecektir." : this.paymentMethod() === "EFT" ? "Rezervasyon talebiniz ve EFT tercihiniz gönderildi. Banka bilgileri onay sürecinde iletilecektir." : "Rezervasyon talebiniz gönderildi. Ekibimiz uygunluğu onaylayıp sizinle iletişime geçecektir.");
      this.focusStatus("checkout-success");
    } catch (error) {
      console.error("Checkout submission failed.", error);
      const message = error instanceof Error ? error.message : "";
      this.errorMessage.set(message.includes("RENTAL_TIME_CONFLICT") ? "Seçtiğiniz tarih ve saat aralığı bu araç için artık uygun değil. Lütfen başka bir zaman seçin." : "Talep gönderilemedi. Bilgilerinizi kontrol edip tekrar deneyin. Sorun devam ederse iletişim hattımızı kullanın.");
      this.focusStatus("checkout-error");
      this.toastService.show("Talep gönderilemedi.", "error");
    } finally { this.isSubmitting.set(false); }
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
  finish(): void { this.carService.clearBookingRequest(); void this.router.navigate(["/"]); }

  private validationMessage(): string {
    if (!this.firstName.trim()) return "Ad alanını doldurun.";
    if (!this.lastName.trim()) return "Soyad alanını doldurun.";
    if (!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())) return "Geçerli bir telefon numarası girin.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return "Geçerli bir e-posta adresi girin.";
    if (this.isRental() && !this.rentalWindow()) return "Kiralama alış ve dönüş tarih-saat bilgilerini kontrol edin.";
    if (this.isTour() && !this.tourDate) return "Tur tarihini seçin.";
    if (this.isTour() && (!Number.isInteger(Number(this.personCount)) || Number(this.personCount) < 1 || Number(this.personCount) > 100)) return "Kişi sayısı 1 ile 100 arasında olmalıdır.";
    return "Lütfen zorunlu alanları kontrol edin.";
  }

  private focusStatus(id: string): void { setTimeout(() => document.getElementById(id)?.focus(), 0); }

  private rentalWindow(): { start: Date; end: Date } | null {
    if (!this.startDate || !this.startTime) return null;
    const start = this.turkeyDateTime(this.startDate, this.startTime); if (Number.isNaN(start.getTime())) return null;
    if (this.rentalDuration === "hourly") { const hours = Math.max(1, Math.min(23, Number(this.selectedHours) || 0)); if (!hours) return null; return { start, end: new Date(start.getTime() + hours * 3_600_000) }; }
    if (!this.endDate || !this.endTime) return null;
    const end = this.turkeyDateTime(this.endDate, this.endTime); if (end.getTime() <= start.getTime()) return null;
    return { start, end };
  }

  private turkeyDateTime(date: string, time: string): Date { return new Date(`${date}T${time}:00+03:00`); }
  private turkeyToday(): string { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ""; return `${get("year")}-${get("month")}-${get("day")}`; }
  private dateInTurkey(date: Date): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
  private applyInitialDateTime(value: string, start: boolean): void { const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) { if (start) this.startDate = value.slice(0, 10); else this.endDate = value.slice(0, 10); return; } const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed); const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(parsed); if (start) { this.startDate = date; this.startTime = time; } else { this.endDate = date; this.endTime = time; } }
}
