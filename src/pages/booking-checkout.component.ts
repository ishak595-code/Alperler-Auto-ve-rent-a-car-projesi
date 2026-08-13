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
            <h1 class="truncate text-lg font-black text-white">{{ isRental() ? 'Rezervasyon' : 'Talep Oluştur' }}</h1>
            <p class="truncate text-xs text-slate-400">{{ request()?.itemName }}</p>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-4xl space-y-5 px-4 py-6">
        @if (request(); as booking) {
          <section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div class="flex gap-4 p-4 sm:p-6">
              @if (booking.image) {
                <img [src]="booking.image" [alt]="booking.itemName" class="h-24 w-32 shrink-0 rounded-xl object-cover" />
              }
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold uppercase tracking-wider text-blue-400">{{ isRental() ? 'Kiralık Araç' : 'Satın Alma Talebi' }}</div>
                <h2 class="mt-1 text-xl font-black text-white">{{ booking.itemName }}</h2>
                @if (booking.basePrice) {
                  <p class="mt-2 text-lg font-black text-blue-300">{{ booking.basePrice | number }} ₺{{ isRental() ? ' / gün' : '' }}</p>
                }
              </div>
            </div>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h2 class="mb-5 text-lg font-black text-white">1. Kiralama Detayları</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Kiralama Türü</span>
                  <select [(ngModel)]="rentalDuration" (change)="calculatePrice()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="hourly">Saatlik</option>
                    <option value="daily">Günlük</option>
                    <option value="monthly">Aylık</option>
                    <option value="longterm">Uzun Dönem</option>
                  </select>
                </label>

                @if (rentalDuration === 'hourly') {
                  <label class="block">
                    <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Saat</span>
                    <input type="number" min="1" max="23" [(ngModel)]="selectedHours" (input)="calculatePrice()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                }

                <label class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Alış Tarihi</span>
                  <input type="date" [min]="today" [(ngModel)]="startDate" (change)="calculatePrice()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </label>

                @if (rentalDuration !== 'hourly') {
                  <label class="block">
                    <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Dönüş Tarihi</span>
                    <input type="date" [min]="startDate || today" [(ngModel)]="endDate" (change)="calculatePrice()" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                }
              </div>

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

          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 class="mb-5 text-lg font-black text-white">{{ isRental() ? '2.' : '1.' }} İletişim Bilgileri</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Ad</span>
                <input autocomplete="given-name" [(ngModel)]="firstName" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label class="block">
                <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Soyad</span>
                <input autocomplete="family-name" [(ngModel)]="lastName" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label class="block">
                <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Telefon</span>
                <input type="tel" autocomplete="tel" [(ngModel)]="phone" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
              <label class="block">
                <span class="mb-2 block text-xs font-bold uppercase text-slate-400">E-posta</span>
                <input type="email" autocomplete="email" [(ngModel)]="email" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </label>
            </div>
            <label class="mt-4 block">
              <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Not</span>
              <textarea rows="3" [(ngModel)]="notes" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Teslimat, özel istek veya açıklama"></textarea>
            </label>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <div class="mb-5 flex items-center justify-between gap-3">
                <h2 class="text-lg font-black text-white">3. Ödeme Yöntemi</h2>
                @if (!paymentService.isStatusLoaded()) {
                  <span class="text-xs text-slate-400">Kontrol ediliyor...</span>
                }
              </div>

              <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Ödeme yöntemi">
                <button type="button" (click)="selectPayment('CARD')" [attr.aria-pressed]="paymentMethod() === 'CARD'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'CARD'" [class.bg-blue-500]="paymentMethod() === 'CARD'" [class.text-slate-950]="paymentMethod() === 'CARD'" [class.border-slate-700]="paymentMethod() !== 'CARD'">
                  <mat-icon>credit_card</mat-icon>
                  <div class="mt-2 font-black">Kredi / Banka Kartı</div>
                  <div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'CARD'">{{ paymentService.cardReady() ? 'Güvenli ödeme sayfası hazır' : 'Sağlayıcı bağlantısı bekleniyor' }}</div>
                </button>

                <button type="button" (click)="selectPayment('OFFICE')" [attr.aria-pressed]="paymentMethod() === 'OFFICE'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'OFFICE'" [class.bg-blue-500]="paymentMethod() === 'OFFICE'" [class.text-slate-950]="paymentMethod() === 'OFFICE'" [class.border-slate-700]="paymentMethod() !== 'OFFICE'">
                  <mat-icon>storefront</mat-icon>
                  <div class="mt-2 font-black">Ofiste Ödeme</div>
                  <div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'OFFICE'">Araç tesliminde ödeme</div>
                </button>

                <button type="button" (click)="selectPayment('EFT')" [attr.aria-pressed]="paymentMethod() === 'EFT'" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'EFT'" [class.bg-blue-500]="paymentMethod() === 'EFT'" [class.text-slate-950]="paymentMethod() === 'EFT'" [class.border-slate-700]="paymentMethod() !== 'EFT'">
                  <mat-icon>account_balance</mat-icon>
                  <div class="mt-2 font-black">Havale / EFT</div>
                  <div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'EFT'">Ödeme bilgileri onay sonrası iletilir</div>
                </button>
              </div>

              @if (paymentMethod() === 'CARD' && !paymentService.cardReady()) {
                <div role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Kart modülü hazırdır ancak gerçek ödeme sağlayıcısı henüz bağlanmamıştır. Provider ve gizli anahtarlar Vercel ortam değişkenlerine eklendiğinde bu seçenek kod değişmeden aktifleşir.
                </div>
              }
            </section>
          }

          @if (errorMessage()) {
            <div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{{ errorMessage() }}</div>
          }

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
              @else { Talebi Kaydet }
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

  readonly today = new Date().toISOString().slice(0, 10);
  firstName = "";
  lastName = "";
  phone = "";
  email = "";
  notes = "";
  startDate = "";
  endDate = "";
  rentalDuration = "daily";
  selectedHours = 1;
  withDriver = false;
  wantsChildSeat = false;
  wantsInsurance = false;

  async ngOnInit(): Promise<void> {
    const booking = this.request();
    if (!booking) {
      await this.router.navigate(["/contact"]);
      return;
    }
    this.startDate = booking.startDate || "";
    this.endDate = booking.endDate || "";
    this.rentalDuration = booking.rentalDuration || "daily";
    this.withDriver = Boolean(booking.withDriver);
    this.calculatePrice();
    await this.paymentService.refreshIntegrationStatus();
  }

  isRental(): boolean {
    return this.request()?.type === "RENTAL";
  }

  selectPayment(method: "CARD" | "EFT" | "OFFICE"): void {
    this.errorMessage.set("");
    this.paymentMethod.set(method);
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
      this.totalDays.set(1);
      this.totalPrice.set(Math.round(hourly + driver));
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.totalDays.set(1);
      this.totalPrice.set(basePrice);
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const difference = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(difference / 86_400_000));
    let multiplier = 1;
    if ([11, 0, 1].includes(start.getMonth())) multiplier -= 0.1;
    if ([0, 6].includes(start.getDay())) multiplier += 0.15;

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
    if (this.isRental()) {
      if (!this.startDate) return false;
      if (this.rentalDuration !== "hourly" && !this.endDate) return false;
    }
    return true;
  }

  async submit(): Promise<void> {
    const booking = this.request();
    if (!booking || !this.isFormValid() || this.isSubmitting()) return;
    this.errorMessage.set("");

    if (this.isRental() && this.paymentMethod() === "CARD" && !this.paymentService.cardReady()) {
      this.errorMessage.set(
        "Kart ödeme sağlayıcısı henüz bağlanmadı. Kart seçeneği hazır tutuluyor; şimdilik ofiste ödeme veya EFT seçebilirsiniz.",
      );
      return;
    }

    this.isSubmitting.set(true);
    try {
      this.calculatePrice();
      const extras = [
        this.wantsChildSeat ? "Bebek Koltuğu" : "",
        this.wantsInsurance ? "Ek Güvence" : "",
      ].filter(Boolean);

      const record = await this.bookingService.create({
        type: booking.type,
        itemId: booking.item?.id,
        itemName: booking.itemName,
        image: booking.image,
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`,
        customerEmail: this.email.trim(),
        customerPhone: this.phone.trim(),
        basePrice: booking.basePrice,
        totalPrice: this.isRental() ? this.totalPrice() : booking.basePrice,
        currency: "TRY",
        startDate: this.isRental() ? this.startDate : booking.startDate,
        endDate:
          this.isRental() && this.rentalDuration === "hourly"
            ? this.startDate
            : this.isRental()
              ? this.endDate
              : booking.endDate,
        days: this.isRental() ? this.totalDays() : undefined,
        withDriver: this.isRental() ? this.withDriver : undefined,
        pickupLocation: booking.pickupLocation,
        rentalDuration: this.isRental() ? this.rentalDuration : undefined,
        notes: [this.notes.trim(), extras.length ? `Ekstralar: ${extras.join(", ")}` : ""]
          .filter(Boolean)
          .join("\n"),
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
          customer: {
            name: record.customerName,
            email: record.customerEmail || this.email.trim(),
            phone: record.customerPhone,
          },
          returnUrl: `${origin}/contact?payment=success&booking=${encodeURIComponent(record.id)}`,
          cancelUrl: `${origin}/contact?payment=cancel&booking=${encodeURIComponent(record.id)}`,
          description: record.itemName,
          metadata: { bookingType: record.type },
        });

        if (payment.ok && payment.checkoutUrl) {
          window.location.assign(payment.checkoutUrl);
          return;
        }

        this.successMessage.set(
          "Rezervasyon talebiniz kaydedildi ancak ödeme sağlayıcısı oturumu başlatamadı. Talebiniz kaybolmadı; ekibimiz ödeme durumunu kontrol edecektir.",
        );
        return;
      }

      this.successMessage.set(
        this.paymentMethod() === "EFT" && this.isRental()
          ? "Rezervasyon talebiniz ve EFT tercihiniz kaydedildi. Doğrulanmış banka bilgileri onay sürecinde size iletilecektir."
          : this.isRental()
            ? "Rezervasyon talebiniz kaydedildi. Ödeme araç tesliminde ofiste tamamlanacaktır."
            : "Satın alma talebiniz kaydedildi. Ekibimiz sizinle iletişime geçecektir.",
      );
    } catch (error) {
      console.error("Checkout submission failed.", error);
      this.errorMessage.set(
        "Talep kaydedilemedi. Bilgilerinizi kontrol edip tekrar deneyin. Sorun devam ederse iletişim hattımızı kullanın.",
      );
      this.toastService.show("Talep kaydedilemedi.", "error");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }

  finish(): void {
    this.carService.clearBookingRequest();
    void this.router.navigate(["/"]);
  }
}
