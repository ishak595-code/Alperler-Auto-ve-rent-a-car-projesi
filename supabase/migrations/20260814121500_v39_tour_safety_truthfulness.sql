-- V39 tour safety and truthfulness pass.
-- Keep researched tourism products useful without presenting unverified business operations as guaranteed.

update public.tours
set data_quality_status = 'RESEARCHED',
    source_name = 'Hakkari İl Kültür ve Turizm Müdürlüğü',
    source_url = 'https://hakkari.ktb.gov.tr/TR-350031/48-saatte-hakkari.html',
    short_description = 'Cilo dağları ve buzul manzaralarını güvenli seyir noktalarından, profesyonel rehberli doğa yürüyüşü ile keşfetmeye yönelik araştırılmış rota.',
    description = 'Cilo Dağları ve çevresindeki yüksek dağ peyzajını, buzul göllerini ve seyir noktalarını rehberli doğa yürüyüşü ile keşfetmeye yönelik programdır. Buzul yüzeyine çıkış programın parçası değildir. Rota; mevsim, yol, hava ve yetkili makamların güncel güvenlik koşullarına göre kesinleştirilir.',
    itinerary = '[{"time":"07:00","title":"Yüksekova buluşma","description":"Katılımcı kontrolü, hava ve rota güvenlik bilgilendirmesi."},{"time":"08:30","title":"Cilo bölgesine kontrollü transfer","description":"Uygun arazi aracıyla izin verilen erişim güzergâhına geçiş."},{"time":"10:00","title":"Rehberli doğa yürüyüşü","description":"Buzul yüzeyine çıkmadan, güvenli seyir ve fotoğraf noktalarına yürüyüş."},{"time":"13:00","title":"Dinlenme ve öğle molası","description":"Hava ve saha koşullarına uygun güvenli noktada mola."},{"time":"15:00","title":"Buzul gölleri ve panoramik seyir","description":"İzin verilen seyir alanlarından doğa gözlemi ve fotoğraf."},{"time":"18:30","title":"Yüksekova dönüş","description":"Kontrollü dönüş ve turun tamamlanması."}]'::jsonb,
    included_items = '["Bölge içi gidiş-dönüş transfer organizasyonu","Profesyonel bölge rehberi organizasyonu","Su ve temel tur koordinasyonu"]'::jsonb,
    excluded_items = '["Buzul üzerine çıkış","Teknik tırmanış","Kişisel outdoor ekipmanı","Seyahat sağlık sigortası","Program dışı yiyecek ve içecekler"]'::jsonb,
    metadata = coalesce(metadata, '{}'::jsonb)
      - 'demoDataReady'
      || jsonb_build_object(
        'difficulty','Orta-Zor',
        'highlights',jsonb_build_array('Cilo panoraması','Buzul gölleri seyir noktaları','Rehberli doğa yürüyüşü','Fotoğraf durakları'),
        'safetyNotice','Buzul yüzeyine çıkış yoktur. Program hava, yol, izin ve saha güvenliğine göre kesinleşir.',
        'requiresOperationalApproval',true,
        'researchSourceVerifiedAt','2026-08-14'
      ),
    updated_at = now()
where title = 'Cilo Dağları & Buzullar Uzman Turu';

update public.tours
set title = 'Sümbül Dağı Panoramik 4x4 Seyir Turu',
    source_name = 'Hakkari İl Kültür ve Turizm Müdürlüğü',
    source_url = 'https://hakkari.ktb.gov.tr/TR-158770/sumbul-dagi.html',
    short_description = 'Sümbül Dağı çevresinde uygun erişim yolları ve güvenli seyir noktaları üzerinden planlanan panoramik 4x4 keşif rotası.',
    description = 'Sümbül Dağı çevresinde, araç erişimine uygun güzergâhlar ve güvenli panoramik duraklar üzerinden planlanan küçük grup keşif rotasıdır. Zirveye araçla çıkış garantisi verilmez. Kullanılacak araç, sürücü, rota ve mola noktaları rezervasyon öncesinde güncel yol ve hava koşullarına göre kesinleştirilir.',
    itinerary = '[{"time":"08:00","title":"Hakkari merkez buluşma","description":"Araç, yol ve hava koşullarının son kontrolü."},{"time":"09:00","title":"Sümbül Dağı çevresi seyir rotası","description":"Araç erişimine uygun kontrollü güzergâhta panoramik duraklar."},{"time":"11:00","title":"Fotoğraf ve manzara molası","description":"Güvenli seyir noktasında serbest zaman."},{"time":"12:30","title":"Öğle molası","description":"Saha koşullarına göre belirlenen uygun noktada mola."},{"time":"14:00","title":"Dönüş rotası","description":"Kontrollü dönüş ve turun tamamlanması."}]'::jsonb,
    included_items = '["4x4 transfer organizasyonu","Bölge rehberi organizasyonu","Temel tur koordinasyonu"]'::jsonb,
    excluded_items = '["Zirve tırmanışı","Araçla zirveye çıkış garantisi","Kişisel outdoor ekipmanı","Özel drone çekimi","Kişisel harcamalar"]'::jsonb,
    metadata = coalesce(metadata, '{}'::jsonb)
      - 'demoDataReady'
      || jsonb_build_object(
        'highlights',jsonb_build_array('Panoramik 4x4 rota','Sümbül Dağı manzarası','Fotoğraf durakları','Küçük grup keşfi'),
        'safetyNotice','Zirve erişimi garanti edilmez. Rota yol, hava ve saha güvenliğine göre belirlenir.',
        'requiresOperationalApproval',true,
        'researchSourceVerifiedAt','2026-08-14'
      ),
    updated_at = now()
