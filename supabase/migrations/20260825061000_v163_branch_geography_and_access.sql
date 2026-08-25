-- V163 branch geography and owner-access lifecycle.
-- Geography is synchronized by the geo-directory Edge Function from the pinned
-- Open Admin Data Türkiye dataset and persisted here so forms do not depend on a
-- third-party service at runtime after synchronization.

create table if not exists public.geo_provinces (
  code text primary key,
  name text not null,
  slug text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_name text not null default 'Open Admin Data',
  source_url text not null default 'https://github.com/open-admin-data/turkey-administrative-divisions',
  source_updated_at date,
  synced_at timestamptz not null default now(),
  constraint geo_provinces_code_chk check (code ~ '^TUR[0-9]{3}$'),
  constraint geo_provinces_name_chk check (char_length(btrim(name)) between 2 and 80),
  constraint geo_provinces_slug_chk check (char_length(btrim(slug)) between 2 and 120)
);

create table if not exists public.geo_districts (
  code text primary key,
  province_code text not null references public.geo_provinces(code) on update cascade on delete restrict,
  name text not null,
  slug text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_name text not null default 'Open Admin Data',
  source_url text not null default 'https://github.com/open-admin-data/turkey-administrative-divisions',
  source_updated_at date,
  synced_at timestamptz not null default now(),
  constraint geo_districts_code_chk check (code ~ '^TUR[0-9]{6}$'),
  constraint geo_districts_name_chk check (char_length(btrim(name)) between 1 and 100),
  constraint geo_districts_slug_chk check (char_length(btrim(slug)) between 2 and 140),
  unique (province_code, code)
);

create index if not exists geo_provinces_name_idx on public.geo_provinces(name);
create index if not exists geo_districts_province_name_idx on public.geo_districts(province_code, name);

alter table public.geo_provinces enable row level security;
alter table public.geo_districts enable row level security;
grant select on public.geo_provinces, public.geo_districts to anon, authenticated;
revoke insert, update, delete on public.geo_provinces, public.geo_districts from anon, authenticated;

drop policy if exists geo_provinces_public_read on public.geo_provinces;
create policy geo_provinces_public_read on public.geo_provinces for select to anon, authenticated using (true);
drop policy if exists geo_districts_public_read on public.geo_districts;
create policy geo_districts_public_read on public.geo_districts for select to anon, authenticated using (true);

