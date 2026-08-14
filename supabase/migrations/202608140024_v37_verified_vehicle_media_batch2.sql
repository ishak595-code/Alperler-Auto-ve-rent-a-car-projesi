begin;

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/Ford_Focus_MK4_sedan_001.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Ford_Focus_MK4_sedan_001.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:Ford_Focus_MK4_sedan_001.jpg','coverMediaLicense','CC BY-SA 4.0','coverMediaAttribution','Jengtingchen / Wikimedia Commons','verifiedModelFamily','Ford Focus Mk IV Sedan'),updated_at=now()
where (metadata->>'legacyId')::int=1007;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Ford_Focus_MK4_sedan_001.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Ford_Focus_MK4_sedan_001.jpg','Wikimedia Commons','CC BY-SA 4.0','Jengtingchen','Ford Focus Mk IV Sedan temsili model ailesi görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Ford Focus Mk IV Sedan')
from public.vehicles v where (v.metadata->>'legacyId')::int=1007
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Ford_Focus_MK4_sedan_001.jpg?width=1600');

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot_3008_facelift.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot_3008_facelift.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:Peugeot_3008_facelift.jpg','coverMediaLicense','CC BY 2.0','coverMediaAttribution','Rutger van der Maar / Wikimedia Commons','verifiedModelFamily','Peugeot 3008 II Facelift','verifiedMediaYear',2020),updated_at=now()
where (metadata->>'legacyId')::int=2003;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot_3008_facelift.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Peugeot_3008_facelift.jpg','Wikimedia Commons','CC BY 2.0','Rutger van der Maar','Peugeot 3008 II facelift 2020 temsili model görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Peugeot 3008 II Facelift','verifiedMediaYear',2020)
from public.vehicles v where (v.metadata->>'legacyId')::int=2003
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Peugeot_3008_facelift.jpg?width=1600');

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Hilux_2.4_J_4x4_2023.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Hilux_2.4_J_4x4_2023.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:Toyota_Hilux_2.4_J_4x4_2023.jpg','coverMediaLicense','CC BY-SA 4.0','coverMediaAttribution','Ethan Llamas / Wikimedia Commons','verifiedModelFamily','Toyota Hilux AN120/AN130 4x4','verifiedMediaYear',2023),updated_at=now()
where (metadata->>'legacyId')::int=2004;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Hilux_2.4_J_4x4_2023.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Toyota_Hilux_2.4_J_4x4_2023.jpg','Wikimedia Commons','CC BY-SA 4.0','Ethan Llamas','Toyota Hilux 2.4 4x4 2023 temsili model görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Toyota Hilux AN120/AN130 4x4','verifiedMediaYear',2023)
from public.vehicles v where (v.metadata->>'legacyId')::int=2004
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota_Hilux_2.4_J_4x4_2023.jpg?width=1600');

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW_G20_(2022)_1X7A6120.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW_G20_(2022)_1X7A6120.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:BMW_G20_(2022)_1X7A6120.jpg','coverMediaLicense','CC BY-SA 4.0','coverMediaAttribution','Alexander Migl / Wikimedia Commons','verifiedModelFamily','BMW 3 Series G20','verifiedMediaYear',2022),updated_at=now()
where (metadata->>'legacyId')::int=1006;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW_G20_(2022)_1X7A6120.jpg?width=1600','https://commons.wikimedia.org/wiki/File:BMW_G20_(2022)_1X7A6120.jpg','Wikimedia Commons','CC BY-SA 4.0','Alexander Migl','BMW 3 Series G20 2022 temsili model ailesi görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','BMW 3 Series G20','verifiedMediaYear',2022)
from public.vehicles v where (v.metadata->>'legacyId')::int=1006
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/BMW_G20_(2022)_1X7A6120.jpg?width=1600');

commit;
