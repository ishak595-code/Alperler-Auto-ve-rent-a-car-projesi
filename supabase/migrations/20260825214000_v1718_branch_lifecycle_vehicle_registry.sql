-- V171.8 Auditable branch lifecycle + private vehicle registry lookup.
-- Super Admin can suspend/close/reopen a branch with reason and audit history.
-- Branch members cannot mutate content while the branch is not ACTIVE.
-- Vehicle plate/VIN/registration references are admin-only registry fields and never part of public catalog projections.

alter table public.branches
  add column if not exists lifecycle_reason text,
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists status_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists suspended_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists reopened_at timestamptz;

alter table public.vehicles
  add column if not exists license_plate text,
  add column if not exists vin text,
  add column if not exists registration_reference text;

alter table public.vehicles drop constraint if exists vehicles_vin_format_v1718;
alter table public.vehicles add constraint vehicles_vin_format_v1718
  check (vin is null or upper(btrim(vin)) ~ '^[A-HJ-NPR-Z0-9]{17}$');

alter table public.vehicles drop constraint if exists vehicles_plate_length_v1718;
alter table public.vehicles add constraint vehicles_plate_length_v1718
  check (license_plate is null or char_length(regexp_replace(license_plate,'[^A-Za-z0-9]','','g')) between 5 and 12);

alter table public.vehicles drop constraint if exists vehicles_registration_reference_length_v1718;
alter table public.vehicles add constraint vehicles_registration_reference_length_v1718
  check (registration_reference is null or char_length(btrim(registration_reference)) between 3 and 80);

create index if not exists vehicles_license_plate_norm_v1718_idx
  on public.vehicles ((upper(regexp_replace(license_plate,'[^A-Za-z0-9]','','g'))))
  where license_plate is not null;
create unique index if not exists vehicles_vin_norm_v1718_uidx
  on public.vehicles ((upper(btrim(vin))))
  where vin is not null;
create index if not exists vehicles_registration_ref_norm_v1718_idx
  on public.vehicles ((upper(regexp_replace(registration_reference,'[^A-Za-z0-9]','','g'))))
  where registration_reference is not null;
create index if not exists vehicles_created_at_v1718_idx on public.vehicles(created_at desc);
create index if not exists branches_status_changed_at_v1718_idx on public.branches(status_changed_at desc);

create or replace function public.can_operate_branch_lifecycle_v1718(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_catalog
as $$
  select exists(
    select 1 from public.branches b
    where b.id=p_branch_id and b.is_active=true and b.public_status='ACTIVE'
  );
$$;
revoke all on function public.can_operate_branch_lifecycle_v1718(uuid) from public,anon;
grant execute on function public.can_operate_branch_lifecycle_v1718(uuid) to authenticated,service_role;

create or replace function public.admin_set_branch_lifecycle_v1718(
  p_branch_id uuid,
  p_status text,
  p_reason text default null
)
returns public.branches
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_before public.branches%rowtype;
  v_after public.branches%rowtype;
  v_status text:=upper(coalesce(btrim(p_status),''));
  v_reason text:=nullif(left(btrim(coalesce(p_reason,'')),500),'');
begin
  if not (private.can_manage_settings() or private.can_manage_team()) then
    raise exception using errcode='42501',message='BRANCH_LIFECYCLE_ADMIN_REQUIRED';
  end if;
  if v_status not in ('ACTIVE','SUSPENDED','CLOSED','DRAFT') then
    raise exception using errcode='22023',message='INVALID_BRANCH_LIFECYCLE_STATUS';
  end if;
  if v_status in ('SUSPENDED','CLOSED') and v_reason is null then
    raise exception using errcode='23514',message='BRANCH_LIFECYCLE_REASON_REQUIRED';
  end if;

  select * into v_before from public.branches where id=p_branch_id for update;
  if not found then raise exception using errcode='P0002',message='BRANCH_NOT_FOUND'; end if;

  update public.branches b
  set public_status=v_status,
      is_active=(v_status='ACTIVE'),
      lifecycle_reason=case when v_status='ACTIVE' then null else v_reason end,
      status_changed_at=now(),
      status_changed_by=auth.uid(),
      suspended_at=case when v_status='SUSPENDED' then now() else b.suspended_at end,
      closed_at=case when v_status='CLOSED' then now() else b.closed_at end,
      reopened_at=case when v_status='ACTIVE' and (v_before.public_status is distinct from 'ACTIVE' or v_before.is_active is not true) then now() else b.reopened_at end,
      updated_at=now()
  where b.id=p_branch_id
  returning * into v_after;

  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    auth.uid(),
    'BRANCH_LIFECYCLE_'||v_status,
    'branch',
    p_branch_id::text,
    jsonb_build_object('public_status',v_before.public_status,'is_active',v_before.is_active,'lifecycle_reason',v_before.lifecycle_reason),
    jsonb_build_object('public_status',v_after.public_status,'is_active',v_after.is_active,'lifecycle_reason',v_after.lifecycle_reason),
    jsonb_build_object('source','super_admin_v1718','reason',v_reason,'status_changed_at',v_after.status_changed_at)
  );
  return v_after;
