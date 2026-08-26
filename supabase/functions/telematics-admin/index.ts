import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const COMMAND_URL = (Deno.env.get("TELEMATICS_COMMAND_URL") || "").trim();
const COMMAND_SECRET = (Deno.env.get("TELEMATICS_COMMAND_SECRET") || "").trim();
const MAX_BODY_BYTES = 16 * 1024;
const COMMANDS = ["LOCK", "UNLOCK", "HORN", "IMMOBILIZE_NEXT_STOP", "CLEAR_IMMOBILIZER"] as const;

const ALLOWED_ORIGINS = new Set(
  [
    Deno.env.get("PUBLIC_SITE_URL") || "",
    "https://alperlerrentaacar.com",
    "https://www.alperlerrentaacar.com",
  ]
    .map((value) => {
      try { return new URL(value).origin; } catch { return ""; }
    })
    .filter(Boolean),
);

type Admin = {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, unknown>;
};

type JsonObject = Record<string, unknown>;

function clean(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function allowedOriginValue(value: string): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && ["http:", "https:"].includes(parsed.protocol)) return parsed.origin;
    if (parsed.hostname.endsWith(".vercel.app") && parsed.protocol === "https:") return parsed.origin;
    return ALLOWED_ORIGINS.has(parsed.origin) ? parsed.origin : "";
  } catch {
    return "";
  }
}

function resolveOrigin(request: Request): { supplied: boolean; allowed: string } {
  const browserOrigin = clean(request.headers.get("origin"), 500);
  const appOrigin = clean(request.headers.get("x-app-origin"), 500);
  if (browserOrigin) return { supplied: true, allowed: allowedOriginValue(browserOrigin) };
  if (appOrigin) return { supplied: true, allowed: allowedOriginValue(appOrigin) };
  return { supplied: false, allowed: "" };
}

