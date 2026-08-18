const ALLOWED_MEDIA_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

const MAX_MEDIA_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 5;

function validateMediaUrl(value: string): URL {
  if (!value || value.length > 2_048) throw new Error("INVALID_MEDIA_URL");
  const url = new URL(value);
  if (url.protocol !== "https:" || !ALLOWED_MEDIA_HOSTS.has(url.hostname)) {
    throw new Error("MEDIA_HOST_NOT_ALLOWED");
  }
  return url;
}

async function fetchAllowedMedia(source: URL): Promise<Response> {
  let current = source;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "AlperlerAuto/1.0 (public catalogue media proxy)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("MEDIA_REDIRECT_FAILED");
      current = validateMediaUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error("MEDIA_REDIRECT_FAILED");
}

function errorResponse(code: string, status: number): Response {
  return Response.json(
    { ok: false, code },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET") return errorResponse("METHOD_NOT_ALLOWED", 405);

    let source: URL;
    try {
      source = validateMediaUrl(new URL(request.url).searchParams.get("url") || "");
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "INVALID_MEDIA_URL", 400);
    }

    let upstream: Response;
    try {
      upstream = await fetchAllowedMedia(source);
    } catch (error) {
      console.error("Catalogue media upstream unavailable", error);
      return errorResponse("MEDIA_UPSTREAM_UNAVAILABLE", 502);
    }

    if (!upstream.ok) return errorResponse(`MEDIA_UPSTREAM_${upstream.status}`, 502);

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return errorResponse("MEDIA_CONTENT_TYPE_REJECTED", 415);
    }

    const declaredLength = Number(upstream.headers.get("content-length") || 0);
    if (declaredLength > MAX_MEDIA_BYTES) return errorResponse("MEDIA_TOO_LARGE", 413);

    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > MAX_MEDIA_BYTES) return errorResponse("MEDIA_TOO_LARGE", 413);

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        ...(upstream.headers.get("etag") ? { etag: upstream.headers.get("etag") as string } : {}),
        ...(upstream.headers.get("last-modified") ? { "last-modified": upstream.headers.get("last-modified") as string } : {}),
      },
    });
  },
};
