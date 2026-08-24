const SERVICE_WORKER_VERSION = 'alperler-v160';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  // Chrome owns installation. Live Supabase/catalog data stays network-authoritative;
  // the worker only supplies the installed-app lifecycle and never serves stale data.
  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

void SERVICE_WORKER_VERSION;
