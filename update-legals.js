const fs = require('fs');

const file = 'src/services/car.service.ts';
let content = fs.readFileSync(file, 'utf8');

// The legal text strings
const kvkkText = `Alperler Auto olarak kişisel verilerinizin güvenliği hususuna azami hassasiyet göstermekteyiz. Şirketimiz ile her türlü ilişkiniz kapsamında paylaştığınız kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")'na uygun olarak muhafaza edilmektedir.

1. Veri Sorumlusunun Kimliği
Veri sorumlusu sıfatıyla, Alperler Auto unvanlı şirketimiz, Hakkari / Yüksekova merkezli faaliyet göstermektedir. Şirketimiz, kişisel verilerinizi KVKK ve ilgili mevzuat uyarınca aşağıda açıklanan kapsamda işleyebilecek, kaydedebilecek, muhafaza edebilecek ve kanunen izin verilen hallerde üçüncü kişilere aktarabilecektir.

2. Kişisel Verilerin İşlenme Amacı
Toplanan kişisel verileriniz (Kimlik bilgileri, iletişim bilgileri, adres, ehliyet, finansal bilgiler vb.), araç kiralama, araç satış ve turlarımız kapsamasındaki sözleşmelerin ifası, müşteri memnuniyeti, kampanya duyuruları, yasal bildirimler, kiralama sırasında kasko ve sigorta süreçlerinin yönetimi, güvenlik önlemlerinin sağlanması (GPS takibi vb.) amaçlarıyla işlenmektedir.

3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği
İşlenen kişisel verileriniz, yasal mevzuat gereği talep halinde emniyet birimlerine, yetkili kamu kurum ve kuruluşlarına, adli makamlara aktarılabilir. Operasyonel süreçler (sigorta, kasko, yol yardım vs.) sebebiyle iş ortaklarımız, tedarikçilerimiz, sigorta ve finans şirketleri ile güvenli bir şekilde paylaşılabilmektedir. Kiralama süreçleri dışında üçüncü kişilerle ticari amaçla verileriniz paylaşılmaz.

4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi
Kişisel verileriniz, merkez ofisimiz, web sitemiz (alperrentacar.online), çağrı merkezimiz veya e-posta aracılığıyla sözlü, yazılı veya elektronik ortamda toplanmaktadır. Sözleşmenin kurulması, yasal yükümlülüklerimizin yerine getirilmesi hukuki sebeplerine dayanarak işlenmektedir.

5. İlgili Kişinin Hakları
KVKK’nın 11. maddesi uyarınca;
- Kişisel veri işlenip işlenmediğini öğrenme,
- Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
- Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,
- Eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme haklarına sahipsiniz.`;

const privacyText = `1. Gizlilik Hedefimiz
Alperler Auto ("Şirket") olarak, müşterilerimize ilişkin tüm bilgilerin gizliliği ve güvenliği birinci önceliğimizdir. İşbu Gizlilik Politikası, web sitemizi ziyaret eden ve hizmetlerimizden (Araç kiralama, İkinci el araç alım-satım, Tur organizasyonları) yararlanan kişilerin veri güvenliğini sağlamak için düzenlenmiştir.

2. Hangi Bilgiler Toplanıyor?
Hizmetlerimizden faydalanmak üzere bize sağladığınız Ad-Soyad, T.C. Kimlik No, Pasaport No, Ehliyet detayları, telefon, e-posta, fatura adresiniz, seyahat planlarınız, araç kullanım verileriniz (telemetri/GPS - araç güvenliği ve kiralama şartlarına uyum sağlamak için) tarafımızca güvenli sistemlerde tutulmaktadır. Kredi kartı verileriniz asla sunucularımızda saklanmaz, doğrudan BDDK onaylı ödeme sağlayıcısına iletilir.

3. Bilgilerin Kullanımı
Toplanan bilgiler, rezervasyon işlemlerinizin tamamlanması, faturalandırma, acil durumlarda iletişim sağlama, müşteri destek hizmetleri sunma ve rızanız dâhilinde özel kampanya bildirimleri yapmak için kullanılır. Araç satış veya alış süreçlerinde gerekli hukuki evrakların hazırlanması için kamu daireleri ve noterlerle bilgi paylaşımı gerekebilmektedir.

4. Dış Bağlantılar
Web sitemiz içerisinde zaman zaman ortaklık kurduğumuz firmalara ait bağlantılar bulunabilir. Ancak bu sitelerin gizlilik uygulamaları ve içeriklerinden Alperler Auto sorumlu değildir.

5. Güncellemeler
Şirketimiz, gizlilik ve veri koruma prensiplerini güncel tutarak bu politikayı önceden haber vermeksizin değiştirme hakkına sahiptir. Tüm değişiklikler sitede yayımlandığı an yürürlüğe girer.`;

