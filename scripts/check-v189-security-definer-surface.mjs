import fs from 'node:fs';

const path = 'supabase/migrations/20260826234500_v189_security_definer_surface_hardening.sql';
const sql = fs.readFileSync(path, 'utf8');
const fail = (m) => { console.error(`V189_SECURITY_FAIL: ${m}`); process.exitCode = 1; };

for (const helper of [
  'private.can_operate_branch_lifecycle_v189',
  'private.can_operate_branch_subscription_v189',
  'private.can_manage_catalog_media_owner_v189',
]) {
  if (!sql.includes(`function ${helper}`)) fail(`missing private helper ${helper}`);
  if (!sql.includes(`set search_path = ''`)) fail('SECURITY DEFINER search_path must be pinned empty');
}

for (const legacy of [
  'public.can_manage_catalog_media_owner_v1716(uuid,uuid,uuid,uuid)',
  'public.can_operate_branch_lifecycle_v1718(uuid)',
  'public.can_operate_branch_subscription(uuid)',
]) {
  if (!sql.includes(`drop function ${legacy}`)) fail(`legacy public helper not retired: ${legacy}`);
}

const requiredPolicyTokens = [
  'branches_authenticated_update_v188',
  'catalog_media_authenticated_read_v188',
  'catalog_media_branch_member_insert_v1716',
  'catalog_media_branch_member_update_v1716',
  'catalog_media_branch_member_delete_v1716',
  'vehicles_branch_member_insert',
  'vehicles_branch_member_update',
  'tours_branch_member_insert',
  'tours_branch_member_update',
  'catalog_media_objects_branch_insert_v1716',
  'catalog_media_objects_branch_update_v1716',
];
for (const token of requiredPolicyTokens) if (!sql.includes(token)) fail(`policy dependency missing: ${token}`);

for (const dependent of [
  'public.enforce_branch_listing_review_v1712',
  'public.remove_catalog_media_safe',
  'public.set_catalog_media_cover',
  'public.my_branch_subscription_entitlements_v1714',
]) {
  if (!sql.includes(`function ${dependent}`)) fail(`dependent function not repointed: ${dependent}`);
}

const intentionalRpc = [
  'accept_customer_vault_terms()',
  'claim_customer_referral(text)',
  'claim_customer_referral_context(text,uuid,text)',
  'customer_cancel_booking(text)',
  'customer_lifetime_summary(uuid)',
  'ensure_customer_profile()',
  'get_or_create_customer_referral_code()',
  'link_own_customer_booking(text)',
  'my_branch_subscription_entitlements_v1714()',
  'remove_customer_payment_method(uuid)',
  'revoke_customer_vault_terms()',
  'set_default_customer_payment_method(uuid)',
];
for (const fn of intentionalRpc) {
  if (!sql.includes(`alter function public.${fn} set search_path = ''`)) fail(`search_path hardening missing: ${fn}`);
  if (!sql.includes(`grant execute on function public.${fn} to authenticated`)) fail(`authenticated contract missing: ${fn}`);
}

if (/grant execute on function private\.[^;]+ to anon/i.test(sql)) fail('private authorization helper exposed to anon');
if (!/^begin;[\s\S]*commit;\s*$/i.test(sql.trim())) fail('migration must be transactional');

if (!process.exitCode) console.log('V189 SECURITY DEFINER surface guard passed.');
