-- V48 verified media expansion
-- Keeps media provenance explicit and idempotent. Do not present model-family
-- images as photographs of the physical inventory vehicle.

-- The 2023 Toyota Hilux already has an Invincible-trim cover. Re-enable two
-- previously verified 2023 AN120/AN130 4x4 model-family gallery views so the
-- listing is no longer a single-image gallery.
update public.catalog_media
set
  is_active = true,
  sort_order = case
    when source_url like '%Toyota_Hilux_4x4_V_Conquest_2023_(13).jpg%' then 20
    when source_url like '%Toyota_Hilux_4x4_V_Conquest_2023_(14).jpg%' then 21
    else sort_order
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'sourceVerified', true,
    'verificationScope', 'MODEL_FAMILY',
    'verifiedAt', '2026-08-15',
    'rightsMode', 'REUSE_ALLOWED',
    'displayNote', '2023 Toyota Hilux AN120/AN130 4x4 model-family reference; not the photographed physical sale vehicle.'
  )
where vehicle_id = (
    select id
    from public.vehicles
    where brand = 'Toyota' and model = 'Hilux' and model_year = 2023
    order by updated_at desc nulls last
    limit 1
  )
  and kind = 'IMAGE'
  and is_cover = false
  and (
    source_url like '%Toyota_Hilux_4x4_V_Conquest_2023_(13).jpg%'
    or source_url like '%Toyota_Hilux_4x4_V_Conquest_2023_(14).jpg%'
  );

-- Add a licensed real photograph of the Yüksekova-Dağlıca road as route
-- context for the Oremar/Dağlıca and Yeşiltaş experiences. The source itself
-- describes the photo as the highway between Yüksekova and Dağlıca, therefore
-- it is intentionally classified as nearby/route context rather than a photo
-- proven to have been taken inside Yeşiltaş village.
with target_tours as (
  select id, title
  from public.tours
  where title in (
    'Oremar (Dağlıca) Vadisi & Avaşin Keşfi',
    'Yeşiltaş Köyü Ekolojik Doğa Kampı'
  )
), source_media as (
  select
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/Da%C4%9Fl%C4%B1ca-Y%C3%BCksekova.jpg?width=1600'::text as external_url,
    'https://commons.wikimedia.org/wiki/File:Da%C4%9Fl%C4%B1ca-Y%C3%BCksekova.jpg'::text as source_url
)
insert into public.catalog_media (
  id,
  tour_id,
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
  gen_random_uuid(),
  target_tours.id,
  'IMAGE',
  source_media.external_url,
  source_media.source_url,
  'Wikimedia Commons',
  'CC BY-SA 3.0',
  'Işık Yakın / Wikimedia Commons',
  case
    when target_tours.title like 'Oremar%' then 'Yüksekova ile Dağlıca arasındaki gerçek karayolu ve dağlık rota görünümü'
    else 'Yeşiltaş-Dağlıca bölgesine ulaşım rotasını temsil eden Yüksekova-Dağlıca karayolu görünümü'
  end,
  20,
  false,
  true,
  jsonb_build_object(
    'sourceVerified', true,
    'verificationScope', 'NEARBY_LOCATION',
    'verifiedAt', '2026-08-15',
    'mediaDate', '2013-05-26',
    'rightsMode', 'REUSE_ALLOWED',
    'routeContext', 'Yüksekova-Dağlıca karayolu',
    'displayNote', 'Licensed route-context image. It must not be labelled as a photograph proven to have been taken inside Yeşiltaş village.'
  )
from target_tours
cross join source_media
where not exists (
  select 1
  from public.catalog_media existing
  where existing.tour_id = target_tours.id
    and existing.source_url = source_media.source_url
);
