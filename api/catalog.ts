import {
  SUPABASE_PROJECT_URL,
  supabaseRestHeaders,
} from "./_lib/supabase-public";

type Resource = "vehicles" | "tours" | "blog" | "faqs" | "config";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

const VEHICLE_MEDIA_PREFIX = "https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/";

function trustedVehicleMediaUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().startsWith(VEHICLE_MEDIA_PREFIX);
}

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function legacyIdFrom(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    return /^\d+$/.test(normalized) ? Number(normalized) : normalized.slice(0, 120);
  }
  return null;
}

function jsonSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function publicCache(resource: Resource): string {
  switch (resource) {
    case "vehicles":
      return "no-store";
    case "tours":
      return "public, max-age=60, s-maxage=300, stale-while-revalidate=7200";
    case "blog":
    case "faqs":
      return "public, max-age=120, s-maxage=600, stale-while-revalidate=21600";
    case "config":
      return "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";
  }
}

function response(body: unknown, status = 200, cache = "no-store"): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": cache,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function rest(
  path: string,
  init: RequestInit = {},
  authorization?: string | null,
): Promise<Response> {
  return fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...supabaseRestHeaders(authorization, init.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(10_000),
  });
}

function vehicleFromRow(row: any): Record<string, unknown> {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const legacyId = legacyIdFrom(metadata.legacyId) ?? row.id;
  const category = row.category === "SALE" ? "SALE" : "RENTAL";
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    ...metadata,
    id: legacyId,
    category,
    brand: row.brand || "",
    model: row.model || "",
    year: row.model_year ?? undefined,
    price: Number(category === "RENTAL" ? row.rental_price_daily ?? row.price ?? 0 : row.price ?? 0),
    km: row.mileage_km ?? undefined,
    fuel: row.fuel_type || undefined,
    transmission: row.transmission || undefined,
    type: row.body_type || undefined,
    color: row.color || undefined,
    engineVolume: row.engine || metadata.engineVolume || undefined,
    seats: row.seats ?? undefined,
    location: row.location || undefined,
    description: row.description || "",
    features: Array.isArray(row.features) ? row.features : [],
    images,
    image: row.cover_image || images[0] || undefined,
    isFeatured: Boolean(row.is_featured),
    isAvailable: row.availability_status === "AVAILABLE",
    availability:
      category === "SALE"
        ? row.availability_status === "SOLD"
          ? "Satıldı"
          : metadata.availability || "Satışta"
        : metadata.availability,
    cloudId: row.id,
    cloudStockCode: row.stock_code,
    publicationStatus: row.publication_status,
    publishedAt: row.published_at || undefined,
    scheduledAt: row.scheduled_at || undefined,
    branchId: row.branch_id || undefined,
    listingOrigin: row.listing_origin || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at,
  };
}

function tourFromRow(row: any): Record<string, unknown> {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    ...metadata,
    id: legacyIdFrom(metadata.legacyId) ?? row.id,
    category: "TOUR",
    title: row.title || "",
    description: row.description || row.short_description || "",
    price: Number(row.price_per_person || 0),
    duration: row.duration || undefined,
    image: row.cover_image || images[0] || undefined,
    images,
    isFeatured: Boolean(row.is_featured),
    cloudId: row.id,
    cloudSlug: row.seo_slug,
    updatedAt: row.updated_at,
  };
}

function blogFromRow(row: any): Record<string, unknown> {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: legacyIdFrom(metadata.legacyId) ?? row.id,
    title: row.title || "",
    summary: row.excerpt || "",
    content: row.content || "",
    image: row.cover_image || "",
    readTime: metadata.readTime || "4 Dk Okuma",
    date: metadata.originalDate || (row.published_at ? new Date(row.published_at).toLocaleDateString("tr-TR") : ""),
    cloudId: row.id,
    cloudSlug: row.slug,
    updatedAt: row.updated_at,
  };
}

function faqFromRow(row: any): Record<string, unknown> {
  return {
    id: row.sort_order || row.id,
    question: row.question || "",
    answer: row.answer || "",
    category: row.category || undefined,
    cloudId: row.id,
    updatedAt: row.updated_at,
  };
}

