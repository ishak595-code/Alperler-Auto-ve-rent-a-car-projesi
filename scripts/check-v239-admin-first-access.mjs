import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`V239_ADMIN_FIRST_ACCESS: ${message}`);
};

const login = read('src/pages/admin/admin-login.component.ts');
const service = read('src/services/admin-first-access-v239.service.ts');
const edge = read('supabase/functions/admin-first-access-v239/index.ts');
const migration = read('supabase/migrations/20260903012500_v239_admin_first_access_tokens.sql');
const manifest = read('supabase/functions/deployment-manifest.v186.json');

assert(login.includes('"first-access"'), 'admin login does not own a first-access mode');
assert(login.includes('İlk Yönetici Kurulumu'), 'accessible first-access entry is missing');
assert(login.includes('Tek kullanımlık kurulum kodu'), 'setup code field is missing');
assert(login.includes('autocomplete="one-time-code"'), 'setup code field is not exposed as a one-time-code input');
assert(login.includes('inputmode="numeric"'), 'setup code field is not optimized for numeric/screen-reader entry');
assert(login.includes('aria-describedby="admin-first-access-help"'), 'first-access form lacks accessible help ownership');
assert(login.includes('role="alert"') && login.includes('aria-live="assertive"'), 'accessible error announcement is missing');
assert(login.includes('role="status"') && login.includes('aria-live="polite"'), 'accessible success announcement is missing');
assert(login.includes('firstAccessService.complete'), 'first-access screen does not call the dedicated setup service');
assert(!/doFirstAccess\([\s\S]{0,450}resetPassword\(/.test(login), 'first-access still sends the owner through recovery email');
assert(login.includes('E-posta bağlantısına tıklamanız gerekmez'), 'UI does not explicitly remove the email-link dependency');

assert(service.includes('supabaseFunctionUrl("admin-first-access-v239")'), 'frontend service does not call the V239 Edge Function');
assert(service.includes('/^\\d{12}$/'), 'frontend service does not require a 12-digit setup code');
assert(service.includes('SUPABASE_PUBLISHABLE_KEY'), 'frontend service does not use the publishable boundary');
assert(!service.includes('SERVICE_ROLE'), 'service role leaked into browser service');

assert(edge.includes('request.method === "OPTIONS"'), 'Edge Function has no CORS preflight support');
assert(edge.includes('access-control-allow-origin'), 'Edge Function has no CORS boundary');
assert(edge.includes('/^\\d{12}$/'), 'Edge Function does not require a 12-digit setup code');
assert(edge.includes('sha256(setupCode)'), 'raw setup code is not hashed before database claim');
assert(edge.includes('admin_first_access_claim_v239'), 'Edge Function does not use atomic token claim');
assert(edge.includes('admin_first_access_finish_v239'), 'Edge Function does not finish/release token claims');
assert(edge.includes('/auth/v1/admin/users/'), 'password update is not performed at the server-only Auth admin boundary');
assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Edge Function lacks its server-only credential boundary');
assert(edge.includes('pwnedpasswords.com/range/'), 'password breach check is missing');
assert(!edge.includes('<!doctype html>'), 'standalone recovery HTML page still exists');
assert(!edge.includes('location.hash'), 'URL-fragment recovery token flow still exists');
assert(!edge.includes('redirect_to=http://localhost'), 'localhost recovery redirect leaked into Edge Function');

assert(migration.includes('private.admin_first_access_tokens_v239'), 'private setup-token table is missing');
assert(migration.includes('token_hash text not null unique'), 'only the token hash is not persisted');
assert(migration.includes('revoke all on table private.admin_first_access_tokens_v239 from public, anon, authenticated'), 'token table is not isolated from clients');
assert(migration.includes("lower(a.role) = 'owner'"), 'setup token can target a non-owner account');
assert(migration.includes('grant execute on function public.admin_first_access_claim_v239(text) to service_role'), 'token claim RPC is not service-role only');
assert(migration.includes('failed_attempts < 8'), 'one-time grant attempt limit is missing');

assert(manifest.includes('"slug": "admin-first-access-v239"'), 'V239 function missing from deployment manifest');
assert(manifest.includes('"verifyJwt": false'), 'first-access function must remain callable before an admin session exists');

console.log('V239 accessible in-app owner setup contract: PASS');
