-- V84: keep homepage showcases concise and customer-facing copy persuasive.
-- Production data change mirrored in source control so new environments keep the same contract.

update public.homepage_sections
set title = case section_key
  when 'campaigns' then 'Planınızı Avantaja Çeviren Fırsatlar'
  when 'rental_featured' then 'Öne Çıkan Kiralık Araçlar'
  when 'sale_featured' then 'Öne Çıkan İkinci El Araçlar'
  when 'tour_featured' then 'Rehberlerimizle Görmeniz Gereken Rotalar'
  else title
end,
max_items = case
  when section_key in ('rental_featured','sale_featured','tour_featured') then 4
  when section_key = 'campaigns' then 3
  else max_items
end,
updated_at = now()
where section_key in ('campaigns','rental_featured','sale_featured','tour_featured');

update public.site_config
set value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              value,
              '{homeContent,featuredBadge}',
              to_jsonb('Seçili Kiralık Araçlar'::text), true
            ),
            '{homeContent,featuredSubtitle}',
            to_jsonb('Günlük kullanım, aile yolculuğu ve özel planlar için öne çıkan araçları karşılaştırın; size uyanı seçip tüm detaylarına geçin.'::text), true
          ),
          '{homeContent,salesBadge}',
          to_jsonb('Seçili İkinci El Araçlar'::text), true
        ),
        '{homeContent,salesDescription}',
        to_jsonb('Fiyatı, donanımı ve genel özellikleriyle öne çıkan seçili araçları inceleyin; karar vermeden önce ilan detaylarını karşılaştırın.'::text), true
      ),
      '{homeContent,toursSubtitle}',
      to_jsonb('Bölgenin doğasını ve kültürünü bilen yerel rehberlerle, öne çıkan rotaları daha rahat ve planlı biçimde keşfedin.'::text), true
    ),
    '{homeContent,campaignBannerBadge}',
    to_jsonb('Seçili Avantajlar'::text), true
  ),
  '{homeContent,campaignBannerSubtitle}',
  to_jsonb('Kiralama, özel gün ve rota planınız için öne çıkan avantajları tek bakışta görün. Size uyan fırsatı seçin; kapsamı ve koşulları net biçimde inceleyin.'::text), true
), updated_at = now()
where key='site_settings' and is_public=true;
