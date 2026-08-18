create or replace function public.sync_catalog_owner_media(p_vehicle_id uuid default null, p_tour_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_images jsonb;
  v_cover text;
begin
  if p_vehicle_id is not null then
    select
      coalesce(jsonb_agg(url order by sort_order, created_at), '[]'::jsonb),
      (array_agg(url order by is_cover desc, sort_order, created_at))[1]
    into v_images, v_cover
    from (
      select
        'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || object_path as url,
        is_cover,
        sort_order,
        created_at
      from public.catalog_media
      where vehicle_id = p_vehicle_id
        and kind = 'IMAGE'
        and is_active = true
        and storage_bucket is not null
        and object_path is not null
        and external_url is null
    ) media;

    update public.vehicles
    set images = coalesce(v_images, '[]'::jsonb),
        cover_image = v_cover,
        updated_at = now()
    where id = p_vehicle_id;
  end if;

  if p_tour_id is not null then
    select
      coalesce(jsonb_agg(url order by sort_order, created_at), '[]'::jsonb),
      (array_agg(url order by is_cover desc, sort_order, created_at))[1]
    into v_images, v_cover
    from (
      select
        'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || object_path as url,
        is_cover,
        sort_order,
        created_at
      from public.catalog_media
      where tour_id = p_tour_id
        and kind = 'IMAGE'
        and is_active = true
        and storage_bucket is not null
        and object_path is not null
        and external_url is null
    ) media;

    update public.tours
    set images = coalesce(v_images, '[]'::jsonb),
        cover_image = v_cover,
        updated_at = now()
    where id = p_tour_id;
  end if;
end;
$$;

create or replace function public.trg_sync_catalog_owner_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.sync_catalog_owner_media(old.vehicle_id, old.tour_id);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform public.sync_catalog_owner_media(new.vehicle_id, new.tour_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_catalog_media_owner_sync on public.catalog_media;
create trigger trg_catalog_media_owner_sync
after insert or update or delete on public.catalog_media
for each row execute function public.trg_sync_catalog_owner_media();

alter table public.catalog_media
  drop constraint if exists catalog_vehicle_tour_media_storage_only;
alter table public.catalog_media
  add constraint catalog_vehicle_tour_media_storage_only
  check (
    (vehicle_id is null and tour_id is null)
    or is_active = false
    or (
      storage_bucket is not null
      and object_path is not null
      and external_url is null
    )
  );

do $$
declare r record;
begin
  for r in select id from public.vehicles loop
    perform public.sync_catalog_owner_media(r.id, null);
  end loop;
  for r in select id from public.tours loop
    perform public.sync_catalog_owner_media(null, r.id);
  end loop;
end $$;