where title = 'Sümbül Dağı Panoramik 4x4 Zirve Turu';

update public.tours
set source_name = 'Hakkari İl Kültür ve Turizm Müdürlüğü',
    source_url = 'https://hakkari.ktb.gov.tr/TR-158464/hakkari39de-doga-sporlari.html',
    short_description = 'Zap Vadisi için araştırılmış rafting deneyimi taslağı. Parkur ve uygulama ancak lisanslı veya uygun operatör, debi ve güvenlik şartları doğrulandıktan sonra kesinleşir.',
    description = 'Zap Suyu üzerinde rafting yapılabilen bölgesel parkurlara dayalı araştırılmış tur ürünüdür. Ticari operasyon; uygun rehber veya operatör, ekipman, sigorta, su seviyesi, hava ve güncel saha izinleri doğrulandıktan sonra kesinleştirilmelidir. Rezervasyon ekranındaki program bu koşullar sağlanmadan kesin faaliyet garantisi sayılmaz.',
    included_items = '["Rezervasyon sonrası operasyon teyidi","Uygun operatör doğrulanırsa güvenlik brifingi ve rafting ekipmanı","Parkur içi tur koordinasyonu"]'::jsonb,
    excluded_items = '["Koşullar doğrulanmadan rafting garantisi","Kişisel su geçirmez kamera","Özel video montaj paketi","Kişisel harcamalar","Program dışı transferler"]'::jsonb,
    metadata = coalesce(metadata, '{}'::jsonb)
      - 'demoDataReady'
      || jsonb_build_object(
        'highlights',jsonb_build_array('Zap Vadisi','Rafting potansiyeli','Doğa ve aksiyon rotası'),
        'safetyNotice','Rafting yalnız uygun operatör, ekipman, debi ve güncel güvenlik koşulları doğrulandığında uygulanır.',
        'requiresOperationalApproval',true,
        'researchSourceVerifiedAt','2026-08-14'
      ),
    updated_at = now()
where title = 'Zap Suyu Adrenalin & Rafting Turu';

update public.tours
set source_name = coalesce(source_name, 'Hakkari İl Kültür ve Turizm Müdürlüğü'),
    source_url = coalesce(source_url, 'https://hakkari.ktb.gov.tr/TR-350031/48-saatte-hakkari.html'),
    metadata = coalesce(metadata, '{}'::jsonb)
      - 'demoDataReady'
      || jsonb_build_object(
        'safetyNotice','Yüksek rakımlı rota; hava, yol, izin ve saha koşullarına göre program değişebilir.',
        'requiresOperationalApproval',true,
        'researchSourceVerifiedAt','2026-08-14'
      ),
    updated_at = now()
where title = 'Cennet-Cehennem Vadisi Adrenalin Turu';

-- Remove the misleading year assertion from the 2021 Megane listing's representative image.
update public.catalog_media cm
set metadata = (coalesce(cm.metadata, '{}'::jsonb) - 'verifiedMediaYear')
      || jsonb_build_object('mediaScope','MODEL_FAMILY_REPRESENTATION','mediaSourceVerifiedAt','2026-08-14'),
    alt_text = 'Renault Megane IV Sedan temsili model ailesi görseli',
    updated_at = now()
where cm.vehicle_id = (select id from public.vehicles where stock_code = 'LEGACY-2002' limit 1)
  and cm.kind = 'IMAGE'
  and cm.is_active = true;

-- Make the scope explicit for all current sourced vehicle reference images.
update public.catalog_media
set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('mediaScope','MODEL_FAMILY_REPRESENTATION','mediaSourceVerifiedAt','2026-08-14'),
    updated_at = now()
where vehicle_id is not null
  and kind = 'IMAGE'
  and is_active = true
  and source_name = 'Wikimedia Commons';
