import { PaymentMethod } from "./payment.model";

export type BookingType = "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";
export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type BookingSource = "WEB" | "ADMIN" | "PHONE";
export type BookingCurrency = "TRY" | "EUR" | "USD" | "CHF";
export type RentalDuration = "hourly" | "daily" | "weekly" | "monthly" | "longterm";
export type BookingAlternativeStatus = "OPEN" | "OFFERED" | "ACCEPTED" | "DISMISSED" | "EXPIRED";

export type BookingNotificationEvent = "booking_created" | "booking_pending" | "booking_approved" | "booking_rejected" | "booking_completed" | "booking_cancelled";
export type NotificationChannelState = "sent" | "skipped" | "not_configured" | "failed";

export interface NotificationChannelReport { state: NotificationChannelState; providerMessageId?: string; reason?: string; }
export interface NotificationDeliveryReport { ok: boolean; event: BookingNotificationEvent; bookingId: string; alreadyProcessed?: boolean; email: NotificationChannelReport; sms: NotificationChannelReport; adminEmail?: NotificationChannelReport; }

export interface BookingAlternativeOffer {
  id: string;
  status: BookingAlternativeStatus;
  rank: number;
  score: number;
  reason?: string;
  vehicleId: string;
  stockCode?: string;
  brand: string;
  model: string;
  coverImage?: string;
  branchId?: string;
  dailyPrice?: number;
  hourlyPrice?: number;
  bodyType?: string;
  seats?: number;
  offeredAt?: string;
}

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
  rentalHours?: number;
  withDriver?: boolean;
  pickupBranchId?: string;
  dropoffBranchId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  rentalDuration?: RentalDuration | string;
  selectedExtraIds?: string[];
  campaignId?: string;
  loyaltyPointsToRedeem?: number;
  notes?: string;
  paymentMethod?: PaymentMethod | "NONE";
  paymentStatus?: PaymentStatus;
  externalPaymentReference?: string;
  source?: BookingSource;
}

export interface BookingRecord extends CreateBookingInput {
  id: string;
  status: BookingStatus;
  normalPriceAmount?: number;
  campaignDiscountAmount?: number;
  referralDiscountAmount?: number;
  loyaltyDiscountAmount?: number;
  loyaltyPointsRedeemed?: number;
  pricingSnapshot?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  notification?: NotificationDeliveryReport;
  alternatives?: BookingAlternativeOffer[];
}
