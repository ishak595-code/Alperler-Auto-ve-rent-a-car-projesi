import {
  SUPABASE_PROJECT_URL,
  supabaseRestHeaders,
} from "./_lib/supabase-public";

interface BranchPayload {
  id?: string;
  name?: string;
  city?: string;
  district?: string;
  addressLabel?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  workingHours?: Array<{ label?: string; value?: string }>;
  services?: string[];
  isActive?: boolean;
  isPickupPoint?: boolean;
  isReturnPoint?: boolean;
  priority?: number;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalize(input: BranchPayload) {
  const code = clean(input.id, 80).toLowerCase();
  if (!/^[a-z0-9_-]{2,80}$/.test(code)) throw new Error("INVALID_BRANCH_ID");
  const name = clean(input.name, 120);
  const city = clean(input.city, 80);
  const district = clean(input.district, 80);
  const address = clean(input.addressLabel, 240);
  const phone = clean(input.phone, 40);
  if (!name || !city || !district || !address || !phone) throw new Error("REQUIRED_BRANCH_FIELDS_MISSING");
  const services = Array.from(
    new Set((input.services || []).filter((value) => ["RENTAL", "SALES", "TOUR", "TRANSFER", "PICKUP", "RETURN"].includes(String(value)))),
  ).slice(0, 10);
  const workingHours = (input.workingHours || []).slice(0, 14).map((row) => ({
    label: clean(row.label, 80),
    value: clean(row.value, 120),
  })).filter((row) => row.label && row.value);
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  return {
    code,
    name,
    city,
    district,
    address_line: address,
    country: "Türkiye",
    phone,
    whatsapp: clean(input.whatsapp, 40) || null,
    email: clean(input.email, 160).toLowerCase() || null,
    latitude: Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 ? latitude : null,
    longitude: Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : null,
    map_url: clean(input.mapUrl, 2048) || null,
    opening_hours: workingHours,
    services,
    is_active: Boolean(input.isActive),
    is_pickup_point: Boolean(input.isPickupPoint),
    is_return_point: Boolean(input.isReturnPoint),
    sort_order: Math.max(0, Math.min(9999, Math.round(Number(input.priority) || 0))),
  };
}

function toApi(row: any) {
  return {
    id: row.code || row.id,
    name: row.name,
    city: row.city || "",
    district: row.district || "",
    addressLabel: row.address_line || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || undefined,
    email: row.email || undefined,
    latitude: row.latitude === null ? undefined : Number(row.latitude),
    longitude: row.longitude === null ? undefined : Number(row.longitude),
    mapUrl: row.map_url || undefined,
    workingHours: Array.isArray(row.opening_hours) ? row.opening_hours : [],
    services: Array.isArray(row.services) ? row.services : [],
    isActive: Boolean(row.is_active),
    isPickupPoint: Boolean(row.is_pickup_point),
    isReturnPoint: Boolean(row.is_return_point),
    priority: Number(row.sort_order || 0),
  };
}

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization") || "";
  return /^Bearer\s+\S+/i.test(value) ? value : null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const method = request.method.toUpperCase();
    const requestUrl = new URL(request.url);

    if (method === "GET") {
      const includeInactive = requestUrl.searchParams.get("includeInactive") === "1";
      const authorization = bearer(request);
      if (includeInactive && !authorization) {
        return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401, headers: { "cache-control": "no-store" } });
      }
      const filter = includeInactive ? "" : "is_active=eq.true&";
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/branches?${filter}select=*&order=sort_order.asc,name.asc`,
        {
          headers: supabaseRestHeaders(includeInactive ? authorization! : undefined),
          signal: AbortSignal.timeout(8_000),
        },
      ).catch(() => null);
      if (!response?.ok) {
        return Response.json({ ok: false, code: "BRANCH_SOURCE_UNAVAILABLE", branches: [] }, { status: response?.status || 503, headers: { "cache-control": "no-store" } });
      }
      const rows = await response.json();
      return Response.json(
        { ok: true, branches: Array.isArray(rows) ? rows.map(toApi) : [] },
        {
          headers: {
            "cache-control": includeInactive ? "no-store" : "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
            "content-type": "application/json; charset=utf-8",
          },
        },
      );
    }

    const authorization = bearer(request);
    if (!authorization) {
      return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
    }

    if (method === "PUT") {
      let payload: BranchPayload;
      try {
        payload = (await request.json()) as BranchPayload;
      } catch {
        return Response.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
      }
      try {
        const row = normalize(payload);
        const lookup = await fetch(
          `${SUPABASE_PROJECT_URL}/rest/v1/branches?code=eq.${encodeURIComponent(row.code)}&select=id&limit=1`,
          { headers: supabaseRestHeaders(authorization), signal: AbortSignal.timeout(8_000) },
        );
        if (!lookup.ok) return Response.json({ ok: false, code: "BRANCH_LOOKUP_FAILED" }, { status: lookup.status });
        const existing = await lookup.json();
        const hasExisting = Array.isArray(existing) && existing[0]?.id;
        const response = await fetch(
          hasExisting
            ? `${SUPABASE_PROJECT_URL}/rest/v1/branches?id=eq.${encodeURIComponent(existing[0].id)}&select=*`
            : `${SUPABASE_PROJECT_URL}/rest/v1/branches?select=*`,
          {
            method: hasExisting ? "PATCH" : "POST",
            headers: supabaseRestHeaders(authorization, { Prefer: "return=representation" }),
            body: JSON.stringify(row),
            signal: AbortSignal.timeout(8_000),
          },
        );
        if (!response.ok) return Response.json({ ok: false, code: "BRANCH_SAVE_DENIED" }, { status: response.status });
        const rows = await response.json();
        return Response.json({ ok: true, branch: toApi(rows[0]) }, { headers: { "cache-control": "no-store" } });
      } catch (error) {
        const code = error instanceof Error ? error.message : "INVALID_BRANCH";
        return Response.json({ ok: false, code }, { status: code.startsWith("INVALID_") || code.includes("REQUIRED") ? 400 : 500 });
      }
    }

    if (method === "DELETE") {
      let body: { id?: string };
      try {
        body = (await request.json()) as { id?: string };
      } catch {
        return Response.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
      }
      const code = clean(body.id, 80).toLowerCase();
      if (!/^[a-z0-9_-]{2,80}$/.test(code)) return Response.json({ ok: false, code: "INVALID_BRANCH_ID" }, { status: 400 });
      const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/branches?code=eq.${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: supabaseRestHeaders(authorization, { Prefer: "return=minimal" }),
        body: JSON.stringify({ is_active: false }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return Response.json({ ok: false, code: "BRANCH_DISABLE_DENIED" }, { status: response.status });
      return Response.json({ ok: true, disabled: true }, { headers: { "cache-control": "no-store" } });
    }

    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  },
};
