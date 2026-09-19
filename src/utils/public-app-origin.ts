/**
 * Browser-safe public origin for Supabase Auth redirectTo links.
 * Prefers runtime-injected HTTPS origin (never invent a purchased domain).
 * Avoids shipping localhost recovery links when a public origin is configured.
 */

function readRuntimeEnv(key: string): string {
  if (typeof window === "undefined") return "";
  const env = (window as Window & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return String(env?.[key] || "").trim();
}

export function normalizeHttpsOrigin(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function isLocalDevOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

/** Canonical public HTTPS origin for Auth emails. Env-driven; no hardcoded custom domain. */
export function resolvePublicAppOrigin(): string {
  const configured =
    normalizeHttpsOrigin(readRuntimeEnv("APP_PUBLIC_ORIGIN")) ||
    normalizeHttpsOrigin(readRuntimeEnv("PUBLIC_APP_URL")) ||
    normalizeHttpsOrigin(readRuntimeEnv("SITE_URL"));
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/** Absolute app URL for Auth redirect_to (path must start with /). */
export function publicAppUrl(pathnameAndQuery: string): string {
  const path = pathnameAndQuery.startsWith("/") ? pathnameAndQuery : `/${pathnameAndQuery}`;
  const origin = resolvePublicAppOrigin();
  if (!origin) return path;
  // Guard: if somehow still on localhost but an https env exists, prefer env (already handled above).
  if (isLocalDevOrigin(origin)) {
    const configured =
      normalizeHttpsOrigin(readRuntimeEnv("APP_PUBLIC_ORIGIN")) ||
      normalizeHttpsOrigin(readRuntimeEnv("PUBLIC_APP_URL")) ||
      normalizeHttpsOrigin(readRuntimeEnv("SITE_URL"));
    if (configured) return `${configured}${path}`;
  }
  return `${origin}${path}`;
}
