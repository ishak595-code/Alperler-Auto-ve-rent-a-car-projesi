import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = process.cwd();
const uiRoots = ['src/pages', 'src/components'];
const failures = [];
const migrationName = '20260829203000_v2082_architecture_constitution_privilege_hardening.sql';
const migrationPath = join(root, 'supabase', 'migrations', migrationName);
const constitutionPath = join(root, 'docs', 'ARCHITECTURE_CONSTITUTION_V2082.md');
const adminCorePath = join(root, 'supabase', 'functions', 'admin-core-gateway-v178', 'index.ts');

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (stat.isFile()) files.push(full);
  }
  return files;
}

function stripSqlComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

const uiFiles = uiRoots.flatMap((dir) => walk(join(root, dir))).filter((file) => /\.(?:ts|tsx)$/.test(file));
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

const browserFiles = walk(join(root, 'src')).filter((file) => /\.(?:ts|tsx)$/.test(file));
const secretPattern = /\b(?:SUPABASE_SERVICE_ROLE_KEY|service_role|PAYTR_MERCHANT_KEY|PAYTR_MERCHANT_SALT|WEBHOOK_SECRET|STRIPE_SECRET_KEY)\b/;
for (const file of browserFiles) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file).replaceAll('\\', '/');
  if (secretPattern.test(source)) failures.push(`BROWSER_SECRET_IDENTIFIER ${label}`);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const handoff = String(packageJson.scripts?.['verify:handoff'] || '');
const constitutionScript = String(packageJson.scripts?.['architecture-constitution:v2082'] || '');
if (!handoff.includes('runtime-ownership:v2081')) failures.push('HANDOFF_MISSING_RUNTIME_OWNERSHIP_GUARD package.json');
if (!handoff.includes('architecture-constitution:v2082')) failures.push('HANDOFF_MISSING_ARCHITECTURE_CONSTITUTION_GUARD package.json');
if (!constitutionScript.includes('check-v2082-architecture-constitution.mjs')) failures.push('PACKAGE_MISSING_ARCHITECTURE_CONSTITUTION_SCRIPT package.json');

if (!existsSync(constitutionPath)) failures.push('ARCHITECTURE_CONSTITUTION_DOCUMENT_MISSING docs/ARCHITECTURE_CONSTITUTION_V2082.md');

const targetTables = [
  'admin_user_branches', 'audit_logs', 'contact_messages', 'customer_documents',
  'customer_loyalty_ledger', 'customer_payment_methods', 'customer_referral_codes',
  'customer_referral_rewards', 'customer_referrals', 'customer_vault_consents',
  'customer_vault_terms', 'geo_districts', 'geo_provinces', 'media_assets',
  'newsletter_consent_events', 'notification_deliveries', 'partner_requests',
  'payment_transactions', 'staff_branch_assignments', 'staff_profiles',
  'tour_staff_assignments', 'vehicle_inspections', 'vehicle_staff_assignments',
];

if (!existsSync(migrationPath)) {
  failures.push(`V2082_MIGRATION_MISSING supabase/migrations/${migrationName}`);
} else {
  const rawMigration = readFileSync(migrationPath, 'utf8');
  const migration = stripSqlComments(rawMigration).toLowerCase();
  for (const marker of ['revoke insert, update, delete, truncate, references, trigger on table', 'from anon']) {
    if (!migration.includes(marker)) failures.push(`V2082_MIGRATION_MISSING_MARKER ${marker}`);
  }
  for (const table of targetTables) {
    if (!migration.includes(`public.${table}`)) failures.push(`V2082_MIGRATION_MISSING_TARGET public.${table}`);
  }
  if (/\bsecurity\s+definer\b/i.test(migration)) failures.push('V2082_EXPOSED_SECURITY_DEFINER_FORBIDDEN migration');
  if (/\bcreate\s+(?:or\s+replace\s+)?function\s+public\./i.test(migration)) failures.push('V2082_PUBLIC_FUNCTION_FORBIDDEN migration');
}

const migrationsDir = join(root, 'supabase', 'migrations');
const futureMigrations = walk(migrationsDir)
  .filter((file) => file.endsWith('.sql') && basename(file).localeCompare(migrationName) > 0)
  .sort();
const anonWritePrivilege = /\bgrant\b[\s\S]*\b(?:insert|update|delete|truncate|references|trigger)\b[\s\S]*\bto\s+(?:role\s+)?anon\b/i;
for (const file of futureMigrations) {
  const source = stripSqlComments(readFileSync(file, 'utf8'));
  const statements = source.split(';').map((part) => part.trim()).filter(Boolean);
  for (const statement of statements) {
    if (anonWritePrivilege.test(statement)) {
      failures.push(`FUTURE_ANON_WRITE_PRIVILEGE ${relative(root, file).replaceAll('\\', '/')}`);
      break;
    }
  }
}

const adminAuditService = join(root, 'src', 'services', 'admin-audit.service.ts');
if (!existsSync(adminAuditService)) failures.push('ADMIN_AUDIT_SERVICE_MISSING src/services/admin-audit.service.ts');
else {
  const source = readFileSync(adminAuditService, 'utf8');
  if (!source.includes('/api/partner?op=admin-core&view=audit')) failures.push('ADMIN_AUDIT_NOT_USING_BFF src/services/admin-audit.service.ts');
  if (/supabase\.config|\/rest\/v1\//.test(source)) failures.push('ADMIN_AUDIT_SERVICE_DIRECT_DB src/services/admin-audit.service.ts');
}

if (!existsSync(adminCorePath)) failures.push('ADMIN_CORE_GATEWAY_MISSING supabase/functions/admin-core-gateway-v178/index.ts');
else {
  const source = readFileSync(adminCorePath, 'utf8');
  const required = [
    'view === "audit"',
    'requireAuditAccess(actor)',
    'select=role,permissions',
    'audit_logs?select=',
    'id,actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,created_at',
  ];
  for (const marker of required) {
    if (!source.includes(marker)) failures.push(`ADMIN_AUDIT_GATEWAY_MISSING_MARKER ${marker}`);
  }
  if (source.includes('service_admin_audit_snapshot_v2082')) failures.push('ADMIN_AUDIT_EXPOSED_RPC_FORBIDDEN admin-core-gateway-v178');
}

const privilegeTestPath = join(root, 'supabase', 'tests', 'v2082_privilege_contract.sql');
if (!existsSync(privilegeTestPath)) failures.push('V2082_PRIVILEGE_TEST_MISSING supabase/tests/v2082_privilege_contract.sql');

if (failures.length) {
  const unique = [...new Set(failures)].sort();
  console.error(`V208.2 architecture constitution: FAIL (${unique.length} violation(s))`);
  for (const failure of unique) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V208.2 architecture constitution: PASS (${uiFiles.length} UI files audited, ${futureMigrations.length} future migration(s) checked).`);
