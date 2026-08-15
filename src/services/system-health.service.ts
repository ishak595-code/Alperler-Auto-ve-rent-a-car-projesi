import { Injectable, signal } from "@angular/core";
import { supabaseFunctionUrl } from "../supabase.config";

export type SystemSeverity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface SystemEventInput {
  severity?: SystemSeverity;
  source: string;
  code: string;
  message: string;
  route?: string;
  autoRecovered?: boolean;
  recoveryAction?: string;
  details?: Record<string, string | number | boolean | null | undefined>;
}

@Injectable({ providedIn: "root" })
export class SystemHealthService {
  readonly started = signal(false);
  private readonly recent = new Map<string, number>();
  private readonly listenerAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

  start(): void {
    if (this.started() || typeof window === "undefined") return;
    this.started.set(true);
    const signal = this.listenerAbort?.signal;

    window.addEventListener("unhandledrejection", (event) => {
      const error = this.normalizeError(event.reason);
      void this.handleUnexpected(error, "unhandledrejection");
    }, signal ? { signal } : undefined);

    window.addEventListener("error", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        const resource = target instanceof HTMLImageElement ? "image" : target instanceof HTMLScriptElement ? "script" : tag;
        void this.report({
          severity: resource === "script" ? "ERROR" : "WARN",
          source: "resource",
          code: `RESOURCE_${resource.toUpperCase()}_FAILED`,
          message: `${resource} resource could not be loaded`,
          details: { component: tag, online: navigator.onLine },
        });
        return;
      }
      if (event.error) void this.handleUnexpected(this.normalizeError(event.error), "window-error");
    }, signal ? { capture: true, signal } : true);
  }

  async handleUnexpected(error: Error, source = "angular"): Promise<void> {
    const recoverable = this.isChunkLoadError(error);
    const recovery = recoverable ? this.claimChunkRecovery() : false;
    await this.report({
      severity: recoverable ? "WARN" : "ERROR",
      source,
      code: recoverable ? "CHUNK_LOAD_FAILED" : this.errorCode(error),
      message: error.message || error.name || "Unexpected client error",
      autoRecovered: recovery,
      recoveryAction: recovery ? "single_safe_reload" : undefined,
      details: {
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        chunk: recoverable,
      },
    });
    if (recovery && typeof window !== "undefined") window.setTimeout(() => window.location.reload(), 120);
  }

  async report(input: SystemEventInput): Promise<void> {
    if (typeof window === "undefined") return;
    const route = input.route || window.location.pathname;
    const localKey = `${input.source}|${input.code}|${route}|${input.message}`.slice(0, 700);
    const now = Date.now();
    const previous = this.recent.get(localKey) || 0;
    if (now - previous < 8_000) return;
    this.recent.set(localKey, now);
    this.pruneRecent(now);

    const payload = {
      severity: input.severity || "ERROR",
      source: input.source,
      code: input.code,
      message: input.message,
      route,
      autoRecovered: input.autoRecovered === true,
      recoveryAction: input.recoveryAction || null,
      clientFamily: this.clientFamily(),
      details: input.details || {},
    };

    try {
      await fetch(supabaseFunctionUrl("system-event"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Telemetry must never create another user-facing failure.
    }
  }

  private normalizeError(value: unknown): Error {
    if (value instanceof Error) return value;
    if (typeof value === "string") return new Error(value);
    try { return new Error(JSON.stringify(value)); }
    catch { return new Error("Unknown client error"); }
  }

  private errorCode(error: Error): string {
    const name = (error.name || "Error").replace(/[^A-Za-z0-9_]/g, "_").toUpperCase().slice(0, 70);
    return `CLIENT_${name || "ERROR"}`;
  }

  private isChunkLoadError(error: Error): boolean {
    const text = `${error.name} ${error.message}`.toLowerCase();
    return text.includes("chunkloaderror") ||
      text.includes("loading chunk") ||
      text.includes("dynamically imported module") ||
      text.includes("failed to fetch dynamically imported module") ||
      text.includes("importing a module script failed");
  }

  private claimChunkRecovery(): boolean {
    if (typeof sessionStorage === "undefined" || typeof window === "undefined") return false;
    const key = `alperler:chunk-recovery:${window.location.pathname}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    const now = Date.now();
    if (Number.isFinite(last) && now - last < 5 * 60_000) return false;
    sessionStorage.setItem(key, String(now));
    return true;
  }

  private clientFamily(): string {
    if (typeof navigator === "undefined") return "unknown";
    const ua = navigator.userAgent;
    const platform = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : "Other";
    const browser = /Edg\//i.test(ua) ? "Edge" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "Other";
    return `${platform}/${browser}`;
  }

  private pruneRecent(now: number): void {
    if (this.recent.size < 120) return;
    for (const [key, time] of this.recent) if (now - time > 60_000) this.recent.delete(key);
  }
}
