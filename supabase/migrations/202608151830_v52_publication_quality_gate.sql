-- V52 publication quality gates
-- Draft and archived records remain freely editable. Published and scheduled
-- records must satisfy the minimum production contract even if the UI is bypassed.

create or replace function public.enforce_vehicle_publication_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_image_count integer := 0;
  active_cover_count integer := 0;
  effective_price numeric := 0;
begin
  if new.publication_status not in ('PUBLISHED', 'SCHEDULED') then
    return new;
  end if;

  if coalesce(trim(new.brand), '') = '' or coalesce(trim(new.model), '') = '' then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:BRAND_MODEL_REQUIRED';
  end if;

  if new.model_year is null
     or new.model_year < 1950
     or new.model_year > extract(year from current_date)::integer + 1 then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:MODEL_YEAR_INVALID';
  end if;

  effective_price := case
    when new.category = 'RENTAL' then coalesce(new.rental_price_daily, new.price, 0)
    else coalesce(new.price, 0)
  end;
  if effective_price <= 0 then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:PRICE_REQUIRED';
  end if;

  if new.branch_id is null then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:BRANCH_REQUIRED';
  end if;

  if length(coalesce(trim(new.description), '')) < 40 then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:DESCRIPTION_TOO_SHORT';
  end if;

  if coalesce(new.data_quality_status, 'UNVERIFIED') = 'UNVERIFIED' then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:DATA_UNVERIFIED';
  end if;

  if new.data_quality_status <> 'BUSINESS_VERIFIED' and (
    coalesce(trim(new.spec_source_name), '') = ''
    or coalesce(trim(new.spec_source_url), '') !~ '^https://'
  ) then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:TECHNICAL_SOURCE_REQUIRED';
  end if;

  if new.publication_status = 'SCHEDULED' and (
    new.scheduled_at is null or new.scheduled_at <= now() + interval '1 minute'
  ) then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:SCHEDULE_MUST_BE_FUTURE';
  end if;

  if new.publication_status = 'PUBLISHED' and new.is_active is not true then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:PUBLISHED_MUST_BE_ACTIVE';
  end if;

  select
    count(*) filter (where is_active = true and kind = 'IMAGE'),
    count(*) filter (where is_active = true and kind = 'IMAGE' and is_cover = true)
  into active_image_count, active_cover_count
  from public.catalog_media
  where vehicle_id = new.id;

  if active_image_count < 1 then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:ACTIVE_IMAGE_REQUIRED';
  end if;
  if active_cover_count <> 1 then
    raise exception using errcode = '23514', message = 'VEHICLE_PUBLICATION_BLOCKED:SINGLE_ACTIVE_COVER_REQUIRED';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_tour_publication_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_image_count integer := 0;
  active_cover_count integer := 0;
begin
  if new.publication_status not in ('PUBLISHED', 'SCHEDULED') then
    return new;
  end if;

  if coalesce(trim(new.title), '') = '' or coalesce(trim(new.seo_slug), '') = '' then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:TITLE_SLUG_REQUIRED';
  end if;
  if coalesce(new.price_per_person, 0) <= 0 then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:PRICE_REQUIRED';
  end if;
  if new.branch_id is null then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:BRANCH_REQUIRED';
  end if;
  if length(coalesce(trim(new.description), '')) < 40 then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:DESCRIPTION_TOO_SHORT';
  end if;
  if coalesce(new.data_quality_status, 'UNVERIFIED') = 'UNVERIFIED' then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:DATA_UNVERIFIED';
  end if;
  if coalesce(trim(new.location_name), '') = '' then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:LOCATION_REQUIRED';
  end if;
  if new.data_quality_status <> 'BUSINESS_VERIFIED' and (
    coalesce(trim(new.source_name), '') = ''
    or coalesce(trim(new.source_url), '') !~ '^https://'
  ) then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:SOURCE_REQUIRED';
  end if;
  if new.publication_status = 'SCHEDULED' and (
    new.scheduled_at is null or new.scheduled_at <= now() + interval '1 minute'
  ) then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:SCHEDULE_MUST_BE_FUTURE';
  end if;
  if new.publication_status = 'PUBLISHED' and new.is_active is not true then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:PUBLISHED_MUST_BE_ACTIVE';
  end if;

  select
    count(*) filter (where is_active = true and kind = 'IMAGE'),
    count(*) filter (where is_active = true and kind = 'IMAGE' and is_cover = true)
  into active_image_count, active_cover_count
  from public.catalog_media
  where tour_id = new.id;

  if active_image_count < 1 then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:ACTIVE_IMAGE_REQUIRED';
  end if;
  if active_cover_count <> 1 then
    raise exception using errcode = '23514', message = 'TOUR_PUBLICATION_BLOCKED:SINGLE_ACTIVE_COVER_REQUIRED';
  end if;

  return new;
end;
$$;

drop trigger if exists vehicles_publication_quality_gate on public.vehicles;
create trigger vehicles_publication_quality_gate
before insert or update on public.vehicles
for each row execute function public.enforce_vehicle_publication_quality();

drop trigger if exists tours_publication_quality_gate on public.tours;
create trigger tours_publication_quality_gate
before insert or update on public.tours
for each row execute function public.enforce_tour_publication_quality();

revoke all on function public.enforce_vehicle_publication_quality() from public, anon, authenticated;
revoke all on function public.enforce_tour_publication_quality() from public, anon, authenticated;
