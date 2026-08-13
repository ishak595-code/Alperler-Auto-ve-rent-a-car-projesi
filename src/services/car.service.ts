import { Injectable, signal, computed, effect, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Vehicle, Car, SaleCar, Tour } from "../models/car.model";
import { SiteConfig } from "../models/site-config.model";
import { GoogleGenAI } from "@google/genai";
import {
  fallbackInventory,
  fallbackBlogPosts,
  fallbackFaqs,
} from "./mock-data";
import { db } from "../firebase";
import {
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Firestore operation failed", {
    operationType,
    path,
    message,
  });
  throw new Error(message);
}

export interface BlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  image: string;
  readTime: string;
  date: string;
}

export interface BookingRequest {
  id?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  dateCreated?: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  type: "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";
  item: Car | SaleCar | Tour | null;
  itemName: string;
  image?: string;
  basePrice?: number;
  totalPrice?: number;
  personCount?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  withDriver?: boolean;
  pickupLocation?: string;
  rentalDuration?: string;
  notes?: string;
}

export interface PartnerRequest {
  id: number;
  name: string;
  phone: string;
  email?: string;
  carBrand: string;
  modelYear: number;
  km: number;
  description: string;
  date: Date;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  isOpen?: boolean;
}

export interface Feedback {
  id: number;
  category: "BUG" | "FEATURE" | "GENERAL" | "CONTENT" | "OTHER";
  rating: number; // 1-5
  message: string;
  date: Date;
  status: "NEW" | "REVIEWED" | "ARCHIVED";
}

@Injectable({
  providedIn: "root",
})
export class CarService {
  private http = inject(HttpClient);

  // --- STATE SIGNALS ---
  private _bookingRequest = signal<BookingRequest | null>(null);
  private _favoriteCars = signal<(number | string)[]>([]);
  private _visitCount = signal<number>(0);
  private _partnerRequests = signal<PartnerRequest[]>([]);
  private _feedbacks = signal<Feedback[]>([]);
  private _subscribers = signal<string[]>([]); // Newsletter subscribers
  private _notifications = signal<
    { id: number; to: string; message: string; date: Date }[]
  >([]); // Sent notifications log

  // --- DATA STORE SIGNALS ---

