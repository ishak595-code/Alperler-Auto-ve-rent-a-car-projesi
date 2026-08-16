import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const client = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

type AdminSession = { id: string; email: string; role: string; permissions: Record<string, unknown> };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...cors(request), "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } });
}

function serviceHeaders() {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" };
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) }, signal: AbortSignal.timeout(10_000) });
}

async function requireAdmin(request: Request): Promise<AdminSession> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, authorization }, signal: AbortSignal.timeout(8_000) });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  if (!id) throw new Error("UNAUTHORIZED");
  const response = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if (!response.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
  return { id, email: clean(user?.email, 160), role: clean(rows[0].role, 30).toLowerCase(), permissions: rows[0].permissions && typeof rows[0].permissions === "object" ? rows[0].permissions : {} };
}

function canSensitive(admin: AdminSession): boolean {
  return admin.role === "owner" || admin.role === "admin" || admin.permissions?.["team.manage"] === true || admin.permissions?.["settings.manage"] === true;
}

function canModerate(admin: AdminSession): boolean {
  return canSensitive(admin) || admin.role === "editor" || admin.permissions?.["content.manage"] === true;
}

function canOperate(admin: AdminSession): boolean {
  return canSensitive(admin) || admin.role === "support" || admin.permissions?.["operations.manage"] === true;
}

async function loadBranchWorkspace(branchId: string) {
  const [branchResponse, checklistResponse, pricingResponse, membersResponse, policiesResponse, acceptancesResponse, vehiclesResponse, toursResponse] = await Promise.all([
    db(`branches?id=eq.${encodeURIComponent(branchId)}&select=*&limit=1`),
    db(`branch_setup_checklist?branch_id=eq.${encodeURIComponent(branchId)}&select=*&order=sort_order.asc`),
    db(`branch_pricing_rules?or=(branch_id.eq.${encodeURIComponent(branchId)},branch_id.is.null)&is_active=eq.true&select=*&order=category.asc,vehicle_class.asc`),
    db(`branch_memberships?branch_id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&select=id,user_id,role,invited_email,created_at&order=created_at.asc`),
    db("network_policy_rules?is_active=eq.true&select=id,rule_key,version,category,title,summary,is_required&order=category.asc,version.desc"),
    db(`branch_policy_acceptances?branch_id=eq.${encodeURIComponent(branchId)}&select=id,policy_rule_id,accepted_by,accepted_at`),
    db(`vehicles?branch_id=eq.${encodeURIComponent(branchId)}&listing_origin=eq.BRANCH&select=*&order=updated_at.desc&limit=300`),
    db(`tours?branch_id=eq.${encodeURIComponent(branchId)}&listing_origin=eq.BRANCH&select=*&order=updated_at.desc&limit=200`),
  ]);
  if (!branchResponse.ok) throw new Error("BRANCH_LOAD_FAILED");
  const branchRows = await branchResponse.json();
  if (!Array.isArray(branchRows) || !branchRows[0]) throw new Error("BRANCH_NOT_FOUND");
  const safe = async (response: Response) => response.ok ? await response.json() : [];
  return {
    branch: branchRows[0],
    checklist: await safe(checklistResponse),
    pricing: await safe(pricingResponse),
    members: await safe(membersResponse),
    policies: await safe(policiesResponse),
    acceptances: await safe(acceptancesResponse),
    vehicles: await safe(vehiclesResponse),
    tours: await safe(toursResponse),
  };
}

async function findOrInviteUser(request: Request, branchId: string, email: string) {
  let userId = "";
  let invited = false;
  for (let page = 1; page <= 10 && !userId; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("AUTH_USER_LOOKUP_FAILED");
    const match = data.users.find((user) => String(user.email || "").toLowerCase() === email);
    if (match) userId = match.id;
    if (data.users.length < 100) break;
  }
  if (!userId) {
    const origin = clean(request.headers.get("origin"), 500);
    const configured = clean(Deno.env.get("PUBLIC_SITE_URL"), 500);
    const base = /^https?:\/\//i.test(configured) ? configured.replace(/\/$/, "") : /^https?:\/\//i.test(origin) ? origin.replace(/\/$/, "") : undefined;
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      data: { alperler_branch_id: branchId, alperler_role: "branch_partner" },
      ...(base ? { redirectTo: `${base}/branch-portal/login` } : {}),
    });
    if (error || !data.user?.id) throw new Error(error?.message?.toLowerCase().includes("redirect") ? "INVITE_REDIRECT_NOT_ALLOWED" : "BRANCH_INVITE_FAILED");
    userId = data.user.id;
    invited = true;
  }
  return { userId, invited };
}

