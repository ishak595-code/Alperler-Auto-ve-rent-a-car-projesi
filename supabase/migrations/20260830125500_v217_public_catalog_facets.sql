-- V217 compact facets keep filter UIs bounded even when catalogs grow to hundreds of thousands of rows.

create or replace function public.public_vehicle_facets_v217(p_category text)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with scoped as (
    select * from public.public_vehicle_catalog_v217
    where category = case when upper(coalesce(p_category,'')) = 'SALE' then 'SALE' else 'RENTAL' end
  )
  select jsonb_build_object(
    'brands', coalesce((select jsonb_agg(brand order by brand) from (select distinct brand from scoped where nullif(btrim(brand),'') is not null) q), '[]'::jsonb),
    'years', coalesce((select jsonb_agg(model_year order by model_year desc) from (select distinct model_year from scoped where model_year is not null) q), '[]'::jsonb),
    'fuels', coalesce((select jsonb_agg(fuel_type order by fuel_type) from (select distinct fuel_type from scoped where nullif(btrim(fuel_type),'') is not null) q), '[]'::jsonb),
    'transmissions', coalesce((select jsonb_agg(transmission order by transmission) from (select distinct transmission from scoped where nullif(btrim(transmission),'') is not null) q), '[]'::jsonb),
    'bodyTypes', coalesce((select jsonb_agg(body_type order by body_type) from (select distinct body_type from scoped where nullif(btrim(body_type),'') is not null) q), '[]'::jsonb),
    'colors', coalesce((select jsonb_agg(color order by color) from (select distinct color from scoped where nullif(btrim(color),'') is not null) q), '[]'::jsonb),
    'priceMin', coalesce((select min(case when category='RENTAL' then rental_price_daily else price end) from scoped),0),
    'priceMax', coalesce((select max(case when category='RENTAL' then rental_price_daily else price end) from scoped),0),
    'hourlyPriceMin', coalesce((select min(rental_price_hourly) from scoped where hourly_rental_enabled=true),0),
    'hourlyPriceMax', coalesce((select max(rental_price_hourly) from scoped where hourly_rental_enabled=true),0),
    'kmMin', coalesce((select min(mileage_km) from scoped),0),
    'kmMax', coalesce((select max(mileage_km) from scoped),0)
  );
$$;

revoke all on function public.public_vehicle_facets_v217(text) from public;
grant execute on function public.public_vehicle_facets_v217(text) to anon, authenticated;

create or replace function public.public_tour_facets_v217()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with scoped as (select * from public.public_tour_catalog_v217)
  select jsonb_build_object(
    'durations', coalesce((select jsonb_agg(duration order by duration) from (select distinct duration from scoped where nullif(btrim(duration),'') is not null) q), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(category order by category) from (select distinct category from scoped where nullif(btrim(category),'') is not null) q), '[]'::jsonb),
    'locations', coalesce((select jsonb_agg(location_name order by location_name) from (select distinct location_name from scoped where nullif(btrim(location_name),'') is not null) q), '[]'::jsonb),
    'priceMin', coalesce((select min(price_per_person) from scoped),0),
    'priceMax', coalesce((select max(price_per_person) from scoped),0)
  );
$$;

revoke all on function public.public_tour_facets_v217() from public;
grant execute on function public.public_tour_facets_v217() to anon, authenticated;
