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
const installService = read('src/services/pwa-install.service.ts');
const installPrompt = read('src/components/pwa-install-prompt.component.ts');
const appComponent = read('src/app.component.ts');
const runtimeCss = read('src/runtime-stability.css');

assert(manifest.name && manifest.short_name, 'PWA manifest must define name and short_name.');
assert(manifest.start_url === '/', 'PWA start_url must remain root.');
assert(manifest.scope === '/', 'PWA scope must remain root.');
assert(manifest.display === 'standalone', 'PWA fallback display must remain standalone.');
assert(Array.isArray(manifest.display_override) && manifest.display_override[0] === 'fullscreen' && manifest.display_override.includes('standalone'), 'Android install must prefer fullscreen and retain standalone fallback.');
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
assert(/navigator\.serviceWorker\s*\n?\s*\.register\(["']\/service-worker\.js["']/.test(bootstrap), 'Application bootstrap must register /service-worker.js.');
assert(serviceWorker.includes("self.addEventListener('fetch'"), 'Service worker must own a fetch handler for installability.');
assert(serviceWorker.includes('event.respondWith(fetch(request))'), 'Service worker must remain network-authoritative.');
assert(!/caches\.(open|match)|cache\.put/.test(serviceWorker), 'PWA worker must not cache live application/catalog data.');

const earlyCaptureAt = bootstrap.indexOf("window.addEventListener('beforeinstallprompt'");
const angularBootstrapAt = bootstrap.indexOf('bootstrapApplication(AppComponent');
assert(earlyCaptureAt >= 0 && angularBootstrapAt >= 0 && earlyCaptureAt < angularBootstrapAt, 'beforeinstallprompt must be captured before Angular bootstrap so the one browser install event cannot be missed.');
assert(bootstrap.includes('window.__alperlerInstallPrompt = installEvent'), 'Bootstrap must buffer the browser install event for Angular.');
assert(bootstrap.includes("window.dispatchEvent(new Event('alperler:pwa-install-ready'))"), 'Bootstrap must publish install readiness to the live UI.');

assert(installService.includes('this.adoptBufferedPrompt()'), 'PWA service must adopt an install event captured before Angular starts.');
assert(installService.includes("window.addEventListener('alperler:pwa-install-ready'"), 'PWA service must react to live install readiness.');
assert(installService.includes("window.addEventListener('appinstalled'"), 'App must detect successful installation.');
assert(installService.includes("'(display-mode: standalone)'"), 'App must detect standalone mode.');
assert(installService.includes("'(display-mode: fullscreen)'"), 'App must detect Android fullscreen mode.');
assert(installService.includes('readonly runningAsApp'), 'PWA service must distinguish installed state from the current Chrome tab.');
assert(installPrompt.includes('Uygulamayı yükle'), 'Mobile install prompt must expose a clear install action.');
assert(installPrompt.includes('Bu Chrome sekmesi tarayıcı olarak kalır.'), 'After installation, the user must be told to launch the home-screen app instead of expecting the current Chrome tab to transform.');
assert(installPrompt.includes('install.installed() && !install.runningAsApp()'), 'Install UI must distinguish completed install from true app-mode execution.');
assert(installPrompt.includes('@media(max-width:1100px)') || installPrompt.includes('@media(max-width: 1100px)'), 'Install promotion must support touch phones and tablets without becoming desktop chrome.');
assert(installPrompt.includes('(pointer:coarse)'), 'Install promotion must be touch-device constrained.');
assert(appComponent.includes('<app-pwa-install-prompt>'), 'Customer shell must render the PWA install promotion component.');
assert(runtimeCss.includes('@media (display-mode: fullscreen)'), 'Fullscreen PWA must protect Android safe areas.');

const publicAsset = angular.projects?.app?.architect?.build?.options?.assets?.some((entry) => entry?.input === 'public');
assert(publicAsset, 'Angular build must copy public PWA assets.');

const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const serviceWorkerHeaders = headers.find((entry) => entry?.source === '/service-worker.js')?.headers || [];
const manifestHeaders = headers.find((entry) => entry?.source === '/manifest.json')?.headers || [];
const hasHeader = (list, key, valuePart) => list.some((item) => String(item?.key).toLowerCase() === key.toLowerCase() && String(item?.value).toLowerCase().includes(valuePart.toLowerCase()));
assert(hasHeader(serviceWorkerHeaders, 'Service-Worker-Allowed', '/'), 'Vercel must allow root service-worker scope.');
assert(hasHeader(serviceWorkerHeaders, 'Cache-Control', 'no-cache'), 'Service worker must not be cached stale.');
assert(hasHeader(manifestHeaders, 'Content-Type', 'application/manifest+json'), 'Manifest must be served with manifest MIME type.');

assert(mobileDock.includes('.customer-command-dock{display:none}'), 'Mobile dock must default to hidden.');
assert(mobileDock.includes('@media (max-width:767px) and (pointer:coarse)'), 'Mobile dock must remain limited to real touch phones, not desktop/tablet widths.');
assert(mobileDock.includes('(display-mode:fullscreen)'), 'Mobile dock must respect fullscreen installed mode safe-area spacing.');

console.log('PWA installability guard passed: early install capture, Android fullscreen preference, clear post-install handoff, live data safety and mobile-only dock are valid.');
