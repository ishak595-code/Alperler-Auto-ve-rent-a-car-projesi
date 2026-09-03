import { clientIp, corsHeaders, guardOrigin, originDecision } from "./_lib/request-security";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "./_lib/supabase-public";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";

async function proxy(
  request: Request,
  options: {
    edgeFunction: string;
    allowedMethods: string[];
    timeout: number;
    requireAuth?: boolean;
    maxBodyBytes?: number;
    unavailableCode: string;
    unavailableMessage?: string;
    publicCache?: string;
    forwardQuery?: string[];
    upstreamHeaders?: Record<string, string>;
  },
): Promise<Response> {
  const decision = originDecision(request);
  const method = request.method.toUpperCase();
  if (!options.allowedMethods.includes(method)) {
    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: decision.requestId }, { status: 405, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  }
  const authorization = request.headers.get("authorization");
  if (options.requireAuth && !authorization?.startsWith("Bearer ")) {
    return Response.json({ ok: false, code: "UNAUTHORIZED", requestId: decision.requestId }, { status: 401, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  }
  let body: string | undefined;
  if (method !== "GET") {
    const declared = Number(request.headers.get("content-length") || 0);
    if (options.maxBodyBytes && declared > options.maxBodyBytes) return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId }, { status: 413, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
    body = await request.text();
    if (options.maxBodyBytes && new TextEncoder().encode(body).byteLength > options.maxBodyBytes) return Response.json({ ok: false, code: "PAYLOAD_TOO_LARGE", requestId: decision.requestId }, { status: 413, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
    "x-client-ip": clientIp(request),
    "x-request-id": decision.requestId,
    "x-app-origin": new URL(request.url).origin,
    "user-agent": request.headers.get("user-agent") || "alperler-web",
    ...(options.upstreamHeaders || {}),
  };
  if (authorization) headers.authorization = authorization;
  const upstreamUrl = new URL(`${SUPABASE_PROJECT_URL}/functions/v1/${options.edgeFunction}`);
  if (options.forwardQuery?.length) {
    const source = new URL(request.url);
    for (const key of options.forwardQuery) {
      const value = source.searchParams.get(key);
      if (value) upstreamUrl.searchParams.set(key, value.slice(0, 120));
    }
  }
  try {
    const upstream = await fetch(upstreamUrl, { method, headers, body, signal: AbortSignal.timeout(options.timeout) });
    return new Response(await upstream.text(), { status: upstream.status, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8", "cache-control": options.requireAuth ? "private, no-store" : (options.publicCache || "no-store"), "x-upstream-request-id": upstream.headers.get("x-request-id") || decision.requestId } });
  } catch (error) {
    console.error(`${options.edgeFunction} unavailable`, decision.requestId, error);
    return Response.json({ ok: false, code: options.unavailableCode, ...(options.unavailableMessage ? { message: options.unavailableMessage } : {}), requestId: decision.requestId }, { status: 503, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const guarded = guardOrigin(request, ALLOWED_METHODS); if (guarded) return guarded;
    const operation = new URL(request.url).searchParams.get("op") || "requests";
    if (operation === "geo-directory") return proxy(request, { edgeFunction: "geo-directory", allowedMethods: ["GET"], timeout: 35_000, unavailableCode: "GEO_DIRECTORY_UNAVAILABLE", unavailableMessage: "Türkiye il ve ilçe dizinine şu anda ulaşılamıyor.", publicCache: "public, max-age=300, s-maxage=1800, stale-while-revalidate=86400" });
    if (operation === "newsletter-public") return proxy(request, { edgeFunction: "newsletter-gateway", allowedMethods: ["POST"], timeout: 15_000, maxBodyBytes: 4096, unavailableCode: "NEWSLETTER_UNAVAILABLE", unavailableMessage: "Bülten aboneliği servisine şu anda ulaşılamıyor.", upstreamHeaders: { apikey: SUPABASE_PUBLISHABLE_KEY, "x-alperler-client": "alperler-web-v1" } });
    if (operation === "newsletter-admin") return proxy(request, { edgeFunction: "newsletter-admin", allowedMethods: ["POST"], timeout: 65_000, requireAuth: true, maxBodyBytes: 20_000, unavailableCode: "NEWSLETTER_ADMIN_UNAVAILABLE", unavailableMessage: "Bülten yönetim servisine şu anda ulaşılamıyor." });
    if (operation === "newsletter-admin-read") return proxy(request, { edgeFunction: "newsletter-admin-read-v186", allowedMethods: ["GET"], timeout: 20_000, requireAuth: true, unavailableCode: "NEWSLETTER_ADMIN_READ_UNAVAILABLE", unavailableMessage: "Bülten yönetim verilerine şu anda ulaşılamıyor.", forwardQuery: ["view", "limit"] });
    if (operation === "analytics-admin") return proxy(request, { edgeFunction: "analytics-admin-v186", allowedMethods: ["POST"], timeout: 25_000, requireAuth: true, maxBodyBytes: 16 * 1024, unavailableCode: "ANALYTICS_ADMIN_UNAVAILABLE", unavailableMessage: "Analitik yönetim servisine şu anda ulaşılamıyor." });
    if (operation === "branch-access-claim") return proxy(request, { edgeFunction: "branch-access-v165", allowedMethods: ["POST"], timeout: 15_000, requireAuth: true, maxBodyBytes: 1024, unavailableCode: "BRANCH_ACCESS_UNAVAILABLE", unavailableMessage: "Şube erişim doğrulama servisine şu anda ulaşılamıyor." });
    if (operation === "media") return proxy(request, { edgeFunction: "partner-media", allowedMethods: ["POST"], timeout: 12_000, requireAuth: true, unavailableCode: "PARTNER_MEDIA_UNAVAILABLE" });
    if (operation === "resume") return proxy(request, { edgeFunction: "partner-upload-resume", allowedMethods: ["POST"], timeout: 20_000, unavailableCode: "PARTNER_RESUME_UNAVAILABLE", unavailableMessage: "Dosya yükleme devam servisine şu anda ulaşılamıyor." });
    if (operation === "branch-partner") return proxy(request, { edgeFunction: "branch-partner-v164", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, maxBodyBytes: 32 * 1024, unavailableCode: "BRANCH_PARTNER_GATEWAY_UNAVAILABLE", unavailableMessage: "İş ortaklığı servisine şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin." });
    if (operation === "branch-network-admin") return proxy(request, { edgeFunction: "branch-network-admin", allowedMethods: ["GET", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "BRANCH_NETWORK_ADMIN_UNAVAILABLE", unavailableMessage: "Şube ağ yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["branchId"] });
    if (operation === "branch-security-admin") return proxy(request, { edgeFunction: "branch-admin-security-v181", allowedMethods: ["GET", "PATCH"], timeout: 20_000, requireAuth: true, maxBodyBytes: 24 * 1024, unavailableCode: "BRANCH_SECURITY_ADMIN_UNAVAILABLE", unavailableMessage: "Şube güvenlik yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["view"] });
    if (operation === "branch-operations-admin") return proxy(request, { edgeFunction: "branch-operations-gateway-v177", allowedMethods: ["PATCH"], timeout: 20_000, requireAuth: true, maxBodyBytes: 32 * 1024, unavailableCode: "BRANCH_OPERATIONS_ADMIN_UNAVAILABLE", unavailableMessage: "Şube operasyon güvenlik servisine şu anda ulaşılamıyor." });
    if (operation === "admin-core") return proxy(request, { edgeFunction: "admin-core-gateway-v178", allowedMethods: ["GET", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "ADMIN_CORE_GATEWAY_UNAVAILABLE", unavailableMessage: "Yönetim merkezi servisine şu anda ulaşılamıyor.", forwardQuery: ["view", "staffId"] });
    if (operation === "finance-admin") return proxy(request, { edgeFunction: "finance-admin", allowedMethods: ["GET", "POST"], timeout: 25_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "FINANCE_ADMIN_UNAVAILABLE", unavailableMessage: "Finans yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["from", "to"] });
    if (operation === "marketing-admin") return proxy(request, { edgeFunction: "marketing-admin", allowedMethods: ["GET", "POST"], timeout: 25_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "MARKETING_ADMIN_UNAVAILABLE", unavailableMessage: "Pazarlama yönetim servisine şu anda ulaşılamıyor." });
    if (operation === "telematics-admin") return proxy(request, { edgeFunction: "telematics-admin", allowedMethods: ["GET", "POST"], timeout: 20_000, requireAuth: true, maxBodyBytes: 16 * 1024, unavailableCode: "TELEMATICS_ADMIN_UNAVAILABLE", unavailableMessage: "Araç telematik yönetim servisine şu anda ulaşılamıyor." });
    if (operation === "catalog-admin") return proxy(request, { edgeFunction: "catalog-admin-gateway-v184", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 128 * 1024, unavailableCode: "CATALOG_ADMIN_UNAVAILABLE", unavailableMessage: "Araç ve tur katalog yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["view", "kind", "id"] });
    if (operation === "media-control-admin") return proxy(request, { edgeFunction: "media-control-admin-v185", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "MEDIA_CONTROL_ADMIN_UNAVAILABLE", unavailableMessage: "Medya yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["entityType", "entityId"] });
    if (operation === "admin-team") return proxy(request, { edgeFunction: "admin-team", allowedMethods: ["POST", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 32 * 1024, unavailableCode: "ADMIN_TEAM_GATEWAY_UNAVAILABLE", unavailableMessage: "Yönetici ekip servisine şu anda ulaşılamıyor." });
    if (operation === "customer-admin") return proxy(request, { edgeFunction: "customer-admin-gateway-v173", allowedMethods: ["GET", "POST", "PATCH"], timeout: 20_000, requireAuth: true, maxBodyBytes: 64 * 1024, unavailableCode: "CUSTOMER_ADMIN_GATEWAY_UNAVAILABLE", unavailableMessage: "Müşteri yönetim servisine şu anda ulaşılamıyor.", forwardQuery: ["userId", "limit"] });
    if (operation === "site-content-admin") return proxy(request, { edgeFunction: "site-content-admin-gateway-v174", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, requireAuth: true, maxBodyBytes: 256 * 1024, unavailableCode: "SITE_CONTENT_GATEWAY_UNAVAILABLE", unavailableMessage: "Site içerik yönetim servisine şu anda ulaşılamıyor." });
    if (operation === "requests") return proxy(request, { edgeFunction: "partner-request-gateway-v172", allowedMethods: ["GET", "POST", "PATCH"], timeout: 25_000, maxBodyBytes: 64 * 1024, unavailableCode: "PARTNER_GATEWAY_UNAVAILABLE", unavailableMessage: "Araç değerlendirme servisine şu anda ulaşılamıyor." });
    const decision = originDecision(request);
    return Response.json({ ok: false, code: "UNKNOWN_PARTNER_OPERATION", requestId: decision.requestId }, { status: 404, headers: { ...corsHeaders(decision, ALLOWED_METHODS), "cache-control": "no-store" } });
  },
};