  // 1. Site Configuration
  private _config = signal<SiteConfig>({
    logoUrl: "",
    adminEmails: ['ishak595@gmail.com', 'ramcofero.yt@gmail.com'],
    companyName: "Alperler Auto",
    tagline: "Premium Araç Kiralama",
    phone: "0537 959 48 51",
    email: "alperlerauto@gmail.com",
    address: "Hakkari Yüksekova Merkez",
    whatsapp: "905379594851",
    whatsappMessage:
      "Merhaba, araç kiralama veya satılık araçlar hakkında bilgi almak istiyorum.",
    instagramUrl: "https://instagram.com/",
    twitterUrl: "https://x.com/",
    facebookUrl: "https://facebook.com/",
    tiktokUrl: "https://tiktok.com/",
    youtubeUrl: "https://youtube.com/",

    seoTitle: "",
    seoKeywords: "",
    seoDescription: "",
    seoAuthor: "",
    seoOgTitle: "",
    seoOgDescription: "",
    seoOgImage: "",
    seoTwitterHandle: "",

    aboutTitle: `Bölgenin Yükselen Güneşinde\nYenilikçi Seyahat ve Otomotiv Çözümleri`,
    aboutText: `Alperler Auto olarak, Yüksekova'nın eşsiz coğrafyasında uzun yıllardır hemşehrilerimize ve şehrimizi ziyaret eden bürokratlardan turistlere kadar tüm misafirlerimize kesintisiz, güven dolu bir otomotiv deneyimi sunuyoruz. 

"Daima Bir Adım İleri" vizyonu ile kurduğumuz bu yapı, standart bir rent a car mantığının ötesine geçerek; 2. el şeffaf otomobil ticareti, transfer hizmetleri, uzun dönem filo kiralama ve Hakkari bölgesinin bakir doğasına ulaşım sağlayan özel tur organizasyonlarını tek bir çatı altında toplamıştır.

Müşteri memnuniyetini satıştan veya kiralamadan çok daha ileride; dürüst, güler yüzlü ve anında çözüm sağlayan bir aile bağı gibi görüyoruz. Bölgenin fiziki şartlarına uyumlu, bakımlı arazi ve binek araçlarımızla yollardaki güveniniz olmaya devam ediyoruz. Alperler Auto, Yüksekova'dan Hakkari'ye, oradan tüm bölgeye yayılan sağlam kilit taşlarıyla örülmüş, sizin için var olan öncü bir otomotiv platformudur.`,
    team: [
      {
        id: 1,
        name: "Alper Yılmaz",
        role: "Kurucu / Yönetim Kurulu Başkanı",
        description:
          "Sektörde yılların tecrübesiyle, her detayı titizlikle planlayan güven inşacısı ve asıl lider.",
        image:
          "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600",
      },
      {
        id: 2,
        name: "Emre Aslan",
        role: "Operasyon & Satış Koordinatörü",
        description:
          "İkinci el ticareti ve anlık filo operasyonlarında müşterilerimize çözüm odaklı, hızlı yaklaşımlar sunar.",
        image:
          "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600",
      },
      {
        id: 3,
        name: "Zeynep Kaya",
        role: "Tur ve Seyahat Planlama",
        description:
          "Hakkari'nin eşsiz güzelliklerini misafirlerimize en konforlu ve samimi rotalarla hazırlayan tur uzmanımız.",
        image:
          "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600",
      },
    ],

    kvkkText: `Alperler Auto olarak kişisel verilerinizin güvenliği hususuna azami hassasiyet göstermekteyiz. Şirketimiz ile her türlü ilişkiniz kapsamında paylaştığınız kişisel verileriniz, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")'na uygun olarak muhafaza edilmektedir.

1. Veri Sorumlusunun Kimliği
Veri sorumlusu sıfatıyla, Alperler Auto unvanlı şirketimiz, Hakkari / Yüksekova merkezli faaliyet göstermektedir. Şirketimiz, kişisel verilerinizi KVKK ve ilgili mevzuat uyarınca aşağıda açıklanan kapsamda işleyebilecek, kaydedebilecek, muhafaza edebilecek ve kanunen izin verilen hallerde üçüncü kişilere aktarabilecektir.

2. Kişisel Verilerin İşlenme Amacı
Toplanan kişisel verileriniz (Kimlik bilgileri, iletişim bilgileri, adres, ehliyet, finansal bilgiler vb.), araç kiralama, araç satış ve turlarımız kapsamasındaki sözleşmelerin ifası, müşteri memnuniyeti, kampanya duyuruları, yasal bildirimler, kiralama sırasında kasko ve sigorta süreçlerinin yönetimi, güvenlik önlemlerinin sağlanması (GPS takibi vb.) amaçlarıyla işlenmektedir.

3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği
İşlenen kişisel verileriniz, yasal mevzuat gereği talep halinde emniyet birimlerine, yetkili kamu kurum ve kuruluşlarına, adli makamlara aktarılabilir. Operasyonel süreçler (sigorta, kasko, yol yardım vs.) sebebiyle iş ortaklarımız, tedarikçilerimiz, sigorta ve finans şirketleri ile güvenli bir şekilde paylaşılabilmektedir. Kiralama süreçleri dışında üçüncü kişilerle ticari amaçla verileriniz paylaşılmaz.

4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi
Kişisel verileriniz, merkez ofisimiz, web sitemiz (alperrentacar.online), çağrı merkezimiz veya e-posta aracılığıyla sözlü, yazılı veya elektronik ortamda toplanmaktadır. Sözleşmenin kurulması, yasal yükümlülüklerimizin yerine getirilmesi hukuki sebeplerine dayanarak işlenmektedir.

5. İlgili Kişinin Hakları
KVKK'nın 11. maddesi uyarınca;
- Kişisel veri işlenip işlenmediğini öğrenme,
- Kişisel verileri işlenmişse buna ilişkin bilgi talep etme,
- İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
- Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,
- Eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme haklarına sahipsiniz.`,
    privacyText: `1. Gizlilik Hedefimiz
Alperler Auto ("Şirket") olarak, müşterilerimize ilişkin tüm bilgilerin gizliliği ve güvenliği birinci önceliğimizdir. İşbu Gizlilik Politikası, web sitemizi ziyaret eden ve hizmetlerimizden (Araç kiralama, İkinci el araç alım-satım, Tur organizasyonları) yararlanan kişilerin veri güvenliğini sağlamak için düzenlenmiştir.

2. Hangi Bilgiler Toplanıyor?
Hizmetlerimizden faydalanmak üzere bize sağladığınız Ad-Soyad, T.C. Kimlik No, Pasaport No, Ehliyet detayları, telefon, e-posta, fatura adresiniz, seyahat planlarınız, araç kullanım verileriniz (telemetri/GPS - araç güvenliği ve kiralama şartlarına uyum sağlamak için) tarafımızca güvenli sistemlerde tutulmaktadır. Kredi kartı verileriniz asla sunucularımızda saklanmaz, doğrudan BDDK onaylı ödeme sağlayıcısına iletilir.

3. Bilgilerin Kullanımı
Toplanan bilgiler, rezervasyon işlemlerinizin tamamlanması, faturalandırma, acil durumlarda iletişim sağlama, müşteri destek hizmetleri sunma ve rızanız dâhilinde özel kampanya bildirimleri yapmak için kullanılır. Araç satış veya alış süreçlerinde gerekli hukuki evrakların hazırlanması için kamu daireleri ve noterlerle bilgi paylaşımı gerekebilmektedir.

4. Dış Bağlantılar
Web sitemiz içerisinde zaman zaman ortaklık kurduğumuz firmalara ait bağlantılar bulunabilir. Ancak bu sitelerin gizlilik uygulamaları ve içeriklerinden Alperler Auto sorumlu değildir.

5. Güncellemeler
Şirketimiz, gizlilik ve veri koruma prensiplerini güncel tutarak bu politikayı önceden haber vermeksizin değiştirme hakkına sahiptir. Tüm değişiklikler sitede yayımlandığı an yürürlüğe girer.`,
    cookiesText: `Olarak Alperler Auto, web sitemizin daha verimli ve güvenli çalışmasını sağlamak, kullanıcı deneyimini artırmak amacıyla Çerezler (Cookies) kullanmaktayız. 

1. Çerez Nedir?
Çerezler, bir web sitesini ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza indirilen küçük veri dosyalarıdır. Siteyi tekrar ziyaret ettiğinizde sizi hatırlamamızı sağlar.

2. Hangi Çerezleri Kullanıyoruz?
- Zorunlu Çerezler: Sitenin çalışması için mecburidir. Oturum yönetimi, güvenlik önlemleri bu çerezlerle sağlanır.
- İşlevsel Çerezler: Dil tercihi, rezervasyon geçmişi gibi seçimlerinizin hatırlanmasını sağlar.
- Performans/Analitik Çerezleri: Sitemizi nasıl kullandığınızı analiz eder (Örn: Hangi araç kategorilerine daha çok bakıldığı) ve hizmet kalitemizi artırmamıza yardımcı olur. Veriler anonim tutulur.

3. Çerez Yönetimi
Çerez kullanımını istemiyorsanız, tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Ancak bu durumda rezervasyon ve iletişim modüllerimiz tam performanslı çalışmayabilir. Alperler Auto, zorunlu olmayan çerezler için web sitesine ilk girişinizde onay alabilir.`,
    termsText: `Alperler Auto Araç Kiralama, Alım Satım ve Tur Kullanım Şartları

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
Firmamız üzerinden alınan 2. el araçlar ekspertiz garantili olup, satış süreci taraflar arasında düzenlenecek satış vaadi sözleşmesi ile resmi kanallardan tamamlanacaktır. Alperler Auto, ekspertiz dışı ortaya çıkan kronik fabrikasyon hatalarından ötürü sorumluluk reddi beyan edebilir, bu husus satış sözleşmesinde netleştirilecektir.`,
    distanceSellingText: `Mesafeli Satış/Hizmet Sözleşmesi

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
Uyuşmazlıkların çözümünde Hakkari / Yüksekova Tüketici Hakem Heyetleri ve Mahkemeleri yetkilidir.`,
    cancellationText: `İade ve İptal Politikası

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
Banka veya kredi kartı ile yapılan ödemelerin iade süreleri banka altyapısına bağlı olarak ortalama 3 ile 14 iş günü arasında müşteri hesabına yansımaktadır.`,
    insuranceText: `Araç Sigorta ve Sorumluluk Şartları

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

Araçlarımızda 7/24 GPS bazlı telemetri kontrolü mevcuttur. Raporlardaki hız ve konum beyanları şirket kayıtlarımız ile doğrulanamazsa sigorta hakkı tamamen reddedilebilir.`,

    theme: "light",
  });

  // 7. FAQs
  private _faqs = signal<FaqItem[]>([...fallbackFaqs]);

  // 2. Cars
  private _inventory = signal<Vehicle[]>([...fallbackInventory]);

  // 3. Sale Cars

