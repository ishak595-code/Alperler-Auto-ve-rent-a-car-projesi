import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const exists = (relative) => fs.existsSync(path.join(root, relative));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

for (const required of [
  'package.json',
  'package-lock.json',
  'server.ts',
  'angular.json',
  'tsconfig.json',
  'tsconfig.api.json',
  '.env.example',
  'vercel.json',
  'src',
  'public',
  'api',
  'supabase/migrations',
  'supabase/functions',
  'supabase/functions/deployment-manifest.v186.json',
  'docs/DEPLOYMENT_PORTABILITY_V206.md',
  'docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md',
]) {
  if (!exists(required)) fail(`portable source package is missing: ${required}`);
}

for (const forbidden of ['.vercel/project.json', '.vercel/README.txt']) {
  if (exists(forbidden)) fail(`hosting-account binding must not be committed: ${forbidden}`);
}

const rootEntries = fs.readdirSync(root);
for (const entry of rootEntries) {
  if (entry === '.env.example') continue;
  if (entry === '.env' || entry.startsWith('.env.')) fail(`local secret environment file must not be committed: ${entry}`);
}

const gitignore = read('.gitignore');
for (const token of ['.env\n', '.env.*', '!.env.example', '.vercel/']) {
  if (!gitignore.includes(token)) fail(`.gitignore must protect portable source from local state: ${token.trim()}`);
}

const pkg = JSON.parse(read('package.json'));
if (!String(pkg.engines?.node || '').includes('22')) fail('portable Node runtime must declare Node 22 support');
if (!String(pkg.scripts?.build || '').includes('ng build')) fail('portable source must expose the Angular production build');
if (!String(pkg.scripts?.start || '').includes('server.ts')) fail('portable source must expose the generic Node/Express runtime through npm start');

const server = read('server.ts');
for (const token of [
  'process.env.PORT',
  'app.get("/health"',
  'express.static(distPath',
  '["/api/bookings",bookingsApi]',
  '["/api/catalog",catalogApi]',
  '["/api/contact",contactApi]',
  '["/api/payments",paymentsApi]',
  '["/api/partner",partnerApi]',
  'app.get(/.*/',
  '0.0.0.0',
]) {
  if (!server.includes(token)) fail(`generic Node host adapter is missing contract: ${token}`);
}
if (/\.vercel\.app\b/i.test(server)) fail('generic Node runtime must not pin a Vercel hostname');

const portability = read('docs/DEPLOYMENT_PORTABILITY_V206.md');
for (const token of ['npm ci', 'npm run build', 'npm start', 'server.ts', 'same-origin `/api/*`', 'Secrets must not be embedded into a ZIP']) {
  if (!portability.includes(token)) fail(`portability runbook is missing ZIP/host handoff instruction: ${token}`);
}

const manifest = JSON.parse(read('supabase/functions/deployment-manifest.v186.json'));
if (!Array.isArray(manifest.functions) || manifest.functions.length === 0) fail('Edge Function deployment manifest must be present and non-empty');
for (const item of manifest.functions || []) {
  if (!item?.slug) continue;
  if (!exists(`supabase/functions/${item.slug}/index.ts`)) fail(`Edge Function source missing from portable repository: ${item.slug}`);
}

const migrationCount = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).length;
if (migrationCount < 1) fail('portable repository must contain Supabase migration history');

if (failures.length) {
  console.error('V234 portable source package: FAIL');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(`V234 portable source package: PASS (${migrationCount} migrations, ${manifest.functions.length} Edge Function entries, generic Node runtime present).`);
