-- V249: Cloudinary media hosting (env-gated; Supabase Storage stays the fallback).
--
-- STATUS: NOT APPLIED. Written while the Supabase project returned HTTP 402 (free quota
-- exhausted until ~2026-10-18). Apply manually after the quota resets and BEFORE setting
-- CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET on Vercel. If the
-- variables are set first, the app detects INVALID_MEDIA_STORAGE, destroys the freshly
-- uploaded Cloudinary asset and falls back to Supabase Storage (nothing breaks).
--
-- Contract:
--   catalog_media.storage_bucket = 'cloudinary', object_path = <Cloudinary public_id>,
--   metadata.cloudinary = { cloudName, resourceType, version, ... }.
--   Delivery URLs (fixed widths only, never 16 breakpoints):
--     image  https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_1440/<public_id>
--     video  https://res.cloudinary.com/<cloud>/video/upload/q_auto,vc_auto/<public_id>.mp4
--   Existing 'catalog-media' rows are resolved by delegating to the untouched live
--   private.catalog_media_public_url(...) overloads, so their URLs stay byte-identical.
--
-- Changes:
--   1. media_cleanup_jobs_v198: bucket check allows 'cloudinary'; new resource_type column.
--   2. Delete triggers queue Cloudinary cleanup jobs (drained by /api/partner?op=cloudinary,
--      signed destroy via the Cloudinary API; the Supabase Edge drain only handles catalog-media).
--   3. URL helpers + the three projection syncs understand 'cloudinary'.
--   4. enforce_vehicle_media_storage_only accepts res.cloudinary.com image URLs.
--   5. service_catalog_media_create_v185 / service_register_media_asset_v185 accept
--      'cloudinary' rows under the server-signed alperler/catalog/<type>/<id>/ and
--      alperler/admin/ prefixes (the Storage ownership assertion stays for catalog-media).

begin;

-- 1. Durable cleanup queue ---------------------------------------------------------------
alter table public.media_cleanup_jobs_v198 add column if not exists resource_type text;
alter table public.media_cleanup_jobs_v198 drop constraint if exists media_cleanup_jobs_v198_bucket_ck;
alter table public.media_cleanup_jobs_v198
  add constraint media_cleanup_jobs_v198_bucket_ck check (storage_bucket in ('catalog-media','cloudinary'));
alter table public.media_cleanup_jobs_v198 drop constraint if exists media_cleanup_jobs_v198_resource_type_ck;
alter table public.media_cleanup_jobs_v198
  add constraint media_cleanup_jobs_v198_resource_type_ck check (resource_type is null or resource_type in ('image','video'));

