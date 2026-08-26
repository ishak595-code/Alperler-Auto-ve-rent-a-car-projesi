import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => { console.error(`V186_PORTABILITY_FAIL: ${message}`); process.exitCode = 1; };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const manifestPath = 'supabase/functions/deployment-manifest.v186.json';
const manifest = JSON.parse(read(manifestPath));
if (manifest.schemaVersion !== 1) fail('unexpected Edge manifest schema');
if (!Array.isArray(manifest.functions) || manifest.functions.length !== 42) fail('Edge manifest must contain the verified 42-function production baseline');

const manifestSlugs = [...new Set(manifest.functions.map((item) => item.slug))].sort();
if (manifestSlugs.length !== manifest.functions.length) fail('duplicate Edge slug in manifest');
for (const item of manifest.functions) {
  if (!item.slug || typeof item.verifyJwt !== 'boolean') fail(`invalid Edge manifest entry: ${JSON.stringify(item)}`);
}

const functionRoot = path.join(root, 'supabase/functions');
const repoSlugs = fs.readdirSync(functionRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const missingSources = manifestSlugs.filter((slug) => !repoSlugs.includes(slug));
const unmanifestedSources = repoSlugs.filter((slug) => !manifestSlugs.includes(slug));
if (missingSources.length) fail(`manifest functions missing source directories: ${missingSources.join(', ')}`);
if (unmanifestedSources.length) fail(`source directories missing manifest entries: ${unmanifestedSources.join(', ')}`);

const retired = manifest.functions.filter((item) => item.retired === true);
if (retired.length !== 4) fail('expected exactly four retired legacy Edge slugs in V186 baseline');
for (const item of retired) {
  if (item.verifyJwt !== true) fail(`retired Edge must require JWT at platform boundary: ${item.slug}`);
  const source = read(`supabase/functions/${item.slug}/index.ts`);
  if (!source.includes('status: 410')) fail(`retired Edge must return HTTP 410: ${item.slug}`);
  for (const forbidden of ['x-bootstrap-token', 'auth.admin.createUser', 'auth.admin.updateUserById', 'temporaryPassword']) {
    if (source.includes(forbidden)) fail(`retired Edge contains bootstrap capability '${forbidden}': ${item.slug}`);
  }
}

for (const migration of [
  'supabase/migrations/20260826073500_v184_catalog_admin_security_gateway.sql',
  'supabase/migrations/20260826080400_v1841_catalog_legacy_admin_write_cutover.sql',
  'supabase/migrations/20260826090000_v185_media_control_plane_security.sql',
  'supabase/migrations/20260826090100_v185_catalog_media_cover_state_invariant.sql',
  'supabase/migrations/20260826090200_v1851_catalog_media_legacy_admin_write_cutover.sql',
]) {
  if (!fs.existsSync(path.join(root, migration))) fail(`required migration source missing: ${migration}`);
}

const envExample = read('.env.example');
for (const required of ['PUBLIC_APP_URL=', 'PUBLIC_SITE_URL=', 'SUPABASE_PROJECT_URL=', 'SUPABASE_PUBLISHABLE_KEY=', 'SUPABASE_SERVICE_ROLE_KEY=']) {
  if (!envExample.includes(required)) fail(`.env.example missing ${required}`);
}
if (!envExample.includes('https://alperlerrentaacar.com')) fail('.env.example does not document the current production origin');
if (envExample.includes('alperrentacar.online')) fail('dead domain present in .env.example');

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

const trackedTextRoots = ['src', 'api', 'scripts', 'supabase/functions', '.github'].flatMap((relative) => walkFiles(path.join(root, relative)));
for (const absolute of trackedTextRoots) {
  const text = fs.readFileSync(absolute, 'utf8');
  const relative = path.relative(root, absolute);
  if (text.includes('alperrentacar.online')) fail(`dead domain reference: ${relative}`);
  if (relative.startsWith(`src${path.sep}`) && text.includes('SUPABASE_SERVICE_ROLE_KEY')) fail(`browser source references service-role environment name: ${relative}`);
  if (relative.startsWith(`src${path.sep}`) && /sb_secret_[A-Za-z0-9_-]{20,}/.test(text)) fail(`browser source contains credential-shaped Supabase secret: ${relative}`);
}

if (!process.exitCode) {
  console.log(`V186 portability baseline OK: ${manifestSlugs.length} Edge sources are manifested; ${retired.length} legacy functions are safely retired.`);
}
