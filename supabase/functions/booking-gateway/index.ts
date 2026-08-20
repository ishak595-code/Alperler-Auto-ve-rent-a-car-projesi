import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type BookingEvent = "booking_created" | "booking_pending" | "booking_approved" | "booking_rejected" | "booking_completed" | "booking_cancelled";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-ip, x-idempotency-key",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function required(value: unknown, field: string, max: number): string {
  const result = clean(value, max);
  if (!result) throw new Error(`INVALID_${field.toUpperCase()}`);
  return result;
}
function numberValue(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error("INVALID_NUMBER");
  return Math.round(n * 100) / 100;
}
function integerValue(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error("INVALID_INTEGER");
  return n;
}
function emailValue(value: unknown): string | null {
  const email = clean(value, 160).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
  return email;
}
function dateValue(value: unknown): string | null {
  const raw = clean(value, 64);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_DATE");
  return d.toISOString();
}
function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) } });
}
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function consumeRateLimit(keyHash: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const res = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key_hash: keyHash, p_scope: scope, p_window_seconds: seconds, p_limit: limit }),
  });
  if (!res.ok) throw new Error(`RATE_LIMIT_BACKEND_${res.status}`);
  return Boolean(await res.json());
}

interface AdminIdentity { id: string; email: string; role: string }
interface CustomerIdentity { id: string; email: string | null }

async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8000),
  });
  if (!userRes.ok) throw new Error("UNAUTHORIZED");
  const user = await userRes.json();
  const userId = clean(user?.id, 80);
  const email = clean(user?.email, 160).toLowerCase();
  if (!userId || !email) throw new Error("UNAUTHORIZED");
  const adminRes = await db(`admin_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,email,role&limit=1`);
  if (!adminRes.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminRes.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
  return { id: userId, email, role: String(rows[0].role || "support") };
}

async function optionalCustomer(request: Request): Promise<CustomerIdentity | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, authorization },
      signal: AbortSignal.timeout(8000),
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    const id = clean(user?.id, 80);
    if (!uuid(id)) return null;
    const email = emailValue(user?.email);
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_customer_profile`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, authorization, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    if (!profileRes.ok) {
      console.error("Customer profile initialization failed", profileRes.status);
      return null;
    }
    return { id, email };
  } catch (error) {
    console.error("Optional customer resolution failed", error);
    return null;
  }
}

function toApi(row: any) {
  return {
    id: row.reference,
    type: row.booking_type,
    itemId: row.legacy_item_id || undefined,
    itemName: row.item_name,
    image: row.image || undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email || undefined,
    customerPhone: row.customer_phone,
    basePrice: row.base_price === null ? undefined : Number(row.base_price),
    totalPrice: row.total_price === null ? undefined : Number(row.total_price),
    currency: row.currency,
    personCount: row.person_count ?? undefined,
    startDate: row.start_at || undefined,
    endDate: row.end_at || undefined,
    days: row.days ?? undefined,
    withDriver: Boolean(row.with_driver),
    pickupLocation: row.pickup_location || undefined,
    dropoffLocation: row.dropoff_location || undefined,
    rentalDuration: row.rental_duration || undefined,
    notes: row.notes || undefined,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    externalPaymentReference: row.external_payment_reference || undefined,
    source: ["WEB", "ADMIN", "PHONE"].includes(row.source) ? row.source : "WEB",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByReference(reference: string): Promise<any | null> {
  const res = await db(`bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=*&limit=1`);
  if (!res.ok) throw new Error(`BOOKING_READ_${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}
async function notify(internalId: string, event: BookingEvent) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`, {
      method: "POST",
      headers: { authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ bookingId: internalId, event }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`NOTIFY_${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Notification dispatch failed after booking persistence", error);
    return {
      ok: false,
      event,
      bookingId: internalId,
      email: { state: "failed", reason: "NOTIFICATION_DISPATCH_FAILED" },
      sms: { state: "failed", reason: "NOTIFICATION_DISPATCH_FAILED" },
      adminEmail: { state: "failed", reason: "NOTIFICATION_DISPATCH_FAILED" },
    };
  }
}
function eventForStatus(status: string): BookingEvent {
  if (status === "APPROVED") return "booking_approved";
  if (status === "REJECTED") return "booking_rejected";
  if (status === "COMPLETED") return "booking_completed";
  if (status === "CANCELLED") return "booking_cancelled";
  return "booking_pending";
}
async function audit(admin: AdminIdentity, action: string, row: any, beforeData?: any, afterData?: any) {
  await db("audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ actor_user_id: admin.id, actor_email: admin.email, action, entity_type: "booking", entity_id: row.reference, before_data: beforeData || null, after_data: afterData || null }),
  }).catch(() => undefined);
}

