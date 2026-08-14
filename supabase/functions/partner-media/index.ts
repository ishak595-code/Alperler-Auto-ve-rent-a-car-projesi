import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } });
}
function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, { headers: serviceHeaders(), signal: AbortSignal.timeout(8_000) });
}
async function requireAdmin(request: Request): Promise<void> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const userResponse = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: KEY, authorization }, signal: AbortSignal.timeout(8_000) });
  if (!userResponse.ok) throw new Error("UNAUTHORIZED");
  const user = await userResponse.json();
  const id = clean(user?.id, 80);
  if (!id) throw new Error("UNAUTHORIZED");
  const adminResponse = await db(`admin_users?user_id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=user_id&limit=1`);
  if (!adminResponse.ok) throw new Error("ADMIN_LOOKUP_FAILED");
  const rows = await adminResponse.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error("FORBIDDEN");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    await requireAdmin(request);
    const input = await request.json().catch(() => ({}));
    const reference = clean(input?.reference, 80);
    if (!reference) return json({ ok: false, code: "REFERENCE_REQUIRED" }, 400);
    const response = await db(`partner_requests?reference=eq.${encodeURIComponent(reference)}&select=id,media_paths&limit=1`);
    if (!response.ok) throw new Error("PARTNER_READ_FAILED");
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return json({ ok: false, code: "PARTNER_REQUEST_NOT_FOUND" }, 404);
    const manifest = Array.isArray(row.media_paths) ? row.media_paths : [];
    const paths = manifest.map((item: any) => clean(item?.path, 500)).filter(Boolean);
    if (!paths.length) return json({ ok: true, media: [] });
    const { data, error } = await supabase.storage.from("partner-uploads").createSignedUrls(paths, 600);
    if (error) throw error;
    const media = manifest.map((item: any, index: number) => ({
      path: paths[index],
      originalName: clean(item?.originalName, 180) || `Dosya ${index + 1}`,
      type: clean(item?.type, 100),
      size: Number(item?.size || 0),
      signedUrl: data?.[index]?.signedUrl || null,
      expiresIn: 600,
    }));
    return json({ ok: true, media });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PARTNER_MEDIA_FAILED";
    return json({ ok: false, code }, code === "UNAUTHORIZED" ? 401 : code === "FORBIDDEN" ? 403 : 500);
  }
});
