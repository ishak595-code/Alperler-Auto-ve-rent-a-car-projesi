import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type BookingEvent =
  | "booking_created"
  | "booking_pending"
  | "booking_approved"
  | "booking_rejected"
  | "booking_completed"
  | "booking_cancelled";

type RentalDuration = "hourly" | "daily" | "monthly" | "longterm";

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
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
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
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  return date.toISOString();
}

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(10_000),
  });
}

async function firstRow(path: string): Promise<any | null> {
  const response = await db(path);
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(
  keyHash: string,
  scope: string,
  seconds: number,
  limit: number,
): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_key_hash: keyHash,
      p_scope: scope,
      p_window_seconds: seconds,
      p_limit: limit,
    }),
  });
  if (!response.ok) throw new Error(`RATE_LIMIT_BACKEND_${response.status}`);
  return Boolean(await response.json());
}

interface AdminIdentity {
  id: string;
  email: string;
  role: string;
}

interface CustomerIdentity {
  id: string;
  email: string | null;
}

async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");

  const user = await userResponse.json();
  const userId = clean(user?.id, 80);
  const email = clean(user?.email, 160).toLowerCase();
  if (!userId || !email) throw new Error("UNAUTHORIZED");

  const adminResponse = await db(
    `admin_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,email,role&limit=1`,
  );
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");

  return { id: userId, email, role: String(rows[0].role || "support") };
}

async function optionalCustomer(request: Request): Promise<CustomerIdentity | null> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;

  try {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, authorization },
      signal: AbortSignal.timeout(8_000),
    });
    if (!userResponse.ok) return null;

    const user = await userResponse.json();
    const id = clean(user?.id, 80);
    if (!uuid(id)) return null;
    const email = emailValue(user?.email);

    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ensure_customer_profile`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, authorization, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8_000),
    });
    if (!profileResponse.ok) return null;

    const statusResponse = await db(
      `customer_profiles?user_id=eq.${encodeURIComponent(id)}&select=status&limit=1`,
    );
    if (!statusResponse.ok) return null;
    const statusRows = await statusResponse.json();
    if (String(statusRows?.[0]?.status || "ACTIVE") !== "ACTIVE") {
      throw new Error("CUSTOMER_ACCOUNT_BLOCKED");
    }

    return { id, email };
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_ACCOUNT_BLOCKED") throw error;
    return null;
  }
}

function toApi(row: any) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.reference,
    type: row.booking_type,
    itemId: row.vehicle_id || row.tour_id || row.legacy_item_id || undefined,
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
    rentalHours: row.rental_hours ?? undefined,
    withDriver: Boolean(row.with_driver),
    pickupBranchId: row.pickup_branch_id || undefined,
    pickupLocation: row.pickup_location || undefined,
    dropoffLocation: row.dropoff_location || undefined,
    rentalDuration: row.rental_duration || undefined,
    selectedExtraIds: Array.isArray(metadata.selected_extra_ids)
      ? metadata.selected_extra_ids
      : undefined,
    campaignId: row.campaign_id || undefined,
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
  const response = await db(
    `bookings?reference=eq.${encodeURIComponent(reference)}&deleted_at=is.null&select=*&limit=1`,
  );
  if (!response.ok) throw new Error(`BOOKING_READ_${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function notify(internalId: string, event: BookingEvent) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ bookingId: internalId, event }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`NOTIFY_${response.status}`);
    return await response.json();
  } catch {
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

async function audit(
  admin: AdminIdentity,
  action: string,
  row: any,
  beforeData?: any,
  afterData?: any,
) {
  await db("audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: admin.id,
      actor_email: admin.email,
      action,
      entity_type: "booking",
      entity_id: row.reference,
      before_data: beforeData || null,
      after_data: afterData || null,
    }),
  }).catch(() => undefined);
}

async function runtimeAllowsBookings(): Promise<boolean> {
  const response = await db("site_config?key=eq.runtime_controls&select=value&limit=1");
  if (!response.ok) return true;
  const rows = await response.json();
  const value = Array.isArray(rows) && rows[0]?.value && typeof rows[0].value === "object"
    ? rows[0].value
    : {};
  return value.maintenanceMode !== true &&
    value.readOnlyMode !== true &&
    value.allowBookings !== false;
}

