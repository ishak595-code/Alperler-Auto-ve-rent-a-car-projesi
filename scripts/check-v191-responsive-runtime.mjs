import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(`V191_RUNTIME_FAIL: ${message}`); };

const navbar = read('src/components/navbar.component.ts');
const layout = read('src/components/main-layout.component.ts');
const app = read('src/app.component.ts');
const tailwind = read('src/tailwind.css');
const runtimeCss = read('src/runtime-stability.css');
const manifest = JSON.parse(read('public/manifest.json'));
const worker = read('public/service-worker.js');

assert(navbar.includes("navigation.mobileMenuEnabled() && isMenuOpen()"), 'mobile navigation must only exist in the DOM while open');
assert(!navbar.includes('[class.hidden]="!isMenuOpen()"'), 'mobile navigation must not depend on Tailwind hidden to stop intercepting taps');
assert(navbar.includes('.site-navbar{position:fixed'), 'critical navbar geometry must live in component CSS');
assert(navbar.includes('.mobile-navigation{position:fixed'), 'critical mobile menu geometry must live in component CSS');
assert(navbar.includes('document.documentElement.dataset["mobileMenuOpen"]="true"'), 'open mobile menu must publish a document scroll-lock state');
assert(navbar.includes('@media(min-width:768px)'), 'navbar must define an explicit tablet breakpoint');
assert(navbar.includes('@media(min-width:1280px)'), 'navbar must define an explicit desktop breakpoint');

assert(layout.includes('class="skip-link"'), 'skip link must use a resilient component class');
assert(layout.includes('.skip-link{position:fixed'), 'skip link hidden state must not depend on Tailwind utilities');
assert(layout.includes('transform:translateY(calc(-100% - 28px))'), 'skip link must remain visually hidden until focus');
assert(layout.includes('.customer-main{min-width:0;flex:1;padding-top:72px}'), 'mobile customer shell must own its header offset');
assert(layout.includes('@media(min-width:768px){.customer-main{padding-top:84px}}'), 'tablet customer shell offset is missing');
assert(layout.includes('@media(min-width:1280px){.customer-main{padding-top:96px}}'), 'desktop customer shell offset is missing');

assert(!app.includes('AnalyticsConsentComponent'), 'first-load analytics consent UI must not be globally mounted');
assert(!app.includes('<app-analytics-consent>'), 'first-load analytics consent element must be absent');
assert(app.includes("'requestIdleCallback' in window"), 'noncritical startup should yield to first paint when supported');
for (const service of ['SystemHealthService', 'NewsletterSyncService', 'VisitorAnalyticsService', 'CustomerProfileAutofillService']) {
  assert(app.includes(`this.injector.get(${service})`), `${service} must start from the deferred background phase`);
}

assert(tailwind.includes('@import "tailwindcss" source(none);'), 'Tailwind explicit source mode must remain enabled');
assert(tailwind.includes('@source "./";'), 'Tailwind must scan runtime src files');
assert(tailwind.includes('@source "../index.html";'), 'Tailwind must scan the document shell');
assert(tailwind.includes('@source "../index.tsx";'), 'Tailwind must scan the bootstrap source');
assert(!tailwind.includes('@source "../";'), 'Tailwind must not scan the entire repository root');

assert(runtimeCss.includes('html[data-mobile-menu-open="true"]'), 'document-level menu scroll lock is missing');
assert(runtimeCss.includes('--site-safe-top: env(safe-area-inset-top, 0px)'), 'safe-area runtime token is missing');
assert(manifest.display === 'standalone', 'installed PWA must use standalone display');
assert(Array.isArray(manifest.display_override) && manifest.display_override[0] === 'standalone', 'standalone must be the preferred installed display mode');
assert(worker.includes("const RELEASE = 'v191-responsive-runtime';"), 'PWA cache release must rotate with V191');

const distIndex = 'dist/index.html';
assert(fs.existsSync(distIndex), 'production build must exist before V191 guard runs');
const builtHtml = read(distIndex);
const styleMatches = [...builtHtml.matchAll(/href=["']([^"']*styles[^"']*\.css)["']/g)].map((match) => match[1]);
assert(styleMatches.length > 0, 'built index must reference a production stylesheet');
const builtStyles = styleMatches.map((href) => href.replace(/^\//, '')).map((href) => path.join('dist', href));
for (const file of builtStyles) assert(fs.existsSync(file), `built stylesheet is missing: ${file}`);
const css = builtStyles.map(read).join('\n');
assert(css.length > 10_000, 'built stylesheet is unexpectedly small');
assert(css.includes('.hidden{display:none}') || css.includes('.hidden {display:none}') || css.includes('.hidden{display:none!important}'), 'compiled Tailwind hidden utility is missing');
assert(css.includes('.bg-slate-50') || css.includes('.bg-slate-50{'), 'compiled Tailwind background utility is missing');
assert(!css.includes('@source '), 'Tailwind @source directive leaked into production CSS');
assert(!css.includes('source(none)'), 'unprocessed Tailwind source configuration leaked into production CSS');

const cssBytes = Buffer.byteLength(css);
console.log(`V191 responsive runtime guard passed. Compiled global CSS: ${cssBytes} bytes.`);