end;
$$;
revoke all on function public.admin_set_branch_lifecycle_v1718(uuid,text,text) from public,anon;
grant execute on function public.admin_set_branch_lifecycle_v1718(uuid,text,text) to authenticated,service_role;

-- Closed/suspended branches remain readable to their members for historical context,
-- but branch-owned mutations are blocked until Super Admin reopens the branch.
drop policy if exists branches_branch_member_update on public.branches;
create policy branches_branch_member_update on public.branches
for update to authenticated
using (can_manage_branch(id) and public.can_operate_branch_lifecycle_v1718(id))
with check (can_manage_branch(id) and public.can_operate_branch_lifecycle_v1718(id) and public.can_operate_branch_subscription(id));

drop policy if exists vehicles_branch_member_insert on public.vehicles;
create policy vehicles_branch_member_insert on public.vehicles
for insert to authenticated
with check (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists vehicles_branch_member_update on public.vehicles;
create policy vehicles_branch_member_update on public.vehicles
for update to authenticated
using (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
)
with check (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists tours_branch_member_insert on public.tours;
create policy tours_branch_member_insert on public.tours
for insert to authenticated
with check (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists tours_branch_member_update on public.tours;
create policy tours_branch_member_update on public.tours
for update to authenticated
using (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
)
with check (
  branch_id is not null and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_lifecycle_v1718(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

create or replace function public.can_manage_catalog_media_owner_v1716(
  p_branch_id uuid,
  p_vehicle_id uuid,
  p_tour_id uuid,
  p_blog_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select
    private.can_manage_content()
    or (p_branch_id is not null and can_manage_branch(p_branch_id) and public.can_operate_branch_lifecycle_v1718(p_branch_id) and public.can_operate_branch_subscription(p_branch_id))
    or (p_vehicle_id is not null and exists(
      select 1 from public.vehicles v
      where v.id=p_vehicle_id and v.branch_id is not null and v.listing_origin='BRANCH'
        and can_manage_branch(v.branch_id) and public.can_operate_branch_lifecycle_v1718(v.branch_id) and public.can_operate_branch_subscription(v.branch_id)
    ))
    or (p_tour_id is not null and exists(
      select 1 from public.tours t
      where t.id=p_tour_id and t.branch_id is not null and t.listing_origin='BRANCH'
        and can_manage_branch(t.branch_id) and public.can_operate_branch_lifecycle_v1718(t.branch_id) and public.can_operate_branch_subscription(t.branch_id)
    ));
$$;

-- Admin-only normalized search RPC. Identifiers are not exposed to anon/authenticated public catalog readers.
create or replace function public.admin_search_vehicle_registry_v1718(
  p_query text default null,
  p_branch_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100
)
returns table(
  id uuid,
  stock_code text,
  brand text,
  model text,
  model_year integer,
  category text,
  publication_status text,
  branch_id uuid,
  branch_name text,
  license_plate text,
  vin text,
  registration_reference text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_q text:=upper(regexp_replace(coalesce(p_query,''),'[^A-Za-z0-9]','','g'));
  v_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
begin
  if not (private.can_manage_content() or private.can_manage_operations() or private.can_manage_settings()) then
    raise exception using errcode='42501',message='VEHICLE_REGISTRY_ADMIN_REQUIRED';
  end if;
  return query
  select v.id,v.stock_code,v.brand,v.model,v.model_year,v.category,v.publication_status,v.branch_id,b.name,
         v.license_plate,v.vin,v.registration_reference,v.created_at,v.updated_at
  from public.vehicles v
  left join public.branches b on b.id=v.branch_id
  where (p_branch_id is null or v.branch_id=p_branch_id)
    and (p_from is null or v.created_at>=p_from)
    and (p_to is null or v.created_at<p_to)
    and (
      v_q=''
      or upper(regexp_replace(coalesce(v.license_plate,''),'[^A-Za-z0-9]','','g')) like '%'||v_q||'%'
      or upper(regexp_replace(coalesce(v.vin,''),'[^A-Za-z0-9]','','g')) like '%'||v_q||'%'
      or upper(regexp_replace(coalesce(v.registration_reference,''),'[^A-Za-z0-9]','','g')) like '%'||v_q||'%'
      or upper(regexp_replace(coalesce(v.stock_code,''),'[^A-Za-z0-9]','','g')) like '%'||v_q||'%'
      or upper(regexp_replace(coalesce(v.brand,'')||coalesce(v.model,''),'[^A-Za-z0-9]','','g')) like '%'||v_q||'%'
    )
  order by v.updated_at desc
  limit v_limit;
end;
$$;
revoke all on function public.admin_search_vehicle_registry_v1718(text,uuid,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.admin_search_vehicle_registry_v1718(text,uuid,timestamptz,timestamptz,integer) to authenticated,service_role;

comment on function public.admin_set_branch_lifecycle_v1718(uuid,text,text) is 'V171.8 auditable Super Admin branch open/suspend/close/reopen control.';
comment on function public.admin_search_vehicle_registry_v1718(text,uuid,timestamptz,timestamptz,integer) is 'V171.8 admin-only vehicle registry lookup by plate, VIN/chassis, registration reference, stock code and date.';