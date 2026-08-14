import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type ChannelState = "sent" | "skipped" | "not_configured" | "failed";
type EventName = "booking_created" | "booking_pending" | "booking_approved" | "booking_rejected" | "booking_completed" | "booking_cancelled";

interface ChannelReport {
  state: ChannelState;
  providerMessageId?: string;
  reason?: string;
}

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

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const serviceHeaders = () => ({
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
});

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function jwtRole(request: Request): string {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    return String(parsed.role || "");
  } catch {
    return "";
  }
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

function formatDate(value: string | null, locale: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale, {
    dateStyle: "medium",
    timeStyle: value.includes("T") && !value.endsWith("T00:00:00.000Z") ? "short" : undefined,
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatMoney(value: number | null, currency: string, locale: string): string {
  if (value === null || !Number.isFinite(Number(value))) return "-";
  try {
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
}

const dictionary: Record<string, Record<string, string>> = {
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
    date: "Başlangıç",
    endDate: "Bitiş",
    total: "Toplam",
    payment: "Ödeme durumu",
    status: "Durum",
    next_created: "Ekibimiz talebinizi inceleyip sizinle iletişime geçecektir.",
    next_approved: "Lütfen rezervasyon bilgilerinizi kontrol edin. Gerekli ek bilgiler için ekibimiz sizinle iletişim kurabilir.",
    next_rejected: "Detay veya alternatif seçenekler için bizimle iletişime geçebilirsiniz.",
    next_completed: "Bizi tercih ettiğiniz için teşekkür ederiz.",
    next_cancelled: "Yeni bir tarih veya alternatif hizmet için bizimle iletişime geçebilirsiniz.",
    next_pending: "Talebiniz değerlendirme sırasındadır.",
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
    date: "Start",
    endDate: "End",
    total: "Total",
    payment: "Payment status",
    status: "Status",
    next_created: "Our team will review your request and contact you.",
    next_approved: "Please review your reservation details. Our team may contact you if additional information is required.",
    next_rejected: "You can contact us for details or alternative options.",
    next_completed: "Thank you for choosing us.",
    next_cancelled: "Contact us for a new date or an alternative service.",
    next_pending: "Your request is currently under review.",
  },
  de: {
    booking_created: "Ihre Anfrage wurde erfolgreich empfangen",
    booking_pending: "Ihre Anfrage wird geprüft",
    booking_approved: "Ihre Reservierung wurde bestätigt",
    booking_rejected: "Aktualisierung zu Ihrer Anfrage",
    booking_completed: "Ihr Vorgang wurde abgeschlossen",
    booking_cancelled: "Ihre Reservierung wurde storniert",
    hello: "Hallo",
    reference: "Referenz",
    service: "Leistung",
    date: "Beginn",
    endDate: "Ende",
    total: "Gesamt",
    payment: "Zahlungsstatus",
    status: "Status",
    next_created: "Unser Team prüft Ihre Anfrage und wird Sie kontaktieren.",
    next_approved: "Bitte prüfen Sie Ihre Reservierungsdaten. Falls nötig, wird unser Team Sie kontaktieren.",
    next_rejected: "Für Details oder Alternativen können Sie uns kontaktieren.",
    next_completed: "Vielen Dank, dass Sie sich für uns entschieden haben.",
    next_cancelled: "Kontaktieren Sie uns für einen neuen Termin oder eine Alternative.",
    next_pending: "Ihre Anfrage wird derzeit geprüft.",
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
    date: "Début",
    endDate: "Fin",
    total: "Total",
    payment: "Statut du paiement",
    status: "Statut",
    next_created: "Notre équipe va examiner votre demande et vous contactera.",
    next_approved: "Veuillez vérifier les détails de votre réservation. Notre équipe pourra vous contacter si nécessaire.",
    next_rejected: "Vous pouvez nous contacter pour plus de détails ou d'autres options.",
    next_completed: "Merci de nous avoir choisis.",
    next_cancelled: "Contactez-nous pour une nouvelle date ou une autre option.",
    next_pending: "Votre demande est actuellement en cours d'examen.",
  },
};

function language(locale: string | null): string {
  const base = clean(locale, 10).toLowerCase().split(/[-_]/)[0];
  return dictionary[base] ? base : "tr";
}

function typeLabel(type: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    tr: { RENTAL: "Araç Kiralama", TOUR: "Tur Rezervasyonu", SALE_INQUIRY: "Araç Satın Alma Talebi", APPOINTMENT: "Randevu Talebi" },
    en: { RENTAL: "Car Rental", TOUR: "Tour Reservation", SALE_INQUIRY: "Vehicle Purchase Inquiry", APPOINTMENT: "Appointment Request" },
    de: { RENTAL: "Autovermietung", TOUR: "Tourreservierung", SALE_INQUIRY: "Fahrzeugkauf-Anfrage", APPOINTMENT: "Terminanfrage" },
    fr: { RENTAL: "Location de voiture", TOUR: "Réservation de circuit", SALE_INQUIRY: "Demande d'achat de véhicule", APPOINTMENT: "Demande de rendez-vous" },
  };
  return labels[lang]?.[type] || type;
}

function eventNext(event: EventName, d: Record<string, string>): string {
  if (event === "booking_created") return d.next_created;
  if (event === "booking_approved") return d.next_approved;
  if (event === "booking_rejected") return d.next_rejected;
  if (event === "booking_completed") return d.next_completed;
  if (event === "booking_cancelled") return d.next_cancelled;
  return d.next_pending;
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

async function loadBooking(id: string): Promise<BookingRow | null> {
  const res = await db(`bookings?id=eq.${encodeURIComponent(id)}&deleted_at=is.null&select=id,reference,booking_type,item_name,customer_name,customer_email,customer_phone,customer_locale,start_at,end_at,total_price,currency,payment_status,status&limit=1`);
  if (!res.ok) throw new Error(`BOOKING_READ_${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] as BookingRow : null;
}

async function loadConfig(): Promise<Record<string, any>> {
  const res = await db("site_config?key=in.(business_profile,social_links,branding)&select=key,value");
  if (!res.ok) return {};
  const rows = await res.json();
  const result: Record<string, any> = {};
  for (const row of Array.isArray(rows) ? rows : []) result[row.key] = row.value || {};
  return result;
}

function buildEmail(booking: BookingRow, event: EventName, config: Record<string, any>, admin = false) {
  const lang = language(booking.customer_locale);
  const d = dictionary[lang];
  const title = admin ? `Alperler Auto | ${typeLabel(booking.booking_type, "tr")} | ${booking.reference}` : d[event];
  const profile = config.business_profile || {};
  const social = config.social_links || {};
  const branding = config.branding || {};
  const contactParts = [profile.phone, profile.email, profile.address, profile.website].filter(Boolean).map((v: string) => escapeHtml(v));
  const socialLinks = Object.entries(social)
    .filter(([, value]) => typeof value === "string" && /^https:\/\//i.test(String(value)))
    .map(([key, value]) => `<a href="${escapeHtml(value)}" style="color:#2563eb;text-decoration:none;margin-right:12px">${escapeHtml(key)}</a>`)
    .join("");
  const greeting = admin ? "Yeni işlem bildirimi" : `${d.hello} ${escapeHtml(booking.customer_name)},`;
  const intro = admin ? `${escapeHtml(booking.customer_name)} tarafından yeni/ güncellenmiş bir işlem bulunmaktadır.` : eventNext(event, d);
  const logo = typeof branding.logoUrl === "string" && /^https:\/\//i.test(branding.logoUrl)
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="Alperler Auto" style="max-height:56px;max-width:220px;margin-bottom:20px" />`
    : `<div style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:20px">Alperler Auto</div>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden"><tr><td style="padding:32px">${logo}<div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563eb">${escapeHtml(typeLabel(booking.booking_type, lang))}</div><h1 style="font-size:28px;line-height:1.2;margin:10px 0 12px">${escapeHtml(title)}</h1><p style="font-size:16px;line-height:1.65;color:#475569;margin:0 0 24px">${greeting}<br>${escapeHtml(intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:14px;padding:8px 0">${[
    [d.reference, booking.reference],
    [d.service, booking.item_name],
    [d.date, formatDate(booking.start_at, lang)],
    [d.endDate, formatDate(booking.end_at, lang)],
    [d.total, formatMoney(booking.total_price, booking.currency, lang)],
    [d.payment, booking.payment_status],
    [d.status, booking.status],
  ].map(([label, value]) => `<tr><td style="padding:10px 16px;color:#64748b;font-size:13px">${escapeHtml(label)}</td><td style="padding:10px 16px;text-align:right;font-weight:700;font-size:14px">${escapeHtml(value)}</td></tr>`).join("")}</table><p style="font-size:14px;line-height:1.6;color:#64748b;margin:24px 0 0">Bu e-posta işlem kaydınıza bağlı otomatik bir bilgilendirmedir.</p></td></tr><tr><td style="background:#0f172a;color:#cbd5e1;padding:24px 32px;font-size:12px;line-height:1.7"><strong style="color:#fff">Alperler Auto</strong>${contactParts.length ? `<br>${contactParts.join(" · ")}` : ""}${socialLinks ? `<div style="margin-top:10px">${socialLinks}</div>` : ""}</td></tr></table></td></tr></table></body></html>`;
  const text = `${title}\n\n${admin ? "" : `${d.hello} ${booking.customer_name},\n`}${intro}\n\n${d.reference}: ${booking.reference}\n${d.service}: ${booking.item_name}\n${d.date}: ${formatDate(booking.start_at, lang)}\n${d.endDate}: ${formatDate(booking.end_at, lang)}\n${d.total}: ${formatMoney(booking.total_price, booking.currency, lang)}\n${d.payment}: ${booking.payment_status}\n${d.status}: ${booking.status}\n\nAlperler Auto`;
  return { subject: title, html, text };
}

function smsText(booking: BookingRow, event: EventName): string {
  const lang = language(booking.customer_locale);
  const d = dictionary[lang];
  return `${d[event]} | ${booking.reference} | ${booking.item_name}. ${eventNext(event, d)} - Alperler Auto`.slice(0, 420);
}

async function sendResend(to: string, mail: { subject: string; html: string; text: string }): Promise<{ id: string }> {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const apiKey = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !apiKey || !from) throw new Error("EMAIL_NOT_CONFIGURED");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
    signal: AbortSignal.timeout(10000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) throw new Error(`EMAIL_SEND_FAILED_${res.status}`);
  return { id: String(body.id) };
}

function normalizePhone(value: string): string | null {
  let v = value.trim().replace(/[^0-9+]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (/^05\d{9}$/.test(v)) v = `+9${v}`;
  else if (/^5\d{9}$/.test(v)) v = `+90${v}`;
  else if (/^90\d{10}$/.test(v)) v = `+${v}`;
  return /^\+[1-9]\d{7,14}$/.test(v) ? v : null;
}

async function sendTwilio(toRaw: string, body: string): Promise<{ id: string }> {
  const provider = clean(Deno.env.get("SMS_PROVIDER"), 30).toLowerCase();
  const sid = clean(Deno.env.get("TWILIO_ACCOUNT_SID"), 200);
  const token = clean(Deno.env.get("TWILIO_AUTH_TOKEN"), 300);
  const from = clean(Deno.env.get("TWILIO_FROM"), 50);
  const messagingSid = clean(Deno.env.get("TWILIO_MESSAGING_SERVICE_SID"), 200);
  if (provider !== "twilio" || !sid || !token || (!from && !messagingSid)) throw new Error("SMS_NOT_CONFIGURED");
  const to = normalizePhone(toRaw);
  if (!to) throw new Error("INVALID_SMS_RECIPIENT");
  const payload = new URLSearchParams({ To: to, Body: body });
  if (messagingSid) payload.set("MessagingServiceSid", messagingSid); else payload.set("From", from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`${sid}:${token}`)}`, "content-type": "application/x-www-form-urlencoded" },
    body: payload,
    signal: AbortSignal.timeout(10000),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.sid) throw new Error(`SMS_SEND_FAILED_${res.status}`);
  return { id: String(result.sid) };
}

async function existingDelivery(bookingId: string, event: string, channel: string): Promise<any | null> {
  const res = await db(`notification_deliveries?booking_id=eq.${encodeURIComponent(bookingId)}&event_key=eq.${encodeURIComponent(event)}&channel=eq.${encodeURIComponent(channel)}&select=id,status,provider_message_id&limit=1`);
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function saveDelivery(input: { bookingId: string; event: string; channel: string; recipient: string; provider: string; state: ChannelState; providerMessageId?: string; reason?: string }) {
  const existing = await existingDelivery(input.bookingId, input.event, input.channel);
  const dbStatus = input.state === "sent" ? "SENT" : input.state === "failed" ? "FAILED" : "SKIPPED";
  const payload = {
    booking_id: input.bookingId,
    event_key: input.event,
    channel: input.channel,
    recipient: input.recipient,
    provider: input.provider,
    provider_message_id: input.providerMessageId || null,
    status: dbStatus,
    attempt_count: (existing?.attempt_count || 0) + 1,
    last_error: input.reason || null,
    sent_at: input.state === "sent" ? new Date().toISOString() : null,
  };
  if (existing?.id) {
    await db(`notification_deliveries?id=eq.${encodeURIComponent(existing.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
  } else {
    await db("notification_deliveries", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
  }
}

async function deliverEmail(to: string | null, booking: BookingRow, event: EventName, config: Record<string, any>, admin = false): Promise<ChannelReport> {
  if (!to) return { state: "skipped", reason: "EMAIL_MISSING" };
  const channel = admin ? "ADMIN_EMAIL" : "EMAIL";
  const prior = await existingDelivery(booking.id, event, channel);
  if (prior && ["SENT", "DELIVERED"].includes(String(prior.status))) return { state: "sent", providerMessageId: prior.provider_message_id || undefined };
  try {
    const result = await sendResend(to, buildEmail(booking, event, config, admin));
    await saveDelivery({ bookingId: booking.id, event, channel, recipient: to, provider: "resend", state: "sent", providerMessageId: result.id });
    return { state: "sent", providerMessageId: result.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "EMAIL_FAILED";
    const state: ChannelState = reason === "EMAIL_NOT_CONFIGURED" ? "not_configured" : "failed";
    await saveDelivery({ bookingId: booking.id, event, channel, recipient: to, provider: "resend", state, reason });
    return { state, reason };
  }
}

async function deliverSms(booking: BookingRow, event: EventName): Promise<ChannelReport> {
  if (!booking.customer_phone) return { state: "skipped", reason: "PHONE_MISSING" };
  const prior = await existingDelivery(booking.id, event, "SMS");
  if (prior && ["SENT", "DELIVERED"].includes(String(prior.status))) return { state: "sent", providerMessageId: prior.provider_message_id || undefined };
  try {
    const result = await sendTwilio(booking.customer_phone, smsText(booking, event));
    await saveDelivery({ bookingId: booking.id, event, channel: "SMS", recipient: booking.customer_phone, provider: "twilio", state: "sent", providerMessageId: result.id });
    return { state: "sent", providerMessageId: result.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "SMS_FAILED";
    const state: ChannelState = reason === "SMS_NOT_CONFIGURED" ? "not_configured" : "failed";
    await saveDelivery({ bookingId: booking.id, event, channel: "SMS", recipient: booking.customer_phone, provider: "twilio", state, reason });
    return { state, reason };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!supabaseUrl || !serviceKey) return response({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (jwtRole(request) !== "service_role") return response({ ok: false, code: "FORBIDDEN" }, 403);

  let payload: any;
  try { payload = await request.json(); } catch { return response({ ok: false, code: "INVALID_JSON" }, 400); }
  const bookingId = clean(payload?.bookingId, 80);
  const event = clean(payload?.event, 40) as EventName;
  const allowedEvents: EventName[] = ["booking_created", "booking_pending", "booking_approved", "booking_rejected", "booking_completed", "booking_cancelled"];
  if (!bookingId || !allowedEvents.includes(event)) return response({ ok: false, code: "INVALID_NOTIFICATION_REQUEST" }, 400);

  try {
    const booking = await loadBooking(bookingId);
    if (!booking) return response({ ok: false, code: "BOOKING_NOT_FOUND" }, 404);
    const config = await loadConfig();
    const adminTo = clean(Deno.env.get("MAIL_ADMIN_TO"), 240) || clean(config.business_profile?.email, 240) || null;
    const [email, sms, adminEmail] = await Promise.all([
      deliverEmail(booking.customer_email, booking, event, config, false),
      deliverSms(booking, event),
      deliverEmail(adminTo, booking, event, config, true),
    ]);
    return response({ ok: email.state === "sent" || sms.state === "sent" || adminEmail.state === "sent", bookingId, event, email, sms, adminEmail });
  } catch (error) {
    console.error("booking-notify failed", error);
    return response({ ok: false, code: "NOTIFICATION_WORKER_FAILED" }, 500);
  }
});
