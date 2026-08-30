-- V215 vehicle SEO slug invariant.
-- The database owns the fallback so admin, RPC and future trusted server writers
-- cannot leave published vehicle identities without a stable route slug.

create or replace function private.ensure_vehicle_seo_slug_v215()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  prefix text;
  candidate text;
begin
  if nullif(btrim(new.seo_slug), '') is not null then
    new.seo_slug := left(
      trim(both '-' from regexp_replace(
        translate(lower(btrim(new.seo_slug)), 'çğıöşü', 'cgiosu'),
        '[^a-z0-9]+', '-', 'g'
      )),
      140
    );
    return new;
  end if;

  prefix := case when new.category = 'SALE' then 'satilik' else 'kiralik' end;
  candidate := concat_ws('-',
    prefix,
    nullif(btrim(new.brand), ''),
    nullif(btrim(new.model), ''),
    new.model_year::text,
    nullif(btrim(new.stock_code), '')
  );
  candidate := translate(lower(candidate), 'çğıöşü', 'cgiosu');
  candidate := trim(both '-' from regexp_replace(candidate, '[^a-z0-9]+', '-', 'g'));

  if candidate = '' then
    candidate := concat(prefix, '-', replace(new.id::text, '-', ''));
  end if;

  new.seo_slug := left(candidate, 140);
  return new;
end;
$$;

revoke all on function private.ensure_vehicle_seo_slug_v215() from public, anon, authenticated;

update public.vehicles
set seo_slug = null
where nullif(btrim(seo_slug), '') is null;

create unique index if not exists vehicles_seo_slug_key
  on public.vehicles using btree (seo_slug);

drop trigger if exists vehicles_seo_slug_guard_v215 on public.vehicles;
create trigger vehicles_seo_slug_guard_v215
before insert or update of seo_slug, category, brand, model, model_year, stock_code
on public.vehicles
for each row
execute function private.ensure_vehicle_seo_slug_v215();
