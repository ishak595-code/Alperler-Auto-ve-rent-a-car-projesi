update public.tours
set location_name = 'Biçer Mahallesi, Hakkari Merkez',
    source_name = 'Hakkari İl Kültür ve Turizm Müdürlüğü',
    source_url = 'https://hakkari.ktb.gov.tr/TR-160304/saray-ve-medreseler.html',
    metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'officialLocation','Biçer Mahallesi, Hakkari Merkez',
      'officialSourceVerified',true,
      'heritageSite','Zeynel Bey Medresesi'
    ),
    updated_at = now()
where id = 'f313bff7-7d55-4e8c-9f99-af009636eb32'::uuid;
