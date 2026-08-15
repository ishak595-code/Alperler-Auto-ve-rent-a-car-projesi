-- V54 security advisor hardening
-- Keep media mutations atomic while executing with the caller's RLS context.

create or replace function public.set_catalog_media_cover(p_media_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  media_row public.catalog_media%rowtype;
begin
  if not private.has_permission('content') then
    raise exception using errcode = '42501', message = 'CATALOG_MEDIA_CONTENT_PERMISSION_REQUIRED';
  end if;

  select * into media_row
  from public.catalog_media
  where id = p_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'CATALOG_MEDIA_NOT_FOUND';
  end if;
  if media_row.kind <> 'IMAGE' or media_row.is_active is not true then
    raise exception using errcode = '23514', message = 'CATALOG_COVER_REQUIRES_ACTIVE_IMAGE';
  end if;

  if media_row.vehicle_id is not null then
    update public.catalog_media set is_cover = false
    where vehicle_id = media_row.vehicle_id and is_cover = true and id <> media_row.id;
  elsif media_row.tour_id is not null then
    update public.catalog_media set is_cover = false
    where tour_id = media_row.tour_id and is_cover = true and id <> media_row.id;
  elsif media_row.blog_post_id is not null then
    update public.catalog_media set is_cover = false
    where blog_post_id = media_row.blog_post_id and is_cover = true and id <> media_row.id;
  else
    raise exception using errcode = '23514', message = 'CATALOG_MEDIA_OWNER_MISSING';
  end if;

  update public.catalog_media set is_cover = true where id = media_row.id;
end;
$$;

create or replace function public.remove_catalog_media_safe(p_media_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  media_row public.catalog_media%rowtype;
  replacement_id uuid;
  live_owner boolean := false;
  remaining_images integer := 0;
begin
  if not private.has_permission('content') then
    raise exception using errcode = '42501', message = 'CATALOG_MEDIA_CONTENT_PERMISSION_REQUIRED';
  end if;

  select * into media_row
  from public.catalog_media
  where id = p_media_id
  for update;
  if not found then return; end if;

  if media_row.vehicle_id is not null then
    select exists(
      select 1 from public.vehicles
      where id = media_row.vehicle_id and publication_status in ('PUBLISHED','SCHEDULED') and is_active = true
    ) into live_owner;
    if media_row.kind = 'IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media
      where vehicle_id = media_row.vehicle_id and id <> media_row.id and kind = 'IMAGE' and is_active = true;
      if live_owner and remaining_images < 1 then raise exception using errcode = '23514', message = 'CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then
        select id into replacement_id from public.catalog_media
        where vehicle_id = media_row.vehicle_id and id <> media_row.id and kind = 'IMAGE' and is_active = true
        order by sort_order asc, created_at asc limit 1;
      end if;
    end if;
  elsif media_row.tour_id is not null then
    select exists(
      select 1 from public.tours
      where id = media_row.tour_id and publication_status in ('PUBLISHED','SCHEDULED') and is_active = true
    ) into live_owner;
    if media_row.kind = 'IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media
      where tour_id = media_row.tour_id and id <> media_row.id and kind = 'IMAGE' and is_active = true;
      if live_owner and remaining_images < 1 then raise exception using errcode = '23514', message = 'CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then
        select id into replacement_id from public.catalog_media
        where tour_id = media_row.tour_id and id <> media_row.id and kind = 'IMAGE' and is_active = true
        order by sort_order asc, created_at asc limit 1;
      end if;
    end if;
  elsif media_row.blog_post_id is not null then
    select exists(
      select 1 from public.blog_posts
      where id = media_row.blog_post_id and status = 'PUBLISHED'
    ) into live_owner;
    if media_row.kind = 'IMAGE' and media_row.is_active then
      select count(*) into remaining_images from public.catalog_media
      where blog_post_id = media_row.blog_post_id and id <> media_row.id and kind = 'IMAGE' and is_active = true;
      if live_owner and remaining_images < 1 then raise exception using errcode = '23514', message = 'CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
      if live_owner and media_row.is_cover then
        select id into replacement_id from public.catalog_media
        where blog_post_id = media_row.blog_post_id and id <> media_row.id and kind = 'IMAGE' and is_active = true
        order by sort_order asc, created_at asc limit 1;
      end if;
    end if;
  end if;

  delete from public.catalog_media where id = media_row.id;
  if replacement_id is not null then
    update public.catalog_media set is_cover = true where id = replacement_id;
  end if;
end;
$$;

revoke all on function public.set_catalog_media_cover(uuid) from public, anon;
revoke all on function public.remove_catalog_media_safe(uuid) from public, anon;
grant execute on function public.set_catalog_media_cover(uuid) to authenticated;
grant execute on function public.remove_catalog_media_safe(uuid) to authenticated;