async function getSiteSettings(): Promise<any> {
  const response = await db("site_config?key=eq.site_settings&select=value&limit=1");
  if (!response.ok) return {};
  const rows = await response.json();
  return Array.isArray(rows) && rows[0]?.value && typeof rows[0].value === "object"
    ? rows[0].value
    : {};
}

async function getVehicleByIdentifier(
  identifier: string,
  category: "RENTAL" | "SALE",
): Promise<any | null> {
  const select = "id,stock_code,brand,model,price,rental_price_daily,rental_price_hourly,hourly_rental_enabled,minimum_rental_hours,hourly_mileage_limit,branch_id,availability_status,publication_status,metadata";
  const base = `category=eq.${category}&is_active=eq.true&select=${select}&limit=1`;

  if (uuid(identifier)) {
    return firstRow(`vehicles?id=eq.${encodeURIComponent(identifier)}&${base}`);
  }

  return firstRow(`vehicles?stock_code=eq.${encodeURIComponent(identifier)}&${base}`);
}

async function getRentalVehicle(identifier: string): Promise<any> {
  const vehicle = await getVehicleByIdentifier(identifier, "RENTAL");
  const blockedStatus = ["MAINTENANCE", "SOLD", "UNAVAILABLE"].includes(
    String(vehicle?.availability_status || ""),
  );
  if (!vehicle || vehicle.publication_status !== "PUBLISHED" || blockedStatus) {
    throw new Error("INVALID_RENTAL_VEHICLE");
  }
  return vehicle;
}

async function getSaleVehicle(identifier: string): Promise<any> {
  const vehicle = await getVehicleByIdentifier(identifier, "SALE");
  if (
    !vehicle ||
    vehicle.publication_status !== "PUBLISHED" ||
    ["SOLD", "ARCHIVED", "UNAVAILABLE"].includes(String(vehicle.availability_status || ""))
  ) {
    throw new Error("INVALID_SALE_VEHICLE");
  }
  return vehicle;
}

async function getTourByIdentifier(identifier: string): Promise<any> {
  const select = "id,seo_slug,title,publication_status,is_active";
  const tour = uuid(identifier)
    ? await firstRow(
      `tours?id=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`,
    )
    : await firstRow(
      `tours?seo_slug=eq.${encodeURIComponent(identifier)}&is_active=eq.true&select=${select}&limit=1`,
    );

  if (!tour || tour.publication_status !== "PUBLISHED") {
    throw new Error("INVALID_TOUR");
  }
  return tour;
}

async function hasApprovedOverlap(
  vehicleId: string,
  start: string,
  end: string,
  excludeId?: string,
): Promise<boolean> {
  const path = `bookings?vehicle_id=eq.${encodeURIComponent(vehicleId)}&booking_type=eq.RENTAL&status=eq.APPROVED&deleted_at=is.null&start_at=lt.${encodeURIComponent(end)}&end_at=gt.${encodeURIComponent(start)}&select=id&limit=2`;
  const response = await db(path);
  if (!response.ok) throw new Error("AVAILABILITY_CHECK_FAILED");
  const rows = await response.json();
  return Array.isArray(rows) && rows.some((row: any) => !excludeId || String(row.id) !== excludeId);
}

function driverOption(vehicle: any): "WITH_DRIVER" | "WITHOUT_DRIVER" | "BOTH" {
  const value = String(vehicle?.metadata?.driverOption || "BOTH");
  return value === "WITH_DRIVER" || value === "WITHOUT_DRIVER" ? value : "BOTH";
}

function rentalDuration(value: unknown): RentalDuration {
  const normalized = clean(value, 20);
  return normalized === "hourly" || normalized === "monthly" || normalized === "longterm"
    ? normalized
    : "daily";
}

function rentalDays(start: string, end: string): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("INVALID_RENTAL_DATES");
  }
  const days = Math.ceil((endMs - startMs) / 86_400_000);
  if (days < 1 || days > 3650) throw new Error("INVALID_RENTAL_DATES");
  return days;
}

