-- V40: remove development/demo wording from customer-facing sale listings.
-- Descriptions below use facts already present in the owner-confirmed inventory
-- record. Manufacturer-derived model-family specifications remain separately
-- traceable through spec_source_* and metadata provenance fields.

update public.vehicles
set description = '2022 Audi A3 Sportback 35 TFSI, 25.000 km’de; 1.5 TFSI 150 bg motor ve 7 ileri S tronic otomatik şanzımanlı premium kompakt hatchback seçeneğidir. İlan kaydında araç hatasız/boyasız ve 2 yıl garantili olarak belirtilmiştir. Donanım listesi, ekspertiz bilgileri ve satış durumu yönetim panelindeki güncel araç kaydı üzerinden yönetilir.',
    metadata = metadata - 'demoDataReady',
    updated_at = now()
where category = 'SALE'
  and brand = 'Audi'
  and model = 'A3'
  and model_year = 2022;

update public.vehicles
set description = '2020 Peugeot 3008 1.5 BlueHDi Allure, 85.000 km’de; 130 bg dizel motor, EAT8 otomatik şanzıman ve önden çekiş düzeniyle aile kullanımı için güçlü bir SUV seçeneğidir. İlan kaydında değişensiz ve hatasız olarak belirtilmiştir. i-Cockpit, sürüş destekleri ve multimedya donanımları araç kaydındaki güncel özellik listesi üzerinden yönetilir.',
    metadata = metadata - 'demoDataReady',
    updated_at = now()
where category = 'SALE'
  and brand = 'Peugeot'
  and model = '3008'
  and model_year = 2020;

update public.vehicles
set description = '2021 Renault Megane Sedan 1.3 TCe Icon, 68.000 km’de; 140 bg benzinli motor ve 7 ileri EDC otomatik şanzımanla sunulur. İlan kaydında bir parça lokal boya bilgisi bulunur. Dijital gösterge, akıllı telefon bağlantısı, geri görüş kamerası ve sürüş destekleri mevcut özellik kaydında listelenmiştir.',
    metadata = metadata - 'demoDataReady',
    updated_at = now()
where category = 'SALE'
  and brand = 'Renault'
  and model = 'Megane'
  and model_year = 2021;

update public.vehicles
set description = '2023 Toyota Hilux 2.4 D-4D Invincible 4x4, 15.000 km’de; 150 bg turbo dizel motor, 6 ileri otomatik şanzıman ve dört tekerlekten çekiş sistemiyle arazi ve zorlu yol koşullarına yönelik güçlü bir pick-up seçeneğidir. İlan kaydında hatasız/boyasız ve garantisi devam ediyor olarak belirtilmiştir. Güncel donanım ve satış bilgileri yönetim panelindeki araç kaydından yayınlanır.',
    metadata = metadata - 'demoDataReady',
    updated_at = now()
where category = 'SALE'
  and brand = 'Toyota'
  and model = 'Hilux'
  and model_year = 2023;

-- Remove the obsolete development marker from every remaining inventory row.
update public.vehicles
set metadata = metadata - 'demoDataReady',
    updated_at = now()
where metadata ? 'demoDataReady';
