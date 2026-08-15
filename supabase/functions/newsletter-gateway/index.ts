import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const WELCOME_CAMPAIGN_ID = "eeeeeeee-0000-4000-8000-000000000001";

const allowedOrigin = (origin: string): string => {
  if (!origin) return "*";
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host === "alperrentacar.online" || host === "www.alperrentacar.online" || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) return origin;
  } catch { /* reject below */ }
  return "null";
};
function responseHeaders(request: Request): HeadersInit { return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": allowedOrigin(request.headers.get("origin") || ""), "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" }; }
function json(request: Request, body: unknown, status = 200): Response { return Response.json(body, { status, headers: responseHeaders(request) }); }
function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
async function digest(value: string): Promise<string> { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function consume(keyHash: string, scope: string, windowSeconds: number, limit: number): Promise<boolean> { const { data, error } = await supabase.rpc("consume_rate_limit", { p_key_hash: keyHash, p_scope: scope, p_window_seconds: windowSeconds, p_limit: limit }); if (error) throw error; return Boolean(data); }
async function siteSettings(): Promise<Record<string, unknown>> { const { data } = await supabase.from("site_config").select("value").eq("key", "site_settings").maybeSingle(); return data?.value && typeof data.value === "object" ? data.value as Record<string, unknown> : {}; }
function unsubscribeUrl(token: string): string { return `${URL}/functions/v1/newsletter-gateway?unsubscribe=${encodeURIComponent(token)}`; }
function welcomeHtml(email: string, token: string, settings: Record<string, unknown>): string {
  const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const phone = clean(settings["phone"], 80), businessEmail = clean(settings["email"], 200), address = clean(settings["address"], 300), whatsapp = clean(settings["whatsapp"], 80);
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden"><tr><td style="padding:34px"><div style="font-size:12px;font-weight:800;letter-spacing:.16em;color:#2563eb;text-transform:uppercase">ALPERLER AUTO</div><h1 style="font-size:28px;line-height:1.25;margin:10px 0 18px">Bültenimize hoş geldiniz</h1><p style="font-size:16px;line-height:1.75;color:#475569">Aboneliğiniz başarıyla alındı. Kampanyalı araçlar, yeni ilanlar, tur fırsatları ve önemli duyurular olduğunda sizi bilgilendireceğiz.</p><div style="margin:24px 0;padding:18px;border-radius:16px;background:#eff6ff;color:#1e3a8a;font-weight:700">Kayıtlı e-posta: ${esc(email)}</div></td></tr><tr><td style="background:#0f172a;color:#cbd5e1;padding:24px 32px;font-size:12px;line-height:1.7"><strong style="color:#fff;font-size:14px">Alperler Auto</strong>${phone ? `<br>Telefon / WhatsApp: ${esc(phone)}` : ""}${businessEmail ? `<br>E-posta: ${esc(businessEmail)}` : ""}${address ? `<br>${esc(address)}` : ""}${whatsapp ? `<br><a href="https://wa.me/${esc(whatsapp)}" style="color:#93c5fd">WhatsApp'tan iletişime geç</a>` : ""}<br><a href="${unsubscribeUrl(token)}" style="color:#93c5fd">Abonelikten çık</a></td></tr></table></td></tr></table></body></html>`;
}
async function sendWelcome(subscriber: { id: string; email: string; unsubscribe_token: string }, settings: Record<string, unknown>): Promise<{ state: string; reason?: string; providerMessageId?: string }> {
  const { data: existing } = await supabase.from("newsletter_deliveries").select("id,status,provider_message_id,attempt_count").eq("campaign_id", WELCOME_CAMPAIGN_ID).eq("email", subscriber.email).maybeSingle();
  if (existing?.status === "SENT" || existing?.status === "DELIVERED") return { state: "sent", providerMessageId: existing.provider_message_id || undefined };
  const attempt = Number(existing?.attempt_count || 0) + 1; let deliveryId = existing?.id || null;
  if (!deliveryId) { const { data, error } = await supabase.from("newsletter_deliveries").insert({ campaign_id: WELCOME_CAMPAIGN_ID, subscriber_id: subscriber.id, email: subscriber.email, status: "PROCESSING", attempt_count: attempt, metadata: { event: "newsletter_subscribed" } }).select("id").single(); if (error) return { state: "failed", reason: "WELCOME_DELIVERY_CREATE_FAILED" }; deliveryId = data.id; }
  else await supabase.from("newsletter_deliveries").update({ status: "PROCESSING", attempt_count: attempt, last_error: null, updated_at: new Date().toISOString() }).eq("id", deliveryId);
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase(), key = clean(Deno.env.get("RESEND_API_KEY"), 500), from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !key || !from) { await supabase.from("newsletter_deliveries").update({ status: "SKIPPED", provider: "resend", last_error: "EMAIL_NOT_CONFIGURED", updated_at: new Date().toISOString() }).eq("id", deliveryId); return { state: "not_configured", reason: "EMAIL_NOT_CONFIGURED" }; }
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [subscriber.email], subject: "Alperler Auto bültenine hoş geldiniz", html: welcomeHtml(subscriber.email, subscriber.unsubscribe_token, settings), text: "Aboneliğiniz başarıyla alındı. Kampanyalar, yeni araçlar ve tur fırsatları için sizi bilgilendireceğiz. - Alperler Auto" }), signal: AbortSignal.timeout(10_000) });
    const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.id) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
    await supabase.from("newsletter_deliveries").update({ status: "SENT", provider: "resend", provider_message_id: String(payload.id), sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", deliveryId); return { state: "sent", providerMessageId: String(payload.id) };
  } catch (error) { const reason = error instanceof Error ? error.message : "EMAIL_SEND_FAILED"; await supabase.from("newsletter_deliveries").update({ status: "FAILED", provider: "resend", last_error: reason, updated_at: new Date().toISOString() }).eq("id", deliveryId); return { state: "failed", reason }; }
}
async function updateWelcomeCampaignCounts(): Promise<void> { const { data } = await supabase.from("newsletter_deliveries").select("status").eq("campaign_id", WELCOME_CAMPAIGN_ID); const counts = { total: 0, sent: 0, failed: 0, skipped: 0 }; for (const row of data || []) { counts.total += 1; if (["SENT","DELIVERED"].includes(row.status)) counts.sent += 1; else if (row.status === "FAILED") counts.failed += 1; else if (row.status === "SKIPPED") counts.skipped += 1; } await supabase.from("newsletter_campaigns").update({ total_recipients: counts.total, sent_count: counts.sent, failed_count: counts.failed, skipped_count: counts.skipped, updated_at: new Date().toISOString() }).eq("id", WELCOME_CAMPAIGN_ID); }
async function unsubscribe(token: string): Promise<Response> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) return new Response("Geçersiz abonelik bağlantısı.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { data, error } = await supabase.from("subscribers").update({ status: "UNSUBSCRIBED", updated_at: new Date().toISOString() }).eq("unsubscribe_token", token).select("email").maybeSingle();
  if (error || !data?.email) return new Response("Abonelik kaydı bulunamadı veya bağlantı artık geçerli değil.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const settings = await siteSettings(); const phone = clean(settings["phone"], 80), emailAddress = clean(settings["email"], 200);
  return new Response(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abonelikten Çıkıldı | Alperler Auto</title><body style="margin:0;background:#07101f;color:white;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px"><main style="max-width:620px;background:#0f172a;border:1px solid #334155;border-radius:24px;padding:34px"><div style="font-size:12px;color:#60a5fa;font-weight:800;letter-spacing:.15em">ALPERLER AUTO</div><h1>Aboneliğiniz sonlandırıldı</h1><p style="color:#cbd5e1;line-height:1.7">${data.email} adresi artık bülten gönderimleri almayacak. Yeniden abone olmak isterseniz web sitemizdeki bülten formunu kullanabilirsiniz.</p><p style="color:#94a3b8;font-size:13px">${phone || ""}${phone && emailAddress ? " · " : ""}${emailAddress || ""}</p></main></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(request) });
  if (!URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  const parsed = new URL(request.url), unsubscribeToken = parsed.searchParams.get("unsubscribe");
  if (request.method === "GET" && unsubscribeToken) return unsubscribe(unsubscribeToken);
  if (request.method !== "POST") return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (Number(request.headers.get("content-length") || 0) > 4096) return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
  try {
    const payload = await request.json().catch(() => null) as { email?: unknown; locale?: unknown } | null;
    const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase().slice(0, 160) : "", localeRaw = typeof payload?.locale === "string" ? payload.locale.trim().toLowerCase().slice(0, 10) : "tr", locale = /^[a-z]{2}(-[a-z]{2})?$/.test(localeRaw) ? localeRaw : "tr";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(request, { ok: false, code: "INVALID_EMAIL" }, 400);
    const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 100), ua = (request.headers.get("user-agent") || "unknown").slice(0, 260), networkHash = await digest(`${ip}|${ua}`), emailHash = await digest(email);
    if (!(await consume(networkHash, "newsletter_network", 3600, 12)) || !(await consume(emailHash, "newsletter_email", 86400, 4))) return json(request, { ok: false, code: "RATE_LIMITED" }, 429);
    const { data: existing, error: lookupError } = await supabase.from("subscribers").select("id,email,status,unsubscribe_token").ilike("email", email).limit(1).maybeSingle(); if (lookupError) throw lookupError;
    let subscriber: { id: string; email: string; unsubscribe_token: string }; let existed = Boolean(existing?.id);
    if (existing?.id) { const { data, error } = await supabase.from("subscribers").update({ status: "ACTIVE", locale, source: "WEB", consent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.id).select("id,email,unsubscribe_token").single(); if (error) throw error; subscriber = data; }
    else { const { data, error } = await supabase.from("subscribers").insert({ email, locale, status: "ACTIVE", source: "WEB", consent_at: new Date().toISOString() }).select("id,email,unsubscribe_token").single(); if (error) { if (error.code === "23505") { const retry = await supabase.from("subscribers").select("id,email,unsubscribe_token").ilike("email", email).single(); if (retry.error) throw retry.error; subscriber = retry.data; existed = true; } else throw error; } else subscriber = data; }
    const settings = await siteSettings(), welcomeEmail = await sendWelcome(subscriber, settings); await updateWelcomeCampaignCounts();
    return json(request, { ok: true, subscribed: true, existing: existed, subscriberId: subscriber.id, welcomeEmail }, existed ? 200 : 201);
  } catch (error) { console.error("newsletter-gateway failed", error); return json(request, { ok: false, code: "NEWSLETTER_FAILED" }, 500); }
});