async function inviteMember(request: Request, admin: AdminSession, input: any): Promise<Response> {
  if (!canSensitive(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  const email = clean(input?.email, 160).toLowerCase();
  const role = clean(input?.role, 40).toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(branchId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["BRANCH_OWNER","BRANCH_MANAGER","BRANCH_EDITOR"].includes(role)) return json(request, { ok: false, code: "INVALID_MEMBER" }, 400);
  const branchResponse = await db(`branches?id=eq.${encodeURIComponent(branchId)}&select=id,name,network_type&limit=1`);
  const branchRows = branchResponse.ok ? await branchResponse.json() : [];
  if (!Array.isArray(branchRows) || !branchRows[0]) return json(request, { ok: false, code: "BRANCH_NOT_FOUND" }, 404);
  if (branchRows[0].network_type === "OWNED") return json(request, { ok: false, code: "OWNED_BRANCH_MEMBER_PORTAL_NOT_REQUIRED" }, 409);

  const { userId, invited } = await findOrInviteUser(request, branchId, email);
  const response = await db("branch_memberships?on_conflict=branch_id,user_id&select=id,branch_id,user_id,role,invited_email,is_active", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ branch_id: branchId, user_id: userId, role, invited_email: email, is_active: true, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return json(request, { ok: false, code: "BRANCH_MEMBER_SAVE_FAILED" }, 500);
  const rows = await response.json();
  return json(request, { ok: true, member: rows[0], invited });
}

async function setChecklist(request: Request, admin: AdminSession, input: any): Promise<Response> {
  if (!canOperate(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  const key = clean(input?.checklistKey, 80).toUpperCase();
  const completed = input?.completed === true;
  const notes = clean(input?.notes, 1500) || null;
  if (!branchId || !key) return json(request, { ok: false, code: "INVALID_CHECKLIST" }, 400);
  const patch = { completed_at: completed ? new Date().toISOString() : null, completed_by: completed ? admin.id : null, notes, updated_at: new Date().toISOString() };
  const response = await db(`branch_setup_checklist?branch_id=eq.${encodeURIComponent(branchId)}&checklist_key=eq.${encodeURIComponent(key)}&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
  if (!response.ok) return json(request, { ok: false, code: "CHECKLIST_UPDATE_FAILED" }, 500);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return json(request, { ok: false, code: "CHECKLIST_ITEM_NOT_FOUND" }, 404);
  return json(request, { ok: true, item: rows[0] });
}

async function setPricing(request: Request, admin: AdminSession, input: any): Promise<Response> {
  if (!canSensitive(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  const category = clean(input?.category, 20).toUpperCase();
  const vehicleClass = clean(input?.vehicleClass, 80) || "*";
  if (!branchId || !["RENTAL","SALE","TOUR"].includes(category)) return json(request, { ok: false, code: "INVALID_PRICING_RULE" }, 400);
  const numberOrNull = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : null; };
  const minPrice = numberOrNull(input?.minPrice);
  const maxPrice = numberOrNull(input?.maxPrice);
  const recommendedPrice = numberOrNull(input?.recommendedPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return json(request, { ok: false, code: "INVALID_PRICE_RANGE" }, 400);
  const lookup = await db(`branch_pricing_rules?branch_id=eq.${encodeURIComponent(branchId)}&category=eq.${encodeURIComponent(category)}&vehicle_class=eq.${encodeURIComponent(vehicleClass)}&currency=eq.TRY&is_active=eq.true&select=id&limit=1`);
  const rows = lookup.ok ? await lookup.json() : [];
  const existingId = Array.isArray(rows) ? rows[0]?.id : null;
  const payload = { branch_id: branchId, category, vehicle_class: vehicleClass, min_price: minPrice, max_price: maxPrice, recommended_price: recommendedPrice, currency: "TRY", enforce_min: input?.enforceMin !== false, enforce_max: input?.enforceMax === true, is_active: true, updated_at: new Date().toISOString() };
  const response = await db(existingId ? `branch_pricing_rules?id=eq.${encodeURIComponent(existingId)}&select=*` : "branch_pricing_rules?select=*", { method: existingId ? "PATCH" : "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  if (!response.ok) return json(request, { ok: false, code: "PRICING_RULE_SAVE_FAILED" }, 500);
  return json(request, { ok: true, rule: (await response.json())[0] });
}

async function changeBranchState(request: Request, admin: AdminSession, input: any, activate: boolean): Promise<Response> {
  if (!canSensitive(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  if (!branchId) return json(request, { ok: false, code: "INVALID_BRANCH" }, 400);
  const response = await db(`branches?id=eq.${encodeURIComponent(branchId)}&network_type=neq.OWNED&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(activate ? { is_active: true, public_status: "ACTIVE", updated_at: new Date().toISOString() } : { is_active: false, public_status: "SUSPENDED", updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = clean(error?.message, 500);
    if (message.includes("BRANCH_SETUP_INCOMPLETE")) return json(request, { ok: false, code: "BRANCH_SETUP_INCOMPLETE" }, 409);
    if (message.includes("BRANCH_REQUIRED_POLICIES_NOT_ACCEPTED")) return json(request, { ok: false, code: "BRANCH_REQUIRED_POLICIES_NOT_ACCEPTED" }, 409);
    if (message.includes("BRANCH_ADDRESS_PHONE_REQUIRED")) return json(request, { ok: false, code: "BRANCH_ADDRESS_PHONE_REQUIRED" }, 409);
    return json(request, { ok: false, code: "BRANCH_STATE_UPDATE_FAILED" }, 500);
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return json(request, { ok: false, code: "BRANCH_NOT_FOUND" }, 404);
  return json(request, { ok: true, branch: rows[0] });
}

async function moderateVehicle(request: Request, admin: AdminSession, input: any): Promise<Response> {
  if (!canModerate(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  const vehicleId = clean(input?.vehicleId, 80);
  const decision = clean(input?.decision, 20).toUpperCase();
  const reason = clean(input?.reason, 1500) || null;
  if (!branchId || !vehicleId || !["APPROVE","REJECT","SUSPEND"].includes(decision)) return json(request, { ok: false, code: "INVALID_MODERATION" }, 400);
  const patch = decision === "APPROVE"
    ? { publication_status: "PUBLISHED", approved_by: admin.id, approved_at: new Date().toISOString(), published_at: new Date().toISOString(), rejection_reason: null, is_active: true, data_quality_status: "VERIFIED" }
    : decision === "REJECT"
      ? { publication_status: "REJECTED", approved_by: null, approved_at: null, published_at: null, rejection_reason: reason || "Merkezi yayın kriterleri karşılanmadı." }
      : { publication_status: "SUSPENDED", is_active: false, rejection_reason: reason || "Merkez tarafından yayından kaldırıldı." };
  const response = await db(`vehicles?id=eq.${encodeURIComponent(vehicleId)}&branch_id=eq.${encodeURIComponent(branchId)}&listing_origin=eq.BRANCH&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
  if (!response.ok) return json(request, { ok: false, code: "VEHICLE_MODERATION_FAILED" }, 500);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return json(request, { ok: false, code: "VEHICLE_NOT_FOUND" }, 404);
  return json(request, { ok: true, vehicle: rows[0] });
}

async function moderateTour(request: Request, admin: AdminSession, input: any): Promise<Response> {
  if (!canModerate(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
  const branchId = clean(input?.branchId, 80);
  const tourId = clean(input?.tourId, 80);
  const decision = clean(input?.decision, 20).toUpperCase();
  const reason = clean(input?.reason, 1500) || null;
  if (!branchId || !tourId || !["APPROVE","REJECT","SUSPEND"].includes(decision)) return json(request, { ok: false, code: "INVALID_MODERATION" }, 400);
  const patch = decision === "APPROVE"
    ? { publication_status: "PUBLISHED", approved_by: admin.id, approved_at: new Date().toISOString(), published_at: new Date().toISOString(), rejection_reason: null, is_active: true, data_quality_status: "VERIFIED" }
    : decision === "REJECT"
      ? { publication_status: "REJECTED", approved_by: null, approved_at: null, published_at: null, rejection_reason: reason || "Merkezi yayın kriterleri karşılanmadı." }
      : { publication_status: "SUSPENDED", is_active: false, rejection_reason: reason || "Merkez tarafından yayından kaldırıldı." };
  const response = await db(`tours?id=eq.${encodeURIComponent(tourId)}&branch_id=eq.${encodeURIComponent(branchId)}&listing_origin=eq.BRANCH&select=*`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
  if (!response.ok) return json(request, { ok: false, code: "TOUR_MODERATION_FAILED" }, 500);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return json(request, { ok: false, code: "TOUR_NOT_FOUND" }, 404);
  return json(request, { ok: true, tour: rows[0] });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  try {
    const admin = await requireAdmin(request);
    if (request.method === "GET") {
      if (!canOperate(admin) && !canModerate(admin)) return json(request, { ok: false, code: "FORBIDDEN" }, 403);
      const branchId = clean(new URL(request.url).searchParams.get("branchId"), 80);
      if (!branchId) return json(request, { ok: false, code: "INVALID_BRANCH" }, 400);
      return json(request, { ok: true, workspace: await loadBranchWorkspace(branchId) });
    }
    if (request.method === "PATCH") {
      const input = await request.json().catch(() => ({}));
      const action = clean(input?.action, 40).toUpperCase();
      if (action === "INVITE_MEMBER") return await inviteMember(request, admin, input);
      if (action === "SET_CHECKLIST") return await setChecklist(request, admin, input);
      if (action === "SET_PRICING") return await setPricing(request, admin, input);
      if (action === "ACTIVATE") return await changeBranchState(request, admin, input, true);
      if (action === "SUSPEND") return await changeBranchState(request, admin, input, false);
      if (action === "MODERATE_VEHICLE") return await moderateVehicle(request, admin, input);
      if (action === "MODERATE_TOUR") return await moderateTour(request, admin, input);
      return json(request, { ok: false, code: "UNKNOWN_ACTION" }, 400);
    }
    return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_NETWORK_ADMIN_FAILED";
    if (code === "UNAUTHORIZED") return json(request, { ok: false, code }, 401);
    if (code === "FORBIDDEN") return json(request, { ok: false, code }, 403);
    if (code === "BRANCH_NOT_FOUND") return json(request, { ok: false, code }, 404);
    console.error("branch-network-admin", error);
    return json(request, { ok: false, code }, 500);
  }
});
