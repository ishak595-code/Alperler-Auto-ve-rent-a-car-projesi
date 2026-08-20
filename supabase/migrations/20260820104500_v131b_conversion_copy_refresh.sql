update public.site_config
set value = jsonb_set(
  value || jsonb_build_object(
    'heroTitle', 'Yüksekova’da araç işi uzamasın. İhtiyacınızı seçin, yola çıkın.',
    'heroSubtitle', 'Kiralık araç, satılık araç, şoförlü transfer, düğün ve özel gün aracı ile yerel tur seçeneklerini tek yerde karşılaştırın.',
    'salesTitle', 'Doğru Aracı, Doğru Bilgiyle Seçin',
    'salesDesc', 'Sadece fotoğrafa bakıp karar vermeyin. Aracın güncel ilan bilgilerini, kilometre ve donanım kayıtlarını inceleyin; size uyan aracı seçtiğinizde görüşme ve inceleme adımını doğrudan başlatın.',
    'partnerTitle', 'Aracınızı Değerlendirmenin Daha Kolay Yolu',
    'partnerSubtitle', 'Aracınızı satmak veya kiralama filosunda değerlendirmek istiyorsanız temel bilgileri gönderin. Ekibimiz aracın durumunu, kullanım amacını ve uygun modeli değerlendirerek sizinle net bir sonraki adım paylaşsın.',
    'whyUsTitle', 'Neden Alperler Auto?',
    'whyUsSubtitle', 'Çünkü Yüksekova’da insanlar uzun form, belirsiz fiyat ve gereksiz telefon trafiğiyle uğraşmak istemiyor. İhtiyacı hızlı anlayan, seçenekleri açık gösteren ve yerel koşulları bilen bir sistem kuruyoruz.',
    'whyUsTrustTitle', 'Net Bilgi, Gerçek Kayıt',
    'whyUsTrustDesc', 'Araç, fiyat, uygunluk ve sözleşme koşullarını mümkün olduğunca güncel kayıttan gösteririz. Kesinleşmemiş bir bilgiyi kesinmiş gibi sunmayız.',
    'whyUsSupportTitle', 'Yerel ve Ulaşılabilir Destek',
    'whyUsSupportDesc', 'Talebiniz veritabanına kaydolur ve ekip tarafından takip edilir. Bir sorun olduğunda form labirentinde kaybolmak yerine doğrudan iletişim kanallarına ulaşırsınız.',
    'whyUsComfortTitle', 'İhtiyaca Uygun Araç',
    'whyUsComfortDesc', 'Günlük iş, aile ziyareti, piknik, köy ve yayla yolu, düğün, havalimanı transferi veya misafir ağırlama için aynı araç gerekmez. Amaca göre doğru seçeneği bulmanızı kolaylaştırırız.',
    'whatsappMessage', 'Merhaba, Alperler Auto üzerinden araç kiralama, satış, tur, transfer veya araç değerlendirme hakkında hızlı bilgi almak istiyorum.'
  ),
  '{homeContent}',
  coalesce(value->'homeContent','{}'::jsonb)
  || jsonb_build_object(
    'heroTrustLine', 'YÜKSEKOVA • HIZLI TALEP • NET SEÇENEK • YEREL DESTEK',
    'heroTitle', 'Yüksekova’da araç işi uzamasın. İhtiyacınızı seçin, yola çıkın.',
    'heroSubtitle', 'Günlük araç, aile ziyareti, piknik, köy-yayla rotası, düğün ve özel gün, havalimanı transferi, şehir dışından gelen misafir veya Hakkâri turu... Tarihi ve ihtiyacınızı birkaç adımda seçin; uygun seçenekleri görün, ayrıntıları ekibimizle netleştirin.',
    'searchPlaceholder', 'Araç, model, tur veya ihtiyacınızı yazın',
    'plannerKicker', 'HIZLI PLANLAMA',
    'bookingTitle', 'Planınızı birkaç adımda başlatın',
    'bookingSubtitle', 'Uzun form yok. Ne istediğinizi, tarihi ve teslim noktasını seçin. Sistem uygun araç veya tur seçeneklerini göstersin; kesin uygunluk ekip kontrolüyle netleşsin.',
    'plannerNote', 'Talep göndermek ücretsizdir. Kesin rezervasyon, araç ve tarih uygunluğu doğrulandıktan sonra oluşur.',
    'trustPrice', 'Fiyatı görün, sürprizi azaltın',
    'trustSupport', 'Yerel ekip, doğrudan iletişim',
    'trustVerified', 'Gerçek araç ve güncel kayıt',
    'heroCta', 'Uygun Seçenekleri Göster',
    'heroCtaSubtext', 'İhtiyacınızı seçin. Gereksiz adımlarla vakit kaybetmeyin.',
    'quickActionLabel', 'Ne Yapmak İstiyorsunuz?',
    'quickActionRentTitle', 'Bugün Araç Lazım',
    'quickActionRentDesc', 'İş, aile ziyareti, piknik, köy-yayla yolu veya şehir dışı planınız için güncel kiralık seçenekleri görün.',
    'quickActionSalesTitle', 'Satılık Araç Bakıyorum',
    'quickActionSalesDesc', 'Bütçenize ve kullanımınıza uyan ilanları karşılaştırın; detayını görmeden karar vermeyin.',
    'quickActionToursTitle', 'Tur veya Transfer Planlıyorum',
    'quickActionToursDesc', 'Şehir dışından gelen misafir, aile gezisi veya bölgeyi keşfetmek isteyenler için rota ve araç seçeneklerini görün.',
    'quickActionSellTitle', 'Aracımı Değerlendirmek İstiyorum',
    'quickActionSellDesc', 'Satış veya kiralama filosu için aracınızın bilgilerini gönderin; uygun modeli birlikte netleştirelim.',
    'featuredBadge', 'İHTİYACINIZA GÖRE SEÇİLDİ',
    'featuredTitle', 'Her Plan İçin Aynı Araç Gerekmez',
    'featuredSubtitle', 'Şehir içinde pratik kullanım, aile yolculuğu, düğün ve özel gün, kalabalık misafir, yayla-köy rotası veya uzun yol... Kullanım amacınıza göre kiralık araçları karşılaştırın.',
    'featuredViewAll', 'Tüm Kiralık Araçları Gör',
    'salesBadge', 'SATIN ALMADAN ÖNCE NETLEŞTİRİN',
    'salesTitle', 'Fotoğraftan Fazlasını Görün',
    'salesDescription', 'Kilometre, donanım, açıklama ve güncel satış kaydını birlikte inceleyin. Beğendiğiniz araç için doğrudan görüşme ve inceleme sürecine geçin.',
    'salesViewAll', 'Tüm Satılık Araçları Gör'
  )
  || jsonb_build_object(
    'partnerTitle', 'Aracınız İçin Tek Bir Yol Yok',
    'partnerSubtitle', 'Satmak mı istiyorsunuz, kiralama filosunda değerlendirmek mi? Aracın temel bilgilerini gönderin. Size uygun seçenek varsa ekip doğrudan sizinle görüşsün.',
    'toursTitle', 'Misafir Geldiğinde Nereye Gidelim Diye Düşünmeyin',
    'toursSubtitle', 'Hakkâri ve Yüksekova’nın doğasını, yaylalarını ve seçili rotalarını yerel planlamayla keşfedin. Aile, arkadaş grubu veya şehir dışından gelen misafirler için uygun tur ve transfer seçeneklerini inceleyin.',
    'toursViewAll', 'Tüm Rotaları Gör',
    'toursBookBtn', 'Rotayı ve Detayları İncele',
    'campaignBannerBadge', 'GERÇEK İHTİYACA GERÇEK AVANTAJ',
    'campaignBannerTitle', 'Planınıza Uyan Fırsatı Seçin',
    'campaignBannerSubtitle', 'Kiralama, transfer, özel gün veya rota planınız için aktif kampanyaları tek yerde görün. Koşulu, kapsamı ve geçerlilik tarihini inceleyerek karar verin.',
    'campaignBannerButtonText', 'Fırsatları İncele',
    'plannerServiceLabel', 'Ne için araç veya hizmet arıyorsunuz?',
    'plannerIndividualLabel', 'Şoförsüz araç kiralama',
    'plannerDriverLabel', 'Şoförlü araç / transfer',
    'plannerWeddingLabel', 'Düğün / özel gün aracı',
    'plannerTourLabel', 'Tur / gezi planı',
    'plannerPickupLabel', 'Nereden teslim almak istiyorsunuz?',
    'plannerPickupPlaceholder', 'Teslim noktasını seçin',
    'plannerStartLabel', 'Alış tarihi',
    'plannerEndLabel', 'İade tarihi',
    'plannerTourDateLabel', 'Tur tarihi',
    'plannerRentalButton', 'Bu Tarihe Uyan Araçları Göster',
    'plannerDriverButton', 'Şoförlü Seçenekleri Göster',
    'plannerWeddingButton', 'Özel Gün Araçlarını Göster',
    'plannerTourButton', 'Bu Tarihe Uyan Turları Göster'
  ), true
), updated_at=now()
where key='site_settings';