async function getPublic(resource: Resource): Promise<Response> {
  let path = "";
  let map: (row: any) => Record<string, unknown> = (row) => row;
  switch (resource) {
    case "vehicles":
      path = "vehicles?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      map = vehicleFromRow;
      break;
    case "tours":
      path = "tours?is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc";
      map = tourFromRow;
      break;
    case "blog":
      path = "blog_posts?status=eq.PUBLISHED&select=*&order=published_at.desc";
      map = blogFromRow;
      break;
    case "faqs":
      path = "faqs?is_active=eq.true&select=*&order=sort_order.asc";
      map = faqFromRow;
      break;
    case "config":
      path = "site_config?key=eq.site_settings&is_public=eq.true&select=value,updated_at&limit=1";
      break;
  }

  const upstream = await rest(path).catch(() => null);
  if (!upstream?.ok) {
    return response({ ok: false, code: "CATALOG_SOURCE_UNAVAILABLE", resource }, 503);
  }
  const rows = await upstream.json();
  if (resource === "config") {
    const value = Array.isArray(rows) && rows[0]?.value ? rows[0].value : null;
    return response({ ok: true, resource, value }, 200, publicCache(resource));
  }
  return response(
    { ok: true, resource, records: Array.isArray(rows) ? rows.map(map) : [] },
    200,
    publicCache(resource),
  );
}

function normalizeVehicle(input: any): Record<string, unknown> {
  if (!input || (input.category !== "RENTAL" && input.category !== "SALE")) {
    throw new Error("INVALID_VEHICLE_CATEGORY");
  }
  const id = legacyIdFrom(input.id) ?? Date.now();
  const brand = clean(input.brand, 120);
  const model = clean(input.model, 160);
  if (!brand || !model) throw new Error("VEHICLE_BRAND_MODEL_REQUIRED");
  if (jsonSize(input) > 350_000) throw new Error("VEHICLE_PAYLOAD_TOO_LARGE");
  const submittedImages = Array.isArray(input.images)
    ? input.images.filter((value: unknown) => typeof value === "string" && value.length <= 2048).slice(0, 30)
    : [];
  const submittedCover = clean(input.image, 2048);
  if (submittedImages.some((value: string) => !trustedVehicleMediaUrl(value))) {
    throw new Error("VEHICLE_MEDIA_STORAGE_ONLY");
  }
  if (submittedCover && !trustedVehicleMediaUrl(submittedCover)) {
    throw new Error("VEHICLE_MEDIA_STORAGE_ONLY");
  }
  const images = submittedImages;
  const price = Math.max(0, Number(input.price) || 0);
  const availability = clean(input.availability, 40).toLocaleLowerCase("tr-TR");
  return {
    stock_code: clean(input.cloudStockCode, 120) || `LEGACY-${String(id).slice(0, 100)}`,
    category: input.category,
    brand,
    model,
    model_year: numberOrNull(input.year),
    price,
    currency: "TRY",
    rental_price_daily: input.category === "RENTAL" ? price : null,
    mileage_km: input.category === "SALE" ? numberOrNull(input.km) : null,
    fuel_type: clean(input.fuel, 40) || null,
    transmission: clean(input.transmission, 40) || null,
    body_type: clean(input.type, 60) || null,
    color: clean(input.color, 60) || null,
    engine: clean(input.engineVolume, 80) || null,
    seats: numberOrNull(input.seats),
    location: clean(input.location, 240) || null,
    description: clean(input.description, 10_000) || null,
    features: Array.isArray(input.features) ? input.features.slice(0, 100) : [],
    images,
    cover_image: submittedCover || images[0] || null,
    is_featured: booleanValue(input.isFeatured),
    is_active: true,
    availability_status: input.category === "SALE" && availability === "satıldı" ? "SOLD" : "AVAILABLE",
    metadata: { ...input, legacyId: id, cloudId: undefined, cloudStockCode: undefined },
  };
}