const cookiesText = `Olarak Alperler Auto, web sitemizin daha verimli ve güvenli çalışmasını sağlamak, kullanıcı deneyimini artırmak amacıyla Çerezler (Cookies) kullanmaktayız. 

1. Çerez Nedir?
Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza indirilen küçük veri dosyalarıdır. Siteyi tekrar ziyaret ettiğinizde sizi hatırlamamızı sağlar.

2. Hangi Çerezleri Kullanıyoruz?
- Zorunlu Çerezler: Sitenin çalışması için mecburidir. Oturum yönetimi, güvenlik önlemleri bu çerezlerle sağlanır.
- İşlevsel Çerezler: Dil tercihi, rezervasyon geçmişi gibi seçimlerinizin hatırlanmasını sağlar.
- Performans/Analitik Çerezleri: Sitemizi nasıl kullandığınızı analiz eder (Örn: Hangi araç kategorilerine daha çok bakıldığı) ve hizmet kalitemizi artırmamıza yardımcı olur. Veriler anonim tutulur.

3. Çerez Yönetimi
Çerez kullanımını istemiyorsanız, tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Ancak bu durumda rezervasyon ve iletişim modüllerimiz tam performanslı çalışmayabilir. Alperler Auto, zorunlu olmayan çerezler için web sitesine ilk girişinizde onay alabilir.`;

const termsText = `Alperler Auto Araç Kiralama, Alım Satım ve Tur Kullanım Şartları

Bu web sitesini ziyaret ederek veya Alperler Auto üzerinden rezervasyon (kiralama/satış/tur) yaparak aşağıdaki maddeleri ve şartları kabul etmiş sayılırsınız:

1. Rezervasyon ve İptal Şartları
Araç kiralama ve turlar için yapılan rezervasyonlar doğrulandıktan sonra geçerlidir. Rezervasyon bedelinin geri iadesi ve değiştirme hakları için "İade ve İptal Politikası" geçerlidir.

2. Kiralama Yaşı ve Ehliyet
Binek ve ekonomik araç grupları için en az 21 yaş ve 2 yıllık geçerli ehliyet, VIP ve lüks araç grupları için en az 25 yaş ve 3 yıllık geçerli ehliyet zorunludur. Yurtdışı ehliyetlerinin Türkiye Cumhuriyeti kanunları çerçevesinde noter onaylı tercümeleri talep edilebilir. 

3. Araç Teslimatı ve İade
Araçlar temiz, yakıt deposu belirtilen seviyede ve tam donanımlı teslim edilir, aynı şekilde iade edilmesi beklenir. Gecikmelerde saatlik ücret veya tam gün ücreti yansıtılır. Şehir dışı ve havalimanı teslimatlarında belirlenen drop ücretleri uygulanır.

4. Fiyatlara Dahil Olanlar ve Olmayanlar
Araç kiralama fiyatlarına periyodik bakımlar, zorunlu trafik sigortası ve %20 KDV dahildir. Akaryakıt, OGS/HGS (otoyol ve köprü geçişleri), trafik cezaları, tek yön (drop) ücretleri, bebek koltuğu gibi ekstra talepler fiyata dahil DEĞİLDİR. Şirketimiz peşin tahsil edilen OGS bedelini kullanım sonrası mahsuplaşabilir.

5. Yasaklar ve Kısıtlamalar
Kiralanan araç ile; uyuşturucu ve alkol etkisi altında araç kullanımı, yasadışı eşya taşımacılığı, yarış, off-road ve sözleşmede belirtilmeyen 3. kişilere aracı kullandırmak KESİNLİKLE YASAKTIR. Bu durumların tespiti halinde sözleşme tek taraflı feshedilir ve hukuki işlem başlatılır. Rent a Car kasko şartları bu ihlallerde geçersiz sayılır.

6. Araç Alım - Satım İşlemleri
Firmamız üzerinden alınan 2. el araçlar ekspertiz garantili olup, satış süreci taraflar arasında düzenlenecek satış vaadi sözleşmesi ile resmi kanallardan tamamlanacaktır. Alperler Auto, ekspertiz dışı ortaya çıkan kronik fabrikasyon hatalarından ötürü sorumluluk reddi beyan edebilir, bu husus satış sözleşmesinde netleştirilecektir.`;

