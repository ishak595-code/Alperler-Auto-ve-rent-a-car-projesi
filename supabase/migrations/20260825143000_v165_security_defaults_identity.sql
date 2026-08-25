-- V165 production hardening.
-- 1) Future application-owned database objects default to deny.
-- 2) Identity-sensitive links require a confirmed Supabase Auth email.
-- 3) Branch authorization implementation moves behind the private schema.
--
-- Supabase-managed objects can be owned by supabase_admin. The application migration
-- role cannot safely alter that platform role's default ACL. V165 CI therefore also
-- rejects application migrations that omit explicit GRANT/REVOKE/RLS contracts.

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated, service_role;

create or replace function private.current_verified_email()
returns text
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select lower(btrim(u.email::text))
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and nullif(btrim(u.email::text), '') is not null
  limit 1;
$$;
revoke all on function private.current_verified_email() from public, anon, authenticated, service_role;

create or replace function private.can_actor_manage_operations(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_actor is not null and exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        au.role in ('owner','admin','support')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"operations.manage":true}'::jsonb
      )
  );
$$;
revoke all on function private.can_actor_manage_operations(uuid) from public, anon, authenticated, service_role;

create or replace function private.can_manage_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.is_admin() or exists (
    select 1
    from public.branch_memberships bm
    where bm.branch_id = p_branch_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
  );
$$;
revoke all on function private.can_manage_branch(uuid) from public, anon, authenticated, service_role;
grant execute on function private.can_manage_branch(uuid) to authenticated;