  // 4. Blog Posts
  private _blogPosts = signal<BlogPost[]>([...fallbackBlogPosts]);

  // 5. Reservations
  private _reservations = signal<BookingRequest[]>([]);

  // 6. Tours
  private _tours = signal<Tour[]>([
    ...fallbackInventory.filter((v) => v.category === "TOUR"),
  ]);

  private genAI: GoogleGenAI | null = null;
  private apiKey =
    (typeof process !== "undefined" && process.env && process.env["API_KEY"]) ||
    "";

  constructor() {
    if (this.apiKey) {
      this.genAI = new GoogleGenAI({ apiKey: this.apiKey });
    }
    this.loadFromStorage();

    // Increment Visit Counter
    this.incrementVisitCount();

    effect(() =>
      localStorage.setItem("db_config_v12", JSON.stringify(this._config())),
    );
    effect(() =>
      localStorage.setItem("db_tours_v14", JSON.stringify(this._tours())),
    );
    effect(() =>
      localStorage.setItem(
        "db_cars_v12",
        JSON.stringify(
          this._inventory().filter((v) => v.category === "RENTAL"),
        ),
      ),
    );
    effect(() =>
      localStorage.setItem(
        "db_saleCars_v12",
        JSON.stringify(this._inventory().filter((v) => v.category === "SALE")),
      ),
    );
    effect(() =>
      localStorage.setItem("db_blog_v12", JSON.stringify(this._blogPosts())),
    );
    effect(() =>
      localStorage.setItem(
        "db_reservations_v2",
        JSON.stringify(this._reservations()),
      ),
    );
    effect(() =>
      localStorage.setItem(
        "db_partnerRequests_v2",
        JSON.stringify(this._partnerRequests()),
      ),
    );
    effect(() =>
      localStorage.setItem("db_visits", this._visitCount().toString()),
    );
    effect(() =>
      localStorage.setItem("db_faqs_v12", JSON.stringify(this._faqs())),
    );
    effect(() =>
      localStorage.setItem(
        "db_feedbacks_v2",
        JSON.stringify(this._feedbacks()),
      ),
    );
    effect(() =>
      localStorage.setItem(
        "db_subscribers",
        JSON.stringify(this._subscribers()),
      ),
    );
    effect(() =>
      localStorage.setItem(
        "db_notifications",
        JSON.stringify(this._notifications()),
      ),
    );
    effect(() =>
      localStorage.setItem(
        "db_favoriteCars",
        JSON.stringify(this._favoriteCars()),
      ),
    );

    // Listen for storage changes in other tabs
    window.addEventListener("storage", (event) => {
      if (event.key && event.key.startsWith("db_")) {
        this.loadFromStorage();
      }
    });
  }

