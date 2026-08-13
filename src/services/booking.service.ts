import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { firstValueFrom } from "rxjs";
import { db } from "../firebase";
import {
  BookingNotificationEvent,
  BookingRecord,
  BookingStatus,
  CreateBookingInput,
  NotificationDeliveryReport,
  PaymentStatus,
} from "../models/booking.model";

@Injectable({ providedIn: "root" })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly bookings = signal<BookingRecord[]>([]);
  private readonly adminError = signal<string | null>(null);
  private readonly adminLoaded = signal(false);
  private adminUnsubscribe: Unsubscribe | null = null;

  readonly records = this.bookings.asReadonly();
  readonly lastAdminError = this.adminError.asReadonly();
  readonly isAdminLoaded = this.adminLoaded.asReadonly();

  async create(input: CreateBookingInput): Promise<BookingRecord> {
    const normalized = this.normalizeInput(input);
    const id = `RES-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date();
    const record: BookingRecord = {
      ...normalized,
      source: "WEB",
      externalPaymentReference: undefined,
      id,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, "bookings", id), this.serializeForCreate(record));

    const notification = await this.dispatchNotification(
      id,
      "booking_created",
    );
    const enriched: BookingRecord = { ...record, notification };
    this.upsertLocal(enriched);
    return enriched;
  }

  startAdminListener(): void {
    if (this.adminUnsubscribe) return;
    this.adminError.set(null);
    this.adminLoaded.set(false);

    this.adminUnsubscribe = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const records = snapshot.docs
          .map((snapshotDoc) =>
            this.fromFirestore(snapshotDoc.id, snapshotDoc.data()),
          )
          .sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        this.bookings.set(records);
        this.adminError.set(null);
        this.adminLoaded.set(true);
      },
      (error) => {
        console.error("Booking admin listener failed.", error);
        this.adminError.set(
          "Rezervasyon kayıtları Firestore üzerinden okunamadı. Yönetici yetkisi ve Firestore kurallarını kontrol edin.",
        );
        this.adminLoaded.set(true);
      },
    );
  }

  stopAdminListener(): void {
    this.adminUnsubscribe?.();
    this.adminUnsubscribe = null;
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
  ): Promise<NotificationDeliveryReport> {
    const existing = this.bookings().find((record) => record.id === id);
    if (!existing) throw new Error("BOOKING_NOT_FOUND");
    if (existing.status === status) {
      return this.duplicateReport(id, this.eventForStatus(status));
    }

    await updateDoc(doc(db, "bookings", id), {
      status,
      updatedAt: serverTimestamp(),
    });

    const updatedAt = new Date();
    this.bookings.update((records) =>
      records.map((record) =>
        record.id === id ? { ...record, status, updatedAt } : record,
      ),
    );

    const notification = await this.dispatchNotification(
      id,
      this.eventForStatus(status),
    );
    this.bookings.update((records) =>
      records.map((record) =>
        record.id === id ? { ...record, notification } : record,
      ),
    );
    return notification;
  }

  async updatePayment(input: {
    id: string;
    paymentStatus: PaymentStatus;
    externalPaymentReference?: string;
  }): Promise<void> {
    const externalPaymentReference =
      input.externalPaymentReference?.trim().slice(0, 200) || "";
    await updateDoc(doc(db, "bookings", input.id), {
      paymentStatus: input.paymentStatus,
      externalPaymentReference,
      updatedAt: serverTimestamp(),
    });
    this.bookings.update((records) =>
      records.map((record) =>
        record.id === input.id
          ? {
              ...record,
              paymentStatus: input.paymentStatus,
              externalPaymentReference,
              updatedAt: new Date(),
            }
          : record,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, "bookings", id));
    this.bookings.update((records) =>
      records.filter((record) => record.id !== id),
    );
  }

  private serializeForCreate(record: BookingRecord): Record<string, unknown> {
    return {
      schemaVersion: 3,
      type: record.type,
      itemId: record.itemId === undefined ? "" : String(record.itemId),
      itemName: record.itemName,
      image: record.image ?? "",
      customerName: record.customerName,
      customerEmail: record.customerEmail ?? "",
      customerPhone: record.customerPhone,
      basePrice: record.basePrice ?? 0,
      totalPrice: record.totalPrice ?? 0,
      currency: record.currency ?? "TRY",
      personCount: record.personCount ?? 0,
      startDate: record.startDate ?? "",
      endDate: record.endDate ?? "",
      days: record.days ?? 0,
      withDriver: record.withDriver ?? false,
      pickupLocation: record.pickupLocation ?? "",
      dropoffLocation: record.dropoffLocation ?? "",
      rentalDuration: record.rentalDuration ?? "",
      notes: record.notes ?? "",
      paymentMethod: record.paymentMethod ?? "NONE",
      paymentStatus: record.paymentStatus ?? "NOT_REQUIRED",
      externalPaymentReference: "",
      source: "WEB",
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  private fromFirestore(
    id: string,
    data: Record<string, unknown>,
  ): BookingRecord {
    const status = this.bookingStatus(data["status"]);
    const type = this.bookingType(data["type"]);
    const createdAt = this.asDate(data["createdAt"]);
    const updatedAt = this.asDate(data["updatedAt"], createdAt);

    return {
      id,
      type,
      itemId: this.optionalString(data["itemId"] || data["carId"]),
      itemName:
        this.optionalString(data["itemName"]) ||
        this.optionalString(data["carName"]) ||
        "İsimsiz Talep",
      image: this.optionalString(data["image"]),
      customerName:
        this.optionalString(data["customerName"]) || "İsimsiz Müşteri",
      customerEmail: this.optionalString(data["customerEmail"]),
      customerPhone: this.optionalString(data["customerPhone"]) || "",
      basePrice: this.optionalNumber(data["basePrice"]),
      totalPrice: this.optionalNumber(data["totalPrice"]),
      currency: this.currency(data["currency"]),
      personCount: this.optionalNumber(data["personCount"]),
      startDate: this.optionalString(data["startDate"]),
      endDate: this.optionalString(data["endDate"]),
      days: this.optionalNumber(data["days"]),
      withDriver: Boolean(data["withDriver"]),
      pickupLocation: this.optionalString(data["pickupLocation"]),
      dropoffLocation: this.optionalString(data["dropoffLocation"]),
      rentalDuration: this.optionalString(data["rentalDuration"]),
      notes: this.optionalString(data["notes"]),
      paymentMethod: this.paymentMethod(data["paymentMethod"]),
      paymentStatus: this.paymentStatus(data["paymentStatus"]),
      externalPaymentReference: this.optionalString(
        data["externalPaymentReference"],
      ),
      source: this.source(data["source"]),
      status,
      createdAt,
      updatedAt,
    };
  }

  private async dispatchNotification(
    bookingId: string,
    event: BookingNotificationEvent,
  ): Promise<NotificationDeliveryReport> {
    try {
      return await firstValueFrom(
        this.http.post<NotificationDeliveryReport>(
          "/api/notifications/booking",
          { bookingId, event },
        ),
      );
    } catch (error) {
      const code =
        error instanceof HttpErrorResponse &&
        error.error &&
        typeof error.error === "object" &&
        "code" in error.error
          ? String((error.error as { code?: unknown }).code || "")
          : "NOTIFICATION_REQUEST_FAILED";
      console.warn("Booking saved, but notification dispatch did not complete.", {
        bookingId,
        event,
        code,
      });
      return {
        ok: false,
        event,
        bookingId,
        email: { state: "failed", reason: code },
        sms: { state: "failed", reason: code },
        adminEmail: { state: "failed", reason: code },
      };
    }
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
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (
      value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function"
    ) {
      try {
        return (value as { toDate: () => Date }).toDate();
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  private bookingType(value: unknown): BookingRecord["type"] {
    return ["RENTAL", "TOUR", "SALE_INQUIRY", "APPOINTMENT"].includes(
      String(value),
    )
      ? (value as BookingRecord["type"])
      : "APPOINTMENT";
  }

  private bookingStatus(value: unknown): BookingStatus {
    return [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "COMPLETED",
      "CANCELLED",
    ].includes(String(value))
      ? (value as BookingStatus)
      : "PENDING";
  }

  private currency(value: unknown): BookingRecord["currency"] {
    return ["TRY", "EUR", "USD", "CHF"].includes(String(value))
      ? (value as BookingRecord["currency"])
      : "TRY";
  }

  private paymentMethod(value: unknown): BookingRecord["paymentMethod"] {
    return ["NONE", "CARD", "EFT", "OFFICE"].includes(String(value))
      ? (value as BookingRecord["paymentMethod"])
      : "NONE";
  }

  private paymentStatus(value: unknown): PaymentStatus {
    return ["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED"].includes(
      String(value),
    )
      ? (value as PaymentStatus)
      : "NOT_REQUIRED";
  }

  private source(value: unknown): BookingRecord["source"] {
    return ["WEB", "ADMIN", "PHONE"].includes(String(value))
      ? (value as BookingRecord["source"])
      : "WEB";
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
      throw new Error("Sayısal alan izin verilen aralığın dışında.");
    }
    return value;
  }

  private requiredText(
    value: string,
    field: string,
    maxLength: number,
  ): string {
    const normalized = value?.trim();
    if (!normalized || normalized.length > maxLength) {
      throw new Error(
        `${field} alanı zorunludur veya izin verilen uzunluğu aşıyor.`,
      );
    }
    return normalized;
  }
}
