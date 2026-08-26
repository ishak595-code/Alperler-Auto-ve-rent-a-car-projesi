begin;

-- V184: central catalog administration is moved behind an explicit-actor,
-- service-role-only PostgreSQL boundary. Existing publication, branch,
-- media-projection and truth-integrity triggers remain authoritative.

create or replace function public.service_catalog_admin_snapshot_v184(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_vehicles jsonb;
  v_tours jsonb;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;

  select coalesce(jsonb_agg(to_jsonb(v) order by v.updated_at desc), '[]'::jsonb)
    into v_vehicles from public.vehicles v;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.updated_at desc), '[]'::jsonb)
    into v_tours from public.tours t;

  return jsonb_build_object('vehicles',v_vehicles,'tours',v_tours);
end;
$$;

create or replace function public.service_catalog_media_summary_v184(
  p_actor uuid,
  p_kind text,
  p_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_kind text:=upper(btrim(coalesce(p_kind,'')));
  v_images integer:=0;
  v_covers integer:=0;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_id is null or v_kind not in ('VEHICLE','TOUR') then
    raise exception using errcode='22023', message='INVALID_MEDIA_SUMMARY_REQUEST';
  end if;

  select
    count(*) filter(where is_active=true and kind='IMAGE'),
    count(*) filter(where is_active=true and kind='IMAGE' and is_cover=true)
  into v_images,v_covers
  from public.catalog_media
  where (v_kind='VEHICLE' and vehicle_id=p_id)
     or (v_kind='TOUR' and tour_id=p_id);

  return jsonb_build_object('activeImages',v_images,'activeCovers',v_covers);
end;
$$;

create or replace function public.service_create_catalog_vehicle_v184(
  p_actor uuid,
  p_category text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_category text:=upper(btrim(coalesce(p_category,'')));
  v_suffix text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_stock text;
  v_row public.vehicles%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if v_category not in ('RENTAL','SALE') then
    raise exception using errcode='22023', message='INVALID_VEHICLE_CATEGORY';
  end if;

  v_stock:=(case when v_category='RENTAL' then 'RENT-' else 'SALE-' end)||v_suffix;

  insert into public.vehicles(
    stock_code,category,brand,model,price,rental_price_daily,mileage_km,
    features,images,is_featured,is_active,availability_status,seo_slug,
    publication_status,record_origin,data_quality_status,actual_vehicle_verified,
    listing_origin,metadata
  ) values(
    v_stock,v_category,'Yeni',case when v_category='RENTAL' then 'Kiralık Araç' else 'Satılık Araç' end,
    0,case when v_category='RENTAL' then 0 else null end,case when v_category='SALE' then 0 else null end,
    '[]'::jsonb,'[]'::jsonb,false,false,'AVAILABLE',lower(v_stock),
    'DRAFT','REAL','UNVERIFIED',false,'CENTRAL',
    jsonb_build_object(
      'title',case when v_category='RENTAL' then 'Yeni Kiralık Araç' else 'Yeni Satılık Araç' end,
      'createdFrom','ADMIN_V184'
    ) || case when v_category='SALE' then jsonb_build_object(
      'tramerStatus','UNKNOWN','tramerCurrency','TRY','damageExpertise','{}'::jsonb,'isDamageFree',false
    ) else '{}'::jsonb end
  ) returning * into v_row;

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_vehicle_created_v184','vehicle',v_row.id::text,
    jsonb_build_object('stock_code',v_row.stock_code,'category',v_row.category,'publication_status',v_row.publication_status),
    jsonb_build_object('gateway','catalog-admin-v184'));

  return to_jsonb(v_row);
end;
$$;

create or replace function public.service_create_catalog_tour_v184(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_suffix text:=lower(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_row public.tours%rowtype;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;

  insert into public.tours(
    title,seo_slug,price_per_person,itinerary,included_items,excluded_items,images,
    is_featured,is_active,publication_status,record_origin,data_quality_status,
    listing_origin,metadata
  ) values(
    'Yeni Tur','tur-'||v_suffix,0,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
    false,false,'DRAFT','REAL','UNVERIFIED','CENTRAL',jsonb_build_object('createdFrom','ADMIN_V184')
  ) returning * into v_row;

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_tour_created_v184','tour',v_row.id::text,
    jsonb_build_object('title',v_row.title,'seo_slug',v_row.seo_slug,'publication_status',v_row.publication_status),
    jsonb_build_object('gateway','catalog-admin-v184'));

  return to_jsonb(v_row);
end;
$$;

create or replace function public.service_save_catalog_vehicle_v184(
  p_actor uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row public.vehicles%rowtype;
  v_actor_email text;
  v_category text:=upper(btrim(coalesce(p_payload->>'category','')));
  v_status text:=upper(btrim(coalesce(p_payload->>'publication_status','')));
  v_origin text:=upper(btrim(coalesce(p_payload->>'record_origin','REAL')));
  v_quality text:=upper(btrim(coalesce(p_payload->>'data_quality_status','UNVERIFIED')));
  v_active boolean;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception using errcode='22023', message='INVALID_CATALOG_PAYLOAD';
  end if;
  if v_category not in ('RENTAL','SALE') then raise exception using errcode='22023',message='INVALID_VEHICLE_CATEGORY'; end if;
  if v_status not in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED') then raise exception using errcode='22023',message='INVALID_PUBLICATION_STATUS'; end if;
  if v_origin not in ('REAL','DEMO') then raise exception using errcode='22023',message='INVALID_RECORD_ORIGIN'; end if;
  if v_quality not in ('UNVERIFIED','RESEARCHED','BUSINESS_VERIFIED') then raise exception using errcode='22023',message='INVALID_DATA_QUALITY_STATUS'; end if;

  select v.* into v_row from public.vehicles v where v.id=p_id for update;
  if not found then raise exception using errcode='P0002',message='VEHICLE_NOT_FOUND'; end if;
  v_before:=to_jsonb(v_row);

  v_active:=v_status in ('PUBLISHED','SCHEDULED');

  update public.vehicles set
    stock_code=left(btrim(coalesce(p_payload->>'stock_code','')),80),
    category=v_category,
    brand=left(btrim(coalesce(p_payload->>'brand','')),120),
    model=left(btrim(coalesce(p_payload->>'model','')),160),
    model_year=nullif(p_payload->>'model_year','')::integer,
    price=greatest(0,coalesce(nullif(p_payload->>'price','')::numeric,0)),
    rental_price_daily=case when v_category='RENTAL' then greatest(0,coalesce(nullif(p_payload->>'rental_price_daily','')::numeric,0)) else null end,
    mileage_km=case when v_category='SALE' then greatest(0,coalesce(nullif(p_payload->>'mileage_km','')::integer,0)) else null end,
    fuel_type=left(nullif(btrim(coalesce(p_payload->>'fuel_type','')),''),80),
    transmission=left(nullif(btrim(coalesce(p_payload->>'transmission','')),''),80),
    body_type=left(nullif(btrim(coalesce(p_payload->>'body_type','')),''),80),
    color=left(nullif(btrim(coalesce(p_payload->>'color','')),''),80),
    engine=left(nullif(btrim(coalesce(p_payload->>'engine','')),''),120),
    seats=nullif(p_payload->>'seats','')::smallint,
    doors=nullif(p_payload->>'doors','')::smallint,
    location=left(nullif(btrim(coalesce(p_payload->>'location','')),''),240),
    description=left(nullif(btrim(coalesce(p_payload->>'description','')),''),10000),
    features=case when jsonb_typeof(coalesce(p_payload->'features','[]'::jsonb))='array' then coalesce(p_payload->'features','[]'::jsonb) else '[]'::jsonb end,
    is_featured=coalesce((p_payload->>'is_featured')::boolean,false),
    is_active=v_active,
    availability_status=left(coalesce(nullif(btrim(p_payload->>'availability_status'),''),'AVAILABLE'),40),
    seo_slug=left(nullif(btrim(coalesce(p_payload->>'seo_slug','')),''),240),
    publication_status=v_status,
    published_at=case when v_status='PUBLISHED' then coalesce(nullif(p_payload->>'published_at','')::timestamptz,now()) else nullif(p_payload->>'published_at','')::timestamptz end,
    scheduled_at=case when v_status='SCHEDULED' then nullif(p_payload->>'scheduled_at','')::timestamptz else null end,
    record_origin=v_origin,
    data_quality_status=v_quality,
    spec_source_url=left(nullif(btrim(coalesce(p_payload->>'spec_source_url','')),''),1000),
    spec_source_name=left(nullif(btrim(coalesce(p_payload->>'spec_source_name','')),''),240),
    actual_vehicle_verified=case when v_quality='UNVERIFIED' then false else coalesce((p_payload->>'actual_vehicle_verified')::boolean,false) end,
    branch_id=nullif(p_payload->>'branch_id','')::uuid,
    metadata=case when jsonb_typeof(coalesce(p_payload->'metadata','{}'::jsonb))='object' then coalesce(p_payload->'metadata','{}'::jsonb) else '{}'::jsonb end,
    updated_at=now()
  where id=p_id
  returning * into v_row;
  v_after:=to_jsonb(v_row);

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_vehicle_saved_v184','vehicle',p_id::text,
    jsonb_build_object('stock_code',v_before->'stock_code','publication_status',v_before->'publication_status','branch_id',v_before->'branch_id'),
    jsonb_build_object('stock_code',v_after->'stock_code','publication_status',v_after->'publication_status','branch_id',v_after->'branch_id'),
    jsonb_build_object('gateway','catalog-admin-v184'));

  return v_after;
exception
  when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
    raise exception using errcode='22023', message='INVALID_CATALOG_FIELD_VALUE';
end;
$$;

create or replace function public.service_save_catalog_tour_v184(
  p_actor uuid,
  p_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row public.tours%rowtype;
  v_actor_email text;
  v_status text:=upper(btrim(coalesce(p_payload->>'publication_status','')));
  v_origin text:=upper(btrim(coalesce(p_payload->>'record_origin','REAL')));
  v_quality text:=upper(btrim(coalesce(p_payload->>'data_quality_status','UNVERIFIED')));
  v_active boolean;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception using errcode='22023', message='INVALID_CATALOG_PAYLOAD';
  end if;
  if v_status not in ('DRAFT','SCHEDULED','PUBLISHED','ARCHIVED') then raise exception using errcode='22023',message='INVALID_PUBLICATION_STATUS'; end if;
  if v_origin not in ('REAL','DEMO') then raise exception using errcode='22023',message='INVALID_RECORD_ORIGIN'; end if;
  if v_quality not in ('UNVERIFIED','RESEARCHED','BUSINESS_VERIFIED') then raise exception using errcode='22023',message='INVALID_DATA_QUALITY_STATUS'; end if;

  select t.* into v_row from public.tours t where t.id=p_id for update;
  if not found then raise exception using errcode='P0002',message='TOUR_NOT_FOUND'; end if;
  v_before:=to_jsonb(v_row);

  v_active:=v_status in ('PUBLISHED','SCHEDULED');

  update public.tours set
    title=left(btrim(coalesce(p_payload->>'title','')),240),
    seo_slug=left(nullif(btrim(coalesce(p_payload->>'seo_slug','')),''),240),
    category=left(nullif(btrim(coalesce(p_payload->>'category','')),''),120),
    short_description=left(nullif(btrim(coalesce(p_payload->>'short_description','')),''),1000),
    description=left(nullif(btrim(coalesce(p_payload->>'description','')),''),15000),
    price_per_person=greatest(0,coalesce(nullif(p_payload->>'price_per_person','')::numeric,0)),
    duration=left(nullif(btrim(coalesce(p_payload->>'duration','')),''),120),
    capacity=nullif(p_payload->>'capacity','')::integer,
    meeting_point=left(nullif(btrim(coalesce(p_payload->>'meeting_point','')),''),500),
    itinerary=case when jsonb_typeof(coalesce(p_payload->'itinerary','[]'::jsonb))='array' then coalesce(p_payload->'itinerary','[]'::jsonb) else '[]'::jsonb end,
    included_items=case when jsonb_typeof(coalesce(p_payload->'included_items','[]'::jsonb))='array' then coalesce(p_payload->'included_items','[]'::jsonb) else '[]'::jsonb end,
    excluded_items=case when jsonb_typeof(coalesce(p_payload->'excluded_items','[]'::jsonb))='array' then coalesce(p_payload->'excluded_items','[]'::jsonb) else '[]'::jsonb end,
    images=case when jsonb_typeof(coalesce(p_payload->'images','[]'::jsonb))='array' then coalesce(p_payload->'images','[]'::jsonb) else '[]'::jsonb end,
    cover_image=left(nullif(btrim(coalesce(p_payload->>'cover_image','')),''),2000),
    is_featured=coalesce((p_payload->>'is_featured')::boolean,false),
    is_active=v_active,
    publication_status=v_status,
    published_at=case when v_status='PUBLISHED' then coalesce(nullif(p_payload->>'published_at','')::timestamptz,now()) else nullif(p_payload->>'published_at','')::timestamptz end,
    scheduled_at=case when v_status='SCHEDULED' then nullif(p_payload->>'scheduled_at','')::timestamptz else null end,
    record_origin=v_origin,
    data_quality_status=v_quality,
    source_url=left(nullif(btrim(coalesce(p_payload->>'source_url','')),''),1000),
    source_name=left(nullif(btrim(coalesce(p_payload->>'source_name','')),''),240),
    location_name=left(nullif(btrim(coalesce(p_payload->>'location_name','')),''),300),
    latitude=nullif(p_payload->>'latitude','')::numeric,
    longitude=nullif(p_payload->>'longitude','')::numeric,
    map_url=left(nullif(btrim(coalesce(p_payload->>'map_url','')),''),2000),
    branch_id=nullif(p_payload->>'branch_id','')::uuid,
    metadata=case when jsonb_typeof(coalesce(p_payload->'metadata','{}'::jsonb))='object' then coalesce(p_payload->'metadata','{}'::jsonb) else '{}'::jsonb end,
    updated_at=now()
  where id=p_id
  returning * into v_row;
  v_after:=to_jsonb(v_row);

  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'catalog_tour_saved_v184','tour',p_id::text,
    jsonb_build_object('title',v_before->'title','publication_status',v_before->'publication_status','branch_id',v_before->'branch_id'),
    jsonb_build_object('title',v_after->'title','publication_status',v_after->'publication_status','branch_id',v_after->'branch_id'),
    jsonb_build_object('gateway','catalog-admin-v184'));

  return v_after;
exception
  when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
    raise exception using errcode='22023', message='INVALID_CATALOG_FIELD_VALUE';
end;
$$;

revoke all on function public.service_catalog_admin_snapshot_v184(uuid) from public,anon,authenticated;
revoke all on function public.service_catalog_media_summary_v184(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.service_create_catalog_vehicle_v184(uuid,text) from public,anon,authenticated;
revoke all on function public.service_create_catalog_tour_v184(uuid) from public,anon,authenticated;
revoke all on function public.service_save_catalog_vehicle_v184(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.service_save_catalog_tour_v184(uuid,uuid,jsonb) from public,anon,authenticated;

grant execute on function public.service_catalog_admin_snapshot_v184(uuid) to service_role;
grant execute on function public.service_catalog_media_summary_v184(uuid,text,uuid) to service_role;
grant execute on function public.service_create_catalog_vehicle_v184(uuid,text) to service_role;
grant execute on function public.service_create_catalog_tour_v184(uuid) to service_role;
grant execute on function public.service_save_catalog_vehicle_v184(uuid,uuid,jsonb) to service_role;
grant execute on function public.service_save_catalog_tour_v184(uuid,uuid,jsonb) to service_role;

commit;
