const SERVICE_WORKER_VERSION = 'alperler-v155';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  // Keep application data network-authoritative. This worker exists to make the
  // site a real installable PWA without introducing stale API/catalog caches.
  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

void SERVICE_WORKER_VERSION;