const distanceSellingText = `Mesafeli Satış/Hizmet Sözleşmesi

1. Taraflar
SATICI/SAĞLAYICI: Alperler Auto (Adres, VKN bilgileri sistemde mevcuttur).
ALICI/MÜŞTERİ: Çevrimiçi kanallar üzerinden araç kiralama, satın alma veya tur organizasyonu için başvuru/ödeme yapan şahıs veya firma.

2. Konu
İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait alperrentacar.online adresinden elektronik ortamda siparişini (rezervasyon) verdiği ürün/hizmetin teslimi, kullanımı ve satışı/kiralanması ile ilgili olarak 6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.

3. Hizmet Bedeli ve Ödeme
Rezervasyon sırasındaki döviz/TL kuruna, ek alınan hizmetlere (bebek koltuğu, sigorta) göre sözleşme tutarı belirlenir. Kiralama süreçlerinde ofiste provizyon (depozito) işlemi gerçekleştirilebilir. İkinci el oto satışlarında ise mevzuat gereği ödemenin mutlaka şirket yasal hesabına, "araç satın alma işlemi satış bedeli" açıklaması ile transfer edilmesi gereklidir.

4. Haklar ve Yükümlülükler
- Araç tesliminden önce, mücbir sebepler (kaza, arıza vb.) nedeniyle araç temin edilememesi durumunda SATICI, muadil veya üst segment araç sağlamak ya da iade yapmakla yükümlüdür.
- Alıcı, kiraladığı veya tur rehberliği hizmeti aldığı sürece genel trafik kurallarına, ahlaki standartlara ve Türkiye Cumhuriyeti kanunlarına uymak zorundadır.

5. Yetkili Mahkeme
Uyuşmazlıkların çözümünde Hakkari / Yüksekova Tüketici Hakem Heyetleri ve Mahkemeleri yetkilidir.`;

const cancellationText = `İade ve İptal Politikası

Araç kiralama, transfer ve tur hizmetlerimizde müşteri memnuniyetini en üst düzeyde tutmak amacıyla iade ve iptal kurallarımız şeffaf şekilde aşağıda belirtilmiştir:

1. Araç Kiralama ve Turlar İçin İptal
- Alış saatinden 48 SAAT ÖNCESİNE KADAR yapılan iptallerde, ödenen hizmet bedelinin %100'ü (banka kesintileri hariç) kesintisiz iade edilir.
- Alış saatine 24 - 48 SAAT ARASI kalan zaman diliminde yapılan iptallerde 1 günlük kira bedeli tahsil edilir ve kalan tutar iade edilir.
- Alış saatine 24 SAATTEN AZ kalınan ya da aracı teslim almaya (No-Show) Gelinmemesi durumunda iade yapılmaz.

2. Araç İadesi ve Erken Teslim
Aracın sözleşmede belirtilen iade gününden erken teslim edilmesi durumunda, kullanılmayan günlerin iadesi Şirket inisiyatifinde olup, kampanya dönemlerindeki fiyat değişikliklerine göre "1 günden az" tutarlar kesinlikle iade edilmez.

3. 2. El Araç Alım Sözleşmesi İptalleri
Satın almak üzere kaparo (ön ödeme) verdiğiniz ve adınıza rezerve edilen araçlar için, alıcının keyfi iptalleri durumunda kaparo iade edilmez. Eğer ki yapılan ekspertizde şirketimizin beyan ettiğinden farklı, Tramer, kaza veya ciddi motor/mekanik arızası çıkması durumunda kaparonuz KESİNTİSİZ 100% iade edilir.

4. Para İadesi Süreci
Banka veya kredi kartı ile yapılan ödemelerin iade süreleri banka altyapısına bağlı olarak ortalama 3 ile 14 iş günü arasında müşteri hesabına yansımaktadır.`;

