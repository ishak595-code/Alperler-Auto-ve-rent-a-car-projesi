import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type EventName =
  | "booking_created"
  | "booking_pending"
  | "booking_approved"
  | "booking_rejected"
  | "booking_completed"
  | "booking_cancelled";
type Channel = "EMAIL" | "SMS" | "ADMIN_EMAIL";
type ChannelState = "sent" | "skipped" | "not_configured" | "failed";

interface BookingRow {
  id: string;
  reference: string;
  booking_type: string;
  item_name: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_locale: string | null;
  start_at: string | null;
  end_at: string | null;
  total_price: number | null;
  currency: string;
  payment_status: string;
  status: string;
}
interface ChannelReport {
  state: ChannelState;
  providerMessageId?: string;
  reason?: string;
}
interface DeliveryLease {
  acquired: boolean;
  id?: string;
  priorMessageId?: string;
}

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EVENTS: EventName[] = [
  "booking_created",
  "booking_pending",
  "booking_approved",
  "booking_rejected",
  "booking_completed",
  "booking_cancelled",
];

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
  });
}
function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
  });
}
function language(locale: string | null): "tr" | "en" | "de" | "fr" {
  const value = clean(locale, 10).toLowerCase().split(/[-_]/)[0];
  return value === "en" || value === "de" || value === "fr" ? value : "tr";
}

const copy = {
  tr: {
    booking_created: "Talebiniz başarıyla alındı",
    booking_pending: "Talebiniz inceleniyor",
    booking_approved: "Rezervasyonunuz onaylandı",
    booking_rejected: "Talebiniz hakkında güncelleme",
    booking_completed: "İşleminiz tamamlandı",
    booking_cancelled: "Rezervasyonunuz iptal edildi",
    hello: "Merhaba",
    reference: "Referans",
    service: "Hizmet",
    start: "Başlangıç",
    end: "Bitiş",
    total: "Toplam",
    payment: "Ödeme durumu",
    status: "Durum",
    next: "Ekibimiz gerekli olduğunda sizinle iletişime geçecektir.",
  },
  en: {
    booking_created: "We received your request",
    booking_pending: "Your request is being reviewed",
    booking_approved: "Your reservation is approved",
    booking_rejected: "Update about your request",
    booking_completed: "Your request is completed",
    booking_cancelled: "Your reservation is cancelled",
    hello: "Hello",
    reference: "Reference",
    service: "Service",
    start: "Start",
    end: "End",
    total: "Total",
    payment: "Payment status",
    status: "Status",
    next: "Our team will contact you if any additional information is required.",
  },
  de: {
    booking_created: "Ihre Anfrage wurde empfangen",
    booking_pending: "Ihre Anfrage wird geprüft",
    booking_approved: "Ihre Reservierung wurde bestätigt",
    booking_rejected: "Aktualisierung zu Ihrer Anfrage",
    booking_completed: "Ihr Vorgang wurde abgeschlossen",
    booking_cancelled: "Ihre Reservierung wurde storniert",
    hello: "Hallo",
    reference: "Referenz",
    service: "Leistung",
    start: "Beginn",
    end: "Ende",
    total: "Gesamt",
    payment: "Zahlungsstatus",
    status: "Status",
    next: "Unser Team kontaktiert Sie, falls weitere Informationen benötigt werden.",
  },
  fr: {
    booking_created: "Votre demande a bien été reçue",
    booking_pending: "Votre demande est en cours d'examen",
    booking_approved: "Votre réservation est confirmée",
    booking_rejected: "Mise à jour concernant votre demande",
    booking_completed: "Votre demande est terminée",
    booking_cancelled: "Votre réservation est annulée",
    hello: "Bonjour",
    reference: "Référence",
    service: "Service",
    start: "Début",
    end: "Fin",
    total: "Total",
    payment: "Statut du paiement",
    status: "Statut",
    next: "Notre équipe vous contactera si des informations supplémentaires sont nécessaires.",
  },
} as const;