create or replace function private.enqueue_cloudinary_cleanup_v249(
  p_public_id text,
  p_resource_type text,
  p_source_type text,
  p_source_id text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
  v_path text := btrim(coalesce(p_public_id,''));
  v_type text := case when lower(btrim(coalesce(p_resource_type,''))) = 'video' then 'video' else 'image' end;
begin
  if v_path = '' or length(v_path) > 400 or position('..' in v_path) > 0
     or v_path !~ '^alperler/[A-Za-z0-9_/-]+$' then
    return null;
  end if;

  select id into v_id
  from public.media_cleanup_jobs_v198
  where storage_bucket='cloudinary' and object_path=v_path and completed_at is null
  order by created_at
  limit 1;
  if v_id is not null then return v_id; end if;

  begin
    insert into public.media_cleanup_jobs_v198(storage_bucket,object_path,resource_type,source_type,source_id)
    values('cloudinary',v_path,v_type,left(coalesce(nullif(btrim(p_source_type),''),'UNKNOWN'),80),left(nullif(btrim(coalesce(p_source_id,'')),''),200))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id
    from public.media_cleanup_jobs_v198
    where storage_bucket='cloudinary' and object_path=v_path and completed_at is null
    order by created_at
    limit 1;
  end;
  return v_id;
end;
$$;
revoke all on function private.enqueue_cloudinary_cleanup_v249(text,text,text,text) from public, anon, authenticated;

-- 2. Delete triggers ---------------------------------------------------------------------
create or replace function private.queue_catalog_media_delete_v198()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.storage_bucket='catalog-media' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_media_cleanup_v198(old.storage_bucket,old.object_path,'CATALOG_MEDIA',old.id::text);
  elsif old.storage_bucket='cloudinary' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_cloudinary_cleanup_v249(
      old.object_path,
      case when old.kind='VIDEO' then 'video' else 'image' end,
      'CATALOG_MEDIA',
      old.id::text
    );
  end if;
  return old;
end;
$$;
revoke all on function private.queue_catalog_media_delete_v198() from public, anon, authenticated;

create or replace function private.queue_media_asset_delete_v198()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.bucket='catalog-media' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_media_cleanup_v198(old.bucket,old.object_path,coalesce(nullif(upper(btrim(old.entity_type)),''),'MEDIA_ASSET'),coalesce(old.entity_id,old.id::text));
  elsif old.bucket='cloudinary' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_cloudinary_cleanup_v249(
      old.object_path,
      case when upper(coalesce(old.media_type,''))='VIDEO' then 'video' else 'image' end,
      coalesce(nullif(upper(btrim(old.entity_type)),''),'MEDIA_ASSET'),
      coalesce(old.entity_id,old.id::text)
    );
  end if;
  return old;
end;
$$;
revoke all on function private.queue_media_asset_delete_v198() from public, anon, authenticated;

-- 3. URL helpers ---------------------------------------------------------------------------
create or replace function private.cloudinary_delivery_url_v249(
  p_public_id text,
  p_kind text,
  p_metadata jsonb
) returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(btrim(coalesce(p_public_id,'')),'') is null then null
    when btrim(p_public_id) !~ '^[A-Za-z0-9_/-]+$' then null
    when coalesce(p_metadata->'cloudinary'->>'cloudName','') !~ '^[A-Za-z0-9_-]{1,64}$' then null
    when upper(coalesce(p_kind,'IMAGE')) = 'VIDEO'
      then 'https://res.cloudinary.com/' || (p_metadata->'cloudinary'->>'cloudName')
        || '/video/upload/q_auto,vc_auto/' || btrim(p_public_id) || '.mp4'
    else 'https://res.cloudinary.com/' || (p_metadata->'cloudinary'->>'cloudName')
        || '/image/upload/f_auto,q_auto,w_1440/' || btrim(p_public_id)
  end;
$$;
revoke all on function private.cloudinary_delivery_url_v249(text,text,jsonb) from public, anon, authenticated;

-- Row-aware variant of private.catalog_media_public_url(text,text,text).
create or replace function private.catalog_media_url_v249(
  p_storage_bucket text,
  p_object_path text,
  p_external_url text,
  p_kind text,
  p_metadata jsonb
) returns text
language sql
immutable
set search_path = pg_catalog, private
as $$
  select case
    when nullif(p_external_url, '') is null and p_storage_bucket = 'cloudinary'
      then private.cloudinary_delivery_url_v249(p_object_path, p_kind, p_metadata)
    else private.catalog_media_public_url(p_storage_bucket, p_object_path, p_external_url)
  end;
$$;
revoke all on function private.catalog_media_url_v249(text,text,text,text,jsonb) from public, anon, authenticated;

-- Row-aware variant of private.catalog_media_public_url(text,text,text,text,text) (cover/poster).
create or replace function private.catalog_media_cover_url_v249(
  p_external_url text,
  p_bucket text,
  p_object_path text,
  p_poster_url text,
  p_kind text,
  p_metadata jsonb
) returns text
language sql
immutable
set search_path = pg_catalog, private
as $$
  select case
    when p_kind = 'VIDEO' and nullif(p_poster_url, '') is not null then p_poster_url
    when nullif(p_external_url, '') is null and p_bucket = 'cloudinary'
      then private.cloudinary_delivery_url_v249(p_object_path, p_kind, p_metadata)
    else private.catalog_media_public_url(p_external_url, p_bucket, p_object_path, p_poster_url, p_kind)
  end;
$$;
revoke all on function private.catalog_media_cover_url_v249(text,text,text,text,text,jsonb) from public, anon, authenticated;

-- 4. Projection syncs (bodies identical to production except the URL expression) -----------
create or replace function private.sync_catalog_media_parent(
  p_vehicle_id uuid default null::uuid,
  p_tour_id uuid default null::uuid,
  p_blog_post_id uuid default null::uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
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
        private.catalog_media_url_v249(cm.storage_bucket, cm.object_path, cm.external_url, cm.kind, cm.metadata) as media_url
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
        private.catalog_media_url_v249(cm.storage_bucket, cm.object_path, cm.external_url, cm.kind, cm.metadata) as media_url
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
        private.catalog_media_url_v249(cm.storage_bucket, cm.object_path, cm.external_url, cm.kind, cm.metadata) as media_url
      from public.catalog_media cm
      where cm.blog_post_id = p_blog_post_id and cm.is_active = true
    ) m;

    update public.blog_posts
    set cover_image = coalesce(v_cover, cover_image),
        updated_at = now()
    where id = p_blog_post_id;
  end if;
end;
$function$;

create or replace function public.sync_catalog_owner_media(p_vehicle_id uuid default null::uuid, p_tour_id uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
        case when storage_bucket = 'cloudinary'
          then private.cloudinary_delivery_url_v249(object_path, 'IMAGE', metadata)
          else 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || object_path
        end as url,
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
    ) media
    where url is not null;

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
        case when storage_bucket = 'cloudinary'
          then private.cloudinary_delivery_url_v249(object_path, 'IMAGE', metadata)
          else 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/' || storage_bucket || '/' || object_path
        end as url,
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
    ) media
    where url is not null;

    update public.tours
    set images = coalesce(v_images, '[]'::jsonb),
        cover_image = v_cover,
        updated_at = now()
    where id = p_tour_id;
  end if;
