-- V252 — provider-agnostic media storage: Cloudflare R2 alongside Cloudinary / Supabase Storage.
--
-- Contract (see docs/MEDIA_STORAGE_V252.md):
--   catalog_media.storage_bucket / media_assets.bucket ∈ ('catalog-media','cloudinary','r2').
--   For 'cloudinary' and 'r2' rows object_path is a provider-neutral key STEM chosen and
--   signed server-side (/api/partner?op=media-upload):
--     alperler/catalog/<vehicle|tour|blog>/<ownerId>/<uuid>   catalog rows (admin + branch listings)
--     alperler/branch/<branchId>/<uuid>                       branch profile/hero rows
--     alperler/admin/<entity>/<id>/<purpose>/<uuid>           media_assets (site/homepage/campaign)
--   R2 sibling objects under a stem (generated at upload time, R2 has no resizing):
--     <stem>/w480.webp … <stem>/w1920.webp   (image, or the poster of a video; .jpg when the
--                                             uploading browser cannot encode WebP → metadata.r2.variantExt)
--     <stem>/orig.<ext>                       (compressed original image)
--     <stem>/video.<mp4|webm>                 (video rows)
--   metadata.r2 = { publicBaseUrl, widths, variantExt, origExt, videoExt, width, height }.
--   Delivery URL: <publicBaseUrl>/<stem>/w1440.webp (image) | <publicBaseUrl>/<stem>/video.<ext>.
--
-- Everything here is additive/idempotent; the app keeps working without it (R2 stays
-- unused until R2_* env vars exist, Cloudinary keeps working exactly as in V249).
begin;

-- 1. Cleanup queue accepts r2 ---------------------------------------------------------------
alter table public.media_cleanup_jobs_v198 drop constraint if exists media_cleanup_jobs_v198_bucket_ck;
alter table public.media_cleanup_jobs_v198
  add constraint media_cleanup_jobs_v198_bucket_ck check (storage_bucket in ('catalog-media','cloudinary','r2'));

