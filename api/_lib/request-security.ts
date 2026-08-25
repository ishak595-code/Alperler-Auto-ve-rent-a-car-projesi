const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,80}$/;

function clean(value: string | null | undefined, max: number): string {
  return String(value || "").trim().slice(0, max);
}

function configuredOrigins(): Set<string> {
  const values = clean(process.env.APP_ALLOWED_ORIGINS, 2000)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const result = new Set<string>();
  for (const value of values) {
    try {
      result.add(new URL(value).origin);
    } catch {
      // Invalid configuration must not expand the allow-list.
    }
  }
  return result;
}

export function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 100);
}

export interface OriginDecision {
  allowed: boolean;
  origin: string | null;
  requestId: string;
}

export function originDecision(request: Request): OriginDecision {
  const id = requestId(request);
  const rawOrigin = clean(request.headers.get("origin"), 240);
  if (!rawOrigin) return { allowed: true, origin: null, requestId: id };

  let origin: string;
  let targetOrigin: string;
  try {
    origin = new URL(rawOrigin).origin;
    targetOrigin = new URL(request.url).origin;
  } catch {
    return { allowed: false, origin: null, requestId: id };
  }

  const configured = configuredOrigins();
  const localDev = (() => {
    try {
      const parsed = new URL(origin);
      return (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        (parsed.protocol === "http:" || parsed.protocol === "https:");
    } catch {
      return false;
    }
  })();

  return {
    allowed: origin === targetOrigin || configured.has(origin) || localDev,
    origin,
    requestId: id,
  };
}

export function corsHeaders(
  decision: OriginDecision,
  methods: string,
  headers = "authorization, content-type, x-idempotency-key, x-request-id",
): Record<string, string> {
  return {
    ...(decision.allowed && decision.origin ? { "access-control-allow-origin": decision.origin } : {}),
    "access-control-allow-methods": methods,
    "access-control-allow-headers": headers,
    "access-control-max-age": "600",
    "vary": "Origin",
    "x-request-id": decision.requestId,
    "x-content-type-options": "nosniff",
  };
}

export function guardOrigin(request: Request, methods: string): Response | null {
  const decision = originDecision(request);
  if (!decision.allowed) {
    return Response.json(
      { ok: false, code: "ORIGIN_NOT_ALLOWED", requestId: decision.requestId },
      {
        status: 403,
        headers: {
          ...corsHeaders(decision, methods),
          "cache-control": "no-store",
        },
      },
    );
  }
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(decision, methods),
    });
  }
  return null;
}