function cors(origin: string): Record<string, string> {
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id,x-app-origin",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200, id = requestId(request)): Response {
  const origin = resolveOrigin(request).allowed;
  return Response.json(body, {
    status,
    headers: {
      ...cors(origin),
      "cache-control": "private, no-store, max-age=0",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-request-id": id,
    },
  });
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE,
    authorization: `Bearer ${SERVICE}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(10_000),
  });
}

async function rpc<T = unknown>(name: string, body: JsonObject): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(payload?.message || payload?.code, 180) || `${name.toUpperCase()}_${response.status}`);
  return payload as T;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceRateLimit(admin: Admin, scope: string, limit: number): Promise<void> {
  const allowed = await rpc<boolean>("consume_rate_limit", {
    p_key_hash: await sha256(`${scope}:${admin.id}`),
    p_scope: scope,
    p_window_seconds: 60,
    p_limit: limit,
  });
  if (allowed !== true) throw new Error("RATE_LIMITED");
}

async function requireAdmin(request: Request, manage = false): Promise<Admin> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json().catch(() => ({}));
  const id = clean(user?.id, 80);
  const email = clean(user?.email, 180).toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !email) throw new Error("UNAUTHORIZED");

  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=role,permissions&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const row = (await adminResponse.json().catch(() => []))?.[0];
  if (!row) throw new Error("FORBIDDEN");

  const permissions = row.permissions && typeof row.permissions === "object" ? row.permissions as Record<string, unknown> : {};
  const role = clean(row.role, 30).toLowerCase();
  const privileged = role === "owner" || role === "admin";
  const canRead = privileged || role === "support" || permissions["operations.manage"] === true || permissions["telematics.read"] === true || permissions["telematics.manage"] === true;
  const canWrite = privileged || permissions["telematics.manage"] === true;
  if (!(manage ? canWrite : canRead)) throw new Error("FORBIDDEN");
  return { id, email, role, permissions };
}

async function readBody(request: Request): Promise<JsonObject> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    const parsed = JSON.parse(raw || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
    return parsed as JsonObject;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") throw error;
    throw new Error("INVALID_JSON");
  }
}

function providerBridgeReady(): boolean {
  if (!COMMAND_URL || !COMMAND_SECRET) return false;
  try { return new URL(COMMAND_URL).protocol === "https:"; } catch { return false; }
}

async function signature(payload: string): Promise<string> {
  if (!COMMAND_SECRET) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(COMMAND_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signed)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function list(request: Request, admin: Admin, id: string): Promise<Response> {
  await enforceRateLimit(admin, "telematics-read-v183", 120);
  const [devicesResponse, vehiclesResponse, commandsResponse] = await Promise.all([
    db("vehicle_telematics_devices?select=*&order=updated_at.desc"),
    db("vehicles?category=eq.RENTAL&is_active=eq.true&select=id,stock_code,brand,model,model_year,availability_status,cover_image&order=brand.asc,model.asc"),
    db("vehicle_remote_commands?select=*&order=requested_at.desc&limit=100"),
  ]);
  if (!devicesResponse.ok || !vehiclesResponse.ok || !commandsResponse.ok) throw new Error("TELEMATICS_READ_FAILED");
  return json(request, {
    ok: true,
    devices: await devicesResponse.json(),
    vehicles: await vehiclesResponse.json(),
    commands: await commandsResponse.json(),
    bridgeConfigured: providerBridgeReady(),
  }, 200, id);
}

async function command(request: Request, admin: Admin, body: JsonObject, id: string): Promise<Response> {
  await enforceRateLimit(admin, "telematics-command-v183", 6);
  const vehicleId = clean(body["vehicleId"], 80);
  const type = clean(body["command"], 40).toUpperCase();
  const reason = clean(body["reason"], 500);
  if (!/^[0-9a-f-]{36}$/i.test(vehicleId) || !COMMANDS.includes(type as typeof COMMANDS[number]) || reason.length < 4) throw new Error("INVALID_COMMAND");

  const deviceResponse = await db(`vehicle_telematics_devices?vehicle_id=eq.${encodeURIComponent(vehicleId)}&select=*&limit=1`);
  if (!deviceResponse.ok) throw new Error("DEVICE_READ_FAILED");
  const device = (await deviceResponse.json().catch(() => []))?.[0];
  if (!device) throw new Error("DEVICE_NOT_FOUND");

  const capabilities = device.capabilities && typeof device.capabilities === "object" ? device.capabilities as Record<string, unknown> : {};
  const capabilityKey = ({
    LOCK: "lock",
    UNLOCK: "unlock",
    HORN: "horn",
    IMMOBILIZE_NEXT_STOP: "immobilizer",
    CLEAR_IMMOBILIZER: "immobilizer",
  } as Record<string, string>)[type];
  if (capabilities[capabilityKey] !== true) throw new Error("CAPABILITY_NOT_AVAILABLE");

  const lastSeen = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
  const age = lastSeen ? Math.max(0, Date.now() - lastSeen) : Number.MAX_SAFE_INTEGER;
  const speed = Math.max(0, Number(device.speed_kph || 0));
  const ignition = device.ignition_on === true;
  let status = "QUEUED";
  let blocked = "";

  if (!lastSeen || age > 5 * 60 * 1000) {
    status = "SAFETY_BLOCKED";
    blocked = "TELEMETRY_STALE";
  }
  if (type === "IMMOBILIZE_NEXT_STOP" && (speed > 3 || ignition)) {
    status = "SAFETY_BLOCKED";
    blocked = "VEHICLE_NOT_STATIONARY";
  }
  if (["LOCK", "UNLOCK"].includes(type) && speed > 3) {
    status = "SAFETY_BLOCKED";
    blocked = "VEHICLE_MOVING";
  }

  const safety = {
    requestId: id,
    lastSeenAt: device.last_seen_at || null,
    telemetryAgeMs: age,
    speedKph: speed,
    ignitionOn: ignition,
    connectionStatus: device.connection_status,
    blockedReason: blocked || null,
  };

  const commandResponse = await db("vehicle_remote_commands?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      device_id: device.id,
      command_type: type,
      status,
      reason,
      requested_by: admin.id,
      safety_snapshot: safety,
      error_message: blocked || null,
    }),
  });
  if (!commandResponse.ok) throw new Error("COMMAND_RECORD_FAILED");
  const row = (await commandResponse.json().catch(() => []))?.[0];
  if (!row?.id) throw new Error("COMMAND_RECORD_FAILED");

  if (status === "SAFETY_BLOCKED") return json(request, { ok: false, code: blocked, command: row }, 409, id);

  if (!providerBridgeReady()) {
    await db(`vehicle_remote_commands?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "REJECTED", error_message: "PROVIDER_BRIDGE_NOT_CONFIGURED" }),
    });
    return json(request, { ok: false, code: "PROVIDER_BRIDGE_NOT_CONFIGURED", command: row }, 503, id);
  }

  const payload = JSON.stringify({
    requestId: row.id,
    vehicleId,
    provider: device.provider,
    externalVehicleId: device.external_vehicle_id,
    deviceId: device.device_id,
    command: type,
    reason,
    requestedBy: admin.email,
  });
  const hmac = await signature(payload);

  try {
    const upstream = await fetch(COMMAND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-alperler-signature": hmac,
        "x-request-id": id,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    const providerResponse = await upstream.json().catch(() => ({}));
    const next = upstream.ok ? "SENT" : "FAILED";
    await db(`vehicle_remote_commands?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: next,
        provider_command_id: clean(providerResponse?.commandId || providerResponse?.id, 180) || null,
        provider_response: providerResponse,
        error_message: upstream.ok ? null : `PROVIDER_${upstream.status}`,
      }),
    });
    return json(request, { ok: upstream.ok, status: next, provider: providerResponse }, upstream.ok ? 200 : 502, id);
  } catch (error) {
    await db(`vehicle_remote_commands?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "FAILED", error_message: "PROVIDER_UNAVAILABLE" }),
    }).catch(() => undefined);
    throw error;
  }
}