function typeLabel(type: string, lang: "tr" | "en" | "de" | "fr"): string {
  const labels = {
    tr: { RENTAL: "Araç Kiralama", TOUR: "Tur Rezervasyonu", SALE_INQUIRY: "Araç Satın Alma Talebi", APPOINTMENT: "Randevu Talebi" },
    en: { RENTAL: "Car Rental", TOUR: "Tour Reservation", SALE_INQUIRY: "Vehicle Purchase Inquiry", APPOINTMENT: "Appointment Request" },
    de: { RENTAL: "Autovermietung", TOUR: "Tourreservierung", SALE_INQUIRY: "Fahrzeugkauf-Anfrage", APPOINTMENT: "Terminanfrage" },
    fr: { RENTAL: "Location de voiture", TOUR: "Réservation de circuit", SALE_INQUIRY: "Demande d'achat de véhicule", APPOINTMENT: "Demande de rendez-vous" },
  } as const;
  return (labels[lang] as Record<string, string>)[type] || type;
}
function formatDate(value: string | null, lang: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : lang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}
function formatMoney(value: number | null, currency: string, lang: string): string {
  if (value === null || !Number.isFinite(Number(value))) return "-";
  try {
    return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : lang, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

async function bookingById(id: string): Promise<BookingRow | null> {
  const response = await db(
    `bookings?id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=id,reference,booking_type,item_name,customer_name,customer_email,customer_phone,customer_locale,start_at,end_at,total_price,currency,payment_status,status&limit=1`,
  );
  if (!response.ok) throw new Error(`BOOKING_READ_${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows[0] ? (rows[0] as BookingRow) : null;
}
async function siteConfig(): Promise<Record<string, any>> {
  const response = await db("site_config?key=in.(business_profile,social_links,branding)&select=key,value");
  if (!response.ok) return {};
  const rows = await response.json();
  const result: Record<string, any> = {};
  for (const row of Array.isArray(rows) ? rows : []) result[row.key] = row.value || {};
  return result;
}

function buildMail(booking: BookingRow, event: EventName, config: Record<string, any>, admin: boolean) {
  const lang = language(booking.customer_locale);
  const text = copy[lang];
  const subject = admin
    ? `Alperler Auto | ${typeLabel(booking.booking_type, "tr")} | ${booking.reference}`
    : text[event];
  const profile = config.business_profile || {};
  const branding = config.branding || {};
  const social = config.social_links || {};
  const contact = [profile.phone, profile.email, profile.address, profile.website]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const socialLinks = Object.entries(social)
    .filter(([, value]) => typeof value === "string" && /^https:\/\//i.test(String(value)))
    .map(([name, value]) => `<a href="${escapeHtml(value)}" style="color:#93c5fd;text-decoration:none;margin-right:12px">${escapeHtml(name)}</a>`)
    .join("");
  const logo = typeof branding.logoUrl === "string" && /^https:\/\//i.test(branding.logoUrl)
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="Alperler Auto" style="max-height:58px;max-width:220px;margin-bottom:20px" />`
    : `<div style="font-size:24px;font-weight:800;margin-bottom:20px">Alperler Auto</div>`;
  const rows = [
    [text.reference, booking.reference],
    [text.service, booking.item_name],
    [text.start, formatDate(booking.start_at, lang)],
    [text.end, formatDate(booking.end_at, lang)],
    [text.total, formatMoney(booking.total_price, booking.currency, lang)],
    [text.payment, booking.payment_status],
    [text.status, booking.status],
  ];
  const intro = admin
    ? `${escapeHtml(booking.customer_name)} için işlem kaydı oluşturuldu veya güncellendi.`
    : `${text.hello} ${escapeHtml(booking.customer_name)}, ${text.next}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden"><tr><td style="padding:32px">${logo}<div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563eb">${escapeHtml(typeLabel(booking.booking_type, lang))}</div><h1 style="font-size:28px;line-height:1.2;margin:10px 0 14px">${escapeHtml(subject)}</h1><p style="font-size:16px;line-height:1.65;color:#475569">${intro}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:14px">${rows.map(([label, value]) => `<tr><td style="padding:10px 16px;color:#64748b;font-size:13px">${escapeHtml(label)}</td><td style="padding:10px 16px;text-align:right;font-weight:700;font-size:14px">${escapeHtml(value)}</td></tr>`).join("")}</table></td></tr><tr><td style="background:#0f172a;color:#cbd5e1;padding:24px 32px;font-size:12px;line-height:1.7"><strong style="color:#fff">Alperler Auto</strong>${contact ? `<br>${contact}` : ""}${socialLinks ? `<div style="margin-top:10px">${socialLinks}</div>` : ""}</td></tr></table></td></tr></table></body></html>`;
  const plain = `${subject}\n\n${intro}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nAlperler Auto`;
  return { subject, html, text: plain };
}

function normalizePhone(value: string): string | null {
  let phone = value.trim().replace(/[^0-9+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (/^05\d{9}$/.test(phone)) phone = `+9${phone}`;
  else if (/^5\d{9}$/.test(phone)) phone = `+90${phone}`;
  else if (/^90\d{10}$/.test(phone)) phone = `+${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

async function acquire(bookingId: string, event: EventName, channel: Channel, recipient: string): Promise<DeliveryLease> {
  const query = `notification_deliveries?booking_id=eq.${encodeURIComponent(bookingId)}&event_key=eq.${encodeURIComponent(event)}&channel=eq.${channel}&select=id,status,provider_message_id,attempt_count&limit=1`;
  let response = await db(query);
  if (!response.ok) throw new Error("DELIVERY_STATE_READ_FAILED");
  let rows = await response.json();
  const existing = Array.isArray(rows) ? rows[0] : null;
  if (existing && ["SENT", "DELIVERED", "PROCESSING"].includes(String(existing.status))) {
    return { acquired: false, priorMessageId: existing.provider_message_id || undefined };
  }
  if (existing?.id) {
    response = await db(`notification_deliveries?id=eq.${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "PROCESSING", attempt_count: Number(existing.attempt_count || 0) + 1, last_error: null }),
    });
    if (!response.ok) throw new Error("DELIVERY_LEASE_UPDATE_FAILED");
    return { acquired: true, id: existing.id };
  }
  response = await db("notification_deliveries?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ booking_id: bookingId, event_key: event, channel, recipient, status: "PROCESSING", attempt_count: 1 }),
  });
  if (response.status === 409) return { acquired: false };
  if (!response.ok) throw new Error("DELIVERY_LEASE_CREATE_FAILED");
  rows = await response.json();
  return { acquired: true, id: rows?.[0]?.id };
}
async function finish(id: string | undefined, state: ChannelState, provider: string, messageId?: string, reason?: string): Promise<void> {
  if (!id) return;
  const status = state === "sent" ? "SENT" : state === "failed" ? "FAILED" : "SKIPPED";
  await db(`notification_deliveries?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status,
      provider,
      provider_message_id: messageId || null,
      last_error: reason || null,
      sent_at: state === "sent" ? new Date().toISOString() : null,
    }),
  });
}

async function emailChannel(to: string | null, booking: BookingRow, event: EventName, config: Record<string, any>, admin: boolean): Promise<ChannelReport> {
  if (!to) return { state: "skipped", reason: "EMAIL_MISSING" };
  const channel: Channel = admin ? "ADMIN_EMAIL" : "EMAIL";
  const lease = await acquire(booking.id, event, channel, to);
  if (!lease.acquired) return { state: "sent", providerMessageId: lease.priorMessageId };
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const key = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !key || !from) {
    await finish(lease.id, "not_configured", "resend", undefined, "EMAIL_NOT_CONFIGURED");
    return { state: "not_configured", reason: "EMAIL_NOT_CONFIGURED" };
  }
  try {
    const mail = buildMail(booking, event, config, admin);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
    await finish(lease.id, "sent", "resend", String(result.id));
    return { state: "sent", providerMessageId: String(result.id) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    await finish(lease.id, "failed", "resend", undefined, reason);
    return { state: "failed", reason };
  }
}

async function smsChannel(booking: BookingRow, event: EventName): Promise<ChannelReport> {
  const to = normalizePhone(booking.customer_phone);
  if (!to) return { state: "skipped", reason: "PHONE_MISSING_OR_INVALID" };
  const lease = await acquire(booking.id, event, "SMS", to);
  if (!lease.acquired) return { state: "sent", providerMessageId: lease.priorMessageId };
  const provider = clean(Deno.env.get("SMS_PROVIDER"), 30).toLowerCase();
  const sid = clean(Deno.env.get("TWILIO_ACCOUNT_SID"), 200);
  const token = clean(Deno.env.get("TWILIO_AUTH_TOKEN"), 300);
  const from = clean(Deno.env.get("TWILIO_FROM"), 50);
  const messagingSid = clean(Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"), 200);
  if (provider !== "twilio" || !sid || !token || (!from && !messagingSid)) {
    await finish(lease.id, "not_configured", "twilio", undefined, "SMS_NOT_CONFIGURED");
    return { state: "not_configured", reason: "SMS_NOT_CONFIGURED" };
  }
  const lang = language(booking.customer_locale);
  const body = `${copy[lang][event]} | ${booking.reference} | ${booking.item_name}. ${copy[lang].next} - Alperler Auto`.slice(0, 420);
  try {
    const payload = new URLSearchParams({ To: to, Body: body });
    if (messagingSid) payload.set("MessagingServiceSid", messagingSid);
    else payload.set("From", from);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { authorization: `Basic ${btoa(`${sid}:${token}`)}`, "content-type": "application/x-www-form-urlencoded" },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.sid) throw new Error(`SMS_SEND_FAILED_${response.status}`);
    await finish(lease.id, "sent", "twilio", String(result.sid));
    return { state: "sent", providerMessageId: String(result.sid) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SMS_SEND_FAILED";
    await finish(lease.id, "failed", "twilio", undefined, reason);
    return { state: "failed", reason };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (request.headers.get("authorization") !== `Bearer ${SERVICE_KEY}`) {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }

  let input: any;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }
  const bookingId = clean(input?.bookingId, 80);
  const event = clean(input?.event, 40) as EventName;
  if (!bookingId || !EVENTS.includes(event)) return json({ ok: false, code: "INVALID_NOTIFICATION_REQUEST" }, 400);

  try {
    const booking = await bookingById(bookingId);
    if (!booking) return json({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);
    const config = await siteConfig();
    const adminTo = clean(Deno.env.get("MAIL_ADMIN_TO"), 240) || clean(config.business_profile?.email, 240) || null;
    const [email, sms, adminEmail] = await Promise.all([
      emailChannel(booking.customer_email, booking, event, config, false),
      smsChannel(booking, event),
      emailChannel(adminTo, booking, event, config, true),
    ]);
    return json({
      ok: email.state === "sent" || sms.state === "sent" || adminEmail.state === "sent",
      bookingId,
      event,
      email,
      sms,
      adminEmail,
    });
  } catch (error) {
    console.error("booking-notify failed", error);
    return json({ ok: false, code: "NOTIFICATION_WORKER_FAILED" }, 500);
  }
});
