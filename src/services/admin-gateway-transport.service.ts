import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from "../supabase.config";

/**
 * Tek yönetici veri taşıma katmanı.
 *
 * Yönetim paneli, herkese açık vitrin gibi doğrudan Supabase ile konuşur.
 * Sıra sabittir ve tek yerdedir:
 *   1. Supabase Edge Function (doğrudan tarayıcıdan, yönetici JWT ile)
 *   2. Aynı-origin BFF (/api/...) — yalnızca 1. adımda taşıma katmanı
 *      hatası olursa (ağ/CORS, host çökmesi, 5xx, fonksiyon bulunamadı)
 *   3. PostgREST (RLS altında) — yalnızca okuma için, çağıran servis ister
 *
 * Yetki, doğrulama ve iş kuralı hataları (401/403/400/409/422/429) hiçbir
 * zaman bir sonraki katmana düşmez; bunlar kesin cevaplardır.
 */

export type GatewayMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type GatewayLayer = "edge" | "bff" | "rest";

export interface GatewayRequest {
  method: GatewayMethod;
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
  requestId?: string;
}

export interface GatewaySpec extends GatewayRequest {
  /** Supabase Edge Function adı (deployment manifest'teki slug). */
  edgeFunction: string;
  /** Aynı-origin BFF yolu, örn. "/api/partner?op=catalog-admin". */
  bffUrl: string;
}

interface JsonPayload {
  ok?: boolean;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

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

export class AdminGatewayFailure extends Error {
  constructor(
    readonly layer: GatewayLayer,
    readonly status: number,
    readonly code: string,
    readonly transport: boolean,
    readonly attempts: Array<{ layer: GatewayLayer; status: number; code: string }> = [],
    message = code,
  ) {
    super(message);
    this.name = "AdminGatewayFailure";
  }
}

export function isAdminGatewayFailure(error: unknown): error is AdminGatewayFailure {
  return error instanceof AdminGatewayFailure;
}

@Injectable({ providedIn: "root" })
export class AdminGatewayTransportService {
  private readonly auth = inject(AuthService);

  async token(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("Yönetici oturumu gerekli.");
    return token;
  }

  /** Edge → BFF sırasıyla dener; yalnızca taşıma hatalarında bir sonrakine geçer. */
  async gateway<T extends JsonPayload = JsonPayload>(spec: GatewaySpec): Promise<T> {
    const attempts: Array<{ layer: GatewayLayer; status: number; code: string }> = [];
    const first = await this.edge<T>(spec.edgeFunction, spec).catch((error: unknown) => error);
    if (!isAdminGatewayFailure(first)) return first as T;
    attempts.push({ layer: first.layer, status: first.status, code: first.code });
    if (!first.transport) throw first;

    const second = await this.bff<T>(spec.bffUrl, spec).catch((error: unknown) => error);
    if (!isAdminGatewayFailure(second)) return second as T;
    attempts.push({ layer: second.layer, status: second.status, code: second.code });
    throw new AdminGatewayFailure(second.layer, second.status, second.code, second.transport, attempts);
  }

  /** Doğrudan Supabase Edge Function çağrısı (Vercel'e bağımlı değildir). */
  async edge<T extends JsonPayload = JsonPayload>(functionName: string, request: GatewayRequest): Promise<T> {
    const token = await this.token();
    const url = new URL(supabaseFunctionUrl(functionName));
    this.applyQuery(url, request.query);
    return this.call<T>("edge", url.toString(), request, {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
    });
  }

  /** Aynı-origin BFF çağrısı (/api/...). */
  async bff<T extends JsonPayload = JsonPayload>(path: string, request: GatewayRequest): Promise<T> {
    const token = await this.token();
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(path, base);
    this.applyQuery(url, request.query);
    return this.call<T>("bff", url.toString(), request, { authorization: `Bearer ${token}` });
  }

