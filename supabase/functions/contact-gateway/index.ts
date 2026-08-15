import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } });
}
function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function esc(value: unknown): string { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function headers(extra: Record<string, string> = {}) { return { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...extra }; }
async function db(path: string, init: RequestInit = {}) { return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } }); }
async function digest(value: string): Promise<string> { const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(raw)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function rate(key: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", { method: "POST", body: JSON.stringify({ p_key_hash: key, p_scope: scope, p_window_seconds: seconds, p_limit: limit }) });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}
async function runtimeAllowed(operation: "CONTACT"): Promise<boolean> {
  const response = await db("rpc/runtime_operation_allowed", { method: "POST", body: JSON.stringify({ p_operation: operation }) });
  if (!response.ok) throw new Error("RUNTIME_CONTROL_CHECK_FAILED");
  return Boolean(await response.json());
}
async function config(): Promise<Record<string, any>> {
  const response = await db("site_config?key=in.(business_profile,social_links,branding)&select=key,value");
  if (!response.ok) return {};
  const rows = await response.json();
  const result: Record<string, any> = {};
  for (const row of Array.isArray(rows) ? rows : []) result[row.key] = row.value || {};
  return result;
}
async function recordDelivery(contactId: string, channel: "EMAIL" | "ADMIN_EMAIL", recipient: string, state: "SENT" | "FAILED" | "SKIPPED", provider: string, messageId?: string, error?: string) {
  await db("notification_deliveries", {
    method: "POST",
    headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify({ contact_message_id: contactId, event_key: "contact_received", channel, recipient, provider, provider_message_id: messageId || null, status: state, attempt_count: 1, last_error: error || null, sent_at: state === "SENT" ? new Date().toISOString() : null }),
  }).catch(() => undefined);
}
async function sendMail(to: string, subject: string, html: string, text: string): Promise<{ state: string; id?: string; reason?: string }> {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const apiKey = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !apiKey || !from) return { state: "not_configured", reason: "EMAIL_NOT_CONFIGURED" };
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html, text }), signal: AbortSignal.timeout(10_000) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.id) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
    return { state: "sent", id: String(body.id) };
  } catch (error) { return { state: "failed", reason: error instanceof Error ? error.message : "EMAIL_SEND_FAILED" }; }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 24_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

  let input: any;
  try { input = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  if (clean(input?.website, 200)) return json({ ok: true, accepted: true }, 202);

  const name = clean(input?.name, 80);
  const surname = clean(input?.surname, 80);
  const phone = clean(input?.phone, 40);
  const email = clean(input?.email, 160).toLowerCase();
  const message = clean(input?.message, 4000);
  const idempotencyKey = clean(input?.idempotencyKey, 120) || crypto.randomUUID();
  if (!name || !surname || !message) return json({ ok: false, code: "MISSING_REQUIRED_FIELDS" }, 400);
  if (!/^[+0-9()\s-]{7,24}$/.test(phone)) return json({ ok: false, code: "INVALID_PHONE" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, code: "INVALID_EMAIL" }, 400);

  try {
    if (!(await runtimeAllowed("CONTACT"))) return json({ ok: false, code: "SERVICE_TEMPORARILY_UNAVAILABLE", message: "İletişim formu kısa süreliğine bakımda. Lütfen daha sonra tekrar deneyin." }, 503);

    const ip = clean(request.headers.get("x-client-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown", 100);
    const network = await digest(`${ip}|${clean(request.headers.get("user-agent"), 300)}`);
    const contact = await digest(email);
    if (!(await rate(network, "contact_network_minute", 60, 5)) || !(await rate(network, "contact_network_hour", 3600, 20)) || !(await rate(contact, "contact_email_day", 86400, 10))) {
      return json({ ok: false, code: "RATE_LIMITED", message: "Çok fazla mesaj gönderildi. Lütfen daha sonra tekrar deneyin." }, 429);
    }

    const duplicate = await db(`contact_messages?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id,reference&limit=1`);
    if (duplicate.ok) {
      const rows = await duplicate.json();
      if (Array.isArray(rows) && rows[0]) return json({ ok: true, stored: true, duplicate: true, reference: rows[0].reference });
    }

    const insert = await db("contact_messages?select=id,reference", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ idempotency_key: idempotencyKey, name: `${name} ${surname}`.trim(), email, phone, subject: "Web İletişim Formu", message, source: "WEB", status: "NEW" }),
    });
    if (!insert.ok) return json({ ok: false, code: "CONTACT_STORE_FAILED" }, 500);
    const saved = (await insert.json())[0];
    const settings = await config();
    const profile = settings.business_profile || {};
    const adminTo = clean(Deno.env.get("MAIL_ADMIN_TO"), 240) || clean(profile.email, 240);
    const footer = [profile.phone, profile.email, profile.address, profile.website].filter(Boolean).map(esc).join(" · ");
    const adminMail = adminTo
      ? await sendMail(adminTo, `Yeni İletişim Mesajı | ${saved.reference}`, `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Yeni iletişim mesajı</h2><p><strong>Referans:</strong> ${esc(saved.reference)}</p><p><strong>Ad Soyad:</strong> ${esc(`${name} ${surname}`)}</p><p><strong>Telefon:</strong> ${esc(phone)}</p><p><strong>E-posta:</strong> ${esc(email)}</p><hr><p>${esc(message).replaceAll("\n", "<br>")}</p>${footer ? `<hr><small>${footer}</small>` : ""}</div>`, `Yeni iletişim mesajı\nReferans: ${saved.reference}\nAd Soyad: ${name} ${surname}\nTelefon: ${phone}\nE-posta: ${email}\n\n${message}`)
      : { state: "not_configured", reason: "ADMIN_EMAIL_MISSING" };
    const customerMail = await sendMail(email, `Mesajınız Alındı | ${saved.reference} | Alperler Auto`, `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Mesajınız alındı</h2><p>Sayın ${esc(`${name} ${surname}`)},</p><p>Mesajınız güvenli şekilde kaydedildi. Referans numaranız <strong>${esc(saved.reference)}</strong>. Ekibimiz gerekli olduğunda sizinle iletişime geçecektir.</p>${footer ? `<hr><small>${footer}</small>` : ""}<p><strong>Alperler Auto</strong></p></div>`, `Sayın ${name} ${surname},\n\nMesajınız güvenli şekilde kaydedildi. Referans: ${saved.reference}.\n\nAlperler Auto`);
    await Promise.all([
      recordDelivery(saved.id, "ADMIN_EMAIL", adminTo || "", adminMail.state === "sent" ? "SENT" : adminMail.state === "failed" ? "FAILED" : "SKIPPED", "resend", adminMail.id, adminMail.reason),
      recordDelivery(saved.id, "EMAIL", email, customerMail.state === "sent" ? "SENT" : customerMail.state === "failed" ? "FAILED" : "SKIPPED", "resend", customerMail.id, customerMail.reason),
    ]);
    return json({ ok: true, stored: true, reference: saved.reference, delivery: { adminEmail: adminMail, customerEmail: customerMail } }, 201);
  } catch (error) {
    console.error("contact-gateway failed", error);
    return json({ ok: false, code: "CONTACT_GATEWAY_FAILED" }, 500);
  }
});
