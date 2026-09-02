alter table public.branch_partner_requests
  add column if not exists business_type text,
  add column if not exists tax_office text,
  add column if not exists tax_number text,
  add column if not exists trade_registry_no text,
  add column if not exists mersis_no text,
  add column if not exists business_address text,
  add column if not exists business_website text,
  add column if not exists accuracy_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists due_diligence_consent_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.branch_partner_requests'::regclass and conname='branch_partner_business_type_v237_ck') then
    alter table public.branch_partner_requests add constraint branch_partner_business_type_v237_ck
      check (business_type is null or business_type in ('SOLE_PROPRIETORSHIP','LIMITED','JOINT_STOCK','COOPERATIVE','OTHER')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.branch_partner_requests'::regclass and conname='branch_partner_tax_number_v237_ck') then
    alter table public.branch_partner_requests add constraint branch_partner_tax_number_v237_ck
      check (tax_number is null or tax_number ~ '^[0-9]{10,11}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.branch_partner_requests'::regclass and conname='branch_partner_mersis_v237_ck') then
    alter table public.branch_partner_requests add constraint branch_partner_mersis_v237_ck
      check (mersis_no is null or mersis_no ~ '^[0-9]{16}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.branch_partner_requests'::regclass and conname='branch_partner_website_v237_ck') then
    alter table public.branch_partner_requests add constraint branch_partner_website_v237_ck
      check (business_website is null or business_website ~* '^https://[^[:space:]]+$') not valid;
  end if;
end $$;

create or replace function private.can_prepare_branch_listing_v237(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.branches b
    where b.id = p_branch_id
      and (
        b.public_status = 'DRAFT'
        or (b.public_status = 'ACTIVE' and b.is_active = true)
      )
  )
  and private.can_operate_branch_subscription_v189(p_branch_id);
$$;

create or replace function private.branch_listing_limit_v237(p_branch_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when b.network_type = 'OWNED' then 2147483647
    else greatest(0, coalesce(nullif(p.entitlements->>'listingLimit','')::integer, 0))
  end
  from public.branches b
  left join public.branch_subscriptions s on s.branch_id = b.id
  left join public.branch_subscription_plans p on p.id = s.plan_id and p.is_active = true
  where b.id = p_branch_id;
$$;

create or replace function private.enforce_branch_listing_limit_v237()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_limit integer;
  v_existing bigint;
  v_old_counted boolean := false;
  v_new_counted boolean := false;
begin
  v_new_counted := new.branch_id is not null
    and new.listing_origin = 'BRANCH'
    and coalesce(new.publication_status,'DRAFT') <> 'ARCHIVED';

  if tg_op = 'UPDATE' then
    v_old_counted := old.branch_id is not null
      and old.listing_origin = 'BRANCH'
      and coalesce(old.publication_status,'DRAFT') <> 'ARCHIVED';

    if v_old_counted and v_new_counted and old.branch_id = new.branch_id then
      return new;
    end if;
  end if;

  if not v_new_counted then
    return new;
  end if;

  v_branch_id := new.branch_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_branch_id::text, 237));

  v_limit := private.branch_listing_limit_v237(v_branch_id);
  if v_limit is null or v_limit < 1 then
    raise exception using errcode='42501', message='BRANCH_LISTING_LIMIT_UNAVAILABLE';
  end if;

  select
    (select count(*) from public.vehicles v
      where v.branch_id=v_branch_id and v.listing_origin='BRANCH' and v.publication_status <> 'ARCHIVED')
    +
    (select count(*) from public.tours t
      where t.branch_id=v_branch_id and t.listing_origin='BRANCH' and t.publication_status <> 'ARCHIVED')
  into v_existing;

  if tg_op = 'UPDATE' and v_old_counted and old.branch_id <> new.branch_id then
    null;
  end if;

  if v_existing >= v_limit then
    raise exception using errcode='23514', message='BRANCH_LISTING_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists vehicles_branch_listing_limit_v237 on public.vehicles;
create trigger vehicles_branch_listing_limit_v237
before insert or update of branch_id, listing_origin, publication_status on public.vehicles
for each row execute function private.enforce_branch_listing_limit_v237();

drop trigger if exists tours_branch_listing_limit_v237 on public.tours;
create trigger tours_branch_listing_limit_v237
before insert or update of branch_id, listing_origin, publication_status on public.tours
for each row execute function private.enforce_branch_listing_limit_v237();

drop policy if exists vehicles_branch_member_insert on public.vehicles;
create policy vehicles_branch_member_insert on public.vehicles
for insert to authenticated
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
);

drop policy if exists vehicles_branch_member_update on public.vehicles;
create policy vehicles_branch_member_update on public.vehicles
for update to authenticated
using (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
)
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
);

drop policy if exists tours_branch_member_insert on public.tours;
create policy tours_branch_member_insert on public.tours
for insert to authenticated
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
);

drop policy if exists tours_branch_member_update on public.tours;
create policy tours_branch_member_update on public.tours
for update to authenticated
using (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
)
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_prepare_branch_listing_v237(branch_id)
);

comment on function private.can_prepare_branch_listing_v237(uuid) is 'Allows authenticated branch operators to prepare DRAFT onboarding listings while preserving subscription, ownership and public visibility controls.';
comment on function private.enforce_branch_listing_limit_v237() is 'Enforces the effective subscription listingLimit across branch vehicles and tours with an advisory transaction lock.';
