import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type AdminContext = {
  id: string;
  role: string;
  permissions: Record<string, unknown>;
  canLifecycle: boolean;
  canRegistry: boolean;
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

function uuid(value: unknown): string {
  const text = clean(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}

function headers(): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" };
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15_000),
  });
}

async function rpc<T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await db(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.message || payload?.code || `${name.toUpperCase()}_${response.status}`));
  return payload as T;
}

async function requireAdmin(request: Request): Promise<AdminContext> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = uuid(user?.id);
  if (!id) throw new Error("UNAUTHORIZED");

  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  const admin = Array.isArray(rows) ? rows[0] : null;
  if (!admin) throw new Error("FORBIDDEN");

  const role = clean(admin.role, 40).toLowerCase();
  const permissions = admin.permissions && typeof admin.permissions === "object" ? admin.permissions as Record<string, unknown> : {};
  const ownerAdmin = role === "owner" || role === "admin";
  return {
    id,
    role,
    permissions,
    canLifecycle: ownerAdmin || permissions["settings.manage"] === true || permissions["team.manage"] === true,
    canRegistry: ownerAdmin || role === "editor" || role === "support" || permissions["content.manage"] === true || permissions["operations.manage"] === true || permissions["settings.manage"] === true,
  };
}

function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN" || code.endsWith("_ADMIN_REQUIRED")) return 403;
  if (code.includes("NOT_FOUND")) return 404;
  if (code.includes("SUBSCRIPTION_REQUIRED") || code.includes("REASON_REQUIRED")) return 409;
  if (code.includes("INVALID") || code.includes("REQUIRED")) return 400;
  return 500;
}

Deno.serve(async (request: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "PATCH") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const admin = await requireAdmin(request);
    if (Number(request.headers.get("content-length") || 0) > 32 * 1024) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ ok: false, code: "INVALID_JSON" }, 400);
    const action = clean((input as Record<string, unknown>).action, 60).toUpperCase();

    if (action === "SET_LIFECYCLE") {
      if (!admin.canLifecycle) return json({ ok: false, code: "BRANCH_LIFECYCLE_ADMIN_REQUIRED" }, 403);
      const branchId = uuid((input as any).branchId);
      const status = clean((input as any).status, 20).toUpperCase();
      const reason = clean((input as any).reason, 500) || null;
      if (!branchId || !["ACTIVE", "SUSPENDED", "CLOSED", "DRAFT"].includes(status)) return json({ ok: false, code: "INVALID_BRANCH_LIFECYCLE" }, 400);
      return json(await rpc("service_set_branch_lifecycle_v177", { p_actor: admin.id, p_branch_id: branchId, p_status: status, p_reason: reason }));
    }

    if (action === "SEARCH_VEHICLE_REGISTRY") {
      if (!admin.canRegistry) return json({ ok: false, code: "VEHICLE_REGISTRY_ADMIN_REQUIRED" }, 403);
      const branchIdRaw = clean((input as any).branchId, 80);
      const branchId = branchIdRaw ? uuid(branchIdRaw) : null;
      if (branchIdRaw && !branchId) return json({ ok: false, code: "INVALID_BRANCH_ID" }, 400);
      const limitRaw = Number((input as any).limit || 100);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(Math.floor(limitRaw), 250)) : 100;
      return json(await rpc("service_search_vehicle_registry_v177", {
        p_actor: admin.id,
        p_query: clean((input as any).query, 120) || null,
        p_branch_id: branchId,
        p_from: clean((input as any).from, 40) || null,
        p_to: clean((input as any).to, 40) || null,
        p_limit: limit,
      }));
    }

    if (action === "SAVE_VEHICLE_IDENTIFIERS") {
      if (!admin.canRegistry) return json({ ok: false, code: "VEHICLE_REGISTRY_ADMIN_REQUIRED" }, 403);
      const vehicleId = uuid((input as any).vehicleId);
      if (!vehicleId) return json({ ok: false, code: "INVALID_VEHICLE_ID" }, 400);
      return json(await rpc("service_upsert_vehicle_registry_v177", {
        p_actor: admin.id,
        p_vehicle_id: vehicleId,
        p_license_plate: clean((input as any).licensePlate, 20) || null,
        p_vin: clean((input as any).vin, 24) || null,
        p_registration_reference: clean((input as any).registrationReference, 80) || null,
      }));
    }

    return json({ ok: false, code: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_OPERATIONS_GATEWAY_FAILED";
    console.error("branch-operations-gateway-v177", code);
    return json({ ok: false, code }, statusFor(code));
  }
});
