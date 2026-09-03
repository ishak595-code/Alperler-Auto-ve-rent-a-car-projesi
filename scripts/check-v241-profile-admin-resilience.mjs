import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(`V241_PROFILE_ADMIN_RESILIENCE: ${message}`);};

const operations=read('src/services/admin-operations.service.ts');
const profileService=read('src/services/customer-profile-v241.service.ts');
const profileUi=read('src/components/account-profile-settings-v241.component.ts');
const referral=read('src/components/account-referral-v241.component.ts');
const accountShell=read('src/pages/account-shell.component.ts');
const adminSettings=read('src/pages/admin/admin-settings-v241.component.ts');
const settingsHub=read('src/pages/admin/admin-site-settings-hub.component.ts');
const migration=read('supabase/migrations/20260903160000_v241_customer_profile_write_grants.sql');

assert(operations.includes("supabaseFunctionUrl('admin-core-gateway-v178')"),'admin operations has no direct authenticated Edge fallback');
assert(operations.includes('apikey:SUPABASE_PUBLISHABLE_KEY'),'direct admin fallback does not send publishable project boundary');
assert(operations.includes('fetchProxy')&&operations.includes('fetchDirect'),'admin operations does not own proxy-to-direct resilience');
assert(!operations.includes('SERVICE_ROLE'),'server credential leaked into browser admin operations service');

assert(profileService.includes("'x-upsert':'false'"),'customer avatar upload still relies on upsert/update semantics');
assert(profileService.includes('avatar-${Date.now()}-${nonce}'),'customer avatar path is not unique/immutable per upload');
assert(profileService.includes('await this.deletePath(objectPath,token).catch'),'failed profile binding does not roll back the newly uploaded avatar');
assert(profileService.includes('profileSaving')===false,'service must not own UI loading state');
assert(!profileService.includes('SERVICE_ROLE'),'server credential leaked into customer profile service');

assert(profileUi.includes("type ProfilePanelV241='avatar'|'info'|'security'|null"),'customer profile is not a one-open-panel accordion');
assert(profileUi.includes('readonly profileSaving=signal(false)')&&profileUi.includes('readonly avatarSaving=signal(false)'),'avatar and text saves are not independent');
assert(profileUi.includes("this.openPanel.set(null)")&&profileUi.includes('Profil bilgileriniz kaydedildi.'),'profile save does not collapse after success');
assert(profileUi.includes('async logout()'),'logout is not owned by profile settings');
assert(profileUi.includes('aria-expanded'),'profile accordion is not exposed accessibly');

assert(referral.includes('readonly open=signal(false)'),'referral area is not collapsed by default');
assert(referral.includes('[attr.aria-expanded]="open()"'),'referral toggle lacks accessible expanded state');
assert(accountShell.includes('app-account-referral-v241'),'new dynamic referral is not wired into the customer shell');
assert(accountShell.includes('app-account-dashboard-v150 .account-tools')&&accountShell.includes('.header-actions .logout'),'old top quick actions/logout are not removed from the customer presentation');
assert(accountShell.indexOf('app-account-dashboard-v150')<accountShell.indexOf('quick-actions'),'customer quick actions are not placed after the account dashboard/history owner');

assert(adminSettings.includes("type AdminSettingsPanelV241='profile'|'brand'|'contact'|'security'|null"),'general admin settings are not split into panels');
assert(adminSettings.includes("saveSection('profile')")&&adminSettings.includes("saveSection('brand')")&&adminSettings.includes("saveSection('contact')"),'admin settings sections do not save independently');
assert(adminSettings.includes('this.openPanel.set(null)'),'successful admin settings do not collapse');
assert(settingsHub.includes('AdminSettingsV241Component'),'settings hub is not wired to V241 general settings');
assert(settingsHub.includes("toggleDetail('home-device')")&&settingsHub.includes("toggleDetail('home-planner')")&&settingsHub.includes("toggleDetail('home-copy')")&&settingsHub.includes("toggleDetail('home-content')"),'homepage settings remain one long continuously rendered page');

assert(migration.includes('grant update ('),'customer profile migration does not restore UPDATE permission');
for(const column of ['full_name','phone','birth_date','address_line','district','city','country','postal_code','preferred_locale','preferred_branch_id','marketing_consent','avatar_url','updated_at'])assert(migration.includes(column),`customer profile UPDATE grant missing ${column}`);
assert(!/grant update\s+on table public\.customer_profiles/i.test(migration),'migration grants broad table-level UPDATE instead of owned columns');
assert(!migration.includes('user_id,')&&!migration.includes('email,')&&!migration.includes('status,'),'immutable/admin-owned customer profile columns were accidentally granted');

console.log('V241 customer profile, referral, compact settings and admin transport resilience contract: PASS');
