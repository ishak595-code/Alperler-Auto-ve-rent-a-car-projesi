const RELEASE = 'v186-ui-stability';
const CACHE_PREFIX = 'alperler-pwa-';
const SHELL_CACHE = `${CACHE_PREFIX}${RELEASE}-shell`;
const STATIC_CACHE = `${CACHE_PREFIX}${RELEASE}-static`;
const OFFLINE_URL = '/offline.html';
const ACTIVE_CACHES = new Set([SHELL_CACHE, STATIC_CACHE]);

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isDynamicBusinessPath(pathname) {
  return pathname === '/api' ||
    pathname.startsWith('/api/') ||
    pathname === '/catalog-media' ||
    pathname.startsWith('/catalog-media/');
}

function isCacheableStaticRequest(request, url) {
  if (!isSameOrigin(url) || isDynamicBusinessPath(url.pathname)) return false;
  if (request.headers.has('range')) return false;
  return request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font';
}

function responseMayBeCached(response) {
  if (!response || !response.ok || response.status !== 200 || response.type !== 'basic') return false;
  const cacheControl = String(response.headers.get('cache-control') || '').toLowerCase();
  return !cacheControl.includes('no-store') && !cacheControl.includes('private');
}

async function installOfflineShell() {
  const cache = await caches.open(SHELL_CACHE);
  const request = new Request(OFFLINE_URL, { cache: 'reload' });
  const response = await fetch(request);
  if (!response.ok) throw new Error(`Offline shell failed with ${response.status}`);
  await cache.put(request, response);
}

async function handleNavigation(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
    return await fetch(event.request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const fallback = await cache.match(OFFLINE_URL, { ignoreSearch: true });
    if (fallback) return fallback;
    return new Response(
      '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Çevrimdışı</title></head><body><main><h1>İnternet bağlantısı yok</h1><p>Bağlantınızı kontrol edip tekrar deneyin.</p></main></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }
}

async function handleStaticAsset(event, request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (responseMayBeCached(response)) {
    event.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await installOfflineShell();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(name))
        .map((name) => caches.delete(name)),
    );

    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable().catch(() => undefined);
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Customer, booking, payment and catalogue data always remain network-authoritative.
  // Cross-origin Supabase calls and same-origin API/media proxies are never written to Cache Storage.
  if (!isSameOrigin(url) || isDynamicBusinessPath(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isCacheableStaticRequest(request, url)) {
    event.respondWith(handleStaticAsset(event, request));
  }
});

self.addEventListener('message', (event) => {
  const type = typeof event.data === 'string' ? event.data : event.data?.type;
  if (type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }

  if (type === 'GET_VERSION' && event.ports?.[0]) {
    event.ports[0].postMessage({ type: 'VERSION', release: RELEASE });
  }
});