create or replace function private.enqueue_r2_cleanup_v252(
  p_stem text,
  p_source_type text,
  p_source_id text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
  v_path text := btrim(coalesce(p_stem,''));
begin
  if v_path = '' or length(v_path) > 400 or position('..' in v_path) > 0
     or v_path !~ '^alperler/[A-Za-z0-9_/-]+$' then
    return null;
  end if;
  select id into v_id from public.media_cleanup_jobs_v198
  where storage_bucket='r2' and object_path=v_path and completed_at is null
  order by created_at limit 1;
  if v_id is not null then return v_id; end if;
  begin
    insert into public.media_cleanup_jobs_v198(storage_bucket,object_path,resource_type,source_type,source_id)
    values('r2',v_path,null,left(coalesce(nullif(btrim(p_source_type),''),'UNKNOWN'),80),left(nullif(btrim(coalesce(p_source_id,'')),''),200))
    returning id into v_id;
  exception when unique_violation then
    select id into v_id from public.media_cleanup_jobs_v198
    where storage_bucket='r2' and object_path=v_path and completed_at is null
    order by created_at limit 1;
  end;
  return v_id;
end;
$$;
revoke all on function private.enqueue_r2_cleanup_v252(text,text,text) from public, anon, authenticated;

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
  elsif old.storage_bucket='r2' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_r2_cleanup_v252(old.object_path,'CATALOG_MEDIA',old.id::text);
  end if;
  return old;
end;
$$;

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
  elsif old.bucket='r2' and nullif(btrim(coalesce(old.object_path,'')),'') is not null then
    perform private.enqueue_r2_cleanup_v252(old.object_path,coalesce(nullif(upper(btrim(old.entity_type)),''),'MEDIA_ASSET'),coalesce(old.entity_id,old.id::text));
  end if;
  return old;
end;
$$;

-- 2. URL helpers -------------------------------------------------------------------------------
create or replace function private.r2_delivery_url_v252(
  p_stem text,
  p_kind text,
  p_metadata jsonb
) returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(btrim(coalesce(p_stem,'')),'') is null then null
    when p_stem !~ '^alperler/[A-Za-z0-9_/-]+$' or position('..' in p_stem) > 0 then null
    when coalesce(p_metadata->'r2'->>'publicBaseUrl','') !~ '^https://[A-Za-z0-9.-]+(:[0-9]{2,5})?(/[A-Za-z0-9._~-]+)*$' then null
    when upper(coalesce(p_kind,'IMAGE')) = 'VIDEO'
      then (p_metadata->'r2'->>'publicBaseUrl') || '/' || p_stem || '/video.'
        || case when coalesce(p_metadata->'r2'->>'videoExt','') in ('mp4','webm','mov') then p_metadata->'r2'->>'videoExt' else 'mp4' end
    else (p_metadata->'r2'->>'publicBaseUrl') || '/' || p_stem || '/w1440.'
      || case when p_metadata->'r2'->>'variantExt' = 'jpg' then 'jpg' else 'webp' end
  end;
$$;
revoke all on function private.r2_delivery_url_v252(text,text,jsonb) from public, anon, authenticated;

create or replace function private.catalog_media_url_v249(p_storage_bucket text, p_object_path text, p_external_url text, p_kind text, p_metadata jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, private
as $$
  select case
    when nullif(p_external_url, '') is null and p_storage_bucket = 'cloudinary'
      then private.cloudinary_delivery_url_v249(p_object_path, p_kind, p_metadata)
    when nullif(p_external_url, '') is null and p_storage_bucket = 'r2'
      then private.r2_delivery_url_v252(p_object_path, p_kind, p_metadata)
    else private.catalog_media_public_url(p_storage_bucket, p_object_path, p_external_url)
  end;
$$;

create or replace function private.catalog_media_cover_url_v249(p_external_url text, p_bucket text, p_object_path text, p_poster_url text, p_kind text, p_metadata jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, private
as $$
  select case
    when p_kind = 'VIDEO' and nullif(p_poster_url, '') is not null then p_poster_url
    when nullif(p_external_url, '') is null and p_bucket = 'cloudinary'
      then private.cloudinary_delivery_url_v249(p_object_path, p_kind, p_metadata)
    when nullif(p_external_url, '') is null and p_bucket = 'r2'
      then private.r2_delivery_url_v252(p_object_path, 'IMAGE', p_metadata)
    else private.catalog_media_public_url(p_external_url, p_bucket, p_object_path, p_poster_url, p_kind)
  end;
$$;

-- Owner projections: one helper for every provider (was a cloudinary-only CASE).
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
      select private.catalog_media_url_v249(storage_bucket, object_path, null, 'IMAGE', metadata) as url,
        is_cover, sort_order, created_at
      from public.catalog_media
      where vehicle_id = p_vehicle_id and kind = 'IMAGE' and is_active = true
        and storage_bucket is not null and object_path is not null and external_url is null
    ) media
    where url is not null;
    update public.vehicles
    set images = coalesce(v_images, '[]'::jsonb), cover_image = v_cover, updated_at = now()
    where id = p_vehicle_id;
  end if;

  if p_tour_id is not null then
    select
      coalesce(jsonb_agg(url order by sort_order, created_at), '[]'::jsonb),
      (array_agg(url order by is_cover desc, sort_order, created_at))[1]
    into v_images, v_cover
    from (
      select private.catalog_media_url_v249(storage_bucket, object_path, null, 'IMAGE', metadata) as url,
        is_cover, sort_order, created_at
      from public.catalog_media
      where tour_id = p_tour_id and kind = 'IMAGE' and is_active = true
        and storage_bucket is not null and object_path is not null and external_url is null
    ) media
    where url is not null;
    update public.tours
    set images = coalesce(v_images, '[]'::jsonb), cover_image = v_cover, updated_at = now()
    where id = p_tour_id;
  end if;
end;
$function$;

-- Branch hero follows every provider (cloudinary/r2 rows previously produced a NULL hero).
create or replace function public.sync_branch_hero_from_media_v171()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_branch_id uuid;
  v_path text;
begin
  if tg_op='DELETE' then v_branch_id:=old.branch_id; else v_branch_id:=new.branch_id; end if;
  if v_branch_id is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  select case
    when cm.storage_bucket='catalog-media' and cm.object_path is not null then '/catalog-media/'||cm.object_path
    when cm.storage_bucket='cloudinary' and cm.object_path is not null then private.cloudinary_delivery_url_v249(cm.object_path,'IMAGE',cm.metadata)
    when cm.storage_bucket='r2' and cm.object_path is not null then private.r2_delivery_url_v252(cm.object_path,'IMAGE',cm.metadata)
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
$function$;

-- 3. Vehicle projection guard accepts our R2 variant URLs ------------------------------------
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
  r2_pattern constant text := '^https://[A-Za-z0-9.-]+(:[0-9]{2,5})?(/[A-Za-z0-9._~-]+)*/alperler/(catalog|branch)/[A-Za-z0-9_/-]+/w(480|768|1080|1440|1920)\.(webp|jpg)$';
begin
  if new.category in ('RENTAL','SALE') then
    if new.cover_image is not null and btrim(new.cover_image) <> ''
       and left(new.cover_image, length(prefix)) <> prefix
       and new.cover_image !~ cloudinary_pattern
       and new.cover_image !~ r2_pattern then
      raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: cover_image must be an Alperler catalog-media Storage, Cloudinary or R2 file.';
    end if;
    if jsonb_typeof(coalesce(new.images, '[]'::jsonb)) <> 'array' then
      raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: images must be an array.';
    end if;
    for item in select jsonb_array_elements_text(coalesce(new.images, '[]'::jsonb)) loop
      if btrim(item) <> '' and left(item, length(prefix)) <> prefix and item !~ cloudinary_pattern and item !~ r2_pattern then
        raise exception 'VEHICLE_MEDIA_STORAGE_ONLY: vehicle images must be Alperler catalog-media Storage, Cloudinary or R2 files.';
      end if;
    end loop;
  end if;
  return new;
end;
$function$;

-- 4. Provider rows must live under their owner's key prefix ----------------------------------
-- RLS lets branch managers insert catalog_media rows directly; this keeps them from
-- pointing a row at another owner's (or an arbitrary) object.
create or replace function private.enforce_catalog_media_provider_key_v252()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  v_prefix text;
begin
  if coalesce(new.storage_bucket,'') not in ('cloudinary','r2') then return new; end if;
  if new.object_path is null or length(new.object_path) > 400 or position('..' in new.object_path) > 0
     or new.object_path !~ '^alperler/[A-Za-z0-9_/-]+$' then
    raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
  end if;
  v_prefix := case
    when new.vehicle_id is not null then 'alperler/catalog/vehicle/'||new.vehicle_id::text||'/'
    when new.tour_id is not null then 'alperler/catalog/tour/'||new.tour_id::text||'/'
    when new.blog_post_id is not null then 'alperler/catalog/blog/'||new.blog_post_id::text||'/'
    when new.branch_id is not null then 'alperler/branch/'||new.branch_id::text||'/'
  end;
  if v_prefix is null or left(new.object_path, length(v_prefix)) <> v_prefix then
    raise exception using errcode='22023', message='INVALID_STORAGE_PREFIX';
  end if;
  if new.storage_bucket = 'r2' and private.r2_delivery_url_v252(new.object_path, new.kind, new.metadata) is null then
    raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_catalog_media_provider_key_v252() from public, anon, authenticated;
drop trigger if exists catalog_media_provider_key_v252 on public.catalog_media;
create trigger catalog_media_provider_key_v252
  before insert or update of storage_bucket, object_path, metadata, vehicle_id, tour_id, blog_post_id, branch_id
  on public.catalog_media
  for each row execute function private.enforce_catalog_media_provider_key_v252();

-- 5. Upload authorization probe used by /api/partner?op=media-upload for branch users ---------
create or replace function public.can_upload_media_v252(
  p_branch_id uuid default null,
  p_vehicle_id uuid default null,
  p_tour_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (p_branch_id is not null or p_vehicle_id is not null or p_tour_id is not null)
    and private.can_manage_catalog_media_owner_v189(p_branch_id, p_vehicle_id, p_tour_id, null);
$$;
revoke all on function public.can_upload_media_v252(uuid,uuid,uuid) from public, anon;
grant execute on function public.can_upload_media_v252(uuid,uuid,uuid) to authenticated;

-- 6. Campaign cover lifecycle understands provider-hosted covers ------------------------------
create or replace function private.cleanup_campaign_cover_assets_v199()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_keep_path text;
  v_keep_url text;
begin
  if tg_op = 'UPDATE' and new.cover_image is not distinct from old.cover_image then
    return new;
  end if;

  if tg_op = 'UPDATE' and nullif(btrim(coalesce(new.cover_image, '')), '') is not null then
    v_keep_url := split_part(btrim(new.cover_image), '?', 1);
    v_keep_path := split_part(new.cover_image, '/storage/v1/object/public/catalog-media/', 2);
    v_keep_path := nullif(split_part(v_keep_path, '?', 1), '');

    update public.media_assets
    set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('bindingState', 'BOUND', 'boundAt', now(), 'purpose', 'cover')
    where upper(coalesce(entity_type, '')) = 'CAMPAIGN'
      and entity_id = new.id::text
      and (
        (bucket = 'catalog-media' and v_keep_path is not null and object_path = v_keep_path)
        or (bucket in ('cloudinary','r2') and coalesce(metadata->>'publicUrl','') = v_keep_url)
      );
  end if;

  delete from public.media_assets
  where upper(coalesce(entity_type, '')) = 'CAMPAIGN'
    and entity_id = old.id::text
    and coalesce(metadata ->> 'purpose', '') = 'cover'
    and not (
      tg_op = 'UPDATE' and (
        (bucket = 'catalog-media' and v_keep_path is not null and object_path = v_keep_path)
        or (bucket in ('cloudinary','r2') and v_keep_url is not null and coalesce(metadata->>'publicUrl','') = v_keep_url)
      )
    );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

create or replace function private.cleanup_campaign_media_assets_v198()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  delete from public.media_assets
  where bucket in ('catalog-media','cloudinary','r2')
    and upper(coalesce(entity_type,''))='CAMPAIGN'
    and entity_id=old.id::text;
  return old;
end;
$function$;

-- 7. Central admin gateway (media-control-admin-v185) accepts r2 ----------------------------
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

  if v_bucket in ('cloudinary','r2') then
    v_expected_prefix := 'alperler/catalog/'||lower(v_type)||'/'||p_entity_id::text||'/';
    if v_path='' or length(v_path)>400 or position('..' in v_path)>0 or v_path !~ '^[A-Za-z0-9_/-]+$' then
      raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
    end if;
    if left(v_path,length(v_expected_prefix))<>v_expected_prefix then
      raise exception using errcode='22023', message='INVALID_STORAGE_PREFIX';
    end if;
    if v_bucket = 'cloudinary' then
      v_cloud := btrim(coalesce(p_payload->'metadata'->'cloudinary'->>'cloudName',''));
      v_resource := lower(btrim(coalesce(p_payload->'metadata'->'cloudinary'->>'resourceType', lower(v_kind))));
      if v_cloud !~ '^[A-Za-z0-9_-]{1,64}$' or v_resource <> lower(v_kind) then
        raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
      end if;
    elsif private.r2_delivery_url_v252(v_path, v_kind, p_payload->'metadata') is null then
      raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
    end if;
    if exists(select 1 from public.catalog_media where storage_bucket=v_bucket and object_path=v_path) then
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
    jsonb_build_object('gateway','media-control-admin-v185','storage','v252'));
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
  if v_bucket in ('cloudinary','r2') then
    if left(v_path,15)<>'alperler/admin/' or length(v_path)>400 or position('..' in v_path)>0 or v_path !~ '^[A-Za-z0-9_/-]+$' then
      raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_STORAGE';
    end if;
    if v_bucket='cloudinary' and coalesce(p_payload->'metadata'->'cloudinary'->>'cloudName','') !~ '^[A-Za-z0-9_-]{1,64}$' then
      raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_STORAGE';
    end if;
    if v_bucket='r2' and private.r2_delivery_url_v252(v_path,'IMAGE',p_payload->'metadata') is null then
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
  values(p_actor,v_actor_email,'media_asset_registered_v185','media_asset',v_row.id::text,jsonb_build_object('bucket',v_row.bucket,'object_path',v_row.object_path,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id),jsonb_build_object('gateway','media-control-admin-v185','storage','v252'));
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.service_register_media_asset_v185(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.service_register_media_asset_v185(uuid,jsonb) to service_role;

-- 8. Custom-domain switch: rewrite the stored R2 base URL everywhere (service_role only) ------
-- Usage when the Worker moves from *.workers.dev to a custom domain:
--   select public.service_rebase_r2_media_v252('https://old.workers.dev', 'https://media.example.com');
create or replace function public.service_rebase_r2_media_v252(p_old_base text, p_new_base text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old text := rtrim(btrim(coalesce(p_old_base,'')),'/');
  v_new text := rtrim(btrim(coalesce(p_new_base,'')),'/');
  v_pattern constant text := '^https://[A-Za-z0-9.-]+(:[0-9]{2,5})?(/[A-Za-z0-9._~-]+)*$';
  v_media int := 0; v_assets int := 0; v_rows int := 0;
  v_owner record;
begin
  if v_old !~ v_pattern or v_new !~ v_pattern or v_old = v_new then
    raise exception using errcode='22023', message='INVALID_R2_BASE_URL';
  end if;
  update public.catalog_media
     set metadata = jsonb_set(metadata, '{r2,publicBaseUrl}', to_jsonb(v_new)),
         poster_url = case when poster_url like v_old || '/%' then v_new || substr(poster_url, length(v_old) + 1) else poster_url end
   where storage_bucket = 'r2' and metadata->'r2'->>'publicBaseUrl' = v_old;
  get diagnostics v_media = row_count;
  update public.media_assets
     set metadata = jsonb_set(jsonb_set(metadata, '{r2,publicBaseUrl}', to_jsonb(v_new)), '{publicUrl}',
                   to_jsonb(replace(coalesce(metadata->>'publicUrl',''), v_old || '/', v_new || '/')))
   where bucket = 'r2' and metadata->'r2'->>'publicBaseUrl' = v_old;
  get diagnostics v_assets = row_count;
  for v_owner in select distinct vehicle_id, tour_id from public.catalog_media where storage_bucket='r2' and (vehicle_id is not null or tour_id is not null) loop
    perform public.sync_catalog_owner_media(v_owner.vehicle_id, v_owner.tour_id);
  end loop;
  update public.campaigns set cover_image = replace(cover_image, v_old || '/', v_new || '/') where cover_image like v_old || '/%';
  get diagnostics v_rows = row_count;
  update public.homepage_sections set settings = replace(settings::text, v_old || '/', v_new || '/')::jsonb where settings::text like '%' || v_old || '/%';
  update public.site_config set value = replace(value::text, v_old || '/', v_new || '/')::jsonb where value::text like '%' || v_old || '/%';
  update public.branches set hero_image = replace(hero_image, v_old || '/', v_new || '/') where hero_image like v_old || '/%';
  update public.blog_posts set cover_image = replace(cover_image, v_old || '/', v_new || '/') where cover_image like v_old || '/%';
  update public.vehicle_inspections set photo_paths = replace(photo_paths::text, v_old || '/', v_new || '/')::jsonb where photo_paths::text like '%' || v_old || '/%';
  return jsonb_build_object('catalogMedia', v_media, 'mediaAssets', v_assets, 'campaigns', v_rows);
end;
$$;
revoke all on function public.service_rebase_r2_media_v252(text,text) from public, anon, authenticated;
grant execute on function public.service_rebase_r2_media_v252(text,text) to service_role;

comment on function private.r2_delivery_url_v252(text,text,jsonb) is 'V252: delivery URL for storage_bucket=r2 rows: <metadata.r2.publicBaseUrl>/<stem>/w1440.webp (image) or /video.<ext>.';


-- 9. Pure URL helpers are called from invoker-rights triggers (branch hero sync, provider-key guard)
--    when a branch manager writes catalog_media through RLS; they only build strings.
grant execute on function private.r2_delivery_url_v252(text,text,jsonb) to authenticated, service_role;
grant execute on function private.cloudinary_delivery_url_v249(text,text,jsonb) to authenticated, service_role;

-- 10. Branch hero projection runs as definer: branch managers insert catalog_media through RLS
--     (already authorized there) but have no UPDATE grant on branches, so the invoker-rights
--     trigger failed with "permission denied for table branches" on every branch media insert.
alter function public.sync_branch_hero_from_media_v171() security definer;
revoke all on function public.sync_branch_hero_from_media_v171() from public, anon, authenticated;

commit;