function rentalHours(start: string, end: string, minimum: number): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error("INVALID_HOURLY_RENTAL");
  }
  const raw = (endMs - startMs) / 3_600_000;
  const hours = Math.ceil(raw);
  if (raw <= 0 || hours < minimum || hours > 23) {
    throw new Error("INVALID_HOURLY_RENTAL");
  }
  return hours;
}

function selectedExtraIds(body: any, withDriver: boolean): string[] {
  const raw: unknown[] = Array.isArray(body?.selectedExtraIds) ? body.selectedExtraIds : [];
  const normalized = raw
    .map((value: unknown) => clean(value, 64))
    .filter((value: string) => /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value));
  const set = new Set<string>(normalized);
  if (withDriver) set.add("driver");
  else set.delete("driver");
  return [...set].slice(0, 30);
}

async function activeVehicleCampaign(vehicleId: string): Promise<any | null> {
  const response = await db(
    `campaigns?target_type=eq.VEHICLE&target_id=eq.${encodeURIComponent(vehicleId)}&is_active=eq.true&publication_status=eq.PUBLISHED&select=*&order=sort_order.asc,created_at.desc`,
  );
  if (!response.ok) return null;
  const rows = await response.json();
  const now = Date.now();
  return (Array.isArray(rows) ? rows : []).find((campaign: any) =>
    (!campaign.starts_at || new Date(campaign.starts_at).getTime() <= now) &&
    (!campaign.ends_at || new Date(campaign.ends_at).getTime() > now)
  ) || null;
}

function normalizeLocation(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
}

function routeFuel(
  settings: any,
  pickup: string,
  dropoff: string,
): { distance: number; fuel: number } {
  const from = normalizeLocation(pickup);
  const to = normalizeLocation(dropoff);
  if (!from || !to || from === to) return { distance: 0, fuel: 0 };

  const routes = Array.isArray(settings.rentalRoutePricing) ? settings.rentalRoutePricing : [];
  const route = routes.find((row: any) =>
    row &&
    row.enabled !== false &&
    Number(row.distanceKm || 0) > 0 &&
    ((normalizeLocation(String(row.from || "")) === from &&
      normalizeLocation(String(row.to || "")) === to) ||
      (normalizeLocation(String(row.from || "")) === to &&
        normalizeLocation(String(row.to || "")) === from))
  );

  if (!route) return { distance: 0, fuel: 0 };
  const distance = Math.max(0, Number(route.distanceKm || 0));
  const fuelPrice = Math.max(0, Number(settings.rentalFuelPricePerLiter ?? 85));
  const consumption = Math.max(0, Number(settings.rentalAverageConsumptionPer100Km ?? 8.5));
  return {
    distance,
    fuel: Math.round(distance * consumption / 100 * fuelPrice),
  };
}

function extraCost(extra: any, duration: RentalDuration, units: number): number {
  const flat = Math.max(0, Number(extra?.flatPrice || 0));
  if (duration === "hourly") {
    const raw = extra?.pricePerHour;
    const hasHourly = raw !== undefined && raw !== null && raw !== "" && Number.isFinite(Number(raw));
    const rate = hasHourly
      ? Math.max(0, Number(raw))
      : Math.max(0, Number(extra?.pricePerDay || 0)) / 8;
    return money(rate * units + flat);
  }
  return money(Math.max(0, Number(extra?.pricePerDay || 0)) * units + flat);
}

