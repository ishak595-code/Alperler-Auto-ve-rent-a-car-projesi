-- V39 catalog provenance hardening
-- Official manufacturer/model-family references are stored separately from physical-vehicle verification.

update public.vehicles
set spec_source_name = 'BMW Group PressClub',
    spec_source_url = 'https://www.press.bmwgroup.com/france/article/detail/T0285262FR/nouvelle-bmw-s%C3%A9rie-3-berline?language=fr',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'BMW 320i G20 engine and transmission family reference; exact vehicle equipment remains business-verified data',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1006';

update public.vehicles
set spec_source_name = 'Ford Media Center',
    spec_source_url = 'https://media.ford.com/content/fordmedia/feu/ch/de/news/2021/10/15/der-neue-ford-focus--modernes-design--mehr-konnektivitaet-und-gr.html',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', '2021 Focus 1.5 EcoBlue 120 PS and 8-speed automatic model-family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1007';

update public.vehicles
set spec_source_name = 'Mercedes-Benz Media',
    spec_source_url = 'https://event.media.mercedes-benz.com/article/4a15317e-7b3d-405d-9960-e4515158967a',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'W206 C-Class model-family reference; wedding decoration and the physical vehicle remain business-specific',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1001';

update public.vehicles
set spec_source_name = 'Mercedes-Benz Vans Media',
    spec_source_url = 'https://media.mercedes-benz.com/article/7232e899-ca78-4d29-b7ce-b97292b40e25',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'W447 facelift Vito model-family reference; VIP conversion equipment remains business-specific',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1002';

update public.vehicles
set spec_source_name = 'Renault Global Media',
    spec_source_url = 'https://media.renault.com/the-new-renault-megane-sedan-the-prestigious-sedan-with-an-elegant-design/?lang=eng',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'Megane Sedan 1.5 Blue dCi 115 and 7-speed EDC model-family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1004';

update public.vehicles
set spec_source_name = 'Volkswagen Commercial Vehicles',
    spec_source_url = 'https://www.volkswagen-vans.co.uk/en/new-vehicles/new-amarok.html/__layer/layers/showrooms/amarok/amarok-dimensions-and-tech-specs/master.layer',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'Second-generation Amarok 3.0 TDI 10-speed automatic model-family reference; trim details remain business-specific',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1003';

update public.vehicles
set spec_source_name = 'Volkswagen Newsroom',
    spec_source_url = 'https://www.volkswagen-newsroom.com/en/the-new-passat-the-update-5070',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'Passat B8 facelift 1.6 TDI model-family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-1005';

update public.vehicles
set spec_source_name = 'Audi MediaCenter',
    spec_source_url = 'https://www.audi-mediacenter.com/de/a3-sportback-8/technische-daten?show=30-tfsi-81-kw',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'A3 Sportback 1.5 TFSI/S tronic model-family reference; exact 2022 equipment remains business-verified data',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-2001';

update public.vehicles
set spec_source_name = 'Renault Global Media',
    spec_source_url = 'https://media.renault.com/the-new-renault-megane-sedan-the-prestigious-sedan-with-an-elegant-design/?lang=eng',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'Megane Sedan 1.3 TCe 140 and 7-speed EDC model-family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-2002';

update public.vehicles
set spec_source_name = 'Peugeot / Stellantis Media',
    spec_source_url = 'https://www.media.stellantis.com/ch-de/peugeot/press/facelift-fur-den-suv-peugeot-3008-noch-markanter-als-zuvor',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', '3008 facelift 1.5 BlueHDi 130 EAT8 model-family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-2003';

update public.vehicles
set spec_source_name = 'Toyota Media Site',
    spec_source_url = 'https://media.toyota.co.uk/new-toyota-hilux/',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'specProvenance', 'MODEL_FAMILY_OFFICIAL',
      'specSourceScope', 'Hilux 2.4 D-4D 4x4 six-speed automatic powertrain family reference',
      'specSourceVerifiedAt', '2026-08-14'
    ),
    updated_at = now()
where stock_code = 'LEGACY-2004';
