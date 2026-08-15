import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { BookingService } from "../services/booking.service";
import { CarService } from "../services/car.service";
import { PaymentService } from "../services/payment.service";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-booking-checkout",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-950 pb-20 text-slate-200">
      <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Geri dön">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 class="truncate text-lg font-black text-white">{{ pageTitle() }}</h1>
            <p class="truncate text-xs text-slate-400">{{ request()?.itemName }}</p>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-4xl space-y-5 px-4 py-6">
        @if (request(); as booking) {
          <section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div class="flex gap-4 p-4 sm:p-6">
              @if (booking.image) {
                <img [src]="booking.image" [alt]="booking.itemName" class="h-24 w-32 shrink-0 rounded-xl object-cover" referrerpolicy="no-referrer" />
              }
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold uppercase tracking-wider text-blue-400">{{ itemTypeLabel() }}</div>
                <h2 class="mt-1 text-xl font-black text-white">{{ booking.itemName }}</h2>
                @if (booking.basePrice) {
                  <p class="mt-2 text-lg font-black text-blue-300">{{ booking.basePrice | number }} ₺{{ priceSuffix() }}</p>
                }
              </div>
            </div>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h2 class="mb-5 text-lg font-black text-white">1. Kiralama Detayları</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block sm:col-span-2">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Kiralama Türü</span>
                  <select [(ngModel)]="rentalDuration" (change)="rentalDurationChanged()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="hourly">Saatlik</option>
                    <option value="daily">Günlük</option>
                    <option value="monthly">Aylık</option>
                    <option value="longterm">Uzun Dönem</option>
                  </select>
                </label>

                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Alış Tarihi</span>
                  <input type="date" [min]="today" [(ngModel)]="startDate" (change)="rentalWindowChanged()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </label>

                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Alış Saati</span>
                  <input type="time" [(ngModel)]="startTime" (change)="rentalWindowChanged()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </label>

                @if (rentalDuration === 'hourly') {
                  <label class="block sm:col-span-2">
                    <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Kiralama Süresi</span>
                    <div class="flex items-center gap-3">
                      <input type="number" min="1" max="23" [(ngModel)]="selectedHours" (input)="rentalWindowChanged()" class="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                      <span class="shrink-0 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black">Saat</span>
                    </div>
                    @if (hourlyEndLabel()) {
                      <p class="mt-2 text-xs font-bold text-blue-300">Tahmini dönüş: {{ hourlyEndLabel() }}</p>
                    }
                  </label>
                } @else {
                  <label class="block">
                    <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Dönüş Tarihi</span>
                    <input type="date" [min]="startDate || today" [(ngModel)]="endDate" (change)="rentalWindowChanged()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label class="block">
                    <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Dönüş Saati</span>
                    <input type="time" [(ngModel)]="endTime" (change)="rentalWindowChanged()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                }
              </div>

              @if (rentalWindowError()) {
                <div role="alert" class="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm font-bold text-rose-200">{{ rentalWindowError() }}</div>
              }

              <div class="mt-5 grid gap-3 sm:grid-cols-3">
                <label class="flex min-h-14 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                  <input type="checkbox" [(ngModel)]="withDriver" (change)="calculatePrice()" class="h-5 w-5" />
                  <span class="font-bold">Şoförlü</span>
                </label>
                <label class="flex min-h-14 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                  <input type="checkbox" [(ngModel)]="wantsChildSeat" (change)="calculatePrice()" class="h-5 w-5" />
                  <span class="font-bold">Bebek Koltuğu</span>
                </label>
                <label class="flex min-h-14 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                  <input type="checkbox" [(ngModel)]="wantsInsurance" (change)="calculatePrice()" class="h-5 w-5" />
                  <span class="font-bold">Ek Güvence</span>
                </label>
              </div>

              <div class="mt-5 flex items-end justify-between rounded-xl bg-blue-500/10 p-4">
                <div>
                  <div class="text-xs font-bold uppercase text-blue-300">Tahmini Toplam</div>
                  <div class="mt-1 text-xs text-slate-400">{{ rentalDuration === 'hourly' ? selectedHours + ' saat' : totalDays() + ' gün' }}</div>
                </div>
                <div class="text-2xl font-black text-blue-300">{{ totalPrice() | number }} ₺</div>
              </div>
            </section>
          }

          @if (isTour()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h2 class="mb-5 text-lg font-black text-white">1. Tur Detayları</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Kişi Sayısı</span>
                  <input type="number" min="1" max="100" [(ngModel)]="personCount" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Tur Tarihi</span>
                  <input type="date" [min]="today" [(ngModel)]="tourDate" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>
            </section>
          }

          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 class="mb-5 text-lg font-black text-white">{{ isRental() || isTour() ? '2.' : '1.' }} İletişim Bilgileri</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Ad</span><input autocomplete="given-name" [(ngModel)]="firstName" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Soyad</span><input autocomplete="family-name" [(ngModel)]="lastName" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Telefon</span><input type="tel" autocomplete="tel" [(ngModel)]="phone" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">E-posta</span><input type="email" autocomplete="email" [(ngModel)]="email" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
            </div>
            <label class="mt-4 block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Not</span><textarea rows="3" [(ngModel)]="notes" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Teslimat, özel istek veya açıklama"></textarea></label>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <div class="mb-5 flex items-center justify-between gap-3">
                <h2 class="text-lg font-black text-white">3. Ödeme Yöntemi</h2>
                @if (!paymentService.isStatusLoaded()) { <span class="text-xs text-slate-400">Kontrol ediliyor...</span> }
              </div>
              <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Ödeme yöntemi">
                <button type="button" (click)="selectPayment('CARD')" [attr.aria-pressed]="paymentMethod() === 'CARD'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'CARD'" [class.bg-blue-500]="paymentMethod() === 'CARD'" [class.text-slate-950]="paymentMethod() === 'CARD'" [class.border-slate-700]="paymentMethod() !== 'CARD'">
                  <mat-icon>credit_card</mat-icon><div class="mt-2 font-black">Kredi / Banka Kartı</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'CARD'">{{ paymentService.cardReady() ? 'Güvenli ödeme sayfası hazır' : 'Sağlayıcı bağlantısı bekleniyor' }}</div>
                </button>
                <button type="button" (click)="selectPayment('OFFICE')" [attr.aria-pressed]="paymentMethod() === 'OFFICE'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'OFFICE'" [class.bg-blue-500]="paymentMethod() === 'OFFICE'" [class.text-slate-950]="paymentMethod() === 'OFFICE'" [class.border-slate-700]="paymentMethod() !== 'OFFICE'">
                  <mat-icon>storefront</mat-icon><div class="mt-2 font-black">Ofiste Ödeme</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'OFFICE'">Araç tesliminde ödeme</div>
                </button>
                <button type="button" (click)="selectPayment('EFT')" [attr.aria-pressed]="paymentMethod() === 'EFT'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'EFT'" [class.bg-blue-500]="paymentMethod() === 'EFT'" [class.text-slate-950]="paymentMethod() === 'EFT'" [class.border-slate-700]="paymentMethod() !== 'EFT'">
                  <mat-icon>account_balance</mat-icon><div class="mt-2 font-black">Havale / EFT</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'EFT'">Ödeme bilgileri onay sonrası iletilir</div>
                </button>
              </div>
              @if (paymentMethod() === 'CARD' && !paymentService.cardReady()) {
                <div role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Kart modülü hazırdır ancak gerçek ödeme sağlayıcısı henüz bağlanmamıştır. Provider ve gizli anahtarlar Vercel ortam değişkenlerine eklendiğinde bu seçenek kod değişmeden aktifleşir.</div>
              }
            </section>
          }

          @if (errorMessage()) { <div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{{ errorMessage() }}</div> }

          @if (successMessage()) {
            <section class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <mat-icon class="!h-12 !w-12 !text-[48px] text-emerald-400">check_circle</mat-icon>
              <h2 class="mt-3 text-2xl font-black text-white">Talebiniz Kaydedildi</h2>
              <p class="mt-2 text-slate-300">{{ successMessage() }}</p>
              <p class="mt-3 text-sm font-bold text-emerald-300">Referans: {{ bookingReference() }}</p>
              <button type="button" (click)="finish()" class="mt-5 min-h-12 rounded-xl bg-white px-6 font-black text-slate-950">Ana Sayfaya Dön</button>
            </section>
          } @else {
            <button type="button" (click)="submit()" [disabled]="isSubmitting() || !isFormValid()" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
              @if (isSubmitting()) { <mat-icon class="animate-spin">progress_activity</mat-icon> İşleniyor... }
              @else if (isRental() && paymentMethod() === 'CARD') { Güvenli Ödemeye Geç }
              @else { {{ submitLabel() }} }
            </button>
          }
        }
      </div>
    </main>
  `,
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
    if (!booking) {
      await this.router.navigate(["/contact"]);
      return;
    }
    if (booking.startDate) this.applyInitialDateTime(booking.startDate, true);
    if (booking.endDate) this.applyInitialDateTime(booking.endDate, false);
    this.rentalDuration = booking.rentalDuration || "daily";
    this.withDriver = Boolean(booking.withDriver);
    this.personCount = Math.max(1, Number((booking as any).personCount) || 1);
    this.tourDate = booking.startDate?.slice(0, 10) || "";
    this.calculatePrice();
    await this.paymentService.refreshIntegrationStatus();
  }

  isRental(): boolean { return this.request()?.type === "RENTAL"; }
  isTour(): boolean { return this.request()?.type === "TOUR"; }
  isSaleInquiry(): boolean { return this.request()?.type === "SALE_INQUIRY"; }
  pageTitle(): string { return this.isRental() ? "Rezervasyon" : this.isTour() ? "Tur Rezervasyonu" : "Talep Oluştur"; }
  itemTypeLabel(): string { return this.isRental() ? "Kiralık Araç" : this.isTour() ? "VIP Tur" : "Satın Alma Talebi"; }
  priceSuffix(): string { return this.isRental() ? " / gün" : this.isTour() ? " / kişi" : ""; }
  submitLabel(): string { return this.isTour() ? "Tur Rezervasyonunu Kaydet" : this.isSaleInquiry() ? "Satın Alma Talebini Kaydet" : "Talebi Kaydet"; }

  selectPayment(method: "CARD" | "EFT" | "OFFICE"): void { this.errorMessage.set(""); this.paymentMethod.set(method); }

  rentalDurationChanged(): void {
    if (this.rentalDuration === "hourly") {
      this.endDate = "";
    } else if (!this.endDate && this.startDate) {
      const next = new Date(`${this.startDate}T12:00:00+03:00`);
      next.setUTCDate(next.getUTCDate() + 1);
      this.endDate = this.dateInTurkey(next);
      this.endTime = this.startTime;
    }
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
    const window = this.rentalWindow();
    if (!window) return "";
    return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(window.end);
  }

  calculatePrice(): void {
    const booking = this.request();
    if (!booking || booking.type !== "RENTAL") return;
    const basePrice = booking.basePrice || 0;

    if (this.rentalDuration === "hourly") {
      const hours = Math.max(1, Math.min(23, Number(this.selectedHours) || 1));
      this.selectedHours = hours;
      const hourly = Math.min(basePrice, (basePrice / 24) * 1.5 * hours);
      const driver = this.withDriver ? Math.min(1500, (1500 / 24) * 1.5 * hours) : 0;
      const childSeat = this.wantsChildSeat ? Math.min(250, (250 / 24) * 1.5 * hours) : 0;
      const insurance = this.wantsInsurance ? Math.min(450, (450 / 24) * 1.5 * hours) : 0;
      this.totalDays.set(1);
      this.totalPrice.set(Math.round(hourly + driver + childSeat + insurance));
      return;
    }

    const window = this.rentalWindow();
    if (!window) {
      this.totalDays.set(1);
      this.totalPrice.set(basePrice);
      return;
    }

    const difference = window.end.getTime() - window.start.getTime();
    const days = Math.max(1, Math.ceil(difference / 86_400_000));
    let multiplier = 1;
    const startTurkey = new Date(window.start.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    if ([11, 0, 1].includes(startTurkey.getMonth())) multiplier -= 0.1;
    if ([0, 6].includes(startTurkey.getDay())) multiplier += 0.15;

    const baseTotal = basePrice * days * multiplier;
    const driverFee = this.withDriver ? 1500 * days : 0;
    const childSeatFee = this.wantsChildSeat ? 250 * days : 0;
    const insuranceFee = this.wantsInsurance ? 450 * days : 0;
    this.totalDays.set(days);
    this.totalPrice.set(Math.round(baseTotal + driverFee + childSeatFee + insuranceFee));
  }

  isFormValid(): boolean {
    if (!this.firstName.trim() || !this.lastName.trim()) return false;
    if (!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return false;
    if (this.isRental() && !this.rentalWindow()) return false;
    if (this.isTour()) {
      if (!this.tourDate) return false;
      if (!Number.isInteger(Number(this.personCount)) || Number(this.personCount) < 1 || Number(this.personCount) > 100) return false;
    }
    return true;
  }

  async submit(): Promise<void> {
    const booking = this.request();
    if (!booking || !this.isFormValid() || this.isSubmitting()) return;
    this.errorMessage.set("");

    if (this.isRental() && this.paymentMethod() === "CARD" && !this.paymentService.cardReady()) {
      this.errorMessage.set("Kart ödeme sağlayıcısı henüz bağlanmadı. Kart seçeneği hazır tutuluyor; şimdilik ofiste ödeme veya EFT seçebilirsiniz.");
      return;
    }

    this.isSubmitting.set(true);
    try {
      this.calculatePrice();
      const rentalWindow = this.isRental() ? this.rentalWindow() : null;
      const tourStart = this.isTour() ? this.turkeyDateTime(this.tourDate, "09:00") : null;
      const extras = [this.wantsChildSeat ? "Bebek Koltuğu" : "", this.wantsInsurance ? "Ek Güvence" : ""].filter(Boolean);
      const cloudId = (booking.item as any)?.cloudId || booking.item?.id;
      const tourPeople = this.isTour() ? Math.max(1, Math.min(100, Number(this.personCount) || 1)) : undefined;
      const nonRentalPrice = this.isTour() ? (booking.basePrice || 0) * (tourPeople || 1) : booking.basePrice;

      const record = await this.bookingService.create({
        type: booking.type,
        itemId: cloudId,
        itemName: booking.itemName,
        image: booking.image,
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`,
        customerEmail: this.email.trim(),
        customerPhone: this.phone.trim(),
        basePrice: booking.basePrice,
        totalPrice: this.isRental() ? this.totalPrice() : nonRentalPrice,
        currency: "TRY",
        personCount: tourPeople,
        startDate: this.isRental() ? rentalWindow!.start.toISOString() : this.isTour() ? tourStart!.toISOString() : booking.startDate,
        endDate: this.isRental() ? rentalWindow!.end.toISOString() : this.isTour() ? tourStart!.toISOString() : booking.endDate,
        days: this.isRental() ? this.totalDays() : undefined,
        rentalHours: this.isRental() && this.rentalDuration === "hourly" ? this.selectedHours : undefined,
        withDriver: this.isRental() ? this.withDriver : undefined,
        pickupLocation: booking.pickupLocation,
        rentalDuration: this.isRental() ? this.rentalDuration : undefined,
        notes: [this.notes.trim(), extras.length ? `Ekstralar: ${extras.join(", ")}` : ""].filter(Boolean).join("\n"),
        paymentMethod: this.isRental() ? this.paymentMethod() : "NONE",
        source: "WEB",
      });
      this.bookingReference.set(record.id);

      if (this.isRental() && this.paymentMethod() === "CARD") {
        const origin = window.location.origin;
        const payment = await this.paymentService.createCardSession({
          bookingReference: record.id,
          amount: record.totalPrice || 0,
          currency: "TRY",
          method: "CARD",
          customer: { name: record.customerName, email: record.customerEmail || this.email.trim(), phone: record.customerPhone },
          returnUrl: `${origin}/contact?payment=success&booking=${encodeURIComponent(record.id)}`,
          cancelUrl: `${origin}/contact?payment=cancel&booking=${encodeURIComponent(record.id)}`,
          description: record.itemName,
          metadata: { bookingType: record.type },
        });
        if (payment.ok && payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; }
        this.successMessage.set("Rezervasyon talebiniz kaydedildi ancak ödeme sağlayıcısı oturumu başlatamadı. Talebiniz kaybolmadı; ekibimiz ödeme durumunu kontrol edecektir.");
        return;
      }

      this.successMessage.set(
        this.isTour()
          ? "Tur rezervasyon talebiniz kaydedildi. Ekibimiz uygunluk ve buluşma detaylarını sizinle paylaşacaktır."
          : this.paymentMethod() === "EFT" && this.isRental()
            ? "Rezervasyon talebiniz ve EFT tercihiniz kaydedildi. Doğrulanmış banka bilgileri onay sürecinde size iletilecektir."
            : this.isRental()
              ? "Rezervasyon talebiniz kaydedildi. Ödeme araç tesliminde ofiste tamamlanacaktır."
              : "Satın alma talebiniz kaydedildi. Ekibimiz sizinle iletişime geçecektir.",
      );
    } catch (error) {
      console.error("Checkout submission failed.", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("RENTAL_TIME_CONFLICT")) {
        this.errorMessage.set("Seçtiğiniz tarih ve saat aralığı bu araç için artık uygun değil. Lütfen başka bir zaman seçin.");
      } else {
        this.errorMessage.set("Talep kaydedilemedi. Bilgilerinizi kontrol edip tekrar deneyin. Sorun devam ederse iletişim hattımızı kullanın.");
      }
      this.toastService.show("Talep kaydedilemedi.", "error");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
  finish(): void { this.carService.clearBookingRequest(); void this.router.navigate(["/"]); }

  private rentalWindow(): { start: Date; end: Date } | null {
    if (!this.startDate || !this.startTime) return null;
    const start = this.turkeyDateTime(this.startDate, this.startTime);
    if (!start || Number.isNaN(start.getTime())) return null;
    if (this.rentalDuration === "hourly") {
      const hours = Math.max(1, Math.min(23, Number(this.selectedHours) || 0));
      if (!hours) return null;
      return { start, end: new Date(start.getTime() + hours * 3_600_000) };
    }
    if (!this.endDate || !this.endTime) return null;
    const end = this.turkeyDateTime(this.endDate, this.endTime);
    if (!end || end.getTime() <= start.getTime()) return null;
    return { start, end };
  }

  private turkeyDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00+03:00`);
  }

  private turkeyToday(): string {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  private dateInTurkey(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  private applyInitialDateTime(value: string, start: boolean): void {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      if (start) this.startDate = value.slice(0, 10); else this.endDate = value.slice(0, 10);
      return;
    }
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
    const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(parsed);
    if (start) { this.startDate = date; this.startTime = time; }
    else { this.endDate = date; this.endTime = time; }
  }
}
