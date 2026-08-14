import { CommonModule, Location } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { NotificationDeliveryReport } from "../models/booking.model";
import { BookingService } from "../services/booking.service";
import { ToastService } from "../services/toast.service";

@Component({
  selector: "app-appointment",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen overflow-x-hidden bg-slate-950 pb-20 font-sans text-slate-300">
      <div class="sticky top-[72px] z-40 border-b border-slate-800 bg-slate-900 shadow-lg md:top-[96px]">
        <div class="mx-auto max-w-7xl px-4">
          <div class="flex min-h-16 items-center gap-2 py-2 sm:gap-3">
            <button type="button" (click)="goBack()" class="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Geri Dön">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">Randevu Talebi</h1>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <div class="mb-10 text-center">
          <h1 class="mb-4 text-balance font-serif text-3xl font-bold leading-tight text-slate-100 sm:text-4xl">Randevu Talep Et</h1>
          <p class="text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
            Araç kiralama, satın alma, VIP tur veya diğer hizmetlerimiz için talebinizi oluşturun. Kayıt sonrası size referans numarası verilir.
          </p>
        </div>

        <div class="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div class="p-4 sm:p-8">
            @if (submitSuccess()) {
              <div class="rounded-xl bg-emerald-50 p-8 text-center text-emerald-900" role="status">
                <mat-icon class="mb-4 !h-12 !w-12 !text-[48px] text-emerald-500">check_circle</mat-icon>
                <h2 class="text-2xl font-bold">Randevu Talebiniz Kaydedildi</h2>
                <p class="mt-3 text-base leading-relaxed">Talebiniz başarıyla kaydedildi. Kesin randevu onayı ayrıca bildirilecektir.</p>
                <div class="mx-auto mt-5 max-w-md rounded-xl border border-emerald-200 bg-white p-4 text-left">
                  <div class="text-xs font-bold uppercase tracking-wider text-slate-500">Referans Numarası</div>
                  <div class="mt-1 break-all font-mono text-sm font-black text-slate-900">{{ bookingReference() }}</div>
                  <div class="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Bildirim Durumu</div>
                  <p class="mt-1 text-sm font-medium text-slate-700">{{ deliveryMessage() }}</p>
                </div>
                <button type="button" (click)="goHome()" class="mt-8 min-h-12 rounded-xl bg-slate-900 px-8 py-3 font-bold text-white transition-colors hover:bg-blue-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Ana Sayfaya Dön</button>
              </div>
            } @else {
              <form [formGroup]="appointmentForm" (ngSubmit)="onSubmit()" class="space-y-6">
                <div class="space-y-3">
                  <label class="block text-sm font-bold uppercase tracking-wider text-slate-700">Randevu Konusu *</label>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    @for (topic of topics; track topic.id) {
                      <label class="relative cursor-pointer">
                        <input type="radio" formControlName="topic" [value]="topic.id" class="peer sr-only" />
                        <div class="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 p-4 text-center transition-all hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50">
                          <mat-icon class="text-slate-400">{{ topic.icon }}</mat-icon>
                          <span class="font-bold text-slate-700">{{ topic.label }}</span>
                        </div>
                      </label>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">Ad Soyad *</span>
                    <input type="text" autocomplete="name" formControlName="name" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="Adınız Soyadınız" />
                  </label>
                  <label class="block">
                    <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">Telefon *</span>
                    <input type="tel" inputmode="tel" autocomplete="tel" formControlName="phone" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="05XX XXX XX XX" />
                  </label>
                  <label class="block md:col-span-2">
                    <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">E-posta *</span>
                    <input type="email" inputmode="email" autocomplete="email" formControlName="email" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="ornek@email.com" />
                    <span class="mt-1 block text-xs text-slate-500">Randevu kaydı ve durum değişiklikleri bu adrese gönderilir.</span>
                  </label>
                </div>

                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <label class="block">
                    <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">Tarih *</span>
                    <input type="date" [min]="minDate" formControlName="date" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label class="block">
                    <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">Saat *</span>
                    <input type="time" formControlName="time" class="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
                  </label>
                </div>

                <label class="block">
                  <span class="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-700">Mesajınız / Notunuz</span>
                  <textarea formControlName="message" rows="4" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="Eklemek istediğiniz detaylar..."></textarea>
                </label>

                @if (hasFormErrors()) {
                  <div role="alert" aria-live="assertive" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">Lütfen ad-soyad, telefon, e-posta, konu, tarih ve saat alanlarını geçerli biçimde doldurun.</div>
                }

                <button type="submit" [disabled]="isSubmitting()" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-4 font-bold uppercase tracking-wider text-white shadow-xl transition-colors hover:bg-blue-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-8">
                  @if (isSubmitting()) {
                    <mat-icon class="animate-spin">progress_activity</mat-icon>
                    Kaydediliyor...
                  } @else {
                    <mat-icon>event_available</mat-icon>
                    Randevu Talebini Gönder
                  }
                </button>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AppointmentComponent {
  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly isSubmitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly hasFormErrors = signal(false);
  readonly bookingReference = signal("");
  readonly deliveryMessage = signal("");
  readonly minDate = new Date().toISOString().slice(0, 10);

  readonly topics = [
    { id: "rent", label: "Araç Kiralama", icon: "car_rental" },
    { id: "buy", label: "Araç Satın Alma", icon: "directions_car" },
    { id: "sell", label: "Aracımı Satmak/Kiralamak İstiyorum", icon: "sell" },
    { id: "tour", label: "VIP Tur / Transfer", icon: "flight_takeoff" },
    { id: "other", label: "Diğer", icon: "more_horiz" },
  ];

  readonly appointmentForm = this.fb.nonNullable.group({
    topic: ["rent", Validators.required],
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ["", [Validators.required, Validators.pattern(/^[+0-9()\s-]{7,24}$/)]],
    email: ["", [Validators.required, Validators.email, Validators.maxLength(160)]],
    date: ["", Validators.required],
    time: ["", Validators.required],
    message: ["", Validators.maxLength(1000)],
  });

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }

  goHome(): void {
    void this.router.navigate(["/"]);
  }

  async onSubmit(): Promise<void> {
    this.hasFormErrors.set(!this.appointmentForm.valid);
    if (!this.appointmentForm.valid || this.isSubmitting()) {
      this.appointmentForm.markAllAsTouched();
      if (!this.appointmentForm.valid) this.toastService.show("Lütfen zorunlu alanları kontrol edin.", "error");
      return;
    }

    this.isSubmitting.set(true);
    const value = this.appointmentForm.getRawValue();
    const topicLabel = this.topics.find((topic) => topic.id === value.topic)?.label || "Randevu";
    const appointmentDateTime = `${value.date}T${value.time}`;

    try {
      const record = await this.bookingService.create({
        type: "APPOINTMENT",
        itemName: `Randevu: ${topicLabel}`,
        customerName: value.name.trim(),
        customerPhone: value.phone.trim(),
        customerEmail: value.email.trim(),
        startDate: appointmentDateTime,
        endDate: appointmentDateTime,
        totalPrice: 0,
        currency: "TRY",
        notes: [`Saat: ${value.time}`, value.message.trim() ? `Mesaj: ${value.message.trim()}` : ""].filter(Boolean).join("\n"),
        paymentMethod: "NONE",
        source: "WEB",
      });

      this.bookingReference.set(record.id);
      this.deliveryMessage.set(this.describeDelivery(record.notification));
      this.hasFormErrors.set(false);
      this.submitSuccess.set(true);
      this.toastService.show("Randevu talebiniz kaydedildi.", "success");
    } catch (error) {
      console.error("Appointment submission failed.", error);
      this.toastService.show("Randevu talebi kaydedilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.", "error");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private describeDelivery(delivery: NotificationDeliveryReport | undefined): string {
    if (!delivery) return "Bildirim sonucu alınamadı. Rezervasyon kaydı korunmaktadır.";
    const emailSent = delivery.email.state === "sent";
    const smsSent = delivery.sms.state === "sent";
    if (emailSent && smsSent) return "Onay e-postası ve SMS gönderildi.";
    if (emailSent) return "E-posta gönderildi. SMS kanalı henüz tamamlanmadı.";
    if (smsSent) return "SMS gönderildi. E-posta kanalı henüz tamamlanmadı.";
    if (delivery.email.state === "not_configured" || delivery.sms.state === "not_configured") return "Talebiniz kaydedildi. Bildirim sağlayıcılarından en az biri henüz yapılandırılmamış.";
    return "Talebiniz kaydedildi ancak otomatik bildirim gönderimi tamamlanamadı. Kaydınız kaybolmadı.";
  }
}
