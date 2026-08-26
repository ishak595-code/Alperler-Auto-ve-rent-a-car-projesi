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
const pwaRuntime = read('src/services/pwa-runtime.service.ts');
const serviceWorker = read('public/service-worker.js');
const offlineHtml = read('public/offline.html');
const vercel = JSON.parse(read('vercel.json'));
const angular = JSON.parse(read('angular.json'));
const mobileDock = read('src/components/customer-mobile-dock.component.ts');
const navbar = read('src/components/navbar.component.ts');
const mainLayout = read('src/components/main-layout.component.ts');
const appComponent = read('src/app.component.ts');
const runtimeCss = read('src/runtime-stability.css');

assert(manifest.name && manifest.short_name, 'PWA manifest must define name and short_name.');
assert(manifest.start_url === '/', 'PWA start_url must remain root.');
assert(manifest.scope === '/', 'PWA scope must remain root.');
assert(manifest.display === 'standalone', 'PWA fallback display must remain standalone.');
assert(Array.isArray(manifest.display_override) && manifest.display_override[0] === 'standalone', 'Installed PWA must prefer standalone display mode.');
assert(manifest.theme_color && manifest.background_color, 'PWA theme/background colors are required.');
assert(manifest.prefer_related_applications === false, 'PWA must prefer the web app installation flow.');

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

assert(bootstrap.includes("import { startPwaRuntime } from './src/services/pwa-runtime.service';"), 'Bootstrap must use the dedicated PWA runtime coordinator.');
assert(bootstrap.includes('startPwaRuntime();'), 'Bootstrap must start the PWA runtime.');
assert(pwaRuntime.includes("navigator.serviceWorker.register(SERVICE_WORKER_URL"), 'PWA runtime must register the service worker.');
assert(pwaRuntime.includes("updateViaCache: 'none'"), 'PWA worker updates must bypass HTTP cache.');
assert(pwaRuntime.includes("root.dataset.pwaDisplayMode"), 'PWA runtime must expose installed display mode to the DOM.');
assert(pwaRuntime.includes("root.dataset.pwaOnline"), 'PWA runtime must expose online/offline state to the DOM.');
assert(pwaRuntime.includes("visibilitychange"), 'PWA runtime must re-check releases when the app becomes visible.');
assert(pwaRuntime.includes("GET_VERSION"), 'PWA runtime must identify the active worker release.');