function normalizeTour(input: any): Record<string, unknown> {
  const id = legacyIdFrom(input?.id) ?? Date.now();
  const title = clean(input?.title, 240);
  if (!title) throw new Error("TOUR_TITLE_REQUIRED");
  if (jsonSize(input) > 350_000) throw new Error("TOUR_PAYLOAD_TOO_LARGE");
  const images = Array.isArray(input.images)
    ? input.images.filter((value: unknown) => typeof value === "string" && value.length <= 2048).slice(0, 30)
    : [];
  return {
    title,
    seo_slug: clean(input.cloudSlug, 140) || `legacy-${String(id).slice(0, 80)}-${slugify(title)}`,
    category: clean(input.categoryName, 80) || null,
    short_description: clean(input.shortDescription, 1000) || null,
    description: clean(input.description, 10_000) || null,
    price_per_person: Math.max(0, Number(input.price) || 0),
    currency: "TRY",
    duration: clean(input.duration, 120) || null,
    capacity: numberOrNull(input.capacity),
    meeting_point: clean(input.meetingPoint, 240) || null,
    itinerary: Array.isArray(input.itinerary) ? input.itinerary.slice(0, 100) : [],
    included_items: Array.isArray(input.includedItems) ? input.includedItems.slice(0, 100) : [],
    excluded_items: Array.isArray(input.excludedItems) ? input.excludedItems.slice(0, 100) : [],
    images,
    cover_image: clean(input.image, 2048) || images[0] || null,
    is_featured: booleanValue(input.isFeatured),
    is_active: true,
    metadata: { ...input, legacyId: id, cloudId: undefined, cloudSlug: undefined },
  };
}

function normalizeBlog(input: any): Record<string, unknown> {
  const id = legacyIdFrom(input?.id) ?? Date.now();
  const title = clean(input?.title, 240);
  if (!title) throw new Error("BLOG_TITLE_REQUIRED");
  if (jsonSize(input) > 500_000) throw new Error("BLOG_PAYLOAD_TOO_LARGE");
  return {
    title,
    slug: clean(input.cloudSlug, 140) || `legacy-blog-${String(id).slice(0, 80)}-${slugify(title)}`,
    excerpt: clean(input.summary, 2000) || null,
    content: clean(input.content, 100_000),
    cover_image: clean(input.image, 2048) || null,
    author_name: "Alperler Auto",
    status: "PUBLISHED",
    published_at: input.publishedAt || new Date().toISOString(),
    metadata: {
      legacyId: id,
      originalDate: clean(input.date, 80),
      readTime: clean(input.readTime, 80) || "4 Dk Okuma",
    },
  };
}

async function requireAuthorization(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization : null;
}

async function upsert(resource: Resource, input: any, authorization: string): Promise<Response> {
  let path = "";
  let row: Record<string, unknown>;
  let map: (value: any) => Record<string, unknown> = (value) => value;
  let conflict = "";

  if (resource === "vehicles") {
    row = normalizeVehicle(input);
    path = "vehicles?on_conflict=stock_code&select=*";
    conflict = "stock_code";
    map = vehicleFromRow;
  } else if (resource === "tours") {
    row = normalizeTour(input);
    path = "tours?on_conflict=seo_slug&select=*";
    conflict = "seo_slug";
    map = tourFromRow;
  } else if (resource === "blog") {
    row = normalizeBlog(input);
    path = "blog_posts?on_conflict=slug&select=*";
    conflict = "slug";
    map = blogFromRow;
  } else if (resource === "config") {
    if (!input || typeof input !== "object" || jsonSize(input) > 750_000) {
      throw new Error("INVALID_SITE_CONFIG");
    }
    row = { key: "site_settings", value: input, is_public: true };
    path = "site_config?on_conflict=key&select=*";
    conflict = "key";
  } else if (resource === "faqs") {
    const question = clean(input?.question, 500);
    const answer = clean(input?.answer, 10_000);
    if (!question || !answer) throw new Error("FAQ_FIELDS_REQUIRED");
    const cloudId = clean(input?.cloudId, 80);
    const faqRow = {
      question,
      answer,
      category: clean(input?.category, 80) || null,
      sort_order: Math.max(0, Math.round(Number(input?.id) || Number(input?.sortOrder) || 0)),
      is_active: true,
    };
    const faqPath = cloudId ? `faqs?id=eq.${encodeURIComponent(cloudId)}&select=*` : "faqs?select=*";
    const method = cloudId ? "PATCH" : "POST";
    const faqResponse = await rest(
      faqPath,
      {
        method,
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(faqRow),
      },
      authorization,
    );
    if (!faqResponse.ok) return response({ ok: false, code: "FAQ_SAVE_DENIED" }, faqResponse.status);
    const rows = await faqResponse.json();
    return response({ ok: true, resource, record: faqFromRow(rows[0]) });
  } else {
    throw new Error("UNSUPPORTED_RESOURCE");
  }

  const upstream = await rest(
    path,
    {
      method: "POST",
      headers: { Prefer: `resolution=merge-duplicates,return=representation`, "x-upsert-conflict": conflict },
      body: JSON.stringify(row),
    },
    authorization,
  );
  if (!upstream.ok) {
    return response({ ok: false, code: "CATALOG_SAVE_DENIED", resource }, upstream.status);
  }
  const rows = await upstream.json();
  if (resource === "config") return response({ ok: true, resource, value: rows[0]?.value || input });
  return response({ ok: true, resource, record: map(rows[0]) });
}

