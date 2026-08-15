begin;

-- Ters Lale safari: remove non-local cultivar examples from the public gallery.
delete from public.catalog_media cm
using public.tours t
where cm.tour_id = t.id
  and t.title = 'Yüksekova Yayla & Ters Lale Fotoğraf Safarisi'
  and coalesce(cm.metadata->>'locality','') = 'NON_LOCAL_CULTIVAR_REFERENCE';

-- The Hakkari banner is province-local but its source does not prove Yüksekova specifically.
update public.catalog_media cm
set metadata = coalesce(cm.metadata, '{}'::jsonb) || jsonb_build_object(
      'verificationScope','NEARBY_LOCATION',
      'sourceVerified',true,
      'verifiedAt','2026-08-15',
      'verificationNote','Hakkari province flower image; not presented as a photograph proven to be taken in Yüksekova.'
    ),
    alt_text = 'Hakkari ters lalesi yakın plan görünümü; Yüksekova dışı Hakkari bağlam görseli'
from public.tours t
where cm.tour_id=t.id
  and t.title='Yüksekova Yayla & Ters Lale Fotoğraf Safarisi'
  and cm.source_url='https://commons.wikimedia.org/wiki/File:Hakkari_banner_Fritillaria.jpg';

-- Add a landscape photographed directly in Yüksekova.
insert into public.catalog_media(
  tour_id, kind, external_url, source_url, source_name, license, attribution,
  alt_text, sort_order, is_cover, is_active, metadata
)
select t.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Y%C3%BCksekova%203.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Y%C3%BCksekova_3.jpg',
  'Wikimedia Commons', 'CC BY-SA 3.0', 'Perencal / Wikimedia Commons',
  'Yüksekova Hakkari yayla ve dağ peyzajı', 3, false, true,
  jsonb_build_object(
    'verificationScope','EXACT_LOCATION',
    'sourceVerified',true,
    'verifiedAt','2026-08-15',
    'verifiedLocation','Yüksekova, Hakkari',
    'mediaDate','2013-09-14'
  )
from public.tours t
where t.title='Yüksekova Yayla & Ters Lale Fotoğraf Safarisi'
  and not exists (
    select 1 from public.catalog_media cm
    where cm.tour_id=t.id
      and cm.source_url='https://commons.wikimedia.org/wiki/File:Y%C3%BCksekova_3.jpg'
  );

-- Add İkiyaka Mountains, photographed in Yüksekova, as genuine route scenery.
insert into public.catalog_media(
  tour_id, kind, external_url, source_url, source_name, license, attribution,
  alt_text, sort_order, is_cover, is_active, metadata
)
select t.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/%C4%B0kiyaka%20Daglar%C4%B1%20y%C3%BCksekova.JPG?width=1600',
  'https://commons.wikimedia.org/wiki/File:%C4%B0kiyaka_Daglar%C4%B1_y%C3%BCksekova.JPG',
  'Wikimedia Commons', 'CC BY 2.5', 'Caracas at Turkish Wikipedia / Wikimedia Commons',
  'Yüksekova İkiyaka Dağları ve uzaktan Cilo Dağı görünümü', 4, false, true,
  jsonb_build_object(
    'verificationScope','EXACT_LOCATION',
    'sourceVerified',true,
    'verifiedAt','2026-08-15',
    'verifiedLocation','İkiyaka Mountains, Yüksekova, Hakkari',
    'licenseNote','Creative Commons Attribution 2.5 Generic'
  )
from public.tours t
where t.title='Yüksekova Yayla & Ters Lale Fotoğraf Safarisi'
  and not exists (
    select 1 from public.catalog_media cm
    where cm.tour_id=t.id
      and cm.source_url='https://commons.wikimedia.org/wiki/File:%C4%B0kiyaka_Daglar%C4%B1_y%C3%BCksekova.JPG'
  );

-- Sümbül route: add a second, locally photographed Hakkari/Sümbül context image.
-- Coordinates published by Commons are near the Sümbül mountain area, therefore it is
-- deliberately labelled NEARBY_LOCATION rather than overstated as the exact viewpoint.
insert into public.catalog_media(
  tour_id, kind, external_url, source_url, source_name, license, attribution,
  alt_text, sort_order, is_cover, is_active, metadata
)
select t.id, 'IMAGE',
  'https://commons.wikimedia.org/wiki/Special:Redirect/file/Hakkaride%20S%C3%BCmb%C3%BCl.Ters%20Lale..%20-%20panoramio.jpg?width=1600',
  'https://commons.wikimedia.org/wiki/File:Hakkaride_S%C3%BCmb%C3%BCl.Ters_Lale.._-_panoramio.jpg',
  'Wikimedia Commons', 'CC BY-SA 3.0', 'hamza atılgan / Wikimedia Commons',
  'Hakkari Sümbül bölgesi çevresinde ters lale ve dağ doğası', 2, false, true,
  jsonb_build_object(
    'verificationScope','NEARBY_LOCATION',
    'sourceVerified',true,
    'verifiedAt','2026-08-15',
    'verifiedLocation','Hakkari, coordinates 37.608792, 43.758888',
    'mediaDate','2005-05-09'
  )
from public.tours t
where t.title='Sümbül Dağı Panoramik 4x4 Seyir Turu'
  and not exists (
    select 1 from public.catalog_media cm
    where cm.tour_id=t.id
      and cm.source_url='https://commons.wikimedia.org/wiki/File:Hakkaride_S%C3%BCmb%C3%BCl.Ters_Lale.._-_panoramio.jpg'
  );

commit;
