update public.navigation_settings
set mobile_dock_auto_hide = true,
    updated_at = now()
where config_key = 'main';

update public.navigation_items
set label = case item_key
  when 'fleet' then 'Kiralık'
  when 'sales' then 'Satılık'
  else label
end,
updated_at = now()
where surface = 'MOBILE_DOCK'
  and item_key in ('fleet','sales');

update public.site_config
set value = jsonb_set(
      value,
      '{homeContent}',
      coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
        'heroSubtitle', 'Yüksekova’da kiralık araç, ikinci el, şoförlü transfer ve özel rotalar tek yerde. İhtiyacınızı seçin, net fiyatı görün, gerisini yerel ekibimizle kolayca planlayın.',
        'plannerKicker', 'HIZLI BAŞLA',
        'bookingTitle', 'Tarihinizi seçin, uygun seçeneği görün',
        'bookingSubtitle', 'Hizmeti ve zamanı belirleyin. Planınıza uyan araç veya rotaları saniyeler içinde öne çıkaralım.',
        'plannerNote', 'Uygunluk canlı envanter ve seçtiğiniz zaman aralığına göre netleşir.',
        'plannerVariant', 'compact',
        'plannerFieldOrder', '["service","duration","date","pickup"]'::jsonb,
        'trustPrice', 'Fiyatı baştan görün',
        'trustSupport', 'Yüksekova’da yerel destek',
        'trustVerified', 'Güncel ve gerçek seçenekler'
      ),
      true
    ),
    updated_at = now()
where key = 'site_settings';

update public.homepage_sections
set settings = settings || case section_key
  when 'campaigns' then jsonb_build_object(
    'badge','Kaçırmadan İncele',
    'description','Planınıza ekstra avantaj katacak seçili fırsatlar burada. Süre dolmadan size uyan kampanyayı yakalayın, gerçek fiyat avantajını görün ve tek dokunuşla detayına geçin.'
  )
  when 'rental_featured' then jsonb_build_object(
    'badge','Planınıza Uyan Araçlar',
    'description','Şehir içinde pratik, uzun yolda rahat, özel günlerde şık. Planınıza uyan aracı seçin, tarihlerinizi belirleyin ve Yüksekova’dan yola güvenle çıkın.'
  )
  when 'sale_featured' then jsonb_build_object(
    'badge','İçinize Sinen Aracı Bulun',
    'description','Yeni yol arkadaşınızı rakam kalabalığında kaybolmadan bulun. Öne çıkan ikinci el araçları karşılaştırın, güven veren detayları görün ve içinize sinen araç için görüşmeyi başlatın.'
  )
  when 'tour_featured' then jsonb_build_object(
    'badge','Hakkâri’yi Yerel Gözle Keşfedin',
    'description','Hakkâri’nin hafızasında kalan yollarına yerel gözle çıkın. Cilo’dan yaylalara uzanan rotalarda size uyan deneyimi seçin, tarihinizi belirleyin ve gerisini birlikte planlayalım.'
  )
  else '{}'::jsonb
end,
updated_at = now()
where section_key in ('campaigns','rental_featured','sale_featured','tour_featured');