import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = JSON.parse(read('public/manifest.json'));
const indexHtml = read('index.html');
const bootstrap = read('index.tsx');
const serviceWorker = read('public/service-worker.js');
const vercel = JSON.parse(read('vercel.json'));
const angular = JSON.parse(read('angular.json'));
const mobileDock = read('src/components/customer-mobile-dock.component.ts');

assert(manifest.name && manifest.short_name, 'PWA manifest must define name and short_name.');
assert(manifest.start_url === '/', 'PWA start_url must remain root.');
assert(manifest.scope === '/', 'PWA scope must remain root.');
assert(['standalone', 'fullscreen'].includes(manifest.display), 'PWA display must be standalone or fullscreen.');
assert(manifest.theme_color && manifest.background_color, 'PWA theme/background colors are required.');

const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
for (const size of ['192x192', '512x512']) {
  const icon = icons.find((item) => item?.sizes === size && item?.type === 'image/png');
  assert(icon?.src, `PWA manifest is missing ${size} PNG icon.`);
  const localPath = `public${icon.src}`;
  assert(fs.existsSync(localPath), `PWA icon file is missing: ${localPath}`);
}

assert(/<link\s+rel=["']manifest["']\s+href=["']\/manifest\.json["']/.test(indexHtml), 'index.html must link /manifest.json.');
assert(/name=["']mobile-web-app-capable["']\s+content=["']yes["']/.test(indexHtml), 'Android standalone meta is missing.');
assert(/name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']/.test(indexHtml), 'Apple standalone meta is missing.');
assert(/navigator\.serviceWorker\s*\n?\s*\.register\(["']\/service-worker\.js["']/.test(bootstrap), 'Application bootstrap must register /service-worker.js.');
assert(serviceWorker.includes("self.addEventListener('fetch'"), 'Service worker must own a fetch handler for installability.');
assert(serviceWorker.includes('event.respondWith(fetch(request))'), 'Service worker must remain network-authoritative.');
assert(!/caches\.(open|match)|cache\.put/.test(serviceWorker), 'PWA worker must not cache live application/catalog data.');

const publicAsset = angular.projects?.app?.architect?.build?.options?.assets?.some((entry) => entry?.input === 'public');
assert(publicAsset, 'Angular build must copy public PWA assets.');

const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const serviceWorkerHeaders = headers.find((entry) => entry?.source === '/service-worker.js')?.headers || [];
const manifestHeaders = headers.find((entry) => entry?.source === '/manifest.json')?.headers || [];
const hasHeader = (list, key, valuePart) => list.some((item) => String(item?.key).toLowerCase() === key.toLowerCase() && String(item?.value).toLowerCase().includes(valuePart.toLowerCase()));
assert(hasHeader(serviceWorkerHeaders, 'Service-Worker-Allowed', '/'), 'Vercel must allow root service-worker scope.');
assert(hasHeader(serviceWorkerHeaders, 'Cache-Control', 'no-cache'), 'Service worker must not be cached stale.');
assert(hasHeader(manifestHeaders, 'Content-Type', 'application/manifest+json'), 'Manifest must be served with manifest MIME type.');

assert(mobileDock.includes('.customer-command-dock{display:none}'), 'Mobile dock must default to hidden on desktop/tablet widths.');
assert(mobileDock.includes('@media (max-width:767px)'), 'Mobile dock visibility must remain constrained to mobile layout.');

console.log('PWA installability guard passed: install metadata, service worker, standalone mode and responsive mobile dock are valid.');
