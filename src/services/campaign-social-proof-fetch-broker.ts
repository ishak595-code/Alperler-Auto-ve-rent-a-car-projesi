const SOCIAL_PROOF_RPC_PATH = '/rest/v1/rpc/campaign_social_proof';
const CACHE_TTL_MS = 55_000;
const REQUEST_TIMEOUT_MS = 8_000;

type CachedResponse = {
  expiresAt: number;
  response: Response;
};

let installed = false;
let inFlight: Promise<Response> | null = null;
let cached: CachedResponse | null = null;

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) return new URL(input.url, window.location.href);
    return new URL(String(input), window.location.href);
  } catch {
    return null;
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function requestHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  if (init?.headers) return new Headers(init.headers);
  if (input instanceof Request) return new Headers(input.headers);
  return new Headers();
}

function isPublicSocialProofRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = requestUrl(input);
  if (!url || url.pathname !== SOCIAL_PROOF_RPC_PATH) return false;
  if (requestMethod(input, init) !== 'POST') return false;

  const headers = requestHeaders(input, init);
  return !headers.has('authorization');
}

function withTimeout(init?: RequestInit): RequestInit {
  if (init?.signal) return init;
  if (typeof AbortSignal === 'undefined' || typeof AbortSignal.timeout !== 'function') return init || {};
  return { ...(init || {}), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
}

/**
 * Several independently rendered homepage sections used to issue the same
 * anonymous social-proof RPC at bootstrap and once per minute. On mobile this
 * created a thundering herd of identical POST + CORS preflight work. This
 * broker is deliberately scoped to that single read-only RPC. Authenticated,
 * customer, booking, payment and all other requests are untouched.
 */
export function installCampaignSocialProofFetchBroker(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isPublicSocialProofRequest(input, init)) return nativeFetch(input, init);

    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.response.clone();
    if (inFlight) return (await inFlight).clone();

    inFlight = nativeFetch(input, withTimeout(init))
      .then((response) => {
        if (response.ok) cached = { expiresAt: Date.now() + CACHE_TTL_MS, response };
        return response;
      })
      .finally(() => {
        inFlight = null;
      });

    try {
      return (await inFlight).clone();
    } catch (error) {
      cached = null;
      throw error;
    }
  };
}
