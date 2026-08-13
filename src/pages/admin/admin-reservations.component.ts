import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import {
  BookingStatus,
  NotificationDeliveryReport,
} from "../../models/booking.model";
import { TurkishCurrencyPipe } from "../../pipes/turkish-currency.pipe";
import { BookingService } from "../../services/booking.service";
import { ConfirmService } from "../../services/confirm.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-reservations",
  standalone: true,
  imports: [CommonModule, MatIconModule, TurkishCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-900">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div class="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Kontrol paneline dön">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="min-w-0">
                <h1 class="truncate text-xl font-black tracking-tight sm:text-2xl">{{ pageTitle() }}</h1>
                <p class="mt-1 text-xs font-semibold text-slate-500">Canlı operasyon kayıtları · {{ reservations().length }} toplam talep</p>
              </div>
            </div>

            <div class="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Durum filtresi">
              @for (option of filterOptions; track option.value) {
                <button type="button" (click)="filter.set(option.value)" [attr.aria-pressed]="filter() === option.value" [class.bg-white]="filter() === option.value" [class.text-slate-950]="filter() === option.value" [class.shadow-sm]="filter() === option.value" class="min-h-10 shrink-0 rounded-lg px-3 text-xs font-black text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {{ option.label }}
                </button>
              }
            </div>
          </div>
        </div>
      </header>

      <section class="mx-auto max-w-7xl p-4 md:p-8">
        @if (!bookingService.isAdminLoaded()) {
          <div role="status" class="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <mat-icon class="animate-spin text-blue-600">progress_activity</mat-icon>
            <h2 class="mt-3 font-black text-slate-800">Kayıtlar yükleniyor</h2>
            <p class="mt-1 text-sm text-slate-500">Veri servisi ve yönetici erişimi kontrol ediliyor.</p>
          </div>
        } @else if (bookingService.lastAdminError()) {
          <div role="alert" class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3">
                <mat-icon class="mt-0.5">cloud_off</mat-icon>
                <div>
                  <h2 class="font-black">Rezervasyon verisine ulaşılamadı</h2>
                  <p class="mt-1 max-w-2xl text-sm leading-relaxed">Kalıcı veri servisi henüz bağlı olmayabilir veya yönetici erişimi doğrulanamamış olabilir. Bu ekranda sahte kayıt gösterilmiyor.</p>
                </div>
              </div>
              <button type="button" (click)="retryConnection()" class="min-h-11 shrink-0 rounded-xl bg-amber-950 px-4 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">Tekrar Dene</button>
            </div>
          </div>
        } @else if (filteredReservations().length === 0) {
          <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <mat-icon class="!h-12 !w-12 !text-[48px] text-slate-300">inbox</mat-icon>
            <h2 class="mt-3 font-black text-slate-800">Bu kriterde kayıt yok</h2>
            <p class="mt-1 text-sm">Farklı bir durum filtresi seçebilirsiniz.</p>
          </div>
        } @else {
          <div class="grid gap-4">
            @for (res of filteredReservations(); track res.id) {
              <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button type="button" (click)="toggleDetail(res.id)" [attr.aria-expanded]="expandedId() === res.id" class="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-5">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="truncate font-black text-slate-950">{{ res.customerName }}</h2>
                      <span [class]="statusClass(res.status)" class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">{{ statusLabel(res.status) }}</span>
                    </div>
                    <p class="mt-1 truncate text-sm text-slate-600"><strong>{{ typeLabel(res.type) }}</strong> · {{ res.itemName }}</p>
                    <p class="mt-1 text-[11px] font-semibold text-slate-400">{{ res.id }} · {{ res.createdAt | date:'dd.MM.yyyy HH:mm' }}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-3">
                    @if ((res.totalPrice || res.basePrice || 0) > 0) {
                      <strong class="hidden text-sm font-black text-slate-950 sm:block">{{ res.totalPrice || res.basePrice | turkishCurrency }}</strong>
                    }
                    <mat-icon [class.rotate-180]="expandedId() === res.id" class="text-slate-400 transition-transform">expand_more</mat-icon>
                  </div>
                </button>

                @if (expandedId() === res.id) {
                  <div class="border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                    <div class="grid gap-4 lg:grid-cols-3">
                      <section class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Müşteri</h3>
                        <dl class="mt-3 space-y-3 text-sm">
                          <div class="flex items-start justify-between gap-3"><dt class="text-slate-500">Telefon</dt><dd class="break-all text-right font-bold">@if (res.customerPhone) {<a [href]="'tel:' + res.customerPhone" class="text-blue-700">{{ res.customerPhone }}</a>} @else {-}</dd></div>
                          <div class="flex items-start justify-between gap-3"><dt class="text-slate-500">E-posta</dt><dd class="break-all text-right font-bold">@if (res.customerEmail) {<a [href]="'mailto:' + res.customerEmail" class="text-blue-700">{{ res.customerEmail }}</a>} @else {-}</dd></div>
                          <div class="flex items-start justify-between gap-3"><dt class="text-slate-500">Kaynak</dt><dd class="font-bold">{{ res.source || 'WEB' }}</dd></div>
                        </dl>
                      </section>

                      <section class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Talep Detayı</h3>
                        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
                          @if (res.startDate) {<div><dt class="text-xs text-slate-500">Başlangıç</dt><dd class="mt-1 break-words font-bold">{{ res.startDate }}</dd></div>}
                          @if (res.endDate) {<div><dt class="text-xs text-slate-500">Bitiş</dt><dd class="mt-1 break-words font-bold">{{ res.endDate }}</dd></div>}
                          @if (res.days) {<div><dt class="text-xs text-slate-500">Süre</dt><dd class="mt-1 font-bold">{{ res.days }} gün</dd></div>}
                          @if (res.personCount) {<div><dt class="text-xs text-slate-500">Kişi</dt><dd class="mt-1 font-bold">{{ res.personCount }}</dd></div>}
                          @if (res.pickupLocation) {<div class="col-span-2"><dt class="text-xs text-slate-500">Alış / Buluşma</dt><dd class="mt-1 font-bold">{{ res.pickupLocation }}</dd></div>}
                          @if (res.withDriver) {<div class="col-span-2"><span class="inline-flex rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-800">Şoförlü hizmet</span></div>}
                        </dl>
                      </section>

                      <section class="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Ödeme ve Not</h3>
                        <p class="mt-3 whitespace-pre-line border-l-2 border-blue-500 pl-3 text-sm text-slate-600">{{ res.notes || 'Not bırakılmadı.' }}</p>
                        <dl class="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                          <div class="flex justify-between gap-3"><dt class="text-slate-500">Yöntem</dt><dd class="font-bold">{{ res.paymentMethod || 'NONE' }}</dd></div>
                          <div class="flex justify-between gap-3"><dt class="text-slate-500">Durum</dt><dd class="font-bold">{{ res.paymentStatus || 'NOT_REQUIRED' }}</dd></div>
                          @if ((res.totalPrice || res.basePrice || 0) > 0) {<div class="flex items-end justify-between border-t border-slate-100 pt-2"><dt class="text-xs font-black uppercase text-slate-400">Tutar</dt><dd class="text-lg font-black">{{ res.totalPrice || res.basePrice | turkishCurrency }}</dd></div>}
                        </dl>
                      </section>
                    </div>

                    @if (res.notification) {
                      <section class="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <h3 class="text-xs font-black uppercase tracking-wider text-slate-400">Son Bildirim Sonucu</h3>
                        <div class="mt-3 grid gap-2 sm:grid-cols-3">
                          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">E-posta</span><strong class="ml-2">{{ res.notification.email.state }}</strong></div>
                          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">SMS</span><strong class="ml-2">{{ res.notification.sms.state }}</strong></div>
                          <div class="rounded-lg bg-slate-50 p-3 text-sm"><span class="text-slate-500">Yönetici</span><strong class="ml-2">{{ res.notification.adminEmail?.state || 'skipped' }}</strong></div>
                        </div>
                      </section>
                    }

                    <div class="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      @if (res.status !== 'APPROVED') {<button type="button" (click)="updateStatus(res.id, 'APPROVED', $event)" [disabled]="updatingId() === res.id" class="action bg-emerald-600 text-white"><mat-icon>check</mat-icon>Onayla</button>}
                      @if (res.status !== 'REJECTED') {<button type="button" (click)="updateStatus(res.id, 'REJECTED', $event)" [disabled]="updatingId() === res.id" class="action bg-rose-600 text-white"><mat-icon>close</mat-icon>Reddet</button>}
                      @if (res.status === 'APPROVED') {<button type="button" (click)="updateStatus(res.id, 'COMPLETED', $event)" [disabled]="updatingId() === res.id" class="action bg-slate-900 text-white"><mat-icon>task_alt</mat-icon>Tamamla</button>}
                      @if (res.status !== 'PENDING') {<button type="button" (click)="updateStatus(res.id, 'PENDING', $event)" [disabled]="updatingId() === res.id" class="action bg-slate-200 text-slate-800"><mat-icon>undo</mat-icon>Beklemeye Al</button>}
                      @if (res.status !== 'CANCELLED' && res.status !== 'COMPLETED') {<button type="button" (click)="updateStatus(res.id, 'CANCELLED', $event)" [disabled]="updatingId() === res.id" class="action border border-amber-300 bg-amber-50 text-amber-900"><mat-icon>event_busy</mat-icon>İptal</button>}
                      <button type="button" (click)="deleteReservation(res.id, $event)" [disabled]="updatingId() === res.id" class="action bg-slate-800 text-white sm:ml-auto"><mat-icon>delete</mat-icon>Sil</button>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    .action{display:flex;min-height:44px;align-items:center;justify-content:center;gap:.4rem;border-radius:.75rem;padding:.55rem .85rem;font-size:.8rem;font-weight:900;transition:filter .15s ease,opacity .15s ease}.action:hover{filter:brightness(.95)}.action:disabled{cursor:not-allowed;opacity:.45}.action:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}
  `],
})
export class AdminReservationsComponent implements OnInit, OnDestroy {
  readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

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
    if (this.typeFilter()) current = current.filter((record) => record.type === this.typeFilter());
    if (this.filter() !== "ALL") current = current.filter((record) => record.status === this.filter());
    return current;
  });

  ngOnInit(): void {
    this.bookingService.startAdminListener();
    this.route.queryParams.subscribe((params) => this.typeFilter.set(params["type"] || null));
  }

  ngOnDestroy(): void {
    this.bookingService.stopAdminListener();
  }

  retryConnection(): void {
    this.bookingService.stopAdminListener();
    this.bookingService.startAdminListener();
  }

  pageTitle(): string {
    switch (this.typeFilter()) {
      case "RENTAL": return "Araç Kiralama Talepleri";
      case "TOUR": return "Tur Talepleri";
      case "SALE_INQUIRY": return "Satın Alma Talepleri";
      case "APPOINTMENT": return "Randevu Talepleri";
      default: return "Rezervasyon Yönetimi";
    }
  }

  typeLabel(type: string): string {
    switch (type) {
      case "RENTAL": return "Araç Kiralama";
      case "TOUR": return "Tur";
      case "SALE_INQUIRY": return "Araç Satın Alma";
      case "APPOINTMENT": return "Randevu";
      default: return type;
    }
  }

  statusLabel(status: BookingStatus): string {
    switch (status) {
      case "APPROVED": return "Onaylandı";
      case "REJECTED": return "Reddedildi";
      case "COMPLETED": return "Tamamlandı";
      case "CANCELLED": return "İptal";
      default: return "Bekliyor";
    }
  }

  statusClass(status: BookingStatus): string {
    switch (status) {
      case "APPROVED": return "bg-emerald-100 text-emerald-900";
      case "REJECTED": return "bg-rose-100 text-rose-900";
      case "COMPLETED": return "bg-slate-200 text-slate-900";
      case "CANCELLED": return "bg-amber-100 text-amber-950";
      default: return "bg-blue-100 text-blue-900";
    }
  }

  goBack(): void {
    void this.router.navigate(["/admin/dashboard"]);
  }

  toggleDetail(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  async updateStatus(id: string, status: BookingStatus, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.updatingId()) return;

    if (status === "REJECTED" || status === "CANCELLED") {
      const confirmed = await this.confirmService.confirm({
        title: status === "REJECTED" ? "Talebi Reddet" : "Talebi İptal Et",
        message: status === "REJECTED"
          ? "Bu talebi reddetmek istediğinize emin misiniz? Durum kalıcı veri kaynağına kaydedilecek ve yapılandırılmış bildirim kanalları kullanılacaktır."
          : "Bu talebi iptal etmek istediğinize emin misiniz? Durum kalıcı veri kaynağına kaydedilecektir.",
      });
      if (!confirmed) return;
    }

    this.updatingId.set(id);
    try {
      const delivery = await this.bookingService.updateStatus(id, status);
      this.showDeliveryResult(status, delivery);
    } catch (error) {
      console.error("Booking status update failed.", error);
      this.toastService.show("Durum güncellenemedi. Mevcut kayıt değiştirilmedi.", "error");
    } finally {
      this.updatingId.set(null);
    }
  }

  async deleteReservation(id: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (this.updatingId()) return;
    const confirmed = await this.confirmService.confirm({
      title: "Kaydı Kalıcı Olarak Sil",
      message: "Bu talebi kalıcı veri kaynağından tamamen silmek istediğinize emin misiniz? Operasyon geçmişini korumak istiyorsanız silmek yerine İptal seçeneğini kullanın.",
    });
    if (!confirmed) return;

    this.updatingId.set(id);
    try {
      await this.bookingService.delete(id);
      this.expandedId.set(null);
      this.toastService.show("Rezervasyon kaydı silindi.", "info");
    } catch (error) {
      console.error("Booking delete failed.", error);
      this.toastService.show("Rezervasyon kaydı silinemedi.", "error");
    } finally {
      this.updatingId.set(null);
    }
  }

  private showDeliveryResult(status: BookingStatus, delivery: NotificationDeliveryReport): void {
    const statusText = this.statusLabel(status);
    const emailSent = delivery.email.state === "sent";
    const smsSent = delivery.sms.state === "sent";
    const notConfigured = delivery.email.state === "not_configured" || delivery.sms.state === "not_configured";
    const failed = delivery.email.state === "failed" || delivery.sms.state === "failed";

    if (emailSent && smsSent) {
      this.toastService.show(`${statusText}. E-posta ve SMS gönderildi.`, "success");
      return;
    }
    if (emailSent || smsSent) {
      this.toastService.show(`${statusText}. Durum kaydedildi; ${emailSent ? "e-posta" : "SMS"} gönderildi, diğer kanal tamamlanmadı.`, "info");
      return;
    }
    if (notConfigured) {
      this.toastService.show(`${statusText}. Durum kaydedildi ancak bildirim sağlayıcılarından en az biri henüz yapılandırılmamış.`, "info");
      return;
    }
    if (failed) {
      this.toastService.show(`${statusText}. Durum kaydedildi ancak otomatik müşteri bildirimi tamamlanamadı.`, "error");
      return;
    }
    this.toastService.show(`${statusText}. Durum başarıyla kaydedildi.`, "success");
  }
}