update public.homepage_sections set settings = settings || jsonb_build_object('badge','İhtiyacınıza Göre Seçildi','description','Şehir içi kullanım, aile ziyareti, piknik, köy-yayla rotası, düğün veya uzun yol için kullanım amacınıza uyan kiralık araçları karşılaştırın. Tarih ve teslim noktasını seçerek uygunluk adımına doğrudan geçin.'), updated_at=now() where section_key='rental_featured';
update public.homepage_sections set settings = settings || jsonb_build_object('badge','Satın Almadan Önce Netleştirin','description','Kilometre, donanım ve güncel ilan bilgilerini birlikte inceleyin. Size uyan aracı seçtiğinizde görüşme ve araç inceleme sürecini doğrudan başlatın.'), updated_at=now() where section_key='sale_featured';
update public.homepage_sections set settings = settings || jsonb_build_object('badge','Yerel Rotalar, Kolay Planlama','description','Aile gezisi, arkadaş grubu veya şehir dışından gelen misafirler için Hakkâri ve Yüksekova çevresindeki seçili rota ve transfer seçeneklerini inceleyin.'), updated_at=now() where section_key='tour_featured';
update public.homepage_sections set settings = settings || jsonb_build_object('badge','Planınıza Uyan Fırsat','description','Sadece indirim başlığına bakmayın. Aktif kampanyanın hangi hizmette geçerli olduğunu, kapsamını ve tarihini görerek size gerçekten uyan avantajı seçin.'), updated_at=now() where section_key='campaigns';
update public.homepage_sections set settings = settings || jsonb_build_object('badge','Aracınız İçin Seçenekleri Görün','description','Aracınızı satmak veya kiralama filosunda değerlendirmek için ön başvuru oluşturun. Uygun model, araç bilgileri incelendikten sonra netleştirilir.'), updated_at=now() where section_key='partner';

update public.footer_settings set brand_summary='Yüksekova’da araç kiralama, ikinci el satış, şoförlü transfer, özel gün aracı ve bölgesel tur ihtiyaçlarını tek yerde planlayın. İhtiyacınızı seçin, talebinizi gönderin, ayrıntıları yerel ekiple netleştirin.', newsletter_title='Yeni araç, rota ve gerçek fırsatlardan haberdar olun', newsletter_description='Yeni ilan, aktif kampanya veya seçili tur yayınlandığında haber alın. Gereksiz e-posta yok; abonelik ücretsizdir.', updated_at=now() where config_key='main';
