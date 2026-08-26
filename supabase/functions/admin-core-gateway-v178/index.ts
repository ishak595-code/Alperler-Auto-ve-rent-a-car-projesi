import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY_BYTES = 64 * 1024;

type JsonObject = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function uuid(value: unknown): string {
  const text = clean(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}

function serviceHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
  };
}

async function rpc<T = JsonObject>(name: string, body: JsonObject): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = clean(payload?.message || payload?.code, 180) || `${name.toUpperCase()}_${response.status}`;
    throw new Error(code);
  }
  return payload as T;
}

async function requireActor(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const user = await response.json().catch(() => ({}));
  const actor = uuid(user?.id);
  if (!actor) throw new Error("UNAUTHORIZED");
  return actor;
}

function optionalUuid(value: unknown, code: string): string | null {
  const raw = clean(value, 80);
  if (!raw) return null;
  const id = uuid(raw);
  if (!id) throw new Error(code);
  return id;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function integer(value: unknown, fallback = 0, min = 0, max = 1_000_000): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(Math.trunc(number), max)) : fallback;
}

function metadata(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code.includes("REQUIRED") || code.includes("INVALID")) {
    if (code.includes("ADMIN_") || code.endsWith("_ADMIN_REQUIRED")) return 403;
    return 400;
  }
  if (code.includes("NOT_FOUND")) return 404;
  if (code.includes("duplicate key") || code.includes("unique constraint")) return 409;
  return 500;
}

Deno.serve(async (request: Request) => {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!['GET', 'PATCH'].includes(request.method)) return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const actor = await requireActor(request);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const view = clean(url.searchParams.get("view"), 40).toLowerCase() || "operations";
      if (view === "operations") {
        return json(await rpc("service_admin_operations_snapshot_v178", { p_actor: actor }));
      }
      if (view === "management") {
        return json(await rpc("service_admin_management_snapshot_v178", { p_actor: actor }));
      }
      if (view === "staff-branches") {
        const staffId = uuid(url.searchParams.get("staffId"));
        if (!staffId) return json({ ok: false, code: "INVALID_STAFF_ID" }, 400);
        return json(await rpc("service_admin_staff_branches_v178", { p_actor: actor, p_staff_id: staffId }));
      }
      return json({ ok: false, code: "UNKNOWN_VIEW" }, 400);
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    const input = JSON.parse(rawBody || "null") as JsonObject | null;
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ ok: false, code: "INVALID_JSON" }, 400);

    const action = clean(input.action, 60).toUpperCase();

    if (action === "SAVE_STAFF") {
      const department = clean(input.department, 40).toUpperCase();
      if (!clean(input.displayName, 160)) return json({ ok: false, code: "STAFF_NAME_REQUIRED" }, 400);
      return json(await rpc("service_save_staff_v178", {
        p_actor: actor,
        p_staff_id: optionalUuid(input.id, "INVALID_STAFF_ID"),
        p_display_name: clean(input.displayName, 160),
        p_email: clean(input.email, 160) || null,
        p_phone: clean(input.phone, 40) || null,
        p_job_title: clean(input.jobTitle, 120) || null,
        p_department: department || "GENERAL",
        p_is_active: bool(input.isActive, true),
        p_metadata: metadata(input.metadata),
      }));
    }

    if (action === "SET_STAFF_ACTIVE") {
      const staffId = uuid(input.staffId);
      if (!staffId) return json({ ok: false, code: "INVALID_STAFF_ID" }, 400);
      return json(await rpc("service_set_staff_active_v178", { p_actor: actor, p_staff_id: staffId, p_active: bool(input.active, false) }));
    }

    if (action === "ASSIGN_STAFF_BRANCH") {
      const staffId = uuid(input.staffId);
      const branchId = uuid(input.branchId);
      if (!staffId || !branchId) return json({ ok: false, code: "INVALID_ASSIGNMENT_ID" }, 400);
      return json(await rpc("service_assign_staff_branch_v178", { p_actor: actor, p_staff_id: staffId, p_branch_id: branchId, p_primary: bool(input.primary, false) }));
    }

    if (action === "UNASSIGN_STAFF_BRANCH") {
      const staffId = uuid(input.staffId);
      const branchId = uuid(input.branchId);
      if (!staffId || !branchId) return json({ ok: false, code: "INVALID_ASSIGNMENT_ID" }, 400);
      return json(await rpc("service_unassign_staff_branch_v178", { p_actor: actor, p_staff_id: staffId, p_branch_id: branchId }));
    }

    if (action === "ASSIGN_STAFF_VEHICLE") {
      const staffId = uuid(input.staffId);
      const vehicleId = uuid(input.vehicleId);
      if (!staffId || !vehicleId) return json({ ok: false, code: "INVALID_ASSIGNMENT_ID" }, 400);
      return json(await rpc("service_assign_staff_vehicle_v178", {
        p_actor: actor,
        p_vehicle_id: vehicleId,
        p_staff_id: staffId,
        p_responsibility: clean(input.responsibility, 32).toUpperCase(),
      }));
    }

    if (action === "ASSIGN_STAFF_TOUR") {
      const staffId = uuid(input.staffId);
      const tourId = uuid(input.tourId);
      if (!staffId || !tourId) return json({ ok: false, code: "INVALID_ASSIGNMENT_ID" }, 400);
      return json(await rpc("service_assign_staff_tour_v178", {
        p_actor: actor,
        p_tour_id: tourId,
        p_staff_id: staffId,
        p_responsibility: clean(input.responsibility, 32).toUpperCase(),
      }));
    }

    if (action === "SAVE_BRANCH") {
      if (!clean(input.name, 160) || !clean(input.city, 120)) return json({ ok: false, code: "BRANCH_NAME_CITY_REQUIRED" }, 400);
      return json(await rpc("service_save_branch_basic_v178", {
        p_actor: actor,
        p_branch_id: optionalUuid(input.id, "INVALID_BRANCH_ID"),
        p_code: clean(input.code, 40) || null,
        p_name: clean(input.name, 160),
        p_city: clean(input.city, 120),
        p_district: clean(input.district, 120) || null,
        p_address: clean(input.address, 500) || null,
        p_phone: clean(input.phone, 40) || null,
        p_email: clean(input.email, 160) || null,
        p_is_active: bool(input.isActive, true),
        p_sort_order: integer(input.sortOrder),
      }));
    }

    return json({ ok: false, code: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const code = error instanceof SyntaxError ? "INVALID_JSON" : error instanceof Error ? error.message : "ADMIN_CORE_GATEWAY_FAILED";
    console.error("admin-core-gateway-v178", code);
    return json({ ok: false, code }, statusFor(code));
  }
});
