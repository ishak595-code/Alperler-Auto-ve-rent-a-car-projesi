import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`V186_PORTABILITY_FAIL: ${message}`); process.exitCode = 1; };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const DEAD_DOMAIN = ['alper', 'rentacar', '.online'].join('');
const UNOWNED_DOMAIN = ['alperler', 'rentaacar', '.com'].join('');
const HARDCODED_VERCEL_HOST = /(?:https?:\/\/)?[a-z0-9-]{3,}\.vercel\.app\b/i;

const manifest = JSON.parse(read('supabase/functions/deployment-manifest.v186.json'));
if (manifest.schemaVersion !== 1) fail('unexpected Edge manifest schema');
if (!Array.isArray(manifest.functions) || manifest.functions.length !== 44) fail('Edge manifest must contain the intended 44-function V186 production baseline');
const manifestSlugs = [...new Set(manifest.functions.map((item) => item.slug))].sort();
if (manifestSlugs.length !== manifest.functions.length) fail('duplicate Edge slug in manifest');
for (const item of manifest.functions) if (!item.slug || typeof item.verifyJwt !== 'boolean') fail(`invalid Edge manifest entry: ${JSON.stringify(item)}`);

const functionRoot = path.join(root, 'supabase/functions');
const repoSlugs = fs.readdirSync(functionRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const missingSources = manifestSlugs.filter((slug) => !repoSlugs.includes(slug));
const unmanifestedSources = repoSlugs.filter((slug) => !manifestSlugs.includes(slug));
if (missingSources.length) fail(`manifest functions missing source directories: ${missingSources.join(', ')}`);
if (unmanifestedSources.length) fail(`source directories missing manifest entries: ${unmanifestedSources.join(', ')}`);

const retired = manifest.functions.filter((item) => item.retired === true);
if (retired.length !== 4) fail('expected exactly four retired legacy Edge slugs');
for (const item of retired) {
  if (item.verifyJwt !== true) fail(`retired Edge must require JWT: ${item.slug}`);
  const source = read(`supabase/functions/${item.slug}/index.ts`);
  if (!source.includes('status: 410')) fail(`retired Edge must return HTTP 410: ${item.slug}`);
  for (const forbidden of ['x-bootstrap-token','auth.admin.createUser','auth.admin.updateUserById','temporaryPassword']) if (source.includes(forbidden)) fail(`retired Edge contains bootstrap capability '${forbidden}': ${item.slug}`);
}

for (const slug of ['analytics-admin-v186','newsletter-admin-read-v186']) {
  const entry = manifest.functions.find((item) => item.slug === slug);
  if (!entry || entry.verifyJwt !== true) fail(`${slug} must be JWT protected`);
  const source = read(`supabase/functions/${slug}/index.ts`);
  if (!source.includes('consume_rate_limit')) fail(`${slug} missing server-side rate limit`);
  if (!source.includes('x-app-origin')) fail(`${slug} missing same-origin BFF origin contract`);
}

const migrationNames = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql'));
for (const fragment of ['v184_catalog_admin_security_gateway','v1841_catalog_legacy_admin_write_cutover','v185_media_control_plane_security','v185_catalog_media_cover_state_invariant','v1851_catalog_media_legacy_admin_write_cutover','v186_analytics_newsletter_admin_gateway','v1861_analytics_newsletter_legacy_cutover']) {
  if (!migrationNames.some((name) => name.includes(fragment))) fail(`required migration source missing for: ${fragment}`);
}

const analyticsService = read('src/services/admin-analytics.service.ts');
if (!analyticsService.includes('/api/partner?op=analytics-admin')) fail('analytics admin frontend must use same-origin BFF');
if (analyticsService.includes('/rest/v1/rpc/') || analyticsService.includes('SUPABASE_PROJECT_URL')) fail('analytics admin frontend still contains direct Supabase admin path');
const newsletterService = read('src/services/newsletter.service.ts');
const newsletterSync = read('src/services/newsletter-sync.service.ts');
for (const [name, source] of [['newsletter.service.ts', newsletterService], ['newsletter-sync.service.ts', newsletterSync]]) {
  if (!source.includes('/api/partner?op=newsletter-public')) fail(`${name} must use same-origin public newsletter gateway`);
  if (source.includes('supabaseFunctionUrl(') || source.includes('/rest/v1/subscribers') || source.includes('/rest/v1/newsletter_campaigns')) fail(`${name} still contains direct newsletter Supabase path`);
}
if (!newsletterService.includes('op=newsletter-admin-read') || !newsletterService.includes('op=newsletter-admin')) fail('newsletter admin frontend must use same-origin admin gateways');

const envExample = read('.env.example');
for (const required of ['PUBLIC_APP_URL=','PUBLIC_SITE_URL=','SUPABASE_PROJECT_URL=','SUPABASE_PUBLISHABLE_KEY=','SUPABASE_SERVICE_ROLE_KEY=','PAYMENT_ALLOWED_ORIGINS=']) if (!envExample.includes(required)) fail(`.env.example missing ${required}`);
const envValues = new Map(
  envExample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);
for (const key of ['PUBLIC_APP_URL', 'PUBLIC_SITE_URL', 'PAYMENT_ALLOWED_ORIGINS']) {
  if (envValues.get(key) !== '') fail(`.env.example ${key} must stay blank until a registered production origin is actually connected`);
}
if (envExample.includes(DEAD_DOMAIN)) fail('.env.example contains dead domain');
if (envExample.includes(UNOWNED_DOMAIN)) fail('.env.example contains an unowned production domain');
if (HARDCODED_VERCEL_HOST.test(envExample)) fail('.env.example must not pin a specific Vercel test hostname');

const publicOriginHelper = read('api/_lib/public-origin.ts');
if (!publicOriginHelper.includes('requestPublicOrigin')) fail('request-authoritative public origin helper is missing');
if (!publicOriginHelper.includes('VERCEL_PROJECT_PRODUCTION_URL')) fail('public origin helper must support Vercel production fallback');
if (!publicOriginHelper.includes('VERCEL_URL')) fail('public origin helper must support deployment fallback');
for (const relative of ['api/robots.ts','api/sitemap.ts','api/social-preview.ts']) {
  const source = read(relative);
  if (!source.includes('requestPublicOrigin')) fail(`${relative} must use request-authoritative public origin resolution`);
  if (source.includes('process.env.PUBLIC_APP_URL')) fail(`${relative} must not trust PUBLIC_APP_URL directly`);
}
const integrationConfig = read('api/_lib/integration-config.ts');
if (!integrationConfig.includes('vercelProductionOrigin()')) fail('payment config must include Vercel production origin fallback');
if (!integrationConfig.includes('vercelDeploymentOrigin()')) fail('payment config must include deployment fallback');
if (!integrationConfig.includes('normalized === requestOrigin')) fail('payment request origin must accept the actual same-origin request independently of stale env configuration');

const walkFiles = (dir) => {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(absolute));
    else if (/\.(ts|js|mjs|json|html|css|md|yml|yaml|toml|txt)$/.test(entry.name)) out.push(absolute);
  }
  return out;
};
for (const absolute of ['src','api','scripts','supabase/functions','.github','docs'].flatMap((relative) => walkFiles(path.join(root, relative)))) {
  const text = fs.readFileSync(absolute, 'utf8');
  const relative = path.relative(root, absolute);
  if (text.includes(DEAD_DOMAIN)) fail(`dead domain reference: ${relative}`);
  if (text.includes(UNOWNED_DOMAIN)) fail(`unowned production domain reference: ${relative}`);
  if (HARDCODED_VERCEL_HOST.test(text)) fail(`specific Vercel test hostname is hardcoded: ${relative}`);
  if (relative.startsWith(`src${path.sep}`) && text.includes('SUPABASE_SERVICE_ROLE_KEY')) fail(`browser source references service-role environment name: ${relative}`);
  if (relative.startsWith(`src${path.sep}`) && /sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) fail(`browser source contains credential-shaped Supabase secret: ${relative}`);
}

if (!process.exitCode) console.log(`V186 portability baseline OK: ${manifestSlugs.length} Edge sources manifested; admin analytics/newsletter cut over; ${retired.length} legacy functions retired; public origins remain deployment-portable.`);
