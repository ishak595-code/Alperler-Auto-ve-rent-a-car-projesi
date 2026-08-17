-- V90: service-specific legal documents managed through site_config.
-- Production values are deliberately descriptive and do not invent licence,
-- tax, registry or authorization numbers that must come from real documents.

update public.site_config
set value = value || jsonb_build_object(
  'rentalTermsText', $rental$ARAÇ KİRALAMA KOŞULLARI

1. Kapsam
Bu koşullar Alperler Auto üzerinden talep edilen günlük, dönemsel, şoförlü veya şoförsüz araç kiralama işlemlerinin genel çerçevesini açıklar. Kesin kiralama; araç, tarih, sürücü, ücret, depozito, kilometre ve teslim/iade bilgilerinin müşteriyle teyit edilmesi ve uygulanabilir kiralama sözleşmesinin kurulmasıyla kesinleşir.

2. Sürücü ve belge şartları
Yaş, ehliyet süresi, ek sürücü ve araç sınıfına özgü şartlar her araç için ayrı belirlenebilir. Müşteri ve sürücü, işlem öncesinde istenen kimlik/ehliyet bilgilerinin doğru ve güncel olmasından sorumludur. Araç detayında veya sözleşmede belirtilmeyen kişi aracı kullanamaz.

3. Fiyat ve ek hizmetler
Kiralama bedeli seçilen tarih aralığı, araç, teslim/iade noktası ve seçilen ek hizmetlere göre hesaplanır. Ücretli ek hizmetler seçildiğinde toplam fiyat ayrıca gösterilir. Kesin toplam işlem öncesinde müşteriye teyit edilir.

4. Depozito, kilometre ve yakıt
Varsa depozito/provizyon, kilometre limiti, fazla kilometre bedeli, yakıt seviyesi ve benzeri araç özelindeki koşullar rezervasyon veya sözleşme aşamasında gösterilir.

5. Teslim ve iade
Araç tesliminde mevcut hasar, donanım, yakıt ve kilometre durumu kontrol edilebilir. Gecikme, eksik yakıt, olağan kullanım dışı temizlik/hasar veya sözleşmeye aykırı kullanım nedeniyle doğabilecek bedeller somut kayıt ve sözleşme şartlarına göre değerlendirilir.

6. Yasak kullanım ve güvenlik
Aracın hukuka aykırı amaçla, yarışta, alkol/uyuşturucu etkisi altında, yetkisiz sürücüyle veya sözleşmede yasaklanan şartlarda kullanılması yasaktır. Kaza, arıza veya güvenlik olayı gecikmeden bildirilmelidir.

7. Sigorta ve sorumluluk
Sigorta/kasko ve ek teminatların kapsamı araç/poliçe bazında değişebilir. Muafiyet, teminat dışı haller ve müşterinin sorumluluğu ilgili poliçe ve kiralama sözleşmesine göre belirlenir.

8. İptal ve değişiklik
Belirli tarih/dönem için yapılan araç kiralamalarında uygulanacak iptal/değişiklik koşulları rezervasyon öncesinde ayrıca gösterilir. Emredici tüketici mevzuatından doğan haklar saklıdır.$rental$,
  'salesTermsText', $sales$İKİNCİ EL SATIŞ VE İLAN KOŞULLARI

1. İlanın niteliği
AlperAuto’da yayımlanan ikinci el araç kayıtları doğrulanmış bilgiler ve yayın statüsü üzerinden müşteriye sunulur. Web ilanı tek başına resmi araç satışını veya mülkiyet devrini tamamlamaz.

2. İlan verme ve pazarlama yetkisi
İlan için araç sahibi, işletme veya yetkili kişinin ilgili aracı pazarlama yetkisine sahip olması gerekir. Elektronik ilanlarda mevzuatın gerektirdiği kimlik/yetki doğrulamaları tamamlanmadan ilan yayınlanmamalıdır. Ticari ikinci el araç faaliyetinde zorunlu işletme/yetki şartları ayrıca yerine getirilmelidir.

3. Bilgilerin doğruluğu
Marka, model, yıl, kilometre, hasar/tramer, ekspertiz, donanım, garanti ve fiyat bilgileri mevcut belge/kayıtlara dayanmalıdır. Bilinen önemli kusurlar gizlenemez.

4. Ekspertiz ve inceleme
Müşteri karar öncesinde aracı inceleyebilir ve gerekli ekspertiz/servis kontrollerini yaptırabilir. Site açıklaması resmi ekspertiz raporunun yerini almaz.

5. Fiyat, ödeme ve resmi devir
İlan fiyatı güncel satış talebini gösterir. Ödeme, masraf, teslim ve noter/devir koşulları işlem öncesinde teyit edilir. Mülkiyet devri yalnız mevzuata uygun resmi işlem tamamlandığında gerçekleşir.

6. Üçüncü kişi araçları
Araç sahibi/yetkili üçüncü kişi adına yayımlanan ilanlarda mülkiyet, yetki ve ilan içeriğine ilişkin belgeler talep edilebilir. Merkezi moderasyon ilanı reddedebilir, askıya alabilir veya yayından kaldırabilir.$sales$,
  'tourTermsText', $tour$TUR VE TRANSFER HİZMET KOŞULLARI

1. Hizmet türü
Günübirlik gezi, özel rota, transfer veya niteliğine göre daha kapsamlı seyahat hizmetleri sunulabilir. Süre, rota, araç, kapasite, buluşma noktası, dahil/hariç hizmetler ve ücret ilgili kayıtta belirtilir.

2. Günübirlik tur ve paket tur ayrımı
Yalnız günübirlik ve 24 saatten kısa hizmetler tek başına paket tur değildir. Bir hizmet mevzuattaki paket tur unsurlarını taşıyorsa zorunlu bilgilendirme ve sözleşme hükümleri ayrıca uygulanmalıdır.

3. Rezervasyon
Talep; tarih, kişi sayısı, rota, fiyat ve müsaitlik teyit edildiğinde kesinleşir.

4. Program değişiklikleri
Hava, yol, güvenlik, resmi makam kararları veya mücbir sebepler nedeniyle güvenli ve makul değişiklik yapılabilir. Esaslı değişikliklerde müşteri mümkün olan en kısa sürede bilgilendirilir.

5. Katılımcı sorumluluğu
Katılımcı güvenlik talimatlarına ve çevre/bölge kurallarına uymalıdır. Hizmete göre gerekli veli/vası onayı veya özel bilgi talep edilebilir.

6. İptal ve iade
Koşullar turun niteliğine ve belirli tarih için ayrılmış kapasiteye göre işlem öncesinde açıklanır. Emredici tüketici hakları saklıdır.$tour$,
  'partnerTermsText', $partner$ARACINI DEĞERLENDİR BAŞVURU KOŞULLARI

Başvuru bir ön değerlendirmedir; aracın satın alındığı, kiralama filosuna kabul edildiği veya ilanının yayınlandığı anlamına gelmez. Başvuru sahibi aracın sahibi olduğunu veya sahibi adına yetkili olduğunu ve verdiği bilgilerin doğru olduğunu beyan eder. Mülkiyet/yetki, ruhsat, ekspertiz, sigorta veya başka belgeler talep edilebilir. Araç teknik, ticari, fiyat, sigorta ve mevzuat kriterlerine göre incelenir. Elektronik ilan veya ticari kullanım için gerekli sahiplik/yetki doğrulamaları ayrıca tamamlanır. Başvuru verileri değerlendirme ve sözleşme öncesi işlemler amacıyla işlenir.$partner$,
  'branchTermsText', $branch$ŞUBE VE BAYİLİK BAŞVURU KOŞULLARI

Şube/bayilik başvurusu franchise, acentelik, ortaklık veya başka bir ticari sözleşme kurmaz. Başvuru sahibi kimlik/şirket, adres, iletişim, faaliyet alanı ve istenen diğer bilgileri doğru vermelidir. Faaliyetin niteliğine göre vergi, oda, ruhsat, yetki, sigorta ve diğer resmi belgeler talep edilebilir. Şube; kurulum kontrol listesi, ağ politikaları, fiyat kuralları ve zorunlu belgeler tamamlanıp merkezi yönetim tarafından onaylanmadan ACTIVE statüsüne alınamaz. Şube içerikleri merkezi moderasyona tabi olabilir. Marka kullanımı yalnız yazılı yetki kapsamında mümkündür. Kesin hak/yükümlülükler ayrıca kurulacak ticari sözleşmede belirlenir.$branch$,
  'commercialCommunicationText', $comm$BÜLTEN VE TİCARİ ELEKTRONİK İLETİ BİLGİLENDİRMESİ

Bültene e-posta ile kaydolunduğunda talep tarih/saat, kaynak ve abonelik durumu ile kayıt altına alınır. Onay verilen kanal kapsamında yeni araç, kampanya, tur fırsatı ve hizmet duyuruları gönderilebilir. Ticari elektronik ileti gönderimi, mevzuatta onay aranan durumlarda alıcının onayına dayanır. Hizmet sağlayıcının İleti Yönetim Sistemi kapsamındaki kayıt, onay ve ret yükümlülükleri ayrıca yerine getirilmelidir; web sitesindeki teknik abonelik kaydı tek başına bu yükümlülüklerin yerine geçtiği anlamına gelmez. Alıcı istediği zaman abonelikten çıkma/ret kanalını kullanabilir. E-posta, abonelik zamanı, dil ve kaynak bilgisi izin yönetimi ve gönderim güvenliği için işlenebilir.$comm$
), updated_at = now()
where key = 'site_settings' and is_public = true;
