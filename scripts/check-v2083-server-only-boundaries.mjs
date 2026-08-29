import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const baselineMigration = '20260829203000_v2082_architecture_constitution_privilege_hardening.sql';
const docPath = join(root, 'docs', 'SERVER_ONLY_BOUNDARIES_V2083.md');
const sqlTestPath = join(root, 'supabase', 'tests', 'v2083_server_only_boundary.sql');

const tableNames = [
  'partner_request_vehicle_identity',
  'vehicle_registry',
  'commercial_offer_quotes',
  'media_cleanup_jobs_v198',
  'newsletter_campaigns',
  'newsletter_deliveries',
  'subscribers',
  'system_events',
];

const privilegedRpcs = [
  'reserve_booking_commercial_offer',
  'service_newsletter_admin_snapshot_v186',
  'service_attach_partner_request_identity_v172',
  'service_partner_request_admin_snapshot_v172',
  'service_upsert_partner_request_identity_v172',
  'ingest_system_event',
  'service_set_system_event_resolved_v176',
  'service_system_health_snapshot_v176',
  'service_search_vehicle_registry_v177',
  'service_upsert_vehicle_registry_v177',
];

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

function escapes(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (!existsSync(docPath)) failures.push('V2083_DOCUMENT_MISSING docs/SERVER_ONLY_BOUNDARIES_V2083.md');
if (!existsSync(sqlTestPath)) failures.push('V2083_SQL_TEST_MISSING supabase/tests/v2083_server_only_boundary.sql');

const browserFiles = walk(join(root, 'src')).filter((file) => /\.(?:ts|tsx)$/.test(file));
for (const file of browserFiles) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file).replaceAll('\\', '/');

  for (const table of tableNames) {
    const escaped = escapes(table);
    const directTablePatterns = [
      new RegExp(`/rest/v1/${escaped}(?:[?/'\"\\s]|$)`, 'i'),
      new RegExp(`\\.from\\(\\s*['\"]${escaped}['\"]\\s*\\)`, 'i'),
      new RegExp(`\\btable\\s*[:=]\\s*['\"]${escaped}['\"]`, 'i'),
    ];
    if (directTablePatterns.some((pattern) => pattern.test(source))) {
      failures.push(`BROWSER_SERVER_ONLY_TABLE_ACCESS ${table} ${label}`);
    }
  }

  for (const rpc of privilegedRpcs) {
    const escaped = escapes(rpc);
    const directRpcPatterns = [
      new RegExp(`/rest/v1/rpc/${escaped}(?:[?/'\"\\s]|$)`, 'i'),
      new RegExp(`\\.rpc\\(\\s*['\"]${escaped}['\"]`, 'i'),
    ];
    if (directRpcPatterns.some((pattern) => pattern.test(source))) {
      failures.push(`BROWSER_PRIVILEGED_RPC_ACCESS ${rpc} ${label}`);
    }
  }

  const legacyNewsletterTruth = [
    /\bdb_subscribers\b/,
    /\bgetSubscribers\s*\(/,
    /\baddSubscriber\s*\(/,
    /\bremoveSubscriber\s*\(/,
    /newsletter-sync\.service/,
    /\bNewsletterSyncService\b/,
  ];
  if (legacyNewsletterTruth.some((pattern) => pattern.test(source))) {
    failures.push(`LEGACY_NEWSLETTER_BROWSER_TRUTH ${label}`);
  }
}

const migrationsDir = join(root, 'supabase', 'migrations');
const futureMigrations = walk(migrationsDir)
  .filter((file) => file.endsWith('.sql') && basename(file).localeCompare(baselineMigration) > 0)
  .sort();

for (const file of futureMigrations) {
  const label = relative(root, file).replaceAll('\\', '/');
  const source = stripSqlComments(readFileSync(file, 'utf8'));
  const statements = source.split(';').map((part) => part.trim()).filter(Boolean);
  for (const statement of statements) {
    const grantsClient = /\bgrant\b[\s\S]*\bto\s+(?:role\s+)?(?:anon|authenticated)\b/i.test(statement);
    if (!grantsClient) continue;

    const grantsTablePrivilege = /\b(?:select|insert|update|delete|truncate|references|trigger|all(?:\s+privileges)?)\b/i.test(statement);
    const grantsAllClientTables = /\ball\s+tables\s+in\s+schema\s+(?:public|private)\b/i.test(statement);
    const namesServerTable = tableNames.some((table) => new RegExp(`\\b${escapes(table)}\\b`, 'i').test(statement));
    if (grantsTablePrivilege && (grantsAllClientTables || namesServerTable)) {
      failures.push(`FUTURE_SERVER_ONLY_CLIENT_GRANT ${label}`);
    }

    const grantsExecute = /\bgrant\s+execute\b/i.test(statement);
    const namesPrivilegedRpc = privilegedRpcs.some((rpc) => new RegExp(`\\b${escapes(rpc)}\\b`, 'i').test(statement));
    if (grantsExecute && namesPrivilegedRpc) failures.push(`FUTURE_PRIVILEGED_RPC_CLIENT_EXECUTE ${label}`);
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const handoff = String(packageJson.scripts?.['verify:handoff'] || '');
const script = String(packageJson.scripts?.['server-only-boundaries:v2083'] || '');
if (!script.includes('check-v2083-server-only-boundaries.mjs')) failures.push('PACKAGE_MISSING_V2083_SCRIPT package.json');
if (!handoff.includes('server-only-boundaries:v2083')) failures.push('HANDOFF_MISSING_V2083_GUARD package.json');

if (existsSync(sqlTestPath)) {
  const sql = readFileSync(sqlTestPath, 'utf8').toLowerCase();
  for (const table of tableNames) if (!sql.includes(table)) failures.push(`SQL_TEST_MISSING_TABLE ${table}`);
  for (const rpc of privilegedRpcs) if (!sql.includes(rpc.toLowerCase())) failures.push(`SQL_TEST_MISSING_RPC ${rpc}`);
  if (!sql.includes("has_table_privilege('anon'")) failures.push('SQL_TEST_MISSING_ANON_TABLE_ACL_CHECK');
  if (!sql.includes("has_table_privilege('authenticated'")) failures.push('SQL_TEST_MISSING_AUTH_TABLE_ACL_CHECK');
  if (!sql.includes("has_function_privilege('service_role'")) failures.push('SQL_TEST_MISSING_SERVICE_ROLE_RPC_CHECK');
}

if (failures.length) {
  const unique = [...new Set(failures)].sort();
  console.error(`V208.3 server-only boundary: FAIL (${unique.length} violation(s))`);
  for (const failure of unique) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V208.3 server-only boundary: PASS (${browserFiles.length} browser source files, ${futureMigrations.length} post-baseline migration(s)).`);
