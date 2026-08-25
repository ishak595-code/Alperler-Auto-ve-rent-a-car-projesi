import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("APP_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => { try { return new URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);

const ALLOWED_SERVICES = new Set(["RENTAL", "SALES", "TOUR_TRANSFER"]);
const ALLOWED_OFFICE = new Set(["OWN", "RENT", "PLAN", "NONE"]);
const ALLOWED_LISTING = new Set(["OWN_FLEET", "REGIONAL_NETWORK", "BOTH"]);
const ALLOWED_BUDGET = new Set(["DISCUSS", "UNDER_100K", "100K_250K", "250K_500K", "500K_PLUS"]);
const ALLOWED_STATUS = new Set(["NEW", "REVIEWING", "CONTACTED", "DUE_DILIGENCE", "APPROVED", "REJECTED", "CLOSED"]);

type AdminSession = { id: string; email: string; role: string; permissions: Record<string, unknown> };
type BranchOwnerAccess = {
  email: string;
  membershipLinked: boolean;
  inviteSent: boolean;
  verificationRequired: boolean;
  identityState: "CONFIRMED" | "UNVERIFIED" | "MISSING" | "UNKNOWN";
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}
function allowedOrigin(request: Request): string | null {
  const raw = clean(request.headers.get("origin"), 240);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const local = (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (parsed.protocol === "http:" || parsed.protocol === "https:");
    return local || ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch {
    return "";
  }
}
function cors(request: Request): Record<string, string> {
  const origin = allowedOrigin(request);
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-client-info,x-request-id,x-app-origin",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
function json(request: Request, body: unknown, status = 200, id = requestId(request)): Response {
  return Response.json(body, {
    status,
    headers: {
      ...cors(request),
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
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
async function sha256(value: string): Promise<string> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(raw)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function consumeRateLimit(key: string, scope: string, seconds: number, limit: number): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key_hash: key, p_scope: scope, p_window_seconds: seconds, p_limit: limit }),
  });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}
function integer(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.round(parsed))) : fallback;
}
function trustedClientAddress(request: Request): string {
  // Supabase's gateway supplies X-Forwarded-For from the peer connection. Do not
  // trust the former application-level x-client-ip header because direct callers
  // could spoof it and weaken network rate limits.
  return clean(request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("cf-connecting-ip") || "unknown", 100);
}
function allowedRedirectOrigin(request: Request): string {
  const candidate = clean(request.headers.get("x-app-origin"), 300);
  if (!candidate) return "";
  const allowed = clean(Deno.env.get("APP_ALLOWED_ORIGINS"), 2000)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.length) return "";
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === "https:" || parsed.hostname === "localhost") && allowed.includes(parsed.origin)
      ? parsed.origin
      : "";
  } catch {
    return "";
  }
}

async function requireAdmin(request: Request): Promise<AdminSession> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  const email = clean(user?.email, 160).toLowerCase();
  if (!id || !email || !user?.email_confirmed_at) throw new Error("UNAUTHORIZED");

  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error("FORBIDDEN");
  const role = clean(row.role, 30).toLowerCase();
  const permissions = row.permissions && typeof row.permissions === "object" ? row.permissions as Record<string, unknown> : {};
  if (!(role === "owner" || role === "admin" || role === "support" || permissions["operations.manage"] === true)) throw new Error("FORBIDDEN");
  return { id, email, role, permissions };
}

async function resolveGeo(provinceCode: string, districtCode: string): Promise<{ provinceCode: string; districtCode: string; city: string; district: string } | null> {
  if (!/^TUR\d{3}$/.test(provinceCode) || !/^TUR\d{6}$/.test(districtCode)) return null;
  const [districtResponse, provinceResponse] = await Promise.all([
    db(`geo_districts?code=eq.${encodeURIComponent(districtCode)}&province_code=eq.${encodeURIComponent(provinceCode)}&select=code,name,province_code&limit=1`),
    db(`geo_provinces?code=eq.${encodeURIComponent(provinceCode)}&select=code,name&limit=1`),
  ]);
  if (!districtResponse.ok || !provinceResponse.ok) return null;
  const districts = await districtResponse.json();
  const provinces = await provinceResponse.json();
  const district = Array.isArray(districts) ? districts[0] : null;
  const province = Array.isArray(provinces) ? provinces[0] : null;
  if (!district || !province) return null;
  return { provinceCode: province.code, districtCode: district.code, city: province.name, district: district.name };
}

