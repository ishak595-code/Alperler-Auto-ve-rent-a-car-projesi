with target as (
  select id from public.tours
  where title = 'Oremar (Dağlıca) Vadisi & Avaşin Keşfi'
  order by updated_at desc nulls last limit 1
)
update public.catalog_media m
set metadata = coalesce(m.metadata, '{}'::jsonb) || jsonb_build_object(
      'sourceVerified', true,
      'verificationScope', 'NEARBY_LOCATION',
      'verifiedAt', '2026-08-15',
      'routeContext', 'Yüksekova-Dağlıca karayolu',
      'mediaTruthfulnessVersion', 'V51'
    ),
    alt_text = 'Yüksekova ile Dağlıca arasındaki karayolu; Oremar turu için rota bağlam görseli'
from target
where m.tour_id = target.id
  and m.source_url = 'https://commons.wikimedia.org/wiki/File:Da%C4%9Fl%C4%B1ca-Y%C3%BCksekova.jpg';

update public.tours
set location_name = 'Oremar / Dağlıca rotası, Yüksekova, Hakkari',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'mediaTruthfulnessVersion', 'V51',
      'exactLocationPhotoStatus', 'NO_REUSABLE_EXACT_PHOTO_FOUND',
      'routeContextPhotoAvailable', true
    ),
    updated_at = now()
where title = 'Oremar (Dağlıca) Vadisi & Avaşin Keşfi';
