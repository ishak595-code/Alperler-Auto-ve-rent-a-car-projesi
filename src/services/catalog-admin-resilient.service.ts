import { Injectable } from "@angular/core";
import { CatalogAdminEditorService } from "./catalog-admin-editor.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

/**
 * Keeps the catalog editor on the canonical same-origin API, but provides a
 * narrowly scoped direct Supabase Edge fallback when the hosting adapter itself
 * fails before invoking its handler (for example Vercel FUNCTION_INVOCATION_FAILED).
 * No service-role credential is used in the browser.
 */
@Injectable()
export class CatalogAdminResilientService extends CatalogAdminEditorService {
  constructor() {
    super();
    const instance = this as unknown as {
      request: (method: "GET" | "POST" | "PATCH", url: string, body?: Record<string, unknown>) => Promise<unknown>;
    };
    const original = instance.request.bind(this);
    instance.request = async <T = Record<string, unknown>>(
      method: "GET" | "POST" | "PATCH",
      url: string,
      body?: Record<string, unknown>,
    ): Promise<T> => {
      let response: Response | null = null;
      let payload: Record<string, unknown> = {};
      try {
        response = await fetch(url, {
          method,
          headers: {
            authorization: `Bearer ${await this.accessToken()}`,
            accept: "application/json",
            ...(method === "GET" ? {} : { "content-type": "application/json" }),
          },
          body: method === "GET" ? undefined : JSON.stringify(body || {}),
          cache: "no-store",
        });
        payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      } catch (error) {
        if (this.isNetworkFailure(method)) return this.direct<T>(method, url, body);
        throw error;
      }

      if (response.ok && payload["ok"] !== false) return payload as T;

      if (this.isHostInvocationFailure(response, payload)) {
        return this.direct<T>(method, url, body);
      }

      const code = String(payload["code"] || `CATALOG_ADMIN_${response.status}`);
      if (code.includes("PUBLICATION_BLOCKED:")) throw new Error(`Yayın engellendi: ${code}`);
      if (code === "INVALID_CATALOG_FIELD_VALUE") throw new Error("Girilen katalog alanlarından biri geçersiz. Sayı, tarih ve seçimleri kontrol edin.");
      if (code === "RATE_LIMITED") throw new Error("Çok hızlı işlem yapıldı. Kısa bir süre sonra tekrar deneyin.");
      throw new Error(code);
    };

    void original;
  }

  private async accessToken(): Promise<string> {
    const token = await super["requiredToken"]();
    return token;
  }

  private isNetworkFailure(method: "GET" | "POST" | "PATCH"): boolean {
    return method === "GET" || method === "POST" || method === "PATCH";
  }

  private isHostInvocationFailure(response: Response, payload: Record<string, unknown>): boolean {
    if (response.status !== 500) return false;
    const text = JSON.stringify(payload).toUpperCase();
    return text.includes("FUNCTION_INVOCATION_FAILED") || text.includes("FUNCTION_INVOCATION_TIMEOUT");
  }

  private async direct<T>(method: "GET" | "POST" | "PATCH", originalUrl: string, body?: Record<string, unknown>): Promise<T> {
    const token = await this.accessToken();
    const source = new URL(originalUrl, window.location.origin);
    const edge = new URL(`${SUPABASE_PROJECT_URL}/functions/v1/catalog-admin-gateway-v184`);
    for (const key of ["view", "kind", "id"]) {
      const value = source.searchParams.get(key);
      if (value) edge.searchParams.set(key, value);
    }
    const response = await fetch(edge.toString(), {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        accept: "application/json",
        ...(method === "GET" ? {} : { "content-type": "application/json" }),
      },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok || payload["ok"] === false) {
      throw new Error(String(payload["code"] || `CATALOG_ADMIN_${response.status}`));
    }
    return payload as T;
  }
}
