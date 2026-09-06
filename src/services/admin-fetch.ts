import { SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from "../supabase.config";

/**
 * adminFetch — yönetim paneli için tek veri taşıma noktası.
 *
 * `/api/partner?op=X` adreslerine giden her çağrı önce ilgili Supabase Edge
 * Function'a doğrudan (tarayıcıdan, yönetici JWT ile) gider. Yalnızca taşıma
 * katmanı hatasında (ağ, zaman aşımı, origin reddi, fonksiyon bulunamadı,
 * JSON olmayan 5xx) aynı-origin Site API'ye (/api) düşer. Yetki, doğrulama ve
 * iş kuralı cevapları (401/403/400/409/429 ve kodlu 500) kesindir; yedeğe
 * düşmez. Site API de çökerse (Vercel FUNCTION_INVOCATION_FAILED gibi JSON
 * olmayan gövde) çağırana gerçek nedeni taşıyan bir JSON yanıt döner; böylece
 * ekranda "X_500" yerine hangi katmanın neden yanıt vermediği görünür.
 *
 * Çağıranlar için `fetch` ile birebir aynı imza: mevcut servisler değişmeden
 * çalışır. `/api/partner` dışındaki adresler olduğu gibi `fetch`'e verilir.
 */

const EDGE_BY_OP: Record<string, string> = {
  "admin-core": "admin-core-gateway-v178",
  "admin-team": "admin-team",
  "analytics-admin": "analytics-admin-v186",
  "branch-network-admin": "branch-network-admin",
  "branch-security-admin": "branch-admin-security-v181",
  "branch-operations-admin": "branch-operations-gateway-v177",
  "branch-partner": "branch-partner-v164",
  "catalog-admin": "catalog-admin-gateway-v184",
  "customer-admin": "customer-admin-gateway-v173",
  "finance-admin": "finance-admin",
  "marketing-admin": "marketing-admin",
  "media-control-admin": "media-control-admin-v185",
  "newsletter-admin": "newsletter-admin",
  "newsletter-admin-read": "newsletter-admin-read-v186",
  "site-content-admin": "site-content-admin-gateway-v174",
  "telematics-admin": "telematics-admin",
};

const TRANSPORT_CODES = new Set([
  "NETWORK",
  "TIMEOUT",
  "NOT_FOUND",
  "ORIGIN_NOT_ALLOWED",
  "DIRECT_BROWSER_ACCESS_DENIED",
  "SERVER_CONFIG_MISSING",
  "BOOT_ERROR",
  "WORKER_ERROR",
  "WORKER_LIMIT",
  "FUNCTION_INVOCATION_FAILED",
  "FUNCTION_INVOCATION_TIMEOUT",
  "UNKNOWN_PARTNER_OPERATION",
]);

interface Attempt {
  layer: "edge" | "bff";
  status: number;
  code: string;
}

export interface AdminFetchTrail {
  attempts: Attempt[];
}

const trails = new WeakMap<Response, AdminFetchTrail>();

/** Bir yanıtın hangi katmanlardan geçtiğini (teşhis için) döndürür. */
export function adminFetchTrail(response: Response): AdminFetchTrail | undefined {
  return trails.get(response);
}

/** İnsan tarafından okunabilir, katmanı adlandıran Türkçe teşhis metni. */
export function describeTrail(trail: AdminFetchTrail | undefined, subject = "Veri"): string {
  if (!trail || !trail.attempts.length) return `${subject} işlemi tamamlanamadı.`;
  const label = (layer: Attempt["layer"]) => (layer === "edge" ? "Supabase Edge" : "Site API (/api)");
  return `${subject} işlemi tamamlanamadı — ${trail.attempts.map((a) => `${label(a.layer)}: ${a.code}${a.status ? ` (HTTP ${a.status})` : ""}`).join(" · ")}`;
}

function headerValue(init: RequestInit | undefined, name: string): string | null {
  const headers = init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) return headers.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? null;
  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? record[key] : null;
}