  /** PostgREST — RLS yönetici oturumuyla; kaynak-gerçeği doğrudan veritabanı. */
  async rest<T = unknown>(path: string, options: { method?: GatewayMethod; body?: unknown; prefer?: string; timeoutMs?: number } = {}): Promise<T> {
    const token = await this.token();
    const method = options.method || "GET";
    let response: Response;
    try {
      response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path.replace(/^\//, "")}`, {
        method,
        cache: "no-store",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          authorization: `Bearer ${token}`,
          accept: "application/json",
          ...(options.prefer ? { Prefer: options.prefer } : {}),
          ...(method === "GET" ? {} : { "content-type": "application/json" }),
        },
        body: method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
        signal: AbortSignal.timeout(options.timeoutMs || 15_000),
      });
    } catch (error) {
      throw new AdminGatewayFailure("rest", 0, this.networkCode(error), true);
    }
    const text = await response.text();
    let payload: unknown = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
    if (!response.ok) {
      const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const code = String(record["code"] || record["message"] || `REST_${response.status}`).slice(0, 160);
      throw new AdminGatewayFailure("rest", response.status, code, response.status >= 500 || response.status === 404, []);
    }
    return payload as T;
  }

  /** Aynı hatayı, kullanıcıya gösterilecek Türkçe mesajla yeniden sarar (katman bilgisi korunur). */
  humanize(error: AdminGatewayFailure, subject: string): AdminGatewayFailure {
    return new AdminGatewayFailure(error.layer, error.status, error.code, error.transport, error.attempts, this.describe(error, subject));
  }

  /** Kullanıcıya gösterilecek, katmanı adlandıran Türkçe teşhis metni. */
  describe(error: unknown, subject = "Veri"): string {
    if (!isAdminGatewayFailure(error)) {
      return error instanceof Error ? error.message : `${subject} işlemi tamamlanamadı.`;
    }
    if (error.code === "UNAUTHORIZED" || error.status === 401) return "Yönetici oturumu doğrulanamadı. Çıkış yapıp yeniden giriş yapın.";
    if (error.code === "FORBIDDEN" || error.code === "CONTENT_PERMISSION_REQUIRED" || error.status === 403) return "Bu işlem için yönetici yetkiniz yok (yetki denetimi Supabase tarafından reddedildi).";
    if (error.code === "RATE_LIMITED" || error.status === 429) return "Çok hızlı işlem yapıldı. Kısa bir süre sonra tekrar deneyin.";
    const trail = (error.attempts.length ? error.attempts : [{ layer: error.layer, status: error.status, code: error.code }])
      .map((attempt) => `${this.layerLabel(attempt.layer)}: ${attempt.code}${attempt.status ? ` (HTTP ${attempt.status})` : ""}`)
      .join(" · ");
    return `${subject} işlemi tamamlanamadı — ${trail}`;
  }

  layerLabel(layer: GatewayLayer): string {
    switch (layer) {
      case "edge": return "Supabase Edge";
      case "bff": return "Site API (/api)";
      case "rest": return "Veritabanı (RLS)";
    }
  }

  private async call<T extends JsonPayload>(layer: GatewayLayer, url: string, request: GatewayRequest, headers: Record<string, string>): Promise<T> {
    const method = request.method;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        cache: "no-store",
        headers: {
          ...headers,
          accept: "application/json",
          "x-request-id": request.requestId || crypto.randomUUID(),
          ...(method === "GET" ? {} : { "content-type": "application/json" }),
        },
        body: method === "GET" ? undefined : JSON.stringify(request.body || {}),
        signal: AbortSignal.timeout(request.timeoutMs || 20_000),
      });
    } catch (error) {
      throw new AdminGatewayFailure(layer, 0, this.networkCode(error), true);
    }

    const text = await response.text();
    let payload: JsonPayload | null = null;
    try {
      const parsed = text ? JSON.parse(text) as unknown : null;
      payload = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonPayload : null;
    } catch {
      payload = null;
    }

    if (response.ok && payload && payload.ok !== false) return payload as T;

    // Gövdesi JSON olmayan 5xx = host katmanı çöktü (örn. Vercel FUNCTION_INVOCATION_FAILED).
    if (!payload) {
      const hostCode = /FUNCTION_INVOCATION_TIMEOUT/i.test(text) ? "FUNCTION_INVOCATION_TIMEOUT"
        : /FUNCTION_INVOCATION_FAILED/i.test(text) ? "FUNCTION_INVOCATION_FAILED"
        : `HOST_${response.status || "ERROR"}`;
      throw new AdminGatewayFailure(layer, response.status, hostCode, true);
    }

    const rawCode = payload.code ?? payload.message;
    const detail = typeof payload.message === "string" && payload.message && payload.message !== rawCode ? ` — ${payload.message.slice(0, 140)}` : "";
    const code = String(typeof rawCode === "number" ? `HTTP_${rawCode}${detail}` : rawCode || `HTTP_${response.status}${detail}`).slice(0, 220);
    const baseCode = String(typeof rawCode === "number" ? `HTTP_${rawCode}` : rawCode || `HTTP_${response.status}`);
    const transport = TRANSPORT_CODES.has(baseCode) || response.status === 404 || response.status >= 502;
    throw new AdminGatewayFailure(layer, response.status, code, transport);
  }

  private applyQuery(url: URL, query?: Record<string, string | undefined>): void {
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
  }

  private networkCode(error: unknown): string {
    const name = error instanceof Error ? error.name : "";
    return name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "NETWORK";
  }
}
