create or replace function public.replace_turkey_geo_directory(
  p_provinces jsonb,
  p_districts jsonb,
  p_source_updated_at date,
  p_checksum text
) returns jsonb
language plpgsql security definer
set search_path=public,pg_catalog
as $$
declare v_provinces integer; v_districts integer;
begin
  if jsonb_typeof(p_provinces)<>'array' or jsonb_typeof(p_districts)<>'array' then raise exception using errcode='22023',message='GEO_DATA_INVALID'; end if;
  v_provinces:=jsonb_array_length(p_provinces); v_districts:=jsonb_array_length(p_districts);
  if v_provinces<>81 or v_districts<970 or v_districts>1100 then raise exception using errcode='22023',message='GEO_DATA_COUNT_INVALID'; end if;

  create temporary table tmp_geo_provinces(code text primary key,name text not null,slug text not null,latitude numeric,longitude numeric) on commit drop;
  create temporary table tmp_geo_districts(code text primary key,province_code text not null,name text not null,slug text not null,latitude numeric,longitude numeric) on commit drop;
  insert into tmp_geo_provinces select x.code,btrim(x.name),btrim(x.slug),x.latitude,x.longitude from jsonb_to_recordset(p_provinces) as x(code text,name text,slug text,latitude numeric,longitude numeric);
  insert into tmp_geo_districts select x.code,x.province_code,btrim(x.name),btrim(x.slug),x.latitude,x.longitude from jsonb_to_recordset(p_districts) as x(code text,province_code text,name text,slug text,latitude numeric,longitude numeric);

  if (select count(*) from tmp_geo_provinces)<>81 or (select count(*) from tmp_geo_districts)<>v_districts
     or exists(select 1 from tmp_geo_provinces where code!~'^TUR[0-9]{3}$' or name='' or slug='')
     or exists(select 1 from tmp_geo_districts where code!~'^TUR[0-9]{6}$' or province_code!~'^TUR[0-9]{3}$' or name='' or slug='')
     or exists(select 1 from tmp_geo_districts d left join tmp_geo_provinces p on p.code=d.province_code where p.code is null)
  then raise exception using errcode='22023',message='GEO_DATA_RELATION_INVALID'; end if;

  insert into public.geo_provinces(code,name,slug,latitude,longitude,source_updated_at,synced_at)
  select code,name,slug,latitude,longitude,p_source_updated_at,now() from tmp_geo_provinces
  on conflict(code) do update set name=excluded.name,slug=excluded.slug,latitude=excluded.latitude,longitude=excluded.longitude,source_updated_at=excluded.source_updated_at,synced_at=now();

  insert into public.geo_districts(code,province_code,name,slug,latitude,longitude,source_updated_at,synced_at)
  select code,province_code,name,slug,latitude,longitude,p_source_updated_at,now() from tmp_geo_districts
  on conflict(code) do update set province_code=excluded.province_code,name=excluded.name,slug=excluded.slug,latitude=excluded.latitude,longitude=excluded.longitude,source_updated_at=excluded.source_updated_at,synced_at=now();

  delete from public.geo_districts d where not exists(select 1 from tmp_geo_districts t where t.code=d.code)
    and not exists(select 1 from public.branch_partner_requests r where r.district_code=d.code)
    and not exists(select 1 from public.branches b where b.district_code=d.code);
  delete from public.geo_provinces p where not exists(select 1 from tmp_geo_provinces t where t.code=p.code)
    and not exists(select 1 from public.geo_districts d where d.province_code=p.code)
    and not exists(select 1 from public.branch_partner_requests r where r.province_code=p.code)
    and not exists(select 1 from public.branches b where b.province_code=p.code);

  insert into public.geo_sync_state(dataset_key,source_name,source_url,source_updated_at,province_count,district_count,checksum,synced_at,metadata)
  values('TR_ADMIN_LEVEL_1_2','Open Admin Data','https://github.com/open-admin-data/turkey-administrative-divisions',p_source_updated_at,81,v_districts,left(p_checksum,128),now(),jsonb_build_object('license','CC-BY-4.0','levels',jsonb_build_array('province','district')))
  on conflict(dataset_key) do update set source_name=excluded.source_name,source_url=excluded.source_url,source_updated_at=excluded.source_updated_at,province_count=excluded.province_count,district_count=excluded.district_count,checksum=excluded.checksum,synced_at=now(),metadata=excluded.metadata;
  return jsonb_build_object('provinces',81,'districts',v_districts,'syncedAt',now());
end;$$;
revoke all on function public.replace_turkey_geo_directory(jsonb,jsonb,date,text) from public,anon,authenticated;
grant execute on function public.replace_turkey_geo_directory(jsonb,jsonb,date,text) to service_role;