  private loadFromStorage() {
    // Clean up old keys
    localStorage.removeItem("db_config");
    localStorage.removeItem("db_config_v12");
    localStorage.removeItem("db_faqs");

    const config = localStorage.getItem("db_config_v12");
    if (config) {
      const parsedConfig = JSON.parse(config);

      // Force Migration for old names -> Alperler Auto
      if (
        parsedConfig.companyName === "Alperler Rent A Car" ||
        parsedConfig.companyName === "Alperler Oto"
      ) {
        parsedConfig.companyName = "Alperler Auto";
      }

      // Force override specific texts to ensure new premium UI text appears:
      if (parsedConfig.homeContent && parsedConfig.homeContent.heroTitle) {
        const title = parsedConfig.homeContent.heroTitle;
        if (
          title.includes("Alın veya Kazanın") ||
          title.includes("Kusursuz Bir Sürüş") ||
          title.includes("Sınırları Aşan")
        ) {
          parsedConfig.homeContent.heroTitle =
            "Beklemek Yok: 5 Dakikada Onayla, Anında Yola Çık";
          parsedConfig.homeContent.heroSubtitle =
            "Uzun prosedürlere ve gizli ücretlere son. Aracını Seç, 5 Dakikada Yola Çık.";
          parsedConfig.homeContent.heroTrustLine =
            "1001+ MUTLU MÜŞTERİ • SIFIR GİZLİ ÜCRET • GÜVENİLİR FİLO";
          parsedConfig.homeContent.heroCtaSubtext =
            "Kefilsiz, evraksız, hızlı çözüm";
          parsedConfig.homeContent.heroCta = "Şimdi Kirala";
        }
      }

      if (parsedConfig.homeContent && parsedConfig.homeContent.featuredTitle) {
        const fTitle = parsedConfig.homeContent.featuredTitle;
        if (
          fTitle.includes("Kiralık Arabalarımız") ||
          fTitle.includes("Zirve Modeller")
        ) {
          parsedConfig.homeContent.featuredBadge = "KİRALIK ARAÇLAR";
          parsedConfig.homeContent.featuredTitle =
            "Her İhtiyaca ve Bütçeye Uygun Kiralık Araçlar";
          parsedConfig.homeContent.featuredSubtitle =
            "İster günlük işleriniz, ister uzun yolculuklarınız için; periyodik bakımları tamamlanmış, güvenilir ve konforlu araç filomuzla hizmetinizdeyiz.";
        }
      }

      if (parsedConfig.homeContent && parsedConfig.homeContent.salesTitle) {
        const sTitle = parsedConfig.homeContent.salesTitle;
        if (
          sTitle.includes("Satılık Arabalarımız") ||
          sTitle.includes("Satılık")
        ) {
          parsedConfig.homeContent.salesBadge = "İKİNCİ EL ARAÇLAR";
          parsedConfig.homeContent.salesTitle =
            "Ekspertiz Garantili 2. El Araç Piyasası";
          parsedConfig.homeContent.salesDescription =
            "Geçmişi şeffaf, 101 nokta ekspertizi yapılmış ve tüm donanımları kontrol edilmiş araçlarımızla güvenle alım satım yapın.";
        }
      }

      if (parsedConfig.homeContent && parsedConfig.homeContent.toursTitle) {
        const tTitle = parsedConfig.homeContent.toursTitle;
        if (
          tTitle.includes("Yüksekova ve Çevresi") ||
          tTitle.includes("Özel Turlar")
        ) {
          parsedConfig.homeContent.toursTitle =
            "Bölgenin Eşsiz Güzelliklerini Konforla Keşfedin";
          parsedConfig.homeContent.toursSubtitle =
            "Tecrübeli rehberlerimiz ve bakımlı araçlarımızla hazırladığımız özel turlara katılın. Yüksekova ve Hakkari coğrafyasının tadını çıkarın.";
        }
      }

      // Deep force overwrite any strings containing old names
      for (const key of Object.keys(parsedConfig)) {
        if (typeof parsedConfig[key] === "string") {
          let str = parsedConfig[key];
          str = str.replace(/Alperler Rent A Car/g, "Alperler Auto");
          str = str.replace(/Alperler Oto/g, "Alperler Auto");
          str = str.replace(/ALPERLER RENT A CAR/g, "ALPERLER AUTO");
          str = str.replace(/ALPERLER OTO/g, "ALPERLER AUTO");
          parsedConfig[key] = str;
        }
      }

      // Ensure new fields exist if loading from old storage
      if (!parsedConfig.aboutText) parsedConfig.aboutText = "";

      // Force update legal texts if they are empty or old placeholders
      if (!parsedConfig.aboutTitle || parsedConfig.aboutTitle.trim() === "")
        parsedConfig.aboutTitle = this._config().aboutTitle;
      if (!parsedConfig.aboutText || parsedConfig.aboutText.trim() === "")
        parsedConfig.aboutText = this._config().aboutText;
      if (!parsedConfig.team || parsedConfig.team.length === 0)
        parsedConfig.team = this._config().team;

      if (
        !parsedConfig.kvkkText ||
        parsedConfig.kvkkText.trim() === "" ||
        parsedConfig.kvkkText ===
          "Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında..."
      ) {
        parsedConfig.kvkkText = this._config().kvkkText;
      }
      if (
        !parsedConfig.privacyText ||
        parsedConfig.privacyText.trim() === "" ||
        parsedConfig.privacyText === "Gizlilik politikamız..."
      ) {
        parsedConfig.privacyText = this._config().privacyText;
      }
      if (
        !parsedConfig.cookiesText ||
        parsedConfig.cookiesText.trim() === "" ||
        parsedConfig.cookiesText === "Çerez kullanım politikamız..."
      ) {
        parsedConfig.cookiesText = this._config().cookiesText;
      }
      if (
        !parsedConfig.termsText ||
        parsedConfig.termsText.trim() === "" ||
        parsedConfig.termsText === "Araç kiralama ve kullanım koşulları..."
      ) {
        parsedConfig.termsText = this._config().termsText;
      }
      if (
        !parsedConfig.distanceSellingText ||
        parsedConfig.distanceSellingText.trim() === ""
      ) {
        parsedConfig.distanceSellingText = this._config().distanceSellingText;
      }
      if (
        !parsedConfig.cancellationText ||
        parsedConfig.cancellationText.trim() === ""
      ) {
        parsedConfig.cancellationText = this._config().cancellationText;
      }
      if (
        !parsedConfig.insuranceText ||
        parsedConfig.insuranceText.trim() === ""
      ) {
        parsedConfig.insuranceText = this._config().insuranceText;
      }

      // New Fields Default
      if (!parsedConfig.heroTitle)
        parsedConfig.heroTitle =
          "Yüksekova'da Güvenli Kiralama, Satış ve Filo Hizmetleri";
      if (!parsedConfig.heroSubtitle)
        parsedConfig.heroSubtitle = "Rent a Car - Tur - Araç Alım Satım";

      if (!parsedConfig.campaignEarlyBooking)
        parsedConfig.campaignEarlyBooking = "Erken Rezervasyon İndirimi";
      if (!parsedConfig.campaignRoadside)
        parsedConfig.campaignRoadside = "Kesintisiz Yol Yardım";
      if (!parsedConfig.campaignFreeDelivery)
        parsedConfig.campaignFreeDelivery = "Havalimanı & Otogar Teslimat";

      if (!parsedConfig.whyUsTitle)
        parsedConfig.whyUsTitle = "Neden Alperler Auto?";
      if (!parsedConfig.whyUsSubtitle)
        parsedConfig.whyUsSubtitle =
          "İlk seferde değil, her seferde tercihiniz olmak için buradayız. Çünkü biz, sadece anahtar teslim etmiyoruz, size yepyeni bir deneyimin kapılarını aralıyoruz.";
      if (!parsedConfig.whyUsTrustTitle)
        parsedConfig.whyUsTrustTitle = "Güven ve Kasko";
      if (!parsedConfig.whyUsTrustDesc)
        parsedConfig.whyUsTrustDesc =
          "Tam kaskolu, yetkili servis bakımlı araçlar. Sürpriz masraf yok, tam güvence var.";
      if (!parsedConfig.whyUsSupportTitle)
        parsedConfig.whyUsSupportTitle = "7/24 Canlı Destek";
      if (!parsedConfig.whyUsSupportDesc)
        parsedConfig.whyUsSupportDesc =
          "Yolculuğunuzun her anında yanınızdayız. Bize 0537 959 48 51 numaralı hattan her an ulaşabilirsiniz.";
      if (!parsedConfig.whyUsComfortTitle)
        parsedConfig.whyUsComfortTitle = "Konforlu Yolculuk";
      if (!parsedConfig.whyUsComfortDesc)
        parsedConfig.whyUsComfortDesc =
          "Her teslimat öncesi detaylı temizlik. Yeni model araçlarla maksimum konfor.";

      if (!parsedConfig.salesTitle)
        parsedConfig.salesTitle = "Güvenilir Araç Sahibi Olun";
      if (!parsedConfig.salesDesc)
        parsedConfig.salesDesc =
          "Ekspertiz garantili, bakımlı ve temiz ikinci el araçlarımızla hayalinizdeki arabaya kavuşun. Takas imkanı ve uygun ödeme seçenekleri sizi bekliyor.";
      if (!parsedConfig.salesCta)
        parsedConfig.salesCta = "Satılık Araçları İncele";

      if (!parsedConfig.partnerTitle)
        parsedConfig.partnerTitle = "Aracınızı Bize Kiralayın";
      if (!parsedConfig.partnerSubtitle)
        parsedConfig.partnerSubtitle =
          "Aracınız yatarak değil, çalışarak kazandırsın. Alperler güvencesiyle aracınızı filomuza katın, düzenli gelir elde edin.";
      if (!parsedConfig.partnerRequirementYear)
        parsedConfig.partnerRequirementYear = "En az 2017 Model olmalıdır.";


      // Pre-hydrate SEO configurations if empty
      if (!parsedConfig.seoTitle || parsedConfig.seoTitle.trim() === "") {
        parsedConfig.seoTitle = "Alperler Auto | Araç Kiralama, Satış ve Turlar";
      }
      if (!parsedConfig.seoDescription || parsedConfig.seoDescription.trim() === "") {
        parsedConfig.seoDescription = "Alperler Auto ile Yüksekova ve çevresinde güvenli, konforlu ve hızlı araç kiralama, ikinci el araç alım-satım ve özel turlar. %100 uyumlu online rezervasyon.";
      }
      if (!parsedConfig.seoKeywords || parsedConfig.seoKeywords.trim() === "") {
        parsedConfig.seoKeywords = "yüksekova araç kiralama, hakkari rent a car, satılık ikinci el araba, yüksekova turları, vip transfer, alperler auto";
      }

      this._config.set(parsedConfig);
    }

    const cars = localStorage.getItem("db_cars_v12");
    if (cars) {
      const parsedCars = JSON.parse(cars).map((c: any) => {
        const initialCar = this._inventory().find(
          (initial) => initial.id === c.id && initial.category === "RENTAL",
        );
        return {
          ...c,
          category: "RENTAL",
          isFeatured: c.isFeatured ?? initialCar?.isFeatured,
          isPopular: c.isPopular ?? initialCar?.isPopular,
          isCampaign: c.isCampaign ?? initialCar?.isCampaign,
          badge: c.badge ?? initialCar?.badge,
        };
      });
      if (parsedCars.length > 0) {
        this._inventory.update((inv) => [
          ...inv.filter((v) => v.category !== "RENTAL"),
          ...parsedCars,
        ]);
      } else {
        const fallbackRentals = fallbackInventory.filter(
          (v) => v.category === "RENTAL",
        );
        this._inventory.update((inv) => [
          ...inv.filter((v) => v.category !== "RENTAL"),
          ...fallbackRentals,
        ]);
      }
    } else {
      const fallbackRentals = fallbackInventory.filter(
        (v) => v.category === "RENTAL",
      );
      this._inventory.update((inv) => [
        ...inv.filter((v) => v.category !== "RENTAL"),
        ...fallbackRentals,
      ]);
    }

    const saleCars = localStorage.getItem("db_saleCars_v12");
    if (saleCars) {
      const parsedSaleCars = JSON.parse(saleCars).map((c: any) => {
        const initialCar = this._inventory().find(
          (initial) => initial.id === c.id && initial.category === "SALE",
        );
        return {
          ...c,
          category: "SALE",
          isFeatured: c.isFeatured ?? initialCar?.isFeatured,
          isPopular: c.isPopular ?? initialCar?.isPopular,
          isCampaign: c.isCampaign ?? initialCar?.isCampaign,
          badge: c.badge ?? initialCar?.badge,
        };
      });
      if (parsedSaleCars.length > 0) {
        this._inventory.update((inv) => [
          ...inv.filter((v) => v.category !== "SALE"),
          ...parsedSaleCars,
        ]);
      } else {
        const fallbackSales = fallbackInventory.filter(
          (v) => v.category === "SALE",
        );
        this._inventory.update((inv) => [
          ...inv.filter((v) => v.category !== "SALE"),
          ...fallbackSales,
        ]);
      }
    } else {
      const fallbackSales = fallbackInventory.filter(
        (v) => v.category === "SALE",
      );
      this._inventory.update((inv) => [
        ...inv.filter((v) => v.category !== "SALE"),
        ...fallbackSales,
      ]);
    }

    const tours = localStorage.getItem("db_tours_v14");
    if (tours) {
      const parsedTours = JSON.parse(tours);
      if (parsedTours.length > 0) {
        this._tours.set(parsedTours);
      } else {
        this._tours.set([
          ...fallbackInventory.filter((v) => v.category === "TOUR"),
        ]);
      }
    } else {
      this._tours.set([
        ...fallbackInventory.filter((v) => v.category === "TOUR"),
      ]);
    }

    const blog = localStorage.getItem("db_blog_v12");
    if (blog) {
      let blogStr = blog;
      blogStr = blogStr.replace(/Alperler Rent A Car/g, "Alperler Auto");
      blogStr = blogStr.replace(/Alperler Oto/g, "Alperler Auto");
      blogStr = blogStr.replace(/ALPERLER RENT A CAR/g, "ALPERLER AUTO");
      blogStr = blogStr.replace(/ALPERLER OTO/g, "ALPERLER AUTO");
      this._blogPosts.set(JSON.parse(blogStr));
      if (this._blogPosts().length === 0)
        this._blogPosts.set([...fallbackBlogPosts]);
    } else {
      this._blogPosts.set([...fallbackBlogPosts]);
    }

    const reservations = localStorage.getItem("db_reservations_v2");
    if (reservations) this._reservations.set(JSON.parse(reservations));

    const partnerRequests = localStorage.getItem("db_partnerRequests_v2");
    if (partnerRequests) this._partnerRequests.set(JSON.parse(partnerRequests));

    const visits = localStorage.getItem("db_visits");
    if (visits) this._visitCount.set(parseInt(visits));

    const faqs = localStorage.getItem("db_faqs_v12");
    if (faqs) {
      let faqStr = faqs;
      faqStr = faqStr.replace(/Alperler Rent A Car/g, "Alperler Auto");
      faqStr = faqStr.replace(/Alperler Oto/g, "Alperler Auto");
      faqStr = faqStr.replace(/ALPERLER RENT A CAR/g, "ALPERLER AUTO");
      faqStr = faqStr.replace(/ALPERLER OTO/g, "ALPERLER AUTO");
      this._faqs.set(JSON.parse(faqStr));
      if (this._faqs().length === 0) this._faqs.set([...fallbackFaqs]);
    } else {
      this._faqs.set([...fallbackFaqs]);
    }

    const feedbacks = localStorage.getItem("db_feedbacks_v2");
    if (feedbacks) this._feedbacks.set(JSON.parse(feedbacks));

    const subscribers = localStorage.getItem("db_subscribers");
    if (subscribers) this._subscribers.set(JSON.parse(subscribers));

    const notifications = localStorage.getItem("db_notifications");
    if (notifications) this._notifications.set(JSON.parse(notifications));

    const favoriteCars = localStorage.getItem("db_favoriteCars");
    if (favoriteCars) this._favoriteCars.set(JSON.parse(favoriteCars));
  }