end;
$function$;

create or replace function private.sync_catalog_media_cover()
returns trigger
language plpgsql
security definer
set search_path to 'private', 'public'
as $function$
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
    v_url := private.catalog_media_cover_url_v249(new.external_url, new.storage_bucket, new.object_path, new.poster_url, new.kind, new.metadata);
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
      v_url := private.catalog_media_cover_url_v249(v_replacement.external_url, v_replacement.storage_bucket, v_replacement.object_path, v_replacement.poster_url, v_replacement.kind, v_replacement.metadata);
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
$function$;

-- 5. Vehicle media guard: Supabase catalog-media Storage OR our Cloudinary delivery URLs ----
create or replace function public.enforce_vehicle_media_storage_only()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  item text;
  prefix constant text := 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/';
  cloudinary_pattern constant text := '^https://res\.cloudinary\.com/[A-Za-z0-9_-]{1,64}/image/upload/';
begin
  if new.category in ('RENTAL','SALE') then
    if new.cover_image is not null and btrim(new.cover_image) <> ''
       and left(new.cover_image, length(prefix)) <> prefix
       and new.cover_image !~ cloudinary_pattern then
      raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: cover_image must be an Alperler catalog-media Storage or Cloudinary file.';
    end if;
    if jsonb_typeof(coalesce(new.images, '[]'::jsonb)) <> 'array' then
      raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: images must be an array.';
    end if;
    for item in select jsonb_array_elements_text(coalesce(new.images, '[]'::jsonb)) loop
      if btrim(item) <> '' and left(item, length(prefix)) <> prefix and item !~ cloudinary_pattern then
        raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: vehicle images must be Alperler catalog-media Storage or Cloudinary files.';
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

-- 6. Service RPCs --------------------------------------------------------------------------
create or replace function public.service_catalog_media_create_v185(
  p_actor uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_type text := upper(btrim(coalesce(p_entity_type,'')));
  v_kind text := upper(btrim(coalesce(p_payload->>'kind','IMAGE')));
  v_path text := btrim(coalesce(p_payload->>'object_path',''));
  v_bucket text := coalesce(nullif(btrim(coalesce(p_payload->>'storage_bucket','')),''),'catalog-media');
  v_cloud text;
  v_resource text;
  v_expected_prefix text;
  v_row public.catalog_media%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception using errcode='22023', message='INVALID_MEDIA_PAYLOAD';
  end if;
  perform private.assert_central_media_owner_v185(v_type,p_entity_id);
  if v_kind not in ('IMAGE','VIDEO') then raise exception using errcode='22023',message='INVALID_MEDIA_KIND'; end if;

  if v_bucket = 'cloudinary' then
    -- public_id is chosen and signed server-side (/api/partner?op=cloudinary) under this prefix.
    v_expected_prefix := 'alperler/catalog/'||lower(v_type)||'/'||p_entity_id::text||'/';
    if v_path='' or length(v_path)>400 or position('..' in v_path)>0 or v_path !~ '^[A-Za-z0-9_/-]+$' then
      raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
    end if;
    if left(v_path,length(v_expected_prefix))<>v_expected_prefix then
      raise exception using errcode='22023', message='INVALID_STORAGE_PREFIX';
    end if;
    v_cloud := btrim(coalesce(p_payload->'metadata'->'cloudinary'->>'cloudName',''));
    v_resource := lower(btrim(coalesce(p_payload->'metadata'->'cloudinary'->>'resourceType', lower(v_kind))));
    if v_cloud !~ '^[A-Za-z0-9_-]{1,64}$' or v_resource <> lower(v_kind) then
      raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
    end if;
    if exists(select 1 from public.catalog_media where storage_bucket='cloudinary' and object_path=v_path) then
      raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
    end if;
  elsif v_bucket <> 'catalog-media' or v_path='' then
    raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
  else
    v_expected_prefix:=case v_type when 'VEHICLE' then 'vehicle/'||p_entity_id::text||'/' when 'TOUR' then 'tour/'||p_entity_id::text||'/' else 'blog/'||p_entity_id::text||'/' end;
    perform private.assert_catalog_storage_object_v185(p_actor,v_path,v_expected_prefix);
  end if;

  insert into public.catalog_media(
    vehicle_id,tour_id,blog_post_id,branch_id,kind,storage_bucket,object_path,external_url,
    poster_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,
    metadata,created_by
  ) values(
    case when v_type='VEHICLE' then p_entity_id else null end,
    case when v_type='TOUR' then p_entity_id else null end,
    case when v_type='BLOG' then p_entity_id else null end,
    null,v_kind,v_bucket,v_path,null,
    left(nullif(btrim(coalesce(p_payload->>'poster_url','')),''),2000),
    null,
    left(coalesce(nullif(btrim(p_payload->>'source_name'),''),'Alperler Auto yönetim paneli'),240),
    left(coalesce(nullif(btrim(p_payload->>'license'),''),'BUSINESS_OWNED'),120),
    left(coalesce(nullif(btrim(p_payload->>'attribution'),''),'Alperler Auto'),300),
    left(btrim(coalesce(p_payload->>'alt_text','')),300),
    greatest(0,coalesce(nullif(p_payload->>'sort_order','')::integer,0)),
    false,true,
    case when jsonb_typeof(coalesce(p_payload->'metadata','{}'::jsonb))='object' then coalesce(p_payload->'metadata','{}'::jsonb) else '{}'::jsonb end,
    p_actor
  ) returning * into v_row;

  select lower(coalesce(a.email,u.email)) into v_actor_email
  from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_media_created_v185','catalog_media',v_row.id::text,
    jsonb_build_object('owner_type',v_type,'owner_id',p_entity_id,'kind',v_row.kind,'storage_bucket',v_row.storage_bucket,'object_path',v_row.object_path),
    jsonb_build_object('gateway','media-control-admin-v185','storage','v249'));
  return to_jsonb(v_row);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023', message='INVALID_MEDIA_FIELD_VALUE';
