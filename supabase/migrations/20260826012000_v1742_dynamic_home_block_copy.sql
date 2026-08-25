-- V174.2 Dynamic Home Block Copy
-- Preserve current production wording while moving visible card and CTA microcopy into section settings.

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'campaignLabel','KAMPANYA',
  'campaignDiscountSuffix','İNDİRİM',
  'campaignFallbackDescription','Kampanyanın avantajını ve ilgili araç ya da tur detayını inceleyin.',
  'campaignCtaLabel','Kampanyayı İncele',
  'campaignSavingSuffix','kazanç',
  'campaignAdvantageSuffix','avantaj',
  'campaignLimitedLabel','Sınırlı süreli fırsat',
  'campaignExpiredLabel','Süre doldu',
  'campaignDaysRemainingSuffix','gün kaldı',
  'campaignOneDayRemainingLabel','1 gün kaldı',
  'campaignHoursRemainingSuffix','saat kaldı',
  'campaignProofActiveSuffix','kişi son 15 dk''da inceledi',
  'campaignProofRecentSuffix','kişi son 24 saatte inceledi',
  'campaignProofUniqueSuffix','kişi inceledi',
  'campaignViewsSuffix','görüntülenme',
  'campaignNewLabel','Yeni kampanya'
), updated_at=now()
where section_key='campaigns';

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'tourFallbackDescription','Rotayı ve deneyim ayrıntılarını keşfedin.',
  'tourCardCtaLabel','Turu Keşfet'
), updated_at=now()
where section_key='tour_featured';

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'branchFranchiseLabel','Yetkili Bayi',
  'branchLocationLabel','Alperler Auto Noktası',
  'branchFallbackDescriptionSuffix','bölgesindeki araç ve hizmet seçeneklerini inceleyin.',
  'branchPickupLabel','Teslim alma',
  'branchReturnLabel','İade',
  'branchCardCtaLabel','Şubeyi Keşfet',
  'partnerCtaTitle',coalesce(settings->>'partnerCtaTitle','Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?'),
  'partnerCtaLabel',coalesce(settings->>'partnerCtaLabel','Bayilik Başvurusu'),
  'partnerRoute',coalesce(settings->>'partnerRoute','/branch-partner'),
  'showPartnerCta',coalesce((settings->>'showPartnerCta')::boolean,true)
), updated_at=now()
where section_key='branches';

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'blogCardCtaLabel','Yazıyı Oku'
), updated_at=now()
where section_key='blog_featured';

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'promoFallbackBadge',coalesce(settings->>'promoFallbackBadge','Alperler Auto'),
  'promoFallbackDescription',coalesce(settings->>'promoFallbackDescription','Detayları keşfedin.')
), updated_at=now()
where section_type='CUSTOM' and coalesce(settings->>'renderer','')='PROMO';

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object(
  'badge',coalesce(settings->>'badge','Araç Sahipleri'),
  'description',coalesce(settings->>'description','Aracınızı satış veya kiralama filosu için değerlendirmeye gönderin; ekibimiz uygun yolu birlikte netleştirsin.'),
  'ctaLabel',coalesce(settings->>'ctaLabel','Aracımı Değerlendir'),
  'ctaUrl',coalesce(settings->>'ctaUrl','/list-your-car')
), updated_at=now()
where section_key='partner';
