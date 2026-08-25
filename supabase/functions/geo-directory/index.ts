import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SOURCE_URL = "https://raw.githubusercontent.com/open-admin-data/turkey-administrative-divisions/master/data/all-flat.json";
const SOURCE_UPDATED_AT = "2026-06-19";

type GeoRow = {
  id?: string;
  level?: number;
  name?: { local?: string; slug?: string };
  parent?: { id?: string } | null;
  geo?: { lat?: string | number; lon?: string | number };
};

function headers(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,apikey",
    "access-control-max-age": "3600",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400",
    "x-content-type-options": "nosniff",
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headers() });
}

function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15_000),
  });
}

async function counts(): Promise<{ provinces: number; districts: number }> {
  const [p, d] = await Promise.all([
    rest("geo_provinces?select=code", { headers: { Prefer: "count=exact", Range: "0-0" } }),
    rest("geo_districts?select=code", { headers: { Prefer: "count=exact", Range: "0-0" } }),
  ]);
  const total = (response: Response) => {
    const range = response.headers.get("content-range") || "";
    const match = /\/(\d+)$/.exec(range);
    return match ? Number(match[1]) : 0;
  };
  return { provinces: p.ok ? total(p) : 0, districts: d.ok ? total(d) : 0 };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function coordinate(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1_000_000) / 1_000_000 : null;
}

async function synchronize(): Promise<void> {
  const current = await counts();
  if (current.provinces === 81 && current.districts >= 970) return;

  const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error("GEO_SOURCE_UNAVAILABLE");
  const rawText = await response.text();
  if (rawText.length < 200_000 || rawText.length > 2_000_000) throw new Error("GEO_SOURCE_SIZE_INVALID");
  const payload = JSON.parse(rawText) as { data?: GeoRow[] };
  if (!Array.isArray(payload.data)) throw new Error("GEO_SOURCE_INVALID");

  const provinces = payload.data
    .filter((row) => row.level === 1 && /^TUR\d{3}$/.test(String(row.id || "")))
    .map((row) => ({
      code: String(row.id),
      name: String(row.name?.local || "").normalize("NFC").trim(),
      slug: String(row.name?.slug || "").trim(),
      latitude: coordinate(row.geo?.lat),
      longitude: coordinate(row.geo?.lon),
    }));
  const provinceCodes = new Set(provinces.map((row) => row.code));
  const districts = payload.data
    .filter((row) => row.level === 2 && /^TUR\d{6}$/.test(String(row.id || "")) && provinceCodes.has(String(row.parent?.id || "")))
    .map((row) => ({
      code: String(row.id),
      province_code: String(row.parent?.id),
      name: String(row.name?.local || "").normalize("NFC").trim(),
      slug: String(row.name?.slug || "").trim(),
      latitude: coordinate(row.geo?.lat),
      longitude: coordinate(row.geo?.lon),
    }));

  if (provinces.length !== 81 || districts.length < 970 || districts.length > 1100 || provinces.some((row) => !row.name || !row.slug) || districts.some((row) => !row.name || !row.slug)) {
    throw new Error("GEO_SOURCE_VALIDATION_FAILED");
  }

  const sync = await rest("rpc/replace_turkey_geo_directory", {
    method: "POST",
    body: JSON.stringify({
      p_provinces: provinces,
      p_districts: districts,
      p_source_updated_at: SOURCE_UPDATED_AT,
      p_checksum: await sha256(rawText),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!sync.ok) {
    const detail = await sync.text().catch(() => "");
    console.error("Geo sync RPC failed", sync.status, detail.slice(0, 500));
    throw new Error("GEO_SYNC_FAILED");
  }
}

async function directory(): Promise<Response> {
  await synchronize();
  const [p, d] = await Promise.all([
    rest("geo_provinces?select=code,name,slug,latitude,longitude&order=name.asc", { headers: { accept: "application/json" } }),
    rest("geo_districts?select=code,province_code,name,slug,latitude,longitude&order=province_code.asc,name.asc", { headers: { accept: "application/json" } }),
  ]);
  if (!p.ok || !d.ok) return json({ ok: false, code: "GEO_DIRECTORY_UNAVAILABLE" }, 503);
  const provinces = await p.json();
  const districts = await d.json();
  return json({
    ok: true,
    source: {
      name: "Open Admin Data",
      url: "https://github.com/open-admin-data/turkey-administrative-divisions",
      license: "CC-BY-4.0",
      sourceUpdatedAt: SOURCE_UPDATED_AT,
    },
    provinces,
    districts,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers() });
  if (request.method !== "GET") return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  try {
    return await directory();
  } catch (error) {
    console.error("geo-directory failed", error);
    return json({ ok: false, code: error instanceof Error ? error.message : "GEO_DIRECTORY_FAILED" }, 503);
  }
});