end;
$$;

create or replace function public.service_register_media_asset_v185(p_actor uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_path text:=btrim(coalesce(p_payload->>'object_path',''));
  v_bucket text:=coalesce(nullif(btrim(coalesce(p_payload->>'bucket','')),''),'catalog-media');
  v_row public.media_assets%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_PAYLOAD'; end if;
  if v_bucket='cloudinary' then
    if left(v_path,15)<>'alperler/admin/' or length(v_path)>400 or position('..' in v_path)>0 or v_path !~ '^[A-Za-z0-9_/-]+$'
       or coalesce(p_payload->'metadata'->'cloudinary'->>'cloudName','') !~ '^[A-Za-z0-9_-]{1,64}$' then
      raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_STORAGE';
    end if;
  elsif v_bucket<>'catalog-media' or left(v_path,6)<>'admin/' then
    raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_STORAGE';
  else
    perform private.assert_catalog_storage_object_v185(p_actor,v_path,'admin/');
  end if;

  insert into public.media_assets(bucket,object_path,media_type,owner_user_id,entity_type,entity_id,alt_text,is_public,metadata)
  values(v_bucket,v_path,left(coalesce(nullif(btrim(p_payload->>'media_type'),''),'IMAGE'),30),p_actor,
    left(nullif(btrim(coalesce(p_payload->>'entity_type','')),''),80),left(nullif(btrim(coalesce(p_payload->>'entity_id','')),''),180),
    left(nullif(btrim(coalesce(p_payload->>'alt_text','')),''),180),true,
    case when jsonb_typeof(coalesce(p_payload->'metadata','{}'::jsonb))='object' then coalesce(p_payload->'metadata','{}'::jsonb) else '{}'::jsonb end)
  on conflict(bucket,object_path) do update set
    media_type=excluded.media_type, owner_user_id=p_actor, entity_type=excluded.entity_type, entity_id=excluded.entity_id,
    alt_text=excluded.alt_text,is_public=true,metadata=excluded.metadata
  returning * into v_row;
  select lower(coalesce(a.email,u.email)) into v_actor_email from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'media_asset_registered_v185','media_asset',v_row.id::text,jsonb_build_object('bucket',v_row.bucket,'object_path',v_row.object_path,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id),jsonb_build_object('gateway','media-control-admin-v185','storage','v249'));
  return to_jsonb(v_row);
end;
$$;

-- Privileges: unchanged contract (service_role only), restated explicitly.
revoke all on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.service_register_media_asset_v185(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.service_register_media_asset_v185(uuid,jsonb) to service_role;

comment on column public.media_cleanup_jobs_v198.resource_type is 'V249: Cloudinary resource type (image|video) for storage_bucket=cloudinary jobs; null for Supabase Storage jobs.';

commit;
