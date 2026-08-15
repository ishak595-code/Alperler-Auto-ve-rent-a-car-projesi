import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BATCH_SIZE = 40;
const CONCURRENCY = 5;

type Actor = { id: string; email: string; role: string; permissions: Record<string, unknown> };
type Delivery = { id: string; email: string; subscriber_id: string | null; attempt_count: number; metadata?: Record<string, unknown> };

function json(body: unknown, status = 200): Response { return Response.json(body, { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
function clean(value: unknown, max: number): string { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function email(value: unknown): string | null { const v = clean(value, 200).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null; }
function serviceHeaders(extra: Record<string, string> = {}) { return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra }; }
async function rest(path: string, init: RequestInit = {}): Promise<Response> { return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) }, signal: AbortSignal.timeout(12_000) }); }

async function requester(request: Request): Promise<Actor> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, authorization }, signal: AbortSignal.timeout(8_000) });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json(); const id = clean(user?.id, 80); const userEmail = email(user?.email);
  if (!id || !userEmail) throw new Error("UNAUTHORIZED");
  const adminResponse = await rest(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,email,role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json(); const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("ADMIN_REQUIRED");
  const role = clean(row.role, 30).toLowerCase(); const permissions = row.permissions && typeof row.permissions === "object" ? row.permissions : {};
  if (!(role === "owner" || role === "admin" || permissions["operations.manage"] === true)) throw new Error("OPERATIONS_PERMISSION_REQUIRED");
  return { id, email: userEmail, role, permissions };
}

async function siteSettings(): Promise<Record<string, unknown>> {
  const response = await rest("site_config?key=eq.site_settings&select=value&limit=1");
  if (!response.ok) return {};
  const rows = await response.json(); return Array.isArray(rows) && rows[0]?.value ? rows[0].value : {};
}
function mailHtml(subject: string, bodyText: string, recipientEmail: string, unsubscribeToken: string | null, settings: Record<string, unknown>): string {
  const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const paragraphs = bodyText.split(/\n{2,}/).map((part) => `<p style="margin:0 0 16px;line-height:1.7;color:#334155">${esc(part).replaceAll("\n", "<br>")}</p>`).join("");
  const phone = clean(settings["phone"], 80), businessEmail = clean(settings["email"], 200), address = clean(settings["address"], 300), whatsapp = clean(settings["whatsapp"], 80);
  const unsubscribeUrl = unsubscribeToken ? `${URL}/functions/v1/newsletter-gateway?unsubscribe=${encodeURIComponent(unsubscribeToken)}` : "";
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:white;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden"><tr><td style="padding:32px"><div style="font-size:12px;font-weight:800;letter-spacing:.15em;color:#2563eb;text-transform:uppercase">ALPERLER AUTO</div><h1 style="font-size:28px;line-height:1.25;margin:10px 0 22px">${esc(subject)}</h1>${paragraphs}</td></tr><tr><td style="background:#0f172a;color:#cbd5e1;padding:24px 32px;font-size:12px;line-height:1.7"><strong style="color:white;font-size:14px">Alperler Auto</strong>${phone ? `<br>Telefon / WhatsApp: ${esc(phone)}` : ""}${businessEmail ? `<br>E-posta: ${esc(businessEmail)}` : ""}${address ? `<br>${esc(address)}` : ""}${whatsapp ? `<br><a href="https://wa.me/${esc(whatsapp)}" style="color:#93c5fd">WhatsApp'tan iletişime geç</a>` : ""}<br><span style="color:#64748b">Bu e-posta ${esc(recipientEmail)} adresinin bülten aboneliği kapsamında gönderilmiştir.</span>${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:#93c5fd">Abonelikten çık</a>` : ""}</td></tr></table></td></tr></table></body></html>`;
}

async function audit(actor: Actor, action: string, entityId: string, afterData: unknown): Promise<void> {
  await rest("audit_logs", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: actor.id, actor_email: actor.email, action, entity_type: "newsletter", entity_id: entityId, after_data: afterData }) }).catch(() => undefined);
}

