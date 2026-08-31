import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { throw new Error(`V218 branch/admin invariant failed: ${message}`); };
const requireText = (source, token, message) => { if (!source.includes(token)) fail(message); };
const forbidText = (source, token, message) => { if (source.includes(token)) fail(message); };

const portal = read('src/services/branch-portal.service.ts');
const profile = read('src/services/branch-portal-profile.service.ts');
const branchDetail = read('src/pages/branch-detail-v171.component.ts');
const routes = read('src/app.routes.ts');
const adminLogin = read('src/pages/admin-login-v218.component.ts');
const migration = read('supabase/migrations/20260831090000_v218_branch_fulfillment_hardening.sql');

for (const [token, message] of [
  ['branch_memberships?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true', 'portal membership read must be scoped to the signed-in user'],
  ['vehicles?branch_id=eq.${encodeURIComponent(branchId)}', 'branch vehicle reads must be scoped to the selected branch'],
  ['bookings?fulfillment_branch_id=eq.${encodeURIComponent(branchId)}', 'branch booking reads must use canonical fulfillment_branch_id'],
  ['branch_id: branchId', 'branch-origin vehicle writes must persist the selected branch id'],
  ['listing_origin: "BRANCH"', 'branch-origin vehicle writes must be marked BRANCH'],
  ['if (!this._memberships().some((item) => item.branchId === branchId))', 'branch switching must reject non-member branches'],
]) requireText(portal, token, message);

for (const [token, message] of [
  ['const membership = this.portal.currentMembership()', 'branch profile writes must derive identity from the active membership'],
  ['whatsapp: this.clean(input.whatsapp, 40) || null', 'branch profile must own its WhatsApp number'],
  ['branches?id=eq.${encodeURIComponent(membership.branchId)}', 'branch profile PATCH must be scoped to the membership branch'],
]) requireText(profile, token, message);

requireText(branchDetail, "@if(current.whatsapp){<a [href]=\"whatsappUrl(current.whatsapp)\"", 'public branch WhatsApp must come from that branch profile');
requireText(branchDetail, "https://wa.me/${value.replace(/\\D/g,'')}", 'branch WhatsApp must open the branch-specific wa.me target');

for (const [token, message] of [
  ['select v.branch_id into resolved_branch', 'vehicle bookings must resolve fulfillment from canonical vehicle branch'],
  ['select t.branch_id into resolved_branch', 'tour bookings must resolve fulfillment from canonical tour branch'],
  ['new.fulfillment_branch_id := resolved_branch', 'resolved branch must overwrite fulfillment_branch_id'],
  ["elsif new.booking_type in ('RENTAL', 'SALE_INQUIRY', 'TOUR')", 'item booking types without a canonical branch must not retain an arbitrary branch id'],
  ['revoke all on function public.assign_booking_fulfillment_branch() from public, anon, authenticated', 'trigger function must not be directly executable by browser roles'],
  ['before insert or update of vehicle_id, tour_id, fulfillment_branch_id', 'fulfillment trigger must cover insert and branch-sensitive updates'],
]) requireText(migration.toLowerCase(), token.toLowerCase(), message);
forbidText(migration.toLowerCase(), 'if new.fulfillment_branch_id is not null then return new', 'client-supplied fulfillment branch must never bypass canonical resolution');

requireText(routes, "path: 'admin/login', loadComponent: () => import('./pages/admin-login-v218.component')", 'admin/login must use the dedicated admin-only surface');
requireText(routes, "router.createUrlTree(['/admin/login']", 'admin guards must redirect to the dedicated admin login');
requireText(adminLogin, 'this.auth.login(email, this.password)', 'admin login must use AuthService role-verified password login');
requireText(adminLogin, 'this.auth.resetPassword(email)', 'admin login must expose secure email recovery');
requireText(adminLogin, 'Yeni yönetici kaydı bu ekrandan açılamaz.', 'admin UI must clearly remain login-only');
for (const forbidden of ['registerPrimaryAdmin', 'signup', 'Kayıt Ol', 'signInWithProvider', 'loginWithGoogle']) {
  forbidText(adminLogin, forbidden, `admin login surface must not expose bootstrap/registration/social path: ${forbidden}`);
}

console.log('V218 branch/admin invariant passed: branch-owned inventory, fulfillment, profile/WhatsApp and admin-only recovery login remain single-owner and scoped.');
