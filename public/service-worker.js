const SERVICE_WORKER_VERSION = 'alperler-v158';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  // Live Supabase/catalog data stays network-authoritative. The worker exists
  // for a real installed-app lifecycle without serving stale business records.
  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

void SERVICE_WORKER_VERSION;