function mergeHeaders(init: RequestInit | undefined, extra: Record<string, string>): Headers {
  const merged = new Headers(init?.headers || {});
  for (const [key, value] of Object.entries(extra)) merged.set(key, value);
  return merged;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function hostCode(text: string, status: number): string {
  if (/FUNCTION_INVOCATION_TIMEOUT/i.test(text)) return "FUNCTION_INVOCATION_TIMEOUT";
  if (/FUNCTION_INVOCATION_FAILED/i.test(text)) return "FUNCTION_INVOCATION_FAILED";
  if (/DEPLOYMENT_NOT_FOUND|NOT_FOUND/i.test(text) || status === 404) return "NOT_FOUND";
  return `HOST_${status || "ERROR"}`;
}

function rebuild(response: Response, text: string, trail: AdminFetchTrail): Response {
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  const rebuilt = new Response(text, { status: response.status, statusText: response.statusText, headers });
  trails.set(rebuilt, trail);
  return rebuilt;
}

function synthetic(status: number, code: string, message: string, trail: AdminFetchTrail): Response {
  const body = JSON.stringify({ ok: false, code, message, transport: trail.attempts });
  const rebuilt = new Response(body, { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  trails.set(rebuilt, trail);
  return rebuilt;
}

function timeoutSignal(init: RequestInit | undefined, fallbackMs: number): AbortSignal {
  if (init?.signal) return init.signal;
  return AbortSignal.timeout(fallbackMs);
}

/** Yalnızca yönetici (Bearer JWT taşıyan) partner çağrılarını Edge-öncelikli yapar. */
function resolveEdge(url: URL, init: RequestInit | undefined): { edgeUrl: string } | null {
  if (!url.pathname.endsWith("/api/partner")) return null;
  const op = url.searchParams.get("op") || "";
  const edgeFunction = EDGE_BY_OP[op];
  if (!edgeFunction) return null;
  const authorization = headerValue(init, "authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const edge = new URL(supabaseFunctionUrl(edgeFunction));
  url.searchParams.forEach((value, key) => {
    if (key !== "op" && value) edge.searchParams.set(key, value.slice(0, 200));
  });
  return { edgeUrl: edge.toString() };
}

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(input instanceof Request ? input.url : String(input), base);
  const edge = resolveEdge(url, init);
  if (!edge) return fetch(input, init);

  const trail: AdminFetchTrail = { attempts: [] };
  const method = (init?.method || "GET").toUpperCase();

  // 1) Supabase Edge Function — kaynak-gerçeği, Vercel'e bağımlı değil.
  try {
    const response = await fetch(edge.edgeUrl, {
      ...init,
      headers: mergeHeaders(init, { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" }),
      cache: "no-store",
      signal: timeoutSignal(init, 25_000),
    });
    const text = await response.text();
    const payload = parseJson(text);
    if (!payload) {
      trail.attempts.push({ layer: "edge", status: response.status, code: hostCode(text, response.status) });
    } else {
      const rawCode = payload["code"] ?? payload["message"];
      const code = String(typeof rawCode === "number" ? `HTTP_${rawCode}` : rawCode || (response.ok ? "OK" : `HTTP_${response.status}`)).slice(0, 160);
      const transportFailure = !response.ok && (TRANSPORT_CODES.has(code) || response.status === 404 || response.status >= 502);
      if (!transportFailure) return rebuild(response, text, trail);
      trail.attempts.push({ layer: "edge", status: response.status, code });
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    trail.attempts.push({ layer: "edge", status: 0, code: name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "NETWORK" });
  }

  // 2) Aynı-origin Site API (/api/partner) — yalnızca taşıma hatasında.
  try {
    const response = await fetch(input, { ...init, cache: "no-store", signal: timeoutSignal(init, 30_000) });
    const text = await response.text();
    const payload = parseJson(text);
    if (payload || response.ok) return rebuild(response, text, trail);
    const code = hostCode(text, response.status);
    trail.attempts.push({ layer: "bff", status: response.status, code });
    return synthetic(response.status || 503, code, describeTrail(trail, method === "GET" ? "Veri okuma" : "Kayıt"), trail);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const code = name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "NETWORK";
    trail.attempts.push({ layer: "bff", status: 0, code });
    return synthetic(503, code, describeTrail(trail, method === "GET" ? "Veri okuma" : "Kayıt"), trail);
  }
}
