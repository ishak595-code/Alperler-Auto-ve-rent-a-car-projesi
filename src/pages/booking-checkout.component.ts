import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { AccessibleDateFieldComponent } from "../components/accessible-date-field.component";
import { Branch } from "../models/branch.model";
import { RentalExtraOption } from "../models/site-config.model";
import { BookingService } from "../services/booking.service";
import { BranchService } from "../services/branch.service";
import { CarService } from "../services/car.service";
import { PaymentService } from "../services/payment.service";
import { ToastService } from "../services/toast.service";

interface LocationChoice {
  key: string;
  label: string;
}

@Component({
  selector: "app-booking-checkout",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AccessibleDateFieldComponent],
  template: `
    <main class="min-h-screen bg-slate-950 pb-24 text-slate-200">
      <header class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Geri">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 class="truncate text-lg font-black text-white">{{ isRental() ? 'Rezervasyon' : 'Talep Oluştur' }}</h1>
            <p class="truncate text-xs text-slate-400">{{ request()?.itemName }}</p>
          </div>
        </div>
      </header>

      <div class="mx-auto max-w-4xl space-y-5 px-4 py-6">
        @if (request(); as booking) {
          <section class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900" aria-labelledby="booking-item-title">
            <div class="flex gap-4 p-4 sm:p-6">
              @if (booking.image) {
                <img [src]="booking.image" [alt]="booking.itemName" class="h-24 w-32 shrink-0 rounded-xl object-cover" />
              }
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold uppercase tracking-wider text-blue-400">{{ isRental() ? 'Kiralık Araç' : 'Satın Alma Talebi' }}</div>
                <h2 id="booking-item-title" class="mt-1 text-xl font-black text-white">{{ booking.itemName }}</h2>
                @if (booking.basePrice) {
                  <p class="mt-2 text-lg font-black text-blue-300">{{ booking.basePrice | number }} ₺{{ isRental() ? ' / gün' : '' }}</p>
                }
              </div>
            </div>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6" aria-labelledby="rental-details-title">
              <h2 id="rental-details-title" class="text-lg font-black text-white">1. Kiralama Detayları</h2>
              <p class="mb-5 mt-1 text-sm leading-6 text-slate-400">Tarih, teslimat, şoför tercihi ve ek hizmetler değiştikçe tahmini toplam otomatik güncellenir.</p>

              <div class="grid gap-4 sm:grid-cols-2">
                <label for="rental-duration" class="block">
                  <span class="mb-2 block text-xs font-bold uppercase text-slate-400">Kiralama Türü</span>
                  <select id="rental-duration" [(ngModel)]="rentalDuration" (ngModelChange)="calculatePrice()" aria-label="Kiralama türü" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="daily">Günlük</option>
                    <option value="monthly">Aylık</option>
                    <option value="longterm">Uzun Dönem</option>
                  </select>
                </label>

                <div class="hidden sm:block"></div>

                <div class="[--date-bg:#020617] [--date-border:#334155] [--date-color:#fff] [--date-muted:#94a3b8]">
                  <app-accessible-date-field label="Alış tarihi" [value]="startDate" [min]="today" (valueChange)="setStartDate($event)" />
                </div>

                <div class="[--date-bg:#020617] [--date-border:#334155] [--date-color:#fff] [--date-muted:#94a3b8]">
                  <app-accessible-date-field label="İade tarihi" [value]="endDate" [min]="startDate || today" (valueChange)="setEndDate($event)" />
                </div>
              </div>

              <button type="button" (click)="openExtras()" class="mt-5 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Teslimat, şoför tercihi ve ek hizmetleri seç">
                <span class="flex min-w-0 items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300"><mat-icon aria-hidden="true">tune</mat-icon></span>
                  <span class="min-w-0">
                    <strong class="block text-sm text-white">Teslimat, Şoför ve Ek Hizmetler</strong>
                    <small class="block truncate text-xs text-slate-400">{{ extrasButtonSummary() }}</small>
                  </span>
                </span>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </button>

              <div class="mt-5 space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4" aria-live="polite" aria-atomic="true">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="text-slate-300">Araç bedeli · {{ totalDays() }} gün</span>
                  <strong class="text-white">{{ baseRentalTotal() | number }} ₺</strong>
                </div>
                @if (extrasTotal() > 0) {
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="text-slate-300">Şoför ve ek hizmetler</span>
                    <strong class="text-white">{{ extrasTotal() | number }} ₺</strong>
                  </div>
                }
                @if (matchedDistanceKm() > 0) {
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="text-slate-300">Mesafe / yakıt · {{ matchedDistanceKm() | number:'1.0-1' }} km</span>
                    <strong class="text-white">{{ routeFuelTotal() | number }} ₺</strong>
                  </div>
                }
                <div class="mt-2 flex items-end justify-between gap-3 border-t border-blue-300/15 pt-3">
                  <div>
                    <div class="text-xs font-bold uppercase text-blue-300">Tahmini Toplam</div>
                    <div class="mt-1 text-xs text-slate-400">Rezervasyon onayından önce tekrar doğrulanır.</div>
                  </div>
                  <div class="text-2xl font-black text-blue-300">{{ totalPrice() | number }} ₺</div>
                </div>
              </div>
            </section>
          }

          <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6" aria-labelledby="contact-details-title">
            <h2 id="contact-details-title" class="mb-5 text-lg font-black text-white">{{ isRental() ? '2.' : '1.' }} İletişim Bilgileri</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label for="booking-first-name" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Ad</span><input id="booking-first-name" autocomplete="given-name" [(ngModel)]="firstName" aria-label="Ad" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label for="booking-last-name" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Soyad</span><input id="booking-last-name" autocomplete="family-name" [(ngModel)]="lastName" aria-label="Soyad" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label for="booking-phone" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Telefon</span><input id="booking-phone" type="tel" autocomplete="tel" inputmode="tel" [(ngModel)]="phone" aria-label="Telefon" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label for="booking-email" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">E-posta</span><input id="booking-email" type="email" autocomplete="email" inputmode="email" [(ngModel)]="email" aria-label="E-posta" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
            </div>
            <label for="booking-note" class="mt-4 block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Not</span><textarea id="booking-note" rows="3" [(ngModel)]="notes" aria-label="Rezervasyon notu" class="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Özel istek veya açıklama"></textarea></label>
          </section>

          @if (isRental()) {
            <section class="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6" aria-labelledby="payment-title">
              <div class="mb-5 flex items-center justify-between gap-3"><h2 id="payment-title" class="text-lg font-black text-white">3. Ödeme Yöntemi</h2>@if (!paymentService.isStatusLoaded()) { <span class="text-xs text-slate-400">Kontrol ediliyor...</span> }</div>
              <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Ödeme yöntemi">
                <button type="button" (click)="selectPayment('CARD')" [attr.aria-pressed]="paymentMethod() === 'CARD'" aria-label="Kart ile ödeme" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'CARD'" [class.bg-blue-500]="paymentMethod() === 'CARD'" [class.text-slate-950]="paymentMethod() === 'CARD'" [class.border-slate-700]="paymentMethod() !== 'CARD'"><mat-icon aria-hidden="true">credit_card</mat-icon><div class="mt-2 font-black">Kart</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'CARD'">{{ paymentService.cardReady() ? 'Güvenli ödeme hazır' : 'Sağlayıcı bekleniyor' }}</div></button>
                <button type="button" (click)="selectPayment('OFFICE')" [attr.aria-pressed]="paymentMethod() === 'OFFICE'" aria-label="Araç tesliminde ödeme" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'OFFICE'" [class.bg-blue-500]="paymentMethod() === 'OFFICE'" [class.text-slate-950]="paymentMethod() === 'OFFICE'" [class.border-slate-700]="paymentMethod() !== 'OFFICE'"><mat-icon aria-hidden="true">storefront</mat-icon><div class="mt-2 font-black">Teslimde</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'OFFICE'">Araç tesliminde ödeme</div></button>
                <button type="button" (click)="selectPayment('EFT')" [attr.aria-pressed]="paymentMethod() === 'EFT'" aria-label="Havale veya EFT ile ödeme" class="min-h-24 rounded-xl border p-4 text-left transition" [class.border-blue-400]="paymentMethod() === 'EFT'" [class.bg-blue-500]="paymentMethod() === 'EFT'" [class.text-slate-950]="paymentMethod() === 'EFT'" [class.border-slate-700]="paymentMethod() !== 'EFT'"><mat-icon aria-hidden="true">account_balance</mat-icon><div class="mt-2 font-black">Havale / EFT</div><div class="mt-1 text-xs" [class.text-slate-400]="paymentMethod() !== 'EFT'">Bilgiler onay sonrası iletilir</div></button>
              </div>
              @if (paymentMethod() === 'CARD' && !paymentService.cardReady()) { <div role="status" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Kart ödeme sağlayıcısı henüz aktif değil. Şimdilik teslimde ödeme veya EFT seçebilirsiniz.</div> }
            </section>
          }

          @if (errorMessage()) { <div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{{ errorMessage() }}</div> }

          @if (successMessage()) {
            <section class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center" role="status" aria-live="polite">
              <mat-icon aria-hidden="true" class="!h-12 !w-12 !text-[48px] text-emerald-400">check_circle</mat-icon><h2 class="mt-3 text-2xl font-black text-white">Talebiniz Kaydedildi</h2><p class="mt-2 text-slate-300">{{ successMessage() }}</p><p class="mt-3 text-sm font-bold text-emerald-300">Referans: {{ bookingReference() }}</p><button type="button" (click)="finish()" aria-label="Ana sayfaya dön" class="mt-5 min-h-12 rounded-xl bg-white px-6 font-black text-slate-950">Ana Sayfaya Dön</button>
            </section>
          } @else {
            <button type="button" (click)="submit()" [disabled]="isSubmitting() || !isFormValid()" aria-label="Rezervasyon talebini kaydet" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">@if (isSubmitting()) { <mat-icon aria-hidden="true" class="animate-spin">progress_activity</mat-icon> İşleniyor... } @else if (isRental() && paymentMethod() === 'CARD') { Güvenli Ödemeye Geç } @else { Talebi Kaydet }</button>
          }
        }
      </div>

      @if (extrasOpen()) {
        <div class="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="presentation">
          <button type="button" class="absolute inset-0 bg-black/70" (click)="closeExtras()" aria-label="Ek hizmetler penceresini kapat"></button>
          <section class="relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100 shadow-2xl sm:rounded-3xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="extras-title">
            <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-black uppercase tracking-wider text-blue-400">Rezervasyonu Özelleştir</p><h2 id="extras-title" class="mt-1 text-xl font-black text-white">Teslimat, Şoför ve Ek Hizmetler</h2></div><button type="button" (click)="closeExtras()" aria-label="Kapat" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">close</mat-icon></button></div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label for="pickup-location" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">Teslim Alma Noktası</span><select id="pickup-location" [ngModel]="pickupLocation()" (ngModelChange)="setPickupLocation($event)" aria-label="Teslim alma noktası" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white">@for (choice of pickupChoices(); track choice.key) { <option [value]="choice.label">{{ choice.label }}</option> }</select></label>
              <label for="dropoff-location" class="block"><span class="mb-2 block text-xs font-bold uppercase text-slate-400">İade Noktası</span><select id="dropoff-location" [ngModel]="dropoffLocation()" (ngModelChange)="setDropoffLocation($event)" aria-label="İade noktası" class="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white">@for (choice of returnChoices(); track choice.key) { <option [value]="choice.label">{{ choice.label }}</option> }</select></label>
            </div>

            @if (matchedDistanceKm() > 0) {
              <div class="mt-4 rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-sm text-blue-100" aria-live="polite">Tanımlı rota: {{ matchedDistanceKm() | number:'1.0-1' }} km · Tahmini yakıt bedeli {{ routeFuelTotal() | number }} ₺</div>
            }

            <div class="mt-6 space-y-3">
              <h3 class="text-sm font-black text-white">Şoför ve ek hizmetler</h3>
              @for (extra of rentalExtras(); track extra.id) {
                <label class="flex min-h-16 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3" [class.opacity-50]="extraUnavailable(extra)">
                  <input type="checkbox" [checked]="isExtraSelected(extra.id)" (change)="toggleExtra(extra)" [disabled]="extraUnavailable(extra) || extraLocked(extra)" [attr.aria-label]="extra.label" class="h-5 w-5 shrink-0" />
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-blue-300"><mat-icon aria-hidden="true">{{ extra.icon || 'add_circle' }}</mat-icon></span>
                  <span class="min-w-0 flex-1"><strong class="block text-sm text-white">{{ extra.label }}</strong>@if (extra.description) { <small class="mt-1 block text-xs text-slate-400">{{ extra.description }}</small> }</span>
                  <strong class="shrink-0 text-sm text-blue-300">{{ extraPriceLabel(extra) }}</strong>
                </label>
              }
            </div>

            <div class="sticky bottom-0 mt-6 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 backdrop-blur">
              <div class="mb-2 flex items-center justify-between text-sm"><span>Şoför ve ek hizmetler</span><strong class="text-blue-300">{{ extrasTotal() | number }} ₺</strong></div>
              @if (matchedDistanceKm() > 0) { <div class="mb-3 flex items-center justify-between text-sm"><span>Mesafe / yakıt</span><strong class="text-blue-300">{{ routeFuelTotal() | number }} ₺</strong></div> }
              <button type="button" (click)="closeExtras()" aria-label="Seçimleri uygula" class="min-h-12 w-full rounded-xl bg-blue-500 px-4 font-black text-slate-950">Seçimleri Uygula</button>
            </div>
          </section>
        </div>
      }
    </main>
  `,
})
export class BookingCheckoutComponent implements OnInit {
  readonly carService = inject(CarService);
  readonly bookingService = inject(BookingService);
  readonly branchService = inject(BranchService);
  readonly paymentService = inject(PaymentService);
  readonly toastService = inject(ToastService);
  readonly router = inject(Router);
  readonly location = inject(Location);

