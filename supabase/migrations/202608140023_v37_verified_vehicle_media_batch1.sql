begin;

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg','coverMediaLicense','CC BY-SA 4.0','coverMediaAttribution','Alexander-93 / Wikimedia Commons','verifiedModelFamily','Volkswagen Amarok Mk2','verifiedMediaYear',2023),
    updated_at=now()
where (metadata->>'legacyId')::int=1003;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg','Wikimedia Commons','CC BY-SA 4.0','Alexander-93','Volkswagen Amarok Mk2 2023 temsili model görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Volkswagen Amarok Mk2','verifiedMediaYear',2023)
from public.vehicles v where (v.metadata->>'legacyId')::int=1003
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen_Amarok_Mk2_Auto_Zuerich_2023_1X7A1337.jpg?width=1600');

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:Renault_Megane_IV_Sedan_1X7A5848.jpg','coverMediaLicense','CC BY-SA 4.0','coverMediaAttribution','Alexander Migl / Wikimedia Commons','verifiedModelFamily','Renault Megane IV Sedan','verifiedMediaYear',2022),
    updated_at=now()
where (metadata->>'legacyId')::int in (1004,2002);

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600','https://commons.wikimedia.org/wiki/File:Renault_Megane_IV_Sedan_1X7A5848.jpg','Wikimedia Commons','CC BY-SA 4.0','Alexander Migl','Renault Megane IV Sedan temsili model görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Renault Megane IV Sedan','verifiedMediaYear',2022)
from public.vehicles v where (v.metadata->>'legacyId')::int in (1004,2002)
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/Renault_Megane_IV_Sedan_1X7A5848.jpg?width=1600');

update public.vehicles
set cover_image='https://commons.wikimedia.org/wiki/Special:Redirect/file/VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg?width=1600',
    images=jsonb_build_array('https://commons.wikimedia.org/wiki/Special:Redirect/file/VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg?width=1600'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('coverMediaRepresentative',true,'coverMediaSourceUrl','https://commons.wikimedia.org/wiki/File:VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg','coverMediaLicense','CC BY-SA 3.0 DE','coverMediaAttribution','M 93 / Wikimedia Commons','verifiedModelFamily','Volkswagen Passat B8 Facelift','verifiedMediaYear',2021),
    updated_at=now()
where (metadata->>'legacyId')::int=1005;

insert into public.catalog_media(id,vehicle_id,kind,external_url,source_url,source_name,license,attribution,alt_text,sort_order,is_cover,is_active,metadata)
select gen_random_uuid(),v.id,'IMAGE','https://commons.wikimedia.org/wiki/Special:Redirect/file/VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg?width=1600','https://commons.wikimedia.org/wiki/File:VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg','Wikimedia Commons','CC BY-SA 3.0 DE','M 93','Volkswagen Passat B8 facelift 2021 temsili model görseli',1,true,true,jsonb_build_object('representative',true,'verifiedModelFamily','Volkswagen Passat B8 Facelift','verifiedMediaYear',2021)
from public.vehicles v where (v.metadata->>'legacyId')::int=1005
and not exists(select 1 from public.catalog_media m where m.vehicle_id=v.id and m.external_url='https://commons.wikimedia.org/wiki/Special:Redirect/file/VW_Passat_GTE_(B8,_Facelift)_%E2%80%93_f_20062021.jpg?width=1600');

commit;
