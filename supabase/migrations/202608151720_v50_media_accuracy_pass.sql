-- V50 media accuracy pass
-- Corrects misleading model-family media while preserving provenance.
-- Internet-sourced images remain reference media and are never promoted to ACTUAL_ASSET.

-- 1) 2021 Volkswagen Passat 1.6 TDI sedan
-- The previous cover depicts a GTE. It shares the B8 facelift shell, but the
-- powertrain/badging can mislead a customer viewing a 1.6 TDI listing.
with target as (
  select id
  from public.vehicles
  where model_year = 2021
    and brand = 'Volkswagen'
    and model = 'Passat'
    and category = 'RENTAL'
  order by updated_at desc nulls last
  limit 1
)
update public.catalog_media media
set
  is_active = false,
  is_cover = false,
  metadata = coalesce(media.metadata, '{}'::jsonb) || jsonb_build_object(
    'disabledAt', '2026-08-15',
    'disabledReason', 'POWERTRAIN_MISMATCH_REFERENCE',
    'displayNote', 'GTE reference removed from the 1.6 TDI listing because visible trim/powertrain cues could mislead customers.'
  )
from target
where media.vehicle_id = target.id
  and media.source_url like '%Passat_GTE%';

with target as (
  select id
  from public.vehicles
  where model_year = 2021
    and brand = 'Volkswagen'
    and model = 'Passat'
    and category = 'RENTAL'
  order by updated_at desc nulls last
  limit 1
), source_rows as (
  select * from (values
    (
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Passat%20B8%20%282019%29%20IMG%202431.jpg?width=1600'::text,
      'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2431.jpg'::text,
      'Volkswagen Passat B8 2019 facelift sedan model-family reference'::text,
      1::integer,
      true
    ),
    (
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Passat%20B8%20%282019%29%20IMG%202432.jpg?width=1600'::text,
      'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2432.jpg'::text,
      'Volkswagen Passat B8 2019 facelift sedan model-family second view'::text,
      2::integer,
      false
    )
  ) as t(external_url, source_url, alt_text, sort_order, is_cover)
)
insert into public.catalog_media (
  id, vehicle_id, kind, external_url, source_url, source_name, license,
  attribution, alt_text, sort_order, is_cover, is_active, metadata
)
select
  gen_random_uuid(),
  target.id,
  'IMAGE',
  source_rows.external_url,
  source_rows.source_url,
  'Wikimedia Commons',
  'CC BY-SA 4.0',
  'Alexander Migl / Wikimedia Commons',
  source_rows.alt_text,
  source_rows.sort_order,
  source_rows.is_cover,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verificationScope', 'MODEL_FAMILY',
    'verifiedAt', '2026-08-15',
    'mediaDate', '2020-03-29',
    'modelFamily', 'Volkswagen Passat B8 (2019 facelift) sedan',
    'rightsMode', 'REUSE_ALLOWED',
    'displayNote', 'Licensed B8 facelift sedan reference; not a photograph of the physical rental vehicle.'
  )
from target
cross join source_rows
where not exists (
  select 1
  from public.catalog_media existing
  where existing.vehicle_id = target.id
    and existing.source_url = source_rows.source_url
);

-- Normalize the active Passat cover and ordering idempotently.
with target as (
  select id
  from public.vehicles
  where model_year = 2021 and brand = 'Volkswagen' and model = 'Passat' and category = 'RENTAL'
  order by updated_at desc nulls last limit 1
)
update public.catalog_media media
set
  is_active = true,
  is_cover = (media.source_url = 'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2431.jpg'),
  sort_order = case
    when media.source_url = 'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2431.jpg' then 1
    when media.source_url = 'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2432.jpg' then 2
    when media.source_url = 'https://commons.wikimedia.org/wiki/File:Passat_B8_Cockpit.jpg' then 3
    else media.sort_order
  end
from target
where media.vehicle_id = target.id
  and media.source_url in (
    'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2431.jpg',
    'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2432.jpg',
    'https://commons.wikimedia.org/wiki/File:Passat_B8_Cockpit.jpg'
  );

update public.vehicles
set
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:Volkswagen_Passat_B8_(2019)_IMG_2431.jpg',
    'coverMediaAttribution', 'Alexander Migl / Wikimedia Commons',
    'coverMediaLicense', 'CC BY-SA 4.0',
    'verifiedModelFamily', 'Volkswagen Passat B8 2019 facelift sedan',
    'verifiedMediaYear', 2020,
    'mediaTruthfulnessVersion', 'V50',
    'mediaSourceScope', 'B8 facelift sedan body reference; physical 1.6 TDI inventory vehicle remains business-verified data'
  ),
  updated_at = now()
where model_year = 2021 and brand = 'Volkswagen' and model = 'Passat' and category = 'RENTAL';

-- 2) 2022 BMW 320i M Sport
-- Promote an exact 320i M Sport G20 reference over the generic G20 cover.
with target as (
  select id
  from public.vehicles
  where model_year = 2022 and brand = 'BMW' and model = '3.20i' and category = 'RENTAL'
  order by updated_at desc nulls last limit 1
)
update public.catalog_media media
set is_cover = false,
    sort_order = case when is_cover then 3 else sort_order end