create table if not exists public.geo_sync_state (
  dataset_key text primary key,
  source_name text not null,
  source_url text not null,
  source_updated_at date,
  province_count integer not null default 0,
  district_count integer not null default 0,
  checksum text,
  synced_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
alter table public.geo_sync_state enable row level security;
revoke all on public.geo_sync_state from anon, authenticated;

alter table public.branch_partner_requests
  add column if not exists province_code text,
  add column if not exists district_code text;

alter table public.branches
  add column if not exists province_code text,
  add column if not exists district_code text;

alter table public.branch_partner_requests drop constraint if exists branch_partner_requests_province_fk;
alter table public.branch_partner_requests
  add constraint branch_partner_requests_province_fk foreign key (province_code)
  references public.geo_provinces(code) on update cascade on delete restrict not valid;

alter table public.branch_partner_requests drop constraint if exists branch_partner_requests_district_pair_fk;
alter table public.branch_partner_requests
  add constraint branch_partner_requests_district_pair_fk foreign key (province_code, district_code)
  references public.geo_districts(province_code, code) on update cascade on delete restrict not valid;

alter table public.branches drop constraint if exists branches_province_fk;
alter table public.branches
  add constraint branches_province_fk foreign key (province_code)
  references public.geo_provinces(code) on update cascade on delete restrict not valid;

alter table public.branches drop constraint if exists branches_district_pair_fk;
alter table public.branches
  add constraint branches_district_pair_fk foreign key (province_code, district_code)
  references public.geo_districts(province_code, code) on update cascade on delete restrict not valid;

create index if not exists branch_partner_requests_geo_idx on public.branch_partner_requests(province_code, district_code, created_at desc);
create index if not exists branches_geo_idx on public.branches(province_code, district_code, public_status);

create table if not exists public.branch_access_invites (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  partner_request_id uuid references public.branch_partner_requests(id) on delete set null,
  email text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  role text not null default 'BRANCH_OWNER' check (role in ('BRANCH_OWNER','BRANCH_MANAGER','BRANCH_EDITOR')),
  status text not null default 'PENDING' check (status in ('PENDING','SENT','LINKED','ACCEPTED','FAILED','REVOKED')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  linked_at timestamptz,
  accepted_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_access_invites_email_chk check (email = lower(btrim(email)) and char_length(email) between 3 and 160)
);
create unique index if not exists branch_access_invites_active_email_uidx
  on public.branch_access_invites(branch_id, email)
  where status in ('PENDING','SENT','LINKED','ACCEPTED');
create index if not exists branch_access_invites_status_idx on public.branch_access_invites(status, created_at desc);

alter table public.branch_access_invites enable row level security;
revoke all on public.branch_access_invites from anon;
grant select on public.branch_access_invites to authenticated;
revoke insert, update, delete on public.branch_access_invites from authenticated;

drop policy if exists branch_access_invites_admin_read on public.branch_access_invites;
create policy branch_access_invites_admin_read
on public.branch_access_invites for select to authenticated
using ((select private.can_manage_team()) or (select private.can_manage_operations()));

create or replace function public.link_branch_owner_by_email(
  p_branch_id uuid,
  p_email text,
  p_partner_request_id uuid default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_id uuid;
  v_invite_id uuid;
begin
  if p_branch_id is null or v_email = '' or position('@' in v_email) < 2 then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_OWNER_EMAIL';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception using errcode = '23503', message = 'BRANCH_NOT_FOUND';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  order by u.created_at asc
  limit 1;

  insert into public.branch_access_invites(
    branch_id, partner_request_id, email, auth_user_id, role, status,
    invited_by, invited_at, linked_at, metadata
  ) values (
    p_branch_id, p_partner_request_id, v_email, v_user_id, 'BRANCH_OWNER',
    case when v_user_id is null then 'PENDING' else 'LINKED' end,
    p_actor, now(), case when v_user_id is null then null else now() end,
    jsonb_build_object('source','BRANCH_PARTNER_PROVISION','version','V163')
  )
  on conflict (branch_id, email) where status in ('PENDING','SENT','LINKED','ACCEPTED')
  do update set
    partner_request_id = coalesce(excluded.partner_request_id, public.branch_access_invites.partner_request_id),
    auth_user_id = coalesce(excluded.auth_user_id, public.branch_access_invites.auth_user_id),
    invited_by = coalesce(excluded.invited_by, public.branch_access_invites.invited_by),
    invited_at = coalesce(public.branch_access_invites.invited_at, now()),
    linked_at = case when excluded.auth_user_id is not null then coalesce(public.branch_access_invites.linked_at, now()) else public.branch_access_invites.linked_at end,
    status = case when excluded.auth_user_id is not null then 'LINKED' else public.branch_access_invites.status end,
    updated_at = now()
  returning id into v_invite_id;

  if v_user_id is not null then
    insert into public.branch_memberships(branch_id, user_id, role, is_active, invited_email)
    values (p_branch_id, v_user_id, 'BRANCH_OWNER', true, v_email)
    on conflict (branch_id, user_id) do update set
      role = case when public.branch_memberships.role = 'BRANCH_OWNER' then public.branch_memberships.role else 'BRANCH_OWNER' end,
      is_active = true,
      invited_email = v_email,
      updated_at = now();
  end if;

  return jsonb_build_object(
    'inviteId', v_invite_id,
    'branchId', p_branch_id,
    'email', v_email,
    'userId', v_user_id,
    'membershipLinked', v_user_id is not null
  );
end;
$$;

revoke all on function public.link_branch_owner_by_email(uuid,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.link_branch_owner_by_email(uuid,text,uuid,uuid) to service_role;

create or replace function public.mark_branch_invite_delivery(
  p_invite_id uuid,
  p_status text,
  p_auth_user_id uuid default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_status not in ('SENT','LINKED','FAILED','REVOKED') then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_INVITE_STATUS';
  end if;
  update public.branch_access_invites
  set status = p_status,
      auth_user_id = coalesce(p_auth_user_id, auth_user_id),
      linked_at = case when p_status = 'LINKED' then coalesce(linked_at, now()) else linked_at end,
      last_error = left(nullif(p_error,''), 500),
      updated_at = now()
  where id = p_invite_id;
end;
$$;
revoke all on function public.mark_branch_invite_delivery(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.mark_branch_invite_delivery(uuid,text,uuid,text) to service_role;

create or replace function private.sync_provisioned_branch_geo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.provisioned_branch_id is not null and
     (old.provisioned_branch_id is distinct from new.provisioned_branch_id or
      old.province_code is distinct from new.province_code or
      old.district_code is distinct from new.district_code) then
    update public.branches
    set province_code = new.province_code,
        district_code = new.district_code,
        city = coalesce((select gp.name from public.geo_provinces gp where gp.code = new.province_code), new.city, city),
        district = coalesce((select gd.name from public.geo_districts gd where gd.code = new.district_code), new.district, district),
        updated_at = now()
    where id = new.provisioned_branch_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_provisioned_branch_geo() from public, anon, authenticated;

drop trigger if exists branch_partner_sync_provisioned_geo on public.branch_partner_requests;
create trigger branch_partner_sync_provisioned_geo
after update of provisioned_branch_id, province_code, district_code on public.branch_partner_requests
for each row execute function private.sync_provisioned_branch_geo();

comment on table public.geo_provinces is 'Persisted Turkish province directory used by branch/application forms. Source provenance is retained per row.';
comment on table public.geo_districts is 'Persisted Turkish district directory linked to provinces and used for validated branch geography.';
comment on table public.branch_access_invites is 'Durable lifecycle of branch-owner portal invitations and membership linkage.';