  readonly request = signal(this.carService.getBookingRequest());
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
  readonly extrasOpen = signal(false);
  readonly selectedExtraIds = signal<string[]>([]);
  readonly pickupLocation = signal("");
  readonly dropoffLocation = signal("");

  readonly today = new Date().toISOString().slice(0, 10);
  firstName = "";
  lastName = "";
  phone = "";
  email = "";
  notes = "";
  startDate = "";
  endDate = "";
  rentalDuration = "daily";

  private readonly fallbackExtras: RentalExtraOption[] = [
    { id: "driver", label: "Şoförlü kiralama", description: "Profesyonel sürücü hizmeti", icon: "person_pin", enabled: true, sortOrder: 10, pricePerDay: 1500, pricePerHour: 100 },
    { id: "child-seat", label: "Bebek / çocuk koltuğu", description: "Yaşa uygun güvenlik koltuğu", icon: "child_friendly", enabled: true, sortOrder: 20, pricePerDay: 250 },
    { id: "extra-protection", label: "Ek güvence paketi", description: "Standart kapsama ek koruma talebi", icon: "verified_user", enabled: true, sortOrder: 30, pricePerDay: 450 },
    { id: "additional-driver", label: "Ek sürücü", description: "Sözleşmeye ikinci sürücü eklenmesi", icon: "group_add", enabled: true, sortOrder: 40, pricePerDay: 350 },
    { id: "airport-delivery", label: "Havalimanı teslim / iade", description: "Havalimanı teslimat hizmeti", icon: "flight", enabled: true, sortOrder: 50, flatPrice: 750 },
    { id: "after-hours", label: "Mesai dışı teslim / iade", description: "Normal operasyon saatleri dışındaki teslimat talebi", icon: "schedule", enabled: true, sortOrder: 60, flatPrice: 500 },
    { id: "snow-chain", label: "Kar zinciri seti", description: "Kış koşulları için zincir seti", icon: "ac_unit", enabled: true, sortOrder: 70, flatPrice: 300 },
  ];