async function createBooking(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 32768) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  if (clean(body?.website, 200)) return json({ ok: true, accepted: true }, 202);

  try {
    const type = required(body?.type, "type", 30);
    if (!["RENTAL", "TOUR", "SALE_INQUIRY", "APPOINTMENT"].includes(type)) throw new Error("INVALID_TYPE");
    const itemName = required(body?.itemName, "itemName", 240);
    const customerName = required(body?.customerName, "customerName", 160);
    const customerPhone = required(body?.customerPhone, "customerPhone", 40);
    if (!/[0-9]/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 7) throw new Error("INVALID_PHONE");
    const customer = await optionalCustomer(request);
    const enteredCustomerEmail = emailValue(body?.customerEmail);
    const customerEmail = customer?.email || enteredCustomerEmail;
    const idempotencyKey = clean(body?.idempotencyKey || request.headers.get("x-idempotency-key"), 120) || crypto.randomUUID();
    const ip = clean(request.headers.get("x-client-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown", 100);
    const ua = clean(request.headers.get("user-agent"), 300);
    const networkHash = await sha256(`${ip}|${ua}`);
    const contactHash = await sha256(`${customerPhone}|${customerEmail || ""}`);
    const minuteOk = await consumeRateLimit(networkHash, "booking_network_minute", 60, 8);
    const hourOk = await consumeRateLimit(networkHash, "booking_network_hour", 3600, 40);
    const contactOk = await consumeRateLimit(contactHash, "booking_contact_hour", 3600, 12);
    if (!minuteOk || !hourOk || !contactOk) return json({ ok: false, code: "RATE_LIMITED", message: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." }, 429);

    const duplicateRes = await db(`bookings?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);
    if (duplicateRes.ok) {
      const dup = await duplicateRes.json();
      if (Array.isArray(dup) && dup[0]) return json({ ok: true, booking: toApi(dup[0]), duplicate: true });
    }

    const itemId = clean(body?.itemId === undefined ? "" : String(body.itemId), 128);
    const currency = clean(body?.currency, 10) || "TRY";
    if (!["TRY", "EUR", "USD", "CHF"].includes(currency)) throw new Error("INVALID_CURRENCY");
    const paymentMethod = clean(body?.paymentMethod, 20) || "NONE";
    if (!["NONE", "CARD", "EFT", "OFFICE"].includes(paymentMethod)) throw new Error("INVALID_PAYMENT_METHOD");
    const paymentStatus = paymentMethod === "NONE" ? "NOT_REQUIRED" : "PENDING";
    const vehicleId = type === "RENTAL" || type === "SALE_INQUIRY" ? (uuid(itemId) ? itemId : null) : null;
    const tourId = type === "TOUR" && uuid(itemId) ? itemId : null;
    const row = {
      idempotency_key: idempotencyKey,
      booking_type: type,
      vehicle_id: vehicleId,
      tour_id: tourId,
      legacy_item_id: itemId || null,
      item_name: itemName,
      image: clean(body?.image, 2048) || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_user_id: customer?.id || null,
      customer_linked_at: customer ? new Date().toISOString() : null,
      start_at: dateValue(body?.startDate),
      end_at: dateValue(body?.endDate),
      pickup_location: clean(body?.pickupLocation, 240) || null,
      dropoff_location: clean(body?.dropoffLocation, 240) || null,
      person_count: integerValue(body?.personCount, 1, 100),
      with_driver: Boolean(body?.withDriver),
      base_price: numberValue(body?.basePrice, 0, 50000000),
      total_price: numberValue(body?.totalPrice, 0, 50000000),
      currency,
      days: integerValue(body?.days, 1, 3650),
      rental_duration: clean(body?.rentalDuration, 40) || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: "PENDING",
      source: "WEB",
      notes: clean(body?.notes, 4000) || null,
      customer_locale: clean(body?.customerLocale || body?.locale, 10) || "tr",
    };
    const insertRes = await db("bookings?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    if (!insertRes.ok) {
      const detail = await insertRes.text();
      console.error("Booking insert failed", insertRes.status, detail.slice(0, 500));
      return json({ ok: false, code: "BOOKING_CREATE_FAILED" }, 500);
    }
    const rows = await insertRes.json();
    const saved = rows[0];
    const notification = await notify(saved.id, "booking_created");
    return json({ ok: true, booking: toApi(saved), notification }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_BOOKING";
    const status = code.startsWith("INVALID_") ? 400 : 500;
    return json({ ok: false, code, message: status === 400 ? "Rezervasyon bilgilerini kontrol edin." : "Rezervasyon şu anda kaydedilemedi." }, status);
  }
}

async function listBookings(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const res = await db("bookings?deleted_at=is.null&select=*&order=created_at.desc&limit=500");
    if (!res.ok) throw new Error("BOOKING_LIST_FAILED");
    const rows = await res.json();
    return json({ ok: true, bookings: rows.map(toApi) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    return json({ ok: false, code }, code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500);
  }
}

async function patchBooking(request: Request): Promise<Response> {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  try {
    const admin = await requireAdmin(request);
    const reference = required(body?.id, "id", 80);
    const existing = await findByReference(reference);
    if (!existing) return json({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);
    const operation = clean(body?.operation, 20);
    let update: Record<string, unknown> = {};
    let event: BookingEvent | null = null;
    if (operation === "status") {
      const status = required(body?.status, "status", 30);
      if (!["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) throw new Error("INVALID_STATUS");
      update = { status };
      event = eventForStatus(status);
    } else if (operation === "payment") {
      const paymentStatus = required(body?.paymentStatus, "paymentStatus", 30);
      if (!["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED"].includes(paymentStatus)) throw new Error("INVALID_PAYMENT_STATUS");
      update = { payment_status: paymentStatus, external_payment_reference: clean(body?.externalPaymentReference, 200) || null };
    } else {
      throw new Error("INVALID_OPERATION");
    }
    const res = await db(`bookings?id=eq.${encodeURIComponent(existing.id)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(update) });
    if (!res.ok) throw new Error("BOOKING_UPDATE_FAILED");
    const rows = await res.json();
    const saved = rows[0];
    await audit(admin, `booking_${operation}_updated`, saved, existing, saved);
    const notification = event ? await notify(saved.id, event) : undefined;
    return json({ ok: true, booking: toApi(saved), notification });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BOOKING_UPDATE_FAILED";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code.startsWith("INVALID_") ? 400 : 500;
    return json({ ok: false, code }, status);
  }
}

async function deleteBooking(request: Request): Promise<Response> {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  try {
    const admin = await requireAdmin(request);
    if (!["owner", "admin"].includes(admin.role)) return json({ ok: false, code: "FORBIDDEN" }, 403);
    const reference = required(body?.id, "id", 80);
    const existing = await findByReference(reference);
    if (!existing) return json({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);
    const now = new Date().toISOString();
    const res = await db(`bookings?id=eq.${encodeURIComponent(existing.id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ deleted_at: now, deleted_by: admin.id, status: "CANCELLED" }),
    });
    if (!res.ok) throw new Error("BOOKING_ARCHIVE_FAILED");
    const rows = await res.json();
    await audit(admin, "booking_archived", rows[0] || existing, existing, rows[0] || null);
    await notify(existing.id, "booking_cancelled");
    return json({ ok: true, archived: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BOOKING_ARCHIVE_FAILED";
    return json({ ok: false, code }, code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500);
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (request.method === "POST") return createBooking(request);
  if (request.method === "GET") return listBookings(request);
  if (request.method === "PATCH") return patchBooking(request);
  if (request.method === "DELETE") return deleteBooking(request);
  return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
});