  private incrementVisitCount() {
    if (!sessionStorage.getItem("session_active")) {
      sessionStorage.setItem("session_active", "true");
      this._visitCount.update((c) => c + 1);
    }
  }

  // --- PUBLIC METHODS ---

  resetStats() {
    this._visitCount.set(0);
    localStorage.removeItem("db_visits");
    sessionStorage.removeItem("session_active");
  }

  getVehicleByAdId(id: number | string): Vehicle | undefined {
    const searchId = id.toString();
    return this._inventory().find((v) => v.id.toString() === searchId);
  }

  // --- PUBLIC GETTERS ---
  getConfig() {
    return this._config.asReadonly();
  }
  getAllVehicles() {
    return this._inventory.asReadonly();
  }
  getCars() {
    return computed(() =>
      this._inventory().filter((v) => v.category === "RENTAL"),
    );
  }
  getCar(id: number | string) {
    return this._inventory().find((c) => c.id == id && c.category === "RENTAL");
  }
  getVehicle(id: number | string) {
    return this._inventory().find((v) => v.id == id);
  }
  getSaleCars() {
    return computed(() =>
      this._inventory().filter((v) => v.category === "SALE"),
    );
  }
  getSaleCar(id: number | string) {
    return this._inventory().find((c) => c.id == id && c.category === "SALE");
  }
  getTours() {
    return this._tours.asReadonly();
  }
  getTour(id: number | string) {
    return this._tours().find((t) => t.id === id);
  }
  getBlogPosts() {
    return this._blogPosts.asReadonly();
  }
  getBlogPost(id: number) {
    return this._blogPosts().find((p) => p.id === id);
  }
  getReservations() {
    return this._reservations.asReadonly();
  }
  getPartnerRequests() {
    return this._partnerRequests.asReadonly();
  }
  getVisitCount() {
    return this._visitCount.asReadonly();
  }
  getFaqs() {
    return this._faqs.asReadonly();
  }
  getFeedbacks() {
    return this._feedbacks.asReadonly();
  }
  getSubscribers() {
    return this._subscribers.asReadonly();
  }
  getNotifications() {
    return this._notifications.asReadonly();
  }

