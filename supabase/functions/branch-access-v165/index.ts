import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

type AuthUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function cors(request: Request): Record<string, string> {
  const origin = clean(request.headers.get("origin"), 240);
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-request-id,x-app-origin",
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

function serviceHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
  };
}

async function verifiedUser(request: Request): Promise<{ id: string; email: string }> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("UNAUTHORIZED");

  const user = await response.json() as AuthUser;
  const id = clean(user.id, 80);
  const email = clean(user.email, 160).toLowerCase();
  if (!id || !email) throw new Error("UNAUTHORIZED");
  if (!user.email_confirmed_at) throw new Error("EMAIL_VERIFICATION_REQUIRED");
  return { id, email };
}

async function claim(user: { id: string; email: string }): Promise<Record<string, unknown>> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_branch_access_by_identity`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ p_user_id: user.id, p_email: user.email }),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = clean(payload["message"], 300);
    if (message.includes("EMAIL_VERIFICATION_REQUIRED")) throw new Error("EMAIL_VERIFICATION_REQUIRED");
    if (message.includes("BRANCH_IDENTITY_EMAIL_MISMATCH")) throw new Error("BRANCH_IDENTITY_EMAIL_MISMATCH");
    throw new Error("BRANCH_ACCESS_CLAIM_FAILED");
  }
  return payload;
}

Deno.serve(async (request) => {
  const id = requestId(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...cors(request), "x-request-id": id } });
  }
  if (request.method !== "POST") return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405, id);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503, id);
  if (Number(request.headers.get("content-length") || 0) > 1_024) return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, id);

  try {
    const user = await verifiedUser(request);
    const result = await claim(user);
    if (result["authorized"] !== true) {
      return json(request, { ok: false, code: "BRANCH_ACCESS_NOT_GRANTED", requestId: id }, 403, id);
    }
    return json(request, { ok: true, ...result, requestId: id }, 200, id);
  } catch (error) {
    const code = error instanceof Error ? error.message : "BRANCH_ACCESS_FAILED";
    const status = code === "UNAUTHORIZED" ? 401 : code === "EMAIL_VERIFICATION_REQUIRED" || code === "BRANCH_IDENTITY_EMAIL_MISMATCH" ? 403 : 503;
    console.error("branch-access-v165", id, code);
    return json(request, { ok: false, code, requestId: id }, status, id);
  }
});