async function createCampaign(actor: Actor, input: Record<string, unknown>) {
  const title = clean(input["title"], 180), subject = clean(input["subject"], 200), bodyText = clean(input["bodyText"], 12_000), singleEmail = email(input["singleEmail"]);
  if (!title || !subject || !bodyText) return json({ ok: false, code: "CAMPAIGN_FIELDS_REQUIRED" }, 400);
  const audienceType = singleEmail ? "SINGLE" : "ALL";
  const subscribersResponse = await rest(singleEmail
    ? `subscribers?status=eq.ACTIVE&email=ilike.${encodeURIComponent(singleEmail)}&select=id,email,unsubscribe_token&limit=1`
    : "subscribers?status=eq.ACTIVE&select=id,email,unsubscribe_token&order=created_at.asc");
  if (!subscribersResponse.ok) return json({ ok: false, code: "SUBSCRIBER_LOOKUP_FAILED" }, 500);
  const subscribers = await subscribersResponse.json();
  if (!Array.isArray(subscribers) || subscribers.length === 0) return json({ ok: false, code: "NO_ACTIVE_SUBSCRIBERS" }, 409);
  const campaignResponse = await rest("newsletter_campaigns?select=*", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title, subject, body_text: bodyText, audience_type: audienceType, audience_filter: singleEmail ? { email: singleEmail } : {}, status: "SENDING", started_at: new Date().toISOString(), total_recipients: subscribers.length, created_by: actor.id, metadata: { source: "admin_panel" } }) });
  if (!campaignResponse.ok) return json({ ok: false, code: "CAMPAIGN_CREATE_FAILED" }, 500);
  const campaignRows = await campaignResponse.json(); const campaign = Array.isArray(campaignRows) ? campaignRows[0] : null;
  if (!campaign?.id) return json({ ok: false, code: "CAMPAIGN_CREATE_FAILED" }, 500);
  const deliveries = subscribers.map((subscriber: any) => ({ campaign_id: campaign.id, subscriber_id: subscriber.id, email: subscriber.email, status: "PENDING", attempt_count: 0, metadata: { unsubscribe_token: subscriber.unsubscribe_token || null } }));
  const deliveryResponse = await rest("newsletter_deliveries?on_conflict=campaign_id,email", { method: "POST", headers: { Prefer: "return=minimal,resolution=ignore-duplicates" }, body: JSON.stringify(deliveries) });
  if (!deliveryResponse.ok) return json({ ok: false, code: "DELIVERIES_CREATE_FAILED", campaignId: campaign.id }, 500);
  await audit(actor, "newsletter_campaign_created", campaign.id, { title, subject, audienceType, recipients: subscribers.length });
  return processCampaign(actor, campaign.id, true);
}

async function processOne(delivery: Delivery, campaign: any, settings: Record<string, unknown>): Promise<void> {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase(), key = clean(Deno.env.get("RESEND_API_KEY"), 500), from = clean(Deno.env.get("MAIL_FROM"), 240);
  const token = clean(delivery.metadata?.["unsubscribe_token"], 100) || null;
  const attempt = Number(delivery.attempt_count || 0) + 1;
  await rest(`newsletter_deliveries?id=eq.${encodeURIComponent(delivery.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "PROCESSING", attempt_count: attempt, last_error: null, updated_at: new Date().toISOString() }) });
  if (provider !== "resend" || !key || !from) { await rest(`newsletter_deliveries?id=eq.${encodeURIComponent(delivery.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "SKIPPED", provider: "resend", last_error: "EMAIL_NOT_CONFIGURED", updated_at: new Date().toISOString() }) }); return; }
  try {
    const html = mailHtml(campaign.subject, campaign.body_text, delivery.email, token, settings);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [delivery.email], subject: campaign.subject, html, text: campaign.body_text }), signal: AbortSignal.timeout(10_000) });
    const payload = await response.json().catch(() => ({})); if (!response.ok || !payload?.id) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
    await rest(`newsletter_deliveries?id=eq.${encodeURIComponent(delivery.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "SENT", provider: "resend", provider_message_id: String(payload.id), sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  } catch (error) { const reason = error instanceof Error ? error.message : "EMAIL_SEND_FAILED"; await rest(`newsletter_deliveries?id=eq.${encodeURIComponent(delivery.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "FAILED", provider: "resend", last_error: reason, updated_at: new Date().toISOString() }) }); }
}

