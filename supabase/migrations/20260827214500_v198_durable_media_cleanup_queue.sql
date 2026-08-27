begin;

create table if not exists public.media_cleanup_jobs_v198 (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  object_path text not null,
  source_type text not null,
  source_id text,
  status text not null default 'PENDING',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint media_cleanup_jobs_v198_bucket_ck check (storage_bucket = 'catalog-media'),
  constraint media_cleanup_jobs_v198_path_ck check (length(btrim(object_path)) between 3 and 1000),
  constraint media_cleanup_jobs_v198_status_ck check (status in ('PENDING','COMPLETED')),
  constraint media_cleanup_jobs_v198_attempts_ck check (attempts between 0 and 1000000)
);

create unique index if not exists media_cleanup_jobs_v198_pending_uq
  on public.media_cleanup_jobs_v198(storage_bucket, object_path)
  where completed_at is null;
create index if not exists media_cleanup_jobs_v198_pending_idx
  on public.media_cleanup_jobs_v198(status, created_at)
  where completed_at is null;

alter table public.media_cleanup_jobs_v198 enable row level security;
revoke all on table public.media_cleanup_jobs_v198 from public, anon, authenticated;
grant select, insert, update, delete on table public.media_cleanup_jobs_v198 to service_role;

create or replace function private.enqueue_media_cleanup_v198(
  p_bucket text,
  p_object_path text,
  p_source_type text,
  p_source_id text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
  v_bucket text := btrim(coalesce(p_bucket,''));
  v_path text := btrim(coalesce(p_object_path,''));
begin
  if v_bucket <> 'catalog-media' or v_path = '' then
    return null;
  end if;

  select id into v_id
  from public.media_cleanup_jobs_v198
  where storage_bucket=v_bucket and object_path=v_path and completed_at is null
  order by created_at
  limit 1;

  if v_id is not null then return v_id; end if;

  begin
    insert into public.media_cleanup_jobs_v198(storage_bucket,object_path,source_type,source_id)
    values(v_bucket,v_path,left(coalesce(nullif(btrim(p_source_type),''),'UNKNOWN'),80),left(nullif(btrim(coalesce(p_source_id,'')),''),200))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id
    from public.media_cleanup_jobs_v198
    where storage_bucket=v_bucket and object_path=v_path and completed_at is null
    order by created_at
    limit 1;
  end;

  return v_id;
end;
$$;
revoke all on function private.enqueue_media_cleanup_v198(text,text,text,text) from public, anon, authenticated;

create or replace function private.queue_catalog_media_delete_v198()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.storage_bucket='catalog-media' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_media_cleanup_v198(old.storage_bucket,old.object_path,'CATALOG_MEDIA',old.id::text);
  end if;
  return old;
end;
$$;
revoke all on function private.queue_catalog_media_delete_v198() from public, anon, authenticated;

drop trigger if exists catalog_media_cleanup_queue_v198 on public.catalog_media;
create trigger catalog_media_cleanup_queue_v198
after delete on public.catalog_media
for each row execute function private.queue_catalog_media_delete_v198();

create or replace function private.queue_media_asset_delete_v198()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.bucket='catalog-media' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_media_cleanup_v198(old.bucket,old.object_path,coalesce(nullif(upper(btrim(old.entity_type)),''),'MEDIA_ASSET'),coalesce(old.entity_id,old.id::text));
  end if;
  return old;
end;
$$;
revoke all on function private.queue_media_asset_delete_v198() from public, anon, authenticated;

drop trigger if exists media_assets_cleanup_queue_v198 on public.media_assets;
create trigger media_assets_cleanup_queue_v198
after delete on public.media_assets
for each row execute function private.queue_media_asset_delete_v198();

create or replace function private.cleanup_campaign_media_assets_v198()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  delete from public.media_assets
  where bucket='catalog-media'
    and upper(coalesce(entity_type,''))='CAMPAIGN'
    and entity_id=old.id::text;
  return old;
end;
$$;
revoke all on function private.cleanup_campaign_media_assets_v198() from public, anon, authenticated;

drop trigger if exists campaigns_media_asset_cleanup_v198 on public.campaigns;
create trigger campaigns_media_asset_cleanup_v198
after delete on public.campaigns
for each row execute function private.cleanup_campaign_media_assets_v198();

comment on table public.media_cleanup_jobs_v198 is 'Durable control-plane queue for Storage object deletion after catalog/media metadata removal. Not client-readable.';

commit;