assert(/^const RELEASE = ['"]v[0-9][A-Za-z0-9._-]*['"];?$/m.test(serviceWorker), 'Service worker release must use an explicit versioned cache key.');
assert(serviceWorker.includes("const CACHE_PREFIX = 'alperler-pwa-'"), 'Service worker must isolate Alperler-owned caches.');
assert(serviceWorker.includes("const OFFLINE_URL = '/offline.html'"), 'Service worker must define a dedicated offline shell.');
assert(serviceWorker.includes('await caches.open(SHELL_CACHE)'), 'Offline shell must be precached.');
assert(serviceWorker.includes('await caches.open(STATIC_CACHE)'), 'Versioned static cache must be used for immutable build assets.');
assert(serviceWorker.includes('cacheNames = await caches.keys()'), 'Activation must enumerate old PWA caches.');
assert(serviceWorker.includes("name.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(name)"), 'Activation must delete only obsolete Alperler cache releases.');
assert(serviceWorker.includes('navigationPreload.enable()'), 'Navigation preload must reduce online navigation latency.');
assert(serviceWorker.includes('event.respondWith(handleNavigation(event))'), 'Navigations must use network-first offline fallback handling.');
assert(serviceWorker.includes("request.destination === 'script'"), 'Runtime cache must include hashed scripts.');
assert(serviceWorker.includes("request.destination === 'style'"), 'Runtime cache must include hashed styles.');
assert(serviceWorker.includes("request.destination === 'font'"), 'Runtime cache must include hashed fonts.');
assert(serviceWorker.includes("pathname.startsWith('/api/')"), 'Same-origin API traffic must be explicitly network-only.');
assert(serviceWorker.includes("pathname.startsWith('/catalog-media/')"), 'Dynamic catalogue media proxy must remain outside PWA Cache Storage.');
assert(serviceWorker.includes('if (!isSameOrigin(url) || isDynamicBusinessPath(url.pathname)) return;'), 'Cross-origin Supabase and dynamic business traffic must bypass PWA caches.');
assert(serviceWorker.includes("type === 'GET_VERSION'"), 'Worker must expose its release for runtime diagnostics.');

assert(fs.existsSync('public/offline.html'), 'PWA offline fallback document is missing.');
assert(/<html\s+lang=["']tr["']/.test(offlineHtml), 'Offline shell must declare Turkish language.');
assert(offlineHtml.includes('İnternet bağlantısı yok'), 'Offline shell must explain connectivity state.');
assert(offlineHtml.includes('Tekrar dene'), 'Offline shell must provide a retry action.');
assert(!/<script\b[^>]*\bsrc=/i.test(offlineHtml), 'Offline shell must not depend on external scripts.');
assert(!/<link\b[^>]*rel=["']stylesheet["']/i.test(offlineHtml), 'Offline shell must be self-contained without external stylesheets.');

// Chrome owns the native Install app / Add to Home screen experience. Custom app code
// may document the browser event by name, but it may not register a listener,
// prevent the browser default, buffer the event, or render a second installer.
assert(!/addEventListener\s*\(\s*['"]beforeinstallprompt['"]/.test(bootstrap + pwaRuntime), 'Application must not intercept Chrome beforeinstallprompt.');
assert(!(bootstrap + pwaRuntime).includes('__alperlerInstallPrompt'), 'Application must not buffer a custom install event.');
assert(!appComponent.includes('PwaInstallPromptComponent'), 'Customer shell must not import a custom PWA installer.');
assert(!appComponent.includes('<app-pwa-install-prompt>'), 'Customer shell must not render an in-page install card.');
assert(!fs.existsSync('src/components/pwa-install-prompt.component.ts'), 'Legacy in-page PWA install component must remain deleted.');
assert(!fs.existsSync('src/services/pwa-install.service.ts'), 'Legacy PWA install interception service must remain deleted.');

assert(runtimeCss.includes('@media (display-mode: standalone), (display-mode: fullscreen)'), 'Installed PWA must own dynamic viewport behavior.');
assert(runtimeCss.includes('--site-safe-top: env(safe-area-inset-top, 0px)'), 'Runtime must expose top safe-area token.');
assert(runtimeCss.includes('html[data-pwa-display-mode="standalone"]'), 'Runtime display-mode DOM signal must have a CSS contract.');
assert(navbar.includes('env(safe-area-inset-top)'), 'Fixed customer navbar must consume top safe-area in installed mode.');
assert(mainLayout.includes('env(safe-area-inset-top)'), 'Customer main shell must offset installed-mode safe area.');
assert(mobileDock.includes('env(safe-area-inset-bottom)'), 'Mobile dock must consume bottom safe-area.');
assert(!/body\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top\)/s.test(runtimeCss), 'Body must not double-apply installed top safe-area padding.');

const publicAsset = angular.projects?.app?.architect?.build?.options?.assets?.some((entry) => entry?.input === 'public');
assert(publicAsset, 'Angular build must copy public PWA assets.');
assert(angular.projects?.app?.architect?.build?.configurations?.production?.outputHashing === 'all', 'Production JS/CSS assets must remain content-hashed before cache-first runtime caching is allowed.');

const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const serviceWorkerHeaders = headers.find((entry) => entry?.source === '/service-worker.js')?.headers || [];
const manifestHeaders = headers.find((entry) => entry?.source === '/manifest.json')?.headers || [];
const offlineHeaders = headers.find((entry) => entry?.source === '/offline.html')?.headers || [];
const hasHeader = (list, key, valuePart) => list.some((item) => String(item?.key).toLowerCase() === key.toLowerCase() && String(item?.value).toLowerCase().includes(valuePart.toLowerCase()));
assert(hasHeader(serviceWorkerHeaders, 'Service-Worker-Allowed', '/'), 'Vercel must allow root service-worker scope.');
assert(hasHeader(serviceWorkerHeaders, 'Cache-Control', 'no-cache'), 'Service worker must not be cached stale.');
assert(hasHeader(manifestHeaders, 'Content-Type', 'application/manifest+json'), 'Manifest must be served with manifest MIME type.');
assert(hasHeader(offlineHeaders, 'Cache-Control', 'no-cache'), 'Offline shell origin response must remain revalidatable between releases.');
assert(hasHeader(offlineHeaders, 'X-Robots-Tag', 'noindex'), 'Offline shell must never enter search indexes.');

assert(mobileDock.includes('.customer-command-dock{display:none}'), 'Mobile dock must default to hidden.');
assert(mobileDock.includes('@media (max-width:767px) and (pointer:coarse)'), 'Mobile dock must remain limited to real touch phones, not desktop/tablet widths.');
assert(mobileDock.includes('(display-mode:fullscreen)'), 'Mobile dock must respect fullscreen installed mode safe-area spacing.');

console.log('PWA installability guard passed: standalone installation, versioned static caches, network-authoritative business data, release cleanup, navigation preload, self-contained offline fallback and component-owned safe areas are enforced.');
