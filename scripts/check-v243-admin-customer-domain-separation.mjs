import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`V243_ADMIN_CUSTOMER_DOMAIN_SEPARATION: ${message}`);};

const adminAuth=read('src/services/auth.service.ts');
const bridge=read('src/services/profile-admin-bridge.service.ts');
const operations=read('src/services/admin-operations.service.ts');
const partner=read('api/partner.ts');
const adminSettings=read('src/pages/admin/admin-settings-v241.component.ts');
const accountShell=read('src/pages/account-shell.component.ts');
const profileUi=read('src/components/account-profile-settings-v241.component.ts');
const migration=read('supabase/migrations/20260903172000_v243_admin_customer_domain_separation.sql');
const serviceWorker=read('public/service-worker.js');

assert(adminAuth.includes('alperler_admin_session_v1'),'admin session no longer owns its dedicated storage key');
assert(!adminAuth.includes('alperler_customer_session_v1')&&!adminAuth.includes('customerStorageKey'),'admin auth still reads customer session state');
assert(adminAuth.includes('?scope=local'),'admin logout does not use local-session revocation');
assert(!adminAuth.includes('?scope=global'),'admin logout can still revoke customer/device sessions globally');
assert(/const raw = localStorage\.getItem\(this\.storageKey\);/.test(adminAuth),'admin restore is not strictly bound to admin storage');

assert(bridge.includes('window.location.assign(\'/admin/login\')'),'customer-to-admin entry does not force a dedicated admin login');
for(const forbidden of ['adminStorageKey','alperler_admin_session_v1','localStorage.setItem(','customerSession'])assert(!bridge.includes(forbidden),`customer bridge can still bootstrap admin session: ${forbidden}`);

assert(operations.includes("'/api/partner?op=admin-core&view=operations'"),'admin overview left the canonical same-origin endpoint');
for(const forbidden of ['SUPABASE_PROJECT_URL','SUPABASE_PUBLISHABLE_KEY','supabaseFunctionUrl','/rest/v1/','/functions/v1/'])assert(!operations.includes(forbidden),`browser admin operations bypasses same-origin transport: ${forbidden}`);
assert(operations.includes("payload.code==='UNAUTHORIZED'")&&operations.includes('await this.auth.logout()'),'expired admin session is not returned to the dedicated admin login');

assert(partner.includes('service_admin_operations_snapshot_self_v243'),'server-side admin operations fallback is missing');
assert(partner.includes('x-admin-operations-source')&&partner.includes('self-rpc-v243'),'fallback source is not observable');
assert(partner.includes('operation === "admin-core"')&&partner.includes('adminCore(request)'),'admin core is not routed through the resilient server owner');
assert(partner.includes('requireAuth: true'),'primary admin gateway no longer requires bearer auth');

assert(migration.includes('service_admin_operations_snapshot_self_v243()'),'self-scoped fallback RPC migration missing');
assert(migration.includes('v_actor uuid := auth.uid()'),'fallback RPC does not derive actor from auth.uid()');
assert(!migration.includes('p_actor'),'self fallback accepts a caller-controlled actor');
assert(migration.includes('revoke all on function public.service_admin_operations_snapshot_self_v243() from anon'),'anonymous execution was not revoked');
assert(migration.includes('grant execute on function public.service_admin_operations_snapshot_self_v243() to authenticated'),'authenticated self RPC grant missing');

assert(adminSettings.includes("import { AdminAccessService }"),'super-admin identity does not come from the admin access domain');
for(const forbidden of ['CustomerAuthService','CustomerProfileV241Service','CustomerAccountService','adminDisplayName','adminProfileUrl'])assert(!adminSettings.includes(forbidden),`super-admin self settings are still coupled to customer/global profile state: ${forbidden}`);
assert(adminSettings.includes('class="subtabs"')&&adminSettings.includes("openPanel()==='brand'")&&adminSettings.includes("openPanel()==='contact'")&&adminSettings.includes("openPanel()==='account'"),'admin general settings are not a top-tab, single-content surface');
assert(adminSettings.includes("saveSection('brand')")&&adminSettings.includes("saveSection('contact')")&&adminSettings.includes('changePassword()'),'admin settings do not save independently');
assert(adminSettings.includes('this.openPanel.set(null)'),'admin panel does not collapse after successful save');

assert(accountShell.includes("type AccountSection = 'overview' | 'favorites' | 'profile' | 'referral'"),'customer referral does not own a top-level account section');
assert(accountShell.includes("[queryParams]=\"{section:'referral'}\"")&&accountShell.includes('Arkadaşını Davet Et · Sen de Kazan'),'referral is not promoted into the canonical customer top navigation');
assert(accountShell.includes("@case ('referral') { <app-account-referral-v241>"),'referral section does not render its canonical component');
const defaultBlock=accountShell.slice(accountShell.indexOf('@default {'),accountShell.indexOf('</section>',accountShell.indexOf('@default {')));
assert(!defaultBlock.includes('app-account-referral-v241'),'referral still duplicates inside overview');
assert(accountShell.includes('.header-actions>a{display:none!important}'),'duplicate dashboard profile shortcut is still visible');
assert(accountShell.indexOf('app-account-dashboard-v150')<accountShell.indexOf('quick-actions'),'customer quick actions are not kept below the account overview/history owner');

assert(profileUi.includes('type="file"'),'canonical customer avatar is not file-driven');
assert(profileUi.includes('accept="image/jpeg,image/png,image/webp"'),'canonical customer avatar file types changed unexpectedly');
assert(!/avatar_url[^\n]{0,120}(input|ngModel)|[(][(]ngModel[)][)][^\n]{0,80}avatar/i.test(profileUi),'customer profile exposes an avatar URL input');

assert(serviceWorker.includes("const RELEASE = 'v243-admin-customer-domain-separation'"),'V243 service worker release does not evict stale customer/admin UI assets');

console.log('V243 super-admin/customer hard separation, admin operations resilience, customer navigation and file-only avatar contract: PASS');
