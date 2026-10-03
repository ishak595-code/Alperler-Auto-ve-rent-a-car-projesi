-- V257 copy refresh: admin-managed Turkish copy (home hero, home sections, about, footer, SEO).
-- Data only, no schema change. Run once in the Supabase SQL editor. Previous values are kept in
-- docs/copy-backup-v257-db.json. Safe to re-run.

begin;

update public.site_config
set value = jsonb_set(
  value || jsonb_build_object(
    'heroTitle', $t$Yüksekova’da yol sizin, araç bizden.$t$,
    'heroSubtitle', $t$Kiralık araç, gelin arabası, şoförlü transfer veya Cilo rotası. Seçin, fiyatı baştan görün; gerisini yerel ekibimiz halletsin.$t$,
    'aboutTitle', $t$Yüksekova’nın yolunu bilen bir aile işletmesi$t$,
    'aboutText', $t$Alperler Rent A Car, Yüksekova’da bir aile işletmesi olarak yola çıktı. Kurucumuz İshak Alper’in hedefi basitti: bu bölgede araç kiralamak, araç almak ya da bir yolculuk planlamak kolay ve açık olsun.

İşimizi üç söz üzerine kurduk. Fiyatı baştan söyleriz. Aracı ve koşulları olduğu gibi gösteririz. Günün her saatinde bize ulaşırsınız.

Şehir içi günlük kiralamadan köy ve yayla yollarına, düğün gününüzden havalimanı transferine, ekspertizli ikinci el araçlardan Cilo rotalarına kadar ihtiyacınız ne olursa olsun karşınızda aynı ekibi bulursunuz. Talebiniz kayıt altına alınır; teslimden ödemeye her adım takip edilir.

Sitede gördüğünüz marka Alperler Rent A Car’dır. Arkasındaki filo ve araç operasyonu Alperler Auto adıyla yürütülür.$t$,
    'seoDescription', $t$Yüksekova’da 7/24 araç kiralama, gelin arabası, şoförlü VIP transfer, ekspertizli satılık araç ve Cilo turları. Fiyatı baştan görün, WhatsApp’tan tek mesajla planlayın.$t$,
    'seoOgDescription', $t$Yüksekova’da yol sizin, araç bizden. Kiralama, satılık araç, şoförlü VIP transfer ve bölge turları tek ekipte.$t$
  ),
  '{homeContent}',
  coalesce(value->'homeContent', '{}'::jsonb) || jsonb_build_object(
    'heroTitle', $t$Yüksekova’da yol sizin, araç bizden.$t$,
    'heroSubtitle', $t$Kiralık araç, gelin arabası, şoförlü transfer veya Cilo rotası. Seçin, fiyatı baştan görün; gerisini yerel ekibimiz halletsin.$t$,
    'trustSupport', $t$7/24 yerel ekip$t$,
    'trustVerified', $t$Güncel araç, net koşul$t$,
    'plannerKicker', $t$ŞİMDİ PLANLAYIN$t$,
    'bookingTitle', $t$Ne zaman yola çıkıyorsunuz?$t$,
    'bookingSubtitle', $t$Hizmeti ve tarihi seçin. Planınıza uyan araçları ve rotaları hemen karşınıza getirelim.$t$
  )
)
where key = 'site_settings';

update public.homepage_sections s
set title = v.title,
    settings = s.settings || jsonb_build_object('badge', v.badge, 'description', v.description)
from (values
  ('campaigns', $t$Aktif Fırsatlar$t$, $t$Süresi Dolmadan$t$, $t$Geçerlilik tarihi ve kazancı açıkça yazan kampanyalar. Size uyanı seçin, fırsat bitmeden planınızı yapın.$t$),
  ('rental_featured', $t$Yola Hazır Kiralık Araçlar$t$, $t$Her Yola Bir Araç$t$, $t$Çarşıda pratik, yayla yolunda güçlü, düğün gününde gösterişli. Tarihinizi seçin, günlük fiyatı baştan görün, size uyan aracı kolayca ayırtın.$t$),
  ('sale_featured', $t$Geçmişi Açık İkinci El Araçlar$t$, $t$İçinize Sinen Aracı Bulun$t$, $t$Araba almak büyük karar. O yüzden ekspertizli araçlarımızın fiyatını, kilometresini ve hasar bilgisini ilanda açıkça yazıyoruz. Beğendiğiniz aracı yerinde görün, aklınızdaki her soruyu doğrudan bize sorun.$t$),
  ('tour_featured', $t$Hakkâri’nin Dağ ve Yayla Rotaları$t$, $t$Yerel Ekiple Keşfedin$t$, $t$Cilo’nun buzullarından yayla yollarına, bu coğrafyayı yakından tanıyan yerel ekiple çıkın. Rotayı seçin, tarihi söyleyin; aracı ve planı biz hazırlayalım.$t$),
  ('branches', $t$Size En Yakın Alperler Noktası$t$, $t$Hizmet Ağı$t$, $t$Aracı nereden alacağınızı, nereye bırakacağınızı ve kiminle konuşacağınızı baştan bilin. Size en yakın noktayı seçin, doğrudan o şubeye ulaşın.$t$),
  ('partner', $t$Aracınız Değerini Bulsun$t$, $t$Araç Sahiplerine$t$, $t$Aracınızı satmak mı istiyorsunuz, yoksa kiraya verip gelir mi elde etmek? Bilgilerini birkaç dakikada gönderin. Ekibimiz inceleyip size uygun yolu açıkça söylesin.$t$),
  ('blog_featured', $t$Yola Çıkmadan Önce$t$, $t$Rehber ve İpuçları$t$, $t$Yayla yoluna hangi araç gider, kiralarken neye dikkat edilir, Hakkâri’de nereler görülür? Kısa, net ve işinize yarayacak yazılar.$t$),
  ('closing_cta', $t$Yolculuğunuzu Birlikte Planlayalım$t$, $t$ALPERLER RENT A CAR$t$, $t$Ne zaman, nereye, kaç kişi? Bize söyleyin; uygun aracı ve fiyatı net konuşalım. Karar sizin, hazırlık bizden.$t$)
) as v(section_key, title, badge, description)
where s.section_key = v.section_key;

update public.footer_settings
set brand_summary = $t$Yüksekova’da 7/24 araç kiralama, ekspertizli ikinci el satış, şoförlü transfer, gelin arabası ve bölge turları tek ekipte. Fiyatı baştan görün, tek mesajla planlayın.$t$,
    newsletter_title = $t$Yeni araç ve fırsatları ilk siz duyun$t$,
    newsletter_description = $t$Yeni bir araç, kampanya veya tur yayınlandığında haber verelim. Gereksiz e-posta göndermeyiz. Abonelik ücretsizdir.$t$
where config_key = 'main';

commit;
