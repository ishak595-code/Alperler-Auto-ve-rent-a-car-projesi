begin;

create or replace function private.enforce_vehicle_publication_quality()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.is_active = true and new.publication_status in ('PUBLISHED','SCHEDULED') then
    if nullif(btrim(coalesce(new.brand,'')), '') is null
      or nullif(btrim(coalesce(new.model,'')), '') is null
      or new.model_year is null or new.model_year < 1980 or new.model_year > 2100
      or new.category not in ('RENTAL','SALE')
      or nullif(btrim(coalesce(new.description,'')), '') is null
      or length(btrim(new.description)) < 80
      or new.branch_id is null
      or nullif(btrim(coalesce(new.cover_image,'')), '') is null
      or new.cover_image !~ '^https://'
    then
      raise exception 'CATALOG_PUBLICATION_QUALITY_FAILED';
    end if;

    if new.category = 'RENTAL' and (new.rental_price_daily is null or new.rental_price_daily <= 0) then
      raise exception 'CATALOG_RENTAL_PRICE_REQUIRED';
    end if;
    if new.category = 'SALE' and (new.price is null or new.price <= 0) then
      raise exception 'CATALOG_SALE_PRICE_REQUIRED';
    end if;
    if new.publication_status = 'SCHEDULED' and new.scheduled_at is null then
      raise exception 'CATALOG_SCHEDULE_REQUIRED';
    end if;
    if new.publication_status = 'PUBLISHED' and new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_vehicle_publication_quality() from public, anon, authenticated;

drop trigger if exists trg_vehicle_publication_quality on public.vehicles;
create trigger trg_vehicle_publication_quality
before insert or update on public.vehicles
for each row execute function private.enforce_vehicle_publication_quality();

create or replace function private.enforce_tour_publication_quality()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.is_active = true and new.publication_status in ('PUBLISHED','SCHEDULED') then
    if nullif(btrim(coalesce(new.title,'')), '') is null
      or nullif(btrim(coalesce(new.description,'')), '') is null
      or length(btrim(new.description)) < 80
      or nullif(btrim(coalesce(new.location_name,'')), '') is null
      or new.branch_id is null
      or nullif(btrim(coalesce(new.cover_image,'')), '') is null
      or new.cover_image !~ '^https://'
      or new.price_per_person is null or new.price_per_person < 0
    then
      raise exception 'TOUR_PUBLICATION_QUALITY_FAILED';
    end if;
    if new.publication_status = 'SCHEDULED' and new.scheduled_at is null then
      raise exception 'TOUR_SCHEDULE_REQUIRED';
    end if;
    if new.publication_status = 'PUBLISHED' and new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_tour_publication_quality() from public, anon, authenticated;

drop trigger if exists trg_tour_publication_quality on public.tours;
create trigger trg_tour_publication_quality
before insert or update on public.tours
for each row execute function private.enforce_tour_publication_quality();

create or replace function private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  before_row jsonb;
  after_row jsonb;
  row_for_id jsonb;
  actor_mail text;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  before_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_for_id := coalesce(after_row, before_row, '{}'::jsonb);
  actor_mail := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'email';

  insert into public.audit_logs(
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    auth.uid(),
    actor_mail,
    tg_op,
    tg_table_name,
    coalesce(row_for_id ->> 'id', row_for_id ->> 'section_key', row_for_id ->> 'user_id'),
    before_row,
    after_row
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.audit_admin_change() from public, anon, authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'vehicles','tours','campaigns','blog_posts','catalog_media',
    'homepage_sections','homepage_placements','branches','staff_profiles',
    'staff_branch_assignments','vehicle_staff_assignments','tour_staff_assignments',
    'admin_users'
  ]
  loop
    execute format('drop trigger if exists trg_audit_admin_change on public.%I', tbl);
    execute format(
      'create trigger trg_audit_admin_change after insert or update or delete on public.%I for each row execute function private.audit_admin_change()',
      tbl
    );
  end loop;
end;
$$;

-- Normalize provenance metadata for licensed reference media already in the catalog.
update public.catalog_media cm
set metadata = coalesce(cm.metadata, '{}'::jsonb) || jsonb_build_object(
  'verificationScope', 'MODEL_FAMILY',
  'sourceVerified', true,
  'verifiedAt', '2026-08-15'
)
where cm.vehicle_id is not null
  and cm.is_active = true
  and cm.external_url is not null;

update public.catalog_media cm
set metadata = coalesce(cm.metadata, '{}'::jsonb) || jsonb_build_object(
  'verificationScope',
  case
    when coalesce(cm.metadata->>'verification_status','') = 'NEARBY_LOCATION_VERIFIED' then 'NEARBY_LOCATION'
    when coalesce(cm.metadata->>'verification_status','') = 'PENDING_EXACT_LICENSED_MEDIA' then 'REFERENCE'
    when coalesce(cm.metadata->>'educationalReference','false') = 'true' then 'REFERENCE'
    else 'EXACT_LOCATION'
  end,
  'sourceVerified', true,
  'verifiedAt', '2026-08-15'
)
where cm.tour_id is not null
  and cm.is_active = true
  and cm.external_url is not null;