from target
where media.vehicle_id = target.id
  and media.is_active = true;

with target as (
  select id
  from public.vehicles
  where model_year = 2022 and brand = 'BMW' and model = '3.20i' and category = 'RENTAL'
  order by updated_at desc nulls last limit 1
)
insert into public.catalog_media (
  id, vehicle_id, kind, external_url, source_url, source_name, license,
  attribution, alt_text, sort_order, is_cover, is_active, metadata
)
select
  gen_random_uuid(),
  target.id,
  'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW%20G20%20320i%20M%20Sport%20Black%20Sapphire%20Metallic%20%283%29.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:BMW_G20_320i_M_Sport_Black_Sapphire_Metallic_(3).jpg',
  'Wikimedia Commons',
  'CC BY-SA 4.0',
  'Damian B Oh / Wikimedia Commons',
  'BMW G20 320i M Sport model reference photographed in November 2022',
  1,
  true,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verificationScope', 'MODEL_FAMILY',
    'verifiedAt', '2026-08-15',
    'mediaDate', '2022-11-19',
    'modelMatch', 'BMW G20 320i M Sport',
    'rightsMode', 'REUSE_ALLOWED',
    'displayNote', 'Licensed exact-model G20 320i M Sport reference; not a photograph of the physical rental vehicle.'
  )
from target
where not exists (
  select 1 from public.catalog_media existing
  where existing.vehicle_id = target.id
    and existing.source_url = 'https://commons.wikimedia.org/wiki/File:BMW_G20_320i_M_Sport_Black_Sapphire_Metallic_(3).jpg'
);

with target as (
  select id
  from public.vehicles
  where model_year = 2022 and brand = 'BMW' and model = '3.20i' and category = 'RENTAL'
  order by updated_at desc nulls last limit 1
)
update public.catalog_media media
set is_active = true, is_cover = true, sort_order = 1
from target
where media.vehicle_id = target.id
  and media.source_url = 'https://commons.wikimedia.org/wiki/File:BMW_G20_320i_M_Sport_Black_Sapphire_Metallic_(3).jpg';

-- Keep the already exact rear 320i M Sport reference as the second view.
with target as (
  select id
  from public.vehicles
  where model_year = 2022 and brand = 'BMW' and model = '3.20i' and category = 'RENTAL'
  order by updated_at desc nulls last limit 1
)
update public.catalog_media media
set sort_order = 2,
    metadata = coalesce(media.metadata, '{}'::jsonb) || jsonb_build_object(
      'sourceVerified', true,
      'verificationScope', 'MODEL_FAMILY',
      'verifiedAt', '2026-08-15',
      'modelMatch', 'BMW 320i M Sport G20'
    )
from target
where media.vehicle_id = target.id
  and media.source_url = 'https://commons.wikimedia.org/wiki/File:BMW_320i_M_Sport_(G20)_rear.jpg';

update public.vehicles
set
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:BMW_G20_320i_M_Sport_Black_Sapphire_Metallic_(3).jpg',
    'coverMediaAttribution', 'Damian B Oh / Wikimedia Commons',
    'coverMediaLicense', 'CC BY-SA 4.0',
    'verifiedModelFamily', 'BMW G20 320i M Sport',
    'verifiedMediaYear', 2022,
    'mediaTruthfulnessVersion', 'V50'
  ),
  updated_at = now()
where model_year = 2022 and brand = 'BMW' and model = '3.20i' and category = 'RENTAL';

-- 3) Evidence-link hygiene
-- Ford: use the official source whose published table directly includes the
-- 1.5 EcoBlue 120 PS + 8-speed automatic powertrain used by this listing.
update public.vehicles
set
  spec_source_name = 'Ford Media Center Switzerland',
  spec_source_url = 'https://media.ford.com/content/fordmedia/feu/ch/de/news/2020/06/22/new-electrified-focus-ecoboost-hybrid-delivers-17-per-cent-bette.html',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'specSourceScope', 'Focus Mk4 1.5 EcoBlue 120 PS eight-speed automatic model-family reference',
    'specSourceVerifiedAt', '2026-08-15'
  ),
  updated_at = now()
where model_year = 2021 and brand = 'Ford' and model = 'Focus' and category = 'RENTAL';

-- Audi: remove the stale engine-filter query from the evidence URL. The generic
-- A3 Sportback technical-data page currently lists 1.5 TFSI 110 kW/150 PS and
-- the S tronic MHEV variant explicitly.
update public.vehicles
set
  spec_source_name = 'Audi MediaCenter',
  spec_source_url = 'https://www.audi-mediacenter.com/de/a3-sportback-8/technische-daten',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'specSourceScope', 'Audi A3 Sportback 1.5 TFSI 110 kW/150 PS technical-data reference; physical vehicle equipment remains business-verified data',
    'specSourceVerifiedAt', '2026-08-15'
  ),
  updated_at = now()
where model_year = 2022 and brand = 'Audi' and model = 'A3' and category = 'SALE';
