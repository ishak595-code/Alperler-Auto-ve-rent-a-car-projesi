begin;

-- V189 removes internal authorization helpers from the exposed public schema,
-- pins SECURITY DEFINER search_path, and preserves intentional self-service RPCs.

create or replace function private.can_operate_branch_lifecycle_v189(p_branch_id uuid)
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
      and b.is_active = true
      and b.public_status = 'ACTIVE'
  );
$$;
revoke all on function private.can_operate_branch_lifecycle_v189(uuid) from public, anon;
grant execute on function private.can_operate_branch_lifecycle_v189(uuid) to authenticated;

create or replace function private.can_operate_branch_subscription_v189(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_manage_content()
    or private.can_manage_finance()
    or exists (
      select 1
      from public.branch_subscriptions s
      join public.branch_subscription_plans p on p.id = s.plan_id
      where s.branch_id = p_branch_id
        and p.is_active = true
        and (
          s.is_complimentary = true
          or coalesce(s.price_override, p.monthly_fee) = 0
          or s.status in ('ACTIVE','TRIALING','EXEMPT')
          or (s.status = 'PAST_DUE' and s.grace_ends_at is not null and s.grace_ends_at > now())
        )
        and (
          s.status = 'EXEMPT'
          or s.current_period_end is null
          or s.current_period_end > now()
          or (s.grace_ends_at is not null and s.grace_ends_at > now())
          or coalesce(s.price_override, p.monthly_fee) = 0
        )
    );
$$;
revoke all on function private.can_operate_branch_subscription_v189(uuid) from public, anon;
grant execute on function private.can_operate_branch_subscription_v189(uuid) to authenticated;

create or replace function private.can_manage_catalog_media_owner_v189(
  p_branch_id uuid,
  p_vehicle_id uuid,
  p_tour_id uuid,
  p_blog_post_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_manage_content()
    or (
      p_branch_id is not null
      and public.can_manage_branch(p_branch_id)
      and private.can_operate_branch_lifecycle_v189(p_branch_id)
      and private.can_operate_branch_subscription_v189(p_branch_id)
    )
    or (
      p_vehicle_id is not null
      and exists (
        select 1
        from public.vehicles v
        where v.id = p_vehicle_id
          and v.branch_id is not null
          and v.listing_origin = 'BRANCH'
          and public.can_manage_branch(v.branch_id)
          and private.can_operate_branch_lifecycle_v189(v.branch_id)
          and private.can_operate_branch_subscription_v189(v.branch_id)
      )
    )
    or (
      p_tour_id is not null
      and exists (
        select 1
        from public.tours t
        where t.id = p_tour_id
          and t.branch_id is not null
          and t.listing_origin = 'BRANCH'
          and public.can_manage_branch(t.branch_id)
          and private.can_operate_branch_lifecycle_v189(t.branch_id)
          and private.can_operate_branch_subscription_v189(t.branch_id)
      )
    );
$$;
revoke all on function private.can_manage_catalog_media_owner_v189(uuid,uuid,uuid,uuid) from public, anon;
grant execute on function private.can_manage_catalog_media_owner_v189(uuid,uuid,uuid,uuid) to authenticated;

-- Branch lifecycle / catalog policies now use non-exposed private helpers.
drop policy if exists branches_authenticated_update_v188 on public.branches;
create policy branches_authenticated_update_v188
on public.branches for update to authenticated
using (
  private.can_manage_team()
  or (
    public.can_manage_branch(id)
    and private.can_operate_branch_lifecycle_v189(id)
  )
)
with check (
  private.can_manage_team()
  or (
    public.can_manage_branch(id)
    and private.can_operate_branch_lifecycle_v189(id)
    and private.can_operate_branch_subscription_v189(id)
  )
);

drop policy if exists catalog_media_authenticated_read_v188 on public.catalog_media;
create policy catalog_media_authenticated_read_v188
on public.catalog_media for select to authenticated
using (
  is_active = true
  or private.can_manage_content()
  or private.can_manage_catalog_media_owner_v189(branch_id, vehicle_id, tour_id, blog_post_id)
);

drop policy if exists catalog_media_branch_member_insert_v1716 on public.catalog_media;
create policy catalog_media_branch_member_insert_v1716
on public.catalog_media for insert to authenticated
with check (private.can_manage_catalog_media_owner_v189(branch_id, vehicle_id, tour_id, blog_post_id));

drop policy if exists catalog_media_branch_member_update_v1716 on public.catalog_media;
create policy catalog_media_branch_member_update_v1716
on public.catalog_media for update to authenticated
using (private.can_manage_catalog_media_owner_v189(branch_id, vehicle_id, tour_id, blog_post_id))
with check (private.can_manage_catalog_media_owner_v189(branch_id, vehicle_id, tour_id, blog_post_id));

drop policy if exists catalog_media_branch_member_delete_v1716 on public.catalog_media;
create policy catalog_media_branch_member_delete_v1716
on public.catalog_media for delete to authenticated
using (private.can_manage_catalog_media_owner_v189(branch_id, vehicle_id, tour_id, blog_post_id));

drop policy if exists vehicles_branch_member_insert on public.vehicles;
create policy vehicles_branch_member_insert
on public.vehicles for insert to authenticated
with check (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
  and private.can_operate_branch_subscription_v189(branch_id)
);

drop policy if exists vehicles_branch_member_update on public.vehicles;
create policy vehicles_branch_member_update
on public.vehicles for update to authenticated
using (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
)
with check (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
  and private.can_operate_branch_subscription_v189(branch_id)
);

drop policy if exists tours_branch_member_insert on public.tours;
create policy tours_branch_member_insert
on public.tours for insert to authenticated
with check (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
  and private.can_operate_branch_subscription_v189(branch_id)
);

drop policy if exists tours_branch_member_update on public.tours;
create policy tours_branch_member_update
on public.tours for update to authenticated
using (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
)
with check (
  branch_id is not null
  and listing_origin = 'BRANCH'
  and public.can_manage_branch(branch_id)
  and private.can_operate_branch_lifecycle_v189(branch_id)
  and private.can_operate_branch_subscription_v189(branch_id)
);

drop policy if exists catalog_media_objects_branch_insert_v1716 on storage.objects;
create policy catalog_media_objects_branch_insert_v1716
on storage.objects for insert to authenticated
with check (
  bucket_id = 'catalog-media'
  and public.branch_id_from_catalog_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_catalog_storage_name(name))
  and private.can_operate_branch_subscription_v189(public.branch_id_from_catalog_storage_name(name))
);

drop policy if exists catalog_media_objects_branch_update_v1716 on storage.objects;
create policy catalog_media_objects_branch_update_v1716
on storage.objects for update to authenticated
using (
  bucket_id = 'catalog-media'
  and public.branch_id_from_catalog_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_catalog_storage_name(name))
)
with check (
  bucket_id = 'catalog-media'
  and public.branch_id_from_catalog_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_catalog_storage_name(name))
  and private.can_operate_branch_subscription_v189(public.branch_id_from_catalog_storage_name(name))
);

