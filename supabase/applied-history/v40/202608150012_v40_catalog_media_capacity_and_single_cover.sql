create or replace function private.enforce_catalog_media_capacity()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_limit integer := 30;
  v_count integer := 0;
begin
  if new.is_active is not true then
    return new;
  end if;

  select greatest(1, coalesce(nullif(value->>'maxItemsPerEntity','')::integer, 30))
    into v_limit
  from public.site_config
  where key = 'catalog_media_policy';
  v_limit := coalesce(v_limit, 30);

  select count(*) into v_count
  from public.catalog_media cm
  where cm.is_active = true
    and cm.id <> new.id
    and (
      (new.vehicle_id is not null and cm.vehicle_id = new.vehicle_id)
      or (new.tour_id is not null and cm.tour_id = new.tour_id)
      or (new.blog_post_id is not null and cm.blog_post_id = new.blog_post_id)
    );

  if v_count >= v_limit then
    raise exception 'CATALOG_MEDIA_CAPACITY_EXCEEDED';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_catalog_media_capacity() from public, anon, authenticated;

drop trigger if exists trg_catalog_media_capacity on public.catalog_media;
create trigger trg_catalog_media_capacity
before insert or update of is_active, vehicle_id, tour_id, blog_post_id
on public.catalog_media
for each row execute function private.enforce_catalog_media_capacity();

create unique index if not exists catalog_media_vehicle_single_active_cover_idx
  on public.catalog_media(vehicle_id)
  where vehicle_id is not null and is_active = true and is_cover = true;
create unique index if not exists catalog_media_tour_single_active_cover_idx
  on public.catalog_media(tour_id)
  where tour_id is not null and is_active = true and is_cover = true;
create unique index if not exists catalog_media_blog_single_active_cover_idx
  on public.catalog_media(blog_post_id)
  where blog_post_id is not null and is_active = true and is_cover = true;
