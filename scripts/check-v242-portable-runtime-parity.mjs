import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const requireText = (source, token, message) => { if (!source.includes(token)) failures.push(message); };
const forbidText = (source, token, message) => { if (source.includes(token)) failures.push(message); };

const server = read('server.ts');
const vercel = JSON.parse(read('vercel.json'));
const env = read('.env.example');
const layout = read('src/components/main-layout.component.ts');
const feedback = read('src/components/feedback.component.ts');

for (const [token, message] of [
  ['import "dotenv/config"', 'portable Node runtime must load local/host environment values'],
  ['SUPABASE_PROJECT_URL', 'portable catalog-media routing must be environment-driven'],
  ['app.get(/^\\/catalog-media\\/.+/', 'portable Node runtime must own catalog-media outside Vercel'],
  ['storage/v1/object/public/catalog-media/', 'portable catalog-media target must remain the canonical public Storage bucket'],
  ['segment===".."', 'portable media route must reject traversal segments'],
  ['X-Permitted-Cross-Domain-Policies', 'portable runtime is missing X-Permitted-Cross-Domain-Policies'],
  ['X-DNS-Prefetch-Control', 'portable runtime is missing DNS prefetch hardening'],
  ['Cross-Origin-Opener-Policy', 'portable runtime is missing COOP'],
  ['Origin-Agent-Cluster', 'portable runtime is missing origin-agent isolation'],
  ['payment=(self)', 'portable runtime Permissions-Policy drifted from production'],
  ['X-Robots-Tag', 'portable runtime must protect private/admin surfaces from indexing'],
  ['req.path.startsWith("/api/")', 'portable runtime must keep API responses no-store/noindex'],
  ['aiCrawlerPattern', 'portable runtime must preserve AI crawler routing parity'],
  ['runtime-env.js', 'portable runtime must preserve runtime environment cache semantics'],
  ['manifest.json', 'portable runtime must preserve PWA manifest cache/content-type semantics'],
  ['offline.html', 'portable runtime must preserve offline page cache/robots semantics'],
  ['service-worker.js', 'portable runtime must preserve service-worker cache semantics'],
]) requireText(server, token, message);

forbidText(server, 'https://cdn.tailwindcss.com', 'portable runtime CSP must not depend on Tailwind CDN');

const globalHeaders = vercel.headers?.find((entry) => entry.source === '/(.*)')?.headers || [];
for (const header of globalHeaders) {
  if (!header?.key || header.key === 'Content-Security-Policy') continue;
  requireText(server, String(header.key), `portable runtime is missing Vercel security header parity: ${header.key}`);
}
const vercelCsp = String(globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value || '');
requireText(server, `const CSP=${JSON.stringify(vercelCsp)}`, 'portable runtime CSP must exactly match the production Vercel CSP');

for (const token of ['SUPABASE_PROJECT_URL=', 'SUPABASE_PUBLISHABLE_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=', 'PUBLIC_APP_URL=']) {
  requireText(env, token, `.env.example is missing portable environment contract ${token}`);
}

requireText(layout, '<app-feedback></app-feedback>', 'feedback must stay synchronously mounted to avoid first-open lazy-load races');
requireText(feedback, 'role="dialog"', 'feedback must remain a real dialog');
requireText(feedback, 'aria-modal="true"', 'feedback dialog must remain modal');
requireText(feedback, 'height:100dvh', 'feedback must remain full dynamic viewport height');
requireText(feedback, 'body.style.overflow = "hidden"', 'feedback must keep background scroll locked while open');
requireText(feedback, '@HostListener("document:keydown.escape")', 'feedback must close from Escape');
requireText(feedback, 'fetch("/api/contact"', 'feedback submissions must remain on the canonical same-origin contact API');
forbidText(feedback, 'backdrop-filter:blur', 'feedback must not reintroduce mobile backdrop blur instability');

if (failures.length) {
  console.error('V242 portable runtime parity: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V242 portable runtime parity: PASS');
