import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const allowedServices = new Set(["RENTAL", "SALES", "TOUR_TRANSFER"]);
const allowedOffice = new Set(["OWN", "RENT", "PLAN", "NONE"]);
const allowedListing = new Set(["OWN_FLEET", "REGIONAL_NETWORK", "BOTH"]);
const allowedBudget = new Set(["DISCUSS", "UNDER_100K", "100K_250K", "250K_500K", "500K_PLUS"]);
const allowedStatus = new Set(["NEW", "REVIEWING", "CONTACTED", "DUE_DILIGENCE", "APPROVED", "REJECTED", "CLOSED"]);

type AdminSession = { id: string; email: string; role: string; permissions: Record<string, unknown> };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { ...cors(request), "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
  });
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

function hasOperationsAccess(admin: AdminSession): boolean {
  if (admin.role === "owner" || admin.role === "admin" || admin.role === "support") return true;
  return admin.permissions?.["operations.manage"] === true;
}

async function requireAdmin(request: Request, operations = false): Promise<AdminSession> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  if (!id) throw new Error("UNAUTHORIZED");
  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
  const admin: AdminSession = {
    id,
    email: clean(user?.email, 160),
    role: clean(rows[0]?.role, 30).toLowerCase(),
    permissions: rows[0]?.permissions && typeof rows[0].permissions === "object" ? rows[0].permissions : {},
  };
  if (operations && !hasOperationsAccess(admin)) throw new Error("FORBIDDEN");
  return admin;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const key = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !key || !from || !to) return { state: "not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload?.id ? { state: "sent", id: String(payload.id) } : { state: "failed" };
  } catch {
    return { state: "failed" };
  }
}

