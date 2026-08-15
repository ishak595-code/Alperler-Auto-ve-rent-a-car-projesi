-- V54 Peugeot 3008 media accuracy
-- Replace facelift/2021 references on the 2020 Allure listing with a directly
-- identified 2020 BlueHDi Allure reference plus a clearly scoped 2019 Allure
-- same-generation secondary reference. Neither image is a physical inventory photo.

with target as (
  select id
  from public.vehicles
  where model_year = 2020 and brand = 'Peugeot' and model = '3008' and category = 'SALE'
  order by updated_at desc nulls last
  limit 1
)
update public.catalog_media media
set
  is_active = false,
  is_cover = false,
  metadata = coalesce(media.metadata, '{}'::jsonb) || jsonb_build_object(
    'disabledAt', '2026-08-15',
    'disabledReason', 'MODEL_YEAR_FACELIFT_MISMATCH_REFERENCE',
    'mediaTruthfulnessVersion', 'V54'
  )
from target
where media.vehicle_id = target.id
  and media.source_url in (
    'https://commons.wikimedia.org/wiki/File:Peugeot_3008_facelift.jpg',
    'https://commons.wikimedia.org/wiki/File:2021_Peugeot_3008_Allure_(Rear).jpg'
  );

with target as (
  select id
  from public.vehicles
  where model_year = 2020 and brand = 'Peugeot' and model = '3008' and category = 'SALE'
  order by updated_at desc nulls last
  limit 1
), source_rows as (
  select * from (values
    (
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot%203008%20BlueHDi%20Allure%202020%20%2850234924732%29.jpg?width=1600'::text,
      'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2020_(50234924732).jpg'::text,
      'CC BY-SA 2.0'::text,
      'RL GNZLZ / Wikimedia Commons'::text,
      '2020 Peugeot 3008 BlueHDi Allure model-year and trim reference'::text,
      1::integer,
      true,
      'EXACT_MODEL_YEAR'::text,
      2020::integer
    ),
    (
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot%203008%20BlueHDi%20Allure%202019.jpg?width=1600'::text,
      'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2019.jpg'::text,
      'CC BY-SA 4.0'::text,
      'RL GNZLZ / Wikimedia Commons'::text,
      'Peugeot 3008 BlueHDi Allure pre-facelift same-generation secondary reference'::text,
      2::integer,
      false,
      'MODEL_FAMILY'::text,
      2019::integer
    )
  ) as t(external_url, source_url, license, attribution, alt_text, sort_order, is_cover, verification_scope, reference_year)
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
  source_rows.license,
  source_rows.attribution,
  source_rows.alt_text,
  source_rows.sort_order,
  source_rows.is_cover,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verificationScope', source_rows.verification_scope,
    'verifiedAt', '2026-08-15',
    'referenceYear', source_rows.reference_year,
    'modelMatch', case when source_rows.reference_year = 2020 then 'Peugeot 3008 BlueHDi Allure 2020' else 'Peugeot 3008 BlueHDi Allure 2019, same pre-facelift generation' end,
    'rightsMode', 'REUSE_ALLOWED',
    'mediaTruthfulnessVersion', 'V54',
    'displayNote', 'Licensed reference image; not a photograph of the physical sale vehicle.'
  )
from target
cross join source_rows
where not exists (
  select 1 from public.catalog_media existing
  where existing.vehicle_id = target.id and existing.source_url = source_rows.source_url
);

with target as (
  select id
  from public.vehicles
  where model_year = 2020 and brand = 'Peugeot' and model = '3008' and category = 'SALE'
  order by updated_at desc nulls last
  limit 1
)
update public.catalog_media media
set
  is_active = true,
  is_cover = (media.source_url = 'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2020_(50234924732).jpg'),
  sort_order = case
    when media.source_url = 'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2020_(50234924732).jpg' then 1
    when media.source_url = 'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2019.jpg' then 2
    else media.sort_order
  end
from target
where media.vehicle_id = target.id
  and media.source_url in (
    'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2020_(50234924732).jpg',
    'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2019.jpg'
  );

update public.vehicles
set
  spec_source_name = 'Peugeot / Stellantis Media',
  spec_source_url = 'https://www.media.stellantis.com/uk-en/peugeot/press/peugeot-confirms-new-3008-suv-and-new-5008-suv-prices-and-specifications-as-order-books-open',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:Peugeot_3008_BlueHDi_Allure_2020_(50234924732).jpg',
    'coverMediaAttribution', 'RL GNZLZ / Wikimedia Commons',
    'coverMediaLicense', 'CC BY-SA 2.0',
    'verifiedModelFamily', 'Peugeot 3008 II BlueHDi Allure pre-facelift',
    'verifiedMediaYear', 2020,
    'mediaTruthfulnessVersion', 'V54',
    'specSourceScope', 'Official Peugeot model-family reference confirms Allure with 1.5 BlueHDi 130 EAT8; exterior reference separately matches the 2020 BlueHDi Allure identity.'
  ),
  updated_at = now()
where model_year = 2020 and brand = 'Peugeot' and model = '3008' and category = 'SALE';
