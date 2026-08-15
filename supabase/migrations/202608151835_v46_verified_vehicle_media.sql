begin;

-- V46 media truthfulness hardening.
-- Replace trim/powertrain-mismatched cover references only when a better
-- licensed, source-verifiable reference exists. These are still reference
-- images, not photographs of the physical inventory vehicle.

-- Mercedes-Benz C 200 W206, 2023
-- Source: https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_200_(W206,_2023)_(54708506199).jpg
-- License: CC0 1.0
with target as (
  select id
  from public.vehicles
  where category = 'RENTAL'
    and brand = 'Mercedes-Benz'
    and model = 'C Serisi (Süslenmiş Gelin Arabası)'
    and model_year = 2023
  limit 1
)
update public.catalog_media cm
set is_active = false,
    is_cover = false,
    updated_at = now()
from target
where cm.vehicle_id = target.id
  and cm.external_url like '%Mercedes-Benz_C-Klasse_(W206)_C_300_%';

with target as (
  select id
  from public.vehicles
  where category = 'RENTAL'
    and brand = 'Mercedes-Benz'
    and model = 'C Serisi (Süslenmiş Gelin Arabası)'
    and model_year = 2023
  limit 1
)
insert into public.catalog_media (
  vehicle_id,
  kind,
  external_url,
  source_url,
  source_name,
  license,
  attribution,
  alt_text,
  sort_order,
  is_cover,
  is_active,
  metadata
)
select
  target.id,
  'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20C%20200%20%28W206%2C%202023%29%20%2854708506199%29.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_200_(W206,_2023)_(54708506199).jpg',
  'Wikimedia Commons',
  'CC0 1.0',
  'Charles / Wikimedia Commons',
  'Mercedes-Benz C 200 W206 2023 model referansı',
  1,
  true,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verifiedAt', '2026-08-15',
    'verificationScope', 'EXACT_MODEL_YEAR',
    'modelMatch', 'Mercedes-Benz C 200 W206',
    'modelYearMatch', 2023,
    'rightsMode', 'REUSE_ALLOWED',
    'note', 'Lisanslı referans görseldir; fiziksel kiralık aracın kendi fotoğrafı değildir.'
  )
from target
where not exists (
  select 1
  from public.catalog_media existing
  where existing.vehicle_id = target.id
    and existing.source_url = 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_200_(W206,_2023)_(54708506199).jpg'
);

with target as (
  select id
  from public.vehicles
  where category = 'RENTAL'
    and brand = 'Mercedes-Benz'
    and model = 'C Serisi (Süslenmiş Gelin Arabası)'
    and model_year = 2023
  limit 1
), media as (
  select cm.external_url
  from public.catalog_media cm
  join target on target.id = cm.vehicle_id
  where cm.source_url = 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_200_(W206,_2023)_(54708506199).jpg'
    and cm.is_active = true
  limit 1
)
update public.vehicles v
set cover_image = media.external_url,
    images = array[
      media.external_url,
      'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20C-Class%20%28W206%2C%20rear%29.jpg?width=1600'
    ]::text[],
    metadata = coalesce(v.metadata, '{}'::jsonb) || jsonb_build_object(
      'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_C_200_(W206,_2023)_(54708506199).jpg',
      'coverMediaLicense', 'CC0 1.0',
      'coverMediaAttribution', 'Charles / Wikimedia Commons',
      'verifiedModelFamily', 'Mercedes-Benz C 200 W206',
      'verifiedMediaYear', 2023,
      'mediaTruthfulnessVersion', 'V46'
    ),
    updated_at = now()
from target, media
where v.id = target.id;

-- Toyota Hilux Invincible reference.
-- Source: https://commons.wikimedia.org/wiki/File:Toyota_HiLux_Invincible,_WAW(1).jpg
-- License: CC BY-SA 4.0
with target as (
  select id
  from public.vehicles
  where category = 'SALE'
    and brand = 'Toyota'
    and model = 'Hilux'
    and model_year = 2023
  limit 1
)
update public.catalog_media cm
set is_active = false,
    is_cover = false,
    updated_at = now()
from target
where cm.vehicle_id = target.id
  and cm.is_active = true;

with target as (
  select id
  from public.vehicles
  where category = 'SALE'
    and brand = 'Toyota'
    and model = 'Hilux'
    and model_year = 2023
  limit 1
)
insert into public.catalog_media (
  vehicle_id,
  kind,
  external_url,
  source_url,
  source_name,
  license,
  attribution,
  alt_text,
  sort_order,
  is_cover,
  is_active,
  metadata
)
select
  target.id,
  'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20HiLux%20Invincible%2C%20WAW%281%29.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Toyota_HiLux_Invincible,_WAW(1).jpg',
  'Wikimedia Commons',
  'CC BY-SA 4.0',
  'Raf24~commonswiki / Wikimedia Commons',
  'Toyota Hilux Invincible donanım referansı',
  1,
  true,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verifiedAt', '2026-08-15',
    'verificationScope', 'MODEL_FAMILY',
    'trimMatch', 'Invincible',
    'mediaDate', '2023-03-06',
    'rightsMode', 'REUSE_ALLOWED',
    'note', 'Invincible donanımına ait lisanslı referans görseldir; fiziksel satış aracının kendi fotoğrafı değildir.'
  )
from target
where not exists (
  select 1
  from public.catalog_media existing
  where existing.vehicle_id = target.id
    and existing.source_url = 'https://commons.wikimedia.org/wiki/File:Toyota_HiLux_Invincible,_WAW(1).jpg'
);

with target as (
  select id
  from public.vehicles
  where category = 'SALE'
    and brand = 'Toyota'
    and model = 'Hilux'
    and model_year = 2023
  limit 1
), media as (
  select cm.external_url
  from public.catalog_media cm
  join target on target.id = cm.vehicle_id
  where cm.source_url = 'https://commons.wikimedia.org/wiki/File:Toyota_HiLux_Invincible,_WAW(1).jpg'
    and cm.is_active = true
  limit 1
)
update public.vehicles v
set cover_image = media.external_url,
    images = array[media.external_url]::text[],
    metadata = coalesce(v.metadata, '{}'::jsonb) || jsonb_build_object(
      'coverMediaSourceUrl', 'https://commons.wikimedia.org/wiki/File:Toyota_HiLux_Invincible,_WAW(1).jpg',
      'coverMediaLicense', 'CC BY-SA 4.0',
      'coverMediaAttribution', 'Raf24~commonswiki / Wikimedia Commons',
      'verifiedModelFamily', 'Toyota Hilux Invincible',
      'verifiedMediaYear', 2023,
      'mediaTruthfulnessVersion', 'V46'
    ),
    updated_at = now()
from target, media
where v.id = target.id;

commit;
