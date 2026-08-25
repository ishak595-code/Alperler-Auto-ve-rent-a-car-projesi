-- V171 Branch Studio + Dynamic Media
-- Reuse the canonical catalog-media pipeline for branch photos/videos.
-- Existing public branches are not retroactively hidden; future activation/publication transitions require complete truth data.

alter table public.catalog_media
  add column if not exists branch_id uuid references public.branches(id) on delete cascade;

alter table public.catalog_media
  drop constraint if exists catalog_media_one_owner;
alter table public.catalog_media
  add constraint catalog_media_one_owner
  check (
    ((vehicle_id is not null)::integer
    + (tour_id is not null)::integer
    + (blog_post_id is not null)::integer
    + (branch_id is not null)::integer) = 1
  );

alter table public.catalog_media
  drop constraint if exists catalog_vehicle_tour_media_storage_only;
alter table public.catalog_media
  drop constraint if exists catalog_business_media_storage_only;
alter table public.catalog_media
  add constraint catalog_business_media_storage_only
  check (
    (vehicle_id is null and tour_id is null and branch_id is null)
    or is_active = false
    or (storage_bucket is not null and object_path is not null and external_url is null)
  );

create index if not exists catalog_media_branch_sort_idx
  on public.catalog_media(branch_id,sort_order)
  where branch_id is not null and is_active=true;

create unique index if not exists catalog_media_branch_single_active_cover_idx
  on public.catalog_media(branch_id)
  where branch_id is not null and is_active=true and is_cover=true and kind='IMAGE';

create or replace function public.set_catalog_media_cover(p_media_id uuid)
returns void
language plpgsql
set search_path=pg_catalog,public,private
as $$
declare media_row public.catalog_media%rowtype;
begin
  if not private.can_manage_content() then
    raise exception using errcode='42501',message='CATALOG_MEDIA_CONTENT_PERMISSION_REQUIRED';
  end if;
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then raise exception using errcode='P0002',message='CATALOG_MEDIA_NOT_FOUND'; end if;
  if media_row.kind<>'IMAGE' or media_row.is_active is not true then
    raise exception using errcode='23514',message='CATALOG_COVER_REQUIRES_ACTIVE_IMAGE';
  end if;
  if media_row.vehicle_id is not null then
    update public.catalog_media set is_cover=false where vehicle_id=media_row.vehicle_id and is_cover=true and id<>media_row.id;
  elsif media_row.tour_id is not null then
    update public.catalog_media set is_cover=false where tour_id=media_row.tour_id and is_cover=true and id<>media_row.id;
  elsif media_row.blog_post_id is not null then
    update public.catalog_media set is_cover=false where blog_post_id=media_row.blog_post_id and is_cover=true and id<>media_row.id;
  elsif media_row.branch_id is not null then
    update public.catalog_media set is_cover=false where branch_id=media_row.branch_id and is_cover=true and id<>media_row.id;
  else
    raise exception using errcode='23514',message='CATALOG_MEDIA_OWNER_MISSING';
  end if;
  update public.catalog_media set is_cover=true,is_active=true where id=media_row.id;
end;
$$;

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
  if not private.can_manage_content() then
    raise exception using errcode='42501',message='CATALOG_MEDIA_CONTENT_PERMISSION_REQUIRED';
  end if;
  select * into media_row from public.catalog_media where id=p_media_id for update;
  if not found then return; end if;

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

create or replace function public.sync_branch_hero_from_media_v171()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
declare
  v_branch_id uuid;
  v_path text;
begin
  if tg_op='DELETE' then
    v_branch_id:=old.branch_id;
  else
    v_branch_id:=new.branch_id;
  end if;
  if v_branch_id is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  select case
    when cm.storage_bucket='catalog-media' and cm.object_path is not null then '/catalog-media/'||cm.object_path
    else cm.external_url
  end into v_path
  from public.catalog_media cm
  where cm.branch_id=v_branch_id and cm.kind='IMAGE' and cm.is_active=true and cm.is_cover=true
  order by cm.sort_order,cm.created_at
  limit 1;

  update public.branches b
  set hero_image=v_path,updated_at=now()
  where b.id=v_branch_id and b.hero_image is distinct from v_path;

  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists catalog_media_branch_hero_sync_v171 on public.catalog_media;
create trigger catalog_media_branch_hero_sync_v171
after insert or update of is_cover,is_active,object_path,external_url,branch_id or delete
on public.catalog_media
for each row execute function public.sync_branch_hero_from_media_v171();

create or replace function public.enforce_branch_publication_integrity_v171()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
declare v_cover_count integer:=0;
begin
  if new.is_active is not true or new.public_status<>'ACTIVE' then return new; end if;
  if coalesce(trim(new.slug),'')='' then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:SLUG_REQUIRED'; end if;
  if coalesce(trim(new.name),'')='' or coalesce(trim(new.city),'')='' or coalesce(trim(new.district),'')='' then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:IDENTITY_REQUIRED'; end if;
  if coalesce(trim(new.address_line),'')='' or coalesce(trim(new.phone),'')='' or coalesce(trim(new.email),'')='' then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:CONTACT_REQUIRED'; end if;
  if length(coalesce(trim(new.public_description),''))<40 then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:DESCRIPTION_REQUIRED'; end if;
  if jsonb_typeof(coalesce(new.services,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(new.services,'[]'::jsonb))<1 then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:SERVICES_REQUIRED'; end if;
  if jsonb_typeof(coalesce(new.opening_hours,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(new.opening_hours,'[]'::jsonb))<1 then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:WORKING_HOURS_REQUIRED'; end if;
  if coalesce(trim(new.map_url),'')='' and (new.latitude is null or new.longitude is null) then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:MAP_REQUIRED'; end if;
  select count(*) into v_cover_count from public.catalog_media where branch_id=new.id and kind='IMAGE' and is_active=true and is_cover=true;
  if v_cover_count<>1 then raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:COVER_REQUIRED'; end if;
  return new;
end;
$$;

drop trigger if exists branches_publication_integrity_v171 on public.branches;
create trigger branches_publication_integrity_v171
before insert or update of public_status,is_active
on public.branches
for each row execute function public.enforce_branch_publication_integrity_v171();

comment on function public.enforce_branch_publication_integrity_v171() is
'V171 activation gate. New ACTIVE public branches require real contact, services, hours, map/location, description and exactly one active branch cover image.';