begin;

-- V185: central media metadata/control plane. Binary uploads intentionally stay on
-- Supabase Storage with the user's JWT + Storage RLS. This migration moves only
-- privileged catalog/media metadata operations behind explicit-actor service RPCs.
-- Branch-owned catalog media remains on the dedicated branch RLS path.

create or replace function private.assert_central_media_owner_v185(
  p_entity_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_type text := upper(btrim(coalesce(p_entity_type,'')));
begin
  if p_entity_id is null or v_type not in ('VEHICLE','TOUR','BLOG') then
    raise exception using errcode='22023', message='INVALID_MEDIA_OWNER';
  end if;

  if v_type='VEHICLE' and not exists(
    select 1 from public.vehicles where id=p_entity_id and listing_origin='CENTRAL'
  ) then raise exception using errcode='P0002', message='VEHICLE_NOT_FOUND'; end if;

  if v_type='TOUR' and not exists(
    select 1 from public.tours where id=p_entity_id and listing_origin='CENTRAL'
  ) then raise exception using errcode='P0002', message='TOUR_NOT_FOUND'; end if;

  if v_type='BLOG' and not exists(
    select 1 from public.blog_posts where id=p_entity_id
  ) then raise exception using errcode='P0002', message='BLOG_NOT_FOUND'; end if;
end;
$$;

revoke all on function private.assert_central_media_owner_v185(text,uuid) from public,anon,authenticated;
grant execute on function private.assert_central_media_owner_v185(text,uuid) to service_role;

create or replace function private.assert_catalog_storage_object_v185(
  p_actor uuid,
  p_object_path text,
  p_expected_prefix text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, storage, private
as $$
declare
  v_path text := btrim(coalesce(p_object_path,''));
  v_prefix text := btrim(coalesce(p_expected_prefix,''));
begin
  if p_actor is null or v_path='' or length(v_path)>1000 or position('..' in v_path)>0 then
    raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
  end if;
  if v_prefix<>'' and left(v_path,length(v_prefix))<>v_prefix then
    raise exception using errcode='22023', message='INVALID_STORAGE_PREFIX';
  end if;
  if not exists(
    select 1 from storage.objects o
    where o.bucket_id='catalog-media'
      and o.name=v_path
      and (o.owner=p_actor or o.owner_id=p_actor::text)
      and o.is_delete_marker is distinct from true
  ) then
    raise exception using errcode='42501', message='STORAGE_OBJECT_OWNERSHIP_REQUIRED';
  end if;
end;
$$;

revoke all on function private.assert_catalog_storage_object_v185(uuid,text,text) from public,anon,authenticated;
grant execute on function private.assert_catalog_storage_object_v185(uuid,text,text) to service_role;

create or replace function private.catalog_media_live_owner_v185(p_row public.catalog_media)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select case
    when p_row.vehicle_id is not null then exists(
      select 1 from public.vehicles
      where id=p_row.vehicle_id and listing_origin='CENTRAL'
        and publication_status in ('PUBLISHED','SCHEDULED') and is_active=true)
    when p_row.tour_id is not null then exists(
      select 1 from public.tours
      where id=p_row.tour_id and listing_origin='CENTRAL'
        and publication_status in ('PUBLISHED','SCHEDULED') and is_active=true)
    when p_row.blog_post_id is not null then exists(
      select 1 from public.blog_posts where id=p_row.blog_post_id and status='PUBLISHED')
    else false
  end;
$$;

revoke all on function private.catalog_media_live_owner_v185(public.catalog_media) from public,anon,authenticated;
grant execute on function private.catalog_media_live_owner_v185(public.catalog_media) to service_role;

create or replace function public.service_catalog_media_list_v185(
  p_actor uuid,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_type text := upper(btrim(coalesce(p_entity_type,'')));
  v_rows jsonb;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if v_type<>'' then perform private.assert_central_media_owner_v185(v_type,p_entity_id); end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.sort_order,m.created_at), '[]'::jsonb)
    into v_rows
  from public.catalog_media m
  where m.branch_id is null
    and (
      v_type=''
      or (v_type='VEHICLE' and m.vehicle_id=p_entity_id)
      or (v_type='TOUR' and m.tour_id=p_entity_id)
      or (v_type='BLOG' and m.blog_post_id=p_entity_id)
    );
  return v_rows;
end;
$$;

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
  if coalesce(p_payload->>'storage_bucket','catalog-media')<>'catalog-media' or v_path='' then
    raise exception using errcode='22023', message='INVALID_MEDIA_STORAGE';
  end if;
  v_expected_prefix:=case v_type when 'VEHICLE' then 'vehicle/'||p_entity_id::text||'/' when 'TOUR' then 'tour/'||p_entity_id::text||'/' else 'blog/'||p_entity_id::text||'/' end;
  perform private.assert_catalog_storage_object_v185(p_actor,v_path,v_expected_prefix);

  insert into public.catalog_media(
    vehicle_id,tour_id,blog_post_id,branch_id,kind,storage_bucket,object_path,external_url,
    poster_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,
    metadata,created_by
  ) values(
    case when v_type='VEHICLE' then p_entity_id else null end,
    case when v_type='TOUR' then p_entity_id else null end,
    case when v_type='BLOG' then p_entity_id else null end,
    null,v_kind,'catalog-media',v_path,null,
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
    jsonb_build_object('owner_type',v_type,'owner_id',p_entity_id,'kind',v_row.kind,'object_path',v_row.object_path),
    jsonb_build_object('gateway','media-control-admin-v185'));
  return to_jsonb(v_row);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023', message='INVALID_MEDIA_FIELD_VALUE';
end;
$$;

create or replace function public.service_catalog_media_update_v185(
  p_actor uuid,
  p_media_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_row public.catalog_media%rowtype;
  v_before jsonb;
  v_live boolean;
  v_other_images integer:=0;
  v_actor_email text;
  v_source_url text;
  v_next_active boolean;
  v_next_cover boolean;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_media_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception using errcode='22023', message='INVALID_MEDIA_PAYLOAD';
  end if;
  select * into v_row from public.catalog_media where id=p_media_id and branch_id is null for update;
  if not found then raise exception using errcode='P0002',message='CATALOG_MEDIA_NOT_FOUND'; end if;
  if v_row.vehicle_id is not null then perform private.assert_central_media_owner_v185('VEHICLE',v_row.vehicle_id);
  elsif v_row.tour_id is not null then perform private.assert_central_media_owner_v185('TOUR',v_row.tour_id);
  elsif v_row.blog_post_id is not null then perform private.assert_central_media_owner_v185('BLOG',v_row.blog_post_id);
  else raise exception using errcode='23514',message='CATALOG_MEDIA_OWNER_MISSING'; end if;

  v_before:=to_jsonb(v_row);
  v_live:=private.catalog_media_live_owner_v185(v_row);
  v_next_active:=case when p_payload ? 'is_active' then coalesce((p_payload->>'is_active')::boolean,false) else v_row.is_active end;
  v_next_cover:=case when p_payload ? 'is_cover' then coalesce((p_payload->>'is_cover')::boolean,false) else v_row.is_cover end;
  if p_payload ? 'is_cover' and coalesce((p_payload->>'is_cover')::boolean,false)=true then
    raise exception using errcode='22023', message='USE_SET_COVER_ACTION';
  end if;
  if v_live and v_row.is_cover and (not v_next_active or not v_next_cover) then
    raise exception using errcode='23514', message='CATALOG_LIVE_COVER_CHANGE_REQUIRES_REPLACEMENT';
  end if;
  if v_live and v_row.kind='IMAGE' and v_row.is_active and not v_next_active then
    select count(*) into v_other_images from public.catalog_media m
    where m.id<>v_row.id and m.kind='IMAGE' and m.is_active=true and (
      (v_row.vehicle_id is not null and m.vehicle_id=v_row.vehicle_id) or
      (v_row.tour_id is not null and m.tour_id=v_row.tour_id) or
      (v_row.blog_post_id is not null and m.blog_post_id=v_row.blog_post_id)
    );
    if v_other_images<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
  end if;
  v_source_url:=nullif(btrim(coalesce(p_payload->>'source_url','')),'');
  if v_source_url is not null and v_source_url !~* '^https://[^[:space:]]+$' then
    raise exception using errcode='22023',message='MEDIA_SOURCE_MUST_BE_HTTPS';
  end if;

  update public.catalog_media set
    alt_text=case when p_payload ? 'alt_text' then left(btrim(coalesce(p_payload->>'alt_text','')),300) else alt_text end,
    sort_order=case when p_payload ? 'sort_order' then greatest(0,coalesce(nullif(p_payload->>'sort_order','')::integer,0)) else sort_order end,
    is_active=v_next_active,
    is_cover=v_next_cover,
    poster_url=case when p_payload ? 'poster_url' then left(nullif(btrim(coalesce(p_payload->>'poster_url','')),''),2000) else poster_url end,
    attribution=case when p_payload ? 'attribution' then left(nullif(btrim(coalesce(p_payload->>'attribution','')),''),300) else attribution end,
    source_name=case when p_payload ? 'source_name' then left(nullif(btrim(coalesce(p_payload->>'source_name','')),''),240) else source_name end,
    license=case when p_payload ? 'license' then left(nullif(btrim(coalesce(p_payload->>'license','')),''),120) else license end,
    source_url=case when p_payload ? 'source_url' then v_source_url else source_url end,
    metadata=case when p_payload ? 'metadata' and jsonb_typeof(p_payload->'metadata')='object' then p_payload->'metadata' else metadata end,
    updated_at=now()
  where id=p_media_id
  returning * into v_row;

  select lower(coalesce(a.email,u.email)) into v_actor_email
  from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_media_updated_v185','catalog_media',v_row.id::text,v_before,to_jsonb(v_row),jsonb_build_object('gateway','media-control-admin-v185'));
  return to_jsonb(v_row);
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023', message='INVALID_MEDIA_FIELD_VALUE';
end;
$$;

create or replace function public.service_catalog_media_set_cover_v185(p_actor uuid,p_media_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_row public.catalog_media%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  select * into v_row from public.catalog_media where id=p_media_id and branch_id is null for update;
  if not found then raise exception using errcode='P0002',message='CATALOG_MEDIA_NOT_FOUND'; end if;
  if v_row.kind<>'IMAGE' or v_row.is_active is not true then raise exception using errcode='23514',message='CATALOG_COVER_REQUIRES_ACTIVE_IMAGE'; end if;
  if v_row.vehicle_id is not null then
    perform private.assert_central_media_owner_v185('VEHICLE',v_row.vehicle_id);
    update public.catalog_media set is_cover=false,updated_at=now() where vehicle_id=v_row.vehicle_id and id<>v_row.id and is_cover=true;
  elsif v_row.tour_id is not null then
    perform private.assert_central_media_owner_v185('TOUR',v_row.tour_id);
    update public.catalog_media set is_cover=false,updated_at=now() where tour_id=v_row.tour_id and id<>v_row.id and is_cover=true;
  elsif v_row.blog_post_id is not null then
    perform private.assert_central_media_owner_v185('BLOG',v_row.blog_post_id);
    update public.catalog_media set is_cover=false,updated_at=now() where blog_post_id=v_row.blog_post_id and id<>v_row.id and is_cover=true;
  else raise exception using errcode='23514',message='CATALOG_MEDIA_OWNER_MISSING'; end if;
  update public.catalog_media set is_cover=true,is_active=true,updated_at=now() where id=v_row.id returning * into v_row;
  select lower(coalesce(a.email,u.email)) into v_actor_email from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_media_cover_set_v185','catalog_media',v_row.id::text,jsonb_build_object('is_cover',true),jsonb_build_object('gateway','media-control-admin-v185'));
  return to_jsonb(v_row);
end;
$$;

create or replace function public.service_catalog_media_remove_v185(p_actor uuid,p_media_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_row public.catalog_media%rowtype;
  v_live boolean;
  v_remaining integer:=0;
  v_replacement uuid;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  select * into v_row from public.catalog_media where id=p_media_id and branch_id is null for update;
  if not found then return jsonb_build_object('removed',false); end if;
  if v_row.vehicle_id is not null then perform private.assert_central_media_owner_v185('VEHICLE',v_row.vehicle_id);
  elsif v_row.tour_id is not null then perform private.assert_central_media_owner_v185('TOUR',v_row.tour_id);
  elsif v_row.blog_post_id is not null then perform private.assert_central_media_owner_v185('BLOG',v_row.blog_post_id);
  else raise exception using errcode='23514',message='CATALOG_MEDIA_OWNER_MISSING'; end if;

  v_live:=private.catalog_media_live_owner_v185(v_row);
  if v_row.kind='IMAGE' and v_row.is_active then
    select count(*), (array_agg(m.id order by m.sort_order,m.created_at))[1]
      into v_remaining,v_replacement
    from public.catalog_media m
    where m.id<>v_row.id and m.kind='IMAGE' and m.is_active=true and (
      (v_row.vehicle_id is not null and m.vehicle_id=v_row.vehicle_id) or
      (v_row.tour_id is not null and m.tour_id=v_row.tour_id) or
      (v_row.blog_post_id is not null and m.blog_post_id=v_row.blog_post_id)
    );
    if v_live and v_remaining<1 then raise exception using errcode='23514',message='CATALOG_LIVE_LAST_IMAGE_BLOCKED'; end if;
  end if;

  delete from public.catalog_media where id=v_row.id;
  if v_live and v_row.is_cover and v_replacement is not null then update public.catalog_media set is_cover=true,is_active=true,updated_at=now() where id=v_replacement; end if;
  select lower(coalesce(a.email,u.email)) into v_actor_email from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,event_meta)
  values(p_actor,v_actor_email,'catalog_media_removed_v185','catalog_media',v_row.id::text,to_jsonb(v_row),jsonb_build_object('gateway','media-control-admin-v185'));
  return jsonb_build_object('removed',true,'storageBucket',v_row.storage_bucket,'objectPath',v_row.object_path);
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
  v_row public.media_assets%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_PAYLOAD'; end if;
  if coalesce(p_payload->>'bucket','catalog-media')<>'catalog-media' or left(v_path,6)<>'admin/' then raise exception using errcode='22023',message='INVALID_MEDIA_ASSET_STORAGE'; end if;
  perform private.assert_catalog_storage_object_v185(p_actor,v_path,'admin/');

  insert into public.media_assets(bucket,object_path,media_type,owner_user_id,entity_type,entity_id,alt_text,is_public,metadata)
  values('catalog-media',v_path,left(coalesce(nullif(btrim(p_payload->>'media_type'),''),'IMAGE'),30),p_actor,
    left(nullif(btrim(coalesce(p_payload->>'entity_type','')),''),80),left(nullif(btrim(coalesce(p_payload->>'entity_id','')),''),180),
    left(nullif(btrim(coalesce(p_payload->>'alt_text','')),''),180),true,
    case when jsonb_typeof(coalesce(p_payload->'metadata','{}'::jsonb))='object' then coalesce(p_payload->'metadata','{}'::jsonb) else '{}'::jsonb end)
  on conflict(bucket,object_path) do update set
    media_type=excluded.media_type, owner_user_id=p_actor, entity_type=excluded.entity_type, entity_id=excluded.entity_id,
    alt_text=excluded.alt_text,is_public=true,metadata=excluded.metadata
  returning * into v_row;
  select lower(coalesce(a.email,u.email)) into v_actor_email from public.admin_users a left join auth.users u on u.id=a.user_id where a.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'media_asset_registered_v185','media_asset',v_row.id::text,jsonb_build_object('bucket',v_row.bucket,'object_path',v_row.object_path,'entity_type',v_row.entity_type,'entity_id',v_row.entity_id),jsonb_build_object('gateway','media-control-admin-v185'));
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.service_catalog_media_list_v185(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.service_catalog_media_update_v185(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.service_catalog_media_set_cover_v185(uuid,uuid) from public,anon,authenticated;
revoke all on function public.service_catalog_media_remove_v185(uuid,uuid) from public,anon,authenticated;
revoke all on function public.service_register_media_asset_v185(uuid,jsonb) from public,anon,authenticated;

grant execute on function public.service_catalog_media_list_v185(uuid,text,uuid) to service_role;
grant execute on function public.service_catalog_media_create_v185(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.service_catalog_media_update_v185(uuid,uuid,jsonb) to service_role;
grant execute on function public.service_catalog_media_set_cover_v185(uuid,uuid) to service_role;
grant execute on function public.service_catalog_media_remove_v185(uuid,uuid) to service_role;
grant execute on function public.service_register_media_asset_v185(uuid,jsonb) to service_role;

commit;