async function configure(request: Request, admin: Admin, body: JsonObject, id: string): Promise<Response> {
  await enforceRateLimit(admin, "telematics-config-v183", 20);
  const vehicleId = clean(body["vehicleId"], 80);
  if (!/^[0-9a-f-]{36}$/i.test(vehicleId)) throw new Error("VEHICLE_REQUIRED");

  const provider = clean(body["provider"], 80) || "NOT_CONFIGURED";
  const externalVehicleId = clean(body["externalVehicleId"], 180) || null;
  const deviceId = clean(body["deviceId"], 180) || null;
  const rawCapabilities = body["capabilities"] && typeof body["capabilities"] === "object" && !Array.isArray(body["capabilities"])
    ? body["capabilities"] as Record<string, unknown>
    : {};
  const capabilities = {
    lock: rawCapabilities["lock"] === true,
    unlock: rawCapabilities["unlock"] === true,
    horn: rawCapabilities["horn"] === true,
    immobilizer: rawCapabilities["immobilizer"] === true,
  };

  const response = await db(`vehicle_telematics_devices?vehicle_id=eq.${encodeURIComponent(vehicleId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      provider,
      external_vehicle_id: externalVehicleId,
      device_id: deviceId,
      capabilities,
      connection_status: provider === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "OFFLINE",
      updated_by: admin.id,
    }),
  });
  if (!response.ok) throw new Error("DEVICE_UPDATE_FAILED");
  return json(request, { ok: true }, 200, id);
}

function statusFor(code: string): number {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "RATE_LIMITED") return 429;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  if (["INVALID_JSON", "INVALID_COMMAND", "VEHICLE_REQUIRED", "CAPABILITY_NOT_AVAILABLE"].includes(code)) return 400;
  if (code === "DEVICE_NOT_FOUND") return 404;
  return 500;
}

Deno.serve(async (request: Request) => {
  const id = requestId(request);
  const origin = resolveOrigin(request);
  if (origin.supplied && !origin.allowed) return json(request, { ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, id);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin.allowed) });
  if (!SUPABASE_URL || !SERVICE) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (!["GET", "POST"].includes(request.method)) return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);

  try {
    if (request.method === "GET") {
      const admin = await requireAdmin(request, false);
      return await list(request, admin, id);
    }

    const body = await readBody(request);
    const action = clean(body["action"], 40).toLowerCase();
    const admin = await requireAdmin(request, true);
    if (action === "command") return await command(request, admin, body, id);
    if (action === "configure_device") return await configure(request, admin, body, id);
    return json(request, { ok: false, code: "UNKNOWN_ACTION" }, 400, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "TELEMATICS_FAILED";
    console.error("telematics-admin", id, code);
    return json(request, { ok: false, code }, statusFor(code), id);
  }
});
