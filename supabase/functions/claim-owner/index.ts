import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PRIMARY_OWNER_EMAIL = "ishak595@gmail.com";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
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
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);

  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!userResponse.ok) return json({ ok: false, code: "UNAUTHORIZED" }, 401);

  const user = await userResponse.json();
  const userId = typeof user?.id === "string" ? user.id : "";
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  const confirmedAt = user?.email_confirmed_at || user?.confirmed_at || null;
  if (!userId || email !== PRIMARY_OWNER_EMAIL) return json({ ok: false, code: "FORBIDDEN" }, 403);
  if (!confirmedAt) return json({ ok: false, code: "EMAIL_NOT_CONFIRMED" }, 403);

  const existingResponse = await rest("admin_users?select=user_id,email,role,is_active&limit=2");
  if (!existingResponse.ok) return json({ ok: false, code: "ADMIN_STATE_READ_FAILED" }, 500);
  const admins = await existingResponse.json();
  const existing = Array.isArray(admins) ? admins : [];

  if (existing.length > 0) {
    const mine = existing.find((row: any) => row.user_id === userId && String(row.email || "").toLowerCase() === email);
    if (!mine) return json({ ok: false, code: "OWNER_ALREADY_INITIALIZED" }, 409);
    return json({ ok: true, alreadyInitialized: true, role: mine.role });
  }

  const insertResponse = await rest("admin_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      email,
      display_name: "İshak Alper",
      role: "owner",
      is_active: true,
    }),
  });
  if (!insertResponse.ok) {
    console.error("Owner bootstrap insert failed", insertResponse.status, (await insertResponse.text()).slice(0, 500));
    return json({ ok: false, code: "OWNER_INITIALIZATION_FAILED" }, 500);
  }

  await rest("audit_logs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: userId,
      actor_email: email,
      action: "owner_initialized",
      entity_type: "admin_user",
      entity_id: userId,
      after_data: { email, role: "owner" },
    }),
  }).catch(() => undefined);

  return json({ ok: true, role: "owner" }, 201);
});
