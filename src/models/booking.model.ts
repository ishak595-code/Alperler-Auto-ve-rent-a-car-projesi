import { PaymentMethod } from "./payment.model";

export type BookingType = "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";
export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type BookingSource = "WEB" | "ADMIN" | "PHONE";
export type BookingCurrency = "TRY" | "EUR" | "USD" | "CHF";

export interface CreateBookingInput {
  type: BookingType;
  itemId?: string | number;
  itemName: string;
  image?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  basePrice?: number;
  totalPrice?: number;
  currency?: BookingCurrency;
  personCount?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  withDriver?: boolean;
  pickupLocation?: string;
  dropoffLocation?: string;
  rentalDuration?: string;
  notes?: string;
  paymentMethod?: PaymentMethod | "NONE";
  paymentStatus?: PaymentStatus;
  externalPaymentReference?: string;
  source?: BookingSource;
}

export interface BookingRecord extends CreateBookingInput {
  id: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}
