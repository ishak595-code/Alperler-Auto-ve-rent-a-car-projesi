import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260826235900_v190_customer_rpc_security_boundary.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const normalized = sql.replace(/\s+/g, ' ').toLowerCase();
const fail = (message) => {
  console.error(`V190_RPC_BOUNDARY_FAIL: ${message}`);
  process.exitCode = 1;
};

const targets = [
  { publicSig: 'accept_customer_vault_terms()', implSig: 'accept_customer_vault_terms_v190_impl()' },
  { publicSig: 'claim_customer_referral(text)', implSig: 'claim_customer_referral_v190_impl(text)' },
  { publicSig: 'claim_customer_referral_context(text,uuid,text)', implSig: 'claim_customer_referral_context_v190_impl(text,uuid,text)' },
  { publicSig: 'customer_cancel_booking(text)', implSig: 'customer_cancel_booking_v190_impl(text)' },
  { publicSig: 'customer_lifetime_summary(uuid)', implSig: 'customer_lifetime_summary_v190_impl(uuid)' },
  { publicSig: 'ensure_customer_profile()', implSig: 'ensure_customer_profile_v190_impl()' },
  { publicSig: 'get_or_create_customer_referral_code()', implSig: 'get_or_create_customer_referral_code_v190_impl()' },
  { publicSig: 'link_own_customer_booking(text)', implSig: 'link_own_customer_booking_v190_impl(text)' },
  { publicSig: 'my_branch_subscription_entitlements_v1714()', implSig: 'my_branch_subscription_entitlements_v1714_v190_impl()' },
  { publicSig: 'remove_customer_payment_method(uuid)', implSig: 'remove_customer_payment_method_v190_impl(uuid)' },
  { publicSig: 'revoke_customer_vault_terms()', implSig: 'revoke_customer_vault_terms_v190_impl()' },
  { publicSig: 'set_default_customer_payment_method(uuid)', implSig: 'set_default_customer_payment_method_v190_impl(uuid)' },
];

for (const { publicSig, implSig } of targets) {
  const publicName = publicSig.slice(0, publicSig.indexOf('('));
  const implName = implSig.slice(0, implSig.indexOf('('));
  const argTypes = publicSig.slice(publicSig.indexOf('(') + 1, -1);

  if (!normalized.includes(`alter function public.${publicName}${argTypes ? `(${argTypes})` : '()'} rename to ${implName}`)) {
    fail(`missing in-place implementation rename for ${publicSig}`);
  }
  if (!normalized.includes(`alter function public.${implSig} set schema private`)) {
    fail(`implementation is not moved to private schema: ${implSig}`);
  }
  if (!normalized.includes(`alter function private.${implSig} security definer set search_path = ''`)) {
    fail(`private implementation is not pinned SECURITY DEFINER: ${implSig}`);
  }
  if (!normalized.includes(`revoke all on function private.${implSig} from public, anon`)) {
    fail(`private implementation is exposed to PUBLIC/anon: ${implSig}`);
  }
  if (!normalized.includes(`grant execute on function private.${implSig} to authenticated`)
      && !normalized.includes(`grant execute on function private.${implSig} to authenticated, service_role`)) {
    fail(`authenticated delegate contract missing on private implementation: ${implSig}`);
  }
  if (!normalized.includes(`revoke all on function public.${publicSig} from public, anon`)) {
    fail(`public wrapper retains default PUBLIC/anon execution: ${publicSig}`);
  }
  if (!normalized.includes(`grant execute on function public.${publicSig} to authenticated`)
      && !normalized.includes(`grant execute on function public.${publicSig} to authenticated, service_role`)) {
    fail(`authenticated API contract missing: ${publicSig}`);
  }
  if (!normalized.includes(`private.${implName}`)) {
    fail(`public wrapper does not delegate to private implementation: ${publicSig}`);
  }
}

const publicCreateBlocks = [...sql.matchAll(/create function public\.([a-z0-9_]+)\s*\([\s\S]*?\$\$;/gi)].map((match) => match[0]);
if (publicCreateBlocks.length !== targets.length) fail(`expected ${targets.length} public wrappers, found ${publicCreateBlocks.length}`);
for (const block of publicCreateBlocks) {
  if (!/security\s+invoker/i.test(block)) fail('a public V190 wrapper is not SECURITY INVOKER');
  if (/security\s+definer/i.test(block)) fail('SECURITY DEFINER leaked back into a public V190 wrapper');
  if (!/set\s+search_path\s*=\s*''/i.test(block)) fail('public V190 wrapper search_path is not pinned empty');
}

if (!normalized.includes('p_campaign_id uuid default null::uuid')) fail('referral-context default contract changed');
if (!normalized.includes('p_landing_path text default null::text')) fail('referral landing default contract changed');
if (!normalized.includes('p_user_id uuid default null::uuid')) fail('lifetime-summary default contract changed');
if (!normalized.includes('returns public.customer_profiles')) fail('ensure_customer_profile return contract changed');
if (!normalized.includes('returns table(') || !normalized.includes('can_operate boolean')) fail('branch entitlement table contract changed');
if (/grant execute on function private\.[^;]+ to anon/i.test(sql)) fail('private privileged implementation granted to anon');
if (!/^begin;[\s\S]*commit;\s*$/i.test(sql.trim())) fail('migration must remain transactional');

if (!process.exitCode) console.log('V190 customer RPC security boundary guard passed.');
