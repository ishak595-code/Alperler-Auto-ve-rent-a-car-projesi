import fs from 'node:fs';
const read=(path)=>fs.readFileSync(path,'utf8');
const fail=(message)=>{throw new Error(`V218 branch/admin invariant failed: ${message}`);};
const requireText=(source,token,message)=>{if(!source.includes(token))fail(message);};
const forbidText=(source,token,message)=>{if(source.includes(token))fail(message);};
const portal=read('src/services/branch-portal.service.ts');
const profile=read('src/services/branch-portal-profile.service.ts');
const profilePage=read('src/pages/branch-portal-profile-v225.component.ts');
const branchDetail=read('src/pages/branch-detail-v171.component.ts');
const communication=read('src/services/branch-communication.service.ts');
const routes=read('src/app.routes.ts');
const adminLogin=read('src/pages/admin-login-v218.component.ts');
const adminRecovery=read('src/services/admin-password-recovery-v220.service.ts');
const migration=read('supabase/migrations/20260831090000_v218_branch_fulfillment_hardening.sql');
for(const [token,message] of [
 ['branch_memberships?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true','portal membership read must be scoped to the signed-in user'],
 ['vehicles?branch_id=eq.${encodeURIComponent(branchId)}','branch vehicle reads must be scoped to selected branch'],
 ['bookings?fulfillment_branch_id=eq.${encodeURIComponent(branchId)}','branch booking reads must use canonical fulfillment_branch_id'],
 ['branch_id: branchId','branch-origin vehicle writes must persist branch id'],
 ['listing_origin: "BRANCH"','branch-origin vehicle writes must be marked BRANCH'],
 ['if (!this._memberships().some((item) => item.branchId === branchId))','branch switching must reject non-member branches'],
])requireText(portal,token,message);
for(const [token,message] of [
 ['const membership = this.portal.currentMembership()','profile writes must derive identity from active membership'],
 ['service_update_branch_profile_v225','profile writes must use the narrow canonical RPC'],
 ['p_branch_id:membership.branchId','profile RPC must be scoped to the active membership branch'],
 ['p_whatsapp:this.clean(input.whatsapp,40)||null','profile RPC must persist branch WhatsApp'],
])requireText(profile,token,message);
forbidText(profile,'rest/v1/branches?id=eq.','profile service must not directly PATCH the branches table');
for(const [token,message] of [
 ['WhatsApp','branch profile UI must own the WhatsApp field'],
 ['form.whatsapp','branch profile UI must bind WhatsApp to the canonical profile draft'],
 ['profiles.save(this.form)','branch profile UI must save through the canonical profile service'],
])requireText(profilePage,token,message);
requireText(branchDetail,'communication.whatsappUrl(current.whatsapp)','public WhatsApp must come from the current branch profile through the canonical communication service');
requireText(branchDetail,'BranchCommunicationService','public branch detail must use the canonical communication owner');
requireText(communication,'https://wa.me/${digits}','canonical branch communication service must open branch-specific wa.me target');
requireText(communication,'String(value || "").replace(/\\D/g, "")','WhatsApp target must be derived from the branch-specific number');
forbidText(branchDetail,'https://wa.me/','branch detail must not duplicate WhatsApp URL construction outside the canonical communication service');
for(const [token,message] of [
 ['select v.branch_id into resolved_branch','vehicle bookings must resolve canonical vehicle branch'],
 ['select t.branch_id into resolved_branch','tour bookings must resolve canonical tour branch'],
 ['new.fulfillment_branch_id := resolved_branch','resolved branch must overwrite fulfillment_branch_id'],
 ["elsif new.booking_type in ('RENTAL', 'SALE_INQUIRY', 'TOUR')",'item bookings without canonical branch must not retain arbitrary fulfillment'],
 ['revoke all on function public.assign_booking_fulfillment_branch() from public, anon, authenticated','trigger function must not be browser-executable'],
 ['before insert or update of vehicle_id, tour_id, fulfillment_branch_id','trigger must cover insert and branch-sensitive updates'],
])requireText(migration.toLowerCase(),token.toLowerCase(),message);
forbidText(migration.toLowerCase(),'if new.fulfillment_branch_id is not null then return new','client fulfillment must not bypass canonical resolution');
requireText(routes,"path: 'admin/login', loadComponent: () => import('./pages/admin-login-v218.component')",'admin/login must use dedicated admin-only surface');
requireText(routes,"router.createUrlTree(['/admin/login']",'admin guards must redirect to dedicated admin login');
requireText(adminLogin,'this.auth.login(email','admin login must use role-verified AuthService login');
requireText(adminLogin,'AdminPasswordRecoveryV220Service','admin login must use the isolated admin recovery owner');
requireText(adminLogin,'this.recovery.request(email)','admin login must request recovery through the isolated admin recovery owner');
requireText(adminLogin,'this.auth.changeCurrentPassword(this.password)','admin recovery must save the password through role-verified AuthService');
requireText(adminLogin,"queryParamMap.get('recovery')==='1'",'admin login must recognize verified recovery sessions');
requireText(adminRecovery,"/admin/login?recovery=1",'admin recovery email must return to the dedicated admin surface');
forbidText(adminRecovery,'/account/login','admin recovery must never route through customer account recovery');
requireText(adminLogin,'AdminFirstAccessV239Service','admin UI must support only the dedicated owner first-access service');
requireText(adminLogin,'this.firstAccess.complete(code','owner first access must pass through the dedicated V239 service');
requireText(adminLogin,'Tek kullanımlık kurulum kodu','owner first access must require the one-time setup code');
requireText(adminLogin,'İlk Yönetici Kurulumu','owner first access must be explicitly separated from normal login');
for(const forbidden of ['registerPrimaryAdmin','signup','Kayıt Ol','signInWithProvider','loginWithGoogle'])forbidText(adminLogin,forbidden,`admin login must not expose generic registration/social path: ${forbidden}`);
console.log('V218 branch/admin invariant passed with dedicated V239 owner first access.');
