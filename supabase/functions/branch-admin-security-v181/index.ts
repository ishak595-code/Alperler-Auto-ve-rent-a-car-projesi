import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_BODY_BYTES = 24_576;
const ALLOWED_ORIGINS = new Set(
  [Deno.env.get("PUBLIC_SITE_URL") || ""]
    .map((value) => { try { return new URL(value).origin; } catch { return ""; } })
    .filter(Boolean),
);

type AdminIdentity = { id: string; email: string; role: string; permissions: Record<string, unknown> };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function allowedOrigin(request: Request): string | null {
  const raw = clean(request.headers.get("origin"), 500);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:", "https:"].includes(parsed.protocol)) return parsed.origin;
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") return parsed.origin;
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch {
    return "";
  }
}

function cors(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET,PATCH,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200, id = requestId(request)): Response {
  const origin = allowedOrigin(request);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(origin || null),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
    },
  });
}

function serviceHeaders(): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(10_000),
  });
}

async function serviceRpc<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const raw = `${payload?.message || ""} ${payload?.details || ""} ${payload?.code || ""}`;
    for (const code of [
      "CONTENT_PERMISSION_REQUIRED",
      "BRANCH_IDENTITY_ADMIN_REQUIRED",
      "INVALID_REVIEW_ACTION",
      "INVALID_LISTING_KIND",
      "REVIEW_NOTE_REQUIRED",
      "BRANCH_VEHICLE_NOT_FOUND",
      "BRANCH_TOUR_NOT_FOUND",
      "BRANCH_OPERATOR_NAMES_REQUIRED",
      "INVALID_OPERATOR_RELATIONSHIP",
      "BRANCH_NOT_FOUND",
    ]) if (raw.includes(code)) throw new Error(code);
    if (response.status === 401 || response.status === 403) throw new Error("FORBIDDEN");
    throw new Error(`${name.toUpperCase()}_FAILED`);
  }
  return payload as T;
}

async function requireAdmin(request: Request): Promise<AdminIdentity> {
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
  if (!/^[0-9a-f-]{36}$/i.test(id) || !email) throw new Error("UNAUTHORIZED");
  const adminResponse = await rest(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id,role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]?.user_id) throw new Error("FORBIDDEN");
  return {
    id,
    email,
    role: clean(rows[0].role, 30).toLowerCase(),
    permissions: rows[0].permissions && typeof rows[0].permissions === "object" ? rows[0].permissions : {},
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(admin: AdminIdentity, scope: string, limit: number): Promise<void> {
  const keyHash = await sha256(`${scope}:${admin.id}`);
  const allowed = await serviceRpc<boolean>("consume_rate_limit", {
    p_key_hash: keyHash,
    p_scope: scope,
    p_window_seconds: 60,
    p_limit: limit,
  });
  if (allowed !== true) throw new Error("RATE_LIMITED");
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error("INVALID_JSON");
  }
}

Deno.serve(async (request: Request) => {
  const id = requestId(request);
  const origin = allowedOrigin(request);
  if (origin === "") return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, id);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("SERVER_MISCONFIGURED");
    const admin = await requireAdmin(request);

    if (request.method === "GET") {
      await enforceRateLimit(admin, "branch-admin-read-v181", 120);
      const view = clean(new URL(request.url).searchParams.get("view"), 40).toLowerCase();
      if (view === "moderation") {
        const data = await serviceRpc<Record<string, unknown>>("service_branch_moderation_snapshot_v181", { p_actor: admin.id });
        return json(request, { ok: true, data }, 200, id);
      }
      if (view === "identities") {
        const rows = await serviceRpc<unknown[]>("service_branch_identity_snapshot_v181", { p_actor: admin.id });
        return json(request, { ok: true, rows: Array.isArray(rows) ? rows : [] }, 200, id);
      }
      return json(request, { ok: false, code: "UNKNOWN_VIEW" }, 400, id);
    }

    if (request.method === "PATCH") {
      await enforceRateLimit(admin, "branch-admin-write-v181", 30);
      const input = await readBody(request);
      const action = clean(input["action"], 50).toUpperCase();

      if (action === "REVIEW_LISTING") {
        const kind = clean(input["kind"], 20).toUpperCase();
        const listingId = clean(input["id"], 80);
        const decision = clean(input["decision"], 20).toUpperCase();
        const note = clean(input["note"], 2000) || null;
        if (!["VEHICLE", "TOUR"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(listingId) || !["APPROVE", "REJECT", "SUSPEND"].includes(decision)) {
          return json(request, { ok: false, code: "INVALID_REVIEW_REQUEST" }, 400, id);
        }
        if (decision === "REJECT" && !note) return json(request, { ok: false, code: "REVIEW_NOTE_REQUIRED" }, 400, id);
        const result = await serviceRpc<Record<string, unknown>>("service_review_branch_listing_v181", {
          p_actor: admin.id,
          p_kind: kind,
          p_id: listingId,
          p_action: decision,
          p_note: note,
          p_request_id: id,
        });
        return json(request, { ok: true, result }, 200, id);
      }

      if (action === "SET_OPERATOR_IDENTITY") {
        const branchId = clean(input["branchId"], 80);
        const displayName = clean(input["displayName"], 180);
        const legalName = clean(input["legalName"], 240);
        const relationship = clean(input["relationship"], 40).toUpperCase();
        const verified = input["verified"] === true;
        if (!/^[0-9a-f-]{36}$/i.test(branchId) || !displayName || !legalName || !["OWNED", "INDEPENDENT_PARTNER", "LICENSED_PARTNER"].includes(relationship)) {
          return json(request, { ok: false, code: "INVALID_OPERATOR_IDENTITY" }, 400, id);
        }
        const result = await serviceRpc<Record<string, unknown>>("service_set_branch_operator_verification_v181", {
          p_actor: admin.id,
          p_branch_id: branchId,
          p_display_name: displayName,
          p_legal_name: legalName,
          p_verified: verified,
          p_relationship: relationship,
          p_request_id: id,
        });
        return json(request, { ok: true, result }, 200, id);
      }

      return json(request, { ok: false, code: "UNKNOWN_ACTION" }, 400, id);
    }

    return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_ADMIN_SECURITY_FAILED";
    if (code === "UNAUTHORIZED") return json(request, { ok: false, code }, 401, id);
    if (["FORBIDDEN", "CONTENT_PERMISSION_REQUIRED", "BRANCH_IDENTITY_ADMIN_REQUIRED"].includes(code)) return json(request, { ok: false, code: "FORBIDDEN" }, 403, id);
    if (code === "RATE_LIMITED") return json(request, { ok: false, code }, 429, id);
    if (["PAYLOAD_TOO_LARGE"].includes(code)) return json(request, { ok: false, code }, 413, id);
    if (["INVALID_JSON", "INVALID_REVIEW_ACTION", "INVALID_LISTING_KIND", "REVIEW_NOTE_REQUIRED", "BRANCH_OPERATOR_NAMES_REQUIRED", "INVALID_OPERATOR_RELATIONSHIP"].includes(code)) return json(request, { ok: false, code }, 400, id);
    if (["BRANCH_VEHICLE_NOT_FOUND", "BRANCH_TOUR_NOT_FOUND", "BRANCH_NOT_FOUND"].includes(code)) return json(request, { ok: false, code }, 404, id);
    console.error("branch-admin-security-v181", id, error);
    return json(request, { ok: false, code: "BRANCH_ADMIN_SECURITY_FAILED" }, 500, id);
  }
});
