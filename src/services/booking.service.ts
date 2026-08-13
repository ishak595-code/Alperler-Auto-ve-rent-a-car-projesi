import { Injectable, signal } from "@angular/core";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  BookingRecord,
  CreateBookingInput,
  PaymentStatus,
} from "../models/booking.model";

@Injectable({ providedIn: "root" })
export class BookingService {
  private readonly bookings = signal<BookingRecord[]>([]);
  readonly records = this.bookings.asReadonly();

  async create(input: CreateBookingInput): Promise<BookingRecord> {
    const normalized = this.normalizeInput(input);
    const id = `RES-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date();
    const record: BookingRecord = {
      ...normalized,
      id,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, "bookings", id), {
      schemaVersion: 2,
      type: record.type,
      itemId: record.itemId ?? "",
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
      externalPaymentReference: record.externalPaymentReference ?? "",
      source: record.source ?? "WEB",
      status: record.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.bookings.update((records) => [
      record,
      ...records.filter((current) => current.id !== record.id),
    ]);
    return record;
  }

  private normalizeInput(input: CreateBookingInput): CreateBookingInput {
    const itemName = this.requiredText(input.itemName, "itemName", 240);
    const customerName = this.requiredText(input.customerName, "customerName", 160);
    const customerPhone = this.requiredText(input.customerPhone, "customerPhone", 40);
    const customerEmail = input.customerEmail?.trim().toLowerCase().slice(0, 160) || "";

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      throw new Error("Geçerli bir e-posta adresi girilmelidir.");
    }

    const paymentMethod = input.paymentMethod ?? "NONE";
    const defaultPaymentStatus: PaymentStatus =
      paymentMethod === "NONE" ? "NOT_REQUIRED" : "PENDING";

    return {
      ...input,
      itemId: input.itemId === undefined ? undefined : String(input.itemId).slice(0, 128),
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
      externalPaymentReference: input.externalPaymentReference?.trim().slice(0, 200),
      source: input.source ?? "WEB",
    };
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

  private requiredText(value: string, field: string, maxLength: number): string {
    const normalized = value?.trim();
    if (!normalized || normalized.length > maxLength) {
      throw new Error(`${field} alanı zorunludur veya izin verilen uzunluğu aşıyor.`);
    }
    return normalized;
  }
}