const insuranceText = `Araç Sigorta ve Sorumluluk Şartları

Tüm kiralık araçlarımız yasa dışı korumalar ve şirketimizin ek güvenceleri ile korunmaktır. Ancak bu güvencelerin geçerli olması kesin kurallara bağlıdır.

1. Kapsam Dahilinde Olan Korumalar
Standart Rent a Car kaskomuz, çarpışma, devrilme, çalınma, doğal afetler gibi zararlarda teminat sunar. Ek ücretle sunduğumuz "Tam Kapsamlı (Mini Hasar) Paket", lastik yarılmaları, cam ve far kırılmaları gibi genel kasko dışı kalan küçük sorunları karşılar.

2. Sigorta ve Kaskoyu Geçersiz Kılan Durumlar
Aşağıdaki hallerde olası hasar bedelleri BİREBİR kiracıdan tanzim edilir; kasko devreden çıkar:
- Alkol veya yasadışı uyuşturucu madde etkisi altında kaza yapılması.
- Sözleşmede adı bulunmayan ek sürücüler tarafından kaza yapılması.
- Trafik kurallarının ağır ihlali (Örn: kırmızı ışıkta, aşırı hız limitlerinde oluşan zararlar).
- Aracın belirlenen kapasitenin üstünde yolcu ve yük ile kullanımı veya arazi (off-road) şartlarında, kumsalda, dağlık altyapısız mecralarda kullanılması sonucunda alt takım ve genel hasar oluşması.
- Kaza yerinin terk edilmesi, alkol raporunun veya kaza tespit tutanağının polis/jandarma bölgesinden alınmaması (48 saat içinde teslim edilmemesi).

3. Hasar Anında Prosedür
Herhangi bir hasar, kaza durumunda aracı yerinden OYNATMADAN derhal şirket merkezimiz (0537 959 48 51) aranmalı ve 112 aracılığıyla Polis / Jandarma birimlerine haber verilmelidir. Tek taraflı kazalarda polis raporu elzemdir. Tespit tutanakları eksiksiz bir biçimde resimlenerek ofisimize iletilmelidir. 

Araçlarımızda 7/24 GPS bazlı telemetri kontrolü mevcuttur. Raporlardaki hız ve konum beyanları şirket kayıtlarımız ile doğrulanamazsa sigorta hakkı tamamen reddedilebilir.`;