async function notify(row: any) {
  const configResponse = await db("site_config?key=eq.business_profile&select=value&limit=1");
  const configRows = configResponse.ok ? await configResponse.json() : [];
  const profile = Array.isArray(configRows) && configRows[0]?.value ? configRows[0].value : {};
  const adminTo = clean(Deno.env.get("MAIL_ADMIN_TO"), 240) || clean(profile?.email, 240);
  const name = escapeHtml(row.full_name);
  const reference = escapeHtml(row.reference);
  const location = `${escapeHtml(row.city)} / ${escapeHtml(row.district)}`;

  if (row.email) {
    await sendMail(
      row.email,
      `Alperler Auto İş Ortaklığı Başvurunuz Alındı | ${row.reference}`,
      `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Başvurunuz alındı</h2><p>Sayın ${name},</p><p>${location} bölgesi için Alperler Auto iş ortaklığı başvurunuz kaydedildi.</p><p><strong>Referans:</strong> ${reference}</p><p>Bu kayıt otomatik bayilik onayı değildir. Ekibimiz operasyon, uygunluk ve marka standartları açısından inceleme yaptıktan sonra sizinle iletişime geçecektir.</p><p><strong>Alperler Auto</strong></p></div>`,
      `Sayın ${row.full_name},\n\nAlperler Auto iş ortaklığı başvurunuz kaydedildi. Referans: ${row.reference}. Başvuru, inceleme ve uygunluk görüşmesi sonrasında değerlendirilir.\n\nAlperler Auto`,
    );
  }

  if (adminTo) {
    await sendMail(
      adminTo,
      `Yeni Şube / İş Ortaklığı Başvurusu | ${row.reference}`,
      `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65"><h2>Yeni iş ortaklığı başvurusu</h2><p><strong>Referans:</strong> ${reference}</p><p><strong>Aday:</strong> ${name}</p><p><strong>Bölge:</strong> ${location}</p><p><strong>Telefon:</strong> ${escapeHtml(row.phone)}</p><p><strong>Mevcut / planlanan araç:</strong> ${escapeHtml(row.current_fleet_size)} / ${escapeHtml(row.planned_fleet_size)}</p></div>`,
      `Yeni iş ortaklığı başvurusu\n${row.reference}\n${row.full_name}\n${row.city} / ${row.district}\n${row.phone}`,
    );
  }
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

async function createApplication(request: Request, input: any): Promise<Response> {
  if (clean(input?.website, 200)) return json(request, { ok: true, accepted: true }, 202);

  const fullName = clean(input?.fullName, 160);
  const phone = clean(input?.phone, 40);
  const email = clean(input?.email, 160).toLowerCase() || null;
  const city = clean(input?.city, 80);
  const district = clean(input?.district, 80);
  const operatingArea = clean(input?.operatingArea, 180) || null;
  const currentBusiness = clean(input?.currentBusiness, 180) || null;
  const notes = clean(input?.notes, 4000) || null;
  const services = Array.isArray(input?.services)
    ? [...new Set(input.services.map((item: unknown) => clean(item, 30).toUpperCase()).filter((item: string) => allowedServices.has(item)))].slice(0, 3)
    : [];
  const officeStatus = allowedOffice.has(clean(input?.officeStatus, 30).toUpperCase()) ? clean(input?.officeStatus, 30).toUpperCase() : "PLAN";
  const listingModel = allowedListing.has(clean(input?.listingModel, 40).toUpperCase()) ? clean(input?.listingModel, 40).toUpperCase() : "OWN_FLEET";
  const budgetRange = allowedBudget.has(clean(input?.budgetRange, 40).toUpperCase()) ? clean(input?.budgetRange, 40).toUpperCase() : "DISCUSS";
  const experienceYears = numberInRange(input?.experienceYears, 0, 60, 0);
  const currentFleetSize = numberInRange(input?.currentFleetSize, 0, 5000, 0);
  const plannedFleetSize = numberInRange(input?.plannedFleetSize, 1, 5000, 1);
  const idempotencyKey = clean(input?.idempotencyKey, 120) || crypto.randomUUID();

  if (!fullName || !city || !district || !/^[+0-9()\s-]{7,24}$/.test(phone) || services.length === 0) {
    return json(request, { ok: false, code: "INVALID_REQUIRED_FIELDS", message: "Zorunlu başvuru bilgileri eksik veya geçersiz." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(request, { ok: false, code: "INVALID_EMAIL", message: "E-posta adresi geçerli değil." }, 400);
  }

  const ip = clean(request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown", 100);
  const network = await digest(`${ip}|${clean(request.headers.get("user-agent"), 300)}`);
  const contact = await digest(`${phone}|${email || ""}`);
  if (!(await rate(network, "branch_partner_network_minute", 60, 3)) || !(await rate(network, "branch_partner_network_hour", 3600, 10)) || !(await rate(contact, "branch_partner_contact_day", 86400, 4))) {
    return json(request, { ok: false, code: "RATE_LIMITED", message: "Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin." }, 429);
  }

  const existingResponse = await db(`branch_partner_requests?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=reference,status&limit=1`);
  if (existingResponse.ok) {
    const existingRows = await existingResponse.json();
    if (Array.isArray(existingRows) && existingRows[0]) return json(request, { ok: true, duplicate: true, ...existingRows[0] }, 200);
  }

  const insert = await db("branch_partner_requests?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      full_name: fullName,
      phone,
      email,
      city,
      district,
      operating_area: operatingArea,
      current_business: currentBusiness,
      experience_years: experienceYears,
      office_status: officeStatus,
      current_fleet_size: currentFleetSize,
      planned_fleet_size: plannedFleetSize,
      services,
      listing_model: listingModel,
      budget_range: budgetRange,
      notes,
      status: "NEW",
      source_path: "/branch-partner",
      submitted_at: new Date().toISOString(),
    }),
  });
  if (!insert.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_CREATE_FAILED" }, 500);
  const saved = (await insert.json())[0];
  await notify(saved).catch(() => undefined);
  return json(request, { ok: true, reference: saved.reference, status: saved.status }, 201);
}

async function listApplications(request: Request): Promise<Response> {
  await requireAdmin(request, true);
  const response = await db("branch_partner_requests?select=*&order=created_at.desc&limit=500");
  if (!response.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_LIST_FAILED" }, 500);
  return json(request, { ok: true, requests: await response.json() });
}

async function provisionApplication(request: Request, input: any): Promise<Response> {
  const admin = await requireAdmin(request, true);
  const reference = clean(input?.reference, 80);
  const branchName = clean(input?.branchName, 160) || null;
  if (!reference) return json(request, { ok: false, code: "INVALID_PROVISION_REQUEST" }, 400);
  const rpc = await db("rpc/provision_branch_partner_request", {
    method: "POST",
    body: JSON.stringify({ p_reference: reference, p_actor: admin.id, p_branch_name: branchName }),
  });
  if (!rpc.ok) {
    const error = await rpc.json().catch(() => ({}));
    const message = clean(error?.message, 300);
    if (message.includes("NOT_APPROVED")) return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_APPROVED" }, 409);
    if (message.includes("NOT_FOUND")) return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_FOUND" }, 404);
    return json(request, { ok: false, code: "BRANCH_PROVISION_FAILED" }, 500);
  }
  const branch = await rpc.json();
  const refreshed = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  const rows = refreshed.ok ? await refreshed.json() : [];
  return json(request, { ok: true, branch, request: Array.isArray(rows) ? rows[0] : null });
}

async function updateApplication(request: Request, input: any): Promise<Response> {
  const admin = await requireAdmin(request, true);
  if (clean(input?.action, 30).toUpperCase() === "PROVISION") return provisionApplication(request, input);
  const reference = clean(input?.reference, 80);
  const status = clean(input?.status, 30).toUpperCase();
  const internalNotes = clean(input?.internalNotes, 4000) || null;
  if (!reference || !allowedStatus.has(status)) return json(request, { ok: false, code: "INVALID_UPDATE" }, 400);
  const patch: Record<string, unknown> = { status, internal_notes: internalNotes, updated_at: new Date().toISOString() };
  if (status === "APPROVED") {
    patch["approved_at"] = new Date().toISOString();
    patch["approved_by"] = admin.id;
  }
  const response = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_UPDATE_FAILED" }, 500);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_FOUND" }, 404);
  return json(request, { ok: true, request: rows[0] });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  try {
    const method = request.method.toUpperCase();
    if (method === "POST") return await createApplication(request, await request.json().catch(() => ({})));
    if (method === "GET") return await listApplications(request);
    if (method === "PATCH") return await updateApplication(request, await request.json().catch(() => ({})));
    return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_PARTNER_GATEWAY_FAILED";
    if (code === "UNAUTHORIZED") return json(request, { ok: false, code }, 401);
    if (code === "FORBIDDEN") return json(request, { ok: false, code }, 403);
    console.error("branch-partner-gateway", error);
    return json(request, { ok: false, code: "BRANCH_PARTNER_GATEWAY_FAILED" }, 500);
  }
});
