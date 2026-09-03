import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders: HeadersInit = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-max-age": "86400",
};

function responseHeaders(): HeadersInit {
  return {
    ...corsHeaders,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    pragma: "no-cache",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: responseHeaders() });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rpc(name: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
}

function passwordError(password: string): string | null {
  if (password.length < 12) return "Şifre en az 12 karakter olmalı.";
  if (!/[a-zçğıöşü]/.test(password)) return "En az bir küçük harf kullanın.";
  if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return "En az bir büyük harf kullanın.";
  if (!/[0-9]/.test(password)) return "En az bir rakam kullanın.";
  if (!/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/.test(password)) return "En az bir özel karakter kullanın.";
  return null;
}

async function passwordSeenInBreach(password: string): Promise<boolean | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Alperler-Admin-Password-Safety" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const suffix = hash.slice(5);
    return (await response.text()).split(/\r?\n/).some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch {
    return null;
  }
}

async function updatePassword(userId: string, password: string): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) console.error("admin-first-access-v239 password update failed", response.status);
  return response.ok;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, message: "Bu servis yalnız güvenli kurulum isteğini kabul eder." }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, message: "Yönetici kurulum servisi hazır değil." }, 503);
  if (Number(request.headers.get("content-length") || 0) > 8_192) return json({ ok: false, message: "İstek çok büyük." }, 413);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ ok: false, message: "Geçersiz kurulum isteği." }, 400);
  }

  const setupCode = clean(input.setupCode, 24).replace(/\s+/g, "");
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!/^\d{12}$/.test(setupCode)) return json({ ok: false, message: "Kurulum kodu 12 rakam olmalı." }, 400);
  if (password !== confirmPassword) return json({ ok: false, message: "Yeni şifreler birbiriyle eşleşmiyor." }, 400);
  const validation = passwordError(password);
  if (validation) return json({ ok: false, message: validation }, 400);

  const breached = await passwordSeenInBreach(password);
  if (breached === null) return json({ ok: false, message: "Şifre güvenlik denetimi şu anda tamamlanamadı. Biraz sonra tekrar deneyin." }, 503);
  if (breached) return json({ ok: false, message: "Bu şifre daha önce bir veri sızıntısında görülmüş. Farklı ve benzersiz bir şifre seçin." }, 400);

  const tokenHash = await sha256(setupCode);
  const claim = await rpc("admin_first_access_claim_v239", { p_token_hash: tokenHash });
  if (!claim.ok) return json({ ok: false, message: "Kurulum kodu doğrulanamadı." }, 403);
  const rows = await claim.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  const userId = clean(row?.user_id, 80);
  if (!userId) return json({ ok: false, message: "Kurulum kodu geçersiz, kullanılmış veya süresi dolmuş." }, 403);

  const updated = await updatePassword(userId, password);
  await rpc("admin_first_access_finish_v239", { p_token_hash: tokenHash, p_success: updated }).catch(() => null);
  if (!updated) return json({ ok: false, message: "Yönetici şifresi şu anda kaydedilemedi. Tekrar deneyin." }, 503);

  return json({ ok: true, message: "Yönetici şifresi oluşturuldu." });
});