const aboutTitle = \`Bölgenin Yükselen Güneşinde\nYenilikçi Seyahat ve Otomotiv Çözümleri\`;
const aboutText = \`Alperler Auto olarak, Yüksekova'nın eşsiz coğrafyasında uzun yıllardır hemşehrilerimize ve şehrimizi ziyaret eden bürokratlardan turistlere kadar tüm misafirlerimize kesintisiz, güven dolu bir otomotiv deneyimi sunuyoruz. 

"Daima Bir Adım İleri" vizyonu ile kurduğumuz bu yapı, standart bir rent a car mantığının ötesine geçerek; 2. el şeffaf otomobil ticareti, protokol transfer hizmetleri, uzun dönem filo kiralama ve Hakkari bölgesinin bakir doğasına ulaşım sağlayan özel tur organizasyonlarını tek bir çatı altında toplamıştır.

Müşteri memnuniyetini satıştan veya kiralamadan çok daha ileride; dürüst, güler yüzlü ve anında çözüm sağlayan bir aile bağı gibi görüyoruz. Bölgenin fiziki şartlarına uyumlu, bakımlı arazi ve binek araçlarımızla yollardaki güveniniz olmaya devam ediyoruz. Alperler Auto, Yüksekova'dan Hakkari'ye, oradan tüm bölgeye yayılan sağlam kilit taşlarıyla örülmüş, sizin için var olan öncü bir otomotiv platformudur.\`;

const teamStr = `[
  {
    id: 1,
    name: "Alper Yılmaz",
    role: "Kurucu / Yönetim Kurulu Başkanı",
    description: "Sektörde yılların tecrübesiyle, her detayı titizlikle planlayan güven inşacısı ve asıl lider.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600"
  },
  {
    id: 2,
    name: "Emre Aslan",
    role: "Operasyon & Satış Koordinatörü",
    description: "İkinci el ticareti ve anlık filo operasyonlarında müşterilerimize çözüm odaklı, hızlı yaklaşımlar sunar.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600"
  },
  {
    id: 3,
    name: "Zeynep Kaya",
    role: "Tur ve Seyahat Planlama",
    description: "Hakkari'nin eşsiz güzelliklerini misafirlerimize en konforlu ve samimi rotalarla hazırlayan tur uzmanımız.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600"
  }
]`;

// Let's replace the property declarations in car.service.ts
function injectText(prop, value) {
  const isArray = prop === 'team';
  const startTarget = prop + ": ";
  value = isArray ? value : "\`" + value + "\`";

  const regex = new RegExp(prop + "\\s*:\\s*(\\`\\[\\s*\\]\\`|\\`\\s*\\`|\\[\\s*\\]|\\`\\`|\\"\\"),", "");
  
  if(content.match(regex)) {
      content = content.replace(regex, prop + ": " + value + ",");
  } else {
      console.error("Could not match: " + prop);
  }
}

// Ensure the local variables are assigned in fallback as well.
injectText("kvkkText", kvkkText);
injectText("privacyText", privacyText);
injectText("cookiesText", cookiesText);
injectText("termsText", termsText);
injectText("distanceSellingText", distanceSellingText);
injectText("cancellationText", cancellationText);
injectText("insuranceText", insuranceText);
injectText("aboutTitle", aboutTitle);
injectText("aboutText", aboutText);
injectText("team", teamStr);

// To ensure loadFromStorage assigns the new texts if empty strings were carried into the db_config_v12, we must look for the assignment area.
// It looks like: if (!parsedConfig.kvkkText || parsedConfig.kvkkText === "...") parsedConfig.kvkkText = this._config().kvkkText;
// Wait! _config is already instantiated by then. Let's make sure loadFromStorage forces update if the stored value is empty string.
const updateBlock = \`if (!parsedConfig.kvkkText || parsedConfig.kvkkText.trim() === "" || parsedConfig.kvkkText === "Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında...") {
        parsedConfig.kvkkText = this._config().kvkkText;
      }
      if (!parsedConfig.privacyText || parsedConfig.privacyText.trim() === "" || parsedConfig.privacyText === "Gizlilik politikamız...") {
        parsedConfig.privacyText = this._config().privacyText;
      }
      if (!parsedConfig.cookiesText || parsedConfig.cookiesText.trim() === "" || parsedConfig.cookiesText === "Çerez kullanım politikamız...") {
        parsedConfig.cookiesText = this._config().cookiesText;
      }
      if (!parsedConfig.termsText || parsedConfig.termsText.trim() === "" || parsedConfig.termsText === "Araç kiralama ve kullanım koşulları...") {
        parsedConfig.termsText = this._config().termsText;
      }
      if (!parsedConfig.distanceSellingText || parsedConfig.distanceSellingText.trim() === "") {
        parsedConfig.distanceSellingText = this._config().distanceSellingText;
      }
      if (!parsedConfig.cancellationText || parsedConfig.cancellationText.trim() === "") {
        parsedConfig.cancellationText = this._config().cancellationText;
      }
      if (!parsedConfig.insuranceText || parsedConfig.insuranceText.trim() === "") {
        parsedConfig.insuranceText = this._config().insuranceText;
      }
      if (!parsedConfig.aboutTitle || parsedConfig.aboutTitle.trim() === "") {
        parsedConfig.aboutTitle = this._config().aboutTitle;
      }
      if (!parsedConfig.aboutText || parsedConfig.aboutText.trim() === "") {
        parsedConfig.aboutText = this._config().aboutText;
      }
      if (!parsedConfig.team || parsedConfig.team.length === 0) {
        parsedConfig.team = this._config().team;
      }\`;

content = content.replace(/if \(\s*!parsedConfig\.kvkkText\s*\|\|[\s\S]*?parsedConfig\.termsText = this\._config\(\)\.termsText;\s*\}/g, updateBlock);

fs.writeFileSync(file, content);
console.log("Updated legals in car.service.ts");
