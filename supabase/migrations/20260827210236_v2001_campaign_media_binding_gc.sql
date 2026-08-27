create or replace function private.cleanup_campaign_cover_assets_v199()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_keep_path text;
begin
  if tg_op = 'UPDATE' and new.cover_image is not distinct from old.cover_image then
    return new;
  end if;

  if tg_op = 'UPDATE' and nullif(btrim(coalesce(new.cover_image, '')), '') is not null then
    v_keep_path := split_part(new.cover_image, '/storage/v1/object/public/catalog-media/', 2);
    v_keep_path := nullif(split_part(v_keep_path, '?', 1), '');

    if v_keep_path is not null then
      update public.media_assets
      set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'bindingState', 'BOUND',
        'boundAt', now(),
        'purpose', 'cover'
      )
      where bucket = 'catalog-media'
        and upper(coalesce(entity_type, '')) = 'CAMPAIGN'
        and entity_id = new.id::text
        and object_path = v_keep_path;
    end if;
  end if;

  delete from public.media_assets
  where bucket = 'catalog-media'
    and upper(coalesce(entity_type, '')) = 'CAMPAIGN'
    and entity_id = old.id::text
    and coalesce(metadata ->> 'purpose', '') = 'cover'
    and (v_keep_path is null or object_path <> v_keep_path);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.purge_unbound_campaign_media_v200(p_older_than interval default interval '30 minutes')
returns integer
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_count integer := 0;
begin
  with deleted as (
    delete from public.media_assets a
    where a.bucket = 'catalog-media'
      and upper(coalesce(a.entity_type, '')) = 'CAMPAIGN'
      and coalesce(a.metadata ->> 'purpose', '') = 'cover'
      and a.created_at < now() - greatest(p_older_than, interval '5 minutes')
      and not exists (
        select 1
        from public.campaigns c
        where c.id::text = a.entity_id
          and right(coalesce(c.cover_image, ''), length(a.object_path)) = a.object_path
      )
    returning 1
  )
  select count(*)::integer into v_count from deleted;
  return v_count;
end;
$$;

revoke all on function private.purge_unbound_campaign_media_v200(interval) from public, anon, authenticated;

do $$
declare v_job_id bigint;
begin
  for v_job_id in select jobid from cron.job where jobname = 'v200_campaign_media_gc' loop
    perform cron.unschedule(v_job_id);
  end loop;
  perform cron.schedule(
    'v200_campaign_media_gc',
    '*/10 * * * *',
    $cron$select private.purge_unbound_campaign_media_v200(interval '30 minutes');$cron$
  );
end
$$;

drop function if exists public.service_rollback_campaign_media_asset_v200(uuid,uuid,text);
