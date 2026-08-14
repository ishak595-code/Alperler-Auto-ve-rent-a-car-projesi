import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "partner-uploads";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;

const mimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
  });
}
function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) } });
}
async function digest(value: string): Promise<string> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(raw)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function rate(key: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key_hash: key, p_scope: scope, p_window_seconds: seconds, p_limit: limit }),
  });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}
async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  if (!id) throw new Error("UNAUTHORIZED");
  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
  return { id, email: clean(user?.email, 160), role: String(rows[0].role || "support") };
}

interface UploadInput {
  name?: string;
  type?: string;
  size?: number;
}
interface PartnerInit {
  operation?: string;
  idempotencyKey?: string;
  intent?: string;
  name?: string;
  phone?: string;
  email?: string;
  carBrand?: string;
  carModel?: string;
  modelYear?: number;
  km?: number;
  askingPrice?: number;
  withDriver?: boolean;
  notes?: string;
  files?: UploadInput[];
  website?: string;
}

function validateFiles(files: UploadInput[]) {
  if (files.length > MAX_FILES) throw new Error("TOO_MANY_FILES");
  let total = 0;
  return files.map((file) => {
    const type = clean(file.type, 100).toLowerCase();
    const size = Number(file.size || 0);
    const ext = mimeExtensions[type];
    if (!ext) throw new Error("UNSUPPORTED_FILE_TYPE");
    if (!Number.isInteger(size) || size < 1 || size > MAX_FILE_BYTES) throw new Error("INVALID_FILE_SIZE");
    total += size;
    if (total > MAX_TOTAL_BYTES) throw new Error("TOTAL_UPLOAD_TOO_LARGE");
    return { originalName: clean(file.name, 180) || `file.${ext}`, type, size, ext };
  });
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const key = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !key || !from) return { state: "not_configured", reason: "EMAIL_NOT_CONFIGURED" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) throw new Error(`EMAIL_SEND_FAILED_${response.status}`);
    return { state: "sent", id: String(result.id) };
  } catch (error) {
    return { state: "failed", reason: error instanceof Error ? error.message : "EMAIL_SEND_FAILED" };
  }
}

async function notifyPartner(row: any) {
  const configResponse = await db("site_config?key=eq.business_profile&select=value&limit=1");
  const configRows = configResponse.ok ? await configResponse.json() : [];
  const profile = Array.isArray(configRows) && configRows[0]?.value ? configRows[0].value : {};
  const adminTo = clean(Deno.env.get("MAIL_ADMIN_TO"), 240) || clean(profile.email, 240);
  const footer = [profile.phone, profile.email, profile.address, profile.website].filter(Boolean).join(" · ");
  const customer = row.customer_email
    ? await sendMail(
        row.customer_email,
        `Araç Değerlendirme Başvurunuz Alındı | ${row.reference}`,
        `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Başvurunuz alındı</h2><p>Sayın ${row.customer_name},</p><p><strong>${row.vehicle_brand || ""} ${row.vehicle_model || ""}</strong> aracınız için başvurunuz güvenli şekilde kaydedildi.</p><p><strong>Referans:</strong> ${row.reference}</p><p>Ekibimiz inceleme sonrasında sizinle iletişime geçecektir.</p>${footer ? `<hr><small>${footer}</small>` : ""}<p><strong>Alperler Auto</strong></p></div>`,
        `Sayın ${row.customer_name},\n\nAraç değerlendirme başvurunuz kaydedildi. Referans: ${row.reference}.\n\nAlperler Auto`,
      )
    : { state: "skipped", reason: "EMAIL_MISSING" };
  const admin = adminTo
    ? await sendMail(
        adminTo,
        `Yeni Araç Değerlendirme Başvurusu | ${row.reference}`,
        `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Yeni araç başvurusu</h2><p><strong>Referans:</strong> ${row.reference}</p><p><strong>Müşteri:</strong> ${row.customer_name}</p><p><strong>Telefon:</strong> ${row.customer_phone}</p><p><strong>Araç:</strong> ${row.vehicle_brand || ""} ${row.vehicle_model || ""} ${row.model_year || ""}</p><p><strong>KM:</strong> ${row.mileage_km ?? "-"}</p><p><strong>Dosya:</strong> ${Array.isArray(row.media_paths) ? row.media_paths.length : 0}</p></div>`,
        `Yeni araç başvurusu\n${row.reference}\n${row.customer_name}\n${row.customer_phone}\n${row.vehicle_brand || ""} ${row.vehicle_model || ""}`,
      )
    : { state: "not_configured", reason: "ADMIN_EMAIL_MISSING" };

  const deliveries = [
    { channel: "EMAIL", recipient: row.customer_email || "", result: customer },
    { channel: "ADMIN_EMAIL", recipient: adminTo || "", result: admin },
  ];
  await Promise.all(
    deliveries.map(({ channel, recipient, result }) =>
      db("notification_deliveries", {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
        body: JSON.stringify({
          partner_request_id: row.id,
          event_key: "partner_request_received",
          channel,
          recipient,
          provider: "resend",
          provider_message_id: result.id || null,
          status: result.state === "sent" ? "SENT" : result.state === "failed" ? "FAILED" : "SKIPPED",
          attempt_count: 1,
          last_error: result.reason || null,
          sent_at: result.state === "sent" ? new Date().toISOString() : null,
        }),
      }).catch(() => undefined),
    ),
  );
  return { customerEmail: customer, adminEmail: admin };
}