create or replace function public.can_manage_branch(p_branch_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, private
as $$
  select private.can_manage_branch(p_branch_id);
$$;
revoke all on function public.can_manage_branch(uuid) from public, anon, authenticated, service_role;
grant execute on function public.can_manage_branch(uuid) to authenticated, service_role;

create or replace function private.enforce_verified_booking_customer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  if new.customer_user_id is not null
     and not exists (
       select 1
       from auth.users u
       where u.id = new.customer_user_id
         and u.email_confirmed_at is not null
     )
  then
    raise exception using errcode = 'P0001', message = 'CUSTOMER_EMAIL_VERIFICATION_REQUIRED';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verified_booking_customer() from public, anon, authenticated, service_role;

drop trigger if exists bookings_verified_customer_insert on public.bookings;
create trigger bookings_verified_customer_insert
before insert on public.bookings
for each row
when (new.customer_user_id is not null)
execute function private.enforce_verified_booking_customer();

drop trigger if exists bookings_verified_customer_update on public.bookings;
create trigger bookings_verified_customer_update
before update of customer_user_id on public.bookings
for each row
when (new.customer_user_id is distinct from old.customer_user_id and new.customer_user_id is not null)
execute function private.enforce_verified_booking_customer();

create or replace function private.enforce_verified_branch_member()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  v_email text;
begin
  select lower(btrim(u.email::text))
    into v_email
  from auth.users u
  where u.id = new.user_id
    and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception using errcode = 'P0001', message = 'BRANCH_MEMBER_EMAIL_VERIFICATION_REQUIRED';
  end if;

  if nullif(btrim(coalesce(new.invited_email, '')), '') is not null
     and lower(btrim(new.invited_email)) <> v_email
  then
    raise exception using errcode = 'P0001', message = 'BRANCH_MEMBER_EMAIL_MISMATCH';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verified_branch_member() from public, anon, authenticated, service_role;

drop trigger if exists branch_memberships_verified_identity_insert on public.branch_memberships;
create trigger branch_memberships_verified_identity_insert
before insert on public.branch_memberships
for each row
execute function private.enforce_verified_branch_member();

drop trigger if exists branch_memberships_verified_identity_update on public.branch_memberships;
create trigger branch_memberships_verified_identity_update
before update of user_id, invited_email on public.branch_memberships
for each row
when (
  new.user_id is distinct from old.user_id
  or new.invited_email is distinct from old.invited_email
)
execute function private.enforce_verified_branch_member();

create or replace function public.ensure_customer_profile()
returns public.customer_profiles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_name text;
  v_avatar text;
  v_row public.customer_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select lower(nullif(btrim(u.email::text), '')),
         u.email_confirmed_at,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')::text,
         coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')::text
    into v_email, v_email_confirmed_at, v_name, v_avatar
  from auth.users u
  where u.id = v_uid;

  if not found then raise exception 'AUTH_USER_NOT_FOUND'; end if;

  insert into public.customer_profiles(user_id,email,full_name,avatar_url)
  values (v_uid,v_email,nullif(left(v_name,160),''),nullif(left(v_avatar,2048),''))
  on conflict (user_id) do update set
    email = coalesce(excluded.email, public.customer_profiles.email),
    full_name = coalesce(nullif(public.customer_profiles.full_name,''), excluded.full_name),
    avatar_url = coalesce(nullif(public.customer_profiles.avatar_url,''), excluded.avatar_url),
    updated_at = now()
  returning * into v_row;

  insert into public.customer_loyalty_accounts(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  if v_email is not null and v_email_confirmed_at is not null then
    update public.bookings
       set customer_user_id = v_uid,
           customer_linked_at = coalesce(customer_linked_at, now())
     where customer_user_id is null
       and deleted_at is null
       and lower(btrim(coalesce(customer_email, ''))) = v_email;
  end if;

  return v_row;
end;
$$;
revoke all on function public.ensure_customer_profile() from public, anon, authenticated, service_role;
grant execute on function public.ensure_customer_profile() to authenticated;

create or replace function public.link_own_customer_booking(p_booking_reference text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_booking public.bookings;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_booking_reference is null or length(btrim(p_booking_reference)) < 3 or length(btrim(p_booking_reference)) > 80 then
    raise exception 'INVALID_BOOKING_REFERENCE';
  end if;

  v_email := private.current_verified_email();
  if v_email is null then raise exception 'EMAIL_VERIFICATION_REQUIRED'; end if;

  if not exists (
    select 1
    from public.customer_profiles cp
    where cp.user_id = v_uid
      and cp.status = 'ACTIVE'
  ) then
    raise exception 'CUSTOMER_PROFILE_REQUIRED';
  end if;

  update public.bookings
     set customer_user_id = v_uid,
         customer_linked_at = coalesce(customer_linked_at, now()),
         updated_at = now()
   where reference = btrim(p_booking_reference)
     and deleted_at is null
     and lower(btrim(coalesce(customer_email, ''))) = v_email
     and (customer_user_id is null or customer_user_id = v_uid)
  returning * into v_booking;

  if not found then raise exception 'BOOKING_NOT_LINKABLE'; end if;

  return jsonb_build_object(
    'ok', true,
    'bookingReference', v_booking.reference,
    'customerUserId', v_booking.customer_user_id
  );
end;
$$;
revoke all on function public.link_own_customer_booking(text) from public, anon, authenticated, service_role;
grant execute on function public.link_own_customer_booking(text) to authenticated;

create or replace function private.enforce_verified_referral_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  v_user_id uuid;
begin
  v_user_id := case
    when tg_table_name = 'customer_referral_codes' then new.user_id
    when tg_table_name = 'customer_referrals' then new.invitee_user_id
    else null
  end;

  if v_user_id is null or not exists (
    select 1
    from auth.users u
    where u.id = v_user_id
      and u.email_confirmed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'EMAIL_VERIFICATION_REQUIRED';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verified_referral_identity() from public, anon, authenticated, service_role;

drop trigger if exists customer_referral_codes_verified_identity on public.customer_referral_codes;
create trigger customer_referral_codes_verified_identity
before insert on public.customer_referral_codes
for each row execute function private.enforce_verified_referral_identity();

drop trigger if exists customer_referrals_verified_identity on public.customer_referrals;
create trigger customer_referrals_verified_identity
before insert on public.customer_referrals
for each row execute function private.enforce_verified_referral_identity();

drop policy if exists geo_sync_state_no_client_access on public.geo_sync_state;
create policy geo_sync_state_no_client_access
on public.geo_sync_state
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

comment on function private.current_verified_email() is 'V165 authoritative verified-email resolver for identity-sensitive customer operations.';
comment on function private.can_actor_manage_operations(uuid) is 'V165 service-side actor authorization helper. Never trust a caller-supplied actor UUID without this check.';
comment on function public.can_manage_branch(uuid) is 'Compatibility wrapper. Authorization logic lives in private.can_manage_branch and this wrapper is SECURITY INVOKER.';