async function sendAcknowledgement(email: string, reference: string, city: string, district: string): Promise<void> {
  const provider = clean(Deno.env.get("EMAIL_PROVIDER"), 30).toLowerCase();
  const apiKey = clean(Deno.env.get("RESEND_API_KEY"), 500);
  const from = clean(Deno.env.get("MAIL_FROM"), 240);
  if (provider !== "resend" || !apiKey || !from || !email) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Alperler Auto şube başvurunuz alındı | ${reference}`,
      text: `Başvurunuz merkezi sistemimize kaydedildi. Bölge: ${city} / ${district}. Referans: ${reference}. İnceleme tamamlandığında sizinle iletişime geçeceğiz.`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
}

async function createApplication(request: Request, input: Record<string, unknown>, id: string): Promise<Response> {
  if (clean(input.website, 200)) return json(request, { ok: true, accepted: true }, 202, id);
  const fullName = clean(input.fullName, 160);
  const phone = clean(input.phone, 40);
  const email = clean(input.email, 160).toLowerCase();
  const location = await resolveGeo(clean(input.provinceCode, 16), clean(input.districtCode, 20));
  const services = Array.isArray(input.services)
    ? [...new Set(input.services.map((item) => clean(item, 30).toUpperCase()).filter((item) => ALLOWED_SERVICES.has(item)))].slice(0, 3)
    : [];
  if (!fullName || !location || !/^[+0-9()\s-]{7,24}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !services.length) {
    return json(request, { ok: false, code: "INVALID_REQUIRED_FIELDS", message: "Ad, telefon, e-posta, il, ilçe ve hizmet bilgilerini kontrol edin." }, 400, id);
  }

  const networkHash = await sha256(`${trustedClientAddress(request)}|${clean(request.headers.get("user-agent"), 300)}`);
  const contactHash = await sha256(`${phone}|${email}`);
  if (!(await consumeRateLimit(networkHash, "branch_partner_network_minute", 60, 3))
      || !(await consumeRateLimit(networkHash, "branch_partner_network_hour", 3600, 10))
      || !(await consumeRateLimit(contactHash, "branch_partner_contact_day", 86400, 4))) {
    return json(request, { ok: false, code: "RATE_LIMITED", message: "Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin." }, 429, id);
  }

  const idempotencyKey = clean(input.idempotencyKey, 120) || crypto.randomUUID();
  const existing = await db(`branch_partner_requests?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=reference,status&limit=1`);
  if (existing.ok) {
    const rows = await existing.json();
    if (Array.isArray(rows) && rows[0]) return json(request, { ok: true, duplicate: true, ...rows[0] }, 200, id);
  }

  const office = clean(input.officeStatus, 30).toUpperCase();
  const listing = clean(input.listingModel, 40).toUpperCase();
  const budget = clean(input.budgetRange, 40).toUpperCase();
  const insert = await db("branch_partner_requests?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      full_name: fullName,
      phone,
      email,
      province_code: location.provinceCode,
      district_code: location.districtCode,
      city: location.city,
      district: location.district,
      operating_area: clean(input.operatingArea, 180) || null,
      current_business: clean(input.currentBusiness, 180) || null,
      experience_years: integer(input.experienceYears, 0, 60, 0),
      office_status: ALLOWED_OFFICE.has(office) ? office : "PLAN",
      current_fleet_size: integer(input.currentFleetSize, 0, 5000, 0),
      planned_fleet_size: integer(input.plannedFleetSize, 1, 5000, 1),
      services,
      listing_model: ALLOWED_LISTING.has(listing) ? listing : "OWN_FLEET",
      budget_range: ALLOWED_BUDGET.has(budget) ? budget : "DISCUSS",
      notes: clean(input.notes, 4000) || null,
      status: "NEW",
      source_path: "/branch-partner",
      submitted_at: new Date().toISOString(),
    }),
  });
  if (!insert.ok) {
    console.error("branch application insert", id, insert.status, (await insert.text().catch(() => "")).slice(0, 500));
    return json(request, { ok: false, code: "BRANCH_PARTNER_CREATE_FAILED" }, 500, id);
  }
  const saved = (await insert.json())[0];
  void sendAcknowledgement(email, saved.reference, location.city, location.district);
  return json(request, { ok: true, reference: saved.reference, status: saved.status }, 201, id);
}

async function listApplications(request: Request, id: string): Promise<Response> {
  await requireAdmin(request);
  const response = await db("branch_partner_requests?select=*&order=created_at.desc&limit=1000");
  if (!response.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_LIST_FAILED" }, 500, id);
  return json(request, { ok: true, requests: await response.json() }, 200, id);
}

async function linkOwner(branchId: string, row: Record<string, unknown>, admin: AdminSession, request: Request): Promise<BranchOwnerAccess> {
  const email = clean(row.email, 160).toLowerCase();
  if (!email) throw new Error("BRANCH_OWNER_EMAIL_REQUIRED");

  const link = async (): Promise<Record<string, unknown>> => {
    const response = await db("rpc/link_branch_owner_by_email", {
      method: "POST",
      body: JSON.stringify({ p_branch_id: branchId, p_email: email, p_partner_request_id: row.id, p_actor: admin.id }),
    });
    if (!response.ok) {
      console.error("branch owner link", response.status, (await response.text().catch(() => "")).slice(0, 300));
      throw new Error("BRANCH_OWNER_LINK_FAILED");
    }
    return await response.json();
  };

  const linked = await link();
  const identityState = clean(linked["identityState"], 20) as BranchOwnerAccess["identityState"] || "UNKNOWN";
  if (linked["membershipLinked"] === true) {
    return { email, membershipLinked: true, inviteSent: false, verificationRequired: false, identityState: "CONFIRMED" };
  }

  // An existing but unverified Auth account must verify that identity. Sending a
  // second invite can fail with "user already exists" and must never abort branch provisioning.
  if (identityState === "UNVERIFIED") {
    return { email, membershipLinked: false, inviteSent: false, verificationRequired: true, identityState };
  }

  const inviteId = clean(linked["inviteId"], 80);
  const origin = allowedRedirectOrigin(request);
  const endpoint = new URL(`${SUPABASE_URL}/auth/v1/invite`);
  if (origin) endpoint.searchParams.set("redirect_to", `${origin}/branch-portal/login`);
  const invitation = await fetch(endpoint, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      email,
      data: { branch_id: branchId, branch_role: "BRANCH_OWNER", partner_reference: row.reference },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!invitation.ok) {
    const detail = await invitation.text().catch(() => "");
    if (inviteId) {
      await db("rpc/mark_branch_invite_delivery", {
        method: "POST",
        body: JSON.stringify({ p_invite_id: inviteId, p_status: "FAILED", p_error: detail.slice(0, 500) }),
      }).catch(() => null);
    }
    throw new Error("BRANCH_OWNER_INVITE_FAILED");
  }
  if (inviteId) {
    await db("rpc/mark_branch_invite_delivery", {
      method: "POST",
      body: JSON.stringify({ p_invite_id: inviteId, p_status: "SENT" }),
    });
  }

  return { email, membershipLinked: false, inviteSent: true, verificationRequired: true, identityState: "MISSING" };
}

async function provision(request: Request, input: Record<string, unknown>, id: string): Promise<Response> {
  const admin = await requireAdmin(request);
  const reference = clean(input.reference, 80);
  if (!reference) return json(request, { ok: false, code: "INVALID_PROVISION_REQUEST" }, 400, id);
  const lookup = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  if (!lookup.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_LOOKUP_FAILED" }, 500, id);
  const rows = await lookup.json();
  const row = Array.isArray(rows) ? rows[0] as Record<string, unknown> : null;
  if (!row) return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_FOUND" }, 404, id);
  if (row.status !== "APPROVED") return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_APPROVED" }, 409, id);
  if (!row.email) return json(request, { ok: false, code: "BRANCH_OWNER_EMAIL_REQUIRED" }, 409, id);

  const rpc = await db("rpc/provision_branch_partner_request", {
    method: "POST",
    body: JSON.stringify({ p_reference: reference, p_actor: admin.id, p_branch_name: clean(input.branchName, 160) || null }),
  });
  if (!rpc.ok) {
    console.error("branch provision failed", id, (await rpc.text().catch(() => "")).slice(0, 500));
    return json(request, { ok: false, code: "BRANCH_PROVISION_FAILED" }, 500, id);
  }
  const branch = await rpc.json();
  const branchId = clean(branch?.branchId, 80);
  if (!branchId) return json(request, { ok: false, code: "BRANCH_PROVISION_RESPONSE_INVALID" }, 500, id);
  const ownerAccess = await linkOwner(branchId, row, admin, request);
  const refreshed = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  const refreshedRows = refreshed.ok ? await refreshed.json() : [];
  return json(request, { ok: true, branch: { ...branch, ownerAccess }, request: Array.isArray(refreshedRows) ? refreshedRows[0] : null }, 200, id);
}

async function updateApplication(request: Request, input: Record<string, unknown>, id: string): Promise<Response> {
  const admin = await requireAdmin(request);
  if (clean(input.action, 30).toUpperCase() === "PROVISION") return provision(request, input, id);
  const reference = clean(input.reference, 80);
  const status = clean(input.status, 30).toUpperCase();
  if (!reference || !ALLOWED_STATUS.has(status)) return json(request, { ok: false, code: "INVALID_UPDATE" }, 400, id);
  const existing = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  const existingRows = existing.ok ? await existing.json() : [];
  const row = Array.isArray(existingRows) ? existingRows[0] : null;
  if (!row) return json(request, { ok: false, code: "BRANCH_PARTNER_NOT_FOUND" }, 404, id);
  if (status === "APPROVED" && !row.email) {
    return json(request, { ok: false, code: "BRANCH_OWNER_EMAIL_REQUIRED", message: "Şubeyi onaylamak için aday e-postası zorunludur." }, 409, id);
  }
  const patch: Record<string, unknown> = {
    status,
    internal_notes: clean(input.internalNotes, 4000) || null,
    updated_at: new Date().toISOString(),
  };
  if (status === "APPROVED") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = admin.id;
  }
  const response = await db(`branch_partner_requests?reference=eq.${encodeURIComponent(reference)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return json(request, { ok: false, code: "BRANCH_PARTNER_UPDATE_FAILED" }, 500, id);
  return json(request, { ok: true, request: (await response.json())[0] }, 200, id);
}

Deno.serve(async (request) => {
  const id = requestId(request);
  const origin = allowedOrigin(request);
  if (request.headers.get("origin") && origin === "") return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED", requestId: id }, 403, id);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors(request), "x-request-id": id } });
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (Number(request.headers.get("content-length") || 0) > 32_768) return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, id);
  try {
    if (request.method === "GET") return await listApplications(request, id);
    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { return json(request, { ok: false, code: "INVALID_JSON" }, 400, id); }
    if (request.method === "POST") return await createApplication(request, input, id);
    if (request.method === "PATCH") return await updateApplication(request, input, id);
    return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_PARTNER_FAILED";
    const status = code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : code.includes("REQUIRED") || code.includes("INVALID") ? 400 : 503;
    console.error("branch-partner-v164", id, code);
    return json(request, { ok: false, code, requestId: id }, status, id);
  }
});