  async submitPartnerRequest(request: Omit<PartnerRequest, "id" | "date">) {
    const newRequest: PartnerRequest = {
      ...request,
      id: Date.now(),
      date: new Date(),
    };

    const cloudId = `PARTNER-${newRequest.id}`;
    try {
      await setDoc(doc(db, "messages", cloudId), {
        type: "PARTNER_REQUEST",
        name: newRequest.name.trim().slice(0, 120),
        phone: newRequest.phone.trim().slice(0, 40),
        email: newRequest.email?.trim().toLowerCase().slice(0, 160) || "",
        carBrand: newRequest.carBrand.trim().slice(0, 160),
        modelYear: newRequest.modelYear,
        km: newRequest.km,
        description: newRequest.description.slice(0, 4000),
        status: "NEW",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    }

    this._partnerRequests.update((reqs) => [newRequest, ...reqs]);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        "db_partnerRequests_v2",
        JSON.stringify(this._partnerRequests()),
      );
    }

    const adminMsg = `Yeni bir filo / araç değerlendirme başvurusu geldi.\n\nİsim: ${newRequest.name}\nTelefon: ${newRequest.phone}\nE-posta: ${newRequest.email}\nAraç: ${newRequest.carBrand} (${newRequest.modelYear}) - ${newRequest.km} km\nAçıklama: ${newRequest.description}`;
    this.sendNotification(
      "alperlerauto@gmail.com",
      adminMsg,
      undefined,
      "Yeni Araç Değerlendirme Başvurusu",
    );

    if (newRequest.email && newRequest.email.includes("@")) {
      const customerMsg = `Sayın ${newRequest.name},\n\nAraç değerlendirme / filo ortaklığı başvurunuz tarafımıza başarıyla ulaşmıştır. Uzman ekibimiz aracınız (${newRequest.carBrand}) ile ilgili değerlendirmeleri tamamladıktan sonra belirtmiş olduğunuz iletişim numarası (${newRequest.phone}) üzerinden en kısa sürede dönüş sağlayacaktır.\n\nBizi tercih ettiğiniz için teşekkür ederiz.\n\nAlperler Auto`;
      this.sendNotification(
        newRequest.email,
        customerMsg,
        undefined,
        "Başvurunuz Alındı - Alperler Auto",
      );
    }

    return newRequest;
  }

  deletePartnerRequest(id: number) {
    this._partnerRequests.update((reqs) => reqs.filter((r) => r.id !== id));
    localStorage.setItem(
      "db_partnerRequests_v2",
      JSON.stringify(this._partnerRequests()),
    );
  }

  // --- ADMIN ACTIONS ---

  addFeedback(feedback: Omit<Feedback, "id" | "date" | "status">) {
    const newFeedback: Feedback = {
      ...feedback,
      id: Date.now(),
      date: new Date(),
      status: "NEW",
    };
    this._feedbacks.update((f) => [newFeedback, ...f]);
  }

  updateFeedbackStatus(id: number, status: "NEW" | "REVIEWED" | "ARCHIVED") {
    this._feedbacks.update((f) =>
      f.map((x) => (x.id === id ? { ...x, status } : x)),
    );
  }

  deleteFeedback(id: number) {
    this._feedbacks.update((f) => f.filter((x) => x.id !== id));
  }

  addFaq(faq: FaqItem) {
    this._faqs.update((f) => {
      if (faq.id && f.find((x) => x.id === faq.id)) {
        return f.map((x) => (x.id === faq.id ? faq : x));
      } else {
        return [{ ...faq, id: Date.now() }, ...f];
      }
    });
  }
  deleteFaq(id: number) {
    this._faqs.update((f) => f.filter((x) => x.id !== id));
  }

  addTour(tour: Tour) {
    this._tours.update((t) => {
      if (tour.id && t.find((x) => x.id === tour.id)) {
        return t.map((x) => (x.id === tour.id ? tour : x));
      } else {
        return [{ ...tour, id: Date.now() }, ...t];
      }
    });
  }
  deleteTour(id: number) {
    this._tours.update((t) => t.filter((x) => x.id !== id));
  }

  addPartnerRequest(req: Omit<PartnerRequest, "id" | "date">) {
    const newReq: PartnerRequest = {
      ...req,
      id: Date.now(),
      date: new Date(),
    };
    this._partnerRequests.update((reqs) => [newReq, ...reqs]);
  }

  updateConfig(newConfig: SiteConfig) {
    this._config.set(newConfig);
  }

  addCar(car: Car) {
    this._inventory.update((inv) => {
      if (car.id && inv.find((x) => x.id === car.id)) {
        return inv.map((x) =>
          x.id === car.id ? { ...car, category: "RENTAL" } : x,
        );
      } else {
        return [{ ...car, id: Date.now(), category: "RENTAL" }, ...inv];
      }
    });
  }
  deleteCar(id: number | string) {
    this._inventory.update((inv) => inv.filter((c) => c.id != id));
  }

  addSaleCar(car: SaleCar) {
    this._inventory.update((inv) => {
      if (car.id && inv.find((x) => x.id === car.id)) {
        return inv.map((x) =>
          x.id === car.id ? { ...car, category: "SALE" } : x,
        );
      } else {
        return [{ ...car, id: Date.now(), category: "SALE" }, ...inv];
      }
    });
  }
  deleteSaleCar(id: number | string) {
    this._inventory.update((inv) => inv.filter((c) => c.id != id));
  }