async function processCampaign(actor: Actor, campaignId: string, firstRun = false) {
  const campaignResponse = await rest(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}&select=*&limit=1`); if (!campaignResponse.ok) return json({ ok: false, code: "CAMPAIGN_LOOKUP_FAILED" }, 500);
  const campaignRows = await campaignResponse.json(); const campaign = Array.isArray(campaignRows) ? campaignRows[0] : null; if (!campaign) return json({ ok: false, code: "CAMPAIGN_NOT_FOUND" }, 404);
  if (["SENT", "PARTIAL", "CANCELLED"].includes(String(campaign.status))) return json({ ok: true, campaign, complete: true, remaining: 0 });
  const pendingResponse = await rest(`newsletter_deliveries?campaign_id=eq.${encodeURIComponent(campaignId)}&status=in.(PENDING,FAILED)&select=id,email,subscriber_id,attempt_count,metadata&order=created_at.asc&limit=${BATCH_SIZE}`); if (!pendingResponse.ok) return json({ ok: false, code: "DELIVERY_LOOKUP_FAILED" }, 500);
  const pending = await pendingResponse.json() as Delivery[], settings = await siteSettings();
  for (let i = 0; i < pending.length; i += CONCURRENCY) await Promise.all(pending.slice(i, i + CONCURRENCY).map((delivery) => processOne(delivery, campaign, settings)));
  const countResponse = await rest(`newsletter_deliveries?campaign_id=eq.${encodeURIComponent(campaignId)}&select=status`); if (!countResponse.ok) return json({ ok: false, code: "DELIVERY_COUNT_FAILED" }, 500);
  const rows = await countResponse.json(), counts = { sent: 0, failed: 0, skipped: 0, pending: 0 };
  for (const row of Array.isArray(rows) ? rows : []) { const status = String(row.status || ""); if (status === "SENT" || status === "DELIVERED") counts.sent += 1; else if (status === "FAILED") counts.failed += 1; else if (status === "SKIPPED") counts.skipped += 1; else counts.pending += 1; }
  const complete = counts.pending === 0, providerConfigured = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase() === "resend" && Boolean(clean(Deno.env.get("RESEND_API_KEY"), 500)) && Boolean(clean(Deno.env.get("MAIL_FROM"), 240));
  const finalStatus = complete ? (counts.sent > 0 && counts.failed + counts.skipped === 0 ? "SENT" : counts.sent > 0 ? "PARTIAL" : "FAILED") : "SENDING";
  await rest(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: finalStatus, sent_count: counts.sent, failed_count: counts.failed, skipped_count: counts.skipped, completed_at: complete ? new Date().toISOString() : null, updated_at: new Date().toISOString(), metadata: { ...(campaign.metadata || {}), providerConfigured } }) });
  await audit(actor, firstRun ? "newsletter_campaign_started" : "newsletter_campaign_resumed", campaignId, { counts, complete, providerConfigured });
  if (!providerConfigured) return json({ ok: false, code: "EMAIL_NOT_CONFIGURED", campaignId, counts, complete: true, remaining: 0 }, 503);
  return json({ ok: true, campaignId, counts, complete, remaining: counts.pending });
}

async function updateSubscriber(actor: Actor, input: Record<string, unknown>, status: "ACTIVE" | "UNSUBSCRIBED") {
  const target = email(input["email"]); if (!target) return json({ ok: false, code: "INVALID_EMAIL" }, 400);
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }; if (status === "ACTIVE") patch["consent_at"] = new Date().toISOString();
  const response = await rest(`subscribers?email=ilike.${encodeURIComponent(target)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) }); if (!response.ok) return json({ ok: false, code: "SUBSCRIBER_UPDATE_FAILED" }, 500);
  await audit(actor, status === "ACTIVE" ? "newsletter_subscriber_reactivated" : "newsletter_subscriber_unsubscribed", target, { email: target, status }); return json({ ok: true });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 20_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
  let actor: Actor; try { actor = await requester(request); } catch (error) { const code = error instanceof Error ? error.message : "UNAUTHORIZED"; return json({ ok: false, code }, code.includes("PERMISSION") || code === "ADMIN_REQUIRED" ? 403 : 401); }
  let input: Record<string, unknown>; try { input = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  const action = clean(input["action"], 40);
  try {
    if (action === "create_send") return createCampaign(actor, input);
    if (action === "resume") { const campaignId = clean(input["campaignId"], 80); return campaignId ? processCampaign(actor, campaignId) : json({ ok: false, code: "CAMPAIGN_ID_REQUIRED" }, 400); }
    if (action === "unsubscribe") return updateSubscriber(actor, input, "UNSUBSCRIBED");
    if (action === "reactivate") return updateSubscriber(actor, input, "ACTIVE");
    return json({ ok: false, code: "UNKNOWN_ACTION" }, 400);
  } catch (error) { console.error("newsletter-admin failed", error); return json({ ok: false, code: "NEWSLETTER_ADMIN_FAILED" }, 500); }
});