  readonly rentalExtras = computed(() => {
    const configured = this.carService.getConfig()().rentalExtras;
    const source = Array.isArray(configured) && configured.length ? configured : this.fallbackExtras;
    return source.filter((item) => item.enabled).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  readonly pickupChoices = computed(() => this.buildLocationChoices(this.branchService.pickupPoints(), "pickupLocations"));
  readonly returnChoices = computed(() => {
    const dedicated = this.buildLocationChoices(this.branchService.returnPoints(), "returnLocations");
    return dedicated.length ? dedicated : this.buildLocationChoices(this.branchService.returnPoints(), "pickupLocations");
  });

  async ngOnInit(): Promise<void> {
    const booking = this.request();
    if (!booking) { await this.router.navigate(["/contact"]); return; }
    this.startDate = booking.startDate || "";
    this.endDate = booking.endDate || "";
    this.rentalDuration = booking.rentalDuration || "daily";
    if (booking.withDriver || booking.item?.driverOption === "WITH_DRIVER") this.selectedExtraIds.set(["driver"]);
    await Promise.allSettled([this.branchService.refresh(), this.paymentService.refreshIntegrationStatus()]);
    const pickup = booking.pickupLocation || this.pickupChoices()[0]?.label || this.carService.getConfig()().address;
    const dropoff = this.returnChoices().find((item) => item.label === pickup)?.label || this.returnChoices()[0]?.label || pickup;
    this.pickupLocation.set(pickup || "");
    this.dropoffLocation.set(dropoff || "");
    this.calculatePrice();
  }

  isRental(): boolean { return this.request()?.type === "RENTAL"; }
  setStartDate(value: string): void { this.startDate = value; if (this.endDate && value && this.endDate <= value) this.endDate = ""; this.calculatePrice(); }
  setEndDate(value: string): void { this.endDate = value; this.calculatePrice(); }
  setPickupLocation(value: string): void { this.pickupLocation.set(String(value || '')); this.calculatePrice(); }
  setDropoffLocation(value: string): void { this.dropoffLocation.set(String(value || '')); this.calculatePrice(); }
  openExtras(): void { this.extrasOpen.set(true); }
  closeExtras(): void { this.extrasOpen.set(false); this.calculatePrice(); }
  isExtraSelected(id: string): boolean { return this.selectedExtraIds().includes(id); }
  extraLocked(extra: RentalExtraOption): boolean { return extra.id === "driver" && this.request()?.item?.driverOption === "WITH_DRIVER"; }
  extraUnavailable(extra: RentalExtraOption): boolean { return extra.id === "driver" && this.request()?.item?.driverOption === "WITHOUT_DRIVER"; }

  toggleExtra(extra: RentalExtraOption): void {
    if (this.extraLocked(extra) || this.extraUnavailable(extra)) return;
    this.selectedExtraIds.update((items) => items.includes(extra.id) ? items.filter((id) => id !== extra.id) : [...items, extra.id]);
    this.calculatePrice();
  }

  extraAmount(extra: RentalExtraOption): number {
    const days = Math.max(1, this.totalDays());
    return Math.round((Number(extra.pricePerDay || 0) * days) + Number(extra.flatPrice || 0));
  }

  extraPriceLabel(extra: RentalExtraOption): string {
    const parts: string[] = [];
    if (extra.pricePerDay) parts.push(`${new Intl.NumberFormat("tr-TR").format(extra.pricePerDay)} ₺/gün`);
    if (extra.flatPrice) parts.push(`${new Intl.NumberFormat("tr-TR").format(extra.flatPrice)} ₺ tek sefer`);
    return parts.join(" + ") || "Ücretsiz";
  }

  extrasButtonSummary(): string {
    const count = this.selectedExtraIds().filter((id) => this.rentalExtras().some((extra) => extra.id === id)).length;
    const pickup = this.pickupLocation();
    const distance = this.matchedDistanceKm();
    return `${pickup || "Teslim noktası seç"} · ${count ? count + " hizmet" : "Hizmet seçilmedi"}${distance > 0 ? ` · ${distance} km` : ''}`;
  }

  calculatePrice(): void {
    const booking = this.request();
    if (!booking || booking.type !== "RENTAL") return;
    const basePrice = Number(booking.basePrice || 0);
    let days = 1;
    if (this.startDate && this.endDate) {
      const start = this.parseLocalDate(this.startDate);
      const end = this.parseLocalDate(this.endDate);
      if (start && end) days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    }
    this.totalDays.set(days);
    const rental = Math.round(basePrice * days);
    const extras = this.rentalExtras().filter((extra) => this.isExtraSelected(extra.id) && !this.extraUnavailable(extra)).reduce((sum, extra) => sum + this.extraAmount(extra), 0);
    const route = this.findRoute(this.pickupLocation(), this.dropoffLocation());
    const distance = route?.distanceKm ? Math.max(0, Number(route.distanceKm)) : 0;
    const config = this.carService.getConfig()();
    const fuelPrice = Math.max(0, Number(config.rentalFuelPricePerLiter ?? 85));
    const consumption = Math.max(0, Number(config.rentalAverageConsumptionPer100Km ?? 8.5));
    const fuel = distance > 0 ? Math.round(distance * consumption / 100 * fuelPrice) : 0;
    this.baseRentalTotal.set(rental);
    this.extrasTotal.set(extras);
    this.matchedDistanceKm.set(distance);
    this.routeFuelTotal.set(fuel);
    this.totalPrice.set(rental + extras + fuel);
  }

  selectPayment(method: "CARD" | "EFT" | "OFFICE"): void { this.errorMessage.set(""); this.paymentMethod.set(method); }

  isFormValid(): boolean {
    if (!this.firstName.trim() || !this.lastName.trim()) return false;
    if (!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return false;
    if (!this.isRental()) return true;
    if (!this.startDate || !this.endDate || !this.pickupLocation()) return false;
    if (this.startDate < this.today || this.endDate <= this.startDate) return false;
    return true;
  }

  async submit(): Promise<void> {
    const booking = this.request();
    if (!booking || !this.isFormValid() || this.isSubmitting()) return;
    this.errorMessage.set("");
    if (this.isRental() && this.paymentMethod() === "CARD" && !this.paymentService.cardReady()) { this.errorMessage.set("Kart ödeme sağlayıcısı henüz aktif değil. Şimdilik teslimde ödeme veya EFT seçebilirsiniz."); return; }
    this.isSubmitting.set(true);
    try {
      this.calculatePrice();
      const extras = this.rentalExtras().filter((extra) => this.isExtraSelected(extra.id) && !this.extraUnavailable(extra));
      const extrasText = extras.map((extra) => `${extra.label}: ${new Intl.NumberFormat("tr-TR").format(this.extraAmount(extra))} ₺`).join(", ");
      const withDriver = extras.some((extra) => extra.id === "driver") || booking.item?.driverOption === "WITH_DRIVER";
      const detailNotes = this.isRental() ? [
        `Teslim alma: ${this.pickupLocation()}`,
        `İade: ${this.dropoffLocation() || this.pickupLocation()}`,
        extrasText ? `Şoför / ek hizmetler: ${extrasText}` : "Şoför / ek hizmetler: Yok",
        `Araç bedeli: ${this.baseRentalTotal()} TRY`,
        `Ek hizmet toplamı: ${this.extrasTotal()} TRY`,
        this.matchedDistanceKm() > 0 ? `Tanımlı rota mesafesi: ${this.matchedDistanceKm()} km` : '',
        this.matchedDistanceKm() > 0 ? `Mesafe / yakıt bedeli: ${this.routeFuelTotal()} TRY` : '',
      ] : [];

      const record = await this.bookingService.create({
        type: booking.type,
        itemId: booking.item?.cloudId || booking.item?.id,
        itemName: booking.itemName,
        image: booking.image,
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`,
        customerEmail: this.email.trim(),
        customerPhone: this.phone.trim(),
        basePrice: booking.basePrice,
        totalPrice: this.isRental() ? this.totalPrice() : booking.basePrice,
        currency: "TRY",
        startDate: this.isRental() ? this.startDate : booking.startDate,
        endDate: this.isRental() ? this.endDate : booking.endDate,
        days: this.isRental() ? this.totalDays() : undefined,
        withDriver: this.isRental() ? withDriver : undefined,
        pickupLocation: this.isRental() ? this.pickupLocation() : booking.pickupLocation,
        dropoffLocation: this.isRental() ? (this.dropoffLocation() || this.pickupLocation()) : undefined,
        rentalDuration: this.isRental() ? this.rentalDuration : undefined,
        notes: [this.notes.trim(), ...detailNotes].filter(Boolean).join("\n"),
        paymentMethod: this.isRental() ? this.paymentMethod() : "NONE",
        source: "WEB",
      });
      this.bookingReference.set(record.id);

      if (this.isRental() && this.paymentMethod() === "CARD") {
        const origin = window.location.origin;
        const payment = await this.paymentService.createCardSession({ bookingReference: record.id, amount: record.totalPrice || 0, currency: "TRY", method: "CARD", customer: { name: record.customerName, email: record.customerEmail || this.email.trim(), phone: record.customerPhone }, returnUrl: `${origin}/contact?payment=success&booking=${encodeURIComponent(record.id)}`, cancelUrl: `${origin}/contact?payment=cancel&booking=${encodeURIComponent(record.id)}`, description: record.itemName, metadata: { bookingType: record.type } });
        if (payment.ok && payment.checkoutUrl) { window.location.assign(payment.checkoutUrl); return; }
        this.successMessage.set("Rezervasyon talebiniz kaydedildi ancak ödeme oturumu başlatılamadı. Talebiniz kaybolmadı.");
        return;
      }

      this.successMessage.set(this.paymentMethod() === "EFT" && this.isRental() ? "Rezervasyon talebiniz ve EFT tercihiniz kaydedildi. Banka bilgileri onay sürecinde iletilecektir." : this.isRental() ? "Rezervasyon talebiniz kaydedildi. Ekibimiz uygunluğu doğruladıktan sonra sizinle iletişime geçecektir." : "Talebiniz kaydedildi. Ekibimiz sizinle iletişime geçecektir.");
    } catch (error) {
      console.error("Checkout submission failed.", error);
      const detail = error instanceof Error ? error.message : "";
      this.errorMessage.set(detail.includes("INVALID_RENTAL_VEHICLE") ? "Araç kaydı doğrulanamadı. Lütfen araç sayfasına dönüp tekrar deneyin." : "Talep kaydedilemedi. Bilgilerinizi kontrol edip tekrar deneyin.");
      this.toastService.show("Talep kaydedilemedi.", "error");
    } finally { this.isSubmitting.set(false); }
  }

  goBack(): void { if (window.history.length > 1) this.location.back(); else void this.router.navigate(["/"]); }
  finish(): void { this.carService.clearBookingRequest(); void this.router.navigate(["/"]); }

  private findRoute(fromValue: string, toValue: string) {
    const from = this.normalizeLocation(fromValue);
    const to = this.normalizeLocation(toValue);
    if (!from || !to || from === to) return undefined;
    const routes = this.carService.getConfig()().rentalRoutePricing || [];
    return routes.find((route) => {
      if (route.enabled === false || Number(route.distanceKm || 0) <= 0) return false;
      const routeFrom = this.normalizeLocation(route.from);
      const routeTo = this.normalizeLocation(route.to);
      return (routeFrom === from && routeTo === to) || (routeFrom === to && routeTo === from);
    });
  }

  private normalizeLocation(value: string): string { return String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR'); }

  private buildLocationChoices(branches: Branch[], serviceRuleKey: string): LocationChoice[] {
    const values: LocationChoice[] = [];
    for (const branch of branches) {
      const raw = branch.serviceRules?.[serviceRuleKey];
      const locations = Array.isArray(raw) ? raw.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 16) : [];
      if (locations.length) locations.forEach((label, index) => values.push({ key: `${branch.id}:${serviceRuleKey}:${index}`, label }));
      else values.push({ key: `${branch.id}:${serviceRuleKey}:main`, label: `${branch.name} · ${branch.district || branch.city}` });
    }
    return values.filter((item, index, list) => list.findIndex((other) => other.label === item.label) === index);
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