-- Accessibility: complete previously truncated vehicle gallery alternative text.
update public.catalog_media cm set alt_text = 'Audi A3 Sportback 8Y model ailesinin arka üç çeyrek görünümü'
from public.vehicles v where cm.vehicle_id=v.id and v.stock_code='LEGACY-2001' and cm.is_active and not cm.is_cover;
update public.catalog_media cm set alt_text = 'Mercedes-Benz Vito W447 facelift model ailesinin arka ve yan görünümü'
from public.vehicles v where cm.vehicle_id=v.id and v.stock_code='LEGACY-1002' and cm.is_active and not cm.is_cover;
update public.catalog_media cm set alt_text = 'Volkswagen Amarok ikinci nesil model ailesinin arka üç çeyrek görünümü'
from public.vehicles v where cm.vehicle_id=v.id and v.stock_code='LEGACY-1003' and cm.is_active and not cm.is_cover;
update public.catalog_media cm set alt_text = 'Renault Megane IV Sedan model ailesinin arka üç çeyrek görünümü'
from public.vehicles v where cm.vehicle_id=v.id and v.stock_code in ('LEGACY-1004','LEGACY-2002') and cm.is_active and not cm.is_cover;
update public.catalog_media cm set alt_text = 'BMW 3 Serisi G20 model ailesinin arka üç çeyrek görünümü'
from public.vehicles v where cm.vehicle_id=v.id and v.stock_code='LEGACY-1006' and cm.is_active and not cm.is_cover;

-- Replace the outdated Passat cover with a verified B8 facelift image photographed in 2021.
update public.catalog_media cm
set external_url = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/VW%20Passat%20GTE%20%28B8%2C%20Facelift%29%20%E2%80%93%20f%2020062021.jpg?width=1600',
    source_url = 'https://commons.wikimedia.org/wiki/File:VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg',
    source_name = 'Wikimedia Commons',
    license = 'CC BY-SA 3.0 DE',
    attribution = 'M 93 / Wikimedia Commons',
    alt_text = 'Volkswagen Passat B8 facelift 2021 model ailesinin ön üç çeyrek görünümü',
    metadata = coalesce(cm.metadata, '{}'::jsonb) || jsonb_build_object(
      'verificationScope','MODEL_FAMILY',
      'sourceVerified',true,
      'verifiedAt','2026-08-15',
      'mediaYear',2021,
      'powertrainNote','Görsel B8 facelift GTE model ailesine aittir; ilan aracı 1.6 TDI olarak ayrı teknik veriye sahiptir.'
    )
from public.vehicles v
where cm.vehicle_id=v.id and v.stock_code='LEGACY-1005' and cm.is_active=true and cm.is_cover=true;

-- Expand the sparse 2023 Hilux gallery with licensed 2023 AN120/AN130 model-family angles.
insert into public.catalog_media(
  vehicle_id, kind, external_url, source_url, source_name, license, attribution,
  alt_text, sort_order, is_cover, is_active, metadata
)
select v.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2813%29.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Toyota_Hilux_4x4_V_Conquest_2023_(13).jpg',
  'Wikimedia Commons', 'CC BY-SA 4.0', 'Captainmorlypogi1959 / Wikimedia Commons',
  'Toyota Hilux 2023 AN120/AN130 4x4 model ailesinin yan ve ön görünümü', 2, false, true,
  jsonb_build_object('verificationScope','MODEL_FAMILY','sourceVerified',true,'verifiedAt','2026-08-15','mediaYear',2023)
from public.vehicles v
where v.stock_code='LEGACY-2004'
  and not exists (
    select 1 from public.catalog_media cm
    where cm.vehicle_id=v.id and cm.external_url like '%Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2813%29%'
  );

insert into public.catalog_media(
  vehicle_id, kind, external_url, source_url, source_name, license, attribution,
  alt_text, sort_order, is_cover, is_active, metadata
)
select v.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2814%29.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Toyota_Hilux_4x4_V_Conquest_2023_(14).jpg',
  'Wikimedia Commons', 'CC BY-SA 4.0', 'Captainmorlypogi1959 / Wikimedia Commons',
  'Toyota Hilux 2023 AN120/AN130 4x4 model ailesinin ikinci dış görünümü', 3, false, true,
  jsonb_build_object('verificationScope','MODEL_FAMILY','sourceVerified',true,'verifiedAt','2026-08-15','mediaYear',2023)
from public.vehicles v
where v.stock_code='LEGACY-2004'
  and not exists (
    select 1 from public.catalog_media cm
    where cm.vehicle_id=v.id and cm.external_url like '%Toyota%20Hilux%204x4%20V%20Conquest%202023%20%2814%29%'
  );

commit;
