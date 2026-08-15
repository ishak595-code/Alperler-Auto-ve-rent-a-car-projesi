import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const allowedOrigin = (origin: string): string => {
  if (!origin) return "*";
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (
      host === "alperrentacar.online" ||
      host === "www.alperrentacar.online" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app")
    ) return origin;
  } catch {
    // Invalid Origin is intentionally rejected below.
  }
  return "null";
};

function responseHeaders(request: Request): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": allowedOrigin(request.headers.get("origin") || ""),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: responseHeaders(request) });
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function consume(
  keyHash: string,
  scope: string,
  windowSeconds: number,
  limit: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key_hash: keyHash,
    p_scope: scope,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw error;
  return Boolean(data);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }
  if (request.method !== "POST") {
    return json(request, { ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }
  if (!URL || !SERVICE_KEY) {
    return json(request, { ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  }
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return json(request, { ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
  }

  try {
    const payload = (await request.json().catch(() => null)) as {
      email?: unknown;
      locale?: unknown;
    } | null;
    const email =
      typeof payload?.email === "string"
        ? payload.email.trim().toLowerCase().slice(0, 160)
        : "";
    const rawLocale =
      typeof payload?.locale === "string"
        ? payload.locale.trim().toLowerCase().slice(0, 10)
        : "tr";
    const locale = /^[a-z]{2}(-[a-z]{2})?$/.test(rawLocale) ? rawLocale : "tr";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json(request, { ok: false, code: "INVALID_EMAIL" }, 400);
    }

    const ip = (
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("cf-connecting-ip") ||
      "unknown"
    ).trim().slice(0, 100);
    const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 260);
    const networkHash = await digest(`${ip}|${userAgent}`);
    const emailHash = await digest(email);

    if (
      !(await consume(networkHash, "newsletter_network", 3600, 12)) ||
      !(await consume(emailHash, "newsletter_email", 86400, 4))
    ) {
      return json(request, { ok: false, code: "RATE_LIMITED" }, 429);
    }

    const { data: existing, error: lookupError } = await supabase
      .from("subscribers")
      .select("id,status")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existing?.id) {
      const { error } = await supabase
        .from("subscribers")
        .update({
          status: "ACTIVE",
          locale,
          source: "WEB",
          consent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
      return json(request, { ok: true, subscribed: true, existing: true });
    }

    const { error: insertError } = await supabase.from("subscribers").insert({
      email,
      locale,
      status: "ACTIVE",
      source: "WEB",
      consent_at: new Date().toISOString(),
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return json(request, { ok: true, subscribed: true, existing: true });
      }
      throw insertError;
    }

    return json(request, { ok: true, subscribed: true, existing: false }, 201);
  } catch (error) {
    console.error("newsletter-gateway failed", error);
    return json(request, { ok: false, code: "NEWSLETTER_FAILED" }, 500);
  }
});