async function authoritativeRental(
  body: any,
  vehicle: any,
  start: string,
  end: string,
  withDriver: boolean,
) {
  const option = driverOption(vehicle);
  if (withDriver && option === "WITHOUT_DRIVER") throw new Error("DRIVER_OPTION_NOT_ALLOWED");
  if (!withDriver && option === "WITH_DRIVER") throw new Error("DRIVER_OPTION_NOT_ALLOWED");
  if (await hasApprovedOverlap(vehicle.id, start, end)) throw new Error("VEHICLE_UNAVAILABLE");

  const duration = rentalDuration(body?.rentalDuration);
  const settings = await getSiteSettings();
  const extras = Array.isArray(settings.rentalExtras) ? settings.rentalExtras : [];
  const requested = selectedExtraIds(body, withDriver);
  const validExtras = extras.filter((extra: any) =>
    extra && extra.enabled !== false && requested.includes(String(extra.id || ""))
  );
  if (withDriver && !validExtras.some((extra: any) => extra.id === "driver")) {
    throw new Error("DRIVER_OPTION_NOT_ALLOWED");
  }

  const campaign = await activeVehicleCampaign(vehicle.id);
  const pickup = clean(body?.pickupLocation, 240);
  const dropoff = clean(body?.dropoffLocation, 240) || pickup;
  const route = routeFuel(settings, pickup, dropoff);

  if (duration === "hourly") {
    if (vehicle.hourly_rental_enabled !== true || Number(vehicle.rental_price_hourly || 0) <= 0) {
      throw new Error("HOURLY_RENTAL_NOT_ALLOWED");
    }

    const minimum = Math.max(1, Math.min(23, Number(vehicle.minimum_rental_hours || 1)));
    const hours = rentalHours(start, end, minimum);
    const normalHourly = Math.max(0, Number(vehicle.rental_price_hourly || 0));
    let hourly = normalHourly;
    const campaignHourly = Number(campaign?.metadata?.hourly_price || 0);
    if (campaignHourly > 0) hourly = campaignHourly;
    else if (Number(campaign?.discount_percent) > 0) {
      hourly = money(normalHourly * (100 - Number(campaign.discount_percent)) / 100);
    }

    const discountAmount = Math.max(0, money((normalHourly - hourly) * hours));
    const extrasTotal = money(
      validExtras.reduce(
        (sum: number, extra: any) => sum + extraCost(extra, "hourly", hours),
        0,
      ),
    );
    const baseTotal = money(hourly * hours);
    const total = money(baseTotal + extrasTotal + route.fuel);

    return {
      duration,
      hours,
      days: null,
      unitPrice: hourly,
      baseTotal,
      total,
      extrasTotal,
      requested: validExtras.map((extra: any) => String(extra.id)),
      campaign,
      discountAmount,
      route,
    };
  }

  const days = rentalDays(start, end);
  const normalDaily = Math.max(0, Number(vehicle.rental_price_daily ?? vehicle.price ?? 0));
  let daily = normalDaily;
  if (campaign) {
    if (Number(campaign.new_price) > 0) daily = Number(campaign.new_price);
    else if (Number(campaign.discount_percent) > 0) {
      daily = money(normalDaily * (100 - Number(campaign.discount_percent)) / 100);
    }
  }

  const discountAmount = Math.max(0, money((normalDaily - daily) * days));
  const extrasTotal = money(
    validExtras.reduce(
      (sum: number, extra: any) => sum + extraCost(extra, duration, days),
      0,
    ),
  );
  const baseTotal = money(daily * days);
  const total = money(baseTotal + extrasTotal + route.fuel);

  return {
    duration,
    hours: null,
    days,
    unitPrice: daily,
    baseTotal,
    total,
    extrasTotal,
    requested: validExtras.map((extra: any) => String(extra.id)),
    campaign,
    discountAmount,
    route,
  };
}

