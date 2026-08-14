-- V37: keep the media library and the live catalog records in sync.
-- Cards/details continue to read vehicles.images/cover_image and tours.images/cover_image,
-- while video metadata is maintained automatically from catalog_media.

create or replace function private.catalog_media_public_url(
  p_storage_bucket text,
  p_object_path text,
  p_external_url text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(p_external_url, '') is not null then p_external_url
    when nullif(p_storage_bucket, '') is not null and nullif(p_object_path, '') is not null
      then 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/'
        || p_storage_bucket || '/' || p_object_path
    else null
  end;
$$;

create or replace function private.sync_catalog_media_parent(
  p_vehicle_id uuid default null,
  p_tour_id uuid default null,
  p_blog_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_images jsonb := '[]'::jsonb;
  v_videos jsonb := '[]'::jsonb;
  v_cover text;
begin
  if p_vehicle_id is not null then
    select
      coalesce(jsonb_agg(media_url order by is_cover desc, sort_order asc, created_at asc)
        filter (where kind = 'IMAGE' and media_url is not null), '[]'::jsonb),
      coalesce(jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'url', media_url,
          'posterUrl', poster_url,
          'title', nullif(alt_text, ''),
          'attribution', nullif(attribution, '')
        )) order by sort_order asc, created_at asc
      ) filter (where kind = 'VIDEO' and media_url is not null), '[]'::jsonb),
      (array_agg(media_url order by is_cover desc, sort_order asc, created_at asc)
        filter (where kind = 'IMAGE' and media_url is not null))[1]
    into v_images, v_videos, v_cover
    from (
      select cm.*,
        private.catalog_media_public_url(cm.storage_bucket, cm.object_path, cm.external_url) as media_url
      from public.catalog_media cm
      where cm.vehicle_id = p_vehicle_id and cm.is_active = true
    ) m;

    update public.vehicles
    set images = v_images,
        cover_image = v_cover,
        metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{videos}', v_videos, true),
        updated_at = now()
    where id = p_vehicle_id;
  end if;

  if p_tour_id is not null then
    v_images := '[]'::jsonb;
    v_videos := '[]'::jsonb;
    v_cover := null;

    select
      coalesce(jsonb_agg(media_url order by is_cover desc, sort_order asc, created_at asc)
        filter (where kind = 'IMAGE' and media_url is not null), '[]'::jsonb),
      coalesce(jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'url', media_url,
          'posterUrl', poster_url,
          'title', nullif(alt_text, ''),
          'attribution', nullif(attribution, '')
        )) order by sort_order asc, created_at asc
      ) filter (where kind = 'VIDEO' and media_url is not null), '[]'::jsonb),
      (array_agg(media_url order by is_cover desc, sort_order asc, created_at asc)
        filter (where kind = 'IMAGE' and media_url is not null))[1]
    into v_images, v_videos, v_cover
    from (
      select cm.*,
        private.catalog_media_public_url(cm.storage_bucket, cm.object_path, cm.external_url) as media_url
      from public.catalog_media cm
      where cm.tour_id = p_tour_id and cm.is_active = true
    ) m;

    update public.tours
    set images = v_images,
        cover_image = v_cover,
        metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{videos}', v_videos, true),
        updated_at = now()
    where id = p_tour_id;
  end if;

  if p_blog_post_id is not null then
    select (array_agg(media_url order by is_cover desc, sort_order asc, created_at asc)
      filter (where kind = 'IMAGE' and media_url is not null))[1]
    into v_cover
    from (
      select cm.*,
        private.catalog_media_public_url(cm.storage_bucket, cm.object_path, cm.external_url) as media_url
      from public.catalog_media cm
      where cm.blog_post_id = p_blog_post_id and cm.is_active = true
    ) m;

    update public.blog_posts
    set cover_image = coalesce(v_cover, cover_image),
        updated_at = now()
    where id = p_blog_post_id;
  end if;
end;
$$;

revoke all on function private.catalog_media_public_url(text,text,text) from public;
revoke all on function private.sync_catalog_media_parent(uuid,uuid,uuid) from public;

create or replace function private.catalog_media_parent_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform private.sync_catalog_media_parent(old.vehicle_id, old.tour_id, old.blog_post_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform private.sync_catalog_media_parent(new.vehicle_id, new.tour_id, new.blog_post_id);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.catalog_media_parent_sync_trigger() from public;

drop trigger if exists catalog_media_parent_sync on public.catalog_media;
create trigger catalog_media_parent_sync
after insert or update or delete on public.catalog_media
for each row execute function private.catalog_media_parent_sync_trigger();

-- Bring already existing media records into the live parent rows immediately.
do $$
declare r record;
begin
  for r in select distinct vehicle_id from public.catalog_media where vehicle_id is not null loop
    perform private.sync_catalog_media_parent(r.vehicle_id, null, null);
  end loop;
  for r in select distinct tour_id from public.catalog_media where tour_id is not null loop
    perform private.sync_catalog_media_parent(null, r.tour_id, null);
  end loop;
  for r in select distinct blog_post_id from public.catalog_media where blog_post_id is not null loop
    perform private.sync_catalog_media_parent(null, null, r.blog_post_id);
  end loop;
end $$;
