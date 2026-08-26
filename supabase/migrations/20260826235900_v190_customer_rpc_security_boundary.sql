begin;

-- V190 closes the remaining public SECURITY DEFINER surface without changing the
-- browser RPC contract. The already production-tested implementations are moved
-- in-place (OID/body/dependencies preserved) to the non-exposed private schema.
-- Public functions are recreated as SECURITY INVOKER delegates with the same
-- names, arguments, defaults and return types.

alter function public.accept_customer_vault_terms() rename to accept_customer_vault_terms_v190_impl;
alter function public.accept_customer_vault_terms_v190_impl() set schema private;
alter function public.claim_customer_referral(text) rename to claim_customer_referral_v190_impl;
alter function public.claim_customer_referral_v190_impl(text) set schema private;
alter function public.claim_customer_referral_context(text,uuid,text) rename to claim_customer_referral_context_v190_impl;
alter function public.claim_customer_referral_context_v190_impl(text,uuid,text) set schema private;
alter function public.customer_cancel_booking(text) rename to customer_cancel_booking_v190_impl;
alter function public.customer_cancel_booking_v190_impl(text) set schema private;
alter function public.customer_lifetime_summary(uuid) rename to customer_lifetime_summary_v190_impl;
alter function public.customer_lifetime_summary_v190_impl(uuid) set schema private;
alter function public.ensure_customer_profile() rename to ensure_customer_profile_v190_impl;
alter function public.ensure_customer_profile_v190_impl() set schema private;
alter function public.get_or_create_customer_referral_code() rename to get_or_create_customer_referral_code_v190_impl;
alter function public.get_or_create_customer_referral_code_v190_impl() set schema private;
alter function public.link_own_customer_booking(text) rename to link_own_customer_booking_v190_impl;
alter function public.link_own_customer_booking_v190_impl(text) set schema private;
alter function public.my_branch_subscription_entitlements_v1714() rename to my_branch_subscription_entitlements_v1714_v190_impl;
alter function public.my_branch_subscription_entitlements_v1714_v190_impl() set schema private;
alter function public.remove_customer_payment_method(uuid) rename to remove_customer_payment_method_v190_impl;
alter function public.remove_customer_payment_method_v190_impl(uuid) set schema private;
alter function public.revoke_customer_vault_terms() rename to revoke_customer_vault_terms_v190_impl;
alter function public.revoke_customer_vault_terms_v190_impl() set schema private;
alter function public.set_default_customer_payment_method(uuid) rename to set_default_customer_payment_method_v190_impl;
alter function public.set_default_customer_payment_method_v190_impl(uuid) set schema private;

-- Privileged implementation boundary. The functions keep their original
-- self/role authorization logic and are not exposed to anon.
alter function private.accept_customer_vault_terms_v190_impl() security definer set search_path = '';
alter function private.claim_customer_referral_v190_impl(text) security definer set search_path = '';
alter function private.claim_customer_referral_context_v190_impl(text,uuid,text) security definer set search_path = '';
alter function private.customer_cancel_booking_v190_impl(text) security definer set search_path = '';
alter function private.customer_lifetime_summary_v190_impl(uuid) security definer set search_path = '';
alter function private.ensure_customer_profile_v190_impl() security definer set search_path = '';
alter function private.get_or_create_customer_referral_code_v190_impl() security definer set search_path = '';
alter function private.link_own_customer_booking_v190_impl(text) security definer set search_path = '';
alter function private.my_branch_subscription_entitlements_v1714_v190_impl() security definer set search_path = '';
alter function private.remove_customer_payment_method_v190_impl(uuid) security definer set search_path = '';
alter function private.revoke_customer_vault_terms_v190_impl() security definer set search_path = '';
alter function private.set_default_customer_payment_method_v190_impl(uuid) security definer set search_path = '';

revoke all on function private.accept_customer_vault_terms_v190_impl() from public, anon;
revoke all on function private.claim_customer_referral_v190_impl(text) from public, anon;
revoke all on function private.claim_customer_referral_context_v190_impl(text,uuid,text) from public, anon;
revoke all on function private.customer_cancel_booking_v190_impl(text) from public, anon;
revoke all on function private.customer_lifetime_summary_v190_impl(uuid) from public, anon;
revoke all on function private.ensure_customer_profile_v190_impl() from public, anon;
revoke all on function private.get_or_create_customer_referral_code_v190_impl() from public, anon;
revoke all on function private.link_own_customer_booking_v190_impl(text) from public, anon;
revoke all on function private.my_branch_subscription_entitlements_v1714_v190_impl() from public, anon;
revoke all on function private.remove_customer_payment_method_v190_impl(uuid) from public, anon;
revoke all on function private.revoke_customer_vault_terms_v190_impl() from public, anon;
revoke all on function private.set_default_customer_payment_method_v190_impl(uuid) from public, anon;

