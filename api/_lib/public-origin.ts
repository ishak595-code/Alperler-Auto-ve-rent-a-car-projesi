export function normalizeHttpsOrigin(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

export function vercelProductionOrigin(): string | null {
  const host = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  return host ? normalizeHttpsOrigin(`https://${host}`) : null;
}

export function vercelDeploymentOrigin(): string | null {
  const host = String(process.env.VERCEL_URL || '').trim();
  return host ? normalizeHttpsOrigin(`https://${host}`) : null;
}

export function requestPublicOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol === 'https:') return requestUrl.origin;
  return vercelProductionOrigin() || vercelDeploymentOrigin() || requestUrl.origin;
}
