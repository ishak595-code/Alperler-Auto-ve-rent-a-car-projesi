import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const uiRoots = ['src/pages', 'src/components'];
const failures = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (stat.isFile() && /\.(?:ts|tsx)$/.test(full)) files.push(full);
  }
  return files;
}

const uiFiles = uiRoots.flatMap((dir) => walk(join(root, dir)));
const forbidden = [
  { code: 'UI_SUPABASE_CONFIG_IMPORT', pattern: /(?:from\s+|import\s*\()['"][^'"]*supabase\.config['"]/ },
  { code: 'UI_SUPABASE_PROJECT_URL', pattern: /\bSUPABASE_PROJECT_URL\b/ },
  { code: 'UI_SUPABASE_PUBLISHABLE_KEY', pattern: /\bSUPABASE_PUBLISHABLE_KEY\b/ },
  { code: 'UI_SUPABASE_FUNCTION_URL', pattern: /\bsupabaseFunctionUrl\b/ },
  { code: 'UI_SUPABASE_AUTH_URL', pattern: /\bsupabaseAuthUrl\b/ },
  { code: 'UI_DIRECT_POSTGREST', pattern: /\/rest\/v1\// },
  { code: 'UI_DIRECT_EDGE_FUNCTION', pattern: /\/functions\/v1\// },
  { code: 'UI_DIRECT_AUTH_ENDPOINT', pattern: /\/auth\/v1\// },
];

for (const file of uiFiles) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file).replaceAll('\\', '/');
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) failures.push(`${rule.code} ${label}`);
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const handoff = String(packageJson.scripts?.['verify:handoff'] || '');
if (!handoff.includes('runtime-ownership:v2081')) {
  failures.push('HANDOFF_MISSING_RUNTIME_OWNERSHIP_GUARD package.json');
}
if (/select=\*/.test(readFileSync(join(root, 'scripts/check-v207-database-source-contract.mjs'), 'utf8'))) {
  // The V207 guard is intentionally expected to contain the pattern it rejects.
}

const browserFiles = walk(join(root, 'src'));
const secretPattern = /\b(?:SUPABASE_SERVICE_ROLE_KEY|service_role|PAYTR_MERCHANT_KEY|PAYTR_MERCHANT_SALT|WEBHOOK_SECRET|STRIPE_SECRET_KEY)\b/;
for (const file of browserFiles) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file).replaceAll('\\', '/');
  if (secretPattern.test(source)) failures.push(`BROWSER_SECRET_IDENTIFIER ${label}`);
}

if (failures.length) {
  console.error(`V208.2 architecture constitution: FAIL (${failures.length} violation(s))`);
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V208.2 architecture constitution: PASS (${uiFiles.length} UI files audited).`);