  addBlogPost(post: BlogPost) {
    this._blogPosts.update((posts) => {
      if (post.id && posts.find((p) => p.id === post.id)) {
        return posts.map((p) => (p.id === post.id ? post : p));
      } else {
        return [{ ...post, id: Date.now() }, ...posts];
      }
    });
  }
  deleteBlogPost(id: number) {
    this._blogPosts.update((posts) => posts.filter((p) => p.id !== id));
  }

  async addReservation(req: BookingRequest) {
    const newRes: BookingRequest = {
      ...req,
      id: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: "PENDING",
      dateCreated: new Date(),
    };

    this._reservations.update((res) => [newRes, ...res]);

    try {
      const path = "bookings";
      await setDoc(doc(db, path, newRes.id!), {
        type: newRes.type,
        carId: req.item?.id ? String(req.item.id) : "unknown",
        customerName: newRes.customerName || "Unknown",
        customerPhone: newRes.customerPhone || "Unknown",
        startDate: newRes.startDate || new Date().toISOString(),
        endDate: newRes.endDate || new Date().toISOString(),
        status: "PENDING",
        createdAt: serverTimestamp(),
      });

      const bookingInfoText = `Yeni rezervasyon talebi: ${newRes.id}\nMüşteri: ${newRes.customerName}\nTel: ${newRes.customerPhone}\nAraç: ${newRes.itemName || req.item?.brand}\nTarih: ${newRes.startDate} - ${newRes.endDate}\nNot: ${newRes.notes || '-'}`;
      this.sendNotification(
        "alperlerauto@gmail.com",
        bookingInfoText,
        undefined,
        "Yeni Rezervasyon Talebi",
      );

      // Webhook tetiklemesi
      this.triggerWebhook('new_booking', newRes);

      if (newRes.customerEmail && newRes.customerEmail.includes("@")) {
        const customerText = `Sayın ${newRes.customerName},\n\n${newRes.itemName || req.item?.brand} aracımız için rezervasyon talebiniz başarıyla sistemimize ulaşmıştır.\n\nRezervasyon No: ${newRes.id}\nAlış: ${newRes.startDate}\nTeslim: ${newRes.endDate}\nToplam Tutar: ${newRes.totalPrice ? newRes.totalPrice + " TL" : "Belli Değil"}\nİletilen Not: ${newRes.notes || 'Yok'}\n\nEn kısa sürede müşteri temsilcimiz sizinle iletişime geçip detayları aktaracaktır.\n\nBizi tercih ettiğiniz için teşekkür ederiz.`;
        const customerHtml = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h3 style="color: #0284c7;">Sayın ${newRes.customerName},</h3>
    <p><strong>${newRes.itemName || req.item?.brand}</strong> aracımız için rezervasyon talebiniz başarıyla sistemimize ulaşmıştır.</p>
    
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
        <h4 style="margin-top: 0; color: #0f172a;">Kiralama Detayları</h4>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Rezervasyon No:</strong> ${newRes.id}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Araç:</strong> ${newRes.itemName || req.item?.brand}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Alış Tarihi:</strong> ${newRes.startDate}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Dönüş Tarihi:</strong> ${newRes.endDate}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>İletilen Not:</strong> ${newRes.notes || 'Yok'}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Toplam Tutar:</strong> <span style="color: #0284c7; font-weight: bold;">${newRes.totalPrice ? newRes.totalPrice + " TL" : "Müşteri Temsilcisi Bildirecek"}</span></p>
    </div>

    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #0f172a;">İletişim Bilgileriniz</h4>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Ad Soyad:</strong> ${newRes.customerName}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Telefon:</strong> ${newRes.customerPhone}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>E-posta:</strong> ${newRes.customerEmail}</p>
    </div>

    <p style="font-size: 14px;">Müşteri temsilcimiz en kısa sürede sizinle iletişime geçip süreci tamamlayacaktır.</p>
    <p style="font-size: 14px;"><strong>Bizi tercih ettiğiniz için teşekkür ederiz.</strong></p>
  </div>`;
        this.sendNotification(
          newRes.customerEmail,
          customerText,
          {
            generate: true,
            type: "BOOKING",
            recordId: newRes.id,
            customerName: newRes.customerName,
            customerPhone: newRes.customerPhone,
            text: customerText,
          },
          "Rezervasyon Talebiniz Alındı",
          customerHtml,
        );
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "bookings");
    }
  }
  updateReservationStatus(
    id: string,
    status: "APPROVED" | "REJECTED" | "PENDING",
  ) {
    this._reservations.update((res) =>
      res.map((r) => {
        if (r.id === id) {
          // Simulate notification
          if (status !== "PENDING") {
            const msg =
              status === "APPROVED"
                ? `Sayın ${r.customerName}, rezervasyonunuz ONAYLANDI. Sözleşme ve detaylar e-posta adresinize gönderildi.`
                : `Sayın ${r.customerName}, rezervasyon talebiniz maalesef ONAYLANAMADI.`;

            if (r.customerEmail) {
              this.sendNotification(r.customerEmail, msg);
            }
            if (r.customerPhone) {
              this.sendNotification(r.customerPhone, msg);
            }
          }

          if (status === "APPROVED" && r.item && r.startDate && r.endDate) {
            this._inventory.update((inv) =>
              inv.map((car) => {
                if (car.id === r.item!.id) {
                  const bookedDates = [...(car.bookedDates || [])];
                  // Format to basic string to avoid nested reactivity issues
                  bookedDates.push({ start: r.startDate!, end: r.endDate! });
                  return { ...car, bookedDates };
                }
                return car;
              }),
            );
          }

          return { ...r, status };
        }
        return r;
      }),
    );
  }

  deleteReservation(id: string) {
    this._reservations.update((res) => res.filter((r) => r.id !== id));
  }

  setBookingRequest(request: BookingRequest) {
    this._bookingRequest.set(request);
  }
  getBookingRequest() {
    return this._bookingRequest();
  }
  clearBookingRequest() {
    this._bookingRequest.set(null);
  }

  toggleFavorite(id: number | string) {
    this._favoriteCars.update((favs) =>
      favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id],
    );
  }
  isFavorite(id: number | string) {
    return this._favoriteCars().includes(id);
  }
  getFavoriteCount = computed(() => this._favoriteCars().length);

  // --- NEWSLETTER & NOTIFICATIONS ---

  removeSubscriber(email: string) {
    this._subscribers.update((s) => s.filter((e) => e !== email));
  }

  addSubscriber(email: string) {
    if (!this._subscribers().includes(email)) {
      this._subscribers.update((s) => [email, ...s]);
    }
  }

  // Production-ready notification handler
  sendNotification(
    to: string,
    message: string,
    pdfData?: any,
    subject?: string,
    htmlMessage?: string,
  ) {
    const notification = { id: Date.now(), to, message, date: new Date() };

    // 1. Log to internal system (Admin Panel)
    this._notifications.update((n) => [notification, ...n]);

    // 2. Try to send real Email/SMS if configured
    this.dispatchExternalNotification(
      to,
      message,
      pdfData,
      subject,
      htmlMessage,
    );
  }

  deleteNotification(id: number) {
    this._notifications.update((n) => n.filter((x) => x.id !== id));
  }

  clearAllNotifications() {
    this._notifications.set([]);
  }

  // --- Webhook Tetikleyici ---
  triggerWebhook(eventName: string, payload: any) {
    // Only execute on browser
    if (typeof window === 'undefined') return;
    const webhookUrl = "https://httpbin.org/post"; // Using httpbin as default test webhook
    
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Event-Type": eventName },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: payload
      }),
    }).then(res => {
        if (!res.ok) console.warn("Webhook returned an error:", res.status);
        else console.log("[WEBHOOK] Successfully emitted event:", eventName);
    }).catch((err) => console.error("Webhook trigger failed", err));
  }

  private dispatchExternalNotification(
    to: string,
    message: string,
    pdfData?: any,
    subject?: string,
    htmlMessage?: string,
  ) {
    const isProduction = true; // Enabled real sending!

    if (!to || !to.includes("@")) {
      console.warn(
        `[DISPATCHING EMAIL] Invalid or missing recipient: ${to}. Skipping email send.`,
      );
      return;
    }

    if (isProduction) {
      console.log(`[DISPATCHING EMAIL] To: ${to}`);
      this.http
        .post("/api/send-email", {
          to,
          subject: subject || "Alperler Auto Bildirim",
          text: message,
          html: htmlMessage,
          pdfData,
        })
        .subscribe({
          next: (res) => console.log("[EMAIL SENT SUCCESSFULLY]", res),
          error: (err) => console.error("[EMAIL SEND ERROR]", err),
        });
    } else {
      console.log(`[SIMULATION] Notification logged for ${to}`);
    }
  }

  // --- SUPERCHARGED AI ---
  async analyzeFeedback(): Promise<string> {
    if (!this.apiKey) return "AI servisi şu an kullanılamıyor.";

    const feedbacks = this._feedbacks();
    if (feedbacks.length === 0)
      return "Henüz analiz edilecek geri bildirim bulunmuyor.";

    const feedbackText = feedbacks
      .map((f) => `- [${f.category}] (${f.rating}/5): ${f.message}`)
      .join("\n");

    const prompt = `
        ROLE: You are an expert data analyst for Alperler Auto.
        TASK: Analyze the following customer feedback and provide a summary in Turkish.
        
        FEEDBACK DATA:
        ${feedbackText}

        INSTRUCTIONS:
        1. Summarize the overall sentiment (Positive, Neutral, Negative).
        2. Identify top 3 common issues or requests.
        3. Suggest 2 actionable improvements.
        4. Keep it professional and concise.
    `;

    try {
      const result = await this.genAI!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return result.text || "Analiz tamamlanamadı.";
    } catch (error) {
      console.error("Feedback Analysis Error", error);
      return "Analiz sırasında bir hata oluştu.";
    }
  }

  async getAIRecommendation(userQuery: string): Promise<string> {
    if (!this.apiKey) {
      return `Üzgünüm, şu an bağlantı kurulamıyor. Lütfen telefonla bizi arayın: ${this._config().phone}`;
    }
    try {
      // Prepare Context Data
      const contextData = {
        availableRentalCars: this._inventory()
          .filter((v) => v.category === "RENTAL")
          .filter((c) => c.isAvailable)
          .map((c) => ({
            brand: c.brand,
            model: c.model,
            type: c.type,
            price: c.price,
            fuel: c.fuel,
            gear: c.transmission,
            seats: c.seats,
          })),
        salesGallery: this._inventory()
          .filter((v) => v.category === "SALE")
          .map((c) => ({
            brand: c.brand,
            model: c.model,
            year: c.year,
            price: c.price,
            km: c.km,
            expertReport: c.expertReport,
          })),
        tours: this._tours().map((t) => ({
          title: t.title,
          price: t.price,
          duration: t.duration,
        })),
        companyInfo: {
          name: this._config().companyName,
          phone: this._config().phone,
          address: this._config().address,
          aboutStory: this._config().aboutText,
        },
      };

      const contextString = JSON.stringify(contextData);

      const prompt = `
        ROLE: You are 'Alper AI', the intelligent, persuasive, and friendly sales assistant for Alperler Auto in Yüksekova.
        
        GOAL: Assist customers by finding the best cars, answering questions about the company story, and encouraging them to book or buy. You have full access to the inventory.
        
        CONTEXT DATA (Live Inventory):
        ${contextString}

        INSTRUCTIONS:
        1. STRICTLY LIMIT YOUR ANSWERS TO THE CONTEXT OF CAR RENTAL, TOURS, AND VEHICLE SALES. DO NOT ANSWER GENERAL KNOWLEDGE QUESTIONS UNLESS RELATED TO DRIVING OR TRAVEL IN THE REGION.
        2. Search the CONTEXT DATA to answer specific questions (e.g., "cheapest car", "SUV prices", "who is Ishak Alper").
        3. If the user asks for a car recommendation, suggest a specific vehicle from the list and mention its price. Ask about their budget or needs if unclear.
        4. If asked about the company, summarize the family story (Ishak, Ferhat, Hicran Alper) warmly.
        5. Always be polite, professional, and sales-oriented. End answers with a call to action (e.g., "Would you like to reserve this now?" or "Shall I connect you to an agent?").
        6. You can help with technical problems or feedback. If a user reports an issue, apologize and suggest they contact support immediately via WhatsApp.
        7. If the user wants to BUY a car (Second Hand), check the 'salesGallery' list and promote those cars.
        8. If the user wants a TOUR, check the 'tours' list.
        9. Speak in Turkish.
        10. Be concise but helpful.
        11. DO NOT use markdown formatting (bold, italics, headers, lists, asterisks, hashes) in your response. Provide plain text only so the voice assistant can read it clearly.

        USER QUESTION: "${userQuery}"
      `;

      const result = await this.genAI!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return result.text || "Şu an yanıt veremiyorum.";
    } catch (error) {
      console.error("AI Error", error);
      return `Şu an size yanıt veremiyorum. Lütfen ${this._config().phone} numarasından bize ulaşın, hemen yardımcı olalım.`;
    }
  }
}