-- Dependent database functions are repointed before retiring public helpers.
create or replace function public.enforce_branch_listing_review_v1712()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_requested text := upper(btrim(coalesce(new.publication_status,'DRAFT')));
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  if private.can_manage_content() then return new; end if;
  if not public.can_manage_branch(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_LISTING_PERMISSION_REQUIRED';
  end if;
  if not private.can_operate_branch_subscription_v189(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_SUBSCRIPTION_REQUIRED';
  end if;

  if tg_op='UPDATE' and old.publication_status in ('PUBLISHED','SCHEDULED') then
    new.publication_status := 'PENDING_REVIEW';
    new.published_at := null;
    new.scheduled_at := null;
    new.submitted_for_review_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_note := null;
    return new;
  end if;

  if v_requested in ('DRAFT','REJECTED') then
    new.publication_status := 'DRAFT';
    new.published_at := null;
    new.scheduled_at := null;
    new.submitted_for_review_at := null;
    return new;
  end if;

  new.publication_status := 'PENDING_REVIEW';
  new.published_at := null;
  new.scheduled_at := null;
  new.submitted_for_review_at := now();
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.review_note := null;
  return new;
end;
$$;

create or replace function public.remove_catalog_media_safe(p_media_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  media_row public.catalog_media%rowtype;
  replacement_id uuid;
  live_owner boolean := false;
  remaining_images integer := 0;
begin
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then return; end if;
  if not private.can_manage_catalog_media_owner_v189(media_row.branch_id,media_row.vehicle_id,media_row.tour_id,media_row.blog_post_id) then
    raise exception using errcode='42501',message='CATALOG_MEDIA_PERMISSION_REQUIRED';
  end if;

  if media_row.vehicle_id is not null then
    select exists(select 1 from public.vehicles where id=media_row.vehicle_id and publication_status in ('PUBLISHED','SCHEDULED') and is_active=true) into live_owner;
    if media_row.kind='IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media where vehicle_id=media_row.vehicle_id and id<>media_row.id and kind='IMAGE' and is_active=true;
      if live_owner and remaining_images<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then select id into replacement_id from public.catalog_media where vehicle_id=media_row.vehicle_id and id<>media_row.id and kind='IMAGE' and is_active=true order by sort_order,created_at limit 1; end if;
    end if;
  elsif media_row.tour_id is not null then
    select exists(select 1 from public.tours where id=media_row.tour_id and publication_status in ('PUBLISHED','SCHEDULED') and is_active=true) into live_owner;
    if media_row.kind='IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media where tour_id=media_row.tour_id and id<>media_row.id and kind='IMAGE' and is_active=true;
      if live_owner and remaining_images<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then select id into replacement_id from public.catalog_media where tour_id=media_row.tour_id and id<>media_row.id and kind='IMAGE' and is_active=true order by sort_order,created_at limit 1; end if;
    end if;
  elsif media_row.blog_post_id is not null then
    select exists(select 1 from public.blog_posts where id=media_row.blog_post_id and status='PUBLISHED') into live_owner;
    if media_row.kind='IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media where blog_post_id=media_row.blog_post_id and id<>media_row.id and kind='IMAGE' and is_active=true;
      if live_owner and remaining_images<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then select id into replacement_id from public.catalog_media where blog_post_id=media_row.blog_post_id and id<>media_row.id and kind='IMAGE' and is_active=true order by sort_order,created_at limit 1; end if;
    end if;
  elsif media_row.branch_id is not null then
    select exists(select 1 from public.branches where id=media_row.branch_id and public_status='ACTIVE' and is_active=true) into live_owner;
    if media_row.kind='IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media where branch_id=media_row.branch_id and id<>media_row.id and kind='IMAGE' and is_active=true;
      if live_owner and remaining_images<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then select id into replacement_id from public.catalog_media where branch_id=media_row.branch_id and id<>media_row.id and kind='IMAGE' and is_active=true order by sort_order,created_at limit 1; end if;
    end if;
  end if;

  delete from public.catalog_media where id=media_row.id;
  if replacement_id is not null then update public.catalog_media set is_cover=true where id=replacement_id; end if;
end;
$$;

create or replace function public.set_catalog_media_cover(p_media_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare media_row public.catalog_media%rowtype;
begin
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then raise exception using errcode='P0002',message='CATALOG_MEDIA_NOT_FOUND'; end if;
  if not private.can_manage_catalog_media_owner_v189(media_row.branch_id,media_row.vehicle_id,media_row.tour_id,media_row.blog_post_id) then
    raise exception using errcode='42501',message='CATALOG_MEDIA_PERMISSION_REQUIRED';
  end if;
  if media_row.kind<>'IMAGE' or media_row.is_active is not true then
    raise exception using errcode='23514',message='CATALOG_COVER_REQUIRES_ACTIVE_IMAGE';
  end if;
  if media_row.vehicle_id is not null then update public.catalog_media set is_cover=false where vehicle_id=media_row.vehicle_id and is_cover=true and id<>media_row.id;
  elsif media_row.tour_id is not null then update public.catalog_media set is_cover=false where tour_id=media_row.tour_id and is_cover=true and id<>media_row.id;
  elsif media_row.blog_post_id is not null then update public.catalog_media set is_cover=false where blog_post_id=media_row.blog_post_id and is_cover=true and id<>media_row.id;
  elsif media_row.branch_id is not null then update public.catalog_media set is_cover=false where branch_id=media_row.branch_id and is_cover=true and id<>media_row.id;
  else raise exception using errcode='23514',message='CATALOG_MEDIA_OWNER_MISSING'; end if;
  update public.catalog_media set is_cover=true,is_active=true where id=media_row.id;
end;
$$;

create or replace function public.my_branch_subscription_entitlements_v1714()
returns table(branch_id uuid, branch_name text, status text, plan_code text, plan_name text, effective_price numeric, currency text, current_period_end timestamptz, grace_ends_at timestamptz, can_operate boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.branch_id,b.name,s.status,p.code,p.name,
         case when s.is_complimentary then 0 else coalesce(s.price_override,p.monthly_fee) end,
         p.currency,s.current_period_end,s.grace_ends_at,
         private.can_operate_branch_subscription_v189(s.branch_id)
  from public.branch_subscriptions s
  join public.branch_subscription_plans p on p.id=s.plan_id
  join public.branches b on b.id=s.branch_id
  join public.branch_memberships m on m.branch_id=s.branch_id
  where m.user_id=auth.uid() and m.is_active=true
  order by b.name;
$$;

-- Pin every intentionally exposed SECURITY DEFINER self-service function.
alter function public.accept_customer_vault_terms() set search_path = '';
alter function public.claim_customer_referral(text) set search_path = '';
alter function public.claim_customer_referral_context(text,uuid,text) set search_path = '';
alter function public.customer_cancel_booking(text) set search_path = '';
alter function public.customer_lifetime_summary(uuid) set search_path = '';
alter function public.ensure_customer_profile() set search_path = '';
alter function public.get_or_create_customer_referral_code() set search_path = '';
alter function public.link_own_customer_booking(text) set search_path = '';
alter function public.my_branch_subscription_entitlements_v1714() set search_path = '';
alter function public.remove_customer_payment_method(uuid) set search_path = '';
alter function public.revoke_customer_vault_terms() set search_path = '';
alter function public.set_default_customer_payment_method(uuid) set search_path = '';

-- Remove implicit PUBLIC/anon execution. Preserve the existing authenticated API contract.
revoke execute on function public.accept_customer_vault_terms() from public, anon;
revoke execute on function public.claim_customer_referral(text) from public, anon;
revoke execute on function public.claim_customer_referral_context(text,uuid,text) from public, anon;
revoke execute on function public.customer_cancel_booking(text) from public, anon;
revoke execute on function public.customer_lifetime_summary(uuid) from public, anon;
revoke execute on function public.ensure_customer_profile() from public, anon;
revoke execute on function public.get_or_create_customer_referral_code() from public, anon;
revoke execute on function public.link_own_customer_booking(text) from public, anon;
revoke execute on function public.my_branch_subscription_entitlements_v1714() from public, anon;
revoke execute on function public.remove_customer_payment_method(uuid) from public, anon;
revoke execute on function public.revoke_customer_vault_terms() from public, anon;
revoke execute on function public.set_default_customer_payment_method(uuid) from public, anon;

grant execute on function public.accept_customer_vault_terms() to authenticated;
grant execute on function public.claim_customer_referral(text) to authenticated;
grant execute on function public.claim_customer_referral_context(text,uuid,text) to authenticated;
grant execute on function public.customer_cancel_booking(text) to authenticated;
grant execute on function public.customer_lifetime_summary(uuid) to authenticated;
grant execute on function public.ensure_customer_profile() to authenticated;
grant execute on function public.get_or_create_customer_referral_code() to authenticated;
grant execute on function public.link_own_customer_booking(text) to authenticated;
grant execute on function public.my_branch_subscription_entitlements_v1714() to authenticated;
grant execute on function public.remove_customer_payment_method(uuid) to authenticated;
grant execute on function public.revoke_customer_vault_terms() to authenticated;
grant execute on function public.set_default_customer_payment_method(uuid) to authenticated;

-- Preserve service-role access only where it existed before V189.
grant execute on function public.accept_customer_vault_terms() to service_role;
grant execute on function public.claim_customer_referral(text) to service_role;
grant execute on function public.claim_customer_referral_context(text,uuid,text) to service_role;
grant execute on function public.customer_cancel_booking(text) to service_role;
grant execute on function public.get_or_create_customer_referral_code() to service_role;
grant execute on function public.remove_customer_payment_method(uuid) to service_role;
grant execute on function public.revoke_customer_vault_terms() to service_role;
grant execute on function public.set_default_customer_payment_method(uuid) to service_role;
revoke execute on function public.customer_lifetime_summary(uuid) from service_role;
revoke execute on function public.ensure_customer_profile() from service_role;
revoke execute on function public.link_own_customer_booking(text) from service_role;
revoke execute on function public.my_branch_subscription_entitlements_v1714() from service_role;

-- Public internal helpers are no longer needed once every dependency is repointed.
drop function public.can_manage_catalog_media_owner_v1716(uuid,uuid,uuid,uuid);
drop function public.can_operate_branch_lifecycle_v1718(uuid);
drop function public.can_operate_branch_subscription(uuid);

commit;