async function disable(resource: Resource, input: any, authorization: string): Promise<Response> {
  if (resource === "vehicles") {
    const stockCode = clean(input?.cloudStockCode, 120) || (legacyIdFrom(input?.id) !== null ? `LEGACY-${String(legacyIdFrom(input.id))}` : "");
    if (!stockCode) throw new Error("VEHICLE_ID_REQUIRED");
    const upstream = await rest(
      `vehicles?stock_code=eq.${encodeURIComponent(stockCode)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false }) },
      authorization,
    );
    return upstream.ok ? response({ ok: true, resource, disabled: true }) : response({ ok: false, code: "CATALOG_DISABLE_DENIED" }, upstream.status);
  }
  if (resource === "tours") {
    const cloudSlug = clean(input?.cloudSlug, 140);
    const legacyId = legacyIdFrom(input?.id);
    const slug = cloudSlug || (legacyId !== null ? `legacy-${String(legacyId)}` : "");
    if (!slug) throw new Error("TOUR_ID_REQUIRED");
    const filter = cloudSlug ? `seo_slug=eq.${encodeURIComponent(cloudSlug)}` : `seo_slug=like.${encodeURIComponent(slug + "-%")}`;
    const upstream = await rest(
      `tours?${filter}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false }) },
      authorization,
    );
    return upstream.ok ? response({ ok: true, resource, disabled: true }) : response({ ok: false, code: "CATALOG_DISABLE_DENIED" }, upstream.status);
  }
  if (resource === "blog") {
    const cloudSlug = clean(input?.cloudSlug, 140);
    if (!cloudSlug) throw new Error("BLOG_ID_REQUIRED");
    const upstream = await rest(
      `blog_posts?slug=eq.${encodeURIComponent(cloudSlug)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "ARCHIVED" }) },
      authorization,
    );
    return upstream.ok ? response({ ok: true, resource, disabled: true }) : response({ ok: false, code: "CATALOG_DISABLE_DENIED" }, upstream.status);
  }
  if (resource === "faqs") {
    const cloudId = clean(input?.cloudId, 80);
    if (!cloudId) throw new Error("FAQ_ID_REQUIRED");
    const upstream = await rest(
      `faqs?id=eq.${encodeURIComponent(cloudId)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false }) },
      authorization,
    );
    return upstream.ok ? response({ ok: true, resource, disabled: true }) : response({ ok: false, code: "CATALOG_DISABLE_DENIED" }, upstream.status);
  }
  throw new Error("RESOURCE_DELETE_NOT_SUPPORTED");
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") as Resource | null;
    if (!resource || !["vehicles", "tours", "blog", "faqs", "config"].includes(resource)) {
      return response({ ok: false, code: "INVALID_CATALOG_RESOURCE" }, 400);
    }

    if (request.method === "GET") return getPublic(resource);

    const authorization = await requireAuthorization(request);
    if (!authorization) return response({ ok: false, code: "UNAUTHORIZED" }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return response({ ok: false, code: "INVALID_JSON" }, 400);
    }

    try {
      if (request.method === "PUT" || request.method === "POST") {
        return await upsert(resource, body, authorization);
      }
      if (request.method === "DELETE") {
        return await disable(resource, body, authorization);
      }
      return response({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    } catch (error) {
      const code = error instanceof Error ? error.message : "CATALOG_OPERATION_FAILED";
      const clientError = /INVALID|REQUIRED|TOO_LARGE|UNSUPPORTED|NOT_SUPPORTED/.test(code);
      return response({ ok: false, code }, clientError ? 400 : 500);
    }
  },
};
