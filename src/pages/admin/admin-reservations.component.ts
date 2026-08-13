import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { BookingStatus, NotificationDeliveryReport } from "../../models/booking.model";
import { TurkishCurrencyPipe } from "../../pipes/turkish-currency.pipe";
import { BookingService } from "../../services/booking.service";
import { ConfirmService } from "../../services/confirm.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-reservations",
  standalone: true,
  imports: [CommonModule, TurkishCurrencyPipe, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sticky top-0 z-20 flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-6 shadow-sm md:flex-row md:items-center md:justify-between md:px-8">
      <div class="flex items-center gap-4">
        <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ pageTitle() }}</h1>
          <p class="mt-1 text-xs font-medium text-slate-500">Firestore canlı kayıtları - {{ reservations().length }} toplam talep</p>
        </div>
      </div>

      <div class="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" aria-label="Durum filtresi">
        @for (option of filterOptions; track option.value) {
          <button
            type="button"
            (click)="filter.set(option.value)"
            [class.bg-white]="filter() === option.value"
            [class.text-slate-900]="filter() === option.value"
            [class.shadow-sm]="filter() === option.value"
            [class.text-slate-500]="filter() !== option.value"
            class="min-h-10 shrink-0 rounded-md px-3 py-2 text-xs font-bold transition-all hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {{ option.label }}
          </button>
        }
      </div>
    </div>

    <div class="min-h-[calc(100vh-10rem)] w-full bg-slate-50 p-4 md:p-8">
      @if (!bookingService.isAdminLoaded()) {
        <div role="status" class="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <mat-icon class="animate-spin text-blue-600">progress_activity</mat-icon>
          <p class="mt-3 font-bold text-slate-700">Rezervasyon kayıtları yükleniyor...</p>
        </div>
      } @else if (bookingService.lastAdminError()) {
        <div role="alert" class="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <div class="flex items-start gap-3">
            <mat-icon>error</mat-icon>
            <div>
              <h2 class="font-black">Rezervasyon verisine ulaşılamadı</h2>
              <p class="mt-1 text-sm">{{ bookingService.lastAdminError() }}</p>
            </div>
          </div>
        </div>
      } @else {
        <div class="relative z-10 mx-auto max-w-6xl divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          @for (res of filteredReservations(); track res.id) {
            <article class="flex flex-col">
              <button
                type="button"
                class="group flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 md:p-6"
                (click)="toggleDetail(res.id)"
                [attr.aria-expanded]="expandedId() === res.id"
              >
                <div class="flex min-w-0 items-center gap-4">
                  <div class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600 md:flex">
                    <mat-icon>receipt_long</mat-icon>
                  </div>
                  <div class="min-w-0">
                    <div class="mb-1 flex flex-wrap items-center gap-2">
                      <div class="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-blue-600 md:text-base">{{ res.customerName }}</div>
                      <span [class]="statusClass(res.status)" class="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {{ statusLabel(res.status) }}
                      </span>
                    </div>
                    <div class="truncate text-xs font-medium text-slate-500">
                      [{{ typeLabel(res.type) }}]
                      <span class="ml-1 font-bold text-slate-700">{{ res.itemName }}</span>
                    </div>
                    <div class="mt-1 text-[11px] text-slate-400">{{ res.id }} · {{ res.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
                  </div>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1">
                  @if ((res.totalPrice || res.basePrice || 0) > 0) {
                    <div class="font-black text-slate-900">{{ res.totalPrice || res.basePrice | turkishCurrency }}</div>
                  }
                  <mat-icon [class.rotate-180]="expandedId() === res.id" class="text-slate-400 transition-transform">expand_more</mat-icon>
                </div>
              </button>

              @if (expandedId() === res.id) {
                <div class="border-t border-slate-100 bg-slate-50 p-4 md:p-6">
                  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <section class="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Müşteri İletişim</h3>
                      <div class="space-y-2 text-sm">
                        <div class="flex items-start justify-between gap-3">
                          <span class="text-slate-500">Telefon</span>
                          @if (res.customerPhone) {
                            <a [href]="'tel:' + res.customerPhone" class="break-all text-right font-bold text-blue-600 hover:underline">{{ res.customerPhone }}</a>
                          } @else {
                            <span class="font-medium text-slate-400">Belirtilmedi</span>
                          }
                        </div>
                        <div class="flex items-start justify-between gap-3">
                          <span class="text-slate-500">E-posta</span>
                          @if (res.customerEmail) {
                            <a [href]="'mailto:' + res.customerEmail" class="break-all text-right font-bold text-blue-600 hover:underline">{{ res.customerEmail }}</a>
                          } @else {
                            <span class="font-medium text-slate-400">Belirtilmedi</span>
                          }
                        </div>
                        <div class="flex items-start justify-between gap-3">
                          <span class="text-slate-500">Kaynak</span>
                          <span class="font-bold text-slate-700">{{ res.source || 'WEB' }}</span>
                        </div>
                      </div>
                    </section>

                    <section class="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Talep Bilgileri</h3>
                      <dl class="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                        @if (res.startDate) {
                          <div><dt class="text-xs text-slate-500">Başlangıç</dt><dd class="font-medium text-slate-900">{{ res.startDate }}</dd></div>
                        }
                        @if (res.endDate) {
                          <div><dt class="text-xs text-slate-500">Bitiş</dt><dd class="font-medium text-slate-900">{{ res.endDate }}</dd></div>
                        }
                        @if (res.days) {
                          <div><dt class="text-xs text-slate-500">Süre</dt><dd class="font-bold text-slate-800">{{ res.days }} gün</dd></div>
                        }
                        @if (res.personCount) {
                          <div><dt class="text-xs text-slate-500">Kişi</dt><dd class="font-bold text-slate-800">{{ res.personCount }}</dd></div>
                        }
                        @if (res.withDriver) {
                          <div class="col-span-2"><dt class="text-xs text-slate-500">Şoför</dt><dd class="mt-1 inline-block rounded border border-blue-200 bg-blue-50 px-2 py-1 font-bold text-blue-600">Şoförlü hizmet</dd></div>
                        }
                        @if (res.pickupLocation) {
                          <div class="col-span-2"><dt class="text-xs text-slate-500">Alış / Buluşma</dt><dd class="font-medium text-slate-900">{{ res.pickupLocation }}</dd></div>
                        }
                        @if (res.dropoffLocation) {
                          <div class="col-span-2"><dt class="text-xs text-slate-500">Teslim</dt><dd class="font-medium text-slate-900">{{ res.dropoffLocation }}</dd></div>
                        }
                      </dl>
                    </section>

                    <section class="flex flex-col justify-between space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div>
                        <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Not ve Ödeme</h3>
                        <p class="whitespace-pre-line border-l-2 border-blue-500 pl-2 text-sm italic text-slate-600">{{ res.notes || 'Not bırakılmadı.' }}</p>
                      </div>
                      <div class="space-y-2 border-t border-slate-100 pt-3 text-sm">
                        <div class="flex justify-between gap-3"><span class="text-slate-500">Yöntem</span><span class="font-bold text-slate-800">{{ res.paymentMethod || 'NONE' }}</span></div>
                        <div class="flex justify-between gap-3"><span class="text-slate-500">Durum</span><span class="font-bold text-slate-800">{{ res.paymentStatus || 'NOT_REQUIRED' }}</span></div>
                        @if ((res.totalPrice || res.basePrice || 0) > 0) {
                          <div class="flex items-end justify-between border-t border-slate-100 pt-2"><span class="text-xs font-bold uppercase text-slate-400">Tutar</span><span class="text-lg font-black text-slate-900">{{ res.totalPrice || res.basePrice | turkishCurrency }}</span></div>
                        }
                      </div>
                    </section>
                  </div>

                  @if (res.notification) {
                    <div class="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Son Bildirim Sonucu</h3>
                      <div class="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div class="rounded-lg bg-slate-50 p-3"><span class="text-slate-500">Müşteri E-posta</span><strong class="ml-2 text-slate-800">{{ res.notification.email.state }}</strong></div>
                        <div class="rounded-lg bg-slate-50 p-3"><span class="text-slate-500">SMS</span><strong class="ml-2 text-slate-800">{{ res.notification.sms.state }}</strong></div>
                        <div class="rounded-lg bg-slate-50 p-3"><span class="text-slate-500">Admin E-posta</span><strong class="ml-2 text-slate-800">{{ res.notification.adminEmail?.state || 'skipped' }}</strong></div>
                      </div>
                    </div>
                  }

                  <div class="mt-6 flex flex-wrap gap-3">
                    @if (res.status !== 'APPROVED') {
                      <button type="button" (click)="updateStatus(res.id, 'APPROVED', $event)" [disabled]="updatingId() === res.id" class="flex min-h-11 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                        <mat-icon>check</mat-icon> Onayla
                      </button>
                    }
                    @if (res.status !== 'REJECTED') {
                      <button type="button" (click)="updateStatus(res.id, 'REJECTED', $event)" [disabled]="updatingId() === res.id" class="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                        <mat-icon>close</mat-icon> Reddet
                      </button>
                    }
                    @if (res.status === 'APPROVED') {
                      <button type="button" (click)="updateStatus(res.id, 'COMPLETED', $event)" [disabled]="updatingId() === res.id" class="flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
                        <mat-icon>task_alt</mat-icon> Tamamlandı
                      </button>
                    }
                    @if (res.status !== 'PENDING') {
                      <button type="button" (click)="updateStatus(res.id, 'PENDING', $event)" [disabled]="updatingId() === res.id" class="flex min-h-11 items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50">
                        <mat-icon>undo</mat-icon> Beklemeye Al
                      </button>
                    }
                    @if (res.status !== 'CANCELLED' && res.status !== 'COMPLETED') {
                      <button type="button" (click)="updateStatus(res.id, 'CANCELLED', $event)" [disabled]="updatingId() === res.id" class="flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50">
                        <mat-icon>event_busy</mat-icon> İptal Et
                      </button>
                    }
                    <button type="button" (click)="deleteReservation(res.id, $event)" [disabled]="updatingId() === res.id" class="ml-auto flex min-h-11 items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-900 disabled:opacity-50">
                      <mat-icon>delete</mat-icon> Sil
                    </button>
                  </div>
                </div>
              }
            </article>
          } @empty {
            <div class="p-16 text-center text-slate-500">
              <mat-icon class="mx-auto mb-4 block !h-12 !w-12 !text-[48px] text-slate-300">inbox</mat-icon>
              <p class="font-bold">Bu kriterde rezervasyon veya talep bulunmuyor.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminReservationsComponent implements OnInit, OnDestroy {
  readonly bookingService = inject(BookingService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly reservations = this.bookingService.records;
  readonly filter = signal<"ALL" | BookingStatus>("ALL");
  readonly typeFilter = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);
  readonly updatingId = signal<string | null>(null);

  readonly filterOptions: Array<{ value: "ALL" | BookingStatus; label: string }> = [
    { value: "ALL", label: "Tümü" },
    { value: "PENDING", label: "Bekleyen" },
    { value: "APPROVED", label: "Onaylı" },
    { value: "REJECTED", label: "Reddedilen" },
    { value: "COMPLETED", label: "Tamamlanan" },
    { value: "CANCELLED", label: "İptal" },
  ];

  readonly filteredReservations = computed(() => {
    let current = this.reservations();
    if (this.typeFilter()) {
      current = current.filter((record) => record.type === this.typeFilter());
    }
    if (this.filter() !== "ALL") {
      current = current.filter((record) => record.status === this.filter());
    }
    return current;
  });

  ngOnInit(): void {
    this.bookingService.startAdminListener();
    this.route.queryParams.subscribe((params) => {
      this.typeFilter.set(params["type"] || null);
    });
  }

  ngOnDestroy(): void {
    this.bookingService.stopAdminListener();
  }

  pageTitle(): string {
    switch (this.typeFilter()) {
      case "RENTAL":
        return "Araç Kiralama Talepleri";
      case "TOUR":
        return "Tur Talepleri";
      case "SALE_INQUIRY":
        return "Satın Alma Talepleri";
      case "APPOINTMENT":
        return "Randevu Talepleri";
      default:
        return "Rezervasyon Yönetimi";
    }
  }

  typeLabel(type: string): string {
    switch (type) {
      case "RENTAL":
        return "Araç Kiralama";
      case "TOUR":
        return "Tur";
      case "SALE_INQUIRY":
        return "Araç Satın Alma";
      case "APPOINTMENT":
        return "Randevu";
      default:
        return type;
    }
  }

  statusLabel(status: BookingStatus): string {
    switch (status) {
      case "APPROVED":
        return "Onaylandı";
      case "REJECTED":
        return "Reddedildi";
      case "COMPLETED":
        return "Tamamlandı";
      case "CANCELLED":
        return "İptal";
      default:
        return "Bekliyor";
    }
  }

  statusClass(status: BookingStatus): string {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-slate-200 text-slate-800";
      case "CANCELLED":
        return "bg-amber-100 text-amber-900";
      default:
        return "bg-blue-100 text-blue-800";
    }
  }

  goBack(): void {
    void this.router.navigate(["/admin/dashboard"]);
  }

  toggleDetail(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    event?: Event,
  ): Promise<void> {
    event?.stopPropagation();
    if (this.updatingId()) return;

    if (status === "REJECTED" || status === "CANCELLED") {
      const confirmed = await this.confirmService.confirm({
        title: status === "REJECTED" ? "Talebi Reddet" : "Talebi İptal Et",
        message:
          status === "REJECTED"
            ? "Bu talebi reddetmek istediğinize emin misiniz? Durum kaydedilecek ve yapılandırılmış bildirim kanallarından müşteriye bilgi verilecektir."
            : "Bu talebi iptal etmek istediğinize emin misiniz? Durum kalıcı olarak Firestore'a yazılacaktır.",
      });
      if (!confirmed) return;
    }

    this.updatingId.set(id);
    try {
      const delivery = await this.bookingService.updateStatus(id, status);
      this.showDeliveryResult(status, delivery);
    } catch (error) {
      console.error("Booking status update failed.", error);
      this.toastService.show(
        "Durum güncellenemedi. Firestore kaydı değiştirilmedi.",
        "error",
      );
    } finally {
      this.updatingId.set(null);
    }
  }

  async deleteReservation(id: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.updatingId()) return;
    const confirmed = await this.confirmService.confirm({
      title: "Kaydı Sil",
      message:
        "Bu rezervasyon kaydını Firestore'dan tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz. Operasyon geçmişini korumak istiyorsanız silmek yerine İptal Et seçeneğini kullanın.",
    });
    if (!confirmed) return;

    this.updatingId.set(id);
    try {
      await this.bookingService.delete(id);
      this.expandedId.set(null);
      this.toastService.show("Rezervasyon kaydı Firestore'dan silindi.", "info");
    } catch (error) {
      console.error("Booking delete failed.", error);
      this.toastService.show("Rezervasyon kaydı silinemedi.", "error");
    } finally {
      this.updatingId.set(null);
    }
  }

  private showDeliveryResult(
    status: BookingStatus,
    delivery: NotificationDeliveryReport,
  ): void {
    const statusText = this.statusLabel(status);
    const customerEmailSent = delivery.email.state === "sent";
    const smsSent = delivery.sms.state === "sent";
    const anyFailed =
      delivery.email.state === "failed" || delivery.sms.state === "failed";
    const anyNotConfigured =
      delivery.email.state === "not_configured" ||
      delivery.sms.state === "not_configured";

    if (customerEmailSent && smsSent) {
      this.toastService.show(
        `${statusText}. Müşteri e-postası ve SMS gönderildi.`,
        "success",
      );
      return;
    }
    if (customerEmailSent || smsSent) {
      this.toastService.show(
        `${statusText}. Durum Firestore'a kaydedildi. ${customerEmailSent ? "E-posta gönderildi" : "SMS gönderildi"}; diğer kanal tamamlanmadı.`,
        "info",
      );
      return;
    }
    if (anyNotConfigured) {
      this.toastService.show(
        `${statusText}. Durum kaydedildi ancak müşteri bildirim sağlayıcıları henüz yapılandırılmamış.`,
        "info",
      );
      return;
    }
    if (anyFailed) {
      this.toastService.show(
        `${statusText}. Durum kaydedildi ancak müşteri bildirimi gönderilemedi. Kayıt kaybolmadı.`,
        "error",
      );
      return;
    }
    this.toastService.show(`${statusText}. Durum Firestore'a kaydedildi.`, "success");
  }
}
