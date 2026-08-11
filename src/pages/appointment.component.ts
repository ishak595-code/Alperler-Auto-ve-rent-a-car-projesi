import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { ToastService } from "../services/toast.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-appointment",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">
              Randevu Talebi
            </h1>
          </div>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div class="text-center mb-10">
          <h1 class="text-4xl font-serif font-bold text-slate-100 mb-4">
            Randevu Talep Et
          </h1>
          <p class="text-slate-400 text-lg">
            Araç kiralama, satın alma, VIP tur veya diğer hizmetlerimiz için
            hemen randevu oluşturun.
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="p-8">
            @if (submitSuccess()) {
              <div
                class="bg-emerald-50 text-emerald-800 p-8 rounded-xl text-center"
              >
                <mat-icon
                  class="text-emerald-500 mb-4"
                  style="transform: scale(2.5);"
                  >check_circle</mat-icon
                >
                <h3 class="text-2xl font-bold mb-3">Talebiniz Alındı!</h3>
                <p class="text-lg">
                  Randevu talebiniz başarıyla bize ulaştı. Müşteri temsilcimiz
                  en kısa sürede sizinle iletişime geçecektir.
                </p>
                <button
                  (click)="goHome()"
                  class="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-500 hover:text-slate-900 transition-colors"
                >
                  Geri Dön
                </button>
              </div>
            } @else {
              <form
                [formGroup]="appointmentForm"
                (ngSubmit)="onSubmit()"
                class="space-y-6"
              >
                <!-- Konu Seçimi -->
                <div class="space-y-3">
                  <label
                    class="block text-sm font-bold text-slate-700 uppercase tracking-wider"
                    >Randevu Konusu *</label
                  >
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    @for (topic of topics; track topic.id) {
                      <label class="relative cursor-pointer">
                        <input
                          type="radio"
                          formControlName="topic"
                          [value]="topic.id"
                          class="peer sr-only"
                        />
                        <div
                          class="p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                          <mat-icon
                            class="text-slate-400 peer-checked:text-blue-500"
                            >{{ topic.icon }}</mat-icon
                          >
                          <span
                            class="font-bold text-slate-700 peer-checked:text-blue-700"
                            >{{ topic.label }}</span
                          >
                        </div>
                      </label>
                    }
                  </div>
                </div>

                <!-- Kişisel Bilgiler -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label
                      class="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2"
                      >Ad Soyad *</label
                    >
                    <input
                      type="text"
                      formControlName="name"
                      class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="Adınız Soyadınız"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2"
                      >Telefon *</label
                    >
                    <input
                      type="tel"
                      formControlName="phone"
                      class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                </div>

                <!-- Tarih ve Saat -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      class="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2"
                      >Tarih *</label
                    >
                    <input
                      type="date"
                      formControlName="date"
                      class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2"
                      >Saat *</label
                    >
                    <input
                      type="time"
                      formControlName="time"
                      class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                </div>

                <!-- Mesaj -->
                <div>
                  <label
                    class="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2"
                    >Mesajınız / Notunuz</label
                  >
                  <textarea
                    formControlName="message"
                    rows="4"
                    class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    placeholder="Eklemek istediğiniz detaylar..."
                  ></textarea>
                </div>

                <div class="pt-6">
                  <button
                    type="submit"
                    [disabled]="!appointmentForm.valid || isSubmitting()"
                    class="w-full flex justify-center items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-blue-500 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                  >
                    @if (isSubmitting()) {
                      <mat-icon class="animate-spin">refresh</mat-icon>
                      Gönderiliyor...
                    } @else {
                      <mat-icon>event_available</mat-icon>
                      Randevu Talebini Gönder
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AppointmentComponent {
  private fb = inject(FormBuilder);
  private carService = inject(CarService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isSubmitting = signal(false);
  submitSuccess = signal(false);

  topics = [
    { id: "rent", label: "Araç Kiralama", icon: "car_rental" },
    { id: "buy", label: "Araç Satın Alma", icon: "directions_car" },
    { id: "sell", label: "Aracımı Satmak/Kiralamak İstiyorum", icon: "sell" },
    { id: "tour", label: "VIP Tur / Transfer", icon: "flight_takeoff" },
    { id: "other", label: "Diğer", icon: "more_horiz" },
  ];

  appointmentForm = this.fb.group({
    topic: ["rent", Validators.required],
    name: ["", Validators.required],
    phone: ["", Validators.required],
    date: ["", Validators.required],
    time: ["", Validators.required],
    message: [""],
  });

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  goHome() {
    this.router.navigate(["/"]);
  }

  onSubmit() {
    if (this.appointmentForm.valid) {
      this.isSubmitting.set(true);

      const formValue = this.appointmentForm.value;
      const topicLabel =
        this.topics.find((t) => t.id === formValue.topic)?.label || "Randevu";

      // We will save this as a special type of reservation/request in the admin panel
      const newRequest = {
        id: Date.now().toString(),
        customerName: formValue.name ?? undefined,
        customerPhone: formValue.phone ?? undefined,
        customerEmail: "",
        item: null,
        itemName: `Randevu Talebi: ${topicLabel}`,
        startDate: formValue.date ?? undefined,
        endDate: formValue.date ?? undefined,
        totalPrice: 0,
        status: "PENDING" as const,
        dateCreated: new Date(),
        type: "TOUR" as any, // Mismatch workaround while type doesn't have APPOINTMENT
        notes: `Saat: ${formValue.time}\nMesaj: ${formValue.message || "Belirtilmedi"}`,
      };

      // Simulate API call
      setTimeout(() => {
        this.carService.addReservation(newRequest);
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.toastService.show(
          "Randevu talebiniz başarıyla gönderildi.",
          "success",
        );
      }, 1500);
    } else {
      this.toastService.show("Lütfen zorunlu alanları doldurunuz.", "error");
      this.appointmentForm.markAllAsTouched();
    }
  }
}
