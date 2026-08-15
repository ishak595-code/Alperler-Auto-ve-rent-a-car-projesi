import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  BookingNotificationEvent,
  BookingRecord,
  BookingStatus,
  CreateBookingInput,
  NotificationDeliveryReport,
  PaymentStatus,
} from "../models/booking.model";
import { AuthService } from "./auth.service";
import { currentAnalyticsSessionId } from "./analytics-link.util";
import { AnalyticsIdentityService } from "./analytics-identity.service";

interface BookingApiResponse {
  ok: boolean;
  booking?: ApiBooking;
  bookings?: ApiBooking[];
  notification?: NotificationDeliveryReport;
  code?: string;
  message?: string;
}

interface ApiBooking extends Omit<BookingRecord, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: "root" })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly analyticsIdentity = inject(AnalyticsIdentityService);
  private readonly bookings = signal<BookingRecord[]>([]);
  private readonly adminError = signal<string | null>(null);
  private readonly adminLoaded = signal(false);
  private adminRefreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly records = this.bookings.asReadonly();
  readonly lastAdminError = this.adminError.asReadonly();
  readonly isAdminLoaded = this.adminLoaded.asReadonly();

  async create(input: CreateBookingInput): Promise<BookingRecord> {
    const normalized = this.normalizeInput(input);
    const response = await this.request<BookingApiResponse>("POST", {
      ...normalized,
      idempotencyKey: crypto.randomUUID(),
      analyticsSessionId: currentAnalyticsSessionId(),
    });
    if (!response.ok || !response.booking) {
      throw new Error(response.code || "BOOKING_CREATE_FAILED");
    }
    const record = this.fromApi(response.booking);
    if (response.notification) record.notification = response.notification;
    this.upsertLocal(record);
    void this.analyticsIdentity.link({
      entityType: "BOOKING",
      reference: record.id,
      phone: normalized.customerPhone,
      email: normalized.customerEmail,
    });
    return record;
  }

  startAdminListener(): void {
    if (this.adminRefreshTimer) return;
    this.adminError.set(null);
    this.adminLoaded.set(false);
    void this.refreshAdminRecords();
    this.adminRefreshTimer = setInterval(() => {
      void this.refreshAdminRecords(false);
    }, 30_000);
  }

  stopAdminListener(): void {
    if (this.adminRefreshTimer) clearInterval(this.adminRefreshTimer);
    this.adminRefreshTimer = null;
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
  ): Promise<NotificationDeliveryReport> {
    const existing = this.bookings().find((record) => record.id === id);
    if (existing?.status === status) {
      return this.duplicateReport(id, this.eventForStatus(status));
    }

    const response = await this.request<BookingApiResponse>("PATCH", {
      id,
      operation: "status",
      status,
    });
    if (!response.ok || !response.booking) {
      throw new Error(response.code || "BOOKING_STATUS_UPDATE_FAILED");
    }

    const record = this.fromApi(response.booking);
    if (response.notification) record.notification = response.notification;
    this.upsertLocal(record);
    return (
      response.notification ||
      this.duplicateReport(id, this.eventForStatus(status))
    );
  }

  async updatePayment(input: {
    id: string;
    paymentStatus: PaymentStatus;
    externalPaymentReference?: string;
  }): Promise<void> {
    const response = await this.request<BookingApiResponse>("PATCH", {
      id: input.id,
      operation: "payment",
      paymentStatus: input.paymentStatus,
      externalPaymentReference:
        input.externalPaymentReference?.trim().slice(0, 200) || "",
    });
    if (!response.ok || !response.booking) {
      throw new Error(response.code || "BOOKING_PAYMENT_UPDATE_FAILED");
    }
    this.upsertLocal(this.fromApi(response.booking));
  }

  async delete(id: string): Promise<void> {
    const response = await this.request<BookingApiResponse>("DELETE", { id });
    if (!response.ok) {
      throw new Error(response.code || "BOOKING_DELETE_FAILED");
    }
    this.bookings.update((records) =>
      records.filter((record) => record.id !== id),
    );
  }

  private async refreshAdminRecords(showLoading = true): Promise<void> {
    if (showLoading) this.adminLoaded.set(false);
    try {
      const response = await this.request<BookingApiResponse>("GET");
      if (!response.ok || !response.bookings) {
        throw new Error(response.code || "BOOKING_LIST_FAILED");
      }
      const records = response.bookings
        .map((record) => this.fromApi(record))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.bookings.set(records);
      this.adminError.set(null);
    } catch (error) {
      console.error("Booking data source is unavailable.", error);
      this.adminError.set(
        "Rezervasyon veri kaynağına ulaşılamadı. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.",
      );
    } finally {
      this.adminLoaded.set(true);
    }
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    try {
      if (method === "POST") {
        return await firstValueFrom(
          this.http.post<T>("/api/bookings", body),
        );
      }

      const accessToken = await this.authService.getAccessToken();
      if (!accessToken) throw new Error("ADMIN_SESSION_REQUIRED");
      const headers = { Authorization: `Bearer ${accessToken}` };
      if (method === "GET") {
        return await firstValueFrom(
          this.http.get<T>("/api/bookings", { headers }),
        );
      }
      return await firstValueFrom(
        this.http.request<T>(method, "/api/bookings", { body, headers }),
      );
    } catch (error) {
      if (error instanceof Error && error.message === "ADMIN_SESSION_REQUIRED") {
        throw error;
      }
      if (
        error instanceof HttpErrorResponse &&
        error.error &&
        typeof error.error === "object"
      ) {
        const payload = error.error as {
          code?: unknown;
          message?: unknown;
        };
        const code = String(payload.code || "BOOKING_BACKEND_UNAVAILABLE");
        const message = String(payload.message || code);
        throw new Error(`${code}:${message}`);
      }
      throw error;
    }
  }

  private fromApi(record: ApiBooking): BookingRecord {
    return {
      ...record,
      createdAt: this.asDate(record.createdAt),
      updatedAt: this.asDate(record.updatedAt),
    };
  }

  private normalizeInput(input: CreateBookingInput): CreateBookingInput {
    const itemName = this.requiredText(input.itemName, "itemName", 240);
    const customerName = this.requiredText(
      input.customerName,
      "customerName",
      160,
    );
    const customerPhone = this.requiredText(
      input.customerPhone,
      "customerPhone",
      40,
    );
    const customerEmail =
      input.customerEmail?.trim().toLowerCase().slice(0, 160) || "";

    if (
      customerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    ) {
      throw new Error("Geçerli bir e-posta adresi girilmelidir.");
    }

    const paymentMethod = input.paymentMethod ?? "NONE";
    const defaultPaymentStatus: PaymentStatus =
      paymentMethod === "NONE" ? "NOT_REQUIRED" : "PENDING";

    return {
      ...input,
      itemId:
        input.itemId === undefined
          ? undefined
          : String(input.itemId).slice(0, 128),
      itemName,
      image: input.image?.trim().slice(0, 2048),
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      basePrice: this.optionalAmount(input.basePrice),
      totalPrice: this.optionalAmount(input.totalPrice),
      currency: input.currency ?? "TRY",
      personCount: this.optionalInteger(input.personCount, 1, 100),
      startDate: input.startDate?.slice(0, 64),
      endDate: input.endDate?.slice(0, 64),
      days: this.optionalInteger(input.days, 1, 3650),
      pickupLocation: input.pickupLocation?.trim().slice(0, 240),
      dropoffLocation: input.dropoffLocation?.trim().slice(0, 240),
      rentalDuration: input.rentalDuration?.trim().slice(0, 40),
      notes: input.notes?.trim().slice(0, 4000),
      paymentMethod,
      paymentStatus: input.paymentStatus ?? defaultPaymentStatus,
      externalPaymentReference: undefined,
      source: "WEB",
    };
  }

  private eventForStatus(status: BookingStatus): BookingNotificationEvent {
    switch (status) {
      case "APPROVED":
        return "booking_approved";
      case "REJECTED":
        return "booking_rejected";
      case "COMPLETED":
        return "booking_completed";
      case "CANCELLED":
        return "booking_cancelled";
      default:
        return "booking_pending";
    }
  }

  private duplicateReport(
    bookingId: string,
    event: BookingNotificationEvent,
  ): NotificationDeliveryReport {
    const channel = { state: "skipped" as const, reason: "STATUS_UNCHANGED" };
    return {
      ok: true,
      event,
      bookingId,
      alreadyProcessed: true,
      email: channel,
      sms: channel,
      adminEmail: channel,
    };
  }

  private upsertLocal(record: BookingRecord): void {
    this.bookings.update((records) => [
      record,
      ...records.filter((current) => current.id !== record.id),
    ]);
  }

  private asDate(value: unknown, fallback = new Date(0)): Date {
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return fallback;
  }

  private optionalAmount(value: number | undefined): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isFinite(value) || value < 0 || value > 50_000_000) {
      throw new Error("Tutar alanı geçerli değil.");
    }
    return Math.round(value * 100) / 100;
  }

  private optionalInteger(
    value: number | undefined,
    min: number,
    max: number,
  ): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error("Sayısal alan geçerli değil.");
    }
    return value;
  }

  private requiredText(
    value: string | undefined,
    field: string,
    max: number,
  ): string {
    const result = value?.trim().slice(0, max) || "";
    if (!result) throw new Error(`${field} alanı zorunludur.`);
    return result;
  }
}
