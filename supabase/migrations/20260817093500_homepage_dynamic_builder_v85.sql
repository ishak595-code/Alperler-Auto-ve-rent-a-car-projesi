-- V85: dynamic homepage section builder.
-- Removes the legacy 24-card ceiling and makes each section self-contained through settings JSON.

alter table public.homepage_sections drop constraint if exists homepage_sections_max_items_check;
alter table public.homepage_sections add constraint homepage_sections_max_items_check check (max_items >= 1);

alter table public.homepage_sections drop constraint if exists homepage_sections_settings_object_check;
alter table public.homepage_sections add constraint homepage_sections_settings_object_check check (jsonb_typeof(settings) = 'object');

update public.homepage_sections
set settings = coalesce(settings,'{}'::jsonb) || case section_key
  when 'campaigns' then jsonb_build_object(
    'badge','Seçili Avantajlar','description','Kiralama, özel gün ve rota planınız için öne çıkan avantajları tek bakışta görün. Size uyan fırsatı seçin; kapsamı ve koşulları net biçimde inceleyin.',
    'layout','rail','width','wide','theme','dark','viewAllLabel','Tüm Fırsatlar','viewAllUrl','/campaigns'
  )
  when 'rental_featured' then jsonb_build_object(
    'category','RENTAL','badge','Seçili Kiralık Araçlar','description','Günlük kullanım, aile yolculuğu ve özel planlar için öne çıkan araçları karşılaştırın; size uyanı seçip tüm detaylarına geçin.',
    'layout','rail','width','wide','theme','light','viewAllLabel','Tüm Kiralık Araçlar','viewAllUrl','/fleet'
  )
  when 'sale_featured' then jsonb_build_object(
    'category','SALE','badge','Seçili İkinci El Araçlar','description','Fiyatı, donanımı ve genel özellikleriyle öne çıkan seçili araçları inceleyin; karar vermeden önce ilan detaylarını karşılaştırın.',
    'layout','rail','width','wide','theme','soft','viewAllLabel','Tüm Satılık Araçlar','viewAllUrl','/sales'
  )
  when 'tour_featured' then jsonb_build_object(
    'badge','Yerel Rotalar','description','Bölgenin doğasını ve kültürünü bilen yerel rehberlerle, öne çıkan rotaları daha rahat ve planlı biçimde keşfedin.',
    'layout','rail','width','wide','theme','dark','viewAllLabel','Tüm Turlar','viewAllUrl','/tours'
  )
  when 'branches' then jsonb_build_object(
    'renderer','BRANCHES','badge','Hizmet Ağı','description','Şubeleri, yetkili bayileri ve o noktaya ait ilanları tek ekranda keşfedin.',
    'layout','rail','width','wide','theme','light','viewAllLabel','Tüm Noktalar','viewAllUrl','/branches'
  )
  when 'partner' then jsonb_build_object(
    'renderer','PARTNER','badge','Araç Sahipleri','description','Aracınızı satmak veya kiralama filosunda değerlendirmek için bilgilerinizi gönderin. Ekibimiz size uygun yolu birlikte netleştirsin.',
    'layout','wide','width','wide','theme','dark','ctaLabel','Aracımı Değerlendir','ctaUrl','/list-your-car'
  )
  when 'blog_featured' then jsonb_build_object(
    'badge','Rehber & İpuçları','description','Yola çıkmadan önce araç kullanımı, bölgesel rotalar ve seyahat planlaması için seçili içeriklere göz atın.',
    'layout','rail','width','wide','theme','light','viewAllLabel','Tüm Yazılar','viewAllUrl','/blog'
  )
  else '{}'::jsonb
end,
updated_at = now()
where section_key in ('campaigns','rental_featured','sale_featured','tour_featured','branches','partner','blog_featured');
