import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_TOUR_PERSON_COUNT = 1_000_000_000;
const MAX_BOOKING_MONEY = 999_999_999_999.99;

const ALLOWED_ORIGINS = new Set([
  "https://alperlerrentaacar.com",
  "https://www.alperlerrentaacar.com",
  "https://alperler-auto-production.vercel.app",
  "http://localhost:4200",
  "http://localhost:5173",
]);

type CustomerIdentity = { id: string; email: string | null };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function integer(value: unknown, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error("INVALID_PERSON_COUNT");
  return parsed;
}
function money(value: number): number {
  return Math.round(value * 100) / 100;
}
function emailValue(value: unknown): string | null {
  const email = clean(value, 160).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_EMAIL");
  return email;
}
function validDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return probe.getUTCFullYear() === Number(match[1]) && probe.getUTCMonth() === Number(match[2]) - 1 && probe.getUTCDate() === Number(match[3]);
}
function istanbulToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function cors(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-request-id",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
function response(origin: string, body: unknown, status = 200, requestId?: string): Response {
  return Response.json(body, {
    status,
    headers: {
      ...cors(origin),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}
function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(12_000),
  });
}
async function firstRow(path: string): Promise<any | null> {
  const result = await db(path);
  if (!result.ok) return null;
  const rows = await result.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function consumeRateLimit(keyHash: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const result = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key_hash: keyHash, p_scope: scope, p_window_seconds: seconds, p_limit: limit }),
  });
  if (!result.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await result.json());
}
async function runtimeAllowsBookings(): Promise<boolean> {
  const row = await firstRow("site_config?key=eq.runtime_controls&select=value&limit=1");
  const value = row?.value && typeof row.value === "object" ? row.value : {};
  return value.maintenanceMode !== true && value.readOnlyMode !== true && value.allowBookings !== false;
}
async function optionalCustomer(authorization: string): Promise<CustomerIdentity | null> {
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  if (!uuid(id) || !user?.email_confirmed_at) return null;
  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_customer_profile`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, authorization, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(8_000),
  });
  if (!profileResponse.ok) return null;
  const profile = await firstRow(`customer_profiles?user_id=eq.${encodeURIComponent(id)}&select=status&limit=1`);
  if (String(profile?.status || "ACTIVE") !== "ACTIVE") throw new Error("CUSTOMER_ACCOUNT_BLOCKED");
  return { id, email: emailValue(user?.email) };
}
async function getTour(identifier: string): Promise<any> {
  const select = "id,seo_slug,title,price_per_person,currency,publication_status,is_active,cover_image";
  const lookup = uuid(identifier)
    ? `tours?id=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`
    : `tours?seo_slug=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`;
  const row = await firstRow(lookup);
  if (!row || row.publication_status !== "PUBLISHED" || row.is_active !== true) throw new Error("INVALID_TOUR");
  return row;
}
async function cleanupBooking(id: string): Promise<void> {
  await db(`bookings?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
}
async function notify(internalId: string): Promise<unknown> {
  try {
    const result = await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`, {
      method: "POST",
      headers: { authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ bookingId: internalId, event: "booking_created" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!result.ok) throw new Error("NOTIFY_FAILED");
    return await result.json();
  } catch {
    return { ok: false, event: "booking_created", bookingId: internalId, reason: "NOTIFICATION_DISPATCH_FAILED" };
  }
}

Deno.serve(async (request: Request) => {
  const origin = clean(request.headers.get("origin"), 240);
  const requestId = clean(request.headers.get("x-request-id"), 80) || crypto.randomUUID();
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return Response.json({ ok: false, code: "ORIGIN_NOT_ALLOWED", requestId }, { status: 403, headers: { "cache-control": "no-store" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return response(origin, { ok: false, code: "METHOD_NOT_ALLOWED", requestId }, 405, requestId);
  if (!SUPABASE_URL || !SERVICE_KEY) return response(origin, { ok: false, code: "SERVICE_NOT_CONFIGURED", requestId }, 503, requestId);
  if (Number(request.headers.get("content-length") || 0) > 32_768) return response(origin, { ok: false, code: "PAYLOAD_TOO_LARGE", requestId }, 413, requestId);

  let body: any;
  try { body = await request.json(); }
  catch { return response(origin, { ok: false, code: "INVALID_JSON", requestId }, 400, requestId); }
  if (clean(body?.website, 200)) return response(origin, { ok: true, accepted: true, requestId }, 202, requestId);

  let createdId = "";
  try {
    if (!(await runtimeAllowsBookings())) throw new Error("BOOKINGS_DISABLED");
    const itemId = clean(body?.itemId, 128);
    const customerName = clean(body?.customerName, 160);
    const customerPhone = clean(body?.customerPhone, 40);
    const date = clean(body?.startDate, 10);
    if (!itemId) throw new Error("INVALID_TOUR");
    if (!customerName) throw new Error("INVALID_CUSTOMER_NAME");
    if (!/[0-9]/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 7) throw new Error("INVALID_PHONE");
    if (!validDay(date) || date < istanbulToday()) throw new Error("INVALID_TOUR_DATE");
    const persons = integer(body?.personCount, 1, MAX_TOUR_PERSON_COUNT);
    const enteredEmail = emailValue(body?.customerEmail);
    const authorization = request.headers.get("authorization") || "";
    const customer = await optionalCustomer(authorization);
    const customerEmail = customer?.email || enteredEmail;
    if (!customerEmail) throw new Error("INVALID_EMAIL");
    const tour = await getTour(itemId);
    const idempotencyKey = clean(body?.idempotencyKey, 120) || crypto.randomUUID();
    const duplicate = await firstRow(`bookings?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);
    if (duplicate) return response(origin, { ok: true, duplicate: true, booking: { id: duplicate.reference }, requestId }, 200, requestId);

    const ip = clean(request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-client-ip") || "unknown", 100);
    const networkHash = await sha256(`${ip}|${clean(request.headers.get("user-agent"), 300)}`);
    const contactHash = await sha256(`${customerPhone}|${customerEmail}`);
    if (!(await consumeRateLimit(networkHash, "tour_booking_network_minute_v170", 60, 12)) ||
        !(await consumeRateLimit(networkHash, "tour_booking_network_hour_v170", 3600, 120)) ||
        !(await consumeRateLimit(contactHash, "tour_booking_contact_hour_v170", 3600, 30))) {
      return response(origin, { ok: false, code: "RATE_LIMITED", message: "Çok fazla rezervasyon isteği gönderildi.", requestId }, 429, requestId);
    }

    const unitPrice = Math.max(0, Number(tour.price_per_person || 0));
    const maxBillablePeople = unitPrice > 0 ? Math.floor(MAX_BOOKING_MONEY / unitPrice) : MAX_TOUR_PERSON_COUNT;
    if (persons > Math.max(1, Math.min(MAX_TOUR_PERSON_COUNT, maxBillablePeople))) throw new Error("INVALID_PERSON_COUNT");
    const normalSubtotal = money(unitPrice * persons);
    const startAt = new Date(`${date}T12:00:00+03:00`).toISOString();
    const requestedCampaign = clean(body?.campaignId, 80);
    if (requestedCampaign && !uuid(requestedCampaign)) throw new Error("INVALID_CAMPAIGN_ID");
    const loyaltyPoints = body?.loyaltyPointsToRedeem == null || body?.loyaltyPointsToRedeem === ""
      ? 0
      : integer(body.loyaltyPointsToRedeem, 0, 100_000_000);

    const row = {
      idempotency_key: idempotencyKey,
      booking_type: "TOUR",
      tour_id: tour.id,
      vehicle_id: null,
      legacy_item_id: null,
      item_name: String(tour.title || "Tur"),
      image: clean(body?.image, 2048) || tour.cover_image || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_user_id: customer?.id || null,
      customer_linked_at: customer ? new Date().toISOString() : null,
      start_at: startAt,
      end_at: null,
      person_count: persons,
      with_driver: false,
      base_price: unitPrice,
      total_price: normalSubtotal,
      currency: "TRY",
      payment_method: "NONE",
      payment_status: "NOT_REQUIRED",
      status: "PENDING",
      source: "WEB",
      notes: clean(body?.notes, 4000) || null,
      customer_locale: clean(body?.customerLocale || body?.locale, 10) || "tr",
      campaign_id: null,
      discount_amount: 0,
      normal_price_amount: normalSubtotal,
      campaign_discount_amount: 0,
      referral_discount_amount: 0,
      loyalty_discount_amount: 0,
      loyalty_points_redeemed: 0,
      pricing_snapshot: {},
      metadata: {
        server_calculated: true,
        resolved_tour_id: tour.id,
        tour_date: date,
        capacity_policy: "FLEXIBLE_DEMAND",
        hard_capacity: false,
        price_breakdown: { canonical_unit_price: unitPrice, person_count: persons, normal_subtotal: normalSubtotal },
      },
    };

    const insert = await db("bookings?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
    if (!insert.ok) throw new Error("BOOKING_CREATE_FAILED");
    const saved = (await insert.json())[0];
    createdId = String(saved.id || "");

    const reserve = await db("rpc/reserve_booking_commercial_offer", {
      method: "POST",
      body: JSON.stringify({
        p_booking_id: saved.id,
        p_campaign_id: requestedCampaign || null,
        p_requested_loyalty_points: loyaltyPoints,
        p_normal_subtotal: normalSubtotal,
        p_quantity: persons,
        p_extras_total: 0,
        p_route_fuel_total: 0,
      }),
    });
    const commercial = await reserve.json().catch(() => ({}));
    if (!reserve.ok) {
      await cleanupBooking(saved.id);
      createdId = "";
      throw new Error(clean(commercial?.message || commercial?.details, 300) || "COMMERCIAL_OFFER_FAILED");
    }

    const finalRow = await firstRow(`bookings?id=eq.${encodeURIComponent(saved.id)}&select=reference,total_price,campaign_discount_amount,referral_discount_amount,loyalty_discount_amount,loyalty_points_redeemed,status&limit=1`);
    if (!finalRow) {
      await cleanupBooking(saved.id);
      createdId = "";
      throw new Error("BOOKING_FINAL_READ_FAILED");
    }
    const notification = await notify(saved.id);
    return response(origin, {
      ok: true,
      booking: {
        id: finalRow.reference,
        status: finalRow.status,
        date,
        personCount: persons,
        totalPrice: Number(finalRow.total_price || normalSubtotal),
        campaignDiscountAmount: Number(finalRow.campaign_discount_amount || 0),
        referralDiscountAmount: Number(finalRow.referral_discount_amount || 0),
        loyaltyDiscountAmount: Number(finalRow.loyalty_discount_amount || 0),
        loyaltyPointsRedeemed: Number(finalRow.loyalty_points_redeemed || 0),
      },
      notification,
      requestId,
    }, 201, requestId);
  } catch (error) {
    if (createdId) await cleanupBooking(createdId).catch(() => undefined);
    const code = error instanceof Error ? error.message : "TOUR_BOOKING_FAILED";
    const conflict = ["CAMPAIGN_LIMIT_REACHED", "CAMPAIGN_CUSTOMER_LIMIT_REACHED", "REFERRAL_DISCOUNT_ALREADY_USED", "LOYALTY_BALANCE_CHANGED"].some((value) => code.includes(value));
    const forbidden = code === "CUSTOMER_ACCOUNT_BLOCKED";
    const unavailable = code === "BOOKINGS_DISABLED";
    const bad = code.startsWith("INVALID_") || code.includes("CAMPAIGN_NOT_ACTIVE") || code.includes("CAMPAIGN_TARGET_MISMATCH") || code.includes("CAMPAIGN_MINIMUM_");
    const status = conflict ? 409 : forbidden ? 403 : unavailable ? 503 : bad ? 400 : 500;
    const message = code === "INVALID_PERSON_COUNT" ? "Kişi sayısı geçerli değil veya seçilen tur fiyatı için teknik işlem sınırını aşıyor." :
      code === "INVALID_EMAIL" ? "Geçerli bir e-posta adresi zorunludur." :
      code === "INVALID_TOUR_DATE" ? "Tur tarihi geçerli değil." :
      code === "INVALID_TOUR" ? "Tur bulunamadı veya rezervasyona açık değil." :
      code === "BOOKINGS_DISABLED" ? "Yeni rezervasyon işlemleri geçici olarak kapalı." :
      code.includes("CAMPAIGN_NOT_ACTIVE") ? "Bu kampanya artık aktif değil." :
      code.includes("CAMPAIGN_TARGET_MISMATCH") ? "Kampanya bu tur için geçerli değil." :
      conflict ? "Kampanya veya sadakat bakiyesi değişti. Lütfen tekrar deneyin." :
      "Rezervasyon talebi şu anda kaydedilemedi.";
    console.error("tour-booking-v170", requestId, code);
    return response(origin, { ok: false, code, message, requestId }, status, requestId);
  }
});