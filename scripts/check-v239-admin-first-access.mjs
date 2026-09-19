import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`V239_ADMIN_FIRST_ACCESS: ${message}`);
};

const routes = read('src/app.routes.ts');
const login = read('src/pages/admin-login-v218.component.ts');
const service = read('src/services/admin-first-access-v239.service.ts');
const recovery = read('src/services/admin-password-recovery-v220.service.ts');
const config = read('src/supabase.config.ts');
const edge = read('supabase/functions/admin-first-access-v239/index.ts');
const migration = read('supabase/migrations/20260903012500_v239_admin_first_access_tokens.sql');
const manifest = read('supabase/functions/deployment-manifest.v186.json');

assert(routes.includes("{ path: 'admin/login', loadComponent: () => import('./pages/admin-login-v218.component').then(m => m.AdminLoginV218Component) }"), 'admin/login route ownership changed without updating the first-access contract');
assert(login.includes('AdminFirstAccessV239Service'), 'live admin login does not inject the V239 first-access service');
assert(login.includes('firstAccessMode'), 'live admin login does not own a first-access mode');
assert(login.includes('İlk Yönetici Kurulumu'), 'accessible first-access entry is missing from the live admin login');
assert(login.includes('Kurulum E-postasını Gönder') || login.includes('sendFirstAccessEmail'), 'first-access email send action is missing');
assert(login.includes('this.firstAccess.requestSetupEmail'), 'live first-access screen does not request the primary-admin setup email');
assert(login.includes('primaryAdminEmail') || login.includes('primaryEmail()'), 'first-access UI does not surface the locked primary admin email');
assert(login.includes('aria-describedby="admin-first-access-help"'), 'first-access form lacks accessible help ownership');
assert(login.includes('role="alert"') && login.includes('aria-live="assertive"'), 'accessible error announcement is missing');
assert(login.includes('role="status"') && login.includes('aria-live="polite"'), 'accessible success announcement is missing');
assert(login.includes("queryParamMap.get('recovery')==='1'"), 'recovery set-password path is missing from live admin login');
assert(login.includes('Parola en az 12 karakter olmalı ve büyük harf, küçük harf, rakam ve özel karakter içermelidir.'), 'set-password strength copy/rules missing on recovery screen');
assert(!login.includes('Yeni yönetici kaydı bu ekrandan açılamaz.'), 'live route still tells the owner that first access cannot be opened here');
assert(!login.includes('Tek kullanımlık kurulum kodu'), 'setup-code field must be removed from live admin login');
assert(!login.includes('autocomplete="one-time-code"'), 'one-time-code setup input must be removed from live admin login');
assert(!login.includes('E-posta bağlantısı gerekmez'), 'UI must not claim email verification is unnecessary');
assert(!login.includes('this.firstAccess.complete'), 'live UI must not call the retired setup-code complete path');

assert(config.includes('PRIMARY_ADMIN_EMAIL = "ishak595@gmail.com"'), 'PRIMARY_ADMIN_EMAIL ownership changed without updating first-access contract');
assert(service.includes('PRIMARY_ADMIN_EMAIL'), 'first-access service is not locked to PRIMARY_ADMIN_EMAIL');
assert(service.includes('requestSetupEmail'), 'first-access service does not expose setup-email request');
assert(service.includes('AdminPasswordRecoveryV220Service'), 'first-access service does not reuse the recovery owner');
assert(service.includes('this.recovery.request(email)'), 'first-access service does not call recovery.request for the primary email');
assert(!service.includes('supabaseFunctionUrl("admin-first-access-v239")'), 'browser first-access service must not call the retired setup-code Edge Function');
assert(!service.includes('/^\\d{12}$/'), 'browser first-access service must not require a 12-digit setup code');
assert(!service.includes('SERVICE_ROLE'), 'service role leaked into browser service');
assert(!service.includes('setupCode'), 'browser first-access service still accepts a setup code');

assert(recovery.includes("supabaseAuthUrl('recover')"), 'recovery service must use Supabase Auth recover');
assert(recovery.includes('/admin/login?recovery=1'), 'recovery email must return to admin set-password flow');
assert(recovery.includes('response.status === 429'), 'recovery rate-limit handling is missing');

// Legacy edge/token artifacts may remain deployed but must stay server-only and must not regain a client HTML recovery page.
assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'legacy Edge Function lacks its server-only credential boundary');
assert(!edge.includes('<!doctype html>'), 'standalone recovery HTML page still exists');
assert(!edge.includes('location.hash'), 'URL-fragment recovery token flow still exists');
assert(!edge.includes('redirect_to=http://localhost'), 'localhost recovery redirect leaked into Edge Function');
assert(migration.includes('revoke all on table private.admin_first_access_tokens_v239 from public, anon, authenticated'), 'legacy token table is not isolated from clients');
assert(manifest.includes('"slug": "admin-first-access-v239"'), 'V239 function missing from deployment manifest');

console.log('V239 live-route email-first owner setup contract: PASS');
