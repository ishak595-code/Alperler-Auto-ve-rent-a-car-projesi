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
import { SUPABASE_PROJECT_URL } from "../supabase.config";
import { AuthService } from "./auth.service";
import { CustomerAuthService } from "./customer-auth.service";
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
interface AvailabilityHold {
  id: string;
  vehicleId: string;
  startAt: string;
  endAt: string;
  expiresAt: string;
  branchTimezone?: string;
}
interface AvailabilityApiResponse {
  ok: boolean;
  available?: boolean;
  hold?: AvailabilityHold;
  code?: string;
  message?: string;
  requestId?: string;
}
interface ApiBooking extends Omit<BookingRecord, "createdAt" | "updatedAt"> { createdAt: string; updatedAt: string; }

@Injectable({ providedIn: "root" })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly customerAuth = inject(CustomerAuthService);
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
    const idempotencyKey = crypto.randomUUID();
    if (normalized.type === "RENTAL") {
      const hold = await this.reserveRentalHold(normalized, idempotencyKey);
      normalized.startDate = hold.startAt;
      normalized.endDate = hold.endAt;
    }
    const envelope = {
      ...normalized,
      idempotencyKey,
      analyticsSessionId: currentAnalyticsSessionId(),
    };
    const response = await this.request<BookingApiResponse>("POST", envelope);
    if (!response.ok || !response.booking) throw new Error(`${response.code || "BOOKING_CREATE_FAILED"}:${response.message || "Talep kaydedilemedi."}`);
    const record = this.fromApi(response.booking);
    if (response.notification) record.notification = response.notification;
    this.upsertLocal(record);
    void this.analyticsIdentity.link({ entityType: "BOOKING", reference: record.id, phone: normalized.customerPhone, email: normalized.customerEmail });
    return record;
  }

  startAdminListener(): void {
    if (this.adminRefreshTimer) return;
    this.adminError.set(null); this.adminLoaded.set(false);
    void this.refreshAdminRecords();
    this.adminRefreshTimer = setInterval(() => void this.refreshAdminRecords(false), 30_000);
  }
  stopAdminListener(): void { if (this.adminRefreshTimer) clearInterval(this.adminRefreshTimer); this.adminRefreshTimer = null; }

  async updateStatus(id: string, status: BookingStatus): Promise<NotificationDeliveryReport> {
    const existing = this.bookings().find((record) => record.id === id);
    if (existing?.status === status) return this.duplicateReport(id, this.eventForStatus(status));
    const response = await this.request<BookingApiResponse>("PATCH", { id, operation: "status", status });
    if (!response.ok || !response.booking) throw new Error(response.code || "BOOKING_STATUS_UPDATE_FAILED");
    const record = this.fromApi(response.booking); if (response.notification) record.notification = response.notification; this.upsertLocal(record);
    return response.notification || this.duplicateReport(id, this.eventForStatus(status));
  }

  async updatePayment(input: { id: string; paymentStatus: PaymentStatus; externalPaymentReference?: string }): Promise<void> {
    const response = await this.request<BookingApiResponse>("PATCH", {
      id: input.id,
      operation: "payment",
      paymentStatus: input.paymentStatus,
      externalPaymentReference: input.externalPaymentReference?.trim().slice(0, 200) || "",
    });
    if (!response.ok || !response.booking) throw new Error(response.code || "BOOKING_PAYMENT_UPDATE_FAILED");
    this.upsertLocal(this.fromApi(response.booking));
  }

  async delete(id: string): Promise<void> {
    const response = await this.request<BookingApiResponse>("DELETE", { id });
    if (!response.ok) throw new Error(response.code || "BOOKING_DELETE_FAILED");
    this.bookings.update((records) => records.filter((record) => record.id !== id));
  }

  private async reserveRentalHold(input: CreateBookingInput, idempotencyKey: string): Promise<AvailabilityHold> {
    const itemId = input.itemId === undefined ? "" : String(input.itemId).trim();
    const startAt = input.startDate?.trim() || "";
    const endAt = input.endDate?.trim() || "";
    if (!itemId) throw new Error("INVALID_RENTAL_VEHICLE:Kiralık araç seçimi geçerli değil.");
    if (!startAt || !endAt) throw new Error("INVALID_RENTAL_DATES:Teslim alma ve iade tarihlerini kontrol edin.");

    const startLocal = this.wallClockValue(startAt);
    const endLocal = this.wallClockValue(endAt);
    if (endLocal <= startLocal) throw new Error("INVALID_RENTAL_DATES:Teslim alma ve iade tarihlerini kontrol edin.");

    const token = await this.customerAuth.getAccessToken().catch(() => null);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-idempotency-key": idempotencyKey,
      "x-request-id": crypto.randomUUID(),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const body = { vehicleId: itemId, startLocal, endLocal, idempotencyKey };

    try {
      const response = await firstValueFrom(this.http.post<AvailabilityApiResponse>(
        "/api/rental-availability",
        body,
        { headers },
      ));
      return this.validateHold(response);
    } catch (error) {
      if (error instanceof HttpErrorResponse && this.shouldTryAvailabilityDirect(error)) {
        console.warn("Primary availability API failed, using direct rental availability gateway.", error.status);
        return await this.directAvailability(body, token, headers["x-request-id"]);
      }
      if (error instanceof HttpErrorResponse && error.error && typeof error.error === "object") {
        const payload = error.error as AvailabilityApiResponse;
        const code = String(payload.code || "AVAILABILITY_CHECK_FAILED");
        const message = String(payload.message || "Araç uygunluğu doğrulanamadı.");
        throw new Error(`${code}:${message}`);
      }
      if (error instanceof Error) throw error;
      throw new Error("AVAILABILITY_CHECK_FAILED:Araç uygunluğu doğrulanamadı.");
    }
  }

  private shouldTryAvailabilityDirect(error: HttpErrorResponse): boolean {
    return error.status === 0 || error.status === 404 || error.status === 405 || error.status === 408 || error.status === 502 || error.status === 503 || error.status === 504;
  }

  private async directAvailability(
    body: { vehicleId: string; startLocal: string; endLocal: string; idempotencyKey: string },
    token: string | null,
    requestId: string,
  ): Promise<AvailabilityHold> {
    let response: Response;
    try {
      response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/rental-availability`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-idempotency-key": body.idempotencyKey,
          "x-request-id": requestId,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new Error("AVAILABILITY_SERVICE_UNAVAILABLE:Araç uygunluğu servisine ulaşılamıyor.");
    }
    const payload = await response.json().catch(() => ({})) as AvailabilityApiResponse;
    if (!response.ok) {
      const code = String(payload.code || `AVAILABILITY_HTTP_${response.status}`);
      const message = String(payload.message || "Araç uygunluğu doğrulanamadı.");
      throw new Error(`${code}:${message}`);
    }
    return this.validateHold(payload);
  }

  private validateHold(response: AvailabilityApiResponse): AvailabilityHold {
    if (!response.ok || !response.available || !response.hold?.id || !response.hold.startAt || !response.hold.endAt) {
      throw new Error(`${response.code || "AVAILABILITY_CHECK_FAILED"}:${response.message || "Araç uygunluğu doğrulanamadı."}`);
    }
    const expiresAt = new Date(response.hold.expiresAt).getTime();
    const startAt = new Date(response.hold.startAt).getTime();
    const endAt = new Date(response.hold.endAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error("AVAILABILITY_HOLD_EXPIRED:Araç uygunluk süresi doldu. Lütfen tekrar deneyin.");
    }
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
      throw new Error("INVALID_RENTAL_DATES:Kiralama tarihleri doğrulanamadı.");
    }
    return response.hold;
  }

  private wallClockValue(value: string): string {
    const raw = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00`;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) throw new Error("INVALID_RENTAL_DATES:Kiralama tarihi geçerli değil.");
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private async refreshAdminRecords(showLoading = true): Promise<void> {
    if (showLoading) this.adminLoaded.set(false);
    try {
      const response = await this.request<BookingApiResponse>("GET");
      if (!response.ok || !response.bookings) throw new Error(response.code || "BOOKING_LIST_FAILED");
      this.bookings.set(response.bookings.map((record) => this.fromApi(record)).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()));
      this.adminError.set(null);
    } catch (error) {
      console.error("Booking data source is unavailable.", error);
      this.adminError.set("Rezervasyon veri kaynağına ulaşılamadı. Oturumunuzu ve bağlantınızı kontrol edip tekrar deneyin.");
    } finally { this.adminLoaded.set(true); }
  }

  private async request<T>(method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
    const token = method === "POST"
      ? await this.customerAuth.getAccessToken().catch(() => null)
      : await this.authService.getAccessToken();
    if (method !== "POST" && !token) throw new Error("ADMIN_SESSION_REQUIRED");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      if (method === "POST") return await firstValueFrom(this.http.post<T>("/api/bookings", body, headers ? { headers } : {}));
      if (method === "GET") return await firstValueFrom(this.http.get<T>("/api/bookings", { headers: headers! }));
      return await firstValueFrom(this.http.request<T>(method, "/api/bookings", { body, headers: headers! }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && this.shouldTryDirectGateway(error, method)) {
        console.warn("Primary booking API failed, using direct booking gateway.", error.status);
        return await this.directGateway<T>(method, body, token);
      }
      throw this.normalizeRequestError(error);
    }
  }

  private shouldTryDirectGateway(error: HttpErrorResponse, method: "GET" | "POST" | "PATCH" | "DELETE"): boolean {
    if (error.status === 0 || error.status === 404 || error.status === 405 || error.status === 408 || error.status === 502 || error.status === 503 || error.status === 504) return true;
    return method === "POST" && error.status >= 500;
  }

  private async directGateway<T>(method: "GET" | "POST" | "PATCH" | "DELETE", body: unknown, token: string | null): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/booking-gateway`, {
        method,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new Error("BOOKING_GATEWAY_UNAVAILABLE:Rezervasyon servisine ulaşılamıyor.");
    }
    const payload = await response.json().catch(() => ({})) as { code?: unknown; message?: unknown } & T;
    if (!response.ok) {
      const code = String(payload.code || `BOOKING_HTTP_${response.status}`);
      const message = String(payload.message || code);
      throw new Error(`${code}:${message}`);
    }
    return payload as T;
  }

  private normalizeRequestError(error: unknown): Error {
    if (error instanceof Error && error.message === "ADMIN_SESSION_REQUIRED") return error;
    if (error instanceof HttpErrorResponse && error.error && typeof error.error === "object") {
      const payload = error.error as { code?: unknown; message?: unknown };
      const code = String(payload.code || "BOOKING_BACKEND_UNAVAILABLE");
      const message = String(payload.message || code);
      return new Error(`${code}:${message}`);
    }
    return error instanceof Error ? error : new Error("BOOKING_BACKEND_UNAVAILABLE");
  }

  private fromApi(record: ApiBooking): BookingRecord { return { ...record, createdAt: this.asDate(record.createdAt), updatedAt: this.asDate(record.updatedAt) }; }

  private normalizeInput(input: CreateBookingInput): CreateBookingInput {
    const itemName = this.requiredText(input.itemName, "itemName", 240);
    const customerName = this.requiredText(input.customerName, "customerName", 160);
    const customerPhone = this.requiredText(input.customerPhone, "customerPhone", 40);
    const customerEmail = input.customerEmail?.trim().toLowerCase().slice(0, 160) || "";
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error("Geçerli bir e-posta adresi girilmelidir.");
    const paymentMethod = input.paymentMethod ?? "NONE";
    const defaultPaymentStatus: PaymentStatus = paymentMethod === "NONE" ? "NOT_REQUIRED" : "PENDING";
    const selectedExtraIds = Array.isArray(input.selectedExtraIds)
      ? Array.from(new Set(input.selectedExtraIds.map((id) => String(id || "").trim()).filter((id) => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(id)))).slice(0, 30)
      : undefined;
    const rentalDuration = input.rentalDuration;
    if (rentalDuration && !["hourly","daily","weekly","monthly","longterm"].includes(rentalDuration)) throw new Error("Kiralama türü geçerli değil.");
    return {
      ...input,
      itemId: input.itemId === undefined ? undefined : String(input.itemId).trim().slice(0, 128),
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
      days: input.rentalHours ? undefined : this.optionalInteger(input.days, 1, 3650),
      rentalHours: this.optionalInteger(input.rentalHours, 1, 23),
      pickupBranchId: this.optionalUuid(input.pickupBranchId),
      pickupLocation: input.pickupLocation?.trim().slice(0, 240),
      dropoffLocation: input.dropoffLocation?.trim().slice(0, 240),
      rentalDuration,
      selectedExtraIds,
      campaignId: this.optionalUuid(input.campaignId),
      notes: input.notes?.trim().slice(0, 4000),
      paymentMethod,
      paymentStatus: input.paymentStatus ?? defaultPaymentStatus,
      externalPaymentReference: undefined,
      source: "WEB",
    };
  }

  private eventForStatus(status: BookingStatus): BookingNotificationEvent { switch(status){case "APPROVED":return "booking_approved";case "REJECTED":return "booking_rejected";case "COMPLETED":return "booking_completed";case "CANCELLED":return "booking_cancelled";default:return "booking_pending";} }
  private duplicateReport(bookingId:string,event:BookingNotificationEvent):NotificationDeliveryReport { const channel={state:"skipped" as const,reason:"STATUS_UNCHANGED"}; return {ok:true,event,bookingId,alreadyProcessed:true,email:channel,sms:channel,adminEmail:channel}; }
  private upsertLocal(record:BookingRecord):void { this.bookings.update((records)=>[record,...records.filter((current)=>current.id!==record.id)]); }
  private asDate(value:unknown,fallback=new Date(0)):Date { if(value instanceof Date)return value; if(typeof value==="string"||typeof value==="number"){const date=new Date(value);if(!Number.isNaN(date.getTime()))return date;} return fallback; }
  private optionalUuid(value:string|undefined):string|undefined { const clean=String(value||"").trim(); if(!clean)return undefined; if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)) throw new Error("Kimlik alanı geçerli değil."); return clean; }
  private optionalAmount(value:number|undefined):number|undefined { if(value===undefined)return undefined; if(!Number.isFinite(value)||value<0||value>50_000_000)throw new Error("Tutar alanı geçerli değil."); return Math.round(value*100)/100; }
  private optionalInteger(value:number|undefined,min:number,max:number):number|undefined { if(value===undefined)return undefined; if(!Number.isInteger(value)||value<min||value>max)throw new Error("Sayısal alan geçerli değil."); return value; }
  private requiredText(value:string|undefined,field:string,max:number):string { const result=value?.trim().slice(0,max)||""; if(!result)throw new Error(`${field} alanı zorunludur.`); return result; }
}