grant execute on function private.accept_customer_vault_terms_v190_impl() to authenticated, service_role;
grant execute on function private.claim_customer_referral_v190_impl(text) to authenticated, service_role;
grant execute on function private.claim_customer_referral_context_v190_impl(text,uuid,text) to authenticated, service_role;
grant execute on function private.customer_cancel_booking_v190_impl(text) to authenticated, service_role;
grant execute on function private.customer_lifetime_summary_v190_impl(uuid) to authenticated;
grant execute on function private.ensure_customer_profile_v190_impl() to authenticated;
grant execute on function private.get_or_create_customer_referral_code_v190_impl() to authenticated, service_role;
grant execute on function private.link_own_customer_booking_v190_impl(text) to authenticated;
grant execute on function private.my_branch_subscription_entitlements_v1714_v190_impl() to authenticated;
grant execute on function private.remove_customer_payment_method_v190_impl(uuid) to authenticated, service_role;
grant execute on function private.revoke_customer_vault_terms_v190_impl() to authenticated, service_role;
grant execute on function private.set_default_customer_payment_method_v190_impl(uuid) to authenticated, service_role;

-- Public API wrappers. These never elevate the caller. Privilege elevation is
-- confined to the private implementation after that implementation validates
-- auth.uid()/role/ownership under its original production-tested rules.
create function public.accept_customer_vault_terms()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.accept_customer_vault_terms_v190_impl();
end;
$$;

create function public.claim_customer_referral(p_code text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.claim_customer_referral_v190_impl(p_code);
end;
$$;

create function public.claim_customer_referral_context(
  p_code text,
  p_campaign_id uuid default null::uuid,
  p_landing_path text default null::text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.claim_customer_referral_context_v190_impl(p_code, p_campaign_id, p_landing_path);
end;
$$;

create function public.customer_cancel_booking(p_reference text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.customer_cancel_booking_v190_impl(p_reference);
end;
$$;

create function public.customer_lifetime_summary(p_user_id uuid default null::uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.customer_lifetime_summary_v190_impl(p_user_id);
end;
$$;

create function public.ensure_customer_profile()
returns public.customer_profiles
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.ensure_customer_profile_v190_impl();
end;
$$;

create function public.get_or_create_customer_referral_code()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.get_or_create_customer_referral_code_v190_impl();
end;
$$;

create function public.link_own_customer_booking(p_booking_reference text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.link_own_customer_booking_v190_impl(p_booking_reference);
end;
$$;

create function public.my_branch_subscription_entitlements_v1714()
returns table(
  branch_id uuid,
  branch_name text,
  status text,
  plan_code text,
  plan_name text,
  effective_price numeric,
  currency text,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  can_operate boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.my_branch_subscription_entitlements_v1714_v190_impl();
$$;

create function public.remove_customer_payment_method(p_method_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.remove_customer_payment_method_v190_impl(p_method_id);
end;
$$;

create function public.revoke_customer_vault_terms()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.revoke_customer_vault_terms_v190_impl();
end;
$$;

create function public.set_default_customer_payment_method(p_method_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.set_default_customer_payment_method_v190_impl(p_method_id);
end;
$$;

-- CREATE FUNCTION grants PUBLIC EXECUTE by default in PostgreSQL, so close that
-- default explicitly and restore only the pre-V190 caller contracts.
revoke all on function public.accept_customer_vault_terms() from public, anon;
revoke all on function public.claim_customer_referral(text) from public, anon;
revoke all on function public.claim_customer_referral_context(text,uuid,text) from public, anon;
revoke all on function public.customer_cancel_booking(text) from public, anon;
revoke all on function public.customer_lifetime_summary(uuid) from public, anon;
revoke all on function public.ensure_customer_profile() from public, anon;
revoke all on function public.get_or_create_customer_referral_code() from public, anon;
revoke all on function public.link_own_customer_booking(text) from public, anon;
revoke all on function public.my_branch_subscription_entitlements_v1714() from public, anon;
revoke all on function public.remove_customer_payment_method(uuid) from public, anon;
revoke all on function public.revoke_customer_vault_terms() from public, anon;
revoke all on function public.set_default_customer_payment_method(uuid) from public, anon;

grant execute on function public.accept_customer_vault_terms() to authenticated, service_role;
grant execute on function public.claim_customer_referral(text) to authenticated, service_role;
grant execute on function public.claim_customer_referral_context(text,uuid,text) to authenticated, service_role;
grant execute on function public.customer_cancel_booking(text) to authenticated, service_role;
grant execute on function public.customer_lifetime_summary(uuid) to authenticated;
grant execute on function public.ensure_customer_profile() to authenticated;
grant execute on function public.get_or_create_customer_referral_code() to authenticated, service_role;
grant execute on function public.link_own_customer_booking(text) to authenticated;
grant execute on function public.my_branch_subscription_entitlements_v1714() to authenticated;
grant execute on function public.remove_customer_payment_method(uuid) to authenticated, service_role;
grant execute on function public.revoke_customer_vault_terms() to authenticated, service_role;
grant execute on function public.set_default_customer_payment_method(uuid) to authenticated, service_role;

comment on function public.accept_customer_vault_terms() is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.claim_customer_referral(text) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.claim_customer_referral_context(text,uuid,text) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.customer_cancel_booking(text) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.customer_lifetime_summary(uuid) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.ensure_customer_profile() is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.get_or_create_customer_referral_code() is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.link_own_customer_booking(text) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.my_branch_subscription_entitlements_v1714() is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.remove_customer_payment_method(uuid) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.revoke_customer_vault_terms() is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';
comment on function public.set_default_customer_payment_method(uuid) is 'V190 SECURITY INVOKER API wrapper; privileged implementation is isolated in private schema.';

commit;
