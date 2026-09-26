/**
 * V252 media Worker — read-only public delivery for the R2 bucket bound as MEDIA_BUCKET.
 *
 *  - GET/HEAD only, and only for keys that follow the upload contract
 *    (alperler/<scope>/.../<stem>/w{480..1920}.{webp|jpg} | orig.<ext> | video.<ext>).
 *  - Objects are immutable (random stem per upload) → `Cache-Control: public, max-age=31536000,
 *    immutable`, strong ETag, conditional requests (304) and byte ranges (video seeking).
 *  - Full 200 responses are stored in the Cloudflare edge cache (caches.default), so repeat
 *    views do not touch R2 at all (R2 egress is free anyway; this saves Class B operations).
 *  - Listing, writes and deletes are impossible here: uploads use presigned PUT URLs issued by
 *    the Vercel API, deletes happen server-side with the S3 API.
 */

import { MAX_KEY_LENGTH, rangeAcceptable, refererAllowed } from "./policy";

interface R2Range { offset?: number; length?: number; suffix?: number }
interface R2ObjectLike {
  key: string;
  size: number;
  httpEtag: string;
  range?: R2Range;
  httpMetadata?: { contentType?: string };
  writeHttpMetadata(headers: Headers): void;
  body?: ReadableStream;
}
interface R2BucketLike {
  get(key: string, options?: { range?: Headers; onlyIf?: Headers }): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
}
interface RateLimiterLike { limit(options: { key: string }): Promise<{ success: boolean }> }
interface Env { MEDIA_BUCKET: R2BucketLike; CACHE_CONTROL?: string; ALLOWED_REFERER_HOSTS?: string; MEDIA_RATE_LIMITER?: RateLimiterLike }
interface Ctx { waitUntil(promise: Promise<unknown>): void }
declare const caches: { default: { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> } };

const KEY_PATTERN = /^alperler\/(catalog|branch|admin|ops)\/[A-Za-z0-9_/-]{3,380}\/(w(480|768|1080|1440|1920)\.(webp|jpg)|orig\.(jpg|png|webp|avif)|video\.(mp4|webm))$/;
const TYPES: Record<string, string> = {
  webp: "image/webp", jpg: "image/jpeg", png: "image/png", avif: "image/avif", mp4: "video/mp4", webm: "video/webm",
};
const IMMUTABLE = "public, max-age=31536000, immutable";

function baseHeaders(): Headers {
  const headers = new Headers();
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  headers.set("access-control-expose-headers", "content-length, content-range, etag");
  headers.set("cross-origin-resource-policy", "cross-origin");
  headers.set("x-content-type-options", "nosniff");
  return headers;
}

function notFound(): Response {
  const headers = baseHeaders();
  headers.set("cache-control", "public, max-age=60");
  return new Response("Not found", { status: 404, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: baseHeaders() });
    if (method !== "GET" && method !== "HEAD") {
      const headers = baseHeaders();
      headers.set("allow", "GET, HEAD, OPTIONS");
      return new Response("Method not allowed", { status: 405, headers });
    }
    const url = new URL(request.url);
    if (url.pathname.length > MAX_KEY_LENGTH) return notFound();

    if (!refererAllowed(request.headers.get("referer"), env.ALLOWED_REFERER_HOSTS)) {
      const headers = baseHeaders();
      headers.set("cache-control", "private, no-store");
      return new Response("Hotlinking is not allowed", { status: 403, headers });
    }
    if (env.MEDIA_RATE_LIMITER) {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await env.MEDIA_RATE_LIMITER.limit({ key: ip });
      if (!success) {
        const headers = baseHeaders();
        headers.set("retry-after", "10");
        headers.set("cache-control", "private, no-store");
        return new Response("Too many requests", { status: 429, headers });
      }
    }
    if (!rangeAcceptable(request.headers.get("range"))) {
      const headers = baseHeaders();
      headers.set("cache-control", "private, no-store");
      return new Response("Range not satisfiable", { status: 416, headers });
    }
    let key: string;
    try {
      key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    } catch {
      return notFound();
    }
    if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) return notFound();

    const isRange = request.headers.has("range");
    const cacheKey = new Request(`${url.origin}/${key}`, { method: "GET" });
    if (method === "GET" && !isRange) {
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
    }

    const object = method === "HEAD"
      ? await env.MEDIA_BUCKET.head(key)
      : await env.MEDIA_BUCKET.get(key, { range: request.headers, onlyIf: request.headers });
    if (!object) return notFound();

    const headers = baseHeaders();
    object.writeHttpMetadata(headers);
    const ext = key.split(".").pop() || "";
    headers.set("content-type", object.httpMetadata?.contentType || TYPES[ext] || "application/octet-stream");
    headers.set("cache-control", env.CACHE_CONTROL || IMMUTABLE);
    headers.set("etag", object.httpEtag);
    headers.set("accept-ranges", "bytes");

    if (method === "HEAD") {
      headers.set("content-length", String(object.size));
      return new Response(null, { status: 200, headers });
    }
    // onlyIf precondition matched (If-None-Match / If-Modified-Since) → no body.
    if (!object.body) return new Response(null, { status: 304, headers });

    if (isRange && object.range) {
      const offset = object.range.offset ?? (object.range.suffix !== undefined ? object.size - object.range.suffix : 0);
      const length = object.range.length ?? (object.size - offset);
      headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set("content-length", String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("content-length", String(object.size));
    const response = new Response(object.body, { status: 200, headers });
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  },
};