async function initRequest(request: Request, input: PartnerInit) {
  if (clean(input.website, 200)) return json({ ok: true, accepted: true }, 202);
  const intent = clean(input.intent, 20).toLowerCase() === "sell" ? "SELL" : "RENT";
  const name = clean(input.name, 160);
  const phone = clean(input.phone, 40);
  const email = clean(input.email, 160).toLowerCase() || null;
  const brand = clean(input.carBrand, 100);
  const model = clean(input.carModel, 100);
  const modelYear = Number(input.modelYear || 0);
  const mileage = Number(input.km || 0);
  const notes = clean(input.notes, 4000) || null;
  if (!name || !brand || !model || !/^[+0-9()\s-]{7,24}$/.test(phone)) return json({ ok: false, code: "INVALID_REQUIRED_FIELDS" }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, code: "INVALID_EMAIL" }, 400);
  if (!Number.isInteger(modelYear) || modelYear < 1950 || modelYear > new Date().getUTCFullYear() + 1) return json({ ok: false, code: "INVALID_MODEL_YEAR" }, 400);
  if (!Number.isFinite(mileage) || mileage < 0 || mileage > 5_000_000) return json({ ok: false, code: "INVALID_MILEAGE" }, 400);
  const files = validateFiles(Array.isArray(input.files) ? input.files : []);
  const idempotencyKey = clean(input.idempotencyKey, 120) || crypto.randomUUID();

  const ip = clean(request.headers.get("x-client-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown", 100);
  const network = await digest(`${ip}|${clean(request.headers.get("user-agent"), 300)}`);
  const contact = await digest(`${phone}|${email || ""}`);
  if (!(await rate(network, "partner_network_minute", 60, 3)) || !(await rate(network, "partner_network_hour", 3600, 12)) || !(await rate(contact, "partner_contact_day", 86400, 5))) {
    return json({ ok: false, code: "RATE_LIMITED", message: "Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin." }, 429);
  }

  const existingResponse = await db(`partner_requests?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);
  if (existingResponse.ok) {
    const existingRows = await existingResponse.json();
    if (Array.isArray(existingRows) && existingRows[0]) {
      const existing = existingRows[0];
      return json({ ok: true, duplicate: true, reference: existing.reference, status: existing.status }, 200);
    }
  }

  const uploadToken = crypto.randomUUID() + crypto.randomUUID();
  const uploadTokenHash = await digest(uploadToken);
  const expectedPaths: Array<{ path: string; originalName: string; type: string; size: number }> = [];
  const row = {
    idempotency_key: idempotencyKey,
    intent,
    customer_name: name,
    customer_email: email,
    customer_phone: phone,
    vehicle_brand: brand,
    vehicle_model: model,
    model_year: modelYear,
    mileage_km: Math.round(mileage),
    asking_price: Number.isFinite(Number(input.askingPrice)) && Number(input.askingPrice) >= 0 ? Number(input.askingPrice) : null,
    with_driver: Boolean(input.withDriver),
    description: notes,
    status: files.length ? "UPLOADING" : "NEW",
    upload_token_hash: files.length ? uploadTokenHash : null,
    submitted_at: files.length ? null : new Date().toISOString(),
    media_paths: [],
  };
  const insert = await db("partner_requests?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!insert.ok) return json({ ok: false, code: "PARTNER_REQUEST_CREATE_FAILED" }, 500);
  const saved = (await insert.json())[0];

  if (!files.length) {
    const delivery = await notifyPartner(saved);
    return json({ ok: true, reference: saved.reference, requestId: saved.id, status: "NEW", uploads: [], delivery }, 201);
  }

  const uploads = [];
  for (const file of files) {
    const path = `${saved.id}/${crypto.randomUUID()}.${file.ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.token || !data?.signedUrl) {
      await db(`partner_requests?id=eq.${encodeURIComponent(saved.id)}`, { method: "PATCH", body: JSON.stringify({ status: "CLOSED", internal_notes: "Upload URL generation failed." }) });
      return json({ ok: false, code: "UPLOAD_URL_CREATE_FAILED" }, 500);
    }
    expectedPaths.push({ path, originalName: file.originalName, type: file.type, size: file.size });
    uploads.push({ path, token: data.token, signedUrl: data.signedUrl, originalName: file.originalName, type: file.type, size: file.size });
  }
  const patch = await db(`partner_requests?id=eq.${encodeURIComponent(saved.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ media_paths: expectedPaths }),
  });
  if (!patch.ok) return json({ ok: false, code: "UPLOAD_MANIFEST_SAVE_FAILED" }, 500);
  return json({ ok: true, reference: saved.reference, requestId: saved.id, status: "UPLOADING", uploadToken, uploads }, 201);
}

async function finalizeRequest(input: any) {
  const reference = clean(input?.reference, 80);
  const uploadToken = clean(input?.uploadToken, 200);
  if (!reference || !uploadToken) return json({ ok: false, code: "FINALIZE_TOKEN_REQUIRED" }, 400);
  const response = await db(`partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  if (!response.ok) return json({ ok: false, code: "PARTNER_REQUEST_READ_FAILED" }, 500);
  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return json({ ok: false, code: "PARTNER_REQUEST_NOT_FOUND" }, 404);
  if (row.status === "NEW" && row.submitted_at) return json({ ok: true, reference, status: "NEW", duplicate: true });
  if (row.status !== "UPLOADING" || !row.upload_token_hash) return json({ ok: false, code: "PARTNER_REQUEST_NOT_FINALIZABLE" }, 409);
  if ((await digest(uploadToken)) !== row.upload_token_hash) return json({ ok: false, code: "INVALID_FINALIZE_TOKEN" }, 403);

  const expected = Array.isArray(row.media_paths) ? row.media_paths : [];
  const { data: objects, error } = await supabase.storage.from(BUCKET).list(row.id, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (error) return json({ ok: false, code: "UPLOAD_VERIFY_FAILED" }, 500);
  const uploadedNames = new Set((objects || []).map((object) => object.name));
  const missing = expected.filter((item: any) => !uploadedNames.has(String(item.path || "").split("/").pop() || ""));
  if (missing.length) return json({ ok: false, code: "UPLOADS_INCOMPLETE", missing: missing.map((item: any) => item.originalName || item.path) }, 409);

  const update = await db(`partner_requests?id=eq.${encodeURIComponent(row.id)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "NEW", submitted_at: new Date().toISOString(), upload_token_hash: null }),
  });
  if (!update.ok) return json({ ok: false, code: "PARTNER_REQUEST_FINALIZE_FAILED" }, 500);
  const saved = (await update.json())[0];
  const delivery = await notifyPartner(saved);
  return json({ ok: true, reference: saved.reference, status: saved.status, mediaCount: expected.length, delivery });
}

async function listAdmin(request: Request) {
  try {
    await requireAdmin(request);
    const response = await db("partner_requests?select=*&order=created_at.desc&limit=500");
    if (!response.ok) throw new Error("PARTNER_LIST_FAILED");
    return json({ ok: true, requests: await response.json() });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    return json({ ok: false, code }, code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500);
  }
}

async function updateAdmin(request: Request, input: any) {
  try {
    const admin = await requireAdmin(request);
    const reference = clean(input?.reference, 80);
    const status = clean(input?.status, 30).toUpperCase();
    const internalNotes = clean(input?.internalNotes, 4000) || null;
    if (!reference || !["NEW", "REVIEWING", "CONTACTED", "OFFERED", "ACCEPTED", "REJECTED", "CLOSED"].includes(status)) return json({ ok: false, code: "INVALID_UPDATE" }, 400);
    const existingResponse = await db(`partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
    if (!existingResponse.ok) throw new Error("PARTNER_READ_FAILED");
    const existingRows = await existingResponse.json();
    if (!Array.isArray(existingRows) || !existingRows[0]) return json({ ok: false, code: "PARTNER_REQUEST_NOT_FOUND" }, 404);
    const response = await db(`partner_requests?id=eq.${encodeURIComponent(existingRows[0].id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status, internal_notes: internalNotes }),
    });
    if (!response.ok) throw new Error("PARTNER_UPDATE_FAILED");
    const saved = (await response.json())[0];
    await db("audit_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ actor_user_id: admin.id, actor_email: admin.email, action: "partner_request_updated", entity_type: "partner_request", entity_id: reference, before_data: existingRows[0], after_data: saved }),
    }).catch(() => undefined);
    return json({ ok: true, request: saved });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PARTNER_UPDATE_FAILED";
    return json({ ok: false, code }, code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500);
  }
}

Deno.serve(async (request) => {
  if (!URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (request.method === "GET") return listAdmin(request);
  if (!["POST", "PATCH"].includes(request.method)) return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  let input: any;
  try { input = await request.json(); } catch { return json({ ok: false, code: "INVALID_JSON" }, 400); }
  if (request.method === "PATCH") return updateAdmin(request, input);
  const operation = clean(input?.operation, 20).toLowerCase();
  if (operation === "finalize") return finalizeRequest(input);
  return initRequest(request, input as PartnerInit);
});
