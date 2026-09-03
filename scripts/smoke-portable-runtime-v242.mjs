import { spawn } from 'node:child_process';

const port = Number(process.env.V242_PORTABLE_SMOKE_PORT || 4187);
const origin = `http://127.0.0.1:${port}`;
const fakeSupabase = 'https://portable-smoke.supabase.co';
const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    SUPABASE_PROJECT_URL: fakeSupabase,
    SUPABASE_PUBLISHABLE_KEY: 'portable-smoke-publishable-key',
    SUPABASE_SERVICE_ROLE_KEY: 'portable-smoke-service-role-key',
  },
});

let output = '';
child.stdout.on('data', (chunk) => { output += String(chunk); });
child.stderr.on('data', (chunk) => { output += String(chunk); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`portable runtime exited early with code ${child.exitCode}\n${output}`);
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return response;
    } catch {}
    await sleep(150);
  }
  throw new Error(`portable runtime health check timed out\n${output}`);
}

async function main() {
  const health = await waitForHealth();
  const healthBody = await health.json();
  assert(healthBody?.ok === true && healthBody?.runtime === 'node' && healthBody?.service === 'alperler-web', 'unexpected /health identity');
  assert(health.headers.get('x-frame-options') === 'DENY', 'portable security header parity missing X-Frame-Options');
  assert(health.headers.get('x-permitted-cross-domain-policies') === 'none', 'portable security header parity missing X-Permitted-Cross-Domain-Policies');
  assert(health.headers.get('cross-origin-opener-policy') === 'same-origin-allow-popups', 'portable security header parity missing COOP');

  const adminPage = await fetch(`${origin}/admin/login`, { redirect: 'manual' });
  assert(adminPage.status === 200, `/admin/login must resolve through SPA shell, got ${adminPage.status}`);
  assert((adminPage.headers.get('x-robots-tag') || '').includes('noindex'), 'admin SPA route must remain noindex');
  assert((adminPage.headers.get('cache-control') || '').includes('no-store'), 'admin SPA route must remain no-store');

  const contactAdmin = await fetch(`${origin}/api/contact-admin`, { redirect: 'manual' });
  assert(contactAdmin.status === 401, `/api/contact-admin must preserve protected alias behavior, got ${contactAdmin.status}`);

  const media = await fetch(`${origin}/catalog-media/portable-smoke.jpg`, { redirect: 'manual' });
  assert(media.status === 302, `/catalog-media portable redirect must return 302, got ${media.status}`);
  assert(media.headers.get('location') === `${fakeSupabase}/storage/v1/object/public/catalog-media/portable-smoke.jpg`, 'catalog media redirect must use SUPABASE_PROJECT_URL instead of Vercel-only routing');
  assert((media.headers.get('cache-control') || '').includes('max-age=86400'), 'catalog media cache contract missing');

  console.log('V242 portable runtime smoke: PASS');
}

try {
  await main();
} finally {
  if (child.exitCode === null) child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(2_000).then(() => { if (child.exitCode === null) child.kill('SIGKILL'); }),
  ]);
}
