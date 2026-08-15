-- V40: avoid implying the generic 2021 Passat listing is specifically a GTE.
-- Replace the secondary GTE exterior reference with a 2021 Passat B8 cockpit
-- photo released under CC0. Cover media remains unchanged.

update public.catalog_media
set external_url = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Passat%20B8%20Cockpit.jpg?width=1600',
    source_url = 'https://commons.wikimedia.org/wiki/File:Passat_B8_Cockpit.jpg',
    source_name = 'Wikimedia Commons',
    license = 'CC0 1.0',
    attribution = 'Spacekid / Wikimedia Commons',
    alt_text = 'Volkswagen Passat B8 2021 iç mekân ve kokpit görünümü',
    updated_at = now()
where id = '0dd39bbd-8a79-4f5d-9f49-c62556b4c995'
  and vehicle_id = 'efdd5ada-f11a-4684-999d-984dd9740ff6';
