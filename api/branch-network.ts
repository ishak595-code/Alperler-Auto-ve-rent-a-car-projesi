import { SUPABASE_PROJECT_URL, supabaseRestHeaders } from "./_lib/supabase-public";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function legacyId(row: any): string | number {
  const value = row?.metadata?.legacyId;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return /^\d+$/.test(value.trim()) ? Number(value.trim()) : value.trim();
  return row.id;
}

function publicBrandProfile(value: unknown): Record<string, string> {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result: Record<string, string> = {};
  const keys = ["instagramUrl", "facebookUrl", "tiktokUrl", "youtubeUrl", "xUrl"] as const;
  for (const key of keys) {
    const raw = clean(source[key], 500);
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) result[key] = parsed.toString();
    } catch { /* invalid public social URL is omitted */ }
  }
  return result;
}

function branchToApi(row: any) {
  return {
    id: row.code || row.id,
    cloudId: row.id,
    slug: row.slug,
    name: row.name,
    operatorName: row.operator_display_name || row.name,
    operatorLegalName: row.operator_legal_name || undefined,
    operatorRelationship: row.operator_relationship || undefined,
    operatorVerified: Boolean(row.operator_identity_verified_at),
    platformDisclaimer: row.platform_disclaimer || undefined,
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
    networkType: row.network_type || "OWNED",
    publicStatus: row.public_status || "ACTIVE",
    territoryLabel: row.territory_label || undefined,
    publicDescription: row.public_description || undefined,
    heroImage: row.hero_image || undefined,
    customerGuaranteeEnabled: row.customer_guarantee_enabled !== false,
    centralPricingRequired: row.central_pricing_required !== false,
    listingRequiresApproval: row.listing_requires_approval !== false,
    brandProfile: publicBrandProfile(row.brand_profile),
  };
}

function vehicleToApi(row: any) {
  const category = row.category === "SALE" ? "SALE" : "RENTAL";
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: legacyId(row),
    cloudId: row.id,
    category,
    brand: row.brand || "",
    model: row.model || "",
    year: row.model_year ?? undefined,
    price: Number(category === "RENTAL" ? row.rental_price_daily ?? row.price ?? 0 : row.price ?? 0),
    km: row.mileage_km ?? undefined,
    fuel: row.fuel_type || undefined,
    transmission: row.transmission || undefined,
    type: row.body_type || undefined,
    image: row.cover_image || images[0] || undefined,
    location: row.location || undefined,
    isAvailable: row.availability_status === "AVAILABLE",
    branchId: row.branch_id,
  };
}

function tourToApi(row: any) {
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: legacyId(row),
    cloudId: row.id,
    category: "TOUR",
    title: row.title || "",
    price: Number(row.price_per_person || 0),
    duration: row.duration || undefined,
    image: row.cover_image || images[0] || undefined,
    meetingPoint: row.meeting_point || undefined,
    branchId: row.branch_id,
  };
}

async function rest(path: string): Promise<Response | null> {
  return fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
    headers: supabaseRestHeaders(),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method.toUpperCase() !== "GET") return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
    const url = new URL(request.url);
    const slug = clean(url.searchParams.get("slug"), 140).toLowerCase();
    if (!/^[a-z0-9-]{2,140}$/.test(slug)) return Response.json({ ok: false, code: "INVALID_BRANCH_SLUG" }, { status: 400 });

    const branchResponse = await rest(`branches?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&public_status=eq.ACTIVE&select=*&limit=1`);
    if (!branchResponse?.ok) return Response.json({ ok: false, code: "BRANCH_SOURCE_UNAVAILABLE" }, { status: 503, headers: { "cache-control": "no-store" } });
    const branchRows = await branchResponse.json();
    const branch = Array.isArray(branchRows) ? branchRows[0] : null;
    if (!branch) return Response.json({ ok: false, code: "BRANCH_NOT_FOUND" }, { status: 404, headers: { "cache-control": "no-store" } });

    const branchId = String(branch.id);
    const [vehiclesResponse, toursResponse] = await Promise.all([
      rest(`vehicles?branch_id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc`),
      rest(`tours?branch_id=eq.${encodeURIComponent(branchId)}&is_active=eq.true&select=*&order=is_featured.desc,updated_at.desc`),
    ]);

    const vehicles = vehiclesResponse?.ok ? await vehiclesResponse.json() : [];
    const tours = toursResponse?.ok ? await toursResponse.json() : [];
    const mappedVehicles = Array.isArray(vehicles) ? vehicles.map(vehicleToApi) : [];
    const rentalCount = mappedVehicles.filter((item) => item.category === "RENTAL").length;
    const saleCount = mappedVehicles.filter((item) => item.category === "SALE").length;
    const mappedTours = Array.isArray(tours) ? tours.map(tourToApi) : [];

    return Response.json({
      ok: true,
      branch: branchToApi(branch),
      vehicles: mappedVehicles,
      tours: mappedTours,
      counts: { rentals: rentalCount, sales: saleCount, tours: mappedTours.length },
      standards: {
        centralPricing: branch.central_pricing_required !== false,
        listingApproval: branch.listing_requires_approval !== false,
        customerGuarantee: branch.customer_guarantee_enabled !== false,
      },
    }, {
      headers: {
        "cache-control": "public, max-age=30, s-maxage=120, stale-while-revalidate=1800",
        "content-type": "application/json; charset=utf-8",
      },
    });
  },
};
