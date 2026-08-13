import { buildBookingNotification, type BookingNotificationEvent } from "../_lib/booking-notification-template";
import {
  acquireNotificationLease,
  completeNotificationLease,
  fetchBookingById,
  getFirebaseServerConfig,
  type ServerBookingRecord,
} from "../_lib/firestore-rest";
import { isAllowedRequestOrigin } from "../_lib/integration-config";
import { getMailerConfig, sendConfiguredMail } from "../_lib/mailer";
import { getSmsConfig, normalizePhone, sendConfiguredSms } from "../_lib/sms";

interface NotificationRequestBody {
  bookingId?: unknown;
  event?: unknown;
}

type ChannelState = "sent" | "skipped" | "not_configured" | "failed";
interface ChannelReport {
  state: ChannelState;
  providerMessageId?: string;
  reason?: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const allowedEvents = new Set<BookingNotificationEvent>([
  "booking_created",
  "booking_pending",
  "booking_approved",
  "booking_rejected",
  "booking_completed",
  "booking_cancelled",
]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function clientKey(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim()
    .slice(0, 128);
}

function rateLimited(request: Request): boolean {
  const now = Date.now();
  const key = clientKey(request);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function hasExpectedStatus(
  event: BookingNotificationEvent,
  booking: ServerBookingRecord,
): boolean {
  const expected: Record<BookingNotificationEvent, ServerBookingRecord["status"]> = {
    booking_created: "PENDING",
    booking_pending: "PENDING",
    booking_approved: "APPROVED",
    booking_rejected: "REJECTED",
    booking_completed: "COMPLETED",
    booking_cancelled: "CANCELLED",
  };
  return booking.status === expected[event];
}

function skipped(reason: string): ChannelReport {
  return { state: "skipped", reason };
}

function notConfigured(reason: string): ChannelReport {
  return { state: "not_configured", reason };
}

function failed(reason: string): ChannelReport {
  return { state: "failed", reason };
}

function deliveryStatus(reports: ChannelReport[]): "SENT" | "PARTIAL" | "FAILED" | "SKIPPED" {
  const sentCount = reports.filter((report) => report.state === "sent").length;
  const failedCount = reports.filter((report) => report.state === "failed").length;
  if (sentCount > 0 && failedCount > 0) return "PARTIAL";
  if (sentCount > 0) return "SENT";
  if (failedCount > 0) return "FAILED";
  return "SKIPPED";
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    const origin = request.headers.get("origin");
    if (process.env.VERCEL_ENV === "production" && !origin) {
      return json({ ok: false, code: "ORIGIN_REQUIRED" }, 403);
    }
    if (!isAllowedRequestOrigin(request)) {
      return json({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
    }
    if (rateLimited(request)) {
      return json({ ok: false, code: "RATE_LIMITED" }, 429);
    }

    let body: NotificationRequestBody;
    try {
      body = (await request.json()) as NotificationRequestBody;
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }

    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const event =
      typeof body.event === "string" &&
      allowedEvents.has(body.event as BookingNotificationEvent)
        ? (body.event as BookingNotificationEvent)
        : null;

    if (!/^RES-[0-9]{13}-[A-Z0-9]{8}$/.test(bookingId) || !event) {
      return json({ ok: false, code: "INVALID_NOTIFICATION_REQUEST" }, 400);
    }

    if (!getFirebaseServerConfig().configured) {
      return json(
        {
          ok: false,
          code: "BOOKING_VERIFICATION_NOT_CONFIGURED",
          message:
            "Sunucu Firestore doğrulaması yapılandırılmadığı için müşteri bildirimi güvenli biçimde gönderilemedi.",
        },
        503,
      );
    }

    let booking: ServerBookingRecord | null;
    try {
      booking = await fetchBookingById(bookingId);
    } catch (error) {
      console.error("Booking verification failed.", error);
      return json({ ok: false, code: "BOOKING_VERIFICATION_FAILED" }, 502);
    }

    if (!booking || booking.schemaVersion < 3) {
      return json({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);
    }
    if (!hasExpectedStatus(event, booking)) {
      return json(
        {
          ok: false,
          code: "BOOKING_STATUS_MISMATCH",
          currentStatus: booking.status,
        },
        409,
      );
    }

    let lease;
    try {
      lease = await acquireNotificationLease({
        bookingId,
        event,
        bookingVersion: booking.updatedAt || booking.createdAt,
      });
    } catch (error) {
      console.error("Notification idempotency lease failed.", error);
      return json({ ok: false, code: "NOTIFICATION_LEDGER_FAILED" }, 502);
    }

    if (!lease.acquired) {
      const duplicate = skipped("ALREADY_PROCESSED");
      return json({
        ok: true,
        event,
        bookingId,
        alreadyProcessed: true,
        email: duplicate,
        sms: duplicate,
        adminEmail: duplicate,
      });
    }

    const template = buildBookingNotification(event, booking);
    const mailConfig = getMailerConfig();
    const smsConfig = getSmsConfig();

    let emailReport: ChannelReport;
    if (!booking.customerEmail) {
      emailReport = skipped("CUSTOMER_EMAIL_MISSING");
    } else if (!mailConfig.configured) {
      emailReport = notConfigured("EMAIL_NOT_CONFIGURED");
    } else {
      try {
        const sent = await sendConfiguredMail({
          to: booking.customerEmail,
          subject: template.customerSubject,
          text: template.customerText,
          html: template.customerHtml,
        });
        emailReport = { state: "sent", providerMessageId: sent.messageId };
      } catch (error) {
        console.error("Customer transactional e-mail failed.", error);
        emailReport = failed("EMAIL_DELIVERY_FAILED");
      }
    }

    let smsReport: ChannelReport;
    const normalizedPhone = normalizePhone(booking.customerPhone);
    if (!normalizedPhone) {
      smsReport = skipped("CUSTOMER_PHONE_INVALID");
    } else if (!smsConfig.configured) {
      smsReport = notConfigured("SMS_NOT_CONFIGURED");
    } else {
      try {
        const sent = await sendConfiguredSms({
          to: normalizedPhone,
          body: template.customerSms,
        });
        smsReport = { state: "sent", providerMessageId: sent.messageId };
      } catch (error) {
        console.error("Customer transactional SMS failed.", error);
        smsReport = failed("SMS_DELIVERY_FAILED");
      }
    }

    let adminEmailReport: ChannelReport;
    if (!mailConfig.configured || !mailConfig.adminTo) {
      adminEmailReport = notConfigured("ADMIN_EMAIL_NOT_CONFIGURED");
    } else {
      try {
        const sent = await sendConfiguredMail({
          to: mailConfig.adminTo,
          subject: template.adminSubject,
          text: template.adminText,
          html: template.adminHtml,
        });
        adminEmailReport = {
          state: "sent",
          providerMessageId: sent.messageId,
        };
      } catch (error) {
        console.error("Admin transactional e-mail failed.", error);
        adminEmailReport = failed("ADMIN_EMAIL_DELIVERY_FAILED");
      }
    }

    const ledgerStatus = deliveryStatus([
      emailReport,
      smsReport,
      adminEmailReport,
    ]);
    try {
      await completeNotificationLease({
        bookingId,
        eventKey: lease.eventKey,
        status: ledgerStatus,
        emailStatus: emailReport.state,
        smsStatus: smsReport.state,
        adminEmailStatus: adminEmailReport.state,
        emailMessageId: emailReport.providerMessageId,
        smsMessageId: smsReport.providerMessageId,
        adminEmailMessageId: adminEmailReport.providerMessageId,
      });
    } catch (error) {
      console.error("Notification delivery completed but ledger update failed.", error);
    }

    return json({
      ok: ledgerStatus === "SENT" || ledgerStatus === "PARTIAL",
      event,
      bookingId,
      email: emailReport,
      sms: smsReport,
      adminEmail: adminEmailReport,
    });
  },
};
