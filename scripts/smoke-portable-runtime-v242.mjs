import { spawn } from 'node:child_process';

const port = Number(process.env.V242_PORTABLE_SMOKE_PORT || 4187);
const origin = `http://127.0.0.1:${port}`;
// A closed local port fails immediately and proves that the application adapter
// returns its own controlled JSON errors instead of a host/platform crash page.
const fakeSupabase = 'http://127.0.0.1:9';
const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    APP_PUBLIC_ORIGIN: origin,
    PUBLIC_APP_URL: origin,
    PUBLIC_SITE_URL: origin,
    APP_ALLOWED_ORIGINS: origin,
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

async function expectJson(path, status, code, init = {}) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(5_000), ...init });
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  assert(type.includes('application/json'), `${path} must return application JSON instead of a platform/HTML crash page, got ${type || 'no content-type'} (${response.status})\nPortable runtime output:\n${output}`);
  const payload = await response.json().catch(() => null);
  assert(response.status === status, `${path} expected HTTP ${status}, got ${response.status}: ${JSON.stringify(payload)}\nPortable runtime output:\n${output}`);
  if (code) assert(payload?.code === code, `${path} expected application code ${code}, got ${JSON.stringify(payload)}\nPortable runtime output:\n${output}`);
  return payload;
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

  // Protected routes must fail at the application boundary without touching an unavailable backend.
  await expectJson('/api/contact-admin', 401, 'UNAUTHORIZED');
  await expectJson('/api/partner?op=admin-core&view=operations', 401, 'UNAUTHORIZED');
  await expectJson('/api/wallet-cards', 401, 'UNAUTHORIZED');
  await expectJson('/api/finance/report', 401, 'UNAUTHORIZED');

  // Method and routing ownership must be application-generated, not a hosting-provider error page.
  await expectJson('/api/contact', 405, 'METHOD_NOT_ALLOWED');
  await expectJson('/api/partner?op=definitely-unknown', 404, 'UNKNOWN_PARTNER_OPERATION');

  // Upstream transport failures must degrade to controlled product responses.
  await expectJson('/api/bookings', 503, 'BOOKING_GATEWAY_UNAVAILABLE');
  await expectJson('/api/rental-availability', 503, 'AVAILABILITY_SERVICE_UNAVAILABLE', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  await expectJson('/api/tour-availability', 503, 'TOUR_AVAILABILITY_UNAVAILABLE', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });

  const integrationStatus = await fetch(`${origin}/api/integrations/status`, { signal: AbortSignal.timeout(5_000) });
  assert(integrationStatus.status === 200, `/api/integrations/status must remain readable when an optional upstream is unavailable, got ${integrationStatus.status}`);
  assert(String(integrationStatus.headers.get('content-type') || '').includes('application/json'), '/api/integrations/status returned a non-JSON platform error');
  const integrationBody = await integrationStatus.json();
  assert(typeof integrationBody?.database?.configured === 'boolean' && typeof integrationBody?.auth?.configured === 'boolean', '/api/integrations/status response contract drifted');

  const media = await fetch(`${origin}/catalog-media/portable-smoke.jpg`, { redirect: 'manual' });
  assert(media.status === 302, `/catalog-media portable redirect must return 302, got ${media.status}`);
  assert(media.headers.get('location') === `${fakeSupabase}/storage/v1/object/public/catalog-media/portable-smoke.jpg`, 'catalog media redirect must use SUPABASE_PROJECT_URL instead of Vercel-only routing');
  assert((media.headers.get('cache-control') || '').includes('max-age=86400'), 'catalog media cache contract missing');

  console.log('V244 portable runtime and critical API smoke: PASS');
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