async function createBooking(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 32_768) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  if (clean(body?.website, 200)) return json({ ok: true, accepted: true }, 202);

  try {
    if (!(await runtimeAllowsBookings())) {
      return json({
        ok: false,
        code: "BOOKINGS_DISABLED",
        message: "Yeni rezervasyon işlemleri şu anda geçici olarak kapalı.",
      }, 503);
    }

    const type = required(body?.type, "type", 30);
    if (!["RENTAL", "TOUR", "SALE_INQUIRY", "APPOINTMENT"].includes(type)) {
      throw new Error("INVALID_TYPE");
    }

    const itemName = required(body?.itemName, "itemName", 240);
    const customerName = required(body?.customerName, "customerName", 160);
    const customerPhone = required(body?.customerPhone, "customerPhone", 40);
    if (!/[0-9]/.test(customerPhone) || customerPhone.replace(/\D/g, "").length < 7) {
      throw new Error("INVALID_PHONE");
    }

    const customer = await optionalCustomer(request);
    const enteredCustomerEmail = emailValue(body?.customerEmail);
    const customerEmail = customer?.email || enteredCustomerEmail;
    const idempotencyKey = clean(
      body?.idempotencyKey || request.headers.get("x-idempotency-key"),
      120,
    ) || crypto.randomUUID();

    const ip = clean(
      request.headers.get("x-client-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("cf-connecting-ip") ||
        "unknown",
      100,
    );
    const userAgent = clean(request.headers.get("user-agent"), 300);
    const networkHash = await sha256(`${ip}|${userAgent}`);
    const contactHash = await sha256(`${customerPhone}|${customerEmail || ""}`);

    if (
      !(await consumeRateLimit(networkHash, "booking_network_minute", 60, 8)) ||
      !(await consumeRateLimit(networkHash, "booking_network_hour", 3600, 40)) ||
      !(await consumeRateLimit(contactHash, "booking_contact_hour", 3600, 12))
    ) {
      return json({
        ok: false,
        code: "RATE_LIMITED",
        message: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.",
      }, 429);
    }

    const duplicateResponse = await db(
      `bookings?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`,
    );
    if (duplicateResponse.ok) {
      const duplicateRows = await duplicateResponse.json();
      if (Array.isArray(duplicateRows) && duplicateRows[0]) {
        return json({ ok: true, booking: toApi(duplicateRows[0]), duplicate: true });
      }
    }

    const itemId = clean(
      body?.itemId === undefined ? "" : String(body.itemId),
      128,
    );
    const currency = clean(body?.currency, 10) || "TRY";
    if (!["TRY", "EUR", "USD", "CHF"].includes(currency)) {
      throw new Error("INVALID_CURRENCY");
    }

    const paymentMethod = clean(body?.paymentMethod, 20) || "NONE";
    if (!["NONE", "CARD", "EFT", "OFFICE"].includes(paymentMethod)) {
      throw new Error("INVALID_PAYMENT_METHOD");
    }
    const paymentStatus = paymentMethod === "NONE" ? "NOT_REQUIRED" : "PENDING";

    let vehicleId: string | null = null;
    let tourId: string | null = null;
    let startAt = dateValue(body?.startDate);
    let endAt = dateValue(body?.endDate);
    let basePrice = numberValue(body?.basePrice, 0, 50_000_000);
    let totalPrice = numberValue(body?.totalPrice, 0, 50_000_000);
    let days = integerValue(body?.days, 1, 3650);
    let rentalHoursValue = integerValue(body?.rentalHours, 1, 23);
    let rentalDurationValue = clean(body?.rentalDuration, 40) || null;
    let campaignId: string | null = null;
    let discountAmount = 0;
    let metadata: any = {};
    let pickupBranchId = uuid(clean(body?.pickupBranchId, 80))
      ? clean(body?.pickupBranchId, 80)
      : null;

    if (type === "RENTAL") {
      if (!itemId) throw new Error("INVALID_RENTAL_VEHICLE");
      const vehicle = await getRentalVehicle(itemId);
      vehicleId = String(vehicle.id);
      if (!startAt || !endAt) {
        throw new Error(
          rentalDurationValue === "hourly" ? "INVALID_HOURLY_RENTAL" : "INVALID_RENTAL_DATES",
        );
      }

      const withDriver = Boolean(body?.withDriver);
      const calculation = await authoritativeRental(body, vehicle, startAt, endAt, withDriver);
      days = calculation.days;
      rentalHoursValue = calculation.hours;
      rentalDurationValue = calculation.duration;
      basePrice = calculation.unitPrice;
      totalPrice = calculation.total;
      campaignId = calculation.campaign?.id || null;
      discountAmount = calculation.discountAmount;
      pickupBranchId = pickupBranchId ||
        (uuid(String(vehicle.branch_id || "")) ? String(vehicle.branch_id) : null);
      metadata = {
        selected_extra_ids: calculation.requested,
        price_breakdown: {
          rental_duration: calculation.duration,
          unit_price: calculation.unitPrice,
          days: calculation.days,
          rental_hours: calculation.hours,
          base_total: calculation.baseTotal,
          extras_total: calculation.extrasTotal,
          route_distance_km: calculation.route.distance,
          route_fuel_total: calculation.route.fuel,
        },
        server_calculated: true,
        resolved_vehicle_id: vehicleId,
      };
    } else if (type === "SALE_INQUIRY") {
      if (!itemId) throw new Error("INVALID_SALE_VEHICLE");
      const vehicle = await getSaleVehicle(itemId);
      vehicleId = String(vehicle.id);
    } else if (type === "TOUR") {
      if (!itemId) throw new Error("INVALID_TOUR");
      const tour = await getTourByIdentifier(itemId);
      tourId = String(tour.id);
    }

    const row = {
      idempotency_key: idempotencyKey,
      booking_type: type,
      vehicle_id: vehicleId,
      tour_id: tourId,
      legacy_item_id: null,
      item_name: itemName,
      image: clean(body?.image, 2048) || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_user_id: customer?.id || null,
      customer_linked_at: customer ? new Date().toISOString() : null,
      start_at: startAt,
      end_at: endAt,
      pickup_branch_id: pickupBranchId,
      pickup_location: clean(body?.pickupLocation, 240) || null,
      dropoff_location: clean(body?.dropoffLocation, 240) || null,
      person_count: integerValue(body?.personCount, 1, 100),
      with_driver: Boolean(body?.withDriver),
      base_price: basePrice,
      total_price: totalPrice,
      currency,
      days,
      rental_hours: rentalHoursValue,
      rental_duration: rentalDurationValue,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: "PENDING",
      source: "WEB",
      notes: clean(body?.notes, 4000) || null,
      customer_locale: clean(body?.customerLocale || body?.locale, 10) || "tr",
      campaign_id: campaignId,
      discount_amount: discountAmount,
      metadata,
    };

    const insertResponse = await db("bookings?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });

    if (!insertResponse.ok) {
      const detail = (await insertResponse.text()).slice(0, 600);
      console.error("Booking insert failed", insertResponse.status, detail);
      if (detail.includes("bookings_no_approved_rental_overlap") || detail.includes("23P01")) {
        return json({
          ok: false,
          code: "VEHICLE_UNAVAILABLE",
          message: "Bu araç seçilen zaman aralığında artık müsait değil.",
        }, 409);
      }
      return json({
        ok: false,
        code: "BOOKING_CREATE_FAILED",
        message: "Talep kaydı şu anda oluşturulamadı. Lütfen tekrar deneyin.",
      }, 500);
    }

    const rows = await insertResponse.json();
    const saved = rows[0];
    const notification = await notify(saved.id, "booking_created");
    return json({ ok: true, booking: toApi(saved), notification }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_BOOKING";
    const status = code === "VEHICLE_UNAVAILABLE"
      ? 409
      : code === "CUSTOMER_ACCOUNT_BLOCKED"
      ? 403
      : code === "BOOKINGS_DISABLED"
      ? 503
      : code === "HOURLY_RENTAL_NOT_ALLOWED" ||
          code === "INVALID_HOURLY_RENTAL" ||
          code.startsWith("INVALID_") ||
          code === "DRIVER_OPTION_NOT_ALLOWED"
      ? 400
      : 500;

    const message = code === "VEHICLE_UNAVAILABLE"
      ? "Bu araç seçilen zaman aralığında artık müsait değil."
      : code === "DRIVER_OPTION_NOT_ALLOWED"
      ? "Bu araç seçilen sürücü tercihiyle sunulmuyor."
      : code === "INVALID_RENTAL_VEHICLE"
      ? "Seçtiğiniz kiralık araç bulunamadı veya şu anda rezervasyona açık değil."
      : code === "INVALID_SALE_VEHICLE"
      ? "Seçtiğiniz satılık araç bulunamadı veya artık satış talebine açık değil."
      : code === "INVALID_TOUR"
      ? "Seçtiğiniz tur bulunamadı veya şu anda rezervasyona açık değil."
      : code === "INVALID_RENTAL_DATES"
      ? "Teslim alma ve iade tarihlerini kontrol edin."
      : code === "INVALID_HOURLY_RENTAL"
      ? "Saatlik kiralama tarih ve saatlerini kontrol edin."
      : code === "HOURLY_RENTAL_NOT_ALLOWED"
      ? "Bu araç için saatlik kiralama kullanılamıyor."
      : code === "INVALID_PHONE"
      ? "Telefon numarasını kontrol edin."
      : code === "CUSTOMER_ACCOUNT_BLOCKED"
      ? "Bu müşteri hesabı yönetim tarafından işleme kapatılmış."
      : status === 400
      ? "Talep bilgilerini kontrol edin."
      : "Talep şu anda kaydedilemedi.";

    return json({ ok: false, code, message }, status);
  }
}

async function listBookings(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const response = await db("bookings?deleted_at=is.null&select=*&order=created_at.desc&limit=500");
    if (!response.ok) throw new Error("BOOKING_LIST_FAILED");
    const rows = await response.json();
    return json({ ok: true, bookings: rows.map(toApi) });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    return json({ ok: false, code }, code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500);
  }
}

async function patchBooking(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

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
      if (!["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {
        throw new Error("INVALID_STATUS");
      }

      if (
        status === "APPROVED" &&
        existing.booking_type === "RENTAL" &&
        existing.vehicle_id &&
        existing.start_at &&
        existing.end_at &&
        await hasApprovedOverlap(existing.vehicle_id, existing.start_at, existing.end_at, existing.id)
      ) {
        return json({
          ok: false,
          code: "VEHICLE_UNAVAILABLE",
          message: "Aynı araç için bu zaman aralığında başka bir onaylı rezervasyon var.",
        }, 409);
      }

      update = { status };
      event = eventForStatus(status);
    } else if (operation === "payment") {
      const paymentStatus = required(body?.paymentStatus, "paymentStatus", 30);
      if (!["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED"].includes(paymentStatus)) {
        throw new Error("INVALID_PAYMENT_STATUS");
      }
      update = {
        payment_status: paymentStatus,
        external_payment_reference: clean(body?.externalPaymentReference, 200) || null,
      };
    } else {
      throw new Error("INVALID_OPERATION");
    }

    const response = await db(`bookings?id=eq.${encodeURIComponent(existing.id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(update),
    });
    if (!response.ok) throw new Error("BOOKING_UPDATE_FAILED");

    const rows = await response.json();
    const saved = rows[0];
    await audit(admin, `booking_${operation}_updated`, saved, existing, saved);
    const notification = event ? await notify(saved.id, event) : undefined;
    return json({ ok: true, booking: toApi(saved), notification });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BOOKING_UPDATE_FAILED";
    const status = code === "UNAUTHORIZED"
      ? 401
      : code === "FORBIDDEN"
      ? 403
      : code.startsWith("INVALID_")
      ? 400
      : 500;
    return json({ ok: false, code }, status);
  }
}

async function deleteBooking(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  try {
    const admin = await requireAdmin(request);
    if (!["owner", "admin"].includes(admin.role)) {
      return json({ ok: false, code: "FORBIDDEN" }, 403);
    }

    const reference = required(body?.id, "id", 80);
    const existing = await findByReference(reference);
    if (!existing) return json({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);

    const now = new Date().toISOString();
    const response = await db(`bookings?id=eq.${encodeURIComponent(existing.id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ deleted_at: now, deleted_by: admin.id, status: "CANCELLED" }),
    });
    if (!response.ok) throw new Error("BOOKING_ARCHIVE_FAILED");

    const rows = await response.json();
    await audit(admin, "booking_archived", rows[0] || existing, existing, rows[0] || null);
    await notify(existing.id, "booking_cancelled");
    return json({ ok: true, archived: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "BOOKING_ARCHIVE_FAILED";
    return json(
      { ok: false, code },
      code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  }
  if (request.method === "POST") return createBooking(request);
  if (request.method === "GET") return listBookings(request);
  if (request.method === "PATCH") return patchBooking(request);
  if (request.method === "DELETE") return deleteBooking(request);
  return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
});
