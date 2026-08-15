create or replace function private.catalog_media_public_url(p_external_url text, p_bucket text, p_object_path text, p_poster_url text, p_kind text)
returns text
language sql
immutable
set search_path = private, public
as $$
  select case
    when p_kind = 'VIDEO' and nullif(p_poster_url, '') is not null then p_poster_url
    when nullif(p_external_url, '') is not null then p_external_url
    when nullif(p_bucket, '') is not null and nullif(p_object_path, '') is not null
      then 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || p_bucket || '/' || p_object_path
    else null
  end
$$;

create or replace function private.sync_catalog_media_cover()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_vehicle uuid;
  v_tour uuid;
  v_url text;
  v_replacement record;
begin
  if tg_op = 'DELETE' then
    v_vehicle := old.vehicle_id;
    v_tour := old.tour_id;
  else
    v_vehicle := new.vehicle_id;
    v_tour := new.tour_id;
  end if;

  if tg_op <> 'DELETE' and new.is_cover = true and new.is_active = true then
    v_url := private.catalog_media_public_url(new.external_url, new.storage_bucket, new.object_path, new.poster_url, new.kind);
    if new.kind = 'VIDEO' and nullif(new.poster_url, '') is null then
      raise exception 'VIDEO_COVER_REQUIRES_POSTER';
    end if;
    if v_url is null then
      raise exception 'COVER_MEDIA_URL_MISSING';
    end if;
    if v_vehicle is not null then
      update public.vehicles set cover_image = v_url, updated_at = now() where id = v_vehicle;
    elsif v_tour is not null then
      update public.tours set cover_image = v_url, updated_at = now() where id = v_tour;
    end if;
    return new;
  end if;

  if (tg_op = 'DELETE' and old.is_cover = true)
     or (tg_op = 'UPDATE' and old.is_cover = true and (new.is_cover = false or new.is_active = false)) then
    select cm.* into v_replacement
    from public.catalog_media cm
    where cm.is_active = true
      and ((v_vehicle is not null and cm.vehicle_id = v_vehicle) or (v_tour is not null and cm.tour_id = v_tour))
      and (cm.kind = 'IMAGE' or nullif(cm.poster_url, '') is not null)
      and (tg_op <> 'DELETE' or cm.id <> old.id)
    order by cm.is_cover desc, cm.sort_order asc, cm.created_at asc
    limit 1;

    if found then
      v_url := private.catalog_media_public_url(v_replacement.external_url, v_replacement.storage_bucket, v_replacement.object_path, v_replacement.poster_url, v_replacement.kind);
    else
      v_url := null;
    end if;

    if v_vehicle is not null then
      update public.vehicles set cover_image = v_url, updated_at = now() where id = v_vehicle;
    elsif v_tour is not null then
      update public.tours set cover_image = v_url, updated_at = now() where id = v_tour;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.catalog_media_public_url(text,text,text,text,text) from public, anon, authenticated;
revoke all on function private.sync_catalog_media_cover() from public, anon, authenticated;

drop trigger if exists trg_catalog_media_cover_sync on public.catalog_media;
create trigger trg_catalog_media_cover_sync
after insert or update of is_cover, is_active, external_url, storage_bucket, object_path, poster_url, kind or delete
on public.catalog_media
for each row execute function private.sync_catalog_media_cover();
