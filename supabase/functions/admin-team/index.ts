import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allowedRoles = new Set(["owner", "admin", "editor", "support"]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function adminInviteRedirect(): string {
  const configured = clean(Deno.env.get("ADMIN_INVITE_REDIRECT_URL"), 500);
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:") return parsed.toString();
    } catch {
      console.warn("Ignoring invalid ADMIN_INVITE_REDIRECT_URL");
    }
  }
  return "https://alperrentacar.online/admin/login";
}

function email(value: unknown): string | null {
  const normalized = clean(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(10_000),
  });
}

async function requester(request: Request): Promise<{ id: string; email: string }> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  const userEmail = email(user?.email);
  if (!id || !userEmail) throw new Error("UNAUTHORIZED");
  const adminResponse = await rest(
    `admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&role=eq.owner&select=user_id,role&limit=1`,
  );
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("OWNER_REQUIRED");
  return { id, email: userEmail };
}

async function audit(actor: { id: string; email: string }, action: string, entityId: string, afterData: unknown) {
  await rest("audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action,
      entity_type: "admin_user",
      entity_id: entityId,
      after_data: afterData,
    }),
  }).catch(() => undefined);
}

async function ensureAdminBranchAccess(userId: string, branchId: string | null): Promise<void> {
  if (!branchId) return;
  const response = await rest("admin_user_branches?on_conflict=user_id,branch_id", {
    method: "POST",
    headers: { Prefer: "return=minimal,resolution=ignore-duplicates" },
    body: JSON.stringify({ user_id: userId, branch_id: branchId }),
  });
  if (!response.ok) throw new Error("ADMIN_BRANCH_ACCESS_SAVE_FAILED");
}

async function findAuthUser(targetEmail: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.trim().toLowerCase() === targetEmail);
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function invite(actor: { id: string; email: string }, input: Record<string, unknown>) {
  const targetEmail = email(input["email"]);
  const displayName = clean(input["displayName"], 160);
  const role = clean(input["role"], 30).toLowerCase();
  const branchId = clean(input["primaryBranchId"], 80) || null;
  const permissions = input["permissions"] && typeof input["permissions"] === "object" ? input["permissions"] : {};
  if (!targetEmail || !displayName || !allowedRoles.has(role)) {
    return json({ ok: false, code: "INVALID_ADMIN_INVITE" }, 400);
  }

  let user = await findAuthUser(targetEmail);
  let invited = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(targetEmail, {
      data: { display_name: displayName, invited_by: actor.email },
      redirectTo: adminInviteRedirect(),
    });
    if (error || !data.user?.id) {
      console.error("admin invite failed", error);
      return json({ ok: false, code: "ADMIN_INVITE_EMAIL_FAILED" }, 502);
    }
    user = data.user;
    invited = true;
  }

  const upsert = await rest("admin_users?on_conflict=user_id&select=*", {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: user.id,
      email: targetEmail,
      display_name: displayName,
      role,
      is_active: true,
      permissions,
      primary_branch_id: branchId,
      invited_by: actor.id,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!upsert.ok) {
    console.error("admin row upsert failed", upsert.status, (await upsert.text()).slice(0, 500));
    return json({ ok: false, code: "ADMIN_ROW_SAVE_FAILED" }, 500);
  }
  const rows = await upsert.json();

  try {
    await ensureAdminBranchAccess(user.id, branchId);
  } catch (error) {
    console.error("admin branch access save failed", error);
    return json({ ok: false, code: "ADMIN_BRANCH_ACCESS_SAVE_FAILED" }, 500);
  }

  await audit(actor, invited ? "admin_invited" : "admin_access_granted", user.id, {
    email: targetEmail,
    displayName,
    role,
    primaryBranchId: branchId,
    permissions,
  });
  return json({ ok: true, invited, admin: Array.isArray(rows) ? rows[0] : null }, invited ? 201 : 200);
}

async function updateAdmin(actor: { id: string; email: string }, input: Record<string, unknown>) {
  const userId = clean(input["userId"], 80);
  if (!userId) return json({ ok: false, code: "ADMIN_USER_ID_REQUIRED" }, 400);
  const currentResponse = await rest(`admin_users?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`);
  if (!currentResponse.ok) return json({ ok: false, code: "ADMIN_LOOKUP_FAILED" }, 500);
  const currentRows = await currentResponse.json();
  const current = Array.isArray(currentRows) ? currentRows[0] : null;
  if (!current) return json({ ok: false, code: "ADMIN_NOT_FOUND" }, 404);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let requestedPrimaryBranch: string | null | undefined;
  const hasPrimaryBranch = Object.prototype.hasOwnProperty.call(input, "primaryBranchId");
  const fullUiUpdate =
    Object.prototype.hasOwnProperty.call(input, "role") &&
    Object.prototype.hasOwnProperty.call(input, "isActive") &&
    Object.prototype.hasOwnProperty.call(input, "permissions");

  if (input["role"] !== undefined) {
    const role = clean(input["role"], 30).toLowerCase();
    if (!allowedRoles.has(role)) return json({ ok: false, code: "INVALID_ADMIN_ROLE" }, 400);
    patch["role"] = role;
  }
  if (input["displayName"] !== undefined) patch["display_name"] = clean(input["displayName"], 160) || null;
  if (input["isActive"] !== undefined) patch["is_active"] = input["isActive"] === true;
  if (hasPrimaryBranch || fullUiUpdate) {
    requestedPrimaryBranch = hasPrimaryBranch ? clean(input["primaryBranchId"], 80) || null : null;
    patch["primary_branch_id"] = requestedPrimaryBranch;
  }
  if (input["permissions"] !== undefined && input["permissions"] && typeof input["permissions"] === "object") patch["permissions"] = input["permissions"];

  const update = await rest(`admin_users?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!update.ok) {
    const body = await update.text();
    if (body.includes("LAST_ACTIVE_OWNER_PROTECTED")) return json({ ok: false, code: "LAST_ACTIVE_OWNER_PROTECTED" }, 409);
    console.error("admin update failed", update.status, body.slice(0, 500));
    return json({ ok: false, code: "ADMIN_UPDATE_FAILED" }, 500);
  }

  if (requestedPrimaryBranch !== undefined) {
    try {
      await ensureAdminBranchAccess(userId, requestedPrimaryBranch);
    } catch (error) {
      console.error("admin primary branch access sync failed", error);
      return json({ ok: false, code: "ADMIN_BRANCH_ACCESS_SAVE_FAILED" }, 500);
    }
  }

  const rows = await update.json();
  await audit(actor, "admin_access_updated", userId, patch);
  return json({ ok: true, admin: Array.isArray(rows) ? rows[0] : null });
}

Deno.serve(async (request) => {
  if (!["POST", "PATCH"].includes(request.method)) return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 30_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);

  let actor: { id: string; email: string };
  try {
    actor = await requester(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    return json({ ok: false, code }, code === "OWNER_REQUIRED" ? 403 : 401);
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  try {
    return request.method === "POST" ? await invite(actor, input) : await updateAdmin(actor, input);
  } catch (error) {
    console.error("admin-team failed", error);
    return json({ ok: false, code: "ADMIN_TEAM_FAILED" }, 500);
  }
});
