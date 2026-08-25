-- V171.6 Branch-scoped canonical catalog media authorization
-- Branch members may manage only media owned by their branch, branch vehicles or branch tours.

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
    or (p_branch_id is not null and can_manage_branch(p_branch_id) and public.can_operate_branch_subscription(p_branch_id))
    or (p_vehicle_id is not null and exists(
      select 1 from public.vehicles v
      where v.id=p_vehicle_id and v.branch_id is not null and v.listing_origin='BRANCH'
        and can_manage_branch(v.branch_id) and public.can_operate_branch_subscription(v.branch_id)
    ))
    or (p_tour_id is not null and exists(
      select 1 from public.tours t
      where t.id=p_tour_id and t.branch_id is not null and t.listing_origin='BRANCH'
        and can_manage_branch(t.branch_id) and public.can_operate_branch_subscription(t.branch_id)
    ));
$$;
revoke all on function public.can_manage_catalog_media_owner_v1716(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.can_manage_catalog_media_owner_v1716(uuid,uuid,uuid,uuid) to authenticated,service_role;

create policy catalog_media_branch_member_read_v1716 on public.catalog_media
for select to authenticated
using (public.can_manage_catalog_media_owner_v1716(branch_id,vehicle_id,tour_id,blog_post_id));

create policy catalog_media_branch_member_insert_v1716 on public.catalog_media
for insert to authenticated
with check (public.can_manage_catalog_media_owner_v1716(branch_id,vehicle_id,tour_id,blog_post_id));

create policy catalog_media_branch_member_update_v1716 on public.catalog_media
for update to authenticated
using (public.can_manage_catalog_media_owner_v1716(branch_id,vehicle_id,tour_id,blog_post_id))
with check (public.can_manage_catalog_media_owner_v1716(branch_id,vehicle_id,tour_id,blog_post_id));

create policy catalog_media_branch_member_delete_v1716 on public.catalog_media
for delete to authenticated
using (public.can_manage_catalog_media_owner_v1716(branch_id,vehicle_id,tour_id,blog_post_id));

create or replace function public.set_catalog_media_cover(p_media_id uuid)
returns void
language plpgsql
set search_path=pg_catalog,public,private
as $$
declare media_row public.catalog_media%rowtype;
begin
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then raise exception using errcode='P0002',message='CATALOG_MEDIA_NOT_FOUND'; end if;
  if not public.can_manage_catalog_media_owner_v1716(media_row.branch_id,media_row.vehicle_id,media_row.tour_id,media_row.blog_post_id) then
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

grant execute on function public.set_catalog_media_cover(uuid) to authenticated;

create or replace function public.remove_catalog_media_safe(p_media_id uuid)
returns void
language plpgsql
set search_path=pg_catalog,public,private
as $$
declare
  media_row public.catalog_media%rowtype;
  replacement_id uuid;
  live_owner boolean:=false;
  remaining_images integer:=0;
begin
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then return; end if;
  if not public.can_manage_catalog_media_owner_v1716(media_row.branch_id,media_row.vehicle_id,media_row.tour_id,media_row.blog_post_id) then
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
grant execute on function public.remove_catalog_media_safe(uuid) to authenticated;

create or replace function public.branch_id_from_catalog_storage_name(p_name text)
returns uuid
language plpgsql
immutable
set search_path=storage,pg_catalog
as $$
declare parts text[];
begin
  parts:=storage.foldername(p_name);
  if coalesce(parts[1],'')<>'branch' or parts[2] is null then return null; end if;
  begin return parts[2]::uuid; exception when others then return null; end;
end;
$$;

drop policy if exists catalog_media_objects_branch_insert_v1716 on storage.objects;
create policy catalog_media_objects_branch_insert_v1716 on storage.objects
for insert to authenticated
with check (bucket_id='catalog-media' and public.branch_id_from_catalog_storage_name(name) is not null and can_manage_branch(public.branch_id_from_catalog_storage_name(name)) and public.can_operate_branch_subscription(public.branch_id_from_catalog_storage_name(name)));

drop policy if exists catalog_media_objects_branch_update_v1716 on storage.objects;
create policy catalog_media_objects_branch_update_v1716 on storage.objects
for update to authenticated
using (bucket_id='catalog-media' and public.branch_id_from_catalog_storage_name(name) is not null and can_manage_branch(public.branch_id_from_catalog_storage_name(name)))
with check (bucket_id='catalog-media' and public.branch_id_from_catalog_storage_name(name) is not null and can_manage_branch(public.branch_id_from_catalog_storage_name(name)) and public.can_operate_branch_subscription(public.branch_id_from_catalog_storage_name(name)));

drop policy if exists catalog_media_objects_branch_delete_v1716 on storage.objects;
create policy catalog_media_objects_branch_delete_v1716 on storage.objects
for delete to authenticated
using (bucket_id='catalog-media' and public.branch_id_from_catalog_storage_name(name) is not null and can_manage_branch(public.branch_id_from_catalog_storage_name(name)));

comment on function public.can_manage_catalog_media_owner_v1716(uuid,uuid,uuid,uuid) is 'V171.6 authoritative branch/content ownership check for catalog_media RLS and media RPCs.';
