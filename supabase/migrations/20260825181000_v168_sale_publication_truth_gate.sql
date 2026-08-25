-- V168 Sale Showcase Truth Integrity.
-- Published sale listings must expose complete first-party facts. Optional part-level
-- expertise remains optional because absence must never be converted into a clean report.

create or replace function public.enforce_vehicle_publication_quality()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  active_image_count integer := 0;
  active_cover_count integer := 0;
  effective_price numeric := 0;
  sale_damage_status text := '';
  sale_tramer text := '';
begin
  if new.publication_status not in ('PUBLISHED', 'SCHEDULED') then return new; end if;

  if coalesce(trim(new.brand), '') = '' or coalesce(trim(new.model), '') = '' then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:BRAND_MODEL_REQUIRED';
  end if;
  if new.model_year is null or new.model_year < 1950 or new.model_year > extract(year from current_date)::integer + 1 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:MODEL_YEAR_INVALID';
  end if;

  effective_price := case when new.category='RENTAL' then coalesce(new.rental_price_daily,new.price,0) else coalesce(new.price,0) end;
  if effective_price <= 0 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:PRICE_REQUIRED';
  end if;
  if new.branch_id is null then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:BRANCH_REQUIRED';
  end if;
  if length(coalesce(trim(new.description),'')) < 40 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:DESCRIPTION_TOO_SHORT';
  end if;
  if coalesce(new.data_quality_status,'UNVERIFIED')='UNVERIFIED' then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:DATA_UNVERIFIED';
  end if;
  if new.data_quality_status <> 'BUSINESS_VERIFIED' and (coalesce(trim(new.spec_source_name),'')='' or coalesce(trim(new.spec_source_url),'') !~ '^https://') then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:TECHNICAL_SOURCE_REQUIRED';
  end if;

  if new.category='SALE' then
    sale_damage_status := coalesce(trim(new.metadata->>'damageStatus'),'');
    sale_tramer := coalesce(trim(new.metadata->>'tramer'),'');
    if new.mileage_km is null or new.mileage_km < 0 then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_MILEAGE_REQUIRED';
    end if;
    if coalesce(trim(new.fuel_type),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_FUEL_REQUIRED';
    end if;
    if coalesce(trim(new.transmission),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRANSMISSION_REQUIRED';
    end if;
    if coalesce(trim(new.body_type),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_BODY_TYPE_REQUIRED';
    end if;
    if coalesce(trim(new.color),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_COLOR_REQUIRED';
    end if;
    if coalesce(trim(new.engine),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_ENGINE_REQUIRED';
    end if;
    if coalesce(trim(new.location),'')='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_LOCATION_REQUIRED';
    end if;
    if sale_damage_status='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_DAMAGE_STATUS_REQUIRED';
    end if;
    if sale_tramer='' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_DECLARATION_REQUIRED';
    end if;
  end if;

  if new.publication_status='SCHEDULED' and (new.scheduled_at is null or new.scheduled_at <= now() + interval '1 minute') then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SCHEDULE_MUST_BE_FUTURE';
  end if;
  if new.publication_status='PUBLISHED' and new.is_active is not true then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:PUBLISHED_MUST_BE_ACTIVE';
  end if;

  select count(*) filter(where is_active=true and kind='IMAGE'),
         count(*) filter(where is_active=true and kind='IMAGE' and is_cover=true)
    into active_image_count,active_cover_count
  from public.catalog_media where vehicle_id=new.id;
  if active_image_count < 1 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:ACTIVE_IMAGE_REQUIRED';
  end if;
  if active_cover_count <> 1 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SINGLE_ACTIVE_COVER_REQUIRED';
  end if;
  return new;
end;
$$;

comment on function public.enforce_vehicle_publication_quality() is
'V168 publication gate. SALE listings require canonical mileage, drivetrain basics, location, damage summary and tramer declaration; part-level expertise remains optional.';
